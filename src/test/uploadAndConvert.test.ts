import { beforeEach, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { fetchNode } from '@/lib/cloudClient';
import { uploadAndConvert } from '@/lib/cloudCommon/uploadAndConvert';

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
      first.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];

      const second = wb.addWorksheet('Second');
      second.getCell('B2').value = 'tall';
      second.getColumn(2).width = 36;
      second.getRow(2).height = 45;
      second.views = [{ state: 'frozen', xSplit: 2, ySplit: 3 }];
    });

    const result = await uploadAndConvert(file, { ownerId: 'user_upload_test', parentFolderId: null });
    const node = await fetchNode(result.nodeId);
    const meta = node!.meta as Record<string, unknown>;
    const sheets = meta.sheets as Array<{ id: string; name: string }>;
    const [first, second] = sheets;

    expect(result.fileType).toBe('sheet');
    expect(sheets.map((sheet) => sheet.name)).toEqual(['First', 'Second']);
    expect((meta.allColWidths as Record<string, Record<string, number>>)[first.id]['0']).toBeGreaterThan(150);
    expect((meta.allRowHeights as Record<string, Record<string, number>>)[first.id]['0']).toBeGreaterThan(30);
    expect((meta.allFreezeRows as Record<string, number>)[first.id]).toBe(1);
    expect((meta.allFreezeCols as Record<string, number>)[first.id]).toBe(1);
    expect((meta.allColWidths as Record<string, Record<string, number>>)[second.id]['1']).toBeGreaterThan(240);
    expect((meta.allRowHeights as Record<string, Record<string, number>>)[second.id]['1']).toBeGreaterThan(50);
    expect((meta.allFreezeRows as Record<string, number>)[second.id]).toBe(3);
    expect((meta.allFreezeCols as Record<string, number>)[second.id]).toBe(2);
  });
});
