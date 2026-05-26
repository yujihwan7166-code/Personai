import type { StudySource } from '@/types/study';
import { parsePageMarkers } from './studyContentMerge';
import { getTextSignal, isNativeTextUseful } from './studyOcrQuality';

export function shouldOcrNativePageText(text: string | undefined): boolean {
  return !isNativeTextUseful(text);
}

export function shouldOcrExtractedPdfPageText(
  text: string | undefined,
  meta: { nativeItemCount?: number; hasPaintedImage?: boolean; paintedImageCount?: number } = {},
): boolean {
  const signal = getTextSignal(text);
  const nativeItemCount = meta.nativeItemCount ?? 0;
  const hasPaintedImage = meta.hasPaintedImage ?? false;
  const paintedImageCount = meta.paintedImageCount ?? (hasPaintedImage ? 1 : 0);

  if (!shouldOcrNativePageText(text)) {
    // Worksheets often have selectable body text but image-only diagrams, labels,
    // or answer boxes. OCR/Vision should still inspect those mixed pages.
    if (
      hasPaintedImage
      && signal.suspiciousCharRatio < 0.04
      && signal.compactLength < 1500
      && (paintedImageCount >= 2 || signal.compactLength < 700)
    ) {
      return true;
    }
    return false;
  }

  if (!hasPaintedImage && signal.compactLength === 0) {
    return false;
  }

  // A short native-only page, such as a cover or divider, is already selectable.
  // Running OCR on it adds latency without improving the study text.
  if (!hasPaintedImage && nativeItemCount >= 3 && signal.compactLength >= 24 && signal.suspiciousCharRatio < 0.04) {
    return false;
  }

  // Decorative images plus enough native text should stay on the fast native path,
  // unless there are multiple image objects likely to contain diagrams/labels.
  if (
    nativeItemCount >= 8
    && signal.compactLength >= 60
    && signal.suspiciousCharRatio < 0.04
    && (!hasPaintedImage || paintedImageCount < 2 || signal.compactLength >= 1500)
  ) {
    return false;
  }

  return true;
}

export function shouldInspectPdfPageImagesForOcr(
  text: string | undefined,
  nativeItemCount = 0,
): boolean {
  const signal = getTextSignal(text);
  if (signal.suspiciousCharRatio >= 0.08) return false;
  if (!shouldOcrNativePageText(text)) {
    return signal.compactLength < 1500 && nativeItemCount < 260;
  }
  if (signal.compactLength === 0) return true;
  if (nativeItemCount >= 8 && signal.compactLength >= 60) return false;
  return true;
}

export function getEffectiveOcrPages(source: StudySource): number[] {
  const nativePages = parsePageMarkers(source.nativeText);
  const forcedPages = (source.forcedOcrPages ?? []).filter((page) => Number.isFinite(page) && page > 0);

  if (Array.isArray(source.scanPages)) {
    // scanPages is the converter's explicit OCR decision. It may include mixed
    // pages with useful native text plus image-only diagrams/labels, so do not
    // filter it again by native text usefulness here.
    return Array.from(new Set([...source.scanPages, ...forcedPages])).sort((a, b) => a - b);
  }

  const candidates = new Set<number>(forcedPages);
  for (const [page, text] of nativePages) {
    if (shouldOcrNativePageText(text)) candidates.add(page);
  }

  return Array.from(candidates).sort((a, b) => a - b);
}

export function getVisionForcedOcrPages(source: StudySource): number[] {
  const nativePages = parsePageMarkers(source.nativeText);
  const candidates = new Set<number>(
    (source.forcedOcrPages ?? []).filter((page) => Number.isFinite(page) && page > 0),
  );

  if (Array.isArray(source.scanPages)) {
    for (const page of source.scanPages) {
      if (!Number.isFinite(page) || page <= 0) continue;
      const nativeText = nativePages.get(page);
      if (nativeText && isNativeTextUseful(nativeText)) candidates.add(page);
    }
  }

  return Array.from(candidates).sort((a, b) => a - b);
}

export function getVisionBackedFastOcrPages(source: StudySource): number[] {
  if (!Array.isArray(source.scanPages)) return [];

  const nativePages = parsePageMarkers(source.nativeText);
  const forcedPages = new Set(
    (source.forcedOcrPages ?? []).filter((page) => Number.isFinite(page) && page > 0),
  );
  const candidates = new Set<number>();

  for (const page of source.scanPages) {
    if (!Number.isFinite(page) || page <= 0 || forcedPages.has(page)) continue;
    const nativeText = nativePages.get(page);
    if (nativeText && isNativeTextUseful(nativeText)) candidates.add(page);
  }

  return Array.from(candidates).sort((a, b) => a - b);
}

export function getEffectiveOcrPageCount(source: StudySource): number {
  return getEffectiveOcrPages(source).length;
}
