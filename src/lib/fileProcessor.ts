export interface AttachedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  base64: string;
  preview?: string;
  extractedText?: string;
  /** PDF 첫 페이지 등 추출된 썸네일 (data URL). */
  thumbnail?: string;
  /** PDF 페이지 수 / PPTX 슬라이드 수. */
  pageCount?: number;
  /** PDF 스캔본 페이지 (텍스트가 거의 없는 페이지). */
  scanPages?: number[];
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_TOTAL_SIZE = 20 * 1024 * 1024;
export const MAX_FILES = 5;
/** 추출 텍스트 최대 길이.
 * 15,000 → 200,000 으로 상향 (Phase 1, 2026-04-27).
 * 평균 한국어 강의 PDF 100+ 페이지까지 손실 없이 담는다.
 * LLM 호출 시점의 토큰 예산은 별도(consumer 측)에서 청킹·압축으로 관리. */
export const MAX_EXTRACTED_TEXT_LENGTH = 200_000;

let xlsxModulePromise: Promise<typeof import('xlsx')> | null = null;
let jsZipModulePromise: Promise<typeof import('jszip')> | null = null;

export const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export const SUPPORTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PPTX_MIME,
] as const;

const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: PPTX_MIME,
};

type AttachmentLike = Pick<AttachedFile, 'name' | 'mimeType'>;

function loadXlsx() {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx');
  }

  return xlsxModulePromise;
}

function loadJsZip() {
  if (!jsZipModulePromise) {
    jsZipModulePromise = import('jszip');
  }

  return jsZipModulePromise;
}

function getFileExtension(name: string) {
  const parts = name.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() ?? '' : '';
}

export function resolveMimeType(mimeType: string | undefined, fileName: string): string {
  const normalizedMimeType = mimeType?.trim().toLowerCase() ?? '';
  if (SUPPORTED_TYPES.includes(normalizedMimeType as (typeof SUPPORTED_TYPES)[number])) {
    return normalizedMimeType;
  }

  const extension = getFileExtension(fileName);
  return EXTENSION_TO_MIME_TYPE[extension] ?? normalizedMimeType;
}

export function extractDocxTextFromXml(xml: string): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(xml, 'application/xml');
  const paragraphs = Array.from(document.getElementsByTagNameNS('*', 'p'));

  const paragraphTexts = paragraphs.map((paragraph) => {
    const fragments: string[] = [];

    const collectText = (node: Node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const element = node as Element;

      if (element.localName === 't' && element.textContent) {
        fragments.push(element.textContent);
      } else if (element.localName === 'tab') {
        fragments.push('\t');
      } else if (element.localName === 'br' || element.localName === 'cr') {
        fragments.push('\n');
      }

      for (const child of Array.from(element.childNodes)) {
        collectText(child);
      }
    };

    for (const child of Array.from(paragraph.childNodes)) {
      collectText(child);
    }

    return fragments.join('').trim();
  });

  return paragraphTexts.filter(Boolean).join('\n');
}

async function extractDocxTextFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  const JSZip = await loadJsZip();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const mainDocument = zip.file('word/document.xml');

  if (!mainDocument) {
    throw new Error('DOCX main document XML not found');
  }

  const xml = await mainDocument.async('string');
  return extractDocxTextFromXml(xml);
}

/**
 * PPTX 에서 슬라이드별 텍스트 + 총 슬라이드 수를 뽑아낸다.
 * 슬라이드 구분자 "[slide N]" 삽입.
 */
