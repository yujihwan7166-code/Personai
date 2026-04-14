import { describe, expect, it } from 'vitest';
import {
  attachPublicNotes,
  buildFakeAgentStrategy,
  getAgentStreamPresentation,
  inferAgentIntent,
} from '@/utils/agent/agentDisplay';
import type { AgentState, AgentTask } from '@/utils/agent/types';

function createTask(overrides?: Partial<AgentTask>): AgentTask {
  return {
    id: 't1',
    label: '기본 분석',
    status: 'pending',
    result: '',
    ...overrides,
  };
}

function createState(overrides?: Partial<AgentState>): AgentState {
  return {
    status: 'analyzing',
    strategy: null,
    tasks: [],
    finalAnswer: '',
    totalTokensUsed: 0,
    elapsedMs: 2400,
    ...overrides,
  };
}

describe('agentDisplay helpers', () => {
  it('infers comparison and step intents from Korean prompts', () => {
    expect(inferAgentIntent('GPT와 Claude 차이 비교해줘')).toBe('comparison');
    expect(inferAgentIntent('배포 순서를 단계별로 알려줘')).toBe('step_by_step');
  });

  it('infers pros/cons and deep-dive intents from Korean prompts', () => {
    expect(inferAgentIntent('원격근무 도입해야 할까? 장단점도 같이')).toBe('pros_cons');
    expect(inferAgentIntent('이 문제의 원인과 구조를 깊게 분석해줘')).toBe('deep_dive');
  });

  it('builds fake strategies with public plan and three tasks', () => {
    const strategy = buildFakeAgentStrategy('GPT와 Claude 비교해줘', 'auto-gpt');

    expect(strategy.type).toBe('comparison');
    expect(strategy.reasoning).toContain('GPT');
    expect(strategy.publicPlan).toContain('비교형');
    expect(strategy.tasks).toHaveLength(3);
    expect(strategy.tasks.map((task) => task.label)).toEqual([
      '비교 기준 정리',
      '항목별 차이 검토',
      '상황별 추천 정리',
    ]);
  });

  it('attaches fallback public notes without overwriting existing notes', () => {
    const tasks = attachPublicNotes([
      createTask({ id: 't1', label: '비교 기준 정리' }),
      createTask({ id: 't2', label: '항목별 차이 검토', publicNote: '이미 계산한 메모' }),
    ], 'comparison');

    expect(tasks[0]?.publicNote).toBe('비교 축을 3개 안팎으로 확정했습니다.');
    expect(tasks[1]?.publicNote).toBe('이미 계산한 메모');
  });

  it('builds running presentation with planning and review labels', () => {
    const presentation = getAgentStreamPresentation(createState({
      status: 'processing',
      agentBrand: 'auto-claude',
      intent: 'pros_cons',
      strategy: {
        type: 'pros_cons',
        reasoning: '',
        publicPlan: '찬반 기준을 나눠 본 뒤 결론을 정리합니다.',
        publicSteps: [],
        tasks: [],
      },
      tasks: [
        createTask({ id: 't1', label: '찬성 근거 정리', status: 'done' }),
        createTask({ id: 't2', label: '반대 근거 검토', status: 'running' }),
      ],
    }));

    expect(presentation.agentLabel).toBe('Claude');
    expect(presentation.intentLabel).toBe('찬반형 검토');
    expect(presentation.headline).toBe('반대 근거 검토 중');
    expect(presentation.planningLabel).toContain('찬반 기준');
    expect(presentation.reviewLabel).toContain('보강');
  });

  it('builds completion summaries with elapsed time and task count', () => {
    const presentation = getAgentStreamPresentation(createState({
      status: 'complete',
      agentBrand: 'auto-perplexity',
      intent: 'deep_dive',
      elapsedMs: 4200,
      tasks: [
        createTask({ id: 't1', status: 'done' }),
        createTask({ id: 't2', status: 'done' }),
        createTask({ id: 't3', status: 'done' }),
      ],
    }));

    expect(presentation.completeLabel).toBe('Perplexity · 심층 분석 · 3단계 완료 · 4.2초');
    expect(presentation.headline).toBe('심층 분석 정리를 마쳤습니다.');
  });
});
