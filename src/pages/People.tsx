/**
 * 인맥노트 — /people (인맥노트 리디자인 그대로).
 *
 * 그라파이트 레일 + 앰버 페이퍼 사이드바(확정 크롬) + 라이트 앰버 콘텐츠.
 * 각 뷰가 자체 마스트헤드를 갖는다(리디자인 1a~1f). 데이터: peopleStore(LocalStorage).
 */
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
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

const NAV: Array<{ id: View; label: string; emoji: string }> = [
  { id: 'today', label: '오늘 챙길 것', emoji: '🔔' },
  { id: 'persons', label: '사람', emoji: '👥' },
  { id: 'calendar', label: '경조사 캘린더', emoji: '💐' },
  { id: 'gifts', label: '주고받은 선물', emoji: '🎁' },
];

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
  const newPerson = () => { setOpenId(null); setEditor({ open: true, editing: null }); };

  /* 사이드바 항목 — 이모지 + 라벨 + 배지, 활성 = 흰 알약(확정 크롬). */
  const navBtn = (item: (typeof NAV)[number]) => {
    const active = view === item.id;
    const count = navCountOf(item.id);
    const alert = item.id === 'today' && badge > 0;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => { setView(item.id); setOpenId(null); }}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-[38px] w-full items-center gap-2.5 rounded-[9px] px-3 text-left text-[14px] transition-colors',
          active
            ? 'bg-white font-semibold text-[#8f4207] shadow-[0_1px_2px_rgba(60,40,10,0.08)]'
            : 'font-medium text-[#5a5648] hover:bg-white/55',
        )}
      >
        <span aria-hidden className="w-[19px] shrink-0 text-center text-[16px] leading-none">{item.emoji}</span>
        <span className="flex-1">{item.label}</span>
        {alert ? (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#b45309] px-1 text-[10px] font-bold tabular-nums text-white">{badge}</span>
        ) : count > 0 ? (
          <span className={cn('text-[12.5px] tabular-nums', active ? 'font-semibold text-[#a15008]' : 'text-[#98917d]')}>{count}</span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="people-theme flex h-dvh bg-[#f8f4ec] text-[#23262b]">
      {/* ── 사이드바 — 방 내비 (앰버 페이퍼, 확정 크롬) ── */}
      <aside className="hidden w-[256px] shrink-0 flex-col overflow-y-auto border-r border-[#ece2cc] bg-[#f7efe1] sm:flex">
        {/* 헤더 — 34px 흰 마크 + 제목 + 부제 */}
        <div className="px-3.5 pb-1 pt-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-white text-[17px] shadow-[0_1px_2px_rgba(60,40,10,0.08)]" role="img" aria-label="인맥노트">🤝</span>
            <div className="min-w-0">
              <div className="text-[16px] font-bold leading-tight tracking-[-0.01em] text-[#191c20]">인맥노트</div>
              <div className="truncate text-[12px] leading-tight text-[#a08343]">곁의 사람을 챙기는 노트</div>
            </div>
          </div>
        </div>

        <div className="px-3 pb-1.5 pt-5 text-[11.5px] font-semibold tracking-[0.05em] text-[#a08343]">메뉴</div>
        <nav className="flex-1 overflow-y-auto px-2.5 pb-2" aria-label="인맥노트 섹션">
          {NAV.map(navBtn)}
          {/* 새 사람 추가 칸 — 목록 아래 */}
          <button
            type="button"
            onClick={newPerson}
            className="mt-0.5 flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[13.5px] text-[#98917d] transition-colors hover:bg-white/55 hover:text-[#8f4207]"
          >
            <span aria-hidden className="flex w-[19px] shrink-0 items-center justify-center"><Plus className="h-[15px] w-[15px]" /></span>
            <span className="flex-1">새 사람</span>
          </button>
        </nav>
      </aside>

      {/* ── 메인 ── */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-[1240px] flex-col px-4 pb-8 pt-7 sm:px-10">
          {/* 모바일 — 가로 내비 */}
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 sm:hidden">
            <button
              type="button"
              onClick={newPerson}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#b45309] px-3.5 py-1.5 text-[12px] font-bold text-white"
            >
              <Plus className="h-3 w-3" /> 새 사람
            </button>
            {NAV.map((item) => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setView(item.id); setOpenId(null); }}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors',
                    active
                      ? 'border-transparent bg-[#f2e5cf] font-bold text-[#8f4207]'
                      : 'border-[#e9e2d2] bg-white text-[#5a5648]',
                  )}
                >
                  <span aria-hidden className="text-[13px] leading-none">{item.emoji}</span> {item.label}
                  {item.id === 'today' && badge > 0 && <span className="rounded-full bg-[#b45309] px-1 text-[9.5px] font-bold text-white">{badge}</span>}
                </button>
              );
            })}
          </div>

          {editor.open ? (
            /* 새 사람/수정 — 저장될 레코드 카드 양식 그대로 본문에 인라인 */
            <PersonForm
              key={editor.editing?.id ?? 'new'}
              editing={editor.editing}
              categories={categories}
              onCancel={() => { const back = editor.editing; setEditor({ open: false, editing: null }); if (back) setOpenId(back.id); }}
              onSaved={(id) => { setEditor({ open: false, editing: null }); goPerson(id); }}
            />
          ) : openPerson ? (
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
            <PersonsView persons={persons} interactions={interactions} categories={categories} onOpen={goPerson} onNewPerson={newPerson} />
          ) : view === 'calendar' ? (
            <EventsCalendar persons={persons} onOpenPerson={goPerson} onNewPerson={newPerson} />
          ) : (
            <GiftLedger persons={persons} interactions={interactions} onOpenPerson={goPerson} onNewPerson={newPerson} />
          )}
        </div>
      </main>
    </div>
  );
}
