/**
 * 클라우드 AI 사이드바 공통 훅.
 *
 *  - open 상태 + sessionStorage 영속 (kind 별)
 *  - messages 상태 + localStorage 영속 (kind + persistKey 별, 보통 nodeId)
 *    persistKey 가 없으면 메모리만 (drive 등 임시 화면)
 *  - 로딩·에러 처리
 *  - persistKey 가 바뀌면 (다른 파일로 이동) 새 history 로드
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { runAiChat, newMessageId } from '@/lib/cloudAi/chat';
import {
  STORAGE_KEY_OPEN, STORAGE_KEY_CHAT, MAX_MESSAGES_PER_CHAT,
  type AiKind, type AiContext, type ChatMessage,
} from '@/lib/cloudAi/types';

interface UseAiSidebarOptions {
  /** localStorage 키에 들어갈 식별자. 보통 nodeId. 없으면 메모리만 */
  persistKey?: string;
}

interface UseAiSidebarReturn {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  messages: ChatMessage[];
  sending: boolean;
  send: (text: string) => Promise<void>;
  clear: () => void;
}

function chatStorageKey(kind: AiKind, persistKey: string): string {
  return `${STORAGE_KEY_CHAT}.${kind}.${persistKey}`;
}

function loadMessages(kind: AiKind, persistKey: string | undefined): ChatMessage[] {
  if (!persistKey || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(chatStorageKey(kind, persistKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 가벼운 sanity check
    return parsed.filter((m): m is ChatMessage =>
      m && typeof m.id === 'string'
      && (m.role === 'user' || m.role === 'assistant')
      && typeof m.content === 'string'
      && typeof m.ts === 'number'
    );
  } catch {
    return [];
  }
}

function saveMessages(kind: AiKind, persistKey: string | undefined, messages: ChatMessage[]): void {
  if (!persistKey || typeof window === 'undefined') return;
  try {
    const trimmed = messages.length > MAX_MESSAGES_PER_CHAT
      ? messages.slice(messages.length - MAX_MESSAGES_PER_CHAT)
      : messages;
    window.localStorage.setItem(chatStorageKey(kind, persistKey), JSON.stringify(trimmed));
  } catch {
    // quota / private mode → silent
  }
}

export function useAiSidebar(
  kind: AiKind,
  getContext: () => AiContext,
  options: UseAiSidebarOptions = {},
): UseAiSidebarReturn {
  const { persistKey } = options;
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

  // messages — persistKey 가 바뀌면 새 history 로드
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages(kind, persistKey));
  const [sending, setSending] = useState(false);

  // persistKey 변경 시 (다른 파일로 이동) 그 파일의 history 로드
  useEffect(() => {
    setMessages(loadMessages(kind, persistKey));
  }, [kind, persistKey]);

  // messages 변경 시 자동 저장 (debounce 없이 즉시 — 호출량 적음)
  useEffect(() => {
    saveMessages(kind, persistKey, messages);
  }, [kind, persistKey, messages]);

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
    // localStorage 도 함께 비움
    if (persistKey && typeof window !== 'undefined') {
      try { window.localStorage.removeItem(chatStorageKey(kind, persistKey)); }
      catch { /* noop */ }
    }
  }, [kind, persistKey]);

  return { open, setOpen, toggle, messages, sending, send, clear };
}
