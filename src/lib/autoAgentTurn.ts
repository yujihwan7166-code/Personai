import type { Dispatch, SetStateAction } from 'react';
import type { SearchSource, SearchSourcePayload, StreamExpertFn, StreamRequestFile } from '@/lib/chatStream';
import type { DiscussionMessage, DiscussionRound, Expert } from '@/types/expert';
import type { AutoAgentConfig } from '@/utils/agent/config';
import type { AgentPipelineOptions, AgentState, ClassificationResult } from '@/utils/agent/types';

type QuestionClassifierLoader = () => Promise<{ classifyQuestion: (message: string) => ClassificationResult }>;
type AgentPipelineFn = (options: AgentPipelineOptions) => Promise<void>;
type AgentPipelineLoader = () => Promise<{ runAgentPipeline: AgentPipelineFn }>;
type FakeAgentPipelineLoader = () => Promise<{ runFakeAgentPipeline: AgentPipelineFn }>;

export type RunAutoAgentTurnParams = {
  expert: Expert;
  question: string;
  files?: StreamRequestFile[];
  signal?: AbortSignal;
  autoConfig: AutoAgentConfig;
  setMessages: Dispatch<SetStateAction<DiscussionMessage[]>>;
  getExpertPrompt: (expert: Expert) => Promise<string>;
  streamExpert: StreamExpertFn;
  loadQuestionClassifier: QuestionClassifierLoader;
  loadAgentPipeline: AgentPipelineLoader;
  loadFakeAgentPipeline: FakeAgentPipelineLoader;
  safetyGuardrail: string;
  qualityGuardrail: string;
};

type RunAutoAgentTurnResult = {
  aborted: boolean;
};

function appendMessage(
  setMessages: Dispatch<SetStateAction<DiscussionMessage[]>>,
  message: DiscussionMessage,
) {
  setMessages((prev) => [...prev, message]);
}

function updateMessage(
  setMessages: Dispatch<SetStateAction<DiscussionMessage[]>>,
  messageId: string,
  updater: (message: DiscussionMessage) => DiscussionMessage,
) {
  setMessages((prev) => prev.map((message) => (
    message.id === messageId ? updater(message) : message
  )));
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

export async function runAutoAgentTurn({
  expert,
  question,
  files,
  signal,
  autoConfig,
  setMessages,
  getExpertPrompt,
  streamExpert,
  loadQuestionClassifier,
  loadAgentPipeline,
  loadFakeAgentPipeline,
  safetyGuardrail,
  qualityGuardrail,
}: RunAutoAgentTurnParams): Promise<RunAutoAgentTurnResult> {
  const agentModel = autoConfig.agentModel;
  const questionClassifier = autoConfig.fakeAgent
    ? null
    : await loadQuestionClassifier();
  const classification = questionClassifier?.classifyQuestion(question);
  const useAgentMode = autoConfig.fakeAgent
    ? true
    : classification?.mode === 'agent';

  if (classification) {
    console.log(`[AUTO ${expert.id}] Classification:`, JSON.stringify(classification), 'question:', question);
  }

  if (useAgentMode) {
    const messageId = `${expert.id}-agent-${Date.now()}`;
    const initialAgentState: AgentState = {
      status: 'analyzing',
      strategy: null,
      tasks: [],
      finalAnswer: '',
      totalTokensUsed: 0,
      elapsedMs: 0,
    };

    appendMessage(setMessages, {
      id: messageId,
      expertId: expert.id,
      content: '',
      isStreaming: true,
      agentState: initialAgentState,
    });

    let fullContent = '';

    try {
      const basePrompt = await getExpertPrompt(expert);
      const pipelineFn = autoConfig.fakeAgent
        ? (await loadFakeAgentPipeline()).runFakeAgentPipeline
        : (await loadAgentPipeline()).runAgentPipeline;

      await pipelineFn({
        message: question,
        model: agentModel,
        systemPrompt: safetyGuardrail + qualityGuardrail + basePrompt,
        onStateChange: (state) => {
          updateMessage(setMessages, messageId, (message) => ({
            ...message,
            agentState: { ...state },
          }));
        },
        onStreamToken: (token) => {
          fullContent += token;
          updateMessage(setMessages, messageId, (message) => ({
            ...message,
            content: fullContent,
          }));
        },
        signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        return { aborted: true };
      }

      fullContent = `⚠️ ${error instanceof Error ? error.message : '응답을 받아오지 못했어요.'}`;
    }

    updateMessage(setMessages, messageId, (message) => ({
      ...message,
      content: fullContent,
      isStreaming: false,
    }));

    return { aborted: false };
  }

  const messageId = `${expert.id}-general-${Date.now()}`;
  const cheapExpert = { ...expert, openrouterModel: agentModel };
  let fullContent = '';

  appendMessage(setMessages, {
    id: messageId,
    expertId: expert.id,
    content: '',
    isStreaming: true,
  });

  try {
    await streamExpert({
      question,
      expert: cheapExpert,
      previousResponses: [],
      round: 'initial',
      onDelta: (chunk) => {
        fullContent += chunk;
        updateMessage(setMessages, messageId, (message) => ({
          ...message,
          content: fullContent,
        }));
      },
      onDone: () => {
        updateMessage(setMessages, messageId, (message) => ({
          ...message,
          isStreaming: false,
        }));
      },
      signal,
      files,
      onSearchSources: (data) => {
        updateMessage(setMessages, messageId, (message) => ({
          ...message,
          searchSources: data,
        }));
      },
    });
  } catch (error) {
    if (isAbortError(error)) {
      return { aborted: true };
    }

    fullContent = `⚠️ ${error instanceof Error ? error.message : '응답을 받아오지 못했어요.'}`;
    updateMessage(setMessages, messageId, (message) => ({
      ...message,
      content: fullContent,
      isStreaming: false,
    }));
  }

  return { aborted: false };
}
