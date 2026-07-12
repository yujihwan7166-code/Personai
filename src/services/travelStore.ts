/**
 * 여행기록 영속 store — LocalStorage 기반 (careerStore/journalStore 패턴).
 *
 * 세 파일: 여행 메타 / 여행 속 기록 / 가고 싶은 곳.
 * 변경 시 TRAVEL_CHANGED 커스텀 이벤트 broadcast → 훅 자동 re-render.
 * 일기(journalStore)와 완전 무관.
 */
import {
  TRAVEL_CHANGED,
  todayKey,
  type BucketPlace,
  type Trip,
} from '@/types/travel';
import { notify } from '@/lib/notify';

// 여행 "기록"은 이제 daylogStore(날짜 귀속)가 소유 — 여기는 여행 메타 + 버킷만.
const TRIPS_KEY = 'travel.trips.v1';
const BUCKET_KEY = 'travel.bucket.v1';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

const isoNow = () => new Date().toISOString();

const normalizeTrip = (value: unknown, index: number): Trip | null => {
  if (!isRecord(value)) return null;
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  if (!title || !isDate(value.startDate) || !isDate(value.endDate)) return null;
  const [startDate, endDate] =
    value.startDate <= value.endDate ? [value.startDate, value.endDate] : [value.endDate, value.startDate];
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `trip_recovered_${index}`,
    title,
    destination: typeof value.destination === 'string' ? value.destination.trim() : '',
    startDate,
    endDate,
    cover: typeof value.cover === 'string' && value.cover ? value.cover : undefined,
    createdAt:
      typeof value.createdAt === 'string' && !Number.isNaN(Date.parse(value.createdAt))
        ? value.createdAt
        : isoNow(),
  };
};

const normalizeBucket = (value: unknown, index: number): BucketPlace | null => {
  if (!isRecord(value)) return null;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name) return null;
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `bkt_recovered_${index}`,
    name,
    note: typeof value.note === 'string' && value.note.trim() ? value.note.trim() : undefined,
    done: value.done === true,
    createdAt:
      typeof value.createdAt === 'string' && !Number.isNaN(Date.parse(value.createdAt))
        ? value.createdAt
        : isoNow(),
  };
};

function readList<T>(key: string, normalize: (v: unknown, i: number) => T | null): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalize).filter((x): x is T => x !== null) : [];
  } catch {
    return [];
  }
}

// quota 알림 스로틀 — 래치가 아니라 시간 기반 (연속 실패도 주기적으로 알려 무음 유실 방지).
let quotaNotifiedAt = 0;

function writeList<T>(key: string, list: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(TRAVEL_CHANGED));
  } catch (err) {
    const isQuota = err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22);
    if (isQuota) {
      if (Date.now() - quotaNotifiedAt > 5000) {
        quotaNotifiedAt = Date.now();
        notify.error('저장 공간이 가득 차 저장되지 않았어요', { description: '오래된 기록의 사진을 정리해 주세요.' });
      }
    } else {
      console.error('여행기록 저장 실패', err);
    }
  }
}

const newId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const readTrips = () => readList(TRIPS_KEY, normalizeTrip);
const readBucket = () => readList(BUCKET_KEY, normalizeBucket);

export const travelStore = {
  /* ── 여행 ─────────────────────────── */

  /** 시작일 내림차순 (최근 여행 먼저). */
  listTrips(): Trip[] {
    return readTrips().sort(
      (a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt),
    );
  },

  getTrip(id: string): Trip | undefined {
    return readTrips().find((t) => t.id === id);
  },

  addTrip(input: { title: string; destination: string; startDate: string; endDate: string; cover?: string }): Trip {
    // 빈/비정상 날짜 방어 — normalize 에서 걸러져 "소리 없이 사라지는 여행"이 되지 않게 오늘로 폴백.
    const s = isDate(input.startDate) ? input.startDate : todayKey();
    const e = isDate(input.endDate) ? input.endDate : s;
    const [startDate, endDate] = s <= e ? [s, e] : [e, s];
    const trip: Trip = {
      id: newId('trip'),
      title: input.title.trim(),
      destination: input.destination.trim(),
      startDate,
      endDate,
      cover: input.cover || undefined,
      createdAt: isoNow(),
    };
    writeList(TRIPS_KEY, [...readTrips(), trip]);
    return trip;
  },

  updateTrip(id: string, patch: Partial<Omit<Trip, 'id' | 'createdAt'>>): void {
    const all = readTrips();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const merged = { ...all[idx], ...patch };
    if (merged.startDate > merged.endDate) {
      [merged.startDate, merged.endDate] = [merged.endDate, merged.startDate];
    }
    all[idx] = merged;
    writeList(TRIPS_KEY, all);
  },

  /** 여행 삭제 — 여행 메타만 지운다. 하루 기록(daylog)은 날짜에 남는다. */
  removeTrip(id: string): void {
    writeList(TRIPS_KEY, readTrips().filter((t) => t.id !== id));
  },

  /* ── 가고 싶은 곳 ─────────────────── */

  /** 미완 먼저, 그 안에서 최신순. */
  listBucket(): BucketPlace[] {
    return readBucket().sort(
      (a, b) => Number(a.done) - Number(b.done) || b.createdAt.localeCompare(a.createdAt),
    );
  },

  addBucket(input: { name: string; note?: string }): BucketPlace {
    const item: BucketPlace = {
      id: newId('bkt'),
      name: input.name.trim(),
      note: input.note?.trim() || undefined,
      done: false,
      createdAt: isoNow(),
    };
    writeList(BUCKET_KEY, [...readBucket(), item]);
    return item;
  },

  toggleBucket(id: string): void {
    const all = readBucket();
    const idx = all.findIndex((b) => b.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], done: !all[idx].done };
    writeList(BUCKET_KEY, all);
  },

  /** 지운 항목 반환 — "되돌리기" 토스트용. */
  removeBucket(id: string): BucketPlace | undefined {
    const all = readBucket();
    const removed = all.find((b) => b.id === id);
    writeList(BUCKET_KEY, all.filter((b) => b.id !== id));
    return removed;
  },

  restoreBucket(item: BucketPlace): void {
    const all = readBucket();
    if (all.some((b) => b.id === item.id)) return;
    writeList(BUCKET_KEY, [...all, item]);
  },
};
