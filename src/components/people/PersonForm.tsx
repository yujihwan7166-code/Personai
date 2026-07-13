/**
 * 사람 추가/수정 폼 — 플로팅 모달이 아니라, 저장될 명함(레코드) 양식 그대로 본문에 인라인.
 * 명함 머리(아바타 헤일로 + 이름 + 소개) → 관계 알약 · 친밀도 세그먼트 → 속성 행(아이콘·라벨·값).
 * 아바타는 이름 따라 실시간. 필수는 이름뿐, 나머지는 나중에 상세에서 채워도 된다.
 */
import { useEffect, useState, type ComponentType } from 'react';
import { Cake, Camera, ChevronLeft, Hash, MapPin, Phone, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { peopleStore } from '@/services/peopleStore';
import { compressImage } from '@/lib/journalImage';
import { Avatar } from '@/components/people/PersonsView';
import {
  AVATAR_COLORS, CLOSENESS_META, CLOSENESS_ORDER, RELATION_META, RELATION_ORDER, avatarColor, isValidMonthDay,
  type Closeness, type PeopleCategory, type Person, type Relation,
} from '@/types/people';

/** 속성 행 — 아이콘 + 라벨 + 값. 하나의 소프트 패널 안에 얇은 구분선으로 묶인다. */
function Row({
  icon: Icon, label, value, onChange, placeholder, onEnter, tabular,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onEnter?: () => void;
  tabular?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 px-3.5 py-2.5 transition-colors focus-within:bg-[hsl(var(--surface-1))] [&:not(:first-child)]:border-t [&:not(:first-child)]:border-[hsl(var(--hairline))]/55">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground/50" />
      <span className="w-10 shrink-0 text-[12px] font-medium text-muted-foreground/75">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (onEnter && e.key === 'Enter' && !e.nativeEvent.isComposing) onEnter(); }}
        placeholder={placeholder}
        className={cn('min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground/40', tabular && 'tabular-nums')}
      />
    </label>
  );
}

