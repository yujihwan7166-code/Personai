/**
 * 일기 프롬프트 풀 — 시간대·카테고리별 (Stoic / 5MJ / Reflectly 차용).
 *
 * 정책:
 * - 30+ 프롬프트, 7개 카테고리, 시간대 (morning / evening / any)
 * - 진입 시 시간 자동 감지 → 해당 시간대 풀에서 카테고리 회전
 * - 같은 세션 안에서 중복 회피 (recentIds memo)
 *
 * 사용:
 *   const prompt = pickPrompt({ excludeIds });
 *   prompt.text;        // placeholder 로 사용
 *   prompt.category;    // 카드 헤더 라벨
 */

export type PromptCategory =
  | 'gratitude'      // 감사 — "오늘 감사한 것 한 가지는?"
  | 'reflection'     // 회고 — "오늘 가장 의미 있던 순간은?"
  | 'planning'       // 계획 — "내일 한 가지만 한다면?"
  | 'observation'    // 관찰 — "오늘 새로 알아챈 것은?"
  | 'relationship'   // 관계 — "오늘 누군가에게 받은 친절은?"
  | 'growth'         // 성장 — "오늘 작은 진전 한 가지는?"
  | 'joy';           // 기쁨 — "오늘 웃었던 순간은?"

export type PromptTime = 'morning' | 'evening' | 'any';

export interface JournalPrompt {
  id: string;
  category: PromptCategory;
  time: PromptTime;
  text: string;
}

export const PROMPT_CATEGORY_LABEL: Record<PromptCategory, string> = {
  gratitude: '감사',
  reflection: '회고',
  planning: '계획',
  observation: '관찰',
  relationship: '관계',
  growth: '성장',
  joy: '기쁨',
};

export const PROMPT_CATEGORY_EMOJI: Record<PromptCategory, string> = {
  gratitude: '🙏',
  reflection: '🪞',
  planning: '🎯',
  observation: '👀',
  relationship: '💞',
  growth: '🌱',
  joy: '✨',
};

