import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordUsage, getAllUsage, getTodayUsage, summarizeUsage, clearUsage,
} from '@/services/usageTracker';

describe('usageTracker', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('records and retrieves a single entry', () => {
    recordUsage({ provider: 'openai', model: 'gpt-4o-mini', inputTokens: 100, outputTokens: 50 });
    const all = getAllUsage();
    expect(all).toHaveLength(1);
    expect(all[0].provider).toBe('openai');
    expect(all[0].model).toBe('gpt-4o-mini');
    expect(all[0].inputTokens).toBe(100);
    expect(all[0].outputTokens).toBe(50);
    expect(all[0].id).toMatch(/^u_/);
    expect(typeof all[0].at).toBe('number');
  });

  it('returns latest-first ordering', () => {
    recordUsage({ provider: 'anthropic', model: 'a', inputTokens: 1, outputTokens: 0, at: 1000 });
    recordUsage({ provider: 'anthropic', model: 'b', inputTokens: 1, outputTokens: 0, at: 3000 });
    recordUsage({ provider: 'anthropic', model: 'c', inputTokens: 1, outputTokens: 0, at: 2000 });
    const all = getAllUsage();
    expect(all.map((e) => e.model)).toEqual(['b', 'c', 'a']);
  });

  it('getTodayUsage filters by day boundary', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    recordUsage({ provider: 'p', model: 'old', inputTokens: 1, outputTokens: 1, at: yesterday.getTime() });
    recordUsage({ provider: 'p', model: 'new', inputTokens: 1, outputTokens: 1 });
    const today = getTodayUsage();
    expect(today).toHaveLength(1);
    expect(today[0].model).toBe('new');
  });

  it('summarizeUsage aggregates by provider and model', () => {
    recordUsage({ provider: 'openai', model: 'gpt-4o', inputTokens: 10, outputTokens: 5, costUsd: 0.5 });
    recordUsage({ provider: 'openai', model: 'gpt-4o', inputTokens: 20, outputTokens: 15, costUsd: 1.0 });
    recordUsage({ provider: 'anthropic', model: 'claude', inputTokens: 30, outputTokens: 25, costUsd: 2.0 });
    const summary = summarizeUsage(getAllUsage());
    expect(summary.entries).toBe(3);
    expect(summary.inputTokens).toBe(60);
    expect(summary.outputTokens).toBe(45);
    expect(summary.totalTokens).toBe(105);
    expect(summary.costUsd).toBeCloseTo(3.5);
    expect(summary.byProvider.openai).toEqual({ inputTokens: 30, outputTokens: 20, costUsd: 1.5 });
    expect(summary.byProvider.anthropic).toEqual({ inputTokens: 30, outputTokens: 25, costUsd: 2.0 });
    expect(summary.byModel['gpt-4o'].inputTokens).toBe(30);
  });

  it('clearUsage removes all entries', () => {
    recordUsage({ provider: 'p', model: 'm', inputTokens: 1, outputTokens: 1 });
    expect(getAllUsage()).toHaveLength(1);
    clearUsage();
    expect(getAllUsage()).toHaveLength(0);
  });

  it('handles malformed storage gracefully', () => {
    window.localStorage.setItem('personai.usage_log.v1', '!!not-json');
    expect(getAllUsage()).toEqual([]);
  });

  it('filters out non-UsageEntry shapes', () => {
    window.localStorage.setItem(
      'personai.usage_log.v1',
      JSON.stringify([
        { at: 1, provider: 'p', model: 'm', inputTokens: 1, outputTokens: 1 },
        { invalid: true },
        null,
      ]),
    );
    const all = getAllUsage();
    expect(all).toHaveLength(1);
    expect(all[0].model).toBe('m');
  });
});
