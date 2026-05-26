// PDF 관련 변환: 병합·분할·이미지·텍스트 추출·이미지→PDF
// 라이브러리: pdf-lib (병합/분할/생성), pdfjs-dist (읽기/렌더링), jspdf (이미지→PDF)

import { shouldInspectPdfPageImagesForOcr, shouldOcrExtractedPdfPageText } from '../../studyOcrPages';

let pdfLibPromise: Promise<typeof import('pdf-lib')> | null = null;
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;
let jspdfPromise: Promise<typeof import('jspdf')> | null = null;

function loadPdfLib() {
  if (!pdfLibPromise) pdfLibPromise = import('pdf-lib');
  return pdfLibPromise;
}

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const mod = await import('pdfjs-dist');
      // Vite 워커 경로 (ESM)
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      mod.GlobalWorkerOptions.workerSrc = workerUrl;
      return mod;
    })();
  }
  return pdfjsPromise;
}

function loadJsPdf() {
  if (!jspdfPromise) jspdfPromise = import('jspdf');
  return jspdfPromise;
}

// 메인 스레드에 한 틱 양보 — 긴 루프 중 UI 스크롤·버튼 클릭 응답성 확보
// (pdfjs 자체는 이미 워커에서 동작하지만, canvas 렌더/zip 압축은 메인 스레드)
function yieldToMain(): Promise<void> {
  type SchedulerLike = { yield?: () => Promise<void> };
  const sch = (globalThis as unknown as { scheduler?: SchedulerLike }).scheduler;
  if (sch?.yield) return sch.yield();
  return new Promise((r) => setTimeout(r, 0));
}

type PdfTextItemLike = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
};

type PdfTextContentLike = {
  items?: unknown[];
};

type PlacedPdfTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
};

type PdfTextLine = {
  text: string;
  y: number;
  minX: number;
  maxX: number;
};

export function extractPdfTextContentForStudy(content: PdfTextContentLike): string {
  const rawItems = Array.isArray(content.items) ? content.items : [];
  const items = rawItems
    .map((item): PdfTextItemLike | null => {
      if (!item || typeof item !== 'object') return null;
      const value = item as PdfTextItemLike;
      if (typeof value.str !== 'string' || !value.str.trim()) return null;
      const transform = Array.isArray(value.transform) ? value.transform : [];
      return {
        str: value.str,
        transform,
        width: typeof value.width === 'number' ? value.width : undefined,
        height: typeof value.height === 'number' ? value.height : undefined,
      };
    })
    .filter((item): item is PdfTextItemLike => item !== null);

  if (items.length === 0) return '';

  const heights = items
    .map((item) => Math.abs(item.height ?? item.transform?.[3] ?? item.transform?.[0] ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  const medianHeight = heights.length > 0 ? heights[Math.floor(heights.length / 2)] : 10;
  const lineTolerance = Math.max(2, medianHeight * 0.58);
  const gapTolerance = Math.max(1.5, medianHeight * 0.22);

  const placed: PlacedPdfTextItem[] = items
    .map((item) => ({
      text: item.str ?? '',
      x: Number(item.transform?.[4] ?? 0),
      y: Number(item.transform?.[5] ?? 0),
      width: Number(item.width ?? 0),
    }))
    .filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y))
    .sort((a, b) => (Math.abs(b.y - a.y) > lineTolerance ? b.y - a.y : a.x - b.x));

  const lines: Array<{ y: number; items: PlacedPdfTextItem[] }> = [];
  for (const item of placed) {
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= lineTolerance);
    if (line) {
      line.items.push(item);
      line.y = (line.y * (line.items.length - 1) + item.y) / line.items.length;
    } else {
      lines.push({ y: item.y, items: [item] });
    }
  }

  const textLines = lines
    .flatMap((line) => buildPdfTextLinesFromRow(line.items, gapTolerance, medianHeight));

  return orderPdfTextLinesForReading(textLines, medianHeight)
    .map((line) => line.text)
    .filter(Boolean)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildPdfTextLinesFromRow(
  items: PlacedPdfTextItem[],
  gapTolerance: number,
  medianHeight: number,
): PdfTextLine[] {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  const splitGap = Math.max(48, medianHeight * 4.8);
  const segments: PlacedPdfTextItem[][] = [];
  let current: PlacedPdfTextItem[] = [];
  let prevRight: number | null = null;

  for (const item of sorted) {
    const gap = prevRight === null ? 0 : item.x - prevRight;
    if (current.length > 0 && gap > splitGap) {
      segments.push(current);
      current = [];
    }
    current.push(item);
    prevRight = item.x + Math.max(0, item.width);
  }
  if (current.length > 0) segments.push(current);

  return segments
    .map((segment) => buildPdfTextLineSegment(segment, gapTolerance))
    .filter((line): line is PdfTextLine => line !== null);
}

