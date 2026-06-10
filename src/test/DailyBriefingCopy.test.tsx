import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HabitsWidget } from '@/components/briefing/widgets';
import { buildBriefingData, type BriefingData } from '@/lib/buildBriefingData';
import type { PlacedWidget } from '@/lib/dailyBriefingStore';

const stores = vi.hoisted(() => ({
  tasks: [] as Array<{ id: string; title: string; done?: boolean; canceled?: boolean; someday?: boolean; plannedFor?: string; priority?: number; goalId?: string }>,
  activeHabits: [] as Array<{ id: string; title: string }>,
  checkins: new Map<string, number>(),
}));

vi.mock('@/services/planner/taskStore', () => ({
  taskStore: {
    list: () => stores.tasks,
    listScheduled: () => [],
  },
}));

vi.mock('@/services/planner/eventStore', () => ({
  eventStore: {
    listByDate: () => [],
  },
}));

vi.mock('@/services/planner/habitStore', () => ({
  habitStore: {
    listActive: () => stores.activeHabits,
  },
}));

vi.mock('@/services/planner/habitCheckinStore', () => ({
  habitCheckinStore: {
    range: (habitId: string, from: string) => Array.from({ length: stores.checkins.get(`${habitId}:${from}`) ?? 0 }),
  },
}));

vi.mock('@/services/planner/ddayStore', () => ({
  ddayStore: {
    list: () => [],
  },
}));

vi.mock('@/services/journalStore', () => ({
  journalStore: {
    listByDate: () => [],
  },
}));

const baseData = (): BriefingData => ({
  greeting: '좋은 아침이에요',
  date: '6월 10일 수요일',
  timed: [],
  inbox: [],
  overdue: [],
  habits: [],
  upcomingDday: [],
  monthMarks: {},
});

describe('daily briefing copy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 10, 9, 0, 0, 0));
    stores.tasks = [];
    stores.activeHabits = [];
    stores.checkins = new Map();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('describes habit continuity risk without English jargon in briefing data', () => {
    stores.activeHabits = [{ id: 'habit-1', title: '러닝' }];
    stores.checkins.set('habit-1:2026-06-09', 1);

    expect(buildBriefingData().pickFirst).toEqual({
      kind: 'habit',
      title: '러닝',
      reason: '연속 기록 끊길 위험',
    });
  });

  it('uses natural Korean copy for at-risk habits in the widget', () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <HabitsWidget
          widget={{ id: 'habits-1', type: 'habits', size: 'M', x: 0, y: 0 } as PlacedWidget}
          data={{
            ...baseData(),
            habits: [
              { id: 'habit-1', title: '러닝', done: false, streakAtRisk: true },
              { id: 'habit-2', title: '독서', done: true, streakAtRisk: false },
            ],
          }}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('연속 기록 위험 1개')).toBeInTheDocument();
    expect(screen.queryByText(/streak/i)).not.toBeInTheDocument();
  });
});