export async function extractPptxTextFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  maxLength = MAX_EXTRACTED_TEXT_LENGTH,
): Promise<{ text: string; slideCount: number }> {
  const JSZip = await loadJsZip();
  const zip = await JSZip.loadAsync(arrayBuffer);
  // ppt/slides/slide1.xml, slide2.xml ... (숫자 순)
  const slideEntries = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide(\d+)\.xml$/.test(p))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return na - nb;
    });

  const parser = new DOMParser();
  const pieces: string[] = [];
  let used = 0;
  for (let i = 0; i < slideEntries.length; i++) {
    const file = zip.file(slideEntries[i]);
    if (!file) continue;
    const xml = await file.async('string');
    const doc = parser.parseFromString(xml, 'application/xml');
    const runs = Array.from(doc.getElementsByTagNameNS('*', 't'))
      .map((n) => n.textContent ?? '')
      .filter(Boolean);
    const header = `[slide ${i + 1}]`;
    const body = runs.join(' ').replace(/\s+/g, ' ').trim();
    const chunk = `${header}\n${body}`;
    if (used + chunk.length > maxLength) {
      pieces.push(chunk.slice(0, Math.max(0, maxLength - used)));
      break;
    }
    pieces.push(chunk);
    used += chunk.length + 1;
  }
  return { text: pieces.join('\n\n'), slideCount: slideEntries.length };
}

function getAttachmentCategory(mimeType: string) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('wordprocessingml')) return 'docx';
  if (mimeType.includes('spreadsheetml')) return 'xlsx';
  return 'file';
}

export function buildAttachmentPrompt(files: AttachmentLike[]): string {
  if (files.length === 0) {
    return '첨부파일을 분석해줘.';
  }

  const categories = new Set(
    files.map((file) => getAttachmentCategory(resolveMimeType(file.mimeType, file.name)))
  );

  if (files.length === 1) {
    const mimeType = resolveMimeType(files[0].mimeType, files[0].name);
    const category = getAttachmentCategory(mimeType);

    if (category === 'image') return '이 이미지를 자세히 분석해줘.';
    if (category === 'pdf') return '이 PDF를 읽고 핵심 내용을 요약해줘.';
    if (category === 'docx') return '이 문서를 읽고 핵심 내용을 정리해줘.';
    if (category === 'xlsx') return '이 스프레드시트 데이터를 분석해줘.';
    return '이 첨부파일을 분석해줘.';
  }

  if (categories.size === 1) {
    const [category] = [...categories];
    if (category === 'image') return '첨부한 이미지들을 함께 분석해줘.';
    if (category === 'pdf') return '첨부한 PDF들을 함께 읽고 핵심 내용을 요약해줘.';
    if (category === 'docx') return '첨부한 문서들을 함께 읽고 핵심 내용을 정리해줘.';
    if (category === 'xlsx') return '첨부한 스프레드시트들을 함께 분석해줘.';
  }

  return '첨부한 파일들을 함께 분석해줘.';
}

export interface ValidateFileOptions {
  /** 파일당 최대 크기(바이트). 기본: MAX_FILE_SIZE(10MB). */
  maxFileSize?: number;
  /** 전체 누적 최대 크기(바이트). 기본: MAX_TOTAL_SIZE(20MB). */
  maxTotalSize?: number;
  /** 최대 파일 수. 기본: MAX_FILES(5). */
  maxFiles?: number;
}

export function validateFile(
  file: File,
  existingFiles: AttachedFile[],
  options: ValidateFileOptions = {},
): string | null {
  const maxFileSize = options.maxFileSize ?? MAX_FILE_SIZE;
  const maxTotalSize = options.maxTotalSize ?? MAX_TOTAL_SIZE;
  const maxFiles = options.maxFiles ?? MAX_FILES;
  const normalizedMimeType = resolveMimeType(file.type, file.name);

  if (existingFiles.length >= maxFiles) return `파일은 최대 ${maxFiles}개까지 첨부할 수 있어요.`;
  if (file.size > maxFileSize) return `파일 하나당 최대 ${Math.round(maxFileSize / 1024 / 1024)}MB까지 첨부할 수 있어요.`;

  const totalSize = existingFiles.reduce((sum, existingFile) => sum + existingFile.size, 0) + file.size;
  if (totalSize > maxTotalSize) return `첨부파일 전체 용량은 최대 ${Math.round(maxTotalSize / 1024 / 1024)}MB까지 가능해요.`;

  if (existingFiles.some((existingFile) => existingFile.name === file.name && existingFile.size === file.size)) {
    return '같은 파일이 이미 첨부되어 있어요.';
  }

  if (!SUPPORTED_TYPES.includes(normalizedMimeType as (typeof SUPPORTED_TYPES)[number])) {
    return '지원하는 형식만 첨부할 수 있어요. (PNG, JPG, GIF, WEBP, PDF, DOCX, PPTX, XLSX)';
  }

  return null;
}