function buildPdfTextLineSegment(items: PlacedPdfTextItem[], gapTolerance: number): PdfTextLine | null {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let out = '';
  let prevRight: number | null = null;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;

  for (const item of sorted) {
    const text = item.text.replace(/\s+/g, ' ');
    if (!text.trim()) continue;
    const gap = prevRight === null ? 0 : item.x - prevRight;
    if (out && gap > gapTolerance && !/\s$/.test(out) && !/^\s/.test(text)) out += ' ';
    out += text;
    minX = Math.min(minX, item.x);
    maxX = Math.max(maxX, item.x + Math.max(0, item.width));
    prevRight = item.x + Math.max(0, item.width);
  }

  const text = out.trim();
  if (!text) return null;
  const y = sorted.reduce((sum, item) => sum + item.y, 0) / sorted.length;
  return { text, y, minX, maxX };
}

function orderPdfTextLinesForReading(lines: PdfTextLine[], medianHeight: number): PdfTextLine[] {
  const topDown = [...lines].sort((a, b) => b.y - a.y || a.minX - b.minX);
  if (lines.length < 8) return topDown;

  const pageMinX = Math.min(...lines.map((line) => line.minX));
  const pageMaxX = Math.max(...lines.map((line) => line.maxX));
  const pageWidth = pageMaxX - pageMinX;
  if (!Number.isFinite(pageWidth) || pageWidth < medianHeight * 24) return topDown;

  const separator = pageMinX + pageWidth / 2;
  const slack = Math.max(8, medianHeight * 0.8);
  const left = lines.filter((line) => line.maxX <= separator - slack);
  const right = lines.filter((line) => line.minX >= separator + slack);
  const spanning = lines.filter((line) => !left.includes(line) && !right.includes(line));

  if (left.length < 3 || right.length < 3) return topDown;
  const columnGap = Math.min(...right.map((line) => line.minX)) - Math.max(...left.map((line) => line.maxX));
  if (columnGap < Math.max(18, medianHeight * 2.2)) return topDown;

  const columnTop = Math.max(...left.map((line) => line.y), ...right.map((line) => line.y));
  const columnBottom = Math.min(...left.map((line) => line.y), ...right.map((line) => line.y));
  const topSpanning = spanning.filter((line) => line.y > columnTop + medianHeight * 0.9);
  const bottomSpanning = spanning.filter((line) => line.y < columnBottom - medianHeight * 0.9);
  const middleSpanning = spanning.filter((line) => !topSpanning.includes(line) && !bottomSpanning.includes(line));

  if (middleSpanning.length > Math.max(2, Math.floor(lines.length * 0.18))) return topDown;

  const byY = (a: PdfTextLine, b: PdfTextLine) => b.y - a.y || a.minX - b.minX;
  return [
    ...topSpanning.sort(byY),
    ...left.sort(byY),
    ...right.sort(byY),
    ...bottomSpanning.sort(byY),
  ];
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

// ───── PDF 병합 ─────
export async function mergePdfs(files: File[]): Promise<{ blob: Blob; suggestedName: string }> {
  const { PDFDocument } = await loadPdfLib();
  const merged = await PDFDocument.create();
  for (const file of files) {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: false });
    const copied = await merged.copyPages(doc, doc.getPageIndices());
    copied.forEach((p) => merged.addPage(p));
  }
  const bytes = await merged.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  return { blob, suggestedName: 'merged.pdf' };
}

// ───── PDF 분할 (페이지 범위) ─────
// ranges 예: "1-3,5,7-9" → [[0,2],[4,4],[6,8]]
function parseRanges(input: string, totalPages: number): number[][] {
  const out: number[][] = [];
  for (const seg of input.split(',')) {
    const trimmed = seg.trim();
    if (!trimmed) continue;
    if (trimmed.includes('-')) {
      const [a, b] = trimmed.split('-').map((s) => parseInt(s.trim(), 10));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        const from = Math.max(1, Math.min(a, b));
        const to = Math.min(totalPages, Math.max(a, b));
        out.push([from - 1, to - 1]);
      }
    } else {
      const n = parseInt(trimmed, 10);
      if (Number.isFinite(n) && n >= 1 && n <= totalPages) out.push([n - 1, n - 1]);
    }
  }
  return out;
}

export async function splitPdf(file: File, rangesStr: string): Promise<{ blob: Blob; suggestedName: string }> {
  const { PDFDocument } = await loadPdfLib();
  const buf = await file.arrayBuffer();
  const src = await PDFDocument.load(buf);
  const total = src.getPageCount();
  const ranges = parseRanges(rangesStr, total);
  if (ranges.length === 0) throw new Error('페이지 범위를 확인해주세요. 예: 1-3,5,7-9');
  const out = await PDFDocument.create();
  for (const [from, to] of ranges) {
    const indices: number[] = [];
    for (let i = from; i <= to; i++) indices.push(i);
    const copied = await out.copyPages(src, indices);
    copied.forEach((p) => out.addPage(p));
  }
  const bytes = await out.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  return { blob, suggestedName: `${baseName(file.name)}-split.pdf` };
}

