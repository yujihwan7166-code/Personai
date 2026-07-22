/**
 * 등록부 대장 — 카테고리 = 부(部), 항목 = 등재 행.
 * 등재번호는 장식이 아니라 실제 접수 순번(보드 내 createdAt 오름차순).
 * 행 구성: 번호(모노) | 기간(모노) | 내용 | 기관. 카드·그림자 없음, 괘선만.
 */
import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { careerStore } from '@/services/careerStore';
import type { SpecCategory, SpecItem } from '@/types/career';

const PREVIEW = 6;

const periodLabel = (i: SpecItem): string => {
  const f = (s: string) => s.slice(0, 7).replace('-', '.');
  if (i.ongoing) return `${f(i.date)}–`;
  if (i.endDate && f(i.endDate) !== f(i.date)) return `${f(i.date)}–${f(i.endDate)}`;
  return f(i.date);
};

interface Props {
  categories: SpecCategory[];
  items: SpecItem[];
  query: string;
  freshItemId: string | null;
  onEdit: (item: SpecItem) => void;
}

export function CategoryGrid({ categories, items, query, freshItemId, onEdit }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  /** 등재번호 — 보드 전체 접수 순번 (오름차순, 001부터). */
  const regNo = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const m = new Map<string, string>();
    sorted.forEach((it, i) => m.set(it.id, String(i + 1).padStart(3, '0')));
    return m;
  }, [items]);

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

  const visible = q ? categories.filter((c) => (byCategory.get(c.id)?.length ?? 0) > 0) : categories;

  if (visible.length === 0) {
    return (
      <p className="py-14 text-center text-[13px] text-muted-foreground">
        {q ? '검색과 일치하는 등재 기록이 없습니다' : '등재된 기록이 없습니다 — 위 접수줄에 첫 기록을 적어주세요'}
      </p>
    );
  }

  const commitRename = (id: string) => {
    if (renameText.trim()) careerStore.renameCategory(id, renameText);
    setRenaming(null);
  };

  return (
    <div className="space-y-7">
      {visible.map((cat) => {
        const list = byCategory.get(cat.id) ?? [];
        const open = expanded[cat.id] || q.length > 0;
        const shown = open ? list : list.slice(0, PREVIEW);
        return (
          <section key={cat.id}>
            {/* 부(部) 제목 줄 — 이름 + 건수 + 괘선 */}
            <div className="mb-1 flex items-baseline gap-2.5">
              {renaming === cat.id ? (
                <input
                  value={renameText} autoFocus onChange={(e) => setRenameText(e.target.value)}
                  onBlur={() => commitRename(cat.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(cat.id); if (e.key === 'Escape') setRenaming(null); }}
                  className="border-b border-[hsl(var(--career2-blue))] bg-transparent text-[13.5px] font-bold outline-none"
                  aria-label="부 이름"
                />
              ) : (
                <h3
                  onDoubleClick={() => { setRenaming(cat.id); setRenameText(cat.name); }}
                  className="cursor-default text-[13.5px] font-bold tracking-[0.02em]" title="더블클릭: 이름 변경"
                >
                  {cat.name}
                </h3>
              )}
              <span className="c2-mono text-[11px] text-muted-foreground">{list.length}건</span>
              <span aria-hidden className="h-px flex-1 self-center bg-[hsl(var(--hairline))]" />
            </div>

            {list.length === 0 ? (
              <p className="c2-mono py-1.5 pl-1 text-[11.5px] text-muted-foreground/60">등재 없음</p>
            ) : (
              <ul>
                {shown.map((it) => (
                  <li key={it.id} className={cn('border-b border-[hsl(var(--hairline))] last:border-b-0', it.id === freshItemId && 'c2-fresh')}>
                    <button
                      type="button" onClick={() => onEdit(it)}
                      className="grid w-full grid-cols-[38px_1fr] items-baseline gap-x-3 py-[7px] pl-1 pr-1.5 text-left transition-colors hover:bg-[hsl(var(--career2-blue)/0.05)] sm:grid-cols-[38px_96px_1fr_auto]"
                      title="클릭: 등재 내용 수정"
                    >
                      <span className="c2-mono text-[11px] text-muted-foreground/70">{regNo.get(it.id)}</span>
                      <span className="c2-mono hidden text-[11.5px] text-muted-foreground sm:block">
                        {periodLabel(it)}
                        {it.ongoing && <span className="ml-0.5 text-[hsl(var(--career2-seal))]" title="진행 중">•</span>}
                      </span>
                      <span className="min-w-0">
                        <span className="text-[13.5px] leading-snug">{it.refined}</span>
                        {it.link && <ExternalLink className="ml-1 inline h-3 w-3 align-[-1px] text-muted-foreground" aria-label="증빙 링크 있음" />}
                        <span className="c2-mono mt-0.5 block text-[11px] text-muted-foreground sm:hidden">{periodLabel(it)}{it.org ? ` · ${it.org}` : ''}</span>
                      </span>
                      <span className="hidden max-w-[160px] truncate text-right text-[11.5px] text-muted-foreground sm:block">{it.org ?? ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!open && list.length > PREVIEW && (
              <button type="button" onClick={() => setExpanded((e) => ({ ...e, [cat.id]: true }))}
                className="c2-mono mt-1 pl-1 text-[11.5px] text-[hsl(var(--career2-blue))] underline-offset-2 hover:underline">
                이하 {list.length - PREVIEW}건 열람
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
