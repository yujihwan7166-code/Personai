import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import {
  Archive,
  Pencil,
  GripVertical,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDurationMinutes } from '@/lib/formatDuration';
import {
  PLANNER_LIBRARY_CHANGED,
  plannerLibraryStore,
  type PlannerLibraryItem,
} from '@/services/planner/libraryStore';
import type { PlannerDragData } from './dnd/plannerDndTypes';
import { TASK_LIST_COLORS, type TaskListColor } from '@/types/planner';

interface PlannerLibraryPanelProps {
  open: boolean;
  anchorIso: string;
  onOpenChange: (open: boolean) => void;
  onQuickAdd: (item: PlannerLibraryItem) => void;
}

const COLOR_OPTIONS: ReadonlyArray<{ value: TaskListColor; label: string }> = [
  { value: 'blue', label: '파랑' },
  { value: 'teal', label: '청록' },
  { value: 'green', label: '초록' },
  { value: 'amber', label: '노랑' },
  { value: 'orange', label: '주황' },
  { value: 'rose', label: '빨강' },
  { value: 'violet', label: '보라' },
  { value: 'cyan', label: '하늘' },
];

const DURATION_PRESETS = [30, 60, 90] as const;

export const PlannerLibraryPanel = ({
  open,
  onOpenChange,
  onQuickAdd,
}: PlannerLibraryPanelProps) => {
  const panelTitleId = useId();
  const panelDescId = useId();
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [items, setItems] = useState<PlannerLibraryItem[]>([]);
  const [title, setTitle] = useState('');
  const [durationMin, setDurationMin] = useState(60);
  const [customDurationOpen, setCustomDurationOpen] = useState(false);
  const [color, setColor] = useState<TaskListColor>('violet');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setItems(plannerLibraryStore.list());
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_LIBRARY_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_LIBRARY_CHANGED, refresh);
  }, []);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const activeElement = document.activeElement;
    restoreFocusRef.current = activeElement instanceof HTMLElement && activeElement !== document.body
      ? activeElement
      : null;
  }, [open]);

  const closePanel = useCallback(() => {
    onOpenChange(false);
    window.requestAnimationFrame(() => {
      if (restoreFocusRef.current?.isConnected) {
        restoreFocusRef.current.focus();
      }
    });
  }, [onOpenChange]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePanel, open]);

  const addTemplate = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (editingId) {
      plannerLibraryStore.update(editingId, {
        title: trimmed,
        kind: 'task',
        durationMin,
        color,
        priority: 0,
      });
      setEditingId(null);
    } else {
      plannerLibraryStore.add({
        title: trimmed,
        kind: 'task',
        durationMin,
        color,
        priority: 0,
      });
    }
    setTitle('');
    setCustomDurationOpen(false);
  };

  const startEdit = (item: PlannerLibraryItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDurationMin(item.durationMin);
    setCustomDurationOpen(!DURATION_PRESETS.includes(item.durationMin as typeof DURATION_PRESETS[number]));
    setColor(item.color ?? 'violet');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setCustomDurationOpen(false);
  };

  if (!open || typeof document === 'undefined') return null;

  const panel = (
    <aside
      data-planner-library-panel="true"
      role="dialog"
      aria-modal="false"
      aria-labelledby={panelTitleId}
      aria-describedby={panelDescId}
      className="fixed left-[56px] top-[88px] z-[45] flex w-[248px] max-h-[calc(100vh-104px)] flex-col overflow-hidden rounded-xl border border-foreground/25 bg-card shadow-[0_18px_42px_-30px_hsl(30_15%_8%/0.45)]"
    >
      <header className="flex h-11 shrink-0 items-center gap-2.5 border-b border-foreground/[0.12] px-3">
        <Archive className="h-[18px] w-[18px] shrink-0 text-foreground/70" strokeWidth={2.1} />
        <div className="flex min-w-0 flex-1 items-center self-stretch">
          <h2 id={panelTitleId} className="truncate text-[14px] font-extrabold leading-none text-foreground">보관함</h2>
          <p id={panelDescId} className="sr-only">
            자주 쓰는 일정과 할 일을 저장하고, 주간 플래너로 드래그하거나 빠르게 추가합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={closePanel}
          aria-label="보관함 닫기"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="max-h-[322px] shrink-0 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-foreground/15 px-3 py-5 text-center">
            <p className="text-[12px] font-semibold text-foreground">저장된 템플릿이 없어요.</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              자주 쓰는 항목을 아래에서 저장해두세요.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => (
              <LibraryItemRow
                key={item.id}
                item={item}
                onQuickAdd={() => onQuickAdd(item)}
                onEdit={() => startEdit(item)}
                onRemove={() => plannerLibraryStore.remove(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-foreground/[0.12] bg-background/55 p-2">
        <div className="space-y-2">
          {editingId && (
            <div className="flex items-center justify-between rounded-lg bg-accent/65 px-2.5 py-1.5">
              <span className="text-[11.5px] font-extrabold text-foreground">항목 수정 중</span>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-[11px] font-bold text-muted-foreground hover:text-foreground"
              >
                취소
              </button>
            </div>
          )}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addTemplate();
            }}
            placeholder="새 보관 항목"
            className="h-8 w-full rounded-lg border border-foreground/18 bg-card px-2.5 text-[12.5px] font-semibold outline-none placeholder:text-muted-foreground focus:border-primary/55"
          />
          <div className="grid grid-cols-4 gap-1">
            {DURATION_PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setDurationMin(value);
                  setCustomDurationOpen(false);
                }}
                className={cn(
                  'h-7 rounded-md border text-[11px] font-bold transition-colors',
                  durationMin === value && !customDurationOpen
                    ? 'border-primary/55 bg-primary/10 text-primary'
                    : 'border-foreground/14 bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {formatDurationMinutes(value)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustomDurationOpen(true)}
              className={cn(
                'h-7 rounded-md border text-[11px] font-bold transition-colors',
                customDurationOpen
                  ? 'border-primary/55 bg-primary/10 text-primary'
                  : 'border-foreground/14 bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              세부
            </button>
          </div>
          {customDurationOpen && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={15}
                max={720}
                step={15}
                value={durationMin}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) setDurationMin(Math.max(15, Math.min(720, next)));
                }}
                className="h-8 w-full rounded-lg border border-foreground/18 bg-card px-2.5 text-[12.5px] font-semibold outline-none focus:border-primary/55"
              />
              <span className="shrink-0 text-[11.5px] font-bold text-muted-foreground">분</span>
            </div>
          )}
          <div className="grid grid-cols-8 gap-1">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setColor(option.value)}
                aria-label={`${option.label} 색상`}
                className={cn(
                  'h-5 w-full rounded-md border transition-transform hover:scale-105',
                  color === option.value ? 'border-foreground ring-2 ring-foreground/12' : 'border-foreground/15',
                )}
                style={{ backgroundColor: TASK_LIST_COLORS[option.value].stripe }}
              >
                <span className="sr-only">{option.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={addTemplate}
            disabled={!title.trim()}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 text-[12px] font-extrabold text-background disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            {editingId ? '수정 완료' : '보관함에 저장'}
          </button>
        </div>
      </footer>
    </aside>
  );

  return createPortal(panel, document.body);
};

