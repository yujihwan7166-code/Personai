/**
 * 브리핑 섹션 표시 설정 — 어떤 섹션을 브리핑에 넣을지 (2026-07-05 v5).
 *
 * 위젯 드래그 그리드(레거시)를 폐기하고, 고정 순서 + 단순 on/off 토글로.
 * autoShow(매일 자동 표시)는 기존 dailyBriefingStore 재활용, 여기선 섹션만.
 */
import { useSyncExternalStore } from 'react';

export type BriefingSectionKey = 'ai' | 'schedule' | 'tasks' | 'weather' | 'stocks' | 'news' | 'dday' | 'habits';

export interface BriefingSectionMeta {
  key: BriefingSectionKey;
  label: string;
}

/** 표시 순서 = 이 배열 순서. */
export const BRIEFING_SECTIONS: BriefingSectionMeta[] = [
  { key: 'ai', label: 'AI 한마디' },
  { key: 'schedule', label: '오늘 일정' },
  { key: 'tasks', label: '할일' },
  { key: 'weather', label: '날씨' },
  { key: 'stocks', label: '시장 지수' },
  { key: 'news', label: '오늘의 소식' },
  { key: 'dday', label: '다가오는 날' },
  { key: 'habits', label: '습관' },
];

export type BriefingPrefs = Record<BriefingSectionKey, boolean>;

const DEFAULT_PREFS: BriefingPrefs = {
  ai: true,
  schedule: true,
  tasks: true,
  weather: true,
  stocks: true,
  news: true,
  dday: true,
  habits: false, // 습관은 쓰는 사람만 — 기본 off
};

const KEY = 'personai.briefing.sections';
const EVENT = 'personai:briefing-prefs-changed';

function read(): BriefingPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<BriefingPrefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

let cache: BriefingPrefs | null = null;

function snapshot(): BriefingPrefs {
  if (cache === null) cache = read();
  return cache;
}

export const briefingPrefs = {
  get: snapshot,
  toggle(key: BriefingSectionKey): void {
    const next = { ...snapshot(), [key]: !snapshot()[key] };
    cache = next;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
    window.dispatchEvent(new CustomEvent(EVENT));
  },
};

function subscribe(cb: () => void): () => void {
  const handler = () => { cache = read(); cb(); };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export function useBriefingPrefs(): BriefingPrefs {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_PREFS);
}
