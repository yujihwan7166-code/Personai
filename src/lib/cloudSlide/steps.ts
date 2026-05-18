/** 슬라이드 에디터 — 글자/선/줄간격/모서리 반경 단계 헬퍼. */

/** 글자 크기 단계 (rem) — px ≈ rem × 16. */
export const FONT_STEPS_REM = [
  0.625, 0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.75,
  2, 2.25, 2.6, 3, 3.5, 4, 5, 6,
];

export function nextFontSize(cur: number, dir: 1 | -1): number {
  let idx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < FONT_STEPS_REM.length; i++) {
    const d = Math.abs(FONT_STEPS_REM[i] - cur);
    if (d < bestDist) { bestDist = d; idx = i; }
  }
  const ni = Math.max(0, Math.min(FONT_STEPS_REM.length - 1, idx + dir));
  return FONT_STEPS_REM[ni];
}

/** 도형 테두리/선 굵기 단계 (px) */
export const STROKE_STEPS_PX = [1, 2, 3, 4, 6, 8, 12, 16];

export function nextStrokeWidth(cur: number, dir: 1 | -1): number {
  let idx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < STROKE_STEPS_PX.length; i++) {
    const d = Math.abs(STROKE_STEPS_PX[i] - cur);
    if (d < bestDist) { bestDist = d; idx = i; }
  }
  const ni = Math.max(0, Math.min(STROKE_STEPS_PX.length - 1, idx + dir));
  return STROKE_STEPS_PX[ni];
}

/** 텍스트 줄간격 단계 (배수) */
export const LINE_HEIGHT_STEPS = [1, 1.15, 1.25, 1.5, 1.75, 2];

/**
 * 줄간격 다음 단계. dir 미지정 시 순환 (기존 동작 유지).
 * dir=1/-1 지정 시 clamp (다른 next* 들과 일관).
 */
export function nextLineHeight(cur: number, dir?: 1 | -1): number {
  const idx = LINE_HEIGHT_STEPS.findIndex((v) => Math.abs(v - cur) < 0.01);
  if (dir === undefined) {
    return LINE_HEIGHT_STEPS[(idx + 1) % LINE_HEIGHT_STEPS.length];
  }
  // 가장 가까운 단계 기준으로 +1/-1 (clamp)
  let nearest = 0;
  let bestDist = Infinity;
  for (let i = 0; i < LINE_HEIGHT_STEPS.length; i++) {
    const d = Math.abs(LINE_HEIGHT_STEPS[i] - cur);
    if (d < bestDist) { bestDist = d; nearest = i; }
  }
  const ni = Math.max(0, Math.min(LINE_HEIGHT_STEPS.length - 1, nearest + dir));
  return LINE_HEIGHT_STEPS[ni];
}

/** rect 도형 모서리 반경 단계 (px) */
export const RADIUS_STEPS_PX = [0, 4, 8, 12, 16, 24, 32, 48];

export function nextRadius(cur: number, dir: 1 | -1): number {
  let idx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < RADIUS_STEPS_PX.length; i++) {
    const d = Math.abs(RADIUS_STEPS_PX[i] - cur);
    if (d < bestDist) { bestDist = d; idx = i; }
  }
  const ni = Math.max(0, Math.min(RADIUS_STEPS_PX.length - 1, idx + dir));
  return RADIUS_STEPS_PX[ni];
}
