import type {
  AgentPipelineOptions,
  AgentState,
  AgentStrategy,
  AgentTask,
  AgentTaskDef,
  ClassificationMode,
  StrategyType,
} from './types';
import { attachPublicNotes, buildFakeAgentStrategy } from './agentDisplay';
import {
  resolveFinalTokenBudget,
  resolveReviewThreshold,
  resolveSearchPolicy,
  resolveTaskBudget,
  shouldRunReviewPass,
} from './agentPolicy';
import { resolvePatternStageIndexFromAgentState } from './questionPatternText';
import { streamSseContent } from './streamSseContent';

const AGENT_STEP_URL = '/api/chat?mode=agent-step';
const CHAT_URL = '/api/chat';
const PIPELINE_TIMEOUT_MS = 90_000;

const STEP1_SYSTEM = `당신은 질문을 여러 단계로 풀어내는 AI 에이전트의 플래너입니다.
사용자 질문을 보고 어떤 방식으로 답해야 가장 좋은지 먼저 정한 뒤, 실제로 병렬 실행할 작업들을 JSON으로 설계하세요.

반드시 지켜야 할 규칙:
- tasks는 최소 2개, 최대 4개
- 각 task는 서로 다른 관점이나 역할을 가져야 함
- label은 UI에 그대로 노출될 수 있게 짧고 명확한 한국어
- prompt는 해당 작업을 독립적으로 수행할 수 있을 만큼 구체적이어야 함
- publicPlan은 사용자가 봐도 되는 공개용 한 줄 계획
- publicSteps는 사용자가 보는 진행 단계 설명 2~4개
- publicSteps는 질문의 핵심 명사와 맥락을 반영한 자연스러운 한국어 현재 진행형 문장이어야 함
- publicSteps에 "상방/중립/하방", "프레임워크", "1단계", "2단계"처럼 정해진 틀 이름을 그대로 쓰지 말 것
- publicSteps는 숨겨진 추론을 노출하지 말고, 사용자가 봐도 되는 공개 작업 설명만 쓸 것
- 나쁜 예: "상방·중립·하방 시나리오를 분해 중"
- 좋은 예: "유가가 달라질 수 있는 조건을 자료 흐름에 맞춰 나눠보는 중"

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

const RESEARCH_SYSTEM = `당신은 에이전트 파이프라인의 자료 조사 담당입니다.
사용자 질문에 필요한 최신 정보, 수치, 맥락, 반례를 간결한 근거 브리프로 정리하세요.
검색 결과를 그대로 나열하지 말고 최종 답변에 쓸 수 있는 판단 재료로 압축하세요.

규칙:
- 확인된 사실과 추정은 구분
- 날짜, 수치, 기관명, 조건을 우선
- 불확실하거나 출처가 약한 내용은 단정하지 말 것
- 최종 출력은 6~10개 bullet 이하`;

const STEP2_SYSTEM = `당신은 에이전트의 개별 분석 담당입니다.
주어진 역할 하나만 맡아 깊고 구체적으로 분석하세요.
일반론을 반복하지 말고 최종 답변에 바로 들어갈 판단 재료를 만드세요.

규칙:
- 첫 줄에 핵심 판단을 한 문장으로 제시
- 근거는 가능하면 수치, 조건, 사례로 구체화
- 반례/예외/리스크를 최소 1개 포함
- 마지막에 "최종 답변 반영 포인트"를 2~3개 bullet로 정리
- 숨겨진 사고 과정은 쓰지 말고 공개 가능한 분석 결과만 출력`;

const DRAFT_SYSTEM = `당신은 여러 분석 결과를 종합해 답변 초안을 만드는 작성 담당입니다.
아직 사용자에게 보여줄 최종본이 아니라, 검토자가 평가할 밀도 높은 초안을 작성하세요.

규칙:
- 첫 문장부터 결론 또는 핵심 판단 제시
- 분석 결과 사이의 충돌, 공통점, 우선순위를 정리
- 비교/전망/전략 질문은 결론, 근거, 조건, 예외를 모두 포함
- 너무 짧게 끝내지 말고 최종 답변에 필요한 재료를 충분히 담을 것
- 단순 요약이 아닌 분석형 질문은 최소 6~10문장 분량의 초안으로 작성할 것`;

const CRITIC_SYSTEM = `당신은 에이전트 최종 답변의 비판적 검토자입니다.
초안에서 부족한 점을 찾아 최종 재작성 지시문을 만드세요.