// ───── 내부 재사용용: 첫 페이지 썸네일 (data URL) ─────
export async function renderPdfThumbnail(
  file: File,
  opts: { maxWidth?: number; quality?: number } = {},
): Promise<string> {
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const maxW = opts.maxWidth ?? 480;
  const scale = Math.min(2, maxW / baseViewport.width);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas context unavailable');
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas.toDataURL('image/jpeg', opts.quality ?? 0.7);
}

/** 지정 페이지들을 JPEG dataURL 배열로 렌더 (비전 입력용). 한 번 PDF 로드 → 여러 페이지 처리. */
export async function renderPdfPagesToImages(
  file: File | Blob,
  pages: number[],
  opts: { maxWidth?: number; maxScale?: number; quality?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<Array<{ page: number; dataUrl: string }>> {
  if (pages.length === 0) return [];
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const out: Array<{ page: number; dataUrl: string }> = [];
  const maxW = opts.maxWidth ?? 1024;
  const maxScale = opts.maxScale ?? 2;
  const quality = opts.quality ?? 0.72;
  let done = 0;
  for (const p of pages) {
    if (p < 1 || p > doc.numPages) { done++; opts.onProgress?.(done, pages.length); continue; }
    const page = await doc.getPage(p);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(maxScale, maxW / baseViewport.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) { done++; opts.onProgress?.(done, pages.length); continue; }
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    out.push({ page: p, dataUrl: canvas.toDataURL('image/jpeg', quality) });
    done++;
    opts.onProgress?.(done, pages.length);
    // 메모리 해제 + UI 양보
    if (done % 4 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  return out;
}

/** PDF 의 outline(bookmark/TOC) 평탄화 결과. 페이지 번호는 1-based. */
export interface PdfOutlineEntry {
  title: string;
  page: number;
  /** 트리 깊이 (0 이 최상위) — 챕터·섹션 구분용 */
  depth: number;
}

/**
 * PDF 북마크/outline 을 평탄한 배열로 추출.
 * 강의 자료·텍스트북·논문 PDF 가 종종 가진 실제 TOC 정보를 사용해
 * AI 가 챕터 추측하는 것보다 정확한 챕터 경계를 얻을 수 있다.
 *
 * 반환 비어 있으면 PDF 에 outline 이 없거나 추출 실패한 경우.
 */
export async function extractPdfOutline(file: File | Blob): Promise<PdfOutlineEntry[]> {
  try {
    const pdfjs = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    type RawOutlineItem = { title: string; dest?: unknown; items?: RawOutlineItem[] };
    const outline = (await doc.getOutline()) as RawOutlineItem[] | null;
    if (!outline || outline.length === 0) return [];

    const flat: PdfOutlineEntry[] = [];
    const walk = async (items: RawOutlineItem[], depth: number): Promise<void> => {
      for (const item of items) {
        let pageNum: number | null = null;
        try {
          if (Array.isArray(item.dest) && item.dest.length > 0) {
            const pageIdx = await doc.getPageIndex(item.dest[0]);
            pageNum = pageIdx + 1;
          } else if (typeof item.dest === 'string') {
            const dest = await doc.getDestination(item.dest);
            if (dest && Array.isArray(dest) && dest.length > 0) {
              const pageIdx = await doc.getPageIndex(dest[0]);
              pageNum = pageIdx + 1;
            }
          }
        } catch { /* dest 해상도 실패 시 스킵 */ }
        const title = (item.title || '').trim();
        if (title && pageNum != null) {
          flat.push({ title, page: pageNum, depth });
        }
        if (item.items && item.items.length > 0) {
          await walk(item.items, depth + 1);
        }
      }
    };
    await walk(outline, 0);
    // 페이지 순으로 정렬 (PDF 가 hash 등으로 순서 어긋난 경우 보정)
    flat.sort((a, b) => a.page - b.page);
    return flat;
  } catch {
    return [];
  }
}

// ───── 내부 재사용용: PDF → 일반 문자열 ─────
export async function extractPdfText(file: File, maxLen = 15000): Promise<string> {
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = extractPdfTextContentForStudy(content);
    parts.push(text);
    if (parts.join('\n\n').length >= maxLen) break;
  }
  return parts.join('\n\n').slice(0, maxLen);
}

/** PDF 텍스트 + 총 페이지 수 + 스캔(텍스트 없음) 페이지 목록 메타. Study 용. */
export async function extractPdfMeta(
  file: File,
  maxLen = 15000,
): Promise<{ text: string; pageCount: number; scanPages: number[] }> {
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  const scanPages: number[] = [];
  // 전체 페이지는 순회해야 scanPages 집계 정확. 다만 parts 는 maxLen 도달 시 중단.
  let capped = false;
  let partsLength = 0;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = extractPdfTextContentForStudy(content);
    const nativeItemCount = content.items.length;
    const paintedImageCount = shouldInspectPdfPageImagesForOcr(text, nativeItemCount)
      ? await countPaintedImages(page, pdfjs)
      : 0;
    // 페이지당 텍스트가 거의 없으면 스캔본 후보
    if (shouldOcrExtractedPdfPageText(text, {
      nativeItemCount,
      hasPaintedImage: paintedImageCount > 0,
      paintedImageCount,
    })) {
      scanPages.push(i);
    }
    if (!capped) {
      const pageText = `[p.${i}]\n${text}`;
      parts.push(pageText);
      partsLength += pageText.length + 2;
      if (partsLength >= maxLen) capped = true;
    }
    if (i % 4 === 0) await yieldToMain();
  }
  return { text: parts.join('\n\n').slice(0, maxLen), pageCount: doc.numPages, scanPages };
}

async function countPaintedImages(
  page: { getOperatorList?: () => Promise<{ fnArray?: number[] }> },
  pdfjs: { OPS?: Record<string, number> },
): Promise<number> {
  if (!page.getOperatorList || !pdfjs.OPS) return 0;
  try {
    const imageOps = new Set([
      pdfjs.OPS.paintImageXObject,
      pdfjs.OPS.paintImageXObjectRepeat,
      pdfjs.OPS.paintJpegXObject,
      pdfjs.OPS.paintInlineImageXObject,
      pdfjs.OPS.paintInlineImageXObjectGroup,
      pdfjs.OPS.paintImageMaskXObject,
      pdfjs.OPS.paintImageMaskXObjectGroup,
    ].filter((value): value is number => typeof value === 'number'));
    if (imageOps.size === 0) return 0;
    const opList = await page.getOperatorList();
    return (opList.fnArray ?? []).filter((fn) => imageOps.has(fn)).length;
  } catch {
    return 0;
  }
}

// ───── PDF → 텍스트 (pdfjs-dist) ─────
export async function pdfToText(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<{ blob: Blob; suggestedName: string; previewText: string }> {
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.(i, doc.numPages);
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = extractPdfTextContentForStudy(content);
    parts.push(text);
    if (i % 4 === 0) await yieldToMain();
  }
  const full = parts.join('\n\n');
  const blob = new Blob([full], { type: 'text/plain;charset=utf-8' });
  return { blob, suggestedName: `${baseName(file.name)}.txt`, previewText: full.slice(0, 500) };
}

// ───── PDF → 이미지 (페이지별 PNG, zip으로 묶음) ─────
export async function pdfToImages(
  file: File,
  opts: { format: 'png' | 'jpeg'; scale?: number } = { format: 'png' },
  onProgress?: (page: number, total: number) => void,
): Promise<{ blob: Blob; suggestedName: string }> {
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const scale = opts.scale ?? 2;

  // JSZip으로 여러 이미지 하나의 zip
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const mime = opts.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = opts.format === 'jpeg' ? 'jpg' : 'png';

  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.(i, doc.numPages);
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 컨텍스트를 얻지 못했어요.');
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 생성 실패'))), mime, 0.92);
    });
    const arr = new Uint8Array(await blob.arrayBuffer());
    zip.file(`${baseName(file.name)}-page-${String(i).padStart(3, '0')}.${ext}`, arr);
    // canvas 해제 + 메인 스레드 양보 (렌더링이 무거워 UI가 얼어붙는 걸 방지)
    canvas.width = 0;
    canvas.height = 0;
    await yieldToMain();
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { blob: zipBlob, suggestedName: `${baseName(file.name)}-images.zip` };
}

