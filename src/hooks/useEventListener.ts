/**
 * 이벤트 리스너 hook — window / element / mediaQueryList 대상.
 *
 * 각 페이지가 useEffect + addEventListener + cleanup 패턴 반복.
 * 한 hook 으로. enabled 토글 + 타깃 변경 시 자동 재등록.
 *
 * 사용:
 *   useEventListener('scroll', onScroll);
 *   useEventListener('click', onClick, { target: btnRef.current });
 *   useEventListener('resize', onResize, { enabled: !mobile });
 */

import { useEffect, useRef } from 'react';

type TargetLike = EventTarget | { addEventListener: EventTarget['addEventListener']; removeEventListener: EventTarget['removeEventListener'] } | null | undefined;

interface Options<T extends Event = Event> {
  /** 이벤트 타깃 — 기본 window. */
  target?: TargetLike;
  /** false 면 등록 안 함. */
  enabled?: boolean;
  /** addEventListener options. */
  passive?: boolean;
  capture?: boolean;
  /** 핸들러는 그대로 두고 deps 만 추가하고 싶을 때. */
  deps?: ReadonlyArray<unknown>;
  /** 타입 좁히기 위한 캐스팅 — 실제 동작엔 영향 X. */
  _phantom?: T;
}

export function useEventListener<K extends keyof WindowEventMap>(
  type: K,
  handler: (e: WindowEventMap[K]) => void,
  options?: Options,
): void;
export function useEventListener(
  type: string,
  handler: (e: Event) => void,
  options?: Options,
): void;
export function useEventListener(
  type: string,
  handler: (e: Event) => void,
  options: Options = {},
): void {
  const { target, enabled = true, passive, capture, deps = [] } = options;

  // 핸들러 ref — 매 렌더 갱신, listener 는 1번만 등록.
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    const t = (target ?? (typeof window !== 'undefined' ? window : null)) as EventTarget | null;
    if (!t) return;
    const listener: EventListener = (e) => handlerRef.current(e);
    const opts: AddEventListenerOptions = { passive, capture };
    t.addEventListener(type, listener, opts);
    return () => t.removeEventListener(type, listener, opts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, target, enabled, passive, capture, ...deps]);
}
