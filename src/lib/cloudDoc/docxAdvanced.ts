/**
 * .docx 자체 OOXML 파서 — mammoth 가 놓치는 부분 보완.
 *
 *  - word/document.xml: 페이지 break 위치 (<w:br w:type="page"/>)
 *  - word/header*.xml, word/footer*.xml: 헤더/푸터 텍스트
 *  - word/footnotes.xml: 각주 id → text 매핑
 *
 * 정책:
 *  - JSZip + fast-xml-parser (이미 cloudSlide/pptx.ts 에서 검증된 패턴)
 *  - 실패해도 빈 결과 반환 (safe fallback) — mammoth 결과로라도 import
 *    완료되게
 *  - run 별 inline color/font 은 별도 작업 (이번 단계 X — 추후 운영하며
 *    실제 손실 사례 보고 결정)
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

export interface DocxAdvancedData {
  /** paragraph index 기준 페이지 break (어느 단락 끝에서 다음 페이지로 넘어가는지). */
  pageBreakParagraphs: number[];
  /** paragraph index + text offset. Mammoth drops inline page breaks, so this restores them. */
  pageBreaks: DocxPageBreak[];
  /** paragraph index + text offset for column breaks inside multi-column sections. */
  columnBreaks: DocxPageBreak[];
  /** paragraph index 기준 DOCX section break. */
  sectionBreaks: DocxSectionBreak[];
  paragraphIndents: DocxParagraphIndent[];
  paragraphAlignments: DocxParagraphAlignment[];
  paragraphOutlineLevels: DocxParagraphOutlineLevel[];
  paragraphPagination: DocxParagraphPagination[];
  paragraphTabStops: DocxParagraphTabStops[];
  paragraphSpacings: DocxParagraphSpacing[];
  paragraphDecorations: DocxParagraphDecoration[];
  paragraphBookmarks: DocxParagraphBookmark[];
  linkRanges: DocxLinkRange[];
  textBoxes: DocxTextBox[];
  tocFields: DocxTocField[];
  mathObjects: DocxMathObject[];
  trackedChanges: DocxTrackedChange[];
  listStarts: DocxListStart[];
  bulletListStyles: DocxBulletListStyle[];
  runStyles: DocxRunStyle[];
  tableStyles: DocxTableStyle[];
  tableRowStyles: DocxTableRowStyle[];
  tableCellStyles: DocxTableCellStyle[];
  imageDimensions: DocxImageDimension[];
  comments: Map<string, DocxComment>;
  commentRanges: DocxCommentRange[];
  pageMargin?: DocxPageMargin;
  pageSize?: DocxPageSize;
  sectionColumns?: DocxSectionColumns;
  headerAlign?: DocxTextAlign;
  footerAlign?: DocxTextAlign;
  headerHasPageNumber?: boolean;
  footerHasPageNumber?: boolean;
  headerImages: DocxHeaderFooterImage[];
  footerImages: DocxHeaderFooterImage[];
  /** 모든 header 파일 텍스트 join. */
  headerText: string;
  /** 모든 footer 파일 텍스트 join. */
  footerText: string;
  /** 각주 매핑: id → text (separator 항목 제외). */
  footnotes: Map<string, string>;
  endnotes: Map<string, string>;
  endnoteReferences: DocxNoteReference[];
}

export interface DocxPageBreak {
  paragraphIndex: number;
  textOffset: number;
}

export type DocxSectionBreakType = 'nextPage' | 'continuous' | 'evenPage' | 'oddPage' | 'nextColumn';

export interface DocxSectionBreak {
  paragraphIndex: number;
  type: DocxSectionBreakType;
  pageMargin?: DocxPageMargin;
  pageSize?: DocxPageSize;
  sectionColumns?: DocxSectionColumns;
}

export interface DocxParagraphIndent {
  paragraphIndex: number;
  leftTwips: number;
  rightTwips?: number;
  firstLineTwips?: number;
  hangingTwips?: number;
}

export interface DocxParagraphAlignment {
  paragraphIndex: number;
  align: DocxTextAlign;
}

export type DocxTextAlign = 'left' | 'center' | 'right' | 'justify';

export interface DocxParagraphOutlineLevel {
  paragraphIndex: number;
  level: number;
}

export interface DocxHeaderFooterImage {
  src: string;
  width: number;
  height: number;
  align?: DocxTextAlign;
  alt?: string;
  title?: string;
}

export interface DocxParagraphPagination {
  paragraphIndex: number;
  pageBreakBefore?: boolean;
  keepNext?: boolean;
  keepLines?: boolean;
  widowControl?: boolean;
  contextualSpacing?: boolean;
  suppressLineNumbers?: boolean;
  bidirectional?: boolean;
  wordWrap?: boolean;
  overflowPunctuation?: boolean;
  autoSpaceEastAsianText?: boolean;
}

export interface DocxParagraphTabStop {
  type: 'left' | 'right' | 'center' | 'decimal' | 'bar';
  positionTwips: number;
  leader?: 'dot' | 'hyphen' | 'middleDot' | 'underscore' | 'none';
}

export interface DocxParagraphTabStops {
  paragraphIndex: number;
  tabStops: DocxParagraphTabStop[];
}

export interface DocxParagraphSpacing {
  paragraphIndex: number;
  beforeTwips?: number;
  afterTwips?: number;
  line?: number;
  lineRule?: 'auto' | 'exact' | 'atLeast';
}

interface DocxParagraphStyleProperties {
  indent?: Omit<DocxParagraphIndent, 'paragraphIndex'>;
  align?: DocxTextAlign;
  outlineLevel?: number;
  pagination?: Omit<DocxParagraphPagination, 'paragraphIndex'>;
  spacing?: Omit<DocxParagraphSpacing, 'paragraphIndex'>;
  decoration?: Omit<DocxParagraphDecoration, 'paragraphIndex'>;
}

export interface DocxParagraphDecoration {
  paragraphIndex: number;
  backgroundColor?: string;
  borders?: DocxParagraphBorders;
}

export interface DocxBorderSide {
  color?: string;
  size?: number;
  space?: number;
}

export interface DocxParagraphBorders {
  top?: DocxBorderSide;
  right?: DocxBorderSide;
  bottom?: DocxBorderSide;
  left?: DocxBorderSide;
}

export interface DocxParagraphBookmark {
  paragraphIndex: number;
  id: string;
}

export interface DocxLinkRange {
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  href: string;
}

export interface DocxTextBox {
  text: string;
}

export interface DocxTocField {
  paragraphIndex: number;
  instruction: string;
  text?: string;
}

export interface DocxMathObject {
  paragraphIndex: number;
  textOffset: number;
  omml: string;
  text?: string;
}

export interface DocxListStart {
  listIndex: number;
  start: number;
  format?: string;
  suffix?: 'tab' | 'space' | 'nothing';
  leftTwips?: number;
  hangingTwips?: number;
}

export interface DocxBulletListStyle {
  listIndex: number;
  format?: string;
  text?: string;
  suffix?: 'tab' | 'space' | 'nothing';
  leftTwips?: number;
  hangingTwips?: number;
}

export interface DocxRunStyle {
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  bold?: boolean;
  complexScriptBold?: boolean;
  italic?: boolean;
  complexScriptItalic?: boolean;
  underline?: boolean;
  underlineStyle?: DocxUnderlineStyle;
  underlineColor?: string;
  strike?: boolean;
  doubleStrike?: boolean;
  verticalAlign?: 'superscript' | 'subscript';
  color?: string;
  highlightColor?: string;
  complexScriptHighlightColor?: string;
  fontFamily?: string;
  complexScriptFontFamily?: string;
  fontSizePx?: number;
  complexScriptFontSizePx?: number;
  smallCaps?: boolean;
  allCaps?: boolean;
  characterSpacingTwips?: number;
  textScale?: number;
  textPositionHalfPoints?: number;
  hiddenText?: boolean;
  specHiddenText?: boolean;
  emboss?: boolean;
  imprint?: boolean;
  textEffect?: DocxTextEffect;
  language?: string;
  eastAsiaLanguage?: string;
  bidiLanguage?: string;
  kerningHalfPoints?: number;
  rightToLeft?: boolean;
  noProof?: boolean;
  snapToGrid?: boolean;
  emphasisMark?: DocxEmphasisMark;
  mathRun?: boolean;
  runBorder?: DocxRunBorder;
}

export type DocxEmphasisMark = 'dot';

export interface DocxRunBorder {
  style: string;
  color?: string;
  size?: number;
  space?: number;
}

export type DocxTextEffect =
  | 'blinkBackground'
  | 'lights'
  | 'antsBlack'
  | 'antsRed'
  | 'shimmer'
  | 'sparkle'
  | 'none';

export type DocxUnderlineStyle =
  | 'single'
  | 'words'
  | 'double'
  | 'thick'
  | 'dotted'
  | 'dottedHeavy'
  | 'dash'
  | 'dashedHeavy'
  | 'dashLong'
  | 'dashLongHeavy'
  | 'dotDash'
  | 'dashDotHeavy'
  | 'dotDotDash'
  | 'dashDotDotHeavy'
  | 'wave'
  | 'wavyHeavy'
  | 'wavyDouble';

export interface DocxTrackedChange {
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  type: 'insert' | 'delete';
  text: string;
  id?: string;
  author?: string;
  date?: string;
}

export interface DocxNoteReference {
  paragraphIndex: number;
  textOffset: number;
  id: string;
}

export interface DocxTableStyle {
  tableIndex: number;
  widthTwips?: number;
  widthPercent?: number;
  columnWidthsTwips?: number[];
  align?: 'left' | 'center' | 'right';
  layout?: 'fixed' | 'autofit';
  cellSpacingTwips?: number;
  caption?: string;
  description?: string;
}

export interface DocxTableRowStyle {
  tableIndex: number;
  rowIndex: number;
  heightTwips?: number;
  heightRule?: 'auto' | 'atLeast' | 'exact';
  tableHeader?: boolean;
  cantSplit?: boolean;
}

export interface DocxTableCellStyle {
  tableIndex: number;
  rowIndex: number;
  cellIndex: number;
  gridColumn: number;
  colSpan?: number;
  rowSpan?: number;
  verticalMergeContinue?: boolean;
  backgroundColor?: string;
  widthTwips?: number;
  borderColor?: string;
  borderSize?: number;
  cellBorders?: DocxCellBorders;
  verticalAlign?: 'top' | 'center' | 'bottom';
  textDirection?: DocxCellTextDirection;
  cellMargins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export type DocxCellTextDirection = 'lrTb' | 'tbRl' | 'btLr';

export interface DocxCellBorderSide {
  color?: string;
  size?: number;
}

export interface DocxCellBorders {
  top?: DocxCellBorderSide;
  right?: DocxCellBorderSide;
  bottom?: DocxCellBorderSide;
  left?: DocxCellBorderSide;
}

export interface DocxImageDimension {
  imageIndex: number;
  width: number;
  height: number;
  align?: 'left' | 'center' | 'right' | 'justify';
  floating?: boolean;
  wrap?: 'square' | 'tight' | 'topAndBottom' | 'none';
  wrapSide?: 'bothSides' | 'left' | 'right' | 'largest';
  alt?: string;
  title?: string;
}

export interface DocxComment {
  id: string;
  text: string;
  author: string;
  createdAt?: string;
}

export interface DocxCommentRange {
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  commentId: string;
}

export interface DocxPageMargin {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface DocxPageSize {
  width: number;
  height: number;
  orientation?: 'portrait' | 'landscape';
}

export interface DocxSectionColumns {
  count: number;
  space?: number;
  separate?: boolean;
  equalWidth?: boolean;
}

const EMPTY_RESULT: DocxAdvancedData = {
  pageBreakParagraphs: [],
  pageBreaks: [],
  columnBreaks: [],
  sectionBreaks: [],
  paragraphIndents: [],
  paragraphAlignments: [],
  paragraphOutlineLevels: [],
  paragraphPagination: [],
  paragraphTabStops: [],
  paragraphSpacings: [],
  paragraphDecorations: [],
  paragraphBookmarks: [],
  linkRanges: [],
  textBoxes: [],
  tocFields: [],
  mathObjects: [],
  trackedChanges: [],
  listStarts: [],
  bulletListStyles: [],
  runStyles: [],
  tableStyles: [],
  tableRowStyles: [],
  tableCellStyles: [],
  imageDimensions: [],
  comments: new Map(),
  commentRanges: [],
  headerText: '',
  footerText: '',
  headerImages: [],
  footerImages: [],
  footnotes: new Map(),
  endnotes: new Map(),
  endnoteReferences: [],
};

export async function parseDocxAdvanced(input: File | ArrayBuffer): Promise<DocxAdvancedData> {
  try {
    const buffer = input instanceof File ? await readFileArrayBuffer(input) : input;
    const zip = await JSZip.loadAsync(buffer);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (name) =>
        ['w:p', 'w:r', 'w:br', 'w:footnote', 'w:tbl', 'w:tr', 'w:tc', 'w:comment'].includes(name),
    });

