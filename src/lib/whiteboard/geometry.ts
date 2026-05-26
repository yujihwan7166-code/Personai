/**
 * 화이트보드 — 기하 유틸 (순수 함수만).
 *
 * 모든 좌표 = world 좌표.
 */
import type { WBElement, WBViewport } from '@/types/whiteboard';

export interface WorldPoint {
  x: number;
  y: number;
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 화면 좌표 → world 좌표 변환. */
export function screenToWorld(
  clientX: number,
  clientY: number,
  containerRect: { left: number; top: number },
  viewport: WBViewport,
): WorldPoint {
  return {
    x: viewport.x + (clientX - containerRect.left) / viewport.zoom,
    y: viewport.y + (clientY - containerRect.top) / viewport.zoom,
  };
}

/** 시작점과 현재점에서 정규화된 사각형 (음수 폭 허용 X). */
export function rectFromPoints(a: WorldPoint, b: WorldPoint): BBox {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

/** 요소의 회전 미적용 AABB (요소 로컬). */
export function elementBBox(el: WBElement): BBox {
  return { x: el.x, y: el.y, w: el.w, h: el.h };
}

/** 회전 적용된 4 코너 — world 좌표. */
export function rotatedCorners(el: WBElement): Array<[number, number]> {
  if (!el.angle) {
    return [
      [el.x, el.y],
      [el.x + el.w, el.y],
      [el.x + el.w, el.y + el.h],
      [el.x, el.y + el.h],
    ];
  }
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const cos = Math.cos(el.angle);
  const sin = Math.sin(el.angle);
  const rot = (px: number, py: number): [number, number] => {
    const dx = px - cx;
    const dy = py - cy;
    return [dx * cos - dy * sin + cx, dx * sin + dy * cos + cy];
  };
  return [
    rot(el.x, el.y),
    rot(el.x + el.w, el.y),
    rot(el.x + el.w, el.y + el.h),
    rot(el.x, el.y + el.h),
  ];
}

/** 회전 적용 AABB — marquee 검사용. */
export function rotatedAABB(el: WBElement): BBox {
  if (!el.angle) return { x: el.x, y: el.y, w: el.w, h: el.h };
  const corners = rotatedCorners(el);
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
}

/** world → 요소 로컬 좌표 (요소 중심점 기준 역회전). */
export function worldToElementLocal(wp: { x: number; y: number }, el: WBElement): { x: number; y: number } {
  if (!el.angle) return { x: wp.x, y: wp.y };
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const cos = Math.cos(-el.angle);
  const sin = Math.sin(-el.angle);
  const dx = wp.x - cx;
  const dy = wp.y - cy;
  return { x: dx * cos - dy * sin + cx, y: dx * sin + dy * cos + cy };
}

/** 회전된 요소의 hit-test. world 좌표 (px) → 요소 포함 여부. */
export function hitsElement(px: number, py: number, el: WBElement): boolean {
  if (el.angle === 0) {
    return px >= el.x && px <= el.x + el.w && py >= el.y && py <= el.y + el.h;
  }
  // 요소 중심점 기준 역회전
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const cos = Math.cos(-el.angle);
  const sin = Math.sin(-el.angle);
  const dx = px - cx;
  const dy = py - cy;
  const rx = dx * cos - dy * sin + cx;
  const ry = dx * sin + dy * cos + cy;
  return rx >= el.x && rx <= el.x + el.w && ry >= el.y && ry <= el.y + el.h;
}

interface HitTestOptions {
  includeLocked?: boolean;
}

/** 좌표에서 가장 위 요소 (zIndex 내림차순 → 마지막 추가가 위) */
export function findElementAt(elements: WBElement[], px: number, py: number, options: HitTestOptions = {}): WBElement | null {
  // zIndex 큰 게 위. 동일 zIndex면 배열 뒤가 위.
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
  for (const el of sorted) {
    if (el.locked && !options.includeLocked) continue;
    if (hitsElement(px, py, el)) return el;
  }
  return null;
}

/** marquee 영역에 걸친 요소 (회전 적용 AABB 교차). */
export function findElementsInRect(elements: WBElement[], rect: BBox): WBElement[] {
  const x2 = rect.x + rect.w;
  const y2 = rect.y + rect.h;
  return elements.filter((el) => {
    if (el.locked) return false;
    const bb = rotatedAABB(el);
    const ex2 = bb.x + bb.w;
    const ey2 = bb.y + bb.h;
    return !(bb.x > x2 || ex2 < rect.x || bb.y > y2 || ey2 < rect.y);
  });
}

/** 다수 요소를 감싸는 bbox. */
export function unionBBox(elements: WBElement[]): BBox | null {
  if (elements.length === 0) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const el of elements) {
    if (el.x < x1) x1 = el.x;
    if (el.y < y1) y1 = el.y;
    if (el.x + el.w > x2) x2 = el.x + el.w;
    if (el.y + el.h > y2) y2 = el.y + el.h;
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** 다음 zIndex (요소 추가용). */
export function nextZIndex(elements: WBElement[]): number {
  if (elements.length === 0) return 0;
  return Math.max(...elements.map((e) => e.zIndex)) + 1;
}
