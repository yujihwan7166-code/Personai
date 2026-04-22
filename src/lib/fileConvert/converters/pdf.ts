// PDF 관련 변환: 병합·분할·이미지·텍스트 추출·이미지→PDF
// 라이브러리: pdf-lib (병합/분할/생성), pdfjs-dist (읽기/렌더링), jspdf (이미지→PDF)

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

// ───── 내부 재사용용: PDF → 일반 문자열 ─────
export async function extractPdfText(file: File, maxLen = 15000): Promise<string> {
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it) => ('str' in it ? it.str : '')).join(' ');
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
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it) => ('str' in it ? it.str : '')).join(' ').trim();
    // 페이지당 텍스트가 거의 없으면 스캔본 후보
    if (text.length < 20) scanPages.push(i);
    if (!capped) {
      parts.push(`[p.${i}] ${text}`);
      if (parts.join('\n\n').length >= maxLen) capped = true;
    }
  }
  return { text: parts.join('\n\n').slice(0, maxLen), pageCount: doc.numPages, scanPages };
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
    const text = content.items.map((it) => ('str' in it ? it.str : '')).join(' ');
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
