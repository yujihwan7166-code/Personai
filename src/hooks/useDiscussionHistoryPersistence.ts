import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import { upsertDiscussionHistory, type DiscussionRecord } from '@/lib/discussionHistoryStore';
import type { DiscussionMessage, DiscussionMode } from '@/types/expert';

type SetState<T> = Dispatch<SetStateAction<T>>;

interface UseDiscussionHistoryPersistenceOptions {
  messages: DiscussionMessage[];
  currentQuestion: string;
  discussionMode: DiscussionMode;
  selectedExpertIds: string[];
  selectedAssistantCardId?: string | null;
  proconStances: Record<string, 'pro' | 'con'>;
  isDiscussing: boolean;
  sessionIdRef: MutableRefObject<string>;
  sessionTitleRef: MutableRefObject<string>;
  summaryCountRef: MutableRefObject<number>;
  skipClarifyRef: MutableRefObject<boolean>;
  setCurrentQuestion: SetState<string>;
  setMessages: SetState<DiscussionMessage[]>;
  setDiscussionMode: SetState<DiscussionMode>;
  setSelectedExpertIds: SetState<string[]>;
  setSelectedAssistantCard: (cardId: string | null) => void;
  setProconStances: SetState<Record<string, 'pro' | 'con'>>;
  setIsDiscussing: SetState<boolean>;
  setActiveExpertId: SetState<string | undefined>;
  abortCurrentDiscussion: () => void;
}

export function useDiscussionHistoryPersistence({
  messages,
  currentQuestion,
  discussionMode,
  selectedExpertIds,
  selectedAssistantCardId,
  proconStances,
  isDiscussing,
  sessionIdRef,
  sessionTitleRef,
  summaryCountRef,
  skipClarifyRef,
  setCurrentQuestion,
  setMessages,
  setDiscussionMode,
  setSelectedExpertIds,
  setSelectedAssistantCard,
  setProconStances,
  setIsDiscussing,
  setActiveExpertId,
  abortCurrentDiscussion,
}: UseDiscussionHistoryPersistenceOptions) {
  const buildHistoryRecord = useCallback((): Omit<DiscussionRecord, 'id' | 'timestamp'> => ({
    question: sessionTitleRef.current || currentQuestion,
    mode: discussionMode,
    messages: messages.map((message) => ({ ...message, isStreaming: false })),
    expertIds: selectedExpertIds,
    assistantCardId: selectedAssistantCardId ?? undefined,
    proconStances,
  }), [
    currentQuestion,
    discussionMode,
    messages,
    proconStances,
    selectedAssistantCardId,
    selectedExpertIds,
    sessionTitleRef,
  ]);

  const autoSaveCurrentChat = useCallback(() => {
    if (messages.length > 0 && (sessionTitleRef.current || currentQuestion)) {
      upsertDiscussionHistory(sessionIdRef.current, buildHistoryRecord());
    }
  }, [buildHistoryRecord, currentQuestion, messages.length, sessionIdRef, sessionTitleRef]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      autoSaveCurrentChat();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [autoSaveCurrentChat]);

  useEffect(() => {
    if (!isDiscussing && messages.length > 0 && currentQuestion) {
      upsertDiscussionHistory(sessionIdRef.current, buildHistoryRecord());
    }
  }, [buildHistoryRecord, currentQuestion, isDiscussing, messages.length, sessionIdRef]);

  const loadHistory = useCallback((record: DiscussionRecord) => {
    autoSaveCurrentChat();

    if (isDiscussing) {
      abortCurrentDiscussion();
    }

    setCurrentQuestion(record.question);
    setMessages(record.messages);
    setDiscussionMode(record.mode);
    setSelectedExpertIds(record.expertIds || []);
    setSelectedAssistantCard(record.assistantCardId ?? null);
    setProconStances(record.proconStances || {});
    setIsDiscussing(false);
    setActiveExpertId(undefined);
    sessionIdRef.current = record.id;
    sessionTitleRef.current = record.question;
    summaryCountRef.current = 0;
    skipClarifyRef.current = true;
  }, [
    abortCurrentDiscussion,
    autoSaveCurrentChat,
    isDiscussing,
    sessionIdRef,
    sessionTitleRef,
    setActiveExpertId,
    setCurrentQuestion,
    setDiscussionMode,
    setIsDiscussing,
    setMessages,
    setProconStances,
    setSelectedAssistantCard,
    setSelectedExpertIds,
    skipClarifyRef,
    summaryCountRef,
  ]);

  return {
    autoSaveCurrentChat,
    loadHistory,
  };
}
