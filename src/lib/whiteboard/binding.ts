/**
 * 화이트보드 — 화살표 binding 유틸.
 *
 * 도형/스티키 위에서 시작·종료한 화살표는 그 요소의 edge 에 묶임.
 * 요소가 이동하면 화살표 끝점도 자동으로 따라옴.
 */
import type { WBArrow, WBElement } from '@/types/whiteboard';
import { findElementAt, hitsElement } from './geometry';

/** 화살표 binding 후보 — 도형/스티키/이미지 (line/arrow/freedraw 제외) */
export function isBindable(el: WBElement): boolean {
  return el.type !== 'line' && el.type !== 'arrow' && el.type !== 'freedraw';
}

/** 좌표 위의 bindable 요소 찾기 */
export function findBindable(elements: WBElement[], px: number, py: number): WBElement | null {
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
  for (const el of sorted) {
    if (el.locked) continue;
    if (!isBindable(el)) continue;
    if (hitsElement(px, py, el)) return el;
  }
  return null;
}

/**
 * 화살표 끝점이 묶인 요소의 어느 위치로 와야 하는지 계산 ('auto' 앵커).
 * 다른 끝점에서 묶인 요소 중심으로 그은 ray 와 사각형 경계의 교차점.
 */
export function computeBindingPoint(boundEl: WBElement, otherEnd: { x: number; y: number }): [number, number] {
  const cx = boundEl.x + boundEl.w / 2;
  const cy = boundEl.y + boundEl.h / 2;
  const dx = otherEnd.x - cx;
  const dy = otherEnd.y - cy;
  if (dx === 0 && dy === 0) return [cx, cy];
  const angle = Math.atan2(dy, dx);
  const hw = boundEl.w / 2;
  const hh = boundEl.h / 2;
  // 회전 미적용 AABB 기준 — 회전된 요소는 회전 변환된 경계까지 계산하면 비싸므로 단순화
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tx = cos === 0 ? Infinity : hw / Math.abs(cos);
  const ty = sin === 0 ? Infinity : hh / Math.abs(sin);
  const t = Math.min(tx, ty);
  return [cx + cos * t, cy + sin * t];
}

/**
 * 화살표를 binding 에 따라 해소 — 묶인 요소가 있으면 그쪽 끝점을 갱신.
 * 묶인 요소가 사라졌으면 binding 만 제거 (마지막 위치 유지).
 */
export function resolveArrow(arrow: WBArrow, elements: WBElement[]): WBArrow {
  if (!arrow.startBinding && !arrow.endBinding) return arrow;
  const points: Array<[number, number]> = [...arrow.points];
  if (points.length < 2) return arrow;
  let changed = false;
  let startBinding = arrow.startBinding;
  let endBinding = arrow.endBinding;

  // start binding
  if (startBinding) {
    const boundStart = elements.find((el) => el.id === startBinding!.elementId);
    if (boundStart) {
      // 다른 끝점 = points[points.length-1]
      const otherEnd = endBinding
        ? (() => {
            const e = elements.find((el) => el.id === endBinding!.elementId);
            return e ? { x: e.x + e.w / 2, y: e.y + e.h / 2 } : { x: points[points.length - 1][0], y: points[points.length - 1][1] };
          })()
        : { x: points[points.length - 1][0], y: points[points.length - 1][1] };
      const [px, py] = computeBindingPoint(boundStart, otherEnd);
      points[0] = [px, py];
      changed = true;
    } else {
      // 묶인 요소 사라짐 — binding 제거
      startBinding = undefined;
    }
  }

  // end binding
  if (endBinding) {
    const boundEnd = elements.find((el) => el.id === endBinding!.elementId);
    if (boundEnd) {
      const otherEnd = startBinding
        ? (() => {
            const e = elements.find((el) => el.id === startBinding!.elementId);
            return e ? { x: e.x + e.w / 2, y: e.y + e.h / 2 } : { x: points[0][0], y: points[0][1] };
          })()
        : { x: points[0][0], y: points[0][1] };
      const [px, py] = computeBindingPoint(boundEnd, otherEnd);
      points[points.length - 1] = [px, py];
      changed = true;
    } else {
      endBinding = undefined;
    }
  }

  if (!changed && startBinding === arrow.startBinding && endBinding === arrow.endBinding) return arrow;
  // bbox 재계산
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    ...arrow,
    points,
    startBinding,
    endBinding,
    x,
    y,
    w: Math.max(...xs) - x || 1,
    h: Math.max(...ys) - y || 1,
  };
}

// re-export for convenience
export { findElementAt };
