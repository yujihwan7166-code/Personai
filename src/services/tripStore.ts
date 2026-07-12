/**
 * 여행 영속 store — LocalStorage 기반. (daylogStore 패턴 동일)
 * 여행 메타(이름·기간·표지)만 저장. 기록은 daylogStore 가 소유.
 */
import { TRIP_CHANGED, type Trip } from '@/types/trip';
import { notify } from '@/lib/notify';

const STORAGE_KEY = 'daylog.trips.v1';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

const normalizeTrip = (value: unknown, index: number): Trip | null => {
  if (!isRecord(value)) return null;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!isDate(value.startDate) || !isDate(value.endDate)) return null;
  const createdAt =
    typeof value.createdAt === 'string' && !Number.isNaN(Date.parse(value.createdAt))
      ? value.createdAt
      : new Date().toISOString();
  // 시작 ≤ 종료 보정
  const [startDate, endDate] =
    value.startDate <= value.endDate ? [value.startDate, value.endDate] : [value.endDate, value.startDate];
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `trip_recovered_${index}`,
    name: name || '이름 없는 여행',
    startDate,
    endDate,
    cover: typeof value.cover === 'string' && value.cover ? value.cover : undefined,
    createdAt,
  };
};

const safeRead = (): Trip[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeTrip).filter((t): t is Trip => t !== null) : [];
  } catch {
    return [];
  }
};

let quotaNotified = false;

const safeWrite = (trips: Trip[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    window.dispatchEvent(new CustomEvent(TRIP_CHANGED));
  } catch (err) {
    const isQuota = err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22);
    if (isQuota && !quotaNotified) {
      quotaNotified = true;
      notify.error('저장 공간이 가득 찼어요', { description: '사진을 정리하거나 내보낸 뒤 다시 시도해 주세요.' });
    } else if (!isQuota) {
      console.error('여행 저장 실패', err);
    }
  }
};

const newId = (): string => `trip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const tripStore = {
  /** 최근 여행 먼저 (시작일 내림차순). */
  list(): Trip[] {
    return safeRead().sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt));
  },

  get(id: string): Trip | undefined {
    return safeRead().find((t) => t.id === id);
  },

  add(input: { name: string; startDate: string; endDate: string; cover?: string }): Trip {
    const [startDate, endDate] =
      input.startDate <= input.endDate ? [input.startDate, input.endDate] : [input.endDate, input.startDate];
    const trip: Trip = {
      id: newId(),
      name: input.name.trim() || '이름 없는 여행',
      startDate,
      endDate,
      cover: input.cover || undefined,
      createdAt: new Date().toISOString(),
    };
    safeWrite([...safeRead(), trip]);
    return trip;
  },

  update(id: string, patch: Partial<Omit<Trip, 'id' | 'createdAt'>>): void {
    const all = safeRead();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const merged = { ...all[idx], ...patch };
    // 기간 뒤집힘 보정
    if (merged.startDate > merged.endDate) {
      const s = merged.startDate;
      merged.startDate = merged.endDate;
      merged.endDate = s;
    }
    all[idx] = merged;
    safeWrite(all);
  },

  remove(id: string): void {
    safeWrite(safeRead().filter((t) => t.id !== id));
  },
};
