/**
 * /journal — 감정중심 일기(재설계).
 *
 * 타임라인 피드(홈) · 감정 캘린더 · Plate 리치텍스트 에디터 · 과거의 오늘(throwback).
 * 데이터는 diaryStore(localStorage). 최초 진입 시 구 journalStore 1회 마이그레이션.
 * 룩은 앱 토큰/카드/헤어라인 공통, 감정 색만 시그니처.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Plus, Search, Star, Trash2, CalendarDays, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiaryEntry } from '@/types/diary';
import type { JournalEntry } from '@/types/journal';
import { useDiary, addEntry, updateEntry, removeEntry, toggleStar, getEntry } from '@/lib/diary/diaryStore';
import { migrateJournalToDiary } from '@/lib/diary/migrate';
import { plainFromValue } from '@/lib/diary/bodyText';
import { getFeeling } from '@/lib/diary/feelings';
import { DiaryTimeline } from '@/components/diary/DiaryTimeline';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { DiaryMoodCalendar } from '@/components/diary/DiaryMoodCalendar';
import { DiaryStats } from '@/components/diary/DiaryStats';
import { useJournalStreak } from '@/hooks/useJournalStreak';

type View = 'timeline' | 'calendar';

export default function Journal() {
  useEffect(() => { migrateJournalToDiary(); }, []);
  const entries = useDiary();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [starOnly, setStarOnly] = useState(false);
  const [view, setView] = useState<View>('timeline');

  const active = activeId ? getEntry(activeId) : undefined;
  const streak = useJournalStreak(entries as unknown as JournalEntry[]);

  const now = new Date();
  const [year, month1] = [now.getFullYear(), now.getMonth() + 1];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (starOnly && !e.starred) return false;
      if (q && !`${e.title ?? ''} ${plainFromValue(e.body)}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, query, starOnly]);

  const saveTimer = useRef<number | null>(null);
  useEffect(() => () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); }, []);
  const patch = (id: string, p: Partial<DiaryEntry>) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => updateEntry(id, p), 400);
  };

  const newToday = () => {
    const e = addEntry({ date: new Date().toISOString().slice(0, 10) });
    setActiveId(e.id);
    setView('timeline');
  };

  const openDate = (date: string) => {
    const found = entries.find((e) => e.date === date);
    if (found) { setActiveId(found.id); return; }
    const e = addEntry({ date });
    setActiveId(e.id);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('이 일기를 삭제할까요? 내용도 함께 사라집니다.')) return;
    removeEntry(id);
    setActiveId(null);
  };

  /* ── 에디터 모드 ── */
  if (active) {
    const primary = getFeeling(active.primaryFeeling);
    return (
      <div className="flex h-full flex-col bg-background">
        <header className="flex shrink-0 items-center gap-2 border-b border-[hsl(var(--hairline))] px-4 py-2.5 sm:px-6">
          <button type="button" onClick={() => setActiveId(null)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> 목록
          </button>
          <span className="text-[13px] font-semibold text-foreground/80">{active.date}{primary ? ` · ${primary.emoji} ${primary.label}` : ''}</span>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => toggleStar(active.id)} className={cn('rounded-md p-1.5 hover:bg-accent', active.starred ? 'text-amber-400' : 'text-muted-foreground')} aria-label="별표">
              <Star className={cn('h-4 w-4', active.starred && 'fill-amber-400')} />
            </button>
            <button type="button" onClick={() => handleDelete(active.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="삭제">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DiaryEditor entry={active} onPatch={(p) => patch(active.id, p)} />
        </div>
      </div>
    );
  }

  /* ── 목록/캘린더 모드 ── */
  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[hsl(var(--hairline))] px-4 py-2.5 sm:px-6">
        <h1 className="mr-1 text-[18px] font-bold tracking-tight text-foreground">일기</h1>
        <div className="inline-flex rounded-lg bg-accent/50 p-0.5">
          <button type="button" onClick={() => setView('timeline')} className={cn('inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12.5px] font-medium', view === 'timeline' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
            <ListChecks className="h-3.5 w-3.5" /> 타임라인
          </button>
          <button type="button" onClick={() => setView('calendar')} className={cn('inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12.5px] font-medium', view === 'calendar' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
            <CalendarDays className="h-3.5 w-3.5" /> 감정 캘린더
          </button>
        </div>
        <label className="ml-auto flex h-8 items-center gap-1.5 rounded-md border border-transparent bg-accent/40 px-2 focus-within:border-primary/35">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="검색" className="w-28 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground" />
        </label>
        <button type="button" onClick={() => setStarOnly((v) => !v)} className={cn('rounded-md p-1.5 hover:bg-accent', starOnly ? 'text-amber-400' : 'text-muted-foreground')} aria-label="즐겨찾기만" title="즐겨찾기만">
          <Star className={cn('h-4 w-4', starOnly && 'fill-amber-400')} />
        </button>
        <button type="button" onClick={newToday} className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[12.5px] font-semibold text-primary hover:bg-primary/15">
          <Plus className="h-4 w-4" /> 오늘 기록
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {view === 'timeline' ? (
          <DiaryTimeline entries={filtered} allEntries={entries} streak={streak} onOpen={setActiveId} onToggleStar={toggleStar} />
        ) : (
          <div className="mx-auto w-full max-w-[560px] space-y-4 px-4 py-6 sm:px-6">
            <DiaryStats entries={entries} year={year} month1={month1} streak={streak} />
            <div className="rounded-xl border border-[hsl(var(--hairline))] bg-card p-4">
              <div className="mb-2 text-[13px] font-semibold text-foreground">{year}년 {month1}월</div>
              <DiaryMoodCalendar entries={entries} year={year} month1={month1} onPickDate={openDate} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
