const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'LI']);
const STRIP_TAGS = ['meta', 'link', 'script', 'style', 'xml', 'o\\:p'];
const MSO_LIST_RE = /mso-list\s*:\s*([^;]+)/i;

type ListKind = 'bullet' | 'ordered';

interface MsoListInfo {
  kind: ListKind;
  level: number;
  marker: string;
  start?: number;
  orderedType?: string;
}

export function normalizeDocPasteHtml(html: string): string {
  if (!html.trim() || typeof DOMParser === 'undefined') return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const selector of STRIP_TAGS) {
    for (const node of Array.from(doc.querySelectorAll(selector))) {
      node.remove();
    }
  }

  normalizeMsoLists(doc.body);

  for (const element of Array.from(doc.body.querySelectorAll<HTMLElement>('*'))) {
    normalizeBlockAttributes(element);
    normalizeElementStyle(element);
    stripPasteOnlyAttributes(element);
  }

  return doc.body.innerHTML;
}

export function normalizeDocCopyHtml(html: string): string {
  if (!html.trim() || typeof DOMParser === 'undefined') return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const element of Array.from(doc.body.querySelectorAll<HTMLElement>('*'))) {
    applyCopyStylesFromDataAttributes(element);
    stripEditorOnlyClasses(element);
  }

  return doc.body.innerHTML;
}

function normalizeMsoLists(root: HTMLElement): void {
  const parents = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  for (const parent of parents) {
    normalizeMsoListChildren(parent);
  }
}

function normalizeMsoListChildren(parent: HTMLElement): void {
  const children = Array.from(parent.children) as HTMLElement[];
  let index = 0;

  while (index < children.length) {
    const child = children[index];
    const info = readMsoListInfo(child);
    if (!info) {
      index += 1;
      continue;
    }

    const run: Array<{ paragraph: HTMLElement; info: MsoListInfo }> = [];
    while (index < children.length) {
      const current = children[index];
      const currentInfo = readMsoListInfo(current);
      if (!currentInfo) break;
      run.push({ paragraph: current, info: currentInfo });
      index += 1;
    }

    const anchor = parent.ownerDocument.createComment('doc-list-anchor');
    parent.insertBefore(anchor, run[0].paragraph);
    const fragment = parent.ownerDocument.createDocumentFragment();
    let list: HTMLOListElement | HTMLUListElement | null = null;
    let listKey = '';

    for (const item of run) {
      const marker = stripMsoListMarker(item.paragraph, item.info);
      const kind = item.info.kind;
      const key = `${kind}:${item.info.level}:${item.info.orderedType ?? ''}`;
      if (!list || key !== listKey) {
        list = parent.ownerDocument.createElement(kind === 'ordered' ? 'ol' : 'ul');
        listKey = key;
        applyListMetadata(list, item.info, marker);
        fragment.appendChild(list);
      }

      normalizeBlockAttributes(item.paragraph);
      item.paragraph.classList.remove('MsoListParagraph', 'MsoListParagraphCxSpFirst', 'MsoListParagraphCxSpMiddle', 'MsoListParagraphCxSpLast');
      const li = parent.ownerDocument.createElement('li');
      li.appendChild(item.paragraph);
      list.appendChild(li);
    }

    parent.insertBefore(fragment, anchor);
    anchor.remove();
  }
}

function readMsoListInfo(element: HTMLElement): MsoListInfo | null {
  if (element.tagName !== 'P') return null;
  const style = element.getAttribute('style') ?? '';
  const className = element.getAttribute('class') ?? '';
  if (!MSO_LIST_RE.test(style) && !/MsoListParagraph/i.test(className)) return null;

  const levelMatch = style.match(/level(\d+)/i);
  const level = clamp(Number(levelMatch?.[1] ?? 1), 1, 9);
  const marker = readListMarker(element);
  const ordered = orderedListMarker(marker);
  return {
    kind: ordered ? 'ordered' : 'bullet',
    level,
    marker,
    ...(ordered?.start ? { start: ordered.start } : {}),
    ...(ordered?.type ? { orderedType: ordered.type } : {}),
  };
}

function readListMarker(paragraph: HTMLElement): string {
  const ignored = Array.from(paragraph.querySelectorAll<HTMLElement>('span'))
    .find((span) => /mso-list\s*:\s*Ignore/i.test(span.getAttribute('style') ?? ''));
  const marker = ignored?.textContent?.replace(/\s+/g, ' ').trim();
  if (marker) return marker;
  return (paragraph.textContent ?? '').trim().slice(0, 8);
}

