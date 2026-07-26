/**
 * 주고받은 선물 — 인맥노트 리디자인 1f 그대로.
 *
 * 임박 배너(생일 임박·선물 미준비) + 월별 타임라인(줌↗/받음↙) + 우패널(사람별 균형).
 * 사람 상세의 '관계 흐름'에 흩어진 gift 기록을 교차 집계(스키마 변경 없이 interactions 재사용).
 * 하단 인라인 컴포저로 어느 사람에게든 바로 선물 기록. */
import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, ChevronDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { peopleStore } from '@/services/peopleStore';
import { Avatar } from '@/components/people/PersonsView';
import { diffDays, todayKey } from '@/types/travel';
import { nextOccurrence, type Interaction, type Person } from '@/types/people';

type Lens = 'all' | 'gift_given' | 'gift_received';
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

export function GiftLedger({
  persons, interactions, onOpenPerson, onNewPerson,
}: {
  persons: Person[];
  interactions: Interaction[];
  onOpenPerson: (id: string) => void;
  onNewPerson: () => void;
}) {
  const today = todayKey();
  const thisYear = today.slice(0, 4);
  const [lens, setLens] = useState<Lens>('all');
  const [thisYearOnly, setThisYearOnly] = useState(true);
  const [composer, setComposer] = useState<{ personId: string; kind: 'gift_given' | 'gift_received'; note: string; date: string } | null>(null);

  const personMap = useMemo(() => new Map(persons.map((p) => [p.id, p])), [persons]);

  const allGifts = useMemo(
    () => interactions.filter((x) => x.kind === 'gift_given' || x.kind === 'gift_received').sort((a, b) => b.date.localeCompare(a.date)),
    [interactions],
  );
  const scoped = thisYearOnly ? allGifts.filter((x) => x.date.slice(0, 4) === thisYear) : allGifts;
  const givenCount = scoped.filter((x) => x.kind === 'gift_given').length;
  const receivedCount = scoped.length - givenCount;
  const shown = lens === 'all' ? scoped : scoped.filter((x) => x.kind === lens);

  /** 월별 그룹 (최신 먼저). */
  const byMonth = useMemo(() => {
    const map = new Map<string, Interaction[]>();
    for (const x of shown) { const k = x.date.slice(0, 7); const a = map.get(k); if (a) a.push(x); else map.set(k, [x]); }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [shown]);

  /** 사람별 균형. */
  const balance = useMemo(() => {
    const m = new Map<string, { given: number; received: number }>();
    for (const x of scoped) {
      const e = m.get(x.personId) ?? { given: 0, received: 0 };
      if (x.kind === 'gift_given') e.given += 1; else e.received += 1;
      m.set(x.personId, e);
    }
    return [...m.entries()].map(([id, v]) => ({ person: personMap.get(id), ...v })).filter((r) => r.person);
  }, [scoped, personMap]);

  /** 임박 — 7일 내 생일인데 최근(45일) 준 선물 없음. */
  const impending = useMemo(() => {
    let best: { p: Person; dday: number } | null = null;
    for (const p of persons) {
      if (!p.birthday) continue;
      const { dday } = nextOccurrence(p.birthday, today);
      if (dday > 7) continue;
      const prepared = allGifts.some((g) => g.personId === p.id && g.kind === 'gift_given' && diffDays(g.date, today) >= 0 && diffDays(g.date, today) <= 45);
      if (prepared) continue;
      if (!best || dday < best.dday) best = { p, dday };
    }
    if (!best) return null;
    const lastReceived = allGifts.find((g) => g.personId === best!.p.id && g.kind === 'gift_received');
    return { ...best, lastReceived };
  }, [persons, allGifts, today]);
  const ddayWord = (d: number) => (d === 0 ? '오늘' : d === 1 ? '내일' : `${d}일 뒤`);

  const openComposer = (personId?: string, kind: 'gift_given' | 'gift_received' = 'gift_given') => {
    if (persons.length === 0) { onNewPerson(); return; }
    setComposer({ personId: personId ?? persons[0].id, kind, note: '', date: today });
  };
  const saveComposer = () => {
    if (!composer || !composer.note.trim()) return;
    if (peopleStore.addInteraction({ personId: composer.personId, kind: composer.kind, date: composer.date, note: composer.note.trim() })) {
      notify.success('선물 기록을 남겼어요');
      setComposer(null);
    }
  };

  const fmtDay = (date: string) => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── 마스트헤드 ── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-[7px] text-[11px] font-bold tracking-[0.14em] text-[#a08343]">GIFTS</div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[26px] font-bold tracking-[-0.015em] text-[#191c20]">주고받은 선물</span>
            <span className="text-[14px] text-[#8d949d]">{thisYearOnly ? '올해' : '전체'} 준 {givenCount} · 받은 {receivedCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex rounded-[8px] bg-[#eae3d3] p-0.5">
            {(['all', 'gift_given', 'gift_received'] as Lens[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLens(l)}
                className={cn('inline-flex h-[34px] items-center rounded-[6px] px-3.5 text-[13.5px] transition-colors', lens === l ? 'bg-white font-semibold text-[#23262b] shadow-[0_1px_2px_rgba(60,40,10,0.08)]' : 'font-medium text-[#8a8471]')}
              >
                {l === 'all' ? '전체' : l === 'gift_given' ? '준 선물' : '받은 선물'}
              </button>
            ))}
          </span>
          <button type="button" onClick={() => setThisYearOnly((v) => !v)} className="inline-flex h-[38px] items-center gap-[7px] rounded-[8px] border border-[#e9e2d2] bg-white px-3.5 text-[13.5px] font-medium text-[#4b5158] transition-colors hover:bg-[#faf7f0]">
            {thisYearOnly ? '올해' : '전체 기간'} <ChevronDown className="h-[13px] w-[13px]" />
          </button>
          <button type="button" onClick={() => openComposer()} className="inline-flex h-[38px] items-center gap-[7px] rounded-[8px] bg-[#b45309] px-[18px] text-[14px] font-semibold text-white transition-colors hover:bg-[#9c4708]">
            <Plus className="h-[15px] w-[15px]" strokeWidth={2.4} /> 선물 기록
          </button>
        </div>
      </div>

      {/* ── 임박 배너 ── */}
      {impending && (
        <div className="mb-5 flex flex-wrap items-center gap-3.5 rounded-[10px] bg-[#f2e5cf] px-5 py-4">
          <span className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#e9d4ad] text-[#a15008]"><ArrowUpRight className="h-4 w-4" strokeWidth={1.7} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-[#8f4207]">{ddayWord(impending.dday)} {impending.p.name} 님 생일 — 아직 선물이 없어요</span>
            <span className="mt-[3px] block text-[12.5px] text-[#8f6a3a]">
              {impending.lastReceived ? `지난번엔 ${impending.lastReceived.note || '선물'}을 받았어요` : '지난 선물 기록이 없어요'}
              {impending.p.likes[0] ? ` · 기억할 것: ${impending.p.likes[0]}` : ''}
            </span>
          </span>
          <span className="flex flex-none items-center gap-2">
            <button type="button" onClick={() => onOpenPerson(impending.p.id)} className="inline-flex h-[34px] items-center rounded-[8px] bg-white px-3.5 text-[13px] font-semibold text-[#8f4207] shadow-[0_1px_2px_rgba(60,40,10,0.08)] transition-colors hover:bg-[#fdf7ec]">아이디어 메모</button>
            <button type="button" onClick={() => openComposer(impending.p.id, 'gift_given')} className="inline-flex h-[34px] items-center rounded-[8px] bg-[#b45309] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#9c4708]">선물 고르기</button>
          </span>
        </div>
      )}

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        {/* ── 타임라인 ── */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-[10px] border border-[#e9e2d2] bg-white">
          {shown.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-[13.5px] text-[#98917d]">{allGifts.length === 0 ? '아직 주고받은 선물 기록이 없어요.' : '이 조건에 맞는 기록이 없어요.'}</p>
            </div>
          ) : (
            byMonth.map(([key, list]) => (
              <div key={key} className="px-[10px] pb-1 last:pb-2">
                <div className="flex items-center gap-2.5 px-3 pb-2 pt-3">
                  <span className="text-[12px] font-bold tracking-[0.05em] text-[#a08343]">{MONTHS[Number(key.slice(5, 7)) - 1]}{key.slice(0, 4) !== thisYear ? ` ${key.slice(0, 4)}` : ''}</span>
                  <span className="h-px flex-1 bg-[#f0ebdf]" />
                </div>
                {list.map((x) => {
                  const p = personMap.get(x.personId);
                  const given = x.kind === 'gift_given';
                  return (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => onOpenPerson(x.personId)}
                      /* 표 줄(아래 실선)이었다 — 이 방의 다른 화면은 전부 크림 카드
                         한 장이 한 건이다. 선 대신 카드로 바꿔 문법을 맞춘다. */
                      className="mb-1.5 flex w-full items-center gap-3.5 rounded-[10px] border border-[#f0ebdf] bg-[#faf7f0] px-3 py-2.5 text-left transition-colors hover:border-[#e2d3b6]"
                    >
                      <span className={cn('inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full', given ? 'bg-[#f2e5cf] text-[#a15008]' : 'bg-[#efeadd] text-[#6b655a]')}>
                        {given ? <ArrowUpRight className="h-4 w-4" strokeWidth={1.7} /> : <ArrowDownLeft className="h-4 w-4" strokeWidth={1.7} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[14.5px] font-semibold text-[#23262b]">{x.note || '선물'}</span>
                          <span className={cn('inline-flex h-[22px] shrink-0 items-center rounded-full px-[9px] text-[11.5px] font-semibold', given ? 'bg-[#f2e5cf] text-[#8f4207]' : 'bg-[#efeadd] text-[#5a5648]')}>{given ? '줌' : '받음'}</span>
                        </span>
                        <span className="mt-[3px] block text-[12.5px] text-[#8d949d]">{fmtDay(x.date)}</span>
                      </span>
                      <span className="flex flex-none items-center gap-2">
                        {p ? <Avatar name={p.name} size={28} color={p.color} photo={p.photo} /> : <span className="h-7 w-7 shrink-0 rounded-full bg-[#efeadd]" />}
                        <span className="text-[13px] text-[#4b5158]">{p?.name ?? '(삭제됨)'}</span>
                      </span>
                      <span className="hidden w-[110px] flex-none items-center gap-1.5 text-[12px] text-[#7d8a6e] sm:inline-flex">
                        {!given && <><Check className="h-[13px] w-[13px] text-[#6f8a5e]" strokeWidth={2} /> 받은 기록</>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
          {/* 추가 버튼은 하나뿐 — 달 묶음 안에 있어서 7월·6월 두 그룹이면 목록 중간에
              같은 버튼이 두 번 끼어 있었다. 맨 아래 한 번만. */}
          <button type="button" onClick={() => openComposer()} className="flex w-full items-center gap-2.5 border-t border-[#f3efe4] px-[22px] py-3.5 text-left text-[14px] text-[#868d97] transition-colors hover:bg-[#faf7f0]">
            <Plus className="h-[15px] w-[15px]" /> 선물 기록 추가
          </button>
        </div>

        {/* ── 사람별 균형 ── */}
        <div className="w-full shrink-0 rounded-[10px] border border-[#e9e2d2] bg-white px-[22px] py-[18px] lg:w-[380px]">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-[15px] font-bold text-[#191c20]">사람별 균형</span>
            <span className="text-[12px] text-[#8d949d]">{thisYearOnly ? '올해' : '전체'}</span>
          </div>
          <div className="mb-2 text-[12.5px] text-[#98917d]">주고받음이 한쪽으로 기울면 알려드려요</div>
          {balance.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-[#e2d9c4] bg-[#faf7f0] px-4 py-6 text-center text-[13px] text-[#98917d]">선물을 기록하면 사람별 균형이 보여요.</p>
          ) : (
            balance.map(({ person, given, received }) => {
              const p = person!;
              const note = given > 0 && received === 0 ? '준 것만 있어요' : received > 0 && given === 0 ? '받기만 했어요 — 챙길 기회예요' : null;
              return (
                <div key={p.id} className="border-b border-[#f3efe4] py-3.5 last:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={p.name} size={30} color={p.color} photo={p.photo} />
                    <button type="button" onClick={() => onOpenPerson(p.id)} className="text-[13.5px] font-semibold text-[#23262b] hover:text-[#8f4207]">{p.name}</button>
                    <span className="ml-auto text-[12px] text-[#8d949d]">준 {given} · 받은 {received}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5 pl-10">
                    <span className="w-5 text-[11px] text-[#98917d]">줌</span>
                    <span className="h-2 rounded-[2px]" style={{ width: Math.max(16, given * 16), backgroundColor: given > 0 ? '#b45309' : '#efeadd' }} />
                  </div>
                  <div className="mt-1 flex items-center gap-2.5 pl-10">
                    <span className="w-5 text-[11px] text-[#98917d]">받음</span>
                    <span className="h-2 rounded-[2px]" style={{ width: Math.max(16, received * 16), backgroundColor: received > 0 ? '#d9cdb3' : '#efeadd' }} />
                  </div>
                  {note && <div className="mt-2 pl-10 text-[12px] text-[#8f4207]">{note}</div>}
                </div>
              );
            })
          )}
          <div className="flex items-center gap-2 pt-3.5 text-[12.5px] text-[#98917d]">
            <ArrowUpRight className="h-[14px] w-[14px]" /> 가격은 나만 보여요 — 목록에선 숨길 수 있어요
          </div>
        </div>
      </div>

      {/* ── 인라인 선물 컴포저 ── */}
      {composer && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[10px] border border-[#e9e2d2] bg-white px-4 py-3">
          <select
            value={composer.personId}
            onChange={(e) => setComposer({ ...composer, personId: e.target.value })}
            className="h-9 rounded-[8px] border border-[#e9e2d2] bg-white px-2.5 text-[13px] text-[#3f434e] outline-none focus:border-[#d6a066]"
          >
            {persons.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="inline-flex rounded-[8px] bg-[#eae3d3] p-0.5">
            {(['gift_given', 'gift_received'] as const).map((k) => (
              <button key={k} type="button" onClick={() => setComposer({ ...composer, kind: k })} className={cn('inline-flex h-8 items-center rounded-[6px] px-3 text-[12.5px] transition-colors', composer.kind === k ? 'bg-white font-semibold text-[#23262b] shadow-[0_1px_2px_rgba(60,40,10,0.08)]' : 'font-medium text-[#8a8471]')}>{k === 'gift_given' ? '줌' : '받음'}</button>
            ))}
          </span>
          <input
            value={composer.note}
            onChange={(e) => setComposer({ ...composer, note: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) saveComposer(); }}
            placeholder="무슨 선물이었나요?"
            autoFocus
            className="h-9 min-w-0 flex-1 rounded-[8px] border border-[#e9e2d2] bg-[#fdfbf7] px-3 text-[13px] text-[#3f434e] outline-none placeholder:text-[#98917d] focus:border-[#d6a066]"
          />
          <input
            type="date"
            value={composer.date}
            onChange={(e) => setComposer({ ...composer, date: e.target.value })}
            aria-label="날짜"
            className="h-9 rounded-[8px] border border-[#e9e2d2] bg-white px-2.5 text-[12.5px] tabular-nums text-[#5a5648] outline-none focus:border-[#d6a066]"
          />
          <button type="button" onClick={saveComposer} disabled={!composer.note.trim()} className="inline-flex h-9 items-center rounded-[8px] bg-[#b45309] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#9c4708] disabled:opacity-40">저장</button>
          <button type="button" onClick={() => setComposer(null)} aria-label="닫기" className="p-1 text-[#98917d] hover:text-[#5a5648]"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}
