/**
 * 데이터 백업/복원 — #19
 *
 * 목적: 사용자의 모든 설정/대화/노트 자료를 단일 JSON 파일로 내보내고
 *       다른 브라우저·기기에서 불러올 수 있게 한다.
 *
 * 범위:
 *  - localStorage: 모든 키/값 (JSON-safe)
 *  - IndexedDB `studyBlobs.blobs`: Blob 을 base64 로 직렬화 (대용량 주의)
 *
 * 포맷(JSON):
 *  {
 *    version: 1,
 *    exportedAt: 1711234567,
 *    app: 'personai',
 *    localStorage: { [key]: value(string) },
 *    studyBlobs: [{ id, mimeType, size, createdAt, base64 }]
 *  }
 *
 * 주의: 라이브러리 추가(zip 등) 없이 순수 JSON + base64 사용. 파일이 커질 수
 *      있으므로 UI 에서 크기/시간을 안내한다.
 */

export interface BackupPayload {
  version: 1;
  exportedAt: number;
  app: 'personai';
  localStorage: Record<string, string>;
  studyBlobs: Array<{
    id: string;
    mimeType: string;
    size: number;
    createdAt: number;
    base64: string;
  }>;
}

const DB_NAME = 'studyBlobs';
const STORE = 'blobs';

function openStudyDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const result = String(fr.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

function base64ToBlob(b64: string, mimeType: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

/** 모든 localStorage 키/값을 객체로 수집. */
function dumpLocalStorage(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const v = localStorage.getItem(k);
      if (v != null) out[k] = v;
    }
  } catch { /* noop */ }
  return out;
}

/** Study IndexedDB blobs 를 base64 로 직렬화. */
async function dumpStudyBlobs(): Promise<BackupPayload['studyBlobs']> {
  const db = await openStudyDB();
  if (!db) return [];
  const all: BackupPayload['studyBlobs'] = [];
  try {
    const records = await new Promise<Array<{
      id: string; blob: Blob; mimeType: string; size: number; createdAt: number;
    }>>((resolve, reject) => {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => reject(r.error);
    });
    for (const rec of records) {
      // eslint-disable-next-line no-await-in-loop
      const base64 = await blobToBase64(rec.blob);
      all.push({
        id: rec.id,
        mimeType: rec.mimeType,
        size: rec.size,
        createdAt: rec.createdAt,
        base64,
      });
    }
  } catch { /* noop */ }
  return all;
}

/** 전체 백업 페이로드 생성. */
export async function buildBackup(): Promise<BackupPayload> {
  const [studyBlobs] = await Promise.all([dumpStudyBlobs()]);
  return {
    version: 1,
    exportedAt: Date.now(),
    app: 'personai',
    localStorage: dumpLocalStorage(),
    studyBlobs,
  };
}

/** 백업 JSON 을 파일로 다운로드. */
export async function downloadBackup(filenamePrefix = 'personai-backup'): Promise<{ size: number; blobs: number }> {
  const payload = await buildBackup();
  const json = JSON.stringify(payload);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { size: json.length, blobs: payload.studyBlobs.length };
}

/** 백업 파일을 선택 받아 파싱. 실패 시 throw. */
export function readBackupFile(file: File): Promise<BackupPayload> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const obj = JSON.parse(String(fr.result || '{}'));
        if (obj?.app !== 'personai' || typeof obj.version !== 'number') {
          throw new Error('Personai 백업 파일이 아닙니다.');
        }
        resolve(obj as BackupPayload);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    };
    fr.onerror = () => reject(fr.error);
    fr.readAsText(file);
  });
}

export interface RestoreOptions {
  /** 기존 localStorage 를 전부 비우고 복원 (기본 false — merge). */
  wipeLocalStorage?: boolean;
  /** 기존 studyBlobs 를 전부 삭제 후 복원. */
  wipeStudyBlobs?: boolean;
}

/** 복원 수행. 페이지 새로고침은 호출자가 판단. */
export async function applyBackup(payload: BackupPayload, opts: RestoreOptions = {}): Promise<{ keys: number; blobs: number }> {
  // localStorage
  try {
    if (opts.wipeLocalStorage) localStorage.clear();
    for (const [k, v] of Object.entries(payload.localStorage || {})) {
      localStorage.setItem(k, v);
    }
  } catch { /* 일부 키 실패 시 무시 */ }

  // IndexedDB
  let restored = 0;
  const db = await openStudyDB();
  if (db && payload.studyBlobs?.length) {
    try {
      if (opts.wipeStudyBlobs) {
        await new Promise<void>((resolve, reject) => {
          const r = db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
          r.onsuccess = () => resolve();
          r.onerror = () => reject(r.error);
        });
      }
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const b of payload.studyBlobs) {
        const blob = base64ToBlob(b.base64, b.mimeType);
        store.put({
          id: b.id,
          blob,
          mimeType: b.mimeType,
          size: b.size,
          createdAt: b.createdAt,
        });
        restored += 1;
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch { /* noop */ }
  }

  return {
    keys: Object.keys(payload.localStorage || {}).length,
    blobs: restored,
  };
}
