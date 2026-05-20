/**
 * 마이위키 전체 백업 / 복원 — JSON 단일 파일.
 *
 * v2 형식: pages + 이미지(base64) + 히스토리.
 * 이전 v1 형식(pages 만)도 import 호환.
 */

import type { WikiPage } from '@/types/wiki';
import { loadAllPages, upsertPage, clearAllPages } from '@/lib/wikiStore';
import { saveImage, getImage } from '@/lib/wikiImageStore';
import { listRevisions, recordRevision, type Revision } from '@/lib/wikiHistory';
import { setLastBackupAt } from '@/lib/wikiBackupMeta';
import { downloadJson } from '@/lib/blob';

const SCHEMA_V2 = 'wiki-v2';
const SCHEMA_V1 = 'wiki-v1';

interface BackupImage {
  id: string;
  /** data URL — base64 encoded blob. */
  dataUrl: string;
  type: string;
}

interface BackupFileV2 {
  schema: typeof SCHEMA_V2;
  exportedAt: number;
  pages: WikiPage[];
  images: BackupImage[];
  revisions: Revision[];
}

interface BackupFileV1 {
  schema: typeof SCHEMA_V1;
  exportedAt: number;
  pages: WikiPage[];
}

type BackupFile = BackupFileV1 | BackupFileV2;

/* ── 본문에서 사용 중인 이미지 id 추출 ── */
function collectImageIds(pages: WikiPage[]): Set<string> {
  const ids = new Set<string>();
  const re = /\(wiki-image:([a-zA-Z0-9_]+)\)/g;
  for (const p of pages) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(p.body)) !== null) ids.add(m[1]);
  }
  return ids;
}

/* ── Blob ↔ data URL ── */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('read fail'));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error('잘못된 data URL');
  const type = m[1];
  const bin = atob(m[2]);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

/* ── Export ── */
export async function exportAllAsJson(): Promise<void> {
  const pages = await loadAllPages();

  // 이미지 — 본문에서 참조된 것만 모음
  const referencedIds = collectImageIds(pages);
  const images: BackupImage[] = [];
  for (const id of referencedIds) {
    const blob = await getImage(id);
    if (!blob) continue;
    const dataUrl = await blobToDataUrl(blob);
    images.push({ id, dataUrl, type: blob.type });
  }

  // 히스토리 — 모든 페이지의 revision
  const revisions: Revision[] = [];
  for (const p of pages) {
    const revs = await listRevisions(p.id);
    revisions.push(...revs);
  }

  const payload: BackupFileV2 = {
    schema: SCHEMA_V2,
    exportedAt: Date.now(),
    pages,
    images,
    revisions,
  };
  const ts = new Date().toISOString().slice(0, 10);
  downloadJson(payload, `wiki-backup-${ts}`);
  setLastBackupAt();
}

/* ── Import ── */
export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
  images: number;
  revisions: number;
}

export async function importFromJson(file: File, mode: ImportMode): Promise<ImportResult> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSON 파싱 실패. 백업 파일이 손상됐거나 형식이 다릅니다.');
  }
  if (!isBackupFile(parsed)) {
    throw new Error('백업 파일 형식이 올바르지 않습니다 (schema, pages 필드 확인).');
  }

  if (mode === 'replace') {
    await clearAllPages();
    // 이미지·히스토리는 어차피 page 참조 기반이므로 page clear 후 새로 들어감.
  }

  const existing = mode === 'merge' ? new Set((await loadAllPages()).map((p) => p.id)) : new Set<string>();

  // 페이지
  let imported = 0;
  let skipped = 0;
  for (const p of parsed.pages) {
    if (mode === 'merge' && existing.has(p.id)) {
      skipped++;
      continue;
    }
    await upsertPage(p);
    imported++;
  }

  // 이미지·히스토리는 v2 만 포함
  let imageCount = 0;
  let revCount = 0;
  if (parsed.schema === SCHEMA_V2) {
    for (const img of parsed.images) {
      try {
        const blob = dataUrlToBlob(img.dataUrl);
        await saveImageWithId(img.id, blob);
        imageCount++;
      } catch (e) {
        console.warn('[wiki-backup] image restore failed', img.id, e);
      }
    }
    for (const rev of parsed.revisions) {
      // 페이지가 import 됐으면 함께 복원
      if (mode === 'replace' || !existing.has(rev.pageId)) {
        await recordRevision(rev.snapshot);
        revCount++;
      }
    }
  }

  return {
    imported,
    skipped,
    total: parsed.pages.length,
    images: imageCount,
    revisions: revCount,
  };
}

/* 이미지 store 는 saveImage(blob) → 새 id 반환만 지원하므로, 백업의 원래 id 보존을 위해 직접 IDB 접근. */
async function saveImageWithId(id: string, blob: Blob): Promise<void> {
  // wikiImageStore 의 내부 구조를 알기 때문에 직접 IDB open. 노출 함수 추가 대신 여기서만 사용.
  const DB = 'expert-chat-forum-wiki-images';
  const STORE = 'blobs';
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put({
      id, blob, type: blob.type, size: blob.size, addedAt: Date.now(),
    });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  // saveImage 도 export 사용처에서 살아있도록 import 만 (no-op call로 초기화 안전).
  void saveImage;
}

function isBackupFile(x: unknown): x is BackupFile {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.schema !== SCHEMA_V1 && o.schema !== SCHEMA_V2) return false;
  if (!Array.isArray(o.pages)) return false;
  if (o.schema === SCHEMA_V2) {
    if (!Array.isArray(o.images) || !Array.isArray(o.revisions)) return false;
  }
  return true;
}
