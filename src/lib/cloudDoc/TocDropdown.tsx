/** 문서 헤더 우측 — 자동 목차 dropdown (H1/H2/H3 추출 + 클릭 jump). */

import { useCallback, useEffect, useState } from 'react';
import { ListTree } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface TocItem { level: number; text: string; pos: number }

export function TocDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TocItem[]>([]);
  /** 현재 커서가 속한 섹션의 헤딩 인덱스. -1 = 첫 헤딩 전. */
  const [activeIdx, setActiveIdx] = useState(-1);

  const refresh = useCallback(() => {
    const out: TocItem[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const level = (node.attrs.level as number) ?? 1;
        const text = node.textContent.trim();
        if (text) out.push({ level, text, pos });
      }
    });
    setItems(out);
  }, [editor]);

  /** 커서가 들어 있는 섹션 = 커서 위치보다 작은 pos 중 가장 큰 헤딩. */
  const recomputeActive = useCallback(() => {
    const cur = editor.state.selection.from;
    let idx = -1;
    for (let i = 0; i < items.length; i++) {
      if (items[i].pos <= cur) idx = i;
      else break;
    }
    setActiveIdx(idx);
  }, [editor, items]);

  useEffect(() => {
    refresh();
    editor.on('update', refresh);
    return () => { editor.off('update', refresh); };
  }, [editor, refresh]);

  useEffect(() => {
    recomputeActive();
    editor.on('selectionUpdate', recomputeActive);
    editor.on('update', recomputeActive);
    return () => {
      editor.off('selectionUpdate', recomputeActive);
      editor.off('update', recomputeActive);
    };
  }, [editor, recomputeActive]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

  const activeText = activeIdx >= 0 ? items[activeIdx]?.text : null;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); refresh(); }}
        className={cn(
          'p-2 rounded text-sm flex items-center gap-1.5',
          open ? 'bg-muted' : 'hover:bg-muted',
        )}
        aria-pressed={open}
        aria-label={`목차 (헤딩 ${items.length}개)`}
        title={
          items.length === 0
            ? '목차 (헤딩이 아직 없어요)'
            : activeText
              ? `목차 — 현재: ${activeText}`
              : `목차 (헤딩 ${items.length}개)`
        }
      >
        <ListTree className="w-4 h-4" />
        {items.length > 0 && (
          <span className="text-[10px] font-medium text-muted-foreground tabular-nums hidden sm:inline">
            {items.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 min-w-[220px] max-w-[360px] max-h-[60vh] overflow-y-auto rounded border border-border bg-popover shadow-md py-1">
          {items.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              헤딩이 없어요 — # 또는 ## 로 제목을 만들어 보세요.
            </div>
          ) : (
            <ul className="text-sm">
              {items.map((it, i) => {
                const isActive = i === activeIdx;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain()
                          .focus()
                          .setTextSelection(it.pos + 1)
                          .scrollIntoView()
                          .run();
                        setOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-1.5 truncate flex items-center gap-2',
                        isActive ? 'bg-accent/60 border-l-2 border-foreground/60' : 'hover:bg-muted',
                      )}
                      style={{ paddingLeft: `${(isActive ? 10 : 12) + (it.level - 1) * 12}px` }}
                      title={it.text}
                      aria-current={isActive ? 'true' : undefined}
                    >
                      <span className={cn(
                        'truncate',
                        it.level === 1 && 'font-semibold',
                        it.level === 2 && 'font-medium',
                        it.level >= 3 && !isActive && 'text-muted-foreground',
                      )}>
                        {it.text}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
