import { beforeEach, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { fetchNode } from '@/lib/cloudClient';
import { uploadAndConvert } from '@/lib/cloudCommon/uploadAndConvert';
import { exportXlsxBuffer } from '@/lib/cloudSheet/xlsx';

async function workbookFile(name: string, setup: (wb: ExcelJS.Workbook) => void): Promise<File> {
  const wb = new ExcelJS.Workbook();
  setup(wb);
  const buf = await wb.xlsx.writeBuffer();
  const u8 = new Uint8Array(buf as ArrayBufferLike);
  return new File(
    [u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)],
    name,
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  );
}

describe('uploadAndConvert — sheet metadata', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('preserves per-sheet layout metadata when converting xlsx uploads', async () => {
    const file = await workbookFile('layout.xlsx', (wb) => {
      const first = wb.addWorksheet('First');
      first.getCell('A1').value = 'wide';
      first.getColumn(1).width = 24;
      first.getRow(1).height = 30;
      first.views = [{
        state: 'frozen',
        xSplit: 1,
        ySplit: 1,
        showGridLines: false,
        zoomScale: 125,
      } as ExcelJS.WorksheetView];
      first.properties.tabColor = { argb: 'FF3366CC' };
      first.pageSetup = {
        orientation: 'landscape',
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printArea: 'A1:C12',
        margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      };
      first.headerFooter = {
        oddHeader: '&CUpload Report',
        oddFooter: '&RPage &P',
      };
      first.getColumn(3).hidden = true;
      first.getRow(3).outlineLevel = 1;
      first.getColumn(2).outlineLevel = 1;
      first.properties.outlineProperties = { summaryBelow: false, summaryRight: false };
      first.getCell('C2').protection = { locked: false };
      (first as unknown as { sheetProtection?: unknown }).sheetProtection = {
        sheet: true,
        selectUnlockedCells: false,
        formatCells: true,
        algorithmName: 'SHA-512',
        hashValue: 'hash',
        saltValue: 'salt',
        spinCount: 100000,
      };
      first.addConditionalFormatting({
        ref: 'B2:B10',
        rules: [{
          type: 'cellIs',
          operator: 'greaterThan',
          formulae: ['10'],
          priority: 1,
          style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } } },
        }],
      });
      first.autoFilter = 'A1:C12';
      first.addTable({
        name: 'UploadScores',
        ref: 'A1',
        headerRow: true,
        totalsRow: false,
        style: { theme: 'TableStyleMedium2', showRowStripes: true },
        columns: [{ name: 'Name', filterButton: true }, { name: 'Score', filterButton: true }],
        rows: [['Ada', 10], ['Lin', 20]],
      });

      const second = wb.addWorksheet('Second');
      second.state = 'veryHidden';
      second.getCell('B2').value = 'tall';
      second.getColumn(2).width = 36;
      second.getRow(2).height = 45;
      second.getRow(4).hidden = true;
      second.getRow(4).height = 15;
      second.views = [{ state: 'frozen', xSplit: 2, ySplit: 3 }];
    });

    const result = await uploadAndConvert(file, { ownerId: 'user_upload_test', parentFolderId: null });
    const node = await fetchNode(result.nodeId);
    const meta = node!.meta as Record<string, unknown>;
    const sheets = meta.sheets as Array<{ id: string; name: string; tabColor?: string; visibility?: string }>;
    const [first, second] = sheets;

    expect(result.fileType).toBe('sheet');
    expect(sheets.map((sheet) => sheet.name)).toEqual(['First', 'Second']);
    expect((meta.allColWidths as Record<string, Record<string, number>>)[first.id]['0']).toBeGreaterThan(150);
    expect((meta.allRowHeights as Record<string, Record<string, number>>)[first.id]['0']).toBeGreaterThan(30);
    expect((meta.allFreezeRows as Record<string, number>)[first.id]).toBe(1);
    expect((meta.allFreezeCols as Record<string, number>)[first.id]).toBe(1);
    expect((meta.allSheetViews as Record<string, Record<string, unknown>>)[first.id]).toMatchObject({
      showGridLines: false,
      zoomScale: 125,
    });
    expect((meta.allSheetPageSetups as Record<string, Record<string, unknown>>)[first.id]).toMatchObject({
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printArea: 'A1:C12',
      margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5 },
    });
    expect((meta.allSheetHeaderFooters as Record<string, Record<string, unknown>>)[first.id]).toMatchObject({
      oddHeader: '&CUpload Report',
      oddFooter: '&RPage &P',
    });
    expect((meta.allSheetOutlines as Record<string, Record<string, unknown>>)[first.id]).toMatchObject({
      rowLevels: { 2: 1 },
      colLevels: { 1: 1 },
      summaryBelow: false,
      summaryRight: false,
    });
    expect(first.tabColor).toBe('#3366CC');
    expect((meta.allHiddenCols as Record<string, Record<string, boolean>>)[first.id]['2']).toBe(true);
    expect((meta.allSheetProtections as Record<string, Record<string, unknown>>)[first.id]).toMatchObject({
      sheet: true,
      selectUnlockedCells: false,
      formatCells: true,
      algorithmName: 'SHA-512',
      hashValue: 'hash',
      saltValue: 'salt',
      spinCount: 100000,
    });
    expect((meta.allFormats as Record<string, Record<string, { protection?: { locked?: boolean } }>>)[first.id].C2.protection).toMatchObject({
      locked: false,
    });
    expect((meta.allCondRules as Record<string, Array<{ op: string; value: string }>>)[first.id][0]).toMatchObject({
      op: '>',
      value: '10',
    });
    expect((meta.allAutoFilterRefs as Record<string, string | undefined>)[first.id]).toBe('A1:C12');
    expect((meta.allTables as Record<string, Array<{ name: string; ref: string }>>)[first.id][0]).toMatchObject({
      name: 'UploadScores',
      ref: 'A1:B3',
    });
    expect((meta.allColWidths as Record<string, Record<string, number>>)[second.id]['1']).toBeGreaterThan(240);
    expect((meta.allRowHeights as Record<string, Record<string, number>>)[second.id]['1']).toBeGreaterThan(50);
    expect((meta.allFreezeRows as Record<string, number>)[second.id]).toBe(3);
    expect((meta.allFreezeCols as Record<string, number>)[second.id]).toBe(2);
    expect(second.visibility).toBe('veryHidden');
    expect((meta.allHiddenRows as Record<string, Record<string, boolean>>)[second.id]['3']).toBe(true);
  });

  it('preserves app embedded chart metadata from xlsx uploads', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Charts',
      cells: { A1: 'Name', B1: 'Score', A2: 'Ada', B2: '10', A3: 'Lin', B3: '20' },
      embeddedCharts: [{
        id: 'chart_upload',
        type: 'bar',
        orientation: 'columns',
        range: { minR: 0, maxR: 2, minC: 0, maxC: 1 },
        title: 'Scores',
        palette: 'cool',
        collapsed: true,
      }],
    }]);
    const file = new File([exported], 'charts.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const result = await uploadAndConvert(file, { ownerId: 'user_upload_test', parentFolderId: null });
    const node = await fetchNode(result.nodeId);
    const meta = node!.meta as Record<string, unknown>;
    const [sheet] = meta.sheets as Array<{ id: string; name: string }>;

    expect(sheet.name).toBe('Charts');
    expect((meta.allEmbeddedCharts as Record<string, unknown[]>)[sheet.id][0]).toMatchObject({
      id: 'chart_upload',
      type: 'bar',
      orientation: 'columns',
      title: 'Scores',
      palette: 'cool',
      collapsed: true,
    });
  });

  it('preserves worksheet auto filter criteria from xlsx uploads', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Filtered',
      cells: {
        A1: 'Name',
        B1: 'Score',
        A2: 'Ada',
        B2: '10',
        A3: 'Lin',
        B3: '20',
      },
      autoFilterRef: 'A1:B3',
      autoFilterColumns: [
        { values: ['Ada'] },
        { customFilters: [{ operator: 'greaterThan', val: '10' }] },
      ],
      sortState: {
        ref: 'A2:B3',
        conditions: [{ ref: 'B2:B3', descending: true }],
      },
    }]);
    const file = new File([exported], 'filtered.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const result = await uploadAndConvert(file, { ownerId: 'user_upload_test', parentFolderId: null });
    const node = await fetchNode(result.nodeId);
    const meta = node!.meta as Record<string, unknown>;
    const [sheet] = meta.sheets as Array<{ id: string; name: string }>;

    expect((meta.allAutoFilterRefs as Record<string, string | undefined>)[sheet.id]).toBe('A1:B3');
    const columns = (meta.allAutoFilterColumns as Record<string, Array<{ values?: string[]; customFilters?: Array<{ val: string; operator?: string }> }>>)[sheet.id];
    expect(columns[0].values).toEqual(['Ada']);
    expect(columns[1].customFilters).toEqual([{ val: '10', operator: 'greaterThan' }]);
    expect((meta.allSortStates as Record<string, unknown>)[sheet.id]).toEqual({
      ref: 'A2:B3',
      conditions: [{ ref: 'B2:B3', descending: true }],
    });
  });
});
