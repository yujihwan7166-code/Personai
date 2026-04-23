/**
 * 내 공간 패널 — 위젯 그리드 컨테이너.
 * 드롭다운 좌측 컬럼용 컴팩트 버전.
 */
import { useEffect, useState } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getWidgets, subscribeWidgets, addWidget, createDefaultWidget,
  WIDGET_META, WIDGET_ORDER, type WidgetItem, type WidgetKind,
} from '@/lib/mySpaceStore';
import { WidgetRenderer } from './widgets';

interface MySpacePanelProps {
  /** 편집 모드 (삭제 버튼 표시) 여부. 기본 true. */
  editable?: boolean;
  /** 위젯 개수 상한 (컴팩트 뷰용). */
  maxItems?: number;
  /** 전문가 위젯 클릭 시 콜백. */
  onOpenExpert?: (expertId: string) => void;
  className?: string;
}

export function MySpacePanel({ editable = true, maxItems, onOpenExpert, className }: MySpacePanelProps) {
  const [widgets, setWidgetsState] = useState<WidgetItem[]>(() => getWidgets());
  const [adderOpen, setAdderOpen] = useState(false);

  useEffect(() => subscribeWidgets(setWidgetsState), []);

  const visible = maxItems ? widgets.slice(0, maxItems) : widgets;

  const handleAdd = (kind: WidgetKind) => {
    addWidget(createDefaultWidget(kind));
    setAdderOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      {/* 헤더 */}
      <div className="mb-1.5 flex items-baseline gap-2 px-1">
        <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
          내 공간
        </span>
        <span className="text-[10.5px] text-muted-foreground/70 truncate flex-1">
          원하는 위젯 꽂기
        </span>
        {editable && (
          <button
            type="button"
            onClick={() => setAdderOpen((v) => !v)}
            aria-label="위젯 추가"
            className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] text-muted-foreground hover:bg-[hsl(var(--accent))] hover:text-foreground transition-colors"
          >
            <Plus className="h-2.5 w-2.5" />
            <span>추가</span>
          </button>
        )}
      </div>

      {/* 위젯 그리드 */}
      {visible.length === 0 ? (
        <EmptyState onAdd={() => setAdderOpen(true)} />
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {visible.map((w) => (
            <WidgetRenderer key={w.id} widget={w} editable={editable} onOpenExpert={onOpenExpert} />
          ))}
        </div>
      )}

      {/* 더 있을 경우 힌트 */}
      {maxItems && widgets.length > maxItems && (
        <div className="mt-1 px-1 text-[10px] text-muted-foreground/70">
          +{widgets.length - maxItems}개 더 · 전체 보기
        </div>
      )}

      {/* 위젯 추가 팝오버 */}
      {adderOpen && (
        <AddWidgetMenu onPick={handleAdd} onClose={() => setAdderOpen(false)} />
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        'w-full rounded-xl border border-dashed border-[hsl(var(--hairline))]',
        'py-4 px-3 flex flex-col items-center gap-1 text-muted-foreground',
        'hover:border-[hsl(var(--border))] hover:text-foreground transition-colors',
      )}
    >
      <Settings2 className="h-3.5 w-3.5" />
      <span className="text-[10.5px]">비어있음 · 위젯 추가</span>
    </button>
  );
}

function AddWidgetMenu({ onPick, onClose }: { onPick: (kind: WidgetKind) => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      {/* 바깥 클릭 영역 */}
      <div className="fixed inset-0 z-[130]" onClick={onClose} aria-hidden />
      <div
        role="menu"
        className={cn(
          'absolute z-[131] top-6 right-0 w-[220px] p-1.5 rounded-xl',
          'bg-[hsl(var(--popover))] border border-[hsl(var(--hairline))]',
          'shadow-[0_18px_60px_hsl(220_20%_5%_/_0.25)]',
        )}
      >
        <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          위젯 추가
        </div>
        <div className="grid grid-cols-1 gap-0.5 max-h-[320px] overflow-y-auto">
          {WIDGET_ORDER.map((kind) => {
            const meta = WIDGET_META[kind];
            return (
              <button
                key={kind}
                type="button"
                onClick={() => onPick(kind)}
                role="menuitem"
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left hover:bg-[hsl(var(--accent))] transition-colors"
              >
                <span className="text-[14px] shrink-0" aria-hidden>{meta.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11.5px] font-medium truncate">{meta.label}</span>
                  <span className="block text-[10px] text-muted-foreground truncate">{meta.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
