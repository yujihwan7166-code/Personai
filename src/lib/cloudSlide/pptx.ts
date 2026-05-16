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

// .pptx 캔버스 표준 크기 (EMU)
const SLIDE_W_EMU = 9144000;  // 10인치 = 9144000 EMU
const SLIDE_H_EMU = 6858000;  // 7.5인치 (16:9 wide는 6858000 또는 5143500)

// ─────────────────────────────────────────────
// 우리 데이터 타입 (CloudSlideEditor 와 동일)
// ─────────────────────────────────────────────

interface BaseEl { id: string; xPct: number; yPct: number; wPct: number; hPct: number; }
interface SlideTextEl extends BaseEl { type: 'text'; content: string; fontSizeRem: number; bold?: boolean; textColor?: string; }
type ShapeType = 'rect' | 'ellipse' | 'triangle' | 'line' | 'arrow';
interface SlideShapeEl extends BaseEl { type: ShapeType; fillColor: string; strokeColor?: string; strokeWidth?: number; }
interface SlideImageEl extends BaseEl { type: 'image'; src: string; alt?: string; }
type SlideElement = SlideTextEl | SlideShapeEl | SlideImageEl;
interface Slide { id: string; elements: SlideElement[]; background?: string; }

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

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
    isArray: (name) => ['p:sp', 'a:r', 'a:p'].includes(name),
  });

  const slides: Slide[] = [];
  for (const f of slideFiles) {
    const file = zip.file(f);
    if (!file) continue;
    const xml = await file.async('string');
    slides.push(parseSlide(xml, parser));
  }
  if (slides.length === 0) {
    // 빈 슬라이드 한 장이라도 반환
    slides.push({ id: newId('s'), elements: [] });
  }
  return slides;
}

function parseSlide(xml: string, parser: XMLParser): Slide {
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
  } catch {
    // 파싱 실패 — 빈 슬라이드로
  }

  return { id: newId('s'), elements, background };
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

  // 텍스트 추출
  const txBody = sp['p:txBody'] as Record<string, unknown> | undefined;
  if (txBody) {
    const text = extractText(txBody);
    if (text.trim()) {
      return {
        id: newId('el'),
        type: 'text',
        xPct, yPct, wPct: Math.max(wPct, 15), hPct: Math.max(hPct, 8),
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
      fillColor,
    };
  }

  return null;
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
    for (const el of s.elements) {
      const x = (el.xPct / 100) * W;
      const y = (el.yPct / 100) * H;
      const w = (el.wPct / 100) * W;
      const h = (el.hPct / 100) * H;

      if (el.type === 'text') {
        slide.addText(el.content, {
          x, y, w, h,
          fontSize: Math.round(el.fontSizeRem * 12), // 1rem ≈ 12pt
          bold: el.bold,
          color: el.textColor ? el.textColor.replace('#', '') : '222222',
          valign: 'top',
          fontFace: 'Pretendard',
        });
      } else if (el.type === 'rect') {
        slide.addShape(pres.ShapeType.rect, {
          x, y, w, h,
          fill: { color: el.fillColor.replace('#', '').replace(/^hsl.*$/i, '3B82F6') },
          line: el.strokeColor
            ? { color: el.strokeColor.replace('#', ''), width: el.strokeWidth ?? 2 }
            : { color: 'FFFFFF', width: 0 },
        });
      } else if (el.type === 'ellipse') {
        slide.addShape(pres.ShapeType.ellipse, {
          x, y, w, h,
          fill: { color: el.fillColor.replace('#', '').replace(/^hsl.*$/i, 'F59E0B') },
          line: el.strokeColor
            ? { color: el.strokeColor.replace('#', ''), width: el.strokeWidth ?? 2 }
            : { color: 'FFFFFF', width: 0 },
        });
      } else if (el.type === 'triangle') {
        slide.addShape(pres.ShapeType.triangle, {
          x, y, w, h,
          fill: { color: el.fillColor.replace('#', '').replace(/^hsl.*$/i, '34D399') },
          line: el.strokeColor
            ? { color: el.strokeColor.replace('#', ''), width: el.strokeWidth ?? 2 }
            : { color: 'FFFFFF', width: 0 },
        });
      } else if (el.type === 'line') {
        // 선: addShape(line) — 가로선, fill 없음
        slide.addShape(pres.ShapeType.line, {
          x, y, w, h,
          line: {
            color: (el.strokeColor ?? el.fillColor).replace('#', ''),
            width: el.strokeWidth ?? 2,
          },
        });
      } else if (el.type === 'arrow') {
        // 오른쪽 화살표 도형
        slide.addShape(pres.ShapeType.rightArrow, {
          x, y, w, h,
          fill: { color: (el.strokeColor ?? el.fillColor).replace('#', '').replace(/^hsl.*$/i, '222222') },
          line: { color: (el.strokeColor ?? el.fillColor).replace('#', ''), width: el.strokeWidth ?? 2 },
        });
      } else if (el.type === 'image') {
        // src 는 data URL — pptxgenjs는 data: URL 직접 지원
        slide.addImage({ data: el.src, x, y, w, h });
      }
    }
  }

  const safeName = (fileName.endsWith('.pptx') ? fileName : `${fileName}.pptx`).replace(/[\\/:*?"<>|]/g, '_');
  void pres.writeFile({ fileName: safeName });
}
