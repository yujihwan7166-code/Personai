/**
 * 모든 태그 — 검색되는 전체 태그 목록. 태그가 많아도 타이핑해서 찾는다.
 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeQuery } from '@/lib/textSearch';

interface Props {
  open: boolean;
  onClose: () => void;
  /** [태그, 개수] — 빈도 내림차순. */
  tagEntries: Array<[string, number]>;
  activeTag: string | null;
  onPick: (tag: string) => void;
}

export function ArchiveAllTagsDialog({ open, onClose, tagEntries, activeTag, onPick }: Props) {
  const [q, setQ] = useState('');

  useEffect(() => {
    if (open) setQ('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const n = normalizeQuery(q);
    if (!n) return tagEntries;
    return tagEntries.filter(([t]) => t.toLowerCase().includes(n));
  }, [q, tagEntries]);

  if (!open) return null;

  const body = (
    <div className="fixed inset-0 z-[82] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center" onMouseDown={onClose}>
      <div
        className="archive-theme my-8 flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-[hsl(var(--hairline))] bg-card shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center border-b border-[hsl(var(--hairline))] px-5 py-3.5">
          <h2 className="text-[15px] font-bold text-foreground">모든 태그 <span className="ml-1 text-[12px] font-medium text-muted-foreground">{tagEntries.length}</span></h2>
          <button type="button" onClick={onClose} className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 검색 */}
        <div className="border-b border-[hsl(var(--hairline))] p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="태그 검색"
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] py-2 pl-9 pr-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-[hsl(var(--archive-sepia))]"
            />
          </div>
        </div>

        {/* 목록 */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted-foreground">일치하는 태그가 없어요</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 p-1">
              {filtered.map(([t, n]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onPick(t)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
                    activeTag === t
                      ? 'bg-[hsl(var(--archive-sepia))] text-white'
                      : 'bg-[hsl(var(--surface-2))] text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  #{t}<span className="text-[10px] opacity-70">{n}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
