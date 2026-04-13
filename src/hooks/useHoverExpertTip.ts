import { useCallback, useEffect, useRef, useState } from 'react';

import type { Expert } from '@/types/expert';

interface TipPosition {
  x: number;
  y: number;
}

export function useHoverExpertTip() {
  const [hoveredExpert, setHoveredExpert] = useState<Expert | null>(null);
  const [tipPos, setTipPos] = useState<TipPosition | null>(null);
  const tipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTip = useCallback((expert: Expert, target: HTMLElement) => {
    if (tipTimerRef.current) {
      clearTimeout(tipTimerRef.current);
    }

    const delay = hoveredExpert ? 0 : 300;
    tipTimerRef.current = setTimeout(() => {
      const rect = target.getBoundingClientRect();
      setHoveredExpert(expert);
      setTipPos({ x: rect.right + 8, y: rect.top + rect.height / 2 });
    }, delay);
  }, [hoveredExpert]);

  const hideTip = useCallback(() => {
    if (tipTimerRef.current) {
      clearTimeout(tipTimerRef.current);
    }

    setHoveredExpert(null);
    setTipPos(null);
  }, []);

  useEffect(() => () => {
    if (tipTimerRef.current) {
      clearTimeout(tipTimerRef.current);
    }
  }, []);

  return {
    hoveredExpert,
    tipPos,
    showTip,
    hideTip,
  };
}
