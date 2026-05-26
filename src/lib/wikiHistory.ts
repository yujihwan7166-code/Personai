/**
 * 마이위키 페이지 버전 히스토리.
 *
 * 별도 IDB DB (`expert-chat-forum-wiki-history`) 의 'revisions' store.
 * 페이지 저장 시 직전 스냅샷을 보관 (페이지 별 max 20).
 * Wikipedia 의 'View history' 패턴 — 가벼운 버전.
 */

import type { WikiPage } from '@/types/wiki';

const DB_NAME = 'expert-chat-forum-wiki-history';
const DB_VERSION = 1;
const STORE = 'revisions';
const MAX_PER_PAGE = 20;

export interface Revision {
  id: string;          // rev_<rand>
  pageId: string;
  /** 스냅샷 — 변경 전 페이지 전체. */
  snapshot: WikiPage;
  /** 이 스냅샷이 만들어진 시각 (저장된 직전 페이지의 updatedAt 와 동일). */
  takenAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('pageId', 'pageId', { unique: false });
        store.createIndex('takenAt', 'takenAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('history IDB open failed'));
  });
  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB request failed'));
  });
}

function newRevId(): string {
  return `rev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function recordRevision(snapshot: WikiPage): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const rev: Revision = {
      id: newRevId(),
      pageId: snapshot.id,
      snapshot,
      takenAt: snapshot.updatedAt,
    };
    await putRevision(rev);
  } catch (e) {
    console.warn('[wiki-history] record failed', e);
  }
}

export async function restoreRevisionRecord(revision: Revision): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    await putRevision(revision);
  } catch (e) {
    console.warn('[wiki-history] restore failed', e);
  }
}

async function putRevision(revision: Revision): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  await reqToPromise(store.put(revision));
  // 정원 초과 시 오래된 것부터 정리
  const idx = store.index('pageId');
  const all = (await reqToPromise(idx.getAll(revision.pageId))) as Revision[];
  if (all.length > MAX_PER_PAGE) {
    const sorted = all.sort((a, b) => b.takenAt - a.takenAt);
    const toDelete = sorted.slice(MAX_PER_PAGE);
    for (const r of toDelete) await reqToPromise(store.delete(r.id));
  }
}

export async function listRevisions(pageId: string): Promise<Revision[]> {
  if (typeof indexedDB === 'undefined') return [];
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    const idx = tx.objectStore(STORE).index('pageId');
    const all = (await reqToPromise(idx.getAll(pageId))) as Revision[];
    return all.sort((a, b) => b.takenAt - a.takenAt);
  } catch (e) {
    console.warn('[wiki-history] list failed', e);
    return [];
  }
}

export async function deleteRevisionsForPage(pageId: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    const idx = tx.objectStore(STORE).index('pageId');
    const all = (await reqToPromise(idx.getAll(pageId))) as Revision[];
    for (const r of all) await reqToPromise(tx.objectStore(STORE).delete(r.id));
  } catch (e) {
    console.warn('[wiki-history] delete failed', e);
  }
}

export async function clearAllHistory(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  await reqToPromise(tx.objectStore(STORE).clear());
}
