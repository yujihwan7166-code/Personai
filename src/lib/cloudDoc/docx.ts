/**
 * 문서 ↔ .docx 호환.
 *
 * Import: mammoth (.docx → HTML) → TipTap setContent (HTML)
 * Export: TipTap ProseMirror JSON → docx 라이브러리 → blob 다운로드
 *
 * 한계 (메모리 정책 — 100% 충실도 X, 알려진 손실 인정):
 *  - 표: cells + 정렬·서식 일부 보존, 너비는 균등
 *  - 이미지: data URL (base64) 만 export — 외부 URL 은 CORS 로 fetch 불가
 *  - 글꼴 종류·정확한 색 일부 손실 가능
 *  - mammoth 의 한계: 매크로·복잡한 스타일·SmartArt 무시
 */

import mammoth from 'mammoth';
import JSZip from 'jszip';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, ImageRun, WidthType, BorderStyle,
  LineRuleType, HeightRule, TableLayoutType,
  Header, Footer, PageNumber, LevelFormat, ExternalHyperlink, PageOrientation,
  VerticalAlignTable, HorizontalPositionAlign, HorizontalPositionRelativeFrom,
  VerticalPositionAlign, VerticalPositionRelativeFrom, TextWrappingType, TextWrappingSide,
  TextDirection, SectionType,
  Tab, TabStopType, LeaderType, UnderlineType, TextEffect, EmphasisMarkType,
  FootnoteReferenceRun, EndnoteReferenceRun, PageBreak as DocxPageBreak, ColumnBreak as DocxColumnBreak,
  CommentRangeStart, CommentRangeEnd, CommentReference,
  Bookmark, InternalHyperlink,
  InsertedTextRun, DeletedTextRun,
  VerticalMergeType,
  LevelSuffix,
  SimpleField,
  ImportedXmlComponent,
  Textbox,
  type ITableCellBorders, type ParagraphChild, type FileChild, type ISectionOptions,
} from 'docx';
import { enrichDocxHtml } from './docxRich';
import { parseDocxAdvanced } from './docxAdvanced';

// ─────────────────────────────────────────────
// Import — .docx → HTML
// ─────────────────────────────────────────────

/** 변환 결과. warnings = mammoth 가 처리 못 한 항목 (caller 가 토스트로 표시). */
export interface DocxImportResult {
  html: string;
  warnings: string[];
  pageMargin?: { top: number; left: number; right: number; bottom: number };
  pageSize?: { width: number; height: number; orientation?: 'portrait' | 'landscape' };
  sectionColumns?: DocxSectionColumns;
  headerAlign?: DocxHeaderFooterAlign;
  footerAlign?: DocxHeaderFooterAlign;
  headerHasPageNumber?: boolean;
  footerHasPageNumber?: boolean;
  pageNumberPlacement?: DocxPageNumberPlacement;
  headerImages?: DocxHeaderFooterImage[];
  footerImages?: DocxHeaderFooterImage[];
  /** 자체 OOXML 파서로 추출 — 헤더 텍스트 (있으면). */
  headerText?: string;
  /** 자체 OOXML 파서로 추출 — 푸터 텍스트 (있으면). */
  footerText?: string;
}

export type DocxHeaderFooterAlign = 'left' | 'center' | 'right' | 'justify';
export type DocxPageNumberPlacement = 'header' | 'footer';

export interface DocxSectionColumns {
  count: number;
  space?: number;
  separate?: boolean;
  equalWidth?: boolean;
}

type DocxSectionBreakType = 'nextPage' | 'continuous' | 'evenPage' | 'oddPage' | 'nextColumn';

interface DocxSectionSettings {
  pageMargin?: DocxExportOptions['pageMargin'];
  pageSize?: DocxExportOptions['pageSize'];
  sectionColumns?: DocxSectionColumns;
}

export interface DocxHeaderFooterImage {
  src: string;
  width: number;
  height: number;
  align?: DocxHeaderFooterAlign;
  alt?: string;
  title?: string;
}

/** 한글 Word 스타일 → HTML 매핑 (영문 기본 매핑 + 한글 변형). */
const STYLE_MAP = [
  // 영문 기본 (mammoth 기본에도 있지만 명시)
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h5:fresh",
  "p[style-name='Heading 6'] => h6:fresh",
  "p[style-name='Title'] => h1.doc-title:fresh",
  "p[style-name='Subtitle'] => h2.doc-subtitle:fresh",
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Intense Quote'] => blockquote.intense:fresh",
  "p[style-name='Code'] => pre:fresh",
  "r[style-name='Strong'] => strong",
  "r[style-name='Emphasis'] => em",
  "r[style-name='Code Char'] => code",
  // 한글판 Word 스타일명
  "p[style-name='제목 1'] => h1:fresh",
  "p[style-name='제목 2'] => h2:fresh",
  "p[style-name='제목 3'] => h3:fresh",
  "p[style-name='제목 4'] => h4:fresh",
  "p[style-name='제목 5'] => h5:fresh",
  "p[style-name='제목 6'] => h6:fresh",
  "p[style-name='제목'] => h1.doc-title:fresh",
  "p[style-name='부제'] => h2.doc-subtitle:fresh",
  "p[style-name='인용'] => blockquote:fresh",
  "p[style-name='강한 인용'] => blockquote.intense:fresh",
].join('\n');

/**
 * .docx → 강화된 HTML.
 *  - mammoth 옵션 강화 (styleMap, 이미지 base64, 빈 단락 보존)
 *  - enrichDocxHtml 후처리 (글꼴·표·이미지 정규화)
 *  - 큰 이미지(3MB+) 는 skip 하고 placeholder 로 대체 (메모리 폭주 방지)
 */
export async function importDocxFile(file: File): Promise<DocxImportResult> {
  const buffer = await readFileArrayBuffer(file);
  // mammoth 와 자체 OOXML 파서 병렬 — mammoth 가 본문, advanced 가 헤더/푸터/각주
  const [result, advanced] = await Promise.all([
    mammoth.convertToHtml(
      mammothInputFromArrayBuffer(buffer),
      {
        styleMap: STYLE_MAP,
        includeDefaultStyleMap: true,
        includeEmbeddedStyleMap: true,
        ignoreEmptyParagraphs: false,
        convertImage: mammoth.images.imgElement(async (image) => {
          const buf = await image.read('base64');
          if (typeof buf === 'string' && buf.length > 3 * 1024 * 1024 * 1.4) {
            return { src: '', alt: '[큰 이미지 — 생략됨]' };
          }
          // alt text 명시 — .docx 의 image alt 속성 또는 빈 문자열 (장식 이미지)
          const altText = (image as { altText?: string }).altText ?? '';
          return { src: `data:${image.contentType};base64,${buf}`, alt: altText };
        }),
      },
    ),
    parseDocxAdvanced(buffer).catch(() => null),
  ]);
  const enriched = enrichDocxHtml(result.value, {
    footnotes: advanced?.footnotes,
    endnotes: advanced?.endnotes,
    endnoteReferences: advanced?.endnoteReferences,
    mathObjects: advanced?.mathObjects,
    pageBreaks: advanced?.pageBreaks,
    columnBreaks: advanced?.columnBreaks,
    sectionBreaks: advanced?.sectionBreaks,
    pageBreakParagraphs: advanced?.pageBreakParagraphs,
    paragraphIndents: advanced?.paragraphIndents,
    paragraphAlignments: advanced?.paragraphAlignments,
    paragraphOutlineLevels: advanced?.paragraphOutlineLevels,
    paragraphPagination: advanced?.paragraphPagination,
    paragraphTabStops: advanced?.paragraphTabStops,
    paragraphSpacings: advanced?.paragraphSpacings,
    paragraphDecorations: advanced?.paragraphDecorations,
    paragraphBookmarks: advanced?.paragraphBookmarks,
    linkRanges: advanced?.linkRanges,
    textBoxes: advanced?.textBoxes,
    tocFields: advanced?.tocFields,
    trackedChanges: advanced?.trackedChanges,
    listStarts: advanced?.listStarts,
    bulletListStyles: advanced?.bulletListStyles,
    runStyles: advanced?.runStyles,
    tableStyles: advanced?.tableStyles,
    tableRowStyles: advanced?.tableRowStyles,
    tableCellStyles: advanced?.tableCellStyles,
    imageDimensions: advanced?.imageDimensions,
    comments: advanced?.comments,
    commentRanges: advanced?.commentRanges,
  });
  const warnings = (result.messages ?? [])
    .filter((m) => m.type === 'warning' || m.type === 'error')
    .map((m) => m.message);
  return {
    html: enriched,
    warnings,
    pageMargin: advanced?.pageMargin,
    pageSize: advanced?.pageSize,
    sectionColumns: advanced?.sectionColumns,
    headerAlign: advanced?.headerAlign,
    footerAlign: advanced?.footerAlign,
    headerHasPageNumber: advanced?.headerHasPageNumber,
    footerHasPageNumber: advanced?.footerHasPageNumber,
    pageNumberPlacement: advanced?.headerHasPageNumber ? 'header' : advanced?.footerHasPageNumber ? 'footer' : undefined,
    headerImages: advanced?.headerImages,
    footerImages: advanced?.footerImages,
    headerText: advanced?.headerText || undefined,
    footerText: advanced?.footerText || undefined,
  };
}

function mammothInputFromArrayBuffer(buffer: ArrayBuffer): { arrayBuffer: ArrayBuffer; buffer?: Buffer } {
  if (typeof Buffer !== 'undefined') {
    return { arrayBuffer: buffer, buffer: Buffer.from(buffer) };
  }
  return { arrayBuffer: buffer };
}

function readFileArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('DOCX 파일을 ArrayBuffer로 읽지 못했어요.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('DOCX 파일 읽기에 실패했어요.'));
    reader.readAsArrayBuffer(file);
  });
}

// ─────────────────────────────────────────────
// Export — ProseMirror JSON → .docx 다운로드
// ─────────────────────────────────────────────

