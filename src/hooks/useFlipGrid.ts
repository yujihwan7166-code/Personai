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
/** 위→아래로 번지는 출발 시차의 상한. 더 늘리면 마지막 카드가 굼떠 보인다. */
const MAX_STAGGER = 110;

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
    /* 화면 위쪽 카드부터 차례로 움직이게 하려고 그리드 상단을 기준으로 잡는다.
       전부 같은 순간에 같은 속도로 떠나면 '한 덩어리가 통째로 미끄러지는' 뻣뻣한 움직임이 된다.
       위에서 아래로 조금씩 늦게 출발시키면 같은 거리라도 물결처럼 번져 훨씬 자연스럽다. */
    const gridTop = el.getBoundingClientRect().top;
    const delayOf = (top: number) => Math.min(MAX_STAGGER, Math.max(0, (top - gridTop) / 9));

    const movers: Array<{ el: HTMLElement; delay: number }> = [];
    el.querySelectorAll<HTMLElement>('[data-flip-id]').forEach((c) => {
      const id = c.dataset.flipId;
      const p = id ? prev.get(id) : undefined;
      const n = c.getBoundingClientRect();
      const delay = delayOf(n.top);
      if (!p || p.width === 0) {
        // 새로 등장한 아이템 — 살짝 아래에서 떠오르며. 순수 페이드보다 '자리에 놓이는' 느낌이 난다
        c.animate(
          [{ opacity: 0, transform: 'translateY(7px)' }, { opacity: 1, transform: 'none' }],
          { duration: DUR, easing: EASE, delay, fill: 'backwards' },
        );
        return;
      }
      const dx = p.left - n.left;
      const dy = p.top - n.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      c.style.transition = 'none';
      c.style.transform = `translate(${dx}px, ${dy}px)`;
      movers.push({ el: c, delay });
    });
    if (!movers.length) return;
    // 강제 리플로우로 역변환 확정 후, 다음 프레임에 제자리로
    void el.offsetWidth;
    const raf = requestAnimationFrame(() => {
      movers.forEach(({ el: c, delay }) => {
        c.style.transition = `transform ${DUR}ms ${EASE} ${Math.round(delay)}ms`;
        c.style.transform = '';
      });
    });
    const t = setTimeout(() => movers.forEach(({ el: c }) => { c.style.transition = ''; }), DUR + MAX_STAGGER + 80);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [epoch]);

  return { gridRef, capture };
}