// ───── 이미지 → PDF ─────
export async function imagesToPdf(files: File[]): Promise<{ blob: Blob; suggestedName: string }> {
  const { jsPDF } = await loadJsPdf();
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const dataUrl = await fileToDataUrl(file);
    const img = await loadImage(dataUrl);
    // 이미지 비율에 맞춰 페이지에 최대한 크게 배치
    const ratio = Math.min(pageW / img.width, pageH / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;
    if (i > 0) pdf.addPage();
    // jsPDF는 JPEG·PNG 지원. WebP는 실패 가능 → Canvas로 JPEG 변환
    const mime = detectImageMime(file);
    if (mime === 'JPEG' || mime === 'PNG') {
      pdf.addImage(dataUrl, mime, x, y, w, h);
    } else {
      // WebP·GIF 등 → Canvas로 PNG 변환
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h);
    }
  }

  const blob = pdf.output('blob');
  return { blob, suggestedName: 'images.pdf' };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('파일을 읽지 못했어요.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 로드하지 못했어요.'));
    img.src = src;
  });
}

function detectImageMime(file: File): 'JPEG' | 'PNG' | 'WEBP' | 'OTHER' {
  const t = file.type.toLowerCase();
  if (t.includes('jpeg') || t.includes('jpg')) return 'JPEG';
  if (t.includes('png')) return 'PNG';
  if (t.includes('webp')) return 'WEBP';
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'jpg' || ext === 'jpeg') return 'JPEG';
  if (ext === 'png') return 'PNG';
  if (ext === 'webp') return 'WEBP';
  return 'OTHER';
}

