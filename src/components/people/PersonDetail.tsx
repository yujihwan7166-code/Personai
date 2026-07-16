/**
 * 인물 상세 — 인맥노트 리디자인 1c 그대로.
 *
 * 헤더 카드(친밀도 색바 + 76 아바타 + 연락처 + 오늘 연락하기) + 3스탯(마지막 연락/다음 챙길 일/관계 리듬)
 * + 기념일 행. 본문 2열: 좌(기억할 것·잊지 못할 에피소드), 우(관계 흐름 타임라인 + 인라인 컴포저).
 * 정적 목업이 아니라 실제 편집·기록이 가능하게 배선(기억할 것·기념일·흐름은 그 자리에서 저장).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Activity, Cake, ChevronLeft, Clock, Gift, MapPin, Pencil, Phone, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { peopleStore } from '@/services/peopleStore';
import { useInteractions } from '@/hooks/usePeople';
import { Avatar, Sparkline } from '@/components/people/PersonsView';
import { agoContactLabel, weeklyActivity } from '@/lib/people/overdue';
import { diffDays, todayKey, toLocalYMD } from '@/types/travel';
import {
  CLOSENESS_META, INTERACTION_META, RELATION_META, isValidMonthDay, nextOccurrence,
  type Interaction, type InteractionKind, type PeopleCategory, type Person,
} from '@/types/people';

export function PersonDetail({
  person: p, categories, onBack, onEdit,
}: {
  person: Person;
  categories: PeopleCategory[];
  onBack: () => void;
  onEdit: () => void;
}) {
  const interactions = useInteractions(p.id);
  const [armDelete, setArmDelete] = useState(false);
  const today = todayKey();
  const myCategories = categories.filter((c) => p.categoryIds.includes(c.id));

  const lastDate = interactions[0]?.date ?? toLocalYMD(new Date(p.createdAt));
  const lastKind = interactions[0] ? INTERACTION_META[interactions[0].kind].label : null;
  const weekly = useMemo(() => weeklyActivity(interactions, today, 8), [interactions, today]);
  const weeksWithContact = weekly.filter((v) => v > 0).length;
  const monthlyRate = Math.round((weekly.reduce((a, b) => a + b, 0) / 8) * 4.3);

  /** 다가오는 경조사 — 생일·기념일 중 가장 가까운 것. */
  const nextCare = useMemo(() => {
    const cands: Array<{ label: string; dday: number }> = [];
    if (p.birthday) cands.push({ label: '생일', dday: nextOccurrence(p.birthday, today).dday });
    for (const a of p.annivs) cands.push({ label: a.label, dday: nextOccurrence(a.monthDay, today).dday });
    cands.sort((a, b) => a.dday - b.dday);
    return cands[0] ?? null;
  }, [p.birthday, p.annivs, today]);
  const giftPrepared = useMemo(
    () => interactions.some((x) => x.kind === 'gift_given' && diffDays(x.date, today) <= 45 && diffDays(x.date, today) >= 0),
    [interactions, today],
  );
  const ddayText = (d: number) => (d === 0 ? '오늘' : d === 1 ? '내일' : `D-${d}`);

  const logContactToday = () => {
    if (peopleStore.addInteraction({ personId: p.id, kind: 'ping', date: today, note: '안부 연락' })) {
      notify.info(`${p.name}님에게 연락한 걸로 기록했어요`, { duration: 2500 });
    }
  };

  const deletePerson = () => {
    if (!armDelete) {
      setArmDelete(true);
      window.setTimeout(() => setArmDelete(false), 2500);
      return;
    }
    const removed = peopleStore.removePerson(p.id);
    if (removed) {
      notify.info(`${removed.person.name}님을 지웠어요`, {
        duration: 5000,
        action: { label: '되돌리기', onClick: () => peopleStore.restorePerson(removed) },
      });
    }
    onBack();
  };

  const iconBtn = 'inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#e9e2d2] bg-white text-[#868d97] transition-colors hover:bg-[#faf7f0]';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-[13px] text-[#98917d] transition-colors hover:text-[#5a5648]">
        <ChevronLeft className="h-3.5 w-3.5" /> 목록으로
      </button>

      {/* ── 헤더 카드 ── */}
      <div className="mb-6 overflow-hidden rounded-[12px] border border-[#e9e2d2] bg-white">
        <div className="h-2 bg-[#f2e5cf]" />
        <div className="flex gap-6 px-8 pt-[26px]">
          <span className="shrink-0">
            <Avatar name={p.name} size={76} color={p.color} photo={p.photo} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[26px] font-bold tracking-[-0.015em] text-[#191c20]">{p.name}</span>
              <span className="inline-flex h-[26px] items-center rounded-full bg-[#efeadd] px-[11px] text-[12.5px] font-medium text-[#5a5648]">{RELATION_META[p.relation].label}</span>
              <span className="inline-flex h-[26px] items-center rounded-full bg-[#f2e5cf] px-[11px] text-[12.5px] font-medium text-[#8f4207]">{CLOSENESS_META[p.closeness].label}</span>
              <span className="ml-auto inline-flex gap-2">
                <button type="button" onClick={onEdit} aria-label="수정" className={iconBtn}><Pencil className="h-[15px] w-[15px]" /></button>
                <button
                  type="button"
                  onClick={deletePerson}
                  aria-label="삭제"
                  className={cn(iconBtn, armDelete && 'w-auto gap-1 px-2.5 text-[11.5px] font-bold text-rose-500')}
                >
                  <Trash2 className="h-[15px] w-[15px]" />{armDelete && '한 번 더'}
                </button>
              </span>
            </div>

            {(myCategories.length > 0 || p.tags.length > 0) && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {myCategories.map((c) => (
                  <span key={c.id} className="inline-flex h-[26px] items-center rounded-full bg-[#f2e5cf] px-[11px] text-[12.5px] font-medium text-[#8f4207]">{c.name}</span>
                ))}
                {p.tags.map((t) => (
                  <span key={t} className="inline-flex h-[26px] items-center rounded-full border border-[#e9e2d2] px-[11px] text-[12.5px] text-[#7a7361]">#{t}</span>
                ))}
              </div>
            )}

            <div className="mt-3.5 flex flex-wrap items-center gap-x-[18px] gap-y-1.5 text-[13.5px] text-[#4b5158]">
              {p.phone && (
                <button
                  type="button"
                  onClick={() => { void navigator.clipboard.writeText(p.phone!).then(() => notify.copied()).catch(() => notify.error('복사 실패')); }}
                  title="클릭해서 복사"
                  className="inline-flex items-center gap-[7px] transition-colors hover:text-[#8f4207]"
                >
                  <Phone className="h-[14px] w-[14px] text-[#98917d]" /> {p.phone}
                </button>
              )}
              {p.region && <span className="inline-flex items-center gap-[7px]"><MapPin className="h-[14px] w-[14px] text-[#98917d]" /> {p.region}</span>}
              <button type="button" onClick={logContactToday} className="inline-flex items-center gap-[7px] font-semibold text-[#8f4207] transition-opacity hover:opacity-80">
                <Cake className="h-[14px] w-[14px] text-[#a15008]" /> 오늘 연락하기
              </button>
            </div>
          </div>
        </div>

        {/* ── 3스탯 ── */}
        <div className="mx-8 mt-[22px] grid grid-cols-1 overflow-hidden rounded-[10px] border border-[#f0ebdf] sm:grid-cols-3">
          <Stat icon={<Clock className="h-4 w-4" strokeWidth={1.7} />} label="마지막 연락">
            <span className="text-[15px] font-bold text-[#23262b]">{agoContactLabel(lastDate, today).replace(' 연락', '')}{lastKind && <span className="text-[12.5px] font-medium text-[#8d949d]"> · {lastKind}</span>}</span>
            <span className="mt-[3px] block text-[12px] text-[#98917d]">평소 {CLOSENESS_META[p.closeness].pingMonths}개월에 한 번 연락하는 사이</span>
          </Stat>
          <Stat icon={<Gift className="h-4 w-4" strokeWidth={1.7} />} label="다음 챙길 일" divider>
            {nextCare ? (
              <>
                <span className="text-[15px] font-bold text-[#23262b]">{ddayText(nextCare.dday)} {nextCare.label}{!giftPrepared && nextCare.dday <= 30 && <span className="text-[12.5px] font-medium text-[#8f4207]"> · 선물 미준비</span>}</span>
                <span className="mt-1 flex items-center gap-2">
                  <span className="inline-flex h-[22px] items-center rounded-full bg-[#b45309] px-2.5 text-[11.5px] font-semibold text-white">선물 고르기</span>
                  <span className="text-[12px] text-[#98917d]">아이디어 메모 0</span>
                </span>
              </>
            ) : (
              <span className="text-[15px] font-bold text-[#23262b]">예정 없음</span>
            )}
          </Stat>
          <Stat icon={<Activity className="h-4 w-4" strokeWidth={1.7} />} label="관계 리듬 · 최근 8주">
            <span className="mt-1 flex items-center gap-2.5">
              <Sparkline weeks={weekly} />
              <span className="text-[15px] font-bold text-[#23262b]">{monthlyRate > 0 ? `월 ${monthlyRate}회` : '기록 없음'}</span>
            </span>
            <span className="mt-[3px] block text-[12px] text-[#98917d]">8주 중 {weeksWithContact}주 연락{weeksWithContact >= 5 ? ' — 흐름이 좋아요' : ''}</span>
          </Stat>
        </div>

        {/* ── 기념일 ── */}
        <AnnivRow person={p} />
      </div>

      {/* ── 본문 2열 ── */}
      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
          <MemoryCard person={p} />
          <div className="rounded-[10px] border border-[#e9e2d2] bg-white px-6 py-5">
            <div className="mb-2 text-[15px] font-bold text-[#191c20]">잊지 못할 에피소드</div>
            <BlurTextarea
              initial={p.episode ?? ''}
              placeholder="함께한 잊지 못할 순간을 적어두세요."
              onSave={(v) => peopleStore.updatePerson(p.id, { episode: v || undefined })}
            />
          </div>
        </div>

        <FlowCard person={p} interactions={interactions} today={today} />
      </div>
    </div>
  );
}

