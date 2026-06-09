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
import { expandRecurrence, isInstanceId, parseInstanceId } from '@/lib/planner/recurrence';
import { sanitizeForDomain } from '@/lib/planner/taskDomain';

const STORAGE_KEY = 'planner.tasks.v1';

/** 최소 필수 필드 검증 — id/title/done/createdAt 누락 시 invalid (UI 가 .field 접근하다 crash 방지). */
const isValidTask = (v: unknown): v is PlannerTask => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string'
    && typeof o.title === 'string'
    && typeof o.done === 'boolean'
    && typeof o.createdAt === 'string';
};

/**
 * 도메인 일관성 강제 — startAt 있으면 priority/plannedFor 제거.
 * 과거 버전에서 할 일 → 일정 변환 시 priority 잔존 버그로 잘못 저장된
 * 데이터를 표시 단계에서 즉시 클린업. 한 번 거치고 나면 멱등.
 */
const sanitizeOne = (t: PlannerTask): PlannerTask => sanitizeForDomain(t) as PlannerTask;

const safeRead = (): PlannerTask[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTask).map(sanitizeOne);
  } catch {
    return [];
  }
};

const safeWrite = (tasks: PlannerTask[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('[taskStore] safeWrite 실패:', err);
    import('@/lib/notify').then(({ notify }) => {
      notify.error('할 일 저장 실패 — 저장 공간이 부족할 수 있어요');
    }).catch(() => { /* silent */ });
    return;
  }
  window.dispatchEvent(new CustomEvent(PLANNER_TASK_CHANGED));
};

