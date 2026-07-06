import type { DiaryEntry } from '@/types/diary';
import { _seed, listEntries } from '@/lib/diary/diaryStore';
import { valueFromPlain } from '@/lib/diary/bodyText';

const OLD_KEY = 'journal.entries.v1';
const FLAG = 'personai.diary.migrated';

/** mood 1-5 → 대표 감정 + 강도. */
const MOOD_MAP: Record<number, { feeling: string; intensity: 1 | 2 | 3 | 4 | 5 }> = {
  1: { feeling: 'seulpeum', intensity: 4 },
  2: { feeling: 'uul', intensity: 3 },
  3: { feeling: 'mudeon', intensity: 3 },
  4: { feeling: 'manjok', intensity: 3 },
  5: { feeling: 'haengbok', intensity: 4 },
};

interface OldEntry {
  id: string; date: string; body: string;
  mood?: number; tags?: string[];
  images?: { id: string; src: string }[];
  weather?: DiaryEntry['weather'];
  createdAt: string; updatedAt: string;
}

export function migrateJournalToDiary(): void {
  if (typeof window === 'undefined') return;
  if (window.localStorage.getItem(FLAG) === '1') return;
  let old: OldEntry[] = [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(OLD_KEY) || '[]');
    if (Array.isArray(raw)) old = raw;
  } catch { /* ignore */ }

  const migrated: DiaryEntry[] = old.map((o) => {
    const m = o.mood ? MOOD_MAP[o.mood] : undefined;
    return {
      id: o.id,
      date: o.date,
      body: valueFromPlain(o.body ?? ''),
      feelings: m ? [m.feeling] : [],
      primaryFeeling: m?.feeling,
      intensity: m?.intensity,
      starred: false,
      photos: o.images ?? [],
      tags: o.tags ?? [],
      weather: o.weather,
      createdAt: o.createdAt || new Date().toISOString(),
      updatedAt: o.updatedAt || new Date().toISOString(),
    };
  });

  // 기존 diary 가 이미 있으면 앞에 유지(중복 방지: id 기준).
  const existing = listEntries();
  const existingIds = new Set(existing.map((e) => e.id));
  const merged = [...existing, ...migrated.filter((e) => !existingIds.has(e.id))];
  _seed(merged);
  window.localStorage.setItem(FLAG, '1');
}
