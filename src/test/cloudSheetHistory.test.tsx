import { useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSheetHistory } from '@/lib/cloudSheet/useSheetHistory';
import type { AllCells, AllMerges } from '@/lib/cloudSheet/cellTypes';

type AllFormats = Record<string, Record<string, unknown>>;
type SavePatch = Parameters<typeof useSheetHistory<AllFormats>>[0] extends { queueSave: (patch: infer P) => void }
  ? P
  : never;

function useHistoryHarness(saves: SavePatch[]) {
  const [allCells, setAllCells] = useState<AllCells>({ sheet1: { A1: 'one' } });
  const [allFormats, setAllFormats] = useState<AllFormats>({ sheet1: {} });
  const [allMerges, setAllMerges] = useState<AllMerges>({ sheet1: [] });
  const [allValidations, setAllValidations] = useState<Record<string, unknown[]>>({ sheet1: [] });
  const [allComments, setAllComments] = useState<Record<string, Record<string, string>>>({ sheet1: {} });
  const [namedRanges, setNamedRanges] = useState<Record<string, string>>({});
  const [rowCount, setRowCount] = useState(20);
  const [colCount, setColCount] = useState(10);
  const [allColWidths, setAllColWidths] = useState<Record<string, Record<number, number>>>({ sheet1: {} });
  const [allRowHeights, setAllRowHeights] = useState<Record<string, Record<number, number>>>({ sheet1: {} });
  const [allFreezeRows, setAllFreezeRows] = useState<Record<string, number>>({ sheet1: 0 });
  const [allFreezeCols, setAllFreezeCols] = useState<Record<string, number>>({ sheet1: 0 });
  const colWidths = allColWidths.sheet1 ?? {};
  const rowHeights = allRowHeights.sheet1 ?? {};
  const freezeRows = allFreezeRows.sheet1 ?? 0;
  const freezeCols = allFreezeCols.sheet1 ?? 0;

  const history = useSheetHistory({
    allCells,
    allFormats,
    allMerges,
    allValidations,
    allComments,
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
    setAllValidations,
    setAllComments,
    setNamedRanges,
    setRowCount,
    setColCount,
    setColWidths: (w) => setAllColWidths((prev) => ({ ...prev, sheet1: w })),
    setRowHeights: (h) => setAllRowHeights((prev) => ({ ...prev, sheet1: h })),
    setFreezeRows: (n) => setAllFreezeRows((prev) => ({ ...prev, sheet1: n })),
    setFreezeCols: (n) => setAllFreezeCols((prev) => ({ ...prev, sheet1: n })),
    setAllColWidths,
    setAllRowHeights,
    setAllFreezeRows,
    setAllFreezeCols,
    ready: true,
    queueSave: (patch) => saves.push(patch),
  });

  return {
    history,
    allValidations,
    allComments,
    namedRanges,
    allColWidths,
    allRowHeights,
    allFreezeRows,
    allFreezeCols,
    setAllValidations,
    setAllComments,
    setNamedRanges,
    setAllColWidths,
    setAllRowHeights,
    setAllFreezeRows,
    setAllFreezeCols,
  };
}

describe('cloud sheet history', () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('undoes and redoes column widths, row heights, and freeze panes', () => {
    vi.useFakeTimers();
    const saves: SavePatch[] = [];
    const { result } = renderHook(() => useHistoryHarness(saves));

    act(() => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.setAllColWidths({ sheet1: { 0: 180 } });
      result.current.setAllRowHeights({ sheet1: { 1: 42 } });
      result.current.setAllFreezeRows({ sheet1: 1 });
      result.current.setAllFreezeCols({ sheet1: 2 });
      result.current.setAllValidations({ sheet1: [{ id: 'status', kind: 'list' }] });
      result.current.setAllComments({ sheet1: { A1: 'review' } });
      result.current.setNamedRanges({ Total: 'Sheet1!A1:A2' });
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.history.canUndo).toBe(true);

    act(() => {
      result.current.history.undo();
    });
    expect(result.current.allColWidths).toEqual({ sheet1: {} });
    expect(result.current.allRowHeights).toEqual({ sheet1: {} });
    expect(result.current.allFreezeRows).toEqual({ sheet1: 0 });
    expect(result.current.allFreezeCols).toEqual({ sheet1: 0 });
    expect(result.current.allValidations).toEqual({ sheet1: [] });
    expect(result.current.allComments).toEqual({ sheet1: {} });
    expect(result.current.namedRanges).toEqual({});
    expect(saves.at(-1)).toMatchObject({
      allColWidths: { sheet1: {} },
      allRowHeights: { sheet1: {} },
      allFreezeRows: { sheet1: 0 },
      allFreezeCols: { sheet1: 0 },
      allValidations: { sheet1: [] },
      allComments: { sheet1: {} },
      namedRanges: {},
    });

    act(() => {
      result.current.history.redo();
    });
    expect(result.current.allColWidths).toEqual({ sheet1: { 0: 180 } });
    expect(result.current.allRowHeights).toEqual({ sheet1: { 1: 42 } });
    expect(result.current.allFreezeRows).toEqual({ sheet1: 1 });
    expect(result.current.allFreezeCols).toEqual({ sheet1: 2 });
    expect(result.current.allValidations).toEqual({ sheet1: [{ id: 'status', kind: 'list' }] });
    expect(result.current.allComments).toEqual({ sheet1: { A1: 'review' } });
    expect(result.current.namedRanges).toEqual({ Total: 'Sheet1!A1:A2' });
    expect(saves.at(-1)).toMatchObject({
      allColWidths: { sheet1: { 0: 180 } },
      allRowHeights: { sheet1: { 1: 42 } },
      allFreezeRows: { sheet1: 1 },
      allFreezeCols: { sheet1: 2 },
      allValidations: { sheet1: [{ id: 'status', kind: 'list' }] },
      allComments: { sheet1: { A1: 'review' } },
      namedRanges: { Total: 'Sheet1!A1:A2' },
    });
  });
});
