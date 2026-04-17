import { describe, expect, it } from 'vitest';
import { shouldSkipClarifyForConcretePrompt } from '../../api/clarify-chat';

describe('clarify-chat heuristics', () => {
  it('skips clarify for short concrete topic prompts', () => {
    expect(shouldSkipClarifyForConcretePrompt('유가 전망')).toBe(true);
    expect(shouldSkipClarifyForConcretePrompt('미국 금리 전망')).toBe(true);
    expect(shouldSkipClarifyForConcretePrompt('GPT Claude 비교')).toBe(true);
  });

  it('does not skip clarify for generic referential prompts', () => {
    expect(shouldSkipClarifyForConcretePrompt('이거 어때')).toBe(false);
    expect(shouldSkipClarifyForConcretePrompt('그거 설명해줘')).toBe(false);
  });

  it('does not skip clarify for long open-ended prompts by heuristic alone', () => {
    expect(shouldSkipClarifyForConcretePrompt('내 상황을 다 고려해서 어떤 방향이 맞는지 전체적으로 봐줘')).toBe(false);
  });
});
