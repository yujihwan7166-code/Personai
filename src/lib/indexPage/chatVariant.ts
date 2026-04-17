import { getMainMode, type DiscussionMode } from '@/types/expert';
import { isManagedAutoAgent } from '@/lib/aiAgent';

export type DiscussionChatVariant =
  | 'default'
  | 'messenger'
  | 'general-card'
  | 'agent-card'
  | 'procon-pro'
  | 'procon-con'
  | 'postit'
  | 'hearing'
  | 'report';

export function getDiscussionChatVariant({
  discussionMode,
  expertId,
  proconStances,
}: {
  discussionMode: DiscussionMode;
  expertId?: string;
  proconStances: Record<string, 'pro' | 'con'>;
}): DiscussionChatVariant {
  const mainMode = getMainMode(discussionMode);

  if (mainMode === 'general') {
    return isManagedAutoAgent(expertId) ? 'agent-card' : 'general-card';
  }

  if (discussionMode === 'brainstorm') return 'postit';
  if (discussionMode === 'hearing') return 'hearing';
  if (discussionMode === 'expert') return 'report';

  if (discussionMode === 'procon') {
    if (expertId && proconStances[expertId] === 'pro') return 'procon-pro';
    if (expertId && proconStances[expertId] === 'con') return 'procon-con';
    return 'default';
  }

  return 'default';
}
