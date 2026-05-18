/**
 * 시트 import/export round-trip — PR #2/5 (Import 정확도).
 *
 * ExcelJS 로 .xlsx 를 메모리에 만들어 export → import → 데이터·서식·크기·freeze
 * 보존 검증. 실제 파일 fixture 없이 in-memory 만으로 충분 (모든 코드 경로 통과).
 */
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { importXlsxBuffer } from '@/lib/cloudSheet/xlsx';
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
    expect(sheet.rowHeights?.[1]).toBeGreaterThan(30);
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

describe('numFmtMap — 양방향 코드 매핑', () => {
  it('엑셀 → 우리 토큰', () => {
    expect(excelNumFmtToToken('#,##0')).toBe('integer');
    expect(excelNumFmtToToken('0.00')).toBe('decimal2');
    expect(excelNumFmtToToken('0.0%')).toBe('percent');
    expect(excelNumFmtToToken('"₩"#,##0')).toBe('currency-krw');
    expect(excelNumFmtToToken('yyyy-mm-dd')).toBe('date');
    expect(excelNumFmtToToken('m/d/yyyy')).toBe('date');
  });

  it('일반/미지원 → undefined', () => {
    expect(excelNumFmtToToken('')).toBeUndefined();
    expect(excelNumFmtToToken('General')).toBeUndefined();
    expect(excelNumFmtToToken(undefined)).toBeUndefined();
  });

  it('round-trip — 우리 토큰 → 엑셀 → 우리 토큰', () => {
    const tokens = ['integer', 'decimal1', 'decimal2', 'decimal3', 'decimal4', 'percent', 'currency-krw', 'date'] as const;
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
