/**
 * 마이위키 이미지 블롭 저장소.
 *
 * 본문 안에서 `![alt](wiki-image:<id>)` 형태로 참조.
 * 이미지 데이터는 별도 IDB DB(`expert-chat-forum-wiki-images`) 의 'blobs' store 에 보관.
 * 책임 분리: 페이지 텍스트(작은 데이터) ↔ 이미지 블롭(큰 데이터) 별도 트랜잭션.
 *
 * 이미지 데이터는 export/import 백업에 자동 포함되지 않는다 (v1) — 본문이 깨지지 않도록 fallback alt 표시.
 */

const DB_NAME = 'expert-chat-forum-wiki-images';
const DB_VERSION = 1;
const STORE = 'blobs';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('wiki image IDB open failed'));
  });
  return dbPromise;
}

interface BlobRecord {
  id: string;
  blob: Blob;
  type: string;
  size: number;
  addedAt: number;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB request failed'));
  });
}

/** 이미지 저장 — blob id 반환. */
export async function saveImage(blob: Blob): Promise<string> {
  const db = await openDb();
  const id = `img_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const rec: BlobRecord = {
    id,
    blob,
    type: blob.type,
    size: blob.size,
    addedAt: Date.now(),
  };
  const tx = db.transaction(STORE, 'readwrite');
  await reqToPromise(tx.objectStore(STORE).put(rec));
  return id;
}

/** id 로 blob 가져오기 — 없으면 undefined. */
export async function getImage(id: string): Promise<Blob | undefined> {
  if (typeof indexedDB === 'undefined') return undefined;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    const rec = (await reqToPromise(tx.objectStore(STORE).get(id))) as BlobRecord | undefined;
    return rec?.blob;
  } catch {
    return undefined;
  }
}

/** Object URL 캐시 — 같은 id 재요청 시 같은 url 재사용. */
const objectUrlCache = new Map<string, string>();

export async function getImageUrl(id: string): Promise<string | undefined> {
  if (objectUrlCache.has(id)) return objectUrlCache.get(id);
  const blob = await getImage(id);
  if (!blob) return undefined;
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(id, url);
  return url;
}

export function revokeImageUrl(id: string): void {
  const url = objectUrlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(id);
  }
}

/** 모든 이미지 메타 (blob 제외) — GC·사용량 계산용. */
export interface ImageMeta { id: string; type: string; size: number; addedAt: number }

export async function listAllImageMetas(): Promise<ImageMeta[]> {
  if (typeof indexedDB === 'undefined') return [];
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    const all = (await reqToPromise(tx.objectStore(STORE).getAll())) as BlobRecord[];
    return all.map(({ id, type, size, addedAt }) => ({ id, type, size, addedAt }));
  } catch {
    return [];
  }
}

export async function deleteImage(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    await reqToPromise(tx.objectStore(STORE).delete(id));
    revokeImageUrl(id);
  } catch (e) {
    console.warn('[wiki-image] delete failed', id, e);
  }
}
