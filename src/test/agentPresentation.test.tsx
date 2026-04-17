import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { isAiAgentId, isManagedAutoAgent } from '@/lib/aiAgent';
import { buildAgentResponsePrompt } from '@/lib/prompts/agentResponsePrompt';
import { AgentRichMarkdown } from '@/components/AgentRichMarkdown';
import { DiscussionMessageCard } from '@/components/DiscussionMessage';
import type { AgentState } from '@/utils/agent/types';
import type { DiscussionMessage, Expert } from '@/types/expert';

describe('agent presentation helpers', () => {
  it('distinguishes ai agent ids from managed auto agents', () => {
    expect(isAiAgentId('auto-gpt')).toBe(true);
    expect(isAiAgentId('ancano-pro')).toBe(true);
    expect(isManagedAutoAgent('auto-gpt')).toBe(true);
    expect(isManagedAutoAgent('ancano-pro')).toBe(false);
    expect(isAiAgentId('gpt')).toBe(false);
  });

  it('builds phase and intent-aware agent response prompts', () => {
    const prompt = buildAgentResponsePrompt({
      agentId: 'auto-perplexity',
      phase: 'direct',
      intent: 'comparison',
    });

    expect(prompt).toContain('AI');
    expect(prompt).toContain('direct');
    expect(prompt).toContain('table');
    expect(prompt).toContain('comparison');
  });

  it('renders markdown tables, links, and code blocks for agent cards', () => {
    render(
      <AgentRichMarkdown
        content={[
          '### 비교표',
          '',
          '| 항목 | A | B |',
          '| --- | --- | --- |',
          '| 가격 | **10** | 20 |',
          '',
          '```ts',
          'const answer = 42;',
          '```',
          '',
          '[문서](https://example.com)',
        ].join('\n')}
      />,
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('가격')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('const answer = 42;')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '문서' })).toHaveAttribute('href', 'https://example.com');
  });

  it('keeps agent answers hidden until progress completes', () => {
    const expert: Expert = {
      id: 'auto-gpt',
      name: 'GPT',
      nameKo: 'GPT',
      icon: 'G',
      color: 'blue',
      description: 'test expert',
      category: 'ai',
      openrouterModel: 'openai/gpt-4.1-mini',
    };

    const agentState: AgentState = {
      status: 'processing',
      strategy: {
        type: 'deep_dive',
        reasoning: '질문별 공개 진행 단계를 생성합니다.',
        publicPlan: '유가 질문에 맞춰 자료 흐름과 변수를 점검합니다.',
        publicSteps: [
          '유가에 영향을 주는 변수부터 모으는 중',
          '유가의 공급 변수와 수요 변화를 나눠 보는 중',
          '유가에서 가능성 높은 흐름과 핵심 트리거를 정리하는 중',
        ],
        tasks: [],
      },
      tasks: [],
      finalAnswer: '',
      totalTokensUsed: 0,
      elapsedMs: 1200,
      agentBrand: 'auto-gpt',
      questionPattern: 'forecast_scenario',
      patternLabel: '전망 시나리오형',
      patternFocus: '유가 전망',
      patternSteps: [
        '유가에 영향을 주는 변수부터 모으는 중',
        '유가의 상방·중립·하방 시나리오를 나눠 보는 중',
        '유가에서 가능성 높은 흐름과 핵심 트리거를 정리하는 중',
      ],
      patternStageIndex: 1,
      generatedProgressSteps: true,
      canRevealAnswer: false,
      auxTags: ['search', 'forecast'],
    };

    const message: DiscussionMessage = {
      id: 'm1',
      expertId: 'auto-gpt',
      content: '숨겨져야 하는 최종 답변',
      isStreaming: true,
      agentState,
    };

    render(<DiscussionMessageCard message={message} expert={expert} variant="agent-card" />);

    expect(screen.queryByText('숨겨져야 하는 최종 답변')).not.toBeInTheDocument();
    expect(screen.getByText('유가에 영향을 주는 변수부터 모으는 중')).toBeInTheDocument();
  });

  it('prefers generated public steps over local pattern templates', () => {
    const expert: Expert = {
      id: 'auto-gpt',
      name: 'GPT',
      nameKo: 'GPT',
      icon: 'G',
      color: 'blue',
      description: 'test expert',
      category: 'ai',
      openrouterModel: 'openai/gpt-4.1-mini',
    };

    const agentState: AgentState = {
      status: 'processing',
      strategy: {
        type: 'deep_dive',
        reasoning: '질문별 공개 진행 단계를 생성합니다.',
        publicPlan: '유가 질문에 맞춰 자료 흐름과 변수를 점검합니다.',
        publicSteps: [
          '최근 공급 뉴스와 수요 흐름을 먼저 맞춰보는 중',
          'OPEC 발표와 경기 둔화 가능성을 나눠 보는 중',
          '답변에서 단정할 부분과 조심할 부분을 정리하는 중',
        ],
        tasks: [],
      },
      tasks: [],
      finalAnswer: '',
      totalTokensUsed: 0,
      elapsedMs: 1200,
      agentBrand: 'auto-gpt',
      questionPattern: 'forecast_scenario',
      patternLabel: '전망 시나리오형',
      patternFocus: '유가 전망',
      patternSteps: [
        '유가의 상방·중립·하방 시나리오를 분해 중',
        '유가에서 우세 가능성이 높은 경로와 트리거를 도출 중',
      ],
      patternStageIndex: 1,
      generatedProgressSteps: true,
      canRevealAnswer: false,
      auxTags: ['search', 'forecast'],
    };

    const message: DiscussionMessage = {
      id: 'm1',
      expertId: 'auto-gpt',
      content: '',
      isStreaming: true,
      agentState,
    };

    render(<DiscussionMessageCard message={message} expert={expert} variant="agent-card" />);

    expect(screen.getAllByText(/OPEC 발표와 경기 둔화 가능성/).length).toBeGreaterThan(0);
    expect(screen.queryByText('유가의 상방·중립·하방 시나리오를 분해 중')).not.toBeInTheDocument();
  });

  it('does not show local template steps before generated steps arrive', () => {
    const expert: Expert = {
      id: 'auto-gpt',
      name: 'GPT',
      nameKo: 'GPT',
      icon: 'G',
      color: 'blue',
      description: 'test expert',
      category: 'ai',
      openrouterModel: 'openai/gpt-4.1-mini',
    };

    const agentState: AgentState = {
      status: 'planning',
      strategy: null,
      tasks: [],
      finalAnswer: '',
      totalTokensUsed: 0,
      elapsedMs: 500,
      agentBrand: 'auto-gpt',
      questionPattern: 'forecast_scenario',
      patternLabel: '전망 시나리오형',
      patternFocus: '유가 전망',
      patternSteps: [
        '유가의 상방·중립·하방 시나리오를 분해 중',
        '유가에서 우세 가능성이 높은 경로와 트리거를 도출 중',
      ],
      patternStageIndex: 0,
      generatedProgressSteps: false,
      canRevealAnswer: false,
      auxTags: ['search', 'forecast'],
    };

    const message: DiscussionMessage = {
      id: 'm1',
      expertId: 'auto-gpt',
      content: '',
      isStreaming: true,
      agentState,
    };

    render(<DiscussionMessageCard message={message} expert={expert} variant="agent-card" />);

    expect(screen.queryByText('유가의 상방·중립·하방 시나리오를 분해 중')).not.toBeInTheDocument();
    expect(screen.getByLabelText('질문별 분석 절차 생성 중')).toBeInTheDocument();
  });
});
