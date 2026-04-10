import { describe, expect, it } from 'vitest';
import {
  detectGeneralImageAspectRatio,
  detectGeneralImageIntent,
  findLatestGeneratedImage,
  stripDataUrlPrefix,
} from '@/lib/generalImage';
import type { DiscussionMessage } from '@/types/expert';

describe('generalImage helpers', () => {
  it('detects first-turn image generation requests', () => {
    expect(detectGeneralImageIntent('우주복 입은 고양이 그림 만들어줘')).toBe('generate');
  });

  it('detects image edit requests from an attached image', () => {
    expect(
      detectGeneralImageIntent('이 사진 배경만 밤으로 바꿔줘', {
        files: [{ mimeType: 'image/png' }],
      }),
    ).toBe('edit');
  });

  it('treats follow-up requests that refer to the last image as edits', () => {
    expect(
      detectGeneralImageIntent('방금 만든 거 더 밝게 바꿔줘', {
        hasRecentGeneratedImage: true,
      }),
    ).toBe('edit');
  });

  it('does not confuse image analysis with image generation', () => {
    expect(detectGeneralImageIntent('이 이미지 설명해줘')).toBeNull();
  });

  it('detects aspect ratio hints from the prompt', () => {
    expect(detectGeneralImageAspectRatio('세로 포스터로 만들어줘')).toBe('9:16');
    expect(detectGeneralImageAspectRatio('유튜브 썸네일처럼 가로로 만들어줘')).toBe('16:9');
    expect(detectGeneralImageAspectRatio('기본 정사각형 이미지로 만들어줘')).toBe('1:1');
  });

  it('strips data URL prefixes', () => {
    expect(stripDataUrlPrefix('data:image/png;base64,abc123')).toBe('abc123');
    expect(stripDataUrlPrefix('plain-base64')).toBe('plain-base64');
  });

  it('finds the latest generated image with a visible data URL', () => {
    const messages: DiscussionMessage[] = [
      {
        id: 'msg-1',
        expertId: 'gpt',
        content: '텍스트 응답',
      },
      {
        id: 'msg-2',
        expertId: 'gpt',
        content: '이미지를 만들었어요.',
        messageType: 'image',
        imageGenerationMode: 'generate',
        generatedImages: [
          {
            mimeType: 'image/png',
            dataUrl: 'data:image/png;base64,latest',
            prompt: '고양이 그림',
          },
        ],
      },
    ];

    expect(findLatestGeneratedImage(messages)).toMatchObject({
      messageId: 'msg-2',
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,latest',
    });
  });
});
