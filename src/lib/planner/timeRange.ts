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

export const clampStartToLocalDay = (
  candidateStart: Date,
  anchorIso: string | Date,
  latestStartStepMs = 1,
): Date => {
  const { start, end } = localDayBounds(anchorIso);
  const minStartMs = start.getTime();
  // Clamp only the start instant into the visible day. The event itself may
  // legitimately continue past midnight and should appear on the next day too.
  const safeStepMs = Number.isFinite(latestStartStepMs)
    ? Math.max(1, latestStartStepMs)
    : 1;
  const maxStartMs = Math.max(minStartMs, end.getTime() - safeStepMs);
  const clampedMs = Math.min(maxStartMs, Math.max(minStartMs, candidateStart.getTime()));
  return new Date(clampedMs);
};

export const moveIntervalToLocalDayStart = (
  currentStartIso: string,
  currentEndIso: string,
  targetStartIso: string,
  anchorIso: string | Date = targetStartIso,
  latestStartStepMs = 1,
): { startAt: string; endAt: string; durationMs: number } => {
  const currentStartMs = new Date(currentStartIso).getTime();
  const currentEndMs = new Date(currentEndIso).getTime();
  const durationMs = Number.isFinite(currentStartMs) && Number.isFinite(currentEndMs)
    ? Math.max(1, currentEndMs - currentStartMs)
    : 30 * 60_000;
  const targetStart = clampStartToLocalDay(
    new Date(targetStartIso),
    anchorIso,
    latestStartStepMs,
  );

  return {
    startAt: targetStart.toISOString(),
    endAt: new Date(targetStart.getTime() + durationMs).toISOString(),
    durationMs,
  };
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