interface PMNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export interface DocxExportOptions {
  /** 단순 텍스트 헤더 — 매 페이지 반복. 빈 문자열이면 헤더 없음. */
  headerText?: string;
  /** 단순 텍스트 푸터 — 매 페이지 반복. */
  footerText?: string;
  /** true 면 푸터 우측에 "N / Total" 페이지 번호 필드 자동 삽입. */
  showPageNumber?: boolean;
  pageNumberPlacement?: DocxPageNumberPlacement;
  headerAlign?: DocxHeaderFooterAlign;
  footerAlign?: DocxHeaderFooterAlign;
  headerImages?: DocxHeaderFooterImage[];
  footerImages?: DocxHeaderFooterImage[];
  pageMargin?: { top: number; left: number; right: number; bottom: number };
  pageSize?: { width: number; height: number; orientation?: 'portrait' | 'landscape' };
  sectionColumns?: DocxSectionColumns;
}

export async function exportDocxFromJson(
  json: unknown,
  fileName: string,
  options: DocxExportOptions = {},
): Promise<void> {
  const blob = await exportDocxBlobFromJson(json, options);
  triggerDownload(blob, fileName.endsWith('.docx') ? fileName : `${fileName}.docx`);
}

export async function exportDocxBlobFromJson(
  json: unknown,
  options: DocxExportOptions = {},
): Promise<Blob> {
  const root = json as PMNode | null;
  const context: ExportContext = {
    footnotes: {},
    footnoteIdByKey: new Map(),
    nextFootnoteId: 1,
    endnotes: {},
    endnoteIdByKey: new Map(),
    nextEndnoteId: 1,
    comments: {},
    commentIdByKey: new Map(),
    nextCommentId: 1,
    numberingConfigs: [],
    nextNumberingId: 1,
    nextRevisionId: 1,
    tableMetadata: [],
  };
  const headerNode = buildHeaderNode(options);
  const footerNode = buildFooterNode(options);
  const sections = buildDocumentSections(root, options, context, headerNode, footerNode);
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'doc-bullets',
          levels: buildBulletLevels(),
        },
        {
          reference: 'doc-numbering',
          levels: buildOrderedLevels(),
        },
        ...context.numberingConfigs,
      ],
    },
    footnotes: Object.keys(context.footnotes).length > 0 ? context.footnotes : undefined,
    endnotes: Object.keys(context.endnotes).length > 0 ? context.endnotes : undefined,
    comments: Object.keys(context.comments).length > 0
      ? { children: Object.values(context.comments) }
      : undefined,
    sections,
  });
  const blob = await Packer.toBlob(doc);
  return patchDocxTableMetadata(blob, context.tableMetadata);
}

function buildDocumentSections(
  root: PMNode | null,
  options: DocxExportOptions,
  context: ExportContext,
  headerNode: Header | undefined,
  footerNode: Footer | undefined,
): ISectionOptions[] {
  const sections: ISectionOptions[] = [];
  let sectionChildren: FileChild[] = [];

  for (const block of root?.content ?? []) {
    if (block.type === 'sectionBreak') {
      sections.push(buildSectionOptions(
        sectionChildren,
        options,
        headerNode,
        footerNode,
        block.attrs,
      ));
      sectionChildren = [];
      continue;
    }
    flattenBlock(block, sectionChildren, {}, context);
  }

  sections.push(buildSectionOptions(sectionChildren, options, headerNode, footerNode));
  return sections;
}

function buildSectionOptions(
  children: FileChild[],
  options: DocxExportOptions,
  headerNode: Header | undefined,
  footerNode: Footer | undefined,
  sectionBreakAttrs?: Record<string, unknown>,
): ISectionOptions {
  const sectionChildren = children.length > 0
    ? children
    : [new Paragraph({ children: [new TextRun('')] })];

  return {
    children: sectionChildren,
    properties: sectionPropertiesFromOptions(
      options,
      sectionBreakAttrs ? sectionBreakTypeFromAttrs(sectionBreakAttrs) : undefined,
      sectionSettingsFromAttrs(sectionBreakAttrs),
    ),
    headers: headerNode ? { default: headerNode } : undefined,
    footers: footerNode ? { default: footerNode } : undefined,
  };
}

function buildHeaderNode(options: DocxExportOptions): Header | undefined {
  const text = options.headerText?.trim();
  const showPageNumber = options.showPageNumber && options.pageNumberPlacement === 'header';
  const images = headerFooterImageParagraphs(options.headerImages);
  if (!text && !showPageNumber && images.length === 0) return undefined;
  return new Header({
    children: [
      ...images,
      ...headerFooterParagraphs(text, showPageNumber, options.headerAlign),
    ],
  });
}

function buildFooterNode(options: DocxExportOptions): Footer | undefined {
  const text = options.footerText?.trim();
  const showPageNumber = options.showPageNumber && options.pageNumberPlacement !== 'header';
  const images = headerFooterImageParagraphs(options.footerImages);
  if (!text && !showPageNumber && images.length === 0) return undefined;
  return new Footer({
    children: [
      ...images,
      ...headerFooterParagraphs(text, showPageNumber, options.footerAlign ?? 'center'),
    ],
  });
}

function headerFooterImageParagraphs(images: DocxHeaderFooterImage[] | undefined): Paragraph[] {
  return (images ?? []).flatMap((image) => {
    const run = imageRunFromAttrs({
      src: image.src,
      width: image.width,
      height: image.height,
      alt: image.alt,
      title: image.title,
    });
    if (!run) return [];
    return [new Paragraph({
      alignment: headerFooterAlignment(image.align),
      children: [run],
    })];
  });
}

function headerFooterParagraphs(
  text: string | undefined,
  showPageNumber: boolean,
  align: DocxHeaderFooterAlign | undefined,
): Paragraph[] {
  const lines = headerFooterTextLines(text);
  const alignment = headerFooterAlignment(align);
  if (lines.length === 0) {
    return [new Paragraph({ alignment, children: headerFooterRuns(undefined, showPageNumber) })];
  }
  return lines.map((line, index) => new Paragraph({
    alignment,
    children: headerFooterRuns(line, showPageNumber && index === lines.length - 1),
  }));
}

function headerFooterTextLines(text: string | undefined): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function headerFooterRuns(text: string | undefined, showPageNumber: boolean): TextRun[] {
  return [
    ...(text ? [new TextRun(text)] : []),
    ...(text && showPageNumber ? [new TextRun('   ')] : []),
    ...(showPageNumber ? [
      new TextRun({ children: [PageNumber.CURRENT] }),
      new TextRun(' / '),
      new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
    ] : []),
  ];
}

function headerFooterAlignment(
  align: DocxHeaderFooterAlign | undefined,
): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  if (align === 'center') return AlignmentType.CENTER;
  if (align === 'right') return AlignmentType.RIGHT;
  if (align === 'justify') return AlignmentType.JUSTIFIED;
  if (align === 'left') return AlignmentType.LEFT;
  return undefined;
}

function sectionPropertiesFromOptions(
  options: DocxExportOptions,
  sectionBreakType?: DocxSectionBreakType,
  sectionSettings?: DocxSectionSettings,
) {
  const margin = sectionSettings?.pageMargin ?? options.pageMargin;
  const size = sectionSettings?.pageSize ?? options.pageSize;
  const columns = columnsFromOptions(sectionSettings?.sectionColumns ?? options.sectionColumns);
  const type = sectionTypeFor(sectionBreakType);
  if (!margin && !size && !columns && !type) return undefined;

  return {
    ...(type ? { type } : {}),
    page: {
      ...(size ? {
        size: {
          width: pxToTwips(size.width),
          height: pxToTwips(size.height),
          orientation: size.orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
        },
      } : {}),
      ...(margin ? {
        margin: {
          top: pxToTwips(margin.top),
          left: pxToTwips(margin.left),
          right: pxToTwips(margin.right),
          bottom: pxToTwips(margin.bottom),
        },
      } : {}),
    },
    ...(columns ? { column: columns } : {}),
  };
}

function sectionBreakTypeFromAttrs(attrs: Record<string, unknown> | undefined): DocxSectionBreakType {
  const raw = attrs?.breakType ?? attrs?.sectionBreakType;
  if (raw === 'continuous' || raw === 'evenPage' || raw === 'oddPage' || raw === 'nextColumn') return raw;
  return 'nextPage';
}

function sectionSettingsFromAttrs(attrs: Record<string, unknown> | undefined): DocxSectionSettings | undefined {
  if (!attrs) return undefined;
  const pageMargin = pageMarginFromUnknown(attrs.pageMargin);
  const pageSize = pageSizeFromUnknown(attrs.pageSize);
  const sectionColumns = sectionColumnsFromUnknown(attrs.sectionColumns);
  if (!pageMargin && !pageSize && !sectionColumns) return undefined;
  return {
    ...(pageMargin ? { pageMargin } : {}),
    ...(pageSize ? { pageSize } : {}),
    ...(sectionColumns ? { sectionColumns } : {}),
  };
}

function pageMarginFromUnknown(value: unknown): DocxExportOptions['pageMargin'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const top = numericAttr(record.top);
  const left = numericAttr(record.left);
  const right = numericAttr(record.right);
  const bottom = numericAttr(record.bottom);
  if (top == null || left == null || right == null || bottom == null) return undefined;
  return { top, left, right, bottom };
}

function pageSizeFromUnknown(value: unknown): DocxExportOptions['pageSize'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const width = numericAttr(record.width);
  const height = numericAttr(record.height);
  if (width == null || height == null) return undefined;
  const orientation = record.orientation === 'landscape' ? 'landscape' : 'portrait';
  return { width, height, orientation };
}

function sectionColumnsFromUnknown(value: unknown): DocxSectionColumns | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const count = numericAttr(record.count);
  if (count == null || count <= 1) return undefined;
  const space = numericAttr(record.space);
  return {
    count,
    ...(space != null ? { space } : {}),
    ...(typeof record.separate === 'boolean' ? { separate: record.separate } : {}),
    ...(typeof record.equalWidth === 'boolean' ? { equalWidth: record.equalWidth } : {}),
  };
}

function sectionTypeFor(type: DocxSectionBreakType | undefined): (typeof SectionType)[keyof typeof SectionType] | undefined {
  if (type === 'continuous') return SectionType.CONTINUOUS;
  if (type === 'evenPage') return SectionType.EVEN_PAGE;
  if (type === 'oddPage') return SectionType.ODD_PAGE;
  if (type === 'nextColumn') return SectionType.NEXT_COLUMN;
  if (type === 'nextPage') return SectionType.NEXT_PAGE;
  return undefined;
}

