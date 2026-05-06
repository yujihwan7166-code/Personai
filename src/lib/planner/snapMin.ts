/**
 * 타임라인 드래그·리사이즈 스냅 단위(분).
 *
 * 사용자 선호 — localStorage 영속 + custom event 로 컴포넌트 전파.
 * 허용 값: 1 / 5 / 15 / 30. 그 외는 기본값 15 로 fallback.
 *
 * 사용 위치:
 * - TodayTimeline drag-to-create (yToMin)
 * - DraggableBlock resize (네이티브 pointer)
 * - Planner.handleDragEnd (블록 이동)
 */
const KEY = 'planner.timeline.snapMin.v1';
export const SNAP_MIN_CHANGED = 'planner-snap-min-changed';

export const SNAP_OPTIONS = [1, 5, 15, 30] as const;
export type SnapMin = (typeof SNAP_OPTIONS)[number];

export const getSnapMin = (): SnapMin => {
  if (typeof window === 'undefined') return 15;
  const raw = window.localStorage.getItem(KEY);
  const n = Number(raw);
  return (SNAP_OPTIONS as readonly number[]).includes(n) ? (n as SnapMin) : 15;
};

export const setSnapMin = (n: SnapMin): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, String(n));
  window.dispatchEvent(new CustomEvent(SNAP_MIN_CHANGED));
};
