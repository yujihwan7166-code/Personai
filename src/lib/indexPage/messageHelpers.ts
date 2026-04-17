import type { DiscussionMessage } from '@/types/expert';
import { getDefaultProgress, type ResponseProgress } from '@/lib/responseProgress';

export function progressFields(progress: ResponseProgress) {
  return {
    responseState: progress.state,
    progressLabel: progress.label,
    progressDetail: progress.detail,
  };
}

export function createStreamingMessage({
  id,
  expertId,
  content = '',
  progress = getDefaultProgress('analyzing'),
  ...rest
}: Pick<DiscussionMessage, 'id' | 'expertId'> & Partial<DiscussionMessage> & { progress?: ResponseProgress }): DiscussionMessage {
  return {
    id,
    expertId,
    content,
    isStreaming: true,
    ...progressFields(progress),
    ...rest,
  };
}
