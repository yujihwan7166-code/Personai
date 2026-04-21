/**
 * PPTX 경량 파서. JSZip 으로 slide XML 을 읽어 shape 트리를 상대좌표(%) 로 정규화한다.
 * v1 범위:
 *  - 슬라이드 크기 (presentation.xml)
 *  - 텍스트 박스: 위치, 폰트 크기(pt), 볼드/이탤릭, 색상(단순 srgbClr), 정렬
 *  - 이미지: r:embed → media blob → object URL
 *  - 도형 (사각/원/타원) 단순 fill — prstGeom 기반
 *  - 실패 시 해당 슬라이드만 표시하지 않고 건너뜀
 * 미지원: 차트/SmartArt/그룹/애니메이션/그라데이션/테마 매핑
 */
import JSZip from 'jszip';

export interface PptxShapeBase {
  /** 슬라이드 기준 상대 좌표 (0~1). */
  x: number; y: number; w: number; h: number;
}

export interface PptxTextShape extends PptxShapeBase {
  kind: 'text';
  paragraphs: PptxParagraph[];
}

export interface PptxParagraph {
  align?: 'left' | 'center' | 'right' | 'justify';
  bullet?: boolean;
  level?: number;
  runs: PptxTextRun[];
}

export interface PptxTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  /** 포인트 단위. 기본 18. */
  sizePt?: number;
  /** #RRGGBB */
  color?: string;
}

export interface PptxImageShape extends PptxShapeBase {
  kind: 'image';
  /** Object URL (revoke 필요). */
  src: string;
  alt?: string;
}

export interface PptxGeomShape extends PptxShapeBase {
  kind: 'geom';
  /** rect | roundRect | ellipse | line | custom */
  preset: string;
  fill?: string;
  stroke?: string;
}

export type PptxShape = PptxTextShape | PptxImageShape | PptxGeomShape;

export interface PptxSlide {
  index: number; // 1-based
  shapes: PptxShape[];
  /** 슬라이드에서 추출된 평문 (검색용) */
  text: string;
}

export interface PptxDoc {
  widthPx: number;
  heightPx: number;
  slides: PptxSlide[];
  objectUrls: string[]; // cleanup 용
}

const EMU_PER_PX = 9525; // PowerPoint 기본

/** PPTX blob → 파싱된 슬라이드 리스트. 실패 시 throw. */
export async function parsePptx(blob: Blob): Promise<PptxDoc> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const parser = new DOMParser();

  // 1) presentation.xml → slide 크기
  const presXml = await zip.file('ppt/presentation.xml')?.async('string');
  let slideWEmu = 9144000;
  let slideHEmu = 6858000;
  if (presXml) {
    const d = parser.parseFromString(presXml, 'application/xml');
    const sz = d.getElementsByTagNameNS('*', 'sldSz')[0];
    if (sz) {
      slideWEmu = Number(sz.getAttribute('cx') || slideWEmu);
      slideHEmu = Number(sz.getAttribute('cy') || slideHEmu);
    }
  }
  const widthPx = slideWEmu / EMU_PER_PX;
  const heightPx = slideHEmu / EMU_PER_PX;

  // 2) slide 파일 목록 (순서 보장)
  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide(\d+)\.xml$/.test(p))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return na - nb;
    });

  const slides: PptxSlide[] = [];
  const objectUrls: string[] = [];

  for (let i = 0; i < slidePaths.length; i++) {
    const slidePath = slidePaths[i];
    try {
      const xml = await zip.file(slidePath)!.async('string');
      const doc = parser.parseFromString(xml, 'application/xml');

      // rels
      const relsPath = slidePath.replace(/slides\/(slide\d+)\.xml$/, 'slides/_rels/$1.xml.rels');
      const relsMap = await loadRels(zip, relsPath);

      // shape 트리 루트
      const spTree = doc.getElementsByTagNameNS('*', 'spTree')[0];
      const shapes: PptxShape[] = [];
      if (spTree) {
        for (const child of Array.from(spTree.children)) {
          const s = await parseShape(child, relsMap, zip, slideWEmu, slideHEmu, objectUrls);
          if (s) {
            if (Array.isArray(s)) shapes.push(...s);
            else shapes.push(s);
          }
        }
      }
      const textParts: string[] = [];
      for (const s of shapes) {
        if (s.kind === 'text') {
          for (const p of s.paragraphs) {
            textParts.push(p.runs.map((r) => r.text).join(''));
          }
        }
      }
      slides.push({ index: i + 1, shapes, text: textParts.join('\n') });
    } catch (e) {
      console.warn(`[pptxParse] slide ${i + 1} 실패`, e);
      slides.push({ index: i + 1, shapes: [], text: '' });
    }
  }

  return { widthPx, heightPx, slides, objectUrls };
}

/** object URL 해제 */
export function disposePptx(doc: PptxDoc) {
  for (const u of doc.objectUrls) URL.revokeObjectURL(u);
  doc.objectUrls.length = 0;
}

async function loadRels(zip: JSZip, relsPath: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const file = zip.file(relsPath);
  if (!file) return map;
  const xml = await file.async('string');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  for (const r of Array.from(doc.getElementsByTagNameNS('*', 'Relationship'))) {
    const id = r.getAttribute('Id');
    const target = r.getAttribute('Target');
    if (id && target) map.set(id, target);
  }
  return map;
}

