/**
 * localStorage 가용 공간 측정 — 모든 store 가 localStorage 라 limit 가까이 가면 위험.
 *
 * 정확한 값은 browser 마다 다름 (5~10 MB). 추정·표시용.
 */

/** localStorage 에 저장된 모든 key 의 사용량 (UTF-16 기준 bytes 추정). */
export function estimateUsedBytes(): number {
  if (typeof localStorage === 'undefined') return 0;
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const value = localStorage.getItem(key) ?? '';
    // UTF-16: key + value 각 char 2 bytes
    total += (key.length + value.length) * 2;
  }
  return total;
}

/**
 * key 별 사용량 — 디버그 / dashboard 용. 내림차순.
 *   [{ key, bytes }, …]
 */
export function listUsageByKey(): Array<{ key: string; bytes: number }> {
  if (typeof localStorage === 'undefined') return [];
  const out: Array<{ key: string; bytes: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const value = localStorage.getItem(key) ?? '';
    out.push({ key, bytes: (key.length + value.length) * 2 });
  }
  return out.sort((a, b) => b.bytes - a.bytes);
}

/**
 * 가용 공간 추정 — 5MB 기본 limit 기준 백분율.
 * 80% 넘으면 경고, 95% 넘으면 위험.
 */
export function usagePercent(limitBytes = 5 * 1024 * 1024): number {
  return Math.min(100, (estimateUsedBytes() / limitBytes) * 100);
}
