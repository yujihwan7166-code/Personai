/**
 * 오늘 챙길 것 — 인맥노트 홈.
 *
 * 리디자인 시안에 전용 화면은 없어, 시안 원자(1d 경조사 행 · 1e 다시 챙길 사람)로
 * 구성한 라이트 앰버 요약: 다가오는 경조사(45일) + 다시 챙길 사람 미리보기(→ 다시 챙기기).
 */
import { useMemo } from 'react';
import { Bell, Cake, ChevronRight } from 'lucide-react';
import { notify } from '@/lib/notify';
import { peopleStore } from '@/services/peopleStore';
import { Avatar } from '@/components/people/PersonsView';
import { computeOverdue, lastContactMap } from '@/lib/people/overdue';
import { diffDays, todayKey } from '@/types/travel';
import { RELATION_META, nextOccurrence, type Interaction, type Person } from '@/types/people';

const WD_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

export function HomeView({
  persons, interactions, onOpenPerson, onGoReconnect,
}: {
  persons: Person[];
  interactions: Interaction[];
  onOpenPerson: (id: string) => void;
  onGoReconnect: () => void;
}) {
  const today = todayKey();
  const overdue = useMemo(() => computeOverdue(persons, interactions, today), [persons, interactions, today]);
  const lastMap = useMemo(() => lastContactMap(persons, interactions), [persons, interactions]);

  /** 다가오는 경조사 — 45일 이내. */
  const upcoming = useMemo(() => {
    const out: Array<{ person: Person; label: string; date: string; dday: number }> = [];
    for (const p of persons) {
      if (p.birthday) { const n = nextOccurrence(p.birthday, today); if (n.dday <= 45) out.push({ person: p, label: '생일', ...n }); }
      for (const a of p.annivs) { const n = nextOccurrence(a.monthDay, today); if (n.dday <= 45) out.push({ person: p, label: a.label, ...n }); }
    }
    return out.sort((a, b) => a.dday - b.dday).slice(0, 6);
  }, [persons, today]);

  const ddayText = (d: number) => (d === 0 ? 'D-day' : `D-${d}`);
  const fmtOcc = (date: string) => { const dt = new Date(`${date}T00:00:00`); return `${dt.getMonth() + 1}월 ${dt.getDate()}일 (${WD_SHORT[dt.getDay()]})`; };
  const weeksAgo = (id: string) => Math.max(1, Math.round(diffDays(lastMap.get(id) ?? today, today) / 7));

  const logContact = (p: Person) => {
    const added = peopleStore.addInteraction({ personId: p.id, kind: 'ping', date: today, note: '안부 연락' });
    if (added) notify.success(`${p.name}님에게 연락한 것으로 기록했어요`, { duration: 5000, action: { label: '되돌리기', onClick: () => peopleStore.removeInteraction(added.id) } });
  };

  const summary = [upcoming.length > 0 && `경조사 ${upcoming.length}`, overdue.length > 0 && `다시 챙길 ${overdue.length}`].filter(Boolean).join(' · ');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── 마스트헤드 ── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-[7px] text-[11px] font-bold tracking-[0.14em] text-[#a08343]">TODAY</div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[26px] font-bold tracking-[-0.015em] text-[#191c20]">오늘 챙길 것</span>
            <span className="text-[14px] text-[#8d949d]">{summary || '오늘은 급히 챙길 일이 없어요'}</span>
          </div>
        </div>
      </div>

      {persons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-[#d9d0ba] bg-white/50 py-16 text-center">
          <p className="text-[15px] font-bold text-[#23262b]">소중한 사람들을 기록해 보세요</p>
          <p className="mx-auto mt-1.5 max-w-[380px] text-[13px] leading-relaxed text-[#8d949d]">이름·생일·좋아하는 것을 적어두면 챙길 타이밍을 여기서 알려드려요.</p>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          {/* 다가오는 경조사 */}
          <div className="w-full min-w-0 flex-1 rounded-[10px] border border-[#e9e2d2] bg-white px-[22px] py-5">
            <div className="mb-3.5 text-[15px] font-bold text-[#191c20]">다가오는 경조사</div>
            {upcoming.length === 0 ? (
              <p className="rounded-[10px] border border-dashed border-[#e2d9c4] bg-[#faf7f0] px-4 py-6 text-center text-[13px] text-[#98917d]">45일 안엔 챙길 경조사가 없어요.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {upcoming.map((u) => (
                  <button
                    key={`${u.person.id}-${u.label}-${u.date}`}
                    type="button"
                    onClick={() => onOpenPerson(u.person.id)}
                    className="flex items-center gap-3 rounded-[10px] border border-[#f0ebdf] bg-[#faf7f0] p-3 text-left transition-colors hover:border-[#e2d3b6]"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f2e5cf] text-[#a15008]"><Cake className="h-[17px] w-[17px]" strokeWidth={1.7} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-[#23262b]">{u.person.name} {u.label}</span>
                      <span className="mt-0.5 block text-[12.5px] text-[#8d949d]">
                        {fmtOcc(u.date)} · {RELATION_META[u.person.relation].label}
                        {u.person.likes[0] ? ` · 좋아함: ${u.person.likes.slice(0, 2).join(', ')}` : ''}
                      </span>
                    </span>
                    <span className="text-[14px] font-bold text-[#8f4207]">{ddayText(u.dday)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 다시 챙길 사람 */}
          <div className="w-full shrink-0 rounded-[10px] border border-[#e9e2d2] bg-white px-[22px] py-5 lg:w-[380px]">
            <div className="mb-3.5 flex items-center justify-between">
              <span className="text-[15px] font-bold text-[#191c20]">다시 챙길 사람</span>
              {overdue.length > 0 && (
                <button type="button" onClick={onGoReconnect} className="inline-flex items-center gap-0.5 text-[12.5px] font-medium text-[#8f4207] transition-opacity hover:opacity-80">전체 보기 <ChevronRight className="h-3.5 w-3.5" /></button>
              )}
            </div>
            {overdue.length === 0 ? (
              <p className="rounded-[10px] border border-dashed border-[#e2d9c4] bg-[#faf7f0] px-4 py-6 text-center text-[13px] text-[#98917d]">모두와 잘 연락하고 있어요 👍</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {overdue.slice(0, 3).map(({ person: p, months }) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-[10px] border border-[#f0ebdf] bg-[#faf7f0] p-3">
                    <Avatar name={p.name} size={40} color={p.color} photo={p.photo} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[14px] font-semibold text-[#23262b]">{p.name}</span>
                        <span className="inline-flex h-[20px] shrink-0 items-center rounded-full bg-[#efeadd] px-2 text-[11px] font-medium text-[#5a5648]">{RELATION_META[p.relation].label}</span>
                      </span>
                      <span className="mt-0.5 block text-[12px] text-[#98917d]">마지막 연락 {weeksAgo(p.id)}주 전 · {months}개월 넘게 뜸해요</span>
                    </span>
                    <button type="button" onClick={() => logContact(p)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[8px] bg-[#b45309] px-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#9c4708]"><Bell className="h-3 w-3" /> 연락</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
