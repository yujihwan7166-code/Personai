/**
 * ?щ씪?대뱶 ??.pptx ?명솚 (v1, ?뚮젮吏??먯떎 ?몄젙).
 *
 * Import: JSZip + fast-xml-parser 濡?ppt/slides/slide{N}.xml ?뚯떛
 *   - ?띿뒪??異붿텧 (a:t)
 *   - ?꾩튂 EMU ??% 蹂??(媛?ν븳 留뚰겮). ?꾩튂 遺덈챸 ???먮룞 諛곗튂
 *   - ?щ씪?대뱶 諛곌꼍???쇰? 異붿텧 (solidFill 留?
 *   - ?꾪삎쨌?대?吏쨌李⑦듃쨌?좊땲硫붿씠????臾댁떆
 *
 * Export: pptxgenjs 濡??곕━ slides ??.pptx
 *   - ?띿뒪?몃컯?? ?꾪삎(rect/ellipse), ?대?吏(base64) ??蹂?? *   - 16:9 LAYOUT_WIDE
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import pptxgen from 'pptxgenjs';
import { downloadBlob } from '@/lib/blob';
import { newId } from '@/lib/idGenerator';
import { isSafeHref, isSafeImageSrc } from '@/lib/safeUrl';
import { getTheme } from './themes';
import { normalizeSlideSize } from './types';
import { imageCropToPptxSrcRect, pptxSrcRectXml, type PptxSrcRect } from './imageCrop';
import type {
  ShapeType,
  Slide,
  SlideChartEl,
  SlideElement,
  SlideImageCrop,
  SlideImageEl,
  SlideSize,
  SlideShapeEl,
  SlideTableEl,
  SlideTextEl,
  SlideTransition,
  SlideTransitionDirection,
  SlideTransitionType,
} from './types';

// .pptx 罹붾쾭???쒖? ?ш린 (EMU)
const DEFAULT_SLIDE_SIZE_EMU = {
  width: 12192000,  // PowerPoint wide 13.333in
  height: 6858000,  // PowerPoint wide 7.5in
} as const;
const EMU_PER_INCH = 914400;
const PX_PER_INCH = 96;
const BASE64_CHUNK_BYTES = 0x6000; // divisible by 3, so chunks can be concatenated safely.
const SCHEME_COLOR_FALLBACKS: Record<string, string> = {
  tx1: '#000000',
  tx2: '#44546A',
  bg1: '#FFFFFF',
  bg2: '#E7E6E6',
  accent1: '#4472C4',
  accent2: '#ED7D31',
  accent3: '#A5A5A5',
  accent4: '#FFC000',
  accent5: '#5B9BD5',
  accent6: '#70AD47',
  hlink: '#0563C1',
  folHlink: '#954F72',
};
const CHART_COLORS = ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'];
type PptxSchemeColors = Record<string, string>;
interface PptxThemeFonts {
  majorLatin?: string;
  minorLatin?: string;
  majorEastAsian?: string;
  minorEastAsian?: string;
  majorComplexScript?: string;
  minorComplexScript?: string;
}

interface SlideSizeEmu {
  width: number;
  height: number;
}

export interface ImportedPptxDeck {
  slides: Slide[];
  slideSize: SlideSize;
}

interface ImportedTextStyle {
  fontSizeRem?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  fontFamily?: string;
  hyperlink?: string;
  align?: SlideTextEl['align'];
  lineHeight?: number;
  listStyle?: SlideTextEl['listStyle'];
  listStart?: number;
}

interface PptxRelationships {
  relsMap: Map<string, string>;
  notesRelTarget?: string;
  slideLayoutRelTarget?: string;
  slideMasterRelTarget?: string;
  themeRelTarget?: string;
}

interface SlideBackgroundInfo {
  background?: string;
  backgroundImage?: string;
  elements?: SlideElement[];
}

// newId ??lib/idGenerator 怨듭슜

// ?????????????????????????????????????????????
// Import
// ?????????????????????????????????????????????

async function readPresentationSlideSize(zip: JSZip): Promise<SlideSizeEmu> {
  const presXml = await zip.file('ppt/presentation.xml')?.async('string');
  if (!presXml) return { ...DEFAULT_SLIDE_SIZE_EMU };

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: false,
    });
    const parsed = parser.parse(presXml) as Record<string, unknown>;
    const root = (parsed['p:presentation'] ?? parsed.presentation) as Record<string, unknown> | undefined;
    const sldSz = root?.['p:sldSz'] as Record<string, unknown> | undefined;
    const width = Number(sldSz?.['@_cx']);
    const height = Number(sldSz?.['@_cy']);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  } catch {
    // ?먯긽?섍굅??異뺤빟??presentation.xml ? wide 湲곕낯媛믪쑝濡?泥섎━
  }

  return { ...DEFAULT_SLIDE_SIZE_EMU };
}

async function readPresentationSlidePaths(
  zip: JSZip,
  parser: XMLParser,
  fallbackSlideFiles: string[],
): Promise<string[]> {
  const presXml = await zip.file('ppt/presentation.xml')?.async('string');
  const relsXml = await zip.file('ppt/_rels/presentation.xml.rels')?.async('string');
  if (!presXml || !relsXml) return fallbackSlideFiles;

  try {
    const relsParsed = parser.parse(relsXml) as Record<string, unknown>;
    const relsRoot = relsParsed.Relationships as Record<string, unknown> | undefined;
    const rels = asArray<Record<string, unknown>>(relsRoot?.Relationship);
    const relTargets = new Map<string, string>();
    for (const rel of rels) {
      const id = rel['@_Id'];
      const type = rel['@_Type'];
      const target = rel['@_Target'];
      if (typeof id !== 'string' || typeof target !== 'string' || typeof type !== 'string') continue;
      if (!type.endsWith('/slide')) continue;
      const path = resolvePptxTarget('ppt', target);
      if (zip.file(path)) relTargets.set(id, path);
    }

    const presParsed = parser.parse(presXml) as Record<string, unknown>;
    const root = (presParsed['p:presentation'] ?? presParsed.presentation) as Record<string, unknown> | undefined;
    const list = root?.['p:sldIdLst'] as Record<string, unknown> | undefined;
    const ids = asArray<Record<string, unknown>>(list?.['p:sldId']);
    const ordered: string[] = [];
    const seen = new Set<string>();
    for (const slideId of ids) {
      const rid = slideId['@_r:id'];
      if (typeof rid !== 'string') continue;
      const path = relTargets.get(rid);
      if (!path || seen.has(path)) continue;
      seen.add(path);
      ordered.push(path);
    }

    if (ordered.length === 0) return fallbackSlideFiles;
    for (const path of fallbackSlideFiles) {
      if (!seen.has(path)) ordered.push(path);
    }
    return ordered;
  } catch {
    return fallbackSlideFiles;
  }
}

export async function importPptxDeck(file: File): Promise<ImportedPptxDeck> {
  const buffer = await readFileArrayBuffer(file);
  const zip = await JSZip.loadAsync(buffer);
  const slideSize = await readPresentationSlideSize(zip);
  const slideSizePx = slideSizeEmuToPx(slideSize);

  // ppt/slides/slide{N}.xml 李얘퀬 踰덊샇???뺣젹
  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const an = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const bn = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return an - bn;
    });

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: false,
    isArray: (name) => [
      'p:sp',
      'p:cxnSp',
      'p:pic',
      'p:graphicFrame',
      'p:grpSp',
      'a:r',
      'a:fld',
      'a:p',
      'a:br',
      'a:tr',
      'a:tc',
      'Relationship',
    ].includes(name),
  });
  const orderedSlideFiles = await readPresentationSlidePaths(zip, parser, slideFiles);
  const slidePathToOrdinal = new Map(orderedSlideFiles.map((path, idx) => [path, idx + 1]));
  const schemeColors = await readPresentationThemeColors(zip, parser);
  const themeFonts = await readPresentationThemeFonts(zip, parser);

  const slides: Slide[] = [];
  for (const f of orderedSlideFiles) {
    const file = zip.file(f);
    if (!file) continue;
    const xml = await file.async('string');
    // rels ?뚯씪?먯꽌 rId ??誘몃뵒??寃쎈줈 留ㅽ븨 (+ notesSlide ???④퍡 異붿텧)
    const relsPath = f.replace(/^ppt\/slides\//, 'ppt/slides/_rels/').replace(/\.xml$/, '.xml.rels');
    const relsFile = zip.file(relsPath);
    const relsMap = new Map<string, string>();
    let notesRelTarget: string | undefined;
    let slideLayoutRelTarget: string | undefined;
    if (relsFile) {
      const relsXml = await relsFile.async('string');
      try {
        const parsed = parser.parse(relsXml) as Record<string, unknown>;
        const root = parsed.Relationships as Record<string, unknown> | undefined;
        const rels = root?.Relationship as Array<Record<string, unknown>> | undefined;
        for (const r of rels ?? []) {
          const id = r['@_Id'] as string | undefined;
          const target = r['@_Target'] as string | undefined;
          const ttype = r['@_Type'] as string | undefined;
          if (id && target) relsMap.set(id, internalSlideHrefFromRelationshipTarget(f, target, ttype, slidePathToOrdinal) ?? target);
          if (target && ttype && ttype.includes('notesSlide')) notesRelTarget = target;
          if (target && ttype && ttype.includes('slideLayout')) slideLayoutRelTarget = target;
        }
      } catch { /* rels ?뚯떛 ?ㅽ뙣 ???대?吏쨌?명듃 臾댁떆 */ }
    }
    const inheritedBackground = await readInheritedSlideBackground(zip, parser, slideLayoutRelTarget, slideSize, schemeColors, themeFonts);
    const slide = await parseSlide(xml, parser, relsMap, zip, slideSize, inheritedBackground, schemeColors, themeFonts);
    // ?명듃 ?뚯떛 (?덉쑝硫?
    if (notesRelTarget) {
      const notesPath = resolvePptxTarget('ppt/slides', notesRelTarget);
      const notesFile = zip.file(notesPath);
      if (notesFile) {
        try {
          const notesXml = await notesFile.async('string');
          const text = extractNotesText(notesXml, parser);
          if (text) slide.notes = text;
        } catch { /* ?명듃 ?뚯떛 ?ㅽ뙣 ??skip */ }
      }
    }
    slides.push(slide);
  }
  if (slides.length === 0) {
    // 鍮??щ씪?대뱶 ???μ씠?쇰룄 諛섑솚
    slides.push({ id: newId('s'), elements: [] });
  }
  return { slides, slideSize: slideSizePx };
}

export async function importPptxFile(file: File): Promise<Slide[]> {
  const deck = await importPptxDeck(file);
  return deck.slides;
}

function slideSizeEmuToPx(size: SlideSizeEmu): SlideSize {
  return normalizeSlideSize({
    width: Math.round((size.width / EMU_PER_INCH) * PX_PER_INCH),
    height: Math.round((size.height / EMU_PER_INCH) * PX_PER_INCH),
  });
}

function readFileArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('PPTX ?뚯씪??ArrayBuffer濡??쎌? 紐삵뻽?댁슂.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('PPTX ?뚯씪 ?쎄린???ㅽ뙣?덉뼱??'));
    reader.readAsArrayBuffer(file);
  });
}

