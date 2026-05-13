/**
 * 화이트보드 — 스마트 정렬 가이드 + 스냅.
 *
 * 드래그·리사이즈 시 다른 요소의 가장자리·중심과
 * 일정 거리(world px) 이내면 스냅 후 가이드선 표시.
 */
import type { WBElement } from '@/types/whiteboard';

const SNAP_THRESHOLD = 6;  // world px (zoom 무관, 단순화)

export interface SnapResult {
  dx: number;       // 적용할 보정값 (world)
  dy: number;
  guides: Guide[];  // 표시할 가이드선
}

export interface Guide {
  axis: 'v' | 'h';  // vertical | horizontal
  pos: number;      // world 좌표 (v 면 x, h 면 y)
  from: number;     // 가이드선 시작점 (반대축)
  to: number;       // 가이드선 끝점
}

interface EdgeSet {
  x1: number; xC: number; x2: number;
  y1: number; yC: number; y2: number;
}

function edges(el: WBElement | { x: number; y: number; w: number; h: number }): EdgeSet {
  return {
    x1: el.x,
    xC: el.x + el.w / 2,
    x2: el.x + el.w,
    y1: el.y,
    yC: el.y + el.h / 2,
    y2: el.y + el.h,
  };
}

/**
 * 현재 드래그 중인 (dragRect) 에 대해 others 와의 스냅을 계산.
 * 스냅 가능하면 보정값(dx/dy) 과 가이드 반환.
 *
 * @param zoom 캔버스 zoom (스냅 threshold를 zoom과 무관하게 화면 px 기준으로 적용하려면 사용; 여기선 world px 기준 단순화)
 */
export function computeSnap(
  draggedBBox: { x: number; y: number; w: number; h: number },
  others: WBElement[],
  zoom: number,
): SnapResult {
  const threshold = SNAP_THRESHOLD / zoom;
  const dr = edges(draggedBBox);
  let bestDX: { delta: number; guide: Guide } | null = null;
  let bestDY: { delta: number; guide: Guide } | null = null;

  for (const ot of others) {
    if (ot.type === 'line' || ot.type === 'arrow' || ot.type === 'freedraw') continue;
    const oe = edges(ot);
    // 가로 정렬 (X 축 — 수직 가이드선)
    const xCandidates: Array<[number, number]> = [
      [dr.x1, oe.x1], [dr.x1, oe.xC], [dr.x1, oe.x2],
      [dr.xC, oe.x1], [dr.xC, oe.xC], [dr.xC, oe.x2],
      [dr.x2, oe.x1], [dr.x2, oe.xC], [dr.x2, oe.x2],
    ];
    for (const [d, o] of xCandidates) {
      const delta = o - d;
      if (Math.abs(delta) < threshold && (!bestDX || Math.abs(delta) < Math.abs(bestDX.delta))) {
        const from = Math.min(dr.y1, oe.y1) - 8 / zoom;
        const to = Math.max(dr.y2, oe.y2) + 8 / zoom;
        bestDX = {
          delta,
          guide: { axis: 'v', pos: o, from, to },
        };
      }
    }
    // 세로 정렬 (Y 축 — 수평 가이드선)
    const yCandidates: Array<[number, number]> = [
      [dr.y1, oe.y1], [dr.y1, oe.yC], [dr.y1, oe.y2],
      [dr.yC, oe.y1], [dr.yC, oe.yC], [dr.yC, oe.y2],
      [dr.y2, oe.y1], [dr.y2, oe.yC], [dr.y2, oe.y2],
    ];
    for (const [d, o] of yCandidates) {
      const delta = o - d;
      if (Math.abs(delta) < threshold && (!bestDY || Math.abs(delta) < Math.abs(bestDY.delta))) {
        const from = Math.min(dr.x1, oe.x1) - 8 / zoom;
        const to = Math.max(dr.x2, oe.x2) + 8 / zoom;
        bestDY = {
          delta,
          guide: { axis: 'h', pos: o, from, to },
        };
      }
    }
  }

  const guides: Guide[] = [];
  if (bestDX) guides.push(bestDX.guide);
  if (bestDY) guides.push(bestDY.guide);

  return {
    dx: bestDX?.delta ?? 0,
    dy: bestDY?.delta ?? 0,
    guides,
  };
}

// ──────────────────────────────────────────
// 정렬·분배 (다중 선택용)
export type AlignMode = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';
export type DistributeMode = 'horizontal' | 'vertical';

export function alignElements(elements: WBElement[], ids: Set<string>, mode: AlignMode): WBElement[] {
  const targets = elements.filter((el) => ids.has(el.id));
  if (targets.length < 2) return elements;
  // 기준: 모든 타겟의 union bbox
  const x1 = Math.min(...targets.map((el) => el.x));
  const y1 = Math.min(...targets.map((el) => el.y));
  const x2 = Math.max(...targets.map((el) => el.x + el.w));
  const y2 = Math.max(...targets.map((el) => el.y + el.h));
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  return elements.map((el) => {
    if (!ids.has(el.id)) return el;
    let nx = el.x;
    let ny = el.y;
    switch (mode) {
      case 'left':     nx = x1; break;
      case 'right':    nx = x2 - el.w; break;
      case 'center-h': nx = cx - el.w / 2; break;
      case 'top':      ny = y1; break;
      case 'bottom':   ny = y2 - el.h; break;
      case 'center-v': ny = cy - el.h / 2; break;
    }
    return { ...el, x: nx, y: ny, updatedAt: Date.now() };
  });
}

export function distributeElements(elements: WBElement[], ids: Set<string>, mode: DistributeMode): WBElement[] {
  const targets = elements.filter((el) => ids.has(el.id));
  if (targets.length < 3) return elements;
  const sorted = [...targets].sort((a, b) =>
    mode === 'horizontal' ? a.x + a.w / 2 - (b.x + b.w / 2) : a.y + a.h / 2 - (b.y + b.h / 2),
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const firstC = mode === 'horizontal' ? first.x + first.w / 2 : first.y + first.h / 2;
  const lastC = mode === 'horizontal' ? last.x + last.w / 2 : last.y + last.h / 2;
  const step = (lastC - firstC) / (sorted.length - 1);

  const newPos = new Map<string, { x?: number; y?: number }>();
  for (let i = 1; i < sorted.length - 1; i++) {
    const el = sorted[i];
    const targetC = firstC + step * i;
    if (mode === 'horizontal') {
      newPos.set(el.id, { x: targetC - el.w / 2 });
    } else {
      newPos.set(el.id, { y: targetC - el.h / 2 });
    }
  }
  return elements.map((el) => {
    const np = newPos.get(el.id);
    if (!np) return el;
    return { ...el, x: np.x ?? el.x, y: np.y ?? el.y, updatedAt: Date.now() };
  });
}
