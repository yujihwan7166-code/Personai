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

/** 요소의 회전 미적용 AABB. */
export function elementBBox(el: WBElement): BBox {
  return { x: el.x, y: el.y, w: el.w, h: el.h };
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

/** 좌표에서 가장 위 요소 (zIndex 내림차순 → 마지막 추가가 위) */
export function findElementAt(elements: WBElement[], px: number, py: number): WBElement | null {
  // zIndex 큰 게 위. 동일 zIndex면 배열 뒤가 위.
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
  for (const el of sorted) {
    if (el.locked) continue;
    if (hitsElement(px, py, el)) return el;
  }
  return null;
}

/** marquee 영역에 걸친 요소 (AABB 교차). */
export function findElementsInRect(elements: WBElement[], rect: BBox): WBElement[] {
  const x2 = rect.x + rect.w;
  const y2 = rect.y + rect.h;
  return elements.filter((el) => {
    if (el.locked) return false;
    const ex2 = el.x + el.w;
    const ey2 = el.y + el.h;
    return !(el.x > x2 || ex2 < rect.x || el.y > y2 || ey2 < rect.y);
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
