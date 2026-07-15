/**
 * 오늘의 나 (/today) — 여러 방의 "오늘 관련" 데이터를 한 화면으로 모으는 크로스룸 홈.
 *
 * 새 데이터 모델 없음 — 기존 스토어를 조합만 한다:
 *   플래너(할 일·다음 일정) · 건강기록(복약·다음 진료) · 인맥노트(안부) · 데일리 로그(오늘 기록).
 * 각 카드는 해당 방 색으로 강조하고, 누르면 그 방으로 이동.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock, Check, ChevronRight, Bell, Pill, HeartPulse, Users, NotebookPen, ListChecks,
} from 'lucide-react';
import { useTodayTasks } from '@/hooks/planner/useTodayTasks';
import { useUpcomingEvent } from '@/hooks/planner/useUpcomingEvent';
import { useHealth } from '@/hooks/useHealth';
import { useTodayJournal } from '@/hooks/useJournal';
import { usePersons, useInteractions } from '@/hooks/usePeople';
import { computeOverdue } from '@/lib/people/overdue';
import { healthStore } from '@/services/healthStore';
import { todayKey } from '@/types/travel';

/** 방별 강조색 (raw HSL 트리플렛). */
const TINT = {
  planner: '220 70% 55%',
  health: '152 58% 37%',
  people: '28 84% 50%',
  journal: '146 27% 39%',
};
const c = (t: string) => `hsl(${t})`;
const cs = (t: string, a: number) => `hsl(${t} / ${a})`;

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
function ddayLabel(n: number) { return n === 0 ? 'D-day' : n > 0 ? `D-${n}` : `D+${-n}`; }

function SectionCard({ tint, icon, title, count, onOpen, children }: { tint: string; icon: React.ReactNode; title: string; count?: number; onOpen: () => void; children: React.ReactNode }) {
  return (
    <section className="flex flex-col rounded-[20px] border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-5">
      <button type="button" onClick={onOpen} className="group mb-3 flex items-center gap-2 text-left">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]" style={{ backgroundColor: cs(tint, 0.13), color: c(tint) }}>{icon}</span>
        <h2 className="text-[15px] font-extrabold text-foreground">{title}</h2>
        {count !== undefined && count > 0 && <span className="rounded-full px-2 py-0.5 text-[11.5px] font-bold" style={{ backgroundColor: cs(tint, 0.12), color: c(tint) }}>{count}</span>}
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
      </button>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-2 text-[13px] text-muted-foreground">{text}</p>;
}

