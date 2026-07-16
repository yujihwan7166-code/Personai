/**
 * 오늘 챙길 것 (다시 챙기기) — 인맥노트 리디자인 1e 그대로.
 *
 * 연락이 뜸해진 사람(친밀도별 안부 주기 초과)을 리치 카드로:
 * 관계·친밀도 칩 + 상태 문구(평소보다 N배 뜸) + 8주 스파크라인 + 오늘 연락하기/기록 보기/나중에.
 * 하단 월요일 정리 배너. 실데이터(computeOverdue + interactions) 배선.
 */
import { useMemo, useState } from 'react';
import { Bell, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { peopleStore } from '@/services/peopleStore';
import { Avatar, Sparkline } from '@/components/people/PersonsView';
import { computeOverdue, weeklyActivity } from '@/lib/people/overdue';
import { diffDays, todayKey } from '@/types/travel';
import {
  CLOSENESS_META, INTERACTION_META, RELATION_META, nextOccurrence,
  type Interaction, type Person,
} from '@/types/people';

export function TodayView({
  persons, interactions, onOpenPerson,
}: {
  persons: Person[];
  interactions: Interaction[];
  onOpenPerson: (id: string) => void;
}) {
  const today = todayKey();
  const [snoozed, setSnoozed] = useState<Set<string>>(new Set());
  const [showSnoozed, setShowSnoozed] = useState(false);

  const overdue = useMemo(() => computeOverdue(persons, interactions, today), [persons, interactions, today]);
  const byPerson = useMemo(() => {
    const m = new Map<string, Interaction[]>();
    for (const x of interactions) { const a = m.get(x.personId); if (a) a.push(x); else m.set(x.personId, [x]); }
    return m;
  }, [interactions]);

  const visible = overdue.filter((o) => showSnoozed || !snoozed.has(o.person.id));
  const snoozedCount = overdue.filter((o) => snoozed.has(o.person.id)).length;

  const logContact = (p: Person) => {
    const added = peopleStore.addInteraction({ personId: p.id, kind: 'ping', date: today, note: '안부 연락' });
    if (added) {
      notify.success(`${p.name}님에게 연락한 것으로 기록했어요`, {
        duration: 5000,
        action: { label: '되돌리기', onClick: () => peopleStore.removeInteraction(added.id) },
      });
    }
  };
  const snooze = (id: string) => setSnoozed((s) => new Set(s).add(id));

  /** 사람별 상태 계산 — 뜸한 정도·마지막 기록·다가오는 경조사 힌트. */
  const detailOf = (p: Person, months: number) => {
    const itx = (byPerson.get(p.id) ?? []).slice().sort((a, b) => b.date.localeCompare(a.date));
    const last = itx[0];
    const lastDays = last ? diffDays(last.date, today) : months * 30;
    const weeksAgo = Math.max(1, Math.round(lastDays / 7));
    const lastKind = last ? INTERACTION_META[last.kind].label : null;
    const ping = CLOSENESS_META[p.closeness].pingMonths;
    const ratio = ping > 0 ? Math.max(1, Math.round((months / ping) * 10) / 10) : 1;
    const weekly = weeklyActivity(itx, today, 8);
    // 힌트 — 다가오는 경조사 우선, 없으면 지난 기록
    let hint: string;
    const occs: Array<{ label: string; dday: number }> = [];
    if (p.birthday) occs.push({ label: '생일', dday: nextOccurrence(p.birthday, today).dday });
    for (const a of p.annivs) occs.push({ label: a.label, dday: nextOccurrence(a.monthDay, today).dday });
    occs.sort((a, b) => a.dday - b.dday);
    const occ = occs[0];
    if (occ && occ.dday <= 14) hint = `${occ.dday === 0 ? '오늘' : occ.dday === 1 ? '내일' : `${occ.dday}일 뒤`}이 ${occ.label}이에요 — 축하 인사 겸 연락해보세요`;
    else if (last?.note) hint = `지난 기록: ${last.note} — 안부 묻기 좋은 타이밍이에요`;
    else hint = '안부 묻기 좋은 타이밍이에요';
    return { weeksAgo, lastKind, ratio, weekly, hint };
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── 마스트헤드 ── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-[7px] text-[11px] font-bold tracking-[0.14em] text-[#a08343]">RECONNECT</div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[26px] font-bold tracking-[-0.015em] text-[#191c20]">오늘 챙길 것</span>
            <span className="text-[14px] text-[#8d949d]">{overdue.length > 0 ? `연락이 뜸해진 ${overdue.length}명` : '모두와 잘 연락하고 있어요'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-[38px] items-center rounded-[8px] border border-[#e9e2d2] bg-white px-3.5 text-[13.5px] font-medium text-[#4b5158]">기준: 평소 연락 주기 초과</span>
          {snoozedCount > 0 && (
            <button type="button" onClick={() => setShowSnoozed((v) => !v)} className={cn('inline-flex h-[38px] items-center gap-[7px] rounded-[8px] border px-3.5 text-[13.5px] font-medium transition-colors', showSnoozed ? 'border-[#d6a066] bg-[#f2e5cf] text-[#8f4207]' : 'border-[#e9e2d2] bg-white text-[#4b5158] hover:bg-[#faf7f0]')}>
              <Clock className="h-[14px] w-[14px] text-[#98917d]" /> 나중에 보기 {snoozedCount}
            </button>
          )}
        </div>
      </div>

      {/* ── 뜸해진 사람 카드 ── */}
      {overdue.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-[#d9d0ba] bg-white/50 py-16 text-center">
          <p className="text-[15px] font-bold text-[#23262b]">모두와 잘 연락하고 있어요 👍</p>
          <p className="mx-auto mt-1.5 max-w-[380px] text-[13px] leading-relaxed text-[#8d949d]">연락 주기를 넘긴 사람이 생기면 여기서 먼저 알려드려요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map(({ person: p, months }) => {
            const d = detailOf(p, months);
            return (
              <div key={p.id} className="flex flex-col gap-4 rounded-[10px] border border-[#e9e2d2] bg-white px-[22px] py-[18px] sm:flex-row sm:items-center">
                <Avatar name={p.name} size={48} color={p.color} photo={p.photo} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15.5px] font-bold text-[#23262b]">{p.name}</span>
                    <span className="inline-flex h-[26px] items-center rounded-full bg-[#efeadd] px-[11px] text-[12.5px] font-medium text-[#5a5648]">{RELATION_META[p.relation].label}</span>
                    <span className="inline-flex h-[26px] items-center rounded-full bg-[#f2e5cf] px-[11px] text-[12.5px] font-medium text-[#8f4207]">{CLOSENESS_META[p.closeness].label}</span>
                  </div>
                  <p className="mt-1.5 text-[13px] text-[#6e747d]">
                    마지막 연락 {d.weeksAgo}주 전{d.lastKind ? ` · ${d.lastKind}` : ''}
                    {d.ratio >= 1.5 && <span className="font-semibold text-[#8f4207]"> · 평소({CLOSENESS_META[p.closeness].pingMonths}개월)보다 {d.ratio}배 뜸해요</span>}
                  </p>
                  <p className="mt-1 line-clamp-1 text-[12.5px] text-[#98917d]">{d.hint}</p>
                </div>
                <div className="flex flex-none flex-col items-end gap-1">
                  <Sparkline weeks={d.weekly} height={22} />
                  <span className="text-[11px] text-[#98917d]">최근 8주</span>
                </div>
                <div className="flex flex-none items-center gap-2 sm:ml-1.5">
                  <button type="button" onClick={() => logContact(p)} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#b45309] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#9c4708]">
                    <Bell className="h-[13px] w-[13px]" /> 오늘 연락하기
                  </button>
                  <button type="button" onClick={() => onOpenPerson(p.id)} className="inline-flex h-9 items-center rounded-[8px] border border-[#e9e2d2] bg-white px-3.5 text-[13px] font-medium text-[#5a5648] transition-colors hover:bg-[#faf7f0]">기록 보기</button>
                  <button type="button" onClick={() => snooze(p.id)} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-2.5 text-[12.5px] text-[#98917d] transition-colors hover:text-[#5a5648]">
                    <Clock className="h-[13px] w-[13px]" /> 나중에
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 월요일 정리 배너 ── */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[10px] bg-[#f2e5cf] px-[18px] py-3.5">
        <RefreshCw className="h-[15px] w-[15px] shrink-0 text-[#a15008]" />
        <span className="min-w-0 flex-1 text-[13px] text-[#8f4207]">
          <b>매주 월요일 아침</b>에 뜸해진 사람을 정리해서 알려드려요.
        </span>
        <button
          type="button"
          onClick={() => notify.info('주간 안부 알림은 곧 제공될 예정이에요', { duration: 2500 })}
          className="inline-flex h-[30px] items-center rounded-[8px] bg-white px-3.5 text-[12.5px] font-semibold text-[#8f4207] shadow-[0_1px_2px_rgba(60,40,10,0.08)] transition-colors hover:bg-[#fdf7ec]"
        >
          알림 설정
        </button>
      </div>
    </div>
  );
}
