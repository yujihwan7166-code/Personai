import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META } from '@/types/wiki';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  pages: WikiPage[];
  /** 자기 자신 제외 (현재 페이지 id) */
  excludeId?: string;
  /** 모달이 처음 열릴 때 검색어 (선택한 텍스트가 있으면 그걸 검색어로) */
  initialQuery?: string;
  /** 페이지 선택 시 호출 */
  onPick: (page: WikiPage) => void;
  /** "새로 만들기" — 미존재 제목으로 즉석 생성 (옵션) */
  onCreateNew?: (title: string) => void;
  onClose: () => void;
}

/**
 * 페이지 picker — 본문 작성 중 텍스트 선택 + Ctrl+K → 페이지 검색·선택.
 * 선택한 페이지의 ID 가 호출자(WikiBlockEditor)에 전달돼 link 로 박힘.
 */
export function WikiPagePickerModal({
  open, pages, excludeId, initialQuery = '', onPick, onCreateNew, onClose,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setActiveIdx(0);
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open, initialQuery]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = pages.filter((p) => p.id !== excludeId);
    if (!q) return filtered.slice(0, 12);
    const out: WikiPage[] = [];
    for (const p of filtered) {
      const titleHit = p.title.toLowerCase().includes(q);
      const aliasHit = p.aliases.some((a) => a.toLowerCase().includes(q));
      if (titleHit || aliasHit) {
        out.push(p);
        if (out.length >= 20) break;
      }
    }
    return out;
  }, [query, pages, excludeId]);

  const exactExists = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return pages.some((p) =>
      p.title.toLowerCase() === q || p.aliases.some((a) => a.toLowerCase() === q),
    );
  }, [query, pages]);

  const showCreate = !!onCreateNew && query.trim().length > 0 && !exactExists;
  const totalOptions = candidates.length + (showCreate ? 1 : 0);

  useEffect(() => { setActiveIdx(0); }, [query]);

  function pickIdx(i: number) {
    if (i < candidates.length) {
      onPick(candidates[i]);
    } else if (showCreate && onCreateNew) {
      onCreateNew(query.trim());
    }
  }

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 wiki-z-modal-backdrop bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
      role="dialog"
      aria-label="페이지 선택"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[hsl(var(--hairline))] bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 px-3 h-11 border-b border-[hsl(var(--hairline))]">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(totalOptions - 1, i + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
              else if (e.key === 'Enter') { e.preventDefault(); if (totalOptions > 0) pickIdx(activeIdx); }
              else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
            }}
            placeholder="페이지 제목·별칭 검색…"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
          />
          <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">↑↓ Enter Esc</span>
          <button
            type="button"
            onClick={onClose}
            className="p-0.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-1">
          {candidates.length === 0 && !showCreate && (
            <p className="px-4 py-6 text-center text-[12px] text-muted-foreground">
              일치하는 페이지가 없어요
            </p>
          )}
          {candidates.map((p, i) => {
            const meta = WIKI_TYPE_META[p.type];
            const active = i === activeIdx;
            return (
              <button
                key={p.id}
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => onPick(p)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-left wiki-trans-color',
                  active ? 'bg-accent text-foreground' : 'text-foreground/85 hover:bg-accent',
                )}
              >
                <span className="text-[14px] leading-none shrink-0" aria-hidden>{meta.icon}</span>
                <span className="flex-1 min-w-0 truncate text-[12.5px]">{p.title}</span>
                <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">{p.id.slice(0, 8)}</span>
              </button>
            );
          })}
          {showCreate && (
            <button
              type="button"
              onMouseEnter={() => setActiveIdx(candidates.length)}
              onClick={() => onCreateNew?.(query.trim())}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-left border-t border-[hsl(var(--hairline))] wiki-trans-color',
                activeIdx === candidates.length ? 'bg-primary/10 text-primary' : 'text-primary hover:bg-primary/5',
              )}
            >
              <Plus className="w-3 h-3 shrink-0" />
              <span className="flex-1 truncate">
                <span className="font-bold">{query.trim()}</span>
                <span className="text-muted-foreground"> — 새로 만들기</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
