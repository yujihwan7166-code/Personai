/** 수식 입력 시 참조된 셀 ref → 색 매핑 계산.
 *  현재 시트의 단일 셀·범위만 시각화 (다른 시트 ref 는 표시 X). */

import { cellRef } from './sheetUtils';
import { colToIdx } from './formula';

function parseSheetPrefix(sheetRaw: unknown): string | undefined {
  if (!sheetRaw) return undefined;
  const raw = String(sheetRaw);
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  return raw;
}

function maskFormulaStrings(src: string): string {
  let out = '';
  let inString = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (!inString) {
      if (ch === '"') {
        inString = true;
        out += '"';
      } else {
        out += ch;
      }
      continue;
    }

    if (ch === '"' && src[i + 1] === '"') {
      out += '  ';
      i++;
      continue;
    }
    if (ch === '"') {
      inString = false;
      out += '"';
      continue;
    }
    out += ' ';
  }

  return out;
}

/**
 * @param formulaExpr  수식 본문 (= 없이). 비어있거나 = 로 시작 안하면 빈 Map 반환을 호출자가 처리.
 * @param currentSheetName  현재 시트 이름 — 다른 시트 ref 는 skip.
 * @param palette  사용할 색 배열 — 순차적으로 라운드 로빈.
 */
export function buildFormulaRefHighlights(
  formulaExpr: string,
  currentSheetName: string,
  palette: readonly string[],
): Map<string, string> {
  const out = new Map<string, string>();
  if (!formulaExpr) return out;
  const scanExpr = maskFormulaStrings(formulaExpr);
  // 시트 prefix 가 있고 currentSheetName 과 다르면 skip 위해 prefix 추출
  const isOurSheet = (sheetRaw: string | undefined): boolean => {
    if (!sheetRaw) return true;
    const name = parseSheetPrefix(sheetRaw);
    return name === currentSheetName;
  };
  let colorIdx = 0;
  const assignColor = (key: string): string => {
    const existing = out.get(key);
    if (existing) return existing;
    const color = palette[colorIdx % palette.length];
    colorIdx++;
    return color;
  };
  // 범위 먼저
  const rangeRe = /(?:('(?:[^']|'')+'|[A-Za-z]\w*)!)?\$?([A-Z]+)\$?(\d+):(?:('(?:[^']|'')+'|[A-Za-z]\w*)!)?\$?([A-Z]+)\$?(\d+)/g;
  let m: RegExpExecArray | null;
  const consumed = new Set<string>();
  while ((m = rangeRe.exec(scanExpr)) !== null) {
    if (!isOurSheet(m[1] ?? m[4])) continue;
    const c1 = colToIdx(m[2]);
    const r1 = Number(m[3]) - 1;
    const c2 = colToIdx(m[5]);
    const r2 = Number(m[6]) - 1;
    const minR = Math.min(r1, r2);
    const maxR = Math.max(r1, r2);
    const minC = Math.min(c1, c2);
    const maxC = Math.max(c1, c2);
    const groupKey = `${m[2]}${m[3]}:${m[5]}${m[6]}`;
    const color = assignColor(groupKey);
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const ref = cellRef(r, c);
        out.set(ref, color);
        consumed.add(ref);
      }
    }
  }
  // 단일 셀 (범위 매칭 후 남은 것)
  const singleRe = /(?<![A-Za-z_0-9:$])(?:('(?:[^']|'')+'|[A-Za-z]\w*)!)?\$?([A-Z]+)\$?(\d+)\b(?!:)/g;
  while ((m = singleRe.exec(scanExpr)) !== null) {
    if (!isOurSheet(m[1])) continue;
    const ref = `${m[2]}${m[3]}`;
    if (consumed.has(ref)) continue;
    out.set(ref, assignColor(ref));
  }
  return out;
}
