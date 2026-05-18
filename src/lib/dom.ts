/**
 * DOM 유틸 — scroll/focus/측정 표준 패턴.
 */

/** 요소를 화면 안으로 부드럽게 (이미 보이면 no-op). */
export function scrollIntoViewIfNeeded(el: Element | null, opts: ScrollIntoViewOptions = { block: 'nearest', behavior: 'smooth' }): void {
  if (!el) return;
  el.scrollIntoView(opts);
}

/** ref 또는 selector 로 focus. blur 보호. */
export function safeFocus(target: HTMLElement | string | null): boolean {
  if (!target) return false;
  const el = typeof target === 'string'
    ? document.querySelector<HTMLElement>(target)
    : target;
  if (!el) return false;
  try {
    el.focus({ preventScroll: false });
    return true;
  } catch {
    return false;
  }
}

/** 요소가 viewport 에 있는지 (부분 포함 OK). */
export function isInViewport(el: Element | null): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return (
    r.bottom > 0 && r.right > 0 &&
    r.top < (window.innerHeight || document.documentElement.clientHeight) &&
    r.left < (window.innerWidth || document.documentElement.clientWidth)
  );
}

/** 스크롤바 너비 — 모달 열 때 padding-right 보정 등. */
export function getScrollbarWidth(): number {
  if (typeof window === 'undefined') return 0;
  return window.innerWidth - document.documentElement.clientWidth;
}

/** 가장 가까운 조상 (selector) — closest 의 safe wrap. */
export function closestMatch(el: Element | null, selector: string): Element | null {
  if (!el) return null;
  return typeof el.closest === 'function' ? el.closest(selector) : null;
}
