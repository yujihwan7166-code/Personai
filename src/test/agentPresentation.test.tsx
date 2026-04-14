import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { isAiAgentId, isManagedAutoAgent } from '@/lib/aiAgent';
import { buildAgentResponsePrompt } from '@/lib/prompts/agentResponsePrompt';
import { AgentRichMarkdown } from '@/components/AgentRichMarkdown';

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
});
