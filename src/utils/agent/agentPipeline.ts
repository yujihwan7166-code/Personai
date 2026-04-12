// ══════════════════════════════════════════
// Agent Pipeline — 3단계 심층 분석
// Step 1: 질문 분석 + 전략 선택 (Nano 1회)
// Step 2: 병렬 태스크 실행 (Nano N회)
// Step 3: 종합 정리 (Nano 1회, 스트리밍)
// ══════════════════════════════════════════

import type {
  AgentState,
  AgentStrategy,
  AgentTask,
  AgentPipelineOptions,
} from './types';

const AGENT_STEP_URL = '/api/chat?mode=agent-step';
const CHAT_URL = '/api/chat';

/** 최대 병렬 태스크 수 */
const MAX_TASKS = 4;

/** 파이프라인 전체 타임아웃 (30초) */
const PIPELINE_TIMEOUT_MS = 30_000;

// ── Step 1 프롬프트 ──

const STEP1_SYSTEM = `너는 질문 분석 에이전트야. 유저 질문을 분석해서 최적의 답변 전략과 세부 작업을 JSON으로 출력해.

전략 유형:
- multi_perspective: 여러 관점에서 분석이 필요한 질문 (예: "AI가 사회에 미칠 영향은?")
- comparison: 둘 이상의 대상을 비교하는 질문 (예: "React vs Vue 뭐가 나아?")
- step_by_step: 단계별 설명이 필요한 질문 (예: "스타트업 창업 절차 알려줘")
- pros_cons: 찬반/장단점 분석이 필요한 질문 (예: "원격근무 도입해야 할까?")
- deep_dive: 하나의 주제를 깊게 파야 하는 질문 (예: "양자컴퓨터 원리를 자세히 설명해줘")

규칙:
- tasks는 최소 2개, 최대 4개. 절대 5개 이상 만들지 마.
- 각 task의 prompt는 독립적으로 실행 가능한 구체적 지시문이어야 해.
- reasoning은 한 문장으로 왜 이 전략을 골랐는지 한국어로 설명해.
- label도 한국어로 짧게 (예: "경제 동향 분석", "성능 비교")

응답 형식 (JSON만, 다른 텍스트 없이):
{
  "type": "comparison",
  "reasoning": "두 대상의 항목별 비교가 필요한 질문입니다",
  "tasks": [
    { "id": "t1", "label": "성능 비교", "prompt": "..." },
    { "id": "t2", "label": "생태계 비교", "prompt": "..." }
  ]
}`;

const STEP2_SYSTEM = `너는 전문 분석가야. 주어진 주제에 대해 구체적이고 정보가 풍부한 분석을 해줘. 불필요한 인사나 서론 없이 바로 본론으로 들어가. 한국어로 답변해.`;

const STEP3_SYSTEM = `너는 전문 종합 분석가야. 아래에 여러 관점의 분석 결과가 주어진다. 이것들을 종합해서 유저의 원래 질문에 대한 완성도 높은 최종 답변을 작성해줘.

규칙:
- 단순히 분석 결과를 이어붙이지 말고, 통합적 시각으로 재구성해.
- 핵심 인사이트를 먼저 제시하고, 세부 내용을 뒤에 배치해.
- 분석 간 모순이 있으면 양쪽을 공정하게 다루고 네 판단을 밝혀.
- 마크다운 형식으로 읽기 좋게 구성해.
- 한국어로 답변해.`;

// ── Helper: 비스트리밍 API 호출 ──

async function callAgentStep(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  maxTokens: number,
  temperature: number,
  signal?: AbortSignal
): Promise<{ content: string; tokensUsed: number }> {
  const resp = await fetch(AGENT_STEP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userPrompt, model, maxTokens, temperature }),
    signal,
  });

  if (!resp.ok) {
    throw new Error(`Agent step failed: ${resp.status}`);
  }

  return resp.json();
}

// ── Helper: JSON 파싱 (코드블록 대응) ──

