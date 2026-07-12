/**
 * 사람 추가/수정 다이얼로그 — 필수는 이름뿐, 나머지는 나중에 상세에서 채워도 된다.
 */
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { peopleStore } from '@/services/peopleStore';
import {
  CLOSENESS_META, CLOSENESS_ORDER, RELATION_META, RELATION_ORDER, isValidMonthDay,
  type Closeness, type Person, type Relation,
} from '@/types/people';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const inputCls =
  'h-10 w-full rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-3 text-[13px] outline-none placeholder:text-muted-foreground/50 focus:border-[hsl(var(--people-accent))]';

export function PersonDialog({
  open, editing, onClose, onSaved,
}: {
  open: boolean;
  /** 있으면 수정 모드. */
  editing?: Person | null;
  onClose: () => void;
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

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setRelation(editing?.relation ?? 'friend');
    setCloseness(editing?.closeness ?? 'normal');
    setIntro(editing?.intro ?? '');
    setTags(editing?.tags.join(', ') ?? '');
    setPhone(editing?.phone ?? '');
    setRegion(editing?.region ?? '');
    setBirthday(editing?.birthday ?? '');
  }, [open, editing]);

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
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="people-theme max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[17px]">{editing ? '사람 수정' : '새 사람'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 *" autoFocus className={inputCls} />
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
          <input value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="한 줄 소개 (예: 대학 동기 · 등산 모임)" className={inputCls} />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="태그 — 쉼표로 구분 (예: 대학동기, 등산모임)" className={inputCls} />
          <div className="grid grid-cols-3 gap-2">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처" className={inputCls} />
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="지역" className={inputCls} />
            <input value={birthday} onChange={(e) => setBirthday(e.target.value)} placeholder="생일 07-18" className={cn(inputCls, 'tabular-nums')} />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!name.trim()}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-[hsl(var(--people-accent))] text-[13.5px] font-bold text-[hsl(var(--people-accent-ink))] shadow-[0_6px_16px_-8px_hsl(var(--people-accent)/0.8)] transition-[filter] hover:brightness-[1.06] disabled:opacity-45"
          >
            {editing ? '저장' : '추가'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
