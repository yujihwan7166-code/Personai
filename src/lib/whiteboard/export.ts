/**
 * 화이트보드 — Export 유틸.
 *
 * - JSON: BoardData 그대로 직렬화 (백업·복원용)
 * - SVG:  요소를 자체 SVG 마크업으로 출력 (브라우저 렌더와 동일하면 됨)
 * - PNG:  SVG → canvas → dataURL (2× DPI)
 */
import type { WBBoardData, WBElement } from '@/types/whiteboard';
import { downloadBlob, sanitizeFileName } from '@/lib/blob';
import { getWBImage } from './imageStore';

const PADDING = 32;  // 요소 union bbox 주위 여백

/**
 * 모든 요소를 감싸는 bbox + 여백.
 * 요소 없으면 800×600 default.
 */
function computeExportBBox(elements: WBElement[]): { x: number; y: number; w: number; h: number } {
  if (elements.length === 0) {
    return { x: 0, y: 0, w: 800, h: 600 };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    if (el.x < minX) minX = el.x;
    if (el.y < minY) minY = el.y;
    if (el.x + el.w > maxX) maxX = el.x + el.w;
    if (el.y + el.h > maxY) maxY = el.y + el.h;
  }
  return {
    x: minX - PADDING,
    y: minY - PADDING,
    w: (maxX - minX) + PADDING * 2,
    h: (maxY - minY) + PADDING * 2,
  };
}

/** JSON export — BoardData 그대로. */
export function exportJSON(boardData: WBBoardData, baseName: string): void {
  const json = JSON.stringify(boardData, null, 2);
  downloadBlob(new Blob([json], { type: 'application/json' }), `${sanitizeFileName(baseName)}.json`);
}

/**
 * 현재 화면에 렌더된 SVG 요소 노드를 그대로 가져와 export.
 * - viewBox 를 export bbox 로 갱신
 * - dot grid 및 선택·핸들·marquee 등은 제거
 */
/** Blob → dataURL (base64). */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

/**
 * SVG clone 의 <image> 요소에 있는 blob URL href 를 dataURL 로 치환.
 * 이미지 element 의 imageId 를 wb-image-id 데이터 속성으로 찾아 IDB 에서 blob 로드.
 */
async function inlineImagesInSVG(clone: SVGSVGElement): Promise<void> {
  const images = Array.from(clone.querySelectorAll('image'));
  await Promise.all(
    images.map(async (img) => {
      const href = img.getAttribute('href') ?? img.getAttribute('xlink:href') ?? '';
      if (!href.startsWith('blob:')) return;
      const id = img.getAttribute('data-wb-image-id');
      if (!id) return;
      try {
        const rec = await getWBImage(id);
        if (!rec) return;
        const dataUrl = await blobToDataURL(rec.blob);
        img.setAttribute('href', dataUrl);
        img.removeAttribute('xlink:href');
      } catch { /* silent */ }
    }),
  );
}

/** clone 만 받아서 inline images 후 string 반환 (PNG/SVG 공용 비동기 경로). */
async function buildExportSVGAsync(svgEl: SVGSVGElement, elements: WBElement[]): Promise<string> {
  // 위 buildExportSVG 와 동일 로직 + inlineImagesInSVG 호출.
  const bbox = computeExportBBox(elements);
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.w} ${bbox.h}`);
  clone.setAttribute('width', String(bbox.w));
  clone.setAttribute('height', String(bbox.h));
  const defs = clone.querySelector('defs');
  if (defs) defs.remove();
  const allRects = clone.querySelectorAll('rect[fill="url(#wb-dotgrid)"], rect[fill="url(#wb-linegrid)"]');
  allRects.forEach((r) => r.remove());
  const auxLines = clone.querySelectorAll('line, rect, circle');
  auxLines.forEach((node) => {
    const stroke = node.getAttribute('stroke') ?? '';
    const fill = node.getAttribute('fill') ?? '';
    if (
      (stroke.includes('217 91% 55%') && (node.getAttribute('stroke-dasharray') || node.tagName === 'circle')) ||
      fill.includes('217 91% 55%') ||
      stroke.includes('330 80% 60%')
    ) {
      node.remove();
    }
  });
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', String(bbox.x));
  bg.setAttribute('y', String(bbox.y));
  bg.setAttribute('width', String(bbox.w));
  bg.setAttribute('height', String(bbox.h));
  bg.setAttribute('fill', 'hsl(40 25% 97%)');
  clone.insertBefore(bg, clone.firstChild);
  // 이미지 inline
  await inlineImagesInSVG(clone);
  return new XMLSerializer().serializeToString(clone);
}

async function buildExportSVGFilteredAsync(svgEl: SVGSVGElement, elements: WBElement[], selectedIds?: Set<string>): Promise<string> {
  const sourceElements = selectedIds ? elements.filter((el) => selectedIds.has(el.id)) : elements;
  const bbox = computeExportBBox(sourceElements);
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.w} ${bbox.h}`);
  clone.setAttribute('width', String(bbox.w));
  clone.setAttribute('height', String(bbox.h));
  clone.querySelector('defs')?.remove();
  clone.querySelectorAll('rect[fill="url(#wb-dotgrid)"], rect[fill="url(#wb-linegrid)"]').forEach((r) => r.remove());
  if (selectedIds) {
    clone.querySelectorAll('[data-wb-element-id]').forEach((node) => {
      const id = node.getAttribute('data-wb-element-id');
      if (!id || !selectedIds.has(id)) node.remove();
    });
  }
  clone.querySelectorAll('[data-wb-aux="true"]').forEach((node) => node.remove());
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', String(bbox.x));
  bg.setAttribute('y', String(bbox.y));
  bg.setAttribute('width', String(bbox.w));
  bg.setAttribute('height', String(bbox.h));
  bg.setAttribute('fill', 'hsl(40 25% 97%)');
  clone.insertBefore(bg, clone.firstChild);
  await inlineImagesInSVG(clone);
  return new XMLSerializer().serializeToString(clone);
}

/** SVG export (이미지 inline 포함) */
export async function exportSVG(svgEl: SVGSVGElement, elements: WBElement[], baseName: string, selectedIds?: Set<string>): Promise<void> {
  const svgString = selectedIds
    ? await buildExportSVGFilteredAsync(svgEl, elements, selectedIds)
    : await buildExportSVGAsync(svgEl, elements);
  downloadBlob(new Blob([svgString], { type: 'image/svg+xml' }), `${sanitizeFileName(baseName)}.svg`);
}

/** PNG export — 2× DPI */
export async function exportPNG(svgEl: SVGSVGElement, elements: WBElement[], baseName: string, selectedIds?: Set<string>): Promise<void> {
  const sourceElements = selectedIds ? elements.filter((el) => selectedIds.has(el.id)) : elements;
  const svgString = selectedIds
    ? await buildExportSVGFilteredAsync(svgEl, elements, selectedIds)
    : await buildExportSVGAsync(svgEl, elements);
  const bbox = computeExportBBox(sourceElements);
  const scale = 2;
  const W = Math.ceil(bbox.w * scale);
  const H = Math.ceil(bbox.h * scale);

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context 실패');
    ctx.fillStyle = 'hsl(40 25% 97%)';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!pngBlob) throw new Error('PNG 변환 실패');
    downloadBlob(pngBlob, `${sanitizeFileName(baseName)}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}
