/**
 * Vision LLM 결과 IndexedDB 보관소.
 * - DB: studyVision, store: vision, key = `${blobRef}:${pageNum}`
 * - value: { blobRef, page, text, doneAt }
 * - Tesseract OCR 만으로 부족한 그림·다이어그램·라벨이 많은 페이지를 vision LLM 으로 보강.
 * - 완료 페이지 색인: getCompletedVisionPages(blobRef)
 *
 * studyOcrStore 와 별도 DB 로 분리한 이유: OCR 과 Vision 의 의미·갱신 주기가 다르고,
 * 데이터 마이그레이션·삭제도 독립적이어야 한다.
 */

const DB_NAME = 'studyVision';
const STORE = 'vision';
const DB_VERSION = 1;

export interface VisionRecord {
  key: string; // `${blobRef}:${pageNum}`
  blobRef: string;
  page: number;
  text: string;
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

export async function putVision(rec: Omit<VisionRecord, 'key'>): Promise<void> {
  const store = await tx('readwrite');
  const full: VisionRecord = { ...rec, key: makeKey(rec.blobRef, rec.page) };
  await new Promise<void>((resolve, reject) => {
    const r = store.put(full);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

export async function getVision(blobRef: string, page: number): Promise<VisionRecord | null> {
  try {
    const store = await tx('readonly');
    return await new Promise<VisionRecord | null>((resolve, reject) => {
      const r = store.get(makeKey(blobRef, page));
      r.onsuccess = () => resolve((r.result as VisionRecord | undefined) ?? null);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return null;
  }
}

export async function getCompletedVisionPages(blobRef: string): Promise<Set<number>> {
  try {
    const store = await tx('readonly');
    const idx = store.index('byBlob');
    return await new Promise<Set<number>>((resolve, reject) => {
      const r = idx.getAll(blobRef);
      r.onsuccess = () => {
        const set = new Set<number>();
        for (const rec of (r.result as VisionRecord[] | undefined) ?? []) set.add(rec.page);
        resolve(set);
      };
      r.onerror = () => reject(r.error);
    });
  } catch {
    return new Set();
  }
}

export async function getAllVisionForBlob(blobRef: string): Promise<VisionRecord[]> {
  try {
    const store = await tx('readonly');
    const idx = store.index('byBlob');
    return await new Promise<VisionRecord[]>((resolve, reject) => {
      const r = idx.getAll(blobRef);
      r.onsuccess = () => resolve(((r.result as VisionRecord[] | undefined) ?? []).sort((a, b) => a.page - b.page));
      r.onerror = () => reject(r.error);
    });
  } catch {
    return [];
  }
}

export async function deleteVisionForBlob(blobRef: string): Promise<void> {
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
