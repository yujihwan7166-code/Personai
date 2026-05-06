/**
 * 타임라인 스냅 단위 훅 — 변경 이벤트 listen 해서 자동 리렌더.
 */
import { useEffect, useState } from 'react';
import { getSnapMin, SNAP_MIN_CHANGED, type SnapMin } from '@/lib/planner/snapMin';

export const useSnapMin = (): SnapMin => {
  const [value, setValue] = useState<SnapMin>(getSnapMin);
  useEffect(() => {
    const refresh = () => setValue(getSnapMin());
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(SNAP_MIN_CHANGED, refresh);
    return () => window.removeEventListener(SNAP_MIN_CHANGED, refresh);
  }, []);
  return value;
};
