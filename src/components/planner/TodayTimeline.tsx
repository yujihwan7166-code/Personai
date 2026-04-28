/**
 * 오늘의 시간표 — 메인 컬럼. 30분 단위 격자 + 이벤트/시간배정 할일 블록.
 *
 * Phase 1: 골격만 (30분 격자 + 현재 시각선 + 시간 블록 단순 리스트).
 * Phase 4: 절대 위치 시간 블록 (시간 좌표로 배치) + 클릭 시 추가/편집.
 */
import { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { usePlannerToday } from '@/hooks/planner/usePlannerToday';
import { taskStore } from '@/services/planner/taskStore';
import { PlannerSection } from './PlannerSection';
import { PlannerCard } from './PlannerCard';
import { PlannerEmpty } from './PlannerEmpty';

const formatHm = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

interface TodayTimelineProps {
  dateIso?: string;
}

export const TodayTimeline = ({ dateIso }: TodayTimelineProps) => {
  const items = usePlannerToday(dateIso);
  const [now, setNow] = useState(new Date());

  // 현재 시각 1분마다 갱신 (빨간 가로선 위치).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const dateLabel = useMemo(
    () => new Date(dateIso ?? now.toISOString()).toLocaleDateString('ko-KR', {
      month: 'long', day: 'numeric', weekday: 'short',
    }),
    [dateIso, now],
  );

  return (
    <PlannerSection label="오늘" count={dateLabel} className="h-full">
      {items.length === 0 ? (
        <PlannerEmpty
          icon={<CalendarIcon className="h-5 w-5" />}
          title="오늘은 비어 있어요"
          hint="좌측 인박스에서 할 일을 골라 시간을 배정해보세요"
        />
      ) : (
        <div className="space-y-1.5 px-1">
          {items.map((item) => {
            const id = item.data.id;
            const title = item.data.title;
            const startAt = item.data.startAt;
            if (!startAt) return null;
            return (
              <PlannerCard
                key={id}
                variant="block"
                kind={item.kind}
                title={title}
                startLabel={formatHm(startAt)}
                done={item.kind === 'task' ? item.data.done : false}
                color={item.kind === 'event' ? item.data.color : undefined}
                onClick={() => {
                  if (item.kind === 'task') taskStore.toggleDone(id);
                }}
              />
            );
          })}
        </div>
      )}
    </PlannerSection>
  );
};

