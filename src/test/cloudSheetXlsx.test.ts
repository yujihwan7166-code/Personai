/**
 * 시트 import/export round-trip — PR #2/5 (Import 정확도).
 *
 * ExcelJS 로 .xlsx 를 메모리에 만들어 export → import → 데이터·서식·크기·freeze
 * 보존 검증. 실제 파일 fixture 없이 in-memory 만으로 충분 (모든 코드 경로 통과).
 */
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { exportXlsxBuffer, importCsvText, importXlsxBuffer, importXlsxFile } from '@/lib/cloudSheet/xlsx';
import { excelNumFmtToToken, tokenToExcelNumFmt } from '@/lib/cloudSheet/numFmtMap';

/** 작은 워크북을 만들어 ArrayBuffer 반환 (jsdom File.arrayBuffer 미지원 우회). */
async function buildWorkbookBuffer(setup: (ws: ExcelJS.Worksheet) => void, sheetName = 'Sheet1'): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  setup(ws);
  // exceljs writeBuffer 는 ExcelJS.Buffer (Node Buffer 호환) — ArrayBuffer 로 변환
  const buf = await wb.xlsx.writeBuffer();
  const u8 = new Uint8Array(buf as ArrayBufferLike);
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}

describe('xlsx import — 기본 값/수식/병합 (회귀)', () => {
  it('값과 수식을 셀에 저장', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 10;
      ws.getCell('A2').value = 20;
      // ExcelJS formula 는 result 캐시 있어야 SheetJS 가 안정적으로 읽음.
      ws.getCell('A3').value = { formula: 'SUM(A1:A2)', result: 30 };
    });
    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.cells.A1).toBe('10');
    expect(sheet.cells.A2).toBe('20');
    expect(sheet.cells.A3).toMatch(/^=SUM/);
  });

  it('AVERAGE → AVG 자동 변환', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('B1').value = { formula: 'AVERAGE(A1:A3)', result: 0 };
    });
    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.cells.B1).toBe('=AVG(A1:A3)');
  });

  it('셀 병합 보존', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = '머리';
      ws.mergeCells('A1:C1');
    });
    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.merges).toHaveLength(1);
    expect(sheet.merges![0]).toEqual({ minR: 0, maxR: 0, minC: 0, maxC: 2 });
  });
});

describe('csv import — text-safe sheet conversion', () => {
  it('preserves text-like numbers, formulas, BOM, and quoted newlines', () => {
    const sheet = importCsvText('\uFEFFid,note,formula\n00123,"line1\nline2","=SUM(1,2)"', 'upload');
    expect(sheet.name).toBe('upload');
    expect(sheet.cells.A1).toBe('id');
    expect(sheet.cells.A2).toBe('00123');
    expect(sheet.cells.B2).toBe('line1\nline2');
    expect(sheet.cells.C2).toBe('=SUM(1,2)');
    expect(sheet.merges).toEqual([]);
  });

  it('supports TSV files through the same text-safe importer', () => {
    const sheet = importCsvText('id\tnote\n0007\tplain', 'upload', '\t');
    expect(sheet.cells.A2).toBe('0007');
    expect(sheet.cells.B2).toBe('plain');
  });

  it('imports TSV files through the file upload importer', async () => {
    const [sheet] = await importXlsxFile(new File(['id\tnote\n0007\t=SUM(1,2)'], 'upload.tsv'));
    expect(sheet.name).toBe('upload');
    expect(sheet.cells.A2).toBe('0007');
    expect(sheet.cells.B2).toBe('=SUM(1,2)');
  });
});

describe('xlsx import — hyperlinks', () => {
  it('preserves safe Excel hyperlinks as HYPERLINK formulas', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = {
        text: 'Docs "Q"',
        hyperlink: 'https://example.com/docs?q=1',
      };
    });

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.cells.A1).toBe('=HYPERLINK("https://example.com/docs?q=1","Docs ""Q""")');
  });

  it('does not turn unsafe Excel hyperlinks into formulas', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = {
        text: 'Unsafe',
        hyperlink: 'javascript:alert(1)',
      };
    });

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.cells.A1).toBe('Unsafe');
  });
});