    const pageBreaks = await extractPageBreaks(zip, parser);
    const columnBreaks = await extractColumnBreaks(zip, parser);
    const sectionBreaks = await extractSectionBreaks(zip, parser);
    const pageBreakParagraphs = Array.from(new Set(pageBreaks.map((item) => item.paragraphIndex)));
    const paragraphIndents = await extractParagraphIndents(zip, parser);
    const paragraphAlignments = await extractParagraphAlignments(zip, parser);
    const paragraphOutlineLevels = await extractParagraphOutlineLevels(zip, parser);
    const paragraphPagination = await extractParagraphPagination(zip, parser);
    const paragraphTabStops = await extractParagraphTabStops(zip, parser);
    const paragraphSpacings = await extractParagraphSpacings(zip, parser);
    const paragraphDecorations = await extractParagraphDecorations(zip, parser);
    const { paragraphBookmarks, linkRanges } = await extractBookmarksAndLinks(zip);
    const tocFields = await extractTocFields(zip);
    const mathObjects = await extractMathObjects(zip);
    const trackedChanges = await extractTrackedChanges(zip);
    const { listStarts, bulletListStyles } = await extractListMetadata(zip);
    const runStyles = await extractRunStyles(zip);
    const tableStyles = await extractTableStyles(zip, parser);
    const tableRowStyles = await extractTableRowStyles(zip, parser);
    const tableCellStyles = await extractTableCellStyles(zip, parser);
    const imageDimensions = await extractImageDimensions(zip);
    const [comments, commentRanges] = await Promise.all([
      extractComments(zip, parser),
      extractCommentRanges(zip),
    ]);
    const pageMargin = await extractPageMargin(zip);
    const pageSize = await extractPageSize(zip);
    const sectionColumns = await extractSectionColumns(zip);
    const headerData = await extractHeaderFooterData(zip, parser, /^word\/header\d+\.xml$/);
    const footerData = await extractHeaderFooterData(zip, parser, /^word\/footer\d+\.xml$/);
    const headerImages = await extractHeaderFooterImages(zip, /^word\/header\d+\.xml$/);
    const footerImages = await extractHeaderFooterImages(zip, /^word\/footer\d+\.xml$/);
    const textBoxes = await extractTextBoxes(zip);
    const footnotes = await extractFootnotes(zip, parser);
    const endnotes = await extractEndnotes(zip, parser);
    const endnoteReferences = await extractEndnoteReferences(zip);

    return {
      pageBreakParagraphs,
      pageBreaks,
      columnBreaks,
      sectionBreaks,
      paragraphIndents,
      paragraphAlignments,
      paragraphOutlineLevels,
      paragraphPagination,
      paragraphTabStops,
      paragraphSpacings,
      paragraphDecorations,
      paragraphBookmarks,
      linkRanges,
      tocFields,
      mathObjects,
      trackedChanges,
      listStarts,
      bulletListStyles,
      runStyles,
      tableStyles,
      tableRowStyles,
      tableCellStyles,
      imageDimensions,
      comments,
      commentRanges,
      ...(pageMargin ? { pageMargin } : {}),
      ...(pageSize ? { pageSize } : {}),
      ...(sectionColumns ? { sectionColumns } : {}),
      ...(headerData.align ? { headerAlign: headerData.align } : {}),
      ...(footerData.align ? { footerAlign: footerData.align } : {}),
      ...(headerData.hasPageNumber ? { headerHasPageNumber: true } : {}),
      ...(footerData.hasPageNumber ? { footerHasPageNumber: true } : {}),
      headerImages,
      footerImages,
      textBoxes,
      headerText: headerData.text,
      footerText: footerData.text,
      footnotes,
      endnotes,
      endnoteReferences,
    };
  } catch {
    return EMPTY_RESULT;
  }
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
// document.xml — 페이지 break
// ─────────────────────────────────────────────

// document.xml image display size (wp:extent, EMU)
const EMU_PER_PX = 9525; // 914400 EMU per inch / 96 CSS px per inch

async function extractImageDimensions(zip: JSZip): Promise<DocxImageDimension[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const xml = await file.async('string');
    const dimensions: DocxImageDimension[] = [];
    const paragraphRegex = /<w:p\b[\s\S]*?<\/w:p>/g;
    const drawingRegex = /<(wp:inline|wp:anchor)\b[\s\S]*?<\/\1>/g;
    const extentRegex = /<wp:extent\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"[^>]*\/?>/;
    let paragraphMatch: RegExpExecArray | null;
    while ((paragraphMatch = paragraphRegex.exec(xml)) !== null) {
      const paragraphXml = paragraphMatch[0];
      const jcTag = paragraphXml.match(/<w:jc\b[^>]*\/?>/)?.[0];
      const align = jcTag ? mapParagraphAlign(readXmlAttr(jcTag, 'w:val')) : undefined;
      let match: RegExpExecArray | null;
      drawingRegex.lastIndex = 0;
      while ((match = drawingRegex.exec(paragraphXml)) !== null) {
        const drawingKind = match[1];
        const drawingXml = match[0];
        const extent = drawingXml.match(extentRegex);
        if (!extent) continue;
        const cx = Number(extent[1]);
        const cy = Number(extent[2]);
        if (!Number.isFinite(cx) || !Number.isFinite(cy) || cx <= 0 || cy <= 0) continue;
        const wrap = readImageWrap(drawingXml);
        const altText = readImageAltText(drawingXml);
        dimensions.push({
          imageIndex: dimensions.length,
          width: Math.max(1, Math.round(cx / EMU_PER_PX)),
          height: Math.max(1, Math.round(cy / EMU_PER_PX)),
          ...(align ? { align } : {}),
          ...(drawingKind === 'wp:anchor' ? { floating: true } : {}),
          ...(wrap.wrap ? { wrap: wrap.wrap } : {}),
          ...(wrap.wrapSide ? { wrapSide: wrap.wrapSide } : {}),
          ...(altText.alt ? { alt: altText.alt } : {}),
          ...(altText.title ? { title: altText.title } : {}),
        });
      }
    }
    return dimensions;
  } catch {
    return [];
  }
}

function readImageAltText(xml: string): { alt?: string; title?: string } {
  const tag = xml.match(/<wp:docPr\b[^>]*\/?>/i)?.[0];
  if (!tag) return {};
  const descr = readXmlAttr(tag, 'descr');
  const title = readXmlAttr(tag, 'title') ?? readXmlAttr(tag, 'name');
  return {
    ...(descr ? { alt: descr } : {}),
    ...(title ? { title } : {}),
  };
}

function readImageWrap(xml: string): { wrap?: DocxImageDimension['wrap']; wrapSide?: DocxImageDimension['wrapSide'] } {
  if (/<wp:wrapSquare\b/i.test(xml)) return { wrap: 'square', wrapSide: readWrapSide(xml.match(/<wp:wrapSquare\b[^>]*\/?>/i)?.[0]) };
  if (/<wp:wrapTight\b/i.test(xml)) return { wrap: 'tight', wrapSide: readWrapSide(xml.match(/<wp:wrapTight\b[^>]*\/?>/i)?.[0]) };
  if (/<wp:wrapTopAndBottom\b/i.test(xml)) return { wrap: 'topAndBottom' };
  if (/<wp:wrapNone\b/i.test(xml)) return { wrap: 'none' };
  return {};
}

function readWrapSide(tag: string | undefined): DocxImageDimension['wrapSide'] {
  const side = tag ? readXmlAttr(tag, 'wrapText') : undefined;
  if (side === 'left' || side === 'right' || side === 'largest') return side;
  if (side === 'bothSides') return 'bothSides';
  return undefined;
}

async function extractHeaderFooterImages(zip: JSZip, re: RegExp): Promise<DocxHeaderFooterImage[]> {
  const images: DocxHeaderFooterImage[] = [];
  for (const path of Object.keys(zip.files)) {
    if (!re.test(path)) continue;
    const file = zip.file(path);
    if (!file) continue;
    try {
      const xml = await file.async('string');
      const rels = await readPartRelationships(zip, path);
      const paragraphRegex = /<w:p\b[\s\S]*?<\/w:p>/g;
      const drawingRegex = /<(wp:inline|wp:anchor)\b[\s\S]*?<\/\1>/g;
      let paragraphMatch: RegExpExecArray | null;
      while ((paragraphMatch = paragraphRegex.exec(xml)) !== null) {
        const paragraphXml = paragraphMatch[0];
        const jcTag = paragraphXml.match(/<w:jc\b[^>]*\/?>/)?.[0];
        const align = jcTag ? mapParagraphAlign(readXmlAttr(jcTag, 'w:val')) : undefined;
        let drawingMatch: RegExpExecArray | null;
        drawingRegex.lastIndex = 0;
        while ((drawingMatch = drawingRegex.exec(paragraphXml)) !== null) {
          const image = await readHeaderFooterImage(zip, drawingMatch[0], rels, align);
          if (image) images.push(image);
        }
      }
    } catch { /* skip broken header/footer image */ }
  }
  return images;
}

async function readHeaderFooterImage(
  zip: JSZip,
  drawingXml: string,
  rels: Map<string, string>,
  align: DocxTextAlign | undefined,
): Promise<DocxHeaderFooterImage | null> {
  const embedId = readXmlAttr(drawingXml.match(/<a:blip\b[^>]*\/?>/)?.[0] ?? '', 'r:embed');
  const target = embedId ? rels.get(embedId) : undefined;
  if (!target) return null;
  const normalizedTarget = normalizePartTarget(target);
  const mediaFile = zip.file(normalizedTarget);
  if (!mediaFile) return null;
  const ext = normalizedTarget.split('.').pop()?.toLowerCase() ?? '';
  const mime = imageMimeType(ext);
  if (!mime) return null;

  const extent = drawingXml.match(/<wp:extent\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"[^>]*\/?>/);
  const cx = Number(extent?.[1]);
  const cy = Number(extent?.[2]);
  const altText = readImageAltText(drawingXml);
  const base64 = await mediaFile.async('base64');
  return {
    src: `data:${mime};base64,${base64}`,
    width: Number.isFinite(cx) && cx > 0 ? Math.max(1, Math.round(cx / EMU_PER_PX)) : 96,
    height: Number.isFinite(cy) && cy > 0 ? Math.max(1, Math.round(cy / EMU_PER_PX)) : 48,
    ...(align ? { align } : {}),
    ...(altText.alt ? { alt: altText.alt } : {}),
    ...(altText.title ? { title: altText.title } : {}),
  };
}

async function readPartRelationships(zip: JSZip, partPath: string): Promise<Map<string, string>> {
  const fileName = partPath.split('/').pop() ?? partPath;
  const baseDir = partPath.includes('/') ? partPath.slice(0, partPath.lastIndexOf('/')) : '';
  const relsPath = `${baseDir}/_rels/${fileName}.rels`;
  const file = zip.file(relsPath);
  const out = new Map<string, string>();
  if (!file) return out;
  const xml = await file.async('string');
  const relRe = /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = relRe.exec(xml)) !== null) {
    out.set(match[1], decodeXmlText(match[2]));
  }
  return out;
}

function normalizePartTarget(target: string): string {
  const clean = target.replace(/\\/g, '/').replace(/^\//, '');
  if (clean.startsWith('word/')) return clean;
  if (clean.startsWith('../')) return `word/${clean.replace(/^\.\.\//, '')}`;
  return `word/${clean}`;
}

function imageMimeType(ext: string): string | null {
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'bmp') return 'image/bmp';
  return null;
}

function mapParagraphAlign(value: string | undefined): 'left' | 'center' | 'right' | 'justify' | undefined {
  if (value === 'center') return 'center';
  if (value === 'right') return 'right';
  if (value === 'both' || value === 'distribute') return 'justify';
  if (value === 'left') return 'left';
  return undefined;
}

async function extractPageBreaks(zip: JSZip, parser: XMLParser): Promise<DocxPageBreak[]> {
  return extractBreaksByType(zip, parser, 'page');
}

async function extractColumnBreaks(zip: JSZip, parser: XMLParser): Promise<DocxPageBreak[]> {
  return extractBreaksByType(zip, parser, 'column');
}

async function extractBreaksByType(
  zip: JSZip,
  parser: XMLParser,
  breakType: 'page' | 'column',
): Promise<DocxPageBreak[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const xml = await file.async('string');
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:document'] ?? parsed.document) as Record<string, unknown> | undefined;
    const body = root?.['w:body'] as Record<string, unknown> | undefined;
    const paragraphs = (body?.['w:p'] ?? []) as Array<Record<string, unknown>>;
    const breaks: DocxPageBreak[] = [];
    paragraphs.forEach((p, i) => {
      const runs = (p['w:r'] ?? []) as Array<Record<string, unknown>>;
      let textOffset = 0;
      for (const r of runs) {
        const brs = asArray<Record<string, unknown>>(r['w:br']);
        if (brs.some((b) => b['@_w:type'] === breakType)) {
          breaks.push({ paragraphIndex: i, textOffset });
        }
        textOffset += collectText(r).length;
      }
    });
    return breaks;
  } catch {
    return [];
  }
}

async function extractSectionBreaks(zip: JSZip, parser: XMLParser): Promise<DocxSectionBreak[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const xml = await file.async('string');
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:document'] ?? parsed.document) as Record<string, unknown> | undefined;
    const body = root?.['w:body'] as Record<string, unknown> | undefined;
    const paragraphs = asArray<Record<string, unknown>>(body?.['w:p']);
    const sectionBreaks: DocxSectionBreak[] = [];

    paragraphs.forEach((p, paragraphIndex) => {
      const pPr = p['w:pPr'] as Record<string, unknown> | undefined;
      const sectPr = pPr?.['w:sectPr'] as Record<string, unknown> | undefined;
      if (!sectPr) return;
      const pageMargin = readPageMarginFromSectPr(sectPr);
      const pageSize = readPageSizeFromSectPr(sectPr);
      const sectionColumns = readSectionColumnsFromSectPr(sectPr);
      sectionBreaks.push({
        paragraphIndex,
        type: readSectionBreakType(sectPr),
        ...(pageMargin ? { pageMargin } : {}),
        ...(pageSize ? { pageSize } : {}),
        ...(sectionColumns ? { sectionColumns } : {}),
      });
    });

    return sectionBreaks;
  } catch {
    return [];
  }
}

function readSectionBreakType(sectPr: Record<string, unknown>): DocxSectionBreakType {
  const type = sectPr['w:type'] as Record<string, unknown> | undefined;
  const raw = String(type?.['@_w:val'] ?? 'nextPage');
  if (raw === 'continuous' || raw === 'evenPage' || raw === 'oddPage' || raw === 'nextColumn') return raw;
  return 'nextPage';
}

function readPageMarginFromSectPr(sectPr: Record<string, unknown>): DocxPageMargin | undefined {
  const pageMargin = sectPr['w:pgMar'] as Record<string, unknown> | undefined;
  if (!pageMargin) return undefined;

  const topTwips = parseTwips(pageMargin['@_w:top']);
  const leftTwips = parseTwips(pageMargin['@_w:left']);
  const rightTwips = parseTwips(pageMargin['@_w:right']);
  const bottomTwips = parseTwips(pageMargin['@_w:bottom']);
  if (!topTwips && !leftTwips && !rightTwips && !bottomTwips) return undefined;

  return {
    top: topTwips ? twipsToPx(topTwips) : 96,
    left: leftTwips ? twipsToPx(leftTwips) : 96,
    right: rightTwips ? twipsToPx(rightTwips) : 96,
    bottom: bottomTwips ? twipsToPx(bottomTwips) : 96,
  };
}

