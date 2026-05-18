/** 시트 undo/redo — 500ms 디바운스 snapshot + history stack (최대 100). */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AllCells, AllMerges } from './cellTypes';

type AllFormats = Record<string, Record<string, unknown>>;

export interface SheetSnapshot {
  allCells: AllCells;
  allFormats: AllFormats;
  allMerges: AllMerges;
  rowCount: number;
  colCount: number;
}

interface UseSheetHistoryOpts<F extends AllFormats> {
  /** snapshot 시 기록할 현재 상태 */
  allCells: AllCells;
  allFormats: F;
  allMerges: AllMerges;
  rowCount: number;
  colCount: number;
  /** undo/redo 적용용 setters */
  setAllCells: (c: AllCells) => void;
  setAllFormats: (f: F) => void;
  setAllMerges: (m: AllMerges) => void;
  setRowCount: (n: number) => void;
  setColCount: (n: number) => void;
  /** snapshot 시작 트리거 — node 로드 전엔 push X */
  ready: boolean;
  /** undo/redo 적용 후 디스크 저장 큐 */
  queueSave: (patch: {
    allCells: AllCells;
    allFormats: F;
    allMerges: AllMerges;
    rowCount: number;
    colCount: number;
  }) => void;
}

interface UseSheetHistoryResult {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

export function useSheetHistory<F extends AllFormats>({
  allCells, allFormats, allMerges, rowCount, colCount,
  setAllCells, setAllFormats, setAllMerges, setRowCount, setColCount,
  ready, queueSave,
}: UseSheetHistoryOpts<F>): UseSheetHistoryResult {
  const [history, setHistory] = useState<SheetSnapshot[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const isApplyingHistoryRef = useRef(false);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 변경 감지 → 500ms 후 snapshot 저장 (history 끝에 push, future 삭제)
  useEffect(() => {
    // 로드 전이거나 undo/redo 중이면 push X
    if (!ready) return;
    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      return;
    }
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(() => {
      setHistory((h) => {
        const snap: SheetSnapshot = {
          allCells, allFormats, allMerges, rowCount, colCount,
        };
        // 첫 snapshot
        if (historyIdx === -1) {
          setHistoryIdx(0);
          return [snap];
        }
        // 현재가 마지막 snapshot 과 같으면 skip
        const last = h[historyIdx];
        if (last
          && last.allCells === snap.allCells
          && last.allFormats === snap.allFormats
          && last.allMerges === snap.allMerges
          && last.rowCount === snap.rowCount
          && last.colCount === snap.colCount) {
          return h;
        }
        const next = h.slice(0, historyIdx + 1);
        next.push(snap);
        // 최대 100 step
        if (next.length > 100) next.shift();
        setHistoryIdx(next.length - 1);
        return next;
      });
    }, 500);
    return () => {
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    };
  }, [ready, allCells, allFormats, allMerges, rowCount, colCount, historyIdx]);

  const canUndo = historyIdx > 0;
  const canRedo = historyIdx >= 0 && historyIdx < history.length - 1;

  const applySnapshot = useCallback((snap: SheetSnapshot) => {
    isApplyingHistoryRef.current = true;
    setAllCells(snap.allCells);
    setAllFormats(snap.allFormats as F);
    setAllMerges(snap.allMerges);
    setRowCount(snap.rowCount);
    setColCount(snap.colCount);
    queueSave({
      allCells: snap.allCells,
      allFormats: snap.allFormats as F,
      allMerges: snap.allMerges,
      rowCount: snap.rowCount,
      colCount: snap.colCount,
    });
  }, [setAllCells, setAllFormats, setAllMerges, setRowCount, setColCount, queueSave]);

  const undo = useCallback(() => {
    if (!canUndo) return;
    const target = history[historyIdx - 1];
    if (!target) return;
    setHistoryIdx(historyIdx - 1);
    applySnapshot(target);
  }, [canUndo, history, historyIdx, applySnapshot]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const target = history[historyIdx + 1];
    if (!target) return;
    setHistoryIdx(historyIdx + 1);
    applySnapshot(target);
  }, [canRedo, history, historyIdx, applySnapshot]);

  return { canUndo, canRedo, undo, redo };
}
