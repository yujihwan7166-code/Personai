/**
 * 통합 플래너 — 도메인 타입 정의 (Phase 0)
 *
 * 4 entity (Goal · Task · Habit · ManualEvent) + 파생 타입.
 * 가상 이벤트(task/habit 발) 는 저장하지 않고 selector 가 합성한다.
 *
 * 모든 시각은 UTC epoch ms. KST 변환은 화면 표시 시점·`date.ts` 에서.
 * KST 03:00 day rollover 적용 (밤늦게 끝낸 작업도 오늘로).
 */

export type ID = string;
export type Epoch = number;          // UTC ms
export type DayKey = string;         // 'YYYY-MM-DD' (KST 03시 기준)
export type GoalCategory =
  | 'work' | 'health' | 'learning'
  | 'relationship' | 'finance' | 'personal';
export type Priority = 'low' | 'med' | 'high';

/** 모든 entity 공통 필드. version 은 미래 마이그레이션 대비. */
export interface Entity {
  id: ID;
  createdAt: Epoch;
  updatedAt: Epoch;
  version: 1;
}

// ──────────────────────────────────────────
// 🎯 Goal
// ──────────────────────────────────────────
export type GoalMetric =
  | { kind: 'count'; target: number }            // 자동 = 연결 task done 수 / target
  | { kind: 'percent'; manual: number };         // 수동 0-100 슬라이더

export interface Goal extends Entity {
  title: string;
  emoji?: string;
  category: GoalCategory;
  startedAt: Epoch;
  dueAt: Epoch;
  status: 'active' | 'completed' | 'archived';
  metric: GoalMetric;
  /** 진척률은 저장하지 않고 selector 가 task·habit 으로부터 계산. */
}

// ──────────────────────────────────────────
// ✅ Task
// ──────────────────────────────────────────
export interface Task extends Entity {
  title: string;
  notes?: string;
  done: boolean;
  doneAt?: Epoch;
  scheduledAt?: Epoch;        // 캘린더에 표시될 시점 (예정)
  dueAt?: Epoch;              // 마감 (지나면 빨강 강조)
  priority: Priority;
  goalId?: ID;
  habitId?: ID;               // 진짜 task 가 habit 발이면 (가상 todo 아님)
  parentTaskId?: ID;
  source: 'manual' | 'event';
}

// ──────────────────────────────────────────
// 🌱 Habit
// ──────────────────────────────────────────
export type HabitCadence =
  | { kind: 'daily' }
  | { kind: 'weekly'; days: number[] };          // 0=일 ~ 6=토 (KST 기준)

export interface Habit extends Entity {
  title: string;
  emoji?: string;
  cadence: HabitCadence;
  scheduleAt?: { hour: number; min: number };    // KST 표시
  goalId?: ID;
  startedAt: Epoch;
  archivedAt?: Epoch;
  /** 체크된 날만 키 보유. 미체크는 키 없음 (false 저장 X → 용량 절감). */
  history: Record<DayKey, true>;
}

// ──────────────────────────────────────────
// 📅 ManualEvent
// ──────────────────────────────────────────
export interface ManualEvent extends Entity {
  title: string;
  start: Epoch;
  end?: Epoch;
  allDay?: boolean;
  /** v1: 'daily' | 'weekly:0,1,5' 같은 단순 RRule 자체 포맷. */
  rrule?: string;
  goalId?: ID;
  color?: string;
  source: 'manual';
}

// ──────────────────────────────────────────
// 가상 이벤트 — 저장 X, selector 합성
// ──────────────────────────────────────────
export interface VirtualTaskEvent {
  kind: 'virtual_task';
  taskId: ID;
  start: Epoch;
  isDue: boolean;             // dueAt 발이면 true (빨강), scheduledAt 발이면 false (앰버)
  title: string;
  done: boolean;
}

export interface VirtualHabitEvent {
  kind: 'virtual_habit';
  habitId: ID;
  dayKey: DayKey;
  start?: Epoch;              // scheduleAt 있을 때만
  title: string;
  emoji?: string;
  done: boolean;              // history[dayKey] === true
}

export type CalendarRow = ManualEvent | VirtualTaskEvent | VirtualHabitEvent;

// ──────────────────────────────────────────
// 가상 todo (오늘 해야 할 습관)
// ──────────────────────────────────────────
export interface VirtualHabitTask {
  kind: 'virtual_habit_task';
  /** 가상 id. `virt_h_<habitId>_<dayKey>`. */
  id: ID;
  habitId: ID;
  dayKey: DayKey;
  title: string;
  emoji?: string;
  goalId?: ID;
  done: boolean;
}

export type TaskRow = Task | VirtualHabitTask;

// ──────────────────────────────────────────
// Cross-ref 인덱스 (selectors.ts 가 빌드)
// ──────────────────────────────────────────
export interface PlannerIndex {
  tasksByGoal: Map<ID, ID[]>;
  habitsByGoal: Map<ID, ID[]>;
  eventsByGoal: Map<ID, ID[]>;
  orphanTasks: ID[];
  orphanHabits: ID[];
  builtAtVersion: number;
}
