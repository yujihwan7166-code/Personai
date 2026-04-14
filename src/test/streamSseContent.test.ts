import { describe, expect, it } from 'vitest';
import { streamSseContent } from '@/utils/agent/streamSseContent';

function createStreamingResponse(chunks: string[]) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });

  return new Response(stream, { status: 200 });
}

describe('streamSseContent', () => {
  it('reassembles fragmented SSE JSON payloads', async () => {
    const streamed: string[] = [];
    const response = createStreamingResponse([
      'data: {"choices":[{"delta":{"content":"Hel',
      'lo"}}]}\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n',
      'data: [DONE]\n',
    ]);

    const answer = await streamSseContent(response, (token) => {
      streamed.push(token);
    });

    expect(answer).toBe('Hello world');
    expect(streamed).toEqual(['Hello', ' world']);
  });

  it('ignores non-message events and finishes on done', async () => {
    const streamed: string[] = [];
    const response = createStreamingResponse([
      'event: search\n',
      'data: {"sources":[]}\n',
      '\n',
      'data: {"choices":[{"delta":{"content":"Done"}}]}\n',
      'data: [DONE]\n',
    ]);

    const answer = await streamSseContent(response, (token) => {
      streamed.push(token);
    });

    expect(answer).toBe('Done');
    expect(streamed).toEqual(['Done']);
  });

  it('forwards search payloads when requested', async () => {
    const streamed: string[] = [];
    const captured: unknown[] = [];
    const response = createStreamingResponse([
      'event: search\n',
      'data: {"query":"유가 전망","sources":[{"title":"Source A","link":"https://example.com"}]}\n',
      '\n',
      'data: {"choices":[{"delta":{"content":"Done"}}]}\n',
      'data: [DONE]\n',
    ]);

    const answer = await streamSseContent(
      response,
      (token) => {
        streamed.push(token);
      },
      (payload) => {
        captured.push(payload);
      },
    );

    expect(answer).toBe('Done');
    expect(streamed).toEqual(['Done']);
    expect(captured).toEqual([
      {
        query: '유가 전망',
        sources: [{ title: 'Source A', link: 'https://example.com' }],
      },
    ]);
  });
});
