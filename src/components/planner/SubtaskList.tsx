/**
 * 서브태스크 인라인 리스트 — 인박스 카드 콜랩스 영역 + 모달 본문 양쪽에서 사용.
 *
 * 상태:
 * - 토글: 체크박스 클릭으로 done 토글
 * - 추가: 하단 + input → Enter
 * - 텍스트 편집: 더블클릭 또는 inline edit (모달에서)
 * - 삭제: hover 시 X
 *
 * 두 모드:
 * - mode='inline': 인박스 카드 안. 작은 사이즈, 추가 input 표시.
 * - mode='modal': 모달 안. 좀 더 큰 사이즈.
 */
import { useState } from 'react';
import { Check, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Subtask } from '@/types/planner';

interface SubtaskListProps {
  subtasks: Subtask[];
  onToggle: (subtaskId: string) => void;
  onAdd: (text: string) => void;
  onRemove: (subtaskId: string) => void;
  onUpdate?: (subtaskId: string, text: string) => void;
  mode?: 'inline' | 'modal';
}

export const SubtaskList = ({
  subtasks,
  onToggle,
  onAdd,
  onRemove,
  onUpdate,
  mode = 'inline',
}: SubtaskListProps) => {
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleAdd = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewText('');
  };

  const startEdit = (sub: Subtask) => {
    setEditingId(sub.id);
    setEditText(sub.text);
  };

  const finishEdit = (sub: Subtask) => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== sub.text) {
      onUpdate?.(sub.id, trimmed);
    }
    setEditingId(null);
  };

  const sorted = [...subtasks].sort((a, b) => a.order - b.order);
  const isModal = mode === 'modal';
  const sizeBox = isModal ? 'h-4 w-4' : 'h-3.5 w-3.5';
  const sizeIcon = isModal ? 'h-3 w-3' : 'h-2.5 w-2.5';
  const textSize = isModal ? 'text-[13px]' : 'text-[12px]';
  const indent = isModal ? 'pl-0' : 'pl-6';

  return (
    <div className={cn('flex flex-col', isModal ? 'gap-1.5' : 'gap-0.5')}>
      {sorted.map((sub) => (
        <div
          key={sub.id}
          className={cn('group flex items-center gap-2 rounded px-1 py-0.5 hover:bg-accent/40', indent)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(sub.id);
            }}
            className={cn(
              'flex items-center justify-center rounded-[3px] border transition-all shrink-0',
              sizeBox,
              sub.done
                ? 'bg-foreground border-foreground text-background'
                : 'border-[hsl(var(--hairline))] hover:border-foreground/50',
            )}
            aria-label={sub.done ? '완료 취소' : '완료'}
          >
            {sub.done && <Check className={cn(sizeIcon)} strokeWidth={3.5} />}
          </button>
          {editingId === sub.id ? (
            <input
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => finishEdit(sub)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  finishEdit(sub);
                } else if (e.key === 'Escape') {
                  setEditingId(null);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'flex-1 bg-transparent outline-none border-b border-foreground/30 leading-tight',
                textSize,
              )}
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (onUpdate) startEdit(sub);
              }}
              className={cn(
                'flex-1 leading-tight truncate',
                textSize,
                sub.done && 'line-through text-muted-foreground',
              )}
            >
              {sub.text}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(sub.id);
            }}
            aria-label="삭제"
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-500 transition-opacity shrink-0"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>
      ))}

      {/* 추가 input */}
      <div className={cn('flex items-center gap-2 px-1', indent)}>
        <Plus className={cn('shrink-0 text-muted-foreground/60', sizeIcon)} strokeWidth={2.5} />
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          placeholder="단계 추가"
          className={cn(
            'flex-1 bg-transparent outline-none placeholder:text-muted-foreground/60 leading-tight',
            textSize,
          )}
        />
      </div>
    </div>
  );
};

/** 진행률 표시 — "3/5" + 도넛 칩. PlannerCard block variant 에서 사용. */
export const SubtaskProgress = ({ subtasks, compact = true }: { subtasks: Subtask[]; compact?: boolean }) => {
  const total = subtasks.length;
  if (total === 0) return null;
  const done = subtasks.filter((s) => s.done).length;
  const allDone = done === total;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 tabular-nums',
        compact ? 'text-[9.5px]' : 'text-[10.5px]',
        allDone ? 'text-emerald-600' : 'text-muted-foreground/80',
      )}
      aria-label={`서브태스크 ${done}/${total} 완료`}
      title={`${done}/${total}`}
    >
      <span>{done}/{total}</span>
    </span>
  );
};
