/**
 * 사람 — 검색 + 관계·친밀도 필터 칩 + 카드/리스트 토글 (목업 그대로, 웹 밀도).
 */
import { useMemo, useState } from 'react';
import { LayoutGrid, List, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CLOSENESS_META, CLOSENESS_ORDER, RELATION_META, RELATION_ORDER, avatarColor,
  type Closeness, type Person, type Relation,
} from '@/types/people';

type Filter = 'all' | Relation | Closeness;

export function PersonsView({ persons, onOpen }: { persons: Person[]; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [mode, setMode] = useState<'card' | 'list'>('card');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return persons.filter((p) => {
      if (filter !== 'all') {
        const byRelation = (RELATION_ORDER as string[]).includes(filter) && p.relation === filter;
        const byCloseness = (CLOSENESS_ORDER as string[]).includes(filter) && p.closeness === filter;
        if (!byRelation && !byCloseness) return false;
      }
      if (!q) return true;
      const hay = `${p.name} ${p.intro ?? ''} ${p.tags.join(' ')} ${p.phone ?? ''} ${p.region ?? ''} ${p.likes.join(' ')} ${p.dislikes.join(' ')} ${p.familyNote ?? ''} ${p.episode ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [persons, query, filter]);

  const filterChips: Array<[Filter, string]> = [
    ['all', '전체'],
    ...RELATION_ORDER.map((r) => [r, RELATION_META[r].label] as [Filter, string]),
    ...CLOSENESS_ORDER.map((c) => [c, CLOSENESS_META[c].label] as [Filter, string]),
  ];

  return (
    <div className="pb-8">
      {/* 검색 + 뷰 토글 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex h-9 min-w-[220px] flex-1 items-center gap-1.5 rounded-full border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-3 transition-colors focus-within:border-[hsl(var(--people-accent))]/50 sm:max-w-[320px]">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·태그·메모 검색"
            className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground/60"
          />
        </label>
        <div className="ml-auto flex rounded-full border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] p-0.5">
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

      {/* 필터 칩 */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {filterChips.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors',
              filter === id
                ? 'border-transparent bg-[hsl(var(--foreground))] font-bold text-[hsl(var(--background))]'
                : 'border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))]/60 py-14 text-center text-[12.5px] text-muted-foreground">
          {persons.length === 0 ? '아직 등록한 사람이 없어요. "새 사람"으로 시작해 보세요.' : '조건에 맞는 사람이 없어요.'}
        </p>
      ) : mode === 'card' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <PersonCard key={p.id} person={p} onOpen={() => onOpen(p.id)} />
          ))}
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))]">
          {filtered.map((p, i) => (
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
                  </p>
                  {p.intro && <p className="truncate text-[11.5px] text-muted-foreground">{p.intro}</p>}
                </div>
                <span className="hidden shrink-0 text-[11px] text-muted-foreground/70 sm:block">{RELATION_META[p.relation].label}</span>
              </button>
            </li>
          ))}
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

function PersonCard({ person: p, onOpen }: { person: Person; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col items-center rounded-2xl border border-[hsl(var(--foreground)/0.09)] bg-[hsl(var(--surface-1))] px-3 pb-3.5 pt-4 text-center shadow-[0_2px_10px_-4px_hsl(var(--foreground)/0.12)] transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--people-accent))]/35 hover:shadow-[0_12px_26px_-14px_hsl(var(--foreground)/0.3)]"
    >
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
        <span className="mt-2 flex max-w-full flex-wrap justify-center gap-1">
          {p.tags.slice(0, 2).map((t) => (
            <span key={t} className="max-w-full truncate rounded-full bg-[hsl(var(--surface-3))] px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
          ))}
        </span>
      )}
    </button>
  );
}