function columnsFromOptions(columns: DocxSectionColumns | undefined) {
  if (!columns || !Number.isFinite(columns.count) || columns.count <= 1) return undefined;
  return {
    count: Math.max(1, Math.round(columns.count)),
    ...(columns.space != null ? { space: pxToTwips(columns.space) } : {}),
    ...(columns.separate != null ? { separate: columns.separate } : {}),
    ...(columns.equalWidth != null ? { equalWidth: columns.equalWidth } : {}),
  };
}

function pxToTwips(px: number): number {
  return Math.max(0, Math.round(px * 15));
}

interface FlattenOpts {
  listKind?: 'bullet' | 'ordered';
  listLevel?: number;
  listReference?: string;
  quote?: boolean;
}

interface ExportContext {
  footnotes: Record<string, { children: Paragraph[] }>;
  footnoteIdByKey: Map<string, number>;
  nextFootnoteId: number;
  endnotes: Record<string, { children: Paragraph[] }>;
  endnoteIdByKey: Map<string, number>;
  nextEndnoteId: number;
  comments: Record<string, {
    id: number;
    author: string;
    date?: Date;
    children: Paragraph[];
  }>;
  commentIdByKey: Map<string, number>;
  nextCommentId: number;
  numberingConfigs: Array<{
    reference: string;
    levels: ReturnType<typeof buildOrderedLevels> | ReturnType<typeof buildBulletLevels>;
  }>;
  nextNumberingId: number;
  nextRevisionId: number;
  tableMetadata: DocxExportTableMetadata[];
}

interface DocxExportTableMetadata {
  tableIndex: number;
  caption?: string;
  description?: string;
}

interface ListIndentAttrs {
  left?: number;
  hanging?: number;
}

type ListSuffixAttr = (typeof LevelSuffix)[keyof typeof LevelSuffix];

function buildBulletLevels(listStyleType?: string, startLevel = 0, listIndent?: ListIndentAttrs, suffix?: ListSuffixAttr) {
  return [0, 1, 2].map((level) => ({
    level,
    format: LevelFormat.BULLET,
    text: bulletTextForLevel(level === startLevel ? listStyleType : undefined, level),
    suffix: level === startLevel ? suffix : undefined,
    alignment: AlignmentType.LEFT,
    style: {
      paragraph: {
        indent: indentForListLevel(level, startLevel, listIndent),
      },
    },
  }));
}

function bulletTextForLevel(listStyleType: string | undefined, level: number): string {
  if (listStyleType === 'circle') return '◦';
  if (listStyleType === 'square') return '▪';
  return level === 1 ? '◦' : level === 2 ? '▪' : '•';
}

function buildOrderedLevels(
  start = 1,
  startLevel = 0,
  listIndent?: ListIndentAttrs,
  orderedType?: string,
  suffix?: ListSuffixAttr,
) {
  return [0, 1, 2].map((level) => ({
    level,
    format: orderedLevelFormat(level, level === startLevel ? orderedType : undefined),
    text: `%${level + 1}.`,
    start: level === startLevel && start > 1 ? start : undefined,
    suffix: level === startLevel ? suffix : undefined,
    alignment: AlignmentType.LEFT,
    style: {
      paragraph: {
        indent: indentForListLevel(level, startLevel, listIndent),
      },
    },
  }));
}

function orderedLevelFormat(level: number, orderedType?: string): (typeof LevelFormat)[keyof typeof LevelFormat] {
  if (orderedType === 'A') return LevelFormat.UPPER_LETTER;
  if (orderedType === 'a') return LevelFormat.LOWER_LETTER;
  if (orderedType === 'I') return LevelFormat.UPPER_ROMAN;
  if (orderedType === 'i') return LevelFormat.LOWER_ROMAN;
  if (orderedType === '1') return LevelFormat.DECIMAL;
  return level === 1 ? LevelFormat.LOWER_LETTER : level === 2 ? LevelFormat.LOWER_ROMAN : LevelFormat.DECIMAL;
}

function indentForListLevel(level: number, startLevel: number, listIndent?: ListIndentAttrs) {
  if (level === startLevel && listIndent?.left) {
    return {
      left: listIndent.left,
      hanging: listIndent.hanging ?? 360,
    };
  }
  return { left: 720 + level * 360, hanging: 360 };
}

function registerBulletListReference(
  context: ExportContext,
  attrs: Record<string, unknown> | undefined,
  level: number,
): string {
  const listStyleType = typeof attrs?.listStyleType === 'string' ? attrs.listStyleType : undefined;
  const suffix = listSuffixAttr(attrs?.listSuffix);
  const listIndent = listIndentFromAttrs(attrs);
  if (!listStyleType && !listIndent.left && !suffix) return 'doc-bullets';

  const safeLevel = Math.max(0, Math.min(2, level));
  const reference = `doc-bullets-${context.nextNumberingId}`;
  context.nextNumberingId += 1;
  context.numberingConfigs.push({
    reference,
    levels: buildBulletLevels(listStyleType, safeLevel, listIndent, suffix),
  });
  return reference;
}

function registerOrderedListReference(
  context: ExportContext,
  attrs: Record<string, unknown> | undefined,
  level: number,
): string {
  const start = Math.max(1, Math.round(numericAttr(attrs?.start) ?? 1));
  const orderedType = orderedTypeAttr(attrs?.type);
  const suffix = listSuffixAttr(attrs?.listSuffix);
  const listIndent = listIndentFromAttrs(attrs);
  const safeLevel = Math.max(0, Math.min(2, level));
  const reference = `doc-numbering-${context.nextNumberingId}`;
  context.nextNumberingId += 1;
  context.numberingConfigs.push({
    reference,
    levels: buildOrderedLevels(start, safeLevel, listIndent, orderedType, suffix),
  });
  return reference;
}

function listSuffixAttr(value: unknown): ListSuffixAttr | undefined {
  if (value === LevelSuffix.SPACE || value === LevelSuffix.TAB || value === LevelSuffix.NOTHING) {
    return value;
  }
  return undefined;
}

function orderedTypeAttr(value: unknown): string | undefined {
  return value === 'A' || value === 'a' || value === 'I' || value === 'i' || value === '1'
    ? value
    : undefined;
}

function listIndentFromAttrs(attrs: Record<string, unknown> | undefined): ListIndentAttrs {
  const left = numericAttr(attrs?.listIndentLeft);
  const hanging = numericAttr(attrs?.listIndentHanging);
  return {
    ...(left && left > 0 ? { left: Math.round(left) } : {}),
    ...(hanging && hanging > 0 ? { hanging: Math.round(hanging) } : {}),
  };
}

function flattenBlock(
  block: PMNode,
  out: FileChild[],
  opts: FlattenOpts,
  context: ExportContext,
): void {
  if (!block.type) return;

  if (block.type === 'paragraph' || block.type === 'heading') {
    const runs = inlinesToRuns(block.content ?? [], context);
    const finalRuns = paragraphChildrenWithBookmark(runs, block.attrs);
    const indent = paragraphIndentFromAttrs(block.attrs, Boolean(opts.quote));
    if (finalRuns.length === 0) finalRuns.push(new TextRun(''));
    out.push(new Paragraph({
      children: finalRuns,
      heading: block.type === 'heading' ? headingFor(block.attrs?.level as number | undefined) : undefined,
      alignment: alignmentFor(block.attrs?.textAlign as string | undefined),
      pageBreakBefore: booleanAttr(block.attrs?.pageBreakBefore),
      keepNext: booleanAttr(block.attrs?.keepNext),
      keepLines: booleanAttr(block.attrs?.keepLines),
      widowControl: booleanAttr(block.attrs?.widowControl),
      contextualSpacing: booleanAttr(block.attrs?.contextualSpacing),
      suppressLineNumbers: booleanAttr(block.attrs?.suppressLineNumbers),
      bidirectional: booleanAttr(block.attrs?.bidirectional),
      wordWrap: booleanAttr(block.attrs?.wordWrap),
      overflowPunctuation: booleanAttr(block.attrs?.overflowPunctuation),
      autoSpaceEastAsianText: booleanAttr(block.attrs?.autoSpaceEastAsianText),
      numbering: opts.listKind
        ? {
            reference: opts.listReference ?? (opts.listKind === 'bullet' ? 'doc-bullets' : 'doc-numbering'),
            level: Math.min(opts.listLevel ?? 0, 2),
          }
        : undefined,
      indent,
      spacing: paragraphSpacingFromAttrs(block.attrs),
      tabStops: paragraphTabStopsFromAttrs(block.attrs),
      shading: paragraphShadingFromAttrs(block.attrs),
      border: paragraphBordersFromAttrs(block.attrs),
    }));
    return;
  }

  if (block.type === 'bulletList') {
    const level = opts.listLevel ?? 0;
    const listReference = registerBulletListReference(context, block.attrs, level);
    for (const item of block.content ?? []) {
      for (const child of item.content ?? []) {
        if (child.type === 'bulletList' || child.type === 'orderedList') {
          flattenBlock(child, out, { ...opts, listLevel: level + 1, listReference }, context);
        } else {
          flattenBlock(child, out, { ...opts, listKind: 'bullet', listLevel: level, listReference }, context);
        }
      }
    }
    return;
  }

  if (block.type === 'orderedList') {
    const level = opts.listLevel ?? 0;
    const listReference = registerOrderedListReference(context, block.attrs, level);
    for (const item of block.content ?? []) {
      for (const child of item.content ?? []) {
        if (child.type === 'bulletList' || child.type === 'orderedList') {
          flattenBlock(child, out, { ...opts, listLevel: level + 1, listReference }, context);
        } else {
          flattenBlock(child, out, { ...opts, listKind: 'ordered', listLevel: level, listReference }, context);
        }
      }
    }
    return;
  }

  if (block.type === 'blockquote') {
    for (const child of block.content ?? []) {
      flattenBlock(child, out, { ...opts, quote: true }, context);
    }
    return;
  }

  if (block.type === 'docxTextBox') {
    const paragraphs = textBoxParagraphsFromNode(block, context);
    out.push(new Textbox({
      children: paragraphs,
      style: {
        width: '240pt',
        height: '60pt',
        marginTop: '4pt',
        marginBottom: '4pt',
      },
    }));
    return;
  }

  if (block.type === 'docxToc') {
    out.push(new Paragraph({
      children: [
        new SimpleField(
          docxTocInstruction(block.attrs),
          docxTocCachedText(block) || 'Table of contents',
        ),
      ],
    }));
    return;
  }

  if (block.type === 'horizontalRule') {
    out.push(new Paragraph({
      children: [new TextRun('────────────────────')],
    }));
    return;
  }

  if (block.type === 'pageBreak') {
    out.push(new Paragraph({ children: [new DocxPageBreak()] }));
    return;
  }

  if (block.type === 'columnBreak') {
    out.push(new Paragraph({ children: [new DocxColumnBreak()] }));
    return;
  }

  if (block.type === 'codeBlock') {
    const text = (block.content ?? []).map((n) => n.text ?? '').join('');
    out.push(new Paragraph({
      children: [new TextRun({ text, font: 'Courier New' })],
    }));
    return;
  }

  if (block.type === 'image') {
    const img = imageRunFromAttrs(block.attrs);
    if (img) {
      out.push(new Paragraph({
        children: [img],
        alignment: imageAlignmentFor(block.attrs),
      }));
    } else {
      // base64 가 아니면 placeholder
      const alt = (block.attrs?.alt as string | undefined) ?? '이미지';
      out.push(new Paragraph({
        children: [new TextRun({ text: `[${alt}]`, italics: true, color: '888888' })],
      }));
    }
    return;
  }

  if (block.type === 'table') {
    out.push(buildTable(block, context));
    return;
  }

  // 그 외 — 자식이 있으면 재귀
  if (block.content) {
    for (const child of block.content) {
      flattenBlock(child, out, opts, context);
    }
  }
}