규칙:
- 초안을 다시 쓰지 말고 개선 지시만 출력
- 빠진 근거, 과한 단정, 약한 결론, 사용자 질문 미응답 지점을 찾을 것
- 최종 답변에서 반드시 강화해야 할 부분을 우선순위 순으로 정리
- 출력은 5~8개 bullet 이하`;

const FINAL_REWRITE_SYSTEM = `당신은 에이전트의 최종 답변 작성자입니다.
분석 결과, 자료 브리프, 초안, 검토 지시를 통합해 사용자에게 바로 보여줄 최종 답변만 작성하세요.

규칙:
- 첫 문장부터 결론 또는 핵심 판단을 제시
- 중간 분석 과정, 작업 목록, 검토 지시문을 노출하지 말 것
- 근거와 조건을 구체적으로 쓰고, 모르는 부분은 단정하지 말 것
- 표/번호/소제목은 답변 이해에 도움이 될 때만 사용
- 짧은 질문이라도 분석형 질문이면 충분한 밀도와 맥락을 제공
- 분석/전망/비교/추천 질문은 최소한 결론, 근거 2~4개, 변수/예외, 최종 판단 기준까지 포함
- 답변을 지나치게 압축하지 말고, 보통 5~9문장 이상으로 사용자가 납득할 만큼 풀어 쓸 것
- 마지막에는 사용자가 바로 가져갈 수 있는 결론이나 판단 기준을 남길 것`;

type AgentStepResult = {
  content: string;
  tokensUsed: number;
};

function normalizePublicStep(step: string) {
  const cleaned = step
    .replace(/^\s*(?:[-*]|\d+[.)])\s*/g, '')
    .replace(/[.。]\s*$/g, '')
    .replace(/중\s+중$/g, '중')
    .replace(/(있습니다|합니다|됩니다|봅니다|나눕니다|정리합니다|검토합니다|분석합니다|파악합니다|전망합니다|도출합니다|비교합니다|확인합니다)\s+중$/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';
  return cleaned;
}

function resolvePublicProgressSteps(
  generatedSteps: string[] | undefined,
  fallbackSteps: string[] | undefined,
) {
  const steps = generatedSteps
    ?.map(normalizePublicStep)
    .filter((step) => step.length >= 6 && step.length <= 90)
    .slice(0, 4) ?? [];

  return steps.length >= 2 ? steps : fallbackSteps;
}

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

function shouldBuildResearchBrief(
  profile: AgentPipelineOptions['profile'],
  strategyNeedsSearch?: boolean,
  needsSearchHint?: boolean,
) {
  if (profile?.searchPolicy === 'never') {
    return false;
  }

  return profile?.searchPolicy === 'always'
    || profile?.qualityTier === 'search-first'
    || strategyNeedsSearch === true
    || needsSearchHint === true;
}

function resolveDraftTokenBudget(maxFinalTokens: number) {
  return Math.max(900, Math.min(2400, Math.floor(maxFinalTokens * 0.68)));
}

function shouldRunCritiquePass(
  profile: AgentPipelineOptions['profile'],
  answer: string,
  strategyType: StrategyType,
  complexityMode: ClassificationMode,
  minChars: number,
) {
  if (complexityMode === 'deep') {
    return true;
  }

  if (shouldRunReviewPass(answer, strategyType, complexityMode, minChars)) {
    return true;
  }

  return profile?.qualityTier === 'search-first'
    && ['comparison', 'deep_dive', 'multi_perspective'].includes(strategyType)
    && answer.trim().length < minChars * 1.35;
}

function shouldUseFullSynthesisLoop(
  profile: AgentPipelineOptions['profile'],
  strategyNeedsSearch: boolean | undefined,
  needsSearchHint: boolean | undefined,
  complexityMode: ClassificationMode,
) {
  return complexityMode === 'deep'
    || profile?.qualityTier === 'search-first'
    || strategyNeedsSearch === true
    || needsSearchHint === true;
}

function formatResearchBrief(researchBrief: string) {
  return researchBrief.trim()
    ? `자료 브리프:\n${researchBrief.trim()}\n`
    : '자료 브리프: 별도 최신 자료 없이 일반 지식과 분석 결과를 기준으로 판단합니다.\n';
}

function buildResearchPrompt(message: string, strategy: AgentStrategy) {
  return [
    `사용자 질문: ${message}`,
    '',
    `에이전트 전략: ${strategy.type}`,
    `공개 계획: ${strategy.publicPlan ?? strategy.reasoning}`,
    '',
    '최종 답변 품질을 높이기 위해 필요한 근거 브리프를 작성하세요.',
    '특히 최신성, 수치, 시장/정책/기술 변화, 반례가 중요한지 확인하세요.',
  ].join('\n');
}

function buildWorkerPrompt(
  message: string,
  strategy: AgentStrategy,
  taskDef: AgentTaskDef,
  researchBrief: string,
) {
  return [
    `사용자 질문: ${message}`,
    '',
    `전체 답변 전략: ${strategy.type}`,
    `공개 계획: ${strategy.publicPlan ?? strategy.reasoning}`,
    '',
    formatResearchBrief(researchBrief),
    '',
    `당신의 담당 역할: ${taskDef.label}`,
    '',
    '담당 작업 지시:',
    taskDef.prompt,
    '',
    '출력 형식:',
    '1. 핵심 판단',
    '2. 근거와 조건',
    '3. 반례/예외/리스크',
    '4. 최종 답변 반영 포인트',
  ].join('\n');
}

function formatAnalysisResults(tasks: AgentTask[]) {
  return tasks
    .map((task) => `[${task.label}]\n${task.result}`)
    .join('\n\n---\n\n');
}

function buildDraftPrompt(
  message: string,
  strategy: AgentStrategy,
  completedTasks: AgentTask[],
  researchBrief: string,
) {
  return [
    `사용자 질문: ${message}`,
    '',
    `에이전트 전략: ${strategy.type}`,
    `공개 계획: ${strategy.publicPlan ?? strategy.reasoning}`,
    '',
    formatResearchBrief(researchBrief),
    '',
    '개별 분석 결과:',
    formatAnalysisResults(completedTasks),
    '',
    '위 자료를 종합해 최종 답변 초안을 작성하세요.',
  ].join('\n');
}

function buildCritiquePrompt(
  message: string,
  strategy: AgentStrategy,
  draft: string,
  researchBrief: string,
) {
  return [
    `사용자 질문: ${message}`,
    '',
    `에이전트 전략: ${strategy.type}`,
    '',
    formatResearchBrief(researchBrief),
    '',
    '현재 초안:',
    draft,
    '',
    '초안이 일반 모델 답변처럼 보이는 지점을 찾아 최종 재작성 지시문을 작성하세요.',
  ].join('\n');
}

function buildFinalRewritePrompt(
  message: string,
  strategy: AgentStrategy,
  completedTasks: AgentTask[],
  researchBrief: string,
  draft: string,
  critique: string,
) {
  return [
    `사용자 질문: ${message}`,
    '',
    `에이전트 전략: ${strategy.type}`,
    `공개 계획: ${strategy.publicPlan ?? strategy.reasoning}`,
    '',
    formatResearchBrief(researchBrief),
    '',
    '개별 분석 결과:',
    formatAnalysisResults(completedTasks),
    '',
    '초안:',
    draft,
    '',
    critique.trim() ? `검토 지시:\n${critique.trim()}` : '검토 지시: 초안을 더 구체적이고 직접적인 최종 답변으로 재작성하세요.',
    '',
    '이제 사용자에게 보여줄 최종 답변만 작성하세요.',
  ].join('\n');
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
    questionPattern,
    patternLabel,
    patternFocus,
    patternSteps,
    auxTags,
    needsSearchHint,
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
    questionPattern,
    patternLabel,
    patternFocus,
    patternSteps,
    patternStageIndex: 0,
    generatedProgressSteps: false,
    canRevealAnswer: false,
    auxTags,
  };

  const updateState = (partial: Partial<AgentState>) => {
    Object.assign(state, partial, { elapsedMs: Date.now() - startTime });
    if (state.patternSteps?.length) {
      state.patternStageIndex = partial.patternStageIndex ?? resolvePatternStageIndexFromAgentState(
        state.status,
        state.tasks,
        state.patternSteps.length,
      );
    }
    state.canRevealAnswer = partial.canRevealAnswer ?? state.status === 'complete';
    onStateChange({ ...state });
  };

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), PIPELINE_TIMEOUT_MS);
  const combinedSignal = signal
    ? combineAbortSignals(signal, timeoutController.signal)
    : timeoutController.signal;

  let strategy = normalizeStrategy(null, message, intentHint, complexityMode, maxTasks);
  let hasGeneratedPlan = false;

  try {
    updateState({ status: 'analyzing' });

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
      const parsedStrategy = parseStrategyJson(step1.content);
      hasGeneratedPlan = Boolean(parsedStrategy);
      strategy = normalizeStrategy(parsedStrategy, message, intentHint, complexityMode, maxTasks);
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
    const publicProgressSteps = hasGeneratedPlan
      ? resolvePublicProgressSteps(strategy.publicSteps, strategy.tasks.map((task) => task.label))
      : undefined;
    const displayStrategy = {
      ...strategy,
      publicSteps: publicProgressSteps,
    };

    updateState({
      status: 'processing',
      strategy: displayStrategy,
      tasks: [...displayTasks],
      intent: strategy.type,
      complexityMode: strategy.depth ?? complexityMode,
      patternSteps: publicProgressSteps,
      generatedProgressSteps: Boolean(publicProgressSteps?.length),
    });

    const researchBriefPromise = shouldBuildResearchBrief(profile, strategy.needsSearch, needsSearchHint)
      ? (async () => {
          try {
            const researchResponse = await fetch(CHAT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemPrompt: RESEARCH_SYSTEM,
                question: buildResearchPrompt(message, strategy),
                previousResponses: [],
                openrouterModel: workerModel,
                maxTokens: 1100,
                searchPolicy: resolveSearchPolicy(profile?.searchPolicy, true),
                temperature: 0.25,
              }),
              signal: combinedSignal,
            });

            return (await streamSseContent(researchResponse, () => {}, onSearchSources)).trim();
          } catch (error) {
            console.warn('[AgentPipeline] Research brief skipped:', error);
            return '';
          }
        })()
      : Promise.resolve('');

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
          buildWorkerPrompt(message, strategy, taskDef, ''),
          workerModel,
          1300,
          0.35,
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

    const researchBrief = await researchBriefPromise;

    updateState({ status: 'synthesizing', tasks: [...displayTasks] });

    const effectiveComplexity = strategy.depth ?? complexityMode;
    const useFullSynthesisLoop = shouldUseFullSynthesisLoop(
      profile,
      strategy.needsSearch,
      needsSearchHint,
      effectiveComplexity,
    );
    let draft = useFullSynthesisLoop
      ? ''
      : '초안 생략: 개별 분석 결과와 자료 브리프를 직접 종합해 최종 답변으로 작성하세요.';
    let critique = '';

    if (useFullSynthesisLoop) {
      const draftResult = await callAgentStep(
        DRAFT_SYSTEM,
        buildDraftPrompt(message, strategy, completedTasks, researchBrief),
        finalModel,
        resolveDraftTokenBudget(maxFinalTokens),
        0.35,
        combinedSignal,
      );
      state.totalTokensUsed += draftResult.tokensUsed;

      draft = draftResult.content.trim();
      if (!draft) {
        throw new Error('Draft generation returned no content');
      }

      updateState({ status: 'reviewing', tasks: [...displayTasks], finalAnswer: draft });
    }

    if (useFullSynthesisLoop && shouldRunCritiquePass(profile, draft, strategy.type, effectiveComplexity, reviewMinChars)) {
      try {
        const critiqueResult = await callAgentStep(
          CRITIC_SYSTEM,
          buildCritiquePrompt(message, strategy, draft, researchBrief),
          reviewModel,
          1000,
          0.25,
          combinedSignal,
        );

        state.totalTokensUsed += critiqueResult.tokensUsed;
        critique = critiqueResult.content.trim();
      } catch (error) {
        console.warn('[AgentPipeline] Critique pass skipped:', error);
      }
    }

    const finalResponse = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: `${systemPrompt ? `${systemPrompt}\n\n` : ''}${FINAL_REWRITE_SYSTEM}`,
        question: buildFinalRewritePrompt(message, strategy, completedTasks, researchBrief, draft, critique),
        previousResponses: [],
        openrouterModel: finalModel,
        maxTokens: maxFinalTokens,
        searchPolicy: researchBrief
          ? 'never'
          : resolveSearchPolicy(profile?.searchPolicy, strategy.needsSearch || needsSearchHint),
        temperature: 0.45,
      }),
      signal: combinedSignal,
    });

    if (!finalResponse.ok || !finalResponse.body) {
      throw new Error(`Step 3 streaming failed: ${finalResponse.status}`);
    }

    updateState({
      status: 'complete',
      tasks: [...displayTasks],
      canRevealAnswer: true,
      patternStageIndex: state.patternSteps?.length
        ? state.patternSteps.length - 1
        : state.patternStageIndex,
    });

    const answer = await streamSseContent(finalResponse, onStreamToken, onSearchSources);
    if (!answer.trim()) {
      throw new Error('Step 3 streaming returned no content');
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
          temperature: 0.55,
        }),
        signal,
      });

      if (!fallbackResponse.ok || !fallbackResponse.body) {
        throw new Error(`Fallback streaming failed: ${fallbackResponse.status}`);
      }

      updateState({
        status: 'complete',
        tasks: [...displayTasks],
        canRevealAnswer: true,
        patternStageIndex: state.patternSteps?.length
          ? state.patternSteps.length - 1
          : state.patternStageIndex,
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
