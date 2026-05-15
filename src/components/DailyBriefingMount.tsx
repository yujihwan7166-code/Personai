/**
 * 데일리 브리핑 v3 — 글로벌 마운트.
 *
 * - 'open-daily-briefing' 이벤트로 어디서든 열기
 * - autoShow on + 오늘 첫 접속 시 800ms 후 자동 표시
 */
import { useEffect, useState } from 'react';
import { DailyBriefingModal } from './briefing/DailyBriefingModal';
import { dailyBriefingStore } from '@/lib/dailyBriefingStore';

export const OPEN_DAILY_BRIEFING_EVENT = 'open-daily-briefing';

export const DailyBriefingMount = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_DAILY_BRIEFING_EVENT, handler);
    return () => window.removeEventListener(OPEN_DAILY_BRIEFING_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!dailyBriefingStore.shouldAutoShow()) return;
    const timer = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  return <DailyBriefingModal open={open} onClose={() => setOpen(false)} />;
};

/** 어디서든 호출 — `triggerDailyBriefing()` */
export const triggerDailyBriefing = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_DAILY_BRIEFING_EVENT));
};
