/**
 * 사람 — 인맥 목록/카드 (인맥노트 리디자인 1a·1b 그대로).
 *
 * 마스트헤드(정렬·카드/리스트 토글·새 사람) + 검색 + 관계×친밀도 필터 + 카테고리 필터.
 * 리스트: 이름·관계·태그·그룹/친밀도 표 (생일 임박 D-day 칩).
 * 카드: 60px 아바타 그리드 (생일 임박 🎂 배지). 실데이터(usePersons/interactions/categories) 배선.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowUpDown, Cake, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { peopleStore } from '@/services/peopleStore';
import { agoContactLabel, lastContactMap } from '@/lib/people/overdue';
import { replacePeopleWithSample, restorePeople } from '@/lib/people/sampleData';
import { diffDays, todayKey } from '@/types/travel';
import {
  CLOSENESS_META, CLOSENESS_ORDER, RELATION_META, RELATION_ORDER, nextOccurrence,
  type Closeness, type Interaction, type PeopleCategory, type Person, type Relation,
} from '@/types/people';

type SortMode = 'name' | 'stale';

export function PersonsView({
  persons, interactions, categories, onOpen, onNewPerson,
}: {
  persons: Person[];
  interactions: Interaction[];
  categories: PeopleCategory[];
  onOpen: (id: string) => void;
  onNewPerson: () => void;
}) {
  const [query, setQuery] = useState('');
  const [relationFilter, setRelationFilter] = useState<Relation | 'all'>('all');
  const [closenessFilter, setClosenessFilter] = useState<Closeness | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [sort, setSort] = useState<SortMode>('name');
  const [mode, setMode] = useState<'card' | 'list'>('list');

  const today = todayKey();
  const lastMap = useMemo(() => lastContactMap(persons, interactions), [persons, interactions]);

  /** 카테고리별 편입 인원 — 필터 칩 우측 숫자. */
  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of persons) for (const id of p.categoryIds) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [persons]);
  const categoryName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = persons.filter((p) => {
      if (relationFilter !== 'all' && p.relation !== relationFilter) return false;
      if (closenessFilter !== 'all' && p.closeness !== closenessFilter) return false;
      if (categoryFilter !== 'all' && !p.categoryIds.includes(categoryFilter)) return false;
      if (!q) return true;
      const hay = `${p.name} ${p.intro ?? ''} ${p.tags.join(' ')} ${p.phone ?? ''} ${p.region ?? ''} ${p.likes.join(' ')} ${p.dislikes.join(' ')} ${p.familyNote ?? ''} ${p.episode ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
    if (sort === 'stale') {
      return [...list].sort((a, b) => (lastMap.get(a.id) ?? '').localeCompare(lastMap.get(b.id) ?? ''));
    }
    return list; // persons 는 이미 이름순
  }, [persons, query, relationFilter, closenessFilter, categoryFilter, sort, lastMap]);

  const removeCategory = (cat: PeopleCategory) => {
    const removed = peopleStore.removeCategory(cat.id);
    if (categoryFilter === cat.id) setCategoryFilter('all');
    if (removed) {
      notify.info(`'${removed.category.name}' 카테고리를 지웠어요`, {
        duration: 5000,
        action: { label: '되돌리기', onClick: () => peopleStore.restoreCategory(removed) },
      });
    }
  };

  /** 사람별 시그널 — 연락 라벨(주기 초과 여부)과 생일 임박(≤7일 D-day). */
  const signalOf = (p: Person) => {
    const last = lastMap.get(p.id) ?? today;
    const overdue = Math.floor(diffDays(last, today) / 30) >= CLOSENESS_META[p.closeness].pingMonths;
    const ago = agoContactLabel(last, today);
    const bday = p.birthday ? nextOccurrence(p.birthday, today) : null;
    const bdaySoon = bday && bday.dday <= 7 ? bday.dday : null;
    return { ago, overdue, bdaySoon };
  };

  /** 목록 하단 안내 — 가장 임박한 생일(≤14일). */
  const soonestBirthday = useMemo(() => {
    let best: { name: string; dday: number } | null = null;
    for (const p of persons) {
      if (!p.birthday) continue;
      const { dday } = nextOccurrence(p.birthday, today);
      if (dday <= 14 && (!best || dday < best.dday)) best = { name: p.name, dday };
    }
    return best;
  }, [persons, today]);
  const ddayText = (d: number) => (d === 0 ? '오늘' : d === 1 ? '내일' : `${d}일 뒤`);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── 마스트헤드 ── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-[7px] text-[11px] font-bold tracking-[0.14em] text-[#a08343]">MY PEOPLE</div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[26px] font-bold tracking-[-0.015em] text-[#191c20]">사람</span>
            <span className="text-[14px] text-[#8d949d]">{persons.length}명과 연결돼 있어요</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSort((s) => (s === 'name' ? 'stale' : 'name'))}
            className="inline-flex h-[38px] items-center gap-[7px] rounded-[8px] border border-[#e9e2d2] bg-white px-3.5 text-[13.5px] font-medium text-[#4b5158] transition-colors hover:bg-[#faf7f0]"
          >
            <ArrowUpDown className="h-[15px] w-[15px]" /> {sort === 'name' ? '이름순' : '연락 오래된순'}
          </button>
          <span className="inline-flex rounded-[8px] bg-[#eae3d3] p-0.5">
            {(['card', 'list'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'inline-flex h-[34px] items-center rounded-[6px] px-3.5 text-[13.5px] transition-colors',
                  mode === m ? 'bg-white font-semibold text-[#23262b] shadow-[0_1px_2px_rgba(60,40,10,0.08)]' : 'font-medium text-[#8a8471]',
                )}
              >
                {m === 'card' ? '카드' : '리스트'}
              </button>
            ))}
          </span>
          <button
            type="button"
            onClick={onNewPerson}
            className="inline-flex h-[42px] items-center gap-[7px] rounded-[8px] bg-[#b45309] px-[18px] text-[14px] font-semibold text-white transition-colors hover:bg-[#9c4708]"
          >
            <Plus className="h-[15px] w-[15px]" strokeWidth={2.4} /> 새 사람
          </button>
        </div>
      </div>

      {/* ── 관계×친밀도 필터 (좌) + 검색 (우) ── */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <div className="flex flex-wrap items-center gap-[9px]">
          <FilterChip active={relationFilter === 'all'} onClick={() => setRelationFilter('all')}>전체</FilterChip>
          {RELATION_ORDER.map((r) => (
            <FilterChip key={r} active={relationFilter === r} onClick={() => setRelationFilter(relationFilter === r ? 'all' : r)}>
              {RELATION_META[r].label}
            </FilterChip>
          ))}
          <span aria-hidden className="mx-1 h-[18px] w-px bg-[#ddd5c2]" />
          {CLOSENESS_ORDER.map((c) => (
            <FilterChip key={c} active={closenessFilter === c} onClick={() => setClosenessFilter(closenessFilter === c ? 'all' : c)}>
              {CLOSENESS_META[c].label}
            </FilterChip>
          ))}
        </div>
        <label className="ml-auto inline-flex h-[36px] w-[260px] max-w-full items-center gap-2 rounded-[8px] border border-[#e9e2d2] bg-white px-3.5 text-[13.5px] transition-colors focus-within:border-[#d6a066]">
          <Search className="h-[15px] w-[15px] shrink-0 text-[#b3a98f]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·태그·전화·메모 검색"
            className="min-w-0 flex-1 bg-transparent text-[#3f434e] outline-none placeholder:text-[#8d949d]"
          />
        </label>
      </div>

      {/* ── 카테고리 필터 ── */}
      {categories.length > 0 && (
        <div className="mb-[18px] flex flex-wrap items-center gap-[9px]">
          <span className="mr-0.5 text-[12px] font-semibold text-[#a08343]">카테고리</span>
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'inline-flex h-[32px] items-center rounded-full px-3.5 text-[13.5px] transition-colors',
              categoryFilter === 'all'
                ? 'bg-[#f2e5cf] font-semibold text-[#8f4207]'
                : 'border border-[#e9e2d2] bg-white font-medium text-[#5a5648] hover:bg-[#faf7f0]',
            )}
          >
            전체 카테고리
          </button>
          {categories.map((c) => {
            const on = categoryFilter === c.id;
            const count = categoryCounts.get(c.id) ?? 0;
            return (
              <span key={c.id} className="group/cat relative inline-flex">
                <button
                  type="button"
                  onClick={() => setCategoryFilter(on ? 'all' : c.id)}
                  className={cn(
                    'inline-flex h-[32px] items-center gap-1.5 rounded-full px-3.5 text-[13.5px] transition-colors group-hover/cat:pr-7',
                    on
                      ? 'bg-[#f2e5cf] font-semibold text-[#8f4207]'
                      : 'border border-[#e9e2d2] bg-white font-medium text-[#5a5648] hover:bg-[#faf7f0]',
                  )}
                >
                  {c.name}
                  {count > 0 && <span className={cn('text-[12px] tabular-nums', on ? 'text-[#a15008]/70' : 'text-[#98917d]')}>{count}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => removeCategory(c)}
                  aria-label={`${c.name} 카테고리 삭제`}
                  className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded-full p-0.5 text-[#98917d] transition-colors hover:text-rose-500 group-hover/cat:block"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* ── 본문 ── */}
      {persons.length === 0 ? (
        <EmptyBody onNewPerson={onNewPerson} />
      ) : mode === 'list' ? (
        <>
          <div className="overflow-hidden rounded-[10px] border border-[#e9e2d2] bg-white">
            {/* 표 헤더 */}
            <div className="grid grid-cols-[2.4fr_1.4fr_2fr_1.3fr] border-b border-[#f0ebdf] bg-[#faf7f0] px-[22px] py-3 text-[12.5px] font-semibold text-[#868d97]">
              <span>이름</span>
              <span>관계</span>
              <span className="hidden sm:block">태그</span>
              <span className="hidden sm:block">그룹·친밀도</span>
            </div>
            {filtered.length === 0 ? (
              <p className="px-[22px] py-10 text-center text-[13px] text-[#98917d]">조건에 맞는 사람이 없어요.</p>
            ) : (
              filtered.map((p, i) => {
                const s = signalOf(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onOpen(p.id)}
                    className={cn(
                      'grid w-full grid-cols-[2.4fr_1.4fr_2fr_1.3fr] items-center px-[22px] py-[13px] text-left transition-colors hover:bg-[#faf7f0]',
                      i > 0 && 'border-t border-[#f0ebdf]',
                    )}
                  >
                    {/* 이름 */}
                    <span className="flex min-w-0 items-center gap-[13px]">
                      <Avatar name={p.name} size={40} color={p.color} photo={p.photo} />
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="truncate text-[14.5px] font-semibold text-[#23262b]">{p.name}</span>
                        {s.bdaySoon !== null && (
                          <span className="inline-flex h-[22px] shrink-0 items-center gap-[5px] rounded-full bg-[#f2e5cf] px-[9px] text-[11.5px] font-bold text-[#8f4207]">
                            <Cake className="h-[11px] w-[11px] text-[#a15008]" /> {s.bdaySoon === 0 ? '오늘' : `D-${s.bdaySoon}`}
                          </span>
                        )}
                      </span>
                    </span>
                    {/* 관계 */}
                    <span className="text-[14px] text-[#4b5158]">{RELATION_META[p.relation].label}</span>
                    {/* 태그 */}
                    <span className="hidden min-w-0 gap-[7px] sm:flex">
                      {[...p.tags.map((t) => `#${t}`), ...p.categoryIds.map((id) => categoryName.get(id)).filter(Boolean)]
                        .slice(0, 3)
                        .map((t, k) => (
                          <span key={k} className="inline-flex h-[26px] shrink-0 items-center rounded-full border border-[#e9e2d2] px-[11px] text-[12.5px] text-[#7a7361]">{t}</span>
                        ))}
                    </span>
                    {/* 그룹·친밀도 */}
                    <span className="hidden gap-[7px] sm:flex">
                      <span className="inline-flex h-[26px] items-center rounded-full bg-[#efeadd] px-[11px] text-[12.5px] font-medium text-[#5a5648]">{RELATION_META[p.relation].label}</span>
                      <span className="inline-flex h-[26px] items-center rounded-full bg-[#f2e5cf] px-[11px] text-[12.5px] font-medium text-[#8f4207]">{CLOSENESS_META[p.closeness].label}</span>
                    </span>
                  </button>
                );
              })
            )}
            {/* 새 사람 추가 행 */}
            <button
              type="button"
              onClick={onNewPerson}
              className="flex w-full items-center gap-[9px] border-t border-[#f0ebdf] px-[22px] py-[13px] text-left text-[14px] text-[#868d97] transition-colors hover:bg-[#faf7f0]"
            >
              <Plus className="h-[15px] w-[15px]" /> 새 사람 추가
            </button>
          </div>
          {soonestBirthday && (
            <div className="mt-3.5 flex items-center gap-2 text-[12.5px] text-[#98917d]">
              <Cake className="h-[13px] w-[13px]" /> {ddayText(soonestBirthday.dday)} {soonestBirthday.name} 님의 생일이 있어요 — 오늘 챙길 것에서 확인
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <PersonCard key={p.id} person={p} signal={signalOf(p)} onOpen={() => onOpen(p.id)} categoryName={categoryName} />
          ))}
          {/* 새 사람 추가 카드 */}
          <button
            type="button"
            onClick={onNewPerson}
            className="flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#d9d0ba] text-[13.5px] text-[#98917d] transition-colors hover:border-[#c6a15f] hover:text-[#8f4207]"
          >
            <Plus className="h-[15px] w-[15px]" strokeWidth={2} /> 새 사람 추가
          </button>
        </div>
      )}

      {/* 예시로 갈아 끼우기 — 지금 것을 다 버리는 일이라 조용한 글자로 두고,
          누르면 무엇이 사라지는지 세어 묻는다. 되돌리기도 8초 준다. */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => {
            const msg = persons.length
              ? `지금 사람 ${persons.length}명을 지우고 예시 스무 명으로 채울까요?\n\n주고받은 기록과 카테고리도 함께 바뀝니다.\n되돌릴 수 있어요 (8초).`
              : '예시 스무 명을 넣을까요?';
            if (!window.confirm(msg)) return;
            const { before, count } = replacePeopleWithSample();
            notify.success(`예시 ${count.persons}명을 넣었어요`, {
              duration: 8000,
              description: `주고받은 기록 ${count.logs}건 포함`,
              action: { label: '되돌리기', onClick: () => restorePeople(before) },
            });
          }}
          className="rounded-md px-2 py-1 text-[12px] text-[#a89d86] transition-colors hover:bg-[#f2ece0] hover:text-[#8f4207]"
          title="지금 사람들을 지우고 관계·친밀도가 제각각인 예시 스무 명으로 채워요"
        >
          예시 스무 명으로 채우기
        </button>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-[32px] items-center rounded-full px-3.5 text-[13.5px] transition-colors',
        /* 활성색은 방 색(앰버)이다 — 예전엔 여기만 검정이라, 바로 옆 카테고리 칩과
           한 줄 안에서 '골라진 것'이 두 가지 색으로 보였다. */
        active ? 'bg-[#8f4207] font-semibold text-white' : 'bg-[#efeadd] font-medium text-[#5a5648] hover:bg-[#e6dfcd]',
      )}
    >
      {children}
    </button>
  );
}

