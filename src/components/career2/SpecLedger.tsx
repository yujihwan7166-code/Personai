/**
 * 스펙 대장 — Swiss 타이포그래피 표. 카드가 아니라 괘선과 정렬이 구조를 만든다.
 * 행: [연번] [기간] [내용] [기관]. 연번은 등록 순서(실제 정보), 숫자는 전부 등폭.
 */
import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { careerStore } from '@/services/careerStore';
import type { SpecCategory, SpecItem } from '@/types/career';

const PREVIEW = 6;

const period = (i: SpecItem): string => {
  const f = (s: string) => s.slice(0, 7).replace('-', '.');
  if (i.ongoing) return `${f(i.date)} –`;
  if (i.endDate && f(i.endDate) !== f(i.date)) return `${f(i.date)} – ${f(i.endDate)}`;
  return f(i.date);
};

interface Props {
  categories: SpecCategory[];
  items: SpecItem[];
  query: string;
  seatedId: string | null;
  onEdit: (item: SpecItem) => void;
}

export function SpecLedger({ categories, items, query, seatedId, onEdit }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  /** 연번 — 등록 순서(오름차순). 표의 첫 칸이 실제 정보를 담게 한다. */
  const serial = useMemo(() => {
    const m = new Map<string, string>();
    [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .forEach((it, i) => m.set(it.id, String(i + 1).padStart(2, '0')));
    return m;
  }, [items]);

  const q = query.trim().toLowerCase();
  const grouped = useMemo(() => {
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

  const visible = q ? categories.filter((c) => (grouped.get(c.id)?.length ?? 0) > 0) : categories;

  if (visible.length === 0) {
    return (
      <p className="border-t border-[hsl(var(--hairline))] py-16 text-center text-[13px] text-muted-foreground">
        {q ? '검색과 맞는 기록이 없어요' : '위 입력 줄에 첫 기록을 적어보세요'}
      </p>
    );
  }

  const commitRename = (id: string) => {
    if (draft.trim()) careerStore.renameCategory(id, draft);
    setRenaming(null);
  };

  return (
    <div className="space-y-10">
      {visible.map((cat, ci) => {
        const list = grouped.get(cat.id) ?? [];
        const open = expanded[cat.id] || q.length > 0;
        const shown = open ? list : list.slice(0, PREVIEW);
        return (
          <section key={cat.id}>
            {/* 섹션 헤드 — 번호·이름·건수·괘선 */}
            <div className="mb-2 flex items-baseline gap-3 border-b-2 border-[hsl(var(--foreground))] pb-1.5">
              <span className="c2-num c2-eyebrow text-[11px] text-[hsl(var(--c2-laurel))]">{String(ci + 1).padStart(2, '0')}</span>
              {renaming === cat.id ? (
                <input
                  value={draft} autoFocus onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commitRename(cat.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(cat.id); if (e.key === 'Escape') setRenaming(null); }}
                  aria-label="칸 이름"
                  className="min-w-0 flex-1 border-b border-[hsl(var(--c2-laurel))] bg-transparent text-[17px] font-bold outline-none"
                />
              ) : (
                <h2
                  className="cursor-default text-[17px] font-bold tracking-[-0.01em]"
                  onDoubleClick={() => { setRenaming(cat.id); setDraft(cat.name); }}
                  title="더블클릭하면 이름을 고칠 수 있어요"
                >
                  {cat.name}
                </h2>
              )}
              <span className="c2-num ml-auto text-[12px] text-muted-foreground">{list.length}</span>
            </div>

            {list.length === 0 ? (
              <p className="py-2.5 text-[12.5px] text-muted-foreground/70">아직 비어 있어요</p>
            ) : (
              <ul>
                {shown.map((it) => (
                  <li key={it.id} className={cn('border-b border-[hsl(var(--hairline))]', it.id === seatedId && 'c2-seated')}>
                    <button
                      type="button" onClick={() => onEdit(it)}
                      className="group grid w-full grid-cols-[2rem_1fr] items-baseline gap-x-4 py-2.5 text-left transition-colors hover:bg-[hsl(var(--c2-laurel)/0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[hsl(var(--c2-laurel))] sm:grid-cols-[2rem_8.5rem_1fr_11rem]"
                    >
                      <span className="c2-num text-[12px] text-muted-foreground/60">{serial.get(it.id)}</span>
                      <span className="c2-num hidden text-[12.5px] text-muted-foreground sm:block">
                        {period(it)}
                        {it.ongoing && <span className="ml-1 text-[hsl(var(--c2-laurel))]" title="진행 중">▸</span>}
                      </span>
                      <span className="min-w-0">
                        <span className="text-[14.5px] leading-snug">{it.refined}</span>
                        {it.link && <ExternalLink className="ml-1.5 inline h-3 w-3 shrink-0 align-[-1px] text-muted-foreground" aria-label="증빙 링크 있음" />}
                        <span className="c2-num mt-0.5 block text-[12px] text-muted-foreground sm:hidden">
                          {period(it)}{it.org ? ` · ${it.org}` : ''}
                        </span>
                      </span>
                      <span className="hidden truncate text-right text-[12.5px] text-muted-foreground sm:block">{it.org ?? ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!open && list.length > PREVIEW && (
              <button
                type="button" onClick={() => setExpanded((e) => ({ ...e, [cat.id]: true }))}
                className="c2-num mt-2 text-[12.5px] text-[hsl(var(--c2-laurel))] underline-offset-4 hover:underline"
              >
                나머지 {list.length - PREVIEW}건 보기
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
