/**
 * 우연의 발견 — 카드 타입 / 위젯 상태 모델.
 *
 * V2(외부 RSS·Wikipedia·AI 큐레이션·사용자 카드 기여) 호환을 위해
 * `origin` 필드를 미리 두었다. 처음에는 'seed' 만 사용한다.
 */

export type CardType =
  | 'quote'     // 명언·시 한 줄
  | 'fact'      // 신기한 사실
  | 'snippet'   // 짧은 단편 (3~5문장)
  | 'link'      // 작은 사이트·도구
  | 'ritual'    // 1분 작은 의식
  | 'question'  // 질문 한 줄
  | 'pairing';  // 책+영화·노래+풍경 같은 추천 페어

export interface SerendipityCard {
  id: string;            // 시드 고정 id (외부 카드도 같은 id 공간)
  type: CardType;
  title?: string;        // 짧은 헤드 (선택)
  body: string;          // 본문 1~5문장 (≤ 280자 권장)
  source?: string;       // "— 칼 융", "위키" 등
  url?: string;          // type === 'link' | 'pairing' 일 때
  tags?: string[];       // ['위로','과학','일상']
  readMs?: number;       // 예상 읽기 시간 (UI 보조용)
  origin: 'seed' | 'user' | 'remote'; // V2 호환
}

export const CARD_TYPE_META: Record<CardType, { label: string; emoji: string }> = {
  quote:    { label: '명언',     emoji: '“ ”' },
  fact:     { label: '사실',     emoji: '💡' },
  snippet:  { label: '단편',     emoji: '✦' },
  link:     { label: '발견',     emoji: '🌐' },
  ritual:   { label: '의식',     emoji: '🌅' },
  question: { label: '질문',     emoji: '?' },
  pairing:  { label: '페어링',   emoji: '🎁' },
};
