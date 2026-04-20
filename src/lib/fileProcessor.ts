export interface AttachedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  base64: string;
  preview?: string;
  extractedText?: string;
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_TOTAL_SIZE = 20 * 1024 * 1024;
export const MAX_FILES = 5;
export const MAX_EXTRACTED_TEXT_LENGTH = 15000;

let xlsxModulePromise: Promise<typeof import('xlsx')> | null = null;
let jsZipModulePromise: Promise<typeof import('jszip')> | null = null;

export const SUPPORTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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

export function validateFile(file: File, existingFiles: AttachedFile[]): string | null {
  const normalizedMimeType = resolveMimeType(file.type, file.name);

  if (existingFiles.length >= MAX_FILES) return `파일은 최대 ${MAX_FILES}개까지 첨부할 수 있어요.`;
  if (file.size > MAX_FILE_SIZE) return '파일 하나당 최대 10MB까지 첨부할 수 있어요.';

  const totalSize = existingFiles.reduce((sum, existingFile) => sum + existingFile.size, 0) + file.size;
  if (totalSize > MAX_TOTAL_SIZE) return '첨부파일 전체 용량은 최대 20MB까지 가능해요.';

  if (existingFiles.some((existingFile) => existingFile.name === file.name && existingFile.size === file.size)) {
    return '같은 파일이 이미 첨부되어 있어요.';
  }

  if (!SUPPORTED_TYPES.includes(normalizedMimeType as (typeof SUPPORTED_TYPES)[number])) {
    return '지원하는 형식만 첨부할 수 있어요. (PNG, JPG, GIF, WEBP, PDF, DOCX, XLSX)';
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
      const { extractPdfText } = await import('@/lib/fileConvert/converters/pdf');
      const text = await extractPdfText(file, MAX_EXTRACTED_TEXT_LENGTH);
      if (text.trim().length < 20) {
        result.extractedText = '[이 PDF는 텍스트가 없는 이미지 기반일 수 있어요. 스캔본은 지원하지 않습니다.]';
      } else {
        result.extractedText = text;
        result.base64 = '';
      }
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
