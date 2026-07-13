/**
 * 인맥노트 — /people (사람 카드 · 경조사 · 관계 흐름).
 *
 * 구조 (사용자 목업 + Diary Room 문법, 2026-07-13):
 *   방 내부 사이드바(오늘 챙길 것·사람·경조사 캘린더 + 새 사람 CTA, 클릭 시 활성 하이라이트)
 *   + 섹션 아이브로우 헤더. 웹 밀도 — 여백 조임.
 * 마스트헤드 양식: "인맥노트" 27px 테라코타 + N명 (제목=주어, 실데이터=서술어).
 * 데이터: peopleStore (사람·관계 기록, LocalStorage) — docs/design-masthead.md 참조.
 */
import { useMemo, useState } from 'react';
import { CalendarHeart, Home, Plus, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersons, useInteractions } from '@/hooks/usePeople';
import { PersonsView } from '@/components/people/PersonsView';
import { PersonDetail } from '@/components/people/PersonDetail';
import { PersonDialog } from '@/components/people/PersonDialog';
import { TodayView } from '@/components/people/TodayView';
import { computeOverdue } from '@/lib/people/overdue';
import { EventsCalendar } from '@/components/people/EventsCalendar';
import { todayKey } from '@/types/travel';
import type { Person } from '@/types/people';

type View = 'today' | 'persons' | 'calendar';

const NAV: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: 'today', label: '오늘 챙길 것', icon: Home },
  { id: 'persons', label: '사람', icon: Users },
  { id: 'calendar', label: '경조사 캘린더', icon: CalendarHeart },
];

const SECTION_HEAD: Record<View, { eyebrow: string; title: string }> = {
  today: { eyebrow: 'PEOPLE TO CARE', title: '오늘 챙길 것' },
  persons: { eyebrow: 'MY PEOPLE', title: '사람' },
  calendar: { eyebrow: 'OCCASIONS', title: '경조사 캘린더' },
};

