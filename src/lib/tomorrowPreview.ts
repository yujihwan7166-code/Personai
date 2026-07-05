/**
 * 내일 미리보기 — 저녁 시간대 브리핑용 (2026-07-06).
 *
 * 내일 일정(반복 인스턴스 포함) + 내일 예보를 모아 반환. 클라 로컬 계산 +
 * 예보만 네트워크(weatherService 캐시).
 */
import { eventStore } from '@/services/planner/eventStore';
import { fetchWeatherTomorrow, type WeatherTomorrow } from '@/services/weatherService';

export interface TomorrowEvent {
  title: string;
  startAt: string;
  allDay: boolean;
}

export interface TomorrowPreview {
  dateLabel: string;
  events: TomorrowEvent[];
  weather: WeatherTomorrow | null;
}

/** 저녁(18시 이후)에만 노출 — 그 전엔 오늘에 집중. */
export function isEvening(): boolean {
  return new Date().getHours() >= 18;
}

export async function buildTomorrowPreview(): Promise<TomorrowPreview> {
  const now = new Date();
  const tmr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
  const iso = tmr.toISOString();

  const raw = eventStore.listByDate(iso);
  const events: TomorrowEvent[] = raw
    .map((e) => ({ title: e.title, startAt: e.startAt, allDay: Boolean(e.allDay) }))
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 6);

  const weather = await fetchWeatherTomorrow().catch(() => null);

  const dateLabel = `${tmr.getMonth() + 1}월 ${tmr.getDate()}일 (${['일', '월', '화', '수', '목', '금', '토'][tmr.getDay()]})`;
  return { dateLabel, events, weather };
}
