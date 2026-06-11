import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { type WikiPage, WIKI_TYPE_META } from '@/types/wiki';

interface Props {
  pages: WikiPage[];
  /** 현재 페이지 id — 자기 자신 제외용 */
  currentId?: string;
  /** 텍스트영역 ref (caret 위치 계산용) */
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  /** 본문 값 — 변경마다 연결 트리거 감지 */
  value: string;
  onChange: (next: string) => void;
}

interface TriggerState {
  query: string;
  startIdx: number;   // [[ 시작 위치
  caretIdx: number;   // 현재 caret
}

/**
 * 본문 텍스트에 연결 트리거를 입력하면 popover 로 기존 문서를 제안.
 * Enter / 클릭 시 선택된 제목을 문서 링크로 삽입.
 */
export function WikiLinkAutocomplete({ pages, currentId, textareaRef, value, onChange }: Props) {
  const [trigger, setTrigger] = useState<TriggerState | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const autocompleteId = useId().replace(/:/g, '');
  const listboxId = `${autocompleteId}-wiki-link-listbox`;
  const optionId = useCallback((pageId: string) => `${autocompleteId}-wiki-link-option-${pageId}`, [autocompleteId]);

  // [[ 감지
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) { setTrigger(null); return; }
    const caret = ta.selectionStart;
    if (caret == null) { setTrigger(null); return; }
    // caret 직전 30자에서 마지막 [[ 찾기
    const head = value.slice(Math.max(0, caret - 60), caret);
    const m = /\[\[([^\]\n]{0,40})$/.exec(head);
    if (!m) { setTrigger(null); return; }
    const startIdx = caret - m[0].length;
    const query = m[1] ?? '';
    setTrigger({ query, startIdx, caretIdx: caret });
    setHighlight(0);
  }, [value, textareaRef]);

  // 위치 계산 — caret 좌표를 div mirror 로 추정 (간단 버전: textarea 좌하단 기준)
  useEffect(() => {
    if (!trigger || !textareaRef.current) { setPos(null); return; }
    const rect = textareaRef.current.getBoundingClientRect();
    setPos({ x: rect.left + 12, y: rect.top + 32 });
  }, [trigger, textareaRef]);

  const matches = useMemo(() => {
    if (!trigger) return [];
    const q = trigger.query.toLowerCase();
    return pages
      .filter((p) => p.id !== currentId)
      .filter((p) => {
        if (!q) return true;
        if (p.title.toLowerCase().includes(q)) return true;
        if (p.aliases.some((a) => a.toLowerCase().includes(q))) return true;
        return false;
      })
      .slice(0, 8);
  }, [pages, currentId, trigger]);

  useEffect(() => {
    if (matches.length === 0) {
      setHighlight(0);
      return;
    }
    setHighlight((current) => Math.min(current, matches.length - 1));
  }, [matches.length]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    if (!trigger || !pos) {
      ta.removeAttribute('aria-autocomplete');
      ta.removeAttribute('aria-expanded');
      ta.removeAttribute('aria-controls');
      ta.removeAttribute('aria-activedescendant');
      return;
    }

    ta.setAttribute('aria-autocomplete', 'list');
    ta.setAttribute('aria-expanded', 'true');
    ta.setAttribute('aria-controls', listboxId);
    if (matches[highlight]) {
      ta.setAttribute('aria-activedescendant', optionId(matches[highlight].id));
    } else {
      ta.removeAttribute('aria-activedescendant');
    }

    return () => {
      ta.removeAttribute('aria-autocomplete');
      ta.removeAttribute('aria-expanded');
      ta.removeAttribute('aria-controls');
      ta.removeAttribute('aria-activedescendant');
    };
  }, [highlight, listboxId, matches, optionId, pos, textareaRef, trigger]);

  const insertSelection = useCallback((title: string) => {
    if (!trigger) return;
    const before = value.slice(0, trigger.startIdx);
    const after = value.slice(trigger.caretIdx);
    const inserted = `[${title}](##wiki:${encodeURIComponent(title)})`;
    const next = before + inserted + after;
    onChange(next);
    setTrigger(null);
    // caret 을 삽입한 링크 뒤로
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) {
        const newCaret = before.length + inserted.length;
        ta.setSelectionRange(newCaret, newCaret);
        ta.focus();
      }
    });
  }, [onChange, textareaRef, trigger, value]);

  // 키 처리 — capture 단계에서 선처리
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta || !trigger) return;
    const onKey = (e: KeyboardEvent) => {
      if (!trigger) return;
      if (e.key === 'ArrowDown') {
        if (matches.length === 0) return;
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, matches.length - 1));
      } else if (e.key === 'ArrowUp') {
        if (matches.length === 0) return;
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      } else if (e.key === 'Enter') {
        if (matches[highlight]) {
          e.preventDefault();
          insertSelection(matches[highlight].title);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setTrigger(null);
      }
    };
    ta.addEventListener('keydown', onKey);
    return () => ta.removeEventListener('keydown', onKey);
  }, [trigger, matches, highlight, insertSelection, textareaRef]);

  if (!trigger || !pos) return null;

  const hasMatches = matches.length > 0;

  return (
    <div
      id={listboxId}
      ref={popoverRef}
      className="fixed z-50 rounded-lg border border-[hsl(var(--hairline))] bg-popover shadow-xl py-1 min-w-[240px] max-w-sm animate-in fade-in slide-in-from-top-1 duration-100"
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      role="listbox"
      aria-label={`문서 연결 자동완성: ${trigger.query || '전체 문서'}`}
    >
      <p className="px-3 pt-1 pb-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground border-b border-[hsl(var(--hairline))] mb-1">
        문서 연결 — {trigger.query || '(검색어 입력)'}
      </p>
      {hasMatches ? matches.map((p, i) => {
        const meta = WIKI_TYPE_META[p.type];
        return (
          <button
            key={p.id}
            id={optionId(p.id)}
            type="button"
            role="option"
            aria-selected={i === highlight}
            aria-label={`${p.title} 문서 링크 삽입, ${meta.label}`}
            onMouseEnter={() => setHighlight(i)}
            onClick={() => insertSelection(p.title)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
              i === highlight ? 'bg-accent text-foreground' : 'text-foreground/85 hover:bg-accent/60'
            )}
          >
            <span className="text-[14px] leading-none shrink-0" aria-hidden>{meta.icon}</span>
            <span className="flex-1 min-w-0 truncate text-[12.5px]">{p.title}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground/65">{meta.label}</span>
          </button>
        );
      }) : (
        <div role="status" className="px-3 py-3 text-[12px] leading-relaxed text-muted-foreground">
          일치하는 문서가 없어요.
          <span className="mt-0.5 block text-[10.5px] text-muted-foreground/70">
            계속 입력해 검색하거나 Esc로 닫을 수 있습니다.
          </span>
        </div>
      )}
      <p className="px-3 pt-1 pb-1.5 text-[9.5px] text-muted-foreground/70 border-t border-[hsl(var(--hairline))] mt-1">
        {hasMatches ? '↑↓ 이동 · Enter 선택 · Esc 닫기' : 'Esc 닫기'}
      </p>
    </div>
  );
}
