/**
 * 시트 import/export round-trip — PR #2/5 (Import 정확도).
 *
 * ExcelJS 로 .xlsx 를 메모리에 만들어 export → import → 데이터·서식·크기·freeze
 * 보존 검증. 실제 파일 fixture 없이 in-memory 만으로 충분 (모든 코드 경로 통과).
 */
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
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

async function addNativeChartFixture(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(buffer);
  const sheetPath = 'xl/worksheets/sheet1.xml';
  const sheetXml = await zip.file(sheetPath)!.async('string');
  zip.file(sheetPath, sheetXml.includes('<drawing ')
    ? sheetXml
    : sheetXml.replace('</worksheet>', '<drawing r:id="rIdChartDrawing1"/></worksheet>'));
  zip.file('xl/worksheets/_rels/sheet1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdChartDrawing1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`);
  zip.file('xl/drawings/drawing1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>3</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>12</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame>
      <xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Chart 1"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
      <xdr:xfrm/>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="rIdChart1"/></a:graphicData></a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`);
  zip.file('xl/drawings/_rels/drawing1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdChart1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
</Relationships>`);
  zip.file('xl/charts/chart1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <c:chart>
    <c:title><c:tx><c:rich><a:p><a:r><a:t>Revenue</a:t></a:r></a:p></c:rich></c:tx></c:title>
    <c:plotArea>
      <c:barChart>
        <c:barDir val="col"/>
        <c:ser>
          <c:idx val="0"/><c:order val="0"/>
          <c:tx><c:strRef><c:f>'Charts'!$B$1</c:f></c:strRef></c:tx>
          <c:cat><c:strRef><c:f>'Charts'!$A$2:$A$3</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>'Charts'!$B$2:$B$3</c:f></c:numRef></c:val>
        </c:ser>
      </c:barChart>
    </c:plotArea>
  </c:chart>
</c:chartSpace>`);
  const out = await zip.generateAsync({ type: 'uint8array' });
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
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

  it('normalizes Excel future-function prefixes on import', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 'a';
      ws.getCell('B1').value = '10';
      ws.getCell('A2').value = 'b';
      ws.getCell('B2').value = '20';
      ws.getCell('C1').value = { formula: '_xlfn.XLOOKUP("b",A1:A2,B1:B2)', result: 20 };
      ws.getCell('C2').value = { formula: '_xlfn._xlws.FILTER(B1:B2,A1:A2="b")', result: 20 };
    });
    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.cells.C1).toBe('=XLOOKUP("b",A1:A2,B1:B2)');
    expect(sheet.cells.C2).toBe('=FILTER(B1:B2,A1:A2="b")');
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

  it('imports sheet visibility, tab color, hidden rows/columns, and auto filter', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.state = 'hidden';
      ws.properties.tabColor = { argb: 'FF22AA99' };
      ws.getCell('A1').value = 'Name';
      ws.getCell('B1').value = 'Score';
      ws.getCell('A2').value = 'Ada';
      ws.getColumn(2).hidden = true;
      ws.getRow(3).hidden = true;
      ws.getRow(3).height = 15;
      ws.autoFilter = 'A1:B10';
    }, 'Meta');

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.name).toBe('Meta');
    expect(sheet.sheetState).toBe('hidden');
    expect(sheet.tabColor).toBe('#22AA99');
    expect(sheet.hiddenCols?.[1]).toBe(true);
    expect(sheet.hiddenRows?.[2]).toBe(true);
    expect(sheet.autoFilterRef).toBe('A1:B10');
  });

  it('imports worksheet view options used by Excel', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 'View';
      ws.views = [{
        state: 'normal',
        showGridLines: false,
        showRowColHeaders: false,
        rightToLeft: true,
        zoomScale: 125,
      } as ExcelJS.WorksheetView];
    }, 'ViewMeta');

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.sheetView).toEqual({
      showGridLines: false,
      showRowColHeaders: false,
      rightToLeft: true,
      zoomScale: 125,
    });
  });

  it('imports page setup and header/footer metadata used by Excel printing', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 'Print';
      ws.pageSetup = {
        orientation: 'landscape',
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalCentered: true,
        verticalCentered: false,
        printArea: 'A1:D20',
        printTitlesRow: '1:2',
        printTitlesColumn: 'A:B',
        margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      };
      ws.headerFooter = {
        oddHeader: '&CQuarterly Report',
        oddFooter: '&RPage &P of &N',
      };
    }, 'PrintMeta');

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.pageSetup).toMatchObject({
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      verticalCentered: false,
      printArea: 'A1:D20',
      printTitlesRow: '1:2',
      printTitlesColumn: 'A:B',
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    });
    expect(sheet.headerFooter).toMatchObject({
      oddHeader: '&CQuarterly Report',
      oddFooter: '&RPage &P of &N',
    });
  });

  it('imports row and column outline grouping metadata', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 'Outline';
      ws.getCell('A3').value = 'Level 1';
      ws.getCell('A4').value = 'Level 2';
      ws.getRow(3).outlineLevel = 1;
      ws.getRow(4).outlineLevel = 2;
      ws.getColumn(2).outlineLevel = 1;
      ws.properties.outlineProperties = { summaryBelow: false, summaryRight: false };
    }, 'OutlineMeta');

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.sheetOutline).toEqual({
      rowLevels: { 2: 1, 3: 2 },
      colLevels: { 1: 1 },
      summaryBelow: false,
      summaryRight: false,
    });
  });

  it('imports sheet protection and cell protection metadata', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 'editable';
      ws.getCell('A1').protection = { locked: false };
      ws.getCell('B1').value = { formula: 'A1*2', result: 4 };
      ws.getCell('B1').protection = { locked: true, hidden: true };
      (ws as unknown as { sheetProtection?: unknown }).sheetProtection = {
        sheet: true,
        selectUnlockedCells: false,
        formatCells: true,
        autoFilter: true,
        algorithmName: 'SHA-512',
        hashValue: 'hash',
        saltValue: 'salt',
        spinCount: 100000,
      };
    }, 'Protected');

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.sheetProtection).toMatchObject({
      sheet: true,
      selectUnlockedCells: false,
      formatCells: true,
      autoFilter: true,
      algorithmName: 'SHA-512',
      hashValue: 'hash',
      saltValue: 'salt',
      spinCount: 100000,
    });
    expect(sheet.cellFormats?.A1?.protection).toMatchObject({ locked: false });
    expect(sheet.cellFormats?.B1?.protection).toMatchObject({ hidden: true });
  });

  it('imports Excel table metadata', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.addTable({
        name: 'Scores',
        ref: 'A1',
        headerRow: true,
        totalsRow: false,
        style: { theme: 'TableStyleMedium2', showRowStripes: true },
        columns: [{ name: 'Name', filterButton: true }, { name: 'Score', filterButton: true }],
        rows: [['Ada', 10], ['Lin', 20]],
      });
    }, 'Tables');

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.tables?.[0]?.name).toBe('Scores');
    expect(sheet.tables?.[0]?.ref).toBe('A1:B3');
    expect(sheet.tables?.[0]?.columns?.map((col) => col.name)).toEqual(['Name', 'Score']);
    expect(sheet.tables?.[0]?.style?.showRowStripes).toBe(true);
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

  it('preserves sheet metadata across xlsx export and import', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Meta',
      cells: {
        A1: 'Name',
        B1: 'Score',
        A2: 'Ada',
      },
      sheetState: 'veryHidden',
      tabColor: '#3366CC',
      hiddenCols: { 1: true },
      hiddenRows: { 4: true },
      autoFilterRef: 'A1:B20',
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Meta')!;
    expect(ws.state).toBe('veryHidden');
    expect(ws.properties.tabColor?.argb).toBe('FF3366CC');
    expect(ws.getColumn(2).hidden).toBe(true);
    expect(ws.getRow(5).hidden).toBe(true);

    const [sheet] = await importXlsxBuffer(exported);
    expect(sheet.sheetState).toBe('veryHidden');
    expect(sheet.tabColor).toBe('#3366CC');
    expect(sheet.hiddenCols?.[1]).toBe(true);
    expect(sheet.hiddenRows?.[4]).toBe(true);
    expect(sheet.autoFilterRef).toBe('A1:B20');
  });

  it('preserves worksheet view options across xlsx export and import', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'ViewMeta',
      cells: { A1: 'View' },
      freezeRows: 1,
      freezeCols: 1,
      sheetView: {
        showGridLines: false,
        showRowColHeaders: false,
        rightToLeft: true,
        zoomScale: 135,
      },
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    expect(wb.getWorksheet('ViewMeta')!.views[0]).toMatchObject({
      state: 'frozen',
      showGridLines: false,
      showRowColHeaders: false,
      rightToLeft: true,
      zoomScale: 135,
    });

    const [sheet] = await importXlsxBuffer(exported);
    expect(sheet.freezeRows).toBe(1);
    expect(sheet.freezeCols).toBe(1);
    expect(sheet.sheetView).toEqual({
      showGridLines: false,
      showRowColHeaders: false,
      rightToLeft: true,
      zoomScale: 135,
    });
  });

  it('preserves page setup and header/footer metadata across xlsx export and import', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'PrintMeta',
      cells: { A1: 'Print' },
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9,
        scale: 85,
        horizontalCentered: true,
        verticalCentered: true,
        showGridLines: true,
        showRowColHeaders: true,
        blackAndWhite: true,
        cellComments: 'asDisplayed',
        errors: 'blank',
        printArea: 'A1:D20',
        printTitlesRow: '1:2',
        printTitlesColumn: 'A:B',
        margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.25, footer: 0.25 },
      },
      headerFooter: {
        differentFirst: true,
        oddHeader: '&CQuarterly Report',
        oddFooter: '&RPage &P of &N',
        firstHeader: '&LFirst page',
      },
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('PrintMeta')!;
    expect(ws.pageSetup).toMatchObject({
      orientation: 'landscape',
      paperSize: 9,
      scale: 85,
      horizontalCentered: true,
      verticalCentered: true,
      showGridLines: true,
      showRowColHeaders: true,
      blackAndWhite: true,
      cellComments: 'asDisplayed',
      errors: 'blank',
      printArea: 'A1:D20',
      printTitlesRow: '1:2',
      printTitlesColumn: 'A:B',
    });
    expect(ws.pageSetup.margins).toMatchObject({ left: 0.4, right: 0.4, top: 0.6, bottom: 0.6 });
    expect(ws.headerFooter).toMatchObject({
      differentFirst: true,
      oddHeader: '&CQuarterly Report',
      oddFooter: '&RPage &P of &N',
      firstHeader: '&LFirst page',
    });

    const [sheet] = await importXlsxBuffer(exported);
    expect(sheet.pageSetup).toMatchObject({
      orientation: 'landscape',
      paperSize: 9,
      scale: 85,
      horizontalCentered: true,
      verticalCentered: true,
      printArea: 'A1:D20',
      printTitlesRow: '1:2',
      printTitlesColumn: 'A:B',
    });
    expect(sheet.headerFooter).toMatchObject({
      oddHeader: '&CQuarterly Report',
      oddFooter: '&RPage &P of &N',
      firstHeader: '&LFirst page',
    });
  });

  it('preserves row and column outline grouping metadata across xlsx export and import', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'OutlineMeta',
      cells: { A1: 'Outline', B3: 'Group child' },
      sheetOutline: {
        rowLevels: { 2: 1, 3: 2 },
        colLevels: { 1: 1 },
        summaryBelow: false,
        summaryRight: false,
      },
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('OutlineMeta')!;
    expect(ws.getRow(3).outlineLevel).toBe(1);
    expect(ws.getRow(4).outlineLevel).toBe(2);
    expect(ws.getColumn(2).outlineLevel).toBe(1);
    expect(ws.properties.outlineProperties).toMatchObject({
      summaryBelow: false,
      summaryRight: false,
    });

    const [sheet] = await importXlsxBuffer(exported);
    expect(sheet.sheetOutline).toEqual({
      rowLevels: { 2: 1, 3: 2 },
      colLevels: { 1: 1 },
      summaryBelow: false,
      summaryRight: false,
    });
  });

  it('preserves worksheet auto filter criteria across xlsx export and import', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Filtered',
      cells: {
        A1: 'Name',
        B1: 'Score',
        A2: 'Ada',
        B2: '10',
        A3: 'Lin',
        B3: '20',
        A4: 'Max',
        B4: '30',
      },
      autoFilterRef: 'A1:B4',
      autoFilterColumns: [
        { values: ['Ada', 'Lin'] },
        { customFilters: [{ operator: 'greaterThan', val: '10' }, { operator: 'lessThan', val: '30' }], and: true },
      ],
      sortState: {
        ref: 'A2:B4',
        conditions: [{ ref: 'B2:B4', descending: true }],
      },
    }]);

    const zip = await JSZip.loadAsync(exported);
    const sheetXml = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    expect(sheetXml).toContain('<autoFilter ref="A1:B4">');
    expect(sheetXml).toContain('<filters>');
    expect(sheetXml).toContain('val="Ada"');
    expect(sheetXml).toContain('<customFilters and="1">');
    expect(sheetXml).toContain('operator="greaterThan"');
    expect(sheetXml).toContain('<sortState ref="A2:B4">');
    expect(sheetXml).toContain('<sortCondition ref="B2:B4" descending="1"/>');

    const [sheet] = await importXlsxBuffer(exported);
    expect(sheet.autoFilterRef).toBe('A1:B4');
    expect(sheet.autoFilterColumns?.[0]?.values).toEqual(['Ada', 'Lin']);
    expect(sheet.autoFilterColumns?.[1]?.customFilters).toEqual([
      { val: '10', operator: 'greaterThan' },
      { val: '30', operator: 'lessThan' },
    ]);
    expect(sheet.autoFilterColumns?.[1]?.and).toBe(true);
    expect(sheet.sortState).toEqual({
      ref: 'A2:B4',
      conditions: [{ ref: 'B2:B4', descending: true }],
    });
  });

  it('preserves sheet protection and protected cell formats across xlsx export and import', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Protected',
      cells: {
        A1: 'editable',
        B1: '=A1*2',
      },
      cellFormats: {
        A1: { protection: { locked: false } },
        B1: { protection: { hidden: true } },
        C3: { protection: { locked: false } },
      },
      sheetProtection: {
        sheet: true,
        selectUnlockedCells: false,
        formatCells: true,
        autoFilter: true,
        algorithmName: 'SHA-512',
        hashValue: 'hash',
        saltValue: 'salt',
        spinCount: 100000,
      },
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Protected')!;
    expect((ws as unknown as { sheetProtection?: unknown }).sheetProtection).toMatchObject({
      sheet: true,
      selectUnlockedCells: false,
      formatCells: true,
      autoFilter: true,
      algorithmName: 'SHA-512',
      hashValue: 'hash',
      saltValue: 'salt',
      spinCount: 100000,
    });
    expect(ws.getCell('A1').protection).toMatchObject({ locked: false });
    expect(ws.getCell('B1').protection).toMatchObject({ hidden: true });
    expect(ws.getCell('C3').protection).toMatchObject({ locked: false });

    const [sheet] = await importXlsxBuffer(exported);
    expect(sheet.sheetProtection).toMatchObject({ sheet: true, selectUnlockedCells: false });
    expect(sheet.cellFormats?.A1?.protection).toMatchObject({ locked: false });
    expect(sheet.cellFormats?.B1?.protection).toMatchObject({ hidden: true });
    expect(sheet.cellFormats?.C3?.protection).toMatchObject({ locked: false });
  });

  it('preserves Excel table metadata across xlsx export and import', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Tables',
      cells: {
        A1: 'Name',
        B1: 'Score',
        A2: 'Ada',
        B2: '10',
        A3: 'Lin',
        B3: '20',
      },
      tables: [{
        name: 'Scores',
        ref: 'A1:B3',
        headerRow: true,
        totalsRow: false,
        style: { theme: 'TableStyleMedium2', showRowStripes: true },
        columns: [{ name: 'Name', filterButton: true }, { name: 'Score', filterButton: true }],
      }],
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Tables')!;
    expect((ws.model as { tables?: Array<{ name?: string; tableRef?: string }> }).tables?.[0]?.name).toBe('Scores');
    expect((ws.model as { tables?: Array<{ tableRef?: string }> }).tables?.[0]?.tableRef).toBe('A1:B3');

    const [sheet] = await importXlsxBuffer(exported);
    expect(sheet.tables?.[0]?.name).toBe('Scores');
    expect(sheet.tables?.[0]?.ref).toBe('A1:B3');
    expect(sheet.tables?.[0]?.columns?.map((col) => col.name)).toEqual(['Name', 'Score']);
  });

  it('preserves Excel table filter criteria across xlsx export and import', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'FilteredTable',
      cells: {
        A1: 'Name',
        B1: 'Score',
        A2: 'Ada',
        B2: '10',
        A3: 'Lin',
        B3: '20',
        A4: 'Max',
        B4: '30',
      },
      tables: [{
        name: 'FilteredScores',
        ref: 'A1:B4',
        headerRow: true,
        totalsRow: false,
        style: { theme: 'TableStyleMedium2', showRowStripes: true },
        columns: [
          { name: 'Name', filterButton: true, filter: { values: ['Ada', 'Lin'] } },
          { name: 'Score', filterButton: true, filter: { customFilters: [{ operator: 'greaterThan', val: '10' }] } },
        ],
      }],
    }]);

    const zip = await JSZip.loadAsync(exported);
    const tableXml = await zip.file('xl/tables/table1.xml')!.async('string');
    expect(tableXml).toContain('<filters>');
    expect(tableXml).toContain('val="Ada"');
    expect(tableXml).toContain('operator="greaterThan"');

    const [sheet] = await importXlsxBuffer(exported);
    expect(sheet.tables?.[0]?.columns?.[0]?.filter?.values).toEqual(['Ada', 'Lin']);
    expect(sheet.tables?.[0]?.columns?.[1]?.filter?.customFilters).toEqual([
      { val: '10', operator: 'greaterThan' },
    ]);
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
    const zip = await JSZip.loadAsync(exported);
    const workbookXml = await zip.file('xl/workbook.xml')!.async('string');
    expect(workbookXml).toContain('fullCalcOnLoad="1"');
    expect((ws.getCell('A3').value as ExcelJS.CellFormulaValue).result).toBe(30);
    expect((ws.getCell('A4').value as ExcelJS.CellFormulaValue).result).toBe(true);
    expect((ws.getCell('A5').value as ExcelJS.CellFormulaValue).result).toBe(3);
  });

  it('preserves literal Excel error cells on import', async () => {
    const buf = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = { error: '#DIV/0!' };
      ws.getCell('A2').value = { error: '#N/A' };
    });

    const [sheet] = await importXlsxBuffer(buf);
    expect(sheet.cells.A1).toBe('#DIV/0!');
    expect(sheet.cells.A2).toBe('#N/A');
  });

  it('exports literal error cells and formula cached error results as native Excel errors', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Errors',
      cells: {
        A1: '#DIV/0!',
        A2: '=1/0',
        A3: '=MATCH("missing",B1:B2,0)',
        B1: 'ok',
        B2: 'done',
      },
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Errors')!;
    expect(ws.getCell('A1').value).toEqual({ error: '#DIV/0!' });
    expect((ws.getCell('A2').value as ExcelJS.CellFormulaValue).result).toEqual({ error: '#DIV/0!' });
    expect((ws.getCell('A3').value as ExcelJS.CellFormulaValue).result).toEqual({ error: '#N/A' });

    const [sheet] = await importXlsxBuffer(exported);
    expect(sheet.cells.A1).toBe('#DIV/0!');
    expect(sheet.cells.A2).toBe('=1/0');
    expect(sheet.cells.A3).toBe('=MATCH("missing",B1:B2,0)');
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
        D7: '=SUMPRODUCT(C1:C4, E1:E4)',
        D8: '=PRODUCT(E1:E3)',
        D9: '=ROWS(A1:C4)+COLUMNS(A1:C4)',
        D10: '=CHOOSE(2,"low","mid","high")',
        D11: '=SUBTOTAL(9,C1:C4)',
        D12: '=LARGE(C1:C4,2)',
        D13: '=SMALL(C1:C4,2)',
        D14: '=PERCENTILE.INC(E1:E4,0.75)',
        D15: '=QUARTILE.INC(E1:E4,1)',
        D16: '=STDEV.P(E1:E4)',
        D17: '=VAR.P(E1:E4)',
        E1: '1', E2: '2', E3: '3', E4: '4',
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
    expect((ws.getCell('D7').value as ExcelJS.CellFormulaValue).result).toBe(340);
    expect((ws.getCell('D8').value as ExcelJS.CellFormulaValue).result).toBe(6);
    expect((ws.getCell('D9').value as ExcelJS.CellFormulaValue).result).toBe(7);
    expect((ws.getCell('D10').value as ExcelJS.CellFormulaValue).result).toBe('mid');
    expect((ws.getCell('D11').value as ExcelJS.CellFormulaValue).result).toBe(110);
    expect((ws.getCell('D12').value as ExcelJS.CellFormulaValue).result).toBe(30);
    expect((ws.getCell('D13').value as ExcelJS.CellFormulaValue).result).toBe(20);
    expect((ws.getCell('D14').value as ExcelJS.CellFormulaValue).result).toBe(3.25);
    expect((ws.getCell('D15').value as ExcelJS.CellFormulaValue).result).toBe(1.75);
    expect((ws.getCell('D16').value as ExcelJS.CellFormulaValue).result).toBe(1.118034);
    expect((ws.getCell('D17').value as ExcelJS.CellFormulaValue).result).toBe(1.25);
  });

  it('writes cached results for standard Excel lookup formulas', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: {
        A1: 'Item', B1: 'Color', C1: 'Qty',
        A2: 'a', B2: 'red', C2: '10',
        A3: 'b', B3: 'blue', C3: '20',
        A4: 'c', B4: 'green', C4: '30',
        E1: '=VLOOKUP("b",A2:C4,3,FALSE)',
        E2: '=HLOOKUP("Color",A1:C4,3,FALSE)',
        E3: '=INDEX(A2:C4,2,2)',
      },
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Sheet1')!;
    expect((ws.getCell('E1').value as ExcelJS.CellFormulaValue).result).toBe(20);
    expect((ws.getCell('E2').value as ExcelJS.CellFormulaValue).result).toBe('blue');
    expect((ws.getCell('E3').value as ExcelJS.CellFormulaValue).result).toBe('blue');
  });

  it('writes cached results for Excel table structured reference formulas', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: {
        A1: 'Name', B1: 'Score', C1: 'Adjusted',
        A2: 'Ada', B2: '10', C2: '=[@Score]*2',
        A3: 'Lin', B3: '20', C3: '=Scores[@Score]+5',
        D1: '=SUM(Scores[Score])',
        D2: '=ROWS(Scores[#Data])',
        D3: '=INDEX(Scores[[#All],[Score]],1)',
        D4: '=SUM(Scores[[Score]:[Adjusted]])',
        D5: '=COLUMNS(Scores[[#Headers],[Score]:[Adjusted]])',
      },
      tables: [{
        name: 'Scores',
        ref: 'A1:C3',
        headerRow: true,
        totalsRow: false,
        columns: [
          { name: 'Name', filterButton: true },
          { name: 'Score', filterButton: true },
          { name: 'Adjusted', filterButton: true },
        ],
      }],
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Sheet1')!;
    expect((ws.getCell('C2').value as ExcelJS.CellFormulaValue).formula).toBe('[@Score]*2');
    expect((ws.getCell('C2').value as ExcelJS.CellFormulaValue).result).toBe(20);
    expect((ws.getCell('C3').value as ExcelJS.CellFormulaValue).formula).toBe('Scores[@Score]+5');
    expect((ws.getCell('C3').value as ExcelJS.CellFormulaValue).result).toBe(25);
    expect((ws.getCell('D1').value as ExcelJS.CellFormulaValue).formula).toBe('SUM(Scores[Score])');
    expect((ws.getCell('D1').value as ExcelJS.CellFormulaValue).result).toBe(30);
    expect((ws.getCell('D2').value as ExcelJS.CellFormulaValue).result).toBe(2);
    expect((ws.getCell('D3').value as ExcelJS.CellFormulaValue).result).toBe('Score');
    expect((ws.getCell('D4').value as ExcelJS.CellFormulaValue).result).toBe(75);
    expect((ws.getCell('D5').value as ExcelJS.CellFormulaValue).result).toBe(2);
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

  it('imports Excel numeric data validations', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('C1').value = 5;
      ws.getCell('C1').dataValidation = {
        type: 'whole',
        operator: 'between',
        allowBlank: true,
        formulae: [1, 10],
      };
      ws.getCell('D1').value = 12.5;
      ws.getCell('D1').dataValidation = {
        type: 'decimal',
        operator: 'greaterThanOrEqual',
        allowBlank: true,
        formulae: [10],
      };
    });

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.validations).toEqual([
      {
        id: 'xlsx_vd_0',
        range: { minR: 0, maxR: 0, minC: 2, maxC: 2 },
        kind: 'integer',
        operator: 'between',
        formula1: '1',
        formula2: '10',
      },
      {
        id: 'xlsx_vd_1',
        range: { minR: 0, maxR: 0, minC: 3, maxC: 3 },
        kind: 'number',
        operator: 'greaterThanOrEqual',
        formula1: '10',
        formula2: undefined,
      },
    ]);
  });

  it('round-trips Excel data validation prompts and error messages', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 'Open';
      ws.getCell('A1').dataValidation = {
        type: 'list',
        allowBlank: false,
        showInputMessage: true,
        promptTitle: 'Status help',
        prompt: 'Choose a status',
        showErrorMessage: false,
        errorStyle: 'warning',
        errorTitle: 'Invalid status',
        error: 'Pick from the list',
        formulae: ['"Open,Closed"'],
      } as ExcelJS.DataValidation;
    });

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.validations?.[0]).toMatchObject({
      kind: 'list',
      showInputMessage: true,
      promptTitle: 'Status help',
      prompt: 'Choose a status',
      errorStyle: 'warning',
      errorTitle: 'Invalid status',
      error: 'Pick from the list',
    });

    const validation = {
      ...sheet.validations![0],
      allowBlank: false,
      showErrorMessage: false,
    };
    const exported = await exportXlsxBuffer([{
      name: 'ValidationMeta',
      cells: { A1: 'Open' },
      validations: [validation],
    }]);
    const zip = await JSZip.loadAsync(exported);
    const xml = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    expect(xml).toContain('allowBlank="0"');
    expect(xml).toContain('showErrorMessage="0"');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const dv = wb.getWorksheet('ValidationMeta')!.getCell('A1').dataValidation as ExcelJS.DataValidation & {
      promptTitle?: string;
      prompt?: string;
      errorTitle?: string;
      error?: string;
    };
    expect(dv).toMatchObject({
      type: 'list',
      showInputMessage: true,
      promptTitle: 'Status help',
      prompt: 'Choose a status',
      errorStyle: 'warning',
      errorTitle: 'Invalid status',
      error: 'Pick from the list',
    });

    const [roundTripped] = await importXlsxBuffer(exported);
    expect(roundTripped.validations?.[0]).toMatchObject({
      allowBlank: false,
      showErrorMessage: false,
    });
  });

  it('imports Excel date, text length, and custom data validations', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.getCell('E1').value = '2026-05-22';
      ws.getCell('E1').dataValidation = {
        type: 'date',
        operator: 'between',
        allowBlank: true,
        formulae: ['2026-01-01', '2026-12-31'],
      };
      ws.getCell('F1').value = 'ABC';
      ws.getCell('F1').dataValidation = {
        type: 'textLength',
        operator: 'lessThanOrEqual',
        allowBlank: true,
        formulae: [5],
      };
      ws.getCell('G1').value = 'ABC-123';
      ws.getCell('G1').dataValidation = {
        type: 'custom',
        allowBlank: true,
        formulae: ['ISNUMBER(SEARCH("-",G1))'],
      };
    });

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.validations).toEqual([
      {
        id: 'xlsx_vd_0',
        range: { minR: 0, maxR: 0, minC: 4, maxC: 4 },
        kind: 'date',
        operator: 'between',
        formula1: '2026-01-01',
        formula2: '2026-12-31',
      },
      {
        id: 'xlsx_vd_1',
        range: { minR: 0, maxR: 0, minC: 5, maxC: 5 },
        kind: 'textLength',
        operator: 'lessThanOrEqual',
        formula1: '5',
        formula2: undefined,
      },
      {
        id: 'xlsx_vd_2',
        range: { minR: 0, maxR: 0, minC: 6, maxC: 6 },
        kind: 'custom',
        formula1: 'ISNUMBER(SEARCH("-",G1))',
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

  it('exports numeric data validations', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: { C1: '5', D1: '12.5' },
      validations: [
        {
          id: 'whole-range',
          range: { minR: 0, maxR: 1, minC: 2, maxC: 2 },
          kind: 'integer',
          operator: 'between',
          formula1: '1',
          formula2: '10',
        },
        {
          id: 'decimal-min',
          range: { minR: 0, maxR: 0, minC: 3, maxC: 3 },
          kind: 'number',
          operator: 'greaterThanOrEqual',
          formula1: '10',
        },
      ],
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Sheet1')!;
    expect(ws.getCell('C1').dataValidation).toMatchObject({
      type: 'whole',
      operator: 'between',
      formulae: [1, 10],
    });
    expect(ws.getCell('C2').dataValidation).toMatchObject({
      type: 'whole',
      operator: 'between',
      formulae: [1, 10],
    });
    expect(ws.getCell('D1').dataValidation).toMatchObject({
      type: 'decimal',
      operator: 'greaterThanOrEqual',
      formulae: [10],
    });
  });

  it('exports date, text length, and custom data validations', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: { E1: '2026-05-22', F1: 'ABC', G1: 'ABC-123' },
      validations: [
        {
          id: 'date-range',
          range: { minR: 0, maxR: 0, minC: 4, maxC: 4 },
          kind: 'date',
          operator: 'between',
          formula1: '2026-01-01',
          formula2: '2026-12-31',
        },
        {
          id: 'length-max',
          range: { minR: 0, maxR: 0, minC: 5, maxC: 5 },
          kind: 'textLength',
          operator: 'lessThanOrEqual',
          formula1: '5',
        },
        {
          id: 'custom-dash',
          range: { minR: 0, maxR: 0, minC: 6, maxC: 6 },
          kind: 'custom',
          formula1: 'ISNUMBER(SEARCH("-",G1))',
        },
      ],
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Sheet1')!;
    expect(ws.getCell('E1').dataValidation).toMatchObject({
      type: 'date',
      operator: 'between',
      formulae: [new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2026, 11, 31))],
    });
    expect(ws.getCell('F1').dataValidation).toMatchObject({
      type: 'textLength',
      operator: 'lessThanOrEqual',
      formulae: [5],
    });
    expect(ws.getCell('G1').dataValidation).toMatchObject({
      type: 'custom',
      formulae: ['ISNUMBER(SEARCH("-",G1))'],
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

  it('imports Excel conditional formatting rules into sheet rules', async () => {
    const file = await buildWorkbookBuffer((ws) => {
      ws.addConditionalFormatting({
        ref: 'A1:A5',
        rules: [{
          type: 'cellIs',
          operator: 'greaterThan',
          formulae: ['10'],
          priority: 1,
          style: {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0E0' } },
            font: { bold: true, color: { argb: 'FFAA0000' } },
          },
        }],
      });
      ws.addConditionalFormatting({
        ref: 'B1:B5',
        rules: [{
          type: 'containsText',
          operator: 'containsText',
          text: 'urgent',
          priority: 2,
          style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } } },
        } as ExcelJS.ConditionalFormattingRule],
      });
      ws.addConditionalFormatting({
        ref: 'C1:C5',
        rules: [{
          type: 'expression',
          formulae: ['LEN(TRIM(C1))=0'],
          priority: 3,
          style: { font: { color: { argb: 'FF777777' } } },
        }],
      });
    });

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.condRules).toHaveLength(3);
    expect(sheet.condRules?.[0]).toMatchObject({
      range: { minR: 0, maxR: 4, minC: 0, maxC: 0 },
      op: '>',
      value: '10',
      format: { bgColor: '#FFE0E0', textColor: '#AA0000', bold: true },
    });
    expect(sheet.condRules?.[1]).toMatchObject({
      range: { minR: 0, maxR: 4, minC: 1, maxC: 1 },
      op: 'contains',
      value: 'urgent',
      format: { bgColor: '#FFFF99' },
    });
    expect(sheet.condRules?.[2]).toMatchObject({
      range: { minR: 0, maxR: 4, minC: 2, maxC: 2 },
      op: 'empty',
      format: { textColor: '#777777' },
    });
  });

  it('exports app conditional formatting and round-trips supported rules', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Sheet1',
      cells: { A1: '11', B1: 'urgent fix', C1: '' },
      condRules: [
        {
          id: 'gt',
          range: { minR: 0, maxR: 9, minC: 0, maxC: 0 },
          op: '>',
          value: '10',
          format: { bgColor: '#FFE0E0', textColor: '#AA0000', bold: true },
        },
        {
          id: 'contains',
          range: { minR: 0, maxR: 9, minC: 1, maxC: 1 },
          op: 'contains',
          value: 'urgent',
          format: { bgColor: '#FFF3BF' },
        },
        {
          id: 'empty',
          range: { minR: 0, maxR: 9, minC: 2, maxC: 2 },
          op: 'empty',
          value: '',
          format: { textColor: '#777777' },
        },
      ],
    }]);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(exported);
    const ws = wb.getWorksheet('Sheet1')!;
    const exportedCf = (ws as unknown as { conditionalFormattings?: ExcelJS.ConditionalFormattingOptions[] }).conditionalFormattings ?? [];
    expect(exportedCf).toHaveLength(3);
    expect(exportedCf.map((cf) => cf.ref)).toEqual(['A1:A10', 'B1:B10', 'C1:C10']);

    const [roundTrip] = await importXlsxBuffer(exported);
    expect(roundTrip.condRules?.map((rule) => rule.op)).toEqual(['>', 'contains', 'empty']);
    expect(roundTrip.condRules?.[0].format).toMatchObject({ bgColor: '#FFE0E0', textColor: '#AA0000', bold: true });
  });

  it('stores app embedded charts in hidden xlsx metadata and round-trips them', async () => {
    const exported = await exportXlsxBuffer([{
      name: 'Charts',
      cells: { A1: 'Name', B1: 'Score', A2: 'Ada', B2: '10', A3: 'Lin', B3: '20' },
      embeddedCharts: [{
        id: 'chart_1',
        type: 'line',
        orientation: 'columns',
        range: { minR: 0, maxR: 2, minC: 0, maxC: 1 },
        title: 'Scores',
        palette: 'warm',
        collapsed: false,
      }],
    }]);

    const zip = await JSZip.loadAsync(exported);
    const workbookXml = await zip.file('xl/workbook.xml')!.async('string');
    const contentTypesXml = await zip.file('[Content_Types].xml')!.async('string');
    const sheetXml = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    const chartXml = await zip.file('xl/charts/chart1.xml')!.async('string');
    expect(workbookXml).toContain('__cloudsheet_charts');
    expect(contentTypesXml).toContain('/xl/charts/chart1.xml');
    expect(sheetXml).toContain('<drawing ');
    expect(chartXml).toContain('<c:lineChart>');
    expect(chartXml).toContain('<c:f>Charts!$A$2:$A$3</c:f>');
    expect(chartXml).toContain('<c:f>Charts!$B$2:$B$3</c:f>');

    const imported = await importXlsxBuffer(exported);
    expect(imported.map((sheet) => sheet.name)).toEqual(['Charts']);
    expect(imported[0].embeddedCharts).toEqual([{
      id: 'chart_1',
      type: 'line',
      orientation: 'columns',
      range: { minR: 0, maxR: 2, minC: 0, maxC: 1 },
      title: 'Scores',
      palette: 'warm',
      collapsed: false,
    }]);
  });

  it('imports basic native Excel charts as embedded cloud sheet charts', async () => {
    const base = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 'Name';
      ws.getCell('B1').value = 'Revenue';
      ws.getCell('A2').value = 'Ada';
      ws.getCell('B2').value = 10;
      ws.getCell('A3').value = 'Lin';
      ws.getCell('B3').value = 20;
    }, 'Charts');
    const file = await addNativeChartFixture(base);

    const [sheet] = await importXlsxBuffer(file);
    expect(sheet.embeddedCharts?.[0]).toMatchObject({
      id: 'xlsx_chart_1_1',
      type: 'bar',
      orientation: 'columns',
      range: { minR: 0, maxR: 2, minC: 0, maxC: 1 },
      title: 'Revenue',
      collapsed: false,
    });
  });

  it('rejects XLSX imports that exceed configured workbook safety limits', async () => {
    const tooManyCells = await buildWorkbookBuffer((ws) => {
      ws.getCell('A1').value = 'one';
      ws.getCell('A2').value = 'two';
    });
    await expect(importXlsxBuffer(tooManyCells, { limits: { maxCells: 1 } }))
      .rejects.toThrow(/too many populated cells/i);

    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('One').getCell('A1').value = '1';
    wb.addWorksheet('Two').getCell('A1').value = '2';
    const buf = await wb.xlsx.writeBuffer();
    const u8 = new Uint8Array(buf as ArrayBufferLike);
    const tooManySheets = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    await expect(importXlsxBuffer(tooManySheets, { limits: { maxSheets: 1 } }))
      .rejects.toThrow(/too many sheets/i);

    await expect(importXlsxBuffer(tooManyCells, { limits: { maxFileBytes: 1 } }))
      .rejects.toThrow(/too large/i);

    const manyEntries = new JSZip();
    manyEntries.file('[Content_Types].xml', '<Types/>');
    manyEntries.file('xl/workbook.xml', '<workbook/>');
    manyEntries.file('xl/worksheets/sheet1.xml', '<worksheet/>');
    const manyEntriesBuffer = await manyEntries.generateAsync({ type: 'arraybuffer' });
    await expect(importXlsxBuffer(manyEntriesBuffer, { limits: { maxZipEntries: 2 } }))
      .rejects.toThrow(/too many ZIP entries/i);

    const oversizedEntry = new JSZip();
    oversizedEntry.file('[Content_Types].xml', '<Types/>');
    oversizedEntry.file('xl/workbook.xml', 'x'.repeat(128));
    const oversizedEntryBuffer = await oversizedEntry.generateAsync({ type: 'arraybuffer' });
    await expect(importXlsxBuffer(oversizedEntryBuffer, { limits: { maxZipEntryBytes: 16 } }))
      .rejects.toThrow(/oversized ZIP entry/i);
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