const newId = (): string =>
  `tsk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const activeTasks = (): PlannerTask[] => safeRead().filter((t) => !t.deletedAt);

const deletedTasks = (): PlannerTask[] => safeRead().filter((t) => t.deletedAt);

export const taskStore = {
  /** 모든 할일 (생성 시각 내림차순 — 최신 먼저). */
  list(): PlannerTask[] {
    return [...activeTasks()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  },

  /** 시간 미배정(인박스) 할일만. */
  listInbox(): PlannerTask[] {
    return activeTasks()
      .filter((t) => !t.startAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** 특정 날짜에 시간 배정된 할일 (시작 시각 오름차순).
   * 반복 시리즈는 해당 날짜에 떨어지는 가상 인스턴스를 합성해 반환.
   * 인스턴스 done 은 master.seriesCompletions[occurrenceIso] 로 결정.
   *
   * 비교는 로컬 시각 기준 — `dateIso` 와 `t.startAt` 둘 다 UTC ISO 라도, 사용자
   * 입장의 "그 날" 로 매칭한다 (예: KST 5/3 14:00 task = UTC 5/3 05:00 → KST anchor 5/3 와 매치). */
  listScheduled(dateIso: string): PlannerTask[] {
    const day = new Date(dateIso);
    const rangeStart = new Date(day);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(rangeStart.getTime() + 86_400_000);

    const all = activeTasks();
    const result: PlannerTask[] = [];

    for (const t of all) {
      if (!t.startAt) continue; // 인박스 항목은 expand 대상 아님
      if (t.recurrence) {
        const instances = expandRecurrence(t, rangeStart, rangeEnd);
        for (const inst of instances) {
          const instDone = t.seriesCompletions?.[inst.occurrenceStartIso] ?? false;
          result.push({
            ...t,
            id: inst.id,
            startAt: inst.occurrenceStartIso,
            endAt: inst.occurrenceEndIso,
            done: instDone,
          });
        }
      } else {
        const ts = new Date(t.startAt).getTime();
        if (ts >= rangeStart.getTime() && ts < rangeEnd.getTime()) {
          result.push(t);
        }
      }
    }

    return result.sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''));
  },

  /** 특정 범위(rangeStart 포함, rangeEnd 제외)의 시간배정 task — 주/월 뷰용. */
  listScheduledRange(rangeStart: Date, rangeEnd: Date): PlannerTask[] {
    const all = activeTasks();
    const result: PlannerTask[] = [];

    for (const t of all) {
      if (!t.startAt) continue;
      if (t.recurrence) {
        const instances = expandRecurrence(t, rangeStart, rangeEnd);
        for (const inst of instances) {
          const instDone = t.seriesCompletions?.[inst.occurrenceStartIso] ?? false;
          result.push({
            ...t,
            id: inst.id,
            startAt: inst.occurrenceStartIso,
            endAt: inst.occurrenceEndIso,
            done: instDone,
          });
        }
      } else {
        const ts = new Date(t.startAt).getTime();
        if (ts >= rangeStart.getTime() && ts < rangeEnd.getTime()) {
          result.push(t);
        }
      }
    }

    return result.sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''));
  },

  /** 마스터(저장된 원본) 만 반환 — 시리즈 편집 시 마스터 조회용. */
  findMaster(id: string): PlannerTask | undefined {
    return activeTasks().find((t) => t.id === id);
  },

  // ──────── Subtask 헬퍼 ────────
  /** 서브태스크 추가 — 끝에 push. */
  addSubtask(taskId: string, text: string): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === taskId);
    if (idx === -1) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const subs = all[idx].subtasks ?? [];
    const order = subs.length > 0 ? Math.max(...subs.map((s) => s.order)) + 1 : 0;
    const newSub = {
      id: `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      done: false,
      order,
    };
    all[idx] = { ...all[idx], subtasks: [...subs, newSub] };
    safeWrite(all);
  },

  /** 서브태스크 done 토글. */
  toggleSubtask(taskId: string, subtaskId: string): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === taskId);
    if (idx === -1 || !all[idx].subtasks) return;
    const subs = all[idx].subtasks!.map((s) =>
      s.id === subtaskId ? { ...s, done: !s.done } : s,
    );
    all[idx] = { ...all[idx], subtasks: subs };
    safeWrite(all);
  },

  /** 서브태스크 텍스트 수정. */
  updateSubtaskText(taskId: string, subtaskId: string, text: string): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === taskId);
    if (idx === -1 || !all[idx].subtasks) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const subs = all[idx].subtasks!.map((s) =>
      s.id === subtaskId ? { ...s, text: trimmed } : s,
    );
    all[idx] = { ...all[idx], subtasks: subs };
    safeWrite(all);
  },

  /** 서브태스크 삭제. */
  removeSubtask(taskId: string, subtaskId: string): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === taskId);
    if (idx === -1 || !all[idx].subtasks) return;
    const subs = all[idx].subtasks!.filter((s) => s.id !== subtaskId);
    all[idx] = { ...all[idx], subtasks: subs.length > 0 ? subs : undefined };
    safeWrite(all);
  },

  /** 서브태스크 통째로 교체 — 모달의 일괄 저장용. */
  setSubtasks(taskId: string, subtasks: NonNullable<PlannerTask['subtasks']>): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === taskId);
    if (idx === -1) return;
    all[idx] = { ...all[idx], subtasks: subtasks.length > 0 ? subtasks : undefined };
    safeWrite(all);
  },

  add(input: Omit<PlannerTask, 'id' | 'createdAt' | 'done'> & { done?: boolean }): PlannerTask {
    const next: PlannerTask = sanitizeOne({
      ...input,
      deletedAt: undefined,
      done: input.done ?? false,
      id: newId(),
      createdAt: new Date().toISOString(),
    });
    safeWrite([...safeRead(), next]);
    return next;
  },

  update(id: string, patch: Partial<Omit<PlannerTask, 'id' | 'createdAt'>>): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    // 패치 후 도메인 일관성 강제 — 일정으로 바뀌면 priority/plannedFor 자동 제거.
    all[idx] = sanitizeOne({ ...all[idx], ...patch });
    safeWrite(all);
  },

  /** done 토글 — 자주 쓰는 패턴 헬퍼.
   * 가상 인스턴스 id (`master@iso`) 가 들어오면 toggleInstanceDone 으로 자동 분기. */
  toggleDone(id: string): void {
    if (isInstanceId(id)) {
      const parsed = parseInstanceId(id);
      if (parsed) {
        this.toggleInstanceDone(parsed.masterId, parsed.occurrenceIso);
        return;
      }
    }
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], done: !all[idx].done };
    safeWrite(all);
  },

  /** 시리즈 인스턴스 done 토글 — master.seriesCompletions[occurrenceIso] 토글. */
  toggleInstanceDone(masterId: string, occurrenceIso: string): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === masterId);
    if (idx === -1) return;
    const completions = { ...(all[idx].seriesCompletions ?? {}) };
    completions[occurrenceIso] = !completions[occurrenceIso];
    // false 면 키 제거 (스토리지 절약 — 기본값이 false 라).
    if (!completions[occurrenceIso]) delete completions[occurrenceIso];
    all[idx] = {
      ...all[idx],
      seriesCompletions: Object.keys(completions).length > 0 ? completions : undefined,
    };
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

  /** Snooze — task 를 N일 후로 미룸. 시간배정 항목은 시·분 유지하고 날짜만 +N.
   * 인박스 항목은 그날 09:00 으로 배정. 가상 인스턴스도 자동 처리(detach). */
  snoozeDays(id: string, days: number): void {
    // 가상 인스턴스 처리는 caller (Planner.handleDragEnd 패턴) 의 책임 — store 는 단순 task 만.
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const t = all[idx];
    if (t.startAt) {
      // 시·분 유지, 날짜만 +N.
      const oldStart = new Date(t.startAt);
      const oldEnd = t.endAt ? new Date(t.endAt) : new Date(oldStart.getTime() + 30 * 60_000);
      const dur = oldEnd.getTime() - oldStart.getTime();
      const newStart = new Date(oldStart);
      newStart.setDate(oldStart.getDate() + days);
      const newEnd = new Date(newStart.getTime() + dur);
      all[idx] = { ...t, startAt: newStart.toISOString(), endAt: newEnd.toISOString() };
    } else {
      // 인박스 — 그날 09:00 으로 배정.
      const target = new Date();
      target.setDate(target.getDate() + days);
      target.setHours(9, 0, 0, 0);
      all[idx] = {
        ...t,
        startAt: target.toISOString(),
        endAt: new Date(target.getTime() + 30 * 60_000).toISOString(),
      };
    }
    safeWrite(all);
  },

  remove(id: string): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], deletedAt: new Date().toISOString() };
    safeWrite(all);
  },

  /** 휴지통 목록. 최신 삭제 항목이 먼저 온다. */
  listDeleted(): PlannerTask[] {
    return [...deletedTasks()].sort((a, b) =>
      (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''),
    );
  },

  /** 휴지통에서 원래 할 일/일정으로 복원. */
  restore(id: string): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const { deletedAt: _deletedAt, ...rest } = all[idx];
    void _deletedAt;
    all[idx] = rest as PlannerTask;
    safeWrite(all);
  },

  /** 복구할 수 없도록 영구 삭제. */
  purge(id: string): void {
    safeWrite(safeRead().filter((t) => t.id !== id));
  },

  /** 휴지통에 있는 할 일/일정만 비운다. */
  emptyTrash(): number {
    const all = safeRead();
    const kept = all.filter((t) => !t.deletedAt);
    const removed = all.length - kept.length;
    if (removed > 0) safeWrite(kept);
    return removed;
  },

  clear(): void {
    safeWrite([]);
  },

  /** 특정 (녹음, 액션 인덱스) 조합으로 이미 만든 할일이 있는지 — 중복 방지. */
  findFromRecordingAction(recordingId: string, actionIdx: number): PlannerTask | undefined {
    return activeTasks().find(
      (t) => t.sourceRecordingId === recordingId && t.sourceActionIndex === actionIdx,
    );
  },

  /** 특정 녹음에서 만들어진 할일들 (녹음 디테일 surface 용). */
  listFromRecording(recordingId: string): PlannerTask[] {
    return activeTasks().filter((t) => t.sourceRecordingId === recordingId);
  },
};
