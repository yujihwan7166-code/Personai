/**
 * 사람 추가/수정 — 중앙 모달(사용자 시안).
 * 헤더(새 사람 · esc 닫기) → 아이덴티티(아바타 + 이름 + 소개 + 카드 색)
 * → 관계·친밀도 2열 → 카테고리 → 연락처·정보 2열 → 푸터(취소 · 추가).
 * 아바타·틴트는 이름 따라 실시간. 필수는 이름뿐.
 */
import { useEffect, useState, type ComponentType } from 'react';
import { Cake, Camera, CornerDownLeft, Hash, MapPin, Phone, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { peopleStore } from '@/services/peopleStore';
import { compressImage } from '@/lib/journalImage';
import { Avatar } from '@/components/people/PersonsView';
import {
  AVATAR_COLORS, CLOSENESS_META, CLOSENESS_ORDER, RELATION_META, RELATION_ORDER, isValidMonthDay,
  type Closeness, type PeopleCategory, type Person, type Relation,
} from '@/types/people';

/** 속성 필드 — 아이콘 + 라벨 + 밑줄 입력. */
function Field({
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
    <label className="flex items-center gap-2.5 border-b border-[#e9e2d2] pb-2 transition-colors focus-within:border-[#d6a066]">
      <Icon className="h-[15px] w-[15px] shrink-0 text-[#b3a78f]" />
      <span className="shrink-0 text-[12.5px] text-[#8a7d82]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (onEnter && e.key === 'Enter' && !e.nativeEvent.isComposing) onEnter(); }}
        placeholder={placeholder}
        className={cn('min-w-0 flex-1 bg-transparent text-[13.5px] text-[#3f434e] outline-none placeholder:text-[#bcb0a2]', tabular && 'tabular-nums')}
      />
    </label>
  );
}

export function PersonForm({
  editing, categories, onCancel, onSaved,
}: {
  editing?: Person | null;
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

  // Esc 로 닫기 (시안 헤더의 "esc 닫기")
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !addingCat) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, addingCat]);

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

  /** 선택 알약 — 관계·친밀도·카테고리 공용(앰버). */
  const pill = (on: boolean) =>
    cn(
      'inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors',
      on
        ? 'border-[#e3cfa2] bg-[#f2e5cf] font-semibold text-[#8f4207]'
        : 'border-[#e9e2d2] bg-white font-medium text-[#5a5648] hover:border-[#e0cba0]',
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={editing ? '사람 수정' : '새 사람'}>
      <button type="button" aria-label="닫기" onClick={onCancel} className="absolute inset-0 cursor-default bg-[rgba(58,44,32,0.28)]" />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-[600px] flex-col overflow-hidden rounded-[18px] border border-[#efe2e6] bg-white shadow-[0_24px_60px_-24px_rgba(60,40,20,0.45)]">
        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-6 pt-5">
          <span className="text-[13px] font-semibold text-[#a08343]">{editing ? '사람 수정' : '새 사람'}</span>
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 text-[12px] text-[#a89a8e] transition-colors hover:text-[#5a5648]">
            esc 닫기 <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-5 pt-4">
          {/* ── 아이덴티티 ── */}
          <div className="flex gap-4">
            <label className="relative h-[66px] w-[66px] shrink-0 cursor-pointer" title={photo ? '사진 바꾸기' : '사진 첨부'}>
              <Avatar name={name.trim() || '새 사람'} size={66} color={color} photo={photo} />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#7d7268] text-white ring-2 ring-white">
                <Camera className="h-[13px] w-[13px]" />
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { void onPickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
            </label>

            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) save(); }}
                  placeholder="이름"
                  autoFocus
                  aria-label="이름"
                  className="min-w-0 flex-1 bg-transparent text-[27px] font-bold leading-tight tracking-[-0.01em] text-[#191c20] outline-none placeholder:text-[#d8c3ad]"
                />
                {/* 카드 색 — 이름 오른쪽에서 바로 고르기 */}
                {!photo && (
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 pt-2" title="카드 색">
                    <button
                      type="button"
                      onClick={() => setColor(undefined)}
                      aria-pressed={!color}
                      className={cn('inline-flex h-[24px] items-center rounded-full border px-2.5 text-[11.5px] font-medium transition-colors', !color ? 'border-[#e3cfa2] bg-[#f2e5cf] text-[#8f4207]' : 'border-[#e9e2d2] bg-white text-[#8a7d82] hover:border-[#e0cba0]')}
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
                        className={cn('h-[18px] w-[18px] rounded-full ring-2 ring-offset-2 ring-offset-white transition-[box-shadow]', color === c ? 'ring-[#8f4207]' : 'ring-transparent hover:ring-[#e0cba0]')}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <input
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="한 줄 소개 — 예: 대학 동기 · 등산 모임"
                aria-label="소개"
                className="mt-1 w-full border-b border-[#efe4d6] bg-transparent pb-1.5 text-[13px] text-[#6e747d] outline-none transition-colors placeholder:text-[#b9b1a5] focus:border-[#d6a066]"
              />

              {/* 사진이 있을 때 — 색 대신 안내 */}
              {photo && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-[#8d949d]">사진이 카드에 표시돼요</span>
                  <button type="button" onClick={() => setPhoto(undefined)} className="inline-flex items-center gap-0.5 text-[12px] text-[#a89a8e] transition-colors hover:text-rose-500"><X className="h-3 w-3" /> 사진 제거</button>
                </div>
              )}
            </div>
          </div>

          {/* ── 관계 · 친밀도 (2열) ── */}
          <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[12px] font-bold text-[#a08343]">관계</p>
              <div className="flex flex-wrap gap-1.5">
                {RELATION_ORDER.map((r) => (
                  <button key={r} type="button" onClick={() => setRelation(r)} className={pill(relation === r)}>{RELATION_META[r].label}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-bold text-[#a08343]">친밀도</p>
              <div className="flex flex-wrap gap-1.5">
                {CLOSENESS_ORDER.map((c) => (
                  <button key={c} type="button" onClick={() => setCloseness(c)} className={pill(closeness === c)}>{CLOSENESS_META[c].label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* ── 카테고리 ── */}
          <div className="mt-5">
            <p className="mb-2 text-[12px] font-bold text-[#a08343]">카테고리 <span className="font-medium text-[#b3a78f]">여러 개 가능</span></p>
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((c) => (
                <button key={c.id} type="button" onClick={() => toggleCategory(c.id)} aria-pressed={categoryIds.includes(c.id)} className={pill(categoryIds.includes(c.id))}>
                  {categoryIds.includes(c.id) && <span aria-hidden className="text-[10px]">✓</span>}
                  {c.name}
                </button>
              ))}
              {addingCat ? (
                <span className="inline-flex items-center gap-1">
                  <input
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); createCategory(); }
                      if (e.key === 'Escape') { e.stopPropagation(); setAddingCat(false); setCatName(''); }
                    }}
                    placeholder="새 카테고리"
                    autoFocus
                    maxLength={20}
                    className="h-[34px] w-32 rounded-full border border-[#e0cba0] bg-white px-3.5 text-[13px] text-[#3f434e] outline-none placeholder:text-[#b9b1a5]"
                  />
                  <button type="button" onClick={createCategory} disabled={!catName.trim()} aria-label="추가" className="rounded-full bg-[#f2e5cf] px-2.5 py-1.5 text-[12px] font-semibold text-[#8f4207] disabled:opacity-40">추가</button>
                  <button type="button" onClick={() => { setAddingCat(false); setCatName(''); }} aria-label="취소" className="p-1 text-[#a89a8e] hover:text-[#5a5648]"><X className="h-3.5 w-3.5" /></button>
                </span>
              ) : (
                <button type="button" onClick={() => setAddingCat(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#d9cdb3] px-3.5 py-1.5 text-[13px] text-[#a1888f] transition-colors hover:border-[#c6a15f] hover:text-[#8f4207]">
                  <Plus className="h-3.5 w-3.5" /> 새 카테고리
                </button>
              )}
            </div>
          </div>

          {/* ── 연락처 · 정보 (2열) ── */}
          <div className="mt-6">
            <p className="mb-3 text-[12px] font-bold text-[#a08343]">연락처 · 정보</p>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <Field icon={Phone} label="연락처" value={phone} onChange={setPhone} placeholder="010-0000-0000" onEnter={save} tabular />
              <Field icon={Cake} label="생일" value={birthday} onChange={setBirthday} placeholder="07-18" onEnter={save} tabular />
              <Field icon={MapPin} label="지역" value={region} onChange={setRegion} placeholder="서울 · 부산 …" onEnter={save} />
              <Field icon={Hash} label="태그" value={tags} onChange={setTags} placeholder="대학동기, 등산모임" onEnter={save} />
            </div>
          </div>
        </div>

        {/* ── 푸터 ── */}
        <div className="flex items-center justify-end gap-3 border-t border-[#f0e8ea] px-6 py-3.5">
          <button type="button" onClick={onCancel} className="text-[13.5px] font-medium text-[#8a7d82] transition-colors hover:text-[#5a5648]">취소</button>
          <button
            type="button"
            onClick={save}
            disabled={!name.trim()}
            className="inline-flex h-[40px] items-center gap-1.5 rounded-[10px] bg-[#b45309] px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#9c4708] disabled:opacity-45"
          >
            {editing ? '저장' : '추가'} <CornerDownLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
