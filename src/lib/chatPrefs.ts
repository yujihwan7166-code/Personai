/**
 * 대화 설정 (Chat Prefs) — 답변 길이·말투. localStorage 영속.
 *
 * 히어로 입력창 "더보기 → 대화 설정" 에서 편집.
 * 전송 시 buildDirectives() 로 지시문으로 변환되어 메시지에 첨부된다.
 */
import { useCallback, useEffect, useState } from 'react';

export type ChatLength = 'short' | 'normal' | 'long';
export type ChatTone = 'default' | 'polite' | 'casual' | 'expert';

export interface ChatPrefs {
  length: ChatLength;
  tone: ChatTone;
}

export const DEFAULT_CHAT_PREFS: ChatPrefs = { length: 'normal', tone: 'default' };

export const CHAT_LENGTH_OPTIONS: { id: ChatLength; label: string; hint: string }[] = [
  { id: 'short',  label: '간결',  hint: '핵심만 3~5줄' },
  { id: 'normal', label: '보통',  hint: '균형 잡힌 기본' },
  { id: 'long',   label: '자세히', hint: '배경·예시 포함' },
];

export const CHAT_TONE_OPTIONS: { id: ChatTone; label: string; hint: string }[] = [
  { id: 'default', label: '기본',   hint: 'AI 기본 말투' },
  { id: 'polite',  label: '정중',   hint: '격식 있는 존댓말' },
  { id: 'casual',  label: '친근',   hint: '편안한 대화체' },
  { id: 'expert',  label: '전문가', hint: '전문 용어·깊이' },
];

const STORAGE_KEY = 'personai.hero.chat_prefs';
const CHANGED_EVENT = 'personai:chat-prefs-changed';

function readStored(): ChatPrefs {
  if (typeof window === 'undefined') return DEFAULT_CHAT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CHAT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ChatPrefs>;
    return {
      length: (['short', 'normal', 'long'] as const).includes(parsed.length as ChatLength)
        ? (parsed.length as ChatLength)
        : 'normal',
      tone: (['default', 'polite', 'casual', 'expert'] as const).includes(parsed.tone as ChatTone)
        ? (parsed.tone as ChatTone)
        : 'default',
    };
  } catch {
    return DEFAULT_CHAT_PREFS;
  }
}

export function useChatPrefs(): {
  prefs: ChatPrefs;
  setPrefs: (patch: Partial<ChatPrefs>) => void;
} {
  const [prefs, setPrefsState] = useState<ChatPrefs>(readStored);

  useEffect(() => {
    const handler = () => setPrefsState(readStored());
    window.addEventListener(CHANGED_EVENT, handler);
    return () => window.removeEventListener(CHANGED_EVENT, handler);
  }, []);

  const setPrefs = useCallback((patch: Partial<ChatPrefs>) => {
    const next = { ...readStored(), ...patch };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
    setPrefsState(next);
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
  }, []);

  return { prefs, setPrefs };
}

/**
 * 웹 검색·심층 사고 토글 + 대화 설정 → 지시문 배열.
 * 기본값(normal/default)은 지시문을 만들지 않는다 (불필요한 프롬프트 오염 방지).
 */
export function buildDirectives({
  webSearch,
  deepThink,
  prefs,
}: {
  webSearch: boolean;
  deepThink: boolean;
  prefs: ChatPrefs;
}): string[] {
  const out: string[] = [];
  if (webSearch) {
    out.push('최신 정보가 필요한 내용은 웹 검색을 활용해 확인하고, 출처를 함께 표기해주세요.');
  }
  if (deepThink) {
    out.push('바로 답하지 말고 단계별로 깊이 추론한 뒤, 마지막에 결론을 명확히 정리해주세요.');
  }
  if (prefs.length === 'short') {
    out.push('핵심만 3~5줄로 간결하게 답해주세요.');
  } else if (prefs.length === 'long') {
    out.push('배경 설명과 예시를 포함해 충분히 자세하게 답해주세요.');
  }
  if (prefs.tone === 'polite') {
    out.push('격식 있는 정중한 존댓말로 답해주세요.');
  } else if (prefs.tone === 'casual') {
    out.push('편안하고 친근한 대화체로 답해주세요.');
  } else if (prefs.tone === 'expert') {
    out.push('해당 분야 전문가 수준의 깊이와 용어로 답해주세요.');
  }
  return out;
}
