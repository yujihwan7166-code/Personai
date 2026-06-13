/**
 * 시트 수식 엔진 — 신규 추가 함수 회귀 방지.
 * 기존 함수(SUM/AVG/IF 등)는 이미 운영 중이라 본 테스트는 새로 추가된
 * ~30개 함수 중심.
 */
import { describe, it, expect } from 'vitest';
import { evalCell } from '@/lib/cloudSheet/formula';

type Cells = Record<string, string>;

const evaluate = (formula: string, ctx: Cells = {}): string =>
  evalCell('Z99', { ...ctx, Z99: '=' + formula });

describe('formula — 에러 처리', () => {
  it('IFERROR — 에러면 대체값', () => {
    expect(evaluate('IFERROR(1/0, "div by zero")')).toBe('div by zero');
    expect(evaluate('IFERROR(2+2, "fallback")')).toBe('4');
  });

  it('IFNA — #N/A 만 대체', () => {
    // VLOOKUP miss → #N/A
    expect(evaluate('IFNA(VLOOKUP(99, A1:B2, 2, FALSE), "없음")', {
      A1: '1', B1: 'a', A2: '2', B2: 'b',
    })).toBe('없음');
  });

  it('ISNUMBER / ISBLANK / ISTEXT / ISERROR / ISNA', () => {
    expect(evaluate('ISNUMBER(42)')).toBe('TRUE');
    expect(evaluate('ISNUMBER("hi")')).toBe('FALSE');
    // v1 한계: 빈 셀 ref 는 evaluator 가 0 으로 해석 → ISBLANK 는 리터럴/문자열 평가만 신뢰.
    expect(evaluate('ISBLANK("")')).toBe('TRUE');
    expect(evaluate('ISBLANK("x")')).toBe('FALSE');
    expect(evaluate('ISTEXT("hello")')).toBe('TRUE');
    expect(evaluate('ISTEXT(7)')).toBe('FALSE');
    expect(evaluate('ISNA(IFNA("#N/A", "x"))')).toBe('FALSE');
  });
});

describe('formula — 분기', () => {
  it('IFS — 차례로 검사', () => {
    expect(evaluate('IFS(FALSE, "a", TRUE, "b", TRUE, "c")')).toBe('b');
    expect(evaluate('IFS(FALSE, "a", FALSE, "b")')).toBe('#N/A');
  });

  it('SWITCH — 일치하는 케이스', () => {
    expect(evaluate('SWITCH(2, 1, "one", 2, "two", "default")')).toBe('two');
    expect(evaluate('SWITCH(9, 1, "one", 2, "two", "default")')).toBe('default');
    expect(evaluate('SWITCH(9, 1, "one")')).toBe('#N/A');
  });
});

describe('formula — XLOOKUP', () => {
  it('lookup + 반환 범위 분리', () => {
    expect(evaluate('XLOOKUP("b", A1:A3, B1:B3)', {
      A1: 'a', B1: '1',
      A2: 'b', B2: '2',
      A3: 'c', B3: '3',
    })).toBe('2');
  });

  it('못 찾으면 기본값 "#N/A"', () => {
    expect(evaluate('XLOOKUP("z", A1:A2, B1:B2)', {
      A1: 'a', B1: '1', A2: 'b', B2: '2',
    })).toBe('#N/A');
  });

  it('not_found 인자 사용', () => {
    expect(evaluate('XLOOKUP("z", A1:A2, B1:B2, "없어요")', {
      A1: 'a', B1: '1', A2: 'b', B2: '2',
    })).toBe('없어요');
  });
});

