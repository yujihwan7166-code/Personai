import type { Dispatch, SetStateAction } from 'react';
import type { SearchSourcePayload, StreamExpertFn, StreamRequestFile } from '@/lib/chatStream';
import { getDefaultProgress, type ResponseProgress, type ResponseState } from '@/lib/responseProgress';
import type { DiscussionMessage, Expert } from '@/types/expert';
import type { AutoAgentConfig } from '@/utils/agent/config';
import { buildAgentResponsePrompt } from '@/lib/prompts/agentResponsePrompt';
import { getAgentStreamPresentation, inferAgentIntent } from '@/utils/agent/agentDisplay';
import { classifyQuestionPattern } from '@/utils/agent/questionPattern';
import { buildQuestionPatternPlan, resolvePatternStageIndexFromProgress } from '@/utils/agent/questionPatternText';
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
  placeholderMessageId?: string;
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
        label: '분석 절차를 축약하고 응답 생성을 이어가고 있습니다.',
      });
    default:
      return getDefaultProgress('drafting');
  }
}

function progressStateToAgentStatus(state: ResponseState): AgentState['status'] {
  switch (state) {
    case 'queued':
    case 'analyzing':
      return 'analyzing';
    case 'searching':
    case 'planning':
      return 'planning';
    case 'processing':
    case 'drafting':
      return 'processing';
    case 'reviewing':
      return 'reviewing';
    case 'finalizing':
      return 'synthesizing';
    case 'complete':
      return 'complete';
    case 'error':
      return 'error';
    default:
      return 'processing';
  }
}

