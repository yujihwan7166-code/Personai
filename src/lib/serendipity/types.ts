/**
 * 우연의 발견 — 카드 타입 / 위젯 상태 모델.
 *
 * V2(외부 RSS·Wikipedia·AI 큐레이션·사용자 카드 기여) 호환을 위해
 * `origin` 필드를 미리 두었다.
 */

export type CardType =
  | 'topic'     // 깊이 있는 지식 카드 (200~400자, 한 토픽)
  | 'quote'     // 명언·시 한 줄
  | 'fact'      // 신기한 사실
  | 'snippet'   // 짧은 단편 (3~5문장)
  | 'link'      // 작은 사이트·도구
  | 'ritual'    // 1분 작은 의식
  | 'question'  // 질문 한 줄
  | 'pairing';  // 책+영화·노래+풍경 같은 추천 페어

export interface SerendipityCard {
  id: string;            // 시드/외부 모두 같은 id 공간
  type: CardType;
  title?: string;        // 짧은 헤드 (선택)
  body: string;          // 본문 1~10문장
  source?: string;       // "— 칼 융", "위키", "NASA" 등
  url?: string;          // 외부 링크 (type=link/pairing/topic 등)
  tags?: string[];       // ['과학','역사','음식']
  readMs?: number;       // 예상 읽기 시간 (UI 보조용)
  imageUrl?: string;     // 카드 대표 이미지 (NASA APOD 등)
  origin: 'seed' | 'user' | 'remote'; // 'remote' = 외부 API 에서 fetch
}

/**
 * 타입별 메타 — 라벨·이모지 + 좌측 색 라인용 Tailwind class.
 * 새 색 토큰 추가 없이 기존 Tailwind 컬러 팔레트만 사용.
 */
export const CARD_TYPE_META: Record<CardType, {
  label: string;
  emoji: string;
  /** 좌측 1.5px 라인 강조 색 — 카드 종류 식별용. */
  accent: string; // tailwind class (border-l-* + text-*)
}> = {
  topic:    { label: '지식',    emoji: '📚', accent: 'border-l-sky-400 dark:border-l-sky-500' },
  quote:    { label: '명언',    emoji: '“ ”', accent: 'border-l-amber-400 dark:border-l-amber-500' },
  fact:     { label: '사실',    emoji: '💡', accent: 'border-l-emerald-400 dark:border-l-emerald-500' },
  snippet:  { label: '단편',    emoji: '✦',  accent: 'border-l-violet-400 dark:border-l-violet-500' },
  link:     { label: '발견',    emoji: '🌐', accent: 'border-l-cyan-400 dark:border-l-cyan-500' },
  ritual:   { label: '의식',    emoji: '🌅', accent: 'border-l-orange-400 dark:border-l-orange-500' },
  question: { label: '질문',    emoji: '?',  accent: 'border-l-fuchsia-400 dark:border-l-fuchsia-500' },
  pairing:  { label: '페어링',  emoji: '🎁', accent: 'border-l-rose-400 dark:border-l-rose-500' },
};

/**
 * 본문 길이로 읽기 시간(분) 계산. readMs 필드 없을 때 fallback.
 * 한국어 기준 분당 약 350자 가정 (영문보다 정보 밀도 높음).
 */
export function estimateReadMinutes(card: { body: string; title?: string; readMs?: number }): number {
  if (card.readMs && card.readMs > 0) return Math.max(1, Math.round(card.readMs / 60));
  const len = (card.body?.length ?? 0) + (card.title?.length ?? 0);
  return Math.max(1, Math.ceil(len / 350));
}
