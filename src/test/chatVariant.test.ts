import { describe, expect, it } from 'vitest';
import { getDiscussionChatVariant } from '@/lib/indexPage/chatVariant';

describe('chatVariant helper', () => {
  it('keeps managed auto agents on agent cards in general mode', () => {
    expect(getDiscussionChatVariant({
      discussionMode: 'general',
      expertId: 'auto-gpt',
      proconStances: {},
    })).toBe('agent-card');
  });

  it('keeps non-managed experts on general cards in general mode', () => {
    expect(getDiscussionChatVariant({
      discussionMode: 'general',
      expertId: 'gpt',
      proconStances: {},
    })).toBe('general-card');
  });

  it('maps procon stances to left and right variants', () => {
    expect(getDiscussionChatVariant({
      discussionMode: 'procon',
      expertId: 'alpha',
      proconStances: { alpha: 'pro' },
    })).toBe('procon-pro');

    expect(getDiscussionChatVariant({
      discussionMode: 'procon',
      expertId: 'beta',
      proconStances: { beta: 'con' },
    })).toBe('procon-con');
  });
});