describe('formula — Excel-compatible lookup ranges', () => {
  it('VLOOKUP infers the table width from a standard range', () => {
    expect(evaluate('VLOOKUP("b", A1:C3, 3, FALSE)', {
      A1: 'a', B1: 'red', C1: '10',
      A2: 'b', B2: 'blue', C2: '20',
      A3: 'c', B3: 'green', C3: '30',
    })).toBe('20');
  });

  it('HLOOKUP infers the table width from a standard range', () => {
    expect(evaluate('HLOOKUP("Q2", A1:C3, 3, FALSE)', {
      A1: 'Q1', B1: 'Q2', C1: 'Q3',
      A2: '10', B2: '20', C2: '30',
      A3: '11', B3: '22', C3: '33',
    })).toBe('22');
  });

  it('VLOOKUP and HLOOKUP support Excel approximate range lookup', () => {
    expect(evaluate('VLOOKUP(25, A1:C3, 3)', {
      A1: '10', B1: 'basic', C1: 'low',
      A2: '20', B2: 'plus', C2: 'mid',
      A3: '30', B3: 'pro', C3: 'high',
    })).toBe('mid');
    expect(evaluate('HLOOKUP(25, A1:C3, 3)', {
      A1: '10', B1: '20', C1: '30',
      A2: 'basic', B2: 'plus', C2: 'pro',
      A3: 'low', B3: 'mid', C3: 'high',
    })).toBe('mid');
  });

  it('LOOKUP supports approximate vector lookup with optional result vector', () => {
    expect(evaluate('LOOKUP(25, A1:A3, B1:B3)', {
      A1: '10', B1: 'low',
      A2: '20', B2: 'mid',
      A3: '30', B3: 'high',
    })).toBe('mid');
    expect(evaluate('LOOKUP(25, A1:A3)', {
      A1: '10',
      A2: '20',
      A3: '30',
    })).toBe('20');
    expect(evaluate('LOOKUP("blueberry", A1:A3, B1:B3)', {
      A1: 'apple', B1: 'A',
      A2: 'blue', B2: 'B',
      A3: 'carrot', B3: 'C',
    })).toBe('B');
  });

  it('INDEX supports row and column arguments on a rectangular range', () => {
    expect(evaluate('INDEX(A1:C3, 2, 3)', {
      A1: 'a', B1: 'b', C1: 'c',
      A2: 'd', B2: 'e', C2: 'f',
      A3: 'g', B3: 'h', C3: 'i',
    })).toBe('f');
  });

  it('XMATCH supports exact and nearest numeric matches', () => {
    const ctx = { A1: '10', A2: '20', A3: '30' };
    expect(evaluate('XMATCH(20, A1:A3)', ctx)).toBe('2');
    expect(evaluate('XMATCH(25, A1:A3, 1)', ctx)).toBe('3');
    expect(evaluate('XMATCH(25, A1:A3, -1)', ctx)).toBe('2');
  });

  it('MATCH supports Excel match_type modes and XMATCH wildcard/reverse search', () => {
    const ctx = { A1: '10', A2: '20', A3: '30', B1: 'alpha', B2: 'beta', B3: 'beta', B4: 'b*literal' };
    expect(evaluate('MATCH(25, A1:A3)', ctx)).toBe('2');
    expect(evaluate('MATCH(25, A1:A3, -1)', ctx)).toBe('3');
    expect(evaluate('MATCH(20, A1:A3, 0)', ctx)).toBe('2');
    expect(evaluate('XMATCH("b*", B1:B3, 2)', ctx)).toBe('2');
    expect(evaluate('XMATCH("beta", B1:B3, 0, -1)', ctx)).toBe('3');
    expect(evaluate('XMATCH("b~*literal", B1:B4, 2)', ctx)).toBe('4');
  });

  it('ROWS/COLUMNS and ROW/COLUMN use range metadata', () => {
    expect(evaluate('ROWS(B2:D5)')).toBe('4');
    expect(evaluate('COLUMNS(B2:D5)')).toBe('3');
    expect(evaluate('ROW(B2:D5)')).toBe('2');
    expect(evaluate('COLUMN(B2:D5)')).toBe('2');
    expect(evalCell('C7', { C7: '=ROW()+COLUMN()' })).toBe('10');
  });

  it('resolves Excel table structured references', () => {
    const cells: Cells = {
      A1: 'Name', B1: 'Score', C1: 'Adjusted',
      A2: 'Ada', B2: '10', C2: '=[@Score]*2',
      A3: 'Lin', B3: '20', C3: '=Table1[@Score]+5',
      D1: '=SUM(Table1[Score])',
      D2: '=ROWS(Table1[#Data])',
      D3: '=COLUMNS(Table1[#All])',
      D4: '=INDEX(Table1[[#All],[Score]],1)',
      D5: '=Table1[[#This Row],[Score]]',
      D6: '=SUM(Table1[[Score]:[Adjusted]])',
      D7: '=SUM(Table1[[#Data],[Score]:[Adjusted]])',
      D8: '=COLUMNS(Table1[[#Headers],[Score]:[Adjusted]])',
      D9: '=SUM([@[Score]:[Adjusted]])',
    };
    const ctx = {
      currentName: 'Sheet1',
      tables: {
        Sheet1: [{
          name: 'Table1',
          ref: 'A1:C3',
          headerRow: true,
          totalsRow: false,
          columns: [{ name: 'Name' }, { name: 'Score' }, { name: 'Adjusted' }],
        }],
      },
    };
    expect(evalCell('C2', cells, ctx)).toBe('20');
    expect(evalCell('C3', cells, ctx)).toBe('25');
    expect(evalCell('D1', cells, ctx)).toBe('30');
    expect(evalCell('D2', cells, ctx)).toBe('2');
    expect(evalCell('D3', cells, ctx)).toBe('3');
    expect(evalCell('D4', cells, ctx)).toBe('Score');
    expect(evalCell('D5', cells, ctx)).toBe('#ERROR');
    expect(evalCell('D6', cells, ctx)).toBe('75');
    expect(evalCell('D7', cells, ctx)).toBe('75');
    expect(evalCell('D8', cells, ctx)).toBe('2');
    expect(evalCell('D9', cells, ctx)).toBe('#ERROR');
  });

  it('resolves current-row Excel table column ranges', () => {
    const cells: Cells = {
      A1: 'Name', B1: 'Score', C1: 'Adjusted', D1: 'Total',
      A2: 'Ada', B2: '10', C2: '20', D2: '=SUM([@[Score]:[Adjusted]])',
    };
    const ctx = {
      currentName: 'Sheet1',
      tables: {
        Sheet1: [{
          name: 'Table1',
          ref: 'A1:D2',
          headerRow: true,
          totalsRow: false,
          columns: [{ name: 'Name' }, { name: 'Score' }, { name: 'Adjusted' }, { name: 'Total' }],
        }],
      },
    };
    expect(evalCell('D2', cells, ctx)).toBe('30');
  });
});

