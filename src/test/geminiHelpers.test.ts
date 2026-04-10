import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPENROUTER_IMAGE_MODEL,
  DEFAULT_OPENROUTER_TEXT_MODEL,
  extractJsonObject,
  extractOpenRouterImages,
  extractOpenRouterText,
  parseOpenRouterStreamBuffer,
} from '../../api/_lib/openrouter';

describe('openrouter helpers', () => {
  it('exposes the expected default model ids', () => {
    expect(DEFAULT_OPENROUTER_TEXT_MODEL).toBe('google/gemini-2.5-flash-lite');
    expect(DEFAULT_OPENROUTER_IMAGE_MODEL).toBe('google/gemini-2.5-flash-image');
  });

  it('extracts combined text from OpenRouter response content', () => {
    expect(extractOpenRouterText({
      choices: [
        {
          message: {
            content: [
              { text: 'hello ' },
              { text: 'world' },
            ],
          },
        },
      ],
    })).toBe('hello world');

    expect(extractOpenRouterText({})).toBe('');
  });

  it('extracts generated images from OpenRouter message payloads', () => {
    expect(extractOpenRouterImages({
      choices: [
        {
          message: {
            images: [
              { image_url: { url: 'data:image/png;base64,abc' } },
              { imageUrl: { url: 'data:image/jpeg;base64,def' } },
            ],
          },
        },
      ],
    })).toEqual([
      { mimeType: 'image/png', data: 'abc' },
      { mimeType: 'image/jpeg', data: 'def' },
    ]);
  });

  it('extracts JSON payloads from fenced and unfenced model output', () => {
    expect(extractJsonObject<{ ok: boolean }>('```json\n{"ok":true}\n```')).toEqual({ ok: true });
    expect(extractJsonObject<{ score: number }>('prefix {"score":7} suffix')).toEqual({ score: 7 });
    expect(extractJsonObject('not json')).toBeNull();
  });

  it('parses streamed SSE lines while preserving incomplete remainders', () => {
    const result = parseOpenRouterStreamBuffer([
      'data: {"choices":[{"delta":{"content":"alpha"}}]}',
      'data: {"choices":[{"delta":{"content":"beta"}}]}',
      'data: [DONE]',
      '',
    ].join('\n'));

    expect(result).toEqual({
      done: true,
      texts: ['alpha', 'beta'],
      remainder: '',
    });

    const partial = parseOpenRouterStreamBuffer('data: {"choices":[{"delta":{"content":"cut"}}]');
    expect(partial.done).toBe(false);
    expect(partial.texts).toEqual([]);
    expect(partial.remainder).toContain('data: {"choices"');
  });
});
