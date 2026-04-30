/**
 * 포모도로 / 집중 타이머 — 단일 활성 세션.
 *
 * 정책:
 * - 한 번에 한 세션만 (Forest / TickTick 패턴).
 * - taskId 가 있으면 그 task 의 endAt 기준으로 카운트다운.
 * - taskId 없으면 사용자 지정 분 (기본 25분 — pomodoro classic).
 * - 끝나면 옵션: task 자동 완료 / 5분 휴식 시작 / 그냥 알림만.
 * - stop / 자연 종료 시 pomodoroSessionLog 에 자동 기록.
 *
 * 메모리 + LocalStorage 하이브리드:
 * - 활성 상태 (현재 startedAt, durationMs, taskId) localStorage 에 저장
 *   → 새로고침/탭 전환 후에도 정확히 복원
 * - 1초 단위 tick 은 메모리 (timer 가 broadcast)
 *
 * Broadcast: PLANNER_POMODORO_CHANGED.
 */
import { pomodoroSessionLog } from './pomodoroSessionLog';

export const PLANNER_POMODORO_CHANGED = 'planner:pomodoro:changed';

export interface PomodoroSession {
  id: string;
  /** 연결된 task (시간 블록 시작이면). undefined = 자유 세션. */
  taskId?: string;
  /** task 인스턴스 id (가상 인스턴스 추적용 — 끝났을 때 자동 완료에 사용). */
  taskInstanceId?: string;
  /** 표시용 task 제목 (snapshot — task 가 변경/삭제돼도 라벨 유지). */
  taskTitle?: string;
  /** 세션 시작 ISO. */
  startedAt: string;
  /** 총 길이 (분). */
  durationMin: number;
  /** 끝났을 때 task 자동 완료할지. */
  autoComplete: boolean;
  /** 일시정지 상태 — 일시정지 시 누적된 ms. */
  pausedMs?: number;
  /** 일시정지 시작 시점. null 이면 현재 진행 중. */
  pausedAt?: string;
}

const STORAGE_KEY = 'planner.pomodoro.v1';

const safeRead = (): PomodoroSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PomodoroSession;
  } catch {
    return null;
  }
};

const safeWrite = (session: PomodoroSession | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (session === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
    window.dispatchEvent(new CustomEvent(PLANNER_POMODORO_CHANGED));
  } catch {
    /* silent */
  }
};

const newId = (): string =>
  `pom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export const pomodoroStore = {
  /** 현재 세션 (없으면 null). */
  current(): PomodoroSession | null {
    return safeRead();
  },

  /** 새 세션 시작. 기존 활성 세션이 있으면 덮어씀. */
  start(input: {
    taskId?: string;
    taskInstanceId?: string;
    taskTitle?: string;
    durationMin: number;
    autoComplete?: boolean;
  }): PomodoroSession {
    const session: PomodoroSession = {
      id: newId(),
      taskId: input.taskId,
      taskInstanceId: input.taskInstanceId,
      taskTitle: input.taskTitle,
      startedAt: new Date().toISOString(),
      durationMin: input.durationMin,
      autoComplete: input.autoComplete ?? false,
      pausedMs: 0,
    };
    safeWrite(session);
    return session;
  },

  /** 일시정지 토글. */
  togglePause(): void {
    const s = safeRead();
    if (!s) return;
    if (s.pausedAt) {
      // 재개 — pausedMs 에 누적
      const pausedDuration = Date.now() - new Date(s.pausedAt).getTime();
      safeWrite({ ...s, pausedMs: (s.pausedMs ?? 0) + pausedDuration, pausedAt: undefined });
    } else {
      // 일시정지
      safeWrite({ ...s, pausedAt: new Date().toISOString() });
    }
  },

  /** 세션 종료 (성공 또는 취소).
   * 자동으로 pomodoroSessionLog 에 기록 — 실제 집중한 시간 + 완료 여부. */
  stop(options: { completed?: boolean } = {}): void {
    const s = safeRead();
    if (s) {
      // 실제 집중 시간 계산.
      const now = new Date();
      const totalElapsedMs = now.getTime() - new Date(s.startedAt).getTime();
      const pausedMs = s.pausedMs ?? 0;
      const currentPauseMs = s.pausedAt ? now.getTime() - new Date(s.pausedAt).getTime() : 0;
      const focusMs = Math.max(0, totalElapsedMs - pausedMs - currentPauseMs);
      const actualMin = Math.round(focusMs / 60_000);
      // completed 자동 판정 — 명시 안 했으면 actualMin >= plannedMin 이면 완료.
      const completed = options.completed ?? (actualMin >= s.durationMin);
      // 1분 미만 세션은 기록 X (사용자가 즉시 cancel 등).
      if (actualMin >= 1) {
        pomodoroSessionLog.add({
          startedAt: s.startedAt,
          endedAt: now.toISOString(),
          plannedMin: s.durationMin,
          actualMin,
          completed,
          taskId: s.taskId,
          taskInstanceId: s.taskInstanceId,
          taskTitle: s.taskTitle,
        });
      }
    }
    safeWrite(null);
  },

  /** 남은 ms 계산 — 1초 단위 tick 에서 사용. */
  remainingMs(session: PomodoroSession, now: Date = new Date()): number {
    const totalMs = session.durationMin * 60_000;
    const elapsedRaw = now.getTime() - new Date(session.startedAt).getTime();
    const pausedMs = session.pausedMs ?? 0;
    const currentPauseMs = session.pausedAt
      ? now.getTime() - new Date(session.pausedAt).getTime()
      : 0;
    const elapsed = elapsedRaw - pausedMs - currentPauseMs;
    return Math.max(0, totalMs - elapsed);
  },

  /** 진행률 (0~1). */
  progress(session: PomodoroSession, now: Date = new Date()): number {
    const totalMs = session.durationMin * 60_000;
    const remaining = this.remainingMs(session, now);
    return totalMs > 0 ? 1 - remaining / totalMs : 0;
  },
};