function Stat({ icon, label, children, divider }: { icon: ReactNode; label: string; children: ReactNode; divider?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3 bg-[#faf7f0] px-[18px] py-3.5', divider && 'border-y border-[#f0ebdf] sm:border-x sm:border-y-0')}>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2e5cf] text-[#a15008]">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[12px] text-[#8d949d]">{label}</span>
        <span className="mt-0.5 block">{children}</span>
      </span>
    </div>
  );
}

/* ── 기억할 것 ── */

function MemoryCard({ person: p }: { person: Person }) {
  return (
    <div className="flex flex-col gap-[18px] rounded-[10px] border border-[#e9e2d2] bg-white px-6 py-5">
      <div className="text-[15px] font-bold text-[#191c20]">기억할 것</div>
      <ChipField label="좋아하는 것" items={p.likes} tone="like" onChange={(likes) => peopleStore.updatePerson(p.id, { likes })} />
      <ChipField label="피해야 할 것" items={p.dislikes} tone="dislike" onChange={(dislikes) => peopleStore.updatePerson(p.id, { dislikes })} />
      <div>
        <div className="mb-1.5 text-[12px] font-bold tracking-[0.04em] text-[#a08343]">가족 · 관계</div>
        <BlurTextarea
          initial={p.familyNote ?? ''}
          placeholder="가족 구성, 최근 근황 등을 적어두세요."
          onSave={(v) => peopleStore.updatePerson(p.id, { familyNote: v || undefined })}
        />
      </div>
    </div>
  );
}

function ChipField({ label, items, tone, onChange }: { label: string; items: string[]; tone: 'like' | 'dislike'; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (!t || items.includes(t)) { setDraft(''); return; }
    onChange([...items, t]);
    setDraft('');
  };
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-bold tracking-[0.04em] text-[#a08343]">{label}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((t) => (
          <span
            key={t}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px]',
              tone === 'like' ? 'bg-[#e6efe6] text-[#3f5c46]' : 'bg-[#f4e3e3] text-[#8a4a4a]',
            )}
          >
            {t}
            <button type="button" onClick={() => onChange(items.filter((x) => x !== t))} aria-label={`${t} 제거`} className="opacity-40 transition-opacity hover:opacity-100">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) add(); }}
          placeholder="+ 추가 (Enter)"
          className="h-7 w-24 bg-transparent text-[13px] text-[#3f434e] outline-none placeholder:text-[#b3a98f] focus:w-32"
        />
      </div>
    </div>
  );
}

