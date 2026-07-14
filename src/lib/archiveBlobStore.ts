/**
 * 아카이브 첨부 파일(PDF·이미지·엑셀 등)의 Blob 보관소.
 * - IndexedDB 기반. localStorage 는 바이너리/용량에 부적합.
 * - studyBlobStore 패턴을 아카이브 전용 DB 로 복제.
 * - objectURL 은 모듈 캐시(Map)로 재사용해 리렌더마다 재생성/누수 방지.
 */

const DB_NAME = 'archiveBlobs';
const STORE = 'blobs';
const DB_VERSION = 1;

export const ARCHIVE_BLOB_LIMITS = {
  /** 파일당 상한 */
  PER_FILE: 50 * 1024 * 1024, // 50MB
  /** 전체 상한 (소프트 — 초과 시 경고만) */
  TOTAL: 1024 * 1024 * 1024, // 1GB
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
  return `ablob_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** data URL → Blob (이미지 압축 결과 저장용). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** 파일을 저장하고 blobRef(key)를 돌려준다. 상한 초과 시 예외. */
export async function putArchiveBlob(file: File | Blob, mimeType?: string): Promise<string> {
  const size = file.size;
  if (size > ARCHIVE_BLOB_LIMITS.PER_FILE) {
    throw new Error(
      `파일이 너무 커요 (${Math.round(size / 1024 / 1024)}MB > ${ARCHIVE_BLOB_LIMITS.PER_FILE / 1024 / 1024}MB).`,
    );
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
    r.onerror = () => reject(r.error ?? new Error('putArchiveBlob failed'));
  });
}

export async function getArchiveBlob(id: string): Promise<Blob | null> {
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

/* ── objectURL 캐시 — 같은 blobRef 는 URL 한 번만 만든다. ── */
const urlCache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

/** blobRef → objectURL (캐시). 없으면 null. */
export async function getArchiveUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const inflight = pending.get(id);
  if (inflight) return inflight;
  const p = (async () => {
    const blob = await getArchiveBlob(id);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  })().finally(() => pending.delete(id));
  pending.set(id, p);
  return p;
}

/** 캐시에서 objectURL 제거 + revoke (항목 삭제 시). */
export function revokeArchiveUrl(id: string): void {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
}

export async function deleteArchiveBlob(id: string): Promise<void> {
  revokeArchiveUrl(id);
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

async function listAllIds(): Promise<string[]> {
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

/** 항목이 참조하지 않는 고아 blob 제거. activeIds = 살려둘 blobRef 목록. */
export async function pruneArchiveOrphans(activeIds: Iterable<string>): Promise<number> {
  const keep = new Set(activeIds);
  const all = await listAllIds();
  let removed = 0;
  for (const id of all) {
    if (!keep.has(id)) {
      await deleteArchiveBlob(id);
      removed += 1;
    }
  }
  return removed;
}
