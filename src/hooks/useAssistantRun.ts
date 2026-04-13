import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { StreamExpertFn } from '@/lib/chatStream';
import { buildAssistantExpert, type AssistantCard } from '@/types/assistant';
import type { DiscussionMessage } from '@/types/expert';

type SetMessages = Dispatch<SetStateAction<DiscussionMessage[]>>;
type SetActiveExpertId = Dispatch<SetStateAction<string | undefined>>;
type LoadPptGenerator = () => Promise<typeof import('@/lib/pptGenerator')>;

interface UseAssistantRunOptions {
  streamExpert: StreamExpertFn;
  setMessages: SetMessages;
  setActiveExpertId: SetActiveExpertId;
  loadPptGenerator: LoadPptGenerator;
}

interface RunAssistantParams {
  question: string;
  card: AssistantCard;
  signal: AbortSignal;
}

export function useAssistantRun({
  streamExpert,
  setMessages,
  setActiveExpertId,
  loadPptGenerator,
}: UseAssistantRunOptions) {
  const runAssistant = useCallback(async ({
    question,
    card,
    signal,
  }: RunAssistantParams) => {
    const baseExpert = buildAssistantExpert(card);
    const isPpt = card.id === 'ppt' || card.name.toLowerCase().includes('ppt');
    const pptTools = isPpt ? await loadPptGenerator() : null;
    const effectiveExpert = isPpt && pptTools?.PPT_SYSTEM_PROMPT
      ? { ...baseExpert, systemPrompt: pptTools.PPT_SYSTEM_PROMPT }
      : baseExpert;

    setActiveExpertId(baseExpert.id);

    const msgId = `${baseExpert.id}-assistant-${Date.now()}`;
    setMessages((prev) => [...prev, { id: msgId, expertId: baseExpert.id, content: '', isStreaming: true }]);

    let fullContent = '';

    try {
      await streamExpert({
        question,
        expert: effectiveExpert,
        previousResponses: [],
        round: 'initial',
        onDelta: (chunk) => {
          fullContent += chunk;
          setMessages((prev) => prev.map((message) => (
            message.id === msgId ? { ...message, content: fullContent } : message
          )));
        },
        onDone: () => {
          setMessages((prev) => prev.map((message) => (
            message.id === msgId ? { ...message, isStreaming: false } : message
          )));

          if (pptTools) {
            const pptData = pptTools.parsePptJson(fullContent);
            if (pptData) {
              const downloadId = `ppt-download-${Date.now()}`;
              setMessages((prev) => [
                ...prev,
                {
                  id: downloadId,
                  expertId: '__ppt_download__',
                  content: JSON.stringify(pptData),
                },
              ]);
            }
          }
        },
        signal,
      });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setMessages((prev) => prev.map((message) => (
          message.id === msgId
            ? {
                ...message,
                content: `⚠️ ${error instanceof Error ? error.message : '응답을 받아오지 못했어요.'}`,
                isStreaming: false,
              }
            : message
        )));
      }
    }
  }, [loadPptGenerator, setActiveExpertId, setMessages, streamExpert]);

  return { runAssistant };
}
