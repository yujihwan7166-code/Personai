/**
 * v2 카테고리 카드 그리드 — 카테고리 하나 = 카드 하나. 항목 클릭 = 수정.
 * 방금 추가된 항목은 등장 모션 + 잠깐 하이라이트.
 */
import { useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { careerStore } from '@/services/careerStore';
import type { SpecCategory, SpecItem } from '@/types/career';

const PREVIEW = 5;

const periodLabel = (i: SpecItem): string => {
  const f = (s: string) => s.slice(0, 7).replace('-', '.');
  if (i.ongoing) return `${f(i.date)}–현재`;
  if (i.endDate && f(i.endDate) !== f(i.date)) return `${f(i.date)}–${f(i.endDate)}`;
  return f(i.date);
};

interface Props {
  categories: SpecCategory[];
  items: SpecItem[];
  query: string;
  freshItemId: string | null; // 방금 추가된 항목 — 하이라이트
  onEdit: (item: SpecItem) => void;
}

export function CategoryGrid({ categories, items, query, freshItemId, onEdit }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const q = query.trim().toLowerCase();
  const byCategory = useMemo(() => {
    const m = new Map<string, SpecItem[]>();
    for (const it of items) {
      if (q && !`${it.refined} ${it.raw} ${it.org ?? ''} ${it.detail ?? ''}`.toLowerCase().includes(q)) continue;
      const arr = m.get(it.categoryId) ?? [];
      arr.push(it);
      m.set(it.categoryId, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => b.date.localeCompare(a.date));
    return m;
  }, [items, q]);

  const visible = categories.filter((c) => (byCategory.get(c.id)?.length ?? 0) > 0 || !q);

  if (visible.length === 0) {
    return <p className="py-16 text-center text-[13.5px] text-muted-foreground">{q ? '검색 결과가 없어요' : '위 입력바에 첫 스펙을 적어보세요 — "정처기 땄음" 한 줄이면 돼요'}</p>;
  }

  const commitRename = (id: string) => {
    if (renameText.trim()) careerStore.renameCategory(id, renameText);
    setRenaming(null);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visible.map((cat) => {
        const list = byCategory.get(cat.id) ?? [];
        const open = expanded[cat.id] || q.length > 0;
        const shown = open ? list : list.slice(0, PREVIEW);
        return (
          <section key={cat.id} className="flex flex-col rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4">
            <div className="mb-2.5 flex items-center gap-2">
              {renaming === cat.id ? (
                <input
                  value={renameText} autoFocus onChange={(e) => setRenameText(e.target.value)}
                  onBlur={() => commitRename(cat.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(cat.id); if (e.key === 'Escape') setRenaming(null); }}
                  className="min-w-0 flex-1 rounded-md border border-[hsl(var(--career2-blue)/0.5)] bg-transparent px-1.5 py-0.5 text-[14.5px] font-bold outline-none"
                  aria-label="카테고리 이름"
                />
              ) : (
                <button type="button" onDoubleClick={() => { setRenaming(cat.id); setRenameText(cat.name); }}
                  className="min-w-0 truncate text-left text-[14.5px] font-bold" title="더블클릭으로 이름 변경">
                  {cat.name}
                </button>
              )}
              <span className="rounded-full bg-[hsl(var(--career2-blue)/0.1)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[hsl(var(--career2-blue))]">{list.length}</span>
            </div>

            {list.length === 0 && <p className="py-3 text-[12px] text-muted-foreground">아직 비어 있어요</p>}

            <ul className="flex-1 space-y-0.5">
              {shown.map((it) => (
                <li key={it.id} className={cn(it.id === freshItemId && 'career2-rise')}>
                  <button
                    type="button" onClick={() => onEdit(it)}
                    className={cn(
                      'group flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[hsl(var(--surface-3))]',
                      it.id === freshItemId && 'bg-[hsl(var(--career2-blue)/0.08)]',
                    )}
                  >
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--career2-blue)/0.55)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] leading-snug">{it.refined}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground">
                        {periodLabel(it)}
                        {it.org && <span className="truncate">· {it.org}</span>}
                        {it.link && <ExternalLink className="h-2.5 w-2.5" />}
                      </span>
                    </span>
                    <Pencil className="mt-1 h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>

            {!open && list.length > PREVIEW && (
              <button type="button" onClick={() => setExpanded((e) => ({ ...e, [cat.id]: true }))}
                className="mt-1.5 flex items-center gap-1 self-start rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-3 w-3" /> {list.length - PREVIEW}개 더 보기
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
