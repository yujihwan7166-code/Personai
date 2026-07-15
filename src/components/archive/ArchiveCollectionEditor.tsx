/**
 * 컬렉션 만들기·편집 — 이름 + 이모지(마크) 선택.
 *  collection === null 이면 생성, 있으면 편집(+삭제).
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import type { ArchiveCollection } from '@/types/archive';
import { archiveStore } from '@/services/archiveStore';

/** 자주 쓰는 이모지 마크 — 클릭 한 번으로 선택. */
const EMOJI_CHOICES = [
  '📄', '🧾', '🔖', '▶️', '📷', '💡', '🍳', '📦',
  '🎵', '✈️', '🏥', '💰', '🎬', '📚', '🎫', '🏠',
  '🔑', '🎁', '❤️', '🐾', '🌱', '⭐', '📌', '🗂️',
  '📁', '🎨', '🛒', '💊', '🚗', '👕', '📝', '🔗',
];

interface Props {
  open: boolean;
  /** null 이면 새로 만들기, 있으면 편집. */
  collection: ArchiveCollection | null;
  /** 이 컬렉션에 든 항목 수 — 편집 시 삭제 가능 여부 판단. */
  itemCount?: number;
  onClose: () => void;
}

export function ArchiveCollectionEditor({ open, collection, itemCount = 0, onClose }: Props) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const editing = !!collection;

  useEffect(() => {
    if (open) {
      setName(collection?.name ?? '');
      setEmoji(collection?.emoji ?? '📁');
    }
  }, [open, collection]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const save = () => {
    const n = name.trim();
    if (!n) { notify.info('컬렉션 이름을 입력해주세요'); return; }
    if (collection) {
      archiveStore.updateCollection(collection.id, { name: n, emoji });
      notify.success('컬렉션을 수정했어요');
    } else {
      archiveStore.addCollection(n, emoji);
      notify.success(`"${n}" 컬렉션을 만들었어요`);
    }
    onClose();
  };

  const remove = () => {
    if (!collection) return;
    if (itemCount > 0) {
      notify.info(`항목 ${itemCount}개가 있어 삭제할 수 없어요`, { description: '먼저 항목을 옮기거나 지워주세요' });
      return;
    }
    if (!confirm(`'${collection.name}' 컬렉션을 삭제할까요?`)) return;
    archiveStore.removeCollection(collection.id);
    notify.success('컬렉션을 삭제했어요');
    onClose();
  };

  const body = (
    <div className="fixed inset-0 z-[85] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center" onMouseDown={onClose}>
      <div
        className="archive-theme my-8 w-full max-w-sm rounded-2xl border border-[hsl(var(--hairline))] bg-card shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center border-b border-[hsl(var(--hairline))] px-5 py-3.5">
          <h2 className="text-[15px] font-bold text-foreground">{editing ? '컬렉션 편집' : '새 컬렉션'}</h2>
          <button type="button" onClick={onClose} className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* 미리보기 + 이름 */}
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--archive-sepia)/0.12)] text-[26px]">
              {emoji}
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
              placeholder="컬렉션 이름"
              className="min-w-0 flex-1 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-2 text-[14px] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/70 focus:border-[hsl(var(--archive-sepia))]"
            />
          </div>

          {/* 이모지 마크 선택 */}
          <div>
            <span className="mb-2 block text-[12px] font-semibold text-foreground">아이콘</span>
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    'flex h-9 items-center justify-center rounded-lg text-[19px] transition-colors',
                    emoji === e
                      ? 'bg-[hsl(var(--archive-sepia)/0.16)] ring-2 ring-[hsl(var(--archive-sepia)/0.5)]'
                      : 'hover:bg-accent',
                  )}
                  aria-label={`아이콘 ${e}`}
                  aria-pressed={emoji === e}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center gap-2 border-t border-[hsl(var(--hairline))] px-5 py-3">
          {editing && (
            <button
              type="button"
              onClick={remove}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-rose-500 transition-colors hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" /> 삭제
            </button>
          )}
          <button
            type="button"
            onClick={save}
            className="ml-auto rounded-lg bg-[hsl(var(--archive-sepia))] px-6 py-2 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
          >
            {editing ? '저장' : '만들기'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
