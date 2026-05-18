/**
 * 슬라이드 ↔ .pptx 호환 (v1, 알려진 손실 인정).
 *
 * Import: JSZip + fast-xml-parser 로 ppt/slides/slide{N}.xml 파싱
 *   - 텍스트 추출 (a:t)
 *   - 위치 EMU → % 변환 (가능한 만큼). 위치 불명 시 자동 배치
 *   - 슬라이드 배경색 일부 추출 (solidFill 만)
 *   - 도형·이미지·차트·애니메이션 등 무시
 *
 * Export: pptxgenjs 로 우리 slides → .pptx
 *   - 텍스트박스, 도형(rect/ellipse), 이미지(base64) 다 변환
 *   - 16:9 LAYOUT_WIDE
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import pptxgen from 'pptxgenjs';
import { newId } from '@/lib/idGenerator';

// .pptx 캔버스 표준 크기 (EMU)
const SLIDE_W_EMU = 9144000;  // 10인치 = 9144000 EMU
const SLIDE_H_EMU = 6858000;  // 7.5인치 (16:9 wide는 6858000 또는 5143500)

// ─────────────────────────────────────────────
// 우리 데이터 타입 (CloudSlideEditor 와 동일)
// ─────────────────────────────────────────────

interface BaseEl { id: string; xPct: number; yPct: number; wPct: number; hPct: number; rotation?: number; }
interface SlideTextEl extends BaseEl { type: 'text'; content: string; fontSizeRem: number; bold?: boolean; textColor?: string; }
type ShapeType = 'rect' | 'ellipse' | 'triangle' | 'line' | 'arrow';
interface SlideShapeEl extends BaseEl { type: ShapeType; fillColor: string; strokeColor?: string; strokeWidth?: number; }
interface SlideImageEl extends BaseEl { type: 'image'; src: string; alt?: string; }
type SlideElement = SlideTextEl | SlideShapeEl | SlideImageEl;
interface Slide { id: string; elements: SlideElement[]; background?: string; notes?: string; }

// newId 는 lib/idGenerator 공용

// ─────────────────────────────────────────────
// Import
// ─────────────────────────────────────────────

export async function importPptxFile(file: File): Promise<Slide[]> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  // ppt/slides/slide{N}.xml 찾고 번호순 정렬
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
    isArray: (name) => ['p:sp', 'p:pic', 'p:graphicFrame', 'a:r', 'a:p', 'Relationship'].includes(name),
  });

  const slides: Slide[] = [];
  for (const f of slideFiles) {
    const file = zip.file(f);
    if (!file) continue;
    const xml = await file.async('string');
    // rels 파일에서 rId → 미디어 경로 매핑 (+ notesSlide 도 함께 추출)
    const relsPath = f.replace(/^ppt\/slides\//, 'ppt/slides/_rels/').replace(/\.xml$/, '.xml.rels');
    const relsFile = zip.file(relsPath);
    const relsMap = new Map<string, string>();
    let notesRelTarget: string | undefined;
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
          if (id && target) relsMap.set(id, target);
          if (target && ttype && ttype.includes('notesSlide')) notesRelTarget = target;
        }
      } catch { /* rels 파싱 실패 → 이미지·노트 무시 */ }
    }
    const slide = await parseSlide(xml, parser, relsMap, zip);
    // 노트 파싱 (있으면)
    if (notesRelTarget) {
      const notesPath = notesRelTarget.startsWith('../')
        ? `ppt/${notesRelTarget.slice(3)}`
        : notesRelTarget;
      const notesFile = zip.file(notesPath);
      if (notesFile) {
        try {
          const notesXml = await notesFile.async('string');
          const text = extractNotesText(notesXml, parser);
          if (text) slide.notes = text;
        } catch { /* 노트 파싱 실패 → skip */ }
      }
    }
    slides.push(slide);
  }
  if (slides.length === 0) {
    // 빈 슬라이드 한 장이라도 반환
    slides.push({ id: newId('s'), elements: [] });
  }
  return slides;
}

