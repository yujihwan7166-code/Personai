import { describe, expect, it } from 'vitest';
import {
  resolveFinalTokenBudget,
  resolveReviewThreshold,
  resolveSearchPolicy,
  resolveTaskBudget,
  shouldRunReviewPass,
} from '@/utils/agent/agentPolicy';
import { AUTO_AGENT_CONFIG } from '@/utils/agent/config';

describe('agentPolicy', () => {
  it('respects explicit never search policy', () => {
    expect(resolveSearchPolicy('never', true)).toBe('never');
  });

  it('upgrades search policy when search is needed', () => {
    expect(resolveSearchPolicy('auto', true)).toBe('always');
    expect(resolveSearchPolicy('auto', false)).toBe('auto');
  });

  it('expands budgets for deep premium agents', () => {
    const profile = AUTO_AGENT_CONFIG['auto-gpt'];

    expect(resolveTaskBudget(profile, 'deep')).toBeGreaterThanOrEqual(profile.maxTasks);
    expect(resolveFinalTokenBudget(profile, 'deep')).toBeGreaterThan(profile.maxFinalTokens);
    expect(resolveReviewThreshold(profile, 'deep')).toBeGreaterThan(profile.reviewMinChars);
  });

  it('requests a review pass for short deep answers', () => {
    expect(shouldRunReviewPass('짧은 답변', 'comparison', 'deep', 1000)).toBe(true);
    expect(shouldRunReviewPass('충분히 긴 답변'.repeat(200), 'comparison', 'standard', 200)).toBe(false);
  });
});