function stripMsoListMarker(paragraph: HTMLElement, info: MsoListInfo): string {
  const ignored = Array.from(paragraph.querySelectorAll<HTMLElement>('span'))
    .find((span) => /mso-list\s*:\s*Ignore/i.test(span.getAttribute('style') ?? ''));
  if (ignored) {
    const marker = ignored.textContent?.replace(/\s+/g, ' ').trim() || info.marker;
    ignored.remove();
    trimLeadingWhitespace(paragraph);
    return marker;
  }

  const markerPattern = /^\s*((?:\d+|[A-Za-z]|[ivxlcdmIVXLCDM]+)[.)]|[•·o-])\s+/;
  const walker = paragraph.ownerDocument.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  const firstText = walker.nextNode() as Text | null;
  if (!firstText) return info.marker;
  const match = firstText.data.match(markerPattern);
  if (match) {
    firstText.data = firstText.data.slice(match[0].length);
    return match[1];
  }
  return info.marker;
}

function trimLeadingWhitespace(element: HTMLElement): void {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const firstText = walker.nextNode() as Text | null;
  if (firstText) firstText.data = firstText.data.replace(/^\s+/, '');
}

function orderedListMarker(marker: string): { start?: number; type?: string } | null {
  const value = marker.trim();
  const number = value.match(/^(\d+)[.)]/);
  if (number) return { start: Number(number[1]) || undefined };
  if (/^[A-Z][.)]/.test(value)) return { type: 'A' };
  if (/^[a-z][.)]/.test(value)) return { type: 'a' };
  if (/^[IVXLCDM]+[.)]/.test(value)) return { type: 'I' };
  if (/^[ivxlcdm]+[.)]/.test(value)) return { type: 'i' };
  return null;
}

function applyListMetadata(list: HTMLOListElement | HTMLUListElement, info: MsoListInfo, marker: string): void {
  const leftTwips = info.level * 720;
  list.setAttribute('data-list-indent-left', String(leftTwips));
  list.setAttribute('data-list-indent-hanging', '360');
  appendStyle(list, 'padding-left', `${twipsToPx(leftTwips)}px`);

  if (info.kind === 'ordered') {
    if (info.start && info.start > 1) list.setAttribute('start', String(info.start));
    if (info.orderedType) list.setAttribute('type', info.orderedType);
    return;
  }

  const bulletStyle = marker.trim() === 'o' ? 'circle' : marker.trim() === '-' ? 'square' : 'disc';
  list.setAttribute('data-list-style-type', bulletStyle);
  appendStyle(list, 'list-style-type', bulletStyle);
}

function applyCopyStylesFromDataAttributes(element: HTMLElement): void {
  const spaceBefore = positiveNumberAttr(element, 'data-space-before');
  const spaceAfter = positiveNumberAttr(element, 'data-space-after');
  const indent = positiveNumberAttr(element, 'data-indent');
  const rightIndent = positiveNumberAttr(element, 'data-indent-right');
  const firstLine = positiveNumberAttr(element, 'data-indent-first-line');
  const hanging = positiveNumberAttr(element, 'data-indent-hanging');
  const lineHeight = positiveNumberAttr(element, 'data-line-height');
  const listIndent = positiveNumberAttr(element, 'data-list-indent-left');
  const listStyleType = element.getAttribute('data-list-style-type');

  if (spaceBefore != null) appendStyle(element, 'margin-top', `${spaceBefore}pt`);
  if (spaceAfter != null) appendStyle(element, 'margin-bottom', `${spaceAfter}pt`);
  if (indent != null) appendStyle(element, 'margin-left', `${indent * 48}px`);
  if (rightIndent != null) appendStyle(element, 'margin-right', `${rightIndent}px`);
  if (firstLine != null) appendStyle(element, 'text-indent', `${firstLine}px`);
  if (hanging != null) appendStyle(element, 'text-indent', `-${hanging}px`);
  if (lineHeight != null) appendStyle(element, 'line-height', String(lineHeight));
  if (listIndent != null && (element.tagName === 'UL' || element.tagName === 'OL')) {
    appendStyle(element, 'padding-left', `${twipsToPx(listIndent)}px`);
  }
  if (listStyleType && element.tagName === 'UL') {
    appendStyle(element, 'list-style-type', listStyleType);
  }
  if (element.getAttribute('data-paragraph-bidi') === 'true') {
    element.setAttribute('dir', 'rtl');
    appendStyle(element, 'direction', 'rtl');
    appendStyle(element, 'unicode-bidi', 'isolate');
  }
}

function normalizeBlockAttributes(element: HTMLElement): void {
  if (!BLOCK_TAGS.has(element.tagName)) return;

  const style = parseStyle(element.getAttribute('style') ?? '');
  const marginTopPt = cssLengthToPt(style['margin-top'] ?? style['mso-margin-top-alt']);
  const marginBottomPt = cssLengthToPt(style['margin-bottom'] ?? style['mso-margin-bottom-alt']);
  const marginLeftPx = cssLengthToPx(style['margin-left']);
  const marginRightPx = cssLengthToPx(style['margin-right']);
  const textIndentPx = cssLengthToPx(style['text-indent']);
  const lineHeight = normalizeLineHeight(style['line-height'], style['font-size']);

  if (marginTopPt != null) element.setAttribute('data-space-before', String(Math.round(marginTopPt)));
  if (marginBottomPt != null) element.setAttribute('data-space-after', String(Math.round(marginBottomPt)));
  if (marginLeftPx != null && marginLeftPx > 0) element.setAttribute('data-indent', String(clamp(Math.round(marginLeftPx / 48), 0, 8)));
  if (marginRightPx != null && marginRightPx > 0) element.setAttribute('data-indent-right', String(Math.round(marginRightPx)));
  if (textIndentPx != null && textIndentPx > 0) element.setAttribute('data-indent-first-line', String(Math.round(textIndentPx)));
  if (textIndentPx != null && textIndentPx < 0) element.setAttribute('data-indent-hanging', String(Math.round(Math.abs(textIndentPx))));
  if (lineHeight != null) element.setAttribute('data-line-height', String(lineHeight));
}