// ───── PDF 압축 ─────
// 전략: pdfjs로 페이지를 이미지로 렌더 → JPEG 재인코딩 → 새 PDF 페이지로 박음.
// 이미지 위주 PDF 에 효과 큼 (스캔본 등). 텍스트만 있는 PDF 는 효과 적거나 오히려 커질 수 있음.
export type PdfCompressLevel = 'low' | 'medium' | 'high';
const COMPRESS_QUALITY: Record<PdfCompressLevel, { quality: number; scale: number }> = {
  low:    { quality: 0.85, scale: 1.5 },  // 약 — 화질 우선
  medium: { quality: 0.7,  scale: 1.2 },  // 중
  high:   { quality: 0.55, scale: 1.0 },  // 강 — 용량 우선
};

export async function compressPdf(
  file: File,
  level: PdfCompressLevel = 'medium',
  onProgress?: (current: number, total: number) => void,
): Promise<{ blob: Blob; suggestedName: string }> {
  const pdfjs = await loadPdfJs();
  const { PDFDocument } = await loadPdfLib();
  const buf = await file.arrayBuffer();
  const src = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
  const out = await PDFDocument.create();
  const { quality, scale } = COMPRESS_QUALITY[level];

  for (let i = 1; i <= src.numPages; i++) {
    onProgress?.(i, src.numPages);
    const page = await src.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context 실패');
    // PDF 배경(흰색) 깔기 — JPEG 는 투명 처리 X
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas: canvas as unknown as HTMLCanvasElement & Record<string, unknown> }).promise;
    // JPEG dataURL → bytes
    const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
    const jpegBytes = dataUrlToBytes(jpegDataUrl);
    const embedded = await out.embedJpg(jpegBytes);
    const w = page.getViewport({ scale: 1 }).width;
    const h = page.getViewport({ scale: 1 }).height;
    const newPage = out.addPage([w, h]);
    newPage.drawImage(embedded, { x: 0, y: 0, width: w, height: h });
    await yieldToMain();
  }
  const bytes = await out.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  return { blob, suggestedName: `${baseName(file.name)}-compressed.pdf` };
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  const base64 = dataUrl.slice(comma + 1);
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ───── PDF 워터마크 (텍스트) ─────
// 모든 페이지에 대각선으로 흐린 텍스트 박음.
export interface WatermarkOptions {
  text: string;
  /** 0~1, 기본 0.2 */
  opacity?: number;
  /** rgb 0~1, 기본 회색 */
  color?: { r: number; g: number; b: number };
  /** 폰트 크기, 기본 50 */
  fontSize?: number;
  /** 회전 각도 (deg), 기본 -45 */
  rotateDeg?: number;
}
export async function watermarkPdf(
  file: File,
  opts: WatermarkOptions,
): Promise<{ blob: Blob; suggestedName: string }> {
  const lib = await loadPdfLib();
  const { PDFDocument, rgb, degrees: deg, StandardFonts } = lib;
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const color = opts.color ?? { r: 0.4, g: 0.4, b: 0.4 };
  const opacity = opts.opacity ?? 0.2;
  const fontSize = opts.fontSize ?? 50;
  const rotateDeg = opts.rotateDeg ?? -45;
  const pages = doc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(opts.text, fontSize);
    page.drawText(opts.text, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: deg(rotateDeg),
    });
  }
  const bytes = await doc.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  return { blob, suggestedName: `${baseName(file.name)}-watermark.pdf` };
}