async function parseSlide(
  xml: string,
  parser: XMLParser,
  relsMap: Map<string, string>,
  zip: JSZip,
  slideSize: SlideSizeEmu,
  inheritedBackground?: SlideBackgroundInfo,
  schemeColors?: PptxSchemeColors,
  themeFonts?: PptxThemeFonts,
): Promise<Slide> {
  const elements: SlideElement[] = [...(inheritedBackground?.elements ?? [])];
  let background = inheritedBackground?.background;
  let transition: SlideTransition | undefined;
  let backgroundImage = inheritedBackground?.backgroundImage;
  let hidden = false;

  try {
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['p:sld'] ?? parsed.sld) as Record<string, unknown> | undefined;
    if (!root) return { id: newId('s'), elements };
    hidden = root['@_show'] !== undefined && !attrBool(root['@_show']);
    transition = extractSlideTransition(root['p:transition']);

    const cSld = root['p:cSld'] as Record<string, unknown> | undefined;
    if (!cSld) return { id: newId('s'), elements, ...(hidden ? { hidden: true } : {}), ...(transition ? { transition } : {}) };

    // 諛곌꼍
    const bg = cSld['p:bg'] as Record<string, unknown> | undefined;
    if (bg) {
      const ownBackground = await extractBackgroundInfo(cSld, relsMap, zip, 'ppt/slides', schemeColors);
      background = ownBackground.background;
      backgroundImage = ownBackground.backgroundImage;
    }

    // ?꾪삎??(p:sp)
    const spTree = cSld['p:spTree'] as Record<string, unknown> | undefined;
    if (spTree) {
      const ordered = getSpTreeChildOrder(xml);
      if (ordered.length > 0) {
        const shapes = spTree['p:sp'] as Array<Record<string, unknown>> | undefined;
        const connectors = spTree['p:cxnSp'] as Array<Record<string, unknown>> | undefined;
        const pics = spTree['p:pic'] as Array<Record<string, unknown>> | undefined;
        const frames = spTree['p:graphicFrame'] as Array<Record<string, unknown>> | undefined;
        const groups = spTree['p:grpSp'] as Array<Record<string, unknown>> | undefined;
        for (const item of ordered) {
          let el: SlideElement | null = null;
          if (item.tag === 'sp') el = parseShape(shapes?.[item.index] ?? {}, slideSize, relsMap, schemeColors, themeFonts);
          else if (item.tag === 'cxnSp') el = parseShape(connectors?.[item.index] ?? {}, slideSize, relsMap, schemeColors, themeFonts);
          else if (item.tag === 'pic') el = await parsePic(pics?.[item.index] ?? {}, relsMap, zip, slideSize);
          else if (item.tag === 'graphicFrame') el = await parseGraphicFrame(frames?.[item.index] ?? {}, slideSize, relsMap, zip, parser, schemeColors, themeFonts);
          else if (item.tag === 'grpSp') {
            const groupElements = await parseGroup(groups?.[item.index] ?? {}, relsMap, zip, slideSize, schemeColors, themeFonts);
            elements.push(...groupElements);
            continue;
          }
          if (el) elements.push(el);
        }
      } else {
        await appendSpTreeElementsByType(elements, spTree, relsMap, zip, slideSize, schemeColors, themeFonts);
      }
    }
  } catch {
    // ?뚯떛 ?ㅽ뙣 ??鍮??щ씪?대뱶濡?  }

  }

  return {
    id: newId('s'),
    elements,
    ...(background ? { background } : {}),
    ...(backgroundImage ? { backgroundImage } : {}),
    ...(hidden ? { hidden: true } : {}),
    ...(transition ? { transition } : {}),
  };
}

const PPT_TRANSITION_KEYS: Array<[SlideTransitionType, string]> = [
  ['fade', 'p:fade'],
  ['push', 'p:push'],
  ['wipe', 'p:wipe'],
  ['split', 'p:split'],
  ['cover', 'p:cover'],
  ['uncover', 'p:uncover'],
  ['zoom', 'p:zoom'],
];

function extractSlideTransition(node: unknown): SlideTransition | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const rec = node as Record<string, unknown>;
  const found = PPT_TRANSITION_KEYS.find(([, key]) => rec[key] !== undefined);
  if (!found) return undefined;
  const [, key] = found;
  const transitionNode = rec[key] as Record<string, unknown> | undefined;
  const direction = mapPptTransitionDirection(transitionNode?.['@_dir']);
  const durationMs = pptTransitionSpeedToMs(rec['@_spd']);
  const advanceOnClick = rec['@_advClick'] === undefined ? undefined : attrBool(rec['@_advClick']);
  const advanceAfterMs = Number(rec['@_advTm']);

  return {
    type: found[0],
    ...(direction ? { direction } : {}),
    ...(durationMs ? { durationMs } : {}),
    ...(advanceOnClick !== undefined ? { advanceOnClick } : {}),
    ...(Number.isFinite(advanceAfterMs) && advanceAfterMs > 0 ? { advanceAfterMs } : {}),
  };
}

function mapPptTransitionDirection(value: unknown): SlideTransitionDirection | undefined {
  const raw = typeof value === 'string' ? value : '';
  const map: Record<string, SlideTransitionDirection> = {
    l: 'left',
    r: 'right',
    u: 'up',
    d: 'down',
  };
  return map[raw];
}

function pptTransitionSpeedToMs(value: unknown): number | undefined {
  if (value === 'fast') return 500;
  if (value === 'med') return 1000;
  if (value === 'slow') return 2000;
  return undefined;
}

async function appendSpTreeElementsByType(
  elements: SlideElement[],
  spTree: Record<string, unknown>,
  relsMap: Map<string, string>,
  zip: JSZip,
  slideSize: SlideSizeEmu,
  schemeColors?: PptxSchemeColors,
  themeFonts?: PptxThemeFonts,
): Promise<void> {
  const shapes = spTree['p:sp'] as Array<Record<string, unknown>> | undefined;
  for (const sp of shapes ?? []) {
    const el = parseShape(sp, slideSize, relsMap, schemeColors, themeFonts);
    if (el) elements.push(el);
  }

  const connectors = spTree['p:cxnSp'] as Array<Record<string, unknown>> | undefined;
  for (const cxnSp of connectors ?? []) {
    const el = parseShape(cxnSp, slideSize, relsMap, schemeColors, themeFonts);
    if (el) elements.push(el);
  }

  const pics = spTree['p:pic'] as Array<Record<string, unknown>> | undefined;
  for (const pic of pics ?? []) {
    const el = await parsePic(pic, relsMap, zip, slideSize);
    if (el) elements.push(el);
  }

  const frames = spTree['p:graphicFrame'] as Array<Record<string, unknown>> | undefined;
  for (const gf of frames ?? []) {
    const el = await parseGraphicFrame(gf, slideSize, relsMap, zip, parser, schemeColors, themeFonts);
    if (el) elements.push(el);
  }

  const groups = spTree['p:grpSp'] as Array<Record<string, unknown>> | undefined;
  for (const group of groups ?? []) {
    const groupElements = await parseGroup(group, relsMap, zip, slideSize, schemeColors, themeFonts);
    elements.push(...groupElements);
  }
}

type SpTreeChildTag = 'sp' | 'cxnSp' | 'pic' | 'graphicFrame' | 'grpSp';

function getSpTreeChildOrder(xml: string): Array<{ tag: SpTreeChildTag; index: number }> {
  const match = xml.match(/<p:spTree\b[\s\S]*?<\/p:spTree>/);
  if (!match) return [];
  const counts: Record<SpTreeChildTag, number> = { sp: 0, cxnSp: 0, pic: 0, graphicFrame: 0, grpSp: 0 };
  const order: Array<{ tag: SpTreeChildTag; index: number }> = [];
  const re = /<\/?p:(sp|cxnSp|pic|graphicFrame|grpSp)\b[^>]*>/g;
  let m: RegExpExecArray | null;
  let depth = 0;
  while ((m = re.exec(match[0])) !== null) {
    const token = m[0];
    const tag = m[1] as SpTreeChildTag;
    if (token.startsWith('</')) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0) order.push({ tag, index: counts[tag]++ });
    if (!token.endsWith('/>')) depth += 1;
  }
  return order;
}

/** p:graphicFrame ??placeholder ?띿뒪??諛뺤뒪 (李⑦듃/??SmartArt ?먮━留?蹂댁〈) */
async function parseGroup(
  group: Record<string, unknown>,
  relsMap: Map<string, string>,
  zip: JSZip,
  slideSize: SlideSizeEmu,
  schemeColors?: PptxSchemeColors,
  themeFonts?: PptxThemeFonts,
  baseDir = 'ppt/slides',
  skipPlaceholders = false,
): Promise<SlideElement[]> {
  const groupId = newId('g');
  const groupXfrm = getGroupTransform(group);
  const elements: SlideElement[] = [];

  const shapes = group['p:sp'] as Array<Record<string, unknown>> | undefined;
  for (const sp of shapes ?? []) {
    if (skipPlaceholders && hasPlaceholder(sp)) continue;
    const el = parseShape(sp, slideSize, relsMap, schemeColors, themeFonts);
    if (el) elements.push(withGroupTransform(el, groupId, groupXfrm, slideSize));
  }

  const connectors = group['p:cxnSp'] as Array<Record<string, unknown>> | undefined;
  for (const cxnSp of connectors ?? []) {
    if (skipPlaceholders && hasPlaceholder(cxnSp)) continue;
    const el = parseShape(cxnSp, slideSize, relsMap, schemeColors, themeFonts);
    if (el) elements.push(withGroupTransform(el, groupId, groupXfrm, slideSize));
  }

  const pics = group['p:pic'] as Array<Record<string, unknown>> | undefined;
  for (const pic of pics ?? []) {
    if (skipPlaceholders && hasPlaceholder(pic)) continue;
    const el = await parsePic(pic, relsMap, zip, slideSize, baseDir);
    if (el) elements.push(withGroupTransform(el, groupId, groupXfrm, slideSize));
  }

  const frames = group['p:graphicFrame'] as Array<Record<string, unknown>> | undefined;
  for (const gf of frames ?? []) {
    if (skipPlaceholders && hasPlaceholder(gf)) continue;
    const el = await parseGraphicFrame(gf, slideSize, relsMap, zip, parser, schemeColors, themeFonts, baseDir);
    if (el) elements.push(withGroupTransform(el, groupId, groupXfrm, slideSize));
  }

  return elements;
}

function getGroupTransform(group: Record<string, unknown>): Record<string, unknown> | undefined {
  const grpSpPr = group['p:grpSpPr'] as Record<string, unknown> | undefined;
  return grpSpPr?.['a:xfrm'] as Record<string, unknown> | undefined;
}

function withGroupTransform(
  el: SlideElement,
  groupId: string,
  xfrm: Record<string, unknown> | undefined,
  slideSize: SlideSizeEmu,
): SlideElement {
  const grouped = { ...el, groupId } as SlideElement;
  if (!xfrm) return grouped;

  const off = xfrm['a:off'] as Record<string, unknown> | undefined;
  const ext = xfrm['a:ext'] as Record<string, unknown> | undefined;
  const chOff = xfrm['a:chOff'] as Record<string, unknown> | undefined;
  const chExt = xfrm['a:chExt'] as Record<string, unknown> | undefined;
  const gx = Number(off?.['@_x'] ?? 0);
  const gy = Number(off?.['@_y'] ?? 0);
  const gw = Number(ext?.['@_cx'] ?? slideSize.width);
  const gh = Number(ext?.['@_cy'] ?? slideSize.height);
  const cx = Number(chOff?.['@_x'] ?? 0);
  const cy = Number(chOff?.['@_y'] ?? 0);
  const cw = Number(chExt?.['@_cx'] ?? gw);
  const ch = Number(chExt?.['@_cy'] ?? gh);
  if (![gx, gy, gw, gh, cx, cy, cw, ch].every(Number.isFinite) || cw <= 0 || ch <= 0) return grouped;

  const xEmu = (el.xPct / 100) * slideSize.width;
  const yEmu = (el.yPct / 100) * slideSize.height;
  const wEmu = (el.wPct / 100) * slideSize.width;
  const hEmu = (el.hPct / 100) * slideSize.height;

  return {
    ...grouped,
    xPct: clampPct(((gx + ((xEmu - cx) / cw) * gw) / slideSize.width) * 100),
    yPct: clampPct(((gy + ((yEmu - cy) / ch) * gh) / slideSize.height) * 100),
    wPct: clampPct(((wEmu / cw) * gw / slideSize.width) * 100),
    hPct: clampPct(((hEmu / ch) * gh / slideSize.height) * 100),
  } as SlideElement;
}

