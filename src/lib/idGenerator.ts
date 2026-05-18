/**
 * ID 생성 유틸 — 모든 store 에서 각자 다른 패턴으로 newId() 만들고 있어 통일.
 *
 * 형식: `<prefix>_<base36 timestamp>_<random 6자>`
 *   예: 'tsk_lp2k8s_x9q4n3'
 *
 * 충돌 가능성:
 *   - timestamp(ms) 같은 ms 안에 같은 prefix 로 동일 random 6자 = 36^6 ≈ 2B 분의 1
 *   - 모든 store/세션 합쳐도 충돌 거의 없음.
 */

/**
 * prefix 기반 ID 생성. prefix 가 비어있으면 'id' 사용.
 */
export function newId(prefix = 'id'): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `${prefix}_${ts}_${rand}`;
}

/**
 * 짧은 ID (8자) — UI 표시용 (라벨/뱃지). 충돌 방지가 덜 중요한 곳만 사용.
 */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 10).padEnd(8, '0');
}

/**
 * 정렬 가능한 ID — base36 timestamp + 짧은 random.
 * 같은 prefix 내에서 createdAt 비교 대신 ID 비교만으로 시간 순 정렬 가능.
 */
export function sortableId(prefix = 'id'): string {
  const ts = Date.now().toString(36).padStart(9, '0');
  const rand = Math.random().toString(36).slice(2, 6).padEnd(4, '0');
  return `${prefix}_${ts}_${rand}`;
}
