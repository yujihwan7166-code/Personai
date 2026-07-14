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
import { CalendarHeart, Gift, Home, Plus, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersons, useInteractions, useCategories } from '@/hooks/usePeople';
import { PersonsView } from '@/components/people/PersonsView';
import { PersonDetail } from '@/components/people/PersonDetail';
import { PersonForm } from '@/components/people/PersonForm';
import { TodayView } from '@/components/people/TodayView';
import { computeOverdue } from '@/lib/people/overdue';
import { EventsCalendar } from '@/components/people/EventsCalendar';
import { GiftLedger } from '@/components/people/GiftLedger';
import { todayKey } from '@/types/travel';
import type { Person } from '@/types/people';

type View = 'today' | 'persons' | 'calendar' | 'gifts';

const NAV: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: 'today', label: '오늘 챙길 것', icon: Home },
  { id: 'persons', label: '사람', icon: Users },
  { id: 'calendar', label: '경조사 캘린더', icon: CalendarHeart },
  { id: 'gifts', label: '주고받은 선물', icon: Gift },
];

const SECTION_HEAD: Record<View, { eyebrow: string; title: string }> = {
  today: { eyebrow: 'PEOPLE TO CARE', title: '오늘 챙길 것' },
  persons: { eyebrow: 'MY PEOPLE', title: '사람' },
  calendar: { eyebrow: 'OCCASIONS', title: '경조사 캘린더' },
  gifts: { eyebrow: 'GIFTS & OCCASIONS', title: '주고받은 선물' },
};

export default function People() {
  const persons = usePersons();
  const interactions = useInteractions();
  const categories = useCategories();
  const [view, setView] = useState<View>('today');
  const [openId, setOpenId] = useState<string | null>(null);
  // 새 사람/수정 — 플로팅 모달이 아니라 본문에 레코드 카드 양식으로 인라인.
  const [editor, setEditor] = useState<{ open: boolean; editing: Person | null }>({ open: false, editing: null });

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
  /** 주고받은 선물 총 건수 — 내비 우측 실데이터. */
  const giftCount = useMemo(
    () => interactions.filter((x) => x.kind === 'gift_given' || x.kind === 'gift_received').length,
    [interactions],
  );
  /** 내비 우측 숫자 — "실데이터가 서술어" 문법의 내비 버전. */
  const navCountOf = (id: View): number => {
    if (id === 'persons') return persons.length;
    if (id === 'calendar') return monthEvents;
    if (id === 'gifts') return giftCount;
    return 0;
  };

  const goPerson = (id: string) => {
    setOpenId(id);
    setView('persons');
  };

  /* 사이드바 항목 — 아이콘 + 라벨 + 배지, 활성 = 테라코타 채움 알약 (사이드바 표준 디자인). */
  const navBtn = (item: (typeof NAV)[number]) => {
    const active = view === item.id;
    const count = navCountOf(item.id);
    const Icon = item.icon;
    const alert = item.id === 'today' && badge > 0;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => { setView(item.id); setOpenId(null); }}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'mb-1 flex w-full items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-left text-[13.5px] transition-all',
          active
            ? 'bg-[hsl(var(--people-accent))] font-bold text-white shadow-[0_6px_16px_-7px_hsl(var(--people-accent)/0.55)]'
            : 'font-medium text-foreground/70 hover:bg-[hsl(var(--people-accent))]/8',
        )}
      >
        <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-white' : 'text-muted-foreground/70')} />
        <span className="flex-1">{item.label}</span>
        {alert ? (
          <span className={cn('flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums', active ? 'bg-white/25 text-white' : 'bg-[hsl(var(--people-accent))] text-white')}>{badge}</span>
        ) : count > 0 ? (
          <span className={cn('rounded-md px-1.5 py-px text-[11px] font-bold tabular-nums', active ? 'bg-white/25 text-white' : 'bg-[hsl(var(--hairline))]/60 text-muted-foreground')}>{count}</span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="people-theme flex h-dvh bg-background text-foreground">
      {/* ── 사이드바 — 방 내비 (클릭 시 활성 하이라이트, 데일리 로그와 동일 문법) ── */}
      <aside className="hidden w-[248px] shrink-0 flex-col overflow-y-auto border-r border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] sm:flex">
        {/* 헤더 — 아이브로우 + 도구명(검정) + 사람 수 칩 (사이드바 표준 디자인) */}
        <div className="px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.22em] text-muted-foreground/60">KEEP IN TOUCH</p>
              <h1 className="mt-1 font-sans text-[21px] font-extrabold leading-none tracking-[-0.02em] text-foreground">인맥노트</h1>
            </div>
            <div className="w-[52px] shrink-0 overflow-hidden rounded-[13px] border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] text-center shadow-[0_2px_6px_-2px_hsl(var(--foreground)/0.14)]">
              <div className="bg-[hsl(var(--people-accent))] py-[3px] text-[9px] font-bold tracking-[0.08em] text-white">사람</div>
              <div className="pb-1.5 pt-1 text-[20px] font-extrabold leading-none tabular-nums text-foreground">{persons.length}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 pt-1" aria-label="인맥노트 섹션">
          {NAV.map(navBtn)}
        </nav>

        <div className="px-4 pb-4 pt-2">
          <button
            type="button"
            onClick={() => { setOpenId(null); setEditor({ open: true, editing: null }); }}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[hsl(var(--foreground))] py-3 text-[13.5px] font-bold text-[hsl(var(--background))] shadow-[0_8px_18px_-8px_hsl(var(--foreground)/0.75)] transition-[filter] hover:brightness-[1.12]"
          >
            <Plus className="h-4 w-4" /> 새 사람
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
              onClick={() => { setOpenId(null); setEditor({ open: true, editing: null }); }}
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

          {/* 섹션 머리 (상세·편집 화면에선 숨김) */}
          {!openPerson && !editor.open && (
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

          {editor.open ? (
            /* 새 사람/수정 — 저장될 레코드 카드 양식 그대로 본문에 인라인 (플로팅 아님) */
            <PersonForm
              key={editor.editing?.id ?? 'new'}
              editing={editor.editing}
              categories={categories}
              onCancel={() => { const back = editor.editing; setEditor({ open: false, editing: null }); if (back) setOpenId(back.id); }}
              onSaved={(id) => { setEditor({ open: false, editing: null }); goPerson(id); }}
            />
          ) : openPerson ? (
            /* key — 사람이 바뀌면 컴포저 초안·삭제 대기 상태가 남지 않게 remount */
            <PersonDetail
              key={openPerson.id}
              person={openPerson}
              categories={categories}
              onBack={() => setOpenId(null)}
              onEdit={() => setEditor({ open: true, editing: openPerson })}
            />
          ) : view === 'today' ? (
            <TodayView persons={persons} interactions={interactions} onOpenPerson={goPerson} />
          ) : view === 'persons' ? (
            <PersonsView persons={persons} interactions={interactions} categories={categories} onOpen={goPerson} />
          ) : view === 'calendar' ? (
            <EventsCalendar persons={persons} onOpenPerson={goPerson} />
          ) : (
            <GiftLedger persons={persons} interactions={interactions} onOpenPerson={goPerson} />
          )}
        </div>
      </main>
    </div>
  );
}
