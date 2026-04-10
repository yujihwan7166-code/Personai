import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  normalizeAndValidateUploadedFiles,
  type UploadedFilePayload,
  type ValidatedUploadedFile,
} from './_lib/attachments.js';
import {
  DEFAULT_OPENROUTER_IMAGE_MODEL,
  extractOpenRouterImages,
  extractOpenRouterText,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
  OPENROUTER_API_URL,
} from './_lib/openrouter.js';

type GeneralImageMode = 'generate' | 'edit';
type GeneralImageAspectRatio = '1:1' | '16:9' | '9:16';

interface PreviousMessageInput {
  role?: 'user' | 'assistant';
  content?: string;
}

interface PreviousMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GeneralImageRequestBody {
  prompt?: string;
  mode?: GeneralImageMode;
  files?: unknown;
  referenceImage?: UploadedFilePayload | null;
  previousMessages?: PreviousMessageInput[];
  aspectRatio?: string;
}

function isPreviousMessageInput(value: unknown): value is PreviousMessageInput {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizePreviousMessages(previousMessages: unknown): PreviousMessage[] {
  if (!Array.isArray(previousMessages)) {
    return [];
  }

  return previousMessages
    .filter(isPreviousMessageInput)
    .map((item): PreviousMessage => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: typeof item.content === 'string' ? item.content.trim().slice(0, 1500) : '',
    }))
    .filter((item) => item.content.length > 0)
    .slice(-6);
}

function isImageFile(file: ValidatedUploadedFile) {
  return file.mimeType.startsWith('image/');
}

function normalizeAspectRatio(aspectRatio: string | undefined): GeneralImageAspectRatio {
  if (aspectRatio === '16:9' || aspectRatio === '9:16') {
    return aspectRatio;
  }

  return '1:1';
}

function buildImagePrompt(mode: GeneralImageMode, prompt: string, previousMessages: PreviousMessage[]) {
  const history = previousMessages.length > 0
    ? `이전 대화 맥락:\n${previousMessages.map((message) => `- ${message.role === 'assistant' ? 'AI' : '사용자'}: ${message.content}`).join('\n')}\n\n`
    : '';

  const modeInstruction = mode === 'edit'
    ? '사용자가 제공한 기존 이미지를 바탕으로 요청한 수정만 반영하세요. 구도와 핵심 요소는 가능한 한 유지하세요.'
    : '사용자 요청에 맞는 새 이미지를 생성하세요.';

  return `${modeInstruction}

${history}현재 요청:
${prompt}

응답 규칙:
- 반드시 이미지 결과를 1개 이상 포함하세요.
- 텍스트 설명은 짧게만 덧붙이세요.
- 워터마크나 UI 프레임, 설명 박스는 넣지 마세요.`;
}

function buildImageContent(prompt: string, sourceImages: ValidatedUploadedFile[], previousMessages: PreviousMessage[], mode: GeneralImageMode) {
  return [
    { type: 'text' as const, text: buildImagePrompt(mode, prompt, previousMessages) },
    ...sourceImages.map((image) => ({
      type: 'image_url' as const,
      image_url: {
        url: `data:${image.mimeType};base64,${image.base64 ?? ''}`,
      },
    })),
  ];
}

function buildRetryPrompt(prompt: string, attempt: number) {
  if (attempt <= 1) {
    return prompt;
  }

  return `${prompt}

[중요]
- 이번 응답에는 텍스트만 주지 말고 실제 이미지 결과를 반드시 포함하세요.
- 이미지 파트가 없으면 응답은 실패로 처리됩니다.`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY가 설정되지 않았어요.' });
  }

  const body = (req.body ?? {}) as GeneralImageRequestBody;
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const mode: GeneralImageMode = body.mode === 'edit' ? 'edit' : 'generate';
  const aspectRatio = normalizeAspectRatio(body.aspectRatio);

  if (!prompt) {
    return res.status(400).json({ error: '이미지 요청 문구가 비어 있어요.' });
  }

  const previousMessages = sanitizePreviousMessages(body.previousMessages);

  let uploadedFiles: ValidatedUploadedFile[] = [];
  try {
    uploadedFiles = normalizeAndValidateUploadedFiles(body.files).filter(isImageFile);

    if (body.referenceImage) {
      uploadedFiles = [
        ...normalizeAndValidateUploadedFiles([
          {
            name: body.referenceImage.name || 'previous-image.png',
            mimeType: body.referenceImage.mimeType,
            base64: body.referenceImage.base64,
          },
        ]).filter(isImageFile),
        ...uploadedFiles,
      ];
    }
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : '이미지 입력을 확인하지 못했어요.',
    });
  }

  const sourceImages = uploadedFiles.slice(0, 3);
  if (mode === 'edit' && sourceImages.length === 0) {
    return res.status(400).json({ error: '이미지 수정에는 기존 이미지가 필요해요.' });
  }

  const abortCtrl = new AbortController();
  const timeoutId = setTimeout(() => abortCtrl.abort(), 60000);

  try {
    let lastTextOnlyResponse = '';

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const openRouterRes = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: getOpenRouterHeaders(apiKey),
        body: JSON.stringify({
          model: DEFAULT_OPENROUTER_IMAGE_MODEL,
          messages: [
            {
              role: 'user',
              content: buildImageContent(buildRetryPrompt(prompt, attempt), sourceImages, previousMessages, mode),
            },
          ],
          modalities: ['image', 'text'],
          image_config: {
            aspect_ratio: aspectRatio,
          },
        }),
        signal: abortCtrl.signal,
      });

      if (!openRouterRes.ok) {
        const errorText = await openRouterRes.text();
        if (openRouterRes.status === 429) {
          return res.status(429).json({ error: '이미지 요청이 잠시 몰렸어요. 조금 뒤에 다시 시도해 주세요.' });
        }
        if (openRouterRes.status >= 500) {
          return res.status(openRouterRes.status).json({ error: '이미지 생성 모델이 잠시 불안정해요. 조금 뒤에 다시 시도해 주세요.' });
        }
        return res.status(openRouterRes.status).json({ error: errorText || '이미지 생성 응답을 받지 못했어요.' });
      }

      const payload = await openRouterRes.json();
      const images = extractOpenRouterImages(payload);
      const text = extractOpenRouterText(payload).trim();

      if (images.length > 0) {
        return res.status(200).json({
          mode,
          text: text || (mode === 'edit' ? '요청한 방향으로 이미지를 수정했어요.' : '요청한 느낌으로 이미지를 만들었어요.'),
          images,
          aspectRatio,
          sourceModel: DEFAULT_OPENROUTER_IMAGE_MODEL,
        });
      }

      lastTextOnlyResponse = text;
    }

    return res.status(502).json({
      error: lastTextOnlyResponse
        ? `이미지 없이 텍스트만 돌아왔어요. ${lastTextOnlyResponse}`
        : '이미지가 생성되지 않고 텍스트만 돌아왔어요. 다시 시도해 주세요.',
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return res.status(504).json({ error: '이미지 생성 시간이 조금 길어졌어요. 다시 시도해 주세요.' });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : '이미지 생성 중 알 수 없는 오류가 발생했어요.',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
