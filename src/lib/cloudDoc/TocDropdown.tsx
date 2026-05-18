/** 문서 헤더 우측 — 자동 목차 dropdown (H1/H2/H3 추출 + 클릭 jump). */

import { useCallback, useEffect, useState } from 'react';
import { ListTree } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface TocItem { level: number; text: string; pos: number }

export function TocDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TocItem[]>([]);

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

  useEffect(() => {
    refresh();
    editor.on('update', refresh);
    return () => { editor.off('update', refresh); };
  }, [editor, refresh]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

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
        title={items.length === 0 ? '목차 (헤딩이 아직 없어요)' : `목차 (헤딩 ${items.length}개)`}
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
              {items.map((it, i) => (
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
                    className="w-full text-left px-3 py-1.5 hover:bg-muted truncate"
                    style={{ paddingLeft: `${12 + (it.level - 1) * 12}px` }}
                    title={it.text}
                  >
                    <span className={cn(
                      it.level === 1 && 'font-semibold',
                      it.level === 2 && 'font-medium',
                      it.level >= 3 && 'text-muted-foreground',
                    )}>
                      {it.text}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
