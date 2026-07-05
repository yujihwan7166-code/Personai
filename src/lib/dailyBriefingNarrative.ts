/**
 * 데일리 브리핑 내러티브 — AI 자연어 브리핑 생성 + 근거 칩 (2026-07-05 재설계).
 *
 * buildBriefingData + 날씨를 컨텍스트로 조립 → /api/daily-briefing 호출.
 * 하루 1회 캐시(localStorage). 실패/키없음이면 템플릿 폴백으로 항상 무언가 표시.
 */
import { buildBriefingData, type BriefingData } from './buildBriefingData';
import { fetchWeatherNow, type WeatherNow } from '@/services/weatherService';

export interface BriefingChip {
  kind: 'event' | 'task' | 'overdue' | 'weather' | 'dday' | 'habit';
  label: string;
}

export interface BriefingNarrative {
  greeting: string;
  date: string;
  text: string;
  chips: BriefingChip[];
  /** true = AI 생성, false = 템플릿 폴백. */
  ai: boolean;
  /** 섹션 렌더용 원본 데이터 (v5). */
  data: BriefingData;
  weather: WeatherNow | null;
}

const CACHE_KEY = 'personai.daily-briefing.narrative';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function hm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 근거 칩 — 브리핑 문단 아래 클릭 가능한 요약. */
function buildChips(data: BriefingData, weather: WeatherNow | null): BriefingChip[] {
  const chips: BriefingChip[] = [];
  const firstEvent = data.timed.find((t) => t.kind === 'event');
  if (firstEvent) chips.push({ kind: 'event', label: `${hm(firstEvent.startAt)} ${firstEvent.title}` });
  const taskCount = data.inbox.length + data.timed.filter((t) => t.kind === 'task' && !t.done).length;
  if (taskCount > 0) chips.push({ kind: 'task', label: `할일 ${taskCount}` });
  if (data.overdue.length > 0) chips.push({ kind: 'overdue', label: `밀린 일 ${data.overdue.length}` });
  if (data.upcomingDday[0]) {
    const d = data.upcomingDday[0];
    chips.push({ kind: 'dday', label: `${d.label} ${d.daysLeft === 0 ? 'D-day' : `D-${d.daysLeft}`}` });
  }
  if (weather) chips.push({ kind: 'weather', label: `${weather.temp}° ${weather.label}${weather.dust ? ` · ${weather.dust.label}` : ''}` });
  return chips;
}

/** AI 컨텍스트 문자열 — 서버 프롬프트에 넣을 오늘 요약. */
function buildContext(data: BriefingData, weather: WeatherNow | null): string {
  const lines: string[] = [];
  lines.push(`날짜: ${data.date}`);
  if (data.timed.length > 0) {
    lines.push('오늘 일정:');
    for (const t of data.timed.slice(0, 6)) {
      lines.push(`- ${hm(t.startAt)} ${t.title}${t.kind === 'task' ? ' (할일)' : ''}${t.done ? ' [완료]' : ''}`);
    }
  } else {
    lines.push('오늘 시간 잡힌 일정: 없음');
  }
  if (data.inbox.length > 0) lines.push(`할일(시간 미정) ${data.inbox.length}개: ${data.inbox.slice(0, 5).map((t) => t.title).join(', ')}`);
  if (data.overdue.length > 0) lines.push(`어제 못 끝낸 할일 ${data.overdue.length}개: ${data.overdue.map((t) => t.title).join(', ')}`);
  const atRisk = data.habits.filter((h) => h.streakAtRisk);
  if (atRisk.length > 0) lines.push(`연속 기록 끊길 위험 습관: ${atRisk.map((h) => h.title).join(', ')}`);
  if (data.upcomingDday.length > 0) lines.push(`다가오는 D-day: ${data.upcomingDday.map((d) => `${d.label}(D-${d.daysLeft})`).join(', ')}`);
  if (weather) lines.push(`날씨: ${weather.temp}도, ${weather.label}${weather.dust ? `, ${weather.dust.label}` : ''}`);
  return lines.join('\n');
}

/** 템플릿 폴백 — AI 실패 시 규칙 기반 문장 (억지 응원·클리셰 없이 담백하게). */
function fallbackText(data: BriefingData, weather: WeatherNow | null): string {
  const parts: string[] = [];
  const firstEvent = data.timed.find((t) => t.kind === 'event' && new Date(t.startAt).getTime() >= Date.now());
  if (firstEvent) parts.push(`${hm(firstEvent.startAt)}에 ${firstEvent.title} 있어요.`);
  else if (data.timed.length === 0) parts.push('오늘은 잡힌 일정이 없네요.');
  if (data.overdue.length > 0) parts.push(`어제 미뤄둔 일이 ${data.overdue.length}개 남아있어요.`);
  else if (data.inbox.length > 0) parts.push(`할일은 ${data.inbox.length}개 있고요.`);
  if (weather) {
    if (weather.icon === 'rain' || weather.icon === 'storm') parts.push('비가 온다니까 나갈 일 있으면 우산 챙겨요.');
    else if (weather.dust && weather.dust.label.includes('나쁨')) parts.push('미세먼지가 안 좋으니 마스크 하나 챙기면 좋겠어요.');
    else if (weather.temp <= 5) parts.push('좀 쌀쌀하니까 따뜻하게 입어요.');
  }
  if (parts.length === 0) parts.push('오늘은 특별히 챙길 게 없네요. 편하게 시작해요.');
  return parts.join(' ');
}

interface CachedNarrative extends BriefingNarrative {
  day: string;
}

/**
 * 오늘 브리핑을 생성 (하루 1회 캐시). force=true 면 캐시 무시하고 재생성.
 */
export async function getDailyBriefing(force = false): Promise<BriefingNarrative> {
  const data = buildBriefingData();
  const weather = await fetchWeatherNow().catch(() => null);
  const chips = buildChips(data, weather);

  // 캐시 — 같은 날이면 AI 재호출 없이 재사용.
  if (!force) {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as CachedNarrative;
        if (cached.day === todayKey() && cached.text) {
          return { greeting: data.greeting, date: data.date, text: cached.text, chips, ai: cached.ai, data, weather };
        }
      }
    } catch {
      /* noop */
    }
  }

  // AI 생성 시도.
  let text = '';
  let ai = false;
  try {
    const res = await fetch('/api/daily-briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: buildContext(data, weather), greeting: data.greeting }),
    });
    if (res.ok) {
      const json = (await res.json()) as { briefing?: string };
      if (json.briefing && json.briefing.trim()) {
        text = json.briefing.trim();
        ai = true;
      }
    }
  } catch {
    /* 폴백으로 */
  }

  if (!text) text = fallbackText(data, weather);

  // AI 결과만 캐시 (폴백은 캐시 안 함 — 다음에 AI 재시도).
  if (ai) {
    try {
      const payload: CachedNarrative = { day: todayKey(), greeting: data.greeting, date: data.date, text, chips: [], ai };
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      /* noop */
    }
  }

  return { greeting: data.greeting, date: data.date, text, chips, ai, data, weather };
}
