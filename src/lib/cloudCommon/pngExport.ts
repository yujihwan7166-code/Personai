/**
 * DOM 요소를 PNG 로 캡처해 다운로드.
 *
 * 사용처: 슬라이드 현재 슬라이드 PNG / 시트 EmbeddedChartCard PNG / 차트 모달 등.
 * 전략: html2canvas 로 캡처 → blob → <a download> 클릭.
 */

import html2canvas from 'html2canvas';

interface ExportPngOptions {
  /** 파일명 (.png 자동 부여). 빈 값이면 'capture.png'. */
  fileName?: string;
  /** 캡처 배율 (1 = 1x, 2 = 2x 고해상도). 기본 2. */
  scale?: number;
  /** 배경색 — 캔버스 transparent 일 때 채울 색. 기본 '#ffffff'. */
  backgroundColor?: string;
}

export async function exportElementAsPng(
  el: HTMLElement,
  { fileName = 'capture', scale = 2, backgroundColor = '#ffffff' }: ExportPngOptions = {},
): Promise<void> {
  const canvas = await html2canvas(el, {
    scale,
    backgroundColor,
    useCORS: true,
    logging: false,
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  if (!blob) throw new Error('PNG blob 생성 실패');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
