/** 문서 본문 검색·치환 패널 (Ctrl+F / Ctrl+H). sticky top. */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search as SearchIcon, ChevronUp, ChevronDown, Replace as ReplaceIcon, X,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export interface DocSearchPanelProps {
  editor: Editor;
  mode: 'find' | 'replace';
  onModeChange: (m: 'find' | 'replace') => void;
  onClose: () => void;
}

interface DocMatch { from: number; to: number }

/** word char 판정 — 한글·영문·숫자·언더스코어 모두 word 로 간주. */
function isWordChar(c: string | undefined): boolean {
  if (!c) return false;
  return /[\p{L}\p{N}_]/u.test(c);
}

function findAllMatches(
  editor: Editor,
  query: string,
  caseSensitive: boolean,
  wholeWord: boolean,
): DocMatch[] {
  const matches: DocMatch[] = [];
  if (!query) return matches;
  const q = caseSensitive ? query : query.toLowerCase();
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = caseSensitive ? node.text : node.text.toLowerCase();
    let i = text.indexOf(q);
    while (i !== -1) {
      const before = text[i - 1];
      const after = text[i + q.length];
      if (!wholeWord || (!isWordChar(before) && !isWordChar(after))) {
        matches.push({ from: pos + i, to: pos + i + q.length });
      }
      i = text.indexOf(q, i + q.length);
    }
  });
  return matches;
}

export function DocSearchPanel({ editor, mode, onModeChange, onClose }: DocSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  /** 전체 단어 일치 — word boundary 안 일치만 결과로. */
  const [wholeWord, setWholeWord] = useState(false);
  const [matches, setMatches] = useState<DocMatch[]>([]);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [mode]);

  useEffect(() => {
    if (!query) {
      setMatches([]);
      setCursor(0);
      return;
    }
    const next = findAllMatches(editor, query, caseSensitive, wholeWord);
    setMatches(next);
    setCursor(0);
    if (next.length > 0) {
      const m = next[0];
      editor.commands.setTextSelection({ from: m.from, to: m.to });
      editor.commands.scrollIntoView();
    }
  }, [editor, query, caseSensitive, wholeWord]);

  useEffect(() => {
    if (!query) return;
    const onUpdate = () => {
      const next = findAllMatches(editor, query, caseSensitive, wholeWord);
      setMatches(next);
      setCursor((c) => (c >= next.length ? 0 : c));
    };
    editor.on('update', onUpdate);
    return () => { editor.off('update', onUpdate); };
  }, [editor, query, caseSensitive, wholeWord]);

  const gotoMatch = useCallback((idx: number) => {
    if (matches.length === 0) return;
    const i = ((idx % matches.length) + matches.length) % matches.length;
    setCursor(i);
    const m = matches[i];
    editor.commands.setTextSelection({ from: m.from, to: m.to });
    editor.commands.scrollIntoView();
    editor.commands.focus();
  }, [editor, matches]);

  const next = useCallback(() => gotoMatch(cursor + 1), [gotoMatch, cursor]);
  const prev = useCallback(() => gotoMatch(cursor - 1), [gotoMatch, cursor]);

  const replaceOne = useCallback(() => {
    if (matches.length === 0) return;
    const m = matches[cursor];
    editor.chain()
      .focus()
      .insertContentAt({ from: m.from, to: m.to }, replaceText)
      .run();
    setTimeout(() => {
      const fresh = findAllMatches(editor, query, caseSensitive, wholeWord);
      setMatches(fresh);
      if (fresh.length > 0) {
        const ni = Math.min(cursor, fresh.length - 1);
        setCursor(ni);
        const target = fresh[ni];
        editor.commands.setTextSelection({ from: target.from, to: target.to });
      } else {
        setCursor(0);
      }
    }, 0);
  }, [editor, matches, cursor, replaceText, query, caseSensitive, wholeWord]);

  const replaceAll = useCallback(() => {
    if (matches.length === 0) return;
    const chain = editor.chain().focus();
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      chain.insertContentAt({ from: m.from, to: m.to }, replaceText);
    }
    chain.run();
    const after = matches.length;
    setMatches([]);
    setCursor(0);
    toast({ title: `${after}개 항목 치환됨` });
  }, [editor, matches, replaceText]);

  const handleQueryKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) prev(); else next();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key.toLowerCase() === 'h' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onModeChange('replace');
    } else if (e.key.toLowerCase() === 'f' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onModeChange('find');
    }
  }, [next, prev, onClose, onModeChange]);

  return (
    <div
      data-doc-search
      className="sticky top-0 z-30 mx-auto max-w-3xl px-4 pt-2"
    >
      <div className="rounded-lg border border-border bg-popover shadow-md p-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <SearchIcon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleQueryKey}
            placeholder="찾을 내용"
            className="flex-1 text-sm px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40"
            aria-label="찾을 내용"
          />
          <span className="text-xs text-muted-foreground min-w-[44px] text-right tabular-nums">
            {matches.length === 0 ? '0' : `${cursor + 1}/${matches.length}`}
          </span>
          <button type="button" onClick={prev} disabled={matches.length === 0}
            className="p-1 rounded hover:bg-muted disabled:opacity-40"
            aria-label="이전 결과" title="Shift+Enter">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={next} disabled={matches.length === 0}
            className="p-1 rounded hover:bg-muted disabled:opacity-40"
            aria-label="다음 결과" title="Enter">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <label
            className="flex items-center gap-1 text-xs text-muted-foreground select-none cursor-pointer"
            title="대/소문자 구분"
          >
            <input type="checkbox" checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="cursor-pointer" />
            Aa
          </label>
          <label
            className="flex items-center gap-1 text-xs text-muted-foreground select-none cursor-pointer"
            title="전체 단어 일치 — 단어 경계에서만 매치"
          >
            <input type="checkbox" checked={wholeWord}
              onChange={(e) => setWholeWord(e.target.checked)}
              className="cursor-pointer" />
            <span className="border border-current px-0.5 leading-none">W</span>
          </label>
          <button type="button"
            onClick={() => onModeChange(mode === 'find' ? 'replace' : 'find')}
            className={cn('p-1 rounded hover:bg-muted', mode === 'replace' && 'bg-muted')}
            aria-label="치환 토글" title="Ctrl+H">
            <ReplaceIcon className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onClose}
            className="p-1 rounded hover:bg-muted"
            aria-label="검색 닫기 (Esc)" title="Esc">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {mode === 'replace' && (
          <div className="flex items-center gap-1.5">
            <ReplaceIcon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
            <input type="text" value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); replaceOne(); }
                else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
              }}
              placeholder="바꿀 내용"
              className="flex-1 text-sm px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40"
              aria-label="바꿀 내용" />
            <button type="button" onClick={replaceOne} disabled={matches.length === 0}
              className="px-2 py-1 rounded border border-border hover:bg-muted text-xs disabled:opacity-40"
              title="현재 매치 1개 치환 (Enter)">바꾸기</button>
            <button type="button" onClick={replaceAll} disabled={matches.length === 0}
              className="px-2 py-1 rounded bg-foreground text-background hover:bg-foreground/90 text-xs disabled:opacity-40"
              title={`전체 ${matches.length}개 치환`}>모두 바꾸기</button>
          </div>
        )}
      </div>
    </div>
  );
}
