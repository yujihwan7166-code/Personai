/**
 * 오늘의 추천 — /api/daily-recos 호출 + 하루 1회 캐시 (2026-07-06).
 *
 * 날씨·요일 맥락으로 AI 추천 4개. 실패/키없음이면 정적 폴백 풀에서 요일 회전.
 */
import { fetchWeatherNow } from '@/services/weatherService';

export interface Reco {
  category: string;
  title: string;
  reason: string;
}

const CACHE_KEY = 'personai.daily-recos';
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** AI 실패 시 정적 폴백 — 요일 인덱스로 회전(가공 브랜드 없이 보편적 제안). */
const FALLBACK_POOL: Reco[][] = [
  [
    { category: '음식', title: '따뜻한 국밥', reason: '주 시작엔 든든하게' },
    { category: '영화', title: '가벼운 코미디 한 편', reason: '월요일 부담 덜기' },
    { category: '활동', title: '가까운 공원 산책', reason: '몸부터 깨우기 좋아요' },
  ],
  [
    { category: '음식', title: '샐러드 볼', reason: '가볍게 리듬 잡기' },
    { category: '드라마', title: '정주행하던 시리즈', reason: '한 화만 더' },
    { category: '활동', title: '스트레칭 10분', reason: '뭉친 어깨 풀기' },
  ],
  [
    { category: '음식', title: '든든한 덮밥', reason: '주중 반환점' },
    { category: '넷플릭스', title: '다큐멘터리 한 편', reason: '머리 식히기' },
    { category: '활동', title: '카페에서 정리', reason: '생각 비우기' },
  ],
];

function buildContext(weekday: string, weather: string): string {
  return `날짜: ${todayKey()} (${weekday}요일)\n날씨: ${weather}`;
}

export async function getDailyRecos(): Promise<Reco[]> {
  // 캐시 — 같은 날이면 재사용.
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (raw) {
      const c = JSON.parse(raw) as { day: string; items: Reco[] };
      if (c.day === todayKey() && Array.isArray(c.items) && c.items.length > 0) return c.items;
    }
  } catch {
    /* noop */
  }

  const now = new Date();
  const weekday = WEEKDAYS[now.getDay()];
  const w = await fetchWeatherNow().catch(() => null);
  const weatherStr = w ? `${w.temp}도, ${w.label}${w.dust ? `, ${w.dust.label}` : ''}` : '정보 없음';

  let items: Reco[] = [];
  try {
    const res = await fetch('/api/daily-recos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: buildContext(weekday, weatherStr) }),
    });
    if (res.ok) {
      const json = (await res.json()) as { items?: Reco[] };
      if (Array.isArray(json.items)) items = json.items;
    }
  } catch {
    /* 폴백으로 */
  }

  if (items.length === 0) {
    items = FALLBACK_POOL[now.getDate() % FALLBACK_POOL.length];
    return items; // 폴백은 캐시 안 함 (다음에 AI 재시도)
  }

  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ day: todayKey(), items }));
  } catch {
    /* noop */
  }
  return items;
}