describe('formula — shared evaluation cache', () => {
  it('memoizes formula results during a calculation pass', () => {
    const cells: Cells = {
      A1: '10',
      A2: '=A1*2',
      A3: '=A2+5',
      B1: '=A3+A2',
    };
    const formulaCache = new Map<string, string>();
    expect(evalCell('B1', cells, { formulaCache })).toBe('45');
    expect(formulaCache.get('__default__!A2')).toBe('20');
    expect(formulaCache.get('__default__!A3')).toBe('25');
    expect(formulaCache.get('__default__!B1')).toBe('45');
  });

  it('keeps circular references guarded while caching completed formulas', () => {
    const formulaCache = new Map<string, string>();
    expect(evalCell('A1', { A1: '=A2+1', A2: '=A1+1' }, { formulaCache })).toBe('2');
    expect(formulaCache.has('__default__!A1')).toBe(false);
    expect(formulaCache.has('__default__!A2')).toBe(false);
  });
});

describe('formula — 텍스트', () => {
  it('TEXTJOIN — 빈값 무시', () => {
    expect(evaluate('TEXTJOIN(",", TRUE, "a", "", "b", "c")')).toBe('a,b,c');
    expect(evaluate('TEXTJOIN(",", FALSE, "a", "", "b")')).toBe('a,,b');
  });

  it('SUBSTITUTE — 전체/N번째', () => {
    expect(evaluate('SUBSTITUTE("a.b.c", ".", "-")')).toBe('a-b-c');
    expect(evaluate('SUBSTITUTE("a.b.c", ".", "-", 2)')).toBe('a.b-c');
  });

  it('REPLACE — 위치 기반', () => {
    expect(evaluate('REPLACE("Hello", 2, 3, "XX")')).toBe('HXXo');
  });

  it('FIND vs SEARCH — 대소문자', () => {
    expect(evaluate('FIND("l", "Hello")')).toBe('3');     // 케이스 일치
    expect(evaluate('FIND("L", "Hello")')).toBe('#VALUE!'); // 대문자 L 없음 (case-sensitive)
    expect(evaluate('SEARCH("L", "Hello")')).toBe('3');    // 케이스 무시
  });

  it('TEXTBEFORE and TEXTAFTER support Excel 365 delimiter extraction', () => {
    expect(evaluate('TEXTBEFORE("team-east-2026", "-")')).toBe('team');
    expect(evaluate('TEXTAFTER("team-east-2026", "-")')).toBe('east-2026');
    expect(evaluate('TEXTBEFORE("team-east-2026", "-", 2)')).toBe('team-east');
    expect(evaluate('TEXTAFTER("team-east-2026", "-", -1)')).toBe('2026');
    expect(evaluate('TEXTBEFORE("Alpha/Beta", "beta", 1, 1)')).toBe('Alpha/');
    expect(evaluate('TEXTBEFORE("Alpha/Beta", "/",,1)')).toBe('Alpha');
    expect(evaluate('TEXTAFTER("Alpha/Beta", "/",,1)')).toBe('Beta');
    expect(evaluate('TEXTAFTER("abc", "-", 1, 0, FALSE, "missing")')).toBe('missing');
    expect(evaluate('TEXTBEFORE("abc", "-", 1, 0, TRUE)')).toBe('abc');
    expect(evaluate('TEXTAFTER("abc", "-", 0)')).toBe('#N/A');
  });

  it('HYPERLINK v2 (PR #6) — sentinel + JSON 페이로드', () => {
    // 라벨 있음
    const a = evaluate('HYPERLINK("https://x", "X")');
    expect(a.startsWith('__CLOUDSHEET_LINK__:')).toBe(true);
    const p1 = JSON.parse(a.slice('__CLOUDSHEET_LINK__:'.length));
    expect(p1).toEqual({ url: 'https://x', label: 'X' });

    // 라벨 없으면 URL 자체가 라벨
    const b = evaluate('HYPERLINK("https://y")');
    const p2 = JSON.parse(b.slice('__CLOUDSHEET_LINK__:'.length));
    expect(p2).toEqual({ url: 'https://y', label: 'https://y' });

    // 빈 URL → 에러
    expect(evaluate('HYPERLINK("")')).toBe('#VALUE!');
  });

  it('HYPERLINK 보안 — 위험 스킴 차단', () => {
    expect(evaluate('HYPERLINK("javascript:alert(1)")')).toBe('#REF!');
    expect(evaluate('HYPERLINK("vbscript:msgbox")')).toBe('#REF!');
    expect(evaluate('HYPERLINK("data:text/html,<script>")')).toBe('#REF!');
    expect(evaluate('HYPERLINK("file:///C:/secret.txt")')).toBe('#REF!');
    expect(evaluate('HYPERLINK("ftp://example.com/file")')).toBe('#REF!');
  });

  it('IMAGE 보안 — 안전한 이미지 소스만 sentinel로 반환', () => {
    expect(evaluate('IMAGE("https://example.com/a.png")')).toBe('__CLOUDSHEET_IMAGE__:https://example.com/a.png');
    expect(evaluate('IMAGE("file:///C:/secret.png")')).toBe('#REF!');
    expect(evaluate('IMAGE("ftp://example.com/a.png")')).toBe('#REF!');
    expect(evaluate('IMAGE("data:text/html,<script>")')).toBe('#REF!');
    expect(evaluate('IMAGE("data:image/svg+xml,<svg/>")')).toBe('#REF!');
  });
});