// ───── PDF 페이지 번호 추가 ─────
export interface PageNumberOptions {
  position: 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right';
  format: 'plain' | 'with-total';   // "3" vs "3 / 10"
  startFromPage?: number;            // 1부터 시작 페이지 (기본 1)
}
export async function addPdfPageNumbers(
  file: File,
  opts: PageNumberOptions,
): Promise<{ blob: Blob; suggestedName: string }> {
  const lib = await loadPdfLib();
  const { PDFDocument, rgb, StandardFonts } = lib;
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;
  const startFrom = opts.startFromPage ?? 1;
  const fontSize = 11;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const num = i + startFrom;
    const text = opts.format === 'with-total' ? `${num} / ${total}` : `${num}`;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x = width / 2 - textWidth / 2;
    let y = 24;
    switch (opts.position) {
      case 'bottom-center': x = width / 2 - textWidth / 2; y = 24; break;
      case 'bottom-right':  x = width - textWidth - 32;    y = 24; break;
      case 'top-center':    x = width / 2 - textWidth / 2; y = height - 24 - fontSize; break;
      case 'top-right':     x = width - textWidth - 32;    y = height - 24 - fontSize; break;
    }
    page.drawText(text, {
      x, y, size: fontSize, font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }
  const bytes = await doc.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  return { blob, suggestedName: `${baseName(file.name)}-numbered.pdf` };
}

// ───── PDF 암호 보호/해제 ─────
// 주의: pdf-lib 코어는 PDF 표준 암호화(RC4/AES)를 지원하지 않음.
// 외부 솔루션 필요 (qpdf-wasm ~5MB 등). 사용자에게 솔직히 안내하고
// 다른 도구 (예: 무료 SmallPDF 의 암호 보호 페이지) 권장.
export async function protectPdf(
  _file: File,
  _password: string,
): Promise<{ blob: Blob; suggestedName: string }> {
  throw new Error(
    'PDF 암호 보호는 클라이언트에서 안전하게 구현이 어려워 곧 별도 도구로 분리해서 추가할 예정이에요. ' +
    '지금은 SmallPDF·iLovePDF 의 암호 보호 페이지를 사용해주세요.',
  );
}

export async function unlockPdf(
  _file: File,
  _password: string,
): Promise<{ blob: Blob; suggestedName: string }> {
  throw new Error(
    'PDF 암호 해제는 클라이언트에서 안전하게 구현이 어려워 곧 별도 도구로 분리해서 추가할 예정이에요. ' +
    '지금은 SmallPDF·iLovePDF 의 암호 해제 페이지를 사용해주세요.',
  );
}

// ───── PDF 빈 페이지 추가 ─────
export type BlankPagePosition = 'start' | 'end' | 'after-page';
export interface BlankPageOptions {
  position: BlankPagePosition;
  /** position='after-page' 일 때 1-based 페이지 번호 */
  afterPage?: number;
  /** 빈 페이지 N장 추가, 기본 1 */
  count?: number;
}
export async function addBlankPdfPage(
  file: File,
  opts: BlankPageOptions,
): Promise<{ blob: Blob; suggestedName: string }> {
  const lib = await loadPdfLib();
  const { PDFDocument } = lib;
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf);
  const total = doc.getPageCount();
  // 첫 페이지 크기를 빈 페이지에도 사용
  const firstPage = doc.getPage(0);
  const { width, height } = firstPage.getSize();
  const count = Math.max(1, opts.count ?? 1);

  // 삽입 인덱스 결정
  let insertAt: number;
  switch (opts.position) {
    case 'start':       insertAt = 0; break;
    case 'end':         insertAt = total; break;
    case 'after-page':  insertAt = Math.max(0, Math.min(total, opts.afterPage ?? total)); break;
  }

  for (let i = 0; i < count; i++) {
    doc.insertPage(insertAt + i, [width, height]);
  }
  const bytes = await doc.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  return { blob, suggestedName: `${baseName(file.name)}-blank.pdf` };
}

// ───── PDF 메타데이터 편집 — 제목·저자·키워드 등 ─────
export interface PdfMetaOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];     // 쉼표로 split 처리됨
  creator?: string;
  producer?: string;
}
export async function setPdfMetadata(
  file: File,
  meta: PdfMetaOptions,
): Promise<{ blob: Blob; suggestedName: string }> {
  const lib = await loadPdfLib();
  const { PDFDocument } = lib;
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf);
  if (meta.title !== undefined) doc.setTitle(meta.title);
  if (meta.author !== undefined) doc.setAuthor(meta.author);
  if (meta.subject !== undefined) doc.setSubject(meta.subject);
  if (meta.keywords !== undefined) doc.setKeywords(meta.keywords);
  if (meta.creator !== undefined) doc.setCreator(meta.creator);
  if (meta.producer !== undefined) doc.setProducer(meta.producer);
  doc.setModificationDate(new Date());
  const bytes = await doc.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  return { blob, suggestedName: `${baseName(file.name)}-meta.pdf` };
}

// ───── PDF 회전 ─────
// 모든 페이지 또는 페이지 범위 회전. degrees ∈ {90, 180, 270}.
export async function rotatePdf(
  file: File,
  degrees: 90 | 180 | 270,
  pageRangesStr?: string,  // 빈 문자열 = 전체
): Promise<{ blob: Blob; suggestedName: string }> {
  const { PDFDocument, degrees: pdfDegrees } = await loadPdfLib();
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf);
  const total = doc.getPageCount();
  const targetIndices: Set<number> = pageRangesStr && pageRangesStr.trim().length > 0
    ? new Set(parseRanges(pageRangesStr, total).flatMap(([from, to]) => {
        const out: number[] = [];
        for (let i = from; i <= to; i++) out.push(i);
        return out;
      }))
    : new Set(Array.from({ length: total }, (_, i) => i));

  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    if (!targetIndices.has(i)) continue;
    const cur = pages[i].getRotation().angle;
    pages[i].setRotation(pdfDegrees((cur + degrees) % 360));
  }
  const bytes = await doc.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  return { blob, suggestedName: `${baseName(file.name)}-rotated.pdf` };
}