export default function People() {
  const persons = usePersons();
  const interactions = useInteractions();
  const [view, setView] = useState<View>('today');
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; editing: Person | null }>({ open: false, editing: null });

  const openPerson = openId ? persons.find((p) => p.id === openId) ?? null : null;
  const today = todayKey(); // 렌더 시점 로컬 날짜 — deps 에 포함해 자정 이후 stale 방지
  const badge = useMemo(
    () => computeOverdue(persons, interactions, today).length,
    [persons, interactions, today],
  );
  /** 이번 달 경조사 건수 — 내비 항목 우측 실데이터. */
  const monthEvents = useMemo(() => {
    const mm = today.slice(5, 7);
    let n = 0;
    for (const p of persons) {
      if (p.birthday?.slice(0, 2) === mm) n += 1;
      n += p.annivs.filter((a) => a.monthDay.slice(0, 2) === mm).length;
    }
    return n;
  }, [persons, today]);
  /** 내비 우측 숫자 — "실데이터가 서술어" 문법의 내비 버전. */
  const navCountOf = (id: View): number => {
    if (id === 'persons') return persons.length;
    if (id === 'calendar') return monthEvents;
    return 0;
  };

  const goPerson = (id: string) => {
    setOpenId(id);
    setView('persons');
  };

  /* 사이드바 항목 — 아이콘 대신 활성 세로 바 + 우측 실데이터 숫자로 살아있게
   * (레일이 이미 아이콘 열이라 아이콘 중복 금지, 아이콘은 모바일 칩에서만). */
  const navBtn = (item: (typeof NAV)[number]) => {
    const active = view === item.id;
    const count = navCountOf(item.id);
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => { setView(item.id); setOpenId(null); }}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex items-center gap-2 rounded-xl py-2.5 pl-4 pr-3 text-left text-[13px] transition-colors',
          active
            ? 'bg-[hsl(var(--people-accent))]/12 font-bold text-[hsl(var(--people-accent))]'
            : 'font-medium text-foreground/75 hover:bg-[hsl(var(--surface-3))]/60 hover:text-foreground',
        )}
      >
        {active && <span aria-hidden className="absolute left-1 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[hsl(var(--people-accent))]" />}
        <span className="flex-1">{item.label}</span>
        {item.id === 'today' && badge > 0 ? (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[hsl(var(--people-accent))] px-1 text-[10px] font-bold tabular-nums text-[hsl(var(--people-accent-ink))]">{badge}</span>
        ) : count > 0 ? (
          <span className={cn('text-[11px] tabular-nums', active ? 'font-bold text-[hsl(var(--people-accent))]/80' : 'text-muted-foreground/55')}>{count}</span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="people-theme flex h-dvh bg-background text-foreground">
      {/* ── 사이드바 — 방 내비 (클릭 시 활성 하이라이트, 데일리 로그와 동일 문법) ── */}
      <aside className="hidden w-[220px] shrink-0 flex-col overflow-y-auto border-r border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] sm:flex">
        {/* 마스트헤드 — 도구명 27px + N명 (제목=주어, 실데이터=서술어) */}
        <div className="border-b border-[hsl(var(--hairline))] px-5 pb-3.5 pt-4">
          <div className="flex items-baseline gap-1.5">
            <h1 className="font-sans text-[27px] font-bold leading-none tracking-[-0.02em] text-[hsl(var(--people-accent))]">인맥노트</h1>
            {persons.length > 0 && (
              <span className="shrink-0 text-[13px] font-bold tabular-nums text-muted-foreground/55">{persons.length}명</span>
            )}
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-3 pt-3" aria-label="인맥노트 섹션">
          {NAV.map(navBtn)}
        </nav>

        <div className="px-4 pt-5">
          <button
            type="button"
            onClick={() => setDialog({ open: true, editing: null })}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[hsl(var(--foreground))] py-2.5 text-[13px] font-bold text-[hsl(var(--background))] shadow-[0_8px_18px_-10px_hsl(var(--foreground)/0.7)] transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> 새 사람
          </button>
        </div>
      </aside>

      {/* ── 메인 ── */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1240px] px-4 pb-7 pt-6 sm:px-8">
          {/* 모바일 — 가로 내비 */}
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 sm:hidden">
            <button
              type="button"
              onClick={() => setDialog({ open: true, editing: null })}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-[hsl(var(--foreground))] px-3.5 py-1.5 text-[12px] font-bold text-[hsl(var(--background))]"
            >
              <Plus className="h-3 w-3" /> 새 사람
            </button>
            {NAV.map((item) => {
              const active = view === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setView(item.id); setOpenId(null); }}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors',
                    active
                      ? 'border-transparent bg-[hsl(var(--people-accent))]/14 font-bold text-[hsl(var(--people-accent))]'
                      : 'border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] text-muted-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {item.label}
                  {item.id === 'today' && badge > 0 && <span className="rounded-full bg-[hsl(var(--people-accent))] px-1 text-[9.5px] font-bold text-[hsl(var(--people-accent-ink))]">{badge}</span>}
                </button>
              );
            })}
          </div>

          {/* 섹션 머리 (상세 화면에선 숨김) */}
          {!openPerson && (
            <div className="mb-5">
              <p className="text-[10.5px] font-bold tracking-[0.22em] text-muted-foreground/60">{SECTION_HEAD[view].eyebrow}</p>
              <h2 className="mt-1.5 flex items-baseline gap-2 text-[27px] font-bold leading-none tracking-[-0.01em]">
                {SECTION_HEAD[view].title}
                {view === 'persons' && persons.length > 0 && (
                  <span className="text-[14px] font-bold tabular-nums text-muted-foreground/55">{persons.length}</span>
                )}
              </h2>
            </div>
          )}

          {openPerson ? (
            /* key — 사람이 바뀌면 컴포저 초안·삭제 대기 상태가 남지 않게 remount */
            <PersonDetail
              key={openPerson.id}
              person={openPerson}
              onBack={() => setOpenId(null)}
              onEdit={() => setDialog({ open: true, editing: openPerson })}
            />
          ) : view === 'today' ? (
            <TodayView persons={persons} interactions={interactions} onOpenPerson={goPerson} />
          ) : view === 'persons' ? (
            <PersonsView persons={persons} interactions={interactions} onOpen={goPerson} />
          ) : (
            <EventsCalendar persons={persons} onOpenPerson={goPerson} />
          )}
        </div>
      </main>

      <PersonDialog
        open={dialog.open}
        editing={dialog.editing}
        onClose={() => setDialog({ open: false, editing: null })}
        onSaved={(id) => {
          setDialog({ open: false, editing: null });
          goPerson(id);
        }}
      />
    </div>
  );
}
