/**
 * 화이트보드 이미지 — IndexedDB 저장.
 *
 * 메모 이미지 패턴 차용 — blob 으로 보관, object URL 캐싱.
 * Phase 1·2 동작 영역. localStorage 사용 X (사이즈 한계).
 */
const DB_NAME = 'wb';
const STORE = 'images';
const DB_VERSION = 1;

export interface WBImageRecord {
  id: string;
  blob: Blob;
  name: string;
  mimeType: string;
  w: number;          // natural width
  h: number;          // natural height
  size: number;       // byte
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB 미지원'));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
  });
  return dbPromise;
}

function newImageId(): string {
  return `img_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** File → 이미지 자연 사이즈 측정 */
function measureImage(file: Blob): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

export async function addWBImage(file: File): Promise<WBImageRecord> {
  const { w, h } = await measureImage(file);
  const rec: WBImageRecord = {
    id: newImageId(),
    blob: file,
    name: file.name,
    mimeType: file.type,
    w, h,
    size: file.size,
    createdAt: Date.now(),
  };
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(rec);
  });
  return rec;
}

export async function getWBImage(id: string): Promise<WBImageRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as WBImageRecord) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function removeWBImage(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(id);
  });
}

// ──────────────────────────────────────────
// object URL 캐시 (요소 렌더용)
const urlCache = new Map<string, string>();

export async function getImageObjectURL(id: string): Promise<string | null> {
  if (urlCache.has(id)) return urlCache.get(id)!;
  const rec = await getWBImage(id);
  if (!rec) return null;
  const url = URL.createObjectURL(rec.blob);
  urlCache.set(id, url);
  return url;
}

export function revokeImageObjectURL(id: string): void {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
}
