// Fake agent pipeline
// Uses a single model call, but exposes a question-aware progress UI.

import { attachPublicNotes, buildFakeAgentStrategy } from './agentDisplay';
import { streamSseContent } from './streamSseContent';
import type { AgentState, AgentPipelineOptions, AgentTask } from './types';

const CHAT_URL = '/api/chat';

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

export async function runFakeAgentPipeline(options: AgentPipelineOptions): Promise<void> {
  const { message, model, systemPrompt, onStateChange, onStreamToken, signal, expertId, intentHint } = options;
  const startTime = Date.now();

  const strategy = buildFakeAgentStrategy(message, expertId, intentHint);
  const baseTasks: AgentTask[] = strategy.tasks.map((task) => ({
    id: task.id,
    label: task.label,
    status: 'pending',
    result: '',
  }));
  const tasks = attachPublicNotes(baseTasks, strategy.type);

  const state: AgentState = {
    status: 'analyzing',
    strategy: null,
    tasks: [],
    finalAnswer: '',
    totalTokensUsed: 0,
    elapsedMs: 0,
    agentBrand: expertId,
    intent: strategy.type,
  };

  const updateState = (partial: Partial<AgentState>) => {
    Object.assign(state, partial, { elapsedMs: Date.now() - startTime });
    onStateChange({ ...state });
  };

  const completeWithStream = async (response: Response) => {
    const answer = await streamSseContent(response, onStreamToken);

    if (!answer.trim()) {
      throw new Error('Fake agent streaming returned no content');
    }

    updateState({
      status: 'complete',
      finalAnswer: answer,
      tasks: [...tasks],
    });
  };

  try {
    updateState({ status: 'analyzing' });
    await delay(520, signal);

    updateState({
      status: 'processing',
      strategy,
      tasks: [...tasks],
    });

    for (let index = 0; index < tasks.length; index += 1) {
      tasks[index].status = 'running';
      updateState({ tasks: [...tasks] });
      await delay(560 + (index * 120), signal);

      tasks[index].status = 'done';
      tasks[index].result = tasks[index].publicNote ?? '완료';
      updateState({ tasks: [...tasks] });
      await delay(180, signal);
    }

    updateState({
      status: 'synthesizing',
      tasks: [...tasks],
    });
    await delay(420, signal);

    const chatResp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: systemPrompt || '',
        question: message,
        previousResponses: [],
        openrouterModel: model,
        searchPolicy: options.profile?.searchPolicy ?? 'auto',
      }),
      signal,
    });

    await completeWithStream(chatResp);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw err;

    console.error('[FakeAgentPipeline] Error:', err);
    updateState({ status: 'error', tasks: [...tasks] });

    try {
      const chatResp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: systemPrompt || '',
          question: message,
          previousResponses: [],
          openrouterModel: model,
          searchPolicy: options.profile?.searchPolicy ?? 'auto',
        }),
        signal,
      });

      if (!chatResp.ok || !chatResp.body) {
        throw new Error(`Fake agent fallback failed: ${chatResp.status}`);
      }

      await completeWithStream(chatResp);
      return;
    } catch {
      onStreamToken('죄송합니다. 답변 생성 중 오류가 발생했습니다.');
    }
  }
}
