import { describe, it, expect, beforeEach } from 'vitest';
import { migrateJournalToDiary } from '@/lib/diary/migrate';
import { listEntries } from '@/lib/diary/diaryStore';
import { plainFromValue } from '@/lib/diary/bodyText';

beforeEach(() => window.localStorage.clear());

describe('migrateJournalToDiary', () => {
  it('mood → 대표감정 매핑 + 본문 변환 + 필드 보존', () => {
    const old = [{
      id: 'a', date: '2026-06-01', body: '옛 일기\n둘째 줄', bodyFormat: 'plain',
      mood: 5, tags: ['여행'], weather: 'sunny',
      images: [{ id: 'i1', src: 'data:x' }],
      activities: ['run'], sleepHours: 7, energy: 4,
      createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z',
    }];
    window.localStorage.setItem('journal.entries.v1', JSON.stringify(old));

    migrateJournalToDiary();

    const migrated = listEntries();
    expect(migrated).toHaveLength(1);
    const e = migrated[0];
    expect(e.primaryFeeling).toBe('haengbok');
    expect(e.feelings).toContain('haengbok');
    expect(plainFromValue(e.body)).toBe('옛 일기 둘째 줄');
    expect(e.tags).toEqual(['여행']);
    expect(e.weather).toBe('sunny');
    expect(e.photos?.[0].src).toBe('data:x');
    expect(window.localStorage.getItem('personai.diary.migrated')).toBe('1');
  });

  it('플래그 있으면 재실행 안 함', () => {
    window.localStorage.setItem('personai.diary.migrated', '1');
    window.localStorage.setItem('journal.entries.v1', JSON.stringify([{ id: 'x', date: '2026-01-01', body: 'y', createdAt: '', updatedAt: '' }]));
    migrateJournalToDiary();
    expect(listEntries()).toHaveLength(0);
  });
});
