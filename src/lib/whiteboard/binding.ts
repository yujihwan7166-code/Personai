import type { WBArrow, WBElement } from '@/types/whiteboard';
import { findElementAt, hitsElement } from './geometry';

export function isBindable(el: WBElement): boolean {
  return el.type !== 'line' && el.type !== 'arrow' && el.type !== 'freedraw';
}

export function findBindable(elements: WBElement[], px: number, py: number): WBElement | null {
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
  for (const el of sorted) {
    if (el.locked) continue;
    if (!isBindable(el)) continue;
    if (hitsElement(px, py, el)) return el;
  }
  return null;
}

export function computeBindingPoint(boundEl: WBElement, otherEnd: { x: number; y: number }): [number, number] {
  const cx = boundEl.x + boundEl.w / 2;
  const cy = boundEl.y + boundEl.h / 2;
  const rotation = boundEl.angle ?? 0;
  const toLocalCos = Math.cos(-rotation);
  const toLocalSin = Math.sin(-rotation);
  const wx = otherEnd.x - cx;
  const wy = otherEnd.y - cy;
  const dx = wx * toLocalCos - wy * toLocalSin;
  const dy = wx * toLocalSin + wy * toLocalCos;
  if (dx === 0 && dy === 0) return [cx, cy];

  const angle = Math.atan2(dy, dx);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tx = cos === 0 ? Infinity : boundEl.w / 2 / Math.abs(cos);
  const ty = sin === 0 ? Infinity : boundEl.h / 2 / Math.abs(sin);
  const t = Math.min(tx, ty);
  const localX = cos * t;
  const localY = sin * t;
  const toWorldCos = Math.cos(rotation);
  const toWorldSin = Math.sin(rotation);

  return [
    cx + localX * toWorldCos - localY * toWorldSin,
    cy + localX * toWorldSin + localY * toWorldCos,
  ];
}

export function resolveArrow(arrow: WBArrow, elements: WBElement[]): WBArrow {
  if (!arrow.startBinding && !arrow.endBinding) return arrow;
  const points: Array<[number, number]> = [...arrow.points];
  if (points.length < 2) return arrow;
  let changed = false;
  let startBinding = arrow.startBinding;
  let endBinding = arrow.endBinding;

  if (startBinding) {
    const boundStart = elements.find((el) => el.id === startBinding!.elementId);
    if (boundStart) {
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
      startBinding = undefined;
    }
  }

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

export function syncAllBindings(elements: WBElement[]): WBElement[] {
  let changed = false;
  const next = elements.map((el) => {
    if (el.type !== 'arrow' || (!el.startBinding && !el.endBinding)) return el;
    const resolved = resolveArrow(el, elements);
    if (resolved !== el) changed = true;
    return resolved;
  });
  return changed ? next : elements;
}

export { findElementAt };
