/**
 * useHover — 요소 마우스 hover 여부.
 *
 * Tooltip / preview 트리거. 모바일에서는 항상 false.
 */

import { useEffect, useRef, useState } from 'react';

export function useHover<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = () => setHovered(true);
    const off = () => setHovered(false);
    el.addEventListener('mouseenter', on);
    el.addEventListener('mouseleave', off);
    return () => {
      el.removeEventListener('mouseenter', on);
      el.removeEventListener('mouseleave', off);
    };
  }, []);

  return [ref, hovered] as const;
}