async function parseSlide(
  xml: string,
  parser: XMLParser,
  relsMap: Map<string, string>,
  zip: JSZip,
): Promise<Slide> {
  const elements: SlideElement[] = [];
  let background: string | undefined;

  try {
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['p:sld'] ?? parsed.sld) as Record<string, unknown> | undefined;
    if (!root) return { id: newId('s'), elements };

    const cSld = root['p:cSld'] as Record<string, unknown> | undefined;
    if (!cSld) return { id: newId('s'), elements };

    // 배경
    const bg = cSld['p:bg'] as Record<string, unknown> | undefined;
    if (bg) {
      const bgPr = bg['p:bgPr'] as Record<string, unknown> | undefined;
      const solidFill = bgPr?.['a:solidFill'] as Record<string, unknown> | undefined;
      const srgbClr = solidFill?.['a:srgbClr'] as Record<string, unknown> | undefined;
      const v = srgbClr?.['@_val'];
      if (typeof v === 'string') background = `#${v}`;
    }

    // 도형들 (p:sp)
    const spTree = cSld['p:spTree'] as Record<string, unknown> | undefined;
    const shapes = spTree?.['p:sp'] as Array<Record<string, unknown>> | undefined;
    if (shapes) {
      for (const sp of shapes) {
        const el = parseShape(sp);
        if (el) elements.push(el);
      }
    }

    // 이미지들 (p:pic)
    const pics = spTree?.['p:pic'] as Array<Record<string, unknown>> | undefined;
    if (pics) {
      for (const pic of pics) {
        const el = await parsePic(pic, relsMap, zip);
        if (el) elements.push(el);
      }
    }

    // graphicFrame (차트/표/SmartArt) — 위치만 보존, "[차트/표 자리]" placeholder
    const frames = spTree?.['p:graphicFrame'] as Array<Record<string, unknown>> | undefined;
    if (frames) {
      for (const gf of frames) {
        const el = parseGraphicFrame(gf);
        if (el) elements.push(el);
      }
    }
  } catch {
    // 파싱 실패 — 빈 슬라이드로
  }

  return { id: newId('s'), elements, background };
}

/** p:graphicFrame → placeholder 텍스트 박스 (차트/표/SmartArt 자리만 보존) */
function parseGraphicFrame(gf: Record<string, unknown>): SlideTextEl | null {
  const xfrm = gf['p:xfrm'] as Record<string, unknown> | undefined;
  const off = xfrm?.['a:off'] as Record<string, unknown> | undefined;
  const ext = xfrm?.['a:ext'] as Record<string, unknown> | undefined;
  if (!off || !ext) return null;

  const xEmu = Number(off['@_x'] ?? 0);
  const yEmu = Number(off['@_y'] ?? 0);
  const cxEmu = Number(ext['@_cx'] ?? SLIDE_W_EMU * 0.4);
  const cyEmu = Number(ext['@_cy'] ?? SLIDE_H_EMU * 0.3);

  // 종류 추정 (URI 로): chart / table / diagram
  const graphic = gf['a:graphic'] as Record<string, unknown> | undefined;
  const graphicData = graphic?.['a:graphicData'] as Record<string, unknown> | undefined;
  const uri = (graphicData?.['@_uri'] ?? '') as string;
  let label = '[그래픽 자리]';
  if (uri.includes('chart')) label = '[차트 자리]';
  else if (uri.includes('table')) label = '[표 자리]';
  else if (uri.includes('diagram')) label = '[다이어그램 자리]';

  return {
    id: newId('el'),
    type: 'text',
    xPct: clamp01((xEmu / SLIDE_W_EMU) * 100),
    yPct: clamp01((yEmu / SLIDE_H_EMU) * 100),
    wPct: Math.max(clamp01((cxEmu / SLIDE_W_EMU) * 100), 15),
    hPct: Math.max(clamp01((cyEmu / SLIDE_H_EMU) * 100), 8),
    content: label,
    fontSizeRem: 1.25,
    textColor: 'rgba(0,0,0,0.4)',
  };
}

