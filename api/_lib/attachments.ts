export interface UploadedFilePayload {
  name: string;
  mimeType?: string;
  base64?: string;
  extractedText?: string;
}

export interface ValidatedUploadedFile {
  name: string;
  mimeType: string;
  base64?: string;
  extractedText?: string;
  size: number;
}

export type AttachmentUserPart =
  | { text: string }
  | {
      inline_data: {
        mime_type: string;
        data: string;
      };
    };

export const ATTACHMENT_LIMITS = {
  maxFiles: 5,
  maxFileSize: 10 * 1024 * 1024,
  maxTotalSize: 20 * 1024 * 1024,
  maxExtractedTextLength: 15000,
  maxFileNameLength: 120,
} as const;

const SUPPORTED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

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

function getFileExtension(name: string) {
  const parts = name.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() ?? '' : '';
}

export function resolveUploadedMimeType(mimeType: string | undefined, fileName: string): string {
  const normalizedMimeType = mimeType?.trim().toLowerCase() ?? '';
  if (SUPPORTED_TYPES.has(normalizedMimeType)) {
    return normalizedMimeType;
  }

  const extension = getFileExtension(fileName);
  return EXTENSION_TO_MIME_TYPE[extension] ?? normalizedMimeType;
}

function requiresExtractedText(mimeType: string) {
  return mimeType.includes('wordprocessingml') || mimeType.includes('spreadsheetml');
}

function stripDataUrlPrefix(base64: string) {
  const trimmed = base64.trim();
  const commaIndex = trimmed.indexOf(',');
  return commaIndex >= 0 ? trimmed.slice(commaIndex + 1) : trimmed;
}

function estimateBase64Bytes(base64: string) {
  const normalized = stripDataUrlPrefix(base64).replace(/\s+/g, '');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

export function normalizeAndValidateUploadedFiles(files: unknown): ValidatedUploadedFile[] {
  if (files == null) return [];
  if (!Array.isArray(files)) {
    throw new Error('첨부파일 형식이 올바르지 않아요.');
  }
  if (files.length > ATTACHMENT_LIMITS.maxFiles) {
    throw new Error(`첨부파일은 최대 ${ATTACHMENT_LIMITS.maxFiles}개까지 가능해요.`);
  }

  let totalSize = 0;
  const dedupeSet = new Set<string>();

  return files.map((rawFile, index) => {
    if (!rawFile || typeof rawFile !== 'object') {
      throw new Error(`첨부파일 ${index + 1}번 정보가 올바르지 않아요.`);
    }

    const file = rawFile as UploadedFilePayload;
    const name = typeof file.name === 'string' ? file.name.trim() : '';
    if (!name) {
      throw new Error(`첨부파일 ${index + 1}번 이름이 비어 있어요.`);
    }
    if (name.length > ATTACHMENT_LIMITS.maxFileNameLength) {
      throw new Error(`"${name.slice(0, 20)}..." 파일 이름이 너무 길어요.`);
    }

    const mimeType = resolveUploadedMimeType(file.mimeType, name);
    if (!SUPPORTED_TYPES.has(mimeType)) {
      throw new Error(`"${name}" 파일 형식은 아직 지원하지 않아요.`);
    }

    const extractedText =
      typeof file.extractedText === 'string' && file.extractedText.trim()
        ? file.extractedText.trim().slice(0, ATTACHMENT_LIMITS.maxExtractedTextLength)
        : undefined;
    const base64 =
      typeof file.base64 === 'string' && file.base64.trim()
        ? stripDataUrlPrefix(file.base64)
        : undefined;

    if (requiresExtractedText(mimeType) && !extractedText) {
      throw new Error(`"${name}" 문서 텍스트를 읽지 못했어요. 다시 첨부해 주세요.`);
    }

    if (!requiresExtractedText(mimeType) && !base64) {
      throw new Error(`"${name}" 파일 데이터가 비어 있어요.`);
    }

    const size = base64 ? estimateBase64Bytes(base64) : Buffer.byteLength(extractedText ?? '', 'utf8');
    if (size > ATTACHMENT_LIMITS.maxFileSize) {
      throw new Error(`"${name}" 파일이 너무 커요. 10MB 이하만 첨부해 주세요.`);
    }

    totalSize += size;
    if (totalSize > ATTACHMENT_LIMITS.maxTotalSize) {
      throw new Error('첨부파일 전체 용량은 20MB 이하만 가능해요.');
    }

    const dedupeKey = `${name}:${size}`;
    if (dedupeSet.has(dedupeKey)) {
      throw new Error(`"${name}" 파일이 중복 첨부되었어요.`);
    }
    dedupeSet.add(dedupeKey);

    return {
      name,
      mimeType,
      base64,
      extractedText,
      size,
    };
  });
}

export function buildUserPartsFromUploadedFiles(files: ValidatedUploadedFile[]): AttachmentUserPart[] {
  if (files.length === 0) {
    return [];
  }

  const parts: AttachmentUserPart[] = [
    {
      text: '[첨부파일 안내]\n질문과 관련이 있다면 아래 첨부파일 내용도 함께 참고해서 답변해 줘.',
    },
  ];

  for (const file of files) {
    if (file.extractedText) {
      parts.push({
        text: `\n[첨부파일: ${file.name}]\n${file.extractedText}`,
      });
      continue;
    }

    if (file.base64) {
      parts.push({ text: `\n[첨부파일: ${file.name}]` });
      parts.push({
        inline_data: {
          mime_type: file.mimeType,
          data: file.base64,
        },
      });
    }
  }

  return parts;
}
