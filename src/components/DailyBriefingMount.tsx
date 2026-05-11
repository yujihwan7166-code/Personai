/**
 * 데일리 브리핑 글로벌 마운트.
 *
 * 책임:
 * - 어디서든 'open-daily-briefing' 이벤트로 모달 열기
 * - autoShow 켜진 사용자 → 오늘 첫 접속 감지하면 자동 표시
 *
 * App.tsx 의 BrowserRouter 안에 한 번만 마운트.
 */
import { useEffect, useState } from 'react';
import { DailyBriefingModal } from './DailyBriefingModal';
import { dailyBriefingStore } from '@/lib/dailyBriefingStore';

export const OPEN_DAILY_BRIEFING_EVENT = 'open-daily-briefing';

export const DailyBriefingMount = () => {
  const [open, setOpen] = useState(false);

  // 글로벌 이벤트 listen — 모드 카드/단축키 등 어디서든 호출 가능
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_DAILY_BRIEFING_EVENT, handler);
    return () => window.removeEventListener(OPEN_DAILY_BRIEFING_EVENT, handler);
  }, []);

  // 첫 마운트 시 — autoShow 켜져있고 오늘 안 띄웠으면 1초 뒤 자동 표시
  // (페이지 로딩 직후 즉시 띄우면 사용자가 갑작스러움 — 살짝 지연)
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