function parseStrategyJson(raw: string): AgentStrategy | null {
  try {
    // 직접 JSON 파싱 시도
    return JSON.parse(raw);
  } catch {
    // 마크다운 코드블록 안의 JSON 추출
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ── Helper: 기본 폴백 전략 ──

function fallbackStrategy(message: string): AgentStrategy {
  return {
    type: 'multi_perspective',
    reasoning: '질문을 여러 관점에서 분석하겠습니다',
    tasks: [
      { id: 't1', label: '핵심 분석', prompt: `다음 질문의 핵심 내용을 분석해줘: ${message}` },
      { id: 't2', label: '추가 관점', prompt: `다음 질문에 대해 다른 관점에서 추가 분석해줘: ${message}` },
    ],
  };
}

// ── 메인 파이프라인 ──

export async function runAgentPipeline(options: AgentPipelineOptions): Promise<void> {
  const { message, model, systemPrompt, onStateChange, onStreamToken, signal } = options;
  const startTime = Date.now();

  // 초기 상태
  const state: AgentState = {
    status: 'analyzing',
    strategy: null,
    tasks: [],
    finalAnswer: '',
    totalTokensUsed: 0,
    elapsedMs: 0,
  };

  const updateState = (partial: Partial<AgentState>) => {
    Object.assign(state, partial, { elapsedMs: Date.now() - startTime });
    onStateChange({ ...state });
  };

  // 타임아웃 AbortController
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), PIPELINE_TIMEOUT_MS);

  // 외부 signal과 타임아웃 signal 결합
  const combinedSignal = signal
    ? combineAbortSignals(signal, timeoutController.signal)
    : timeoutController.signal;

  try {
    // ═══ Step 1: 질문 분석 + 전략 선택 ═══
    updateState({ status: 'analyzing' });

    let strategy: AgentStrategy;
    try {
      const step1Result = await callAgentStep(
        STEP1_SYSTEM,
        message,
        model,
        500,
        0.3,
        combinedSignal
      );
      state.totalTokensUsed += step1Result.tokensUsed;

      const parsed = parseStrategyJson(step1Result.content);
      if (parsed && parsed.tasks && parsed.tasks.length > 0) {
        // tasks 상한 적용
        parsed.tasks = parsed.tasks.slice(0, MAX_TASKS);
        strategy = parsed;
      } else {
        strategy = fallbackStrategy(message);
      }
    } catch (err) {
      console.warn('[AgentPipeline] Step 1 failed, using fallback:', err);
      strategy = fallbackStrategy(message);
    }

    // ═══ Step 2: 병렬 태스크 실행 ═══
    const tasks: AgentTask[] = strategy.tasks.map(t => ({
      id: t.id,
      label: t.label,
      status: 'pending' as const,
      result: '',
    }));

    updateState({
      status: 'processing',
      strategy,
      tasks: [...tasks],
    });

    // 병렬 실행
    const taskPromises = strategy.tasks.map(async (taskDef, idx) => {
      // running 표시
      tasks[idx].status = 'running';
      updateState({ tasks: [...tasks] });

      try {
        const result = await callAgentStep(
          STEP2_SYSTEM,
          taskDef.prompt,
          model,
          800,
          0.5,
          combinedSignal
        );
        tasks[idx].status = 'done';
        tasks[idx].result = result.content;
        state.totalTokensUsed += result.tokensUsed;
      } catch (err) {
        tasks[idx].status = 'error';
        tasks[idx].result = '';
        console.warn(`[AgentPipeline] Task ${taskDef.id} failed:`, err);
      }

      updateState({ tasks: [...tasks] });
    });

    await Promise.allSettled(taskPromises);

    // 전체 실패 체크
    const completedTasks = tasks.filter(t => t.status === 'done');
    if (completedTasks.length === 0) {
      throw new Error('All tasks failed');
    }

    // ═══ Step 3: 종합 정리 (스트리밍) ═══
    updateState({ status: 'synthesizing', tasks: [...tasks] });

    // 종합 프롬프트 조립
    const analysisResults = completedTasks
      .map(t => `[${t.label}]\n${t.result}`)
      .join('\n\n---\n\n');

    const step3UserPrompt = `원래 질문: ${message}\n\n분석 결과:\n---\n${analysisResults}\n---\n\n위 분석을 종합해서 최종 답변을 작성해줘.`;

    // 기존 /api/chat 엔드포인트로 스트리밍 요청
    const chatResp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: (systemPrompt ? systemPrompt + '\n\n' : '') + STEP3_SYSTEM,
        question: step3UserPrompt,
        previousResponses: [],
        openrouterModel: model,
      }),
      signal: combinedSignal,
    });

    if (!chatResp.ok || !chatResp.body) {
      throw new Error(`Step 3 streaming failed: ${chatResp.status}`);
    }

    // SSE 스트림 파싱
    const reader = chatResp.body.getReader();
    const decoder = new TextDecoder();
    let answer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          const content = parsed?.choices?.[0]?.delta?.content;
          if (content) {
            answer += content;
            onStreamToken(content);
          }
        } catch {
          // JSON 파싱 실패 무시
        }
      }
    }

    // 완료
    updateState({
      status: 'complete',
      finalAnswer: answer,
    });
  } catch (err: unknown) {
    console.error('[AgentPipeline] Fatal error:', err);

    // 폴백: 일반 단일 호출
    updateState({ status: 'error' });

    try {
      const chatResp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: systemPrompt || '',
          question: message,
          previousResponses: [],
          openrouterModel: model,
        }),
        signal,
      });

      if (chatResp.ok && chatResp.body) {
        const reader = chatResp.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              const content = parsed?.choices?.[0]?.delta?.content;
              if (content) onStreamToken(content);
            } catch { /* ignore */ }
          }
        }
      }
    } catch {
      onStreamToken('죄송합니다. 응답 생성 중 오류가 발생했습니다.');
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Helper: AbortSignal 결합 ──

function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort(sig.reason);
      return controller.signal;
    }
    sig.addEventListener('abort', () => controller.abort(sig.reason), { once: true });
  }
  return controller.signal;
}