async function parseGraphicFrame(
  gf: Record<string, unknown>,
  slideSize: SlideSizeEmu,
  relsMap: Map<string, string>,
  zip: JSZip,
  parser: XMLParser,
  schemeColors?: PptxSchemeColors,
  themeFonts?: PptxThemeFonts,
  baseDir = 'ppt/slides',
): Promise<SlideElement | null> {
  const xfrm = gf['p:xfrm'] as Record<string, unknown> | undefined;
  const off = xfrm?.['a:off'] as Record<string, unknown> | undefined;
  const ext = xfrm?.['a:ext'] as Record<string, unknown> | undefined;
  if (!off || !ext) return null;

  const xEmu = Number(off['@_x'] ?? 0);
  const yEmu = Number(off['@_y'] ?? 0);
  const cxEmu = Number(ext['@_cx'] ?? slideSize.width * 0.4);
  const cyEmu = Number(ext['@_cy'] ?? slideSize.height * 0.3);
  const locked = extractObjectLocked(gf);

  // 醫낅쪟 異붿젙 (URI 濡?: chart / table / diagram
  const graphic = gf['a:graphic'] as Record<string, unknown> | undefined;
  const graphicData = graphic?.['a:graphicData'] as Record<string, unknown> | undefined;
  const uri = (graphicData?.['@_uri'] ?? '') as string;
  const chart = await extractChartElement(graphicData, relsMap, zip, parser, baseDir, schemeColors);
  if (chart) {
    return {
      ...chart,
      xPct: clampPct((xEmu / slideSize.width) * 100),
      yPct: clampPct((yEmu / slideSize.height) * 100),
      wPct: Math.max(clampPct((cxEmu / slideSize.width) * 100), 15),
      hPct: Math.max(clampPct((cyEmu / slideSize.height) * 100), 8),
      ...(locked ? { locked: true } : {}),
    };
  }
  const table = extractTableElement(graphicData, relsMap, schemeColors, themeFonts);
  if (table) {
    return {
      id: newId('el'),
      type: 'table',
      xPct: clampPct((xEmu / slideSize.width) * 100),
      yPct: clampPct((yEmu / slideSize.height) * 100),
      wPct: Math.max(clampPct((cxEmu / slideSize.width) * 100), 15),
      hPct: Math.max(clampPct((cyEmu / slideSize.height) * 100), 8),
      ...(locked ? { locked: true } : {}),
      ...table,
    };
  }
  let label = '[洹몃옒???먮━]';
  if (uri.includes('chart')) label = '[李⑦듃 ?먮━]';
  else if (uri.includes('table')) label = '[???먮━]';
  else if (uri.includes('diagram')) label = '[?ㅼ씠?닿렇???먮━]';

  return {
    id: newId('el'),
    type: 'text',
    xPct: clampPct((xEmu / slideSize.width) * 100),
    yPct: clampPct((yEmu / slideSize.height) * 100),
    wPct: Math.max(clampPct((cxEmu / slideSize.width) * 100), 15),
    hPct: Math.max(clampPct((cyEmu / slideSize.height) * 100), 8),
    content: label,
    ...(locked ? { locked: true } : {}),
    fontSizeRem: 1.25,
    textColor: 'rgba(0,0,0,0.4)',
  };
}

