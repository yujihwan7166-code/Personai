/**
 * 포모도로 통계 hook — 일/주/월 누적 + streak + per-task.
 *
 * Streak 정책 (Habitica 패턴):
 * - 하루 최소 1세션 = 활성일
 * - 어제 빠뜨려도 grace day 1회 면제
 * - 그제까지 빠뜨리면 reset
 */
import { useEffect, useState, useMemo } from 'react';
import {
  pomodoroSessionLog,
  PLANNER_POMODORO_LOG_CHANGED,
  type PomodoroSessionRecord,
} from '@/services/planner/pomodoroSessionLog';

export interface PomodoroStats {
  /** 오늘 완료한 세션 수 (completed: true 만). */
  todayCount: number;
  /** 오늘 누적 집중 분 (completed 무관, actualMin 합). */
  todayMinutes: number;
  /** 이번 주 (월요일~) 세션 수. */
  weekCount: number;
  /** 이번 주 누적 분. */
  weekMinutes: number;
  /** 연속 활성일 streak (어제 grace 1회 면제). */
  streak: number;
  /** 역대 최장 streak. */
  bestStreak: number;
  /** 최근 14일 일별 분 (heatmap / chart 용). idx 0 = 오늘. */
  last14DaysMinutes: number[];
}

const DAY_MS = 86_400_000;

const startOfDay = (d: Date): number => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r.getTime();
};

const startOfWeekMon = (d: Date): number => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  // 0=일, 1=월 ... 한국식 — 월요일 시작.
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  return r.getTime();
};

export const usePomodoroStats = (): PomodoroStats => {
  const [records, setRecords] = useState<PomodoroSessionRecord[]>([]);

  useEffect(() => {
    const refresh = () => setRecords(pomodoroSessionLog.list());
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_POMODORO_LOG_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_POMODORO_LOG_CHANGED, refresh);
  }, []);

  return useMemo<PomodoroStats>(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = startOfWeekMon(now);

    let todayCount = 0;
    let todayMinutes = 0;
    let weekCount = 0;
    let weekMinutes = 0;

    // 일별 분 누적 — 14일치.
    const dailyMin: number[] = Array.from({ length: 14 }, () => 0);
    // 활성일 set (streak 계산용).
    const activeDays = new Set<number>();

    for (const r of records) {
      const ts = new Date(r.startedAt).getTime();
      const dayStart = startOfDay(new Date(r.startedAt));
      const daysAgo = Math.floor((today - dayStart) / DAY_MS);

      if (dayStart === today) {
        if (r.completed) todayCount += 1;
        todayMinutes += r.actualMin;
      }
      if (ts >= weekStart) {
        if (r.completed) weekCount += 1;
        weekMinutes += r.actualMin;
      }
      if (daysAgo >= 0 && daysAgo < 14) {
        dailyMin[daysAgo] += r.actualMin;
      }
      // streak — actualMin >= 1 인 날을 활성일.
      if (r.actualMin >= 1) {
        activeDays.add(dayStart);
      }
    }

    // 현재 streak — 오늘 또는 어제(grace) 까지 연속.
    let streak = 0;
    if (activeDays.has(today)) {
      streak = 1;
      let cursor = today - DAY_MS;
      while (activeDays.has(cursor)) {
        streak += 1;
        cursor -= DAY_MS;
      }
    } else if (activeDays.has(today - DAY_MS)) {
      // 어제까지만 활성 — grace 안 적용 (오늘 빠뜨리면 streak 종료).
      // 하지만 표시상 어제 streak 보존 (부드러운 nudge).
      streak = 1;
      let cursor = today - 2 * DAY_MS;
      while (activeDays.has(cursor)) {
        streak += 1;
        cursor -= DAY_MS;
      }
    }

    // 역대 최장 streak — 모든 활성일 정렬 후 연속 길이 계산.
    let bestStreak = 0;
    const sortedDays = [...activeDays].sort((a, b) => a - b);
    let runStart = -1;
    let runLen = 0;
    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0 || sortedDays[i] - sortedDays[i - 1] === DAY_MS) {
        runLen += 1;
      } else {
        runLen = 1;
        runStart = i;
      }
      if (runLen > bestStreak) bestStreak = runLen;
    }
    if (sortedDays.length > 0 && bestStreak === 0) bestStreak = 1;

    return {
      todayCount,
      todayMinutes,
      weekCount,
      weekMinutes,
      streak,
      bestStreak,
      last14DaysMinutes: dailyMin,
    };
  }, [records]);
};
