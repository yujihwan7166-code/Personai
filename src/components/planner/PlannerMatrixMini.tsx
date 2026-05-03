/**
 * 사이드바 미니 아이젠하워 매트릭스 위젯.
 *
 * 분류:
 * - Q1 긴급+중요: priority>=2 AND (오늘/내일 시작 OR plannedFor=오늘/내일)
 * - Q2 중요:     priority>=2 AND Q1 아님
 * - Q3 긴급:     priority<2 AND 오늘/내일
 * - Q4 그 외:    나머지
 *
 * 분면당 최대 3개 + "+N" 카운트. 클릭 시 부모 콜백 (모달 오픈).
 * 220px 사이드바 폭 안에 들어가도록 2×2 컴팩트.
 */
import { useEffect, useMemo, useState } from 'react';
import { taskStore } from '@/services/planner/taskStore';
import { notify } from '@/lib/notify';
import { PLANNER_TASK_CHANGED, type PlannerTask } from '@/types/planner';
import { cn } from '@/lib/utils';

interface PlannerMatrixMiniProps {
  /** 호환용 — 더 이상 사용 X (matrix 클릭은 항상 완료 토글). */
  onTaskClick?: (task: { id: string; title: string }) => void;
  /** large 모드 — 팝오버용. 폰트/간격/표시 개수 모두 큼. */
  large?: boolean;
}

const handleClickDone = (task: PlannerTask): void => {
  taskStore.toggleDone(task.id);
  notify.success('완료!', { duration: 1000 });
};

const QUADRANT_HINT: Record<Quadrant, string> = {
  q1: '지금 해야 할 일',
  q2: '미리 일정 잡기',
  q3: '위임 / 빠르게 처리',
  q4: '나중에 / 검토',
};

const QUADRANT_BG: Record<Quadrant, string> = {
  q1: 'hsl(0 75% 55% / 0.08)',
  q2: 'hsl(45 85% 55% / 0.08)',
  q3: 'hsl(220 70% 55% / 0.08)',
  q4: 'hsl(220 10% 60% / 0.06)',
};

type Quadrant = 'q1' | 'q2' | 'q3' | 'q4';

const QUADRANT_META: Record<Quadrant, { label: string; tone: string }> = {
  q1: { label: '긴급·중요', tone: 'text-rose-500' },
  q2: { label: '중요',       tone: 'text-amber-500' },
  q3: { label: '긴급',       tone: 'text-blue-500' },
  q4: { label: '그 외',      tone: 'text-foreground/45' },
};

const localDayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isUrgent = (task: PlannerTask, todayKey: string, tomorrowKey: string): boolean => {
  if (task.plannedFor === todayKey || task.plannedFor === tomorrowKey) return true;
  if (task.startAt) {
    const dayKey = localDayKey(new Date(task.startAt));
    return dayKey === todayKey || dayKey === tomorrowKey;
  }
  return false;
};

const classify = (task: PlannerTask, todayKey: string, tomorrowKey: string): Quadrant => {
  const important = (task.priority ?? 0) >= 2;
  const urgent = isUrgent(task, todayKey, tomorrowKey);
  if (important && urgent) return 'q1';
  if (important) return 'q2';
  if (urgent) return 'q3';
  return 'q4';
};

export const PlannerMatrixMini = ({ onTaskClick, large = false }: PlannerMatrixMiniProps) => {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);

  useEffect(() => {
    const refresh = () => setTasks(taskStore.list().filter((t) => !t.done && !t.canceled));
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
  }, []);

  const grouped = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const todayKey = localDayKey(today);
    const tomorrowKey = localDayKey(tomorrow);

    const acc: Record<Quadrant, PlannerTask[]> = { q1: [], q2: [], q3: [], q4: [] };
    for (const task of tasks) acc[classify(task, todayKey, tomorrowKey)].push(task);
    // 분면 안에서 priority desc → createdAt desc
    for (const q of Object.keys(acc) as Quadrant[]) {
      acc[q].sort((a, b) => {
        const pd = (b.priority ?? 0) - (a.priority ?? 0);
        if (pd !== 0) return pd;
        return b.createdAt.localeCompare(a.createdAt);
      });
    }
    return acc;
  }, [tasks]);

  if (large) {
    const maxItems = 6;
    return (
      <div className="grid grid-cols-2 gap-3">
        {(['q1', 'q2', 'q3', 'q4'] as Quadrant[]).map((q) => {
          const items = grouped[q];
          const visible = items.slice(0, maxItems);
          const overflow = items.length - visible.length;
          const meta = QUADRANT_META[q];
          return (
            <div
              key={q}
              style={{ backgroundColor: QUADRANT_BG[q] }}
              className={cn(
                'min-h-[180px] rounded-lg border border-[hsl(var(--hairline))] p-3.5',
                'flex flex-col gap-2',
              )}
            >
              <div>
                <div className="flex items-baseline gap-2">
                  <span className={cn('text-[15px] font-bold tracking-tight leading-none', meta.tone)}>
                    {meta.label}
                  </span>
                  <span className="text-[12px] text-foreground/50 tabular-nums font-medium">
                    {items.length}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-foreground/55 leading-tight">
                  {QUADRANT_HINT[q]}
                </div>
              </div>
              <div className="flex flex-col gap-0.5 min-h-0">
                {visible.length === 0 ? (
                  <span className="px-1 text-[12.5px] text-foreground/35 italic">없음</span>
                ) : (
                  visible.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleClickDone(t)}
                      title={t.title}
                      className="text-left text-[13px] leading-snug text-foreground/90 hover:text-foreground hover:bg-foreground/5 rounded px-2 py-1 truncate font-medium"
                    >
                      {t.title}
                    </button>
                  ))
                )}
                {overflow > 0 && (
                  <span className="px-2 mt-0.5 text-[11px] text-foreground/55 tabular-nums">
                    +{overflow}개 더
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="px-1">
      <div className="px-1.5 mb-1.5 text-[10.5px] font-mono uppercase tracking-[0.14em] text-foreground/55 font-semibold">
        매트릭스
      </div>
      <div className="grid grid-cols-2 gap-1">
        {(['q1', 'q2', 'q3', 'q4'] as Quadrant[]).map((q) => {
          const items = grouped[q];
          const visible = items.slice(0, 3);
          const overflow = items.length - visible.length;
          const meta = QUADRANT_META[q];
          return (
            <div
              key={q}
              className={cn(
                'min-h-[78px] rounded-md border border-[hsl(var(--hairline))] bg-card/60 p-1.5',
                'flex flex-col gap-1',
              )}
            >
              <div className={cn('text-[9.5px] font-mono uppercase tracking-wide font-semibold leading-none', meta.tone)}>
                {meta.label}
                {items.length > 0 && (
                  <span className="ml-1 text-foreground/40 tabular-nums">{items.length}</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 min-h-0">
                {visible.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onTaskClick?.({ id: t.id, title: t.title })}
                    title={t.title}
                    className="text-left text-[10.5px] leading-tight text-foreground/85 hover:text-foreground hover:bg-accent rounded px-1 py-0.5 truncate"
                  >
                    {t.title}
                  </button>
                ))}
                {overflow > 0 && (
                  <span className="px-1 text-[9.5px] text-foreground/45 tabular-nums">+{overflow}</span>
                )}
                {items.length === 0 && (
                  <span className="px-1 text-[10px] text-foreground/35">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
