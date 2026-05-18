/**
 * 난수·샘플링 유틸 — Math.random 기반 (비암호).
 *
 * 게임/플레이어 모드, AI 추천 셔플, 일기 무작위 카드 등에 활용.
 */

/** [min, max) 정수. min/max 같으면 min. */
export function randomInt(min: number, max: number): number {
  if (max <= min) return Math.floor(min);
  return Math.floor(min + Math.random() * (max - min));
}

/** 배열에서 1개 임의 — 빈 배열은 undefined. */
export function randomPick<T>(arr: readonly T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[randomInt(0, arr.length)];
}

/** Fisher-Yates 셔플 — 새 배열 반환 (원본 무변). */
export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** N 개 샘플 — 중복 없이. n >= length 면 모두 반환 (셔플됨). */
export function sample<T>(arr: readonly T[], n: number): T[] {
  if (n <= 0) return [];
  if (n >= arr.length) return shuffle(arr);
  return shuffle(arr).slice(0, n);
}

/** 가중치 기반 1개 선택. items.length === weights.length 가정. */
export function weightedPick<T>(items: readonly T[], weights: readonly number[]): T | undefined {
  if (items.length === 0 || items.length !== weights.length) return undefined;
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return undefined;
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
