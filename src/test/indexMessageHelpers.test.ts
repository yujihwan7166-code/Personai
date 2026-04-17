import { describe, expect, it } from 'vitest';
import { getDefaultProgress } from '@/lib/responseProgress';
import { createStreamingMessage, progressFields } from '@/lib/indexPage/messageHelpers';
import { buildMultiResponsePlan } from '@/lib/indexPage/multiPlan';

describe('index page helper utilities', () => {
  it('maps response progress into message fields', () => {
    const progress = getDefaultProgress('planning', {
      label: '구조를 정리 중',
      detail: '핵심 순서를 맞추고 있어요.',
    });

    expect(progressFields(progress)).toEqual({
      responseState: 'planning',
      progressLabel: '구조를 정리 중',
      progressDetail: '핵심 순서를 맞추고 있어요.',
    });
  });

  it('creates a streaming placeholder message with default analyzing progress', () => {
    const message = createStreamingMessage({
      id: 'msg-1',
      expertId: 'auto-gpt',
    });

    expect(message.isStreaming).toBe(true);
    expect(message.responseState).toBe('analyzing');
    expect(message.progressLabel).toBeTruthy();
  });

  it('keeps custom progress when provided', () => {
    const message = createStreamingMessage({
      id: 'msg-2',
      expertId: 'gpt',
      progress: getDefaultProgress('queued'),
      content: '초안',
    });

    expect(message.responseState).toBe('queued');
    expect(message.content).toBe('초안');
  });

  it('allocates a larger budget for deep two-expert prompts', () => {
    const deepPlan = buildMultiResponsePlan('유가 전망과 금리 영향까지 비교 분석해줘', 2);
    const simplePlan = buildMultiResponsePlan('안녕?', 4);

    expect(deepPlan.maxTokens).toBeGreaterThan(simplePlan.maxTokens);
    expect(deepPlan.prompt).toContain('다중 관점 모드입니다.');
  });
});