export function PersonForm({
  editing, categories, onCancel, onSaved,
}: {
  /** 있으면 수정 모드. */
  editing?: Person | null;
  /** 편입 가능한 카테고리 목록. */
  categories: PeopleCategory[];
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
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [addingCat, setAddingCat] = useState(false);
  const [catName, setCatName] = useState('');
  const [color, setColor] = useState<string | undefined>(undefined);
  const [photo, setPhoto] = useState<string | undefined>(undefined);

  useEffect(() => {
    setName(editing?.name ?? '');
    setRelation(editing?.relation ?? 'friend');
    setCloseness(editing?.closeness ?? 'normal');
    setIntro(editing?.intro ?? '');
    setTags(editing?.tags.join(', ') ?? '');
    setPhone(editing?.phone ?? '');
    setRegion(editing?.region ?? '');
    setBirthday(editing?.birthday ?? '');
    setCategoryIds(editing?.categoryIds ?? []);
    setColor(editing?.color);
    setPhoto(editing?.photo);
  }, [editing]);

  const onPickPhoto = async (file?: File) => {
    if (!file) return;
    try {
      const { src } = await compressImage(file);
      setPhoto(src);
    } catch {
      notify.error('사진을 불러오지 못했어요');
    }
  };

  const toggleCategory = (id: string) =>
    setCategoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const createCategory = () => {
    const created = peopleStore.addCategory(catName);
    if (!created) { setAddingCat(false); setCatName(''); return; }
    setCategoryIds((ids) => (ids.includes(created.id) ? ids : [...ids, created.id]));
    setCatName('');
    setAddingCat(false);
  };

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
      categoryIds,
      color: color || undefined,
      photo: photo || undefined,
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

  const tint = color ?? (name.trim() ? avatarColor(name.trim()) : 'hsl(var(--people-accent))');

  /** 선택 알약 — 관계·친밀도·카테고리가 방 전체와 같은 문법을 쓰게. */
  const pillCls = (on: boolean) =>
    cn(
      'rounded-full border px-3.5 py-1.5 text-[12px] transition-colors',
      on
        ? 'border-[hsl(var(--people-accent))] bg-[hsl(var(--people-accent))]/10 font-bold text-[hsl(var(--people-accent))]'
        : 'border-[hsl(var(--hairline))] font-medium text-muted-foreground hover:border-[hsl(var(--people-accent))]/40 hover:text-foreground',
    );

  return (
    <div className="mx-auto max-w-[560px] pb-8">
      <button
        type="button"
        onClick={onCancel}
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> {editing ? '상세로' : '목록으로'}
      </button>

      {/* 저장될 명함 양식 — 아바타·틴트는 이름 따라 실시간 */}
      <div className="overflow-hidden rounded-[20px] border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--surface-1))] shadow-[0_10px_30px_-16px_hsl(var(--foreground)/0.3)]">
        {/* 머리 — 아바타 헤일로 + 이름 + 소개 */}
        <div
          className="flex items-center gap-4 px-6 pb-5 pt-6"
          style={{ backgroundImage: `linear-gradient(150deg, color-mix(in srgb, ${tint} 12%, transparent), transparent 62%)` }}
        >
          {/* 아바타 = 사진 첨부 버튼 (명함 등). 클릭하면 파일 선택. */}
          <label
            className="relative shrink-0 cursor-pointer rounded-full p-[3px]"
            style={{ boxShadow: `0 0 0 1.5px color-mix(in srgb, ${tint} 45%, transparent)` }}
            title={photo ? '사진 바꾸기' : '사진 첨부'}
          >
            <Avatar name={name.trim() || '새 사람'} size={54} color={color} photo={photo} />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--people-accent))] text-[hsl(var(--people-accent-ink))] shadow ring-2 ring-[hsl(var(--surface-1))]">
              <Camera className="h-3 w-3" />
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { void onPickPhoto(e.target.files?.[0]); e.target.value = ''; }}
            />
          </label>
          <div className="min-w-0 flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) save(); }}
              placeholder="이름"
              autoFocus
              aria-label="이름"
              className="w-full bg-transparent text-[23px] font-bold leading-tight tracking-[-0.01em] outline-none placeholder:text-muted-foreground/35"
            />
            <input
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="한 줄 소개 — 예: 대학 동기 · 등산 모임"
              aria-label="소개"
              className="mt-1 w-full bg-transparent text-[13px] text-muted-foreground outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        <div className="space-y-5 border-t border-[hsl(var(--hairline))] px-6 py-5">
          {/* 관계 — 알약 (순서 없음) */}
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-[0.04em] text-muted-foreground/70">관계</p>
            <div className="flex flex-wrap gap-1.5">
              {RELATION_ORDER.map((r) => (
                <button key={r} type="button" onClick={() => setRelation(r)} className={pillCls(relation === r)}>
                  {RELATION_META[r].label}
                </button>
              ))}
            </div>
          </div>

          {/* 친밀도 — 알약 (방 전체와 같은 문법). 선택에 따라 안부 주기 힌트 */}
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-[0.04em] text-muted-foreground/70">친밀도</p>
            <div className="flex flex-wrap gap-1.5">
              {CLOSENESS_ORDER.map((c) => (
                <button key={c} type="button" onClick={() => setCloseness(c)} className={pillCls(closeness === c)}>
                  {CLOSENESS_META[c].label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground/70">
              {CLOSENESS_META[closeness].pingMonths}개월 넘게 연락이 없으면 "오늘 챙길 것"에 알려드려요
            </p>
          </div>

          {/* 카테고리 — 여러 그룹에 동시 편입 + 새로 만들기 */}
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-[0.04em] text-muted-foreground/70">
              카테고리 <span className="font-medium text-muted-foreground/50">· 여러 개 편입 가능</span>
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((c) => {
                const on = categoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    aria-pressed={on}
                    className={cn(pillCls(on), 'inline-flex items-center gap-1')}
                  >
                    {on && <span aria-hidden className="text-[10px]">✓</span>}
                    {c.name}
                  </button>
                );
              })}
              {addingCat ? (
                <span className="inline-flex items-center gap-1">
                  <input
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); createCategory(); }
                      if (e.key === 'Escape') { setAddingCat(false); setCatName(''); }
                    }}
                    placeholder="새 카테고리"
                    autoFocus
                    maxLength={20}
                    className="h-8 w-28 rounded-full border border-[hsl(var(--people-accent))]/45 bg-[hsl(var(--surface-2))] px-3 text-[12px] outline-none placeholder:text-muted-foreground/50"
                  />
                  <button type="button" onClick={createCategory} disabled={!catName.trim()} aria-label="추가" className="rounded-full bg-[hsl(var(--people-accent))]/12 px-2 py-1.5 text-[12px] font-bold text-[hsl(var(--people-accent))] disabled:opacity-40">추가</button>
                  <button type="button" onClick={() => { setAddingCat(false); setCatName(''); }} aria-label="취소" className="p-1 text-muted-foreground/60 hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCat(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-[hsl(var(--hairline))] px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-[hsl(var(--people-accent))]/45 hover:text-[hsl(var(--people-accent))]"
                >
                  <Plus className="h-3 w-3" /> 새 카테고리
                </button>
              )}
            </div>
          </div>

          {/* 카드 색 / 사진 — 사진이 있으면 사진이 카드에 표시(색 대신) */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <p className="text-[11px] font-bold tracking-[0.04em] text-muted-foreground/70">카드 색</p>
              {photo && (
                <button type="button" onClick={() => setPhoto(undefined)} className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-rose-500">
                  <X className="h-3 w-3" /> 사진 제거
                </button>
              )}
            </div>
            {photo ? (
              <p className="text-[11.5px] text-muted-foreground/70">첨부한 사진이 카드에 표시돼요.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setColor(undefined)}
                  aria-pressed={!color}
                  className={cn(
                    'h-6 rounded-full border px-2.5 text-[11px] font-semibold transition-colors',
                    !color ? 'border-[hsl(var(--foreground)/0.5)] text-foreground' : 'border-[hsl(var(--hairline))] text-muted-foreground hover:text-foreground',
                  )}
                >
                  자동
                </button>
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label="카드 색"
                    aria-pressed={color === c}
                    className={cn(
                      'h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-[hsl(var(--surface-1))] transition-[box-shadow]',
                      color === c ? 'ring-[hsl(var(--foreground)/0.55)]' : 'ring-transparent hover:ring-[hsl(var(--foreground)/0.2)]',
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 연락처·정보 — 소프트 패널 안에 얇은 구분선으로 묶인 속성 행 */}
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-[0.04em] text-muted-foreground/70">연락처 · 정보</p>
            <div className="overflow-hidden rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))]/40">
              <Row icon={Phone} label="연락처" value={phone} onChange={setPhone} placeholder="010-0000-0000" onEnter={save} />
              <Row icon={MapPin} label="지역" value={region} onChange={setRegion} placeholder="서울 · 부산 …" onEnter={save} />
              <Row icon={Cake} label="생일" value={birthday} onChange={setBirthday} placeholder="07-18" onEnter={save} tabular />
              <Row icon={Hash} label="태그" value={tags} onChange={setTags} placeholder="대학동기, 등산모임" onEnter={save} />
            </div>
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
