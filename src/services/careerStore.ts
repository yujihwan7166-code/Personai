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
import { CAREER_CHANGED, FALLBACK_CATEGORY, type CareerBoard, type CareerDoc, type CareerProfile, type SpecCategory, type SpecItem } from '@/types/career';
import { notify } from '@/lib/notify';

const ITEMS_KEY = 'career.items.v1';
const CATEGORIES_KEY = 'career.categories.v1';
const PROFILE_KEY = 'career.profile.v1';
const DOCS_KEY = 'career.docs.v1';
// 멀티 보드 (2026-07-13) — 보드 목록 + 활성 보드. 기존 데이터는 첫 접근 때 기본 보드로 스탬프.
const BOARDS_KEY = 'career.boards.v1';
const ACTIVE_BOARD_KEY = 'career.activeBoard.v1';

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
  const optionalText = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() ? v : undefined;
  const optionalDate = (v: unknown): string | undefined =>
    typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `sp_recovered_${index}`,
    categoryId: typeof value.categoryId === 'string' ? value.categoryId : '',
    boardId: typeof value.boardId === 'string' && value.boardId ? value.boardId : undefined,
    raw: raw || refined,
    refined,
    date: normalizeDate(value.date, createdAt),
    endDate: optionalDate(value.endDate),
    ongoing: value.ongoing === true ? true : undefined,
    org: optionalText(value.org),
    link: optionalText(value.link),
    detail: optionalText(value.detail),
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
    boardId: typeof value.boardId === 'string' && value.boardId ? value.boardId : undefined,
    order: typeof value.order === 'number' && Number.isFinite(value.order) ? value.order : index,
    createdAt: normalizeIso(value.createdAt, new Date().toISOString()),
  };
};

const normalizeDoc = (value: unknown, index: number): CareerDoc | null => {
  if (!isRecord(value)) return null;
  const content = typeof value.content === 'string' ? value.content : '';
  if (!content.trim()) return null;
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `spd_recovered_${index}`,
    boardId: typeof value.boardId === 'string' && value.boardId ? value.boardId : undefined,
    purpose: typeof value.purpose === 'string' && value.purpose.trim() ? value.purpose.trim() : '문서',
    request: typeof value.request === 'string' && value.request.trim() ? value.request : undefined,
    content,
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
const readDocs = (): CareerDoc[] => safeRead(DOCS_KEY, normalizeDoc);

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

const writeDocs = (docs: CareerDoc[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
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
      console.error('만든 문서 저장 실패', err);
    }
  }
};

const newId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/* ── 멀티 보드 ─────────────────────────────
 * 보드가 없으면 '기본 보드'를 만들고, 구 데이터(boardId 없는 항목·카테고리)를
 * 첫 접근 때 1회 스탬프한다 — 기존 사용자 데이터 무손실. */

const normalizeBoard = (value: unknown, index: number): CareerBoard | null => {
  if (!isRecord(value)) return null;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name) return null;
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `spb_recovered_${index}`,
    name,
    createdAt: normalizeIso(value.createdAt, new Date().toISOString()),
  };
};

const readBoards = (): CareerBoard[] => {
  let boards = safeRead(BOARDS_KEY, normalizeBoard);
  if (typeof window === 'undefined') return boards;
  try {
    if (boards.length === 0) {
      boards = [{ id: newId('spb'), name: '기본 보드', createdAt: new Date().toISOString() }];
      window.localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
    }
    // boardId 없는 구 데이터를 첫 보드로 스탬프 — 스탬프 후엔 조건이 거짓이라 사실상 1회.
    const defId = boards[0].id;
    const items = readItems();
    if (items.some((i) => !i.boardId)) {
      window.localStorage.setItem(ITEMS_KEY, JSON.stringify(items.map((i) => (i.boardId ? i : { ...i, boardId: defId }))));
    }
    const cats = readCategories();
    if (cats.some((c) => !c.boardId)) {
      window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats.map((c) => (c.boardId ? c : { ...c, boardId: defId }))));
    }
  } catch { /* 저장 실패 시 다음 접근에서 재시도 */ }
  return boards;
};

