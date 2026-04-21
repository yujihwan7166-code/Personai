/**
 * Study 원본 파일(PDF/PPTX/DOCX)의 Blob 보관소.
 * - IndexedDB 기반. localStorage는 바이너리/용량에 부적합.
 * - 단일 DB 'studyBlobs', store 'blobs'. key = uuid.
 * - 공용 유틸: putBlob / getBlob / getObjectURL / deleteBlob / pruneOrphans / estimateUsage
 */

const DB_NAME = 'studyBlobs';
const STORE = 'blobs';
const DB_VERSION = 1;

export const STUDY_BLOB_LIMITS = {
  /** 파일당 상한 */
  PER_FILE: 50 * 1024 * 1024, // 50MB
  /** 전체 상한 (소프트 — 초과 시 경고만) */
  TOTAL: 500 * 1024 * 1024, // 500MB
} as const;

interface StoredBlob {
  id: string;
  blob: Blob;
  mimeType: string;
  size: number;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB 를 사용할 수 없는 환경입니다.'));
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
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
  return dbPromise;
}

function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDB().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

function randId(): string {
  return `blob_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 파일을 저장하고 blobRef(key)를 돌려준다.
 * 파일 상한 초과 시 예외.
 */
export async function putBlob(file: File | Blob, mimeType?: string): Promise<string> {
  const size = file.size;
  if (size > STUDY_BLOB_LIMITS.PER_FILE) {
    throw new Error(`파일이 너무 큽니다 (${Math.round(size / 1024 / 1024)}MB > ${STUDY_BLOB_LIMITS.PER_FILE / 1024 / 1024}MB).`);
  }
  const id = randId();
  const store = await tx('readwrite');
  const record: StoredBlob = {
    id,
    blob: file,
    mimeType: mimeType ?? (file as File).type ?? 'application/octet-stream',
    size,
    createdAt: Date.now(),
  };
  return new Promise<string>((resolve, reject) => {
    const r = store.put(record);
    r.onsuccess = () => resolve(id);
    r.onerror = () => reject(r.error ?? new Error('putBlob failed'));
  });
}

export async function getBlob(id: string): Promise<Blob | null> {
  try {
    const store = await tx('readonly');
    return await new Promise<Blob | null>((resolve, reject) => {
      const r = store.get(id);
      r.onsuccess = () => {
        const rec = r.result as StoredBlob | undefined;
        resolve(rec ? rec.blob : null);
      };
      r.onerror = () => reject(r.error);
    });
  } catch {
    return null;
  }
}

export async function getObjectURL(id: string): Promise<string | null> {
  const blob = await getBlob(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function deleteBlob(id: string): Promise<void> {
  try {
    const store = await tx('readwrite');
    await new Promise<void>((resolve, reject) => {
      const r = store.delete(id);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  } catch {
    /* noop */
  }
}

export async function listAllIds(): Promise<string[]> {
  try {
    const store = await tx('readonly');
    return await new Promise<string[]>((resolve, reject) => {
      const r = store.getAllKeys();
      r.onsuccess = () => resolve((r.result as IDBValidKey[]).map(String));
      r.onerror = () => reject(r.error);
    });
  } catch {
    return [];
  }
}

/**
 * 현재 노트북들이 참조하지 않는 blob 을 제거한다.
 * @param activeIds 살려둘 blob id 목록
 */
export async function pruneOrphans(activeIds: Iterable<string>): Promise<number> {
  const keep = new Set(activeIds);
  const all = await listAllIds();
  let removed = 0;
  for (const id of all) {
    if (!keep.has(id)) {
      await deleteBlob(id);
      removed += 1;
    }
  }
  return removed;
}

/** 브라우저 전체 스토리지 사용량 추정 (옵셔널, 정책 안내용). */
export async function estimateUsage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}