export default function Today() {
  const navigate = useNavigate();
  const today = todayKey();
  const now = new Date();

  const tasks = useTodayTasks();
  const upcoming = useUpcomingEvent();
  const { meds, visits } = useHealth();
  const todayEntries = useTodayJournal();
  const persons = usePersons();
  const interactions = useInteractions();

  const greeting = now.getHours() < 5 ? '늦은 밤이에요' : now.getHours() < 11 ? '좋은 아침이에요' : now.getHours() < 17 ? '좋은 오후예요' : now.getHours() < 22 ? '좋은 저녁이에요' : '오늘 하루 고생했어요';
  const dateLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAY[now.getDay()]}요일`;

  const activeMeds = meds.filter((m) => m.active);
  const medsUndone = activeMeds.filter((m) => !m.takenDates.includes(today));
  const dday = (t: string) => Math.round((parseYmd(t).getTime() - parseYmd(today).getTime()) / 86400000);
  const nextVisit = useMemo(() => visits.filter((v) => v.nextDate && v.nextDate >= today).sort((a, b) => a.nextDate!.localeCompare(b.nextDate!))[0] ?? null, [visits, today]);
  const overdue = useMemo(() => computeOverdue(persons, interactions, today).slice(0, 3), [persons, interactions, today]);
  const hasJournalToday = todayEntries.some((e) => e.body.trim() || e.title?.trim());

  const careCount = medsUndone.length + (nextVisit ? 1 : 0) + overdue.length + (hasJournalToday ? 0 : 1);

  return (
    <div className="flex h-dvh flex-col overflow-y-auto bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1120px] px-5 py-7 sm:px-8">
        {/* 마스트헤드 */}
        <div className="mb-6">
          <p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground/70">{dateLabel}</p>
          <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-foreground">{greeting}</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {careCount > 0 ? <>오늘 챙길 것 <span className="font-bold text-foreground">{careCount}가지</span> · 할 일 {tasks.length}개</> : '오늘은 특별히 챙길 게 없어요. 여유로운 하루 보내세요.'}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* 다음 일정 */}
          {upcoming && (
            <div className="rounded-[20px] border p-5 lg:col-span-2" style={{ borderColor: cs(TINT.planner, 0.25), backgroundColor: cs(TINT.planner, 0.06) }}>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" style={{ color: c(TINT.planner) }} />
                <span className="text-[12px] font-bold" style={{ color: c(TINT.planner) }}>다음 일정</span>
                <button type="button" onClick={() => navigate('/planner')} className="ml-auto text-[12px] text-muted-foreground hover:text-foreground">플래너 열기 →</button>
              </div>
              <div className="mt-2 flex items-baseline gap-2.5">
                <span className="text-[22px] font-extrabold tabular-nums" style={{ color: c(TINT.planner) }}>{hhmm(upcoming.startAt)}</span>
                <span className="text-[15px] font-semibold text-foreground">{upcoming.title}</span>
              </div>
            </div>
          )}

          {/* 오늘 할 일 (플래너) */}
          <SectionCard tint={TINT.planner} icon={<ListChecks className="h-4 w-4" />} title="오늘 할 일" count={tasks.length} onOpen={() => navigate('/planner')}>
            {tasks.length === 0 ? <Empty text="오늘 할 일이 없어요." />
              : (
                <ul className="flex flex-col">
                  {tasks.slice(0, 5).map((t) => (
                    <li key={t.id} className="flex items-center gap-2.5 border-b border-[hsl(var(--hairline))]/60 py-2 last:border-0">
                      <span className="h-4 w-4 shrink-0 rounded-[5px] border-2 border-[hsl(var(--hairline))]" />
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground">{t.title}</span>
                      {t.startAt && <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">{hhmm(t.startAt)}</span>}
                    </li>
                  ))}
                  {tasks.length > 5 && <li className="pt-1.5 text-[12px] text-muted-foreground">+{tasks.length - 5}개 더</li>}
                </ul>
              )}
          </SectionCard>

          {/* 건강 챙기기 */}
          <SectionCard tint={TINT.health} icon={<HeartPulse className="h-4 w-4" />} title="건강 챙기기" onOpen={() => navigate('/health')}>
            {nextVisit && (
              <div className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: cs(TINT.health, 0.08) }}>
                <CalendarClock className="h-3.5 w-3.5 shrink-0" style={{ color: c(TINT.health) }} />
                <span className="text-[12.5px] text-foreground/80">다음 진료 <b style={{ color: c(TINT.health) }}>{ddayLabel(dday(nextVisit.nextDate!))}</b> · {nextVisit.place}</span>
              </div>
            )}
            {activeMeds.length === 0 ? <Empty text="복용 중인 약이 없어요." />
              : medsUndone.length === 0 ? <p className="flex items-center gap-1.5 py-1 text-[13px] text-muted-foreground"><Check className="h-4 w-4" style={{ color: c(TINT.health) }} /> 오늘 복약 모두 완료</p>
              : (
                <ul className="flex flex-col">
                  {medsUndone.map((m) => (
                    <li key={m.id} className="flex items-center gap-2.5 border-b border-[hsl(var(--hairline))]/60 py-2 last:border-0">
                      <button type="button" onClick={() => healthStore.toggleTaken(m.id)} aria-label={`${m.name} 복용 체크`} className="h-5 w-5 shrink-0 rounded-[6px] border-2 border-[hsl(var(--hairline))] transition-colors hover:border-[hsl(152_58%_37%/0.7)]" />
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground"><Pill className="mr-1 inline h-3.5 w-3.5 align-[-2px] text-muted-foreground" />{m.name}</span>
                      {m.schedule && <span className="shrink-0 text-[11.5px] text-muted-foreground">{m.schedule}</span>}
                    </li>
                  ))}
                </ul>
              )}
          </SectionCard>

          {/* 안부 챙길 사람 (인맥) */}
          <SectionCard tint={TINT.people} icon={<Users className="h-4 w-4" />} title="안부 챙길 사람" count={overdue.length} onOpen={() => navigate('/people')}>
            {overdue.length === 0 ? <Empty text="지금 챙길 사람은 없어요." />
              : (
                <ul className="flex flex-col">
                  {overdue.map((o) => (
                    <li key={o.person.id} className="flex items-center gap-2.5 border-b border-[hsl(var(--hairline))]/60 py-2 last:border-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ backgroundColor: c(TINT.people) }}>{o.person.name.slice(0, 1)}</span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-foreground">{o.person.name}</span>
                      <span className="shrink-0 text-[11.5px] text-muted-foreground">{o.months}개월+ 전</span>
                    </li>
                  ))}
                </ul>
              )}
          </SectionCard>

          {/* 오늘 기록 (데일리 로그) */}
          <SectionCard tint={TINT.journal} icon={<NotebookPen className="h-4 w-4" />} title="오늘 기록" onOpen={() => navigate('/journal')}>
            {hasJournalToday ? (
              <p className="flex items-center gap-1.5 py-1 text-[13px] text-muted-foreground"><Check className="h-4 w-4" style={{ color: c(TINT.journal) }} /> 오늘 하루를 남겼어요.</p>
            ) : (
              <div className="py-1">
                <p className="text-[13px] text-muted-foreground">오늘 하루는 어땠나요? 아직 안 남겼어요.</p>
                <button type="button" onClick={() => navigate('/journal')} className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold text-white" style={{ backgroundColor: c(TINT.journal) }}>
                  <NotebookPen className="h-3.5 w-3.5" /> 오늘 기록 쓰기
                </button>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
