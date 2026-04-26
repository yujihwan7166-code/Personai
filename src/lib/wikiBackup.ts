/**
 * 마이위키 전체 백업 / 복원 — JSON 단일 파일.
 *
 * 출력 형식:
 * { schema: 'wiki-v1', exportedAt: number, pages: WikiPage[] }
 */

import type { WikiPage } from '@/types/wiki';
import { loadAllPages, upsertPage, clearAllPages } from '@/lib/wikiStore';

const SCHEMA = 'wiki-v1';

interface BackupFile {
  schema: typeof SCHEMA;
  exportedAt: number;
  pages: WikiPage[];
}

export async function exportAllAsJson(): Promise<void> {
  const pages = await loadAllPages();
  const payload: BackupFile = {
    schema: SCHEMA,
    exportedAt: Date.now(),
    pages,
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ts = new Date().toISOString().slice(0, 10);
  a.download = `wiki-backup-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
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
  }
  const existing = mode === 'merge' ? new Set((await loadAllPages()).map((p) => p.id)) : new Set<string>();
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
  return { imported, skipped, total: parsed.pages.length };
}

function isBackupFile(x: unknown): x is BackupFile {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.schema !== SCHEMA) return false;
  if (!Array.isArray(o.pages)) return false;
  return true;
}
