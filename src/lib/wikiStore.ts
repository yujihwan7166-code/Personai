/**
 * 마이위키 IndexedDB 저장소.
 *
 * 단일 ObjectStore 'pages' (key=id). 인덱스는 title/type/status/updatedAt.
 * localStorage 함정(용량·동기화 0)을 의도적으로 회피.
 */

import type { WikiPage, WikiPageStatus, WikiPageType } from '@/types/wiki';

const DB_NAME = 'expert-chat-forum-wiki';
const DB_VERSION = 1;
const STORE_PAGES = 'pages';
const VALID_TYPES: WikiPageType[] = ['concept', 'moc', 'source', 'project', 'meeting', 'person', 'index'];
const VALID_STATUSES: WikiPageStatus[] = ['draft', 'active', 'stable', 'archived'];

let dbPromise: Promise<IDBDatabase> | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

const normalizeTimestamp = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export function normalizeWikiPage(value: unknown, index = 0): WikiPage | null {
  if (!isRecord(value)) return null;
  const now = Date.now();
  const title = typeof value.title === 'string' && value.title.trim() ? value.title : '제목 없음';
  const type = VALID_TYPES.includes(value.type as WikiPageType) ? value.type as WikiPageType : 'concept';
  const status = VALID_STATUSES.includes(value.status as WikiPageStatus) ? value.status as WikiPageStatus : 'draft';
  const createdAt = normalizeTimestamp(value.createdAt, now);
  const updatedAt = normalizeTimestamp(value.updatedAt, createdAt);

  return {
    id: typeof value.id === 'string' && value.id ? value.id : `w_recovered_${index}`,
    title,
    aliases: normalizeStringArray(value.aliases),
    type,
    category: typeof value.category === 'string' ? value.category : undefined,
    status,
    tags: normalizeStringArray(value.tags),
    body: typeof value.body === 'string' ? value.body : '',
    isMain: typeof value.isMain === 'boolean' ? value.isMain : undefined,
    refersTo: normalizeStringArray(value.refersTo),
    cites: normalizeStringArray(value.cites),
    inherits: normalizeStringArray(value.inherits),
    similarTo: normalizeStringArray(value.similarTo),
    parentMocs: normalizeStringArray(value.parentMocs),
    createdAt,
    updatedAt,
  };
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PAGES)) {
        const store = db.createObjectStore(STORE_PAGES, { keyPath: 'id' });
        store.createIndex('title', 'title', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('wiki IDB open failed'));
  });
  return dbPromise;
}

function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDb().then((db) => db.transaction(STORE_PAGES, mode).objectStore(STORE_PAGES));
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB request failed'));
  });
}

export async function loadAllPages(): Promise<WikiPage[]> {
  if (typeof indexedDB === 'undefined') return [];
  try {
    const store = await tx('readonly');
    const all = await reqToPromise(store.getAll());
    return (all as unknown[])
      .map(normalizeWikiPage)
      .filter((page): page is WikiPage => page !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (e) {
    console.warn('[wiki] loadAll failed', e);
    return [];
  }
}

export async function getPage(id: string): Promise<WikiPage | undefined> {
  if (typeof indexedDB === 'undefined') return undefined;
  try {
    const store = await tx('readonly');
    return normalizeWikiPage(await reqToPromise(store.get(id))) ?? undefined;
  } catch (e) {
    console.warn('[wiki] get failed', e);
    return undefined;
  }
}

export async function upsertPage(page: WikiPage): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const normalized = normalizeWikiPage(page);
  if (!normalized) return;
  const store = await tx('readwrite');
  await reqToPromise(store.put(normalized));
}

export async function deletePage(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const store = await tx('readwrite');
  await reqToPromise(store.delete(id));
}

export async function clearAllPages(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const store = await tx('readwrite');
  await reqToPromise(store.clear());
}
