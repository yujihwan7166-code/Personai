import { useEffect, useRef, useState } from 'react';
import { Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WikiPage } from '@/types/wiki';
import { splitIntoBlocks, replaceBlock, insertBlockAfter, joinBlocks } from '@/lib/wikiBlocks';
import { WikiBody } from './WikiBody';

interface Props {
  body: string;
  findByTitle: (title: string) => WikiPage | undefined;
  visitedIds?: Set<string>;
  onChange: (newBody: string) => void;
  onOpenLink: (titleOrId: string) => void;
}

/**
 * 라이브 프리뷰 편집기 — 옵시디언 Live Preview 스타일.
 * - 본문을 블록으로 split
 * - 평소엔 블록을 마크다운 렌더로 표시
 * - 블록 클릭 → 그 블록만 textarea 인라인 편집
 * - 포커스 잃으면 자동 저장 후 다시 렌더
 *
 * "전체 편집" 모드는 부모가 별도로 관리 (대량 수정용 폴백).
 */
export function WikiLiveEditor({ body, findByTitle, visitedIds, onChange, onOpenLink }: Props) {
  const blocks = splitIntoBlocks(body);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // 위·아래 모서리에 "+ 새 블록" 버튼
  const addAt = (afterIndex: number) => {
    const next = insertBlockAfter(body, afterIndex, '');
    onChange(next);
    setEditingIdx(afterIndex + 1);
  };

  // 빈 본문 — 첫 클릭 시 첫 블록 생성
  if (blocks.length === 0) {
    return (
      <button
        type="button"
        onClick={() => { onChange(' '); setEditingIdx(0); }}
        className="block w-full min-h-[160px] text-left rounded-lg border border-dashed border-[hsl(var(--hairline))] hover:border-primary/40 hover:bg-accent/30 transition-colors p-4 text-muted-foreground text-[13px] italic"
      >
        클릭해서 첫 블록 시작 — 또는 우상단 [전체 편집] 으로 한 번에.
      </button>
    );
  }

  return (
    <div className="space-y-1">
      {/* 첫 블록 위에 + 버튼 */}
      <BlockInserter onClick={() => addAt(-1)} />

      {blocks.map((b, i) => (
        <BlockRow
          key={`${i}:${b.content.slice(0, 12)}`}
          blockContent={b.content}
          editing={editingIdx === i}
          hovered={hoverIdx === i}
          onEnterHover={() => setHoverIdx(i)}
          onLeaveHover={() => setHoverIdx((h) => (h === i ? null : h))}
          onStartEdit={() => setEditingIdx(i)}
          onSaveEdit={(text) => {
            const next = replaceBlock(body, i, text);
            onChange(next);
            setEditingIdx(null);
          }}
          onCancelEdit={() => setEditingIdx(null)}
          onAddAfter={() => addAt(i)}
          findByTitle={findByTitle}
          visitedIds={visitedIds}
          onOpenLink={onOpenLink}
        />
      ))}
    </div>
  );
}

/* ── 블록 행 ── */
function BlockRow({
  blockContent, editing, hovered,
  onEnterHover, onLeaveHover,
  onStartEdit, onSaveEdit, onCancelEdit, onAddAfter,
  findByTitle, visitedIds, onOpenLink,
}: {
  blockContent: string;
  editing: boolean;
  hovered: boolean;
  onEnterHover: () => void;
  onLeaveHover: () => void;
  onStartEdit: () => void;
  onSaveEdit: (text: string) => void;
  onCancelEdit: () => void;
  onAddAfter: () => void;
  findByTitle: (title: string) => WikiPage | undefined;
  visitedIds?: Set<string>;
  onOpenLink: (titleOrId: string) => void;
}) {
  if (editing) {
    return (
      <BlockEditor
        initial={blockContent}
        onSave={onSaveEdit}
        onCancel={onCancelEdit}
      />
    );
  }

  return (
    <div
      onMouseEnter={onEnterHover}
      onMouseLeave={onLeaveHover}
      className="relative group/block"
    >
      {/* 좌측 ⋮ 핸들 — Notion 패턴. 호버 시 -16px 위치에 살짝 등장. */}
      <span
        aria-hidden
        className={cn(
          'absolute top-1.5 -left-5 inline-flex items-center justify-center w-4 h-5 rounded text-muted-foreground/60 wiki-trans-color pointer-events-none',
          hovered ? 'opacity-60' : 'opacity-0',
        )}
      >
        <GripVertical className="w-3 h-3" />
      </span>
      <button
        type="button"
        onClick={onStartEdit}
        className={cn(
          'block w-full text-left rounded-md wiki-trans-color px-2 py-0.5 -mx-2 cursor-text',
          hovered ? 'bg-accent/40' : 'bg-transparent',
        )}
        aria-label="이 블록 편집"
      >
        <div className="wiki-prose pointer-events-auto">
          <WikiBody
            body={blockContent}
            onOpenLink={onOpenLink}
            findByTitle={findByTitle}
            visitedIds={visitedIds}
          />
        </div>
      </button>
      {hovered && (
        <BlockInserter onClick={onAddAfter} compact />
      )}
    </div>
  );
}

/* ── 블록 편집 textarea ── */
function BlockEditor({ initial, onSave, onCancel }: { initial: string; onSave: (text: string) => void; onCancel: () => void; }) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.focus();
    // 끝으로 caret
    const end = ta.value.length;
    ta.setSelectionRange(end, end);
    autoresize(ta);
  }, []);

  return (
    <textarea
      ref={ref}
      value={text}
      onChange={(e) => { setText(e.target.value); autoresize(e.currentTarget); }}
      onBlur={() => onSave(text)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          onSave(text);
        }
      }}
      placeholder="비우면 블록이 삭제됩니다 · Esc 취소 · ⌘/Ctrl+Enter 저장"
      className="w-full min-h-[60px] bg-background border border-primary/30 rounded-md px-3 py-2 text-[13.5px] leading-7 font-mono outline-none focus:border-primary/60 transition-colors resize-none"
    />
  );
}

function autoresize(ta: HTMLTextAreaElement) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

/* ── + 새 블록 인서터 ── */
function BlockInserter({ onClick, compact }: { onClick: () => void; compact?: boolean }) {
  return (
    <div className={cn('flex items-center', compact ? 'h-1.5' : 'h-2')}>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className="flex-1 group flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity"
        aria-label="새 블록 추가"
        tabIndex={-1}
      >
        <span className="flex-1 h-px bg-primary/30" />
        <span className="text-[10px] inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-primary/10 text-primary">
          <Plus className="w-2.5 h-2.5" /> 블록
        </span>
        <span className="flex-1 h-px bg-primary/30" />
      </button>
    </div>
  );
}

/* 외부 사용 안 하는 헬퍼 — 미사용 import 경고 회피 */
void joinBlocks;