// ───── PDF 페이지 추출 (선택한 범위만 새 PDF로) ─────
export async function extractPdfPages(
  file: File,
  rangesStr: string,
): Promise<{ blob: Blob; suggestedName: string }> {
  const { PDFDocument } = await loadPdfLib();
  const src = await PDFDocument.load(await file.arrayBuffer());
  const total = src.getPageCount();
  const ranges = parseRanges(rangesStr, total);
  if (ranges.length === 0) throw new Error('추출할 페이지 범위를 확인해주세요. 예: 1-3,5,7-9');
  const out = await PDFDocument.create();
  const indices: number[] = [];
  for (const [from, to] of ranges) {
    for (let i = from; i <= to; i++) indices.push(i);
  }
  const copied = await out.copyPages(src, indices);
  copied.forEach((p) => out.addPage(p));
  const bytes = await out.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  return { blob, suggestedName: `${baseName(file.name)}-extracted.pdf` };
}

// ───── PDF 페이지 삭제 (지정 페이지만 빼고 나머지 유지) ─────
export async function deletePdfPages(
  file: File,
  rangesStr: string,
): Promise<{ blob: Blob; suggestedName: string }> {
  const { PDFDocument } = await loadPdfLib();
  const src = await PDFDocument.load(await file.arrayBuffer());
  const total = src.getPageCount();
  const ranges = parseRanges(rangesStr, total);
  if (ranges.length === 0) throw new Error('삭제할 페이지 범위를 확인해주세요. 예: 1,3,5-7');
  const removeSet = new Set<number>();
  for (const [from, to] of ranges) {
    for (let i = from; i <= to; i++) removeSet.add(i);
  }
  if (removeSet.size >= total) {
    throw new Error('모든 페이지를 삭제할 수는 없어요. 적어도 1페이지는 남겨주세요.');
  }
  const keepIndices: number[] = [];
  for (let i = 0; i < total; i++) {
    if (!removeSet.has(i)) keepIndices.push(i);
  }
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, keepIndices);
  copied.forEach((p) => out.addPage(p));
  const bytes = await out.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  return { blob, suggestedName: `${baseName(file.name)}-trimmed.pdf` };
}

// ───── PDF 페이지 재배열 (사용자 정의 순서) ─────
// orderStr: 쉼표로 구분된 1-based 페이지 번호 (예: "3,1,2,4")
export async function reorderPdfPages(
  file: File,
  orderStr: string,
): Promise<{ blob: Blob; suggestedName: string }> {
  const { PDFDocument } = await loadPdfLib();
  const src = await PDFDocument.load(await file.arrayBuffer());
  const total = src.getPageCount();
  const order = orderStr
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => parseInt(s, 10) - 1); // 0-based
  if (order.length === 0) throw new Error('새 순서를 입력해주세요. 예: 3,1,2,4');
  for (const i of order) {
    if (Number.isNaN(i) || i < 0 || i >= total) {
      throw new Error(`잘못된 페이지 번호. 1~${total} 사이여야 해요.`);
    }
  }
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, order);
  copied.forEach((p) => out.addPage(p));
  const bytes = await out.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  return { blob, suggestedName: `${baseName(file.name)}-reordered.pdf` };
}

