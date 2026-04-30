/**
 * 반복 task 의 streak / completion rate 계산.
 *
 * 정책:
 * - Grace day 1회: 어제 빠뜨려도 streak 유지. 그제까지 빠뜨리면 reset.
 * - 미래 occurrence 는 통계 제외 (오늘 까지만 계산).
 * - 시리즈 시작부터 today 까지 occurrence 만 total 로 카운트.
 *
 * 출력:
 * - current: 오늘 또는 어제(grace) 까지 연속 done
 * - best: 역대 최장 streak
 * - rate: total 중 done 비율 (0~1)
 * - missed: 빠뜨린 occurrence 수
 * - total: 시리즈 시작부터 오늘 까지 총 occurrence (미래 제외)
 */
import type { PlannerTask } from '@/types/planner';
import { expandRecurrence } from './recurrence';

export interface StreakStats {
  current: number;
  best: number;
  rate: number;
  missed: number;
  total: number;
}

/** 하루 차이 ms. */
const DAY_MS = 86_400_000;

const startOfDay = (d: Date): number => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r.getTime();
};

const isSameDay = (a: number, b: number): boolean => a === b;

export function computeStreakStats(master: PlannerTask, now: Date = new Date()): StreakStats {
  if (!master.recurrence || !master.startAt) {
    return { current: 0, best: 0, rate: 0, missed: 0, total: 0 };
  }

  // 시리즈 시작부터 today + 1일 까지 expand (미래는 1일 까지만 — 오늘 occurrence 잡기 위해).
  const seriesStart = new Date(master.startAt);
  const todayMid = new Date(now);
  todayMid.setHours(23, 59, 59, 999);
  const instances = expandRecurrence(master, seriesStart, todayMid);

  // 미래 occurrence 제거 (오늘 끝나기 전까지만).
  const todayEnd = startOfDay(now) + DAY_MS;
  const past = instances.filter((inst) => new Date(inst.occurrenceStartIso).getTime() < todayEnd);

  const total = past.length;
  if (total === 0) {
    return { current: 0, best: 0, rate: 0, missed: 0, total: 0 };
  }

  const completions = master.seriesCompletions ?? {};
  let doneCount = 0;
  let best = 0;
  let runningStreak = 0;

  for (const inst of past) {
    const isDone = !!completions[inst.occurrenceStartIso];
    if (isDone) {
      doneCount += 1;
      runningStreak += 1;
      if (runningStreak > best) best = runningStreak;
    } else {
      runningStreak = 0;
    }
  }

  const missed = total - doneCount;
  const rate = total > 0 ? doneCount / total : 0;

  // 현재 streak — 마지막 occurrence 들 중 grace day(1회 면제) 적용.
  // 정책: today 또는 어제의 occurrence done 이면 streak 유지.
  // - 마지막 occurrence 가 today 거나 어제 (timestamp diff <= DAY_MS*1.5) 이고 done 이면 current = trailing run
  // - 마지막 occurrence 가 그 이전이면 (놓침이 2일 이상) current = 0
  let current = 0;
  if (past.length > 0) {
    const lastInst = past[past.length - 1];
    const lastTs = new Date(lastInst.occurrenceStartIso).getTime();
    const today = startOfDay(now);
    const yesterday = today - DAY_MS;

    // 마지막 occurrence 가 today 또는 어제(grace)면 current 살림.
    const recentEnough = lastTs >= yesterday;
    if (recentEnough) {
      // 뒤에서부터 done 카운트.
      let tail = 0;
      for (let i = past.length - 1; i >= 0; i--) {
        const inst = past[i];
        if (completions[inst.occurrenceStartIso]) {
          tail += 1;
        } else {
          // 마지막 한 번 빠뜨림은 grace 로 면제 (오늘 분만).
          // 마지막 occurrence 가 오늘이고 안 done 이면 어제까지의 연속을 streak 으로 인정.
          if (i === past.length - 1 && isSameDay(startOfDay(new Date(inst.occurrenceStartIso)), today)) {
            continue;
          }
          break;
        }
      }
      current = tail;
    }
  }

  return { current, best, rate, missed, total };
}

/** 점진 streak indicator — 0~7+ 단계별 시각화 결정.
 * 0: 표시 없음
 * 1-2: 작은 점 N개
 * 3-6: 🔥 N
 * 7+: 🔥 N · ★ (주 단위 milestone) */
export type StreakDisplay =
  | { kind: 'none' }
  | { kind: 'dots'; count: 1 | 2 }
  | { kind: 'fire'; count: number }
  | { kind: 'fire-star'; count: number };

export function streakDisplay(current: number): StreakDisplay {
  if (current <= 0) return { kind: 'none' };
  if (current === 1 || current === 2) return { kind: 'dots', count: current as 1 | 2 };
  if (current >= 7) return { kind: 'fire-star', count: current };
  return { kind: 'fire', count: current };
}