function normalizeElementStyle(element: HTMLElement): void {
  const style = parseStyle(element.getAttribute('style') ?? '');
  const normalized: Record<string, string> = {};

  for (const [property, value] of Object.entries(style)) {
    if (property.startsWith('mso-') || property.startsWith('-ms-')) continue;
    if (property === 'background-color' && /^(transparent|rgba\(0,\s*0,\s*0,\s*0\))$/i.test(value)) continue;
    if (property === 'background' && /^transparent$/i.test(value)) continue;

    if (property === 'font-size') {
      const px = cssLengthToPx(value);
      normalized[property] = px == null ? value : `${Math.round(px)}px`;
      continue;
    }

    if (property === 'margin-top' || property === 'margin-bottom' || property === 'margin-left' || property === 'margin-right' || property === 'text-indent') {
      const px = cssLengthToPx(value);
      normalized[property] = px == null ? value : `${Math.round(px)}px`;
      continue;
    }

    if (property === 'line-height') {
      normalized[property] = normalizeLineHeight(value, style['font-size'])?.toString() ?? value;
      continue;
    }

    normalized[property] = value;
  }

  const nextStyle = serializeStyle(normalized);
  if (nextStyle) element.setAttribute('style', nextStyle);
  else element.removeAttribute('style');
}

function stripPasteOnlyAttributes(element: HTMLElement): void {
  const className = element.getAttribute('class');
  if (className) {
    const classes = className.split(/\s+/).filter((item) =>
      item && !/^Mso/i.test(item) && !/^docs-/i.test(item),
    );
    if (classes.length > 0) element.setAttribute('class', classes.join(' '));
    else element.removeAttribute('class');
  }

  for (const attr of Array.from(element.attributes)) {
    if (/^(lang|xml:lang|face)$/i.test(attr.name)) element.removeAttribute(attr.name);
  }
}

function stripEditorOnlyClasses(element: HTMLElement): void {
  const className = element.getAttribute('class');
  if (!className) return;
  const classes = className.split(/\s+/).filter((item) =>
    item
    && item !== 'ProseMirror-selectednode'
    && item !== 'selectedCell'
    && item !== 'column-resize-dragging',
  );
  if (classes.length > 0) element.setAttribute('class', classes.join(' '));
  else element.removeAttribute('class');
}

function positiveNumberAttr(element: HTMLElement, attr: string): number | null {
  const raw = element.getAttribute(attr);
  if (raw == null) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseStyle(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of style.split(';')) {
    const index = part.indexOf(':');
    if (index < 0) continue;
    const property = part.slice(0, index).trim().toLowerCase();
    const value = part.slice(index + 1).trim();
    if (property && value) out[property] = value;
  }
  return out;
}

function serializeStyle(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ');
}

function appendStyle(element: HTMLElement, property: string, value: string): void {
  const style = parseStyle(element.getAttribute('style') ?? '');
  style[property] = value;
  element.setAttribute('style', serializeStyle(style));
}

function normalizeLineHeight(value: string | undefined, fontSize: string | undefined): number | null {
  if (!value || /^normal$/i.test(value)) return null;
  const percent = value.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (percent) return clamp(Math.round((Number(percent[1]) / 100) * 100) / 100, 0.8, 3);
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return clamp(Math.round(numeric * 100) / 100, 0.8, 3);

  const linePx = cssLengthToPx(value);
  const fontPx = cssLengthToPx(fontSize ?? '');
  if (linePx != null && fontPx != null && fontPx > 0) {
    return clamp(Math.round((linePx / fontPx) * 100) / 100, 0.8, 3);
  }
  return null;
}

function cssLengthToPx(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^(-?\d*\.?\d+)(px|pt|in|cm|mm|pc)$/i);
  if (!match) return null;
  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) return null;
  const unit = match[2].toLowerCase();
  if (unit === 'px') return numeric;
  if (unit === 'pt') return numeric * (96 / 72);
  if (unit === 'in') return numeric * 96;
  if (unit === 'cm') return numeric * (96 / 2.54);
  if (unit === 'mm') return numeric * (96 / 25.4);
  if (unit === 'pc') return numeric * 16;
  return null;
}

function cssLengthToPt(value: string | undefined): number | null {
  const px = cssLengthToPx(value);
  return px == null ? null : px * 0.75;
}

function twipsToPx(value: number): number {
  return Math.round(value / 15);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
