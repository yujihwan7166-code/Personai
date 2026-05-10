/**
 * 시간 슬롯 헬퍼 — "다음 30분 슬롯" 같은 반복 로직 1군데 모음.
 *
 * 정책: 14:00 → 14:00 (그대로), 14:01~14:30 → 14:30, 14:31~14:59 → 15:00.
 * (floor 로 떨어뜨리면 과거 슬롯이 됨 — 사용자 의도와 거의 어긋남.)
 */

/** 주어진 시점 이후의 다음 30분 슬롯. 0초·0ms 로 정렬. */
export const nextHalfHourSlot = (from: Date = new Date()): Date => {
  const d = new Date(from);
  const mins = d.getMinutes();
  if (mins === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0) {
    return d; // 정확한 정시면 그대로
  }
  if (mins === 0) {
    d.setSeconds(0, 0);
    return d;
  }
  if (mins < 30) {
    d.setMinutes(30, 0, 0);
    return d;
  }
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
};
