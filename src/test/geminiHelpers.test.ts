import { describe, expect, it } from 'vitest';
import { buildGeminiUrl, extractGeminiText, extractJsonObject, parseGeminiStreamBuffer } from '../../api/_lib/gemini';

describe('gemini helpers', () => {
  it('builds the correct Gemini URLs for regular and streaming requests', () => {
    expect(buildGeminiUrl('gemini-2.5-flash-lite', 'secret')).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=secret',
    );
    expect(buildGeminiUrl('gemini-2.5-flash-lite', 'secret', true)).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?alt=sse&key=secret',
    );
  });

  it('extracts combined text from Gemini response parts', () => {
    expect(extractGeminiText({
      candidates: [
        {
          content: {
            parts: [
              { text: 'hello ' },
              { text: 'world' },
            ],
          },
        },
      ],
    })).toBe('hello world');

    expect(extractGeminiText({})).toBe('');
  });

  it('extracts JSON payloads from fenced and unfenced model output', () => {
    expect(extractJsonObject<{ ok: boolean }>('```json\n{"ok":true}\n```')).toEqual({ ok: true });
    expect(extractJsonObject<{ score: number }>('prefix {"score":7} suffix')).toEqual({ score: 7 });
    expect(extractJsonObject('not json')).toBeNull();
  });

  it('parses streamed SSE lines while preserving incomplete remainders', () => {
    const result = parseGeminiStreamBuffer([
      'data: {"candidates":[{"content":{"parts":[{"text":"alpha"}]}}]}',
      'data: {"candidates":[{"content":{"parts":[{"text":"beta"}]}}]}',
      'data: [DONE]',
      '',
    ].join('\n'));

    expect(result).toEqual({
      done: true,
      texts: ['alpha', 'beta'],
      remainder: '',
    });

    const partial = parseGeminiStreamBuffer('data: {"candidates":[{"content":{"parts":[{"text":"cut"}]}}]');
    expect(partial.done).toBe(false);
    expect(partial.texts).toEqual([]);
    expect(partial.remainder).toContain('data: {"candidates"');
  });
});