async function extractChartElement(
  graphicData: Record<string, unknown> | undefined,
  relsMap: Map<string, string>,
  zip: JSZip,
  parser: XMLParser,
  baseDir = 'ppt/slides',
  schemeColors?: PptxSchemeColors,
): Promise<SlideChartEl | null> {
  const chartRef = graphicData?.['c:chart'] as Record<string, unknown> | undefined;
  const rId = chartRef?.['@_r:id'];
  if (typeof rId !== 'string') return null;
  const target = relsMap.get(rId);
  if (!target) return null;
  const chartPath = resolvePptxTarget(baseDir, target);
  const chartFile = zip.file(chartPath);
  if (!chartFile) return null;

  try {
    const xml = await chartFile.async('string');
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const chartSpace = (parsed['c:chartSpace'] ?? parsed.chartSpace) as Record<string, unknown> | undefined;
    const chart = (chartSpace?.['c:chart'] ?? chartSpace?.chart) as Record<string, unknown> | undefined;
    const plotArea = chart?.['c:plotArea'] as Record<string, unknown> | undefined;
    if (!plotArea) return null;

    const candidates: Array<[SlideChartEl['chartType'], string]> = [
      ['bar', 'c:barChart'],
      ['line', 'c:lineChart'],
      ['pie', 'c:pieChart'],
    ];
    for (const [chartType, key] of candidates) {
      const node = plotArea[key] as Record<string, unknown> | undefined;
      if (!node) continue;
      const seriesNodes = asArray<Record<string, unknown>>(node['c:ser']);
      const categories = extractChartCategories(seriesNodes[0]);
      const series = seriesNodes
        .map((ser, idx) => {
          const color = extractChartSeriesColor(ser, schemeColors);
          return {
            name: extractChartSeriesName(ser) || `Series ${idx + 1}`,
            values: extractChartValues(ser),
            ...(color ? { color } : {}),
          };
        })
        .filter((ser) => ser.values.length > 0);
      if (series.length === 0) return null;
      return {
        id: newId('el'),
        type: 'chart',
        xPct: 0,
        yPct: 0,
        wPct: 40,
        hPct: 30,
        chartType,
        title: extractChartTitle(chart),
        categories: categories.length > 0 ? categories : series[0].values.map((_, i) => `Category ${i + 1}`),
        series,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function extractChartTitle(chart: Record<string, unknown> | undefined): string | undefined {
  const title = chart?.['c:title'] as Record<string, unknown> | undefined;
  const tx = title?.['c:tx'] as Record<string, unknown> | undefined;
  const rich = tx?.['c:rich'] as Record<string, unknown> | undefined;
  const text = extractTextInfo(rich).content;
  return text || undefined;
}

function extractChartSeriesName(ser: Record<string, unknown>): string {
  const tx = ser['c:tx'] as Record<string, unknown> | undefined;
  const strRef = tx?.['c:strRef'] as Record<string, unknown> | undefined;
  const fromCache = readStringCache(strRef?.['c:strCache']).join(' ').trim();
  if (fromCache) return fromCache;
  const v = tx?.['c:v'];
  return valueText(v);
}

function extractChartSeriesColor(ser: Record<string, unknown>, schemeColors?: PptxSchemeColors): string | undefined {
  const spPr = ser['c:spPr'] as Record<string, unknown> | undefined;
  return extractSolidColor(spPr?.['a:solidFill'], schemeColors)
    ?? extractSolidColor((spPr?.['a:ln'] as Record<string, unknown> | undefined)?.['a:solidFill'], schemeColors);
}

function extractChartCategories(ser: Record<string, unknown> | undefined): string[] {
  const cat = ser?.['c:cat'] as Record<string, unknown> | undefined;
  const strRef = cat?.['c:strRef'] as Record<string, unknown> | undefined;
  const numRef = cat?.['c:numRef'] as Record<string, unknown> | undefined;
  return readStringCache(strRef?.['c:strCache']).concat(readNumCache(numRef?.['c:numCache']).map(String));
}

function extractChartValues(ser: Record<string, unknown>): number[] {
  const val = ser['c:val'] as Record<string, unknown> | undefined;
  const numRef = val?.['c:numRef'] as Record<string, unknown> | undefined;
  return readNumCache(numRef?.['c:numCache']);
}

function readStringCache(cache: unknown): string[] {
  if (!cache || typeof cache !== 'object') return [];
  return asArray<Record<string, unknown>>((cache as Record<string, unknown>)['c:pt'])
    .map((pt) => valueText(pt['c:v']))
    .filter(Boolean);
}

function readNumCache(cache: unknown): number[] {
  if (!cache || typeof cache !== 'object') return [];
  return asArray<Record<string, unknown>>((cache as Record<string, unknown>)['c:pt'])
    .map((pt) => Number(valueText(pt['c:v'])))
    .filter((v) => Number.isFinite(v));
}

function valueText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value && typeof value === 'object') return String((value as Record<string, unknown>)['#text'] ?? '');
  return '';
}

function resolvePptxTarget(baseDir: string, target: string): string {
  const raw = target.trim().replace(/\\/g, '/');
  if (!raw) return raw;
  if (raw.startsWith('/')) return raw.slice(1);
  const parts = `${baseDir}/${raw}`.split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

function pptxPartRelsPath(partPath: string): string {
  const normalized = partPath.replace(/\\/g, '/');
  const slash = normalized.lastIndexOf('/');
  if (slash < 0) return `_rels/${normalized}.rels`;
  return `${normalized.slice(0, slash)}/_rels/${normalized.slice(slash + 1)}.rels`;
}

function pptxPartBaseDir(partPath: string): string {
  const normalized = partPath.replace(/\\/g, '/');
  const slash = normalized.lastIndexOf('/');
  return slash < 0 ? '' : normalized.slice(0, slash);
}

function pptxSourcePartFromRelsPath(relsPath: string): string {
  const normalized = relsPath.replace(/\\/g, '/');
  const match = normalized.match(/^(.*)\/_rels\/([^/]+)\.rels$/);
  if (!match) return normalized.replace(/\.rels$/, '');
  return `${match[1]}/${match[2]}`;
}

function internalSlideHrefFromRelationshipTarget(
  sourcePartPath: string,
  target: string,
  relType: string | undefined,
  slidePathToOrdinal?: Map<string, number>,
): string | undefined {
  if (!relType?.endsWith('/slide')) return undefined;
  const targetPath = resolvePptxTarget(pptxPartBaseDir(sourcePartPath), target);
  const ordinal = slidePathToOrdinal?.get(targetPath);
  if (ordinal && ordinal > 0) return `#slide=${ordinal}`;
  const slideNo = Number(targetPath.match(/^ppt\/slides\/slide(\d+)\.xml$/)?.[1]);
  return Number.isFinite(slideNo) && slideNo > 0 ? `#slide=${Math.floor(slideNo)}` : undefined;
}

async function readPptxRelationships(
  zip: JSZip,
  parser: XMLParser,
  relsPath: string,
): Promise<PptxRelationships> {
  const out: PptxRelationships = { relsMap: new Map<string, string>() };
  const relsFile = zip.file(relsPath);
  if (!relsFile) return out;
  try {
    const sourcePartPath = pptxSourcePartFromRelsPath(relsPath);
    const relsXml = await relsFile.async('string');
    const parsed = parser.parse(relsXml) as Record<string, unknown>;
    const root = parsed.Relationships as Record<string, unknown> | undefined;
    const rels = root?.Relationship as Array<Record<string, unknown>> | undefined;
    for (const r of rels ?? []) {
      const id = r['@_Id'] as string | undefined;
      const target = r['@_Target'] as string | undefined;
      const ttype = r['@_Type'] as string | undefined;
      if (id && target) {
        out.relsMap.set(id, internalSlideHrefFromRelationshipTarget(sourcePartPath, target, ttype) ?? target);
      }
      if (!target || !ttype) continue;
      if (ttype.includes('notesSlide')) out.notesRelTarget = target;
      else if (ttype.includes('slideLayout')) out.slideLayoutRelTarget = target;
      else if (ttype.includes('slideMaster')) out.slideMasterRelTarget = target;
      else if (ttype.endsWith('/theme')) out.themeRelTarget = target;
    }
  } catch {
    return out;
  }
  return out;
}

async function readPresentationThemeColors(zip: JSZip, parser: XMLParser): Promise<PptxSchemeColors | undefined> {
  const presentationRels = await readPptxRelationships(zip, parser, 'ppt/_rels/presentation.xml.rels');
  const themePath = presentationRels.themeRelTarget
    ? resolvePptxTarget('ppt', presentationRels.themeRelTarget)
    : Object.keys(zip.files).find((path) => /^ppt\/theme\/theme\d+\.xml$/.test(path));
  if (!themePath) return undefined;
  const themeFile = zip.file(themePath);
  if (!themeFile) return undefined;

  try {
    const xml = await themeFile.async('string');
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const theme = (parsed['a:theme'] ?? parsed.theme) as Record<string, unknown> | undefined;
    const themeElements = theme?.['a:themeElements'] as Record<string, unknown> | undefined;
    const clrScheme = themeElements?.['a:clrScheme'] as Record<string, unknown> | undefined;
    if (!clrScheme) return undefined;

    const colors: PptxSchemeColors = {};
    for (const [schemeName, themeKey] of [
      ['dk1', 'a:dk1'],
      ['lt1', 'a:lt1'],
      ['dk2', 'a:dk2'],
      ['lt2', 'a:lt2'],
      ['accent1', 'a:accent1'],
      ['accent2', 'a:accent2'],
      ['accent3', 'a:accent3'],
      ['accent4', 'a:accent4'],
      ['accent5', 'a:accent5'],
      ['accent6', 'a:accent6'],
      ['hlink', 'a:hlink'],
      ['folHlink', 'a:folHlink'],
    ] as const) {
      const color = extractThemeColor(clrScheme[themeKey]);
      if (color) colors[schemeName] = color;
    }
    if (colors.dk1) colors.tx1 = colors.dk1;
    if (colors.lt1) colors.bg1 = colors.lt1;
    if (colors.dk2) colors.tx2 = colors.dk2;
    if (colors.lt2) colors.bg2 = colors.lt2;
    return Object.keys(colors).length ? colors : undefined;
  } catch {
    return undefined;
  }
}

async function readPresentationThemeFonts(zip: JSZip, parser: XMLParser): Promise<PptxThemeFonts | undefined> {
  const presentationRels = await readPptxRelationships(zip, parser, 'ppt/_rels/presentation.xml.rels');
  const themePath = presentationRels.themeRelTarget
    ? resolvePptxTarget('ppt', presentationRels.themeRelTarget)
    : Object.keys(zip.files).find((path) => /^ppt\/theme\/theme\d+\.xml$/.test(path));
  if (!themePath) return undefined;
  const themeFile = zip.file(themePath);
  if (!themeFile) return undefined;

  try {
    const xml = await themeFile.async('string');
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const theme = (parsed['a:theme'] ?? parsed.theme) as Record<string, unknown> | undefined;
    const themeElements = theme?.['a:themeElements'] as Record<string, unknown> | undefined;
    const fontScheme = themeElements?.['a:fontScheme'] as Record<string, unknown> | undefined;
    if (!fontScheme) return undefined;

    const majorFont = fontScheme['a:majorFont'] as Record<string, unknown> | undefined;
    const minorFont = fontScheme['a:minorFont'] as Record<string, unknown> | undefined;
    const fonts: PptxThemeFonts = {
      ...themeFontGroup(majorFont, 'major'),
      ...themeFontGroup(minorFont, 'minor'),
    };
    return Object.keys(fonts).length ? fonts : undefined;
  } catch {
    return undefined;
  }
}

function themeFontGroup(node: Record<string, unknown> | undefined, kind: 'major' | 'minor'): PptxThemeFonts {
  const latin = extractThemeTypeface(node?.['a:latin']);
  const eastAsian = extractThemeTypeface(node?.['a:ea']);
  const complexScript = extractThemeTypeface(node?.['a:cs']);
  return kind === 'major'
    ? {
      ...(latin ? { majorLatin: latin } : {}),
      ...(eastAsian ? { majorEastAsian: eastAsian } : {}),
      ...(complexScript ? { majorComplexScript: complexScript } : {}),
    }
    : {
      ...(latin ? { minorLatin: latin } : {}),
      ...(eastAsian ? { minorEastAsian: eastAsian } : {}),
      ...(complexScript ? { minorComplexScript: complexScript } : {}),
    };
}

function extractThemeTypeface(node: unknown): string | undefined {
  const typeface = (node as Record<string, unknown> | undefined)?.['@_typeface'];
  return typeof typeface === 'string' && typeface.trim() ? typeface.trim() : undefined;
}

function extractThemeColor(node: unknown): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const rec = node as Record<string, unknown>;
  const srgb = rec['a:srgbClr'] as Record<string, unknown> | undefined;
  const srgbValue = srgb?.['@_val'];
  if (typeof srgbValue === 'string' && /^[0-9a-fA-F]{6}$/.test(srgbValue)) {
    return `#${srgbValue.toUpperCase()}`;
  }
  const sys = rec['a:sysClr'] as Record<string, unknown> | undefined;
  const lastClr = sys?.['@_lastClr'];
  if (typeof lastClr === 'string' && /^[0-9a-fA-F]{6}$/.test(lastClr)) {
    return `#${lastClr.toUpperCase()}`;
  }
  return undefined;
}

async function readInheritedSlideBackground(
  zip: JSZip,
  parser: XMLParser,
  slideLayoutRelTarget: string | undefined,
  slideSize: SlideSizeEmu,
  schemeColors?: PptxSchemeColors,
  themeFonts?: PptxThemeFonts,
): Promise<SlideBackgroundInfo | undefined> {
  if (!slideLayoutRelTarget) return undefined;
  const layoutPath = resolvePptxTarget('ppt/slides', slideLayoutRelTarget);
  const layoutFile = zip.file(layoutPath);
  if (!layoutFile) return undefined;

  const layoutRels = await readPptxRelationships(zip, parser, pptxPartRelsPath(layoutPath));
  const layoutXml = await layoutFile.async('string');
  const layoutBackground = await extractInheritedPartInfo(layoutXml, parser, layoutRels.relsMap, zip, pptxPartBaseDir(layoutPath), slideSize, schemeColors, themeFonts);
  const masterBackground = await readSlideMasterBackground(zip, parser, layoutPath, layoutRels.slideMasterRelTarget, slideSize, schemeColors, themeFonts);

  return {
    ...(masterBackground ?? {}),
    ...(layoutBackground ?? {}),
    elements: [
      ...(masterBackground?.elements ?? []),
      ...(layoutBackground?.elements ?? []),
    ],
  };
}

async function readSlideMasterBackground(
  zip: JSZip,
  parser: XMLParser,
  layoutPath: string,
  slideMasterRelTarget: string | undefined,
  slideSize: SlideSizeEmu,
  schemeColors?: PptxSchemeColors,
  themeFonts?: PptxThemeFonts,
): Promise<SlideBackgroundInfo | undefined> {
  if (!slideMasterRelTarget) return undefined;
  const masterPath = resolvePptxTarget(pptxPartBaseDir(layoutPath), slideMasterRelTarget);
  const masterFile = zip.file(masterPath);
  if (!masterFile) return undefined;
  const masterRels = await readPptxRelationships(zip, parser, pptxPartRelsPath(masterPath));
  const masterXml = await masterFile.async('string');
  return extractInheritedPartInfo(masterXml, parser, masterRels.relsMap, zip, pptxPartBaseDir(masterPath), slideSize, schemeColors, themeFonts);
}

async function extractInheritedPartInfo(
  xml: string,
  parser: XMLParser,
  relsMap: Map<string, string>,
  zip: JSZip,
  baseDir: string,
  slideSize: SlideSizeEmu,
  schemeColors?: PptxSchemeColors,
  themeFonts?: PptxThemeFonts,
): Promise<SlideBackgroundInfo | undefined> {
  try {
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['p:sld'] ?? parsed['p:sldLayout'] ?? parsed['p:sldMaster'] ?? parsed.sld ?? parsed.sldLayout ?? parsed.sldMaster) as Record<string, unknown> | undefined;
    const cSld = root?.['p:cSld'] as Record<string, unknown> | undefined;
    const background = await extractBackgroundInfo(cSld, relsMap, zip, baseDir, schemeColors);
    const elements = await extractInheritedElementsFromPartXml(xml, cSld, relsMap, zip, baseDir, slideSize, parser, schemeColors, themeFonts);
    return {
      ...background,
      ...(elements.length ? { elements } : {}),
    };
  } catch {
    return undefined;
  }
}

async function extractInheritedElementsFromPartXml(
  xml: string,
  cSld: Record<string, unknown> | undefined,
  relsMap: Map<string, string>,
  zip: JSZip,
  baseDir: string,
  slideSize: SlideSizeEmu,
  parser: XMLParser,
  schemeColors?: PptxSchemeColors,
  themeFonts?: PptxThemeFonts,
): Promise<SlideElement[]> {
  const spTree = cSld?.['p:spTree'] as Record<string, unknown> | undefined;
  if (!spTree) return [];
  const elements: SlideElement[] = [];
  const ordered = getSpTreeChildOrder(xml);
  const shapes = spTree['p:sp'] as Array<Record<string, unknown>> | undefined;
  const connectors = spTree['p:cxnSp'] as Array<Record<string, unknown>> | undefined;
  const pics = spTree['p:pic'] as Array<Record<string, unknown>> | undefined;
  const frames = spTree['p:graphicFrame'] as Array<Record<string, unknown>> | undefined;
  const groups = spTree['p:grpSp'] as Array<Record<string, unknown>> | undefined;

  const visit = async (tag: SpTreeChildTag, index: number) => {
    let el: SlideElement | null = null;
    if (tag === 'sp') {
      const sp = shapes?.[index];
      if (!sp || hasPlaceholder(sp)) return;
      el = parseShape(sp, slideSize, relsMap, schemeColors, themeFonts);
    } else if (tag === 'cxnSp') {
      const cxnSp = connectors?.[index];
      if (!cxnSp || hasPlaceholder(cxnSp)) return;
      el = parseShape(cxnSp, slideSize, relsMap, schemeColors, themeFonts);
    } else if (tag === 'pic') {
      const pic = pics?.[index];
      if (!pic || hasPlaceholder(pic)) return;
      el = await parsePic(pic, relsMap, zip, slideSize, baseDir);
    } else if (tag === 'graphicFrame') {
      const frame = frames?.[index];
      if (!frame || hasPlaceholder(frame)) return;
      el = await parseGraphicFrame(frame, slideSize, relsMap, zip, parser, schemeColors, themeFonts, baseDir);
    } else if (tag === 'grpSp') {
      const group = groups?.[index];
      if (!group || hasPlaceholder(group)) return;
      elements.push(...await parseGroup(group, relsMap, zip, slideSize, schemeColors, themeFonts, baseDir, true));
      return;
    }
    if (el) elements.push(el);
  };

  if (ordered.length > 0) {
    for (const item of ordered) await visit(item.tag, item.index);
    return elements;
  }

  for (let i = 0; i < (shapes?.length ?? 0); i++) await visit('sp', i);
  for (let i = 0; i < (connectors?.length ?? 0); i++) await visit('cxnSp', i);
  for (let i = 0; i < (pics?.length ?? 0); i++) await visit('pic', i);
  for (let i = 0; i < (frames?.length ?? 0); i++) await visit('graphicFrame', i);
  for (let i = 0; i < (groups?.length ?? 0); i++) await visit('grpSp', i);
  return elements;
}

async function extractBackgroundInfo(
  cSld: Record<string, unknown> | undefined,
  relsMap: Map<string, string>,
  zip: JSZip,
  baseDir: string,
  schemeColors?: PptxSchemeColors,
): Promise<SlideBackgroundInfo> {
  const bg = cSld?.['p:bg'] as Record<string, unknown> | undefined;
  const bgPr = bg?.['p:bgPr'] as Record<string, unknown> | undefined;
  const background = extractSolidColor(bgPr?.['a:solidFill'], schemeColors);
  const backgroundImage = await extractBackgroundImage(bgPr, relsMap, zip, baseDir);
  return {
    ...(background ? { background } : {}),
    ...(backgroundImage ? { backgroundImage } : {}),
  };
}

function imageMimeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? 'png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'bmp') return 'image/bmp';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'webp') return 'image/webp';
  return 'image/png';
}

async function imageDataUrlFromZip(zip: JSZip, absPath: string): Promise<string | undefined> {
  const mediaFile = zip.file(absPath);
  if (!mediaFile) return undefined;
  const u8 = await mediaFile.async('uint8array');
  const dataUrl = `data:${imageMimeFromPath(absPath)};base64,${uint8ArrayToBase64(u8)}`;
  return isSafeImageSrc(dataUrl) ? dataUrl : undefined;
}

async function imageSourceFromRelationship(
  relsMap: Map<string, string>,
  zip: JSZip,
  rId: string | undefined,
  baseDir = 'ppt/slides',
): Promise<string | undefined> {
  if (!rId) return undefined;
  const target = relsMap.get(rId);
  if (!target) return undefined;
  if (/^https?:\/\/\S+$/i.test(target.trim()) && isSafeImageSrc(target)) return target.trim();
  const absPath = resolvePptxTarget(baseDir, target);
  return imageDataUrlFromZip(zip, absPath);
}