describe('formula — 수치', () => {
  it('ROUNDUP / ROUNDDOWN', () => {
    expect(evaluate('ROUNDUP(2.34, 1)')).toBe('2.4');
    expect(evaluate('ROUNDUP(-2.34, 1)')).toBe('-2.4');
    expect(evaluate('ROUNDDOWN(2.99, 0)')).toBe('2');
    expect(evaluate('ROUNDDOWN(-2.99, 0)')).toBe('-2');
  });

  it('CEILING / FLOOR — 배수', () => {
    expect(evaluate('CEILING(23, 10)')).toBe('30');
    expect(evaluate('FLOOR(23, 10)')).toBe('20');
  });

  it('PRODUCT / SUMPRODUCT / CHOOSE', () => {
    expect(evaluate('PRODUCT(A1:A3)', { A1: '2', A2: '3', A3: '4' })).toBe('24');
    expect(evaluate('SUMPRODUCT(A1:A3, B1:B3)', {
      A1: '2', A2: '3', A3: '4',
      B1: '10', B2: '20', B3: '30',
    })).toBe('200');
    expect(evaluate('CHOOSE(2, "red", "blue", "green")')).toBe('blue');
  });

  it('SUBTOTAL supports Excel aggregate function numbers', () => {
    const ctx: Cells = { A1: '10', A2: '20', A3: 'text', A4: '', A5: '30' };
    expect(evaluate('SUBTOTAL(9, A1:A5)', ctx)).toBe('60');
    expect(evaluate('SUBTOTAL(109, A1:A5)', ctx)).toBe('60');
    expect(evaluate('SUBTOTAL(1, A1:A5)', ctx)).toBe('20');
    expect(evaluate('SUBTOTAL(2, A1:A5)', ctx)).toBe('3');
    expect(evaluate('SUBTOTAL(3, A1:A5)', ctx)).toBe('4');
    expect(evaluate('SUBTOTAL(4, A1:A5)', ctx)).toBe('30');
    expect(evaluate('SUBTOTAL(5, A1:A5)', ctx)).toBe('10');
    expect(evaluate('SUBTOTAL(6, A1:A3)', { A1: '2', A2: '3', A3: '4' })).toBe('24');
  });

  it('SUBTOTAL returns Excel-like errors for invalid or empty aggregates', () => {
    expect(evaluate('SUBTOTAL(99, A1:A2)', { A1: '1', A2: '2' })).toBe('#VALUE!');
    expect(evaluate('SUBTOTAL(1, A1:A2)', { A1: '', A2: 'text' })).toBe('#DIV/0!');
  });

  it('COUNTA / COUNTBLANK', () => {
    expect(evaluate('COUNTA(A1:A4)', { A1: 'x', A2: '', A3: '0', A4: 'y' })).toBe('3');
    expect(evaluate('COUNTBLANK(A1:A4)', { A1: 'x', A2: '', A3: '0', A4: 'y' })).toBe('1');
  });
});

