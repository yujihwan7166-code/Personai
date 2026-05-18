/**
 * 색상 유틸 — hex / hsl 변환 + 대비 계산.
 *
 * 시트 셀 배경색, 디자인 시스템 색상 검증, 동적 색상 생성 등에 활용.
 */

/** '#rgb' / '#rrggbb' → { r, g, b } (0~255). 잘못된 형식이면 null. */
export function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const s = hex.trim().replace(/^#/, '');
  if (s.length === 3) {
    const r = parseInt(s[0] + s[0], 16);
    const g = parseInt(s[1] + s[1], 16);
    const b = parseInt(s[2] + s[2], 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b };
  }
  if (s.length === 6) {
    const r = parseInt(s.slice(0, 2), 16);
    const g = parseInt(s.slice(2, 4), 16);
    const b = parseInt(s.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b };
  }
  return null;
}

/** WCAG 상대 휘도 (0~1). 0 = 검정, 1 = 흰색. */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

/**
 * 두 색상의 대비비 (WCAG 1.0~21.0).
 * 4.5 이상 = AA 본문, 3.0 이상 = AA 큰 텍스트, 7.0 이상 = AAA.
 */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 배경색 대비 어울리는 텍스트 색 (#000 / #fff) 자동 선택.
 * 배경이 어두우면 흰색, 밝으면 검정.
 */
export function pickContrastingText(bgHex: string): '#000000' | '#ffffff' {
  return relativeLuminance(bgHex) > 0.5 ? '#000000' : '#ffffff';
}

/** rgb → hex (#rrggbb). */
export function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
