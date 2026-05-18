/**
 * range — 정수 시퀀스 생성.
 *
 * Python range 와 동일. step 음수 지원.
 * 무한 루프 방지 (step=0 → []).
 */

export function range(stop: number): number[];
export function range(start: number, stop: number, step?: number): number[];
export function range(a: number, b?: number, step: number = 1): number[] {
  const start = b === undefined ? 0 : a;
  const stop = b === undefined ? a : b;
  if (step === 0 || !Number.isFinite(step)) return [];
  const out: number[] = [];
  if (step > 0) {
    for (let i = start; i < stop; i += step) out.push(i);
  } else {
    for (let i = start; i > stop; i += step) out.push(i);
  }
  return out;
}

/** [start, stop] 포함 정수 (step=1). */
export function rangeInclusive(start: number, stop: number): number[] {
  const out: number[] = [];
  if (start <= stop) for (let i = start; i <= stop; i++) out.push(i);
  else for (let i = start; i >= stop; i--) out.push(i);
  return out;
}
