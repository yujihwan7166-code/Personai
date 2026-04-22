// 스크롤 위치 기억 훅 — key가 바뀔 때 이전 위치를 sessionStorage에 저장, 복귀 시 복원.
// 사용: const ref = useScrollMemory(`chat:${discussionId}`);
//        <div ref={ref} className="overflow-y-auto">...

import { useEffect, useRef } from 'react';

const PREFIX = 'scrollmem:';

export function useScrollMemory<T extends HTMLElement = HTMLDivElement>(
  key: string | null | undefined,
  opts: { enabled?: boolean; debounceMs?: number } = {},
) {
  const ref = useRef<T>(null);
  const { enabled = true, debounceMs = 150 } = opts;

  // 복원: key가 바뀔 때마다 한 번
  useEffect(() => {
    if (!enabled || !key) return;
    const el = ref.current;
    if (!el) return;
    try {
      const raw = sessionStorage.getItem(PREFIX + key);
      if (raw) {
        const top = Number(raw);
        if (Number.isFinite(top)) {
          // 레이아웃이 그려진 뒤 복원 (두 번: 즉시 + rAF 안전망)
          el.scrollTop = top;
          requestAnimationFrame(() => { el.scrollTop = top; });
        }
      }
    } catch { /* storage 꺼짐 등 */ }
  }, [key, enabled]);

  // 저장: debounce scroll → sessionStorage
  useEffect(() => {
    if (!enabled || !key) return;
    const el = ref.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        try { sessionStorage.setItem(PREFIX + key, String(el.scrollTop)); } catch { /* noop */ }
      }, debounceMs);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (t) clearTimeout(t);
    };
  }, [key, enabled, debounceMs]);

  return ref;
}
