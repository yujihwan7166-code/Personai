/**
 * 메모 첨부 이미지 IndexedDB 저장.
 *
 * 이전: base64 dataUrl 을 memo.body 와 같이 localStorage 에 통째로 저장 → 5MB 한도 쉽게 초과 + quota silent fail.
 * 이제: 이미지 blob 은 IDB 에 별도 저장. memo.images 는 idbId 만 보관 → localStorage 가벼움.
 *
 * 호환성:
 * - 옛 데이터 (dataUrl 있는 MemoImage) 도 그대로 동작 — 마이그레이션은 lazy.
 * - 새 추가는 IDB 우선. IDB 실패 시 dataUrl 로 폴백.
 */

const DB_NAME = 'memoImages';
const STORE = 'images';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'));
  });
  return dbPromise;
}

interface StoredImage {
  id: string;
  blob: Blob;
  mimeType: string;
  size: number;
  createdAt: number;
}

const newId = () => `mi_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

/** dataURL 또는 Blob 을 IDB 에 저장. 반환: idbId. 실패 시 throw. */
export async function putMemoImage(input: Blob | string, mimeHint?: string): Promise<{ id: string; size: number; mimeType: string }> {
  let blob: Blob;
  let mimeType: string;
  if (typeof input === 'string') {
    // dataURL → Blob
    const m = input.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error('Invalid dataURL');
    mimeType = m[1];
    const bin = atob(m[2]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    blob = new Blob([arr], { type: mimeType });
  } else {
    blob = input;
    mimeType = mimeHint ?? input.type ?? 'image/png';
  }
  const id = newId();
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).put({ id, blob, mimeType, size: blob.size, createdAt: Date.now() } satisfies StoredImage);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  return { id, size: blob.size, mimeType };
}

/** Blob 을 가져와 object URL 로 반환. 호출자가 URL.revokeObjectURL 책임. */
export async function getMemoImageURL(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    return await new Promise<string | null>((resolve, reject) => {
      const t = db.transaction(STORE, 'readonly');
      const req = t.objectStore(STORE).get(id);
      req.onsuccess = () => {
        const r = req.result as StoredImage | undefined;
        resolve(r ? URL.createObjectURL(r.blob) : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** 삭제. 없는 id 도 silent OK. */
export async function deleteMemoImage(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).delete(id);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } catch { /* silent */ }
}

/** 모든 이미지 id 나열 — 미아(orphan) 청소용. */
export async function listMemoImageIds(): Promise<string[]> {
  try {
    const db = await openDB();
    return await new Promise<string[]>((resolve, reject) => {
      const t = db.transaction(STORE, 'readonly');
      const req = t.objectStore(STORE).getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}
