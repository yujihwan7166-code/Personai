/**
 * mammoth 가 변환한 .docx HTML 을 TipTap 친화적으로 후처리.
 *
 * mammoth 기본 변환은 단순 — inline 글꼴·색·크기 일부만 보존, 표 border
 * 종종 누락, 이미지 크기 attr 없음. 이 모듈이 그 갭을 메워서 사용자가
 * 원본 .docx 와 "사실상 같은 파일" 로 느끼도록 끌어올림.
 *
 * 정책:
 *  - 입출력 모두 HTML string (mammoth → setContent 사이 끼움)
 *  - DOMParser 로 트리 수정 → outerHTML 반환
 *  - 외부 fetch / 신규 라이브러리 추가 없음
 *  - TipTap TextStyle / Highlight / Table* / Image 확장과 호환
 *
 * 한계 (mammoth 의 출력에 의존):
 *  - mammoth 가 inline color 를 export 안 하면 후처리도 색 복원 불가
 *    → 그 케이스는 C 단계에서 자체 XML 파서로 보강
 */

import { mapFontFamily } from './fontMap';

const BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6';

interface DocxHtmlEnrichOptions {
  footnotes?: Map<string, string>;
  endnotes?: Map<string, string>;
  endnoteReferences?: Array<{
    paragraphIndex: number;
    textOffset: number;
    id: string;
  }>;
  pageBreaks?: Array<{ paragraphIndex: number; textOffset: number }>;
  columnBreaks?: Array<{ paragraphIndex: number; textOffset: number }>;
  sectionBreaks?: Array<{
    paragraphIndex: number;
    type: string;
    pageMargin?: unknown;
    pageSize?: unknown;
    sectionColumns?: unknown;
  }>;
  pageBreakParagraphs?: number[];
  paragraphIndents?: Array<{
    paragraphIndex: number;
    leftTwips: number;
    rightTwips?: number;
    firstLineTwips?: number;
    hangingTwips?: number;
  }>;
  paragraphAlignments?: Array<{
    paragraphIndex: number;
    align: 'left' | 'center' | 'right' | 'justify';
  }>;
  paragraphOutlineLevels?: Array<{
    paragraphIndex: number;
    level: number;
  }>;
  paragraphPagination?: Array<{
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
  }>;
  paragraphTabStops?: Array<{
    paragraphIndex: number;
    tabStops: unknown[];
  }>;
  paragraphSpacings?: Array<{
    paragraphIndex: number;
    beforeTwips?: number;
    afterTwips?: number;
    line?: number;
    lineRule?: 'auto' | 'exact' | 'atLeast';
  }>;
  paragraphDecorations?: Array<{
    paragraphIndex: number;
    backgroundColor?: string;
    borders?: {
      top?: { color?: string; size?: number; space?: number };
      right?: { color?: string; size?: number; space?: number };
      bottom?: { color?: string; size?: number; space?: number };
      left?: { color?: string; size?: number; space?: number };
    };
  }>;
  paragraphBookmarks?: Array<{
    paragraphIndex: number;
    id: string;
  }>;
  linkRanges?: Array<{
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
    href: string;
  }>;
  textBoxes?: Array<{
    text: string;
  }>;
  tocFields?: Array<{
    paragraphIndex: number;
    instruction: string;
    text?: string;
  }>;
  mathObjects?: Array<{
    paragraphIndex: number;
    textOffset: number;
    omml: string;
    text?: string;
  }>;
  listStarts?: Array<{
    listIndex: number;
    start: number;
    format?: string;
    leftTwips?: number;
    hangingTwips?: number;
  }>;
  bulletListStyles?: Array<{
    listIndex: number;
    format?: string;
    text?: string;
    leftTwips?: number;
    hangingTwips?: number;
  }>;
  runStyles?: Array<{
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
    bold?: boolean;
    complexScriptBold?: boolean;
    italic?: boolean;
    complexScriptItalic?: boolean;
    underline?: boolean;
    underlineStyle?: string;
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
    textEffect?: string;
    language?: string;
    eastAsiaLanguage?: string;
    bidiLanguage?: string;
    kerningHalfPoints?: number;
    rightToLeft?: boolean;
    noProof?: boolean;
    snapToGrid?: boolean;
    emphasisMark?: string;
    mathRun?: boolean;
    runBorder?: {
      style: string;
      color?: string;
      size?: number;
      space?: number;
    };
  }>;
  tableStyles?: Array<{
    tableIndex: number;
    widthTwips?: number;
    widthPercent?: number;
    columnWidthsTwips?: number[];
    align?: 'left' | 'center' | 'right';
    layout?: 'fixed' | 'autofit';
    cellSpacingTwips?: number;
  }>;
  tableRowStyles?: Array<{
    tableIndex: number;
    rowIndex: number;
    heightTwips?: number;
    heightRule?: 'auto' | 'atLeast' | 'exact';
    tableHeader?: boolean;
    cantSplit?: boolean;
  }>;
  tableCellStyles?: Array<{
    tableIndex: number;
    rowIndex: number;
    cellIndex: number;
    gridColumn?: number;
    colSpan?: number;
    rowSpan?: number;
    verticalMergeContinue?: boolean;
    backgroundColor?: string;
    widthTwips?: number;
    borderColor?: string;
    borderSize?: number;
    cellBorders?: {
      top?: { color?: string; size?: number };
      right?: { color?: string; size?: number };
      bottom?: { color?: string; size?: number };
      left?: { color?: string; size?: number };
    };
    verticalAlign?: 'top' | 'center' | 'bottom';
    textDirection?: 'lrTb' | 'tbRl' | 'btLr';
    cellMargins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  }>;
  imageDimensions?: Array<{
    imageIndex: number;
    width: number;
    height: number;
    align?: 'left' | 'center' | 'right' | 'justify';
    floating?: boolean;
    wrap?: 'square' | 'tight' | 'topAndBottom' | 'none';
    wrapSide?: 'bothSides' | 'left' | 'right' | 'largest';
  }>;
  comments?: Map<string, {
    id: string;
    text: string;
    author: string;
    createdAt?: string;
  }>;
  commentRanges?: Array<{
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
    commentId: string;
  }>;
  trackedChanges?: Array<{
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
    type: 'insert' | 'delete';
    text: string;
    id?: string;
    author?: string;
    date?: string;
  }>;
}

/** mammoth HTML → TipTap-친화 HTML. SSR 환경(DOMParser 없음)에서는 원본 그대로. */
export function enrichDocxHtml(html: string, options: DocxHtmlEnrichOptions = {}): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  if (!doc.body) return html;
  normalizeFootnotes(doc.body, options.footnotes);
  normalizeEndnotes(doc.body, options.endnotes, options.endnoteReferences);
  normalizeParagraphIndents(doc.body, options.paragraphIndents);
  normalizeParagraphAlignments(doc.body, options.paragraphAlignments);
  normalizeParagraphOutlineLevels(doc.body, options.paragraphOutlineLevels);
  normalizeParagraphPagination(doc.body, options.paragraphPagination);
  normalizeParagraphTabStops(doc.body, options.paragraphTabStops);
  normalizeParagraphSpacings(doc.body, options.paragraphSpacings);
  normalizeParagraphDecorations(doc.body, options.paragraphDecorations);
  normalizeParagraphBookmarks(doc.body, options.paragraphBookmarks);
  normalizeListStarts(doc.body, options.listStarts);
  normalizeBulletListStyles(doc.body, options.bulletListStyles);
  normalizeRunStyles(doc.body, options.runStyles);
  normalizeLinkRanges(doc.body, options.linkRanges);
  normalizeTrackedChanges(doc.body, options.trackedChanges);
  normalizeComments(doc.body, options.comments, options.commentRanges);
  normalizeSectionBreaks(doc.body, options.sectionBreaks);
  normalizePageBreaks(doc.body, options.pageBreaks, options.pageBreakParagraphs);
  normalizeColumnBreaks(doc.body, options.columnBreaks);
  normalizeTocFields(doc.body, options.tocFields);
  normalizeMathObjects(doc.body, options.mathObjects);
  normalizeTextBoxes(doc.body, options.textBoxes);
  walkInlineStyles(doc.body);
  normalizeTables(doc.body, options.tableCellStyles, options.tableRowStyles, options.tableStyles);
  normalizeImages(doc.body, options.imageDimensions);
  return doc.body.innerHTML;
}

