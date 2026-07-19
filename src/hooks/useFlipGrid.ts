/**
 * useFlipGrid — 레이아웃이 한 프레임에 바뀌는 그리드(CSS columns 등)의 아이템을
 * 옛 위치 → 새 위치로 부드럽게 글라이드시키는 FLIP 훅.
 *
 * 폭·열 수를 연속 애니메이션하면 내용이 찌그러지는 문제(아카이브 상세 이력)를 피하기 위해,
 * 레이아웃은 즉시 확정하고 각 아이템에 역변환(transform)만 걸어 제자리로 풀어준다.
 *
 * 사용: 레이아웃을 바꾸는 setState "직전"에 capture()를 호출.
 *   <div ref={gridRef}> 안의 [data-flip-id] 요소들이 대상.
 */
import { useLayoutEffect, useRef, useState } from 'react';

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DUR = 340;

export function useFlipGrid<T extends HTMLElement = HTMLDivElement>() {
  const gridRef = useRef<T | null>(null);
  const prevRects = useRef<Map<string, DOMRect> | null>(null);
  const [epoch, setEpoch] = useState(0);

  /** 레이아웃 변경 setState 직전에 호출 — 현재 위치 스냅샷. */
  const capture = () => {
    const el = gridRef.current;
    if (!el || !el.offsetParent) return; // 그리드가 숨겨진 상태(display:none)면 스킵
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const m = new Map<string, DOMRect>();
    el.querySelectorAll<HTMLElement>('[data-flip-id]').forEach((c) => {
      const id = c.dataset.flipId;
      if (id) m.set(id, c.getBoundingClientRect());
    });
    prevRects.current = m;
    setEpoch((e) => e + 1);
  };

  useLayoutEffect(() => {
    const prev = prevRects.current;
    const el = gridRef.current;
    prevRects.current = null;
    if (!prev || !el) return;
    const movers: HTMLElement[] = [];
    el.querySelectorAll<HTMLElement>('[data-flip-id]').forEach((c) => {
      const id = c.dataset.flipId;
      const p = id ? prev.get(id) : undefined;
      if (!p || p.width === 0) {
        // 새로 등장한 아이템 — 짧은 페이드 인
        c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
        return;
      }
      const n = c.getBoundingClientRect();
      const dx = p.left - n.left;
      const dy = p.top - n.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      c.style.transition = 'none';
      c.style.transform = `translate(${dx}px, ${dy}px)`;
      movers.push(c);
    });
    if (!movers.length) return;
    // 강제 리플로우로 역변환 확정 후, 다음 프레임에 제자리로
    void el.offsetWidth;
    const raf = requestAnimationFrame(() => {
      movers.forEach((c) => {
        c.style.transition = `transform ${DUR}ms ${EASE}`;
        c.style.transform = '';
      });
    });
    const t = setTimeout(() => movers.forEach((c) => { c.style.transition = ''; }), DUR + 80);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [epoch]);

  return { gridRef, capture };
}
