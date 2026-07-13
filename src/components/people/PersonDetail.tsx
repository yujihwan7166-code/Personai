/**
 * 사람 상세 — 목업 구조 그대로: 프로필 카드 + [기억할 것 · 에피소드 · 선물] | [관계 흐름].
 * 기억할 것·에피소드는 그 자리에서 바로 수정(블러 저장), 흐름은 인라인 컴포저로 쌓는다.
 */
import { useEffect, useRef, useState } from 'react';
import { Cake, ChevronLeft, MapPin, Pencil, Phone, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { peopleStore } from '@/services/peopleStore';
import { useInteractions } from '@/hooks/usePeople';
import { Avatar } from '@/components/people/PersonsView';
import { todayKey } from '@/types/travel';
import {
  CLOSENESS_META, INTERACTION_META, RELATION_META, avatarColor, isValidMonthDay,
  type Interaction, type InteractionKind, type PeopleCategory, type Person,
} from '@/types/people';
import { agoContactLabel } from '@/lib/people/overdue';
import { toLocalYMD } from '@/types/travel';

const cardCls = 'rounded-2xl border border-[hsl(var(--foreground)/0.09)] bg-[hsl(var(--surface-1))] p-4 shadow-[0_2px_10px_-4px_hsl(var(--foreground)/0.12)]';

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
  const myCategories = categories.filter((c) => p.categoryIds.includes(c.id));

  const gifts = interactions.filter((x) => x.kind === 'gift_given' || x.kind === 'gift_received');

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

  return (
    <div className="pb-8">
      <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> 목록으로
      </button>

      {/* 프로필 카드 — 아바타 색이 은은하게 스며든 개인화 배경 */}
      <div
        className={cn(cardCls, 'mb-4 p-5')}
        style={{ backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${avatarColor(p.name)} 9%, transparent), transparent 58%)` }}
      >
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={p.name} size={60} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[21px] font-bold leading-tight">{p.name}</h2>
              <span className="rounded-full bg-[hsl(var(--surface-3))] px-2 py-0.5 text-[10.5px] font-bold text-foreground/70">{RELATION_META[p.relation].label}</span>
              <span className="rounded-full bg-[hsl(var(--people-accent))]/12 px-2 py-0.5 text-[10.5px] font-bold text-[hsl(var(--people-accent))]">{CLOSENESS_META[p.closeness].label}</span>
            </div>
            {p.intro && <p className="mt-1 text-[12.5px] text-muted-foreground">{p.intro}</p>}
            {(p.tags.length > 0 || myCategories.length > 0) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {myCategories.map((c) => (
                  <span key={c.id} className="rounded-full border border-[hsl(var(--people-accent))]/35 bg-[hsl(var(--people-accent))]/10 px-2 py-0.5 text-[10.5px] font-bold text-[hsl(var(--people-accent))]">{c.name}</span>
                ))}
                {p.tags.map((t) => <span key={t} className="rounded-full bg-[hsl(var(--people-accent))]/8 px-1.5 py-0.5 text-[10.5px] text-[hsl(var(--people-accent))]/85">#{t}</span>)}
              </div>
            )}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
              {p.phone && (
                <button
                  type="button"
                  onClick={() => { void navigator.clipboard.writeText(p.phone!).then(() => notify.copied()).catch(() => notify.error('복사 실패')); }}
                  title="클릭해서 복사"
                  className="inline-flex items-center gap-1 rounded transition-colors hover:text-[hsl(var(--people-accent))]"
                >
                  <Phone className="h-3 w-3" /> {p.phone}
                </button>
              )}
              {p.region && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.region}</span>}
              {p.birthday && <span className="inline-flex items-center gap-1"><Cake className="h-3 w-3" /> {Number(p.birthday.slice(0, 2))}월 {Number(p.birthday.slice(3))}일</span>}
              <span className="tabular-nums text-muted-foreground/80">
                {agoContactLabel(interactions[0]?.date ?? toLocalYMD(new Date(p.createdAt)), toLocalYMD(new Date()))}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={onEdit} aria-label="수정" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--hairline))] text-muted-foreground transition-colors hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={deletePerson}
              aria-label="삭제"
              className={cn(
                'flex h-8 items-center justify-center gap-1 rounded-lg border border-[hsl(var(--hairline))] text-[11px] transition-colors',
                armDelete ? 'px-2 font-bold text-rose-500' : 'w-8 text-muted-foreground hover:text-rose-500',
              )}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {armDelete && '한 번 더'}
            </button>
          </div>
        </div>
        <AnnivEditor person={p} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* 좌 — 기억할 것 · 에피소드 · 선물 */}
        <div className="space-y-4">
          <MemoryCard person={p} />

          <div className={cn(cardCls, 'border-[hsl(38_75%_42%)]/25 bg-[hsl(38_75%_42%)]/[0.05]')}>
            <h3 className="text-[12.5px] font-bold text-[hsl(30_60%_36%)]">잊지 못할 에피소드</h3>
            <BlurTextarea
              initial={p.episode ?? ''}
              placeholder="함께한 잊지 못할 순간을 적어두세요."
              onSave={(v) => peopleStore.updatePerson(p.id, { episode: v || undefined })}
            />
          </div>

          {gifts.length > 0 && (
            <div className={cardCls}>
              <h3 className="mb-2 text-[12.5px] font-bold text-foreground/85">주고받은 선물</h3>
              <ul className="space-y-1.5">
                {gifts.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 text-[12.5px]">
                    <span
                      className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: INTERACTION_META[g.kind].tint }}
                    >
                      {g.kind === 'gift_given' ? '준 것' : '받은 것'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground/85">{g.note}</span>
                    <span className="shrink-0 text-[10.5px] tabular-nums text-muted-foreground">{g.date.slice(2, 7).replace('-', '.')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 우 — 관계 흐름 */}
        <FlowCard person={p} interactions={interactions} />
      </div>
    </div>
  );
}

/* ── 기억할 것 — 좋아하는 것/피해야 할 것 칩 + 가족 메모 ── */

function MemoryCard({ person: p }: { person: Person }) {
  return (
    <div className={cardCls}>
      <h3 className="mb-2.5 text-[12.5px] font-bold text-foreground/85">기억할 것</h3>
      <ChipListEditor
        label="좋아하는 것"
        items={p.likes}
        tone="like"
        onChange={(likes) => peopleStore.updatePerson(p.id, { likes })}
      />
      <ChipListEditor
        label="피해야 할 것"
        items={p.dislikes}
        tone="dislike"
        onChange={(dislikes) => peopleStore.updatePerson(p.id, { dislikes })}
      />
      <p className="mb-1 mt-3 text-[10.5px] font-semibold text-muted-foreground">가족 · 관계</p>
      <BlurTextarea
        initial={p.familyNote ?? ''}
        placeholder="가족 구성, 최근 근황 등을 적어두세요."
        onSave={(v) => peopleStore.updatePerson(p.id, { familyNote: v || undefined })}
      />
    </div>
  );
}

function ChipListEditor({
  label, items, tone, onChange,
}: {
  label: string;
  items: string[];
  tone: 'like' | 'dislike';
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (!t || items.includes(t)) { setDraft(''); return; }
    onChange([...items, t]);
    setDraft('');
  };
  return (
    <div className="mt-2 first:mt-0">
      <p className="mb-1 text-[10.5px] font-semibold text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-1">
        {items.map((t) => (
          <span
            key={t}
            className={cn(
              'group/chip inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
              tone === 'like' ? 'bg-[hsl(150_38%_40%)]/10 text-[hsl(150_38%_32%)]' : 'bg-rose-500/10 text-rose-600',
            )}
          >
            {t}
            <button type="button" onClick={() => onChange(items.filter((x) => x !== t))} aria-label={`${t} 제거`} className="opacity-40 transition-opacity hover:opacity-100">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        {/* onBlur 자동 추가 금지 — 다른 칩의 × 클릭이 blur 를 먼저 발동시켜 초안이 저장되는 충돌 */}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) add(); }}
          placeholder="+ 추가 (Enter)"
          className="h-6 w-20 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/50 focus:w-28"
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
      className="mt-1 w-full resize-none rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-[12.5px] leading-relaxed text-foreground/85 outline-none transition-colors placeholder:text-muted-foreground/45 focus:border-[hsl(var(--hairline))] focus:bg-[hsl(var(--surface-2))] focus:px-2"
    />
  );
}

/* ── 기념일 관리 — 프로필 카드 하단 ── */

function AnnivEditor({ person: p }: { person: Person }) {
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
    setLabel('');
    setMonthDay('');
    setAdding(false);
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[hsl(var(--hairline))]/60 pt-3">
      <span className="text-[10.5px] font-semibold text-muted-foreground">기념일</span>
      {p.annivs.map((a) => (
        <span key={a.id} className="group/anv inline-flex items-center gap-1 rounded-full bg-[hsl(38_75%_42%)]/10 px-2 py-0.5 text-[11px] font-medium text-[hsl(30_60%_36%)]">
          {a.label} {Number(a.monthDay.slice(0, 2))}.{Number(a.monthDay.slice(3))}
          <button
            type="button"
            onClick={() => peopleStore.updatePerson(p.id, { annivs: p.annivs.filter((x) => x.id !== a.id) })}
            aria-label={`${a.label} 삭제`}
            className="opacity-40 transition-opacity hover:opacity-100"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      {adding ? (
        <span className="inline-flex items-center gap-1">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="이름" className="h-6 w-20 rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-1.5 text-[11px] outline-none focus:border-[hsl(var(--people-accent))]" />
          <input value={monthDay} onChange={(e) => setMonthDay(e.target.value)} placeholder="07-25" className="h-6 w-14 rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-1.5 text-[11px] tabular-nums outline-none focus:border-[hsl(var(--people-accent))]" />
          <button type="button" onClick={add} className="rounded-md bg-[hsl(var(--people-accent))]/12 px-1.5 py-0.5 text-[11px] font-bold text-[hsl(var(--people-accent))]">추가</button>
          <button type="button" onClick={() => setAdding(false)} aria-label="닫기" className="text-muted-foreground/60 hover:text-foreground"><X className="h-3 w-3" /></button>
        </span>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-[hsl(var(--hairline))] px-2 py-0.5 text-[10.5px] text-muted-foreground transition-colors hover:border-[hsl(var(--people-accent))]/45 hover:text-[hsl(var(--people-accent))]">
          <Plus className="h-2.5 w-2.5" /> 기념일
        </button>
      )}
    </div>
  );
}

/* ── 관계 흐름 — 인라인 컴포저 + 타임라인 ── */

const FLOW_KINDS: InteractionKind[] = ['chat', 'meet', 'gift_given', 'gift_received'];

function FlowCard({ person: p, interactions }: { person: Person; interactions: Interaction[] }) {
  const [composing, setComposing] = useState(false);
  const [kind, setKind] = useState<InteractionKind>('chat');
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState('');
  const noteRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!note.trim()) return;
    const added = peopleStore.addInteraction({ personId: p.id, kind, date, note });
    if (!added) return;
    setNote('');
    window.requestAnimationFrame(() => noteRef.current?.focus());
  };

  return (
    <div className={cardCls}>
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-[12.5px] font-bold text-foreground/85">관계 흐름</h3>
        {!composing && (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--people-accent))]/10 px-2.5 py-1 text-[11.5px] font-bold text-[hsl(var(--people-accent))] transition-colors hover:bg-[hsl(var(--people-accent))]/18"
          >
            <Plus className="h-3 w-3" /> 기록 추가
          </button>
        )}
      </div>

      {composing && (
        <div className="mb-3 rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {FLOW_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors', k !== kind && 'border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] text-muted-foreground hover:text-foreground')}
                style={k === kind ? { backgroundColor: `color-mix(in srgb, ${INTERACTION_META[k].tint} 14%, transparent)`, borderColor: `color-mix(in srgb, ${INTERACTION_META[k].tint} 45%, transparent)`, color: INTERACTION_META[k].tint } : undefined}
              >
                {INTERACTION_META[k].label}
              </button>
            ))}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="날짜"
              className="ml-auto h-7 rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-1.5 text-[11px] tabular-nums text-muted-foreground outline-none focus:border-[hsl(var(--people-accent))]"
            />
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <input
              ref={noteRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit(); }}
              placeholder={kind === 'gift_given' || kind === 'gift_received' ? '무슨 선물이었나요?' : '무슨 이야기를 나눴나요?'}
              autoFocus
              className="h-9 min-w-0 flex-1 rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-2.5 text-[12.5px] outline-none placeholder:text-muted-foreground/50 focus:border-[hsl(var(--people-accent))]"
            />
            <button type="button" onClick={submit} disabled={!note.trim()} className="h-9 shrink-0 rounded-lg bg-[hsl(var(--people-accent))] px-3 text-[12px] font-bold text-[hsl(var(--people-accent-ink))] transition-[filter] hover:brightness-105 disabled:opacity-40">
              추가
            </button>
            <button type="button" onClick={() => setComposing(false)} aria-label="닫기" className="shrink-0 p-1 text-muted-foreground/60 hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}

      {interactions.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-muted-foreground/70">대화·만남·선물을 기록하면 관계의 흐름이 쌓여요.</p>
      ) : (
        <ul className="space-y-3">
          {interactions.map((x) => (
            <li key={x.id} className="group/itx relative border-l-2 pl-3" style={{ borderColor: INTERACTION_META[x.kind].tint }}>
              <p className="flex items-center gap-1.5 text-[11px]">
                <span className="font-bold" style={{ color: INTERACTION_META[x.kind].tint }}>{INTERACTION_META[x.kind].label}</span>
                <span className="tabular-nums text-muted-foreground">{x.date.slice(2).replaceAll('-', '.')}</span>
                <button
                  type="button"
                  onClick={() => {
                    const removed = peopleStore.removeInteraction(x.id);
                    if (removed) {
                      notify.info('기록을 지웠어요', {
                        duration: 4000,
                        action: { label: '되돌리기', onClick: () => peopleStore.restoreInteraction(removed) },
                      });
                    }
                  }}
                  aria-label="기록 삭제"
                  className="ml-auto p-0.5 text-muted-foreground/50 opacity-0 transition-opacity hover:text-rose-500 focus-visible:opacity-100 group-hover/itx:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </p>
              {x.note && <p className="mt-0.5 break-keep text-[12.5px] leading-relaxed text-foreground/85">{x.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
