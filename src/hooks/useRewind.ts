/**
 * 되감기 — 여섯 방의 기록을 모아오고, 그 방들이 바뀌면 다시 모은다.
 *
 * 읽기 전용이라 저장 훅(useLedger·useHealth)을 쓰지 않는다 — 그 훅들은 마운트 시
 * 고정지출/시드 데이터를 쓰기 때문에, 되감기를 열었다는 이유로 남의 방이 바뀌면 안 된다.
 */
import { useEffect, useState } from 'react';
import { collectRewindEvents } from '@/lib/rewind/sources';
import type { RewindEvent } from '@/lib/rewind/types';
import { DAYLOG_CHANGED } from '@/types/daylog';
import { JOURNAL_CHANGED } from '@/types/journal';
import { LEDGER_CHANGED } from '@/types/ledger';
import { HEALTH_CHANGED } from '@/types/health';
import { PEOPLE_CHANGED } from '@/types/people';
import { TICKETS_CHANGED } from '@/lib/tickets/ticketStore';

const CHANGE_EVENTS = [
  DAYLOG_CHANGED, JOURNAL_CHANGED, LEDGER_CHANGED, HEALTH_CHANGED, PEOPLE_CHANGED, TICKETS_CHANGED,
];

export function useRewindEvents(): RewindEvent[] {
  const [events, setEvents] = useState<RewindEvent[]>(collectRewindEvents);

  useEffect(() => {
    const reload = () => setEvents(collectRewindEvents());
    for (const name of CHANGE_EVENTS) window.addEventListener(name, reload);
    // 다른 탭에서 기록했을 때도 릴이 따라온다.
    window.addEventListener('storage', reload);
    return () => {
      for (const name of CHANGE_EVENTS) window.removeEventListener(name, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);

  return events;
}
