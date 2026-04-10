import type { ValidatedUploadedFile } from './attachments.js';

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const DEFAULT_OPENROUTER_TEXT_MODEL = process.env.OPENROUTER_TEXT_MODEL || 'google/gemini-2.5-flash-lite';
export const DEFAULT_OPENROUTER_IMAGE_MODEL = process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image';
export const DEFAULT_OPENROUTER_PDF_ENGINE = process.env.OPENROUTER_PDF_ENGINE || 'cloudflare-ai';

type OpenRouterTextContentPart = {
  type: 'text';
  text: string;
};

type OpenRouterImageContentPart = {
  type: 'image_url';
  image_url: {
    url: string;
  };
};

type OpenRouterFileContentPart = {
  type: 'file';
  file: {
    filename: string;
    file_data: string;
  };
};

export type OpenRouterContentPart =
  | OpenRouterTextContentPart
  | OpenRouterImageContentPart
  | OpenRouterFileContentPart;

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenRouterContentPart[];
}

export interface OpenRouterPlugin {
  id: string;
  pdf?: {
    engine?: string;
  };
}

type OpenRouterResponseTextPart = {
  type?: string;
  text?: string;
};

type OpenRouterResponseImage = {
  type?: string;
  image_url?: {
    url?: string;
  };
  imageUrl?: {
    url?: string;
  };
};

type OpenRouterChoice = {
  message?: {
    role?: string;
    content?: string | OpenRouterResponseTextPart[];
    images?: OpenRouterResponseImage[];
  };
  delta?: {
    content?: string | OpenRouterResponseTextPart[];
    images?: OpenRouterResponseImage[];
  };
};

export interface OpenRouterChatResponse {
  choices?: OpenRouterChoice[];
}

export interface OpenRouterImageResult {
  mimeType: string;
  data: string;
}

export interface OpenRouterStreamParseResult {
  done: boolean;
  texts: string[];
  remainder: string;
}

function buildDataUrl(mimeType: string, base64: string) {
  return `data:${mimeType};base64,${base64}`;
}

function extractTextFromContent(content: string | OpenRouterResponseTextPart[] | undefined) {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('');
}

export function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY || '';
}

export function getOpenRouterHeaders(apiKey: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (process.env.OPENROUTER_SITE_URL) {
    headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL;
  }

  if (process.env.OPENROUTER_APP_NAME) {
    headers['X-Title'] = process.env.OPENROUTER_APP_NAME;
  }

  return headers;
}

export function buildOpenRouterContentFromUploadedFiles(files: ValidatedUploadedFile[]): OpenRouterContentPart[] {
  if (files.length === 0) {
    return [];
  }

  const parts: OpenRouterContentPart[] = [
    {
      type: 'text',
      text: '[첨부파일 안내]\n질문과 관련이 있다면 아래 첨부파일 내용을 함께 참고해서 답변해 주세요.',
    },
  ];

  for (const file of files) {
    if (file.extractedText) {
      parts.push({
        type: 'text',
        text: `\n[첨부파일: ${file.name}]\n${file.extractedText}`,
      });
      continue;
    }

    if (!file.base64) {
      continue;
    }

    if (file.mimeType.startsWith('image/')) {
      parts.push({
        type: 'text',
        text: `\n[첨부 이미지: ${file.name}]`,
      });
      parts.push({
        type: 'image_url',
        image_url: {
          url: buildDataUrl(file.mimeType, file.base64),
        },
      });
      continue;
    }

    if (file.mimeType === 'application/pdf') {
      parts.push({
        type: 'text',
        text: `\n[첨부 PDF: ${file.name}]`,
      });
      parts.push({
        type: 'file',
        file: {
          filename: file.name,
          file_data: buildDataUrl(file.mimeType, file.base64),
        },
      });
    }
  }

  return parts;
}

export function buildOpenRouterPluginsForUploadedFiles(files: ValidatedUploadedFile[]): OpenRouterPlugin[] | undefined {
  if (!files.some((file) => file.mimeType === 'application/pdf')) {
    return undefined;
  }

  return [
    {
      id: 'file-parser',
      pdf: {
        engine: DEFAULT_OPENROUTER_PDF_ENGINE,
      },
    },
  ];
}

export function extractOpenRouterText(payload: OpenRouterChatResponse): string {
  const choice = payload.choices?.[0];
  return extractTextFromContent(choice?.message?.content) || extractTextFromContent(choice?.delta?.content);
}

export function extractOpenRouterImages(payload: OpenRouterChatResponse): OpenRouterImageResult[] {
  const images = payload.choices?.[0]?.message?.images ?? payload.choices?.[0]?.delta?.images ?? [];

  return images
    .map((image) => image.image_url?.url ?? image.imageUrl?.url ?? '')
    .filter(Boolean)
    .map((dataUrl) => {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      return {
        mimeType: match?.[1] || 'image/png',
        data: match?.[2] || '',
      };
    })
    .filter((image) => image.data.length > 0);
}

export function extractJsonObject<T>(text: string): T | null {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return null;
  }

  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    return null;
  }
}

export function parseOpenRouterStreamBuffer(buffer: string): OpenRouterStreamParseResult {
  const texts: string[] = [];
  const lines = buffer.split('\n');
  let remainder = lines.pop() || '';
  let done = false;

  for (const rawLine of lines) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;

    if (line.startsWith(':') || !line.startsWith('data: ')) {
      continue;
    }

    const jsonStr = line.slice(6).trim();
    if (!jsonStr) {
      continue;
    }

    if (jsonStr === '[DONE]') {
      done = true;
      continue;
    }

    try {
      const parsed = JSON.parse(jsonStr) as OpenRouterChatResponse;
      const text = extractOpenRouterText(parsed);

      if (text) {
        texts.push(text);
      }
    } catch {
      remainder = `${line}\n${remainder}`;
      break;
    }
  }

  return { done, texts, remainder };
}
