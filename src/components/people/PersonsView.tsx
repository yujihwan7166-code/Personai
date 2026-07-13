/**
 * 사람 — 검색 + 관계×친밀도 직교 필터 + 정렬(이름/연락 오래된순) + 카드/리스트.
 *
 * 방의 핵심 가치("이 사람을 잘 챙기고 있나")가 목록에서 바로 읽히게:
 * 카드마다 마지막 연락 상대시간(주기 초과면 테라코타)과 생일 임박(🎂 D-n) 시그널.
 */
import { useMemo, useState } from 'react';
import { ArrowDownUp, LayoutGrid, List, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { peopleStore } from '@/services/peopleStore';
import { agoContactLabel, lastContactMap } from '@/lib/people/overdue';
import { diffDays, todayKey } from '@/types/travel';
import {
  CLOSENESS_META, CLOSENESS_ORDER, RELATION_META, RELATION_ORDER, avatarColor, nextOccurrence,
  type Closeness, type Interaction, type PeopleCategory, type Person, type Relation,
} from '@/types/people';

type SortMode = 'name' | 'stale';

export function PersonsView({
  persons, interactions, categories, onOpen,
}: {
  persons: Person[];
  interactions: Interaction[];
  categories: PeopleCategory[];
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [relationFilter, setRelationFilter] = useState<Relation | 'all'>('all');
  const [closenessFilter, setClosenessFilter] = useState<Closeness | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [sort, setSort] = useState<SortMode>('name');
  const [mode, setMode] = useState<'card' | 'list'>('card');

  const today = todayKey();
  const lastMap = useMemo(() => lastContactMap(persons, interactions), [persons, interactions]);

  /** 카테고리별 편입 인원 — 필터 칩 우측 숫자. */
  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of persons) for (const id of p.categoryIds) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [persons]);

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

  /** 사람별 시그널 — 연락 라벨(주기 초과 여부)과 생일 임박. */
  const signalOf = (p: Person) => {
    const last = lastMap.get(p.id) ?? today;
    const overdue = Math.floor(diffDays(last, today) / 30) >= CLOSENESS_META[p.closeness].pingMonths;
    const ago = agoContactLabel(last, today);
    const bday = p.birthday ? nextOccurrence(p.birthday, today) : null;
    const bdaySoon = bday && bday.dday <= 7 ? bday.dday : null;
    return { ago, overdue, bdaySoon };
  };

  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors',
      active
        ? 'border-transparent bg-[hsl(var(--foreground))] font-bold text-[hsl(var(--background))]'
        : 'border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] text-muted-foreground hover:text-foreground',
    );

  return (
    <div className="pb-8">
      {/* 검색 + 정렬 + 뷰 토글 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex h-9 min-w-[220px] flex-1 items-center gap-1.5 rounded-full border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-3 transition-colors focus-within:border-[hsl(var(--people-accent))]/50 sm:max-w-[320px]">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·태그·전화·메모 검색"
            className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground/60"
          />
        </label>
        <button
          type="button"
          onClick={() => setSort((s) => (s === 'name' ? 'stale' : 'name'))}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-2.5 py-1.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          title="정렬 바꾸기"
        >
          <ArrowDownUp className="h-3 w-3" /> {sort === 'name' ? '이름순' : '연락 오래된순'}
        </button>
        <div className="flex rounded-full border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] p-0.5">
          {([['card', LayoutGrid, '카드'], ['list', List, '리스트']] as const).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors',
                mode === id ? 'bg-[hsl(var(--people-accent))]/12 font-bold text-[hsl(var(--people-accent))]' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* 필터 — 관계 × 친밀도 (직교 축, 동시 선택) */}
      <div className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-2">
        <button type="button" onClick={() => setRelationFilter('all')} className={chip(relationFilter === 'all')}>전체</button>
        {RELATION_ORDER.map((r) => (
          <button key={r} type="button" onClick={() => setRelationFilter(relationFilter === r ? 'all' : r)} className={chip(relationFilter === r)}>
            {RELATION_META[r].label}
          </button>
        ))}
        <span aria-hidden className="mx-1 h-4 w-px bg-[hsl(var(--hairline))]" />
        {CLOSENESS_ORDER.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setClosenessFilter(closenessFilter === c ? 'all' : c)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors',
              closenessFilter === c
                ? 'border-[hsl(var(--people-accent))]/50 bg-[hsl(var(--people-accent))]/12 font-bold text-[hsl(var(--people-accent))]'
                : 'border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] text-muted-foreground hover:text-foreground',
            )}
          >
            {CLOSENESS_META[c].label}
          </button>
        ))}
      </div>

      {/* 카테고리 필터 — 사용자가 만든 그룹으로 좁혀 보기 (hover × 로 카테고리 삭제) */}
      {categories.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-2">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors',
              categoryFilter === 'all'
                ? 'border-transparent bg-[hsl(var(--people-accent))] font-bold text-[hsl(var(--people-accent-ink))]'
                : 'border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] text-muted-foreground hover:text-foreground',
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
                    'inline-flex items-center gap-1 rounded-full border py-1 pl-2.5 pr-2.5 text-[11.5px] font-medium transition-colors group-hover/cat:pr-6',
                    on
                      ? 'border-[hsl(var(--people-accent))]/50 bg-[hsl(var(--people-accent))]/12 font-bold text-[hsl(var(--people-accent))]'
                      : 'border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] text-muted-foreground hover:text-foreground',
                  )}
                >
                  {c.name}
                  {count > 0 && <span className={cn('tabular-nums', on ? 'text-[hsl(var(--people-accent))]/70' : 'text-muted-foreground/50')}>{count}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => removeCategory(c)}
                  aria-label={`${c.name} 카테고리 삭제`}
                  className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-full p-0.5 text-muted-foreground/50 transition-colors hover:text-rose-500 group-hover/cat:block"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))]/60 py-14 text-center text-[12.5px] text-muted-foreground">
          {persons.length === 0 ? '아직 등록한 사람이 없어요. "새 사람"으로 시작해 보세요.' : '조건에 맞는 사람이 없어요.'}
        </p>
      ) : mode === 'card' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <PersonCard key={p.id} person={p} signal={signalOf(p)} onOpen={() => onOpen(p.id)} />
          ))}
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))]">
          {filtered.map((p, i) => {
            const s = signalOf(p);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onOpen(p.id)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[hsl(var(--surface-2))]',
                    i > 0 && 'border-t border-[hsl(var(--hairline))]/60',
                  )}
                >
                  <Avatar name={p.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5">
                      <span className="truncate text-[13.5px] font-bold">{p.name}</span>
                      <span className="shrink-0 rounded-full bg-[hsl(var(--people-accent))]/10 px-1.5 py-px text-[10px] font-bold text-[hsl(var(--people-accent))]">{CLOSENESS_META[p.closeness].label}</span>
                      {s.bdaySoon !== null && (
                        <span className="shrink-0 rounded-full bg-[hsl(38_75%_42%)]/12 px-1.5 py-px text-[10px] font-bold text-[hsl(30_60%_36%)]">🎂 {s.bdaySoon === 0 ? '오늘' : `D-${s.bdaySoon}`}</span>
                      )}
                    </p>
                    {p.intro && <p className="truncate text-[11.5px] text-muted-foreground">{p.intro}</p>}
                  </div>
                  <span className={cn('hidden shrink-0 text-[11px] tabular-nums sm:block', s.overdue ? 'font-bold text-[hsl(var(--people-accent))]' : 'text-muted-foreground/70')}>{s.ago}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, backgroundColor: avatarColor(name), fontSize: size * 0.42 }}
    >
      {name.slice(0, 1)}
    </span>
  );
}

