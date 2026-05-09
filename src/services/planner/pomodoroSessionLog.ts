/**
 * 포모도로 세션 기록 — 완료/중단된 모든 세션 누적.
 *
 * 정책:
 * - LocalStorage 기반 (planner.pomodoro-log.v1).
 * - 30일 이상된 세션은 자동 정리 (옵션) — v1 은 모두 보존.
 * - completed: false 도 기록 (실제 집중 시간 추적).
 *
 * Broadcast: PLANNER_POMODORO_LOG_CHANGED.
 */
export const PLANNER_POMODORO_LOG_CHANGED = 'planner:pomodoro:log:changed';

export interface PomodoroSessionRecord {
  id: string;
  /** 세션 시작 ISO. */
  startedAt: string;
  /** 세션 종료 ISO (실제 stop 시점). */
  endedAt: string;
  /** 계획된 길이 (분). */
  plannedMin: number;
  /** 실제 집중한 길이 (분) — 일시정지 제외. */
  actualMin: number;
  /** 계획대로 끝났는지 (true) / 중단된 건지 (false). */
  completed: boolean;
  /** 세션 단계 — 통계에서 work 만 집계. */
  phase?: 'work' | 'short-break' | 'long-break';
  /** 연결된 task — 있으면. */
  taskId?: string;
  /** 가상 인스턴스 id (시리즈 추적). */
  taskInstanceId?: string;
  /** 표시용 task 제목 (snapshot). */
  taskTitle?: string;
}

const STORAGE_KEY = 'planner.pomodoro-log.v1';

const safeRead = (): PomodoroSessionRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PomodoroSessionRecord[]) : [];
  } catch {
    return [];
  }
};

const safeWrite = (records: PomodoroSessionRecord[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent(PLANNER_POMODORO_LOG_CHANGED));
  } catch {
    /* silent */
  }
};

const newId = (): string =>
  `pomlog_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export const pomodoroSessionLog = {
  /** 모든 기록 (시작 시각 내림차순 — 최신 먼저). */
  list(): PomodoroSessionRecord[] {
    return [...safeRead()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  },

  /** 새 세션 기록 추가. */
  add(input: Omit<PomodoroSessionRecord, 'id'>): PomodoroSessionRecord {
    const next: PomodoroSessionRecord = { ...input, id: newId() };
    safeWrite([next, ...safeRead()]);
    return next;
  },

  /** 특정 일자 (로컬) 의 세션들. ISO prefix 비교는 UTC 기준이라 KST 새벽 시간대가
   *  전날로 분류되는 버그가 있어, timestamp 범위 비교로 통일 (eventStore.listByDate 와 동일 패턴). */
  listByDay(dateIso: string): PomodoroSessionRecord[] {
    const day = new Date(dateIso);
    const rangeStart = new Date(day);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(rangeStart.getTime() + 86_400_000);
    const startMs = rangeStart.getTime();
    const endMs = rangeEnd.getTime();
    return safeRead()
      .filter((r) => {
        const t = new Date(r.startedAt).getTime();
        return t >= startMs && t < endMs;
      })
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  },

  /** 범위 내 모든 세션 (rangeStart 포함, rangeEnd 제외). */
  listByRange(rangeStart: Date, rangeEnd: Date): PomodoroSessionRecord[] {
    const startMs = rangeStart.getTime();
    const endMs = rangeEnd.getTime();
    return safeRead()
      .filter((r) => {
        const t = new Date(r.startedAt).getTime();
        return t >= startMs && t < endMs;
      })
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  },

  /** 특정 task 의 세션들 (가상 인스턴스 id 또는 master id). */
  listByTask(taskId: string): PomodoroSessionRecord[] {
    return safeRead()
      .filter((r) => r.taskId === taskId || r.taskInstanceId === taskId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  },

  /** 전체 삭제 (테스트 / 사용자 reset). */
  clear(): void {
    safeWrite([]);
  },
};
