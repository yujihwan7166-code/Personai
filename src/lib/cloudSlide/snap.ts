/**
 * 드래그 중 snap (정렬 가이드) — 순수 함수.
 *
 * 박스 위치 (nx, ny) 와 size (w, h), 다른 박스들의 anchor lines 가 주어졌을 때
 * 가장 가까운 라인을 찾아 snap 한 결과 + 표시할 가이드 라인 반환.
 *
 * threshold: 1% (캔버스 폭/높이 대비) 이내면 snap.
 */

export interface SnapResult {
  nx: number;
  ny: number;
  guides: Array<{ kind: 'h' | 'v'; pct: number }>;
}

export interface SnapInput {
  /** 박스 현재 좌상단 좌표 (0~100) */
  nx: number;
  ny: number;
  /** 박스 크기 (0~100) */
  w: number;
  h: number;
  /** snap 대상 수직 가이드 라인 (vLines) — 다른 박스들의 left/centerX/right + 캔버스 0/50/100 */
  vLines: readonly number[];
  /** snap 대상 수평 가이드 라인 (hLines) */
  hLines: readonly number[];
  /** snap 임계값 (% — 1.0 권장) */
  threshold?: number;
}

export function applySnap(input: SnapInput): SnapResult {
  const { w, h, vLines, hLines, threshold = 1.0 } = input;
  let { nx, ny } = input;
  const guides: Array<{ kind: 'h' | 'v'; pct: number }> = [];

  // 수직 가이드 — 박스의 left / centerX / right 가 vLines 중 하나에 가까운지
  const xAnchors = [
    { offset: 0, pct: nx },
    { offset: w / 2, pct: nx + w / 2 },
    { offset: w, pct: nx + w },
  ];
  let bestVDelta = Infinity;
  let bestVLine: number | null = null;
  let bestVAnchorOffset = 0;
  for (const a of xAnchors) {
    for (const line of vLines) {
      const d = Math.abs(a.pct - line);
      if (d < bestVDelta) {
        bestVDelta = d;
        bestVLine = line;
        bestVAnchorOffset = a.offset;
      }
    }
  }
  if (bestVDelta <= threshold && bestVLine !== null) {
    nx = Math.max(0, Math.min(100 - w, bestVLine - bestVAnchorOffset));
    guides.push({ kind: 'v', pct: bestVLine });
  }

  // 수평 가이드
  const yAnchors = [
    { offset: 0, pct: ny },
    { offset: h / 2, pct: ny + h / 2 },
    { offset: h, pct: ny + h },
  ];
  let bestHDelta = Infinity;
  let bestHLine: number | null = null;
  let bestHAnchorOffset = 0;
  for (const a of yAnchors) {
    for (const line of hLines) {
      const d = Math.abs(a.pct - line);
      if (d < bestHDelta) {
        bestHDelta = d;
        bestHLine = line;
        bestHAnchorOffset = a.offset;
      }
    }
  }
  if (bestHDelta <= threshold && bestHLine !== null) {
    ny = Math.max(0, Math.min(100 - h, bestHLine - bestHAnchorOffset));
    guides.push({ kind: 'h', pct: bestHLine });
  }

  return { nx, ny, guides };
}

/** 다른 박스들 → vLines/hLines 생성 (캔버스 0/50/100 포함). */
export function buildSnapLines(
  others: ReadonlyArray<{ xPct: number; yPct: number; wPct: number; hPct: number }>,
): { vLines: number[]; hLines: number[] } {
  const vLines: number[] = [0, 50, 100];
  const hLines: number[] = [0, 50, 100];
  for (const o of others) {
    vLines.push(o.xPct, o.xPct + o.wPct / 2, o.xPct + o.wPct);
    hLines.push(o.yPct, o.yPct + o.hPct / 2, o.yPct + o.hPct);
  }
  return { vLines, hLines };
}
