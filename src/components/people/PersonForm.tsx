/**
 * 사람 추가/수정 폼 — 플로팅 모달이 아니라, 저장될 레코드 카드 양식 그대로 본문에 인라인.
 * 박스형 입력 대신 아이콘 + 밑줄 필드로 "카드에 바로 적는" 감각. 아바타는 이름 따라 실시간.
 * 필수는 이름뿐, 나머지는 나중에 상세에서 채워도 된다.
 */
import { useEffect, useState, type ComponentType } from 'react';
import { Cake, ChevronLeft, Hash, MapPin, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { peopleStore } from '@/services/peopleStore';
import { Avatar } from '@/components/people/PersonsView';
import {
  CLOSENESS_META, CLOSENESS_ORDER, RELATION_META, RELATION_ORDER, avatarColor, isValidMonthDay,
  type Closeness, type Person, type Relation,
} from '@/types/people';

/** 밑줄형 필드 — 아이콘(선택) + 투명 입력. 포커스 시 액센트 밑줄. */
function Field({
  icon: Icon, value, onChange, placeholder, onEnter, tabular,
}: {
  icon?: ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onEnter?: () => void;
  tabular?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-[hsl(var(--hairline))] py-2 transition-colors focus-within:border-[hsl(var(--people-accent))]">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground/55" />}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (onEnter && e.key === 'Enter' && !e.nativeEvent.isComposing) onEnter(); }}
        placeholder={placeholder}
        className={cn('min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground/45', tabular && 'tabular-nums')}
      />
    </div>
  );
}

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

  const pill = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1 text-[12px] transition-colors',
      active
        ? 'border-[hsl(var(--people-accent))] bg-[hsl(var(--people-accent))]/10 font-bold text-[hsl(var(--people-accent))]'
        : 'border-[hsl(var(--hairline))] font-medium text-muted-foreground hover:border-[hsl(var(--people-accent))]/40 hover:text-foreground',
    );

  const tint = name.trim() ? avatarColor(name.trim()) : 'hsl(var(--people-accent))';

  return (
    <div className="mx-auto max-w-[600px] pb-8">
      <button
        type="button"
        onClick={onCancel}
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> {editing ? '상세로' : '목록으로'}
      </button>

      {/* 저장될 프로필 카드 양식 — 아바타는 이름 따라 실시간 */}
      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--foreground)/0.09)] bg-[hsl(var(--surface-1))] shadow-[0_2px_14px_-6px_hsl(var(--foreground)/0.16)]">
        {/* 머리 — 아바타 + 이름 + 소개 (아바타 색이 은은히 스미는 배경) */}
        <div
          className="flex items-center gap-4 px-6 pb-5 pt-6"
          style={{ backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${tint} 8%, transparent), transparent 60%)` }}
        >
          <Avatar name={name.trim() || '새 사람'} size={58} />
          <div className="min-w-0 flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) save(); }}
              placeholder="이름"
              autoFocus
              aria-label="이름"
              className="w-full bg-transparent text-[22px] font-bold leading-tight outline-none placeholder:text-muted-foreground/35"
            />
            <input
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="한 줄 소개 (예: 대학 동기 · 등산 모임)"
              aria-label="소개"
              className="mt-1 w-full bg-transparent text-[13px] text-muted-foreground outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        <div className="space-y-4 px-6 pb-6">
          {/* 관계 · 친밀도 — 라벨 + 알약 선택 */}
          <div className="flex gap-3">
            <span className="w-11 shrink-0 pt-1.5 text-[11px] font-semibold text-muted-foreground">관계</span>
            <div className="flex flex-wrap gap-1.5">
              {RELATION_ORDER.map((r) => (
                <button key={r} type="button" onClick={() => setRelation(r)} className={pill(relation === r)}>
                  {RELATION_META[r].label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <span className="w-11 shrink-0 pt-1.5 text-[11px] font-semibold text-muted-foreground">친밀도</span>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5">
                {CLOSENESS_ORDER.map((c) => (
                  <button key={c} type="button" onClick={() => setCloseness(c)} className={pill(closeness === c)}>
                    {CLOSENESS_META[c].label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10.5px] text-muted-foreground/70">"오늘 챙길 것" 안부 주기의 기준이 돼요</p>
            </div>
          </div>

          {/* 연락처 · 지역 · 생일 · 태그 — 아이콘 밑줄 필드 */}
          <div className="grid gap-x-5 gap-y-1 pt-1 sm:grid-cols-2">
            <Field icon={Phone} value={phone} onChange={setPhone} placeholder="연락처" onEnter={save} />
            <Field icon={MapPin} value={region} onChange={setRegion} placeholder="지역" onEnter={save} />
            <Field icon={Cake} value={birthday} onChange={setBirthday} placeholder="생일 (07-18)" onEnter={save} tabular />
            <Field icon={Hash} value={tags} onChange={setTags} placeholder="태그 — 쉼표로 구분" onEnter={save} />
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 border-t border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))]/50 px-6 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-lg px-3.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            취소
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!name.trim()}
            className="h-9 rounded-lg bg-[hsl(var(--people-accent))] px-5 text-[13px] font-bold text-[hsl(var(--people-accent-ink))] shadow-[0_6px_16px_-8px_hsl(var(--people-accent)/0.8)] transition-[filter] hover:brightness-[1.06] disabled:opacity-45"
          >
            {editing ? '저장' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
