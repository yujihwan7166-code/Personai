/**
 * 단축키 가드 — 사용자 입력 영역 안에서는 글로벌 단축키 무시.
 *
 * Planner / Sheet / Memos 등에서 같은 패턴 반복:
 *   if (tag === 'input' || tag === 'textarea' || el.isContentEditable) return;
 * 한 함수로 통일.
 */

/**
 * target 이 사용자 입력 가능 영역인지.
 *   input / textarea / select / contentEditable / role=textbox.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  if (target.getAttribute('role') === 'textbox') return true;
  return false;
}

/**
 * keydown 핸들러 래퍼 — 편집 영역 안이면 무시.
 *
 * 사용:
 *   const onKey = withGlobalShortcutGuard((e) => {
 *     if (e.key === '/') openPalette();
 *   });
 *   window.addEventListener('keydown', onKey);
 */
export function withGlobalShortcutGuard<E extends KeyboardEvent>(
  handler: (e: E) => void,
): (e: E) => void {
  return (e: E) => {
    if (isEditableTarget(e.target)) return;
    handler(e);
  };
}
