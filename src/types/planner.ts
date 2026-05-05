/**
 * 통합 플래너 데이터 모델 — v1 (Event + Task 2종).
 *
 * 설계 원칙:
 * - 모든 시각은 ISO 8601 문자열로 직렬화 (LocalStorage 호환).
 * - source 필드로 외부 캘린더 연동 미래 대비 (v1 = 'user' 만 사용).
 * - goalId 필드는 미리 두되 v1 UI 노출 X (v3 목표 기능 도입 시 활용).
 * - priority/note/pinned 는 모두 optional — 기존 LocalStorage 데이터 호환.
 */

export type EventSource = 'user' | 'gcal' | 'outlook';

/** 우선순위 4단계 — TickTick 패턴.
 * 0 또는 미지정 = 없음 / 1 = 낮음 / 2 = 보통 / 3 = 높음. */
export type Priority = 0 | 1 | 2 | 3;

// ──────────────────────────────────────────────────────────────────────────
// 반복 일정 (Recurrence) — RFC 5545 RRULE 의 단순화 서브셋.
//
// 정책:
// - freq: daily / weekly / monthly / yearly 4종.
// - interval: 매 N단위 (기본 1).
// - byday: weekly 한정 — ['MO','WE','FR'] 등.
// - until/count: 종료 조건 (양자택일).
// - exdates: 시리즈에서 건너뛸 인스턴스의 시작 ISO 목록.
//
// 인스턴스 표현:
// - 가상 인스턴스 id = `${seriesId}@${occurrenceStartIso}` (충돌 없음).
// - 편집 정책 3종 (Apple Calendar 패턴): 이 항목만 / 이 항목과 이후 / 전체.
//   → src/lib/planner/seriesEdit.ts 참고.
// ──────────────────────────────────────────────────────────────────────────

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type WeekdayCode = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  /** 매 N단위. 기본 1. */
  interval?: number;
  /** weekly 한정 — 어느 요일에 반복할지. 미지정 시 시리즈 시작 요일 사용. */
  byday?: WeekdayCode[];
  /** 종료일 (포함). ISO 8601. count 와 양자택일. */
  until?: string;
  /** 총 N회 발생 후 종료. until 과 양자택일. */
  count?: number;
  /** 이 occurrence 의 시작 ISO 들은 건너뜀 (개별 인스턴스 삭제/이동의 흔적). */
  exdates?: string[];
}

