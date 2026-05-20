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
