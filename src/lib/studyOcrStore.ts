/**
 * OCR 결과 IndexedDB 보관소.
 * - DB: studyOcr, store: ocr, key = `${blobRef}:${pageNum}`
 * - value: { blobRef, page, text, words?, doneAt }
 * - 완료 페이지 색인: getCompletedPages(blobRef)
 */

const DB_NAME = 'studyOcr';
const STORE = 'ocr';
const DB_VERSION = 1;

export interface OcrWord {
  text: string;
  /** 해당 페이지 viewport 대비 정규화 bbox (0~1). textLayer 주입용. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrRecord {
  key: string; // `${blobRef}:${pageNum}`
  blobRef: string;
  page: number;
  text: string;
  words?: OcrWord[];
  doneAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB 없음'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'key' });
        s.createIndex('byBlob', 'blobRef', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDB().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

function makeKey(blobRef: string, page: number) {
  return `${blobRef}:${page}`;
}

export async function putOcr(rec: Omit<OcrRecord, 'key'>): Promise<void> {
  const store = await tx('readwrite');
  const full: OcrRecord = { ...rec, key: makeKey(rec.blobRef, rec.page) };
  await new Promise<void>((resolve, reject) => {
    const r = store.put(full);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

export async function getOcr(blobRef: string, page: number): Promise<OcrRecord | null> {
  try {
    const store = await tx('readonly');
    return await new Promise<OcrRecord | null>((resolve, reject) => {
      const r = store.get(makeKey(blobRef, page));
      r.onsuccess = () => resolve((r.result as OcrRecord | undefined) ?? null);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return null;
  }
}

export async function hasOcr(blobRef: string, page: number): Promise<boolean> {
  return !!(await getOcr(blobRef, page));
}

export async function getCompletedPages(blobRef: string): Promise<Set<number>> {
  try {
    const store = await tx('readonly');
    const idx = store.index('byBlob');
    return await new Promise<Set<number>>((resolve, reject) => {
      const r = idx.getAll(blobRef);
      r.onsuccess = () => {
        const set = new Set<number>();
        for (const rec of (r.result as OcrRecord[] | undefined) ?? []) set.add(rec.page);
        resolve(set);
      };
      r.onerror = () => reject(r.error);
    });
  } catch {
    return new Set();
  }
}

export async function getAllForBlob(blobRef: string): Promise<OcrRecord[]> {
  try {
    const store = await tx('readonly');
    const idx = store.index('byBlob');
    return await new Promise<OcrRecord[]>((resolve, reject) => {
      const r = idx.getAll(blobRef);
      r.onsuccess = () => resolve(((r.result as OcrRecord[] | undefined) ?? []).sort((a, b) => a.page - b.page));
      r.onerror = () => reject(r.error);
    });
  } catch {
    return [];
  }
}

export async function deleteOcrForBlob(blobRef: string): Promise<void> {
  try {
    const store = await tx('readwrite');
    const idx = store.index('byBlob');
    await new Promise<void>((resolve, reject) => {
      const r = idx.openCursor(IDBKeyRange.only(blobRef));
      r.onsuccess = () => {
        const cursor = r.result;
        if (!cursor) { resolve(); return; }
        cursor.delete();
        cursor.continue();
      };
      r.onerror = () => reject(r.error);
    });
  } catch { /* noop */ }
}
