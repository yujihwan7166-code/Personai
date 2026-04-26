/**
 * 마이위키 유지보수 — 고아 이미지 청소, 사용량 집계.
 */

import { loadAllPages } from '@/lib/wikiStore';
import { listAllImageMetas, deleteImage, type ImageMeta } from '@/lib/wikiImageStore';
import { listRevisions } from '@/lib/wikiHistory';

const IMAGE_REF_RE = /\(wiki-image:([a-zA-Z0-9_]+)\)/g;

/** 본문(현재 페이지 + 모든 revision) 에서 참조되는 이미지 id 모음. */
async function collectReferencedImageIds(): Promise<Set<string>> {
  const out = new Set<string>();
  const pages = await loadAllPages();
  for (const p of pages) {
    let m: RegExpExecArray | null;
    IMAGE_REF_RE.lastIndex = 0;
    while ((m = IMAGE_REF_RE.exec(p.body)) !== null) out.add(m[1]);
    // revision 본문도 살아있으면 GC 대상에서 제외
    const revs = await listRevisions(p.id);
    for (const r of revs) {
      IMAGE_REF_RE.lastIndex = 0;
      while ((m = IMAGE_REF_RE.exec(r.snapshot.body)) !== null) out.add(m[1]);
    }
  }
  return out;
}

export interface GcReport {
  scanned: number;
  removed: number;
  removedBytes: number;
}

/** 본문에서 참조 안 된 이미지 일괄 삭제. */
export async function garbageCollectImages(): Promise<GcReport> {
  const referenced = await collectReferencedImageIds();
  const all = await listAllImageMetas();
  let removed = 0;
  let removedBytes = 0;
  for (const img of all) {
    if (referenced.has(img.id)) continue;
    await deleteImage(img.id);
    removed++;
    removedBytes += img.size;
  }
  return { scanned: all.length, removed, removedBytes };
}

/* ── 사용량 ── */

export interface StorageStats {
  pageCount: number;
  imageCount: number;
  imageBytes: number;
  revisionCount: number;
  /** 가장 큰 이미지 5개 (sorted desc) */
  topImages: ImageMeta[];
  orphanImageCount: number;
}

export async function computeStorageStats(): Promise<StorageStats> {
  const pages = await loadAllPages();
  const images = await listAllImageMetas();
  const referenced = await collectReferencedImageIds();
  let revisionCount = 0;
  for (const p of pages) revisionCount += (await listRevisions(p.id)).length;
  const orphan = images.filter((img) => !referenced.has(img.id)).length;
  const top = images.slice().sort((a, b) => b.size - a.size).slice(0, 5);
  return {
    pageCount: pages.length,
    imageCount: images.length,
    imageBytes: images.reduce((s, i) => s + i.size, 0),
    revisionCount,
    topImages: top,
    orphanImageCount: orphan,
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
