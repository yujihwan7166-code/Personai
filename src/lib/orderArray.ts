/**
 * 배열 순서 변경 유틸 — 드래그 reorder / 위·아래 이동.
 *
 * dnd-kit / 수동 reorder 등에서 반복되던 splice 패턴 통합.
 */

/** from → to 위치로 이동 (음수/overflow 자동 clamp). 새 배열 반환. */
export function moveItem<T>(arr: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= arr.length) return arr.slice();
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  const safeTo = Math.max(0, Math.min(next.length, to));
  next.splice(safeTo, 0, moved);
  return next;
}

/** 항목 1칸 위로. 맨 위면 그대로. */
export function moveUp<T>(arr: readonly T[], idx: number): T[] {
  if (idx <= 0 || idx >= arr.length) return arr.slice();
  return moveItem(arr, idx, idx - 1);
}

/** 항목 1칸 아래로. 맨 아래면 그대로. */
export function moveDown<T>(arr: readonly T[], idx: number): T[] {
  if (idx < 0 || idx >= arr.length - 1) return arr.slice();
  return moveItem(arr, idx, idx + 1);
}

/** id 배열 순서로 items 정렬 — id 가 없으면 끝에 stable 유지. */
export function sortByIdOrder<T extends { id: string }>(items: readonly T[], idOrder: readonly string[]): T[] {
  const idx = new Map<string, number>();
  idOrder.forEach((id, i) => idx.set(id, i));
  return items.slice().sort((a, b) => {
    const ia = idx.has(a.id) ? idx.get(a.id)! : Number.MAX_SAFE_INTEGER;
    const ib = idx.has(b.id) ? idx.get(b.id)! : Number.MAX_SAFE_INTEGER;
    return ia - ib;
  });
}
