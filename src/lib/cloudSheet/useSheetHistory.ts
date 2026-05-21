import { useCallback, useEffect, useRef, useState } from 'react';
import type { AllCells, AllMerges } from './cellTypes';

type AllFormats = Record<string, Record<string, unknown>>;
type DimensionMap = Record<number, number>;
type SheetRecord<T> = Record<string, T>;
type NamedRanges = Record<string, string>;

export interface SheetSnapshot {
  allCells: AllCells;
  allFormats: AllFormats;
  allMerges: AllMerges;
  allCondRules?: SheetRecord<unknown[]>;
  allValidations?: SheetRecord<unknown[]>;
  allComments?: SheetRecord<Record<string, string>>;
  allEmbeddedCharts?: SheetRecord<unknown[]>;
  namedRanges?: NamedRanges;
  rowCount: number;
  colCount: number;
  colWidths: DimensionMap;
  rowHeights: DimensionMap;
  freezeRows: number;
  freezeCols: number;
  allColWidths?: SheetRecord<DimensionMap>;
  allRowHeights?: SheetRecord<DimensionMap>;
  allFreezeRows?: SheetRecord<number>;
  allFreezeCols?: SheetRecord<number>;
}

interface UseSheetHistoryOpts<F extends AllFormats> {
  allCells: AllCells;
  allFormats: F;
  allMerges: AllMerges;
  allCondRules?: SheetRecord<unknown[]>;
  allValidations?: SheetRecord<unknown[]>;
  allComments?: SheetRecord<Record<string, string>>;
  allEmbeddedCharts?: SheetRecord<unknown[]>;
  namedRanges?: NamedRanges;
  rowCount: number;
  colCount: number;
  colWidths: DimensionMap;
  rowHeights: DimensionMap;
  freezeRows: number;
  freezeCols: number;
  allColWidths?: SheetRecord<DimensionMap>;
  allRowHeights?: SheetRecord<DimensionMap>;
  allFreezeRows?: SheetRecord<number>;
  allFreezeCols?: SheetRecord<number>;
  setAllCells: (c: AllCells) => void;
  setAllFormats: (f: F) => void;
  setAllMerges: (m: AllMerges) => void;
  setAllCondRules?: (v: SheetRecord<unknown[]>) => void;
  setAllValidations?: (v: SheetRecord<unknown[]>) => void;
  setAllComments?: (v: SheetRecord<Record<string, string>>) => void;
  setAllEmbeddedCharts?: (v: SheetRecord<unknown[]>) => void;
  setNamedRanges?: (v: NamedRanges) => void;
  setRowCount: (n: number) => void;
  setColCount: (n: number) => void;
  setColWidths: (w: DimensionMap) => void;
  setRowHeights: (h: DimensionMap) => void;
  setFreezeRows: (n: number) => void;
  setFreezeCols: (n: number) => void;
  setAllColWidths?: (v: SheetRecord<DimensionMap>) => void;
  setAllRowHeights?: (v: SheetRecord<DimensionMap>) => void;
  setAllFreezeRows?: (v: SheetRecord<number>) => void;
  setAllFreezeCols?: (v: SheetRecord<number>) => void;
  ready: boolean;
  queueSave: (patch: {
    allCells: AllCells;
    allFormats: F;
    allMerges: AllMerges;
    allCondRules?: SheetRecord<unknown[]>;
    allValidations?: SheetRecord<unknown[]>;
    allComments?: SheetRecord<Record<string, string>>;
    allEmbeddedCharts?: SheetRecord<unknown[]>;
    namedRanges?: NamedRanges;
    rowCount: number;
    colCount: number;
    colWidths: DimensionMap;
    rowHeights: DimensionMap;
    freezeRows: number;
    freezeCols: number;
    allColWidths?: SheetRecord<DimensionMap>;
    allRowHeights?: SheetRecord<DimensionMap>;
    allFreezeRows?: SheetRecord<number>;
    allFreezeCols?: SheetRecord<number>;
  }) => void;
}