async function imageSourceFromBlip(
  blip: Record<string, unknown> | undefined,
  relsMap: Map<string, string>,
  zip: JSZip,
  baseDir = 'ppt/slides',
): Promise<string | undefined> {
  const candidates = [
    blip?.['@_r:embed'],
    blip?.['@_r:link'],
    blip?.['@_xmlns:r'],
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  for (const rId of Array.from(new Set(candidates))) {
    const source = await imageSourceFromRelationship(relsMap, zip, rId, baseDir);
    if (source) return source;
  }
  return undefined;
}

async function extractBackgroundImage(
  bgPr: Record<string, unknown> | undefined,
  relsMap: Map<string, string>,
  zip: JSZip,
  baseDir = 'ppt/slides',
): Promise<string | undefined> {
  const blipFill = bgPr?.['a:blipFill'] as Record<string, unknown> | undefined;
  const blip = blipFill?.['a:blip'] as Record<string, unknown> | undefined;
  return imageSourceFromBlip(blip, relsMap, zip, baseDir);
}

function extractTableElement(
  graphicData: Record<string, unknown> | undefined,
  relsMap?: Map<string, string>,
  schemeColors?: PptxSchemeColors,
  themeFonts?: PptxThemeFonts,
): Pick<SlideTableEl, 'rows' | 'colWidthsPct' | 'rowHeightsPct' | 'borderColor' | 'headerRow'> | null {
  const tbl = graphicData?.['a:tbl'] as Record<string, unknown> | undefined;
  if (!tbl) return null;
  const rows = asArray<Record<string, unknown>>(tbl?.['a:tr']);
  const gridCols = asArray<Record<string, unknown>>((tbl['a:tblGrid'] as Record<string, unknown> | undefined)?.['a:gridCol']);
  const colWidths = gridCols.map((col) => Number(col['@_w'])).filter((w) => Number.isFinite(w) && w > 0);
  const rowHeights = rows.map((row) => Number(row['@_h'])).filter((h) => Number.isFinite(h) && h > 0);
  const cells: SlideTableEl['rows'] = [];

  for (const row of rows) {
    const rowCells = asArray<Record<string, unknown>>(row['a:tc']).flatMap((cell) => {
      if (attrBool(cell['@_hMerge']) || attrBool(cell['@_vMerge'])) return [];
      const info = extractTextInfo(cell['a:txBody'], relsMap, schemeColors, themeFonts);
      const tcPr = cell['a:tcPr'] as Record<string, unknown> | undefined;
      const bgColor = extractSolidColor(tcPr?.['a:solidFill'], schemeColors);
      const colspan = safeTableSpan(cell['@_gridSpan']);
      const rowspan = safeTableSpan(cell['@_rowSpan']);
      return [{
        text: info.content.replace(/\t/g, ' ').trim(),
        ...(info.style.hyperlink ? { hyperlink: info.style.hyperlink } : {}),
        ...(bgColor ? { bgColor } : {}),
        ...(info.style.fontSizeRem ? { fontSizeRem: info.style.fontSizeRem } : {}),
        ...(info.style.textColor ? { textColor: info.style.textColor } : {}),
        ...(info.style.fontFamily ? { fontFamily: info.style.fontFamily } : {}),
        ...(info.style.bold !== undefined ? { bold: info.style.bold } : {}),
        ...(info.style.italic !== undefined ? { italic: info.style.italic } : {}),
        ...(info.style.underline !== undefined ? { underline: info.style.underline } : {}),
        ...(info.style.align ? { align: info.style.align } : {}),
        ...(colspan > 1 ? { colspan } : {}),
        ...(rowspan > 1 ? { rowspan } : {}),
      }];
    });
    if (rowCells.length > 0) cells.push(rowCells);
  }

  if (cells.length === 0) return null;
  return {
    rows: cells,
    ...(colWidths.length > 0 ? { colWidthsPct: normalizePartPercents(colWidths) } : {}),
    ...(rowHeights.length === cells.length ? { rowHeightsPct: normalizePartPercents(rowHeights) } : {}),
    borderColor: '#CBD5E1',
    headerRow: cells[0]?.some((cell) => cell.bold) || undefined,
  };
}

function normalizePartPercents(values: number[]): number[] {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (!Number.isFinite(total) || total <= 0) return [];
  return values.map((v) => (v / total) * 100);
}

function safeTableSpan(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 1 ? Math.floor(n) : 1;
}

function parseShape(
  sp: Record<string, unknown>,
  slideSize: SlideSizeEmu,
  relsMap?: Map<string, string>,
  schemeColors?: PptxSchemeColors,
  themeFonts?: PptxThemeFonts,
): SlideElement | null {
  // ?꾩튂
  const spPr = sp['p:spPr'] as Record<string, unknown> | undefined;
  const xfrm = spPr?.['a:xfrm'] as Record<string, unknown> | undefined;
  const off = xfrm?.['a:off'] as Record<string, unknown> | undefined;
  const ext = xfrm?.['a:ext'] as Record<string, unknown> | undefined;

  const xEmu = Number(off?.['@_x'] ?? 0);
  const yEmu = Number(off?.['@_y'] ?? 0);
  const cxEmu = Number(ext?.['@_cx'] ?? slideSize.width * 0.3);
  const cyEmu = Number(ext?.['@_cy'] ?? slideSize.height * 0.1);

  const xPct = clampPct((xEmu / slideSize.width) * 100);
  const yPct = clampPct((yEmu / slideSize.height) * 100);
  const wPct = clampPct((cxEmu / slideSize.width) * 100);
  const hPct = clampPct((cyEmu / slideSize.height) * 100);
  // ?뚯쟾: rot = 60000 ?⑥쐞. xfrm[@rot] ?먮뒗 ?놁쓬.
  const rotRaw = xfrm?.['@_rot'];
  const rotation = rotRaw != null ? ((Number(rotRaw) / 60000) % 360 + 360) % 360 : undefined;
  const locked = extractObjectLocked(sp);
  const shapeHyperlink = extractNonVisualHyperlink(extractNonVisualDrawingProps(sp), relsMap);

  // ?띿뒪??異붿텧
  const txBody = sp['p:txBody'] as Record<string, unknown> | undefined;
  if (txBody) {
    const textInfo = extractTextInfo(txBody, relsMap, schemeColors, themeFonts);
    if (textInfo.content.trim()) {
      const bgColor = extractSolidColor(spPr?.['a:solidFill'], schemeColors);
      return {
        id: newId('el'),
        type: 'text',
        xPct, yPct, wPct: Math.max(wPct, 15), hPct: Math.max(hPct, 8),
        rotation,
        ...(locked ? { locked: true } : {}),
        content: textInfo.content.trim(),
        fontSizeRem: textInfo.style.fontSizeRem ?? 1.5,
        ...(textInfo.style.bold !== undefined ? { bold: textInfo.style.bold } : {}),
        ...(textInfo.style.italic !== undefined ? { italic: textInfo.style.italic } : {}),
        ...(textInfo.style.underline !== undefined ? { underline: textInfo.style.underline } : {}),
        ...(textInfo.style.textColor ? { textColor: textInfo.style.textColor } : {}),
        ...(textInfo.style.fontFamily ? { fontFamily: textInfo.style.fontFamily } : {}),
        ...(textInfo.style.hyperlink ?? shapeHyperlink ? { hyperlink: textInfo.style.hyperlink ?? shapeHyperlink } : {}),
        ...(textInfo.style.align ? { align: textInfo.style.align } : {}),
        ...(textInfo.style.lineHeight ? { lineHeight: textInfo.style.lineHeight } : {}),
        ...(textInfo.style.listStyle ? { listStyle: textInfo.style.listStyle } : {}),
        ...(textInfo.style.listStart ? { listStart: textInfo.style.listStart } : {}),
        ...(bgColor ? { bgColor } : {}),
      };
    }
  }

  // ?꾪삎 (?띿뒪???녾퀬 prstGeom ?덉쑝硫?
  const prstGeom = spPr?.['a:prstGeom'] as Record<string, unknown> | undefined;
  if (prstGeom) {
    const prst = prstGeom['@_prst'] as string | undefined;
    const fillColor = spPr?.['a:noFill'] !== undefined
      ? 'transparent'
      : extractSolidColor(spPr?.['a:solidFill'], schemeColors) ?? 'hsl(200 75% 60%)';
    const line = parseLineStyle(spPr?.['a:ln'], schemeColors);

    let type: ShapeType = 'rect';
    let borderRadius: number | undefined;
    if (prst === 'ellipse' || prst === 'oval') type = 'ellipse';
    else if (prst === 'roundRect') { type = 'rect'; borderRadius = 12; }  // ?κ렐 ?ш컖????rect + 諛섍꼍
    else if (prst === 'triangle' || prst === 'rtTriangle') type = 'triangle';
    else if (prst === 'line' || prst === 'straightConnector1') type = 'line';
    else if (prst === 'rightArrow' || prst === 'straightArrow' || prst === 'leftRightArrow') type = 'arrow';

    return {
      id: newId('el'),
      type,
      xPct,
      yPct,
      wPct: type === 'line' ? wPct : Math.max(wPct, 10),
      hPct: type === 'line' ? hPct : Math.max(hPct, 5),
      rotation,
      ...(locked ? { locked: true } : {}),
      fillColor,
      ...(line.strokeColor ? { strokeColor: line.strokeColor } : {}),
      ...(line.strokeWidth ? { strokeWidth: line.strokeWidth } : {}),
      ...(borderRadius != null ? { borderRadius } : {}),
      ...(shapeHyperlink ? { hyperlink: shapeHyperlink } : {}),
    } as SlideShapeEl;
  }

  return null;
}

/** p:pic ??SlideImageEl (data URL) ??rId 留ㅽ븨?쇰줈 ZIP ??誘몃뵒??異붿텧 */
function srcRectPct(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return clampPct(n / 1000);
}

function extractImageCrop(blipFill: Record<string, unknown> | undefined): SlideImageCrop | undefined {
  const srcRect = blipFill?.['a:srcRect'] as Record<string, unknown> | undefined;
  if (!srcRect) return undefined;
  const crop: SlideImageCrop = {};
  const leftPct = srcRectPct(srcRect['@_l']);
  const topPct = srcRectPct(srcRect['@_t']);
  const rightPct = srcRectPct(srcRect['@_r']);
  const bottomPct = srcRectPct(srcRect['@_b']);
  if (leftPct) crop.leftPct = leftPct;
  if (topPct) crop.topPct = topPct;
  if (rightPct) crop.rightPct = rightPct;
  if (bottomPct) crop.bottomPct = bottomPct;
  return Object.keys(crop).length ? crop : undefined;
}

async function parsePic(
  pic: Record<string, unknown>,
  relsMap: Map<string, string>,
  zip: JSZip,
  slideSize: SlideSizeEmu,
  baseDir = 'ppt/slides',
): Promise<SlideImageEl | null> {
  // ?꾩튂: p:spPr/a:xfrm
  const spPr = pic['p:spPr'] as Record<string, unknown> | undefined;
  const xfrm = spPr?.['a:xfrm'] as Record<string, unknown> | undefined;
  const off = xfrm?.['a:off'] as Record<string, unknown> | undefined;
  const ext = xfrm?.['a:ext'] as Record<string, unknown> | undefined;
  const xEmu = Number(off?.['@_x'] ?? 0);
  const yEmu = Number(off?.['@_y'] ?? 0);
  const cxEmu = Number(ext?.['@_cx'] ?? slideSize.width * 0.3);
  const cyEmu = Number(ext?.['@_cy'] ?? slideSize.height * 0.3);
  const rotRaw = xfrm?.['@_rot'];
  const rotation = rotRaw != null ? ((Number(rotRaw) / 60000) % 360 + 360) % 360 : undefined;
  const locked = extractObjectLocked(pic);
  const nvPicPr = pic['p:nvPicPr'] as Record<string, unknown> | undefined;
  const cNvPr = nvPicPr?.['p:cNvPr'] as Record<string, unknown> | undefined;
  const alt = extractPicAlt(cNvPr);
  const hyperlink = extractNonVisualHyperlink(cNvPr, relsMap);

  // rId: p:blipFill/a:blip[@r:embed]
  const blipFill = pic['p:blipFill'] as Record<string, unknown> | undefined;
  const crop = extractImageCrop(blipFill);
  const blip = blipFill?.['a:blip'] as Record<string, unknown> | undefined;
  const src = await imageSourceFromBlip(blip, relsMap, zip, baseDir);
  if (!src) return null;

  // ?대?吏 ??base64 ??data URL
  return {
    id: newId('el'),
    type: 'image',
    xPct: clampPct((xEmu / slideSize.width) * 100),
    yPct: clampPct((yEmu / slideSize.height) * 100),
    wPct: clampPct((cxEmu / slideSize.width) * 100),
    hPct: clampPct((cyEmu / slideSize.height) * 100),
    rotation,
    ...(locked ? { locked: true } : {}),
    ...(alt ? { alt } : {}),
    ...(hyperlink ? { hyperlink } : {}),
    ...(crop ? { crop } : {}),
    src,
  };
}

function extractPicAlt(cNvPr: Record<string, unknown> | undefined): string | undefined {
  for (const key of ['@_descr', '@_title']) {
    const value = cNvPr?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function hasPlaceholder(node: Record<string, unknown>): boolean {
  for (const key of ['p:nvSpPr', 'p:nvCxnSpPr', 'p:nvPicPr', 'p:nvGraphicFramePr']) {
    const nv = node[key] as Record<string, unknown> | undefined;
    const nvPr = nv?.['p:nvPr'] as Record<string, unknown> | undefined;
    if (nvPr?.['p:ph'] !== undefined) return true;
  }
  return false;
}

function extractNonVisualDrawingProps(node: Record<string, unknown>): Record<string, unknown> | undefined {
  const nvSpPr = node['p:nvSpPr'] as Record<string, unknown> | undefined;
  const nvCxnSpPr = node['p:nvCxnSpPr'] as Record<string, unknown> | undefined;
  return (nvSpPr?.['p:cNvPr'] ?? nvCxnSpPr?.['p:cNvPr']) as Record<string, unknown> | undefined;
}

function extractNonVisualHyperlink(cNvPr: Record<string, unknown> | undefined, relsMap?: Map<string, string>): string | undefined {
  const click = cNvPr?.['a:hlinkClick'] as Record<string, unknown> | undefined;
  const rawTarget = click?.['@_r:id']
    ? relsMap?.get(String(click['@_r:id']))
    : click?.['@_tooltip'] ?? click?.['@_action'];
  if (typeof rawTarget !== 'string') return undefined;
  const target = rawTarget.trim();
  return isSafeHref(target) ? target : undefined;
}

export function uint8ArrayToBase64(u8: Uint8Array): string {
  let out = '';
  for (let i = 0; i < u8.byteLength; i += BASE64_CHUNK_BYTES) {
    const chunk = u8.subarray(i, Math.min(i + BASE64_CHUNK_BYTES, u8.byteLength));
    let binary = '';
    for (let j = 0; j < chunk.byteLength; j += 1) {
      binary += String.fromCharCode(chunk[j]);
    }
    out += btoa(binary);
  }
  return out;
}

/** notesSlideN.xml ?먯꽌 諛쒗몴???명듃 ?띿뒪??異붿텧 ??txBody ??paragraphs 以?placeholder 'body' 留?怨⑤씪??*/
function extractNotesText(xml: string, parser: XMLParser): string {
  try {
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['p:notes'] ?? parsed.notes) as Record<string, unknown> | undefined;
    const cSld = root?.['p:cSld'] as Record<string, unknown> | undefined;
    const spTree = cSld?.['p:spTree'] as Record<string, unknown> | undefined;
    const shapes = spTree?.['p:sp'] as Array<Record<string, unknown>> | undefined;
    if (!shapes) return '';
    const parts: string[] = [];
    for (const sp of shapes) {
      // Only import the speaker-notes body placeholder; skip slide-number/title placeholders.
      const nvSpPr = sp['p:nvSpPr'] as Record<string, unknown> | undefined;
      const nvPr = nvSpPr?.['p:nvPr'] as Record<string, unknown> | undefined;
      const ph = nvPr?.['p:ph'] as Record<string, unknown> | undefined;
      const phType = ph?.['@_type'] as string | undefined;
      if (phType && phType !== 'body') continue;
      const txBody = sp['p:txBody'] as Record<string, unknown> | undefined;
      if (!txBody) continue;
      parts.push(extractText(txBody));
    }
    return parts.join('\n').trim();
  } catch {
    return '';
  }
}

function extractText(node: unknown): string {
  return extractTextInfo(node).content;
}

function extractTextInfo(
  node: unknown,
  relsMap?: Map<string, string>,
  schemeColors?: PptxSchemeColors,
  themeFonts?: PptxThemeFonts,
): { content: string; style: ImportedTextStyle } {
  if (!node || typeof node !== 'object') return { content: '', style: {} };
  const parts: string[] = [];
  const style: ImportedTextStyle = {};
  // a:p (paragraph) ??a:r (run) ??a:t (text)
  const paragraphs = (node as Record<string, unknown>)['a:p'] as Array<Record<string, unknown>> | undefined;
  if (paragraphs) {
    for (const p of paragraphs) {
      if (!style.align) {
        const pPr = p['a:pPr'] as Record<string, unknown> | undefined;
        style.align = mapPptAlign(pPr?.['@_algn']);
        style.lineHeight = extractLineHeight(pPr) ?? style.lineHeight;
        const listInfo = extractListStyle(pPr);
        if (listInfo.listStyle) style.listStyle = listInfo.listStyle;
        if (listInfo.listStart) style.listStart = listInfo.listStart;
        applyRunStyle(style, pPr?.['a:defRPr'] as Record<string, unknown> | undefined, relsMap, schemeColors, themeFonts);
      }
      const textNodes = [
        ...asArray<Record<string, unknown>>(p['a:r']),
        ...asArray<Record<string, unknown>>(p['a:fld']),
      ];
      if (textNodes.length > 0) {
        let remainingBreaks = asArray<unknown>(p['a:br']).length;
        for (const textNode of textNodes) {
          const rPr = (textNode['a:rPr'] ?? textNode['a:pPr']) as Record<string, unknown> | undefined;
          applyRunStyle(style, rPr, relsMap, schemeColors, themeFonts);
          const text = valueText(textNode['a:t']);
          if (text) parts.push(text);
          if (remainingBreaks > 0) {
            parts.push('\n');
            remainingBreaks--;
          }
        }
        while (remainingBreaks > 0) {
          parts.push('\n');
          remainingBreaks--;
        }
      }
      parts.push('\n');
    }
  }

  return { content: parts.join('').trim(), style };
}

function extractLineHeight(pPr: Record<string, unknown> | undefined): number | undefined {
  const lnSpc = pPr?.['a:lnSpc'] as Record<string, unknown> | undefined;
  const spcPct = lnSpc?.['a:spcPct'] as Record<string, unknown> | undefined;
  const pct = Number(spcPct?.['@_val']);
  if (Number.isFinite(pct) && pct > 0) {
    return Math.max(0.5, Math.min(3, pct / 100000));
  }
  return undefined;
}

function extractListStyle(pPr: Record<string, unknown> | undefined): Pick<ImportedTextStyle, 'listStyle' | 'listStart'> {
  if (!pPr || pPr['a:buNone'] !== undefined) return {};
  if (pPr['a:buAutoNum'] && typeof pPr['a:buAutoNum'] === 'object') {
    const startAt = Number((pPr['a:buAutoNum'] as Record<string, unknown>)['@_startAt']);
    return {
      listStyle: 'number',
      ...(Number.isFinite(startAt) && startAt > 0 ? { listStart: startAt } : {}),
    };
  }
  if (pPr['a:buChar'] !== undefined || pPr['a:buBlip'] !== undefined) {
    return { listStyle: 'bullet' };
  }
  return {};
}

function applyRunStyle(
  style: ImportedTextStyle,
  rPr: Record<string, unknown> | undefined,
  relsMap?: Map<string, string>,
  schemeColors?: PptxSchemeColors,
  themeFonts?: PptxThemeFonts,
): void {
  if (!rPr) return;

  const sz = Number(rPr['@_sz']);
  if (style.fontSizeRem === undefined && Number.isFinite(sz) && sz > 0) {
    style.fontSizeRem = Math.max(0.5, Math.min(8, sz / 100 / 12));
  }

  if (style.bold === undefined && rPr['@_b'] !== undefined) style.bold = attrBool(rPr['@_b']);
  if (style.italic === undefined && rPr['@_i'] !== undefined) style.italic = attrBool(rPr['@_i']);
  if (style.underline === undefined && rPr['@_u'] !== undefined) {
    const u = String(rPr['@_u']);
    style.underline = u !== 'none' && u !== '0' && u !== 'false';
  }

  if (!style.textColor) {
    const color = extractSolidColor(rPr['a:solidFill'], schemeColors);
    if (color) style.textColor = color;
  }

  if (!style.fontFamily) {
    const fontFamily = extractRunFontFamily(rPr, themeFonts);
    if (fontFamily) style.fontFamily = fontFamily;
  }

  if (!style.hyperlink) {
    const hyperlink = extractRunHyperlink(rPr, relsMap);
    if (hyperlink) style.hyperlink = hyperlink;
  }
}

function extractRunHyperlink(rPr: Record<string, unknown>, relsMap?: Map<string, string>): string | undefined {
  const click = rPr['a:hlinkClick'] as Record<string, unknown> | undefined;
  const rawTarget = click?.['@_r:id'] && relsMap
    ? relsMap.get(String(click['@_r:id']))
    : click?.['@_tooltip'] ?? click?.['@_action'];
  if (typeof rawTarget !== 'string') return undefined;
  const target = rawTarget.trim();
  return isSafeHref(target) ? target : undefined;
}

function extractRunFontFamily(rPr: Record<string, unknown>, themeFonts?: PptxThemeFonts): string | undefined {
  const candidates = [rPr['a:latin'], rPr['a:ea'], rPr['a:cs']];
  for (const item of candidates) {
    const typeface = (item as Record<string, unknown> | undefined)?.['@_typeface'];
    if (typeof typeface === 'string' && typeface.trim() && !typeface.startsWith('+')) {
      return typeface.trim();
    }
    const resolved = resolveThemeTypeface(typeface, themeFonts);
    if (resolved) return resolved;
  }
  return undefined;
}

function resolveThemeTypeface(typeface: unknown, themeFonts?: PptxThemeFonts): string | undefined {
  if (typeof typeface !== 'string' || !typeface.startsWith('+') || !themeFonts) return undefined;
  switch (typeface) {
    case '+mj-lt':
      return themeFonts.majorLatin;
    case '+mn-lt':
      return themeFonts.minorLatin;
    case '+mj-ea':
      return themeFonts.majorEastAsian;
    case '+mn-ea':
      return themeFonts.minorEastAsian;
    case '+mj-cs':
      return themeFonts.majorComplexScript;
    case '+mn-cs':
      return themeFonts.minorComplexScript;
    default:
      return undefined;
  }
}

function attrBool(value: unknown): boolean {
  if (value === true || value === 1) return true;
  const s = String(value).toLowerCase();
  return s === '1' || s === 'true';
}

function extractObjectLocked(node: unknown): boolean {
  const lockAttrs = new Set([
    '@_noSelect',
    '@_noMove',
    '@_noResize',
    '@_noRot',
    '@_noTextEdit',
    '@_noEditPoints',
    '@_noAdjustHandles',
    '@_noChangeShapeType',
  ]);
  const visit = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.some(visit);
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (lockAttrs.has(key) && attrBool(child)) return true;
      if (key.endsWith('Locks') && visit(child)) return true;
      if (typeof child === 'object' && child !== null && visit(child)) return true;
    }
    return false;
  };
  return visit(node);
}