function readPageSizeFromSectPr(sectPr: Record<string, unknown>): DocxPageSize | undefined {
  const pageSize = sectPr['w:pgSz'] as Record<string, unknown> | undefined;
  if (!pageSize) return undefined;

  const widthTwips = parseTwips(pageSize['@_w:w']);
  const heightTwips = parseTwips(pageSize['@_w:h']);
  if (!widthTwips || !heightTwips) return undefined;

  const rawOrientation = String(pageSize['@_w:orient'] ?? '');
  const orientation = rawOrientation === 'landscape' ? 'landscape' : 'portrait';
  const widthPx = twipsToPx(widthTwips);
  const heightPx = twipsToPx(heightTwips);
  return {
    width: orientation === 'landscape' ? Math.max(widthPx, heightPx) : widthPx,
    height: orientation === 'landscape' ? Math.min(widthPx, heightPx) : heightPx,
    orientation,
  };
}

function readSectionColumnsFromSectPr(sectPr: Record<string, unknown>): DocxSectionColumns | undefined {
  const columns = sectPr['w:cols'] as Record<string, unknown> | undefined;
  if (!columns) return undefined;

  const count = Number(columns['@_w:num'] ?? 1);
  const spaceTwips = parseTwips(columns['@_w:space']);
  const separate = readOnOffAttr(columns['@_w:sep'] == null ? undefined : String(columns['@_w:sep']));
  const equalWidth = columns['@_w:equalWidth'] == null
    ? undefined
    : readOnOffAttr(String(columns['@_w:equalWidth']));
  if (!Number.isFinite(count) || count <= 1) return undefined;

  return {
    count: Math.max(1, Math.round(count)),
    ...(spaceTwips ? { space: twipsToPx(spaceTwips) } : {}),
    ...(separate !== undefined ? { separate } : {}),
    ...(equalWidth !== undefined ? { equalWidth } : {}),
  };
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return value == null ? [] : [value as T];
}

async function extractParagraphIndents(zip: JSZip, parser: XMLParser): Promise<DocxParagraphIndent[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const [xml, paragraphStyles] = await Promise.all([
      file.async('string'),
      extractParagraphStyleProperties(zip, parser),
    ]);
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:document'] ?? parsed.document) as Record<string, unknown> | undefined;
    const body = root?.['w:body'] as Record<string, unknown> | undefined;
    const paragraphs = asArray<Record<string, unknown>>(body?.['w:p']);
    const out: DocxParagraphIndent[] = [];

    paragraphs.forEach((p, i) => {
      const pPr = p['w:pPr'] as Record<string, unknown> | undefined;
      const style = paragraphStyles.get(readParagraphStyleId(pPr) ?? '');
      const indent = readParagraphIndent(pPr) ?? style?.indent;
      if (indent && (indent.leftTwips > 0 || (indent.rightTwips ?? 0) > 0 || (indent.firstLineTwips ?? 0) > 0 || (indent.hangingTwips ?? 0) > 0)) {
        out.push({
          paragraphIndex: i,
          ...indent,
        });
      }
    });

    return out;
  } catch {
    return [];
  }
}

async function extractParagraphAlignments(zip: JSZip, parser: XMLParser): Promise<DocxParagraphAlignment[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const [xml, paragraphStyles] = await Promise.all([
      file.async('string'),
      extractParagraphStyleProperties(zip, parser),
    ]);
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:document'] ?? parsed.document) as Record<string, unknown> | undefined;
    const body = root?.['w:body'] as Record<string, unknown> | undefined;
    const paragraphs = asArray<Record<string, unknown>>(body?.['w:p']);
    const out: DocxParagraphAlignment[] = [];

    paragraphs.forEach((p, i) => {
      const pPr = p['w:pPr'] as Record<string, unknown> | undefined;
      const style = paragraphStyles.get(readParagraphStyleId(pPr) ?? '');
      const align = readParagraphAlignment(pPr) ?? style?.align;
      if (align) out.push({ paragraphIndex: i, align });
    });

    return out;
  } catch {
    return [];
  }
}

async function extractParagraphOutlineLevels(zip: JSZip, parser: XMLParser): Promise<DocxParagraphOutlineLevel[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const [xml, paragraphStyles] = await Promise.all([
      file.async('string'),
      extractParagraphStyleProperties(zip, parser),
    ]);
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:document'] ?? parsed.document) as Record<string, unknown> | undefined;
    const body = root?.['w:body'] as Record<string, unknown> | undefined;
    const paragraphs = asArray<Record<string, unknown>>(body?.['w:p']);
    const out: DocxParagraphOutlineLevel[] = [];

    paragraphs.forEach((p, paragraphIndex) => {
      const pPr = p['w:pPr'] as Record<string, unknown> | undefined;
      const directLevel = readOutlineLevel(pPr?.['w:outlineLvl']);
      const styleId = readParagraphStyleId(pPr);
      const styleLevel = styleId ? paragraphStyles.get(styleId)?.outlineLevel : undefined;
      const level = directLevel ?? styleLevel;
      if (level && level >= 1 && level <= 6) out.push({ paragraphIndex, level });
    });

    return out;
  } catch {
    return [];
  }
}

async function extractParagraphStyleProperties(zip: JSZip, parser: XMLParser): Promise<Map<string, DocxParagraphStyleProperties>> {
  const rawStyles = new Map<string, DocxParagraphStyleProperties & { basedOn?: string }>();
  const resolved = new Map<string, DocxParagraphStyleProperties>();
  const file = zip.file('word/styles.xml');
  if (!file) return resolved;
  try {
    const xml = await file.async('string');
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:styles'] ?? parsed.styles) as Record<string, unknown> | undefined;
    const styles = asArray<Record<string, unknown>>(root?.['w:style']);
    for (const style of styles) {
      if (String(style['@_w:type'] ?? '') !== 'paragraph') continue;
      const styleId = String(style['@_w:styleId'] ?? '');
      if (!styleId) continue;
      const pPr = style['w:pPr'] as Record<string, unknown> | undefined;
      const basedOn = readBasedOnStyleId(style);
      rawStyles.set(styleId, {
        ...(basedOn ? { basedOn } : {}),
        ...readParagraphStylePropertiesFromPPr(pPr),
      });
    }
  } catch {
    return resolved;
  }
  for (const styleId of rawStyles.keys()) {
    resolveParagraphStyle(styleId, rawStyles, resolved, new Set());
  }
  return resolved;
}

function resolveParagraphStyle(
  styleId: string,
  rawStyles: Map<string, DocxParagraphStyleProperties & { basedOn?: string }>,
  resolved: Map<string, DocxParagraphStyleProperties>,
  seen: Set<string>,
): DocxParagraphStyleProperties {
  const cached = resolved.get(styleId);
  if (cached) return cached;
  const current = rawStyles.get(styleId);
  if (!current || seen.has(styleId)) return {};
  seen.add(styleId);
  const base = current.basedOn
    ? resolveParagraphStyle(current.basedOn, rawStyles, resolved, seen)
    : {};
  const merged = mergeParagraphStyleProperties(base, current);
  resolved.set(styleId, merged);
  return merged;
}

function mergeParagraphStyleProperties(
  base: DocxParagraphStyleProperties,
  current: DocxParagraphStyleProperties,
): DocxParagraphStyleProperties {
  return {
    indent: current.indent ?? base.indent,
    align: current.align ?? base.align,
    outlineLevel: current.outlineLevel ?? base.outlineLevel,
    pagination: { ...base.pagination, ...current.pagination },
    spacing: current.spacing ?? base.spacing,
    decoration: {
      ...base.decoration,
      ...current.decoration,
      borders: { ...base.decoration?.borders, ...current.decoration?.borders },
    },
  };
}

function readParagraphStylePropertiesFromPPr(pPr: Record<string, unknown> | undefined): DocxParagraphStyleProperties {
  const outlineLevel = readOutlineLevel(pPr?.['w:outlineLvl']);
  return {
    ...(readParagraphIndent(pPr) ? { indent: readParagraphIndent(pPr) } : {}),
    ...(readParagraphAlignment(pPr) ? { align: readParagraphAlignment(pPr) } : {}),
    ...(outlineLevel ? { outlineLevel } : {}),
    ...(readParagraphPagination(pPr) ? { pagination: readParagraphPagination(pPr) } : {}),
    ...(readParagraphSpacing(pPr) ? { spacing: readParagraphSpacing(pPr) } : {}),
    ...(readParagraphDecoration(pPr) ? { decoration: readParagraphDecoration(pPr) } : {}),
  };
}

function readBasedOnStyleId(style: Record<string, unknown>): string | undefined {
  const basedOn = style['w:basedOn'] as Record<string, unknown> | undefined;
  const value = basedOn?.['@_w:val'];
  return typeof value === 'string' && value ? value : undefined;
}

function readParagraphStyleId(pPr: Record<string, unknown> | undefined): string | undefined {
  const pStyle = pPr?.['w:pStyle'] as Record<string, unknown> | undefined;
  const value = pStyle?.['@_w:val'];
  return typeof value === 'string' && value ? value : undefined;
}

function readOutlineLevel(value: unknown): number | undefined {
  if (value == null) return undefined;
  const outline = value as Record<string, unknown> | undefined;
  const raw = outline?.['@_w:val'];
  if (raw == null) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(1, Math.min(9, Math.round(parsed) + 1));
}

function readParagraphIndent(pPr: Record<string, unknown> | undefined): Omit<DocxParagraphIndent, 'paragraphIndex'> | undefined {
  const ind = pPr?.['w:ind'] as Record<string, unknown> | undefined;
  if (!ind) return undefined;
  const leftTwips = parseTwips(ind['@_w:left'] ?? ind['@_w:start']);
  const rightTwips = parseTwips(ind['@_w:right'] ?? ind['@_w:end']);
  const firstLineTwips = parseTwips(ind['@_w:firstLine']);
  const hangingTwips = parseTwips(ind['@_w:hanging']);
  if (leftTwips <= 0 && rightTwips <= 0 && firstLineTwips <= 0 && hangingTwips <= 0) return undefined;
  return {
    leftTwips,
    ...(rightTwips > 0 ? { rightTwips } : {}),
    ...(firstLineTwips > 0 ? { firstLineTwips } : {}),
    ...(hangingTwips > 0 ? { hangingTwips } : {}),
  };
}

function readParagraphAlignment(pPr: Record<string, unknown> | undefined): DocxTextAlign | undefined {
  const jc = pPr?.['w:jc'] as Record<string, unknown> | undefined;
  return mapParagraphAlign(String(jc?.['@_w:val'] ?? ''));
}

function readParagraphPagination(pPr: Record<string, unknown> | undefined): Omit<DocxParagraphPagination, 'paragraphIndex'> | undefined {
  const pagination = {
    ...(readOnOffParsedProperty(pPr, 'w:pageBreakBefore') ? { pageBreakBefore: true } : {}),
    ...(readOnOffParsedProperty(pPr, 'w:keepNext') ? { keepNext: true } : {}),
    ...(readOnOffParsedProperty(pPr, 'w:keepLines') ? { keepLines: true } : {}),
    ...(readOnOffParsedProperty(pPr, 'w:widowControl') ? { widowControl: true } : {}),
    ...(readOnOffParsedProperty(pPr, 'w:contextualSpacing') ? { contextualSpacing: true } : {}),
    ...(readOnOffParsedProperty(pPr, 'w:suppressLineNumbers') ? { suppressLineNumbers: true } : {}),
    ...(readOnOffParsedProperty(pPr, 'w:bidi') ? { bidirectional: true } : {}),
    ...(readOnOffParsedProperty(pPr, 'w:wordWrap') ? { wordWrap: true } : {}),
    ...(readOnOffParsedProperty(pPr, 'w:overflowPunct') ? { overflowPunctuation: true } : {}),
    ...(readOnOffParsedProperty(pPr, 'w:autoSpaceDN') ? { autoSpaceEastAsianText: true } : {}),
  };
  return hasParagraphPagination(pagination) ? pagination : undefined;
}

function mergeParagraphPagination(
  base: Omit<DocxParagraphPagination, 'paragraphIndex'> | undefined,
  current: Omit<DocxParagraphPagination, 'paragraphIndex'> | undefined,
): Omit<DocxParagraphPagination, 'paragraphIndex'> | undefined {
  const merged = { ...base, ...current };
  return hasParagraphPagination(merged) ? merged : undefined;
}

function hasParagraphPagination(pagination: Omit<DocxParagraphPagination, 'paragraphIndex'>): boolean {
  return Boolean(
    pagination.pageBreakBefore
    || pagination.keepNext
    || pagination.keepLines
    || pagination.widowControl
    || pagination.contextualSpacing
    || pagination.suppressLineNumbers
    || pagination.bidirectional
    || pagination.wordWrap
    || pagination.overflowPunctuation
    || pagination.autoSpaceEastAsianText,
  );
}

function readParagraphSpacing(pPr: Record<string, unknown> | undefined): Omit<DocxParagraphSpacing, 'paragraphIndex'> | undefined {
  const spacing = pPr?.['w:spacing'] as Record<string, unknown> | undefined;
  if (!spacing) return undefined;
  const beforeTwips = parseTwips(spacing['@_w:before']);
  const afterTwips = parseTwips(spacing['@_w:after']);
  const line = parseTwips(spacing['@_w:line']);
  const lineRule = readParagraphLineRule(spacing['@_w:lineRule']);
  if (!beforeTwips && !afterTwips && !line) return undefined;
  return {
    ...(beforeTwips ? { beforeTwips } : {}),
    ...(afterTwips ? { afterTwips } : {}),
    ...(line ? { line } : {}),
    ...(lineRule ? { lineRule } : {}),
  };
}

function readParagraphDecoration(pPr: Record<string, unknown> | undefined): Omit<DocxParagraphDecoration, 'paragraphIndex'> | undefined {
  const backgroundColor = readParagraphFill(pPr);
  const borders = readParagraphBorders(pPr);
  if (!backgroundColor && !borders) return undefined;
  return {
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(borders ? { borders } : {}),
  };
}

