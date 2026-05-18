/**
 * 회전 핸들 드래그 → rotation 계산 (도 0~360).
 *
 * 순수 함수. 테스트 가능.
 * - 박스 중심점 (cx, cy) 과 포인터 시작점에서 startAngle 계산
 * - 현재 포인터에서 cur 계산
 * - 차이를 startRotation 에 더하고 0~360 정규화
 * - shift 키 → 15도 snap
 * - 0/360 근사 → 정확히 0
 */

export interface RotateInput {
  startRotation: number;
  startAngle: number;  // 도 (atan2 결과)
  curAngle: number;    // 도
  shift?: boolean;
}

export function computeRotation(input: RotateInput): number {
  const { startRotation, startAngle, curAngle, shift } = input;
  let r = startRotation + (curAngle - startAngle);
  // -∞ ~ +∞ → 0~360 정규화
  r = ((r % 360) + 360) % 360;
  if (shift) r = Math.round(r / 15) * 15;
  // 360 이 된 경우 0 으로
  if (r >= 360) r -= 360;
  // 0 도 근처면 정확히 0
  if (Math.abs(r) < 0.5 || Math.abs(r - 360) < 0.5) r = 0;
  return r;
}

/** 두 점 사이 각도 (도, -180 ~ 180). */
export function angleBetween(cx: number, cy: number, px: number, py: number): number {
  return Math.atan2(py - cy, px - cx) * 180 / Math.PI;
}
