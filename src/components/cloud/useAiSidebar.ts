/**
 * 클라우드 AI 사이드바 공통 훅.
 *
 *  - open 상태 + sessionStorage 영속 (kind 별)
 *  - messages 상태 + 전송 로직 (sessionStorage 비영속)
 *  - 로딩·에러 처리
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { runAiChat, newMessageId } from '@/lib/cloudAi/chat';
import { STORAGE_KEY_OPEN, type AiKind, type AiContext, type ChatMessage } from '@/lib/cloudAi/types';

interface UseAiSidebarReturn {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  messages: ChatMessage[];
  sending: boolean;
  send: (text: string) => Promise<void>;
  clear: () => void;
}

export function useAiSidebar(kind: AiKind, getContext: () => AiContext): UseAiSidebarReturn {
  // open: sessionStorage 영속 — kind 마다 별도 key
  const storageKey = `${STORAGE_KEY_OPEN}.${kind}`;
  const [open, setOpenInner] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(storageKey) === '1';
  });
  const setOpen = useCallback((v: boolean) => {
    setOpenInner(v);
    try {
      window.sessionStorage.setItem(storageKey, v ? '1' : '0');
    } catch { /* private mode etc. */ }
  }, [storageKey]);
  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  // messages: 비영속 — 새로고침 시 비워짐 (v2 에서 파일별 영속)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  // getContext 는 항상 최신 — ref 로 wrapping
  const getContextRef = useRef(getContext);
  useEffect(() => { getContextRef.current = getContext; }, [getContext]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const userMsg: ChatMessage = {
      id: newMessageId(),
      role: 'user',
      content: trimmed,
      ts: Date.now(),
    };
    // 직전 history (이번 user 제외)
    const historyBefore = messages;
    setMessages((cur) => [...cur, userMsg]);
    setSending(true);
    try {
      const ctx = getContextRef.current();
      const reply = await runAiChat(ctx, historyBefore, trimmed);
      const aiMsg: ChatMessage = {
        id: newMessageId(),
        role: 'assistant',
        content: reply || '(빈 응답)',
        ts: Date.now(),
      };
      setMessages((cur) => [...cur, aiMsg]);
    } catch (e) {
      const errMsg: ChatMessage = {
        id: newMessageId(),
        role: 'assistant',
        content: e instanceof Error ? e.message : '알 수 없는 에러',
        ts: Date.now(),
        error: true,
      };
      setMessages((cur) => [...cur, errMsg]);
    } finally {
      setSending(false);
    }
  }, [messages, sending]);

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  return { open, setOpen, toggle, messages, sending, send, clear };
}