const LibraryItemRow = ({
  item,
  onQuickAdd,
  onEdit,
  onRemove,
}: {
  item: PlannerLibraryItem;
  onQuickAdd: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) => {
  const data: PlannerDragData = { kind: 'library-template', item };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-template-${item.id}`,
    data,
  });
  const color = item.color ? TASK_LIST_COLORS[item.color] : undefined;

  return (
    <div
      ref={setNodeRef}
      data-library-template-id={item.id}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`${item.title} 빠르게 추가`}
      title={item.title}
      onClick={onQuickAdd}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onQuickAdd();
        }
      }}
      className={cn(
        'group relative flex cursor-grab items-center gap-2 overflow-hidden rounded-lg border border-foreground/14 bg-card px-2 py-2 text-left shadow-[0_1px_2px_hsl(30_15%_8%/0.025)] transition-all hover:border-foreground/25 hover:bg-accent/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:cursor-grabbing',
        isDragging && 'opacity-55',
      )}
    >
      <span
        className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r-full"
        style={{ backgroundColor: color?.stripe ?? 'hsl(var(--muted-foreground))' }}
        aria-hidden
      />
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/55" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-extrabold text-foreground">
          {item.title}
        </span>
        <span className="mt-0.5 block truncate text-[10.5px] font-semibold text-muted-foreground">
          기본 {formatDurationMinutes(item.durationMin)}
        </span>
      </span>
      <div
        role="toolbar"
        aria-label={`${item.title} 빠른 작업`}
        className="absolute bottom-0 right-0 top-0 flex items-center gap-1 bg-gradient-to-l from-accent via-accent/95 to-transparent pl-8 pr-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onQuickAdd();
          }}
          aria-label={`${item.title} 추가`}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          aria-label={`${item.title} 수정`}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label={`${item.title} 삭제`}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/25"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};
