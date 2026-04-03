export interface AttachedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  base64: string;
  preview?: string;       // image thumbnail data URL
  extractedText?: string; // text extracted from Word/Excel
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total
const MAX_FILES = 5;

let mammothModulePromise: Promise<typeof import('mammoth')> | null = null;
let xlsxModulePromise: Promise<typeof import('xlsx')> | null = null;

function loadMammoth() {
  if (!mammothModulePromise) {
    mammothModulePromise = import('mammoth');
  }

  return mammothModulePromise;
}

function loadXlsx() {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx');
  }

  return xlsxModulePromise;
}

const SUPPORTED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
];

export function validateFile(file: File, existingFiles: AttachedFile[]): string | null {
  if (existingFiles.length >= MAX_FILES) return `최대 ${MAX_FILES}개까지 첨부 가능합니다`;
  if (file.size > MAX_FILE_SIZE) return `파일 크기가 10MB를 초과합니다`;
  const totalSize = existingFiles.reduce((sum, f) => sum + f.size, 0) + file.size;
  if (totalSize > MAX_TOTAL_SIZE) return `총 첨부 크기가 20MB를 초과합니다`;
  if (!SUPPORTED_TYPES.includes(file.type)) return `지원하지 않는 파일 형식입니다 (PNG, JPG, PDF, DOCX, XLSX)`;
  return null;
}

export async function processFile(file: File): Promise<AttachedFile> {
  const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const base64 = await fileToBase64(file);

  const result: AttachedFile = {
    id,
    name: file.name,
    mimeType: file.type,
    size: file.size,
    base64,
  };

  // Image: create thumbnail preview + resize if > 3MB
  if (file.type.startsWith('image/')) {
    if (file.size > 3 * 1024 * 1024) {
      result.base64 = await resizeImage(base64, file.type);
    }
    result.preview = `data:${file.type};base64,${result.base64}`;
  }

  // Word: extract text
  if (file.type.includes('wordprocessingml')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = await loadMammoth();
      const { value } = await mammoth.extractRawText({ arrayBuffer });
      result.extractedText = value.slice(0, 15000); // limit text length
      result.base64 = ''; // don't send binary, just text
    } catch { result.extractedText = '[Word 파일 텍스트 추출 실패]'; }
  }

  // Excel: extract text
  if (file.type.includes('spreadsheetml')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const XLSX = await loadXlsx();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      let text = '';
      for (const sheetName of workbook.SheetNames.slice(0, 3)) { // max 3 sheets
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        text += `[시트: ${sheetName}]\n${csv.slice(0, 5000)}\n\n`;
      }
      result.extractedText = text.slice(0, 15000);
      result.base64 = ''; // don't send binary
    } catch { result.extractedText = '[Excel 파일 텍스트 추출 실패]'; }
  }

  return result;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // remove data:...;base64, prefix
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
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const resized = canvas.toDataURL(mimeType, 0.85).split(',')[1];
      resolve(resized);
    };
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
