/**
 * 수식 안 셀 참조를 행/열 shift 에 따라 자동 보정.
 *
 * 예:
 *   shiftFormulaRow('=A5+B6', 4, +1)  → '=A6+B7'   (4행 이상이 +1)
 *   shiftFormulaCol('=B5*2',   1, -1) → '=A5*2'    (B(1) 이상 col 이 -1)
 *   shiftFormulaRow('=A5+B6', 4, -1)  → '=#REF!+B5' (삭제된 4행 참조는 #REF!)
 *
 * 처리 범위:
 *  - 단일 셀 ref (A1, AA10)
 *  - 범위 ref (A1:B5)
 *  - cross-sheet (Sheet1!A1, 'My Sheet'!B2:D5) — 다른 시트의 ref 는 shift X
 *    (현재 시트만 영향)
 *
 * 한계 (v1):
 *  - 절대 참조 ($A$1) 미지원 — 모두 상대로 취급
 *  - 명명된 범위 미지원
 *  - 함수명 안 들어간 "A1" 토큰만 매칭 (formula.ts 와 동일 규칙)
 */

import { colToIdx, idxToCol } from './formula';

type Axis = 'row' | 'col';

/**
 * @param raw 수식 문자열 ('=' 포함 또는 미포함). '=' 로 시작하면 그대로,
 *            아니면 단순 텍스트로 보고 변경 없이 반환.
 * @param at  insert/delete 가 일어난 위치 (0-based). axis='row' 면 row 번호,
 *            'col' 면 col 번호.
 * @param delta +1=삽입, -1=삭제 (n행 삽입/삭제 N번 호출).
 * @param currentSheetName 현재 시트 이름. cross-sheet ref 가 다른 시트면 skip.
 */
export function shiftFormula(
  raw: string,
  axis: Axis,
  at: number,
  delta: number,
  currentSheetName?: string,
): string {
  if (!raw.startsWith('=')) return raw;
  // 단일 셀과 범위 모두 같은 transform 함수로 처리. 단일은 c2/r2 가 c1/r1 와 동일.
  // 처리 순서: 범위 먼저 (긴 패턴), 그 다음 단일
  let work = raw.slice(1);
  // 범위 + sheet prefix 옵셔널
  work = work.replace(
    /(?<![A-Za-z_0-9])(?:('[^']+'|[A-Za-z]\w*)!)?([A-Z]+)(\d+):([A-Z]+)(\d+)/g,
    (_m, sheetRaw, c1, r1, c2, r2) => {
      const sheetName = sheetRaw ? String(sheetRaw).replace(/^'|'$/g, '') : undefined;
      // 다른 시트 ref 면 skip
      if (sheetName && currentSheetName && sheetName !== currentSheetName) {
        return _m;
      }
      const result = shiftRange(c1, r1, c2, r2, axis, at, delta);
      return sheetRaw ? `${sheetRaw}!${result}` : result;
    },
  );
  // 단일 셀 (범위 매칭 후 남은 것만)
  work = work.replace(
    /(?<![A-Za-z_0-9:])(?:('[^']+'|[A-Za-z]\w*)!)?([A-Z]+)(\d+)\b(?!:)/g,
    (_m, sheetRaw, c, r) => {
      const sheetName = sheetRaw ? String(sheetRaw).replace(/^'|'$/g, '') : undefined;
      if (sheetName && currentSheetName && sheetName !== currentSheetName) {
        return _m;
      }
      const result = shiftSingle(c, r, axis, at, delta);
      return sheetRaw ? `${sheetRaw}!${result}` : result;
    },
  );
  return `=${work}`;
}

function shiftSingle(col: string, row: string, axis: Axis, at: number, delta: number): string {
  const cIdx = colToIdx(col);
  const rIdx = Number(row) - 1;
  if (axis === 'row') {
    if (delta < 0 && rIdx === at) return '#REF!';
    const newR = rIdx >= at ? rIdx + delta : rIdx;
    if (newR < 0) return '#REF!';
    return `${col}${newR + 1}`;
  }
  // col
  if (delta < 0 && cIdx === at) return '#REF!';
  const newC = cIdx >= at ? cIdx + delta : cIdx;
  if (newC < 0) return '#REF!';
  return `${idxToCol(newC)}${row}`;
}

function shiftRange(
  c1: string, r1: string, c2: string, r2: string,
  axis: Axis, at: number, delta: number,
): string {
  const cIdx1 = colToIdx(c1);
  const cIdx2 = colToIdx(c2);
  const rIdx1 = Number(r1) - 1;
  const rIdx2 = Number(r2) - 1;
  if (axis === 'row') {
    let n1 = rIdx1 >= at ? rIdx1 + delta : rIdx1;
    let n2 = rIdx2 >= at ? rIdx2 + delta : rIdx2;
    // 삭제된 행이 범위의 한쪽 끝이면 범위 축소
    if (delta < 0) {
      // 삭제 행이 범위 안 — 범위 축소
      if (at >= rIdx1 && at <= rIdx2) n2 = Math.max(n1, rIdx2 + delta);
    }
    if (n1 > n2 || n2 < 0) return '#REF!';
    if (n1 < 0) n1 = 0;
    return `${c1}${n1 + 1}:${c2}${n2 + 1}`;
  }
  // col
  let n1 = cIdx1 >= at ? cIdx1 + delta : cIdx1;
  let n2 = cIdx2 >= at ? cIdx2 + delta : cIdx2;
  if (delta < 0) {
    if (at >= cIdx1 && at <= cIdx2) n2 = Math.max(n1, cIdx2 + delta);
  }
  if (n1 > n2 || n2 < 0) return '#REF!';
  if (n1 < 0) n1 = 0;
  return `${idxToCol(n1)}${r1}:${idxToCol(n2)}${r2}`;
}

/**
 * 편의: cells map 전체에 대해 수식 shift.
 *  - 이 함수는 ref 의 *위치* 가 아니라 *값* (수식) 만 변환.
 *  - cells 자체의 ref shift (예: B5 셀이 B6 으로 이동) 는 별도로 처리해야 함.
 */
export function shiftFormulasInCells(
  cells: Record<string, string>,
  axis: Axis,
  at: number,
  delta: number,
  currentSheetName?: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  let changed = false;
  for (const [ref, raw] of Object.entries(cells)) {
    if (!raw.startsWith('=')) {
      out[ref] = raw;
      continue;
    }
    const shifted = shiftFormula(raw, axis, at, delta, currentSheetName);
    if (shifted !== raw) changed = true;
    out[ref] = shifted;
  }
  return changed ? out : cells;
}