function parseShape(sp: Record<string, unknown>): SlideElement | null {
  // 위치
  const spPr = sp['p:spPr'] as Record<string, unknown> | undefined;
  const xfrm = spPr?.['a:xfrm'] as Record<string, unknown> | undefined;
  const off = xfrm?.['a:off'] as Record<string, unknown> | undefined;
  const ext = xfrm?.['a:ext'] as Record<string, unknown> | undefined;

  const xEmu = Number(off?.['@_x'] ?? 0);
  const yEmu = Number(off?.['@_y'] ?? 0);
  const cxEmu = Number(ext?.['@_cx'] ?? SLIDE_W_EMU * 0.3);
  const cyEmu = Number(ext?.['@_cy'] ?? SLIDE_H_EMU * 0.1);

  const xPct = clamp01((xEmu / SLIDE_W_EMU) * 100);
  const yPct = clamp01((yEmu / SLIDE_H_EMU) * 100);
  const wPct = clamp01((cxEmu / SLIDE_W_EMU) * 100);
  const hPct = clamp01((cyEmu / SLIDE_H_EMU) * 100);
  // 회전: rot = 60000 단위. xfrm[@rot] 또는 없음.
  const rotRaw = xfrm?.['@_rot'];
  const rotation = rotRaw != null ? ((Number(rotRaw) / 60000) % 360 + 360) % 360 : undefined;

  // 텍스트 추출
  const txBody = sp['p:txBody'] as Record<string, unknown> | undefined;
  if (txBody) {
    const text = extractText(txBody);
    if (text.trim()) {
      return {
        id: newId('el'),
        type: 'text',
        xPct, yPct, wPct: Math.max(wPct, 15), hPct: Math.max(hPct, 8),
        rotation,
        content: text.trim(),
        fontSizeRem: 1.5,
      };
    }
  }

  // 도형 (텍스트 없고 prstGeom 있으면)
  const prstGeom = spPr?.['a:prstGeom'] as Record<string, unknown> | undefined;
  if (prstGeom) {
    const prst = prstGeom['@_prst'] as string | undefined;
    const fillSrgb = (spPr?.['a:solidFill'] as Record<string, unknown> | undefined)?.['a:srgbClr'] as Record<string, unknown> | undefined;
    const fillColor = typeof fillSrgb?.['@_val'] === 'string' ? `#${fillSrgb['@_val']}` : 'hsl(200 75% 60%)';

    let type: ShapeType = 'rect';
    if (prst === 'ellipse' || prst === 'roundRect') type = 'ellipse';
    else if (prst === 'triangle' || prst === 'rtTriangle') type = 'triangle';
    else if (prst === 'line' || prst === 'straightConnector1') type = 'line';
    else if (prst === 'rightArrow' || prst === 'straightArrow' || prst === 'leftRightArrow') type = 'arrow';

    return {
      id: newId('el'),
      type,
      xPct, yPct, wPct: Math.max(wPct, 10), hPct: Math.max(hPct, 5),
      rotation,
      fillColor,
    };
  }

  return null;
}

/** p:pic → SlideImageEl (data URL) — rId 매핑으로 ZIP 내 미디어 추출 */
async function parsePic(
  pic: Record<string, unknown>,
  relsMap: Map<string, string>,
  zip: JSZip,
): Promise<SlideImageEl | null> {
  // 위치: p:spPr/a:xfrm
  const spPr = pic['p:spPr'] as Record<string, unknown> | undefined;
  const xfrm = spPr?.['a:xfrm'] as Record<string, unknown> | undefined;
  const off = xfrm?.['a:off'] as Record<string, unknown> | undefined;
  const ext = xfrm?.['a:ext'] as Record<string, unknown> | undefined;
  const xEmu = Number(off?.['@_x'] ?? 0);
  const yEmu = Number(off?.['@_y'] ?? 0);
  const cxEmu = Number(ext?.['@_cx'] ?? SLIDE_W_EMU * 0.3);
  const cyEmu = Number(ext?.['@_cy'] ?? SLIDE_H_EMU * 0.3);
  const rotRaw = xfrm?.['@_rot'];
  const rotation = rotRaw != null ? ((Number(rotRaw) / 60000) % 360 + 360) % 360 : undefined;

  // rId: p:blipFill/a:blip[@r:embed]
  const blipFill = pic['p:blipFill'] as Record<string, unknown> | undefined;
  const blip = blipFill?.['a:blip'] as Record<string, unknown> | undefined;
  const rId = (blip?.['@_r:embed'] ?? blip?.['@_xmlns:r']) as string | undefined;
  if (!rId) return null;
  const target = relsMap.get(rId);
  if (!target) return null;

  // target 은 ../media/imageN.png 형태 — ppt/ 기준 절대 경로로
  const absPath = target.startsWith('../')
    ? `ppt/${target.slice(3)}`
    : target.startsWith('/')
      ? target.slice(1)
      : `ppt/slides/${target}`;
  const mediaFile = zip.file(absPath);
  if (!mediaFile) return null;

  // 이미지 → base64 → data URL
  const u8 = await mediaFile.async('uint8array');
  const ext2 = absPath.split('.').pop()?.toLowerCase() ?? 'png';
  let mime = 'image/png';
  if (ext2 === 'jpg' || ext2 === 'jpeg') mime = 'image/jpeg';
  else if (ext2 === 'gif') mime = 'image/gif';
  else if (ext2 === 'bmp') mime = 'image/bmp';
  else if (ext2 === 'svg') mime = 'image/svg+xml';
  else if (ext2 === 'webp') mime = 'image/webp';

  // 큰 이미지(>3MB)는 거부 — base64 로 부풀면 12MB 가 됨
  if (u8.byteLength > 3 * 1024 * 1024) return null;

  let binary = '';
  for (let i = 0; i < u8.byteLength; i++) binary += String.fromCharCode(u8[i]);
  const base64 = btoa(binary);
  const src = `data:${mime};base64,${base64}`;

  return {
    id: newId('el'),
    type: 'image',
    xPct: clamp01((xEmu / SLIDE_W_EMU) * 100),
    yPct: clamp01((yEmu / SLIDE_H_EMU) * 100),
    wPct: clamp01((cxEmu / SLIDE_W_EMU) * 100),
    hPct: clamp01((cyEmu / SLIDE_H_EMU) * 100),
    rotation,
    src,
  };
}

