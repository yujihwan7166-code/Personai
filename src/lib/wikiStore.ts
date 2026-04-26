/**
 * 마이위키 IndexedDB 저장소.
 *
 * 단일 ObjectStore 'pages' (key=id). 인덱스는 title/type/status/updatedAt.
 * localStorage 함정(용량·동기화 0)을 의도적으로 회피.
 */

import type { WikiPage } from '@/types/wiki';

const DB_NAME = 'expert-chat-forum-wiki';
const DB_VERSION = 1;
const STORE_PAGES = 'pages';

let dbPromise: Promise<IDBDatabase> | null = null;

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
    return (all as WikiPage[]).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (e) {
    console.warn('[wiki] loadAll failed', e);
    return [];
  }
}

export async function getPage(id: string): Promise<WikiPage | undefined> {
  if (typeof indexedDB === 'undefined') return undefined;
  try {
    const store = await tx('readonly');
    return (await reqToPromise(store.get(id))) as WikiPage | undefined;
  } catch (e) {
    console.warn('[wiki] get failed', e);
    return undefined;
  }
}

export async function upsertPage(page: WikiPage): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const store = await tx('readwrite');
  await reqToPromise(store.put(page));
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