// ───── PDF에서 이미지 추출 (모든 이미지를 ZIP으로) ─────
// pdfjs-dist 의 page.getOperatorList() 로 OP_paintImageXObject 를 찾아 이미지 stream 추출.
export async function extractPdfImages(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<{ blob: Blob; suggestedName: string; imageCount: number }> {
  const pdfjs = await loadPdfJs();
  const JSZip = (await import('jszip')).default;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const zip = new JSZip();
  let imageCount = 0;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    onProgress?.(`페이지 ${pageNum}/${doc.numPages} 분석 중...`);
    await yieldToMain();
    const page = await doc.getPage(pageNum);
    // page.getOperatorList() 로 이미지 객체 이름 수집
    const opList = await page.getOperatorList();
    const imgNames = new Set<string>();
    for (let i = 0; i < opList.fnArray.length; i++) {
      const op = opList.fnArray[i];
      // pdfjs OP code: paintImageXObject = 85, paintInlineImageXObject = 86
      if (op === pdfjs.OPS.paintImageXObject || op === pdfjs.OPS.paintImageXObjectRepeat) {
        const args = opList.argsArray[i];
        if (args && args[0]) imgNames.add(args[0]);
      }
    }
    // 각 이미지 객체를 PNG로 변환
    for (const name of imgNames) {
      try {
        const obj = await new Promise<unknown>((resolve) => {
          // pdfjs commonObjs/objs 양쪽 시도
          page.objs.get(name, (img: unknown) => resolve(img));
        });
        if (!obj) continue;
        // obj 는 { width, height, kind, data, ... } 형태
        const img = obj as { width?: number; height?: number; data?: Uint8Array | Uint8ClampedArray; bitmap?: ImageBitmap };
        const w = img.width ?? 0;
        const h = img.height ?? 0;
        if (w === 0 || h === 0) continue;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        if (img.bitmap) {
          ctx.drawImage(img.bitmap, 0, 0);
        } else if (img.data) {
          // RGBA / RGB raw data
          const pixels = img.data;
          const imageData = ctx.createImageData(w, h);
          if (pixels.length === w * h * 4) {
            imageData.data.set(pixels);
          } else if (pixels.length === w * h * 3) {
            // RGB → RGBA
            for (let p = 0, q = 0; q < pixels.length; p += 4, q += 3) {
              imageData.data[p] = pixels[q];
              imageData.data[p + 1] = pixels[q + 1];
              imageData.data[p + 2] = pixels[q + 2];
              imageData.data[p + 3] = 255;
            }
          } else {
            continue;
          }
          ctx.putImageData(imageData, 0, 0);
        } else {
          continue;
        }
        const pngBlob: Blob = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG 변환 실패'))), 'image/png');
        });
        imageCount++;
        zip.file(`p${pageNum}-${imageCount}.png`, pngBlob);
      } catch {
        // 일부 이미지 객체는 건너뜀 (마스크·shading 등)
        continue;
      }
    }
  }

  if (imageCount === 0) {
    throw new Error('PDF 안에서 이미지를 찾지 못했어요. 텍스트 위주 PDF 일 수 있어요.');
  }
  onProgress?.(`이미지 ${imageCount}장 ZIP 묶는 중...`);
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { blob: zipBlob, suggestedName: `${baseName(file.name)}-images.zip`, imageCount };
}

// ───── PDF 헤더·푸터 추가 ─────
export interface PdfHeaderFooterOptions {
  headerText?: string;
  footerText?: string;
  position: 'left' | 'center' | 'right';
  fontSize?: number;
  /** {page} {total} {date} {filename} 변수 치환 지원 */
}
export async function addPdfHeaderFooter(
  file: File,
  opts: PdfHeaderFooterOptions,
): Promise<{ blob: Blob; suggestedName: string }> {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const doc = await PDFDocument.load(await file.arrayBuffer());
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;
  const today = new Date().toISOString().slice(0, 10);
  const fontSize = opts.fontSize ?? 9;
  const margin = 24;

  const interpolate = (template: string, pageNum: number): string =>
    template
      .replace(/\{page\}/g, String(pageNum))
      .replace(/\{total\}/g, String(total))
      .replace(/\{date\}/g, today)
      .replace(/\{filename\}/g, baseName(file.name));

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    const drawText = (text: string, y: number) => {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      let x: number;
      if (opts.position === 'left') x = margin;
      else if (opts.position === 'right') x = width - margin - textWidth;
      else x = (width - textWidth) / 2;
      page.drawText(text, { x, y, size: fontSize, font, color: rgb(0.4, 0.4, 0.4) });
    };

    if (opts.headerText) drawText(interpolate(opts.headerText, i + 1), height - margin);
    if (opts.footerText) drawText(interpolate(opts.footerText, i + 1), margin / 2);
  }

  const bytes = await doc.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  return { blob, suggestedName: `${baseName(file.name)}-headfoot.pdf` };
}

// ───── PDF 흑백 변환 (RGB → 그레이스케일) ─────
// 각 페이지를 canvas 에 렌더 → 그레이스케일 변환 → JPG → 새 PDF 생성.
// 손실 변환이지만 색공간 축소로 인쇄 비용 절감.
export async function grayscalePdf(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<{ blob: Blob; suggestedName: string }> {
  const pdfjs = await loadPdfJs();
  const { jsPDF } = await loadJsPdf();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const total = doc.numPages;
  const out = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = out.internal.pageSize.getWidth();
  const pageH = out.internal.pageSize.getHeight();

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    onProgress?.(`페이지 ${pageNum}/${total} 흑백 변환 중...`);
    await yieldToMain();
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 생성 실패');
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    // 그레이스케일 변환 (luminosity 방식)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    if (pageNum > 1) out.addPage();
    // 페이지에 맞춰 fit
    const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;
    out.addImage(dataUrl, 'JPEG', x, y, w, h);
  }

  const blob = out.output('blob');
  return { blob, suggestedName: `${baseName(file.name)}-grayscale.pdf` };
}
