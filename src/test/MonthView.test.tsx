import { DndContext } from '@dnd-kit/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MonthView } from '@/components/planner/MonthView';
import type { PlannerTask, PlannerTimelineItem } from '@/types/planner';

const mockCalendarRange = vi.hoisted(() => ({
  timedItems: [] as PlannerTimelineItem[],
  dateTodos: [] as PlannerTask[],
}));

vi.mock('@/hooks/planner/usePlannerCalendarRange', () => ({
  usePlannerCalendarRange: () => mockCalendarRange,
}));

const renderMonth = (props: Partial<Parameters<typeof MonthView>[0]> = {}) =>
  render(
    <DndContext>
      <MonthView anchorIso={new Date(2026, 5, 1).toISOString()} {...props} />
    </DndContext>,
  );

describe('MonthView', () => {
  beforeEach(() => {
    mockCalendarRange.timedItems = [];
    mockCalendarRange.dateTodos = [];
  });

  it('keeps month event chips borderless while retaining a subtle color tint', () => {
    mockCalendarRange.timedItems = [
      {
        kind: 'event',
        data: {
          id: 'event-colored',
          title: '헬스장 가기',
          startAt: new Date(2026, 5, 9, 12, 30).toISOString(),
          endAt: new Date(2026, 5, 9, 14, 0).toISOString(),
          color: 'hsl(140 50% 45%)',
          source: 'user',
          createdAt: new Date(2026, 5, 1, 9, 0).toISOString(),
        },
      },
    ];

    renderMonth();

    const chip = document.querySelector('[data-month-preview-item="event-event-colored"]');
    expect(chip).toBeInstanceOf(HTMLElement);
    expect(chip).not.toHaveClass('border', 'border-l', 'border-r', 'border-primary');
    expect(chip?.getAttribute('style')).toContain('--month-item-color: hsl(140 50% 45%)');
    expect(screen.getByText('헬스장 가기')).toBeInTheDocument();
  });

  it('shows overnight timed items on every month day they overlap', () => {
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

    renderMonth();

    expect(screen.getAllByText('밤 운동')).toHaveLength(2);
    expect(screen.getByText('계속')).toBeInTheDocument();
  });

  it('uses a natural Korean label for the day jump action', () => {
    renderMonth({ onDayClick: vi.fn() });

    const dayCell = document.querySelector('[data-month-day="2026-06-09"]');
    expect(dayCell).toBeInstanceOf(HTMLElement);

    fireEvent.click(dayCell as HTMLElement);

    expect(screen.getByRole('button', { name: /일 보기/ })).toBeInTheDocument();
    expect(screen.queryByText('Day 뷰')).not.toBeInTheDocument();
  });

  it('keeps the more-items indicator visible when a month day has many items', () => {
    mockCalendarRange.dateTodos = Array.from({ length: 4 }, (_, index) => ({
      id: `task-many-${index + 1}`,
      title: `Todo ${index + 1}`,
      done: false,
      createdAt: `2026-06-0${index + 1}T00:00:00.000Z`,
      plannedFor: '2026-06-10',
    }));

    renderMonth();

    expect(screen.getByText('Todo 1')).toBeInTheDocument();
    expect(screen.getByText('Todo 2')).toBeInTheDocument();
    expect(screen.queryByText('Todo 3')).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp('\\uC678 2\\uAC1C \\uB354 \\uC788\\uC74C'))).toBeInTheDocument();
  });

  it('opens a day popover from the keyboard and restores focus on Escape', async () => {
    renderMonth();

    const dayCell = screen.getByRole('button', {
      name: /6월 9일 화요일, 비어 있음\. 자세히 보기/,
    });

    dayCell.focus();
    fireEvent.keyDown(dayCell, { key: 'Enter' });

    expect(screen.getByText('이 날 비어있어요.')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('이 날 비어있어요.')).not.toBeInTheDocument();
      expect(dayCell).toHaveFocus();
    });
  });
});
