/**
 * 기둥 — 기록이 시간순으로 쌓인 한 줄기. 최신이 위, 아래로 내려갈수록 과거.
 * 칸(카테고리)은 묶는 단위가 아니라 기록에 붙은 표식이다. 쌓는 방이므로 시간이 축.
 */
import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpecCategory, SpecItem } from '@/types/career';

const MONTH_LABEL = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${y}년 ${m}월`;
};

const dayLabel = (date: string) => Number(date.slice(8, 10));

const spanLabel = (i: SpecItem): string | null => {
  const f = (s: string) => s.slice(0, 7).replace('-', '.');
  if (i.ongoing) return `${f(i.date)}부터 지금까지`;
  if (i.endDate && f(i.endDate) !== f(i.date)) return `${f(i.date)} – ${f(i.endDate)}`;
  return null;
};

interface Props {
  items: SpecItem[];
  categories: SpecCategory[];
  query: string;
  settledId: string | null;
  onOpen: (item: SpecItem) => void;
}

export function Column({ items, categories, query, settledId, onOpen }: Props) {
  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const q = query.trim().toLowerCase();
  const months = useMemo(() => {
    const filtered = items.filter((it) =>
      !q || `${it.refined} ${it.raw} ${it.org ?? ''} ${it.detail ?? ''} ${catName.get(it.categoryId) ?? ''}`.toLowerCase().includes(q));
    const sorted = [...filtered].sort((a, b) => (b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
    const groups: Array<{ ym: string; list: SpecItem[] }> = [];
    for (const it of sorted) {
      const ym = it.date.slice(0, 7);
      const last = groups.at(-1);
      if (last && last.ym === ym) last.list.push(it);
      else groups.push({ ym, list: [it] });
    }
    return groups;
  }, [items, q, catName]);

  if (months.length === 0) {
    return (
      <p className="py-20 text-center text-[14px] leading-relaxed text-muted-foreground">
        {q ? '찾는 기록이 없어요' : <>아직 비어 있어요.<br />첫 줄이 기둥의 바닥이 됩니다.</>}
      </p>
    );
  }

  return (
    <div className="relative pl-8">
      {/* 기둥 — 전체를 관통하는 한 줄 */}
      <span aria-hidden className="c3-column absolute bottom-0 left-[7px] top-0 w-px" />

      {months.map(({ ym, list }) => (
        <section key={ym}>
          <h2 className="relative py-5 text-[12px] font-semibold tracking-[0.03em] text-muted-foreground">
            <span aria-hidden className="absolute -left-[27px] top-1/2 h-[7px] w-[7px] -translate-y-1/2 rotate-45 border border-[hsl(var(--c3-glow)/0.5)] bg-[hsl(var(--background))]" />
            {MONTH_LABEL(ym)}
            <span className="ml-2 font-normal text-muted-foreground/60">{list.length}</span>
          </h2>

          <ul className="space-y-1">
            {list.map((it) => {
              const span = spanLabel(it);
              return (
                <li key={it.id} className={cn(it.id === settledId && 'c3-settle')}>
                  <button
                    type="button" onClick={() => onOpen(it)}
                    className="group relative -ml-2 block w-full rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-[hsl(var(--surface-2))] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[hsl(var(--c3-glow))]"
                  >
                    {/* 노드 — 기둥 위의 점 */}
                    <span
                      aria-hidden
                      className="c3-node absolute -left-[23px] top-[15px] h-[9px] w-[9px] rounded-full border border-[hsl(var(--c3-glow)/0.65)] bg-[hsl(var(--background))] transition-colors group-hover:bg-[hsl(var(--c3-glow))]"
                    />
                    <p className="text-[15px] leading-[1.55] text-foreground">{it.refined}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-muted-foreground">
                      <span className="tabular-nums">{dayLabel(it.date)}일</span>
                      <span className="text-[hsl(var(--c3-glow)/0.85)]">{catName.get(it.categoryId) ?? '기타'}</span>
                      {it.org && <span className="truncate">{it.org}</span>}
                      {span && <span className="tabular-nums">{span}</span>}
                      {it.link && <ExternalLink className="h-3 w-3" aria-label="증빙 링크 있음" />}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="py-10 text-[11.5px] text-muted-foreground/60">여기가 지금까지의 바닥이에요</p>
    </div>
  );
}