async function extractParagraphPagination(zip: JSZip, parser: XMLParser): Promise<DocxParagraphPagination[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const [xml, paragraphStyles] = await Promise.all([
      file.async('string'),
      extractParagraphStyleProperties(zip, parser),
    ]);
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:document'] ?? parsed.document) as Record<string, unknown> | undefined;
    const body = root?.['w:body'] as Record<string, unknown> | undefined;
    const paragraphs = asArray<Record<string, unknown>>(body?.['w:p']);
    const out: DocxParagraphPagination[] = [];

    paragraphs.forEach((p, paragraphIndex) => {
      const pPr = p['w:pPr'] as Record<string, unknown> | undefined;
      const style = paragraphStyles.get(readParagraphStyleId(pPr) ?? '');
      const pagination = mergeParagraphPagination(style?.pagination, readParagraphPagination(pPr));
      if (!pagination || !hasParagraphPagination(pagination)) return;
      out.push({
        paragraphIndex,
        ...pagination,
      });
    });

    return out;
  } catch {
    return [];
  }
}

async function extractParagraphTabStops(zip: JSZip, parser: XMLParser): Promise<DocxParagraphTabStops[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const xml = await file.async('string');
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:document'] ?? parsed.document) as Record<string, unknown> | undefined;
    const body = root?.['w:body'] as Record<string, unknown> | undefined;
    const paragraphs = asArray<Record<string, unknown>>(body?.['w:p']);
    const out: DocxParagraphTabStops[] = [];

    paragraphs.forEach((p, paragraphIndex) => {
      const pPr = p['w:pPr'] as Record<string, unknown> | undefined;
      const tabs = pPr?.['w:tabs'] as Record<string, unknown> | undefined;
      const tabStops = asArray<Record<string, unknown>>(tabs?.['w:tab'])
        .map(readParagraphTabStop)
        .filter((item): item is DocxParagraphTabStop => Boolean(item));
      if (tabStops.length > 0) out.push({ paragraphIndex, tabStops });
    });

    return out;
  } catch {
    return [];
  }
}

function readParagraphTabStop(tab: Record<string, unknown>): DocxParagraphTabStop | null {
  const type = readTabStopType(tab['@_w:val']);
  const positionTwips = parseTwips(tab['@_w:pos']);
  if (!type || !positionTwips) return null;
  const leader = readTabLeader(tab['@_w:leader']);
  return {
    type,
    positionTwips,
    ...(leader ? { leader } : {}),
  };
}

function readTabStopType(value: unknown): DocxParagraphTabStop['type'] | null {
  const raw = String(value ?? 'left');
  if (raw === 'left' || raw === 'right' || raw === 'center' || raw === 'decimal' || raw === 'bar') return raw;
  return null;
}

function readTabLeader(value: unknown): DocxParagraphTabStop['leader'] | undefined {
  const raw = String(value ?? '');
  if (raw === 'dot' || raw === 'hyphen' || raw === 'middleDot' || raw === 'underscore' || raw === 'none') return raw;
  return undefined;
}

async function extractParagraphSpacings(zip: JSZip, parser: XMLParser): Promise<DocxParagraphSpacing[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const [xml, paragraphStyles] = await Promise.all([
      file.async('string'),
      extractParagraphStyleProperties(zip, parser),
    ]);
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:document'] ?? parsed.document) as Record<string, unknown> | undefined;
    const body = root?.['w:body'] as Record<string, unknown> | undefined;
    const paragraphs = asArray<Record<string, unknown>>(body?.['w:p']);
    const out: DocxParagraphSpacing[] = [];

    paragraphs.forEach((p, i) => {
      const pPr = p['w:pPr'] as Record<string, unknown> | undefined;
      const style = paragraphStyles.get(readParagraphStyleId(pPr) ?? '');
      const spacing = readParagraphSpacing(pPr) ?? style?.spacing;
      if (spacing && ((spacing.beforeTwips ?? 0) > 0 || (spacing.afterTwips ?? 0) > 0 || (spacing.line ?? 0) > 0)) {
        out.push({
          paragraphIndex: i,
          ...spacing,
        });
      }
    });

    return out;
  } catch {
    return [];
  }
}

function readParagraphLineRule(value: unknown): DocxParagraphSpacing['lineRule'] | undefined {
  if (value === 'auto') return 'auto';
  if (value === 'exact' || value === 'exactly') return 'exact';
  if (value === 'atLeast') return 'atLeast';
  return undefined;
}

async function extractParagraphDecorations(zip: JSZip, parser: XMLParser): Promise<DocxParagraphDecoration[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const [xml, paragraphStyles] = await Promise.all([
      file.async('string'),
      extractParagraphStyleProperties(zip, parser),
    ]);
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:document'] ?? parsed.document) as Record<string, unknown> | undefined;
    const body = root?.['w:body'] as Record<string, unknown> | undefined;
    const paragraphs = asArray<Record<string, unknown>>(body?.['w:p']);
    const out: DocxParagraphDecoration[] = [];

    paragraphs.forEach((p, paragraphIndex) => {
      const pPr = p['w:pPr'] as Record<string, unknown> | undefined;
      const style = paragraphStyles.get(readParagraphStyleId(pPr) ?? '');
      const decoration = readParagraphDecoration(pPr) ?? style?.decoration;
      if (!decoration?.backgroundColor && !decoration?.borders) return;
      out.push({
        paragraphIndex,
        ...decoration,
      });
    });

    return out;
  } catch {
    return [];
  }
}

function readParagraphFill(pPr: Record<string, unknown> | undefined): string | undefined {
  const shd = pPr?.['w:shd'] as Record<string, unknown> | undefined;
  const raw = shd?.['@_w:fill'];
  if (typeof raw !== 'string') return undefined;
  const fill = raw.trim();
  if (!/^[0-9a-f]{6}$/i.test(fill) || fill.toLowerCase() === 'auto') return undefined;
  return `#${fill.toUpperCase()}`;
}

function readParagraphBorders(pPr: Record<string, unknown> | undefined): DocxParagraphBorders | undefined {
  const pBdr = pPr?.['w:pBdr'] as Record<string, unknown> | undefined;
  if (!pBdr) return undefined;
  const borders: DocxParagraphBorders = {
    top: readBorderSide(pBdr['w:top'] as Record<string, unknown> | undefined),
    right: readBorderSide((pBdr['w:right'] ?? pBdr['w:end']) as Record<string, unknown> | undefined),
    bottom: readBorderSide(pBdr['w:bottom'] as Record<string, unknown> | undefined),
    left: readBorderSide((pBdr['w:left'] ?? pBdr['w:start']) as Record<string, unknown> | undefined),
  };
  return Object.values(borders).some(Boolean) ? borders : undefined;
}

interface DocxNumberingLevel {
  start: number;
  format: string;
  text?: string;
  suffix?: 'tab' | 'space' | 'nothing';
  leftTwips?: number;
  hangingTwips?: number;
}

interface DocxNumberingDefinition {
  abstractId: string;
  overrides: Map<number, Partial<DocxNumberingLevel>>;
}

const ORDERED_NUMBER_FORMATS = new Set([
  'decimal',
  'decimalZero',
  'lowerLetter',
  'upperLetter',
  'lowerRoman',
  'upperRoman',
  'arabicAbjad',
  'arabicAlpha',
  'cardinalText',
  'ordinal',
  'ordinalText',
]);

async function extractListMetadata(zip: JSZip): Promise<{
  listStarts: DocxListStart[];
  bulletListStyles: DocxBulletListStyle[];
}> {
  const documentFile = zip.file('word/document.xml');
  const numberingFile = zip.file('word/numbering.xml');
  if (!documentFile || !numberingFile) return { listStarts: [], bulletListStyles: [] };

  try {
    const [documentXml, numberingXml] = await Promise.all([
      documentFile.async('string'),
      numberingFile.async('string'),
    ]);
    const abstractLevels = readAbstractNumberingLevels(numberingXml);
    const numberingDefinitions = readNumberingDefinitions(numberingXml);
    if (abstractLevels.size === 0 || numberingDefinitions.size === 0) {
      return { listStarts: [], bulletListStyles: [] };
    }
    return readDocumentListStarts(documentXml, abstractLevels, numberingDefinitions);
  } catch {
    return { listStarts: [], bulletListStyles: [] };
  }
}

function readAbstractNumberingLevels(numberingXml: string): Map<string, Map<number, DocxNumberingLevel>> {
  const out = new Map<string, Map<number, DocxNumberingLevel>>();
  const abstractRe = /<w:abstractNum\b[\s\S]*?<\/w:abstractNum>/g;
  let abstractMatch: RegExpExecArray | null;

  while ((abstractMatch = abstractRe.exec(numberingXml))) {
    const abstractXml = abstractMatch[0];
    const abstractTag = abstractXml.match(/<w:abstractNum\b[^>]*>/i)?.[0];
    const abstractId = abstractTag ? readXmlAttr(abstractTag, 'w:abstractNumId') : undefined;
    if (!abstractId) continue;

    const levels = new Map<number, DocxNumberingLevel>();
    const levelRe = /<w:lvl\b[\s\S]*?<\/w:lvl>/g;
    let levelMatch: RegExpExecArray | null;
    while ((levelMatch = levelRe.exec(abstractXml))) {
      const levelXml = levelMatch[0];
      const level = readListLevel(levelXml);
      if (level) {
        levels.set(level.ilvl, {
          start: level.start,
          format: level.format,
          text: level.text,
          suffix: level.suffix,
          leftTwips: level.leftTwips,
          hangingTwips: level.hangingTwips,
        });
      }
    }
    if (levels.size > 0) out.set(abstractId, levels);
  }

  return out;
}

function readNumberingDefinitions(numberingXml: string): Map<string, DocxNumberingDefinition> {
  const out = new Map<string, DocxNumberingDefinition>();
  const numRe = /<w:num\b[\s\S]*?<\/w:num>/g;
  let numMatch: RegExpExecArray | null;

  while ((numMatch = numRe.exec(numberingXml))) {
    const numXml = numMatch[0];
    const numTag = numXml.match(/<w:num\b[^>]*>/i)?.[0];
    const numId = numTag ? readXmlAttr(numTag, 'w:numId') : undefined;
    const abstractTag = numXml.match(/<w:abstractNumId\b[^>]*>/i)?.[0];
    const abstractId = abstractTag ? readXmlAttr(abstractTag, 'w:val') : undefined;
    if (!numId || !abstractId) continue;

    const overrides = new Map<number, Partial<DocxNumberingLevel>>();
    const overrideRe = /<w:lvlOverride\b[\s\S]*?<\/w:lvlOverride>/g;
    let overrideMatch: RegExpExecArray | null;
    while ((overrideMatch = overrideRe.exec(numXml))) {
      const overrideXml = overrideMatch[0];
      const overrideTag = overrideXml.match(/<w:lvlOverride\b[^>]*>/i)?.[0];
      const ilvlRaw = overrideTag ? readXmlAttr(overrideTag, 'w:ilvl') : undefined;
      const ilvl = ilvlRaw ? Number(ilvlRaw) : NaN;
      if (!Number.isFinite(ilvl) || ilvl < 0) continue;

      const startOverrideTag = overrideXml.match(/<w:startOverride\b[^>]*>/i)?.[0];
      const startRaw = startOverrideTag ? readXmlAttr(startOverrideTag, 'w:val') : undefined;
      const start = startRaw ? Number(startRaw) : NaN;
      const nestedLevel = readListLevel(overrideXml);
      overrides.set(ilvl, {
        ...(Number.isFinite(start) && start > 0 ? { start } : {}),
        ...(nestedLevel
          ? {
              start: nestedLevel.start,
              format: nestedLevel.format,
              text: nestedLevel.text,
              suffix: nestedLevel.suffix,
              leftTwips: nestedLevel.leftTwips,
              hangingTwips: nestedLevel.hangingTwips,
            }
          : {}),
      });
    }

    out.set(numId, { abstractId, overrides });
  }

  return out;
}

function readListLevel(levelXml: string): ({ ilvl: number } & DocxNumberingLevel) | null {
  const levelTag = levelXml.match(/<w:lvl\b[^>]*>/i)?.[0];
  const ilvlRaw = levelTag ? readXmlAttr(levelTag, 'w:ilvl') : undefined;
  const ilvl = ilvlRaw ? Number(ilvlRaw) : NaN;
  if (!Number.isFinite(ilvl) || ilvl < 0) return null;

  const startTag = levelXml.match(/<w:start\b[^>]*>/i)?.[0];
  const numFmtTag = levelXml.match(/<w:numFmt\b[^>]*>/i)?.[0];
  const lvlTextTag = levelXml.match(/<w:lvlText\b[^>]*>/i)?.[0];
  const suffixTag = levelXml.match(/<w:suff\b[^>]*>/i)?.[0];
  const indentTag = levelXml.match(/<w:ind\b[^>]*>/i)?.[0];
  const startRaw = startTag ? readXmlAttr(startTag, 'w:val') : undefined;
  const format = numFmtTag ? readXmlAttr(numFmtTag, 'w:val') : undefined;
  const text = lvlTextTag ? readXmlAttr(lvlTextTag, 'w:val') : undefined;
  const suffix = readListSuffix(suffixTag ? readXmlAttr(suffixTag, 'w:val') : undefined);
  const leftTwips = indentTag ? parseTwips(readXmlAttr(indentTag, 'w:left') ?? readXmlAttr(indentTag, 'w:start')) : 0;
  const hangingTwips = indentTag ? parseTwips(readXmlAttr(indentTag, 'w:hanging')) : 0;
  const start = startRaw ? Number(startRaw) : 1;
  return {
    ilvl,
    start: Number.isFinite(start) && start > 0 ? start : 1,
    format: format ?? 'decimal',
    ...(text ? { text } : {}),
    ...(suffix ? { suffix } : {}),
    ...(leftTwips ? { leftTwips } : {}),
    ...(hangingTwips ? { hangingTwips } : {}),
  };
}

