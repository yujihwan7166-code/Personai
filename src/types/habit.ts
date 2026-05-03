/**
 * 습관(Habit) 데이터 모델 — v1.
 *
 * 설계 원칙:
 * - 모든 옵셔널 필드는 v1 부터 다 정의해 마이그레이션 회피.
 * - 날짜 키는 로컬 YYYY-MM-DD (taskStore 와 동일 컨벤션).
 * - 체크인은 immutable append-only — 회고 분석/동기화 친화.
 */
import type { TaskListColor, WeekdayCode } from './planner';

export type HabitGoalKind = 'do' | 'avoid';
export type HabitFreq = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface HabitSchedule {
  freq: HabitFreq;
  /** 매 N단위 (default 1). */
  interval?: number;
  /** weekly 한정 — 어느 요일에. */
  weekdays?: WeekdayCode[];
  /** monthly 한정 — 어느 N일에 (1~31). */
  monthDays?: number[];
  /** custom — 특정 날짜 list (YYYY-MM-DD). */
  customDates?: string[];
  /** 하루 N회 (예: 물 8잔). 미지정 시 1. */
  timesPerDay?: number;
}

export interface Habit {
  id: string;
  title: string;
  emoji: string;
  color: TaskListColor;
  goalKind: HabitGoalKind;

  schedule: HabitSchedule;

  /** 단위 (잔/분/회/페이지 등 자유 텍스트). */
  unit?: string;
  /** 일일 리마인더 시각 list — 'HH:mm'. */
  reminders?: string[];

  /** 시작 날짜 (YYYY-MM-DD) — 이전 날짜는 통계 제외. */
  startDate: string;
  /** 종료 날짜 (옵션). */
  endDate?: string;

  archived: boolean;
  pinned: boolean;
  /** drag 정렬용. 작을수록 위. */
  sortOrder: number;
  createdAt: string;
  updatedAt: string;

  /** 카테고리 그룹핑 (옵션, 향후). */
  category?: string;
  /** 습관 자체 설명/이유. */
  notes?: string;
}

export interface HabitCheckin {
  id: string;
  habitId: string;
  /** 로컬 YYYY-MM-DD. */
  date: string;
  /** timesPerDay 사용 시 누적 (예: 6/8잔). 미지정 = 1. */
  count?: number;
  /** 그날 메모. */
  note?: string;
  createdAt: string;
}

/** 변경 이벤트 — 스토어가 broadcast. */
export const HABIT_CHANGED = 'planner:habits-changed';
export const HABIT_CHECKIN_CHANGED = 'planner:habit-checkins-changed';