function asArray<T>(value: unknown): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? (value as T[]) : [value as T];
}

function mapPptAlign(value: unknown): SlideTextEl['align'] | undefined {
  switch (value) {
    case 'ctr':
      return 'center';
    case 'r':
      return 'right';
    case 'just':
    case 'dist':
      return 'justify';
    case 'l':
      return 'left';
    default:
      return undefined;
  }
}

function extractSolidColor(fill: unknown, schemeColors?: PptxSchemeColors): string | undefined {
  if (!fill || typeof fill !== 'object') return undefined;
  const srgb = (fill as Record<string, unknown>)['a:srgbClr'] as Record<string, unknown> | undefined;
  const value = srgb?.['@_val'];
  if (typeof value === 'string' && /^[0-9a-fA-F]{6}$/.test(value)) {
    return applyColorTransforms(`#${value.toUpperCase()}`, srgb);
  }
  const scheme = (fill as Record<string, unknown>)['a:schemeClr'] as Record<string, unknown> | undefined;
  const schemeValue = scheme?.['@_val'];
  const base = typeof schemeValue === 'string' ? (schemeColors?.[schemeValue] ?? SCHEME_COLOR_FALLBACKS[schemeValue]) : undefined;
  return base ? applyColorTransforms(base, scheme) : undefined;
}