export const WEEKDAY_ORDER: WeekdayCode[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
export const WEEKDAY_LABELS: Record<WeekdayCode, string> = {
  SU: '일', MO: '월', TU: '화', WE: '수', TH: '목', FR: '금', SA: '토',
};

/** 우선순위 색상 (Flag 아이콘 fill / 우선순위 dot 양쪽 사용). */
export const PRIORITY_COLORS: Record<Priority, string> = {
  0: 'hsl(var(--muted-foreground))',
  1: 'hsl(220 70% 55%)',  // blue
  2: 'hsl(45 80% 50%)',   // amber
  3: 'hsl(0 75% 55%)',    // rose
};

/** 우선순위 라벨 (메뉴/툴팁용). */
export const PRIORITY_LABELS: Record<Priority, string> = {
  0: '없음',
  1: '낮음',
  2: '보통',
  3: '높음',
};

/** 캘린더 일정 — 시작·끝 시간이 고정된 외부 약속 또는 시간 블록. */
export interface PlannerEvent {
  id: string;
  title: string;
  /** ISO 8601 시작 시각. 필수. */
  startAt: string;
  /** ISO 8601 종료 시각. 필수. */
  endAt: string;
  /** 시간 블록 색상 (HSL 또는 hex). 미지정 시 기본 색. */
  color?: string;
  source: EventSource;
  /** 반복 규칙. 있으면 이 항목은 시리즈 마스터 — listByDate 시 expand 됨. */
  recurrence?: RecurrenceRule;
  /** 겹침 lane 순서 우선권. 작을수록 좌측. 미지정 시 startAt 으로 fallback. */
  laneOrder?: number;
  createdAt: string;
}

/** 할일 — 시간 미배정(인박스) 또는 시간 배정(시간표) 양쪽 가능. */
export interface PlannerTask {
  id: string;
  title: string;
  done: boolean;
  /** 시간 배정된 경우 ISO 8601. 없으면 인박스. */
  startAt?: string;
  /** 시간 배정된 경우 ISO 8601. 없으면 인박스. */
  endAt?: string;
  /** 연결된 목표 id (v3 활용, v1 미사용). */
  goalId?: string;
  /** 연결된 목표 마일스톤 id. goalId 없이 단독으로 쓰지 않는다. */
  milestoneId?: string;
  /** 날짜 단위 실행 계획. 시간표에는 올리지 않았지만 특정 날짜에 하기로 고른 상태. */
  plannedFor?: string;
  /** 실행 상태. 기존 done/canceled와 호환하기 위해 선택 필드로 둔다. */
  status?: TaskStatus;
  /** 우선순위 (TickTick 패턴). 미지정 = 없음. */
  priority?: Priority;
  /** 할 일 자체의 색상. 리스트/목표 대신 가볍게 성격을 표시한다. */
  color?: TaskListColor;
  /** 본문/설명 — 자유 텍스트. */
  note?: string;
  /** 인박스 상단 고정. */
  pinned?: boolean;
  /** 취소됨 (Things3 Cancel 패턴) — 완료 X, 취소 X 두 상태 분리. */
  canceled?: boolean;
  /** Someday(보류) — 인박스 기본 보기에서 hide, 별도 'Someday' 탭에서만 표시. */
  someday?: boolean;
  /** 녹음 노트 액션 아이템에서 승격된 경우 출처 녹음 id. */
  sourceRecordingId?: string;
  /** 표시용 스냅샷 (녹음 삭제 후에도 라벨 유지). */
  sourceRecordingTitle?: string;
  /** 그 녹음의 몇 번째 액션 아이템에서 왔는지. */
  sourceActionIndex?: number;
  /** 반복 규칙. 있으면 이 항목은 시리즈 마스터 — listScheduled 시 expand 됨.
   * 시간 미배정(인박스) Task 에는 의미 없음 — startAt 가 있어야 expand 가능. */
  recurrence?: RecurrenceRule;
  /** 태그 (cross-cutting 분류). 자연어 입력에서 #tag 자동 추출 + 모달에서 명시 추가. */
  tags?: string[];
  /** 서브태스크 체크리스트 (TickTick/Things3 패턴). note 와 다른 차원 — 단계별 상태. */
  subtasks?: Subtask[];
  /** Eisenhower Matrix — 긴급함 (priority 와 별개 축). */
  urgent?: boolean;
  /** Eisenhower Matrix — 중요함. */
  important?: boolean;
  /** 사용자 분류 (List/Project) — 메모 폴더와 별개. 미설정 = 인박스. */
  listId?: string;
  /** 반복 시리즈 인스턴스별 완료 상태 — iso(occurrenceStartIso) → done.
   * 시리즈 마스터에만 의미. expand 시 각 occurrence 의 done 합성. */
  seriesCompletions?: Record<string, boolean>;
  /** 겹침 lane 순서 우선권. 작을수록 좌측. 가로 드래그로 사용자가 조정.
   * 미지정 시 startAt 정렬 fallback. */
  laneOrder?: number;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────────────────
// TaskList — 사용자 분류함 (TickTick Lists / Things3 Areas).
// 메모 폴더와 별개 store — 의미 도메인이 다르고 사용자가 같이 묶고 싶지 않음.
// ──────────────────────────────────────────────────────────────────────────

/** 8색 한정 팔레트 — 같은 색이 여러 list 에서 재사용 가능 (사용자 명시 선택). */
export type TaskListColor =
  | 'blue' | 'teal' | 'amber' | 'rose' | 'violet' | 'green' | 'orange' | 'cyan';

export const TASK_LIST_COLORS: Record<TaskListColor, { stripe: string; chipBg: string; chipText: string }> = {
  blue:   { stripe: 'hsl(220 70% 55%)', chipBg: 'hsl(220 70% 95%)', chipText: 'hsl(220 70% 35%)' },
  teal:   { stripe: 'hsl(180 50% 45%)', chipBg: 'hsl(160 50% 92%)', chipText: 'hsl(160 50% 30%)' },
  amber:  { stripe: 'hsl(40 80% 50%)',  chipBg: 'hsl(45 80% 92%)',  chipText: 'hsl(35 75% 35%)' },
  rose:   { stripe: 'hsl(0 70% 55%)',   chipBg: 'hsl(0 60% 94%)',   chipText: 'hsl(0 60% 40%)' },
  violet: { stripe: 'hsl(270 50% 55%)', chipBg: 'hsl(270 50% 94%)', chipText: 'hsl(270 45% 40%)' },
  green:  { stripe: 'hsl(140 50% 45%)', chipBg: 'hsl(140 50% 92%)', chipText: 'hsl(140 50% 30%)' },
  orange: { stripe: 'hsl(15 80% 55%)',  chipBg: 'hsl(15 70% 93%)',  chipText: 'hsl(15 70% 38%)' },
  cyan:   { stripe: 'hsl(195 60% 50%)', chipBg: 'hsl(195 60% 92%)', chipText: 'hsl(195 60% 32%)' },
};

export interface TaskList {
  id: string;
  name: string;
  /** 이모지 prefix — 시각적 식별. 미설정 시 색 dot 만. */
  emoji?: string;
  color: TaskListColor;
  /** 사이드바 정렬 순서 (작은 값이 위). */
  order: number;
  /** 시간표/주뷰 에서 이 list 의 task 숨김 — 사용자가 명시적으로 토글. */
  hidden?: boolean;
  createdAt: string;
}

/** Store 변경 broadcast. */
export const PLANNER_LIST_CHANGED = 'planner:list:changed';

// ──────────────────────────────────────────────────────────────────────────
// Goals — 목표 → 마일스톤 → 작업 연결.

export type GoalStatus = 'active' | 'paused' | 'done';
export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done' | 'canceled';
export type GoalColor = 'slate' | 'blue' | 'teal' | 'amber' | 'rose' | 'violet' | 'green';

export const GOAL_COLORS: Record<GoalColor, { stripe: string; chipBg: string; chipText: string }> = {
  slate:  { stripe: 'hsl(215 16% 47%)', chipBg: 'hsl(210 20% 96%)', chipText: 'hsl(215 20% 28%)' },
  blue:   { stripe: 'hsl(220 70% 55%)', chipBg: 'hsl(220 70% 95%)', chipText: 'hsl(220 70% 35%)' },
  teal:   { stripe: 'hsl(180 50% 42%)', chipBg: 'hsl(170 52% 93%)', chipText: 'hsl(175 52% 28%)' },
  amber:  { stripe: 'hsl(40 82% 50%)',  chipBg: 'hsl(44 82% 93%)',  chipText: 'hsl(36 76% 32%)' },
  rose:   { stripe: 'hsl(350 72% 56%)', chipBg: 'hsl(350 70% 95%)', chipText: 'hsl(350 62% 38%)' },
  violet: { stripe: 'hsl(265 55% 58%)', chipBg: 'hsl(265 58% 95%)', chipText: 'hsl(265 45% 38%)' },
  green:  { stripe: 'hsl(145 52% 42%)', chipBg: 'hsl(145 52% 93%)', chipText: 'hsl(145 48% 28%)' },
};

export interface PlannerGoal {
  id: string;
  title: string;
  color: GoalColor;
  status: GoalStatus;
  dueDate?: string;
  description?: string;
  order: number;
  createdAt: string;
}

export interface PlannerMilestone {
  id: string;
  goalId: string;
  title: string;
  done: boolean;
  dueDate?: string;
  order: number;
  createdAt: string;
}

export const PLANNER_GOAL_CHANGED = 'planner:goal:changed';

// ──────────────────────────────────────────────────────────────────────────
// D-day — 시험/발표/생일/마감 같은 특별한 날 카운트다운.

export interface PlannerDday {
  id: string;
  label: string;
  /** 'YYYY-MM-DD' 로컬 날짜 키. */
  dateIso: string;
  createdAt: string;
}

export const PLANNER_DDAY_CHANGED = 'planner:dday:changed';

/** 서브태스크 — Task 내부 체크리스트 항목.
 * note (free-form 텍스트) 와 분리: 단계 진행 상태가 있는 작은 단위 액션. */
export interface Subtask {
  id: string;
  text: string;
  done: boolean;
  /** 정렬 순서 — 작은 값이 위. */
  order: number;
}

/**
 * 가상 인스턴스 — 시리즈 마스터에서 expand 된 결과.
 *
 * 실제 store 에 저장되지 않음. listByDate / listScheduled 가 반환할 때 합성.
 * id 형식: `${master.id}@${occurrenceStartIso}` — 충돌 없음.
 */
export interface RecurrenceInstance<T extends PlannerEvent | PlannerTask> {
  /** 합성 id (`master@iso`). */
  id: string;
  /** 원본 마스터 항목 — 편집 시 시리즈 정책 분기에 사용. */
  master: T;
  /** 이 occurrence 의 시작 ISO. */
  occurrenceStartIso: string;
  /** 이 occurrence 의 종료 ISO (마스터의 길이만큼 시프트). */
  occurrenceEndIso: string;
}

/** 시간표 합쳐서 보여줄 때의 통합 항목 (Event + 시간 배정 Task). */
export type PlannerTimelineItem =
  | { kind: 'event'; data: PlannerEvent }
  | { kind: 'task'; data: PlannerTask };

/** Store 변경 broadcast 이벤트 이름. */
export const PLANNER_EVENT_CHANGED = 'planner:event:changed';
export const PLANNER_TASK_CHANGED = 'planner:task:changed';
