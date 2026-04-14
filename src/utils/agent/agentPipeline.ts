import type {
  AgentPipelineOptions,
  AgentState,
  AgentStrategy,
  AgentTask,
  ClassificationMode,
  StrategyType,
} from './types';
import { attachPublicNotes, buildFakeAgentStrategy } from './agentDisplay';
import { streamSseContent } from './streamSseContent';

const AGENT_STEP_URL = '/api/chat?mode=agent-step';
const CHAT_URL = '/api/chat';
const PIPELINE_TIMEOUT_MS = 45_000;

const STEP1_SYSTEM = `당신은 질문을 여러 단계로 풀어내는 AI 에이전트의 플래너입니다.
사용자 질문을 보고 어떤 방식으로 답해야 가장 좋은지 먼저 정한 뒤, 실제로 병렬 실행할 작업들을 JSON으로 설계하세요.

반드시 지켜야 할 규칙:
- tasks는 최소 2개, 최대 4개
- 각 task는 서로 다른 관점이나 역할을 가져야 함
- label은 UI에 그대로 노출될 수 있게 짧고 명확한 한국어
- prompt는 해당 작업을 독립적으로 수행할 수 있을 만큼 구체적이어야 함
- publicPlan은 사용자가 봐도 되는 공개용 한 줄 계획
- publicSteps는 사용자가 보는 진행 단계 설명 2~4개

전략 유형:
- multi_perspective: 여러 관점 통합
- comparison: 둘 이상 비교
- step_by_step: 단계별 안내
- pros_cons: 장단점/찬반 검토
- deep_dive: 원인, 구조, 맥락까지 깊이 파고드는 분석

응답은 JSON만 출력:
{
  "type": "comparison",
  "reasoning": "어떤 기준으로 답변할지 짧게 설명",
  "publicPlan": "사용자에게 보여줄 한 줄 계획",
  "publicSteps": ["단계1", "단계2", "단계3"],
  "needsSearch": true,
  "depth": "deep",
  "tasks": [
    { "id": "t1", "label": "비교 기준 정리", "prompt": "..." },
    { "id": "t2", "label": "차이점 분석", "prompt": "..." }
  ]
}`;

const STEP2_SYSTEM = `당신은 에이전트의 개별 분석 담당입니다.
주어진 작업 하나만 깊고 구체적으로 수행하세요.
불필요한 서론 없이 바로 본론으로 들어가고, 근거/수치/예시가 있으면 적극 활용하세요.`;

const STEP3_SYSTEM = `당신은 여러 개의 분석 결과를 종합하는 최종 작성 담당입니다.
사용자 질문에 직접 답하는 완성된 최종 답변을 작성하세요.

규칙:
- 첫 문장부터 결론 또는 핵심 판단 제시
- 필요한 경우 소제목, 번호 목록, 표 사용
- 여러 분석의 차이와 공통점을 자연스럽게 통합
- 비교/전망/전략 질문은 결론, 근거, 적용 포인트를 모두 포함
- 너무 짧게 끝내지 말고 충분한 설명과 맥락을 담을 것`;

const REVIEW_SYSTEM = `당신은 최종 답변의 품질 검토자입니다.
이미 작성된 답변이 너무 짧거나 맥락이 부족하면, 빠진 핵심만 보강해서 이어붙일 추가 단락을 작성하세요.

규칙:
- 기존 답변을 반복하지 말고 부족한 부분만 보강
- 비교 질문이면 "어떤 상황에서 무엇을 고를지"를 보강
- 전망/분석 질문이면 근거와 변수, 예외까지 보강
- 결과는 이어붙일 텍스트만 출력`;

type AgentStepResult = {
  content: string;
  tokensUsed: number;
};

function parseStrategyJson(raw: string): AgentStrategy | null {
  const direct = raw.trim();
  try {
    return JSON.parse(direct);
  } catch {
    const fencedMatch = direct.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (!fencedMatch) {
      return null;
    }

    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch {
      return null;
    }
  }
}

function normalizeStrategy(
  strategy: AgentStrategy | null,
  fallbackMessage: string,
  intentHint?: StrategyType,
  complexityMode: ClassificationMode = 'standard',
  maxTasks = 4,
): AgentStrategy {
  const fallback = buildFakeAgentStrategy(fallbackMessage, undefined, intentHint);
  const resolved = strategy && Array.isArray(strategy.tasks) && strategy.tasks.length > 0
    ? strategy
    : fallback;

  const tasks = resolved.tasks
    .filter((task) => task?.id && task?.label && task?.prompt)
    .slice(0, Math.max(2, maxTasks));

  return {
    ...resolved,
    type: resolved.type ?? fallback.type,
    reasoning: resolved.reasoning || fallback.reasoning,
    publicPlan: resolved.publicPlan || fallback.reasoning,
    publicSteps: resolved.publicSteps?.slice(0, 4) ?? tasks.map((task) => task.label).slice(0, 4),
    needsSearch: typeof resolved.needsSearch === 'boolean' ? resolved.needsSearch : undefined,
    depth: resolved.depth ?? complexityMode,
    tasks: tasks.length > 0 ? tasks : fallback.tasks.slice(0, Math.max(2, maxTasks)),
  };
}

