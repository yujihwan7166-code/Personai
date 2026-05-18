/** 시트 탭 — 더블클릭 이름변경 + 우클릭 메뉴 + 색 띠 + 활성 시 ⋯ 드롭다운. */

import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2, Pencil, Copy as CopyIcon, Trash2 as TrashIcon,
  ChevronLeft, ChevronRight, MoreHorizontal, Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent,
  ContextMenuItem, ContextMenuSeparator,
  ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent,
} from '@/components/ui/context-menu';

export type SheetTabColor = 'red' | 'orange' | 'amber' | 'green' | 'teal' | 'blue' | 'purple' | 'pink';

export const SHEET_TAB_COLOR_LABEL: Record<SheetTabColor, string> = {
  red: '빨강', orange: '주황', amber: '노랑', green: '초록',
  teal: '청록', blue: '파랑', purple: '보라', pink: '분홍',
};

/** 탭 인디케이터용 — Tailwind 동적 클래스 X 회피, 직접 hex (디자인 토큰 톤 맞춤). */
export const SHEET_TAB_COLOR_HEX: Record<SheetTabColor, string> = {
  red:    '#ef4444',
  orange: '#f97316',
  amber:  '#f59e0b',
  green:  '#22c55e',
  teal:   '#14b8a6',
  blue:   '#3b82f6',
  purple: '#a855f7',
  pink:   '#ec4899',
};

interface SheetTabProps {
  name: string;
  color?: SheetTabColor;
  active: boolean;
  canRemove: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onClick: () => void;
  onRename: (newName: string) => void;
  onColorChange: (color: SheetTabColor | undefined) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}

export function SheetTab({
  name, color, active, canRemove, canMoveLeft, canMoveRight,
  onClick, onRename, onColorChange, onDuplicate, onRemove, onMoveLeft, onMoveRight,
}: SheetTabProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(name);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [editing, name]);

  const commit = () => {
    const v = draft.trim();
    setEditing(false);
    if (v && v !== name) onRename(v);
  };

  const menuItems = (
    <>
      {!active && (
        <ContextMenuItem onSelect={onClick}>
          <CheckCircle2 className="w-4 h-4 mr-2" /> 이 시트로 이동
        </ContextMenuItem>
      )}
      <ContextMenuItem onSelect={() => setEditing(true)}>
        <Pencil className="w-4 h-4 mr-2" /> 이름 변경
      </ContextMenuItem>
      <ContextMenuItem onSelect={onDuplicate}>
        <CopyIcon className="w-4 h-4 mr-2" /> 복제
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onMoveLeft} disabled={!canMoveLeft}>
        <ChevronLeft className="w-4 h-4 mr-2" /> 왼쪽으로 이동
      </ContextMenuItem>
      <ContextMenuItem onSelect={onMoveRight} disabled={!canMoveRight}>
        <ChevronRight className="w-4 h-4 mr-2" /> 오른쪽으로 이동
      </ContextMenuItem>
      <ContextMenuSeparator />
      {/* 탭 색상 (PR #7) — 8 색 + 해제 */}
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Palette className="w-4 h-4 mr-2" /> 탭 색상
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem onSelect={() => onColorChange(undefined)}>
            <span className="inline-block w-3 h-3 mr-2 rounded-sm border border-border" />
            기본 (해제)
          </ContextMenuItem>
          <ContextMenuSeparator />
          {(Object.keys(SHEET_TAB_COLOR_LABEL) as SheetTabColor[]).map((c) => (
            <ContextMenuItem key={c} onSelect={() => onColorChange(c)}>
              <span
                className="inline-block w-3 h-3 mr-2 rounded-sm border border-border"
                style={{ backgroundColor: SHEET_TAB_COLOR_HEX[c] }}
              />
              {SHEET_TAB_COLOR_LABEL[c]}
              {color === c && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSeparator />
      <ContextMenuItem
        onSelect={onRemove}
        disabled={!canRemove}
        className="text-destructive focus:text-destructive"
      >
        <TrashIcon className="w-4 h-4 mr-2" /> 삭제
      </ContextMenuItem>
    </>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex items-center group">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commit(); }
                else if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
              }}
              onBlur={commit}
              className={cn(
                'text-xs px-2 py-1 rounded-t border-l border-r border-t border-border bg-background outline-none',
                'w-24',
              )}
            />
          ) : (
            <button
              type="button"
              onClick={onClick}
              onDoubleClick={() => setEditing(true)}
              className={cn(
                'text-xs px-3 py-1 rounded-t border-l border-r border-t transition-colors relative',
                active
                  ? 'border-border bg-background font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-muted',
              )}
              // 색 띠 — 활성: 윗쪽 2px 강조. 비활성: 아래쪽 얇은 1.5px (작게 보임).
              style={color
                ? (active
                    ? { boxShadow: `inset 0 2px 0 ${SHEET_TAB_COLOR_HEX[color]}` }
                    : { boxShadow: `inset 0 -1.5px 0 ${SHEET_TAB_COLOR_HEX[color]}` })
                : undefined}
              title="더블클릭: 이름 변경 · 우클릭: 메뉴"
            >
              {name}
            </button>
          )}

          {active && !editing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="ml-0.5 p-0.5 rounded hover:bg-muted opacity-60 hover:opacity-100"
                  aria-label="시트 메뉴"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[160px]">
                <DropdownMenuItem onSelect={() => setEditing(true)}>
                  <Pencil className="w-4 h-4 mr-2" /> 이름 변경
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onDuplicate}>
                  <CopyIcon className="w-4 h-4 mr-2" /> 복제
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onMoveLeft} disabled={!canMoveLeft}>
                  <ChevronLeft className="w-4 h-4 mr-2" /> 왼쪽으로 이동
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onMoveRight} disabled={!canMoveRight}>
                  <ChevronRight className="w-4 h-4 mr-2" /> 오른쪽으로 이동
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={onRemove}
                  disabled={!canRemove}
                  className="text-destructive focus:text-destructive"
                >
                  <TrashIcon className="w-4 h-4 mr-2" /> 삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[160px]">
        {menuItems}
      </ContextMenuContent>
    </ContextMenu>
  );
}