type RgbColor = { r: number; g: number; b: number };
type HslColor = { h: number; s: number; l: number };

function applyColorTransforms(hex: string, colorNode: Record<string, unknown> | undefined): string {
  if (!colorNode) return hex;
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  let next = rgb;
  for (const key of Object.keys(colorNode)) {
    for (const transform of asArray<Record<string, unknown>>(colorNode[key])) {
      const pct = ooxmlPct(transform?.['@_val']);
      if (pct == null) continue;
      if (key === 'a:shade') next = mixRgb(next, { r: 0, g: 0, b: 0 }, 1 - pct);
      if (key === 'a:tint') next = mixRgb(next, { r: 255, g: 255, b: 255 }, 1 - pct);
      if (key === 'a:lumMod') {
        const hsl = rgbToHsl(next);
        next = hslToRgb({ ...hsl, l: clampUnit(hsl.l * pct) });
      }
      if (key === 'a:lumOff') {
        const hsl = rgbToHsl(next);
        next = hslToRgb({ ...hsl, l: clampUnit(hsl.l + pct) });
      }
    }
  }
  return rgbToHex(next);
}

function ooxmlPct(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? clampUnit(n / 100000) : undefined;
}

function hexToRgb(hex: string): RgbColor | undefined {
  const m = hex.match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return undefined;
  const value = m[1];
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex(rgb: RgbColor): string {
  const part = (value: number) => Math.round(clampByte(value)).toString(16).padStart(2, '0').toUpperCase();
  return `#${part(rgb.r)}${part(rgb.g)}${part(rgb.b)}`;
}

function mixRgb(from: RgbColor, to: RgbColor, amount: number): RgbColor {
  const t = clampUnit(amount);
  return {
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
  };
}

function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  if (max === gn) h = (bn - rn) / d + 2;
  if (max === bn) h = (rn - gn) / d + 4;
  return { h: h / 6, s, l };
}

