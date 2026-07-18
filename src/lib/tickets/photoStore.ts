/**
 * 티켓 사진 저장소 — IndexedDB('ticketbook-photos'). 이미지 바이너리는 localStorage 한도를
 * 넘기므로 여기 Blob 으로 둔다. 티켓의 photoIds 가 여기 키를 가리킨다.
 * 아카이브 방의 하이브리드(메타 localStorage + 파일 IndexedDB) 패턴과 동일한 결.
 */
const DB = 'ticketbook-photos';
const STORE = 'photos';

let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no-idb')); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('idb-open'));
  });
  return dbp;
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('idb-tx'));
  }));
}

let counter = 0;
function newPhotoId(): string {
  counter += 1;
  return `ph_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/** Blob 저장 → 생성된 photoId 반환. 실패하면 throw(호출부가 토스트로 안내). */
export async function putPhoto(blob: Blob): Promise<string> {
  const id = newPhotoId();
  await tx('readwrite', (s) => s.put(blob, id));
  return id;
}

/** 저장된 Blob → object URL. 없으면 null. 호출부가 URL.revokeObjectURL 로 해제할 것. */
export async function getPhotoUrl(id: string): Promise<string | null> {
  try {
    const blob = await tx<Blob | undefined>('readonly', (s) => s.get(id));
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}

export async function deletePhoto(id: string): Promise<void> {
  try { await tx('readwrite', (s) => s.delete(id)); } catch { /* 이미 없으면 무시 */ }
}

/** 티켓 삭제 시 딸린 사진 일괄 정리. */
export async function deletePhotos(ids: string[] | undefined): Promise<void> {
  for (const id of ids ?? []) await deletePhoto(id);
}