function readListSuffix(value: string | undefined): DocxNumberingLevel['suffix'] | undefined {
  return value === 'tab' || value === 'space' || value === 'nothing' ? value : undefined;
}

function readDocumentListStarts(
  documentXml: string,
  abstractLevels: Map<string, Map<number, DocxNumberingLevel>>,
  numberingDefinitions: Map<string, DocxNumberingDefinition>,
): {
  listStarts: DocxListStart[];
  bulletListStyles: DocxBulletListStyle[];
} {
  const paragraphs = documentXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
  const listStarts: DocxListStart[] = [];
  const bulletListStyles: DocxBulletListStyle[] = [];
  let activeListKeysByLevel: string[] = [];

  for (const paragraphXml of paragraphs) {
    const numPr = paragraphXml.match(/<w:numPr\b[\s\S]*?<\/w:numPr>/i)?.[0];
    if (!numPr) {
      activeListKeysByLevel = [];
      continue;
    }

    const numIdTag = numPr.match(/<w:numId\b[^>]*>/i)?.[0];
    const ilvlTag = numPr.match(/<w:ilvl\b[^>]*>/i)?.[0];
    const numId = numIdTag ? readXmlAttr(numIdTag, 'w:val') : undefined;
    const ilvlRaw = ilvlTag ? readXmlAttr(ilvlTag, 'w:val') : '0';
    const ilvl = ilvlRaw ? Number(ilvlRaw) : 0;
    if (!numId || !Number.isFinite(ilvl) || ilvl < 0) {
      activeListKeysByLevel = [];
      continue;
    }

    const level = resolveNumberingLevel(numId, ilvl, abstractLevels, numberingDefinitions);
    activeListKeysByLevel = activeListKeysByLevel.slice(0, ilvl + 1);
    const currentListKey = `${numId}:${ilvl}`;

    if (!level) {
      activeListKeysByLevel[ilvl] = '';
      continue;
    }

    if (activeListKeysByLevel[ilvl] !== currentListKey) {
      if (ORDERED_NUMBER_FORMATS.has(level.format)) {
        listStarts.push({
          listIndex: listStarts.length,
          start: level.start,
          format: level.format,
          ...(level.suffix ? { suffix: level.suffix } : {}),
          ...(level.leftTwips ? { leftTwips: level.leftTwips } : {}),
          ...(level.hangingTwips ? { hangingTwips: level.hangingTwips } : {}),
        });
      } else if (level.format === 'bullet') {
        bulletListStyles.push({
          listIndex: bulletListStyles.length,
          format: level.format,
          ...(level.text ? { text: level.text } : {}),
          ...(level.suffix ? { suffix: level.suffix } : {}),
          ...(level.leftTwips ? { leftTwips: level.leftTwips } : {}),
          ...(level.hangingTwips ? { hangingTwips: level.hangingTwips } : {}),
        });
      }
    }
    activeListKeysByLevel[ilvl] = currentListKey;
  }

  return { listStarts, bulletListStyles };
}

function resolveNumberingLevel(
  numId: string,
  ilvl: number,
  abstractLevels: Map<string, Map<number, DocxNumberingLevel>>,
  numberingDefinitions: Map<string, DocxNumberingDefinition>,
): DocxNumberingLevel | null {
  const definition = numberingDefinitions.get(numId);
  if (!definition) return null;
  const base = abstractLevels.get(definition.abstractId)?.get(ilvl);
  const override = definition.overrides.get(ilvl);
  const merged = {
    start: override?.start ?? base?.start ?? 1,
    format: override?.format ?? base?.format ?? 'decimal',
    text: override?.text ?? base?.text,
    suffix: override?.suffix ?? base?.suffix,
    leftTwips: override?.leftTwips ?? base?.leftTwips,
    hangingTwips: override?.hangingTwips ?? base?.hangingTwips,
  };
  return ORDERED_NUMBER_FORMATS.has(merged.format) || merged.format === 'bullet' ? merged : null;
}

async function extractRunStyles(zip: JSZip): Promise<DocxRunStyle[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const xml = await file.async('string');
    const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
    const out: DocxRunStyle[] = [];

    paragraphs.forEach((paragraphXml, paragraphIndex) => {
      let textOffset = 0;
      const runRe = /<w:r\b[\s\S]*?<\/w:r>/g;
      let match: RegExpExecArray | null;
      while ((match = runRe.exec(paragraphXml))) {
        const runXml = match[0];
        const text = collectTextFromRunXml(runXml);
        const length = text.length;
        if (length === 0) continue;

        const style = readRunStyle(runXml);
        if (style) {
          out.push({
            paragraphIndex,
            startOffset: textOffset,
            endOffset: textOffset + length,
            ...style,
          });
        }
        textOffset += length;
      }
    });

    return out;
  } catch {
    return [];
  }
}

async function extractTrackedChanges(zip: JSZip): Promise<DocxTrackedChange[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const xml = await file.async('string');
    const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
    const out: DocxTrackedChange[] = [];

    paragraphs.forEach((paragraphXml, paragraphIndex) => {
      let textOffset = 0;
      const tokenRe = /<w:ins\b[^>]*>[\s\S]*?<\/w:ins>|<w:del\b[^>]*>[\s\S]*?<\/w:del>|<w:r\b[\s\S]*?<\/w:r>/g;
      let match: RegExpExecArray | null;
      while ((match = tokenRe.exec(paragraphXml))) {
        const token = match[0];
        if (token.startsWith('<w:ins')) {
          const text = collectTextFromRevisionXml(token, false);
          if (text) {
            out.push({
              paragraphIndex,
              startOffset: textOffset,
              endOffset: textOffset + text.length,
              type: 'insert',
              text,
              ...readChangeAttrs(token),
            });
            textOffset += text.length;
          }
        } else if (token.startsWith('<w:del')) {
          const text = collectTextFromRevisionXml(token, true);
          if (text) {
            out.push({
              paragraphIndex,
              startOffset: textOffset,
              endOffset: textOffset,
              type: 'delete',
              text,
              ...readChangeAttrs(token),
            });
          }
        } else {
          textOffset += collectTextFromRunXml(token).length;
        }
      }
    });

    return out;
  } catch {
    return [];
  }
}

async function extractTocFields(zip: JSZip): Promise<DocxTocField[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const xml = await file.async('string');
    const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
    const out: DocxTocField[] = [];

    paragraphs.forEach((paragraphXml, paragraphIndex) => {
      const instruction = readTocInstruction(paragraphXml);
      if (!instruction) return;
      const text = collectTextFromParagraphXml(paragraphXml).trim();
      out.push({
        paragraphIndex,
        instruction,
        ...(text ? { text } : {}),
      });
    });

    return out;
  } catch {
    return [];
  }
}

function readTocInstruction(paragraphXml: string): string | undefined {
  const simpleTag = paragraphXml.match(/<w:fldSimple\b[^>]*>/i)?.[0];
  const simpleInstruction = simpleTag ? readXmlAttr(simpleTag, 'w:instr') : undefined;
  if (simpleInstruction && /\bTOC\b/i.test(decodeXmlText(simpleInstruction))) {
    return decodeXmlText(simpleInstruction).trim();
  }

  const parts: string[] = [];
  const instrRe = /<w:instrText\b[^>]*>([\s\S]*?)<\/w:instrText>/g;
  let match: RegExpExecArray | null;
  while ((match = instrRe.exec(paragraphXml))) {
    parts.push(decodeXmlText(match[1]));
  }
  const instruction = parts.join('').trim();
  return /\bTOC\b/i.test(instruction) ? instruction : undefined;
}

async function extractMathObjects(zip: JSZip): Promise<DocxMathObject[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const xml = await file.async('string');
    const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
    const out: DocxMathObject[] = [];

    paragraphs.forEach((paragraphXml, paragraphIndex) => {
      let textOffset = 0;
      const tokenRe = /<m:oMathPara\b[\s\S]*?<\/m:oMathPara>|<m:oMath\b[\s\S]*?<\/m:oMath>|<w:r\b[\s\S]*?<\/w:r>/g;
      let match: RegExpExecArray | null;
      while ((match = tokenRe.exec(paragraphXml))) {
        const token = match[0];
        if (token.startsWith('<m:oMath')) {
          const text = collectMathText(token);
          out.push({
            paragraphIndex,
            textOffset,
            omml: token,
            ...(text ? { text } : {}),
          });
        } else {
          textOffset += collectTextFromRunXml(token).length;
        }
      }
    });

    return out;
  } catch {
    return [];
  }
}

function collectMathText(mathXml: string): string {
  const parts: string[] = [];
  const textRe = /<m:t\b[^>]*>([\s\S]*?)<\/m:t>/g;
  let match: RegExpExecArray | null;
  while ((match = textRe.exec(mathXml))) {
    parts.push(decodeXmlText(match[1]));
  }
  return parts.join('').trim();
}

function collectTextFromRevisionXml(xml: string, deleted: boolean): string {
  const parts: string[] = [];
  const textTag = deleted ? 'w:delText' : 'w:t';
  const textRe = new RegExp(`<${textTag}\\b[^>]*>([\\s\\S]*?)<\\/${textTag}>|<w:tab\\s*\\/>|<w:br\\b[^>]*\\/>`, 'g');
  let match: RegExpExecArray | null;
  while ((match = textRe.exec(xml))) {
    if (match[1] != null) parts.push(decodeXmlText(match[1]));
    else if (match[0].startsWith('<w:tab')) parts.push('\t');
    else parts.push('\n');
  }
  return parts.join('');
}

function readChangeAttrs(xml: string): Pick<DocxTrackedChange, 'id' | 'author' | 'date'> {
  const tag = xml.match(/^<w:(?:ins|del)\b[^>]*>/)?.[0] ?? '';
  const id = readXmlAttr(tag, 'w:id');
  const author = readXmlAttr(tag, 'w:author');
  const date = readXmlAttr(tag, 'w:date');
  return {
    ...(id ? { id } : {}),
    ...(author ? { author: decodeXmlText(author) } : {}),
    ...(date ? { date } : {}),
  };
}

function collectTextFromRunXml(runXml: string): string {
  const parts: string[] = [];
  const textRe = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\b[^>]*\/>/g;
  let match: RegExpExecArray | null;
  while ((match = textRe.exec(runXml))) {
    if (match[1] != null) parts.push(decodeXmlText(match[1]));
    else if (match[0].startsWith('<w:tab')) parts.push('\t');
    else parts.push('\n');
  }
  return parts.join('');
}

function readRunStyle(runXml: string): Omit<DocxRunStyle, 'paragraphIndex' | 'startOffset' | 'endOffset'> | null {
  const rPr = runXml.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/)?.[0];
  if (!rPr) return null;

  const bold = readOnOffRunProperty(rPr, 'w:b');
  const complexScriptBold = readOnOffRunProperty(rPr, 'w:bCs');
  const italic = readOnOffRunProperty(rPr, 'w:i');
  const complexScriptItalic = readOnOffRunProperty(rPr, 'w:iCs');
  const underline = readUnderline(rPr);
  const strike = readOnOffRunProperty(rPr, 'w:strike');
  const doubleStrike = readOnOffRunProperty(rPr, 'w:dstrike');
  const verticalAlign = readVerticalAlign(rPr);
  const color = readHexAttr(rPr, 'w:color', 'w:val');
  const highlightColor = readHighlightColor(rPr);
  const complexScriptHighlightColor = readHighlightColor(rPr, 'w:highlightCs');
  const fontFamily = readRunFontFamily(rPr);
  const complexScriptFontFamily = readRunComplexScriptFontFamily(rPr);
  const fontSizePx = readRunFontSizePx(rPr);
  const complexScriptFontSizePx = readRunComplexScriptFontSizePx(rPr);
  const smallCaps = readOnOffRunProperty(rPr, 'w:smallCaps');
  const allCaps = readOnOffRunProperty(rPr, 'w:caps');
  const characterSpacingTwips = readRunCharacterSpacing(rPr);
  const textScale = readRunTextScale(rPr);
  const textPositionHalfPoints = readRunTextPosition(rPr);
  const hiddenText = readOnOffRunProperty(rPr, 'w:vanish');
  const specHiddenText = readOnOffRunProperty(rPr, 'w:specVanish');
  const emboss = readOnOffRunProperty(rPr, 'w:emboss');
  const imprint = readOnOffRunProperty(rPr, 'w:imprint');
  const textEffect = readRunTextEffect(rPr);
  const language = readRunLanguage(rPr);
  const kerningHalfPoints = readRunKerning(rPr);
  const rightToLeft = readOnOffRunProperty(rPr, 'w:rtl');
  const noProof = readOnOffRunProperty(rPr, 'w:noProof');
  const snapToGrid = readOnOffRunProperty(rPr, 'w:snapToGrid');
  const emphasisMark = readRunEmphasisMark(rPr);
  const mathRun = readOnOffRunProperty(rPr, 'w:oMath');
  const runBorder = readRunBorder(rPr);
  if (!bold && !complexScriptBold && !italic && !complexScriptItalic && !underline && !strike && !doubleStrike && !verticalAlign && !color && !highlightColor && !complexScriptHighlightColor && !fontFamily && !complexScriptFontFamily && !fontSizePx && !complexScriptFontSizePx && !smallCaps && !allCaps && !characterSpacingTwips && !textScale && !textPositionHalfPoints && !hiddenText && !specHiddenText && !emboss && !imprint && !textEffect && !language && !kerningHalfPoints && !rightToLeft && !noProof && !snapToGrid && !emphasisMark && !mathRun && !runBorder) return null;

  return {
    ...(bold ? { bold } : {}),
    ...(complexScriptBold ? { complexScriptBold } : {}),
    ...(italic ? { italic } : {}),
    ...(complexScriptItalic ? { complexScriptItalic } : {}),
    ...(underline ? { underline: true } : {}),
    ...(underline?.style ? { underlineStyle: underline.style } : {}),
    ...(underline?.color ? { underlineColor: underline.color } : {}),
    ...(strike ? { strike } : {}),
    ...(doubleStrike ? { doubleStrike } : {}),
    ...(verticalAlign ? { verticalAlign } : {}),
    ...(color ? { color } : {}),
    ...(highlightColor ? { highlightColor } : {}),
    ...(complexScriptHighlightColor ? { complexScriptHighlightColor } : {}),
    ...(fontFamily ? { fontFamily } : {}),
    ...(complexScriptFontFamily ? { complexScriptFontFamily } : {}),
    ...(fontSizePx ? { fontSizePx } : {}),
    ...(complexScriptFontSizePx ? { complexScriptFontSizePx } : {}),
    ...(smallCaps ? { smallCaps } : {}),
    ...(allCaps ? { allCaps } : {}),
    ...(characterSpacingTwips ? { characterSpacingTwips } : {}),
    ...(textScale ? { textScale } : {}),
    ...(textPositionHalfPoints ? { textPositionHalfPoints } : {}),
    ...(hiddenText ? { hiddenText } : {}),
    ...(specHiddenText ? { specHiddenText } : {}),
    ...(emboss ? { emboss } : {}),
    ...(imprint ? { imprint } : {}),
    ...(textEffect ? { textEffect } : {}),
    ...(language?.value ? { language: language.value } : {}),
    ...(language?.eastAsia ? { eastAsiaLanguage: language.eastAsia } : {}),
    ...(language?.bidirectional ? { bidiLanguage: language.bidirectional } : {}),
    ...(kerningHalfPoints ? { kerningHalfPoints } : {}),
    ...(rightToLeft ? { rightToLeft } : {}),
    ...(noProof ? { noProof } : {}),
    ...(snapToGrid ? { snapToGrid } : {}),
    ...(emphasisMark ? { emphasisMark } : {}),
    ...(mathRun ? { mathRun } : {}),
    ...(runBorder ? { runBorder } : {}),
  };
}