interface UseSheetHistoryResult {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

export function useSheetHistory<F extends AllFormats>({
  allCells,
  allFormats,
  allMerges,
  allCondRules,
  allValidations,
  allComments,
  allEmbeddedCharts,
  namedRanges,
  rowCount,
  colCount,
  colWidths,
  rowHeights,
  freezeRows,
  freezeCols,
  allColWidths,
  allRowHeights,
  allFreezeRows,
  allFreezeCols,
  setAllCells,
  setAllFormats,
  setAllMerges,
  setAllCondRules,
  setAllValidations,
  setAllComments,
  setAllEmbeddedCharts,
  setNamedRanges,
  setRowCount,
  setColCount,
  setColWidths,
  setRowHeights,
  setFreezeRows,
  setFreezeCols,
  setAllColWidths,
  setAllRowHeights,
  setAllFreezeRows,
  setAllFreezeCols,
  ready,
  queueSave,
}: UseSheetHistoryOpts<F>): UseSheetHistoryResult {
  const [history, setHistory] = useState<SheetSnapshot[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const isApplyingHistoryRef = useRef(false);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      return;
    }
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(() => {
      setHistory((h) => {
        const snap: SheetSnapshot = {
          allCells,
          allFormats,
          allMerges,
          allCondRules,
          allValidations,
          allComments,
          allEmbeddedCharts,
          namedRanges,
          rowCount,
          colCount,
          colWidths,
          rowHeights,
          freezeRows,
          freezeCols,
          allColWidths,
          allRowHeights,
          allFreezeRows,
          allFreezeCols,
        };

        if (historyIdx === -1) {
          setHistoryIdx(0);
          return [snap];
        }

        const last = h[historyIdx];
        if (
          last &&
          last.allCells === snap.allCells &&
          last.allFormats === snap.allFormats &&
          last.allMerges === snap.allMerges &&
          last.allCondRules === snap.allCondRules &&
          last.allValidations === snap.allValidations &&
          last.allComments === snap.allComments &&
          last.allEmbeddedCharts === snap.allEmbeddedCharts &&
          last.namedRanges === snap.namedRanges &&
          last.rowCount === snap.rowCount &&
          last.colCount === snap.colCount &&
          last.colWidths === snap.colWidths &&
          last.rowHeights === snap.rowHeights &&
          last.freezeRows === snap.freezeRows &&
          last.freezeCols === snap.freezeCols &&
          last.allColWidths === snap.allColWidths &&
          last.allRowHeights === snap.allRowHeights &&
          last.allFreezeRows === snap.allFreezeRows &&
          last.allFreezeCols === snap.allFreezeCols
        ) {
          return h;
        }

        const next = h.slice(0, historyIdx + 1);
        next.push(snap);
        if (next.length > 100) next.shift();
        setHistoryIdx(next.length - 1);
        return next;
      });
    }, 500);
    return () => {
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    };
  }, [
    ready,
    allCells,
    allFormats,
    allMerges,
    allCondRules,
    allValidations,
    allComments,
    allEmbeddedCharts,
    namedRanges,
    rowCount,
    colCount,
    colWidths,
    rowHeights,
    freezeRows,
    freezeCols,
    allColWidths,
    allRowHeights,
    allFreezeRows,
    allFreezeCols,
    historyIdx,
  ]);

  const canUndo = historyIdx > 0;
  const canRedo = historyIdx >= 0 && historyIdx < history.length - 1;

  const applySnapshot = useCallback((snap: SheetSnapshot) => {
    isApplyingHistoryRef.current = true;
    setAllCells(snap.allCells);
    setAllFormats(snap.allFormats as F);
    setAllMerges(snap.allMerges);
    if (snap.allCondRules && setAllCondRules) setAllCondRules(snap.allCondRules);
    if (snap.allValidations && setAllValidations) setAllValidations(snap.allValidations);
    if (snap.allComments && setAllComments) setAllComments(snap.allComments);
    if (snap.allEmbeddedCharts && setAllEmbeddedCharts) setAllEmbeddedCharts(snap.allEmbeddedCharts);
    if (snap.namedRanges && setNamedRanges) setNamedRanges(snap.namedRanges);
    setRowCount(snap.rowCount);
    setColCount(snap.colCount);
    if (snap.allColWidths && setAllColWidths) setAllColWidths(snap.allColWidths);
    else setColWidths(snap.colWidths);
    if (snap.allRowHeights && setAllRowHeights) setAllRowHeights(snap.allRowHeights);
    else setRowHeights(snap.rowHeights);
    if (snap.allFreezeRows && setAllFreezeRows) setAllFreezeRows(snap.allFreezeRows);
    else setFreezeRows(snap.freezeRows);
    if (snap.allFreezeCols && setAllFreezeCols) setAllFreezeCols(snap.allFreezeCols);
    else setFreezeCols(snap.freezeCols);
    const patch: Parameters<typeof queueSave>[0] = {
      allCells: snap.allCells,
      allFormats: snap.allFormats as F,
      allMerges: snap.allMerges,
      rowCount: snap.rowCount,
      colCount: snap.colCount,
      colWidths: snap.colWidths,
      rowHeights: snap.rowHeights,
      freezeRows: snap.freezeRows,
      freezeCols: snap.freezeCols,
      ...(snap.allCondRules ? { allCondRules: snap.allCondRules } : {}),
      ...(snap.allValidations ? { allValidations: snap.allValidations } : {}),
      ...(snap.allComments ? { allComments: snap.allComments } : {}),
      ...(snap.allEmbeddedCharts ? { allEmbeddedCharts: snap.allEmbeddedCharts } : {}),
      ...(snap.namedRanges ? { namedRanges: snap.namedRanges } : {}),
      ...(snap.allColWidths ? { allColWidths: snap.allColWidths } : {}),
      ...(snap.allRowHeights ? { allRowHeights: snap.allRowHeights } : {}),
      ...(snap.allFreezeRows ? { allFreezeRows: snap.allFreezeRows } : {}),
      ...(snap.allFreezeCols ? { allFreezeCols: snap.allFreezeCols } : {}),
    };
    queueSave(patch);
  }, [
    setAllCells,
    setAllFormats,
    setAllMerges,
    setAllCondRules,
    setAllValidations,
    setAllComments,
    setAllEmbeddedCharts,
    setNamedRanges,
    setRowCount,
    setColCount,
    setColWidths,
    setRowHeights,
    setFreezeRows,
    setFreezeCols,
    setAllColWidths,
    setAllRowHeights,
    setAllFreezeRows,
    setAllFreezeCols,
    queueSave,
  ]);

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