export async function processFile(file: File): Promise<AttachedFile> {
  const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const mimeType = resolveMimeType(file.type, file.name);
  const base64 = await fileToBase64(file);

  const result: AttachedFile = {
    id,
    name: file.name,
    mimeType,
    size: file.size,
    base64,
  };

  if (mimeType.startsWith('image/')) {
    if (file.size > 3 * 1024 * 1024) {
      result.base64 = await resizeImage(base64, mimeType);
    }
    result.preview = `data:${mimeType};base64,${result.base64}`;
  }

  if (mimeType === 'application/pdf') {
    try {
      const { extractPdfMeta, renderPdfThumbnail } = await import('@/lib/fileConvert/converters/pdf');
      const { text, pageCount, scanPages } = await extractPdfMeta(file, MAX_EXTRACTED_TEXT_LENGTH);
      result.pageCount = pageCount;
      result.scanPages = scanPages;
      const nativeBody = text.replace(/\[p\.\d+\]/g, '').replace(/\s/g, '');
      if (nativeBody.length < 20 || (pageCount > 0 && scanPages.length >= pageCount)) {
        // Phase 1: 스캔본도 거부하지 않음. OCR 자동 트리거 (ocrEnabled = true).
        result.extractedText = '[스캔본 PDF — 원본에서 OCR 로 텍스트를 추출하는 중입니다. 잠시 후 자동으로 채워집니다.]';
      } else {
        result.extractedText = text;
        result.base64 = '';
      }
      // 첫 페이지 썸네일 — 실패해도 치명적이지 않음
      try {
        result.thumbnail = await renderPdfThumbnail(file, { maxWidth: 480, quality: 0.7 });
      } catch { /* noop */ }
    } catch {
      result.extractedText = '[PDF 텍스트 추출 실패]';
    }
  }

  if (mimeType.includes('wordprocessingml')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractDocxTextFromArrayBuffer(arrayBuffer);
      result.extractedText = text.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
      result.base64 = '';
    } catch {
      result.extractedText = '[Word 파일 텍스트 추출 실패]';
    }
  }

  if (mimeType === PPTX_MIME) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { text, slideCount } = await extractPptxTextFromArrayBuffer(arrayBuffer);
      if (text.trim().length < 20) {
        // Phase 1: 이미지 위주 PPT 도 거부하지 않음. 원본 보존.
        result.extractedText = '[이미지 위주 PPT — 원본 뷰어에서 확인해주세요. (Phase 2 에서 비전 추출 예정)]';
      } else {
        result.extractedText = text;
        result.base64 = '';
      }
      result.pageCount = slideCount;
    } catch {
      result.extractedText = '[PPT 파일 텍스트 추출 실패]';
    }
  }

  if (mimeType.includes('spreadsheetml')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const XLSX = await loadXlsx();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      let text = '';

      for (const sheetName of workbook.SheetNames.slice(0, 3)) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        text += `[시트: ${sheetName}]\n${csv.slice(0, 5000)}\n\n`;
      }

      result.extractedText = text.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
      result.base64 = '';
    } catch {
      result.extractedText = '[Excel 파일 텍스트 추출 실패]';
    }
  }

  return result;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeImage(base64: string, mimeType: string, maxWidth = 1920): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(base64);
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const resized = canvas.toDataURL(mimeType, 0.85).split(',')[1];
      resolve(resized);
    };
    img.onerror = () => resolve(base64);
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '\u{1F5BC}\uFE0F';
  if (mimeType === 'application/pdf') return '\u{1F4C4}';
  if (mimeType.includes('wordprocessingml')) return '\u{1F4DD}';
  if (mimeType.includes('spreadsheetml')) return '\u{1F4CA}';
  return '\u{1F4CE}';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