function buildPatternAgentState(params: {
  expertId: string;
  intent: ClassificationResult['intent'];
  intentHint: ReturnType<typeof inferAgentIntent>;
  complexityMode: ClassificationMode;
  patternPlan: ReturnType<typeof buildQuestionPatternPlan>;
}): AgentState {
  const { expertId, intent, intentHint, complexityMode, patternPlan } = params;

  return {
    status: 'analyzing',
    strategy: null,
    tasks: [],
    finalAnswer: '',
    totalTokensUsed: 0,
    elapsedMs: 0,
    agentBrand: expertId,
    intent: intent ?? intentHint,
    complexityMode,
    questionPattern: patternPlan.pattern,
    patternLabel: patternPlan.label,
    patternFocus: patternPlan.focusLabel,
    patternSteps: patternPlan.steps,
    patternStageIndex: 0,
    generatedProgressSteps: false,
    canRevealAnswer: false,
    auxTags: patternPlan.auxTags,
  };
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
  placeholderMessageId,
}: RunAutoAgentTurnParams): Promise<RunAutoAgentTurnResult> {
  const intentHint = inferAgentIntent(question);
  const patternContext = classifyQuestionPattern(question, { hasFiles: Boolean(files?.length) });
  const patternPlan = buildQuestionPatternPlan(patternContext);
  const classifier = await loadQuestionClassifier();
  const classification = classifier.classifyQuestion(question);
  const useAgentMode = autoConfig.enableAgent
    && compareComplexity(classification.mode, autoConfig.minComplexity) >= 0;

  console.log(`[AUTO ${expert.id}] Classification:`, JSON.stringify(classification), 'question:', question);

  if (useAgentMode) {
    const messageId = placeholderMessageId ?? `${expert.id}-agent-${Date.now()}`;
    const initialAgentState = buildPatternAgentState({
      expertId: expert.id,
      intent: classification.intent,
      intentHint,
      complexityMode: classification.mode,
      patternPlan,
    });

    const initialMessage = applyProgressFields({
      id: messageId,
      expertId: expert.id,
      content: '',
      isStreaming: true,
      agentState: initialAgentState,
    }, progressFromAgentState(initialAgentState));

    if (placeholderMessageId) {
      updateMessage(setMessages, messageId, () => initialMessage);
    } else {
      appendMessage(setMessages, initialMessage);
    }

    let fullContent = '';
    let revealStarted = false;
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
        questionPattern: patternPlan.pattern,
        patternLabel: patternPlan.label,
        patternFocus: patternPlan.focusLabel,
        patternSteps: patternPlan.steps,
        auxTags: patternPlan.auxTags,
        needsSearchHint: classification.needsSearch,
        profile: autoConfig,
        onStateChange: (state) => {
          const progress = progressFromAgentState(state);
          revealStarted = revealStarted || Boolean(state.canRevealAnswer);
          const canRevealAnswer = revealStarted;
          updateMessage(setMessages, messageId, (message) => applyProgressFields({
            ...message,
            content: canRevealAnswer ? fullContent : '',
            isStreaming: canRevealAnswer ? true : message.isStreaming,
            agentState: {
              ...state,
              canRevealAnswer,
            },
          }, progress));
        },
        onStreamToken: (token) => {
          fullContent += token;
          if (!revealStarted) {
            return;
          }

          updateMessage(setMessages, messageId, (message) => ({
            ...message,
            content: fullContent,
            isStreaming: true,
            agentState: message.agentState
              ? {
                  ...message.agentState,
                  status: 'complete',
                  canRevealAnswer: true,
                  patternStageIndex: message.agentState.patternSteps?.length
                    ? message.agentState.patternSteps.length - 1
                    : message.agentState.patternStageIndex,
                }
              : message.agentState,
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
          ? {
              ...message.agentState,
              status: 'error',
              canRevealAnswer: true,
              patternStageIndex: message.agentState.patternSteps?.length
                ? message.agentState.patternSteps.length - 1
                : message.agentState.patternStageIndex,
            }
          : message.agentState,
      }, getDefaultProgress('error')));
    }

    updateMessage(setMessages, messageId, (message) => ({
      ...message,
      content: fullContent,
      isStreaming: false,
      responseState: failed ? 'error' : 'complete',
      agentState: message.agentState
        ? {
            ...message.agentState,
            canRevealAnswer: true,
            patternStageIndex: message.agentState.patternSteps?.length
              ? message.agentState.patternSteps.length - 1
              : message.agentState.patternStageIndex,
          }
        : message.agentState,
    }));

    return { aborted: false };
  }

  const messageId = placeholderMessageId ?? `${expert.id}-general-${Date.now()}`;
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
  const initialDirectAgentState = buildPatternAgentState({
    expertId: expert.id,
    intent: classification.intent,
    intentHint,
    complexityMode: classification.mode,
    patternPlan,
  });
  let fullContent = '';
  const directStart = Date.now();
  let directRevealStarted = false;
  let directFailed = false;

  const initialDirectMessage = applyProgressFields({
    id: messageId,
    expertId: expert.id,
    content: '',
    isStreaming: true,
    agentState: initialDirectAgentState,
  }, getDefaultProgress('analyzing'));

  if (placeholderMessageId) {
    updateMessage(setMessages, messageId, () => initialDirectMessage);
  } else {
    appendMessage(setMessages, initialDirectMessage);
  }

  try {
    await streamExpert({
      question,
      expert: directExpert,
      previousResponses: [],
      round: 'initial',
      maxTokens: autoConfig.maxDirectTokens,
      onDelta: (chunk) => {
        fullContent += chunk;
        directRevealStarted = true;

        updateMessage(setMessages, messageId, (message) => ({
          ...message,
          content: fullContent,
          isStreaming: true,
          agentState: message.agentState
            ? {
                ...message.agentState,
                status: 'complete',
                elapsedMs: Date.now() - directStart,
                canRevealAnswer: true,
                patternStageIndex: patternPlan.steps.length - 1,
              }
            : message.agentState,
        }));
      },
      onDone: () => {},
      onProgress: (progress) => {
        const canRevealAnswer = directRevealStarted || progress.state === 'complete';
        updateMessage(setMessages, messageId, (message) => applyProgressFields({
          ...message,
          agentState: message.agentState
            ? {
                ...message.agentState,
                status: canRevealAnswer ? 'complete' : progressStateToAgentStatus(progress.state),
                elapsedMs: Date.now() - directStart,
                patternStageIndex: canRevealAnswer
                  ? patternPlan.steps.length - 1
                  : resolvePatternStageIndexFromProgress(progress.state, patternPlan.steps.length),
                canRevealAnswer,
              }
            : message.agentState,
        }, progress));
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
    directFailed = true;
    updateMessage(setMessages, messageId, (message) => applyProgressFields({
      ...message,
      content: fullContent,
      isStreaming: false,
      agentState: message.agentState
        ? {
            ...message.agentState,
            status: 'error',
            elapsedMs: Date.now() - directStart,
            canRevealAnswer: true,
            patternStageIndex: message.agentState.patternSteps?.length
              ? message.agentState.patternSteps.length - 1
              : message.agentState.patternStageIndex,
          }
        : message.agentState,
    }, getDefaultProgress('error')));
  }

  if (!directFailed) {
    updateMessage(setMessages, messageId, (message) => ({
      ...message,
      content: fullContent,
      isStreaming: false,
      responseState: 'complete',
      agentState: message.agentState
        ? {
            ...message.agentState,
            status: 'complete',
            elapsedMs: Date.now() - directStart,
            canRevealAnswer: true,
            patternStageIndex: patternPlan.steps.length - 1,
          }
        : message.agentState,
    }));
  }

  return { aborted: false };
}