describe('formula — 통계', () => {
  it('STDEV (표본 표준편차)', () => {
    // [2,4,4,4,5,5,7,9] → 표본 표준편차 ≈ 2.138
    expect(Number(evaluate('STDEV(A1:A8)', {
      A1: '2', A2: '4', A3: '4', A4: '4', A5: '5', A6: '5', A7: '7', A8: '9',
    }))).toBeCloseTo(2.138, 2);
  });

  it('VAR (표본 분산)', () => {
    expect(Number(evaluate('VAR(A1:A4)', { A1: '1', A2: '2', A3: '3', A4: '4' }))).toBeCloseTo(1.667, 2);
  });

  it('RANK — 내림차순 (기본) / 오름차순', () => {
    const ctx: Cells = { A1: '10', A2: '30', A3: '20', A4: '40' };
    expect(evaluate('RANK(30, A1:A4)', ctx)).toBe('2');   // 40,30,20,10
    expect(evaluate('RANK(30, A1:A4, 1)', ctx)).toBe('3'); // 10,20,30,40
  });
});

describe('formula — 날짜', () => {
  it('DATE — 만들기', () => {
    expect(evaluate('DATE(2026, 5, 11)')).toBe('2026-05-11');
  });

  it('WEEKDAY supports Excel return_type modes', () => {
    expect(evaluate('WEEKDAY("2026-05-10")')).toBe('1');
    expect(evaluate('WEEKDAY("2026-05-10", 2)')).toBe('7');
    expect(evaluate('WEEKDAY("2026-05-10", 3)')).toBe('6');
    expect(evaluate('WEEKDAY("2026-05-10", 12)')).toBe('6');
    expect(evaluate('WEEKDAY("2026-05-10", 99)')).toBe('#NUM!');
  });

  it('WEEKNUM and ISOWEEKNUM support Excel week numbering', () => {
    expect(evaluate('WEEKNUM("2026-01-01")')).toBe('1');
    expect(evaluate('WEEKNUM("2026-01-04")')).toBe('2');
    expect(evaluate('WEEKNUM("2026-01-04", 2)')).toBe('1');
    expect(evaluate('WEEKNUM("2026-01-04", 21)')).toBe('1');
    expect(evaluate('ISOWEEKNUM("2026-01-04")')).toBe('1');
    expect(evaluate('ISOWEEKNUM("2021-01-01")')).toBe('53');
    expect(evaluate('WEEKNUM("2026-01-01", 99)')).toBe('#NUM!');
  });

  it('TIME, HOUR, MINUTE, and SECOND support Excel time serials', () => {
    expect(evaluate('TIME(12, 0, 0)')).toBe('0.5');
    expect(evaluate('TIME(25, 0, 0)')).toBe('0.041667');
    expect(evaluate('HOUR(TIME(13, 5, 9))')).toBe('13');
    expect(evaluate('MINUTE(TIME(13, 5, 9))')).toBe('5');
    expect(evaluate('SECOND(TIME(13, 5, 9))')).toBe('9');
    expect(evaluate('HOUR("1:05:09 PM")')).toBe('13');
    expect(evaluate('MINUTE("2026-05-11T09:07:03")')).toBe('7');
    expect(evaluate('SECOND("not a time")')).toBe('#VALUE!');
    expect(evaluate('TIMEVALUE("1:05:09 PM")')).toBe('0.545243');
    expect(evaluate('HOUR(TIMEVALUE("23:15:10"))')).toBe('23');
    expect(evaluate('TIMEVALUE("not a time")')).toBe('#VALUE!');
  });

  it('EOMONTH — 월말', () => {
    expect(evaluate('EOMONTH("2026-05-11", 0)')).toBe('2026-05-31');
    expect(evaluate('EOMONTH("2026-05-11", 1)')).toBe('2026-06-30');
    expect(evaluate('EOMONTH("2026-01-31", 1.9)')).toBe('2026-02-28');
  });

  it('EDATE — N개월 후 같은 날', () => {
    expect(evaluate('EDATE("2026-01-15", 3)')).toBe('2026-04-15');
    expect(evaluate('EDATE("2026-01-31", 1)')).toBe('2026-02-28');
    expect(evaluate('EDATE("2024-01-31", 1)')).toBe('2024-02-29');
    expect(evaluate('EDATE("2026-03-31", -1)')).toBe('2026-02-28');
  });

  it('DATEDIF — Y/M/D 단위', () => {
    expect(evaluate('DATEDIF("2024-05-11", "2026-05-11", "Y")')).toBe('2');
    expect(evaluate('DATEDIF("2026-01-01", "2026-05-11", "M")')).toBe('4');
    expect(evaluate('DATEDIF("2026-05-01", "2026-05-11", "D")')).toBe('10');
    expect(evaluate('DATEDIF("2024-01-15", "2026-05-20", "YM")')).toBe('4');
    expect(evaluate('DATEDIF("2024-05-11", "2026-06-20", "YD")')).toBe('40');
    expect(evaluate('DATEDIF("2026-01-31", "2026-03-05", "MD")')).toBe('5');
    expect(evaluate('DATEDIF("2026-05-11", "2026-01-01", "D")')).toBe('#NUM!');
  });

  it('DAYS360 supports US and European 30/360 methods', () => {
    expect(evaluate('DAYS360("2026-01-31", "2026-02-28")')).toBe('28');
    expect(evaluate('DAYS360("2026-02-28", "2026-03-31")')).toBe('30');
    expect(evaluate('DAYS360("2026-01-31", "2026-02-28", TRUE)')).toBe('28');
    expect(evaluate('DAYS360(DATEVALUE("2026-01-15"), DATEVALUE("2026-02-15"))')).toBe('30');
  });

  it('YEARFRAC supports common Excel day-count bases', () => {
    expect(evaluate('YEARFRAC("2026-01-01", "2026-07-01", 0)')).toBe('0.5');
    expect(evaluate('ROUND(YEARFRAC("2024-01-01", "2025-01-01", 1), 6)')).toBe('1');
    expect(evaluate('YEARFRAC("2026-01-01", "2026-07-01", 2)')).toBe('0.502778');
    expect(evaluate('YEARFRAC("2026-01-01", "2026-07-01", 3)')).toBe('0.49589');
    expect(evaluate('YEARFRAC("2026-01-31", "2026-02-28", 4)')).toBe('0.077778');
    expect(evaluate('YEARFRAC("2026-01-01", "2026-07-01", 9)')).toBe('#NUM!');
  });

  it('supports core Excel financial functions', () => {
    expect(evaluate('ROUND(PMT(0.05/12, 60, 10000), 2)')).toBe('-188.71');
    expect(evaluate('ROUND(PV(0.05/12, 60, PMT(0.05/12, 60, 10000)), 2)')).toBe('10000');
    expect(evaluate('ROUND(FV(0.05/12, 60, PMT(0.05/12, 60, 10000)), 2)')).toBe('12833.59');
    expect(evaluate('ROUND(NPV(0.1, 100, 100, 100), 2)')).toBe('248.69');
    expect(evaluate('PMT(0, 10, 1000)')).toBe('-100');
    expect(evaluate('ROUND(IPMT(0.05/12, 1, 60, 10000), 2)')).toBe('-41.67');
    expect(evaluate('ROUND(PPMT(0.05/12, 1, 60, 10000), 2)')).toBe('-147.05');
    expect(evaluate('ROUND(IPMT(0.05/12, 1, 60, 10000) + PPMT(0.05/12, 1, 60, 10000), 2)')).toBe('-188.71');
    expect(evaluate('IPMT(0.05/12, 1, 60, 10000, 0, 1)')).toBe('0');
    expect(evaluate('IPMT(0.05/12, 61, 60, 10000)')).toBe('#NUM!');
  });

  it('NETWORKDAYS — 주말 제외', () => {
    // 2026-05-04(월) ~ 2026-05-08(금) = 5일
    expect(evaluate('NETWORKDAYS("2026-05-04", "2026-05-08")')).toBe('5');
    // 2026-05-04(월) ~ 2026-05-10(일) = 5일 (월~금만)
    expect(evaluate('NETWORKDAYS("2026-05-04", "2026-05-10")')).toBe('5');
    expect(evaluate('NETWORKDAYS("2026-05-04", "2026-05-08", A1:A2)', {
      A1: '2026-05-05',
      A2: '2026-05-06',
    })).toBe('3');
    expect(evaluate('NETWORKDAYS("2026-05-08", "2026-05-04")')).toBe('-5');
  });

  it('WORKDAY skips weekends and optional holidays', () => {
    expect(evaluate('WORKDAY("2026-05-08", 1)')).toBe('2026-05-11');
    expect(evaluate('WORKDAY("2026-05-04", 3, A1:A1)', {
      A1: '2026-05-06',
    })).toBe('2026-05-08');
    expect(evaluate('WORKDAY("2026-05-11", -1)')).toBe('2026-05-08');
  });

  it('NETWORKDAYS.INTL and WORKDAY.INTL support custom weekends', () => {
    expect(evaluate('NETWORKDAYS.INTL("2026-05-04", "2026-05-10", 11)')).toBe('6');
    expect(evaluate('NETWORKDAYS.INTL("2026-05-04", "2026-05-10", "0000110", A1:A1)', {
      A1: '2026-05-07',
    })).toBe('4');
    expect(evaluate('WORKDAY.INTL("2026-05-08", 1, 11)')).toBe('2026-05-09');
    expect(evaluate('WORKDAY.INTL("2026-05-08", 1, "0000110")')).toBe('2026-05-10');
  });
});