function EmptyBody({ onNewPerson }: { onNewPerson: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-[#d9d0ba] bg-white/50 py-16 text-center">
      <p className="text-[14px] text-[#8d949d]">아직 등록한 사람이 없어요.</p>
      <button
        type="button"
        onClick={onNewPerson}
        className="mt-3.5 inline-flex h-[38px] items-center gap-1.5 rounded-[8px] bg-[#b45309] px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#9c4708]"
      >
        <Plus className="h-4 w-4" /> 새 사람
      </button>
    </div>
  );
}

/** 아바타 — HTML의 뮤트 톤 이니셜 원. 사진/직접 지정 색(color)이 있으면 우선. */
const AVATAR_TONES: Array<{ bg: string; fg: string }> = [
  { bg: '#e7e0d3', fg: '#6b5636' }, // sepia
  { bg: '#dde6dd', fg: '#3f5c46' }, // green
  { bg: '#dfe3ea', fg: '#46536b' }, // blue
  { bg: '#f0dede', fg: '#8a4a4a' }, // rose
  { bg: '#e5e0ef', fg: '#54497a' }, // violet
  { bg: '#efe7d3', fg: '#7a6636' }, // amber
];
export function avatarTone(name: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function Avatar({ name, size = 44, color, photo }: { name: string; size?: number; color?: string; photo?: string }) {
  if (photo) {
    return <img src={photo} alt={name} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  const tone = avatarTone(name);
  const bg = color ?? tone.bg;
  const fg = color ? '#fff' : tone.fg;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, backgroundColor: bg, color: fg, fontSize: Math.round(size * 0.36) }}
    >
      {name.slice(0, 1)}
    </span>
  );
}

