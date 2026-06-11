import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WeekView } from '@/components/planner/WeekView';
import { weekDropHintLabel } from '@/lib/planner/weekDropHint';
import type { PlannerTask, PlannerTimelineItem } from '@/types/planner';

const mockCalendarRange = vi.hoisted(() => ({
  timedItems: [] as PlannerTimelineItem[],
  dateTodos: [] as PlannerTask[],
}));

vi.mock('@/hooks/planner/usePlannerCalendarRange', () => ({
  usePlannerCalendarRange: () => mockCalendarRange,
}));

vi.mock('@/services/planner/taskListStore', () => ({
  taskListStore: {
    list: () => [],
  },
}));

const renderWeek = (props: Partial<Parameters<typeof WeekView>[0]> = {}) =>
  render(
    <DndContext>
      <WeekView anchorIso={new Date(2026, 5, 9).toISOString()} {...props} />
    </DndContext>,
  );

describe('WeekView', () => {
  beforeEach(() => {
    mockCalendarRange.timedItems = [];
    mockCalendarRange.dateTodos = [];
  });

  it('uses a natural Korean label for week day navigation', () => {
    renderWeek({ onDayClick: vi.fn() });

    expect(screen.getByRole('button', { name: /9일 화요일.*일 보기로/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Day 뷰/ })).not.toBeInTheDocument();
  });

  it('shows overnight timed items on each week day they overlap with unique draggable ids', () => {
    mockCalendarRange.timedItems = [
      {
        kind: 'event',
        data: {
          id: 'event-overnight',
          title: '밤 운동',
          startAt: new Date(2026, 5, 9, 23, 0).toISOString(),
          endAt: new Date(2026, 5, 10, 2, 0).toISOString(),
          color: 'hsl(270 50% 55%)',
          source: 'user',
          createdAt: new Date(2026, 5, 1, 9, 0).toISOString(),
        },
      },
    ];

    renderWeek();

    expect(screen.getAllByText('밤 운동')).toHaveLength(2);
    expect(screen.getByText('계속')).toBeInTheDocument();
    expect(document.querySelector('[data-draggable-id="week-2026-06-09-event-event-overnight"]')).toBeInTheDocument();
    expect(document.querySelector('[data-draggable-id="week-2026-06-10-event-event-overnight"]')).toBeInTheDocument();
  });

  it('uses gentle drop hints while dragging across week sections', () => {
    expect(weekDropHintLabel(
      { kind: 'todo-list', dayKey: '2026-06-09' },
      { kind: 'scheduled-task', task: { id: 'task-1', title: '운동', done: false, createdAt: '2026-06-09T00:00:00.000Z' } as PlannerTask },
      false,
      '놓으면 할 일로 추가',
    )).toBe('놓으면 시간 없이 할 일로');

    expect(weekDropHintLabel(
      { kind: 'schedule-day', dayIso: '2026-06-09T00:00:00.000Z', dayKey: '2026-06-09' },
      { kind: 'planned-task', task: { id: 'task-2', title: '코딩', done: false, createdAt: '2026-06-09T00:00:00.000Z' } as PlannerTask },
      false,
      '놓으면 시간 선택',
    )).toBe('놓으면 시간 선택');

    expect(weekDropHintLabel(
      { kind: 'todo-list', dayKey: '2026-06-09' },
      { kind: 'scheduled-event', event: { id: 'event-1', title: '회의', startAt: '2026-06-09T09:00:00.000Z', endAt: '2026-06-09T10:00:00.000Z', color: '#8b5cf6', source: 'user', createdAt: '2026-06-09T00:00:00.000Z' } },
      true,
      '놓으면 할 일로 추가',
    )).toBe('놓을 수 없음');
  });
});
