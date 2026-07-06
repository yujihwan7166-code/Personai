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

/** mood 별 컬러 점 — JournalCard 좌측 날짜 컬럼에 작은 dot 으로 노출. */
export const MOOD_TINT: Record<Mood, string> = {
  1: 'bg-sky-500',
  2: 'bg-slate-400',
  3: 'bg-zinc-400',
  4: 'bg-emerald-500',
  5: 'bg-amber-500',
};

/* ── 활동 (Activity) — Daylio 패턴 ── */

/** 16종 디폴트 활동 — 사용자가 자주 추가할 만한 일상 카테고리. */
export const DEFAULT_ACTIVITIES = [
  { key: 'work',     label: '일',     emoji: '💼' },
  { key: 'exercise', label: '운동',   emoji: '🏃' },
  { key: 'family',   label: '가족',   emoji: '👨‍👩‍👧' },
  { key: 'friends',  label: '친구',   emoji: '🤝' },
  { key: 'walk',     label: '산책',   emoji: '🚶' },
  { key: 'reading',  label: '독서',   emoji: '📖' },
  { key: 'movie',    label: '영화',   emoji: '🎬' },
  { key: 'cooking',  label: '요리',   emoji: '🍳' },
  { key: 'travel',   label: '여행',   emoji: '✈️' },
  { key: 'meditate', label: '명상',   emoji: '🧘' },
  { key: 'sleep',    label: '잘 잠',  emoji: '😴' },
  { key: 'study',    label: '공부',   emoji: '📚' },
  { key: 'cafe',     label: '카페',   emoji: '☕' },
  { key: 'music',    label: '음악',   emoji: '🎵' },
  { key: 'game',     label: '게임',   emoji: '🎮' },
  { key: 'cleaning', label: '정리',   emoji: '🧹' },
] as const;

export type DefaultActivityKey = typeof DEFAULT_ACTIVITIES[number]['key'];

/** 활동 메타 — key → 라벨/이모지 빠른 조회. */
export const ACTIVITY_META: Record<string, { label: string; emoji: string }> = Object.fromEntries(
  DEFAULT_ACTIVITIES.map((a) => [a.key, { label: a.label, emoji: a.emoji }]),
);

/** 본문 형식 — v2 에서 도입. */
export type BodyFormat = 'plain' | 'markdown';

/** 날씨 — v4 emoji. */
export type Weather = 'sunny' | 'cloudy' | 'overcast' | 'rainy' | 'stormy' | 'snowy' | 'windy';

export const WEATHER_META: Record<Weather, { label: string; emoji: string }> = {
  sunny:    { label: '맑음',   emoji: '☀️' },
  cloudy:   { label: '구름',   emoji: '⛅' },
  overcast: { label: '흐림',   emoji: '☁️' },
  rainy:    { label: '비',     emoji: '🌧' },
  stormy:   { label: '폭풍',   emoji: '⛈' },
  snowy:    { label: '눈',     emoji: '❄️' },
  windy:    { label: '바람',   emoji: '🌬' },
};

/** 일기 한 항목. */
export interface JournalEntry {
  id: string;
  /** 'YYYY-MM-DD' — 그 날의 일기. 같은 date 여러 개 가능. */
  date: string;
  /** 제목(선택). v5. */
  title?: string;
  /** 감정 키 — v5 named 감정(행복/설렘/평온/우울/지침/화남 등). 미지정 시 legacy mood 사용. */
  moodKey?: string;
  /** 즐겨찾기 — v5. */
  starred?: boolean;
  /** 본문. plain = whitespace-pre-wrap, markdown = TipTap 호환 마크다운. */
  body: string;
  /** 본문 형식. 미지정 = 'plain' (기본·호환성). */
  bodyFormat?: BodyFormat;
  /** 1-5 또는 미선택. */
  mood?: Mood;
  tags?: string[];
  /** v2 사진 첨부 — base64 또는 URL. */
  images?: JournalImage[];
  /** v3 활동 키 배열 — DEFAULT_ACTIVITIES key 또는 사용자 정의 문자열. */
  activities?: string[];
  /** v4 날씨. */
  weather?: Weather;
  /** v4 수면 시간 (시간 단위, 0 ~ 24). */
  sleepHours?: number;
  /** v4 에너지 / 컨디션 1-5 (mood 와 별도 — 정신적 vs 신체적). */
  energy?: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  updatedAt: string;
}

export interface JournalImage {
  id: string;
  /** Base64 data URL 또는 외부 URL. */
  src: string;
  /** 압축된 크기 (bytes). */
  size?: number;
  createdAt: string;
}

/** Store 변경 broadcast 이벤트 이름 (planner 패턴 동일). */
export const JOURNAL_CHANGED = 'journal:changed';
