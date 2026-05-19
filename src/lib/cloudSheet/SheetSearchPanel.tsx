/** 시트 검색·치환 패널 (Ctrl+F / Ctrl+H) — 상단 sticky 패널. */

import { useEffect, useRef } from 'react';
import { Search as SearchIcon, ChevronUp, ChevronDown, Replace as ReplaceIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SheetSearchPanelProps {
  mode: 'find' | 'replace';
  onModeChange: (m: 'find' | 'replace') => void;
  query: string;
  onQueryChange: (v: string) => void;
  replaceText: string;
  onReplaceTextChange: (v: string) => void;
  caseSensitive: boolean;
  onCaseSensitiveChange: (v: boolean) => void;
  /** 전체 셀 일치 — 셀 값 전체가 query 와 같을 때만 매치. */
  wholeCell?: boolean;
  onWholeCellChange?: (v: boolean) => void;
  matches: number;
  cursor: number;
  onNext: () => void;
  onPrev: () => void;
  onReplaceOne: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

export function SheetSearchPanel({
  mode, onModeChange, query, onQueryChange, replaceText, onReplaceTextChange,
  caseSensitive, onCaseSensitiveChange, wholeCell, onWholeCellChange,
  matches, cursor, onNext, onPrev, onReplaceOne, onReplaceAll, onClose,
}: SheetSearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [mode]);

  return (
    <div className="border-b border-border bg-popover/95 backdrop-blur sticky top-0 z-20">
      <div className="max-w-3xl mx-auto px-4 py-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <SearchIcon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); if (e.shiftKey) onPrev(); else onNext(); }
              else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
              else if (e.key.toLowerCase() === 'h' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault(); onModeChange('replace');
              } else if (e.key.toLowerCase() === 'f' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault(); onModeChange('find');
              }
            }}
            placeholder="찾을 내용 (셀 값/수식 결과)"
            className="flex-1 text-sm px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40"
          />
          <span className="text-xs text-muted-foreground min-w-[48px] text-right tabular-nums">
            {matches === 0 ? '0' : `${cursor + 1}/${matches}`}
          </span>
          <button type="button" onClick={onPrev} disabled={matches === 0}
            className="p-1 rounded hover:bg-muted disabled:opacity-40" title="Shift+Enter">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onNext} disabled={matches === 0}
            className="p-1 rounded hover:bg-muted disabled:opacity-40" title="Enter">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <label
            className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer select-none"
            title="대/소문자 구분"
          >
            <input type="checkbox" checked={caseSensitive}
              onChange={(e) => onCaseSensitiveChange(e.target.checked)} className="cursor-pointer" />
            Aa
          </label>
          {onWholeCellChange && (
            <label
              className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer select-none"
              title="전체 셀 일치 — 셀 값 전체가 query 와 같을 때만"
            >
              <input type="checkbox" checked={!!wholeCell}
                onChange={(e) => onWholeCellChange(e.target.checked)} className="cursor-pointer" />
              <span className="border border-current px-0.5 leading-none">=</span>
            </label>
          )}
          <button
            type="button"
            onClick={() => onModeChange(mode === 'find' ? 'replace' : 'find')}
            className={cn('p-1 rounded hover:bg-muted', mode === 'replace' && 'bg-muted')}
            title="Ctrl+H"
            aria-label="치환 토글"
          >
            <ReplaceIcon className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-muted" title="Esc">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {mode === 'replace' && (
          <div className="flex items-center gap-1.5">
            <ReplaceIcon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
            <input
              type="text"
              value={replaceText}
              onChange={(e) => onReplaceTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); onReplaceOne(); }
                else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
              }}
              placeholder="바꿀 내용 (수식 셀은 보존)"
              className="flex-1 text-sm px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40"
            />
            <button type="button" onClick={onReplaceOne} disabled={matches === 0}
              className="px-2 py-1 rounded border border-border hover:bg-muted text-xs disabled:opacity-40">
              바꾸기
            </button>
            <button type="button" onClick={onReplaceAll} disabled={matches === 0}
              className="px-2 py-1 rounded bg-foreground text-background hover:bg-foreground/90 text-xs disabled:opacity-40">
              모두 바꾸기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
