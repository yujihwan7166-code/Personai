/**
 * 영역 밖 클릭 감지 — popover / 드롭다운 / 모달 외부 클릭 닫기.
 *
 * 사용:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useClickOutside(ref, () => setOpen(false), { enabled: open });
 *   <div ref={ref}>...</div>
 */

import { useEffect, type RefObject } from 'react';

interface Options {
  /** false 면 listen X (드롭다운 닫힘 상태). */
  enabled?: boolean;
  /** 추가로 무시할 ref (예: 트리거 버튼). */
  ignoreRefs?: ReadonlyArray<RefObject<HTMLElement>>;
  /** 'pointerdown' (기본) vs 'click' — touch device 반응성. */
  eventType?: 'pointerdown' | 'mousedown' | 'click';
}

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: (e: Event) => void,
  { enabled = true, ignoreRefs = [], eventType = 'pointerdown' }: Options = {},
): void {
  useEffect(() => {
    if (!enabled) return;
    const onEvent = (e: Event) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (ref.current && ref.current.contains(target)) return;
      for (const ig of ignoreRefs) {
        if (ig.current && ig.current.contains(target)) return;
      }
      handler(e);
    };
    document.addEventListener(eventType, onEvent);
    return () => document.removeEventListener(eventType, onEvent);
  }, [ref, handler, enabled, ignoreRefs, eventType]);
}
