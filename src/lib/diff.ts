/**
 * 가벼운 텍스트 diff — 줄 단위.
 *
 * 위키 history, 메모 변경 미리보기 등에 활용. 정밀 diff 는 별도 라이브러리 (잘 안 씀).
 * LCS 기반 — O(M*N) 메모리. 짧은 텍스트(<~10k 줄)에 적합.
 */

export type DiffOp = 'add' | 'remove' | 'same';

export interface DiffLine {
  op: DiffOp;
  text: string;
}

/** before/after 텍스트 → 줄 단위 diff. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const lcs = buildLcsTable(a, b);
  return walk(a, b, lcs);
}

function buildLcsTable(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      dp[i + 1][j + 1] = a[i] === b[j] ? dp[i][j] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

function walk(a: string[], b: string[], dp: number[][]): DiffLine[] {
  const out: DiffLine[] = [];
  let i = a.length, j = b.length;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      out.unshift({ op: 'same', text: a[i - 1] });
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      out.unshift({ op: 'remove', text: a[i - 1] });
      i--;
    } else {
      out.unshift({ op: 'add', text: b[j - 1] });
      j--;
    }
  }
  while (i > 0) { out.unshift({ op: 'remove', text: a[--i] }); }
  while (j > 0) { out.unshift({ op: 'add', text: b[--j] }); }
  return out;
}

/** 통계 요약 — UI 뱃지용 ('+3 -1'). */
export function diffStats(diff: DiffLine[]): { added: number; removed: number; same: number } {
  let added = 0, removed = 0, same = 0;
  for (const d of diff) {
    if (d.op === 'add') added++;
    else if (d.op === 'remove') removed++;
    else same++;
  }
  return { added, removed, same };
}
