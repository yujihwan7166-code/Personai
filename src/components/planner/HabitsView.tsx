/**
 * 습관 풀뷰 — 좌 list + 우측 내장 detail pane.
 *
 * 좁은 화면에선 list만 표시, 행 클릭 시 detail 슬라이드 (Sheet).
 */
import { useEffect, useMemo, useState } from 'react';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';
import { useHabits } from '@/hooks/planner/useHabits';
import { HABIT_CHECKIN_CHANGED, type Habit, type HabitCheckin } from '@/types/habit';
import { HabitListPane } from './HabitListPane';
import { HabitDetailPane } from './HabitDetailPane';
import { NewHabitDialog } from './NewHabitDialog';

type DialogMode = { kind: 'create' } | { kind: 'edit'; habit: Habit };

export const HabitsView = () => {
  // includeArchived=true 로 모든 습관 가져온 뒤 List 안에서 viewMode 로 분기.
  const habits = useHabits(true);
  const [allCheckins, setAllCheckins] = useState<HabitCheckin[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const hasActiveHabits = activeHabits.length > 0;

  // 모든 체크인 — 주 dot 렌더링 + streak 계산용. 큰 deployment 에선 범위 한정 권장.
  useEffect(() => {
    const refresh = () => setAllCheckins(habitCheckinStore.list());
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(HABIT_CHECKIN_CHANGED, refresh);
    return () => window.removeEventListener(HABIT_CHECKIN_CHANGED, refresh);
  }, []);

  // 첫 habit 자동 선택.
  useEffect(() => {
    if (selectedId && activeHabits.some((h) => h.id === selectedId)) return;
    setSelectedId(activeHabits[0]?.id ?? null);
  }, [activeHabits, selectedId]);

  // Planner topbar "+ 새 습관" 버튼에서 dispatch — 외부 트리거로 dialog 오픈.
  useEffect(() => {
    const open = () => setDialogMode({ kind: 'create' });
    window.addEventListener('planner-habit-new', open);
    return () => window.removeEventListener('planner-habit-new', open);
  }, []);

  const selected = useMemo(
    () => activeHabits.find((h) => h.id === selectedId) ?? null,
    [activeHabits, selectedId],
  );

  return (
    <>
      <div
        className={
          hasActiveHabits
            ? 'h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] gap-0 min-h-0 bg-card/30'
            : 'h-full min-h-0'
        }
      >
        <div className="min-h-0 min-w-0">
          <HabitListPane
            habits={habits}
            allCheckins={allCheckins}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={() => setDialogMode({ kind: 'create' })}
            onEdit={(h) => setDialogMode({ kind: 'edit', habit: h })}
          />
        </div>
        {hasActiveHabits && (
          <div className="hidden min-h-0 min-w-0 border-l border-foreground/10 bg-card lg:block">
            {selected ? (
              <HabitDetailPane
                habit={selected}
                onEdit={() => setDialogMode({ kind: 'edit', habit: selected })}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-center p-6">
                <div className="text-[13px] text-foreground/55">
                  좌측에서 습관을 선택하세요
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <NewHabitDialog
        open={dialogMode !== null}
        mode={dialogMode}
        onClose={() => setDialogMode(null)}
      />
    </>
  );
};
