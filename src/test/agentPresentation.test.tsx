import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { isAiAgentId } from '@/lib/aiAgent';
import { buildAgentResponsePrompt } from '@/lib/prompts/agentResponsePrompt';
import { AgentRichMarkdown } from '@/components/AgentRichMarkdown';

describe('agent presentation helpers', () => {
  it('identifies only configured AI agent ids', () => {
    expect(isAiAgentId('auto-gpt')).toBe(true);
    expect(isAiAgentId('ancano-pro')).toBe(true);
    expect(isAiAgentId('gpt')).toBe(false);
    expect(isAiAgentId('__user__')).toBe(false);
  });

  it('builds phase and intent-aware agent response prompts', () => {
    const prompt = buildAgentResponsePrompt({
      agentId: 'auto-perplexity',
      phase: 'direct',
      intent: 'comparison',
    });

    expect(prompt).toContain('AI 에이전트 응답 형식 규칙');
    expect(prompt).toContain('단일 모델이 직접 답하는 에이전트 응답');
    expect(prompt).toContain('비교 요청이면 마크다운 테이블을 우선 사용하세요.');
    expect(prompt).toContain('사실이나 최신 정보가 포함되면 근거 중심으로 서술하세요.');
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
});
