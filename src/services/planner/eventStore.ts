/**
 * 캘린더 일정(Event) 영속 store — LocalStorage 기반.
 *
 * - vanilla module: React 외부에서도 import 후 호출 가능.
 * - 변경 시 PLANNER_EVENT_CHANGED 커스텀 이벤트 broadcast.
 *   훅(usePlannerToday 등)이 listen 해서 자동 re-render.
 *
 * 주의: 직접 호출보다는 훅(useEvents) 사용 권장.
 */
import { PlannerEvent, PLANNER_EVENT_CHANGED } from '@/types/planner';
import { expandRecurrence } from '@/lib/planner/recurrence';

const STORAGE_KEY = 'planner.events.v1';

/** 최소 필수 필드 검증 — id/title/startAt/endAt/createdAt/source 누락 시 invalid. */
const isValidEvent = (v: unknown): v is PlannerEvent => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string'
    && typeof o.title === 'string'
    && typeof o.startAt === 'string'
    && typeof o.endAt === 'string'
    && typeof o.createdAt === 'string'
    && typeof o.source === 'string';
};

const safeRead = (): PlannerEvent[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEvent);
  } catch {
    return [];
  }
};

const safeWrite = (events: PlannerEvent[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error('[eventStore] safeWrite 실패:', err);
    import('@/lib/notify').then(({ notify }) => {
      notify.error('일정 저장 실패 — 저장 공간이 부족할 수 있어요');
    }).catch(() => { /* silent */ });
    return;
  }
  window.dispatchEvent(new CustomEvent(PLANNER_EVENT_CHANGED));
};

const newId = (): string =>
  `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const eventStore = {
  /** 모든 이벤트 (생성 시각 오름차순). */
  list(): PlannerEvent[] {
    return [...safeRead()].sort((a, b) =>
      a.startAt.localeCompare(b.startAt),
    );
  },

  /** 특정 날짜(로컬)의 이벤트만 (시작 시각 오름차순).
   * 반복 시리즈는 해당 날짜에 떨어지는 가상 인스턴스를 합성해 반환.
   *
   * 비교는 로컬 시각 기준 — 사용자가 보는 "그 날" (예: KST 5/9 06:00 이벤트는 KST anchor 5/9 와 매치).
   * 과거: ISO prefix 문자열 비교를 썼지만 UTC 날짜라 KST 00~08시 이벤트가 전날로 분류돼 누락되는 버그.
   * 수정: timestamp 비교로 통일 (taskStore.listScheduled 와 동일 패턴). */
  listByDate(dateIso: string): PlannerEvent[] {
    const day = new Date(dateIso);
    const rangeStart = new Date(day);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(rangeStart.getTime() + 86_400_000);

    const all = safeRead();
    const result: PlannerEvent[] = [];

    for (const e of all) {
      if (e.recurrence) {
        // 시리즈 마스터 — 해당 날짜에 떨어지는 인스턴스만 합성
        const instances = expandRecurrence(e, rangeStart, rangeEnd);
        for (const inst of instances) {
          result.push({
            ...e,
            id: inst.id,
            startAt: inst.occurrenceStartIso,
            endAt: inst.occurrenceEndIso,
            // recurrence 는 보존 — UI 에서 🔁 표시 위해 필요. 마스터 id 는 parseInstanceId 로 복원.
          });
        }
      } else {
        const ts = new Date(e.startAt).getTime();
        if (ts >= rangeStart.getTime() && ts < rangeEnd.getTime()) {
          result.push(e);
        }
      }
    }

    return result.sort((a, b) => a.startAt.localeCompare(b.startAt));
  },

  /** 특정 범위(rangeStart 포함, rangeEnd 제외)의 이벤트 — 주/월 뷰용. */
  listByRange(rangeStart: Date, rangeEnd: Date): PlannerEvent[] {
    const all = safeRead();
    const result: PlannerEvent[] = [];

    for (const e of all) {
      if (e.recurrence) {
        const instances = expandRecurrence(e, rangeStart, rangeEnd);
        for (const inst of instances) {
          result.push({
            ...e,
            id: inst.id,
            startAt: inst.occurrenceStartIso,
            endAt: inst.occurrenceEndIso,
          });
        }
      } else {
        const ts = new Date(e.startAt).getTime();
        if (ts >= rangeStart.getTime() && ts < rangeEnd.getTime()) {
          result.push(e);
        }
      }
    }

    return result.sort((a, b) => a.startAt.localeCompare(b.startAt));
  },

  /** 마스터(저장된 원본) 만 반환 — 시리즈 편집 시 마스터 조회용. */
  findMaster(id: string): PlannerEvent | undefined {
    return safeRead().find((e) => e.id === id);
  },

  /** 새 이벤트 추가. id/createdAt 자동 생성. */
  add(input: Omit<PlannerEvent, 'id' | 'createdAt'>): PlannerEvent {
    const next: PlannerEvent = {
      ...input,
      id: newId(),
      createdAt: new Date().toISOString(),
    };
    safeWrite([...safeRead(), next]);
    return next;
  },

  /** 부분 업데이트. id 일치 항목 못 찾으면 no-op. */
  update(id: string, patch: Partial<Omit<PlannerEvent, 'id' | 'createdAt'>>): void {
    const all = safeRead();
    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch };
    safeWrite(all);
  },

  /** 삭제. */
  remove(id: string): void {
    safeWrite(safeRead().filter((e) => e.id !== id));
  },

  /** 전체 삭제 (테스트·리셋용). */
  clear(): void {
    safeWrite([]);
  },
};
