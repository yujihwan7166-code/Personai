/**
 * 화이트보드 — 보드별 undo/redo 스택.
 *
 * 단순 immutable snapshot 방식 (Phase 1).
 * 메모리 절약을 위한 immer patches 도입은 Phase 2.
 * 세션 한정 — 저장 X.
 */
import type { WBElement } from '@/types/whiteboard';

interface Snapshot {
  elements: WBElement[];
}

interface BoardHistory {
  stack: Snapshot[];
  cursor: number;   // 현재 위치 (stack[cursor] = 현재 상태)
}

const MAX_ENTRIES = 50;
const historyMap = new Map<string, BoardHistory>();

function ensure(boardId: string): BoardHistory {
  let h = historyMap.get(boardId);
  if (!h) {
    h = { stack: [], cursor: -1 };
    historyMap.set(boardId, h);
  }
  return h;
}

/** 새 스냅샷 추가. cursor 이후 entry 폐기 (분기). */
export function pushSnapshot(boardId: string, elements: WBElement[]): void {
  const h = ensure(boardId);
  // cursor 이후 폐기
  h.stack = h.stack.slice(0, h.cursor + 1);
  h.stack.push({ elements });
  // 최대 크기 유지 (오래된 것 제거, cursor 보정)
  while (h.stack.length > MAX_ENTRIES) {
    h.stack.shift();
  }
  h.cursor = h.stack.length - 1;
}

export function canUndo(boardId: string): boolean {
  const h = ensure(boardId);
  return h.cursor > 0;
}

export function canRedo(boardId: string): boolean {
  const h = ensure(boardId);
  return h.cursor < h.stack.length - 1;
}

export function undo(boardId: string): WBElement[] | null {
  const h = ensure(boardId);
  if (h.cursor <= 0) return null;
  h.cursor -= 1;
  return h.stack[h.cursor].elements;
}

export function redo(boardId: string): WBElement[] | null {
  const h = ensure(boardId);
  if (h.cursor >= h.stack.length - 1) return null;
  h.cursor += 1;
  return h.stack[h.cursor].elements;
}

/** 보드 전환·삭제 시 초기화 */
export function clearHistory(boardId: string): void {
  historyMap.delete(boardId);
}