/** 블러에 저장하는 텍스트영역 — 상세에서 바로 고치는 저마찰 편집. */
function BlurTextarea({ initial, placeholder, onSave }: { initial: string; placeholder: string; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => { if (value.trim() !== initial.trim()) onSave(value.trim()); }}
      placeholder={placeholder}
      rows={2}
      className="w-full resize-none rounded-[8px] border border-transparent bg-transparent text-[14px] leading-relaxed text-[#3f434e] outline-none transition-colors placeholder:text-[#98917d] focus:border-[#e9e2d2] focus:bg-[#faf7f0] focus:px-2.5 focus:py-2"
    />
  );
}

/* ── 기념일 행 ── */

function AnnivRow({ person: p }: { person: Person }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [monthDay, setMonthDay] = useState('');

  const add = () => {
    const l = label.trim();
    if (!l || !isValidMonthDay(monthDay.trim())) {
      notify.warning('기념일은 이름과 실제 날짜(MM-DD)가 필요해요 (예: 결혼기념일, 07-25)', { duration: 2500 });
      return;
    }
    peopleStore.updatePerson(p.id, {
      annivs: [...p.annivs, { id: `anv_${Date.now().toString(36)}`, label: l, monthDay: monthDay.trim(), type: 'anniversary' }],
    });
    setLabel(''); setMonthDay(''); setAdding(false);
  };
  const md = (v: string) => `${Number(v.slice(0, 2))}월 ${Number(v.slice(3))}일`;

  return (
    <div className="flex flex-wrap items-center gap-2.5 px-8 pb-[22px] pt-4">
      <span className="text-[12.5px] font-semibold text-[#a08343]">기념일</span>
      {p.birthday && (
        <span className="inline-flex h-[26px] items-center rounded-full bg-[#f2e5cf] px-[11px] text-[12.5px] font-medium text-[#8f4207]">생일 {md(p.birthday)}</span>
      )}
      {p.annivs.map((a) => (
        <span key={a.id} className="group/anv inline-flex h-[26px] items-center gap-1 rounded-full bg-[#f2e5cf] px-[11px] text-[12.5px] font-medium text-[#8f4207]">
          {a.label} {md(a.monthDay)}
          <button type="button" onClick={() => peopleStore.updatePerson(p.id, { annivs: p.annivs.filter((x) => x.id !== a.id) })} aria-label={`${a.label} 삭제`} className="opacity-40 transition-opacity hover:opacity-100">
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      {adding ? (
        <span className="inline-flex items-center gap-1">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="이름" className="h-[26px] w-20 rounded-[8px] border border-[#e9e2d2] bg-white px-2 text-[12px] text-[#3f434e] outline-none focus:border-[#d6a066]" />
          <input value={monthDay} onChange={(e) => setMonthDay(e.target.value)} placeholder="07-25" className="h-[26px] w-16 rounded-[8px] border border-[#e9e2d2] bg-white px-2 text-[12px] tabular-nums text-[#3f434e] outline-none focus:border-[#d6a066]" />
          <button type="button" onClick={add} className="rounded-[8px] bg-[#b45309] px-2 py-1 text-[12px] font-semibold text-white">추가</button>
          <button type="button" onClick={() => setAdding(false)} aria-label="닫기" className="text-[#98917d] hover:text-[#5a5648]"><X className="h-3.5 w-3.5" /></button>
        </span>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="inline-flex h-[26px] items-center gap-[5px] rounded-full border-[1.5px] border-dashed border-[#d9d0ba] px-[11px] text-[12.5px] text-[#98917d] transition-colors hover:border-[#c6a15f] hover:text-[#8f4207]">
          <Plus className="h-[11px] w-[11px]" /> 기념일
        </button>
      )}
    </div>
  );
}

/* ── 관계 흐름 — 인라인 컴포저 + 타임라인 ── */

const FLOW_KINDS: InteractionKind[] = ['chat', 'meet', 'gift_given', 'gift_received'];

function FlowCard({ person: p, interactions, today }: { person: Person; interactions: Interaction[]; today: string }) {
  const [kind, setKind] = useState<InteractionKind>('chat');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const noteRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!note.trim()) return;
    if (peopleStore.addInteraction({ personId: p.id, kind, date, note })) {
      setNote('');
      window.requestAnimationFrame(() => noteRef.current?.focus());
    }
  };

  return (
    <div className="w-full shrink-0 rounded-[10px] border border-[#e9e2d2] bg-white px-6 py-5 lg:w-[520px]">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[15px] font-bold text-[#191c20]">관계 흐름</span>
        <span className="text-[12.5px] text-[#8d949d]">기록 {interactions.length}</span>
      </div>

      <div className="mb-2.5 flex flex-wrap items-center gap-[7px]">
        {FLOW_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              'inline-flex h-[30px] items-center rounded-full px-[13px] text-[12.5px] transition-colors',
              k === kind ? 'bg-[#23262b] font-semibold text-white' : 'bg-[#efeadd] font-medium text-[#5a5648] hover:bg-[#e6dfcd]',
            )}
          >
            {INTERACTION_META[k].label}
          </button>
        ))}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="날짜"
          className="ml-auto inline-flex h-[30px] items-center rounded-[8px] border border-[#e9e2d2] bg-white px-2.5 text-[12.5px] tabular-nums text-[#5a5648] outline-none focus:border-[#d6a066]"
        />
      </div>

      <div className="mb-5 flex gap-2">
        <input
          ref={noteRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit(); }}
          placeholder={kind === 'gift_given' || kind === 'gift_received' ? '무슨 선물이었나요?' : '무슨 이야기를 나눴나요?'}
          className="h-[38px] min-w-0 flex-1 rounded-[8px] border border-[#e9e2d2] bg-[#fdfbf7] px-[13px] text-[13px] text-[#3f434e] outline-none placeholder:text-[#98917d] focus:border-[#d6a066]"
        />
        <button type="button" onClick={submit} disabled={!note.trim()} className="inline-flex h-[38px] shrink-0 items-center rounded-[8px] bg-[#b45309] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#9c4708] disabled:opacity-40">추가</button>
      </div>

      {interactions.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[#98917d]">대화·만남·선물을 기록하면 관계의 흐름이 쌓여요.</p>
      ) : (
        <div>
          {interactions.map((x, i) => {
            const last = i === interactions.length - 1;
            return (
              <div key={x.id} className="group/itx flex gap-3.5">
                <span className="flex w-3 flex-none flex-col items-center">
                  <span className="mt-[5px] h-2.5 w-2.5 flex-none rounded-full bg-[#b45309]" />
                  {!last && <span className="mt-1 w-[1.5px] flex-1 bg-[#efe8d8]" />}
                </span>
                <span className={cn('min-w-0 flex-1', !last && 'pb-[18px]')}>
                  <span className="inline-flex items-center gap-2">
                    <span className="text-[12.5px] font-bold text-[#8f4207]">{INTERACTION_META[x.kind].label}</span>
                    <span className="text-[12px] tabular-nums text-[#8d949d]">{x.date.slice(2).replaceAll('-', '.')}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const removed = peopleStore.removeInteraction(x.id);
                        if (removed) notify.info('기록을 지웠어요', { duration: 4000, action: { label: '되돌리기', onClick: () => peopleStore.restoreInteraction(removed) } });
                      }}
                      aria-label="기록 삭제"
                      className="p-0.5 text-[#c3bca8] opacity-0 transition-opacity hover:text-rose-500 focus-visible:opacity-100 group-hover/itx:opacity-100 [@media(hover:none)]:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                  {x.note && <span className="mt-1 block break-keep text-[14px] leading-relaxed text-[#3f434e]">{x.note}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
