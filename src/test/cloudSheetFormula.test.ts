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
    expect(evaluate('IFNA(VLOOKUP(99, A1:B2, 2, 2), "없음")', {
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

  it('EOMONTH — 월말', () => {
    expect(evaluate('EOMONTH("2026-05-11", 0)')).toBe('2026-05-31');
    expect(evaluate('EOMONTH("2026-05-11", 1)')).toBe('2026-06-30');
  });

  it('EDATE — N개월 후 같은 날', () => {
    expect(evaluate('EDATE("2026-01-15", 3)')).toBe('2026-04-15');
  });

  it('DATEDIF — Y/M/D 단위', () => {
    expect(evaluate('DATEDIF("2024-05-11", "2026-05-11", "Y")')).toBe('2');
    expect(evaluate('DATEDIF("2026-01-01", "2026-05-11", "M")')).toBe('4');
    expect(evaluate('DATEDIF("2026-05-01", "2026-05-11", "D")')).toBe('10');
  });

  it('NETWORKDAYS — 주말 제외', () => {
    // 2026-05-04(월) ~ 2026-05-08(금) = 5일
    expect(evaluate('NETWORKDAYS("2026-05-04", "2026-05-08")')).toBe('5');
    // 2026-05-04(월) ~ 2026-05-10(일) = 5일 (월~금만)
    expect(evaluate('NETWORKDAYS("2026-05-04", "2026-05-10")')).toBe('5');
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