function normalizeParagraphIndents(
  root: Element,
  paragraphIndents?: Array<{
    paragraphIndex: number;
    leftTwips: number;
    rightTwips?: number;
    firstLineTwips?: number;
    hangingTwips?: number;
  }>,
): void {
  if (!paragraphIndents?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  for (const item of paragraphIndents) {
    const paragraph = paragraphs[item.paragraphIndex];
    if (!paragraph || paragraph.closest('li')) continue;
    const level = Math.max(0, Math.min(8, Math.round(item.leftTwips / 720)));
    if (level > 0) paragraph.setAttribute('data-indent', String(level));
    applyParagraphIndentStyle(paragraph, item);
  }
}

function applyParagraphIndentStyle(
  paragraph: HTMLElement,
  indent: {
    leftTwips: number;
    rightTwips?: number;
    firstLineTwips?: number;
    hangingTwips?: number;
  },
): void {
  if (indent.leftTwips > 0) {
    appendStyle(paragraph, 'margin-left', `${twipsToPx(indent.leftTwips)}px`);
  }
  if (indent.rightTwips && indent.rightTwips > 0) {
    const rightPx = twipsToPx(indent.rightTwips);
    paragraph.setAttribute('data-indent-right', String(rightPx));
    appendStyle(paragraph, 'margin-right', `${rightPx}px`);
  }
  if (indent.firstLineTwips && indent.firstLineTwips > 0) {
    const firstLinePx = twipsToPx(indent.firstLineTwips);
    paragraph.setAttribute('data-indent-first-line', String(firstLinePx));
    appendStyle(paragraph, 'text-indent', `${firstLinePx}px`);
  } else if (indent.hangingTwips && indent.hangingTwips > 0) {
    const hangingPx = twipsToPx(indent.hangingTwips);
    paragraph.setAttribute('data-indent-hanging', String(hangingPx));
    appendStyle(paragraph, 'text-indent', `-${hangingPx}px`);
    if (indent.leftTwips <= 0) appendStyle(paragraph, 'margin-left', `${hangingPx}px`);
  }
}

function normalizeParagraphAlignments(
  root: Element,
  paragraphAlignments?: Array<{
    paragraphIndex: number;
    align: 'left' | 'center' | 'right' | 'justify';
  }>,
): void {
  if (!paragraphAlignments?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  for (const item of paragraphAlignments) {
    const paragraph = paragraphs[item.paragraphIndex];
    if (!paragraph) continue;
    paragraph.setAttribute('data-text-align', item.align);
    appendStyle(paragraph, 'text-align', item.align);
  }
}

function normalizeParagraphOutlineLevels(
  root: Element,
  paragraphOutlineLevels?: Array<{
    paragraphIndex: number;
    level: number;
  }>,
): void {
  if (!paragraphOutlineLevels?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  for (const item of paragraphOutlineLevels) {
    const paragraph = paragraphs[item.paragraphIndex];
    const level = Math.max(1, Math.min(6, Math.round(item.level)));
    if (!paragraph || paragraph.tagName.toLowerCase() !== 'p') continue;
    const heading = paragraph.ownerDocument.createElement(`h${level}`);
    for (const attr of Array.from(paragraph.attributes)) {
      heading.setAttribute(attr.name, attr.value);
    }
    heading.innerHTML = paragraph.innerHTML;
    paragraph.replaceWith(heading);
  }
}

function normalizeParagraphPagination(
  root: Element,
  paragraphPagination?: Array<{
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
  }>,
): void {
  if (!paragraphPagination?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  for (const item of paragraphPagination) {
    const paragraph = paragraphs[item.paragraphIndex];
    if (!paragraph) continue;
    if (item.pageBreakBefore) {
      paragraph.setAttribute('data-page-break-before', 'true');
      appendStyle(paragraph, 'break-before', 'page');
      appendStyle(paragraph, 'page-break-before', 'always');
    }
    if (item.keepNext) {
      paragraph.setAttribute('data-keep-next', 'true');
      appendStyle(paragraph, 'break-after', 'avoid');
      appendStyle(paragraph, 'page-break-after', 'avoid');
    }
    if (item.keepLines) {
      paragraph.setAttribute('data-keep-lines', 'true');
      appendStyle(paragraph, 'break-inside', 'avoid');
      appendStyle(paragraph, 'page-break-inside', 'avoid');
    }
    if (item.widowControl) {
      paragraph.setAttribute('data-widow-control', 'true');
      appendStyle(paragraph, 'orphans', '2');
      appendStyle(paragraph, 'widows', '2');
    }
    if (item.contextualSpacing) {
      paragraph.setAttribute('data-contextual-spacing', 'true');
    }
    if (item.suppressLineNumbers) {
      paragraph.setAttribute('data-suppress-line-numbers', 'true');
    }
    if (item.bidirectional) {
      paragraph.setAttribute('data-paragraph-bidi', 'true');
      paragraph.setAttribute('dir', 'rtl');
      appendStyle(paragraph, 'direction', 'rtl');
      appendStyle(paragraph, 'unicode-bidi', 'isolate');
    }
    if (item.wordWrap) {
      paragraph.setAttribute('data-word-wrap', 'true');
      appendStyle(paragraph, 'overflow-wrap', 'normal');
    }
    if (item.overflowPunctuation) {
      paragraph.setAttribute('data-overflow-punctuation', 'true');
    }
    if (item.autoSpaceEastAsianText) {
      paragraph.setAttribute('data-auto-space-east-asian-text', 'true');
    }
  }
}

function normalizeParagraphTabStops(
  root: Element,
  paragraphTabStops?: Array<{
    paragraphIndex: number;
    tabStops: unknown[];
  }>,
): void {
  if (!paragraphTabStops?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  for (const item of paragraphTabStops) {
    const paragraph = paragraphs[item.paragraphIndex];
    if (!paragraph || item.tabStops.length === 0) continue;
    paragraph.setAttribute('data-paragraph-tabs', encodeURIComponent(JSON.stringify(item.tabStops)));
  }
}

function normalizeParagraphSpacings(
  root: Element,
  paragraphSpacings?: Array<{
    paragraphIndex: number;
    beforeTwips?: number;
    afterTwips?: number;
    line?: number;
    lineRule?: 'auto' | 'exact' | 'atLeast';
  }>,
): void {
  if (!paragraphSpacings?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  for (const item of paragraphSpacings) {
    const paragraph = paragraphs[item.paragraphIndex];
    if (!paragraph) continue;

    if (item.line && item.line > 0) {
      if (item.lineRule === 'exact' || item.lineRule === 'atLeast') {
        const linePx = twipsToPx(item.line);
        paragraph.setAttribute('data-line-height-rule', item.lineRule);
        paragraph.setAttribute('data-line-height-twips', String(item.line));
        appendStyle(paragraph, 'line-height', `${linePx}px`);
        if (item.lineRule === 'atLeast') appendStyle(paragraph, 'min-height', `${linePx}px`);
      } else {
        const lineHeight = Math.round((item.line / 240) * 100) / 100;
        paragraph.setAttribute('data-line-height', String(lineHeight));
        if (item.lineRule === 'auto') paragraph.setAttribute('data-line-height-rule', 'auto');
        appendStyle(paragraph, 'line-height', String(lineHeight));
      }
    }
    if (item.beforeTwips != null) {
      const beforePt = twipsToPt(item.beforeTwips);
      paragraph.setAttribute('data-space-before', String(beforePt));
      appendStyle(paragraph, 'margin-top', `${ptToPx(beforePt)}px`);
    }
    if (item.afterTwips != null) {
      const afterPt = twipsToPt(item.afterTwips);
      paragraph.setAttribute('data-space-after', String(afterPt));
      appendStyle(paragraph, 'margin-bottom', `${ptToPx(afterPt)}px`);
    }
  }
}

function normalizeParagraphDecorations(
  root: Element,
  paragraphDecorations?: Array<{
    paragraphIndex: number;
    backgroundColor?: string;
    borders?: {
      top?: { color?: string; size?: number; space?: number };
      right?: { color?: string; size?: number; space?: number };
      bottom?: { color?: string; size?: number; space?: number };
      left?: { color?: string; size?: number; space?: number };
    };
  }>,
): void {
  if (!paragraphDecorations?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  for (const item of paragraphDecorations) {
    const paragraph = paragraphs[item.paragraphIndex];
    if (!paragraph) continue;

    if (item.backgroundColor) {
      paragraph.setAttribute('data-paragraph-background', item.backgroundColor);
      appendStyle(paragraph, 'background-color', item.backgroundColor);
    }
    if (item.borders) {
      applyParagraphBorders(paragraph, item.borders);
    }
  }
}

function applyParagraphBorders(
  paragraph: HTMLElement,
  borders: {
    top?: { color?: string; size?: number; space?: number };
    right?: { color?: string; size?: number; space?: number };
    bottom?: { color?: string; size?: number; space?: number };
    left?: { color?: string; size?: number; space?: number };
  },
): void {
  const sides = ['top', 'right', 'bottom', 'left'] as const;
  const values = sides.map((side) => borders[side]).filter(Boolean);
  const uniform = values.length === 4
    && values.every((border) => (
      border?.color === values[0]?.color
      && border?.size === values[0]?.size
      && border?.space === values[0]?.space
    ));

  if (uniform && values[0]) {
    const color = values[0].color ?? '#d0d0d0';
    const size = values[0].size ?? 4;
    const space = values[0].space ?? 0;
    paragraph.setAttribute('data-paragraph-border-color', color);
    paragraph.setAttribute('data-paragraph-border-size', String(size));
    if (space > 0) paragraph.setAttribute('data-paragraph-border-space', String(space));
    appendStyle(paragraph, 'border', `${docxBorderSizeToPx(size)}px solid ${color}`);
    if (space > 0) appendStyle(paragraph, 'padding', `${space}px`);
    return;
  }

  for (const side of sides) {
    const border = borders[side];
    if (!border?.color && !border?.size) continue;
    const color = border.color ?? '#d0d0d0';
    const size = border.size ?? 4;
    paragraph.setAttribute(`data-paragraph-border-${side}-color`, color);
    paragraph.setAttribute(`data-paragraph-border-${side}-size`, String(size));
    if (border.space && border.space > 0) {
      paragraph.setAttribute(`data-paragraph-border-${side}-space`, String(border.space));
      appendStyle(paragraph, `padding-${side}`, `${border.space}px`);
    }
    appendStyle(paragraph, `border-${side}`, `${docxBorderSizeToPx(size)}px solid ${color}`);
  }
}

function twipsToPt(twips: number): number {
  return Math.max(0, Math.round(twips / 20));
}

function twipsToPx(twips: number): number {
  return Math.max(0, Math.round(twips / 15));
}

function halfPointsToPx(halfPoints: number): number {
  return Math.round((halfPoints / 2) * 1.333);
}

function ptToPx(pt: number): number {
  return Math.round(pt * 1.333);
}

function docxBorderSizeToPx(size: number): number {
  return Math.max(1, Math.round(size / 6));
}

function normalizeParagraphBookmarks(
  root: Element,
  paragraphBookmarks?: Array<{
    paragraphIndex: number;
    id: string;
  }>,
): void {
  if (!paragraphBookmarks?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  for (const bookmark of paragraphBookmarks) {
    const paragraph = paragraphs[bookmark.paragraphIndex];
    const id = safeBookmarkId(bookmark.id);
    if (!paragraph || !id) continue;
    paragraph.setAttribute('id', id);
    paragraph.setAttribute('data-bookmark-id', id);
  }
}

function normalizeLinkRanges(
  root: Element,
  linkRanges?: Array<{
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
    href: string;
  }>,
): void {
  if (!linkRanges?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>('p'));
  const ordered = [...linkRanges].sort((a, b) =>
    b.paragraphIndex - a.paragraphIndex || b.startOffset - a.startOffset,
  );

  for (const range of ordered) {
    const paragraph = paragraphs[range.paragraphIndex];
    const href = safeInternalHref(range.href);
    if (!paragraph || !href || range.endOffset <= range.startOffset) continue;
    wrapTextRangeWithLink(paragraph, range.startOffset, range.endOffset, href);
  }
}

function wrapTextRangeWithLink(paragraph: HTMLElement, startOffset: number, endOffset: number, href: string): void {
  const doc = paragraph.ownerDocument;
  const walker = doc.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  const segments: Array<{ node: Text; from: number; to: number }> = [];
  let offset = 0;
  let current: Node | null;

  while ((current = walker.nextNode())) {
    const node = current as Text;
    const length = node.data.length;
    const from = Math.max(0, startOffset - offset);
    const to = Math.min(length, endOffset - offset);
    if (from < to) segments.push({ node, from, to });
    offset += length;
    if (offset >= endOffset) break;
  }

  for (const segment of segments.reverse()) {
    const selected = splitTextSegment(segment.node, segment.from, segment.to);
    if (!selected.parentNode) continue;
    const link = doc.createElement('a');
    link.setAttribute('href', href);
    selected.parentNode.insertBefore(link, selected);
    link.appendChild(selected);
  }
}

function safeInternalHref(href: string): string {
  if (!href.startsWith('#')) return '';
  const id = safeBookmarkId(href.slice(1));
  return id ? `#${id}` : '';
}

function safeBookmarkId(value: string): string {
  const id = value.trim().replace(/^#/, '').replace(/[^A-Za-z0-9_:-]/g, '_');
  if (!id || /^\d/.test(id)) return id ? `_${id}` : '';
  return id;
}

function normalizeListStarts(
  root: Element,
  listStarts?: Array<{
    listIndex: number;
    start: number;
    format?: string;
    leftTwips?: number;
    hangingTwips?: number;
  }>,
): void {
  if (!listStarts?.length) return;

  const orderedLists = Array.from(root.querySelectorAll<HTMLOListElement>('ol'));
  for (const item of listStarts) {
    const list = orderedLists[item.listIndex];
    if (!list) continue;

    const start = Math.max(1, Math.round(item.start));
    if (start > 1) list.setAttribute('start', String(start));

    const type = htmlOrderedListType(item.format);
    if (type) list.setAttribute('type', type);
    applyListIndent(list, item.leftTwips, item.hangingTwips);
  }
}

function htmlOrderedListType(format: string | undefined): string | undefined {
  switch (format) {
    case 'lowerLetter':
      return 'a';
    case 'upperLetter':
      return 'A';
    case 'lowerRoman':
      return 'i';
    case 'upperRoman':
      return 'I';
    default:
      return undefined;
  }
}

function normalizeBulletListStyles(
  root: Element,
  bulletListStyles?: Array<{
    listIndex: number;
    format?: string;
    text?: string;
    leftTwips?: number;
    hangingTwips?: number;
  }>,
): void {
  if (!bulletListStyles?.length) return;

  const bulletLists = Array.from(root.querySelectorAll<HTMLUListElement>('ul'));
  for (const item of bulletListStyles) {
    const list = bulletLists[item.listIndex];
    if (!list) continue;

    const styleType = htmlBulletListStyleType(item.text);
    if (!styleType) continue;
    appendStyle(list, 'list-style-type', styleType);
    list.setAttribute('data-list-style-type', styleType);
    applyListIndent(list, item.leftTwips, item.hangingTwips);
  }
}

function applyListIndent(list: HTMLElement, leftTwips: number | undefined, hangingTwips: number | undefined): void {
  if (leftTwips && leftTwips > 0) {
    list.setAttribute('data-list-indent-left', String(leftTwips));
    appendStyle(list, 'padding-left', `${Math.round(leftTwips / 15)}px`);
  }
  if (hangingTwips && hangingTwips > 0) {
    list.setAttribute('data-list-indent-hanging', String(hangingTwips));
  }
}

function htmlBulletListStyleType(text: string | undefined): string | undefined {
  switch (text) {
    case 'o':
    case '○':
    case '◦':
      return 'circle';
    case '▪':
    case '■':
    case '□':
    case '▫':
      return 'square';
    case '•':
    case '●':
    default:
      return 'disc';
  }
}

function normalizeRunStyles(
  root: Element,
  runStyles?: Array<{
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    underlineStyle?: string;
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
    emboss?: boolean;
    imprint?: boolean;
    textEffect?: string;
    language?: string;
    eastAsiaLanguage?: string;
    bidiLanguage?: string;
    kerningHalfPoints?: number;
    rightToLeft?: boolean;
    noProof?: boolean;
    snapToGrid?: boolean;
    emphasisMark?: string;
    mathRun?: boolean;
    runBorder?: {
      style: string;
      color?: string;
      size?: number;
      space?: number;
    };
  }>,
): void {
  if (!runStyles?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  const ordered = [...runStyles].sort((a, b) =>
    b.paragraphIndex - a.paragraphIndex || b.startOffset - a.startOffset,
  );

  for (const style of ordered) {
    const paragraph = paragraphs[style.paragraphIndex];
    if (!paragraph || style.endOffset <= style.startOffset) continue;
    wrapTextRangeWithStyle(paragraph, style.startOffset, style.endOffset, style);
  }
}

function wrapTextRangeWithStyle(
  paragraph: HTMLElement,
  startOffset: number,
  endOffset: number,
  style: {
    bold?: boolean;
    complexScriptBold?: boolean;
    italic?: boolean;
    complexScriptItalic?: boolean;
    underline?: boolean;
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
    textEffect?: string;
    language?: string;
    eastAsiaLanguage?: string;
    bidiLanguage?: string;
    kerningHalfPoints?: number;
    rightToLeft?: boolean;
    noProof?: boolean;
    snapToGrid?: boolean;
    emphasisMark?: string;
    mathRun?: boolean;
    runBorder?: {
      style: string;
      color?: string;
      size?: number;
      space?: number;
    };
  },
): void {
  const css: string[] = [];
  if (style.color) css.push(`color: ${style.color}`);
  if (style.highlightColor) css.push(`background-color: ${style.highlightColor}`);
  if (!style.highlightColor && style.complexScriptHighlightColor) css.push(`background-color: ${style.complexScriptHighlightColor}`);
  if (style.fontFamily) css.push(`font-family: ${mapFontFamily(style.fontFamily)}`);
  if (!style.fontFamily && style.complexScriptFontFamily) css.push(`font-family: ${mapFontFamily(style.complexScriptFontFamily)}`);
  if (style.fontSizePx) css.push(`font-size: ${style.fontSizePx}px`);
  if (!style.fontSizePx && style.complexScriptFontSizePx) css.push(`font-size: ${style.complexScriptFontSizePx}px`);
  if (style.complexScriptBold) css.push('font-weight: 700');
  if (style.complexScriptItalic) css.push('font-style: italic');
  const decorationLines: string[] = [];
  if (style.underlineStyle || style.underlineColor) {
    decorationLines.push('underline');
    if (style.underlineStyle) css.push(`text-decoration-style: ${cssUnderlineStyle(style.underlineStyle)}`);
    if (style.underlineColor) css.push(`text-decoration-color: ${style.underlineColor}`);
  }
  if (style.doubleStrike) {
    decorationLines.push('line-through');
    css.push('text-decoration-style: double');
  }
  if (decorationLines.length > 0) css.push(`text-decoration-line: ${decorationLines.join(' ')}`);
  if (style.smallCaps) css.push('font-variant-caps: small-caps');
  if (style.allCaps) css.push('text-transform: uppercase');
  if (style.characterSpacingTwips) css.push(`letter-spacing: ${twipsToPx(style.characterSpacingTwips)}px`);
  if (style.textScale) css.push(`font-stretch: ${style.textScale}%`);
  if (style.textPositionHalfPoints) css.push(`vertical-align: ${halfPointsToPx(style.textPositionHalfPoints)}px`);
  if (style.hiddenText || style.specHiddenText) css.push('opacity: 0.55');
  if (style.emboss) css.push('text-shadow: -1px -1px 0 rgba(255,255,255,0.75), 1px 1px 0 rgba(15,23,42,0.25)');
  if (style.imprint) css.push('text-shadow: 1px 1px 0 rgba(255,255,255,0.75), -1px -1px 0 rgba(15,23,42,0.25)');
  if (style.kerningHalfPoints) css.push('font-kerning: normal');
  if (style.rightToLeft) css.push('direction: rtl; unicode-bidi: isolate');
  if (style.noProof) css.push('text-decoration-skip-ink: auto');
  if (style.emphasisMark === 'dot') css.push('text-emphasis: filled dot; text-emphasis-position: over right');
  if (style.mathRun) css.push('font-family: Cambria Math, STIX Two Math, serif');
  if (style.runBorder) {
    const color = style.runBorder.color ?? '#000000';
    const size = style.runBorder.size ?? 4;
    css.push(`border: ${docxBorderSizeToPx(size)}px ${cssBorderStyle(style.runBorder.style)} ${color}`);
    if (style.runBorder.space) css.push(`padding: ${style.runBorder.space}px`);
  }
  const tags = semanticRunStyleTags(style);
  const attrs = runStyleDataAttrs(style);
  if (css.length === 0 && tags.length === 0 && attrs.length === 0) return;

  const doc = paragraph.ownerDocument;
  const walker = doc.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  const segments: Array<{ node: Text; from: number; to: number }> = [];
  let offset = 0;
  let current: Node | null;

  while ((current = walker.nextNode())) {
    const node = current as Text;
    const length = node.data.length;
    const from = Math.max(0, startOffset - offset);
    const to = Math.min(length, endOffset - offset);
    if (from < to) segments.push({ node, from, to });
    offset += length;
    if (offset >= endOffset) break;
  }

  for (const segment of segments.reverse()) {
    const selected = splitTextSegment(segment.node, segment.from, segment.to);
    if (!selected.parentNode) continue;
    wrapSelectedTextRun(selected, css, tags, attrs);
  }
}

function runStyleDataAttrs(style: {
  doubleStrike?: boolean;
  complexScriptBold?: boolean;
  complexScriptItalic?: boolean;
  underlineStyle?: string;
  underlineColor?: string;
  smallCaps?: boolean;
  allCaps?: boolean;
  characterSpacingTwips?: number;
  textScale?: number;
  textPositionHalfPoints?: number;
  hiddenText?: boolean;
  specHiddenText?: boolean;
  emboss?: boolean;
  imprint?: boolean;
  textEffect?: string;
  complexScriptHighlightColor?: string;
  complexScriptFontFamily?: string;
  complexScriptFontSizePx?: number;
  language?: string;
  eastAsiaLanguage?: string;
  bidiLanguage?: string;
  kerningHalfPoints?: number;
  rightToLeft?: boolean;
  noProof?: boolean;
  snapToGrid?: boolean;
  emphasisMark?: string;
  mathRun?: boolean;
  runBorder?: {
    style: string;
    color?: string;
    size?: number;
    space?: number;
  };
}): Array<[string, string]> {
  return [
    ...(style.doubleStrike ? [['data-docx-double-strike', 'true'] as [string, string]] : []),
    ...(style.complexScriptBold ? [['data-docx-cs-bold', 'true'] as [string, string]] : []),
    ...(style.complexScriptItalic ? [['data-docx-cs-italic', 'true'] as [string, string]] : []),
    ...(style.underlineStyle ? [['data-docx-underline-style', style.underlineStyle] as [string, string]] : []),
    ...(style.underlineColor ? [['data-docx-underline-color', style.underlineColor] as [string, string]] : []),
    ...(style.smallCaps ? [['data-docx-small-caps', 'true'] as [string, string]] : []),
    ...(style.allCaps ? [['data-docx-all-caps', 'true'] as [string, string]] : []),
    ...(style.characterSpacingTwips ? [['data-docx-character-spacing', String(style.characterSpacingTwips)] as [string, string]] : []),
    ...(style.textScale ? [['data-docx-text-scale', String(style.textScale)] as [string, string]] : []),
    ...(style.textPositionHalfPoints ? [['data-docx-text-position', String(style.textPositionHalfPoints)] as [string, string]] : []),
    ...(style.hiddenText ? [['data-docx-hidden-text', 'true'] as [string, string]] : []),
    ...(style.specHiddenText ? [['data-docx-spec-hidden-text', 'true'] as [string, string]] : []),
    ...(style.emboss ? [['data-docx-emboss', 'true'] as [string, string]] : []),
    ...(style.imprint ? [['data-docx-imprint', 'true'] as [string, string]] : []),
    ...(style.textEffect ? [['data-docx-text-effect', style.textEffect] as [string, string]] : []),
    ...(style.complexScriptHighlightColor ? [['data-docx-cs-highlight', style.complexScriptHighlightColor] as [string, string]] : []),
    ...(style.complexScriptFontFamily ? [['data-docx-cs-font-family', style.complexScriptFontFamily] as [string, string]] : []),
    ...(style.complexScriptFontSizePx ? [['data-docx-cs-font-size', String(style.complexScriptFontSizePx)] as [string, string]] : []),
    ...(style.language ? [['lang', style.language] as [string, string], ['data-docx-lang', style.language] as [string, string]] : []),
    ...(style.eastAsiaLanguage ? [['data-docx-east-asia-lang', style.eastAsiaLanguage] as [string, string]] : []),
    ...(style.bidiLanguage ? [['data-docx-bidi-lang', style.bidiLanguage] as [string, string]] : []),
    ...(style.kerningHalfPoints ? [['data-docx-kerning', String(style.kerningHalfPoints)] as [string, string]] : []),
    ...(style.rightToLeft ? [['dir', 'rtl'] as [string, string], ['data-docx-rtl', 'true'] as [string, string]] : []),
    ...(style.noProof ? [['data-docx-no-proof', 'true'] as [string, string]] : []),
    ...(style.snapToGrid ? [['data-docx-snap-to-grid', 'true'] as [string, string]] : []),
    ...(style.emphasisMark ? [['data-docx-emphasis-mark', style.emphasisMark] as [string, string]] : []),
    ...(style.mathRun ? [['data-docx-run-math', 'true'] as [string, string]] : []),
    ...(style.runBorder ? [['data-docx-run-border-style', style.runBorder.style] as [string, string]] : []),
    ...(style.runBorder?.color ? [['data-docx-run-border-color', style.runBorder.color] as [string, string]] : []),
    ...(style.runBorder?.size ? [['data-docx-run-border-size', String(style.runBorder.size)] as [string, string]] : []),
    ...(style.runBorder?.space ? [['data-docx-run-border-space', String(style.runBorder.space)] as [string, string]] : []),
  ];
}

function cssBorderStyle(style: string): string {
  if (style === 'dashed' || style === 'dashSmallGap') return 'dashed';
  if (style === 'dotted') return 'dotted';
  if (style === 'double') return 'double';
  return 'solid';
}

function cssUnderlineStyle(style: string): string {
  if (style.includes('wave')) return 'wavy';
  if (style.includes('dot')) return 'dotted';
  if (style.includes('dash')) return 'dashed';
  if (style === 'double' || style === 'wavyDouble') return 'double';
  return 'solid';
}

function semanticRunStyleTags(style: {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  doubleStrike?: boolean;
  verticalAlign?: 'superscript' | 'subscript';
}): string[] {
  return [
    ...(style.bold ? ['strong'] : []),
    ...(style.italic ? ['em'] : []),
    ...(style.underline ? ['u'] : []),
    ...(style.strike ? ['s'] : []),
    ...(style.verticalAlign === 'superscript' ? ['sup'] : []),
    ...(style.verticalAlign === 'subscript' ? ['sub'] : []),
  ];
}

function wrapSelectedTextRun(
  selected: Text,
  css: string[],
  tags: string[],
  attrs: Array<[string, string]> = [],
): void {
  const parent = selected.parentNode;
  if (!parent) return;

  const wrappers: HTMLElement[] = [];
  if (css.length > 0 || attrs.length > 0) {
    const span = selected.ownerDocument.createElement('span');
    if (css.length > 0) span.setAttribute('style', css.join('; '));
    for (const [name, value] of attrs) span.setAttribute(name, value);
    wrappers.push(span);
  }
  for (const tag of tags) {
    wrappers.push(selected.ownerDocument.createElement(tag));
  }

  if (wrappers.length === 0) return;
  const outer = wrappers[0];
  let inner = outer;
  for (const wrapper of wrappers.slice(1)) {
    inner.appendChild(wrapper);
    inner = wrapper;
  }
  parent.insertBefore(outer, selected);
  inner.appendChild(selected);
}

function normalizeComments(
  root: Element,
  comments?: Map<string, {
    id: string;
    text: string;
    author: string;
    createdAt?: string;
  }>,
  commentRanges?: Array<{
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
    commentId: string;
  }>,
): void {
  if (!comments?.size || !commentRanges?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>('p'));
  const ordered = [...commentRanges].sort((a, b) =>
    b.paragraphIndex - a.paragraphIndex || b.startOffset - a.startOffset,
  );

  for (const range of ordered) {
    const comment = comments.get(range.commentId);
    const paragraph = paragraphs[range.paragraphIndex];
    if (!comment || !paragraph || range.endOffset <= range.startOffset) continue;
    wrapTextRangeWithComment(paragraph, range.startOffset, range.endOffset, comment);
  }
}

function wrapTextRangeWithComment(
  paragraph: HTMLElement,
  startOffset: number,
  endOffset: number,
  comment: {
    id: string;
    text: string;
    author: string;
    createdAt?: string;
  },
): void {
  const doc = paragraph.ownerDocument;
  const walker = doc.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  const segments: Array<{ node: Text; from: number; to: number }> = [];
  let offset = 0;
  let current: Node | null;

  while ((current = walker.nextNode())) {
    const node = current as Text;
    const length = node.data.length;
    const from = Math.max(0, startOffset - offset);
    const to = Math.min(length, endOffset - offset);
    if (from < to) segments.push({ node, from, to });
    offset += length;
    if (offset >= endOffset) break;
  }

  for (const segment of segments.reverse()) {
    const selected = splitTextSegment(segment.node, segment.from, segment.to);
    if (!selected.parentNode) continue;
    const mark = doc.createElement('span');
    mark.className = 'doc-comment-mark';
    mark.setAttribute('data-comment-id', `cm_import_${safeAttrId(comment.id)}`);
    mark.setAttribute('data-comment-text', comment.text);
    mark.setAttribute('data-comment-author', comment.author || 'Reviewer');
    if (comment.createdAt) mark.setAttribute('data-comment-created-at', comment.createdAt);
    mark.setAttribute('title', comment.text);
    selected.parentNode.insertBefore(mark, selected);
    mark.appendChild(selected);
  }
}

function normalizeTrackedChanges(
  root: Element,
  trackedChanges?: Array<{
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
    type: 'insert' | 'delete';
    text: string;
    id?: string;
    author?: string;
    date?: string;
  }>,
): void {
  if (!trackedChanges?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  const ordered = [...trackedChanges].sort((a, b) =>
    b.paragraphIndex - a.paragraphIndex || b.startOffset - a.startOffset || (a.type === 'delete' ? -1 : 1),
  );

  for (const change of ordered) {
    const paragraph = paragraphs[change.paragraphIndex];
    if (!paragraph) continue;
    if (change.type === 'insert' && change.endOffset > change.startOffset) {
      wrapTextRangeWithTrackedChange(paragraph, change.startOffset, change.endOffset, change);
    } else if (change.type === 'delete' && change.text) {
      insertDeletedTrackedChange(paragraph, change.startOffset, change);
    }
  }
}

function wrapTextRangeWithTrackedChange(
  paragraph: HTMLElement,
  startOffset: number,
  endOffset: number,
  change: {
    type: 'insert' | 'delete';
    text: string;
    id?: string;
    author?: string;
    date?: string;
  },
): void {
  const doc = paragraph.ownerDocument;
  const walker = doc.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  const segments: Array<{ node: Text; from: number; to: number }> = [];
  let offset = 0;
  let current: Node | null;

  while ((current = walker.nextNode())) {
    const node = current as Text;
    const length = node.data.length;
    const from = Math.max(0, startOffset - offset);
    const to = Math.min(length, endOffset - offset);
    if (from < to) segments.push({ node, from, to });
    offset += length;
    if (offset >= endOffset) break;
  }

  for (const segment of segments.reverse()) {
    const selected = splitTextSegment(segment.node, segment.from, segment.to);
    if (!selected.parentNode) continue;
    const mark = trackedChangeElement(doc, change);
    selected.parentNode.insertBefore(mark, selected);
    mark.appendChild(selected);
  }
}

function insertDeletedTrackedChange(
  paragraph: HTMLElement,
  offset: number,
  change: {
    type: 'delete';
    text: string;
    id?: string;
    author?: string;
    date?: string;
  },
): void {
  const doc = paragraph.ownerDocument;
  const mark = trackedChangeElement(doc, change);
  mark.textContent = change.text;
  const target = splitTextAtOffset(paragraph, offset);
  if (target?.parentNode) target.parentNode.insertBefore(mark, target);
  else paragraph.appendChild(mark);
}

function trackedChangeElement(
  doc: Document,
  change: {
    type: 'insert' | 'delete';
    id?: string;
    author?: string;
    date?: string;
  },
): HTMLElement {
  const mark = doc.createElement('span');
  mark.className = change.type === 'insert' ? 'doc-revision-insert' : 'doc-revision-delete';
  mark.setAttribute('data-revision-type', change.type);
  if (change.id) mark.setAttribute('data-revision-id', safeAttrId(change.id));
  if (change.author) mark.setAttribute('data-revision-author', change.author);
  if (change.date) mark.setAttribute('data-revision-date', change.date);
  mark.setAttribute('title', change.type === 'insert' ? 'Inserted text' : 'Deleted text');
  return mark;
}

function splitTextAtOffset(root: HTMLElement, targetOffset: number): Text | null {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let current: Node | null;

  while ((current = walker.nextNode())) {
    const node = current as Text;
    const nextOffset = offset + node.data.length;
    if (targetOffset <= nextOffset) {
      const localOffset = Math.max(0, targetOffset - offset);
      if (localOffset <= 0) return node;
      if (localOffset >= node.data.length) return node.nextSibling instanceof Text ? node.nextSibling : null;
      return node.splitText(localOffset);
    }
    offset = nextOffset;
  }
  return null;
}

function splitTextSegment(node: Text, from: number, to: number): Text {
  let selected = node;
  if (to < selected.data.length) selected.splitText(to);
  if (from > 0) selected = selected.splitText(from);
  return selected;
}

function normalizePageBreaks(
  root: Element,
  pageBreaks?: Array<{ paragraphIndex: number; textOffset: number }>,
  pageBreakParagraphs?: number[],
): void {
  const breaks = pageBreaks?.length
    ? pageBreaks
    : (pageBreakParagraphs ?? []).map((paragraphIndex) => ({
        paragraphIndex,
        textOffset: Number.MAX_SAFE_INTEGER,
      }));
  if (breaks.length === 0) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>('p'));
  const ordered = [...breaks].sort((a, b) =>
    b.paragraphIndex - a.paragraphIndex || b.textOffset - a.textOffset,
  );

  for (const item of ordered) {
    const paragraph = paragraphs[item.paragraphIndex];
    if (!paragraph) continue;
    insertPageBreakAtTextOffset(paragraph, item.textOffset);
  }
}

function insertPageBreakAtTextOffset(paragraph: HTMLElement, textOffset: number): void {
  const marker = paragraph.ownerDocument.createElement('div');
  marker.setAttribute('data-page-break', 'true');
  marker.className = 'doc-page-break';
  insertBlockBreakAtTextOffset(paragraph, textOffset, marker);
}

function normalizeColumnBreaks(
  root: Element,
  columnBreaks?: Array<{ paragraphIndex: number; textOffset: number }>,
): void {
  if (!columnBreaks?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>('p'));
  const ordered = [...columnBreaks].sort((a, b) =>
    b.paragraphIndex - a.paragraphIndex || b.textOffset - a.textOffset,
  );

  for (const item of ordered) {
    const paragraph = paragraphs[item.paragraphIndex];
    if (!paragraph) continue;
    insertColumnBreakAtTextOffset(paragraph, item.textOffset);
  }
}

function insertColumnBreakAtTextOffset(paragraph: HTMLElement, textOffset: number): void {
  const marker = paragraph.ownerDocument.createElement('div');
  marker.setAttribute('data-column-break', 'true');
  marker.className = 'doc-column-break';
  insertBlockBreakAtTextOffset(paragraph, textOffset, marker);
}

function normalizeSectionBreaks(
  root: Element,
  sectionBreaks?: Array<{
    paragraphIndex: number;
    type: string;
    pageMargin?: unknown;
    pageSize?: unknown;
    sectionColumns?: unknown;
  }>,
): void {
  if (!sectionBreaks?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>('p'));
  const ordered = [...sectionBreaks].sort((a, b) => b.paragraphIndex - a.paragraphIndex);
  for (const item of ordered) {
    const paragraph = paragraphs[item.paragraphIndex];
    if (!paragraph) continue;
    const marker = paragraph.ownerDocument.createElement('div');
    marker.setAttribute('data-section-break', 'true');
    marker.setAttribute('data-section-break-type', normalizeSectionBreakType(item.type));
    setEncodedJsonAttribute(marker, 'data-section-page-margin', item.pageMargin);
    setEncodedJsonAttribute(marker, 'data-section-page-size', item.pageSize);
    setEncodedJsonAttribute(marker, 'data-section-columns', item.sectionColumns);
    marker.className = 'doc-section-break';
    insertAfter(paragraph, marker);
  }
}

function normalizeSectionBreakType(type: string | undefined): string {
  if (type === 'continuous' || type === 'evenPage' || type === 'oddPage' || type === 'nextColumn') return type;
  return 'nextPage';
}

function setEncodedJsonAttribute(element: HTMLElement, name: string, value: unknown): void {
  if (value == null) return;
  element.setAttribute(name, encodeURIComponent(JSON.stringify(value)));
}

function insertBlockBreakAtTextOffset(
  paragraph: HTMLElement,
  textOffset: number,
  marker: HTMLElement,
): void {
  const textLength = (paragraph.textContent ?? '').length;
  if (textOffset <= 0) {
    paragraph.parentNode?.insertBefore(marker, paragraph);
    return;
  }
  if (textOffset >= textLength) {
    insertAfter(paragraph, marker);
    return;
  }

  const after = paragraph.cloneNode(false) as HTMLElement;
  let remaining = textOffset;
  for (const child of Array.from(paragraph.childNodes)) {
    if (remaining <= 0) {
      after.appendChild(child);
      continue;
    }

    const childLength = (child.textContent ?? '').length;
    if (remaining >= childLength) {
      remaining -= childLength;
      continue;
    }

    moveTailAfterOffset(child, remaining, after);
    remaining = 0;
  }

  insertAfter(paragraph, marker, after);
}

function moveTailAfterOffset(node: ChildNode, textOffset: number, target: Node): void {
  const textLength = (node.textContent ?? '').length;
  if (textOffset <= 0) {
    target.appendChild(node);
    return;
  }
  if (textOffset >= textLength) return;

  if (node.nodeType === Node.TEXT_NODE) {
    const tail = (node as Text).splitText(textOffset);
    target.appendChild(tail);
    return;
  }

  if (!(node instanceof HTMLElement)) return;

  const clone = node.cloneNode(false) as HTMLElement;
  let remaining = textOffset;
  for (const child of Array.from(node.childNodes)) {
    if (remaining <= 0) {
      clone.appendChild(child);
      continue;
    }

    const childLength = (child.textContent ?? '').length;
    if (remaining >= childLength) {
      remaining -= childLength;
      continue;
    }

    moveTailAfterOffset(child, remaining, clone);
    remaining = 0;
  }

  if (clone.childNodes.length > 0) target.appendChild(clone);
}

function insertAfter(anchor: ChildNode, ...nodes: ChildNode[]): void {
  const parent = anchor.parentNode;
  if (!parent) return;
  let cursor = anchor.nextSibling;
  for (const node of nodes) {
    parent.insertBefore(node, cursor);
    cursor = node.nextSibling;
  }
}

function normalizeFootnotes(root: Element, advancedFootnotes?: Map<string, string>): void {
  const htmlFootnotes = collectMammothFootnotes(root);
  const footnotes = new Map<string, string>(htmlFootnotes);
  for (const [id, text] of advancedFootnotes ?? []) {
    if (text && !footnotes.has(id)) footnotes.set(id, text);
  }

  const refs = Array.from(root.querySelectorAll<HTMLAnchorElement>('sup a[href^="#footnote-"]'));
  for (const ref of refs) {
    const sup = ref.closest('sup');
    if (!sup) continue;
    const rawId = ref.getAttribute('href')?.replace(/^#footnote-/, '') ?? '';
    if (!rawId) continue;
    const text = footnotes.get(rawId);
    if (!text) continue;

    const out = root.ownerDocument.createElement('sup');
    out.setAttribute('data-footnote', '');
    out.setAttribute('data-footnote-id', `fn_import_${safeAttrId(rawId)}`);
    out.setAttribute('data-footnote-text', text);
    out.setAttribute('title', text);
    out.className = 'doc-footnote-ref';
    sup.replaceWith(out);
  }

  for (const list of Array.from(root.querySelectorAll('ol'))) {
    const items = Array.from(list.children);
    if (items.length > 0 && items.every((item) => /^footnote-/.test(item.id))) {
      list.remove();
    }
  }
}

function normalizeEndnotes(
  root: Element,
  endnotes?: Map<string, string>,
  references?: Array<{
    paragraphIndex: number;
    textOffset: number;
    id: string;
  }>,
): void {
  const htmlEndnotes = collectMammothNotes(root, 'endnote');
  const allEndnotes = new Map<string, string>(htmlEndnotes);
  for (const [id, text] of endnotes ?? []) {
    if (text && !allEndnotes.has(id)) allEndnotes.set(id, text);
  }

  const htmlRefs = Array.from(root.querySelectorAll<HTMLAnchorElement>('sup a[href^="#endnote-"]'));
  for (const ref of htmlRefs) {
    const sup = ref.closest('sup');
    if (!sup) continue;
    const rawId = ref.getAttribute('href')?.replace(/^#endnote-/, '') ?? '';
    if (!rawId) continue;
    const text = allEndnotes.get(rawId);
    if (!text) continue;

    const out = endnoteElement(root.ownerDocument, rawId, text);
    sup.replaceWith(out);
  }

  for (const list of Array.from(root.querySelectorAll('ol'))) {
    const items = Array.from(list.children);
    if (items.length > 0 && items.every((item) => /^endnote-/.test(item.id))) {
      list.remove();
    }
  }

  if (!allEndnotes.size || !references?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  const ordered = [...references].sort((a, b) =>
    b.paragraphIndex - a.paragraphIndex || b.textOffset - a.textOffset,
  );

  for (const ref of ordered) {
    const text = allEndnotes.get(ref.id);
    const paragraph = paragraphs[ref.paragraphIndex];
    if (!text || !paragraph) continue;

    const note = endnoteElement(root.ownerDocument, ref.id, text);
    const target = splitTextAtOffset(paragraph, ref.textOffset);
    if (target?.parentNode) target.parentNode.insertBefore(note, target);
    else paragraph.appendChild(note);
  }
}

function endnoteElement(doc: Document, id: string, text: string): HTMLElement {
  const note = doc.createElement('sup');
  note.setAttribute('data-endnote', '');
  note.setAttribute('data-footnote-id', `en_import_${safeAttrId(id)}`);
  note.setAttribute('data-footnote-text', text);
  note.setAttribute('data-note-type', 'endnote');
  note.setAttribute('title', text);
  note.className = 'doc-footnote-ref doc-endnote-ref';
  return note;
}

function collectMammothFootnotes(root: Element): Map<string, string> {
  return collectMammothNotes(root, 'footnote');
}

function collectMammothNotes(root: Element, kind: 'footnote' | 'endnote'): Map<string, string> {
  const out = new Map<string, string>();
  for (const li of Array.from(root.querySelectorAll<HTMLElement>(`li[id^="${kind}-"]`))) {
    const id = li.id.replace(new RegExp(`^${kind}-`), '');
    const clone = li.cloneNode(true) as HTMLElement;
    for (const backlink of Array.from(clone.querySelectorAll(`a[href^="#${kind}-ref-"]`))) {
      backlink.remove();
    }
    const text = (clone.textContent ?? '').trim();
    if (id && text) out.set(id, text);
  }
  return out;
}

function safeAttrId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function normalizeTextBoxes(
  root: Element,
  textBoxes?: Array<{
    text: string;
  }>,
): void {
  if (!textBoxes?.length) return;
  const doc = root.ownerDocument;
  for (const box of textBoxes) {
    const text = box.text.trim();
    if (!text) continue;
    const node = doc.createElement('div');
    node.setAttribute('data-docx-textbox', 'true');
    node.className = 'docx-textbox';
    appendStyle(node, 'border', '1px solid #94a3b8');
    appendStyle(node, 'padding', '8px 10px');
    appendStyle(node, 'margin', '8px 0');
    appendStyle(node, 'background-color', '#f8fafc');
    for (const [index, line] of text.split(/\r?\n/).entries()) {
      if (index > 0) node.appendChild(doc.createElement('br'));
      node.appendChild(doc.createTextNode(line));
    }
    root.appendChild(node);
  }
}

// ─────────────────────────────────────────────
// 1. inline 서식 정규화 (font-family / font-size / color / background)
// ─────────────────────────────────────────────

function normalizeTocFields(
  root: Element,
  tocFields?: Array<{
    paragraphIndex: number;
    instruction: string;
    text?: string;
  }>,
): void {
  if (!tocFields?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  const ordered = [...tocFields].sort((a, b) => b.paragraphIndex - a.paragraphIndex);
  for (const field of ordered) {
    const paragraph = paragraphs[field.paragraphIndex];
    const node = root.ownerDocument.createElement('div');
    node.setAttribute('data-docx-toc', 'true');
    node.setAttribute('data-docx-field-instruction', field.instruction || 'TOC \\o "1-3" \\h \\z \\u');
    node.className = 'docx-toc';
    const heading = root.ownerDocument.createElement('p');
    const title = root.ownerDocument.createElement('strong');
    title.textContent = 'Table of contents';
    heading.appendChild(title);
    node.appendChild(heading);
    if (field.text) {
      const body = root.ownerDocument.createElement('p');
      body.textContent = field.text;
      node.appendChild(body);
    }
    if (paragraph?.parentNode) paragraph.replaceWith(node);
    else root.appendChild(node);
  }
}

function normalizeMathObjects(
  root: Element,
  mathObjects?: Array<{
    paragraphIndex: number;
    textOffset: number;
    omml: string;
    text?: string;
  }>,
): void {
  if (!mathObjects?.length) return;

  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  const ordered = [...mathObjects].sort((a, b) =>
    b.paragraphIndex - a.paragraphIndex || b.textOffset - a.textOffset,
  );

  for (const math of ordered) {
    const paragraph = paragraphs[math.paragraphIndex];
    if (!paragraph || !math.omml) continue;
    const node = root.ownerDocument.createElement('span');
    node.setAttribute('data-docx-math', 'true');
    node.setAttribute('data-docx-omml', encodeURIComponent(math.omml));
    node.className = 'docx-math';
    node.textContent = math.text || 'Equation';

    const target = splitTextAtOffset(paragraph, math.textOffset);
    if (target?.parentNode) target.parentNode.insertBefore(node, target);
    else paragraph.appendChild(node);
  }
}

const INLINE_TAGS = new Set(['SPAN', 'EM', 'STRONG', 'B', 'I', 'U', 'S', 'CODE', 'SUB', 'SUP', 'A']);

function walkInlineStyles(root: Element): void {
  const all = Array.from(root.querySelectorAll<HTMLElement>('*'));
  for (const el of all) {
    const styleAttr = el.getAttribute('style');
    if (!styleAttr) continue;
    const parsed = parseInlineStyle(styleAttr);

    // 1) font-family: 매핑된 stack 으로 교체
    if (parsed['font-family']) {
      const mapped = mapFontFamily(parsed['font-family']);
      applyInlineStyle(el, 'font-family', mapped);
    }
    // 2) font-size: pt/em → px 로 정규화
    if (parsed['font-size']) {
      const px = sizeToPx(parsed['font-size']);
      if (px) applyInlineStyle(el, 'font-size', `${px}px`);
    }
    // 3) color
    if (parsed['color']) {
      applyInlineStyle(el, 'color', parsed['color']);
    }
    // 4) background-color → highlight 효과
    const bg = parsed['background-color'] ?? parsed['background'];
    if (bg && bg !== 'transparent' && !/^rgba?\(0,\s*0,\s*0,\s*0\)$/i.test(bg)) {
      applyInlineStyle(el, 'background-color', bg);
    }
    // 5) text-align: 부모 paragraph 로 (mammoth 가 이미 처리하지만 inline span 에 붙은 경우만 정리)
    if (parsed['text-align'] && /^(left|center|right|justify)$/.test(parsed['text-align'])) {
      const block = closestBlock(el);
      if (block && block !== el && !block.style.textAlign) {
        block.style.textAlign = parsed['text-align'];
      }
    }
  }
}

function parseInlineStyle(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of s.split(';')) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && value) out[key] = value;
  }
  return out;
}

/** "12pt", "16px", "1.5em", "1.2rem" → 반올림 px 또는 null. */
function sizeToPx(s: string): number | null {
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(pt|px|em|rem)?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = (m[2] || 'px').toLowerCase();
  if (unit === 'pt') return Math.round(n * 1.333);  // 1pt ≈ 1.333px
  if (unit === 'em' || unit === 'rem') return Math.round(n * 16);
  return Math.round(n);
}

/**
 * el 에 inline style 부여 — TipTap mark 가 인식할 형태로.
 *  - el 자체가 inline 이면 그 element 의 style 만 갱신 (span 등)
 *  - 블록(p, h1, div 등) 이면 자식 텍스트들을 span 으로 감싸서 style 부여
 *    (TipTap TextStyle 은 inline mark 라 paragraph 에 직접 style 못 줌)
 */
function applyInlineStyle(el: HTMLElement, prop: string, value: string): void {
  if (INLINE_TAGS.has(el.tagName)) {
    setStyleProp(el, prop, value);
    return;
  }
  wrapTextChildrenWithSpan(el, prop, value);
}

function setStyleProp(el: HTMLElement, prop: string, value: string): void {
  const current = el.getAttribute('style') ?? '';
  const filtered = current
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !s.toLowerCase().startsWith(`${prop}:`))
    .join('; ');
  el.setAttribute('style', filtered ? `${filtered}; ${prop}: ${value}` : `${prop}: ${value}`);
}

function wrapTextChildrenWithSpan(parent: HTMLElement, prop: string, value: string): void {
  const doc = parent.ownerDocument;
  const children = Array.from(parent.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim()) {
      const span = doc.createElement('span');
      span.setAttribute('style', `${prop}: ${value}`);
      span.textContent = child.textContent;
      parent.replaceChild(span, child);
    }
  }
}

function closestBlock(el: Element): HTMLElement | null {
  let cur: Element | null = el;
  while (cur) {
    if (cur instanceof HTMLElement && !INLINE_TAGS.has(cur.tagName) && cur.tagName !== 'BODY') {
      return cur;
    }
    cur = cur.parentElement;
  }
  return null;
}

// ─────────────────────────────────────────────
// 2. 표 정규화 — border / padding / width
// ─────────────────────────────────────────────

function normalizeTables(
  root: Element,
  tableCellStyles?: Array<{
    tableIndex: number;
    rowIndex: number;
    cellIndex: number;
    gridColumn?: number;
    colSpan?: number;
    rowSpan?: number;
    verticalMergeContinue?: boolean;
    backgroundColor?: string;
    widthTwips?: number;
    borderColor?: string;
    borderSize?: number;
    cellBorders?: {
      top?: { color?: string; size?: number };
      right?: { color?: string; size?: number };
      bottom?: { color?: string; size?: number };
      left?: { color?: string; size?: number };
    };
    verticalAlign?: 'top' | 'center' | 'bottom';
    textDirection?: 'lrTb' | 'tbRl' | 'btLr';
    cellMargins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  }>,
  tableRowStyles?: Array<{
    tableIndex: number;
    rowIndex: number;
    heightTwips?: number;
    heightRule?: 'auto' | 'atLeast' | 'exact';
    tableHeader?: boolean;
    cantSplit?: boolean;
  }>,
  tableStyles?: Array<{
    tableIndex: number;
    widthTwips?: number;
    widthPercent?: number;
    columnWidthsTwips?: number[];
    align?: 'left' | 'center' | 'right';
    layout?: 'fixed' | 'autofit';
    cellSpacingTwips?: number;
  }>,
): void {
  for (const [tableIndex, t] of Array.from(root.querySelectorAll('table')).entries()) {
    const table = t as HTMLTableElement;
    const tableStyle = tableStyles?.find((item) => item.tableIndex === tableIndex);
    const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tr'));
    const rowCells = Array.from(table.querySelectorAll('tr')).map((row) =>
      Array.from(row.querySelectorAll<HTMLElement>('td, th')),
    );
    const renderedCellByGrid = buildRenderedCellGrid(rowCells);
    const cellsToRemove: HTMLElement[] = [];
    const cur = table.getAttribute('style') ?? '';
    if (!cur.includes('border-collapse')) {
      table.setAttribute(
        'style',
        `${cur ? cur + '; ' : ''}border-collapse: collapse; width: 100%`,
      );
    }
    if (tableStyle) applyTableMetadata(table, tableStyle);
    // mammoth 가 종종 border 없이 내보냄 — 셀별 1px 보강
    for (const cell of Array.from(table.querySelectorAll('td, th'))) {
      const cellEl = cell as HTMLElement;
      const cs = cellEl.getAttribute('style') ?? '';
      if (!/\bborder(-[a-z]+)?\s*:/.test(cs)) {
        cellEl.setAttribute(
          'style',
          `${cs ? cs + '; ' : ''}border: 1px solid #d0d0d0; padding: 4px 8px; vertical-align: top`,
        );
      }
    }
    // 헤더 행 (첫 row 가 th 로만 구성) 음영
    for (const style of (tableCellStyles ?? []).filter((item) => item.tableIndex === tableIndex)) {
      const gridCell = typeof style.gridColumn === 'number'
        ? renderedCellByGrid.get(`${style.rowIndex}:${style.gridColumn}`)
        : undefined;
      if (style.verticalMergeContinue) {
        if (gridCell && !(gridCell.textContent ?? '').trim()) cellsToRemove.push(gridCell);
        continue;
      }

      const cell = gridCell ?? rowCells[style.rowIndex]?.[style.cellIndex];
      if (!cell) continue;
      applyTableCellMetadata(cell, style);
    }
    for (const cell of cellsToRemove) {
      cell.remove();
    }
    for (const style of (tableRowStyles ?? []).filter((item) => item.tableIndex === tableIndex)) {
      const row = rows[style.rowIndex];
      if (!row) continue;
      applyTableRowMetadata(row, style);
    }
    const firstRow = table.querySelector('tr');
    if (firstRow && Array.from(firstRow.children).every((c) => c.tagName === 'TH')) {
      for (const th of Array.from(firstRow.children) as HTMLElement[]) {
        const cs = th.getAttribute('style') ?? '';
        if (!/background/.test(cs)) {
          th.setAttribute(
            'style',
            `${cs ? cs + '; ' : ''}background-color: #f3f3f3; font-weight: 600`,
          );
        }
      }
    }
  }
}

function applyTableMetadata(
  table: HTMLTableElement,
  style: NonNullable<DocxHtmlEnrichOptions['tableStyles']>[number],
): void {
  if (style.widthTwips && style.widthTwips > 0) {
    const widthPx = twipsToPx(style.widthTwips);
    table.setAttribute('data-table-width', String(widthPx));
    table.setAttribute('data-table-width-type', 'px');
    appendStyle(table, 'width', `${widthPx}px`);
  } else if (style.widthPercent && style.widthPercent > 0) {
    const widthPercent = Math.max(1, Math.min(100, Math.round(style.widthPercent)));
    table.setAttribute('data-table-width', String(widthPercent));
    table.setAttribute('data-table-width-type', 'percent');
    appendStyle(table, 'width', `${widthPercent}%`);
  }
  if (style.align) {
    table.setAttribute('data-table-align', style.align);
    applyTableAlignmentStyle(table, style.align);
  }
  if (style.columnWidthsTwips?.length) {
    const widthsPx = style.columnWidthsTwips.map((width) => twipsToPx(width));
    table.setAttribute('data-table-column-widths', widthsPx.join(','));
    applyGridColumnWidths(table, widthsPx);
  }
  if (style.layout) {
    table.setAttribute('data-table-layout', style.layout);
    appendStyle(table, 'table-layout', style.layout === 'fixed' ? 'fixed' : 'auto');
  }
  if (style.cellSpacingTwips && style.cellSpacingTwips > 0) {
    const spacingPx = twipsToPx(style.cellSpacingTwips);
    table.setAttribute('data-table-cell-spacing', String(spacingPx));
    appendStyle(table, 'border-collapse', 'separate');
    appendStyle(table, 'border-spacing', `${spacingPx}px`);
  }
}

function applyGridColumnWidths(table: HTMLTableElement, widthsPx: number[]): void {
  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tr'));
  for (const row of rows) {
    let gridColumn = 0;
    for (const cell of Array.from(row.querySelectorAll<HTMLElement>('td, th'))) {
      const colSpan = parsePositiveInt(cell.getAttribute('colspan')) ?? 1;
      const width = widthsPx.slice(gridColumn, gridColumn + colSpan)
        .reduce((sum, item) => sum + item, 0);
      if (width > 0 && !cell.hasAttribute('colwidth')) {
        cell.setAttribute('colwidth', String(width));
      }
      gridColumn += colSpan;
    }
  }
}

function applyTableAlignmentStyle(table: HTMLTableElement, align: 'left' | 'center' | 'right'): void {
  if (align === 'center') {
    appendStyle(table, 'margin-left', 'auto');
    appendStyle(table, 'margin-right', 'auto');
  } else if (align === 'right') {
    appendStyle(table, 'margin-left', 'auto');
    appendStyle(table, 'margin-right', '0');
  } else {
    appendStyle(table, 'margin-left', '0');
    appendStyle(table, 'margin-right', 'auto');
  }
}

function applyTableRowMetadata(
  row: HTMLTableRowElement,
  style: NonNullable<DocxHtmlEnrichOptions['tableRowStyles']>[number],
): void {
  if (style.heightTwips) {
    const heightPx = twipsToPx(style.heightTwips);
    if (heightPx > 0) {
      row.setAttribute('data-row-height', String(heightPx));
      row.setAttribute('height', String(heightPx));
      if (style.heightRule) row.setAttribute('data-row-height-rule', style.heightRule);
      appendStyle(row, style.heightRule === 'exact' ? 'height' : 'min-height', `${heightPx}px`);
    }
  }
  if (style.tableHeader) row.setAttribute('data-row-header', 'true');
  if (style.cantSplit) row.setAttribute('data-row-cant-split', 'true');
}

function buildRenderedCellGrid(rows: HTMLElement[][]): Map<string, HTMLElement> {
  const out = new Map<string, HTMLElement>();
  const rowSpanEndsByColumn = new Map<number, number>();

  rows.forEach((cells, rowIndex) => {
    let gridColumn = 0;
    for (const cell of cells) {
      while ((rowSpanEndsByColumn.get(gridColumn) ?? -1) >= rowIndex) {
        gridColumn += 1;
      }

      out.set(`${rowIndex}:${gridColumn}`, cell);
      const colSpan = parsePositiveInt(cell.getAttribute('colspan')) ?? 1;
      const rowSpan = parsePositiveInt(cell.getAttribute('rowspan')) ?? 1;
      if (rowSpan > 1) {
        for (let column = gridColumn; column < gridColumn + colSpan; column += 1) {
          rowSpanEndsByColumn.set(column, rowIndex + rowSpan - 1);
        }
      }
      gridColumn += colSpan;
    }
  });

  return out;
}

function parsePositiveInt(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function applyTableCellMetadata(
  cell: HTMLElement,
  style: NonNullable<DocxHtmlEnrichOptions['tableCellStyles']>[number],
): void {
  if (style.colSpan && style.colSpan > 1) {
    cell.setAttribute('colspan', String(style.colSpan));
  }
  if (style.rowSpan && style.rowSpan > 1) {
    cell.setAttribute('rowspan', String(style.rowSpan));
  }
  if (style.backgroundColor) {
    appendStyle(cell, 'background-color', style.backgroundColor);
    cell.setAttribute('data-cell-background', style.backgroundColor);
  }
  if (style.widthTwips) {
    const px = Math.max(24, Math.round(style.widthTwips / 15));
    cell.setAttribute('colwidth', String(px));
  }
  if (style.borderColor || style.borderSize) {
    const borderColor = style.borderColor ?? '#d0d0d0';
    const borderSize = style.borderSize ?? 4;
    const px = Math.max(1, Math.round(borderSize / 6));
    appendStyle(cell, 'border', `${px}px solid ${borderColor}`);
    if (style.borderColor) cell.setAttribute('data-cell-border-color', style.borderColor);
    cell.setAttribute('data-cell-border-size', String(borderSize));
  }
  if (style.cellBorders) {
    applyCellBorders(cell, style.cellBorders);
  }
  if (style.verticalAlign) {
    appendStyle(cell, 'vertical-align', style.verticalAlign === 'center' ? 'middle' : style.verticalAlign);
    cell.setAttribute('data-cell-vertical-align', style.verticalAlign);
  }
  if (style.textDirection) {
    applyCellTextDirection(cell, style.textDirection);
  }
  if (style.cellMargins) {
    applyCellMargins(cell, style.cellMargins);
  }
}

// ─────────────────────────────────────────────
// 3. 이미지 정규화 — max-width / height auto
// ─────────────────────────────────────────────

function applyCellBorders(
  cell: HTMLElement,
  borders: {
    top?: { color?: string; size?: number };
    right?: { color?: string; size?: number };
    bottom?: { color?: string; size?: number };
    left?: { color?: string; size?: number };
  },
): void {
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const border = borders[side];
    if (!border?.color && !border?.size) continue;
    const color = border.color ?? '#d0d0d0';
    const size = border.size ?? 4;
    const px = Math.max(1, Math.round(size / 6));
    appendStyle(cell, `border-${side}`, `${px}px solid ${color}`);
    if (border.color) cell.setAttribute(`data-cell-border-${side}-color`, border.color);
    cell.setAttribute(`data-cell-border-${side}-size`, String(size));
  }
}

function applyCellTextDirection(cell: HTMLElement, textDirection: 'lrTb' | 'tbRl' | 'btLr'): void {
  cell.setAttribute('data-cell-text-direction', textDirection);
  if (textDirection === 'tbRl') {
    appendStyle(cell, 'writing-mode', 'vertical-rl');
  } else if (textDirection === 'btLr') {
    appendStyle(cell, 'writing-mode', 'vertical-lr');
    appendStyle(cell, 'transform', 'rotate(180deg)');
  } else {
    appendStyle(cell, 'writing-mode', 'horizontal-tb');
  }
}

function applyCellMargins(cell: HTMLElement, margins: { top?: number; right?: number; bottom?: number; left?: number }): void {
  const top = twipsToPxOptional(margins.top);
  const right = twipsToPxOptional(margins.right);
  const bottom = twipsToPxOptional(margins.bottom);
  const left = twipsToPxOptional(margins.left);
  if (top != null) {
    appendStyle(cell, 'padding-top', `${top}px`);
    cell.setAttribute('data-cell-padding-top', String(top));
  }
  if (right != null) {
    appendStyle(cell, 'padding-right', `${right}px`);
    cell.setAttribute('data-cell-padding-right', String(right));
  }
  if (bottom != null) {
    appendStyle(cell, 'padding-bottom', `${bottom}px`);
    cell.setAttribute('data-cell-padding-bottom', String(bottom));
  }
  if (left != null) {
    appendStyle(cell, 'padding-left', `${left}px`);
    cell.setAttribute('data-cell-padding-left', String(left));
  }
}

function twipsToPxOptional(value: number | undefined): number | null {
  if (!value || value <= 0) return null;
  return Math.max(1, Math.round(value / 15));
}

function appendStyle(element: HTMLElement, property: string, value: string): void {
  const prop = property.toLowerCase();
  const parts = (element.getAttribute('style') ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part && !part.toLowerCase().startsWith(`${prop}:`));
  parts.push(`${property}: ${value}`);
  element.setAttribute('style', parts.join('; '));
}

function normalizeImages(
  root: Element,
  imageDimensions?: Array<{
    imageIndex: number;
    width: number;
    height: number;
    align?: 'left' | 'center' | 'right' | 'justify';
    floating?: boolean;
    wrap?: 'square' | 'tight' | 'topAndBottom' | 'none';
    wrapSide?: 'bothSides' | 'left' | 'right' | 'largest';
    alt?: string;
    title?: string;
  }>,
): void {
  const dimensionByIndex = new Map((imageDimensions ?? []).map((item) => [item.imageIndex, item]));
  Array.from(root.querySelectorAll('img')).forEach((img, imageIndex) => {
    const el = img as HTMLImageElement;
    const dimension = dimensionByIndex.get(imageIndex);
    if (dimension) {
      el.setAttribute('width', String(dimension.width));
      el.setAttribute('height', String(dimension.height));
      appendStyle(el, 'width', `${dimension.width}px`);
      appendStyle(el, 'height', `${dimension.height}px`);
      if (dimension.align) {
        el.setAttribute('data-align', dimension.align);
        applyImageAlignmentStyle(el, dimension.align);
      }
      if (dimension.floating) {
        el.setAttribute('data-floating', 'true');
        appendStyle(el, 'float', dimension.align === 'right' ? 'right' : 'left');
      }
      if (dimension.wrap) el.setAttribute('data-wrap', dimension.wrap);
      if (dimension.wrapSide) el.setAttribute('data-wrap-side', dimension.wrapSide);
      if (dimension.alt) el.setAttribute('alt', dimension.alt);
      if (dimension.title) el.setAttribute('title', dimension.title);
    } else {
      appendStyle(el, 'height', 'auto');
    }
    appendStyle(el, 'max-width', '100%');
    // alt 없으면 빈 문자열 (a11y — 장식 이미지 처리)
    if (!el.hasAttribute('alt')) {
      el.setAttribute('alt', '');
    }
  });
}

function applyImageAlignmentStyle(el: HTMLElement, align: 'left' | 'center' | 'right' | 'justify'): void {
  appendStyle(el, 'display', 'block');
  if (align === 'center' || align === 'justify') {
    appendStyle(el, 'margin-left', 'auto');
    appendStyle(el, 'margin-right', 'auto');
  } else if (align === 'right') {
    appendStyle(el, 'margin-left', 'auto');
    appendStyle(el, 'margin-right', '0');
  } else {
    appendStyle(el, 'margin-left', '0');
    appendStyle(el, 'margin-right', 'auto');
  }
}
