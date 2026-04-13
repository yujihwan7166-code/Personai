// ══════════════════════════════════════════
// Fake Agent Pipeline — 단일 호출 + UI 연출
// Claude AUTO용: Haiku 1회 호출하면서
// AgentTaskStream UI는 동일하게 단계별 표시
// ══════════════════════════════════════════

import type { AgentState, AgentPipelineOptions, AgentStrategy, AgentTask } from './types';

const CHAT_URL = '/api/chat';

/** 가짜 태스크 라벨 세트 (질문 유형에 따라 랜덤 선택) */
const FAKE_TASK_SETS: { label: string }[][] = [
  [
    { label: '핵심 내용 파악' },
    { label: '맥락 및 배경 분석' },
  ],
  [
    { label: '주요 논점 정리' },
    { label: '관련 정보 검토' },
  ],
  [
    { label: '질문 의도 분석' },
    { label: '최적 답변 구성' },
  ],
  [
    { label: '핵심 요소 추출' },
    { label: '종합적 관점 검토' },
  ],
];

/** 딜레이 헬퍼 */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    }
  });
}

/**
 * 가짜 에이전트 파이프라인
 * - UI: analyzing → processing (가짜 태스크) → synthesizing → complete
 * - 실제: 모델 1회 스트리밍 호출
 */
export async function runFakeAgentPipeline(options: AgentPipelineOptions): Promise<void> {
  const { message, model, systemPrompt, onStateChange, onStreamToken, signal } = options;
  const startTime = Date.now();

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

  try {
    // ═══ Step 1: 분석 중 연출 (500ms) ═══
    updateState({ status: 'analyzing' });
    await delay(500, signal);

    // 가짜 전략 + 태스크 생성
    const taskSet = FAKE_TASK_SETS[Math.floor(Math.random() * FAKE_TASK_SETS.length)];
    const fakeStrategy: AgentStrategy = {
      type: 'multi_perspective',
      reasoning: '질문을 다각도로 분석하겠습니다',
      tasks: taskSet.map((t, i) => ({
        id: `ft${i + 1}`,
        label: t.label,
        prompt: '',
      })),
    };

    const fakeTasks: AgentTask[] = taskSet.map((t, i) => ({
      id: `ft${i + 1}`,
      label: t.label,
      status: 'pending' as const,
      result: '',
    }));

    // ═══ Step 2: 가짜 태스크 순차 완료 연출 ═══
    updateState({
      status: 'processing',
      strategy: fakeStrategy,
      tasks: [...fakeTasks],
    });

    // 태스크 하나씩 running → done 전환 (각 600ms)
    for (let i = 0; i < fakeTasks.length; i++) {
      fakeTasks[i].status = 'running';
      updateState({ tasks: [...fakeTasks] });
      await delay(600, signal);

      fakeTasks[i].status = 'done';
      fakeTasks[i].result = '완료';
      updateState({ tasks: [...fakeTasks] });
      await delay(200, signal);
    }

    // ═══ Step 3: 실제 스트리밍 호출 ═══
    updateState({ status: 'synthesizing', tasks: [...fakeTasks] });

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

    if (!chatResp.ok || !chatResp.body) {
      throw new Error(`Fake agent streaming failed: ${chatResp.status}`);
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
    if (err instanceof Error && err.name === 'AbortError') throw err;

    console.error('[FakeAgentPipeline] Error:', err);
    updateState({ status: 'error' });

    // 폴백: 그냥 스트리밍
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
  }
}