describe('formula — TEXT 포맷', () => {
  it('날짜 포맷', () => {
    expect(evaluate('TEXT("2026-05-11", "yyyy/mm/dd")')).toBe('2026/05/11');
    expect(evaluate('TEXT("2026-05-11", "yy-mm-dd")')).toBe('26-05-11');
  });

  it('숫자 포맷 — 천단위 + 소수', () => {
    expect(evaluate('TEXT(1234567.89, "#,##0.00")')).toBe('1,234,567.89');
    expect(evaluate('TEXT(1234, "#,##0")')).toBe('1,234');
  });
});

describe('formula — 정규표현식', () => {
  it('REGEXMATCH', () => {
    expect(evaluate('REGEXMATCH("hello123", "[0-9]+")')).toBe('TRUE');
    expect(evaluate('REGEXMATCH("hello", "[0-9]+")')).toBe('FALSE');
  });

  it('REGEXEXTRACT — 첫 그룹 또는 전체 매칭', () => {
    expect(evaluate('REGEXEXTRACT("order-123-abc", "[0-9]+")')).toBe('123');
    expect(evaluate('REGEXEXTRACT("price 9900원", "(\\d+)원")')).toBe('9900');
  });

  it('REGEXREPLACE', () => {
    expect(evaluate('REGEXREPLACE("a1b2c3", "[0-9]", "_")')).toBe('a_b_c_');
  });

  it('잘못된 패턴은 에러', () => {
    expect(evaluate('REGEXMATCH("x", "[")')).toBe('#ERROR!');
  });
});

