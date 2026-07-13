/**
 * 주고받은 선물·경조사 장부 — 모든 사람의 선물 준/받은 기록을 한데 모아 연도별로.
 * 사람별 관계 흐름(FlowCard)에 흩어진 gift 기록을 교차 집계 (스키마 변경 없이 interactions 재사용).
 */
import { useMemo, useState } from 'react';
import { Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/people/PersonsView';
import { INTERACTION_META, type Interaction, type Person } from '@/types/people';

type Lens = 'all' | 'gift_given' | 'gift_received';

export function GiftLedger({
  persons, interactions, onOpenPerson,
}: {
  persons: Person[];
  interactions: Interaction[];
  onOpenPerson: (id: string) => void;
}) {
  const [lens, setLens] = useState<Lens>('all');

  const personMap = useMemo(() => new Map(persons.map((p) => [p.id, p])), [persons]);

  const gifts = useMemo(
    () =>
      interactions
        .filter((x) => x.kind === 'gift_given' || x.kind === 'gift_received')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [interactions],
  );

  const givenCount = gifts.filter((x) => x.kind === 'gift_given').length;
  const receivedCount = gifts.length - givenCount;

  const shown = lens === 'all' ? gifts : gifts.filter((x) => x.kind === lens);

  /** 연도별 그룹 (최신 연도 먼저). */
  const byYear = useMemo(() => {
    const map = new Map<string, Interaction[]>();
    for (const x of shown) {
      const y = x.date.slice(0, 4);
      const arr = map.get(y);
      if (arr) arr.push(x);
      else map.set(y, [x]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [shown]);

  const tab = (id: Lens, label: string, n: number) => (
    <button
      type="button"
      onClick={() => setLens(id)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors',
        lens === id
          ? 'border-[hsl(var(--people-accent))]/50 bg-[hsl(var(--people-accent))]/12 font-bold text-[hsl(var(--people-accent))]'
          : 'border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] font-medium text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      <span className={cn('tabular-nums', lens === id ? 'text-[hsl(var(--people-accent))]/70' : 'text-muted-foreground/55')}>{n}</span>
    </button>
  );

  return (
    <div className="pb-8">
      {/* 요약 · 필터 */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {tab('all', '전체', gifts.length)}
        {tab('gift_given', '준 것', givenCount)}
        {tab('gift_received', '받은 것', receivedCount)}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))]/60 py-14 text-center">
          <Gift className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
          <p className="text-[12.5px] text-muted-foreground">
            {gifts.length === 0
              ? '아직 주고받은 선물 기록이 없어요. 사람 상세의 "관계 흐름"에서 선물을 기록하면 여기 모여요.'
              : '이 조건에 맞는 기록이 없어요.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {byYear.map(([year, list]) => (
            <div key={year}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-[13px] font-bold tabular-nums text-foreground/80">{year}년</h3>
                <span className="text-[11px] text-muted-foreground/60">{list.length}건</span>
                <span aria-hidden className="h-px flex-1 bg-[hsl(var(--hairline))]" />
              </div>
              <ul className="overflow-hidden rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))]">
                {list.map((x, i) => {
                  const p = personMap.get(x.personId);
                  const meta = INTERACTION_META[x.kind];
                  return (
                    <li key={x.id}>
                      <button
                        type="button"
                        onClick={() => onOpenPerson(x.personId)}
                        className={cn(
                          'flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[hsl(var(--surface-2))]',
                          i > 0 && 'border-t border-[hsl(var(--hairline))]/60',
                        )}
                      >
                        {p ? <Avatar name={p.name} size={30} color={p.color} photo={p.photo} /> : <span className="h-[30px] w-[30px] shrink-0 rounded-full bg-[hsl(var(--surface-3))]" />}
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-bold">{p?.name ?? '(삭제된 사람)'}</span>
                            <span
                              className="shrink-0 rounded-full px-1.5 py-px text-[9.5px] font-bold text-white"
                              style={{ backgroundColor: meta.tint }}
                            >
                              {x.kind === 'gift_given' ? '준 것' : '받은 것'}
                            </span>
                          </p>
                          {x.note && <p className="truncate text-[11.5px] text-muted-foreground">{x.note}</p>}
                        </div>
                        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/70">{x.date.slice(5).replace('-', '.')}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