// ─────────────────────────────────────────────
// 표
// ─────────────────────────────────────────────

const TABLE_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,           // 1/8 pt 단위 → 0.5pt
  color: 'CCCCCC',
};

function buildTable(block: PMNode, context: ExportContext): Table {
  collectTableMetadata(block.attrs, context);
  const rows: TableRow[] = [];
  const verticalMerges = new Map<number, { remaining: number; columnSpan: number; borders?: ITableCellBorders }>();
  for (const row of block.content ?? []) {
    if (row.type !== 'tableRow') continue;
    const cells: TableCell[] = [];
    let gridColumn = 0;
    const appendVerticalMergeContinuations = () => {
      while (verticalMerges.has(gridColumn)) {
        const merge = verticalMerges.get(gridColumn);
        if (!merge) break;
        cells.push(createVerticalMergeContinueCell(merge));
        verticalMerges.delete(gridColumn);
        if (merge.remaining > 1) {
          verticalMerges.set(gridColumn, { ...merge, remaining: merge.remaining - 1 });
        }
        gridColumn += Math.max(1, merge.columnSpan);
      }
    };
    for (const cell of row.content ?? []) {
      if (cell.type !== 'tableCell' && cell.type !== 'tableHeader') continue;
      appendVerticalMergeContinuations();
      const innerOut: FileChild[] = [];
      for (const child of cell.content ?? []) {
        flattenBlock(child, innerOut, {}, context);
      }
      // docx TableCell children 은 Paragraph | Table 만
      const safeChildren: Array<Paragraph | Table> = innerOut.length > 0
        ? innerOut.filter((item): item is Paragraph | Table => item instanceof Paragraph || item instanceof Table)
        : [new Paragraph({ children: [new TextRun('')] })];
      const colspan = (cell.attrs?.colspan as number | undefined) ?? 1;
      const rowspan = (cell.attrs?.rowspan as number | undefined) ?? 1;
      const backgroundColor = cellBackgroundFill(cell.attrs);
      const widthTwips = cellWidthTwips(cell.attrs);
      const borders = cellBordersFromAttrs(cell.attrs);
      const verticalAlign = cellVerticalAlign(cell.attrs);
      const textDirection = cellTextDirection(cell.attrs);
      const margins = cellMarginsFromAttrs(cell.attrs);
      const startsVerticalMerge = rowspan > 1;
      cells.push(new TableCell({
        children: safeChildren,
        columnSpan: colspan > 1 ? colspan : undefined,
        verticalMerge: startsVerticalMerge ? VerticalMergeType.RESTART : undefined,
        width: widthTwips ? { size: widthTwips, type: WidthType.DXA } : undefined,
        borders,
        verticalAlign,
        textDirection,
        margins,
        // header cell 은 회색 배경
        shading: backgroundColor
          ? { fill: backgroundColor }
          : cell.type === 'tableHeader'
            ? { fill: 'F3F3F3' }
            : undefined,
      }));
      if (startsVerticalMerge) {
        verticalMerges.set(gridColumn, {
          remaining: rowspan - 1,
          columnSpan: colspan,
          ...(borders ? { borders } : {}),
        });
      }
      gridColumn += colspan;
    }
    appendVerticalMergeContinuations();
    if (cells.length > 0) rows.push(new TableRow({
      children: cells,
      height: tableRowHeightFromAttrs(row.attrs),
      tableHeader: tableRowHeaderFromAttrs(row.attrs),
      cantSplit: tableRowCantSplitFromAttrs(row.attrs),
    }));
  }
  return new Table({
    rows: rows.length > 0
      ? rows
      : [new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun('')] })] })] })],
    width: tableWidthFromAttrs(block.attrs) ?? { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: tableColumnWidthsFromTable(block),
    alignment: tableAlignmentFromAttrs(block.attrs),
    layout: tableLayoutFromAttrs(block.attrs),
    cellSpacing: tableCellSpacingFromAttrs(block.attrs),
    borders: {
      top: TABLE_BORDER, bottom: TABLE_BORDER, left: TABLE_BORDER, right: TABLE_BORDER,
      insideHorizontal: TABLE_BORDER, insideVertical: TABLE_BORDER,
    },
  });
}

// ─────────────────────────────────────────────
// 이미지
// ─────────────────────────────────────────────

/** TipTap image attrs → ImageRun. data URL 만 처리 (외부 URL 은 CORS) */
function collectTableMetadata(attrs: Record<string, unknown> | undefined, context: ExportContext): void {
  const caption = stringAttr(attrs?.tableCaption);
  const description = stringAttr(attrs?.tableDescription);
  const tableIndex = context.tableMetadata.length;
  context.tableMetadata.push({
    tableIndex,
    ...(caption ? { caption } : {}),
    ...(description ? { description } : {}),
  });
}

async function patchDocxTableMetadata(blob: Blob, metadata: DocxExportTableMetadata[]): Promise<Blob> {
  if (!metadata.some((item) => item.caption || item.description)) return blob;
  const buffer = await readBlobArrayBufferForPatch(blob);
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file('word/document.xml');
  if (!file) return blob;
  const xml = await file.async('string');
  const patched = patchDocumentTablesXml(xml, metadata);
  if (patched === xml) return blob;
  zip.file('word/document.xml', patched);
  const out = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

function patchDocumentTablesXml(xml: string, metadata: DocxExportTableMetadata[]): string {
  let tableIndex = 0;
  return xml.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/g, (tableXml) => {
    const item = metadata[tableIndex++];
    if (!item?.caption && !item?.description) return tableXml;
    return patchSingleTableXml(tableXml, item);
  });
}

function patchSingleTableXml(tableXml: string, metadata: DocxExportTableMetadata): string {
  const additions = [
    metadata.caption ? `<w:tblCaption w:val="${escapeXmlAttr(metadata.caption)}"/>` : '',
    metadata.description ? `<w:tblDescription w:val="${escapeXmlAttr(metadata.description)}"/>` : '',
  ].filter(Boolean).join('');
  if (!additions) return tableXml;

  if (/<w:tblPr\b[\s\S]*?<\/w:tblPr>/.test(tableXml)) {
    return tableXml.replace(/<w:tblPr\b([^>]*)>([\s\S]*?)<\/w:tblPr>/, (_match, attrs, body) => {
      const cleaned = String(body)
        .replace(/<w:tblCaption\b[^>]*\/>/g, '')
        .replace(/<w:tblDescription\b[^>]*\/>/g, '');
      return `<w:tblPr${attrs}>${additions}${cleaned}</w:tblPr>`;
    });
  }
  return tableXml.replace(/<w:tbl\b([^>]*)>/, `<w:tbl$1><w:tblPr>${additions}</w:tblPr>`);
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function readBlobArrayBufferForPatch(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('DOCX Blob could not be read as ArrayBuffer.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('DOCX Blob read failed.'));
    reader.readAsArrayBuffer(blob);
  });
}

function createVerticalMergeContinueCell(merge: { columnSpan: number; borders?: ITableCellBorders }): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun('')] })],
    columnSpan: merge.columnSpan > 1 ? merge.columnSpan : undefined,
    verticalMerge: VerticalMergeType.CONTINUE,
    borders: merge.borders,
  });
}

