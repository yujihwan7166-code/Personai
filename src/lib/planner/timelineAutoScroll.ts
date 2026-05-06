/**
 * 타임라인 드래그 중 가장자리 자동 스크롤.
 *
 * Google / Apple Calendar 패턴: 드래그·리사이즈 중 마우스가 스크롤
 * 컨테이너 위·아래 60px 영역에 들어가면 그쪽으로 자동 스크롤.
 * 가장자리에 가까울수록 빠르게 (선형 가속).
 *
 * 사용 패턴:
 *   const auto = createAutoScroller(scrollRef.current);
 *   auto.update(e.clientY);   // pointermove 마다 호출 (좌표만 갱신)
 *   auto.stop();              // pointerup / pointercancel 시
 *
 * 좌표만 받고 rAF loop 가 알아서 스크롤 — 마우스가 멈춰 있어도
 * 가장자리에 머물면 스크롤 계속됨 (Google Calendar 와 동일).
 */

const EDGE_PX = 60;
const MAX_SPEED_PX_PER_FRAME = 14;

export interface TimelineAutoScroller {
  update(clientY: number): void;
  stop(): void;
}

export const createAutoScroller = (
  container: HTMLElement | null,
): TimelineAutoScroller => {
  if (!container) {
    return { update: () => {}, stop: () => {} };
  }

  let lastY: number | null = null;
  let rafId: number | null = null;

  const tick = () => {
    if (lastY === null) {
      rafId = null;
      return;
    }
    const rect = container.getBoundingClientRect();
    let velocity = 0;
    const distFromTop = lastY - rect.top;
    const distFromBottom = rect.bottom - lastY;
    if (distFromTop < EDGE_PX) {
      // 위쪽 가장자리 — 음의 속도 (스크롤 위로).
      const ratio = Math.max(0, Math.min(1, 1 - distFromTop / EDGE_PX));
      velocity = -MAX_SPEED_PX_PER_FRAME * ratio;
    } else if (distFromBottom < EDGE_PX) {
      // 아래쪽 가장자리 — 양의 속도 (스크롤 아래로).
      const ratio = Math.max(0, Math.min(1, 1 - distFromBottom / EDGE_PX));
      velocity = MAX_SPEED_PX_PER_FRAME * ratio;
    }
    if (velocity !== 0) {
      container.scrollTop += velocity;
    }
    rafId = requestAnimationFrame(tick);
  };

  return {
    update(clientY: number) {
      lastY = clientY;
      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    },
    stop() {
      lastY = null;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
  };
};
