import { toDateKey } from '@/lib/planner/habitStats';

export const overlappingLocalDayKeys = (startAt?: string, endAt?: string): string[] => {
  if (!startAt) return [];
  const startMs = new Date(startAt).getTime();
  if (!Number.isFinite(startMs)) return [];

  const parsedEndMs = endAt ? new Date(endAt).getTime() : startMs;
  const endMs = Number.isFinite(parsedEndMs) && parsedEndMs > startMs ? parsedEndMs : startMs + 1;

  const cursor = new Date(startMs);
  cursor.setHours(0, 0, 0, 0);
  const lastDay = new Date(endMs - 1);
  lastDay.setHours(0, 0, 0, 0);

  const keys: string[] = [];
  while (cursor.getTime() <= lastDay.getTime()) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
};

export const timeLabelForLocalDay = (
  startAt: string,
  dayKey: string,
  continuationLabel = '계속',
): string =>
  toDateKey(new Date(startAt)) === dayKey
    ? new Date(startAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    : continuationLabel;