function hslToRgb({ h, s, l }: HslColor): RgbColor {
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hueToRgb = (tRaw: number) => {
    let t = tRaw;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return {
    r: hueToRgb(h + 1 / 3) * 255,
    g: hueToRgb(h) * 255,
    b: hueToRgb(h - 1 / 3) * 255,
  };
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function parseLineStyle(line: unknown, schemeColors?: PptxSchemeColors): { strokeColor?: string; strokeWidth?: number } {
  if (!line || typeof line !== 'object') return {};
  const rec = line as Record<string, unknown>;
  const strokeColor = extractSolidColor(rec['a:solidFill'], schemeColors);
  const widthRaw = Number(rec['@_w']);
  const strokeWidth = Number.isFinite(widthRaw) && widthRaw > 0
    ? Math.max(1, Math.round(widthRaw / 12700))
    : undefined;
  return {
    ...(strokeColor ? { strokeColor } : {}),
    ...(strokeWidth ? { strokeWidth } : {}),
  };
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/** CSS ????pptx 6?먮━ hex. rgba/hsl/吏㏃? hex ?깆? fallback ?ъ슜. */
function pptxColor(css: string, fallback: string): string {
  if (!css) return fallback;
  if (css.trim().toLowerCase() === 'transparent') return fallback;
  const m = css.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (m) return m[1].toUpperCase();
  const m3 = css.trim().match(/^#([0-9a-fA-F]{3})$/);
  if (m3) {
    const [r, g, b] = m3[1];
    return `${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  // rgba/hsl ??蹂듭옟???됱? 泥??명솚?섎뒗 媛믪쑝濡?  return fallback;
}

function pptxFill(css: string, fallback: string): { color: string; transparency?: number } {
  if (css.trim().toLowerCase() === 'transparent') {
    return { color: fallback, transparency: 100 };
  }
  return { color: pptxColor(css, fallback) };
}

/** CSS font-family ??pptx fontFace (泥??⑤?由?異붿텧, ?곗샂???쒓굅). */
function pptxFontFace(family: string): string {
  const first = family.split(',')[0]?.trim() ?? 'Pretendard';
  return first.replace(/^['"]|['"]$/g, '');
}

export function pptxImageSource(src: string): { data: string } | { path: string } | null {
  const trimmed = src.trim();
  if (/^data:image\/(png|jpe?g|gif|webp|bmp|x-ms-bmp);base64,/i.test(trimmed)) return { data: trimmed };
  if (/^https?:\/\/\S+$/i.test(trimmed)) return { path: trimmed };
  return null;
}

export function pptxHyperlink(url: string | undefined): { url: string; tooltip: string } | undefined {
  if (!url || !isSafeHref(url)) return undefined;
  const safeUrl = url.trim();
  return { url: safeUrl, tooltip: safeUrl };
}

function internalSlideNumberFromHref(href: string | undefined): number | undefined {
  const trimmed = href?.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/^(?:#slide[=-]|slide:)(\d+)$/i);
  const slideNo = Number(match?.[1]);
  return Number.isFinite(slideNo) && slideNo > 0 ? Math.floor(slideNo) : undefined;
}

function hasInternalSlideLinks(slide: Slide): boolean {
  return slide.elements.some((el) => {
    if ('hyperlink' in el && internalSlideNumberFromHref(el.hyperlink)) return true;
    if (el.type === 'table') {
      return el.rows.some((row) => row.some((cell) => !!internalSlideNumberFromHref(cell.hyperlink)));
    }
    return false;
  });
}

export function patchSlideImageCropsXml(xml: string, imageSrcRects: Array<PptxSrcRect | undefined>): string {
  if (!imageSrcRects.some(Boolean)) return xml;
  let imageIdx = 0;
  return xml.replace(/<p:pic\b[\s\S]*?<\/p:pic>/g, (picXml) => {
    const srcRect = imageSrcRects[imageIdx];
    imageIdx += 1;
    const srcRectMarkup = pptxSrcRectXml(srcRect);
    if (!srcRectMarkup) return picXml;

    if (/<a:srcRect\b[^>]*\/>/.test(picXml)) {
      return picXml.replace(/<a:srcRect\b[^>]*\/>/, srcRectMarkup);
    }
    if (picXml.includes('<a:stretch><a:fillRect/></a:stretch>')) {
      return picXml.replace('<a:stretch><a:fillRect/></a:stretch>', `${srcRectMarkup}<a:stretch><a:fillRect/></a:stretch>`);
    }
    if (picXml.includes('<a:stretch/>')) {
      return picXml.replace('<a:stretch/>', `${srcRectMarkup}<a:stretch/>`);
    }
    return picXml;
  });
}

export function patchSlideTransitionXml(xml: string, transition: SlideTransition | undefined): string {
  if (!transition) return xml;
  const transitionXml = pptxTransitionXml(transition);
  const withoutExisting = xml.replace(/\s*<p:transition\b[\s\S]*?<\/p:transition>/, '')
    .replace(/\s*<p:transition\b[^>]*\/>/, '');
  if (withoutExisting.includes('</p:cSld>')) {
    return withoutExisting.replace('</p:cSld>', `</p:cSld>${transitionXml}`);
  }
  return withoutExisting.replace(/<p:sld\b([^>]*)>/, `<p:sld$1>${transitionXml}`);
}

export function patchSlideHiddenXml(xml: string, hidden: boolean | undefined): string {
  return xml.replace(/<p:sld\b([^>]*)>/, (_match, attrs: string) => {
    const nextAttrs = String(attrs).replace(/\s+show="[^"]*"/, '');
    return `<p:sld${nextAttrs}${hidden ? ' show="0"' : ''}>`;
  });
}

function xmlAttr(attrs: string, name: string): string | undefined {
  return attrs.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
}

export function patchSlideInternalLinkRelsXml(relsXml: string, slideCount: number): { xml: string; relIds: Set<string> } {
  const relIds = new Set<string>();
  const xml = relsXml.replace(/<Relationship\b([^>]*)\/>/g, (tag, attrs: string) => {
    const id = xmlAttr(attrs, 'Id');
    const target = xmlAttr(attrs, 'Target');
    const slideNo = internalSlideNumberFromHref(target);
    if (!id || !slideNo || slideNo > slideCount) return tag;
    relIds.add(id);

    let nextAttrs = attrs
      .replace(/\sType="[^"]*"/, ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"')
      .replace(/\sTarget="[^"]*"/, ` Target="../slides/slide${slideNo}.xml"`)
      .replace(/\sTargetMode="[^"]*"/g, '');
    if (!/\sType="/.test(nextAttrs)) nextAttrs += ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"';
    if (!/\sTarget="/.test(nextAttrs)) nextAttrs += ` Target="../slides/slide${slideNo}.xml"`;
    return `<Relationship${nextAttrs}/>`;
  });
  return { xml, relIds };
}

export function patchSlideInternalLinksXml(xml: string, relIds: Set<string>): string {
  if (relIds.size === 0) return xml;
  return xml.replace(/<a:hlinkClick\b([^>]*)>/g, (tag, attrs: string) => {
    const relId = xmlAttr(attrs, 'r:id');
    if (!relId) return tag;
    if (!relIds.has(relId)) return tag;
    const selfClosing = /\/>$/.test(tag);
    const cleanAttrs = attrs.replace(/\s*\/\s*$/, '');
    const nextAttrs = /\saction="/.test(cleanAttrs)
      ? cleanAttrs.replace(/\saction="[^"]*"/, ' action="ppaction://hlinksldjump"')
      : `${cleanAttrs} action="ppaction://hlinksldjump"`;
    return `<a:hlinkClick${nextAttrs}${selfClosing ? '/>' : '>'}`;
  });
}

function pptxTransitionXml(transition: SlideTransition): string {
  const attrs: string[] = [];
  const spd = pptTransitionMsToSpeed(transition.durationMs);
  if (spd) attrs.push(`spd="${spd}"`);
  if (transition.advanceOnClick !== undefined) attrs.push(`advClick="${transition.advanceOnClick ? 1 : 0}"`);
  if (Number.isFinite(transition.advanceAfterMs) && transition.advanceAfterMs && transition.advanceAfterMs > 0) {
    attrs.push(`advTm="${Math.round(transition.advanceAfterMs)}"`);
  }
  const childAttrs = pptTransitionChildAttrs(transition);
  const child = `<p:${transition.type}${childAttrs ? ` ${childAttrs}` : ''}/>`;
  return `<p:transition${attrs.length ? ` ${attrs.join(' ')}` : ''}>${child}</p:transition>`;
}

function pptTransitionMsToSpeed(value: number | undefined): 'fast' | 'med' | 'slow' | undefined {
  if (!Number.isFinite(value)) return undefined;
  if ((value ?? 0) <= 700) return 'fast';
  if ((value ?? 0) >= 1600) return 'slow';
  return 'med';
}

function pptTransitionChildAttrs(transition: SlideTransition): string {
  const dir = pptTransitionDirectionToXml(transition.direction);
  if (!dir || transition.type === 'fade' || transition.type === 'zoom') return '';
  return `dir="${dir}"`;
}

function pptTransitionDirectionToXml(direction: SlideTransitionDirection | undefined): string | undefined {
  const map: Record<SlideTransitionDirection, string> = {
    left: 'l',
    right: 'r',
    up: 'u',
    down: 'd',
  };
  return direction ? map[direction] : undefined;
}

async function patchPptxSlidesXml(
  pptxBlob: Blob,
  slideImageSrcRects: Array<Array<PptxSrcRect | undefined>>,
  slideTransitions: Array<SlideTransition | undefined>,
  slideHidden: Array<boolean | undefined>,
  slideInternalLinks: Array<boolean | undefined>,
): Promise<Blob> {
  const needsCropPatch = slideImageSrcRects.some((srcRects) => srcRects.some(Boolean));
  const needsTransitionPatch = slideTransitions.some(Boolean);
  const needsHiddenPatch = slideHidden.some(Boolean);
  const needsInternalLinkPatch = slideInternalLinks.some(Boolean);
  if (!needsCropPatch && !needsTransitionPatch && !needsHiddenPatch && !needsInternalLinkPatch) return pptxBlob;
  const zip = await JSZip.loadAsync(pptxBlob);
  const maxSlides = Math.max(slideImageSrcRects.length, slideTransitions.length, slideHidden.length, slideInternalLinks.length);
  await Promise.all(Array.from({ length: maxSlides }, async (_, idx) => {
    const srcRects = slideImageSrcRects[idx] ?? [];
    const transition = slideTransitions[idx];
    const hidden = slideHidden[idx];
    const shouldPatchInternalLinks = !!slideInternalLinks[idx];
    if (!srcRects.some(Boolean) && !transition && !hidden && !shouldPatchInternalLinks) return;
    const path = `ppt/slides/slide${idx + 1}.xml`;
    const file = zip.file(path);
    if (!file) return;
    let xml = await file.async('string');
    if (shouldPatchInternalLinks) {
      const relsPath = `ppt/slides/_rels/slide${idx + 1}.xml.rels`;
      const relsFile = zip.file(relsPath);
      if (relsFile) {
        const relsXml = await relsFile.async('string');
        const patched = patchSlideInternalLinkRelsXml(relsXml, slideInternalLinks.length);
        if (patched.relIds.size > 0) {
          zip.file(relsPath, patched.xml);
          xml = patchSlideInternalLinksXml(xml, patched.relIds);
        }
      }
    }
    xml = patchSlideImageCropsXml(xml, srcRects);
    xml = patchSlideTransitionXml(xml, transition);
    xml = patchSlideHiddenXml(xml, hidden);
    zip.file(path, xml);
  }));
  return zip.generateAsync({ type: 'blob' });
}

export function pptxBulletOptions(
  listStyle: SlideTextEl['listStyle'],
  listStart?: number,
): { type: 'bullet' | 'number'; numberStartAt?: number } | undefined {
  if (!listStyle) return undefined;
  return {
    type: listStyle,
    ...(listStyle === 'number' && Number.isFinite(listStart) && listStart && listStart > 1
      ? { numberStartAt: Math.floor(listStart) }
      : {}),
  };
}

// ?????????????????????????????????????????????
// Export ??pptxgenjs
// ?????????????????????????????????????????????

export function pptxLineSpacingMultiple(lineHeight: number | undefined): number {
  return Math.max(0.5, Math.min(3, lineHeight ?? 1.25));
}

function partsPctToInches(parts: number[] | undefined, totalInches: number): number[] | undefined {
  if (!parts || parts.length === 0 || parts.some((p) => !Number.isFinite(p) || p <= 0)) return undefined;
  const total = parts.reduce((sum, p) => sum + p, 0);
  if (!Number.isFinite(total) || total <= 0) return undefined;
  return parts.map((p) => (p / total) * totalInches);
}

export async function exportPptxFile(
  slides: Slide[],
  fileName: string,
  themeId?: string,
  slideSize?: SlideSize,
): Promise<void> {
  const pres = new pptxgen();
  const safeSlideSize = normalizeSlideSize(slideSize);
  const W = safeSlideSize.width / PX_PER_INCH;
  const H = safeSlideSize.height / PX_PER_INCH;
  const layoutName = 'PERSONAI_CUSTOM';
  pres.defineLayout({ name: layoutName, width: W, height: H });
  pres.layout = layoutName;

  const theme = getTheme(themeId);

  // pptxgenjs 醫뚰몴: ?몄튂. 16:9 wide = 13.333 x 7.5

  // ?뚮쭏 ????pptx ?μ뒪 (#쨌rgba ?뺣━ ??pptxgenjs ??6?먮━ hex 留?諛쏆쓬)
  const themeTextHex = pptxColor(theme.textColor, '222222');
  // ?고듃: SERIF/MONO ?⑤?由ъ뿉??泥??고듃 異붿텧 (Times New Roman / Courier New / Pretendard)
  const themeFontFace = pptxFontFace(theme.bodyFontFamily);
  const slideImageSrcRects: Array<Array<PptxSrcRect | undefined>> = [];
  const slideTransitions: Array<SlideTransition | undefined> = [];
  const slideHidden: Array<boolean | undefined> = [];
  const slideInternalLinks: Array<boolean | undefined> = [];

  for (const s of slides) {
    const slide = pres.addSlide();
    const imageSrcRects: Array<PptxSrcRect | undefined> = [];
    slideImageSrcRects.push(imageSrcRects);
    slideTransitions.push(s.transition);
    slideHidden.push(s.hidden);
    slideInternalLinks.push(hasInternalSlideLinks(s));
    // ?щ씪?대뱶 諛곌꼍: ?ъ슜??紐낆떆 > ?뚮쭏 諛곌꼍
    const bg = s.background ?? theme.bgColor;
    const backgroundImageSource = s.backgroundImage ? pptxImageSource(s.backgroundImage) : null;
    slide.background = backgroundImageSource ?? { color: pptxColor(bg, 'FFFFFF') };
    if (s.notes && s.notes.trim()) {
      slide.addNotes(s.notes);
    }
    for (const el of s.elements) {
      const x = (el.xPct / 100) * W;
      const y = (el.yPct / 100) * H;
      const w = (el.wPct / 100) * W;
      const h = (el.hPct / 100) * H;

      const rotate = el.rotation && el.rotation !== 0 ? el.rotation : undefined;

      if (el.type === 'text') {
        slide.addText(el.content, {
          x, y, w, h, rotate,
          fontSize: Math.round(el.fontSizeRem * 12), // 1rem ??12pt
          bold: el.bold,
          italic: el.italic,
          underline: el.underline ? { style: 'sng' } : undefined,
          align: el.align ?? 'left',
          lineSpacingMultiple: pptxLineSpacingMultiple(el.lineHeight),
          color: el.textColor ? pptxColor(el.textColor, themeTextHex) : themeTextHex,
          valign: 'top',
          fontFace: pptxFontFace(el.fontFamily ?? theme.bodyFontFamily) || themeFontFace,
          margin: [4, 6, 4, 6],
          ...(pptxHyperlink(el.hyperlink) ? { hyperlink: pptxHyperlink(el.hyperlink) } : {}),
          ...(pptxBulletOptions(el.listStyle, el.listStart) ? { bullet: pptxBulletOptions(el.listStyle, el.listStart) } : {}),
          ...(el.bgColor ? { fill: pptxFill(el.bgColor, 'FFFFFF') } : {}),
        });
      } else if (el.type === 'rect') {
        const hyperlink = pptxHyperlink(el.hyperlink);
        slide.addShape(pres.ShapeType.rect, {
          x, y, w, h, rotate,
          fill: pptxFill(el.fillColor, '3B82F6'),
          line: el.strokeColor
            ? { color: pptxColor(el.strokeColor, '3B82F6'), width: el.strokeWidth ?? 2 }
            : { color: 'FFFFFF', width: 0 },
          ...(hyperlink ? { hyperlink } : {}),
        });
      } else if (el.type === 'ellipse') {
        const hyperlink = pptxHyperlink(el.hyperlink);
        slide.addShape(pres.ShapeType.ellipse, {
          x, y, w, h, rotate,
          fill: pptxFill(el.fillColor, 'F59E0B'),
          line: el.strokeColor
            ? { color: pptxColor(el.strokeColor, 'F59E0B'), width: el.strokeWidth ?? 2 }
            : { color: 'FFFFFF', width: 0 },
          ...(hyperlink ? { hyperlink } : {}),
        });
      } else if (el.type === 'triangle') {
        const hyperlink = pptxHyperlink(el.hyperlink);
        slide.addShape(pres.ShapeType.triangle, {
          x, y, w, h, rotate,
          fill: pptxFill(el.fillColor, '34D399'),
          line: el.strokeColor
            ? { color: pptxColor(el.strokeColor, '34D399'), width: el.strokeWidth ?? 2 }
            : { color: 'FFFFFF', width: 0 },
          ...(hyperlink ? { hyperlink } : {}),
        });
      } else if (el.type === 'line') {
        const hyperlink = pptxHyperlink(el.hyperlink);
        slide.addShape(pres.ShapeType.line, {
          x, y, w, h, rotate,
          line: {
            color: pptxColor(el.strokeColor ?? el.fillColor, '222222'),
            width: el.strokeWidth ?? 2,
          },
          ...(hyperlink ? { hyperlink } : {}),
        });
      } else if (el.type === 'arrow') {
        const hyperlink = pptxHyperlink(el.hyperlink);
        slide.addShape(pres.ShapeType.rightArrow, {
          x, y, w, h, rotate,
          fill: pptxFill(el.strokeColor ?? el.fillColor, '222222'),
          line: { color: pptxColor(el.strokeColor ?? el.fillColor, '222222'), width: el.strokeWidth ?? 2 },
          ...(hyperlink ? { hyperlink } : {}),
        });
      } else if (el.type === 'image') {
        const source = pptxImageSource(el.src);
        if (source) {
          imageSrcRects.push(imageCropToPptxSrcRect(el.crop));
          const hyperlink = pptxHyperlink(el.hyperlink);
          slide.addImage({
            ...source,
            x, y, w, h, rotate,
            ...(el.alt ? { altText: el.alt } : {}),
            ...(hyperlink ? { hyperlink } : {}),
          });
        }
      } else if (el.type === 'table') {
        const tableRows = el.rows.map((row, rowIdx) => row.map((cell) => {
          const hyperlink = pptxHyperlink(cell.hyperlink);
          return {
            text: cell.text,
            options: {
              fontSize: Math.round((cell.fontSizeRem ?? 0.82) * 12),
              fontFace: pptxFontFace(cell.fontFamily ?? theme.bodyFontFamily) || themeFontFace,
              bold: cell.bold || (el.headerRow && rowIdx === 0),
              italic: cell.italic,
              underline: cell.underline ? { style: 'sng' } : undefined,
              color: cell.textColor ? pptxColor(cell.textColor, themeTextHex) : themeTextHex,
              align: cell.align ?? 'left',
              valign: 'mid',
              margin: [0.04, 0.06, 0.04, 0.06],
              fill: cell.bgColor
                ? pptxFill(cell.bgColor, 'FFFFFF')
                : el.headerRow && rowIdx === 0
                  ? { color: 'F1F5F9' }
                  : undefined,
              ...(hyperlink ? { hyperlink } : {}),
              ...(cell.colspan && cell.colspan > 1 ? { colspan: Math.floor(cell.colspan) } : {}),
              ...(cell.rowspan && cell.rowspan > 1 ? { rowspan: Math.floor(cell.rowspan) } : {}),
            },
          };
        }));
        slide.addTable(tableRows, {
          x, y, w, h,
          rotate,
          margin: [0.04, 0.06, 0.04, 0.06],
          border: { color: pptxColor(el.borderColor ?? '#CBD5E1', 'CBD5E1'), width: 0.75 },
          colW: partsPctToInches(el.colWidthsPct, w),
          rowH: partsPctToInches(el.rowHeightsPct, h),
        });
      } else if (el.type === 'chart') {
        const chartType = el.chartType === 'line'
          ? pres.ChartType.line
          : el.chartType === 'pie'
            ? pres.ChartType.pie
            : pres.ChartType.bar;
        const chartData = el.series.map((series) => ({
          name: series.name,
          labels: el.categories,
          values: series.values,
        }));
        const chartColorCount = el.chartType === 'pie'
          ? Math.max(el.categories.length, el.series[0]?.values.length ?? 0, 1)
          : Math.max(el.series.length, 1);
        slide.addChart(chartType, chartData, {
          x, y, w, h,
          showLegend: el.series.length > 1,
          showTitle: !!el.title,
          title: el.title,
          chartColors: Array.from({ length: chartColorCount }, (_, idx) => {
            const color = el.series[idx]?.color ?? CHART_COLORS[idx % CHART_COLORS.length];
            return pptxColor(color, CHART_COLORS[idx % CHART_COLORS.length].slice(1));
          }),
        });
      }
    }
  }

  const safeName = (fileName.endsWith('.pptx') ? fileName : `${fileName}.pptx`).replace(/[\\/:*?"<>|]/g, '_');
  if (slideImageSrcRects.some((srcRects) => srcRects.some(Boolean)) || slideTransitions.some(Boolean) || slideHidden.some(Boolean) || slideInternalLinks.some(Boolean)) {
    const blob = await pres.write({ outputType: 'blob' }) as Blob;
    const patchedBlob = await patchPptxSlidesXml(blob, slideImageSrcRects, slideTransitions, slideHidden, slideInternalLinks);
    downloadBlob(patchedBlob, safeName);
    return;
  }
  await pres.writeFile({ fileName: safeName });
}
