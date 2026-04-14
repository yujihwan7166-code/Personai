import { describe, expect, it } from 'vitest';
import { classifyQuestion } from '@/utils/agent/questionClassifier';

describe('questionClassifier', () => {
  it('keeps greetings simple', () => {
    const result = classifyQuestion('안녕');
    expect(result.mode).toBe('simple');
  });

  it('treats short but complex prompts as deep', () => {
    const result = classifyQuestion('유가 전망');
    expect(result.mode).toBe('deep');
    expect(result.needsSearch).toBe(true);
  });

  it('classifies multi-factor comparison prompts as deep', () => {
    const result = classifyQuestion('GPT와 Claude 차이 비교하고 어떤 상황에서 뭐가 더 좋은지 알려줘');
    expect(result.mode).toBe('deep');
    expect(result.intent).toBe('comparison');
  });

  it('keeps short practical follow-up prompts simple', () => {
    const result = classifyQuestion('더 자세히 설명해줘');
    expect(result.mode).toBe('simple');
  });

  it('recognizes short prompts with explicit metrics as non-simple', () => {
    const result = classifyQuestion('3개월 유가 전망 10% 가능성');
    expect(['standard', 'deep']).toContain(result.mode);
    expect(result.needsSearch).toBe(true);
  });
});
