import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SheetGrid } from '@/lib/cloudSheet/SheetGrid';
import { buildMergeMaps, computeSelBounds } from '@/lib/cloudSheet/selBounds';

const noop = vi.fn();

function renderGrid() {
  const merges: never[] = [];
  const { mergeAtMap, coveredSet } = buildMergeMaps(merges);
  return render(
    <SheetGrid
      cells={{
        A1: 'visible-a1',
        B1: 'hidden-col-b1',
        A2: 'hidden-row-a2',
        C3: 'visible-c3',
      }}
      displayValues={{}}
      cellFormats={{}}
      selected={{ row: 0, col: 0 }}
      selBounds={computeSelBounds({ row: 0, col: 0 }, null)}
      hasRange={false}
      mergeAtMap={mergeAtMap}
      coveredSet={coveredSet}
      rowCount={3}
      colCount={3}
      colWidths={{}}
      rowHeights={{}}
      hiddenCols={{ 1: true }}
      hiddenRows={{ 1: true }}
      onColResize={noop}
      onRowResize={noop}
      editing={null}
      editingValue=""
      onPointerDown={noop}
      onPointerEnter={noop}
      onStartEdit={noop}
      onChangeValue={noop}
      onCommitEdit={noop}
      onCancelEdit={noop}
    />,
  );
}

describe('SheetGrid hidden rows and columns', () => {
  it('does not render hidden row/column headers or cells', () => {
    renderGrid();

    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.queryByText('B')).toBeNull();
    expect(screen.getByText('C')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.queryByText('2')).toBeNull();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('visible-a1')).toBeTruthy();
    expect(screen.getByText('visible-c3')).toBeTruthy();
    expect(screen.queryByText('hidden-col-b1')).toBeNull();
    expect(screen.queryByText('hidden-row-a2')).toBeNull();
  });
});
