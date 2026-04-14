import type { Dispatch, SetStateAction } from 'react';
import type { SearchSourcePayload, StreamExpertFn, StreamRequestFile } from '@/lib/chatStream';
import { getDefaultProgress, type ResponseProgress } from '@/lib/responseProgress';
import type { DiscussionMessage, Expert } from '@/types/expert';
import type { AutoAgentConfig } from '@/utils/agent/config';
import { buildAgentResponsePrompt } from '@/lib/prompts/agentResponsePrompt';
import { getAgentStreamPresentation, inferAgentIntent } from '@/utils/agent/agentDisplay';
import type { AgentPipelineOptions, AgentState, ClassificationMode, ClassificationResult } from '@/utils/agent/types';

type QuestionClassifierLoader = () => Promise<{ classifyQuestion: (message: string) => ClassificationResult }>;
type AgentPipelineFn = (options: AgentPipelineOptions) => Promise<void>;
type AgentPipelineLoader = () => Promise<{ runAgentPipeline: AgentPipelineFn }>;

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

function compareComplexity(left: ClassificationMode, right: ClassificationMode) {
  const order: Record<ClassificationMode, number> = {
    simple: 0,
    standard: 1,
    deep: 2,
  };

  return order[left] - order[right];
}

function applyProgressFields(message: DiscussionMessage, progress: ResponseProgress): DiscussionMessage {
  return {
    ...message,
    responseState: progress.state,
    progressLabel: progress.label,
    progressDetail: progress.detail,
  };
}

function progressFromAgentState(state: AgentState): ResponseProgress {
  const presentation = getAgentStreamPresentation(state);

  switch (state.status) {
    case 'analyzing':
      return getDefaultProgress('analyzing', {
        label: presentation.analyzeLabel,
      });
    case 'planning':
      return getDefaultProgress('planning', {
        label: presentation.planningLabel,
        detail: state.strategy?.publicPlan,
      });
    case 'processing':
      return getDefaultProgress('processing', {
        label: presentation.headline,
      });
    case 'synthesizing':
      return getDefaultProgress('finalizing', {
        label: presentation.synthesizeLabel,
      });
    case 'reviewing':
      return getDefaultProgress('reviewing', {
        label: presentation.reviewLabel,
      });
    case 'complete':
      return getDefaultProgress('complete');
    case 'error':
      return getDefaultProgress('error', {
        label: '분석 단계를 단순화하고 바로 답변하는 중',
      });
    default:
      return getDefaultProgress('drafting');
  }
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
  safetyGuardrail,
  qualityGuardrail,
}: RunAutoAgentTurnParams): Promise<RunAutoAgentTurnResult> {
  const intentHint = inferAgentIntent(question);
  const classifier = await loadQuestionClassifier();
  const classification = classifier.classifyQuestion(question);
  const useAgentMode = autoConfig.enableAgent
    && compareComplexity(classification.mode, autoConfig.minComplexity) >= 0;

  console.log(`[AUTO ${expert.id}] Classification:`, JSON.stringify(classification), 'question:', question);

  if (useAgentMode) {
    const messageId = `${expert.id}-agent-${Date.now()}`;
    const initialAgentState: AgentState = {
      status: 'analyzing',
      strategy: null,
      tasks: [],
      finalAnswer: '',
      totalTokensUsed: 0,
      elapsedMs: 0,
      agentBrand: expert.id,
      intent: classification.intent ?? intentHint,
      complexityMode: classification.mode,
    };

    appendMessage(setMessages, applyProgressFields({
      id: messageId,
      expertId: expert.id,
      content: '',
      isStreaming: true,
      agentState: initialAgentState,
    }, progressFromAgentState(initialAgentState)));

    let fullContent = '';
    let failed = false;

    try {
      const basePrompt = await getExpertPrompt(expert);
      const agentResponsePrompt = buildAgentResponsePrompt({
        agentId: expert.id,
        phase: 'final',
        intent: classification.intent ?? intentHint,
      });
      const pipelineFn = (await loadAgentPipeline()).runAgentPipeline;

      await pipelineFn({
        message: question,
        model: autoConfig.finalModel,
        systemPrompt: safetyGuardrail + qualityGuardrail + basePrompt + agentResponsePrompt,
        expertId: expert.id,
        intentHint: classification.intent ?? intentHint,
        complexityMode: classification.mode,
        profile: autoConfig,
        onStateChange: (state) => {
          const progress = progressFromAgentState(state);
          updateMessage(setMessages, messageId, (message) => applyProgressFields({
            ...message,
            agentState: { ...state },
          }, progress));
        },
        onStreamToken: (token) => {
          fullContent += token;
          updateMessage(setMessages, messageId, (message) => ({
            ...message,
            content: fullContent,
          }));
        },
        onSearchSources: (data) => {
          updateMessage(setMessages, messageId, (message) => ({
            ...message,
            searchSources: data,
          }));
        },
        signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        return { aborted: true };
      }

      failed = true;
      fullContent = `⚠️ ${error instanceof Error ? error.message : '응답을 받아오지 못했어요.'}`;
      updateMessage(setMessages, messageId, (message) => applyProgressFields({
        ...message,
        agentState: message.agentState
          ? { ...message.agentState, status: 'error' }
          : message.agentState,
      }, getDefaultProgress('error')));
    }

    updateMessage(setMessages, messageId, (message) => ({
      ...message,
      content: fullContent,
      isStreaming: false,
      responseState: failed ? 'error' : 'complete',
    }));

    return { aborted: false };
  }

  const messageId = `${expert.id}-general-${Date.now()}`;
  const basePrompt = await getExpertPrompt(expert);
  const directExpert = {
    ...expert,
    openrouterModel: autoConfig.directModel || expert.openrouterModel,
    systemPrompt: `${basePrompt}${buildAgentResponsePrompt({
      agentId: expert.id,
      phase: 'direct',
      intent: classification.intent ?? intentHint,
    })}`,
  };
  let fullContent = '';

  appendMessage(setMessages, applyProgressFields({
    id: messageId,
    expertId: expert.id,
    content: '',
    isStreaming: true,
  }, getDefaultProgress('analyzing')));

  try {
    await streamExpert({
      question,
      expert: directExpert,
      previousResponses: [],
      round: 'initial',
      maxTokens: autoConfig.maxDirectTokens,
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
          responseState: 'complete',
        }));
      },
      onProgress: (progress) => {
        updateMessage(setMessages, messageId, (message) => applyProgressFields(message, progress));
      },
      searchPolicy: autoConfig.searchPolicy,
      signal,
      files,
      onSearchSources: (data: SearchSourcePayload) => {
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
    updateMessage(setMessages, messageId, (message) => applyProgressFields({
      ...message,
      content: fullContent,
      isStreaming: false,
    }, getDefaultProgress('error')));
  }

  return { aborted: false };
}