async function parseShape(
  el: Element,
  rels: Map<string, string>,
  zip: JSZip,
  slideW: number,
  slideH: number,
  objectUrls: string[],
): Promise<PptxShape | PptxShape[] | null> {
  const tag = el.localName;

  if (tag === 'grpSp') {
    // 그룹 — 자식을 평탄화
    const out: PptxShape[] = [];
    for (const c of Array.from(el.children)) {
      const s = await parseShape(c, rels, zip, slideW, slideH, objectUrls);
      if (s) { Array.isArray(s) ? out.push(...s) : out.push(s); }
    }
    return out.length ? out : null;
  }

  if (tag !== 'sp' && tag !== 'pic') return null;

  // 위치 (spPr/xfrm/off,ext)
  const spPr = child(el, 'spPr');
  const xfrm = spPr ? child(spPr, 'xfrm') : null;
  const off = xfrm ? child(xfrm, 'off') : null;
  const ext = xfrm ? child(xfrm, 'ext') : null;
  const x = off ? Number(off.getAttribute('x') || 0) / slideW : 0;
  const y = off ? Number(off.getAttribute('y') || 0) / slideH : 0;
  const w = ext ? Number(ext.getAttribute('cx') || 0) / slideW : 1;
  const h = ext ? Number(ext.getAttribute('cy') || 0) / slideH : 1;
  if (w <= 0 || h <= 0) return null;

  if (tag === 'pic') {
    const blipFill = child(el, 'blipFill');
    const blip = blipFill ? child(blipFill, 'blip') : null;
    const embed = blip?.getAttribute('r:embed') || blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed');
    if (!embed) return null;
    const rel = rels.get(embed);
    if (!rel) return null;
    const mediaPath = resolveRelPath('ppt/slides/', rel);
    const file = zip.file(mediaPath);
    if (!file) return null;
    const blob = await file.async('blob');
    const url = URL.createObjectURL(blob);
    objectUrls.push(url);
    return { kind: 'image', x, y, w, h, src: url };
  }

  // sp — 텍스트 or 도형
  const txBody = child(el, 'txBody');
  const geom = spPr ? child(spPr, 'prstGeom') : null;
  const preset = geom?.getAttribute('prst') || 'rect';

  const paragraphs: PptxParagraph[] = [];
  if (txBody) {
    for (const p of Array.from(txBody.children).filter((c) => c.localName === 'p')) {
      const pPr = child(p, 'pPr');
      const align = pPr?.getAttribute('algn') as string | null;
      const alignMap: Record<string, PptxParagraph['align']> = { l: 'left', ctr: 'center', r: 'right', just: 'justify' };
      const runs: PptxTextRun[] = [];
      for (const r of Array.from(p.children)) {
        if (r.localName === 'r') {
          const rPr = child(r, 'rPr');
          const t = child(r, 't');
          const txt = t?.textContent ?? '';
          if (!txt) continue;
          const sizePt = rPr?.getAttribute('sz') ? Number(rPr.getAttribute('sz')) / 100 : undefined;
          const bold = rPr?.getAttribute('b') === '1';
          const italic = rPr?.getAttribute('i') === '1';
          const underline = rPr?.getAttribute('u') != null && rPr.getAttribute('u') !== 'none';
          const solidFill = rPr ? child(rPr, 'solidFill') : null;
          const srgb = solidFill ? child(solidFill, 'srgbClr') : null;
          const color = srgb ? `#${srgb.getAttribute('val')}` : undefined;
          runs.push({ text: txt, bold, italic, underline, sizePt, color });
        } else if (r.localName === 'br') {
          runs.push({ text: '\n' });
        }
      }
      if (runs.length === 0) runs.push({ text: '' });
      paragraphs.push({ align: align ? alignMap[align] : undefined, runs });
    }
  }

  if (paragraphs.length > 0 && paragraphs.some((p) => p.runs.some((r) => r.text.trim().length > 0))) {
    return { kind: 'text', x, y, w, h, paragraphs };
  }

  // 도형 (텍스트 없음)
  const solidFill = spPr ? child(spPr, 'solidFill') : null;
  const srgb = solidFill ? child(solidFill, 'srgbClr') : null;
  const fill = srgb ? `#${srgb.getAttribute('val')}` : undefined;
  const ln = spPr ? child(spPr, 'ln') : null;
  const lnFill = ln ? child(ln, 'solidFill') : null;
  const lnSrgb = lnFill ? child(lnFill, 'srgbClr') : null;
  const stroke = lnSrgb ? `#${lnSrgb.getAttribute('val')}` : undefined;

  if (!fill && !stroke && paragraphs.length === 0) return null;
  return { kind: 'geom', x, y, w, h, preset, fill, stroke };
}

function child(el: Element, localName: string): Element | null {
  for (const c of Array.from(el.children)) {
    if (c.localName === localName) return c;
  }
  return null;
}

function resolveRelPath(base: string, rel: string): string {
  // base = 'ppt/slides/', rel = '../media/image1.png' → 'ppt/media/image1.png'
  const parts = (base + rel).split('/');
  const out: string[] = [];
  for (const p of parts) {
    if (p === '.' || p === '') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}
