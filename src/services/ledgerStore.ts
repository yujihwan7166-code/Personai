/**
 * 가계부 영속 store — localStorage (healthStore 패턴).
 * vanilla 모듈 싱글턴, 변경 시 LEDGER_CHANGED broadcast → useLedger 자동 re-render.
 * 시드 데이터 없음(돈 데이터에 예시는 오염). 백업: exportJson/importJson.
 */
import {
  LEDGER_CHANGED,
  DEFAULT_CATEGORIES,
  type AssetKind, type AssetSnapshot, type EntryType, type LedgerAsset, type LedgerBudgets,
  type LedgerCategory, type LedgerEntry, type LedgerSettings, type PayMethod, type RecurringRule,
} from '@/types/ledger';
import { newId } from '@/lib/idGenerator';

const ENTRIES_KEY = 'ledger.entries.v1';
const RECURRING_KEY = 'ledger.recurring.v1';
const BUDGETS_KEY = 'ledger.budgets.v1';
const SETTINGS_KEY = 'ledger.settings.v1';
const DICT_KEY = 'ledger.dict.v1';
const CATEGORIES_KEY = 'ledger.categories.v1'; // 커스텀 추가분만 저장
const ASSETS_KEY = 'ledger.assets.v1';
const SNAPSHOTS_KEY = 'ledger.snapshots.v1';
const META_KEY = 'ledger.meta.v1'; // { lastBackupAt } — 백업 나이 계기판용

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const nowIso = () => new Date().toISOString();
const isYmd = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isType = (v: unknown): v is EntryType => v === 'expense' || v === 'income' || v === 'transfer';
const isMethod = (v: unknown): v is PayMethod => v === 'card' || v === 'cash' || v === 'account';
const posInt = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null);

const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = (): string => ymd(new Date());

function normEntry(v: unknown, i: number): LedgerEntry | null {
  if (!isRecord(v)) return null;
  const amount = posInt(v.amount);
  if (!isType(v.type) || amount === null || !isYmd(v.date)) return null;
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `le_${i}`,
    type: v.type, amount, date: v.date,
    categoryId: typeof v.categoryId === 'string' && v.categoryId ? v.categoryId : 'etc',
    memo: typeof v.memo === 'string' ? v.memo : '',
    method: isMethod(v.method) ? v.method : undefined,
    groupTotal: posInt(v.groupTotal) ?? undefined,
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : nowIso(),
  };
}

function normRule(v: unknown, i: number): RecurringRule | null {
  if (!isRecord(v)) return null;
  const amount = posInt(v.amount);
  const label = typeof v.label === 'string' ? v.label.trim() : '';
  if (!label || amount === null) return null;
  const day = posInt(v.day) ?? 1;
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `lr_${i}`,
    label, amount,
    type: isType(v.type) ? v.type : 'expense',
    categoryId: typeof v.categoryId === 'string' && v.categoryId ? v.categoryId : 'subscription',
    day: Math.min(28, Math.max(1, day)),
    method: isMethod(v.method) ? v.method : undefined,
    active: v.active !== false,
    lastPostedMonth: typeof v.lastPostedMonth === 'string' && /^\d{4}-\d{2}$/.test(v.lastPostedMonth) ? v.lastPostedMonth : undefined,
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : nowIso(),
  };
}

const ASSET_KINDS: AssetKind[] = ['cash', 'invest', 'coin', 'property', 'debt'];

function normAsset(v: unknown, i: number): LedgerAsset | null {
  if (!isRecord(v)) return null;
  const label = typeof v.label === 'string' ? v.label.trim() : '';
  const value = posInt(v.value) ?? (v.value === 0 ? 0 : null);
  if (!label || value === null) return null;
  const posNum = (x: unknown): number | undefined =>
    typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : undefined;
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `la_${i}`,
    kind: ASSET_KINDS.includes(v.kind as AssetKind) ? (v.kind as AssetKind) : 'cash',
    label, value,
    qty: posNum(v.qty),
    avgPrice: posNum(v.avgPrice),
    annualDividend: posInt(v.annualDividend) ?? undefined,
    dividendMonths: Array.isArray(v.dividendMonths)
      ? v.dividendMonths.filter((m): m is number => typeof m === 'number' && m >= 1 && m <= 12)
      : undefined,
    note: typeof v.note === 'string' && v.note.trim() ? v.note : undefined,
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : nowIso(),
    updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : nowIso(),
  };
}

function normSnapshot(v: unknown): AssetSnapshot | null {
  if (!isRecord(v)) return null;
  if (typeof v.month !== 'string' || !/^\d{4}-\d{2}$/.test(v.month)) return null;
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? Math.round(x) : 0);
  return {
    month: v.month,
    assets: num(v.assets),
    debt: num(v.debt),
    net: num(v.net),
    savedAt: typeof v.savedAt === 'string' ? v.savedAt : nowIso(),
  };
}