/* ── 프롬프트 풀 ── */
export const PROMPTS: JournalPrompt[] = [
  // 감사 (gratitude) — 5MJ 톤
  { id: 'g1', category: 'gratitude', time: 'evening', text: '오늘 감사한 것 한 가지는?' },
  { id: 'g2', category: 'gratitude', time: 'evening', text: '오늘 누가 나를 도와줬어요?' },
  { id: 'g3', category: 'gratitude', time: 'morning', text: '오늘 기대되는 한 가지는?' },
  { id: 'g4', category: 'gratitude', time: 'any',     text: '내가 가진 것 중 당연하지 않은 것은?' },
  { id: 'g5', category: 'gratitude', time: 'evening', text: '오늘 작지만 좋았던 순간은?' },

  // 회고 (reflection) — Stoic 톤
  { id: 'r1', category: 'reflection', time: 'evening', text: '오늘 가장 의미 있던 순간은?' },
  { id: 'r2', category: 'reflection', time: 'evening', text: '오늘 어떤 결정을 했어요?' },
  { id: 'r3', category: 'reflection', time: 'evening', text: '다시 할 수 있다면 다르게 하고 싶은 것은?' },
  { id: 'r4', category: 'reflection', time: 'any',     text: '오늘의 색깔을 한 단어로 표현하면?' },
  { id: 'r5', category: 'reflection', time: 'evening', text: '오늘 어떤 감정이 가장 컸어요?' },
  { id: 'r6', category: 'reflection', time: 'any',     text: '지금 이 순간을 한 줄로 남긴다면?' },

  // 계획 (planning) — Sunsama 톤
  { id: 'p1', category: 'planning', time: 'morning', text: '오늘 한 가지만 한다면 무엇?' },
  { id: 'p2', category: 'planning', time: 'morning', text: '오늘 끝나면 만족스러울 것 한 가지는?' },
  { id: 'p3', category: 'planning', time: 'evening', text: '내일 어떻게 시작하고 싶어요?' },
  { id: 'p4', category: 'planning', time: 'any',     text: '이번 주 가장 중요한 한 가지는?' },
  { id: 'p5', category: 'planning', time: 'morning', text: '오늘 어떤 사람으로 보내고 싶어요?' },

  // 관찰 (observation) — 일상 알아채기
  { id: 'o1', category: 'observation', time: 'any',     text: '오늘 새로 알아챈 것은?' },
  { id: 'o2', category: 'observation', time: 'any',     text: '주위 풍경 중 인상적이었던 한 장면은?' },
  { id: 'o3', category: 'observation', time: 'evening', text: '오늘 들은 말 중 기억에 남는 한 마디는?' },
  { id: 'o4', category: 'observation', time: 'any',     text: '몸이 어떤 신호를 보내고 있어요?' },

  // 관계 (relationship) — 사람과의 연결
  { id: 'l1', category: 'relationship', time: 'any',     text: '오늘 누군가에게 받은 친절은?' },
  { id: 'l2', category: 'relationship', time: 'any',     text: '오늘 누구를 떠올렸어요?' },
  { id: 'l3', category: 'relationship', time: 'evening', text: '오늘 누구와 가장 따뜻했어요?' },
  { id: 'l4', category: 'relationship', time: 'morning', text: '오늘 누구에게 연락하고 싶어요?' },

  // 성장 (growth) — 작은 진전
  { id: 'gr1', category: 'growth', time: 'evening', text: '오늘 한 작은 진전은?' },
  { id: 'gr2', category: 'growth', time: 'any',     text: '오늘 새로 배운 것은?' },
  { id: 'gr3', category: 'growth', time: 'evening', text: '오늘 어려웠지만 해낸 것은?' },
  { id: 'gr4', category: 'growth', time: 'any',     text: '한 달 전의 나와 다른 점은?' },

  // 기쁨 (joy) — 가벼운 진입
  { id: 'j1', category: 'joy', time: 'any',     text: '오늘 웃었던 순간은?' },
  { id: 'j2', category: 'joy', time: 'evening', text: '오늘 가장 즐거웠던 한 순간은?' },
  { id: 'j3', category: 'joy', time: 'any',     text: '지금 무엇이 나를 기쁘게 해요?' },
  { id: 'j4', category: 'joy', time: 'morning', text: '오늘 어떤 작은 즐거움을 만들고 싶어요?' },
];

/** 시간 자동 감지 — 06–13 morning / 18–24 evening / 그 외 any. */
export function detectTimeOfDay(d = new Date()): PromptTime {
  const h = d.getHours();
  if (h >= 6 && h < 14) return 'morning';
  if (h >= 18 && h < 24) return 'evening';
  return 'any';
}

/** 적합한 프롬프트 1개 선택 — excludeIds 제외, 시간대 매치 우선 + any 보강. */
export function pickPrompt(opts: {
  excludeIds?: string[];
  preferTime?: PromptTime;
} = {}): JournalPrompt {
  const exclude = new Set(opts.excludeIds ?? []);
  const time = opts.preferTime ?? detectTimeOfDay();

  // 1) 시간대 매치 (morning/evening 시 + any 도 포함)
  const primary = PROMPTS.filter((p) => {
    if (exclude.has(p.id)) return false;
    if (time === 'any') return true;
    return p.time === time || p.time === 'any';
  });
  const pool = primary.length > 0 ? primary : PROMPTS.filter((p) => !exclude.has(p.id));
  const fallback = pool.length > 0 ? pool : PROMPTS;
  return fallback[Math.floor(Math.random() * fallback.length)];
}

/** 카테고리 회전 — 직전 카테고리 X 제외. */
export function pickPromptByCategory(category: PromptCategory, excludeIds?: string[]): JournalPrompt {
  const exclude = new Set(excludeIds ?? []);
  const pool = PROMPTS.filter((p) => p.category === category && !exclude.has(p.id));
  if (pool.length === 0) return pickPrompt({ excludeIds });
  return pool[Math.floor(Math.random() * pool.length)];
}