/** 최근 8주 접촉 스파크라인 — 상세·다시챙기기 공용. */
export function Sparkline({ weeks, height = 20 }: { weeks: number[]; height?: number }) {
  const max = Math.max(1, ...weeks);
  return (
    <span className="inline-flex items-end gap-[3px]" style={{ height }}>
      {weeks.map((v, i) => {
        const h = v === 0 ? 6 : Math.max(6, Math.round((v / max) * height));
        const bg = v === 0 ? '#e8e0cd' : v >= max ? '#b45309' : '#dcb37e';
        return <span key={i} className="rounded-[2px]" style={{ width: 7, height: h, backgroundColor: bg }} />;
      })}
    </span>
  );
}

function PersonCard({
  person: p, signal: s, onOpen, categoryName,
}: {
  person: Person;
  signal: { ago: string; overdue: boolean; bdaySoon: number | null };
  onOpen: () => void;
  categoryName: Map<string, string>;
}) {
  const sub = [RELATION_META[p.relation].label, ...p.categoryIds.map((id) => categoryName.get(id)).filter(Boolean)].join(' · ');
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col items-center rounded-[10px] border border-[#e9e2d2] bg-white px-5 py-6 text-center transition-all hover:-translate-y-0.5 hover:border-[#d6a066] hover:shadow-[0_14px_30px_-18px_rgba(60,40,10,0.4)]"
    >
      <span className="relative inline-flex">
        <Avatar name={p.name} size={60} color={p.color} photo={p.photo} />
        {s.bdaySoon !== null && (
          <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-white bg-[#f2e5cf]">
            <Cake className="h-[11px] w-[11px] text-[#a15008]" />
          </span>
        )}
      </span>
      <span className="mt-3 inline-flex items-center gap-[7px]">
        <span className="max-w-full truncate text-[15.5px] font-bold text-[#23262b]">{p.name}</span>
        {s.bdaySoon !== null && <span className="shrink-0 text-[11.5px] font-bold text-[#8f4207]">{s.bdaySoon === 0 ? 'D-day' : `D-${s.bdaySoon}`}</span>}
      </span>
      <span className="mt-[3px] line-clamp-1 max-w-full text-[12.5px] text-[#8d949d]">{sub}</span>
      <span className="mt-3 flex max-w-full flex-wrap justify-center gap-1.5">
        {p.tags[0] && (
          <span className="inline-flex h-[26px] items-center rounded-full bg-[#efeadd] px-[11px] text-[12.5px] font-medium text-[#5a5648]">#{p.tags[0]}</span>
        )}
        <span className="inline-flex h-[26px] items-center rounded-full bg-[#f2e5cf] px-[11px] text-[12.5px] font-medium text-[#8f4207]">{CLOSENESS_META[p.closeness].label}</span>
      </span>
    </button>
  );
}
