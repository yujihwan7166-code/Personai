import { useSyncExternalStore } from 'react';
import type { DiaryEntry } from '@/types/diary';
import { DIARY_CHANGED } from '@/types/diary';
import { emptyBody } from '@/lib/diary/bodyText';

const STORAGE_KEY = 'personai.diary.v1';
const uid = () => (crypto.randomUUID?.() ?? String(Date.now() + Math.random()));

/** 단조 증가 타임스탬프 — 같은 ms 연속 호출에도 updatedAt 이 항상 커져 recency 정렬이 결정적. */
let lastTs = 0;
function nowIso(): string {
  const t = Math.max(Date.now(), lastTs + 1);
  lastTs = t;
  return new Date(t).toISOString();
}

function readAll(): DiaryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

function writeAll(entries: DiaryEntry[]): void {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* quota */ }
  window.dispatchEvent(new CustomEvent(DIARY_CHANGED));
}

/** updatedAt 최신순. */
export function listEntries(): DiaryEntry[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function getEntry(id: string): DiaryEntry | undefined {
  return readAll().find((e) => e.id === id);
}
export function listByDate(date: string): DiaryEntry[] {
  return readAll().filter((e) => e.date === date);
}

export function addEntry(input: Partial<DiaryEntry> & { date: string }): DiaryEntry {
  const now = nowIso();
  const entry: DiaryEntry = {
    id: uid(),
    date: input.date,
    title: input.title,
    body: input.body ?? emptyBody(),
    feelings: input.feelings ?? [],
    primaryFeeling: input.primaryFeeling,
    intensity: input.intensity,
    starred: input.starred ?? false,
    photos: input.photos ?? [],
    tags: input.tags ?? [],
    weather: input.weather,
    createdAt: now,
    updatedAt: now,
  };
  writeAll([entry, ...readAll()]);
  return entry;
}

export function updateEntry(id: string, patch: Partial<Omit<DiaryEntry, 'id' | 'createdAt'>>): void {
  const all = readAll();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...patch, updatedAt: nowIso() };
  writeAll(all);
}
export function removeEntry(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id));
}
export function toggleStar(id: string): void {
  const e = getEntry(id);
  if (e) updateEntry(id, { starred: !e.starred });
}

/** 마이그레이션 등 내부용 — 통째 교체(정렬 유지 X). */
export function _seed(entries: DiaryEntry[]): void { writeAll(entries); }

/* ── 구독 훅 ── */
function subscribe(cb: () => void) {
  window.addEventListener(DIARY_CHANGED, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(DIARY_CHANGED, cb);
    window.removeEventListener('storage', cb);
  };
}
let snap: DiaryEntry[] = [];
let key = '';
function getSnapshot(): DiaryEntry[] {
  const list = listEntries();
  const k = list.map((e) => `${e.id}:${e.updatedAt}`).join('|');
  if (k !== key) { key = k; snap = list; }
  return snap;
}
export function useDiary(): DiaryEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => snap);
}
