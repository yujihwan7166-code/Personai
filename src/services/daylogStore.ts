/**
 * 데일리로그 영속 store — LocalStorage 기반 (journalStore/travelStore 패턴).
 *
 * 하루 기록(DayItem)은 날짜에 속한다. 여행 상세·발자취 지도·하루 페이지가
 * 전부 이 하나의 store 를 읽는다 (기록은 한 번, 뷰는 여러 렌즈).
 * 변경 시 DAYLOG_CHANGED 브로드캐스트. 일기 본문(journalStore)과 완전 분리.
 */
import {
  DAYLOG_CHANGED,
  type DayItem,
  type DayItemKind,
  type MealSlot,
} from '@/types/daylog';
import { toLocalYMD } from '@/types/travel';
import { notify } from '@/lib/notify';

const ITEMS_KEY = 'daylog.items.v1';
/** 구 여행 기록(tripId 기반) → 날짜 기반으로 1회 이관. */
const LEGACY_TRAVEL_RECORDS_KEY = 'travel.records.v1';
const MIGRATED_FLAG = 'daylog.migratedTravelRecords.v1';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isKind = (v: unknown): v is DayItemKind => v === 'meal' || v === 'place' || v === 'note';
const isMealSlot = (v: unknown): v is MealSlot =>
  v === 'breakfast' || v === 'lunch' || v === 'dinner' || v === 'snack';

const isoNow = () => new Date().toISOString();

const normalizeItem = (value: unknown, index: number): DayItem | null => {
  if (!isRecord(value)) return null;
  const text = typeof value.text === 'string' ? value.text.trim() : '';
  if (!text || !isDate(value.date)) return null;
  const kind = isKind(value.kind) ? value.kind : 'note';
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `di_recovered_${index}`,
    date: value.date,
    time: typeof value.time === 'string' && /^\d{2}:\d{2}$/.test(value.time) ? value.time : undefined,
    kind,
    mealSlot: kind === 'meal' && isMealSlot(value.mealSlot) ? value.mealSlot : undefined,
    text,
    place: typeof value.place === 'string' && value.place.trim() ? value.place.trim() : undefined,
    photo: typeof value.photo === 'string' && value.photo ? value.photo : undefined,
    createdAt:
      typeof value.createdAt === 'string' && !Number.isNaN(Date.parse(value.createdAt))
        ? value.createdAt
        : isoNow(),
  };
};

/** 구 여행 기록 → DayItem. food→meal, sight/stay/move→place, note→note.
 * 플래그는 이관이 "끝난 뒤"에만 커밋 — 저장 실패(quota) 시 다음 로드에서 재시도된다. */
function migrateLegacyTravelRecords(): void {
  if (typeof window === 'undefined') return;
  const seal = () => window.localStorage.setItem(MIGRATED_FLAG, '1');
  try {
    if (window.localStorage.getItem(MIGRATED_FLAG)) return;
    const raw = window.localStorage.getItem(LEGACY_TRAVEL_RECORDS_KEY);
    if (!raw) {
      seal();
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      seal(); // 손상 데이터 — 재시도 무의미
      return;
    }
    if (!Array.isArray(parsed)) {
      seal();
      return;
    }
    const migrated: DayItem[] = [];
    for (const [i, v] of parsed.entries()) {
      if (!isRecord(v)) continue;
      const oldKind = typeof v.kind === 'string' ? v.kind : 'note';
      const mapped = normalizeItem(
        {
          ...v,
          kind: oldKind === 'food' ? 'meal' : oldKind === 'note' ? 'note' : 'place',
          mealSlot: undefined,
        },
        i,
      );
      if (mapped) migrated.push(mapped);
    }
    if (migrated.length > 0) {
      const current = readRaw();
      const ids = new Set(current.map((x) => x.id));
      const merged = [...current, ...migrated.filter((m) => !ids.has(m.id))];
      window.localStorage.setItem(ITEMS_KEY, JSON.stringify(merged)); // quota 실패 시 throw → 플래그 미커밋
    }
    window.localStorage.removeItem(LEGACY_TRAVEL_RECORDS_KEY);
    seal();
  } catch {
    /* 저장 실패 — 플래그를 안 세웠으므로 다음 로드에서 재시도. 구 데이터는 그대로. */
  }
}