describe('xlsx import — 서식 보존 (신규)', () => {
  it('굵게/기울임/색 추출', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      const c = ws.getCell('A1');
      c.value = '제목';
      c.font = { bold: true, italic: true, color: { argb: 'FF223344' } };
    });
    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.cellFormats?.A1?.bold).toBe(true);
    expect(sheet.cellFormats?.A1?.italic).toBe(true);
    expect(sheet.cellFormats?.A1?.textColor).toBe('#223344');
  });

  it('배경색 추출', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      const c = ws.getCell('B2');
      c.value = '배경';
      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFAABBCC' },
      };
    });
    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.cellFormats?.B2?.bgColor).toBe('#AABBCC');
  });

  it('정렬 추출', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 'L';
      ws.getCell('A1').alignment = { horizontal: 'left' };
      ws.getCell('B1').value = 'C';
      ws.getCell('B1').alignment = { horizontal: 'center' };
      ws.getCell('C1').value = 'R';
      ws.getCell('C1').alignment = { horizontal: 'right' };
    });
    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.cellFormats?.A1?.align).toBe('left');
    expect(sheet.cellFormats?.B1?.align).toBe('center');
    expect(sheet.cellFormats?.C1?.align).toBe('right');
  });

  it('숫자 형식 (numFmt) → 우리 토큰 매핑', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 1234;
      ws.getCell('A1').numFmt = '#,##0';
      ws.getCell('A2').value = 0.5;
      ws.getCell('A2').numFmt = '0.0%';
      ws.getCell('A3').value = new Date(2026, 4, 11);
      ws.getCell('A3').numFmt = 'yyyy-mm-dd';
    });
    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.cellFormats?.A1?.numberFmt).toBe('integer');
    expect(sheet.cellFormats?.A2?.numberFmt).toBe('percent');
    expect(sheet.cellFormats?.A3?.numberFmt).toBe('date');
  });

  it('preserves formulas even when their cached result has a date format', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = {
        formula: 'DATE(2026,5,11)',
        result: new Date(Date.UTC(2026, 4, 11, 12, 0, 0)),
      };
      ws.getCell('A1').numFmt = 'yyyy-mm-dd';
    });

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.cells.A1).toBe('=DATE(2026,5,11)');
    expect(sheet.cellFormats?.A1?.numberFmt).toBe('date');
  });

  it('밑줄 / 취소선 추출', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 'u';
      ws.getCell('A1').font = { underline: true };
      ws.getCell('B1').value = 's';
      ws.getCell('B1').font = { strike: true };
      ws.getCell('C1').value = 'b+u';
      ws.getCell('C1').font = { bold: true, underline: true, strike: true };
    });
    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.cellFormats?.A1?.underline).toBe(true);
    expect(sheet.cellFormats?.B1?.strikethrough).toBe(true);
    expect(sheet.cellFormats?.C1?.bold).toBe(true);
    expect(sheet.cellFormats?.C1?.underline).toBe(true);
    expect(sheet.cellFormats?.C1?.strikethrough).toBe(true);
  });

  it('폰트 이름 / 크기 추출', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 'big';
      ws.getCell('A1').font = { name: 'Arial', size: 24 };
      ws.getCell('B1').value = 'mono';
      ws.getCell('B1').font = { name: 'Consolas', size: 12 };
      ws.getCell('C1').value = 'unknown';
      ws.getCell('C1').font = { name: 'NonExistentFont', size: 11 };
    });
    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.cellFormats?.A1?.fontFamily).toBe('arial');
    expect(sheet.cellFormats?.A1?.fontSize).toBe(24);
    expect(sheet.cellFormats?.B1?.fontFamily).toBe('jetbrains'); // Consolas → 코드 폰트 매핑
    expect(sheet.cellFormats?.B1?.fontSize).toBe(12);
    // 알 수 없는 폰트 → fontFamily 미설정 (size 만)
    expect(sheet.cellFormats?.C1?.fontFamily).toBeUndefined();
    expect(sheet.cellFormats?.C1?.fontSize).toBe(11);
  });

  it('세로 정렬 + 줄바꿈 추출', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 'top';
      ws.getCell('A1').alignment = { vertical: 'top' };
      ws.getCell('B1').value = 'mid';
      ws.getCell('B1').alignment = { vertical: 'middle' };
      ws.getCell('C1').value = 'bot';
      ws.getCell('C1').alignment = { vertical: 'bottom' };
      ws.getCell('D1').value = 'wrap me please';
      ws.getCell('D1').alignment = { wrapText: true };
    });
    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.cellFormats?.A1?.vAlign).toBe('top');
    expect(sheet.cellFormats?.B1?.vAlign).toBe('middle');
    expect(sheet.cellFormats?.C1?.vAlign).toBe('bottom');
    expect(sheet.cellFormats?.D1?.wrap).toBe('wrap');
  });
});

