/**
 * 인맥노트 영속 store — LocalStorage (daylogStore 패턴: 방어 normalize + undo + quota 스로틀).
 */
import {
  PEOPLE_CHANGED,
  type Anniv,
  type Closeness,
  type Interaction,
  type InteractionKind,
  type PeopleCategory,
  type Person,
  type Relation,
} from '@/types/people';
import { todayKey } from '@/types/travel';
import { notify } from '@/lib/notify';

const PERSONS_KEY = 'people.persons.v1';
const INTERACTIONS_KEY = 'people.interactions.v1';
const CATEGORIES_KEY = 'people.categories.v1';
const CATEGORIES_SEEDED_KEY = 'people.catSeeded.v1';
/** 처음 방문 시 깔아두는 예시 카테고리 — 감을 잡게. 지우면 다시 안 생긴다(플래그). */
const SEED_CATEGORY_NAMES = ['가족', '직장', '대학동기'];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isMonthDay = (v: unknown): v is string =>
  typeof v === 'string' && /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v);
const isRelation = (v: unknown): v is Relation =>
  v === 'family' || v === 'friend' || v === 'work' || v === 'business' || v === 'etc';
const isCloseness = (v: unknown): v is Closeness =>
  v === 'best' || v === 'close' || v === 'normal' || v === 'distant';
const isKind = (v: unknown): v is InteractionKind =>
  v === 'chat' || v === 'meet' || v === 'gift_given' || v === 'gift_received' || v === 'ping';

const isoNow = () => new Date().toISOString();
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim()) : [];

const normalizeAnniv = (v: unknown, i: number): Anniv | null => {
  if (!isRecord(v)) return null;
  const label = typeof v.label === 'string' ? v.label.trim() : '';
  if (!label || !isMonthDay(v.monthDay)) return null;
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `anv_recovered_${i}`,
    label,
    monthDay: v.monthDay,
    type: v.type === 'etc' ? 'etc' : 'anniversary',
  };
};

const normalizePerson = (v: unknown, i: number): Person | null => {
  if (!isRecord(v)) return null;
  const name = typeof v.name === 'string' ? v.name.trim() : '';
  if (!name) return null;
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `psn_recovered_${i}`,
    name,
    relation: isRelation(v.relation) ? v.relation : 'etc',
    closeness: isCloseness(v.closeness) ? v.closeness : 'normal',
    intro: typeof v.intro === 'string' && v.intro.trim() ? v.intro.trim() : undefined,
    tags: strList(v.tags),
    categoryIds: strList(v.categoryIds),
    color: typeof v.color === 'string' && v.color.trim() ? v.color.trim() : undefined,
    photo: typeof v.photo === 'string' && v.photo.startsWith('data:image/') ? v.photo : undefined,
    phone: typeof v.phone === 'string' && v.phone.trim() ? v.phone.trim() : undefined,
    region: typeof v.region === 'string' && v.region.trim() ? v.region.trim() : undefined,
    birthday: isMonthDay(v.birthday) ? v.birthday : undefined,
    annivs: Array.isArray(v.annivs)
      ? v.annivs.map(normalizeAnniv).filter((a): a is Anniv => a !== null)
      : [],
    likes: strList(v.likes),
    dislikes: strList(v.dislikes),
    familyNote: typeof v.familyNote === 'string' && v.familyNote.trim() ? v.familyNote.trim() : undefined,
    episode: typeof v.episode === 'string' && v.episode.trim() ? v.episode.trim() : undefined,
    createdAt:
      typeof v.createdAt === 'string' && !Number.isNaN(Date.parse(v.createdAt)) ? v.createdAt : isoNow(),
  };
};

const normalizeCategory = (v: unknown, i: number): PeopleCategory | null => {
  if (!isRecord(v)) return null;
  const name = typeof v.name === 'string' ? v.name.trim() : '';
  if (!name) return null;
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `pcat_recovered_${i}`,
    name,
    createdAt:
      typeof v.createdAt === 'string' && !Number.isNaN(Date.parse(v.createdAt)) ? v.createdAt : isoNow(),
  };
};

const normalizeInteraction = (v: unknown, i: number): Interaction | null => {
  if (!isRecord(v)) return null;
  const note = typeof v.note === 'string' ? v.note.trim() : '';
  const personId = typeof v.personId === 'string' ? v.personId : '';
  if (!personId || !isDate(v.date)) return null;
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `itx_recovered_${i}`,
    personId,
    kind: isKind(v.kind) ? v.kind : 'chat',
    date: v.date,
    note,
    createdAt:
      typeof v.createdAt === 'string' && !Number.isNaN(Date.parse(v.createdAt)) ? v.createdAt : isoNow(),
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

let quotaNotifiedAt = 0;

function writeList<T>(key: string, list: T[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(PEOPLE_CHANGED));
    return true;
  } catch (err) {
    const isQuota = err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22);
    if (isQuota) {
      if (Date.now() - quotaNotifiedAt > 5000) {
        quotaNotifiedAt = Date.now();
        notify.error('저장 공간이 가득 차 저장되지 않았어요');
      }
    } else {
      console.error('인맥노트 저장 실패', err);
    }
    return false;
  }
}

const newId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const readPersons = () => readList(PERSONS_KEY, normalizePerson);
const readInteractions = () => readList(INTERACTIONS_KEY, normalizeInteraction);
const readCategories = () => readList(CATEGORIES_KEY, normalizeCategory);

