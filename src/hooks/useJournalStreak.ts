/**
 * 연속 작성일 (streak) — Things3/Twos 패턴.
 *
 * 규칙:
 * - 오늘 작성 시: 오늘 포함 연속일 카운트
 * - 오늘 미작성 시: 어제부터 거꾸로 연속일 카운트 (오늘 쓰면 +1 됨)
 * - 0 인 경우 X (작성 0일 또는 어제도 X)
 */
import { useMemo } from 'react';
import type { JournalEntry } from '@/types/journal';

const calculateStreak = (entries: JournalEntry[]): number => {
  if (entries.length === 0) return 0;
  const dates = new Set(entries.map((e) => e.date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  // 오늘 작성 여부 확인
  const todayStr = today.toISOString().slice(0, 10);
  const writtenToday = dates.has(todayStr);

  // 시작점: 오늘 (작성) 또는 어제 (미작성)
  const cursor = new Date(today);
  if (!writtenToday) {
    cursor.setDate(today.getDate() - 1);
  }

  // 365일까지 거꾸로 카운트
  for (let i = 0; i < 365; i++) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (dates.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

export const useJournalStreak = (entries: JournalEntry[]): number => {
  return useMemo(() => calculateStreak(entries), [entries]);
};