function PersonCard({
  person: p, signal: s, onOpen,
}: {
  person: Person;
  signal: { ago: string; overdue: boolean; bdaySoon: number | null };
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex flex-col items-center rounded-2xl border border-[hsl(var(--foreground)/0.09)] bg-[hsl(var(--surface-1))] px-3 pb-3 pt-4 text-center shadow-[0_2px_10px_-4px_hsl(var(--foreground)/0.12)] transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--people-accent))]/35 hover:shadow-[0_12px_26px_-14px_hsl(var(--foreground)/0.3)]"
    >
      {s.bdaySoon !== null && (
        <span className="absolute right-2 top-2 rounded-full bg-[hsl(38_75%_42%)]/12 px-1.5 py-0.5 text-[10px] font-bold text-[hsl(30_60%_36%)]">
          🎂 {s.bdaySoon === 0 ? '오늘' : `D-${s.bdaySoon}`}
        </span>
      )}
      <span className="relative">
        <Avatar name={p.name} size={52} />
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[hsl(var(--surface-1))]"
          style={{ backgroundColor: p.closeness === 'best' ? 'hsl(16 62% 48%)' : p.closeness === 'close' ? 'hsl(38 75% 44%)' : p.closeness === 'normal' ? 'hsl(150 38% 40%)' : 'hsl(30 8% 60%)' }}
          title={CLOSENESS_META[p.closeness].label}
        />
      </span>
      <span className="mt-2 w-full truncate text-[13.5px] font-bold">{p.name}</span>
      <span className="mt-0.5 w-full truncate text-[11px] text-muted-foreground">{p.intro ?? RELATION_META[p.relation].label}</span>
      {p.tags.length > 0 && (
        <span className="mt-1.5 flex max-w-full flex-wrap justify-center gap-1">
          {p.tags.slice(0, 2).map((t) => (
            <span key={t} className="max-w-full truncate rounded-full bg-[hsl(var(--surface-3))] px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
          ))}
        </span>
      )}
      {/* 챙김 시그널 — 주기 초과면 테라코타로 조용히 경고 */}
      <span className={cn('mt-2 border-t border-[hsl(var(--hairline))]/60 pt-1.5 text-[10.5px] tabular-nums', s.overdue ? 'font-bold text-[hsl(var(--people-accent))]' : 'text-muted-foreground/65')}>
        {s.ago}
      </span>
    </button>
  );
}