function readOnOffRunProperty(rPr: string, tagName: string): boolean {
  const tag = rPr.match(new RegExp(`<${tagName}\\b[^>]*(?:/>|>)`, 'i'))?.[0];
  if (!tag) return false;
  const value = readXmlAttr(tag, 'w:val');
  return value == null || !['0', 'false', 'off', 'none'].includes(value.toLowerCase());
}

function readUnderline(rPr: string): { style?: DocxUnderlineStyle; color?: string } | null {
  const tag = rPr.match(/<w:u\b[^>]*(?:\/>|>)/i)?.[0];
  if (!tag) return null;
  const value = readXmlAttr(tag, 'w:val');
  if (value != null && ['0', 'false', 'off', 'none'].includes(value.toLowerCase())) return null;
  const style = readUnderlineStyle(value);
  const color = readUnderlineColor(tag);
  return {
    ...(style && style !== 'single' ? { style } : {}),
    ...(color ? { color } : {}),
  };
}

function readUnderlineStyle(value: string | undefined): DocxUnderlineStyle | undefined {
  if (
    value === 'single'
    || value === 'words'
    || value === 'double'
    || value === 'thick'
    || value === 'dotted'
    || value === 'dottedHeavy'
    || value === 'dash'
    || value === 'dashedHeavy'
    || value === 'dashLong'
    || value === 'dashLongHeavy'
    || value === 'dotDash'
    || value === 'dashDotHeavy'
    || value === 'dotDotDash'
    || value === 'dashDotDotHeavy'
    || value === 'wave'
    || value === 'wavyHeavy'
    || value === 'wavyDouble'
  ) return value;
  return value == null ? 'single' : undefined;
}

function readUnderlineColor(tag: string): string | undefined {
  const raw = readXmlAttr(tag, 'w:color');
  if (!raw || raw.toLowerCase() === 'auto' || !/^[0-9a-f]{6}$/i.test(raw)) return undefined;
  return `#${raw.toUpperCase()}`;
}

function readVerticalAlign(rPr: string): 'superscript' | 'subscript' | undefined {
  const tag = rPr.match(/<w:vertAlign\b[^>]*(?:\/>|>)/i)?.[0];
  const value = tag ? readXmlAttr(tag, 'w:val') : undefined;
  if (value === 'superscript') return 'superscript';
  if (value === 'subscript') return 'subscript';
  return undefined;
}

function readHexAttr(xml: string, tagName: string, attrName: string): string | undefined {
  const tag = xml.match(new RegExp(`<${tagName}\\b[^>]*>`, 'i'))?.[0];
  if (!tag) return undefined;
  const raw = readXmlAttr(tag, attrName);
  if (!raw || raw.toLowerCase() === 'auto' || !/^[0-9a-f]{6}$/i.test(raw)) return undefined;
  return `#${raw.toUpperCase()}`;
}

function readHighlightColor(rPr: string, tagName = 'w:highlight'): string | undefined {
  const shading = readHexAttr(rPr, 'w:shd', 'w:fill');
  if (tagName === 'w:highlight' && shading) return shading;

  const highlightTag = rPr.match(new RegExp(`<${tagName}\\b[^>]*>`, 'i'))?.[0];
  const raw = highlightTag ? readXmlAttr(highlightTag, 'w:val') : undefined;
  if (!raw) return undefined;
  return HIGHLIGHT_COLOR_MAP[raw.toLowerCase()];
}

const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  yellow: '#FFFF00',
  green: '#00FF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  blue: '#0000FF',
  red: '#FF0000',
  darkblue: '#000080',
  darkcyan: '#008080',
  darkgreen: '#008000',
  darkmagenta: '#800080',
  darkred: '#800000',
  darkyellow: '#808000',
  darkgray: '#808080',
  lightgray: '#C0C0C0',
  black: '#000000',
};

function readRunFontFamily(rPr: string): string | undefined {
  const tag = rPr.match(/<w:rFonts\b[^>]*>/i)?.[0];
  if (!tag) return undefined;
  return readXmlAttr(tag, 'w:eastAsia')
    ?? readXmlAttr(tag, 'w:ascii')
    ?? readXmlAttr(tag, 'w:hAnsi')
    ?? readXmlAttr(tag, 'w:cs');
}

function readRunComplexScriptFontFamily(rPr: string): string | undefined {
  const tag = rPr.match(/<w:rFonts\b[^>]*>/i)?.[0];
  if (!tag) return undefined;
  return readXmlAttr(tag, 'w:cs');
}

function readRunFontSizePx(rPr: string): number | undefined {
  const sizeTag = rPr.match(/<w:sz\b[^>]*>/i)?.[0];
  const raw = sizeTag ? readXmlAttr(sizeTag, 'w:val') : undefined;
  const halfPoints = raw ? Number(raw) : NaN;
  if (!Number.isFinite(halfPoints) || halfPoints <= 0) return undefined;
  return Math.round((halfPoints / 2) * 1.333);
}

function readRunComplexScriptFontSizePx(rPr: string): number | undefined {
  const sizeTag = rPr.match(/<w:szCs\b[^>]*>/i)?.[0];
  const raw = sizeTag ? readXmlAttr(sizeTag, 'w:val') : undefined;
  const halfPoints = raw ? Number(raw) : NaN;
  if (!Number.isFinite(halfPoints) || halfPoints <= 0) return undefined;
  return Math.round((halfPoints / 2) * 1.333);
}

function readRunLanguage(rPr: string): {
  value?: string;
  eastAsia?: string;
  bidirectional?: string;
} | undefined {
  const tag = rPr.match(/<w:lang\b[^>]*(?:\/>|>)/i)?.[0];
  if (!tag) return undefined;
  const value = normalizeLanguageTag(readXmlAttr(tag, 'w:val'));
  const eastAsia = normalizeLanguageTag(readXmlAttr(tag, 'w:eastAsia'));
  const bidirectional = normalizeLanguageTag(readXmlAttr(tag, 'w:bidi'));
  if (!value && !eastAsia && !bidirectional) return undefined;
  return {
    ...(value ? { value } : {}),
    ...(eastAsia ? { eastAsia } : {}),
    ...(bidirectional ? { bidirectional } : {}),
  };
}

function normalizeLanguageTag(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === 'none') return undefined;
  return /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(trimmed) ? trimmed : undefined;
}

function readRunCharacterSpacing(rPr: string): number | undefined {
  const tag = rPr.match(/<w:spacing\b[^>]*>/i)?.[0];
  const raw = tag ? readXmlAttr(tag, 'w:val') : undefined;
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value !== 0 ? Math.round(value) : undefined;
}

function readRunTextScale(rPr: string): number | undefined {
  const tag = rPr.match(/<w:w\b[^>]*>|<w:scale\b[^>]*>/i)?.[0];
  const raw = tag ? readXmlAttr(tag, 'w:val') : undefined;
  const value = raw ? Number(raw) : NaN;
  if (!Number.isFinite(value) || value <= 0 || value === 100) return undefined;
  return Math.round(value);
}

function readRunTextPosition(rPr: string): number | undefined {
  const tag = rPr.match(/<w:position\b[^>]*>/i)?.[0];
  const raw = tag ? readXmlAttr(tag, 'w:val') : undefined;
  if (!raw) return undefined;
  const value = raw.endsWith('pt')
    ? Number(raw.slice(0, -2)) * 2
    : Number(raw);
  if (!Number.isFinite(value) || value === 0) return undefined;
  return Math.round(value);
}

function readRunKerning(rPr: string): number | undefined {
  const tag = rPr.match(/<w:kern\b[^>]*>/i)?.[0];
  const raw = tag ? readXmlAttr(tag, 'w:val') : undefined;
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
}

function readRunEmphasisMark(rPr: string): DocxEmphasisMark | undefined {
  const tag = rPr.match(/<w:em\b[^>]*(?:\/>|>)/i)?.[0];
  const raw = tag ? readXmlAttr(tag, 'w:val') : undefined;
  return raw === 'dot' ? raw : undefined;
}

function readRunBorder(rPr: string): DocxRunBorder | undefined {
  const tag = rPr.match(/<w:bdr\b[^>]*(?:\/>|>)/i)?.[0];
  if (!tag) return undefined;
  const style = readXmlAttr(tag, 'w:val');
  if (!style || style === 'none' || style === 'nil') return undefined;
  const color = readHexAttr(tag, 'w:bdr', 'w:color');
  const size = positiveIntXmlAttr(tag, 'w:sz');
  const space = positiveIntXmlAttr(tag, 'w:space');
  return {
    style,
    ...(color ? { color } : {}),
    ...(size ? { size } : {}),
    ...(space ? { space } : {}),
  };
}

function positiveIntXmlAttr(tag: string, attrName: string): number | undefined {
  const raw = readXmlAttr(tag, attrName);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
}

function readXmlAttr(tag: string, attrName: string): string | undefined {
  const escaped = attrName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  return tag.match(new RegExp(`${escaped}="([^"]+)"`, 'i'))?.[1];
}

function parseTwips(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function extractTableStyles(zip: JSZip, parser: XMLParser): Promise<DocxTableStyle[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const xml = await file.async('string');
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:document'] ?? parsed.document) as Record<string, unknown> | undefined;
    const body = root?.['w:body'] as Record<string, unknown> | undefined;
    const tables = asArray<Record<string, unknown>>(body?.['w:tbl']);
    const out: DocxTableStyle[] = [];

    tables.forEach((table, tableIndex) => {
      const tblPr = table['w:tblPr'] as Record<string, unknown> | undefined;
      const width = readTableWidth(tblPr);
      const columnWidthsTwips = readTableGridColumnWidths(table);
      const align = readTableAlign(tblPr);
      const layout = readTableLayout(tblPr);
      const cellSpacingTwips = readTableCellSpacing(tblPr);
      const caption = readTableStringProperty(tblPr, 'w:tblCaption');
      const description = readTableStringProperty(tblPr, 'w:tblDescription');
      if (!width && !columnWidthsTwips.length && !align && !layout && !cellSpacingTwips && !caption && !description) return;
      out.push({
        tableIndex,
        ...(width ? width : {}),
        ...(columnWidthsTwips.length ? { columnWidthsTwips } : {}),
        ...(align ? { align } : {}),
        ...(layout ? { layout } : {}),
        ...(cellSpacingTwips ? { cellSpacingTwips } : {}),
        ...(caption ? { caption } : {}),
        ...(description ? { description } : {}),
      });
    });

    return out;
  } catch {
    return [];
  }
}

function readTableStringProperty(
  tblPr: Record<string, unknown> | undefined,
  key: 'w:tblCaption' | 'w:tblDescription',
): string | undefined {
  const property = tblPr?.[key] as Record<string, unknown> | undefined;
  const value = property?.['@_w:val'];
  return typeof value === 'string' && value.trim() ? decodeXmlText(value.trim()) : undefined;
}

function readTableWidth(
  tblPr: Record<string, unknown> | undefined,
): Pick<DocxTableStyle, 'widthTwips' | 'widthPercent'> | undefined {
  const tblW = tblPr?.['w:tblW'] as Record<string, unknown> | undefined;
  const type = String(tblW?.['@_w:type'] ?? '').toLowerCase();
  const value = parseTwips(tblW?.['@_w:w']);
  if (value <= 0) return undefined;
  if (type === 'pct') return { widthPercent: Math.max(1, Math.min(100, Math.round(value / 50))) };
  if (!type || type === 'dxa') return { widthTwips: value };
  return undefined;
}

function readRunTextEffect(rPr: string): DocxTextEffect | undefined {
  const tag = rPr.match(/<w:effect\b[^>]*>/i)?.[0];
  const value = tag ? readXmlAttr(tag, 'w:val') : undefined;
  return normalizeDocxTextEffect(value);
}

function normalizeDocxTextEffect(value: string | undefined): DocxTextEffect | undefined {
  if (
    value === 'blinkBackground'
    || value === 'lights'
    || value === 'antsBlack'
    || value === 'antsRed'
    || value === 'shimmer'
    || value === 'sparkle'
    || value === 'none'
  ) {
    return value;
  }
  return undefined;
}

function readTableGridColumnWidths(table: Record<string, unknown>): number[] {
  const grid = table['w:tblGrid'] as Record<string, unknown> | undefined;
  const cols = asArray<Record<string, unknown>>(grid?.['w:gridCol']);
  return cols
    .map((col) => parseTwips(col['@_w:w']))
    .filter((width) => width > 0);
}

