/**
 * 할일(Task) 영속 store — LocalStorage 기반.
 *
 * Event 와 달리 Task 는 시간 미배정(인박스) / 시간 배정(시간표) 양쪽 가능.
 * - listInbox(): startAt 미정 항목
 * - listScheduled(date): startAt 이 해당 날짜인 항목
 *
 * 변경 broadcast: PLANNER_TASK_CHANGED.
 */
import { PlannerTask, PLANNER_TASK_CHANGED } from '@/types/planner';

const STORAGE_KEY = 'planner.tasks.v1';

const safeRead = (): PlannerTask[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlannerTask[]) : [];
  } catch {
    return [];
  }
};

const safeWrite = (tasks: PlannerTask[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent(PLANNER_TASK_CHANGED));
  } catch {
    /* silent */
  }
};

const newId = (): string =>
  `tsk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const taskStore = {
  /** 모든 할일 (생성 시각 내림차순 — 최신 먼저). */
  list(): PlannerTask[] {
    return [...safeRead()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  },

  /** 시간 미배정(인박스) 할일만. */
  listInbox(): PlannerTask[] {
    return safeRead()
      .filter((t) => !t.startAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** 특정 날짜에 시간 배정된 할일 (시작 시각 오름차순). */
  listScheduled(dateIso: string): PlannerTask[] {
    const dayPrefix = dateIso.slice(0, 10);
    return safeRead()
      .filter((t) => t.startAt && t.startAt.slice(0, 10) === dayPrefix)
      .sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''));
  },

  add(input: Omit<PlannerTask, 'id' | 'createdAt' | 'done'> & { done?: boolean }): PlannerTask {
    const next: PlannerTask = {
      ...input,
      done: input.done ?? false,
      id: newId(),
      createdAt: new Date().toISOString(),
    };
    safeWrite([...safeRead(), next]);
    return next;
  },

  update(id: string, patch: Partial<Omit<PlannerTask, 'id' | 'createdAt'>>): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch };
    safeWrite(all);
  },

  /** done 토글 — 자주 쓰는 패턴 헬퍼. */
  toggleDone(id: string): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], done: !all[idx].done };
    safeWrite(all);
  },

  /** 핀 토글 — 인박스 상단 고정. */
  togglePinned(id: string): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], pinned: !all[idx].pinned };
    safeWrite(all);
  },

  /** 취소 토글 — Things3 Cancel 패턴. done 과 별개 상태. */
  toggleCanceled(id: string): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], canceled: !all[idx].canceled };
    safeWrite(all);
  },

  /** Someday(보류) 토글 — 인박스에서 분리. */
  toggleSomeday(id: string): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], someday: !all[idx].someday };
    safeWrite(all);
  },

  /** 시간 배정 (인박스 → 시간표). startAt/endAt 만 갱신. */
  schedule(id: string, startAt: string, endAt: string): void {
    this.update(id, { startAt, endAt });
  },

  /** 시간 배정 해제 (시간표 → 인박스). */
  unschedule(id: string): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const { startAt: _s, endAt: _e, ...rest } = all[idx];
    all[idx] = rest as PlannerTask;
    safeWrite(all);
  },

  remove(id: string): void {
    safeWrite(safeRead().filter((t) => t.id !== id));
  },

  clear(): void {
    safeWrite([]);
  },

  /** 특정 (녹음, 액션 인덱스) 조합으로 이미 만든 할일이 있는지 — 중복 방지. */
  findFromRecordingAction(recordingId: string, actionIdx: number): PlannerTask | undefined {
    return safeRead().find(
      (t) => t.sourceRecordingId === recordingId && t.sourceActionIndex === actionIdx,
    );
  },

  /** 특정 녹음에서 만들어진 할일들 (녹음 디테일 surface 용). */
  listFromRecording(recordingId: string): PlannerTask[] {
    return safeRead().filter((t) => t.sourceRecordingId === recordingId);
  },
};
