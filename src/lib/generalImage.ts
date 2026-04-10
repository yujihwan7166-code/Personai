import type { DiscussionMessage, GeneratedImageAsset } from '@/types/expert';

export type GeneralImageIntent = 'generate' | 'edit';
export type GeneralImageAspectRatio = '1:1' | '16:9' | '9:16';

type MimeCarrier = {
  mimeType?: string;
};

const CREATE_PATTERN =
  /(그려줘|그려\s*줘|만들어줘|만들어\s*줘|생성해줘|생성\s*해줘|제작해줘|제작\s*해줘|렌더링해줘|렌더링\s*해줘|뽑아줘|그림으로\s*만들|이미지로\s*만들)/i;
const EDIT_PATTERN =
  /(수정해줘|수정\s*해줘|편집해줘|편집\s*해줘|바꿔줘|바꿔\s*줘|변경해줘|변경\s*해줘|교체해줘|교체\s*해줘|지워줘|지워\s*줘|추가해줘|추가\s*해줘|합성해줘|합성\s*해줘|배경|색감|톤|비율|실사풍|만화풍|지브리풍|더 밝|더 어둡|따뜻한 색감|차가운 색감)/i;
const IMAGE_NOUN_PATTERN =
  /(이미지|그림|사진|일러스트|아트|포스터|배너|썸네일|배경화면|캐릭터|로고|콘셉트 아트|컨셉 아트)/i;
const ANALYZE_PATTERN =
  /(설명해줘|설명\s*해줘|분석해줘|분석\s*해줘|해석해줘|해석\s*해줘|읽어줘|읽어\s*줘|뭐가 보여|무슨 내용|요약해줘|요약\s*해줘|텍스트 추출|ocr)/i;
const PREVIOUS_IMAGE_PATTERN =
  /(방금|아까|이전|위에|그 이미지|그림|그 사진|방금 만든|만든 거|이거|저거)/i;

export function isImageMimeType(mimeType: string | undefined): boolean {
  return typeof mimeType === 'string' && mimeType.startsWith('image/');
}

export function stripDataUrlPrefix(value: string): string {
  const trimmed = value.trim();
  const commaIndex = trimmed.indexOf(',');
  return commaIndex >= 0 ? trimmed.slice(commaIndex + 1) : trimmed;
}

export function detectGeneralImageIntent(
  question: string,
  options: {
    files?: MimeCarrier[];
    hasRecentGeneratedImage?: boolean;
  } = {},
): GeneralImageIntent | null {
  const normalizedQuestion = question.trim();

  if (!normalizedQuestion) {
    return null;
  }

  const hasImageFiles = options.files?.some((file) => isImageMimeType(file.mimeType)) ?? false;
  const wantsCreate = CREATE_PATTERN.test(normalizedQuestion) || (IMAGE_NOUN_PATTERN.test(normalizedQuestion) && /(필요|원해|부탁|가능할까|제작|생성)/i.test(normalizedQuestion));
  const wantsEdit = EDIT_PATTERN.test(normalizedQuestion);
  const wantsAnalysis = ANALYZE_PATTERN.test(normalizedQuestion) && !wantsCreate && !wantsEdit;
  const referencesPreviousImage = PREVIOUS_IMAGE_PATTERN.test(normalizedQuestion);

  if (wantsAnalysis) {
    return null;
  }

  if (hasImageFiles && (wantsEdit || wantsCreate || referencesPreviousImage)) {
    return 'edit';
  }

  if (options.hasRecentGeneratedImage && (wantsEdit || referencesPreviousImage)) {
    return 'edit';
  }

  if (wantsCreate) {
    return 'generate';
  }

  return null;
}

export function detectGeneralImageAspectRatio(question: string): GeneralImageAspectRatio {
  if (/(세로|포스터|쇼츠|릴스|스토리|모바일 배경|폰 배경|핸드폰 배경|세로형)/i.test(question)) {
    return '9:16';
  }

  if (/(가로|배너|헤더|유튜브 썸네일|썸네일|커버|와이드|랜딩)/i.test(question)) {
    return '16:9';
  }

  return '1:1';
}

export function findLatestGeneratedImage(messages: DiscussionMessage[]): (GeneratedImageAsset & { messageId: string }) | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const generatedImage = message.generatedImages?.find((image) => typeof image.dataUrl === 'string' && image.dataUrl.length > 0);

    if (generatedImage) {
      return {
        ...generatedImage,
        messageId: message.id,
      };
    }
  }

  return null;
}

export async function createGeneratedImageThumbnail(
  dataUrl: string,
  options: {
    maxSize?: number;
    quality?: number;
  } = {},
): Promise<string | undefined> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return undefined;
  }

  const maxSize = options.maxSize ?? 640;
  const quality = options.quality ?? 0.78;

  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      try {
        const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
        const width = Math.max(1, Math.round(image.width * ratio));
        const height = Math.max(1, Math.round(image.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          resolve(undefined);
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', quality));
      } catch {
        resolve(undefined);
      }
    };

    image.onerror = () => resolve(undefined);
    image.src = dataUrl;
  });
}
