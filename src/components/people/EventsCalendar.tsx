/**
 * 경조사 캘린더 — 인맥노트 리디자인 1d 그대로.
 *
 * 월 네비 마스트헤드 + 7열 월간 그리드(요일 색·오늘 강조·경조사 칩) + 범례
 * + 우패널(다가오는 경조사 D-day 리스트). 데이터: 생일·기념일(persons).
 */
import { useMemo, useState } from 'react';
import { Cake, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { todayKey } from '@/types/travel';
import { RELATION_META, nextOccurrence, type Person } from '@/types/people';

type EventType = 'birthday' | 'anniversary' | 'etc';
const TYPE_BG: Record<EventType, string> = { birthday: '#b45309', anniversary: '#8a5a3b', etc: '#a2a8b0' };
const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const WD_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

interface Ev { personId: string; name: string; label: string; type: EventType; relation: string }

export function EventsCalendar({ persons, onOpenPerson, onNewPerson }: { persons: Person[]; onOpenPerson: (id: string) => void; onNewPerson: () => void }) {
  const today = todayKey();
  const [anchor, setAnchor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selIso, setSelIso] = useState<string | null>(null); // 선택한 날 (그 날의 경조사 보기)
  const { y, m } = anchor;
  const goMonth = (next: { y: number; m: number }) => { setSelIso(null); setAnchor(next); };
  const lead = new Date(y, m, 1).getDay();
  const daysIn = new Date(y, m + 1, 0).getDate();
  const prevDaysIn = new Date(y, m, 0).getDate();
  const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

  /** MM-DD → 이벤트들. */
  const byMonthDay = useMemo(() => {
    const map = new Map<string, Ev[]>();
    const push = (md: string, ev: Ev) => { const a = map.get(md); if (a) a.push(ev); else map.set(md, [ev]); };
    for (const p of persons) {
      const relation = RELATION_META[p.relation].label;
      if (p.birthday) push(p.birthday, { personId: p.id, name: p.name, label: '생일', type: 'birthday', relation });
      for (const a of p.annivs) push(a.monthDay, { personId: p.id, name: p.name, label: a.label, type: a.type === 'etc' ? 'etc' : 'anniversary', relation });
    }
    return map;
  }, [persons]);

  const eventsOn = (mm: number, day: number): Ev[] => {
    const md = `${String(mm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const base = byMonthDay.get(md) ?? [];
    return mm === 1 && day === 28 && !isLeap ? [...base, ...(byMonthDay.get('02-29') ?? [])] : base;
  };

  const monthCount = useMemo(() => {
    let n = 0;
    for (let d = 1; d <= daysIn; d++) n += eventsOn(m, d).length;
    return n;
  }, [m, daysIn, byMonthDay]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 그리드 셀 — 앞뒤 달 채움 포함(디밍). */
  const cells = useMemo(() => {
    const out: Array<{ day: number; other: boolean; mm: number; iso?: string }> = [];
    for (let i = 0; i < lead; i++) out.push({ day: prevDaysIn - lead + 1 + i, other: true, mm: m - 1 });
    for (let d = 1; d <= daysIn; d++) out.push({ day: d, other: false, mm: m, iso: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    while (out.length % 7 !== 0) out.push({ day: out.length - lead - daysIn + 1, other: true, mm: m + 1 });
    return out;
  }, [lead, prevDaysIn, daysIn, m, y]);

  /** 다가오는 경조사 — 가까운 순. */
  const upcoming = useMemo(() => {
    const list: Array<Ev & { dday: number; date: string }> = [];
    for (const [md, evs] of byMonthDay) {
      const { dday, date } = nextOccurrence(md, today);
      for (const ev of evs) list.push({ ...ev, dday, date });
    }
    return list.sort((a, b) => a.dday - b.dday).slice(0, 6);
  }, [byMonthDay, today]);
  // 선택한 날 — 현재 보는 달에 속할 때만 유효.
  const selDay = selIso && selIso.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`) ? Number(selIso.slice(8, 10)) : null;
  const selEvents = selDay ? eventsOn(m, selDay) : [];
  const ddayText = (d: number) => (d === 0 ? 'D-day' : `D-${d}`);
  const fmtOcc = (date: string) => {
    const dt = new Date(`${date}T00:00:00`);
    return `${dt.getMonth() + 1}월 ${dt.getDate()}일 (${WD_SHORT[dt.getDay()]})`;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── 마스트헤드 ── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-[7px] text-[11px] font-bold tracking-[0.14em] text-[#a08343]">OCCASIONS</div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[26px] font-bold tracking-[-0.015em] text-[#191c20]">경조사 캘린더</span>
            <span className="text-[14px] text-[#8d949d]">이번 달 {monthCount}건</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-[38px] items-center overflow-hidden rounded-[8px] border border-[#e9e2d2] bg-white text-[13.5px] font-medium text-[#4b5158]">
            <button type="button" onClick={() => goMonth(m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })} aria-label="이전 달" className="flex h-full w-[34px] items-center justify-center text-[#98917d] transition-colors hover:bg-[#faf7f0]"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <span className="px-1.5 tabular-nums">{y}년 {m + 1}월</span>
            <button type="button" onClick={() => goMonth(m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })} aria-label="다음 달" className="flex h-full w-[34px] items-center justify-center text-[#98917d] transition-colors hover:bg-[#faf7f0]"><ChevronRight className="h-3.5 w-3.5" /></button>
          </span>
          <button type="button" onClick={onNewPerson} className="inline-flex h-[42px] items-center gap-[7px] rounded-[8px] bg-[#b45309] px-[18px] text-[14px] font-semibold text-white transition-colors hover:bg-[#9c4708]">
            <Plus className="h-[15px] w-[15px]" strokeWidth={2.4} /> 경조사 추가
          </button>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-6 lg:flex-row">
        {/* ── 캘린더 ── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-[#e9e2d2] bg-white">
          <div className="grid grid-cols-7 border-b border-[#f0ebdf]">
            {WEEKDAYS.map((w, i) => (
              <span key={w} className={cn('border-r border-[#f5f1e7] py-2.5 text-center text-[12px] font-semibold last:border-r-0', i === 0 ? 'text-[#c08585]' : i === 6 ? 'text-[#8a9bc9]' : 'text-[#9aa1ab]')}>{w}</span>
            ))}
          </div>
          <div className="grid flex-1 grid-cols-7" style={{ gridAutoRows: 'minmax(84px, 1fr)' }}>
            {cells.map((c, idx) => {
              const dow = idx % 7;
              const isToday = c.iso === today;
              const isSel = !!c.iso && c.iso === selIso;
              const events = c.other ? [] : eventsOn(m, c.day);
              return (
                <div
                  key={idx}
                  onClick={c.other ? undefined : () => setSelIso((cur) => (cur === c.iso ? null : c.iso!))}
                  role={c.other ? undefined : 'button'}
                  tabIndex={c.other ? undefined : 0}
                  onKeyDown={c.other ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelIso((cur) => (cur === c.iso ? null : c.iso!)); } }}
                  className={cn('flex flex-col gap-1.5 overflow-hidden border-b border-r border-[#f0ebdf] px-2.5 py-2 outline-none transition-colors', c.other ? 'bg-[#faf7f0]' : 'cursor-pointer hover:bg-[#fdfaf3]', isSel && !isToday && 'bg-[#fbf1e0]')}
                  style={isToday ? { boxShadow: 'inset 0 0 0 1.5px #b45309' } : isSel ? { boxShadow: 'inset 0 0 0 1.5px #d6a066' } : undefined}
                >
                  <span
                    className={cn('inline-flex h-[26px] w-[26px] items-center justify-center rounded-full text-[12.5px] font-semibold tabular-nums', isToday ? 'bg-[#b45309] font-bold text-white' : c.other ? 'text-[#cfc7b4]' : dow === 0 ? 'text-[#c08585]' : dow === 6 ? 'text-[#8a9bc9]' : 'text-[#3f434e]')}
                  >
                    {c.day}
                  </span>
                  {events.slice(0, 2).map((ev) => (
                    <button
                      key={`${ev.personId}-${ev.label}`}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onOpenPerson(ev.personId); }}
                      title={`${ev.name} ${ev.label}`}
                      className="inline-flex h-6 items-center gap-[5px] self-start overflow-hidden whitespace-nowrap rounded-[6px] px-[9px] text-[11.5px] font-semibold text-white transition-[filter] hover:brightness-110"
                      style={{ backgroundColor: TYPE_BG[ev.type] }}
                    >
                      <Cake className="h-[11px] w-[11px] shrink-0" /> <span className="truncate">{ev.name} {ev.label}</span>
                    </button>
                  ))}
                  {events.length > 2 && <span className="px-1 text-[10px] text-[#98917d]">외 {events.length - 2}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3.5 border-t border-[#f0ebdf] px-5 py-3 text-[12px] text-[#8d949d]">
            {(['birthday', 'anniversary', 'etc'] as EventType[]).map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TYPE_BG[t] }} />
                {t === 'birthday' ? '생일' : t === 'anniversary' ? '기념일' : '기타'}
              </span>
            ))}
          </div>
        </div>

        {/* ── 다가오는 경조사 ── */}
        <div className="w-full shrink-0 rounded-[10px] border border-[#e9e2d2] bg-white px-[22px] py-5 lg:w-[380px]">
          <div className="mb-3.5 flex items-center justify-between gap-2">
            <div className="text-[15px] font-bold text-[#191c20]">
              {selDay ? `${m + 1}월 ${selDay}일 (${WD_SHORT[new Date(y, m, selDay).getDay()]})` : '다가오는 경조사'}
            </div>
            {selDay && (
              <button type="button" onClick={() => setSelIso(null)} className="shrink-0 text-[12.5px] font-semibold text-[#a15008] transition-colors hover:text-[#8f4207]">다가오는 경조사 →</button>
            )}
          </div>
          {selDay ? (
            selEvents.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {selEvents.map((ev) => (
                  <button
                    key={`${ev.personId}-${ev.label}`}
                    type="button"
                    onClick={() => onOpenPerson(ev.personId)}
                    className="flex items-center gap-3 rounded-[10px] border border-[#f0ebdf] bg-[#faf7f0] p-3 text-left transition-colors hover:border-[#e2d3b6]"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: TYPE_BG[ev.type] }}><Cake className="h-[17px] w-[17px]" strokeWidth={1.7} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-[#23262b]">{ev.name} {ev.label}</span>
                      <span className="mt-0.5 block text-[12.5px] text-[#8d949d]">{ev.relation}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-[10px] border border-dashed border-[#e2d9c4] bg-[#faf7f0] px-4 py-6 text-center">
                <p className="text-[13px] text-[#98917d]">이 날은 등록된 경조사가 없어요.</p>
                <button type="button" onClick={onNewPerson} className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-[#b45309] px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#9c4708]">
                  <Plus className="h-3.5 w-3.5" /> 이 날 경조사 추가
                </button>
              </div>
            )
          ) : upcoming.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-[#e2d9c4] bg-[#faf7f0] px-4 py-6 text-center text-[13px] text-[#98917d]">등록된 생일·기념일이 아직 없어요.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {upcoming.map((ev) => (
                <button
                  key={`${ev.personId}-${ev.label}-${ev.date}`}
                  type="button"
                  onClick={() => onOpenPerson(ev.personId)}
                  className="flex items-center gap-3 rounded-[10px] border border-[#f0ebdf] bg-[#faf7f0] p-3 text-left transition-colors hover:border-[#e2d3b6]"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f2e5cf] text-[#a15008]"><Cake className="h-[17px] w-[17px]" strokeWidth={1.7} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-[#23262b]">{ev.name} {ev.label}</span>
                    <span className="mt-0.5 block text-[12.5px] text-[#8d949d]">{fmtOcc(ev.date)} · {ev.relation}</span>
                  </span>
                  <span className="text-[14px] font-bold text-[#8f4207]">{ddayText(ev.dday)}</span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 px-0.5 text-[13px] text-[#98917d]">
            <Cake className="h-[14px] w-[14px]" /> 선물 아이디어를 미리 메모해두세요
          </div>
        </div>
      </div>
    </div>
  );
}