describe('xlsx import — 열너비 / 행높이 / freeze (신규)', () => {
  it('열 너비 (character → px 추정)', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.columns = [
        { width: 20 }, // ≈ 145px
        { width: 10 }, // ≈ 75px
      ];
      ws.getCell('A1').value = 'X'; // 열을 시트에 등장시킴
    });
    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.colWidths?.[0]).toBeGreaterThan(100);
    expect(sheet.colWidths?.[1]).toBeGreaterThan(50);
  });

  it('행 높이 (pt → px 추정)', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getRow(1).height = 30;
      ws.getCell('A1').value = '키큰 행';
    });
    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.rowHeights?.[0]).toBeGreaterThan(30);
  });

  it('freeze pane', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = '머리';
      ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
    });
    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.freezeRows).toBe(1);
    expect(sheet.freezeCols).toBe(2);
  });
});

describe('xlsx export/import round-trip — layout metadata', () => {
  it('preserves widths, heights, freeze panes, merges, formats, and formulas', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: {
        A1: 'Header',
        A2: '10',
        A3: '=SUM(A2:A2)',
      },
      cellFormats: {
        A1: { bold: true, bgColor: '#AABBCC', align: 'center' },
      },
      merges: [{ minR: 0, maxR: 0, minC: 0, maxC: 1 }],
      colWidths: { 0: 145, 1: 75 },
      rowHeights: { 0: 40 },
      freezeRows: 1,
      freezeCols: 1,
    }]);

    const [sheet] = await importXlsxBuffer(exported);
    expect(sheet.cells.A1).toBe('Header');
    expect(sheet.cells.A3).toBe('=SUM(A2:A2)');
    expect(sheet.cellFormats?.A1?.bold).toBe(true);
    expect(sheet.cellFormats?.A1?.bgColor).toBe('#AABBCC');
    expect(sheet.merges?.[0]).toEqual({ minR: 0, maxR: 0, minC: 0, maxC: 1 });
    expect(sheet.colWidths?.[0]).toBeGreaterThan(100);
    expect(sheet.rowHeights?.[0]).toBeGreaterThan(30);
    expect(sheet.freezeRows).toBe(1);
    expect(sheet.freezeCols).toBe(1);
  });

  it('sanitizes invalid and duplicate sheet names on export', async () => {
    const exported = await exportXlsxBuffer([
      { name: 'Revenue:Q1/2026', cells: { A1: 'first' } },
      { name: 'Revenue?Q1*2026', cells: { A1: 'second' } },
      { name: 'Very very very very very long sheet name that exceeds Excel limit', cells: { A1: 'third' } },
      { name: 'Very very very very very long sheet name that exceeds Excel limit', cells: { A1: 'fourth' } },
    ]);

    const imported = await importXlsxBuffer(exported);
    expect(imported.map((sheet) => sheet.name)).toEqual([
      'Revenue_Q1_2026',
      'Revenue_Q1_2026 (2)',
      'Very very very very very long s',
      'Very very very very very lo (2)',
    ]);
    expect(imported.map((sheet) => sheet.cells.A1)).toEqual(['first', 'second', 'third', 'fourth']);
  });

  it('writes formula cached results with spreadsheet-friendly value types', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: {
        A1: '10',
        A2: '20',
        A3: '=SUM(A1:A2)',
        A4: '=A3=30',
        A5: '=A3*10%',
      },
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Sheet1')!;
    expect((ws.getCell('A3').value as ExcelJS.CellFormulaValue).result).toBe(30);
    expect((ws.getCell('A4').value as ExcelJS.CellFormulaValue).result).toBe(true);
    expect((ws.getCell('A5').value as ExcelJS.CellFormulaValue).result).toBe(3);
  });

  it('writes cached results for common Excel conditional aggregation formulas', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: {
        A1: 'West', B1: 'Open', C1: '10',
        A2: 'West', B2: 'Closed', C2: '20',
        A3: 'East', B3: 'Open', C3: '30',
        A4: 'West', B4: 'Open', C4: '50',
        D1: '=AVERAGEIFS(C1:C4,A1:A4,"West",B1:B4,"Open")',
        D2: '=MINIFS(C1:C4,A1:A4,"West",B1:B4,"Open")',
        D3: '=MAXIFS(C1:C4,A1:A4,"West",B1:B4,"Open")',
        D4: '=VALUE("1,234.5")',
        D5: '=DAYS("2026-05-11","2026-05-01")',
        D6: '=DATEVALUE("2026-05-11")',
      },
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Sheet1')!;
    expect((ws.getCell('D1').value as ExcelJS.CellFormulaValue).result).toBe(30);
    expect((ws.getCell('D2').value as ExcelJS.CellFormulaValue).result).toBe(10);
    expect((ws.getCell('D3').value as ExcelJS.CellFormulaValue).result).toBe(50);
    expect((ws.getCell('D4').value as ExcelJS.CellFormulaValue).result).toBe(1234.5);
    expect((ws.getCell('D5').value as ExcelJS.CellFormulaValue).result).toBe(10);
    expect((ws.getCell('D6').value as ExcelJS.CellFormulaValue).result).toBe(46153);
  });

  it('exports formula cached results without leaking internal renderer sentinels', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: {
        A1: '10',
        A2: '20',
        A3: '=HYPERLINK("https://example.com", "Open")',
        A4: '=SPARKLINE(A1:A2)',
        A5: '=SEQUENCE(2)',
      },
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Sheet1')!;
    expect((ws.getCell('A3').value as ExcelJS.CellFormulaValue).result).toBe('Open');
    expect((ws.getCell('A4').value as ExcelJS.CellFormulaValue).result).toBe('Sparkline');
    expect((ws.getCell('A5').value as ExcelJS.CellFormulaValue).result).toBe(1);
    for (const ref of ['A3', 'A4', 'A5']) {
      expect(String((ws.getCell(ref).value as ExcelJS.CellFormulaValue).result)).not.toContain('__CLOUDSHEET_');
    }
  });

  it('does not export unsafe literal HYPERLINK formulas', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: {
        A1: '=HYPERLINK("file:///C:/secret.txt","Open")',
        A2: '=HYPERLINK("ftp://example.com/file","Download")',
      },
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Sheet1')!;
    expect(ws.getCell('A1').value).toBe('#REF!');
    expect(ws.getCell('A2').value).toBe('#REF!');
  });

  it('does not export unsafe HYPERLINK formulas built from cell references', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: {
        A1: 'file:///C:/secret.txt',
        A2: '=HYPERLINK(A1,"Open")',
      },
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Sheet1')!;
    expect(ws.getCell('A2').value).toBe('#REF!');
  });

  it('does not export unsafe IMAGE formulas', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: {
        A1: '=IMAGE("file:///C:/secret.png")',
        A2: '=IMAGE("data:image/svg+xml,<svg/>")',
        A3: 'ftp://example.com/a.png',
        A4: '=IMAGE(A3)',
      },
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Sheet1')!;
    expect(ws.getCell('A1').value).toBe('#REF!');
    expect(ws.getCell('A2').value).toBe('#REF!');
    expect(ws.getCell('A4').value).toBe('#REF!');
  });

  it('uses all exported sheets when caching cross-sheet formula results', async () => {
    const exported = await exportXlsxBuffer([
      { name: 'Data', cells: { A1: '41' } },
      { name: 'Summary', cells: { A1: '=Data!A1+1' } },
    ]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const summary = wb.getWorksheet('Summary')!;
    expect((summary.getCell('A1').value as ExcelJS.CellFormulaValue).result).toBe(42);
  });

  it('caches formulas that reference sheet names containing apostrophes', async () => {
    const exported = await exportXlsxBuffer([
      { name: "Bob's Data", cells: { A1: '41' } },
      { name: 'Summary', cells: { A1: "='Bob''s Data'!A1+1" } },
    ]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const summary = wb.getWorksheet('Summary')!;
    const value = summary.getCell('A1').value as ExcelJS.CellFormulaValue;
    expect(value.formula).toBe("'Bob''s Data'!A1+1");
    expect(value.result).toBe(42);
  });

  it('imports workbook named ranges for formula evaluation', async () => {
    const wb = new ExcelJS.Workbook();
    const data = wb.addWorksheet('Data Set');
    data.getCell('A1').value = 10;
    data.getCell('A2').value = 20;
    wb.addWorksheet('Summary').getCell('A1').value = { formula: 'SUM(Sales)', result: 30 };
    wb.definedNames.add("'Data Set'!$A$1:$A$2", 'Sales');
    const buf = await wb.xlsx.writeBuffer();
    const u8 = new Uint8Array(buf as ArrayBufferLike);

    const imported = await importXlsxBuffer(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
    expect(imported[0].namedRanges?.Sales).toBe("'Data Set'!A1:A2");
  });

  it('exports workbook named ranges and uses them for cached formula results', async () => {
    const exported = await exportXlsxBuffer([
      { name: 'Data Set', cells: { A1: '10', A2: '20' } },
      { name: 'Summary', cells: { A1: '=SUM(Sales)' } },
    ], {
      namedRanges: { Sales: "'Data Set'!A1:A2" },
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ranges = wb.definedNames.getRanges('Sales').ranges;
    const summary = wb.getWorksheet('Summary')!;
    expect(ranges).toEqual(["'Data Set'!$A$1:$A$2"]);
    expect((summary.getCell('A1').value as ExcelJS.CellFormulaValue).formula).toBe('SUM(Sales)');
    expect((summary.getCell('A1').value as ExcelJS.CellFormulaValue).result).toBe(30);
  });

  it('imports inline list and checkbox data validations', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 'Open';
      ws.getCell('A1').dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Open,Closed"'],
      };
      ws.getCell('B1').value = true;
      ws.getCell('B1').dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"TRUE,FALSE"'],
      };
    });

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.validations).toEqual([
      {
        id: 'xlsx_vd_0',
        range: { minR: 0, maxR: 0, minC: 0, maxC: 0 },
        kind: 'list',
        items: ['Open', 'Closed'],
      },
      {
        id: 'xlsx_vd_1',
        range: { minR: 0, maxR: 0, minC: 1, maxC: 1 },
        kind: 'checkbox',
        items: ['TRUE', 'FALSE'],
      },
    ]);
  });

  it('imports range-backed list data validations by resolving source cells', async () => {
    const wb = new ExcelJS.Workbook();
    const source = wb.addWorksheet('Lists');
    source.getCell('A1').value = 'Open';
    source.getCell('A2').value = 'Closed';
    source.getCell('A3').value = 'On Hold';
    const entry = wb.addWorksheet('Entry');
    entry.getCell('B2').value = 'Open';
    entry.getCell('B2').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ["'Lists'!$A$1:$A$3"],
    };
    const buf = await wb.xlsx.writeBuffer();
    const u8 = new Uint8Array(buf as ArrayBufferLike);

    const imported = await importXlsxBuffer(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
    const entrySheet = imported.find((sheet) => sheet.name === 'Entry')!;
    expect(entrySheet.validations).toEqual([
      {
        id: 'xlsx_vd_0',
        range: { minR: 1, maxR: 1, minC: 1, maxC: 1 },
        kind: 'list',
        items: ['Open', 'Closed', 'On Hold'],
      },
    ]);
  });

  it('imports named-range list data validations by resolving the defined range', async () => {
    const wb = new ExcelJS.Workbook();
    const source = wb.addWorksheet('Lists');
    source.getCell('C1').value = 'Low';
    source.getCell('C2').value = 'Medium';
    source.getCell('C3').value = 'High';
    wb.definedNames.add("'Lists'!$C$1:$C$3", 'PriorityList');
    const entry = wb.addWorksheet('Entry');
    entry.getCell('A1').value = 'Medium';
    entry.getCell('A1').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['PriorityList'],
    };
    const buf = await wb.xlsx.writeBuffer();
    const u8 = new Uint8Array(buf as ArrayBufferLike);

    const imported = await importXlsxBuffer(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
    const entrySheet = imported.find((sheet) => sheet.name === 'Entry')!;
    expect(entrySheet.validations).toEqual([
      {
        id: 'xlsx_vd_0',
        range: { minR: 0, maxR: 0, minC: 0, maxC: 0 },
        kind: 'list',
        items: ['Low', 'Medium', 'High'],
      },
    ]);
  });

  it('exports list and checkbox data validations', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: { A1: 'Open', B1: 'TRUE' },
      validations: [
        {
          id: 'status',
          range: { minR: 0, maxR: 1, minC: 0, maxC: 0 },
          kind: 'list',
          items: ['Open', 'Closed'],
        },
        {
          id: 'check',
          range: { minR: 0, maxR: 0, minC: 1, maxC: 1 },
          kind: 'checkbox',
          items: ['TRUE', 'FALSE'],
        },
      ],
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Sheet1')!;
    expect(ws.getCell('A1').dataValidation).toMatchObject({
      type: 'list',
      formulae: ['"Open,Closed"'],
    });
    expect(ws.getCell('A2').dataValidation).toMatchObject({
      type: 'list',
      formulae: ['"Open,Closed"'],
    });
    expect(ws.getCell('B1').dataValidation).toMatchObject({
      type: 'list',
      formulae: ['"TRUE,FALSE"'],
    });
  });

  it('exports long list data validations through a hidden range and reimports without exposing the helper sheet', async () => {
    const items = Array.from({ length: 80 }, (_, idx) => `Option ${String(idx + 1).padStart(2, '0')}`);
    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: { A1: 'Option 01' },
      validations: [
        {
          id: 'long-list',
          range: { minR: 0, maxR: 0, minC: 0, maxC: 0 },
          kind: 'list',
          items,
        },
      ],
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Sheet1')!;
    const helper = wb.getWorksheet('__cloudsheet_lists')!;
    expect(helper.state).toBe('veryHidden');
    expect(ws.getCell('A1').dataValidation).toMatchObject({
      type: 'list',
      formulae: ['__cloudsheet_lists!$A$1:$A$80'],
    });
    expect(helper.getCell('A80').value).toBe('Option 80');

    const imported = await importXlsxBuffer(exported);
    expect(imported.map((sheet) => sheet.name)).toEqual(['Sheet1']);
    expect(imported[0].validations).toEqual([
      {
        id: 'xlsx_vd_0',
        range: { minR: 0, maxR: 0, minC: 0, maxC: 0 },
        kind: 'list',
        items,
      },
    ]);
  });

  it('imports and exports cell notes as cloud sheet comments', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 'Needs review';
      ws.getCell('A1').note = 'Check source before publish';
      ws.getCell('B1').value = 'Rich';
      ws.getCell('B1').note = {
        texts: [
          { text: 'First ' },
          { font: { bold: true }, text: 'Second' },
        ],
      };
    });

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.comments).toEqual({
      A1: 'Check source before publish',
      B1: 'First Second',
    });

    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: { A1: 'Needs review' },
      comments: { A1: 'Check source before publish' },
    }]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    expect(wb.getWorksheet('Sheet1')!.getCell('A1').note).toBe('Check source before publish');
  });

  it('rewrites cross-sheet formula references to sanitized exported sheet names', async () => {
    const exported = await exportXlsxBuffer([
      { name: 'Data:Q1/2026', cells: { A1: '41' } },
      { name: 'Data?Q1*2026', cells: { A1: '9' } },
      {
        name: 'Summary',
        cells: {
          A1: "='Data:Q1/2026'!A1+1",
          A2: "='Data?Q1*2026'!A1+1",
        },
      },
    ]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    expect(wb.worksheets.map((sheet) => sheet.name)).toEqual([
      'Data_Q1_2026',
      'Data_Q1_2026 (2)',
      'Summary',
    ]);
    const summary = wb.getWorksheet('Summary')!;
    expect((summary.getCell('A1').value as ExcelJS.CellFormulaValue).formula).toBe('Data_Q1_2026!A1+1');
    expect((summary.getCell('A1').value as ExcelJS.CellFormulaValue).result).toBe(42);
    expect((summary.getCell('A2').value as ExcelJS.CellFormulaValue).formula).toBe("'Data_Q1_2026 (2)'!A1+1");
    expect((summary.getCell('A2').value as ExcelJS.CellFormulaValue).result).toBe(10);
  });

  it('does not rewrite sheet-like text inside formula string literals', async () => {
    const exported = await exportXlsxBuffer([
      { name: 'Data:Q1/2026', cells: { A1: '41' } },
      {
        name: 'Summary',
        cells: {
          A1: '=IF("Data:Q1/2026!A1"="Data:Q1/2026!A1",1,0)',
          A2: '=IF("Data_Q1_2026!A1"="Data_Q1_2026!A1",1,0)',
          A3: "='Data:Q1/2026'!A1",
        },
      },
    ]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const summary = wb.getWorksheet('Summary')!;
    expect((summary.getCell('A1').value as ExcelJS.CellFormulaValue).formula)
      .toBe('IF("Data:Q1/2026!A1"="Data:Q1/2026!A1",1,0)');
    expect((summary.getCell('A2').value as ExcelJS.CellFormulaValue).formula)
      .toBe('IF("Data_Q1_2026!A1"="Data_Q1_2026!A1",1,0)');
    expect((summary.getCell('A3').value as ExcelJS.CellFormulaValue).formula)
      .toBe('Data_Q1_2026!A1');
  });

  it('preserves text-like numeric identifiers and round-trips date values', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: {
        A1: '00123',
        A2: '123',
        A3: '1234567890123456',
        A4: '2026-05-11',
        A5: '2026-05-11 14:30',
        A6: '1234',
        A7: '0.125',
      },
      cellFormats: {
        A4: { numberFmt: 'date' },
        A5: { numberFmt: 'datetime' },
        A6: { numberFmt: 'currency-krw' },
        A7: { numberFmt: 'percent' },
      },
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Sheet1')!;
    expect(ws.getCell('A1').value).toBe('00123');
    expect(ws.getCell('A2').value).toBe(123);
    expect(ws.getCell('A3').value).toBe('1234567890123456');
    expect(ws.getCell('A4').value).toBeInstanceOf(Date);
    expect(ws.getCell('A5').value).toBeInstanceOf(Date);
    expect(ws.getCell('A5').numFmt).toBe('yyyy-mm-dd hh:mm');
    expect(ws.getCell('A6').value).toBe(1234);
    expect(ws.getCell('A6').numFmt).toBe('"₩"#,##0');
    expect(ws.getCell('A7').value).toBe(0.125);
    expect(ws.getCell('A7').numFmt).toBe('0.0%');
    expect((ws.getCell('A5').value as Date).getUTCHours()).toBe(14);
    expect((ws.getCell('A5').value as Date).getUTCMinutes()).toBe(30);

    const [sheet] = await importXlsxBuffer(exported);
    expect(sheet.cells.A1).toBe('00123');
    expect(sheet.cells.A2).toBe('123');
    expect(sheet.cells.A3).toBe('1234567890123456');
    expect(sheet.cells.A4).toBe('2026-05-11');
    expect(sheet.cells.A5).toBe('2026-05-11 14:30');
    expect(sheet.cells.A6).toBe('1234');
    expect(sheet.cells.A7).toBe('0.125');
    expect(sheet.cellFormats?.A4?.numberFmt).toBe('date');
    expect(sheet.cellFormats?.A5?.numberFmt).toBe('datetime');
    expect(sheet.cellFormats?.A6?.numberFmt).toBe('currency-krw');
    expect(sheet.cellFormats?.A7?.numberFmt).toBe('percent');
  });
});