async function callAgentStep(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  maxTokens: number,
  temperature: number,
  signal?: AbortSignal,
): Promise<AgentStepResult> {
  const response = await fetch(AGENT_STEP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt,
      userPrompt,
      model,
      maxTokens,
      temperature,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Agent step failed: ${response.status}`);
  }

  return response.json();
}

function combineAbortSignals(...signals: AbortSignal[]) {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }

    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }

  return controller.signal;
}

function shouldRunReviewPass(
  answer: string,
  strategyType: StrategyType,
  complexityMode: ClassificationMode,
  minChars: number,
) {
  if (answer.trim().length >= minChars) {
    return false;
  }

  if (complexityMode === 'deep') {
    return true;
  }

  return ['comparison', 'deep_dive', 'multi_perspective', 'pros_cons'].includes(strategyType);
}

function buildReviewPrompt(message: string, answer: string, strategyType: StrategyType) {
  return [
    `원래 질문: ${message}`,
    '',
    `전략 유형: ${strategyType}`,
    '',
    '현재 초안:',
    answer,
    '',
    '부족한 설명만 추가 단락으로 보강하세요.',
  ].join('\n');
}

function resolveSearchPolicy(
  profileSearchPolicy: 'auto' | 'always' | 'never' | undefined,
  needsSearch?: boolean,
) {
  if (profileSearchPolicy === 'never') {
    return 'never' as const;
  }

  if (needsSearch || profileSearchPolicy === 'always') {
    return 'always' as const;
  }

  return 'auto' as const;
}

function resolveTaskBudget(
  profile: AgentPipelineOptions['profile'],
  complexityMode: ClassificationMode,
) {
  const base = profile?.maxTasks ?? 4;
  const qualityTier = profile?.qualityTier ?? 'balanced';

  if (complexityMode === 'deep') {
    return Math.min(base + (qualityTier === 'premium' || qualityTier === 'search-first' ? 1 : 0), 6);
  }

  if (qualityTier === 'premium') {
    return Math.min(base + 1, 5);
  }

  return base;
}

function resolveFinalTokenBudget(
  profile: AgentPipelineOptions['profile'],
  complexityMode: ClassificationMode,
) {
  const base = profile?.maxFinalTokens ?? 2400;
  const qualityTier = profile?.qualityTier ?? 'balanced';

  if (complexityMode === 'deep') {
    return Math.min(base + (qualityTier === 'premium' ? 600 : 450), 4096);
  }

  if (qualityTier === 'search-first') {
    return Math.min(base + 250, 4096);
  }

  return base;
}

function resolveReviewThreshold(
  profile: AgentPipelineOptions['profile'],
  complexityMode: ClassificationMode,
) {
  const base = profile?.reviewMinChars ?? 800;
  const qualityTier = profile?.qualityTier ?? 'balanced';

  if (complexityMode === 'deep') {
    return base + (qualityTier === 'premium' ? 220 : 140);
  }

  if (qualityTier === 'search-first') {
    return base + 80;
  }

  return base;
}

export async function runAgentPipeline(options: AgentPipelineOptions): Promise<void> {
  const {
    message,
    model,
    systemPrompt,
    onStateChange,
    onStreamToken,
    signal,
    expertId,
    intentHint,
    complexityMode = 'standard',
    profile,
    onSearchSources,
  } = options;

  const plannerModel = profile?.plannerModel ?? model;
  const workerModel = profile?.workerModel ?? model;
  const finalModel = profile?.finalModel ?? model;
  const reviewModel = profile?.reviewModel ?? finalModel;
  const maxTasks = resolveTaskBudget(profile, complexityMode);
  const maxFinalTokens = resolveFinalTokenBudget(profile, complexityMode);
  const reviewMinChars = resolveReviewThreshold(profile, complexityMode);

  const startTime = Date.now();
  let displayTasks: AgentTask[] = [];

  const state: AgentState = {
    status: 'analyzing',
    strategy: null,
    tasks: [],
    finalAnswer: '',
    totalTokensUsed: 0,
    elapsedMs: 0,
    agentBrand: expertId,
    intent: intentHint,
    complexityMode,
  };

  const updateState = (partial: Partial<AgentState>) => {
    Object.assign(state, partial, { elapsedMs: Date.now() - startTime });
    onStateChange({ ...state });
  };

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), PIPELINE_TIMEOUT_MS);
  const combinedSignal = signal
    ? combineAbortSignals(signal, timeoutController.signal)
    : timeoutController.signal;

  try {
    updateState({ status: 'analyzing' });

    let strategy = normalizeStrategy(null, message, intentHint, complexityMode, maxTasks);

    try {
      updateState({ status: 'planning' });
      const step1 = await callAgentStep(
        STEP1_SYSTEM,
        message,
        plannerModel,
        900,
        0.2,
        combinedSignal,
      );
      state.totalTokensUsed += step1.tokensUsed;
      strategy = normalizeStrategy(parseStrategyJson(step1.content), message, intentHint, complexityMode, maxTasks);
    } catch (error) {
      console.warn('[AgentPipeline] Step 1 failed, using fallback strategy:', error);
    }

    const baseTasks: AgentTask[] = strategy.tasks.map((task) => ({
      id: task.id,
      label: task.label,
      status: 'pending',
      result: '',
    }));
    displayTasks = attachPublicNotes(baseTasks, strategy.type);

    updateState({
      status: 'processing',
      strategy,
      tasks: [...displayTasks],
      intent: strategy.type,
      complexityMode: strategy.depth ?? complexityMode,
    });

    const taskPromises = displayTasks.map(async (task, index) => {
      const taskDef = strategy.tasks[index];
      if (!taskDef) {
        return;
      }

      displayTasks[index] = {
        ...displayTasks[index],
        status: 'running',
        startedAt: Date.now(),
      };
      updateState({ tasks: [...displayTasks] });

      try {
        const result = await callAgentStep(
          STEP2_SYSTEM,
          taskDef.prompt,
          workerModel,
          1000,
          0.45,
          combinedSignal,
        );

        state.totalTokensUsed += result.tokensUsed;
        displayTasks[index] = {
          ...displayTasks[index],
          status: 'done',
          result: result.content,
          completedAt: Date.now(),
        };
      } catch (error) {
        console.warn(`[AgentPipeline] Task ${taskDef.id} failed:`, error);
        displayTasks[index] = {
          ...displayTasks[index],
          status: 'error',
          result: '',
          completedAt: Date.now(),
        };
      }

      updateState({ tasks: [...displayTasks] });
    });

    await Promise.allSettled(taskPromises);

    const completedTasks = displayTasks.filter((task) => task.status === 'done' && task.result.trim().length > 0);
    if (completedTasks.length === 0) {
      throw new Error('All agent tasks failed');
    }

    updateState({ status: 'synthesizing', tasks: [...displayTasks] });

    const analysisResults = completedTasks
      .map((task) => `[${task.label}]\n${task.result}`)
      .join('\n\n---\n\n');

    const finalUserPrompt = [
      `원래 질문: ${message}`,
      '',
      `공개 계획: ${strategy.publicPlan ?? strategy.reasoning}`,
      '',
      '분석 결과:',
      analysisResults,
      '',
      '위 결과를 종합해서 최종 답변을 작성하세요.',
    ].join('\n');

    const finalResponse = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: `${systemPrompt ? `${systemPrompt}\n\n` : ''}${STEP3_SYSTEM}`,
        question: finalUserPrompt,
        previousResponses: [],
        openrouterModel: finalModel,
        maxTokens: maxFinalTokens,
        searchPolicy: resolveSearchPolicy(profile?.searchPolicy, strategy.needsSearch),
      }),
      signal: combinedSignal,
    });

    let answer = await streamSseContent(finalResponse, onStreamToken, onSearchSources);
    if (!answer.trim()) {
      throw new Error('Step 3 streaming returned no content');
    }

    const effectiveComplexity = strategy.depth ?? complexityMode;
    if (shouldRunReviewPass(answer, strategy.type, effectiveComplexity, reviewMinChars)) {
      updateState({ status: 'reviewing', tasks: [...displayTasks], finalAnswer: answer });

      try {
        const review = await callAgentStep(
          REVIEW_SYSTEM,
          buildReviewPrompt(message, answer, strategy.type),
          reviewModel,
          1100,
          0.35,
          combinedSignal,
        );

        state.totalTokensUsed += review.tokensUsed;
        const appendix = review.content.trim();
        if (appendix) {
          const separator = answer.trim().endsWith('\n') ? '\n' : '\n\n';
          const combined = `${separator}${appendix}`;
          onStreamToken(combined);
          answer += combined;
        }
      } catch (error) {
        console.warn('[AgentPipeline] Review pass skipped:', error);
      }
    }

    updateState({
      status: 'complete',
      finalAnswer: answer,
      tasks: [...displayTasks],
    });
  } catch (error) {
    console.error('[AgentPipeline] Fatal error:', error);
    updateState({ status: 'error', tasks: [...displayTasks] });

    try {
      const fallbackResponse = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: systemPrompt || '',
          question: message,
          previousResponses: [],
          openrouterModel: profile?.directModel ?? model,
          maxTokens: profile?.maxDirectTokens ?? 1600,
          searchPolicy: resolveSearchPolicy(profile?.searchPolicy, strategy.needsSearch),
        }),
        signal,
      });

      const answer = await streamSseContent(fallbackResponse, onStreamToken, onSearchSources);
      if (!answer.trim()) {
        throw new Error('Fallback streaming returned no content');
      }

      updateState({
        status: 'complete',
        finalAnswer: answer,
        tasks: [...displayTasks],
      });
      return;
    } catch {
      onStreamToken('죄송합니다. 응답 생성 중 오류가 발생했습니다.');
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
