import { describe, expect, it } from 'vitest';
import { EXPERT_OVERRIDES, applyExpertOverrides } from '@/data/expertOverrides';
import { DEFAULT_EXPERTS, type Expert } from '@/types/expert';

function createExpert(id: string): Expert {
  return {
    id,
    name: id,
    nameKo: id,
    icon: 'A',
    color: 'blue',
    description: 'original description',
    category: 'ai',
    quote: 'original quote',
    sampleQuestions: ['one', 'two', 'three'],
  };
}

describe('EXPERT_OVERRIDES', () => {
  it('keeps every override at exactly three sample questions', () => {
    Object.values(EXPERT_OVERRIDES).forEach((override) => {
      expect(override.sampleQuestions).toHaveLength(3);
      override.sampleQuestions?.forEach((question) => {
        expect(question.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it('only references experts that exist in the catalog', () => {
    const expertIds = new Set(DEFAULT_EXPERTS.map((expert) => expert.id));

    Object.keys(EXPERT_OVERRIDES).forEach((expertId) => {
      expect(expertIds.has(expertId)).toBe(true);
    });
  });

  it('applies clean metadata for known experts', () => {
    const [gpt, lawyer, untouched] = applyExpertOverrides([
      createExpert('gpt'),
      createExpert('lawyer'),
      createExpert('no-override'),
    ]);

    expect(gpt.description).toBe('구조화, 글쓰기, 코드 작업을 두루 돕는 범용 AI');
    expect(gpt.sampleQuestions).toEqual([
      '이 주제를 한 번에 구조화해줘',
      '초안을 더 명확한 문장으로 다듬어줘',
      '복잡한 문제를 단계별로 풀어줘',
    ]);

    expect(lawyer.quote).toBe('문서의 모호함은 나중에 비용으로 돌아옵니다.');
    expect(lawyer.sampleQuestions).toHaveLength(3);

    expect(untouched.description).toBe('original description');
    expect(untouched.quote).toBe('original quote');
    expect(untouched.sampleQuestions).toEqual(['one', 'two', 'three']);
  });
});
