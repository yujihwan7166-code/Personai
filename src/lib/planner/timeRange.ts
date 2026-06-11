export const DAY_MS = 86_400_000;

export const localDayBounds = (dateIso: string | Date): { start: Date; end: Date } => {
  const start = new Date(dateIso);
  start.setHours(0, 0, 0, 0);
  return { start, end: new Date(start.getTime() + DAY_MS) };
};

export const intervalOverlapsRange = (
  startIso: string | undefined,
  endIso: string | undefined,
  rangeStart: Date,
  rangeEnd: Date,
): boolean => {
  if (!startIso) return false;
  const startMs = new Date(startIso).getTime();
  if (!Number.isFinite(startMs)) return false;
  let endMs = endIso ? new Date(endIso).getTime() : startMs;
  if (!Number.isFinite(endMs)) return false;
  if (endMs < startMs) return false;
  if (endMs === startMs) endMs = startMs + 1;
  return startMs < rangeEnd.getTime() && endMs > rangeStart.getTime();
};

/**
 * 후보 시작 시각을 anchor 의 그 날 안에 묶는다.
 *
 * 끝 시각이 자정을 넘기는 것은 허용한다 — Apple Calendar / Google Calendar 패턴.
 * 22:00 슬롯에 4시간짜리 일정을 떨어뜨리면 끝은 다음날 02:00 까지 자연스럽게 흐르고,
 * WeekView / MonthView / TodayTimeline 모두 자정 가로지름을 양쪽 날짜에 표시한다.
 *
 * (이전엔 끝 = 시작 + duration 을 자정 안에 강제하려고 시작을 역산해서, 22시에 220분
 * 일정을 두면 시작이 20:20 으로 끌려가는 버그가 있었다 — duration 인자는 호환성을
 * 위해 받지만 더 이상 시작 위치 계산에 영향을 주지 않는다.)
 */
export const clampStartToLocalDay = (
  candidateStart: Date,
  anchorIso: string | Date,
  _durationMs = 0,
): Date => {
  const { start, end } = localDayBounds(anchorIso);
  const minStartMs = start.getTime();
  const maxStartMs = Math.max(minStartMs, end.getTime() - 1);
  const clampedMs = Math.min(maxStartMs, Math.max(minStartMs, candidateStart.getTime()));
  return new Date(clampedMs);
};

export const recurrenceLookupStart = (
  startIso: string | undefined,
  endIso: string | undefined,
  rangeStart: Date,
): Date => {
  if (!startIso || !endIso) return new Date(rangeStart.getTime() - DAY_MS);
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  const durationMs = Number.isFinite(startMs) && Number.isFinite(endMs)
    ? Math.max(DAY_MS, endMs - startMs)
    : DAY_MS;
  return new Date(rangeStart.getTime() - durationMs);
};