function readTableAlign(tblPr: Record<string, unknown> | undefined): DocxTableStyle['align'] {
  const jc = tblPr?.['w:jc'] as Record<string, unknown> | undefined;
  const value = String(jc?.['@_w:val'] ?? '').toLowerCase();
  if (value === 'center') return 'center';
  if (value === 'right') return 'right';
  if (value === 'left') return 'left';
  return undefined;
}

function readTableLayout(tblPr: Record<string, unknown> | undefined): DocxTableStyle['layout'] {
  const layout = tblPr?.['w:tblLayout'] as Record<string, unknown> | undefined;
  const value = String(layout?.['@_w:type'] ?? '').toLowerCase();
  if (value === 'fixed') return 'fixed';
  if (value === 'autofit') return 'autofit';
  return undefined;
}

function readTableCellSpacing(tblPr: Record<string, unknown> | undefined): number | undefined {
  const spacing = tblPr?.['w:tblCellSpacing'] as Record<string, unknown> | undefined;
  const type = String(spacing?.['@_w:type'] ?? '').toLowerCase();
  if (type && type !== 'dxa') return undefined;
  const value = parseTwips(spacing?.['@_w:w']);
  return value > 0 ? value : undefined;
}

async function extractTableRowStyles(zip: JSZip, parser: XMLParser): Promise<DocxTableRowStyle[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const xml = await file.async('string');
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:document'] ?? parsed.document) as Record<string, unknown> | undefined;
    const body = root?.['w:body'] as Record<string, unknown> | undefined;
    const tables = asArray<Record<string, unknown>>(body?.['w:tbl']);
    const out: DocxTableRowStyle[] = [];

    tables.forEach((table, tableIndex) => {
      const rows = asArray<Record<string, unknown>>(table['w:tr']);
      rows.forEach((row, rowIndex) => {
        const trPr = row['w:trPr'] as Record<string, unknown> | undefined;
        const height = readTableRowHeight(trPr);
        const tableHeader = readOnOffParsedProperty(trPr, 'w:tblHeader');
        const cantSplit = readOnOffParsedProperty(trPr, 'w:cantSplit');
        if (!height && !tableHeader && !cantSplit) return;
        out.push({
          tableIndex,
          rowIndex,
          ...(height ? height : {}),
          ...(tableHeader ? { tableHeader } : {}),
          ...(cantSplit ? { cantSplit } : {}),
        });
      });
    });

    return out;
  } catch {
    return [];
  }
}

function readTableRowHeight(
  trPr: Record<string, unknown> | undefined,
): Pick<DocxTableRowStyle, 'heightTwips' | 'heightRule'> | undefined {
  const trHeight = trPr?.['w:trHeight'] as Record<string, unknown> | undefined;
  const heightTwips = parseTwips(trHeight?.['@_w:val']);
  if (heightTwips <= 0) return undefined;

  const rawRule = String(trHeight?.['@_w:hRule'] ?? '').toLowerCase();
  const heightRule = rawRule === 'exact'
    ? 'exact'
    : rawRule === 'atleast'
      ? 'atLeast'
      : rawRule === 'auto'
        ? 'auto'
        : undefined;
  return {
    heightTwips,
    ...(heightRule ? { heightRule } : {}),
  };
}

function readOnOffParsedProperty(parent: Record<string, unknown> | undefined, key: string): boolean {
  const value = parent?.[key];
  if (value == null) return false;
  if (typeof value === 'string') return !['0', 'false', 'off', 'none'].includes(value.toLowerCase());
  if (typeof value !== 'object') return true;

  const raw = (value as Record<string, unknown>)['@_w:val'];
  if (raw == null) return true;
  return !['0', 'false', 'off', 'none'].includes(String(raw).toLowerCase());
}

async function extractTableCellStyles(zip: JSZip, parser: XMLParser): Promise<DocxTableCellStyle[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const xml = await file.async('string');
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:document'] ?? parsed.document) as Record<string, unknown> | undefined;
    const body = root?.['w:body'] as Record<string, unknown> | undefined;
    const tables = asArray<Record<string, unknown>>(body?.['w:tbl']);
    const out: DocxTableCellStyle[] = [];

    tables.forEach((table, tableIndex) => {
      const rows = asArray<Record<string, unknown>>(table['w:tr']);
      const activeVerticalMerges = new Map<number, DocxTableCellStyle>();
      rows.forEach((row, rowIndex) => {
        const cells = asArray<Record<string, unknown>>(row['w:tc']);
        let gridColumn = 0;
        cells.forEach((cell, cellIndex) => {
          const tcPr = cell['w:tcPr'] as Record<string, unknown> | undefined;
          const colSpan = readCellGridSpan(tcPr);
          const verticalMerge = readCellVerticalMerge(tcPr);
          const backgroundColor = readCellFill(tcPr);
          const widthTwips = readCellWidthTwips(tcPr);
          const border = readCellBorder(tcPr);
          const verticalAlign = readCellVerticalAlign(tcPr);
          const textDirection = readCellTextDirection(tcPr);
          const cellMargins = readCellMargins(tcPr);

          const style: DocxTableCellStyle = {
            tableIndex,
            rowIndex,
            cellIndex,
            gridColumn,
            ...(colSpan > 1 ? { colSpan } : {}),
            ...(verticalMerge === 'restart' ? { rowSpan: 1 } : {}),
            ...(verticalMerge === 'continue' ? { verticalMergeContinue: true } : {}),
            ...(backgroundColor ? { backgroundColor } : {}),
            ...(widthTwips ? { widthTwips } : {}),
            ...(border ? border : {}),
            ...(verticalAlign ? { verticalAlign } : {}),
            ...(textDirection ? { textDirection } : {}),
            ...(cellMargins ? { cellMargins } : {}),
          };

          if (verticalMerge === 'restart') {
            for (let column = gridColumn; column < gridColumn + colSpan; column += 1) {
              activeVerticalMerges.set(column, style);
            }
          } else if (verticalMerge === 'continue') {
            const start = activeVerticalMerges.get(gridColumn);
            if (start) start.rowSpan = Math.max(2, (start.rowSpan ?? 1) + 1);
          } else {
            for (let column = gridColumn; column < gridColumn + colSpan; column += 1) {
              activeVerticalMerges.delete(column);
            }
          }

          if (hasTableCellMetadata(style)) {
            out.push(style);
          }
          gridColumn += colSpan;
        });
      });
    });

    return out;
  } catch {
    return [];
  }
}

function hasTableCellMetadata(style: DocxTableCellStyle): boolean {
  return Boolean(
    style.colSpan
    || style.rowSpan
    || style.verticalMergeContinue
    || style.backgroundColor
    || style.widthTwips
    || style.borderColor
    || style.borderSize
    || style.cellBorders
    || style.verticalAlign
    || style.textDirection
    || style.cellMargins,
  );
}

function readCellFill(tcPr: Record<string, unknown> | undefined): string | undefined {
  const shd = tcPr?.['w:shd'] as Record<string, unknown> | undefined;
  const raw = shd?.['@_w:fill'];
  if (typeof raw !== 'string') return undefined;
  const fill = raw.trim();
  if (!/^[0-9a-f]{6}$/i.test(fill) || fill.toLowerCase() === 'auto') return undefined;
  return `#${fill.toUpperCase()}`;
}

function readCellWidthTwips(tcPr: Record<string, unknown> | undefined): number | undefined {
  const tcW = tcPr?.['w:tcW'] as Record<string, unknown> | undefined;
  const type = String(tcW?.['@_w:type'] ?? '').toLowerCase();
  if (type && type !== 'dxa') return undefined;
  const width = parseTwips(tcW?.['@_w:w']);
  return width > 0 ? width : undefined;
}

function readCellGridSpan(tcPr: Record<string, unknown> | undefined): number {
  const gridSpan = tcPr?.['w:gridSpan'] as Record<string, unknown> | undefined;
  const span = Number(gridSpan?.['@_w:val']);
  return Number.isFinite(span) && span > 1 ? Math.round(span) : 1;
}

function readCellVerticalMerge(tcPr: Record<string, unknown> | undefined): 'restart' | 'continue' | undefined {
  const vMerge = tcPr?.['w:vMerge'] as Record<string, unknown> | string | undefined;
  if (!vMerge) return undefined;
  if (typeof vMerge === 'string') return vMerge === 'restart' ? 'restart' : 'continue';
  const raw = String(vMerge['@_w:val'] ?? '').toLowerCase();
  return raw === 'restart' ? 'restart' : 'continue';
}

// ─────────────────────────────────────────────
// header / footer / footnotes — 텍스트 추출 공통
// ─────────────────────────────────────────────

function readCellVerticalAlign(tcPr: Record<string, unknown> | undefined): 'top' | 'center' | 'bottom' | undefined {
  const vAlign = tcPr?.['w:vAlign'] as Record<string, unknown> | undefined;
  const raw = String(vAlign?.['@_w:val'] ?? '').toLowerCase();
  if (raw === 'top') return 'top';
  if (raw === 'center') return 'center';
  if (raw === 'bottom') return 'bottom';
  return undefined;
}

function readCellTextDirection(tcPr: Record<string, unknown> | undefined): DocxCellTextDirection | undefined {
  const textDirection = tcPr?.['w:textDirection'] as Record<string, unknown> | undefined;
  const raw = String(textDirection?.['@_w:val'] ?? '');
  if (raw === 'lrTb' || raw === 'tbRl' || raw === 'btLr') return raw;
  return undefined;
}

function readCellMargins(
  tcPr: Record<string, unknown> | undefined,
): NonNullable<DocxTableCellStyle['cellMargins']> | undefined {
  const tcMar = tcPr?.['w:tcMar'] as Record<string, unknown> | undefined;
  if (!tcMar) return undefined;
  const top = readCellMarginSide(tcMar['w:top'] as Record<string, unknown> | undefined);
  const right = readCellMarginSide((tcMar['w:right'] ?? tcMar['w:end']) as Record<string, unknown> | undefined);
  const bottom = readCellMarginSide(tcMar['w:bottom'] as Record<string, unknown> | undefined);
  const left = readCellMarginSide((tcMar['w:left'] ?? tcMar['w:start']) as Record<string, unknown> | undefined);
  if (top == null && right == null && bottom == null && left == null) return undefined;
  return {
    ...(top != null ? { top } : {}),
    ...(right != null ? { right } : {}),
    ...(bottom != null ? { bottom } : {}),
    ...(left != null ? { left } : {}),
  };
}

function readCellMarginSide(side: Record<string, unknown> | undefined): number | undefined {
  if (!side) return undefined;
  const type = String(side['@_w:type'] ?? '').toLowerCase();
  if (type && type !== 'dxa') return undefined;
  const value = parseTwips(side['@_w:w']);
  return value > 0 ? value : undefined;
}

function readCellBorder(
  tcPr: Record<string, unknown> | undefined,
): Pick<DocxTableCellStyle, 'borderColor' | 'borderSize' | 'cellBorders'> | undefined {
  const borders = tcPr?.['w:tcBorders'] as Record<string, unknown> | undefined;
  if (!borders) return undefined;

  const cellBorders: DocxCellBorders = {
    top: readBorderSide(borders['w:top'] as Record<string, unknown> | undefined),
    right: readBorderSide((borders['w:right'] ?? borders['w:end']) as Record<string, unknown> | undefined),
    bottom: readBorderSide(borders['w:bottom'] as Record<string, unknown> | undefined),
    left: readBorderSide((borders['w:left'] ?? borders['w:start']) as Record<string, unknown> | undefined),
  };
  const sides = Object.values(cellBorders).filter((item): item is DocxCellBorderSide => Boolean(item));
  if (sides.length === 0) return undefined;

  const uniform = readUniformCellBorder(cellBorders);
  return {
    ...(uniform?.color ? { borderColor: uniform.color } : {}),
    ...(uniform?.size ? { borderSize: uniform.size } : {}),
    cellBorders,
  };
}

function readUniformCellBorder(borders: DocxCellBorders): DocxCellBorderSide | undefined {
  const sides = [borders.top, borders.right, borders.bottom, borders.left];
  if (sides.some((side) => !side)) return undefined;
  const [first] = sides;
  if (!first) return undefined;
  const isUniform = sides.every((side) => (
    side?.color === first.color && side?.size === first.size
  ));
  return isUniform ? first : undefined;
}

function readBorderSide(side: Record<string, unknown> | undefined): DocxBorderSide | undefined {
  if (!side) return undefined;
  const val = String(side['@_w:val'] ?? '').toLowerCase();
  if (val === 'nil' || val === 'none') return undefined;

  const rawColor = side['@_w:color'];
  const color = typeof rawColor === 'string' && /^[0-9a-f]{6}$/i.test(rawColor)
    ? `#${rawColor.toUpperCase()}`
    : undefined;
  const size = parseTwips(side['@_w:sz']);
  const space = parseTwips(side['@_w:space']);
  if (!color && !size && !space) return undefined;
  return {
    ...(color ? { color } : {}),
    ...(size ? { size } : {}),
    ...(space ? { space } : {}),
  };
}

async function extractComments(zip: JSZip, parser: XMLParser): Promise<Map<string, DocxComment>> {
  const out = new Map<string, DocxComment>();
  const file = zip.file('word/comments.xml');
  if (!file) return out;
  try {
    const xml = await file.async('string');
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:comments'] ?? parsed.comments) as Record<string, unknown> | undefined;
    const items = asArray<Record<string, unknown>>(root?.['w:comment']);
    for (const item of items) {
      const id = String(item['@_w:id'] ?? '');
      if (!id) continue;
      const text = collectText(item).trim();
      if (!text) continue;
      const author = String(item['@_w:author'] ?? 'Reviewer');
      const rawDate = item['@_w:date'];
      out.set(id, {
        id,
        text,
        author,
        ...(typeof rawDate === 'string' && rawDate ? { createdAt: rawDate } : {}),
      });
    }
  } catch { /* skip */ }
  return out;
}

