/**
 * 컬렉션 관리 — 한 곳에서 순서변경(드래그) · 이름·이모지 편집 · 삭제.
 * @dnd-kit 세로 정렬 리스트 (ExpertManageDialog 패턴 동일).
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FALLBACK_COLLECTION_KEY, type ArchiveCollection } from '@/types/archive';
import { archiveStore } from '@/services/archiveStore';
import { ArchiveCollectionEditor } from './ArchiveCollectionEditor';

interface Props {
  open: boolean;
  onClose: () => void;
  collections: ArchiveCollection[];
  /** 컬렉션 id → 항목 수. */
  counts: Map<string, number>;
}

function SortableRow({ collection, count, onEdit, onDelete, canDelete }: {
  collection: ArchiveCollection;
  count: number;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: collection.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] p-2.5 transition-all',
        isDragging && 'opacity-60 ring-2 ring-[hsl(var(--archive-sepia)/0.4)]',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="드래그해서 순서 변경"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--archive-sepia)/0.10)] text-[16px]">
        {collection.emoji ?? '📁'}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-foreground">{collection.name}</span>
      <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{count}</span>
      <button type="button" onClick={onEdit} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`${collection.name} 편집`}>
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500 disabled:pointer-events-none disabled:opacity-30"
        aria-label={`${collection.name} 삭제`}
        title={canDelete ? '삭제 (항목은 기타로 이동)' : '기타는 삭제할 수 없어요'}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ArchiveCollectionManager({ open, onClose, collections, counts }: Props) {
  const [editor, setEditor] = useState<{ collection: ArchiveCollection | null } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!open) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = collections.findIndex((c) => c.id === active.id);
      const newIndex = collections.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const next = arrayMove(collections, oldIndex, newIndex);
      archiveStore.reorderCollections(next.map((c) => c.id));
    }
  };

  const remove = (c: ArchiveCollection) => {
    const n = counts.get(c.id) ?? 0;
    const msg = n > 0
      ? `'${c.name}' 컬렉션을 삭제할까요?\n\n안의 항목 ${n}개는 '기타'로 옮겨져요.`
      : `'${c.name}' 컬렉션을 삭제할까요?`;
    if (!confirm(msg)) return;
    archiveStore.removeCollectionReassign(c.id);
  };

  const body = (
    <>
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center" onMouseDown={onClose}>
      <div
        className="archive-theme my-8 w-full max-w-md rounded-2xl border border-[hsl(var(--hairline))] bg-card shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center border-b border-[hsl(var(--hairline))] px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">컬렉션 관리</h2>
            <p className="text-[11.5px] text-muted-foreground">드래그해서 순서를 바꾸고, 편집·삭제해요</p>
          </div>
          <button type="button" onClick={onClose} className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-1.5 overflow-y-auto p-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={collections.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {collections.map((c) => (
                <SortableRow
                  key={c.id}
                  collection={c}
                  count={counts.get(c.id) ?? 0}
                  canDelete={c.builtinKey !== FALLBACK_COLLECTION_KEY && collections.length > 1}
                  onEdit={() => setEditor({ collection: c })}
                  onDelete={() => remove(c)}
                />
              ))}
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={() => setEditor({ collection: null })}
            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[hsl(var(--hairline))] py-2.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-[hsl(var(--archive-sepia)/0.5)] hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> 새 컬렉션
          </button>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end border-t border-[hsl(var(--hairline))] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[hsl(var(--archive-sepia))] px-6 py-2 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
          >
            완료
          </button>
        </div>
      </div>
    </div>

    {/* 편집·생성기 (관리 패널 위에) — 프래그먼트 형제로 두어 클릭 전파 격리 */}
    {editor && (
      <ArchiveCollectionEditor
        open
        collection={editor.collection}
        itemCount={editor.collection ? (counts.get(editor.collection.id) ?? 0) : 0}
        onClose={() => setEditor(null)}
      />
    )}
    </>
  );

  return createPortal(body, document.body);
}
