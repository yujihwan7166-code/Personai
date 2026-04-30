/**
 * 반복 시리즈 편집 정책 — Apple Calendar / Google Calendar 표준 3종.
 *
 * - editThisOnly:        해당 occurrence 만 분리 → 마스터에 exdate 추가 + 단발 항목 신규 생성.
 * - editThisAndFuture:   원본 시리즈를 occurrence 직전까지로 자름 + 새 시리즈를 신규 생성.
 * - editAll:             원본 시리즈를 그대로 patch.
 *
 * Store 추상화:
 * - taskStore / eventStore 어느 쪽이든 동일 인터페이스(add/update) 제공.
 * - 호출 측이 어떤 store 를 쓸지 결정 (store 인자로 주입).
 */
import type {
  PlannerEvent,
  PlannerTask,
  RecurrenceRule,
} from '@/types/planner';

/** 시리즈 편집을 위한 store 추상화 — taskStore/eventStore 둘 다 충족. */
export interface SeriesEditStore<T extends PlannerEvent | PlannerTask> {
  update: (id: string, patch: Partial<Omit<T, 'id' | 'createdAt'>>) => void;
  add: (input: Omit<T, 'id' | 'createdAt'> & Partial<Pick<T, 'createdAt'>>) => T;
}

/** 마스터 한 회만 patch — 시리즈 전체 영향. */
export function editAll<T extends PlannerEvent | PlannerTask>(
  store: SeriesEditStore<T>,
  master: T,
  patch: Partial<Omit<T, 'id' | 'createdAt'>>,
): void {
  store.update(master.id, patch);
}

/**
 * 해당 occurrence 만 분리.
 * 1) 마스터의 recurrence.exdates 에 occurrence 시작 ISO 추가.
 * 2) patch 로 단발 항목 신규 생성 (recurrence 없음).
 *
 * patch 가 startAt/endAt 만 바뀐 단순 이동이면 새 단발 항목의 시간이 그대로 적용.
 * 삭제(detach 후 단순 skip)면 patch 로 신규 생성을 건너뛰도록 createNew=false.
 */
export function editThisOnly<T extends PlannerEvent | PlannerTask>(
  store: SeriesEditStore<T>,
  master: T,
  occurrenceStartIso: string,
  patch: Partial<Omit<T, 'id' | 'createdAt'>>,
  options: { createNew?: boolean } = { createNew: true },
): void {
  // 1) exdate 추가.
  const currentExdates = master.recurrence?.exdates ?? [];
  if (!currentExdates.includes(occurrenceStartIso)) {
    const nextRec: RecurrenceRule = {
      ...master.recurrence!,
      exdates: [...currentExdates, occurrenceStartIso],
    };
    store.update(master.id, { recurrence: nextRec } as Partial<Omit<T, 'id' | 'createdAt'>>);
  }

  // 2) 새 단발 항목 생성 (옵션).
  if (options.createNew !== false) {
    // 마스터 기반으로 주요 필드 복사 + patch 적용 + recurrence 제거.
    const { id: _id, createdAt: _ca, recurrence: _rec, ...rest } = master as unknown as Record<string, unknown>;
    const occurrenceEnd = patch.endAt ?? (() => {
      const masterStart = new Date(master.startAt!).getTime();
      const masterEnd = new Date((master as PlannerEvent | PlannerTask).endAt!).getTime();
      const dur = masterEnd - masterStart;
      return new Date(new Date(occurrenceStartIso).getTime() + dur).toISOString();
    })();

    store.add({
      ...(rest as Omit<T, 'id' | 'createdAt'>),
      startAt: occurrenceStartIso,
      endAt: occurrenceEnd,
      ...patch,
      recurrence: undefined,
    } as Omit<T, 'id' | 'createdAt'>);
  }
}

/**
 * 이 항목과 이후.
 * 1) 원본 마스터의 recurrence.until 을 occurrenceStart 직전(1ms) 으로 자름.
 * 2) 새 시리즈를 patch + 동일 recurrence(단 until/count 초기화) 로 신규 생성.
 */
export function editThisAndFuture<T extends PlannerEvent | PlannerTask>(
  store: SeriesEditStore<T>,
  master: T,
  occurrenceStartIso: string,
  patch: Partial<Omit<T, 'id' | 'createdAt'>>,
): void {
  if (!master.recurrence) return; // 시리즈가 아니면 아무것도 안 함

  // 1) 원본 잘라내기.
  const cutoffMs = new Date(occurrenceStartIso).getTime() - 1;
  const cutoffIso = new Date(cutoffMs).toISOString();
  const truncatedRec: RecurrenceRule = {
    ...master.recurrence,
    until: cutoffIso,
    count: undefined, // until 우선, count 초기화
  };
  store.update(master.id, { recurrence: truncatedRec } as Partial<Omit<T, 'id' | 'createdAt'>>);

  // 2) 새 시리즈 생성 — recurrence 는 종료조건 비움 (사용자가 변경 가능).
  const { id: _id, createdAt: _ca, ...rest } = master as unknown as Record<string, unknown>;
  const newRec: RecurrenceRule = {
    freq: master.recurrence.freq,
    interval: master.recurrence.interval,
    byday: master.recurrence.byday,
    // until / count 제거 — 사용자가 patch 로 새로 줄 수 있음
  };

  const masterStart = new Date(master.startAt!).getTime();
  const masterEnd = new Date((master as PlannerEvent | PlannerTask).endAt!).getTime();
  const dur = masterEnd - masterStart;
  const newEnd = patch.endAt ?? new Date(new Date(occurrenceStartIso).getTime() + dur).toISOString();

  store.add({
    ...(rest as Omit<T, 'id' | 'createdAt'>),
    startAt: occurrenceStartIso,
    endAt: newEnd,
    recurrence: newRec,
    ...patch,
  } as Omit<T, 'id' | 'createdAt'>);
}
