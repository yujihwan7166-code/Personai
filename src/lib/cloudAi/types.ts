/**
 * 클라우드 AI 사이드바 공통 타입.
 * 4개 화면(Doc/Sheet/Slide/Drive)이 같은 채팅 컴포넌트를 공유한다.
 */

export type AiKind = 'doc' | 'sheet' | 'slide' | 'drive' | 'memo' | 'journal';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
  error?: boolean;
}

/**
 * 사이드바가 보여줄 "현재 컨텍스트" — 자동 수집.
 *  - summary: 헤더 칩에 표시 (예: "B2:D5 (12셀)", "슬라이드 3")
 *  - fullText: AI 에 보낼 실제 컨텍스트 (CSV / 텍스트 / outline 등)
 */
export interface AiContext {
  kind: AiKind;
  summary: string;
  fullText: string;
}

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  /** 사용자가 입력했다고 가정할 짧은 프롬프트 — 컨텍스트는 자동 추가됨 */
  prompt: string;
}

/** 사이드바 open 상태 키 prefix (kind 별, 훅 옵션에 따라 session/local storage 사용) */
export const STORAGE_KEY_OPEN = 'personai.cloud.aisidebar.open';
/** localStorage 키 prefix — 채팅 history (kind + persistKey 별).
 *  persistKey 는 보통 nodeId, drive 는 'global' */
export const STORAGE_KEY_CHAT = 'personai.cloud.aichat';
/** 한 채팅당 보관할 최대 메시지 수 (오래된 것부터 drop) */
export const MAX_MESSAGES_PER_CHAT = 100;

/** 노드 영구 삭제 시 그 노드의 모든 채팅 history (doc/sheet/slide) 도 정리 */
export function clearChatHistoryForNode(nodeId: string): void {
  if (typeof window === 'undefined') return;
  const kinds: AiKind[] = ['doc', 'sheet', 'slide'];
  for (const kind of kinds) {
    try {
      window.localStorage.removeItem(`${STORAGE_KEY_CHAT}.${kind}.${nodeId}`);
    } catch { /* noop */ }
  }
}
