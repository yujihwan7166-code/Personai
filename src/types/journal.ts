/**
 * 일기 데이터 모델 — v1 (시간순 단편 일기).
 *
 * 설계 원칙:
 * - 모든 시각은 ISO 8601 문자열 (LocalStorage 호환).
 * - 하루 여러 개 허용 (Day One 패턴) — date 'YYYY-MM-DD' 만 동일.
 * - 신규 필드 모두 optional (mood/tags) → 마이그 X.
 * - LocalStorage v1 → Supabase v2 swap 가능 구조 (planner 와 동일).
 */

export type Mood = 1 | 2 | 3 | 4 | 5;

/** 이모지 5종 — 한국 사용자 친숙 (☆ 보다 인식 빠름). */
export const MOOD_EMOJI: Record<Mood, string> = {
  1: '😢',
  2: '😕',
  3: '😐',
  4: '😊',
  5: '😀',
};

export const MOOD_LABELS: Record<Mood, string> = {
  1: '안 좋음',
  2: '별로',
  3: '보통',
  4: '좋음',
  5: '아주 좋음',
};

/** 일기 한 항목. */
export interface JournalEntry {
  id: string;
  /** 'YYYY-MM-DD' — 그 날의 일기. 같은 date 여러 개 가능. */
  date: string;
  /** 자유 텍스트 (whitespace-pre-wrap 으로 줄바꿈 보존). v2 에서 markdown 옵션. */
  body: string;
  /** 1-5 또는 미선택. */
  mood?: Mood;
  /** v2 활용 — 미리 둠. */
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/** Store 변경 broadcast 이벤트 이름 (planner 패턴 동일). */
export const JOURNAL_CHANGED = 'journal:changed';
