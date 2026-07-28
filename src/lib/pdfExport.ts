/**
 * PDF export 공용 헬퍼 — 3종 에디터에서 재사용.
 *
 * 전략: html2canvas 로 DOM 영역 캡처 → jsPDF 에 페이지별 이미지로 추가
 *
 * 한계 (v1):
 *  - 결과 PDF의 텍스트는 이미지 (검색·복사 불가) — 시각 충실도 우선
 *  - CSS variable 기반 색은 캡처 시 fallback 일부 손실 가능
 *  - 페이지 분할은 단순 가로 자르기 (한 줄 잘릴 수 있음)
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportOptions {
  fileName: string;
  orientation?: 'p' | 'l';         // portrait | landscape
  format?: 'a4' | 'a3' | [number, number];  // mm
  background?: string;
  scale?: number;
  pageHeightPx?: number;
  pageGapPx?: number;
  avoidBreakSelectors?: string;
}

interface PageSlice {
  sourceY: number;
  height: number;
}

interface AvoidRange {
  start: number;
  end: number;
}

/** 단일 element → 1~N 페이지 PDF. element 가 페이지보다 길면 페이지 분할. */
export async function exportElementToPdf(el: HTMLElement, options: ExportOptions): Promise<void> {
  const canvas = await html2canvas(el, {
    scale: options.scale ?? 2,
    backgroundColor: options.background ?? '#ffffff',
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({
    orientation: options.orientation ?? 'p',
    unit: 'mm',
    format: options.format ?? 'a4',
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  if (options.pageHeightPx && canvas.height > options.pageHeightPx) {
    const rect = el.getBoundingClientRect();
    const scale = rect.width > 0 ? canvas.width / rect.width : (options.scale ?? 2);
    const pageHeightCanvas = Math.max(1, Math.round(options.pageHeightPx * scale));
    const pageGapCanvas = Math.max(0, Math.round((options.pageGapPx ?? 0) * scale));
    const slices = computePdfPageSlices(
      canvas.height,
      pageHeightCanvas,
      pageGapCanvas,
      collectAvoidBreakRanges(el, scale, options.avoidBreakSelectors),
    );
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = pageHeightCanvas;
    const ctx = pageCanvas.getContext('2d');
    if (!ctx) throw new Error('PDF 페이지 캔버스를 만들 수 없습니다.');

    for (let pageIndex = 0; pageIndex < slices.length; pageIndex++) {
      const { sourceY, height } = slices[pageIndex];
      ctx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.fillStyle = options.background ?? '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        height,
        0,
        0,
        pageCanvas.width,
        height,
      );
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, pageH);
    }
    pdf.save(options.fileName.endsWith('.pdf') ? options.fileName : `${options.fileName}.pdf`);
    return;
  }

  const imgRatio = canvas.height / canvas.width;
  const imgW = pageW;
  const imgH = imgW * imgRatio;

  if (imgH <= pageH) {
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH);
  } else {
    // 페이지 분할 — 같은 이미지를 음수 y 로 끌어올리며 추가
    let heightLeft = imgH;
    let position = 0;
    const dataUrl = canvas.toDataURL('image/png');
    pdf.addImage(dataUrl, 'PNG', 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
  }

  pdf.save(options.fileName.endsWith('.pdf') ? options.fileName : `${options.fileName}.pdf`);
}

/** 여러 element → 페이지별 PDF (슬라이드 발표용). 각 element 가 1 페이지. */
export async function exportElementsToPdf(elements: HTMLElement[], options: ExportOptions): Promise<void> {
  if (elements.length === 0) return;

  const pdf = new jsPDF({
    orientation: options.orientation ?? 'l',  // 슬라이드는 landscape 기본
    unit: 'mm',
    format: options.format ?? 'a4',
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const canvas = await html2canvas(el, {
      scale: options.scale ?? 2,
      backgroundColor: options.background ?? '#ffffff',
      useCORS: true,
      logging: false,
    });
    const imgRatio = canvas.height / canvas.width;
    let imgW = pageW;
    let imgH = imgW * imgRatio;
    if (imgH > pageH) {
      imgH = pageH;
      imgW = imgH / imgRatio;
    }
    const x = (pageW - imgW) / 2;
    const y = (pageH - imgH) / 2;

    if (i > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, imgW, imgH);
  }

  pdf.save(options.fileName.endsWith('.pdf') ? options.fileName : `${options.fileName}.pdf`);
}

/** 파일명 안전 처리 — `@/lib/blob` 의 통합 헬퍼 re-export (호환 유지). */
export { sanitizeFileName } from '@/lib/blob';

export function computePdfPageSlices(
  canvasHeight: number,
  pageHeightCanvas: number,
  pageGapCanvas = 0,
  avoidRanges: AvoidRange[] = [],
): PageSlice[] {
  const safeCanvasHeight = Math.max(0, Math.round(canvasHeight));
  const safePageHeight = Math.max(1, Math.round(pageHeightCanvas));
  const safeGap = Math.max(0, Math.round(pageGapCanvas));
  if (safeCanvasHeight <= 0) return [];

  const sortedRanges = avoidRanges
    .map((range) => ({
      start: Math.max(0, Math.round(Math.min(range.start, range.end))),
      end: Math.min(safeCanvasHeight, Math.round(Math.max(range.start, range.end))),
    }))
    .filter((range) => range.end > range.start && range.end - range.start < safePageHeight * 0.9)
    .sort((a, b) => a.start - b.start);

  const slices: PageSlice[] = [];
  let sourceY = 0;
  let guard = 0;
  while (sourceY < safeCanvasHeight && guard < 10000) {
    guard += 1;
    const naturalEnd = Math.min(sourceY + safePageHeight, safeCanvasHeight);
    const adjustedEnd = adjustSliceEndForAvoidRange(sourceY, naturalEnd, safePageHeight, sortedRanges);
    const height = Math.max(1, adjustedEnd - sourceY);
    slices.push({ sourceY, height });
    if (adjustedEnd >= safeCanvasHeight) break;
    const canSkipGap = adjustedEnd === naturalEnd
      && safeGap > 0
      && !avoidRangeStartsInsideGap(adjustedEnd, adjustedEnd + safeGap, sortedRanges);
    sourceY = canSkipGap ? adjustedEnd + safeGap : adjustedEnd;
  }
  return slices;
}

function avoidRangeStartsInsideGap(gapStart: number, gapEnd: number, avoidRanges: AvoidRange[]): boolean {
  if (gapEnd <= gapStart) return false;
  return avoidRanges.some((range) => range.start < gapEnd && range.end > gapStart);
}

function adjustSliceEndForAvoidRange(
  sourceY: number,
  naturalEnd: number,
  pageHeightCanvas: number,
  avoidRanges: AvoidRange[],
): number {
  const minUsefulSlice = Math.max(24, Math.round(pageHeightCanvas * 0.18));
  for (const range of avoidRanges) {
    if (naturalEnd <= range.start || naturalEnd >= range.end) continue;
    if (range.start - sourceY >= minUsefulSlice) return range.start;
    if (range.end - sourceY <= pageHeightCanvas) return range.end;
  }
  return naturalEnd;
}

function collectAvoidBreakRanges(
  root: HTMLElement,
  scale: number,
  selectors = [
    '.doc-content table',
    '.doc-content img',
    '.doc-content p',
    '.doc-content li',
    '.doc-content blockquote',
    '.doc-content pre',
    '.doc-content h1',
    '.doc-content h2',
    '.doc-content h3',
    '.doc-content h4',
    '.doc-content h5',
    '.doc-content h6',
    '.doc-footnote-list',
    'table',
    'img',
  ].join(', '),
): AvoidRange[] {
  const rootRect = root.getBoundingClientRect();
  return Array.from(root.querySelectorAll<HTMLElement>(selectors))
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        start: (rect.top - rootRect.top) * scale,
        end: (rect.bottom - rootRect.top) * scale,
      };
    })
    .filter((range) => range.end > range.start);
}