describe('formula — 회귀 (기존)', () => {
  it('SUM/AVG/IF 기존 동작 유지', () => {
    expect(evaluate('SUM(1, 2, 3)')).toBe('6');
    expect(evaluate('AVG(2, 4, 6)')).toBe('4');
    expect(evaluate('IF(1 > 0, "y", "n")')).toBe('y');
  });

  it('AVERAGE 별칭은 AVG 와 동일', () => {
    expect(evaluate('AVERAGE(2, 4, 6)')).toBe('4');
  });

  it('새 함수와 기존 함수 조합', () => {
    expect(evaluate('IFERROR(SUM(A1:A3) / COUNT(A1:A3), 0)', {
      A1: '10', A2: '20', A3: '30',
    })).toBe('20');
  });
});

describe('formula — evaluator sandbox', () => {
  it('blocks direct JavaScript execution escapes', () => {
    expect(evaluate('(()=>{return 1})()')).toBe('#ERROR');
    expect(evaluate('globalThis.alert(1)')).toBe('#ERROR');
    expect(evaluate('__sum.constructor("return 7")()')).toBe('#ERROR');
  });

  it('keeps normal spreadsheet formulas working', () => {
    expect(evaluate('IF(1 > 0, "y", "n")')).toBe('y');
    expect(evaluate('SUM(A1:A2)', { A1: '2', A2: '3' })).toBe('5');
  });
});