function cellBackgroundFill(attrs: Record<string, unknown> | undefined): string | undefined {
  const raw = attrs?.backgroundColor;
  if (typeof raw !== 'string') return undefined;
  const match = raw.trim().match(/^#?([0-9a-f]{6})$/i);
  return match ? match[1].toUpperCase() : undefined;
}

function cellWidthTwips(attrs: Record<string, unknown> | undefined): number | undefined {
  const colwidth = attrs?.colwidth;
  if (!Array.isArray(colwidth)) return undefined;
  const px = colwidth.reduce((sum, item) => {
    const value = typeof item === 'number' ? item : Number(item);
    return Number.isFinite(value) && value > 0 ? sum + value : sum;
  }, 0);
  if (px <= 0) return undefined;
  return Math.round(px * 15);
}

function cellBordersFromAttrs(attrs: Record<string, unknown> | undefined): ITableCellBorders | undefined {
  const color = cellBorderColor(attrs);
  const size = cellBorderSize(attrs);
  const sides = cellBorderSidesFromAttrs(attrs, color, size);
  if (sides) return sides;
  if (!color && !size) return undefined;
  const border = cellBorderOptions(color, size);
  return { top: border, bottom: border, left: border, right: border };
}

function cellBorderColor(attrs: Record<string, unknown> | undefined): string | undefined {
  const raw = attrs?.borderColor;
  if (typeof raw !== 'string') return undefined;
  const match = raw.trim().match(/^#?([0-9a-f]{6})$/i);
  return match ? match[1].toUpperCase() : undefined;
}

function cellBorderSize(attrs: Record<string, unknown> | undefined): number | undefined {
  const raw = attrs?.borderSize;
  const size = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(size) && size > 0 ? Math.round(size) : undefined;
}

function cellBorderSidesFromAttrs(
  attrs: Record<string, unknown> | undefined,
  fallbackColor?: string,
  fallbackSize?: number,
): ITableCellBorders | undefined {
  const top = cellBorderSideFromAttrs(attrs, 'Top', fallbackColor, fallbackSize);
  const right = cellBorderSideFromAttrs(attrs, 'Right', fallbackColor, fallbackSize);
  const bottom = cellBorderSideFromAttrs(attrs, 'Bottom', fallbackColor, fallbackSize);
  const left = cellBorderSideFromAttrs(attrs, 'Left', fallbackColor, fallbackSize);
  if (!top && !right && !bottom && !left) return undefined;
  return {
    ...(top ? { top } : {}),
    ...(right ? { right } : {}),
    ...(bottom ? { bottom } : {}),
    ...(left ? { left } : {}),
  };
}

function cellBorderSideFromAttrs(
  attrs: Record<string, unknown> | undefined,
  side: 'Top' | 'Right' | 'Bottom' | 'Left',
  fallbackColor?: string,
  fallbackSize?: number,
) {
  const color = cellBorderSideColor(attrs, side) ?? fallbackColor;
  const size = cellBorderSideSize(attrs, side) ?? fallbackSize;
  if (!color && !size) return undefined;
  return cellBorderOptions(color, size);
}

function cellBorderSideColor(
  attrs: Record<string, unknown> | undefined,
  side: 'Top' | 'Right' | 'Bottom' | 'Left',
): string | undefined {
  const raw = attrs?.[`border${side}Color`];
  if (typeof raw !== 'string') return undefined;
  const match = raw.trim().match(/^#?([0-9a-f]{6})$/i);
  return match ? match[1].toUpperCase() : undefined;
}

function cellBorderSideSize(
  attrs: Record<string, unknown> | undefined,
  side: 'Top' | 'Right' | 'Bottom' | 'Left',
): number | undefined {
  const raw = attrs?.[`border${side}Size`];
  const size = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(size) && size > 0 ? Math.round(size) : undefined;
}

function cellBorderOptions(color?: string, size?: number) {
  return {
    style: BorderStyle.SINGLE,
    size: size ?? TABLE_BORDER.size,
    color: color ?? TABLE_BORDER.color,
  };
}

function cellVerticalAlign(attrs: Record<string, unknown> | undefined): (typeof VerticalAlignTable)[keyof typeof VerticalAlignTable] | undefined {
  const raw = attrs?.verticalAlign;
  if (raw === 'top') return VerticalAlignTable.TOP;
  if (raw === 'center' || raw === 'middle') return VerticalAlignTable.CENTER;
  if (raw === 'bottom') return VerticalAlignTable.BOTTOM;
  return undefined;
}

function cellTextDirection(attrs: Record<string, unknown> | undefined): (typeof TextDirection)[keyof typeof TextDirection] | undefined {
  const raw = attrs?.textDirection;
  if (raw === 'tbRl') return TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT;
  if (raw === 'btLr') return TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT;
  if (raw === 'lrTb') return TextDirection.LEFT_TO_RIGHT_TOP_TO_BOTTOM;
  return undefined;
}

function cellMarginsFromAttrs(attrs: Record<string, unknown> | undefined) {
  const top = cellPaddingTwips(attrs?.paddingTop);
  const right = cellPaddingTwips(attrs?.paddingRight);
  const bottom = cellPaddingTwips(attrs?.paddingBottom);
  const left = cellPaddingTwips(attrs?.paddingLeft);
  if (top == null && right == null && bottom == null && left == null) return undefined;
  return {
    marginUnitType: WidthType.DXA,
    ...(top != null ? { top } : {}),
    ...(right != null ? { right } : {}),
    ...(bottom != null ? { bottom } : {}),
    ...(left != null ? { left } : {}),
  };
}

function cellPaddingTwips(value: unknown): number | undefined {
  const px = numericAttr(value);
  return px != null && px >= 0 ? Math.round(px * 15) : undefined;
}

function tableWidthFromAttrs(attrs: Record<string, unknown> | undefined) {
  const width = numericAttr(attrs?.tableWidth);
  if (!width || width <= 0) return undefined;
  if (attrs?.tableWidthType === 'percent') {
    return {
      size: Math.max(1, Math.min(100, Math.round(width))),
      type: WidthType.PERCENTAGE,
    };
  }
  return {
    size: pxToTwips(width),
    type: WidthType.DXA,
  };
}

function tableAlignmentFromAttrs(attrs: Record<string, unknown> | undefined): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  const align = attrs?.tableAlign;
  if (align === 'left') return AlignmentType.LEFT;
  if (align === 'center') return AlignmentType.CENTER;
  if (align === 'right') return AlignmentType.RIGHT;
  return undefined;
}

function tableColumnWidthsFromTable(block: PMNode): number[] | undefined {
  const expectedColumns = tableColumnCount(block);
  const fromAttrs = tableColumnWidthsFromAttrs(block.attrs);
  if (fromAttrs) return normalizeTableGridWidths(fromAttrs, expectedColumns);
  return inferTableColumnWidths(block);
}

function tableColumnWidthsFromAttrs(attrs: Record<string, unknown> | undefined): number[] | undefined {
  const raw = attrs?.tableColumnWidths;
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',')
      : [];
  const widths = values
    .map((value) => pxNumericAttrToTwips(value))
    .filter((value): value is number => Boolean(value));
  return widths.length > 0 ? widths : undefined;
}

function normalizeTableGridWidths(widths: number[], expectedColumns: number): number[] {
  if (expectedColumns <= 0) return widths;
  return Array.from({ length: expectedColumns }, (_, index) => widths[index] ?? 1800);
}

function inferTableColumnWidths(block: PMNode): number[] | undefined {
  const expectedColumns = tableColumnCount(block);
  if (expectedColumns <= 0) return undefined;
  const widths: number[] = [];
  for (const row of block.content ?? []) {
    if (row.type !== 'tableRow') continue;
    let gridColumn = 0;
    for (const cell of row.content ?? []) {
      if (cell.type !== 'tableCell' && cell.type !== 'tableHeader') continue;
      const colspan = positiveIntAttr(cell.attrs?.colspan) ?? 1;
      const colwidth = Array.isArray(cell.attrs?.colwidth) ? cell.attrs.colwidth : [];
      const twips = colwidth
        .map((value) => pxNumericAttrToTwips(value))
        .filter((value): value is number => Boolean(value));
      if (twips.length === colspan) {
        for (let index = 0; index < colspan; index++) widths[gridColumn + index] ??= twips[index];
      } else if (twips.length === 1 && colspan > 1) {
        const split = Math.max(1, Math.round(twips[0] / colspan));
        for (let index = 0; index < colspan; index++) widths[gridColumn + index] ??= split;
      } else if (twips.length > 0) {
        widths[gridColumn] ??= twips.reduce((sum, item) => sum + item, 0);
      }
      gridColumn += colspan;
    }
    if (widths.some((width) => width > 0)) {
      return Array.from({ length: expectedColumns }, (_, index) => widths[index] ?? 1800);
    }
  }
  return undefined;
}

function tableColumnCount(block: PMNode): number {
  let max = 0;
  for (const row of block.content ?? []) {
    if (row.type !== 'tableRow') continue;
    let columns = 0;
    for (const cell of row.content ?? []) {
      if (cell.type !== 'tableCell' && cell.type !== 'tableHeader') continue;
      columns += positiveIntAttr(cell.attrs?.colspan) ?? 1;
    }
    max = Math.max(max, columns);
  }
  return max;
}

function tableLayoutFromAttrs(attrs: Record<string, unknown> | undefined): (typeof TableLayoutType)[keyof typeof TableLayoutType] | undefined {
  if (attrs?.tableLayout === 'fixed') return TableLayoutType.FIXED;
  if (attrs?.tableLayout === 'autofit') return TableLayoutType.AUTOFIT;
  return undefined;
}

function tableCellSpacingFromAttrs(attrs: Record<string, unknown> | undefined) {
  const spacing = pxNumericAttrToTwips(attrs?.tableCellSpacing);
  return spacing ? { value: spacing, type: WidthType.DXA } : undefined;
}

function tableRowHeightFromAttrs(attrs: Record<string, unknown> | undefined) {
  const rowHeight = pxNumericAttrToTwips(attrs?.rowHeight);
  if (!rowHeight) return undefined;
  return {
    value: rowHeight,
    rule: tableRowHeightRule(attrs?.rowHeightRule),
  };
}

function tableRowHeightRule(value: unknown): (typeof HeightRule)[keyof typeof HeightRule] {
  if (value === 'auto') return HeightRule.AUTO;
  if (value === 'exact') return HeightRule.EXACT;
  return HeightRule.ATLEAST;
}

function tableRowHeaderFromAttrs(attrs: Record<string, unknown> | undefined): boolean | undefined {
  return attrs?.rowHeader === true || attrs?.rowHeader === 'true' ? true : undefined;
}

function tableRowCantSplitFromAttrs(attrs: Record<string, unknown> | undefined): boolean | undefined {
  return attrs?.rowCantSplit === true || attrs?.rowCantSplit === 'true' ? true : undefined;
}

function imageRunFromAttrs(attrs: Record<string, unknown> | undefined): ImageRun | null {
  if (!attrs) return null;
  const src = attrs.src as string | undefined;
  if (!src || !src.startsWith('data:image/')) return null;
  const m = src.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
  if (!m) return null;
  let type: 'png' | 'jpg' | 'gif' | 'bmp' = 'png';
  const ext = m[1].toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') type = 'jpg';
  else if (ext === 'gif') type = 'gif';
  else if (ext === 'bmp') type = 'bmp';
  else if (ext === 'png') type = 'png';
  else return null; // svg 등은 미지원

  const binary = atob(m[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  // 크기: width/height attr (또는 원본). 없으면 480×360 기본
  const w = numericAttr(attrs.width) ?? 480;
  const h = numericAttr(attrs.height) ?? Math.round(w * 0.75);
  const floating = imageFloatingFromAttrs(attrs);
  const altText = imageAltTextFromAttrs(attrs);

  return new ImageRun({
    type,
    data: bytes,
    transformation: { width: w, height: h },
    ...(floating ? { floating } : {}),
    ...(altText ? { altText } : {}),
  } as ConstructorParameters<typeof ImageRun>[0]);
}

function imageAltTextFromAttrs(attrs: Record<string, unknown>) {
  const description = stringAttr(attrs.alt);
  const title = stringAttr(attrs.title);
  if (!description && !title) return undefined;
  return {
    name: title || description || 'Image',
    ...(description ? { description } : {}),
    ...(title ? { title } : {}),
  };
}

function imageFloatingFromAttrs(attrs: Record<string, unknown>) {
  const floating = attrs.floating === true || attrs.floating === 'true';
  const wrap = imageWrapType(attrs.wrap);
  if (!floating && !wrap) return undefined;
  return {
    horizontalPosition: {
      relative: HorizontalPositionRelativeFrom.MARGIN,
      align: imageHorizontalAlign(attrs.align),
    },
    verticalPosition: {
      relative: VerticalPositionRelativeFrom.PARAGRAPH,
      align: VerticalPositionAlign.TOP,
    },
    wrap: {
      type: wrap ?? TextWrappingType.SQUARE,
      ...(imageWrapSide(attrs.wrapSide) ? { side: imageWrapSide(attrs.wrapSide) } : {}),
    },
    margins: { left: 114300, right: 114300, top: 0, bottom: 0 },
  };
}

function imageHorizontalAlign(value: unknown): (typeof HorizontalPositionAlign)[keyof typeof HorizontalPositionAlign] {
  if (value === 'right') return HorizontalPositionAlign.RIGHT;
  if (value === 'center') return HorizontalPositionAlign.CENTER;
  return HorizontalPositionAlign.LEFT;
}

function imageWrapType(value: unknown): (typeof TextWrappingType)[keyof typeof TextWrappingType] | undefined {
  if (value === 'square') return TextWrappingType.SQUARE;
  if (value === 'tight') return TextWrappingType.TIGHT;
  if (value === 'topAndBottom') return TextWrappingType.TOP_AND_BOTTOM;
  if (value === 'none') return TextWrappingType.NONE;
  return undefined;
}

function imageWrapSide(value: unknown): (typeof TextWrappingSide)[keyof typeof TextWrappingSide] | undefined {
  if (value === 'left') return TextWrappingSide.LEFT;
  if (value === 'right') return TextWrappingSide.RIGHT;
  if (value === 'largest') return TextWrappingSide.LARGEST;
  if (value === 'bothSides') return TextWrappingSide.BOTH_SIDES;
  return undefined;
}

function imageAlignmentFor(attrs: Record<string, unknown> | undefined): (typeof AlignmentType)[keyof typeof AlignmentType] {
  const align = attrs?.align;
  if (align === 'left') return AlignmentType.LEFT;
  if (align === 'right') return AlignmentType.RIGHT;
  return AlignmentType.CENTER;
}

function numericAttr(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = v.match(/^(\d+(?:\.\d+)?)(?:px)?$/);
    if (m) return Number(m[1]);
  }
  return undefined;
}

function stringAttr(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function indentTwipsFromAttrs(attrs: Record<string, unknown> | undefined): number {
  const raw = attrs?.indent;
  const level = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(level) || level <= 0) return 0;
  return Math.max(0, Math.min(8, Math.round(level))) * 720;
}

function paragraphIndentFromAttrs(attrs: Record<string, unknown> | undefined, quote: boolean) {
  const left = indentTwipsFromAttrs(attrs) + (quote ? 720 : 0);
  const right = pxNumericAttrToTwips(attrs?.rightIndent);
  const firstLine = pxNumericAttrToTwips(attrs?.firstLineIndent);
  const hanging = firstLine ? undefined : pxNumericAttrToTwips(attrs?.hangingIndent);
  if (!left && !right && !firstLine && !hanging) return undefined;

  return {
    ...(left ? { left } : {}),
    ...(right ? { right } : {}),
    ...(firstLine ? { firstLine } : {}),
    ...(hanging ? { hanging } : {}),
  };
}

function pxNumericAttrToTwips(value: unknown): number | undefined {
  const px = numericAttr(value);
  return px != null && px > 0 ? pxToTwips(px) : undefined;
}

function booleanAttr(value: unknown): boolean | undefined {
  return value === true || value === 'true' ? true : undefined;
}

function paragraphSpacingFromAttrs(attrs: Record<string, unknown> | undefined) {
  const lineHeight = numericAttr(attrs?.lineHeight);
  const lineHeightTwips = positiveIntAttr(attrs?.lineHeightTwips);
  const lineHeightRule = paragraphLineRule(attrs?.lineHeightRule);
  const spaceBefore = numericAttr(attrs?.spaceBefore);
  const spaceAfter = numericAttr(attrs?.spaceAfter);
  if (!lineHeight && !lineHeightTwips && spaceBefore == null && spaceAfter == null) return undefined;

  return {
    ...(lineHeightTwips ? { line: lineHeightTwips, lineRule: lineHeightRule ?? LineRuleType.EXACT } : {}),
    ...(!lineHeightTwips && lineHeight ? { line: Math.round(lineHeight * 240), lineRule: LineRuleType.AUTO } : {}),
    ...(spaceBefore != null ? { before: Math.round(spaceBefore * 20) } : {}),
    ...(spaceAfter != null ? { after: Math.round(spaceAfter * 20) } : {}),
  };
}

function paragraphLineRule(value: unknown): (typeof LineRuleType)[keyof typeof LineRuleType] | undefined {
  if (value === 'exact') return LineRuleType.EXACT;
  if (value === 'atLeast') return LineRuleType.AT_LEAST;
  if (value === 'auto') return LineRuleType.AUTO;
  return undefined;
}

function paragraphTabStopsFromAttrs(attrs: Record<string, unknown> | undefined) {
  if (!Array.isArray(attrs?.tabStops)) return undefined;
  const tabStops = attrs.tabStops
    .map((item) => tabStopFromUnknown(item))
    .filter((item): item is NonNullable<ReturnType<typeof tabStopFromUnknown>> => Boolean(item));
  return tabStops.length > 0 ? tabStops : undefined;
}

function tabStopFromUnknown(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Record<string, unknown>;
  const type = tabStopType(item.type);
  const position = positiveIntAttr(item.positionTwips);
  if (!type || !position) return undefined;
  const leader = tabLeaderType(item.leader);
  return {
    type,
    position,
    ...(leader ? { leader } : {}),
  };
}

function tabStopType(value: unknown): (typeof TabStopType)[keyof typeof TabStopType] | undefined {
  if (value === 'right') return TabStopType.RIGHT;
  if (value === 'center') return TabStopType.CENTER;
  if (value === 'decimal') return TabStopType.DECIMAL;
  if (value === 'bar') return TabStopType.BAR;
  if (value === 'left') return TabStopType.LEFT;
  return undefined;
}

function tabLeaderType(value: unknown): (typeof LeaderType)[keyof typeof LeaderType] | undefined {
  if (value === 'dot') return LeaderType.DOT;
  if (value === 'hyphen') return LeaderType.HYPHEN;
  if (value === 'middleDot') return LeaderType.MIDDLE_DOT;
  if (value === 'underscore') return LeaderType.UNDERSCORE;
  if (value === 'none') return LeaderType.NONE;
  return undefined;
}

function textBoxParagraphsFromNode(block: PMNode, context: ExportContext): Paragraph[] {
  const runs = inlinesToRuns(block.content ?? [], context);
  if (runs.length === 0) runs.push(new TextRun(''));
  return [new Paragraph({ children: runs })];
}

function docxTocInstruction(attrs: Record<string, unknown> | undefined): string {
  const instruction = typeof attrs?.instruction === 'string' ? attrs.instruction.trim() : '';
  return /\bTOC\b/i.test(instruction) ? instruction : 'TOC \\o "1-3" \\h \\z \\u';
}

function docxTocCachedText(block: PMNode): string {
  const text = plainTextFromNodes(block.content ?? []).trim();
  return text.replace(/^Table of contents\s*/i, '').trim();
}

function plainTextFromNodes(nodes: PMNode[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    if (node.text) parts.push(node.text);
    if (node.type === 'hardBreak') parts.push('\n');
    if (node.content?.length) parts.push(plainTextFromNodes(node.content));
  }
  return parts.join('');
}

function paragraphChildrenWithBookmark(children: ParagraphChild[], attrs: Record<string, unknown> | undefined): ParagraphChild[] {
  const bookmarkId = bookmarkIdFromAttrs(attrs);
  if (!bookmarkId) return children;
  return [new Bookmark({ id: bookmarkId, children })];
}

function bookmarkIdFromAttrs(attrs: Record<string, unknown> | undefined): string | undefined {
  const raw = attrs?.bookmarkId ?? attrs?.id;
  if (typeof raw !== 'string') return undefined;
  const id = safeBookmarkId(raw);
  return id || undefined;
}

function safeBookmarkId(value: string): string {
  const id = value.trim().replace(/^#/, '').replace(/[^A-Za-z0-9_:-]/g, '_');
  if (!id || /^\d/.test(id)) return id ? `_${id}` : '';
  return id;
}

function paragraphShadingFromAttrs(attrs: Record<string, unknown> | undefined) {
  const fill = hexColorAttr(attrs?.paragraphBackgroundColor);
  return fill ? { fill } : undefined;
}

function paragraphBordersFromAttrs(attrs: Record<string, unknown> | undefined) {
  const color = hexColorAttr(attrs?.paragraphBorderColor);
  const size = positiveIntAttr(attrs?.paragraphBorderSize);
  const space = positiveIntAttr(attrs?.paragraphBorderSpace);
  const top = paragraphBorderSideFromAttrs(attrs, 'Top', color, size, space);
  const right = paragraphBorderSideFromAttrs(attrs, 'Right', color, size, space);
  const bottom = paragraphBorderSideFromAttrs(attrs, 'Bottom', color, size, space);
  const left = paragraphBorderSideFromAttrs(attrs, 'Left', color, size, space);
  if (top || right || bottom || left) {
    return {
      ...(top ? { top } : {}),
      ...(right ? { right } : {}),
      ...(bottom ? { bottom } : {}),
      ...(left ? { left } : {}),
    };
  }
  if (!color && !size) return undefined;
  const border = paragraphBorderOptions(color, size, space);
  return { top: border, right: border, bottom: border, left: border };
}

function paragraphBorderSideFromAttrs(
  attrs: Record<string, unknown> | undefined,
  side: 'Top' | 'Right' | 'Bottom' | 'Left',
  fallbackColor?: string,
  fallbackSize?: number,
  fallbackSpace?: number,
) {
  const color = hexColorAttr(attrs?.[`paragraphBorder${side}Color`]) ?? fallbackColor;
  const size = positiveIntAttr(attrs?.[`paragraphBorder${side}Size`]) ?? fallbackSize;
  const space = positiveIntAttr(attrs?.[`paragraphBorder${side}Space`]) ?? fallbackSpace;
  if (!color && !size) return undefined;
  return paragraphBorderOptions(color, size, space);
}

function paragraphBorderOptions(color?: string, size?: number, space?: number) {
  return {
    style: BorderStyle.SINGLE,
    color: color ?? TABLE_BORDER.color,
    size: size ?? TABLE_BORDER.size,
    ...(space ? { space } : {}),
  };
}

function hexColorAttr(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.trim().match(/^#?([0-9a-f]{6})$/i);
  return match ? match[1].toUpperCase() : undefined;
}

function positiveIntAttr(value: unknown): number | undefined {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : undefined;
}

function inlinesToRuns(content: PMNode[], context: ExportContext): ParagraphChild[] {
  const runs: ParagraphChild[] = [];
  for (const node of content) {
    if (node.type === 'text' && node.text) {
      runs.push(...inlineTextToDocx(node.text, node.marks ?? [], context));
    } else if (node.type === 'hardBreak') {
      runs.push(new TextRun({ text: '', break: 1 }));
    } else if (node.type === 'image') {
      // 인라인 이미지 (Image extension inline:true 인 경우)
      const img = imageRunFromAttrs(node.attrs);
      if (img) runs.push(img);
    } else if (node.type === 'footnote') {
      runs.push(noteRunFromNode(node, context));
    } else if (node.type === 'docxMath') {
      const math = mathRunFromNode(node);
      if (math) runs.push(math);
    }
  }
  return runs;
}

function inlineTextToDocx(
  text: string,
  marks: PMNode['marks'],
  context: ExportContext,
): ParagraphChild[] {
  const linkMark = marks?.find((m) => m.type === 'link');
  const revisionMark = marks?.find((m) => m.type === 'revision');
  if (revisionMark) {
    const options = revisionRunOptions(text, marks ?? [], revisionMark, context);
    return [
      revisionMark.attrs?.type === 'delete'
        ? new DeletedTextRun(options)
        : new InsertedTextRun(options),
    ];
  }
  const inlineRuns = textRunsWithControls(text, marks ?? []);
  const href = linkMark?.attrs?.href;
  const children: ParagraphChild[] = [];
  const commentMark = marks?.find((m) => m.type === 'comment');
  const commentId = commentMark ? ensureComment(commentMark, context) : null;

  if (commentId != null) children.push(new CommentRangeStart(commentId));

  if (typeof href === 'string' && href.startsWith('#') && safeBookmarkId(href)) {
    children.push(new InternalHyperlink({
      anchor: safeBookmarkId(href),
      children: inlineRuns,
    }));
  } else if (typeof href === 'string' && /^(https?:|mailto:)/i.test(href)) {
    children.push(new ExternalHyperlink({
      link: href,
      children: inlineRuns,
    }));
  } else {
    children.push(...inlineRuns);
  }

  if (commentId != null) {
    children.push(new CommentRangeEnd(commentId));
    children.push(new CommentReference(commentId));
  }

  return children;
}

function textRunsWithControls(text: string, marks: NonNullable<PMNode['marks']>): ParagraphChild[] {
  if (!/[\t\n]/.test(text)) return [new TextRun(runOptionsForText(text, marks))];

  const runs: ParagraphChild[] = [];
  const formatting = runFormattingOptions(marks);
  const parts = text.split(/(\t|\n)/);
  for (const part of parts) {
    if (!part) continue;
    if (part === '\t') {
      runs.push(new TextRun({ ...formatting, children: [new Tab()] }));
    } else if (part === '\n') {
      runs.push(new TextRun({ ...formatting, text: '', break: 1 }));
    } else {
      runs.push(new TextRun({ ...formatting, text: part }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun(runOptionsForText('', marks))];
}

function revisionRunOptions(
  text: string,
  marks: NonNullable<PMNode['marks']>,
  revisionMark: NonNullable<PMNode['marks']>[number],
  context: ExportContext,
): ConstructorParameters<typeof InsertedTextRun>[0] {
  const id = positiveIntAttr(revisionMark.attrs?.id) ?? context.nextRevisionId;
  if (id >= context.nextRevisionId) context.nextRevisionId = id + 1;
  const author = typeof revisionMark.attrs?.author === 'string' && revisionMark.attrs.author.trim()
    ? revisionMark.attrs.author.trim()
    : 'Reviewer';
  const date = typeof revisionMark.attrs?.date === 'string' && revisionMark.attrs.date.trim()
    ? revisionMark.attrs.date.trim()
    : new Date().toISOString();
  return {
    ...runOptionsForText(text, marks.filter((mark) => mark.type !== 'revision')),
    id,
    author,
    date,
  };
}

function runOptionsForText(text: string, marks: NonNullable<PMNode['marks']>): ConstructorParameters<typeof TextRun>[0] {
  return {
    ...runFormattingOptions(marks),
    text,
  };
}

function runFormattingOptions(marks: NonNullable<PMNode['marks']>): Omit<ConstructorParameters<typeof TextRun>[0], 'text'> {
  const bold = marks.some((m) => m.type === 'bold');
  const italic = marks.some((m) => m.type === 'italic');
  const underline = marks.some((m) => m.type === 'underline');
  const strike = marks.some((m) => m.type === 'strike');
  const code = marks.some((m) => m.type === 'code');
  const subScript = marks.some((m) => m.type === 'subscript');
  const superScript = marks.some((m) => m.type === 'superscript');
  const colorMark = marks.find((m) => m.type === 'textStyle');
  const highlightMark = marks.find((m) => m.type === 'highlight');
  const linkMark = marks.find((m) => m.type === 'link');
  const color = colorMark?.attrs?.color as string | undefined;
  const fontSize = colorMark?.attrs?.fontSize as string | undefined;
  const fontFamily = fontOptionsFromTextStyle(colorMark?.attrs, code);
  const complexScriptFontSize = positiveIntAttr(colorMark?.attrs?.complexScriptFontSize);
  const complexScriptHighlight = highlightColorAttr(colorMark?.attrs?.complexScriptHighlight);
  const highlightColor = normalizeColor(highlightMark?.attrs?.color as string | undefined);
  const characterSpacing = numericAttr(colorMark?.attrs?.characterSpacing);
  const textScale = numericAttr(colorMark?.attrs?.textScale);
  const textPosition = numericAttr(colorMark?.attrs?.textPosition);
  const underlineOptions = underlineOptionsFromMarks(marks, Boolean(linkMark));
  const doubleStrike = booleanAttr(colorMark?.attrs?.doubleStrike);
  const textEffect = textEffectAttr(colorMark?.attrs?.textEffect);
  const language = languageOptionsFromTextStyle(colorMark?.attrs);
  const kerning = positiveIntAttr(colorMark?.attrs?.kerning);
  const emphasisMark = emphasisMarkAttr(colorMark?.attrs?.emphasisMark);
  const border = runBorderOptionsFromTextStyle(colorMark?.attrs);

  return {
    bold,
    italics: italic,
    underline: underlineOptions ?? (underline || linkMark ? {} : undefined),
    strike,
    doubleStrike: doubleStrike || undefined,
    subScript,
    superScript,
    boldComplexScript: booleanAttr(colorMark?.attrs?.complexScriptBold) || undefined,
    italicsComplexScript: booleanAttr(colorMark?.attrs?.complexScriptItalic) || undefined,
    font: fontFamily,
    color: normalizeColor(color) ?? (linkMark ? '0563C1' : undefined),
    size: fontSize ? parsePtFromPx(fontSize) : undefined,
    sizeComplexScript: complexScriptFontSize ? Math.round((complexScriptFontSize / 1.333) * 2) : undefined,
    highlightComplexScript: complexScriptHighlight,
    shading: highlightColor ? { fill: highlightColor } : undefined,
    smallCaps: booleanAttr(colorMark?.attrs?.smallCaps) || undefined,
    allCaps: booleanAttr(colorMark?.attrs?.allCaps) || undefined,
    characterSpacing: characterSpacing ? Math.round(characterSpacing) : undefined,
    scale: textScale && textScale > 0 && textScale !== 100 ? Math.round(textScale) : undefined,
    position: textPosition ? `${Math.round(textPosition / 2)}pt` : undefined,
    vanish: booleanAttr(colorMark?.attrs?.hiddenText) || undefined,
    specVanish: booleanAttr(colorMark?.attrs?.specHiddenText) || undefined,
    emboss: booleanAttr(colorMark?.attrs?.emboss) || undefined,
    imprint: booleanAttr(colorMark?.attrs?.imprint) || undefined,
    effect: textEffect,
    language,
    kern: kerning,
    rightToLeft: booleanAttr(colorMark?.attrs?.rightToLeft) || undefined,
    noProof: booleanAttr(colorMark?.attrs?.noProof) || undefined,
    snapToGrid: booleanAttr(colorMark?.attrs?.snapToGrid) || undefined,
    emphasisMark,
    math: booleanAttr(colorMark?.attrs?.mathRun) || undefined,
    border,
  };
}

function textEffectAttr(value: unknown): (typeof TextEffect)[keyof typeof TextEffect] | undefined {
  if (
    value === TextEffect.BLINK_BACKGROUND
    || value === TextEffect.LIGHTS
    || value === TextEffect.ANTS_BLACK
    || value === TextEffect.ANTS_RED
    || value === TextEffect.SHIMMER
    || value === TextEffect.SPARKLE
    || value === TextEffect.NONE
  ) {
    return value;
  }
  return undefined;
}

function emphasisMarkAttr(value: unknown): ConstructorParameters<typeof TextRun>[0]['emphasisMark'] {
  return value === EmphasisMarkType.DOT ? { type: EmphasisMarkType.DOT } : undefined;
}

function highlightColorAttr(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = normalizeColor(value);
  if (!normalized) return undefined;
  return HIGHLIGHT_COLOR_BY_HEX[normalized.toUpperCase()];
}

const HIGHLIGHT_COLOR_BY_HEX: Record<string, string> = {
  FFFF00: 'yellow',
  '00FF00': 'green',
  '00FFFF': 'cyan',
  FF00FF: 'magenta',
  '0000FF': 'blue',
  FF0000: 'red',
  '000080': 'darkBlue',
  '008080': 'darkCyan',
  '008000': 'darkGreen',
  '800080': 'darkMagenta',
  '800000': 'darkRed',
  '808000': 'darkYellow',
  '808080': 'darkGray',
  C0C0C0: 'lightGray',
  '000000': 'black',
};

function fontOptionsFromTextStyle(
  attrs: Record<string, unknown> | undefined,
  code: boolean,
): ConstructorParameters<typeof TextRun>[0]['font'] {
  if (code) return 'Courier New';
  const family = typeof attrs?.fontFamily === 'string' && attrs.fontFamily.trim()
    ? normalizeDocxFontFamily(attrs.fontFamily)
    : undefined;
  const complexScript = typeof attrs?.complexScriptFontFamily === 'string' && attrs.complexScriptFontFamily.trim()
    ? normalizeDocxFontFamily(attrs.complexScriptFontFamily)
    : undefined;
  if (!family && !complexScript) return undefined;
  return {
    ...(family ? { ascii: family, hAnsi: family, eastAsia: eastAsiaFontFamily(family) } : {}),
    cs: complexScript ?? family,
  };
}

function normalizeDocxFontFamily(value: string): string {
  const first = value.split(',')[0]?.trim() ?? value.trim();
  return first.replace(/^["']|["']$/g, '') || 'Malgun Gothic';
}

function eastAsiaFontFamily(family: string): string {
  const lower = family.toLowerCase();
  if (lower.includes('noto sans')) return 'Noto Sans CJK KR';
  if (lower.includes('noto serif')) return 'Noto Serif CJK KR';
  if (lower.includes('nanum gothic')) return 'NanumGothic';
  if (lower.includes('nanum myeongjo')) return 'NanumMyeongjo';
  if (lower.includes('batang')) return 'Batang';
  if (lower.includes('gulim')) return 'Gulim';
  if (lower.includes('malgun')) return 'Malgun Gothic';
  return family;
}

function runBorderOptionsFromTextStyle(
  attrs: Record<string, unknown> | undefined,
): ConstructorParameters<typeof TextRun>[0]['border'] {
  const style = borderStyleAttr(attrs?.runBorderStyle);
  if (!style) return undefined;
  const color = normalizeColor(attrs?.runBorderColor as string | undefined);
  const size = positiveIntAttr(attrs?.runBorderSize);
  const space = positiveIntAttr(attrs?.runBorderSpace);
  return {
    style,
    ...(color ? { color } : {}),
    ...(size ? { size } : {}),
    ...(space ? { space } : {}),
  };
}

function borderStyleAttr(value: unknown): (typeof BorderStyle)[keyof typeof BorderStyle] | undefined {
  if (value === BorderStyle.SINGLE) return BorderStyle.SINGLE;
  if (value === BorderStyle.DASHED) return BorderStyle.DASHED;
  if (value === BorderStyle.DASH_SMALL_GAP) return BorderStyle.DASH_SMALL_GAP;
  if (value === BorderStyle.DOTTED) return BorderStyle.DOTTED;
  if (value === BorderStyle.DOUBLE) return BorderStyle.DOUBLE;
  if (value === BorderStyle.THICK) return BorderStyle.THICK;
  return undefined;
}

function languageOptionsFromTextStyle(
  attrs: Record<string, unknown> | undefined,
): ConstructorParameters<typeof TextRun>[0]['language'] {
  const value = languageTagAttr(attrs?.language);
  const eastAsia = languageTagAttr(attrs?.eastAsiaLanguage);
  const bidirectional = languageTagAttr(attrs?.bidiLanguage);
  if (!value && !eastAsia && !bidirectional) return undefined;
  return {
    ...(value ? { value } : {}),
    ...(eastAsia ? { eastAsia } : {}),
    ...(bidirectional ? { bidirectional } : {}),
  };
}

function languageTagAttr(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'none') return undefined;
  return /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(trimmed) ? trimmed : undefined;
}

function underlineOptionsFromMarks(
  marks: NonNullable<PMNode['marks']>,
  isLink: boolean,
): ConstructorParameters<typeof TextRun>[0]['underline'] {
  const textStyle = marks.find((m) => m.type === 'textStyle');
  const type = underlineType(textStyle?.attrs?.underlineStyle);
  const color = normalizeColor(textStyle?.attrs?.underlineColor as string | undefined);
  if (!type && !color) return undefined;
  return {
    type: type ?? (isLink ? undefined : UnderlineType.SINGLE),
    ...(color ? { color } : {}),
  };
}

function underlineType(value: unknown): (typeof UnderlineType)[keyof typeof UnderlineType] | undefined {
  if (value === 'words') return UnderlineType.WORDS;
  if (value === 'double') return UnderlineType.DOUBLE;
  if (value === 'thick') return UnderlineType.THICK;
  if (value === 'dotted') return UnderlineType.DOTTED;
  if (value === 'dottedHeavy') return UnderlineType.DOTTEDHEAVY;
  if (value === 'dash') return UnderlineType.DASH;
  if (value === 'dashedHeavy') return UnderlineType.DASHEDHEAVY;
  if (value === 'dashLong') return UnderlineType.DASHLONG;
  if (value === 'dashLongHeavy') return UnderlineType.DASHLONGHEAVY;
  if (value === 'dotDash') return UnderlineType.DOTDASH;
  if (value === 'dashDotHeavy') return UnderlineType.DASHDOTHEAVY;
  if (value === 'dotDotDash') return UnderlineType.DOTDOTDASH;
  if (value === 'dashDotDotHeavy') return UnderlineType.DASHDOTDOTHEAVY;
  if (value === 'wave') return UnderlineType.WAVE;
  if (value === 'wavyHeavy') return UnderlineType.WAVYHEAVY;
  if (value === 'wavyDouble') return UnderlineType.WAVYDOUBLE;
  if (value === 'single') return UnderlineType.SINGLE;
  return undefined;
}

function noteRunFromNode(node: PMNode, context: ExportContext): ParagraphChild {
  return node.attrs?.noteType === 'endnote'
    ? endnoteRunFromNode(node, context)
    : footnoteRunFromNode(node, context);
}

function mathRunFromNode(node: PMNode): ParagraphChild | null {
  const raw = typeof node.attrs?.omml === 'string' ? node.attrs.omml : '';
  if (!raw) return null;
  try {
    const xml = decodeURIComponent(raw);
    if (!/^<m:oMath(?:Para)?\b[\s\S]*<\/m:oMath(?:Para)?>$/i.test(xml.trim())) return null;
    return ImportedXmlComponent.fromXmlString(xml) as unknown as ParagraphChild;
  } catch {
    return null;
  }
}

function footnoteRunFromNode(node: PMNode, context: ExportContext): FootnoteReferenceRun {
  const key = String(node.attrs?.id ?? `fn_${context.nextFootnoteId}`);
  const existing = context.footnoteIdByKey.get(key);
  if (existing) return new FootnoteReferenceRun(existing);

  const id = context.nextFootnoteId;
  context.nextFootnoteId += 1;
  context.footnoteIdByKey.set(key, id);
  const text = String(node.attrs?.text ?? '').trim() || '(빈 각주)';
  context.footnotes[String(id)] = {
    children: [
      new Paragraph({
        children: [new TextRun(text)],
      }),
    ],
  };
  return new FootnoteReferenceRun(id);
}

function endnoteRunFromNode(node: PMNode, context: ExportContext): ParagraphChild {
  const key = String(node.attrs?.id ?? `en_${context.nextEndnoteId}`);
  const existing = context.endnoteIdByKey.get(key);
  if (existing) return new EndnoteReferenceRun(existing) as unknown as ParagraphChild;

  const id = context.nextEndnoteId;
  context.nextEndnoteId += 1;
  context.endnoteIdByKey.set(key, id);
  const text = String(node.attrs?.text ?? '').trim() || '(빈 미주)';
  context.endnotes[String(id)] = {
    children: [
      new Paragraph({
        children: [new TextRun(text)],
      }),
    ],
  };
  return new EndnoteReferenceRun(id) as unknown as ParagraphChild;
}

function ensureComment(mark: NonNullable<PMNode['marks']>[number], context: ExportContext): number {
  const key = String(mark.attrs?.id ?? `comment_${context.nextCommentId}`);
  const existing = context.commentIdByKey.get(key);
  if (existing) return existing;

  const id = context.nextCommentId;
  context.nextCommentId += 1;
  context.commentIdByKey.set(key, id);

  const text = String(mark.attrs?.text ?? '').trim() || '(빈 댓글)';
  const author = String(mark.attrs?.author ?? 'Me');
  const createdAt = typeof mark.attrs?.createdAt === 'string' ? new Date(mark.attrs.createdAt) : undefined;
  context.comments[key] = {
    id,
    author,
    date: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : undefined,
    children: [
      new Paragraph({
        children: [new TextRun(text)],
      }),
    ],
  };

  return id;
}

function normalizeColor(c: string | undefined): string | undefined {
  if (!c) return undefined;
  // hex만 처리 (docx는 RRGGBB 형식)
  if (c.startsWith('#')) {
    return c.slice(1).toUpperCase();
  }
  return undefined;
}

function parsePtFromPx(px: string): number | undefined {
  const m = px.match(/^(\d+(?:\.\d+)?)px$/);
  if (!m) return undefined;
  // docx size: half-points. 16px ≈ 12pt = 24 half-pt
  const pt = Number(m[1]) * 0.75;
  return Math.round(pt * 2);
}

function headingFor(level: number | undefined): (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined {
  if (level === 1) return HeadingLevel.HEADING_1;
  if (level === 2) return HeadingLevel.HEADING_2;
  if (level === 3) return HeadingLevel.HEADING_3;
  if (level === 4) return HeadingLevel.HEADING_4;
  if (level === 5) return HeadingLevel.HEADING_5;
  if (level === 6) return HeadingLevel.HEADING_6;
  return undefined;
}

function alignmentFor(align: string | undefined): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  if (align === 'left') return AlignmentType.LEFT;
  if (align === 'center') return AlignmentType.CENTER;
  if (align === 'right') return AlignmentType.RIGHT;
  if (align === 'justify') return AlignmentType.JUSTIFIED;
  return undefined;
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