/** 최초 1회 예시 카테고리 seed — 이미 있거나 한번 깔았으면 skip (플래그로 재생성 방지). */
function ensureSeededCategories(): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(CATEGORIES_SEEDED_KEY)) return;
    window.localStorage.setItem(CATEGORIES_SEEDED_KEY, '1');
    if (readCategories().length > 0) return;
    const base = Date.now();
    const seed: PeopleCategory[] = SEED_CATEGORY_NAMES.map((name, i) => ({
      id: newId('pcat'),
      name,
      createdAt: new Date(base + i).toISOString(), // 순서 안정화
    }));
    window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(seed));
  } catch { /* noop */ }
}

export const peopleStore = {
  /* ── 사람 ── */

  listPersons(): Person[] {
    return readPersons().sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  },

  getPerson(id: string): Person | undefined {
    return readPersons().find((p) => p.id === id);
  },

  addPerson(input: Omit<Partial<Person>, 'id' | 'createdAt'> & { name: string }): Person | null {
    const normalized = normalizePerson({ ...input, id: newId('psn'), createdAt: isoNow() }, 0);
    if (!normalized) return null;
    return writeList(PERSONS_KEY, [...readPersons(), normalized]) ? normalized : null;
  },

  updatePerson(id: string, patch: Partial<Omit<Person, 'id' | 'createdAt'>>): void {
    const all = readPersons();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const next = normalizePerson({ ...all[idx], ...patch }, idx);
    if (!next) return; // 병합 결과 무효(빈 이름 등) — patch 무시
    all[idx] = { ...next, id: all[idx].id, createdAt: all[idx].createdAt };
    writeList(PERSONS_KEY, all);
  },

  /** 사람 삭제 — 딸린 기록도 함께. 되돌리기용으로 둘 다 반환. */
  removePerson(id: string): { person: Person; interactions: Interaction[] } | undefined {
    const persons = readPersons();
    const person = persons.find((p) => p.id === id);
    if (!person) return undefined;
    const interactions = readInteractions().filter((x) => x.personId === id);
    writeList(INTERACTIONS_KEY, readInteractions().filter((x) => x.personId !== id));
    writeList(PERSONS_KEY, persons.filter((p) => p.id !== id));
    return { person, interactions };
  },

  restorePerson(bundle: { person: Person; interactions: Interaction[] }): void {
    const persons = readPersons();
    if (!persons.some((p) => p.id === bundle.person.id)) {
      writeList(PERSONS_KEY, [...persons, bundle.person]);
    }
    const itx = readInteractions();
    const ids = new Set(itx.map((x) => x.id));
    const missing = bundle.interactions.filter((x) => !ids.has(x.id));
    if (missing.length > 0) writeList(INTERACTIONS_KEY, [...itx, ...missing]);
  },

  /* ── 관계 기록 ── */

  listInteractions(personId?: string): Interaction[] {
    const all = readInteractions().sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
    return personId ? all.filter((x) => x.personId === personId) : all;
  },

  addInteraction(input: { personId: string; kind: InteractionKind; date?: string; note: string }): Interaction | null {
    const item = normalizeInteraction(
      {
        ...input,
        id: newId('itx'),
        date: input.date && isDate(input.date) ? input.date : todayKey(), // 로컬 YMD — UTC slice 금지

        createdAt: isoNow(),
      },
      0,
    );
    if (!item) return null;
    return writeList(INTERACTIONS_KEY, [...readInteractions(), item]) ? item : null;
  },

  removeInteraction(id: string): Interaction | undefined {
    const all = readInteractions();
    const removed = all.find((x) => x.id === id);
    writeList(INTERACTIONS_KEY, all.filter((x) => x.id !== id));
    return removed;
  },

  restoreInteraction(item: Interaction): void {
    const all = readInteractions();
    if (all.some((x) => x.id === item.id)) return;
    writeList(INTERACTIONS_KEY, [...all, item]);
  },

  /* ── 카테고리 (그룹) ── */

  listCategories(): PeopleCategory[] {
    ensureSeededCategories();
    return readCategories().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  /** 카테고리 생성 — 같은 이름(대소문자 무시)은 새로 만들지 않고 기존 것을 반환. */
  addCategory(name: string): PeopleCategory | null {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const all = readCategories();
    const existing = all.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;
    const cat: PeopleCategory = { id: newId('pcat'), name: trimmed, createdAt: isoNow() };
    return writeList(CATEGORIES_KEY, [...all, cat]) ? cat : null;
  },

  renameCategory(id: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const all = readCategories();
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], name: trimmed };
    writeList(CATEGORIES_KEY, all);
  },

  /** 카테고리 삭제 — 모든 사람에게서 편입도 제거. 되돌리기용 번들 반환. */
  removeCategory(id: string): { category: PeopleCategory; memberIds: string[] } | undefined {
    const all = readCategories();
    const category = all.find((c) => c.id === id);
    if (!category) return undefined;
    const persons = readPersons();
    const memberIds = persons.filter((p) => p.categoryIds.includes(id)).map((p) => p.id);
    if (memberIds.length > 0) {
      writeList(
        PERSONS_KEY,
        persons.map((p) =>
          p.categoryIds.includes(id) ? { ...p, categoryIds: p.categoryIds.filter((c) => c !== id) } : p,
        ),
      );
    }
    writeList(CATEGORIES_KEY, all.filter((c) => c.id !== id));
    return { category, memberIds };
  },

  restoreCategory(bundle: { category: PeopleCategory; memberIds: string[] }): void {
    const all = readCategories();
    if (!all.some((c) => c.id === bundle.category.id)) {
      writeList(CATEGORIES_KEY, [...all, bundle.category]);
    }
    const set = new Set(bundle.memberIds);
    if (set.size > 0) {
      const persons = readPersons();
      writeList(
        PERSONS_KEY,
        persons.map((p) =>
          set.has(p.id) && !p.categoryIds.includes(bundle.category.id)
            ? { ...p, categoryIds: [...p.categoryIds, bundle.category.id] }
            : p,
        ),
      );
    }
  },
};
