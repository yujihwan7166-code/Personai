import { describe, expect, it } from 'vitest';
import { classifyQuestionPattern } from '@/utils/agent/questionPattern';
import { buildQuestionPatternPlan, resolvePatternStageIndexFromProgress } from '@/utils/agent/questionPatternText';

describe('questionPattern', () => {
  it('classifies forecast prompts and adds search tags', () => {
    const context = classifyQuestionPattern('유가 전망이랑 금리 영향도 같이 봐줘');
    expect(context.pattern).toBe('forecast_scenario');
    expect(context.auxTags).toContain('search');
    expect(context.auxTags).toContain('forecast');
  });

  it('classifies comparison prompts and extracts both targets', () => {
    const context = classifyQuestionPattern('GPT와 Claude 비교해줘');
    expect(context.pattern).toBe('compare_choose');
    expect(context.compareTargets).toEqual(['GPT', 'Claude']);
  });

  it('leans strategy when the prompt asks for direction and roadmap', () => {
    const context = classifyQuestionPattern('신규 SaaS 시장 진입 전략과 로드맵 짜줘');
    expect(context.pattern).toBe('strategy_design');
  });

  it('leans procedure when the prompt asks for setup steps', () => {
    const context = classifyQuestionPattern('Vercel 배포 설정 방법 단계별로 알려줘');
    expect(context.pattern).toBe('procedure_execute');
  });

  it('uses review feedback for file-backed evaluation prompts', () => {
    const context = classifyQuestionPattern('이 문서 어때? 피드백해줘', { hasFiles: true });
    expect(context.pattern).toBe('review_feedback');
    expect(context.auxTags).toContain('file');
  });

  it('builds question-aware concept steps instead of generic labels', () => {
    const plan = buildQuestionPatternPlan(classifyQuestionPattern('양자컴퓨팅이 뭐야'));
    expect(plan.pattern).toBe('concept_explain');
    expect(plan.steps[0]).toContain('양자컴퓨팅');
    expect(plan.steps[1]).toContain('양자컴퓨팅');
  });

  it('varies phrasing deterministically by question seed', () => {
    const first = buildQuestionPatternPlan(classifyQuestionPattern('금리 인상이 물가에 미치는 원리 설명해줘'));
    const second = buildQuestionPatternPlan(classifyQuestionPattern('금리 인상이 물가에 미치는 원리 설명해줘'));
    const third = buildQuestionPatternPlan(classifyQuestionPattern('환율이 물가에 미치는 원리 설명해줘'));

    expect(first.steps).toEqual(second.steps);
    expect(first.steps).not.toEqual(third.steps);
  });

  it('maps progress states to later pattern stages', () => {
    expect(resolvePatternStageIndexFromProgress('analyzing', 4)).toBe(0);
    expect(resolvePatternStageIndexFromProgress('drafting', 4)).toBe(2);
    expect(resolvePatternStageIndexFromProgress('finalizing', 4)).toBe(3);
  });
});