async function extractCommentRanges(zip: JSZip): Promise<DocxCommentRange[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const xml = await file.async('string');
    const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
    const ranges: DocxCommentRange[] = [];

    paragraphs.forEach((paragraphXml, paragraphIndex) => {
      const openRanges = new Map<string, number>();
      let textOffset = 0;
      const tokenRe = /<w:commentRangeStart\b[^>]*w:id="([^"]+)"[^>]*\/>|<w:commentRangeEnd\b[^>]*w:id="([^"]+)"[^>]*\/>|<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
      let match: RegExpExecArray | null;
      while ((match = tokenRe.exec(paragraphXml))) {
        if (match[1]) {
          openRanges.set(match[1], textOffset);
        } else if (match[2]) {
          const startOffset = openRanges.get(match[2]);
          if (startOffset != null && textOffset > startOffset) {
            ranges.push({
              paragraphIndex,
              startOffset,
              endOffset: textOffset,
              commentId: match[2],
            });
          }
          openRanges.delete(match[2]);
        } else if (match[3] != null) {
          textOffset += decodeXmlText(match[3]).length;
        }
      }
    });

    return ranges;
  } catch {
    return [];
  }
}

async function extractBookmarksAndLinks(zip: JSZip): Promise<{
  paragraphBookmarks: DocxParagraphBookmark[];
  linkRanges: DocxLinkRange[];
}> {
  const file = zip.file('word/document.xml');
  if (!file) return { paragraphBookmarks: [], linkRanges: [] };
  try {
    const xml = await file.async('string');
    const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
    const paragraphBookmarks: DocxParagraphBookmark[] = [];
    const linkRanges: DocxLinkRange[] = [];

    paragraphs.forEach((paragraphXml, paragraphIndex) => {
      const bookmarkTag = paragraphXml.match(/<w:bookmarkStart\b[^>]*w:name="([^"]+)"[^>]*\/>/);
      const bookmarkId = bookmarkTag?.[1] ? sanitizeBookmarkId(decodeXmlText(bookmarkTag[1])) : null;
      if (bookmarkId) paragraphBookmarks.push({ paragraphIndex, id: bookmarkId });

      let textOffset = 0;
      const tokenRe = /<w:hyperlink\b[^>]*w:anchor="([^"]+)"[^>]*>[\s\S]*?<\/w:hyperlink>|<w:r\b[\s\S]*?<\/w:r>/g;
      let match: RegExpExecArray | null;
      while ((match = tokenRe.exec(paragraphXml))) {
        const token = match[0];
        const text = collectTextFromRunXml(token);
        const length = text.length;
        if (match[1] && length > 0) {
          const anchor = sanitizeBookmarkId(decodeXmlText(match[1]));
          if (anchor) {
            linkRanges.push({
              paragraphIndex,
              startOffset: textOffset,
              endOffset: textOffset + length,
              href: `#${anchor}`,
            });
          }
        }
        textOffset += length;
      }
    });

    return { paragraphBookmarks, linkRanges };
  } catch {
    return { paragraphBookmarks: [], linkRanges: [] };
  }
}

async function extractTextBoxes(zip: JSZip): Promise<DocxTextBox[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const xml = await file.async('string');
    const boxes: DocxTextBox[] = [];
    const seen = new Set<string>();
    const boxRe = /<w:txbxContent\b[\s\S]*?<\/w:txbxContent>/g;
    let match: RegExpExecArray | null;
    while ((match = boxRe.exec(xml)) !== null) {
      const text = extractTextBoxText(match[0]);
      if (!text || seen.has(text)) continue;
      seen.add(text);
      boxes.push({ text });
    }
    return boxes;
  } catch {
    return [];
  }
}

function extractTextBoxText(textBoxXml: string): string {
  const lines: string[] = [];
  const paragraphRe = /<w:p\b[\s\S]*?<\/w:p>/g;
  let match: RegExpExecArray | null;
  while ((match = paragraphRe.exec(textBoxXml)) !== null) {
    const text = collectTextFromParagraphXml(match[0]).trim();
    if (text) lines.push(text);
  }
  if (lines.length > 0) return lines.join('\n');
  return collectTextFromParagraphXml(textBoxXml).trim();
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function sanitizeBookmarkId(value: string): string {
  const id = value.trim().replace(/^#/, '').replace(/[^A-Za-z0-9_:-]/g, '_');
  if (!id || /^\d/.test(id)) return id ? `_${id}` : '';
  return id;
}

async function extractPageMargin(zip: JSZip): Promise<DocxPageMargin | undefined> {
  const file = zip.file('word/document.xml');
  if (!file) return undefined;
  try {
    const xml = await file.async('string');
    const sectionXml = xml.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/i)?.[0];
    const pageMarginTag = sectionXml?.match(/<w:pgMar\b[^>]*>/i)?.[0];
    if (!pageMarginTag) return undefined;

    const topTwips = parseTwips(readXmlAttr(pageMarginTag, 'w:top'));
    const leftTwips = parseTwips(readXmlAttr(pageMarginTag, 'w:left'));
    const rightTwips = parseTwips(readXmlAttr(pageMarginTag, 'w:right'));
    const bottomTwips = parseTwips(readXmlAttr(pageMarginTag, 'w:bottom'));
    if (!topTwips && !leftTwips && !rightTwips && !bottomTwips) return undefined;

    return {
      top: topTwips ? twipsToPx(topTwips) : 96,
      left: leftTwips ? twipsToPx(leftTwips) : 96,
      right: rightTwips ? twipsToPx(rightTwips) : 96,
      bottom: bottomTwips ? twipsToPx(bottomTwips) : 96,
    };
  } catch {
    return undefined;
  }
}

async function extractPageSize(zip: JSZip): Promise<DocxPageSize | undefined> {
  const file = zip.file('word/document.xml');
  if (!file) return undefined;
  try {
    const xml = await file.async('string');
    const sectionXml = xml.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/i)?.[0];
    const pageSizeTag = sectionXml?.match(/<w:pgSz\b[^>]*>/i)?.[0];
    if (!pageSizeTag) return undefined;

    const widthTwips = parseTwips(readXmlAttr(pageSizeTag, 'w:w'));
    const heightTwips = parseTwips(readXmlAttr(pageSizeTag, 'w:h'));
    if (!widthTwips || !heightTwips) return undefined;

    const rawOrientation = readXmlAttr(pageSizeTag, 'w:orient');
    const orientation = rawOrientation === 'landscape' ? 'landscape' : 'portrait';
    const widthPx = twipsToPx(widthTwips);
    const heightPx = twipsToPx(heightTwips);
    const normalizedWidth = orientation === 'landscape' ? Math.max(widthPx, heightPx) : widthPx;
    const normalizedHeight = orientation === 'landscape' ? Math.min(widthPx, heightPx) : heightPx;
    return {
      width: normalizedWidth,
      height: normalizedHeight,
      orientation,
    };
  } catch {
    return undefined;
  }
}

async function extractSectionColumns(zip: JSZip): Promise<DocxSectionColumns | undefined> {
  const file = zip.file('word/document.xml');
  if (!file) return undefined;
  try {
    const xml = await file.async('string');
    const sectionXml = xml.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/i)?.[0];
    const colsTag = sectionXml?.match(/<w:cols\b[^>]*(?:\/>|>)/i)?.[0];
    if (!colsTag) return undefined;

    const count = Number(readXmlAttr(colsTag, 'w:num') ?? 1);
    const spaceTwips = parseTwips(readXmlAttr(colsTag, 'w:space'));
    const separate = readOnOffAttr(readXmlAttr(colsTag, 'w:sep'));
    const equalWidth = readXmlAttr(colsTag, 'w:equalWidth') == null
      ? undefined
      : readOnOffAttr(readXmlAttr(colsTag, 'w:equalWidth'));
    if (!Number.isFinite(count) || count <= 1) return undefined;

    return {
      count: Math.max(1, Math.round(count)),
      ...(spaceTwips ? { space: twipsToPx(spaceTwips) } : {}),
      ...(separate !== undefined ? { separate } : {}),
      ...(equalWidth !== undefined ? { equalWidth } : {}),
    };
  } catch {
    return undefined;
  }
}

function readOnOffAttr(value: string | undefined): boolean | undefined {
  if (value == null) return undefined;
  return !['0', 'false', 'off', 'none'].includes(value.toLowerCase());
}

function twipsToPx(twips: number): number {
  return Math.max(0, Math.round(twips / 15));
}

async function extractHeaderFooterData(
  zip: JSZip,
  parser: XMLParser,
  re: RegExp,
): Promise<{ text: string; align?: DocxTextAlign; hasPageNumber?: boolean }> {
  const parts: string[] = [];
  let align: DocxTextAlign | undefined;
  let hasPageNumber = false;
  for (const path of Object.keys(zip.files)) {
    if (!re.test(path)) continue;
    const f = zip.file(path);
    if (!f) continue;
    try {
      const xml = await f.async('string');
      const parsed = parser.parse(xml) as Record<string, unknown>;
      const structuredLines = extractHeaderFooterTextLines(xml);
      if (structuredLines.length > 0) parts.push(...structuredLines);
      else parts.push(collectText(parsed).trim());
      align ??= readFirstParagraphAlign(xml);
      if (hasPageNumberField(xml)) hasPageNumber = true;
    } catch { /* skip */ }
  }
  return {
    text: parts.map((part) => part.trim()).filter(Boolean).join('\n').trim(),
    ...(align ? { align } : {}),
    ...(hasPageNumber ? { hasPageNumber } : {}),
  };
}

function extractHeaderFooterTextLines(xml: string): string[] {
  const lines: string[] = [];
  const blockRe = /<w:tbl\b[\s\S]*?<\/w:tbl>|<w:p\b[\s\S]*?<\/w:p>/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(xml))) {
    const blockXml = match[0];
    if (blockXml.startsWith('<w:tbl')) {
      lines.push(...extractTableTextLines(blockXml));
    } else {
      const text = collectTextFromParagraphXml(blockXml).trim();
      if (text) lines.push(text);
    }
  }
  return lines;
}

function extractTableTextLines(tableXml: string): string[] {
  const rows: string[] = [];
  const rowRe = /<w:tr\b[\s\S]*?<\/w:tr>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(tableXml))) {
    const cells: string[] = [];
    const cellRe = /<w:tc\b[\s\S]*?<\/w:tc>/g;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowMatch[0]))) {
      const cellText = collectTextFromParagraphXml(cellMatch[0]).replace(/\s+/g, ' ').trim();
      if (cellText) cells.push(cellText);
    }
    if (cells.length > 0) rows.push(cells.join(' | '));
  }
  return rows;
}

function collectTextFromParagraphXml(paragraphXml: string): string {
  const parts: string[] = [];
  const tokenRe = /<w:r\b[\s\S]*?<\/w:r>|<w:hyperlink\b[\s\S]*?<\/w:hyperlink>/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(paragraphXml))) {
    parts.push(collectTextFromRunXml(match[0]));
  }
  return parts.join('');
}

function readFirstParagraphAlign(xml: string): DocxTextAlign | undefined {
  const paragraph = xml.match(/<w:p\b[\s\S]*?<\/w:p>/)?.[0];
  const jc = paragraph?.match(/<w:jc\b[^>]*>/)?.[0];
  return jc ? mapParagraphAlign(readXmlAttr(jc, 'w:val')) : undefined;
}

function hasPageNumberField(xml: string): boolean {
  return /<w:instrText\b[^>]*>[\s\S]*?(?:PAGE|NUMPAGES)[\s\S]*?<\/w:instrText>|<w:fldSimple\b[^>]*w:instr="[^"]*(?:PAGE|NUMPAGES)/i.test(xml);
}

async function extractFootnotes(zip: JSZip, parser: XMLParser): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const file = zip.file('word/footnotes.xml');
  if (!file) return out;
  try {
    const xml = await file.async('string');
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:footnotes'] ?? parsed.footnotes) as Record<string, unknown> | undefined;
    const items = (root?.['w:footnote'] ?? []) as Array<Record<string, unknown>>;
    for (const item of items) {
      const type = item['@_w:type'] as string | undefined;
      if (type === 'separator' || type === 'continuationSeparator') continue;
      const id = String(item['@_w:id'] ?? '');
      if (!id) continue;
      const text = collectText(item).trim();
      if (text) out.set(id, text);
    }
  } catch { /* skip */ }
  return out;
}

/** 객체 트리에서 w:t (텍스트) 만 재귀 수집. paragraph 사이 공백 1개. */
async function extractEndnotes(zip: JSZip, parser: XMLParser): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const file = zip.file('word/endnotes.xml');
  if (!file) return out;
  try {
    const xml = await file.async('string');
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:endnotes'] ?? parsed.endnotes) as Record<string, unknown> | undefined;
    const items = (root?.['w:endnote'] ?? []) as Array<Record<string, unknown>>;
    for (const item of items) {
      const type = item['@_w:type'] as string | undefined;
      if (type === 'separator' || type === 'continuationSeparator') continue;
      const id = String(item['@_w:id'] ?? '');
      if (!id) continue;
      const text = collectText(item).trim();
      if (text) out.set(id, text);
    }
  } catch { /* skip */ }
  return out;
}

async function extractEndnoteReferences(zip: JSZip): Promise<DocxNoteReference[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const xml = await file.async('string');
    const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
    const out: DocxNoteReference[] = [];
    paragraphs.forEach((paragraphXml, paragraphIndex) => {
      let textOffset = 0;
      const tokenRe = /<w:endnoteReference\b[^>]*\/>|<w:r\b[\s\S]*?<\/w:r>/g;
      let match: RegExpExecArray | null;
      while ((match = tokenRe.exec(paragraphXml))) {
        const token = match[0];
        if (token.startsWith('<w:endnoteReference')) {
          const id = readXmlAttr(token, 'w:id');
          if (id) out.push({ paragraphIndex, textOffset, id });
        } else {
          textOffset += collectTextFromRunXml(token).length;
        }
      }
    });
    return out;
  } catch {
    return [];
  }
}

function collectText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node !== 'object') return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key.startsWith('@_')) continue;
    if (key === 'w:t' || key === '#text') {
      if (typeof value === 'string') parts.push(value);
      else if (Array.isArray(value)) {
        for (const v of value) parts.push(collectText(v));
      } else if (value && typeof value === 'object') {
        parts.push(collectText(value));
      }
      continue;
    }
    if (Array.isArray(value)) {
      for (const v of value) parts.push(collectText(v));
    } else if (value && typeof value === 'object') {
      parts.push(collectText(value));
    }
  }
  return parts.join('');
}