function readArr<T>(key: string, norm: (v: unknown, i: number) => T | null): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(norm).filter((e): e is T => e !== null) : [];
  } catch { return []; }
}

function readObj<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? (parsed as T) : fallback;
  } catch { return fallback; }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(LEDGER_CHANGED));
  } catch (err) { console.error('가계부 저장 실패', err); }
}

const sortEntries = (arr: LedgerEntry[]) =>
  [...arr].sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));

export type NewEntry = Omit<LedgerEntry, 'id' | 'createdAt'>;

export const ledgerStore = {
  listEntries(): LedgerEntry[] { return sortEntries(readArr(ENTRIES_KEY, normEntry)); },

  addEntries(items: NewEntry[]): LedgerEntry[] {
    const cur = readArr(ENTRIES_KEY, normEntry);
    const added = items
      .map((it) => normEntry({ ...it, id: newId('le'), createdAt: nowIso() }, 0))
      .filter((e): e is LedgerEntry => e !== null);
    write(ENTRIES_KEY, [...cur, ...added]);
    return added;
  },

  updateEntry(id: string, patch: Partial<NewEntry>, opts?: { learn?: boolean }): void {
    const cur = readArr(ENTRIES_KEY, normEntry);
    const prev = cur.find((e) => e.id === id);
    const next = cur.map((e) => (e.id === id ? { ...e, ...patch, id: e.id, createdAt: e.createdAt } : e));
    write(ENTRIES_KEY, next);
    // 분류 수정 학습 — 메모 첫 단어를 카테고리 키워드로 (LLM 없는 자동완성 개선)
    if (opts?.learn && prev && patch.categoryId && patch.categoryId !== prev.categoryId) {
      const word = prev.memo.trim().split(/\s+/)[0];
      if (word && word.length >= 2) {
        const dict = readObj<Record<string, string>>(DICT_KEY, {});
        write(DICT_KEY, { ...dict, [word]: patch.categoryId });
      }
    }
  },

  removeEntry(id: string): void {
    write(ENTRIES_KEY, readArr(ENTRIES_KEY, normEntry).filter((e) => e.id !== id));
  },

  duplicateEntry(id: string, date: string): void {
    const src = readArr(ENTRIES_KEY, normEntry).find((e) => e.id === id);
    if (!src) return;
    this.addEntries([{ type: src.type, amount: src.amount, date, categoryId: src.categoryId, memo: src.memo, method: src.method }]);
  },

  // ── 고정지출 ──
  listRecurring(): RecurringRule[] { return readArr(RECURRING_KEY, normRule); },

  addRecurring(rule: Omit<RecurringRule, 'id' | 'createdAt' | 'active' | 'lastPostedMonth'> & { active?: boolean }): void {
    const cur = readArr(RECURRING_KEY, normRule);
    const next = normRule({ ...rule, id: newId('lr'), active: rule.active !== false, createdAt: nowIso() }, 0);
    if (next) write(RECURRING_KEY, [...cur, next]);
  },

  updateRecurring(id: string, patch: Partial<Omit<RecurringRule, 'id' | 'createdAt'>>): void {
    write(RECURRING_KEY, readArr(RECURRING_KEY, normRule).map((r) => (r.id === id ? { ...r, ...patch, id: r.id, createdAt: r.createdAt } : r)));
  },

  removeRecurring(id: string): void {
    write(RECURRING_KEY, readArr(RECURRING_KEY, normRule).filter((r) => r.id !== id));
  },

  /**
   * 도래한 고정지출을 내역에 기록 (앱 진입 시 호출).
   * 각 규칙: lastPostedMonth 다음 달부터 이번 달까지, day 가 지난 달만 기록.
   * 등록 이전 과거로는 소급하지 않음(createdAt 의 달부터).
   */
  postDueRecurring(todayYmd: string): void {
    const rules = readArr(RECURRING_KEY, normRule);
    if (!rules.length) return;
    const curMonth = todayYmd.slice(0, 7);
    const curDay = Number(todayYmd.slice(8, 10));
    const entries = readArr(ENTRIES_KEY, normEntry);
    const newEntries: LedgerEntry[] = [];
    let rulesChanged = false;

    const nextMonth = (m: string): string => {
      const [y, mo] = m.split('-').map(Number);
      return mo === 12 ? `${y + 1}-01` : `${y}-${pad(mo + 1)}`;
    };

    const updated = rules.map((r) => {
      if (!r.active) return r;
      const created = r.createdAt.slice(0, 7);
      const startMonth = r.lastPostedMonth
        ? nextMonth(r.lastPostedMonth)
        : created > curMonth ? curMonth : created; // 시계 어긋남 방어
      let m = startMonth;
      let last = r.lastPostedMonth;
      while (m <= curMonth) {
        const due = m < curMonth || r.day <= curDay;
        if (!due) break;
        newEntries.push({
          id: newId('le'), type: r.type, amount: r.amount, date: `${m}-${pad(r.day)}`,
          categoryId: r.categoryId, memo: r.label, method: r.method, createdAt: nowIso(),
        });
        last = m;
        m = nextMonth(m);
      }
      if (last !== r.lastPostedMonth) { rulesChanged = true; return { ...r, lastPostedMonth: last }; }
      return r;
    });

    if (newEntries.length) write(ENTRIES_KEY, [...entries, ...newEntries]);
    if (rulesChanged) write(RECURRING_KEY, updated);
  },

  // ── 예산·설정·사전·카테고리 ──
  getBudgets(): LedgerBudgets { return readObj<LedgerBudgets>(BUDGETS_KEY, {}); },
  setBudgets(b: LedgerBudgets): void { write(BUDGETS_KEY, b); },
  getSettings(): LedgerSettings { return readObj<LedgerSettings>(SETTINGS_KEY, {}); },
  setSettings(s: LedgerSettings): void { write(SETTINGS_KEY, s); },
  getKeywordDict(): Record<string, string> { return readObj<Record<string, string>>(DICT_KEY, {}); },

  /**
   * 분류 규칙 하나 저장 — "이 말이 memo 에 있으면 이 카테고리". 파서가 기본 사전보다 먼저 본다.
   * 같은 키워드는 덮어쓰기(규칙은 하나만). 공백·빈 문자열은 무시.
   */
  setKeywordRule(keyword: string, categoryId: string): void {
    const k = keyword.trim();
    if (!k || !categoryId) return;
    write(DICT_KEY, { ...this.getKeywordDict(), [k]: categoryId });
  },

  removeKeywordRule(keyword: string): void {
    const dict = this.getKeywordDict();
    if (!(keyword in dict)) return;
    delete dict[keyword];
    write(DICT_KEY, dict);
  },

  listCategories(): LedgerCategory[] {
    const custom = readArr(CATEGORIES_KEY, (v): LedgerCategory | null => {
      if (!isRecord(v) || typeof v.id !== 'string' || typeof v.label !== 'string') return null;
      const bucket = v.bucket === 'fixed' || v.bucket === 'variable' || v.bucket === 'irregular' ? v.bucket : 'variable';
      return { id: v.id, label: v.label, emoji: typeof v.emoji === 'string' ? v.emoji : '🏷️', bucket, custom: true };
    });
    return [...DEFAULT_CATEGORIES, ...custom];
  },

  /** 같은 이름(공백·대소문자 무시)이 이미 있으면 그 카테고리를 그대로 돌려준다. */
  addCategory(label: string, emoji: string, bucket: LedgerCategory['bucket']): LedgerCategory | null {
    const name = label.trim();
    if (!name) return null;
    const key = (s: string) => s.replace(/\s+/g, '').toLowerCase();
    const existing = this.listCategories().find((c) => key(c.label) === key(name));
    if (existing) return existing;
    const created: LedgerCategory = {
      id: newId('lc'), label: name, emoji: emoji.trim() || '🏷️', bucket, custom: true,
    };
    write(CATEGORIES_KEY, [...this.listCategories().filter((c) => c.custom), created]);
    return created;
  },

  /** 내역에서 이 카테고리를 쓰는 건수 — 삭제 전 영향 범위를 보여주기 위해. */
  categoryUsage(id: string): number {
    return readArr(ENTRIES_KEY, normEntry).filter((e) => e.categoryId === id).length;
  },

  /**
   * 커스텀 카테고리 삭제. 기본 10종은 지울 수 없다.
   * 쓰던 내역·고정지출은 지우지 않고 fallback(기본 '기타')으로 옮긴다 — 돈 기록 자체는 절대 잃지 않는다.
   * 이 카테고리를 가리키던 분류 규칙은 함께 지운다(가리킬 곳이 없어지므로).
   */
  removeCategory(id: string, fallbackId = 'etc'): { moved: number } | null {
    const target = this.listCategories().find((c) => c.id === id);
    if (!target?.custom) return null;

    const entries = readArr(ENTRIES_KEY, normEntry);
    const moved = entries.filter((e) => e.categoryId === id).length;
    if (moved > 0) write(ENTRIES_KEY, entries.map((e) => (e.categoryId === id ? { ...e, categoryId: fallbackId } : e)));

    const rules = readArr(RECURRING_KEY, normRule);
    if (rules.some((r) => r.categoryId === id)) {
      write(RECURRING_KEY, rules.map((r) => (r.categoryId === id ? { ...r, categoryId: fallbackId } : r)));
    }

    const dict = this.getKeywordDict();
    const kept = Object.fromEntries(Object.entries(dict).filter(([, cid]) => cid !== id));
    if (Object.keys(kept).length !== Object.keys(dict).length) write(DICT_KEY, kept);

    write(CATEGORIES_KEY, this.listCategories().filter((c) => c.custom && c.id !== id));
    return { moved };
  },

  // ── 자산·스냅샷 (2차) ──
  listAssets(): LedgerAsset[] { return readArr(ASSETS_KEY, normAsset); },

  addAsset(a: Omit<LedgerAsset, 'id' | 'createdAt' | 'updatedAt'>): void {
    const cur = readArr(ASSETS_KEY, normAsset);
    const next = normAsset({ ...a, id: newId('la'), createdAt: nowIso(), updatedAt: nowIso() }, 0);
    if (next) write(ASSETS_KEY, [...cur, next]);
  },

  updateAsset(id: string, patch: Partial<Omit<LedgerAsset, 'id' | 'createdAt'>>): void {
    write(ASSETS_KEY, readArr(ASSETS_KEY, normAsset).map((a) =>
      a.id === id ? { ...a, ...patch, id: a.id, createdAt: a.createdAt, updatedAt: nowIso() } : a));
  },

  removeAsset(id: string): void {
    write(ASSETS_KEY, readArr(ASSETS_KEY, normAsset).filter((a) => a.id !== id));
  },

  listSnapshots(): AssetSnapshot[] {
    return readArr(SNAPSHOTS_KEY, (v) => normSnapshot(v)).sort((a, b) => a.month.localeCompare(b.month));
  },

  /** 현재 자산 상태로 해당 월 스냅샷 저장(같은 달은 덮어씀) → 순자산 추이의 점. */
  upsertSnapshot(month: string): AssetSnapshot | null {
    if (!/^\d{4}-\d{2}$/.test(month)) return null;
    const assets = readArr(ASSETS_KEY, normAsset);
    let plus = 0, minus = 0;
    for (const a of assets) { if (a.kind === 'debt') minus += a.value; else plus += a.value; }
    const snap: AssetSnapshot = { month, assets: plus, debt: minus, net: plus - minus, savedAt: nowIso() };
    const rest = readArr(SNAPSHOTS_KEY, (v) => normSnapshot(v)).filter((s) => s.month !== month);
    write(SNAPSHOTS_KEY, [...rest, snap]);
    return snap;
  },

  // ── 백업 ──
  getLastBackupAt(): string | null {
    const meta = readObj<{ lastBackupAt?: string }>(META_KEY, {});
    return typeof meta.lastBackupAt === 'string' ? meta.lastBackupAt : null;
  },

  markBackedUp(): void { write(META_KEY, { lastBackupAt: nowIso() }); },

  exportJson(): string {
    return JSON.stringify({
      version: 1,
      exportedAt: nowIso(),
      entries: readArr(ENTRIES_KEY, normEntry),
      recurring: readArr(RECURRING_KEY, normRule),
      budgets: this.getBudgets(),
      settings: this.getSettings(),
      dict: this.getKeywordDict(),
      categories: this.listCategories().filter((c) => c.custom),
      assets: readArr(ASSETS_KEY, normAsset),
      snapshots: readArr(SNAPSHOTS_KEY, (v) => normSnapshot(v)),
    }, null, 2);
  },

  /** 전체 교체 방식. 파싱·검증 실패 시 false, 기존 데이터 보존. */
  importJson(raw: string): boolean {
    try {
      const data = JSON.parse(raw);
      if (!isRecord(data) || !Array.isArray(data.entries)) return false;
      write(ENTRIES_KEY, data.entries.map(normEntry).filter(Boolean));
      write(RECURRING_KEY, Array.isArray(data.recurring) ? data.recurring.map(normRule).filter(Boolean) : []);
      write(BUDGETS_KEY, isRecord(data.budgets) ? data.budgets : {});
      write(SETTINGS_KEY, isRecord(data.settings) ? data.settings : {});
      write(DICT_KEY, isRecord(data.dict) ? data.dict : {});
      write(CATEGORIES_KEY, Array.isArray(data.categories) ? data.categories : []);
      write(ASSETS_KEY, Array.isArray(data.assets) ? data.assets.map(normAsset).filter(Boolean) : []);
      write(SNAPSHOTS_KEY, Array.isArray(data.snapshots) ? data.snapshots.map((s: unknown) => normSnapshot(s)).filter(Boolean) : []);
      return true;
    } catch { return false; }
  },
};