const readActiveBoardId = (): string => {
  const boards = readBoards();
  if (typeof window !== 'undefined') {
    try {
      const v = window.localStorage.getItem(ACTIVE_BOARD_KEY);
      if (v && boards.some((b) => b.id === v)) return v;
    } catch { /* noop */ }
  }
  return boards[0]?.id ?? '';
};

/* ── 프로필 (보드별) ─────────────────────────────
 * 이름·연락처·사진 등 이력서 인적사항은 보드마다 따로 둔다 — 취업용·대학원용이
 * 서로 다른 이름·소개를 가질 수 있게. PROFILE_KEY 에 { boardId: CareerProfile } 맵으로 저장.
 * persona(신분)만은 새 보드에 이어받는다(설정 화면 재노출 방지). */

const EMPTY_PROFILE: CareerProfile = { name: '', tagline: '', persona: '' };

const normalizeProfile = (parsed: unknown): CareerProfile => {
  if (!isRecord(parsed)) return { ...EMPTY_PROFILE };
  const persona = parsed.persona;
  return {
    name: typeof parsed.name === 'string' ? parsed.name : '',
    tagline: typeof parsed.tagline === 'string' ? parsed.tagline : '',
    persona: persona === 'highschool' || persona === 'student' || persona === 'jobseeker' || persona === 'worker' ? persona : '',
    photo: typeof parsed.photo === 'string' && parsed.photo.startsWith('data:image/') ? parsed.photo : undefined,
    email: typeof parsed.email === 'string' && parsed.email.trim() ? parsed.email : undefined,
    phone: typeof parsed.phone === 'string' && parsed.phone.trim() ? parsed.phone : undefined,
    birth: typeof parsed.birth === 'string' && parsed.birth.trim() ? parsed.birth : undefined,
    link: typeof parsed.link === 'string' && parsed.link.trim() ? parsed.link : undefined,
  };
};

/** 보드별 프로필 맵 읽기 — 구 단일 프로필은 첫 보드로 승격(다른 보드엔 persona 만 상속). */
const readProfiles = (): Record<string, CareerProfile> => {
  if (typeof window === 'undefined') return {};
  let parsed: unknown;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    return {};
  }
  if (!isRecord(parsed)) return {};
  const values = Object.values(parsed);
  // 레거시 단일 프로필: 값이 전부 원시값(문자열 등)이면 보드별 맵이 아님 → 승격.
  const isLegacySingle = values.every((v) => typeof v !== 'object' || v === null);
  if (isLegacySingle) {
    const legacy = normalizeProfile(parsed);
    const boards = readBoards();
    if (boards.length === 0) return {};
    const map: Record<string, CareerProfile> = {};
    boards.forEach((b, i) => {
      map[b.id] = i === 0 ? legacy : { name: '', tagline: '', persona: legacy.persona };
    });
    try { window.localStorage.setItem(PROFILE_KEY, JSON.stringify(map)); } catch { /* noop */ }
    return map;
  }
  const map: Record<string, CareerProfile> = {};
  for (const [k, v] of Object.entries(parsed)) map[k] = normalizeProfile(v);
  return map;
};

const writeProfiles = (map: Record<string, CareerProfile>): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(CAREER_CHANGED));
  } catch (err) {
    console.error('프로필 저장 실패', err);
  }
};