describe('numFmtMap — 양방향 코드 매핑', () => {
  it('엑셀 → 우리 토큰', () => {
    expect(excelNumFmtToToken('#,##0')).toBe('integer');
    expect(excelNumFmtToToken('0.00')).toBe('decimal2');
    expect(excelNumFmtToToken('0.0%')).toBe('percent');
    expect(excelNumFmtToToken('"₩"#,##0')).toBe('currency-krw');
    expect(excelNumFmtToToken('"원"#,##0')).toBe('currency-krw');
    expect(excelNumFmtToToken('KRW #,##0')).toBe('currency-krw');
    expect(excelNumFmtToToken('yyyy-mm-dd')).toBe('date');
    expect(excelNumFmtToToken('m/d/yyyy')).toBe('date');
    expect(excelNumFmtToToken('yyyy-mm-dd hh:mm')).toBe('datetime');
  });

  it('일반/미지원 → undefined', () => {
    expect(excelNumFmtToToken('')).toBeUndefined();
    expect(excelNumFmtToToken('General')).toBeUndefined();
    expect(excelNumFmtToToken(undefined)).toBeUndefined();
  });

  it('round-trip — 우리 토큰 → 엑셀 → 우리 토큰', () => {
    const tokens = ['integer', 'decimal1', 'decimal2', 'decimal3', 'decimal4', 'percent', 'currency-krw', 'date', 'datetime'] as const;
    for (const t of tokens) {
      expect(excelNumFmtToToken(tokenToExcelNumFmt(t))).toBe(t);
    }
  });

  it('자릿수별 numFmt 패턴', () => {
    expect(excelNumFmtToToken('0.0')).toBe('decimal1');
    expect(excelNumFmtToToken('0.00')).toBe('decimal2');
    expect(excelNumFmtToToken('0.000')).toBe('decimal3');
    expect(excelNumFmtToToken('0.0000')).toBe('decimal4');
    expect(excelNumFmtToToken('#,##0.0')).toBe('decimal1');
    expect(excelNumFmtToToken('#,##0.0000')).toBe('decimal4');
  });
});
