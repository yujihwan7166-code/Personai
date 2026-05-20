/**
 * SVG 요소를 SVG 파일로 다운로드.
 *
 * 사용처: 차트 모달 / EmbeddedChartCard 등 — recharts 가 그린 SVG 를 그대로 저장.
 * 전략: SVGElement clone → 흰 배경 rect prepend → XMLSerializer → blob → 다운로드.
 *
 * PNG 와 달리 벡터로 저장되므로 확대·인쇄·편집에 유리.
 */

interface ExportSvgOptions {
  /** 파일명 (.svg 자동 부여). 기본 'chart'. */
  fileName?: string;
  /** 배경색 — null 이면 투명 유지. 기본 '#ffffff'. */
  backgroundColor?: string | null;
}

export function exportSvgAsFile(
  svg: SVGElement,
  { fileName = 'chart', backgroundColor = '#ffffff' }: ExportSvgOptions = {},
): void {
  const clone = svg.cloneNode(true) as SVGElement;
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (backgroundColor) {
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', backgroundColor);
    clone.insertBefore(bgRect, clone.firstChild);
  }
  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.svg') ? fileName : `${fileName}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