/** notesSlideN.xml 에서 발표자 노트 텍스트 추출 — txBody 안 paragraphs 중 placeholder 'body' 만 골라냄 */
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
      // 노트 본문 sp 만 (제목 sp 는 건너뜀) — phType='body' 또는 idx 가 없는 것
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
  if (!node || typeof node !== 'object') return '';
  const parts: string[] = [];
  // a:p (paragraph) → a:r (run) → a:t (text)
  const paragraphs = (node as Record<string, unknown>)['a:p'] as Array<Record<string, unknown>> | undefined;
  if (paragraphs) {
    for (const p of paragraphs) {
      const runs = p['a:r'] as Array<Record<string, unknown>> | undefined;
      if (runs) {
        for (const r of runs) {
          const t = r['a:t'];
          if (typeof t === 'string') parts.push(t);
          else if (t && typeof t === 'object') parts.push(String((t as Record<string, unknown>)['#text'] ?? ''));
        }
      }
      parts.push('\n');
    }
  }
  return parts.join('').trim();
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(95, n));
}

// ─────────────────────────────────────────────
// Export — pptxgenjs
// ─────────────────────────────────────────────

export function exportPptxFile(slides: Slide[], fileName: string): void {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 16:9 wide (13.333 x 7.5 inch)

  // pptxgenjs 좌표: 인치. 16:9 wide = 13.333 x 7.5
  const W = 13.333;
  const H = 7.5;

  for (const s of slides) {
    const slide = pres.addSlide();
    if (s.background) {
      slide.background = { color: s.background.replace('#', '') };
    }
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
          fontSize: Math.round(el.fontSizeRem * 12), // 1rem ≈ 12pt
          bold: el.bold,
          color: el.textColor ? el.textColor.replace('#', '') : '222222',
          valign: 'top',
          fontFace: 'Pretendard',
        });
      } else if (el.type === 'rect') {
        slide.addShape(pres.ShapeType.rect, {
          x, y, w, h, rotate,
          fill: { color: el.fillColor.replace('#', '').replace(/^hsl.*$/i, '3B82F6') },
          line: el.strokeColor
            ? { color: el.strokeColor.replace('#', ''), width: el.strokeWidth ?? 2 }
            : { color: 'FFFFFF', width: 0 },
        });
      } else if (el.type === 'ellipse') {
        slide.addShape(pres.ShapeType.ellipse, {
          x, y, w, h, rotate,
          fill: { color: el.fillColor.replace('#', '').replace(/^hsl.*$/i, 'F59E0B') },
          line: el.strokeColor
            ? { color: el.strokeColor.replace('#', ''), width: el.strokeWidth ?? 2 }
            : { color: 'FFFFFF', width: 0 },
        });
      } else if (el.type === 'triangle') {
        slide.addShape(pres.ShapeType.triangle, {
          x, y, w, h, rotate,
          fill: { color: el.fillColor.replace('#', '').replace(/^hsl.*$/i, '34D399') },
          line: el.strokeColor
            ? { color: el.strokeColor.replace('#', ''), width: el.strokeWidth ?? 2 }
            : { color: 'FFFFFF', width: 0 },
        });
      } else if (el.type === 'line') {
        slide.addShape(pres.ShapeType.line, {
          x, y, w, h, rotate,
          line: {
            color: (el.strokeColor ?? el.fillColor).replace('#', ''),
            width: el.strokeWidth ?? 2,
          },
        });
      } else if (el.type === 'arrow') {
        slide.addShape(pres.ShapeType.rightArrow, {
          x, y, w, h, rotate,
          fill: { color: (el.strokeColor ?? el.fillColor).replace('#', '').replace(/^hsl.*$/i, '222222') },
          line: { color: (el.strokeColor ?? el.fillColor).replace('#', ''), width: el.strokeWidth ?? 2 },
        });
      } else if (el.type === 'image') {
        slide.addImage({ data: el.src, x, y, w, h, rotate });
      }
    }
  }

  const safeName = (fileName.endsWith('.pptx') ? fileName : `${fileName}.pptx`).replace(/[\\/:*?"<>|]/g, '_');
  void pres.writeFile({ fileName: safeName });
}