const readRaw = (): DayItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeItem).filter((x): x is DayItem => x !== null) : [];
  } catch {
    return [];
  }
};

let migrated = false;
const safeRead = (): DayItem[] => {
  if (!migrated) {
    migrated = true;
    migrateLegacyTravelRecords();
  }
  return readRaw();
};

let quotaNotifiedAt = 0;

/** 저장 성공 여부를 반환 — 호출부(add)가 실패 시 성공처럼 굴지 않게. */
const safeWrite = (items: DayItem[]): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(DAYLOG_CHANGED));
    return true;
  } catch (err) {
    const isQuota = err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22);
    if (isQuota) {
      if (Date.now() - quotaNotifiedAt > 5000) {
        quotaNotifiedAt = Date.now();
        notify.error('저장 공간이 가득 차 기록이 저장되지 않았어요', {
          description: '오래된 기록의 사진을 정리해 주세요.',
        });
      }
    } else {
      console.error('데일리로그 저장 실패', err);
    }
    return false;
  }
};

const newId = (): string =>
  `di_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/** 정렬 — 날짜 → 시간(없으면 뒤) → 입력순. */
const byTimeline = (a: DayItem, b: DayItem): number =>
  a.date.localeCompare(b.date) ||
  (a.time ?? '99:99').localeCompare(b.time ?? '99:99') ||
  a.createdAt.localeCompare(b.createdAt);

export const daylogStore = {
  /** 특정 날짜의 기록 — 타임라인 순. */
  listByDate(dateYYYYMMDD: string): DayItem[] {
    return safeRead().filter((i) => i.date === dateYYYYMMDD).sort(byTimeline);
  },

  /** 날짜 범위 [start, end] 의 기록 — 여행 렌즈용. */
  inRange(startYYYYMMDD: string, endYYYYMMDD: string): DayItem[] {
    const [lo, hi] =
      startYYYYMMDD <= endYYYYMMDD ? [startYYYYMMDD, endYYYYMMDD] : [endYYYYMMDD, startYYYYMMDD];
    return safeRead().filter((i) => i.date >= lo && i.date <= hi).sort(byTimeline);
  },

  /** 전체 기록 — 발자취·피드 요약용. */
  listAll(): DayItem[] {
    return safeRead().sort(byTimeline);
  },

  /** 저장 실패(quota) 시 null — 호출부는 입력을 비우지 말 것. */
  add(input: {
    date?: string;
    time?: string;
    kind: DayItemKind;
    mealSlot?: MealSlot;
    text: string;
    place?: string;
    photo?: string;
  }): DayItem | null {
    const text = input.text.trim();
    if (!text) return null;
    const item: DayItem = {
      id: newId(),
      // 무효 날짜는 normalize 에서 무음 삭제되므로 오늘로 폴백 (travelStore.addTrip 과 동일 원칙)
      date: isDate(input.date) ? input.date : toLocalYMD(new Date()),
      time: input.time || undefined,
      kind: input.kind,
      mealSlot: input.kind === 'meal' ? input.mealSlot : undefined,
      text,
      place: input.place?.trim() || undefined,
      photo: input.photo || undefined,
      createdAt: isoNow(),
    };
    return safeWrite([...safeRead(), item]) ? item : null;
  },

  update(id: string, patch: Partial<Omit<DayItem, 'id' | 'createdAt'>>): void {
    const all = safeRead();
    const idx = all.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const next = { ...all[idx], ...patch };
    // 병합 결과가 무효(빈 text·비정상 date)면 patch 무시 — 다음 읽기에서 무음 삭제되는 것 방지
    if (typeof next.text !== 'string' || !next.text.trim() || !isDate(next.date)) return;
    all[idx] = { ...next, text: next.text.trim() };
    safeWrite(all);
  },

  /** 지운 기록 반환 — "되돌리기" 토스트용. */
  remove(id: string): DayItem | undefined {
    const all = safeRead();
    const removed = all.find((i) => i.id === id);
    safeWrite(all.filter((i) => i.id !== id));
    return removed;
  },

  restore(item: DayItem): void {
    const all = safeRead();
    if (all.some((i) => i.id === item.id)) return;
    safeWrite([...all, item]);
  },
};
