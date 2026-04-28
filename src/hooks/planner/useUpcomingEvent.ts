/**
 * 다음 1개 이벤트 — TODAY 미니뷰(Col 1 "🔔 14:00 팀 미팅 30분 후") 데이터 소스.
 *
 * 현재 시각 이후 가장 가까운 이벤트 1개. 없으면 null.
 * 1분마다 재계산 (분 단위 카운트다운 정확성).
 */
import { useEffect, useState, useCallback } from 'react';
import { eventStore } from '@/services/planner/eventStore';
import { PlannerEvent, PLANNER_EVENT_CHANGED } from '@/types/planner';

const findNext = (now: Date): PlannerEvent | null => {
  const all = eventStore.list();
  const nowIso = now.toISOString();
  const future = all.filter((e) => e.startAt > nowIso);
  return future.length > 0 ? future[0] : null;
};

export const useUpcomingEvent = (): PlannerEvent | null => {
  const [event, setEvent] = useState<PlannerEvent | null>(() => findNext(new Date()));

  const refresh = useCallback(() => setEvent(findNext(new Date())), []);

  useEffect(() => {
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_EVENT_CHANGED, refresh);
    // 1분마다 재계산 (시간이 지나서 next 가 바뀌는 경우)
    const interval = setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener(PLANNER_EVENT_CHANGED, refresh);
      clearInterval(interval);
    };
  }, [refresh]);

  return event;
};
