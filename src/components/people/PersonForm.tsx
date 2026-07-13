/**
 * 사람 추가/수정 폼 — 플로팅 모달이 아니라, 저장될 레코드 카드 양식 그대로 본문에 인라인.
 * 새 사람도 실제 프로필 카드 위에 바로 적는다 (아바타는 이름 따라 실시간 미리보기).
 * 필수는 이름뿐, 나머지는 나중에 상세에서 채워도 된다.
 */
import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { peopleStore } from '@/services/peopleStore';
import { Avatar } from '@/components/people/PersonsView';
import {
  CLOSENESS_META, CLOSENESS_ORDER, RELATION_META, RELATION_ORDER, isValidMonthDay,
  type Closeness, type Person, type Relation,
} from '@/types/people';

const cardCls =
  'rounded-2xl border border-[hsl(var(--foreground)/0.09)] bg-[hsl(var(--surface-1))] p-5 shadow-[0_2px_10px_-4px_hsl(var(--foreground)/0.12)]';
const fieldCls =
  'h-10 w-full rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] px-3 text-[13px] outline-none placeholder:text-muted-foreground/50 focus:border-[hsl(var(--people-accent))]';

export function PersonForm({
  editing, onCancel, onSaved,
}: {
  /** 있으면 수정 모드. */
  editing?: Person | null;
  onCancel: () => void;
  onSaved: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [relation, setRelation] = useState<Relation>('friend');
  const [closeness, setCloseness] = useState<Closeness>('normal');
  const [intro, setIntro] = useState('');
  const [tags, setTags] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [birthday, setBirthday] = useState(''); // MM-DD

  // 편집 대상이 바뀌면 폼 값을 그 레코드로 리셋 (key remount 없이도 안전).
  useEffect(() => {
    setName(editing?.name ?? '');
    setRelation(editing?.relation ?? 'friend');
    setCloseness(editing?.closeness ?? 'normal');
    setIntro(editing?.intro ?? '');
    setTags(editing?.tags.join(', ') ?? '');
    setPhone(editing?.phone ?? '');
    setRegion(editing?.region ?? '');
    setBirthday(editing?.birthday ?? '');
  }, [editing]);

  const save = () => {
    if (!name.trim()) {
      notify.warning('이름을 적어주세요', { duration: 1500 });
      return;
    }
    const bd = birthday.trim();
    if (bd && !isValidMonthDay(bd)) {
      notify.warning('생일은 실제 날짜의 MM-DD 형식으로 (예: 07-18)', { duration: 2000 });
      return;
    }
    const data = {
      name,
      relation,
      closeness,
      intro: intro.trim() || undefined,
      tags: tags.split(',').map((t) => t.trim().replace(/^#+/, '')).filter(Boolean),
      phone: phone.trim() || undefined,
      region: region.trim() || undefined,
      birthday: bd || undefined,
    };
    if (editing) {
      peopleStore.updatePerson(editing.id, data);
      onSaved(editing.id);
    } else {
      const created = peopleStore.addPerson(data);
      if (!created) return;
      onSaved(created.id);
    }
  };

  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors',
      active
        ? 'border-[hsl(var(--people-accent))]/50 bg-[hsl(var(--people-accent))]/10 font-bold text-[hsl(var(--people-accent))]'
        : 'border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] text-muted-foreground hover:text-foreground',
    );

  return (
    <div className="pb-8">
      <button
        type="button"
        onClick={onCancel}
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> {editing ? '상세로' : '목록으로'}
      </button>

      {/* 저장될 프로필 카드 양식 그대로 — 아바타는 이름 따라 실시간 */}
      <div className={cardCls}>
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={name.trim() || '새 사람'} size={60} />
          <div className="min-w-0 flex-1 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) save(); }}
              placeholder="이름 *"
              autoFocus
              aria-label="이름"
              className="w-full border-b-2 border-[hsl(var(--hairline))] bg-transparent pb-1 text-[21px] font-bold leading-tight outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-[hsl(var(--people-accent))]"
            />

            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">관계</p>
              <div className="flex flex-wrap gap-1.5">
                {RELATION_ORDER.map((r) => (
                  <button key={r} type="button" onClick={() => setRelation(r)} className={chip(relation === r)}>
                    {RELATION_META[r].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">친밀도 — "오늘 챙길 것" 안부 주기의 기준이 돼요</p>
              <div className="flex flex-wrap gap-1.5">
                {CLOSENESS_ORDER.map((c) => (
                  <button key={c} type="button" onClick={() => setCloseness(c)} className={chip(closeness === c)}>
                    {CLOSENESS_META[c].label}
                  </button>
                ))}
              </div>
            </div>

            <input value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="한 줄 소개 (예: 대학 동기 · 등산 모임)" className={fieldCls} />
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="태그 — 쉼표로 구분 (예: 대학동기, 등산모임)" className={fieldCls} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처" className={fieldCls} />
              <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="지역" className={fieldCls} />
              <input value={birthday} onChange={(e) => setBirthday(e.target.value)} placeholder="생일 07-18" className={cn(fieldCls, 'tabular-nums')} />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-[hsl(var(--hairline))]/60 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-[hsl(var(--hairline))] px-4 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            취소
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!name.trim()}
            className="h-10 rounded-lg bg-[hsl(var(--people-accent))] px-5 text-[13.5px] font-bold text-[hsl(var(--people-accent-ink))] shadow-[0_6px_16px_-8px_hsl(var(--people-accent)/0.8)] transition-[filter] hover:brightness-[1.06] disabled:opacity-45"
          >
            {editing ? '저장' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
