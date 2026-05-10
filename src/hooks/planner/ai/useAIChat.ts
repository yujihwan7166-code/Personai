/**
 * 플래너 AI 채팅 훅 — 메시지 state + /api/chat 스트리밍 호출.
 *
 * - sessionStorage 에 메시지 보관 (탭 닫으면 사라짐)
 * - 호출 직전에 buildAIContext 로 현재 view 데이터를 systemPrompt 에 주입
 * - 응답은 SSE 스트리밍 (chat.ts 패턴 동일)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AIMessage, AIChatState } from '@/types/plannerAI';
import { AI_SYSTEM_PROMPT } from '@/lib/planner/ai/aiSystemPrompt';
import { buildAIContext } from '@/lib/planner/ai/buildAIContext';
import { parseAIContent } from '@/lib/planner/ai/parseActions';
import { applyAIAction, undoAIAction } from '@/lib/planner/ai/applyAction';
import { notify } from '@/lib/notify';
import type { PlannerView } from '@/components/planner/ViewToggle';

const STORAGE_KEY = 'planner.ai-chat.v1';
const MAX_HISTORY = 30;

const newId = (): string =>
  `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const readSession = (): AIMessage[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeSession = (messages: AIMessage[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
  } catch { /* sessionStorage quota — silent OK */ }
};

interface UseAIChatArgs {
  view: PlannerView;
  anchorIso: string;
}

export const useAIChat = ({ view, anchorIso }: UseAIChatArgs) => {
  const [state, setState] = useState<AIChatState>(() => ({
    messages: readSession(),
    loading: false,
  }));
  const abortRef = useRef<AbortController | null>(null);

  // state 변경 시 session 동기화.
  useEffect(() => {
    writeSession(state.messages);
  }, [state.messages]);

  /** 메시지 모두 지우기. */
  const clear = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ messages: [], loading: false });
  }, []);

  /** 진행 중 응답 취소. */
  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((s) => ({
      ...s,
      loading: false,
      messages: s.messages.map((m) => m.streaming ? { ...m, streaming: false } : m),
    }));
  }, []);

  /** 사용자 입력 → 호출. */
  const send = useCallback(async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed) return;
    if (state.loading) return;

    const userMsg: AIMessage = {
      id: newId(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const assistantMsg: AIMessage = {
      id: newId(),
      role: 'assistant',
      content: '',
      streaming: true,
      createdAt: new Date().toISOString(),
    };

    // 호출 시점 컨텍스트 — 매 send 마다 새로 빌드 (사용자가 그 사이 일정 수정했을 수도).
    const context = buildAIContext(view, anchorIso);
    const systemPrompt = `${AI_SYSTEM_PROMPT}\n\n──── 현재 사용자 화면 데이터 ────\n${context}`;

    // 직전 N개 turn 만 history 로 (토큰 절약).
    const previousResponses = state.messages.slice(-10).map((m) => ({
      name: m.role === 'user' ? '사용자' : '나',
      content: m.content,
    }));

    setState((s) => ({
      messages: [...s.messages, userMsg, assistantMsg],
      loading: true,
    }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          question: trimmed,
          previousResponses,
          searchPolicy: 'never',
          preSearchContext: null,
          maxTokens: 800,
          temperature: 0.5,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '');
        setState((s) => ({
          loading: false,
          messages: s.messages.map((m) => m.id === assistantMsg.id
            ? { ...m, streaming: false, error: errText || '응답 실패', content: '' }
            : m),
        }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta.length > 0) {
              accumulated += delta;
              setState((s) => ({
                ...s,
                messages: s.messages.map((m) => m.id === assistantMsg.id
                  ? { ...m, content: accumulated }
                  : m),
              }));
            }
          } catch { /* progress / 파싱 실패 무시 */ }
        }
      }

      // 스트리밍 끝 — 최종 본문에서 ```action 블록 추출, 본문에서는 제거.
      const parsed = parseAIContent(accumulated);
      setState((s) => ({
        loading: false,
        messages: s.messages.map((m) => m.id === assistantMsg.id
          ? {
              ...m,
              streaming: false,
              content: parsed.displayContent || accumulated,
              ...(parsed.actions.length > 0 ? { actions: parsed.actions } : {}),
            }
          : m),
      }));
    } catch (err: unknown) {
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      if (aborted) return; // stop() 이 이미 처리
      const msg = err instanceof Error ? err.message : '네트워크 오류';
      setState((s) => ({
        loading: false,
        messages: s.messages.map((m) => m.id === assistantMsg.id
          ? { ...m, streaming: false, error: msg }
          : m),
      }));
    } finally {
      abortRef.current = null;
    }
  }, [view, anchorIso, state.loading, state.messages]);

  /** 액션 카드 [추가] 클릭 → 실제 적용 + 상태 업데이트. */
  const applyAction = useCallback((messageId: string, actionIdx: number) => {
    setState((s) => {
      const msg = s.messages.find((m) => m.id === messageId);
      if (!msg || !msg.actions || !msg.actions[actionIdx]) return s;
      const inst = msg.actions[actionIdx];
      if (inst.status !== 'pending') return s;
      const appliedId = applyAIAction(inst.action);
      if (!appliedId) {
        notify.error('추가 실패 — 다시 시도해주세요');
        return s;
      }
      notify.success('추가됐어요', { duration: 1500 });
      return {
        ...s,
        messages: s.messages.map((m) => m.id !== messageId ? m : {
          ...m,
          actions: m.actions!.map((a, i) => i !== actionIdx ? a : { ...a, status: 'applied' as const, appliedId }),
        }),
      };
    });
  }, []);

  /** 액션 카드 [취소] 클릭 → status 만 변경, store 손대지 않음. */
  const cancelAction = useCallback((messageId: string, actionIdx: number) => {
    setState((s) => ({
      ...s,
      messages: s.messages.map((m) => m.id !== messageId ? m : {
        ...m,
        actions: m.actions!.map((a, i) => i !== actionIdx ? a : { ...a, status: 'canceled' as const }),
      }),
    }));
  }, []);

  /** 적용된 액션 [되돌리기] → store 에서 제거 + status 되돌림. */
  const undoAction = useCallback((messageId: string, actionIdx: number) => {
    setState((s) => {
      const msg = s.messages.find((m) => m.id === messageId);
      if (!msg || !msg.actions || !msg.actions[actionIdx]) return s;
      const inst = msg.actions[actionIdx];
      if (inst.status !== 'applied' || !inst.appliedId) return s;
      undoAIAction(inst.action, inst.appliedId);
      notify.info('되돌렸어요', { duration: 1500 });
      return {
        ...s,
        messages: s.messages.map((m) => m.id !== messageId ? m : {
          ...m,
          actions: m.actions!.map((a, i) => i !== actionIdx ? a : { ...a, status: 'pending' as const, appliedId: undefined }),
        }),
      };
    });
  }, []);

  return { state, send, stop, clear, applyAction, cancelAction, undoAction };
};