export const careerStore = {
  /* ── 보드 ── */

  listBoards(): CareerBoard[] {
    return [...readBoards()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  getActiveBoardId(): string {
    return readActiveBoardId();
  },

  setActiveBoard(id: string): void {
    if (typeof window === 'undefined' || !readBoards().some((b) => b.id === id)) return;
    try {
      window.localStorage.setItem(ACTIVE_BOARD_KEY, id);
      window.dispatchEvent(new CustomEvent(CAREER_CHANGED));
    } catch { /* noop */ }
  },

  /** 새 보드 생성 + 활성화. seed 로 새 보드 프로필 초기값(주로 persona 상속)을 함께 심는다. */
  addBoard(name: string, seed?: Partial<CareerProfile>): CareerBoard | null {
    const trimmed = name.trim();
    if (!trimmed || typeof window === 'undefined') return null;
    const board: CareerBoard = { id: newId('spb'), name: trimmed, createdAt: new Date().toISOString() };
    try {
      window.localStorage.setItem(BOARDS_KEY, JSON.stringify([...readBoards(), board]));
      window.localStorage.setItem(ACTIVE_BOARD_KEY, board.id);
      if (seed) {
        const profiles = readProfiles();
        profiles[board.id] = { ...EMPTY_PROFILE, ...seed };
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
      }
      window.dispatchEvent(new CustomEvent(CAREER_CHANGED));
      return board;
    } catch {
      return null;
    }
  },

  renameBoard(id: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed || typeof window === 'undefined') return;
    const boards = readBoards();
    const idx = boards.findIndex((b) => b.id === id);
    if (idx === -1) return;
    boards[idx] = { ...boards[idx], name: trimmed };
    try {
      window.localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
      window.dispatchEvent(new CustomEvent(CAREER_CHANGED));
    } catch { /* noop */ }
  },

  /** 보드 삭제 — 딸린 기록·카테고리·프로필까지. 되돌리기용 번들 반환. 마지막 보드는 삭제 불가. */
  removeBoard(id: string): { board: CareerBoard; items: SpecItem[]; categories: SpecCategory[]; profile?: CareerProfile } | null {
    const boards = readBoards();
    if (boards.length <= 1) return null;
    const board = boards.find((b) => b.id === id);
    if (!board || typeof window === 'undefined') return null;
    const profiles = readProfiles();
    const bundle = {
      board,
      items: readItems().filter((i) => i.boardId === id),
      categories: readCategories().filter((c) => c.boardId === id),
      profile: profiles[id],
    };
    try {
      window.localStorage.setItem(BOARDS_KEY, JSON.stringify(boards.filter((b) => b.id !== id)));
      // ACTIVE_BOARD_KEY 는 일부러 남긴다 — readActiveBoardId 가 첫 보드로 폴백하고,
      // 되돌리기로 보드가 살아나면 다시 그 보드가 활성이 된다.
      if (profiles[id]) {
        delete profiles[id];
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
      }
      safeWrite(
        readItems().filter((i) => i.boardId !== id),
        readCategories().filter((c) => c.boardId !== id),
      );
      return bundle;
    } catch {
      return null;
    }
  },

  restoreBoard(bundle: { board: CareerBoard; items: SpecItem[]; categories: SpecCategory[]; profile?: CareerProfile }): void {
    if (typeof window === 'undefined') return;
    try {
      const boards = readBoards();
      if (!boards.some((b) => b.id === bundle.board.id)) {
        window.localStorage.setItem(BOARDS_KEY, JSON.stringify([...boards, bundle.board]));
      }
      if (bundle.profile) {
        const profiles = readProfiles();
        profiles[bundle.board.id] = bundle.profile;
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
      }
      const items = readItems();
      const cats = readCategories();
      const itemIds = new Set(items.map((i) => i.id));
      const catIds = new Set(cats.map((c) => c.id));
      safeWrite(
        [...items, ...bundle.items.filter((i) => !itemIds.has(i.id))],
        [...cats, ...bundle.categories.filter((c) => !catIds.has(c.id))],
      );
    } catch { /* noop */ }
  },

  /** 보드별 기록 수 — 사이드바 숫자용. */
  countItemsByBoard(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const i of readItems()) {
      if (!i.boardId) continue;
      out[i.boardId] = (out[i.boardId] ?? 0) + 1;
    }
    return out;
  },

  /* ── 기록 (활성 보드 스코프) ── */

  /** 활성 보드의 항목 (createdAt 내림차순 — 최신 먼저). */
  listItems(): SpecItem[] {
    const active = readActiveBoardId();
    return readItems()
      .filter((i) => i.boardId === active)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** 활성 보드의 카테고리 (order 오름차순). */
  listCategories(): SpecCategory[] {
    const active = readActiveBoardId();
    return readCategories()
      .filter((c) => c.boardId === active)
      .sort((a, b) => a.order - b.order);
  },

  /**
   * 이름으로 활성 보드의 카테고리를 찾고, 없으면 만들어서 반환.
   * AI 분류 결과가 기존 섹션과 같은 이름이면 재사용된다.
   */
  ensureCategory(name: string): SpecCategory {
    const active = readActiveBoardId();
    const trimmed = name.trim() || FALLBACK_CATEGORY;
    const categories = readCategories();
    const mine = categories.filter((c) => c.boardId === active);
    const existing = mine.find((c) => c.name === trimmed);
    if (existing) return existing;
    const category: SpecCategory = {
      id: newId('spc'),
      name: trimmed,
      boardId: active,
      order: mine.length > 0 ? Math.max(...mine.map((c) => c.order)) + 1 : 0,
      createdAt: new Date().toISOString(),
    };
    safeWrite(null, [...categories, category]);
    return category;
  },

  /** 항목 추가 — categoryName 은 ensureCategory 로 섹션에 연결. */
  addItem(input: {
    raw: string;
    refined?: string;
    categoryName: string;
    date?: string;
    endDate?: string;
    ongoing?: boolean;
    org?: string;
    link?: string;
    detail?: string;
  }): SpecItem {
    const category = this.ensureCategory(input.categoryName);
    const now = new Date().toISOString();
    const raw = input.raw.trim();
    const item: SpecItem = {
      id: newId('sp'),
      categoryId: category.id,
      boardId: readActiveBoardId(),
      raw,
      refined: input.refined?.trim() || raw,
      date: input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : now.slice(0, 10),
      endDate: input.endDate && /^\d{4}-\d{2}-\d{2}$/.test(input.endDate) ? input.endDate : undefined,
      ongoing: input.ongoing === true ? true : undefined,
      org: input.org?.trim() || undefined,
      link: input.link?.trim() || undefined,
      detail: input.detail?.trim() || undefined,
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

  /** 뺀 카드를 그대로 되돌린다 — id·소속 섹션까지 통째로. */
  restoreItem(item: SpecItem): void {
    const all = readItems();
    if (all.some((e) => e.id === item.id)) return;
    safeWrite([...all, item], null);
  },

  /** 빈 카테고리 정리 — 활성 보드에서 항목이 하나도 없는 섹션 제거 (다른 보드는 건드리지 않음). */
  pruneEmptyCategories(): void {
    const active = readActiveBoardId();
    const used = new Set(readItems().map((e) => e.categoryId));
    const categories = readCategories();
    const kept = categories.filter((c) => c.boardId !== active || used.has(c.id));
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

  /** 만든 문서 보관함 (createdAt 내림차순 — 최신 먼저). */
  listDocs(): CareerDoc[] {
    return [...readDocs()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** 생성된 문서를 보관함에 저장 — 어느 보드로 만들었는지 스탬프. */
  addDoc(input: { purpose: string; content: string; request?: string }): CareerDoc {
    const doc: CareerDoc = {
      id: newId('spd'),
      boardId: readActiveBoardId(),
      purpose: input.purpose.trim() || '문서',
      request: input.request?.trim() || undefined,
      content: input.content,
      createdAt: new Date().toISOString(),
    };
    writeDocs([doc, ...readDocs()]);
    return doc;
  },

  removeDoc(id: string): void {
    writeDocs(readDocs().filter((d) => d.id !== id));
  },

  /** 활성 보드의 프로필. 프로필이 없는 보드(구버전 생성)는 persona 만 다른 보드에서
   * 이어받아 반환 — 설정 화면이 다시 뜨지 않게. */
  getProfile(): CareerProfile {
    const profiles = readProfiles();
    const active = readActiveBoardId();
    if (profiles[active]) return profiles[active];
    const inheritedPersona = Object.values(profiles).find((p) => p.persona)?.persona ?? '';
    return { name: '', tagline: '', persona: inheritedPersona };
  },

  setProfile(patch: Partial<CareerProfile>): void {
    if (typeof window === 'undefined') return;
    const active = readActiveBoardId();
    const profiles = readProfiles();
    profiles[active] = { ...(profiles[active] ?? EMPTY_PROFILE), ...patch };
    writeProfiles(profiles);
  },

  /** 전체 삭제 (테스트·리셋용). */
  clear(): void {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(PROFILE_KEY);
        window.localStorage.removeItem(BOARDS_KEY);
        window.localStorage.removeItem(ACTIVE_BOARD_KEY);
      } catch { /* noop */ }
    }
    writeDocs([]);
    safeWrite([], []);
  },
};
