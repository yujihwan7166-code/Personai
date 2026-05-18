/**
 * useFocusTrap — 모달/드로어 내부 Tab 순환.
 *
 * active 시 컨테이너 내부 focusable 만 순환.
 * 마운트 시 첫 요소 focus, 언마운트 시 이전 focus 복원.
 */

import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap<T extends HTMLElement>(active: boolean = true) {
  const ref = useRef<T | null>(null);
  const prevRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const root = ref.current;
    prevRef.current = (document.activeElement as HTMLElement | null) ?? null;

    const focusables = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter(el => !el.hasAttribute('hidden') && !el.hasAttribute('aria-hidden'));

    const first = focusables()[0];
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) { e.preventDefault(); return; }
      const idx = list.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && (idx <= 0)) {
        e.preventDefault();
        list[list.length - 1].focus();
      } else if (!e.shiftKey && idx === list.length - 1) {
        e.preventDefault();
        list[0].focus();
      }
    };

    root.addEventListener('keydown', onKey);
    return () => {
      root.removeEventListener('keydown', onKey);
      prevRef.current?.focus?.();
    };
  }, [active]);

  return ref;
}
