/**
 * 데이로그 영속 store — LocalStorage 기반. (journalStore 패턴 동일)
 *
 * 일기 스토어와 완전 분리 — 일기(회고) 데이터에 영향 없음.
 * 변경 시 DAYLOG_CHANGED 커스텀 이벤트 broadcast → 훅 자동 re-render.
 */
import { DAYLOG_CHANGED, type DayMoment, type MealSlot, type MomentKind } from '@/types/daylog';
import { notify } from '@/lib/notify';

const STORAGE_KEY = 'daylog.moments.v1';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isKind = (v: unknown): v is MomentKind =>
  v === 'meal' || v === 'activity' || v === 'place' || v === 'media' || v === 'note';

const isMealSlot = (v: unknown): v is MealSlot =>
  v === 'breakfast' || v === 'lunch' || v === 'dinner' || v === 'snack';

const normalizeTime = (v: unknown): string => {
  if (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)) return v;
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const normalizeMoment = (value: unknown, index: number): DayMoment | null => {
  if (!isRecord(value)) return null;
  const text = typeof value.text === 'string' ? value.text.trim() : '';
  if (!text) return null;
  const createdAt =
    typeof value.createdAt === 'string' && !Number.isNaN(Date.parse(value.createdAt))
      ? value.createdAt
      : new Date().toISOString();
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `dm_recovered_${index}`,
    date:
      typeof value.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
        ? value.date
        : createdAt.slice(0, 10),
    time: normalizeTime(value.time),
    kind: isKind(value.kind) ? value.kind : 'note',
    mealSlot: isMealSlot(value.mealSlot) ? value.mealSlot : undefined,
    text,
    photo: typeof value.photo === 'string' && value.photo ? value.photo : undefined,
    place: typeof value.place === 'string' && value.place.trim() ? value.place.trim() : undefined,
    createdAt,
  };
};

const safeRead = (): DayMoment[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(normalizeMoment).filter((m): m is DayMoment => m !== null)
      : [];
  } catch {
    return [];
  }
};

let quotaNotified = false;

const safeWrite = (moments: DayMoment[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(moments));
    window.dispatchEvent(new CustomEvent(DAYLOG_CHANGED));
  } catch (err) {
    const isQuota = err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22);
    if (isQuota && !quotaNotified) {
      quotaNotified = true;
      notify.error('저장 공간이 가득 찼어요', {
        description: '데이터를 내보낸 뒤 일부 기록을 정리해 주세요.',
      });
    } else if (!isQuota) {
      console.error('데이로그 저장 실패', err);
    }
  }
};

const newId = (): string =>
  `dm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const daylogStore = {
  /** 특정 날짜(YYYY-MM-DD)의 조각들 — 시간 오름차순 (타임라인 순). */
  listByDate(dateYYYYMMDD: string): DayMoment[] {
    return safeRead()
      .filter((m) => m.date === dateYYYYMMDD)
      .sort((a, b) => a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt));
  },

  /** 조각이 있는 날짜 집합 — 달력 점 표시용. */
  datesWithMoments(): Set<string> {
    return new Set(safeRead().map((m) => m.date));
  },

  /** 장소가 있는 조각 전체 — 발자취 지도용 (최신순). */
  withPlace(): DayMoment[] {
    return safeRead()
      .filter((m) => !!m.place)
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  },

  /** 날짜 범위 [start, end] 안의 조각 — 여행 묶음용 (날짜·시간 오름차순). */
  inRange(startYYYYMMDD: string, endYYYYMMDD: string): DayMoment[] {
    const [lo, hi] = startYYYYMMDD <= endYYYYMMDD ? [startYYYYMMDD, endYYYYMMDD] : [endYYYYMMDD, startYYYYMMDD];
    return safeRead()
      .filter((m) => m.date >= lo && m.date <= hi)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  },

  add(input: {
    text: string;
    date?: string;
    time?: string;
    kind?: MomentKind;
    mealSlot?: MealSlot;
    photo?: string;
    place?: string;
  }): DayMoment {
    const now = new Date();
    const moment: DayMoment = {
      id: newId(),
      date: input.date ?? now.toISOString().slice(0, 10),
      time: input.time ?? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      kind: input.kind ?? 'note',
      mealSlot: input.kind === 'meal' ? input.mealSlot : undefined,
      text: input.text.trim(),
      photo: input.photo || undefined,
      place: input.place?.trim() || undefined,
      createdAt: now.toISOString(),
    };
    safeWrite([...safeRead(), moment]);
    return moment;
  },

  update(id: string, patch: Partial<Omit<DayMoment, 'id' | 'createdAt'>>): void {
    const all = safeRead();
    const idx = all.findIndex((m) => m.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch };
    safeWrite(all);
  },

  remove(id: string): void {
    safeWrite(safeRead().filter((m) => m.id !== id));
  },
};
