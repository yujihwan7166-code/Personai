/**
 * 스펙 보드 영속 store — LocalStorage 기반.
 *
 * journalStore 패턴 동일:
 * - vanilla module (React 외부에서도 호출 가능)
 * - 변경 시 CAREER_CHANGED 커스텀 이벤트 broadcast → 훅 자동 re-render
 *
 * 카테고리는 고정 목록이 아니라 기록에서 자라난다 — ensureCategory 로
 * 이름 기준 재사용, 없으면 생성.
 */
import { CAREER_CHANGED, FALLBACK_CATEGORY, type CareerProfile, type SpecCategory, type SpecItem } from '@/types/career';
import { notify } from '@/lib/notify';

const ITEMS_KEY = 'career.items.v1';
const CATEGORIES_KEY = 'career.categories.v1';
const PROFILE_KEY = 'career.profile.v1';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeIso = (value: unknown, fallbackIso: string): string => {
  if (typeof value !== 'string') return fallbackIso;
  const time = Date.parse(value);
  return Number.isNaN(time) ? fallbackIso : new Date(time).toISOString();
};

const normalizeDate = (value: unknown, fallbackIso: string): string => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return fallbackIso.slice(0, 10);
};

const normalizeItem = (value: unknown, index: number): SpecItem | null => {
  if (!isRecord(value)) return null;
  const raw = typeof value.raw === 'string' ? value.raw.trim() : '';
  const refined = typeof value.refined === 'string' && value.refined.trim() ? value.refined.trim() : raw;
  if (!raw && !refined) return null;
  const createdAt = normalizeIso(value.createdAt, new Date().toISOString());
  const detail = typeof value.detail === 'string' && value.detail.trim() ? value.detail : undefined;
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `sp_recovered_${index}`,
    categoryId: typeof value.categoryId === 'string' ? value.categoryId : '',
    raw: raw || refined,
    refined,
    date: normalizeDate(value.date, createdAt),
    detail,
    createdAt,
    updatedAt: normalizeIso(value.updatedAt, createdAt),
  };
};

const normalizeCategory = (value: unknown, index: number): SpecCategory | null => {
  if (!isRecord(value)) return null;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name) return null;
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `spc_recovered_${index}`,
    name,
    order: typeof value.order === 'number' && Number.isFinite(value.order) ? value.order : index,
    createdAt: normalizeIso(value.createdAt, new Date().toISOString()),
  };
};

const safeRead = <T>(key: string, normalize: (value: unknown, index: number) => T | null): T[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(normalize).filter((entry): entry is T => entry !== null)
      : [];
  } catch {
    return [];
  }
};

const readItems = (): SpecItem[] => safeRead(ITEMS_KEY, normalizeItem);
const readCategories = (): SpecCategory[] => safeRead(CATEGORIES_KEY, normalizeCategory);

let quotaNotified = false;

const safeWrite = (items: SpecItem[] | null, categories: SpecCategory[] | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (items) window.localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    if (categories) window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    window.dispatchEvent(new CustomEvent(CAREER_CHANGED));
  } catch (err) {
    const isQuota =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.code === 22);
    if (isQuota && !quotaNotified) {
      quotaNotified = true;
      notify.error('저장 공간이 가득 찼어요', {
        description: '다른 워크스페이스 데이터를 정리한 뒤 다시 시도해 주세요.',
      });
    } else if (!isQuota) {
      console.error('스펙 보드 저장 실패', err);
    }
  }
};

const newId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const careerStore = {
  /** 모든 항목 (createdAt 내림차순 — 최신 먼저). */
  listItems(): SpecItem[] {
    return [...readItems()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** 모든 카테고리 (order 오름차순). */
  listCategories(): SpecCategory[] {
    return [...readCategories()].sort((a, b) => a.order - b.order);
  },

  /**
   * 이름으로 카테고리를 찾고, 없으면 만들어서 반환.
   * AI 분류 결과가 기존 섹션과 같은 이름이면 재사용된다.
   */
  ensureCategory(name: string): SpecCategory {
    const trimmed = name.trim() || FALLBACK_CATEGORY;
    const categories = readCategories();
    const existing = categories.find((c) => c.name === trimmed);
    if (existing) return existing;
    const category: SpecCategory = {
      id: newId('spc'),
      name: trimmed,
      order: categories.length > 0 ? Math.max(...categories.map((c) => c.order)) + 1 : 0,
      createdAt: new Date().toISOString(),
    };
    safeWrite(null, [...categories, category]);
    return category;
  },

  /** 항목 추가 — categoryName 은 ensureCategory 로 섹션에 연결. */
  addItem(input: { raw: string; refined?: string; categoryName: string; date?: string }): SpecItem {
    const category = this.ensureCategory(input.categoryName);
    const now = new Date().toISOString();
    const raw = input.raw.trim();
    const item: SpecItem = {
      id: newId('sp'),
      categoryId: category.id,
      raw,
      refined: input.refined?.trim() || raw,
      date: input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
    };
    safeWrite([...readItems(), item], null);
    return item;
  },

  updateItem(id: string, patch: Partial<Omit<SpecItem, 'id' | 'createdAt'>>): void {
    const all = readItems();
    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
    safeWrite(all, null);
  },

  /** 카드를 다른 섹션으로 이동 (드래그 재분류). */
  moveItem(id: string, categoryId: string): void {
    if (!readCategories().some((c) => c.id === categoryId)) return;
    this.updateItem(id, { categoryId });
  },

  removeItem(id: string): void {
    safeWrite(readItems().filter((e) => e.id !== id), null);
  },

  /** 빈 카테고리 정리 — 항목이 하나도 없는 섹션 제거. */
  pruneEmptyCategories(): void {
    const used = new Set(readItems().map((e) => e.categoryId));
    const categories = readCategories();
    const kept = categories.filter((c) => used.has(c.id));
    if (kept.length !== categories.length) safeWrite(null, kept);
  },

  /** 빈 섹션만 삭제 허용 — 항목이 있으면 무시 (실수 방지). */
  removeCategory(id: string): void {
    if (readItems().some((item) => item.categoryId === id)) return;
    safeWrite(null, readCategories().filter((c) => c.id !== id));
  },

  renameCategory(id: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const categories = readCategories();
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) return;
    categories[idx] = { ...categories[idx], name: trimmed };
    safeWrite(null, categories);
  },

  getProfile(): CareerProfile {
    const empty: CareerProfile = { name: '', tagline: '', persona: '' };
    if (typeof window === 'undefined') return empty;
    try {
      const raw = window.localStorage.getItem(PROFILE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (!isRecord(parsed)) return empty;
      const persona = parsed.persona;
      return {
        name: typeof parsed.name === 'string' ? parsed.name : '',
        tagline: typeof parsed.tagline === 'string' ? parsed.tagline : '',
        persona: persona === 'student' || persona === 'jobseeker' || persona === 'worker' ? persona : '',
      };
    } catch {
      return empty;
    }
  },

  setProfile(patch: Partial<CareerProfile>): void {
    if (typeof window === 'undefined') return;
    try {
      const next = { ...this.getProfile(), ...patch };
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(CAREER_CHANGED));
    } catch (err) {
      console.error('프로필 저장 실패', err);
    }
  },

  /** 전체 삭제 (테스트·리셋용). */
  clear(): void {
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(PROFILE_KEY); } catch { /* noop */ }
    }
    safeWrite([], []);
  },
};
