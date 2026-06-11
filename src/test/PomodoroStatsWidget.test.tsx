import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PomodoroStatsWidget } from '@/components/planner/PomodoroStatsWidget';
import type { PomodoroStats } from '@/hooks/planner/usePomodoroStats';

const mockStats = vi.hoisted(() => ({
  value: {
    todayCount: 0,
    todayMinutes: 0,
    weekCount: 0,
    weekMinutes: 0,
    streak: 0,
    bestStreak: 0,
    last14DaysMinutes: Array.from({ length: 14 }, () => 0),
  } satisfies PomodoroStats,
}));

vi.mock('@/hooks/planner/usePomodoroStats', () => ({
  usePomodoroStats: () => mockStats.value,
}));

vi.mock('@/services/planner/pomodoroSessionLog', () => ({
  pomodoroSessionLog: {
    listByRange: () => [],
  },
}));

describe('PomodoroStatsWidget', () => {
  beforeEach(() => {
    mockStats.value = {
      todayCount: 0,
      todayMinutes: 0,
      weekCount: 0,
      weekMinutes: 0,
      streak: 0,
      bestStreak: 0,
      last14DaysMinutes: Array.from({ length: 14 }, () => 0),
    };
  });

  it('stays hidden when there is no pomodoro activity today', () => {
    render(<PomodoroStatsWidget />);

    expect(screen.queryByRole('button', { name: /오늘 포모도로/ })).not.toBeInTheDocument();
  });

  it('summarizes today count, time, and streak in the button label', () => {
    mockStats.value = {
      todayCount: 4,
      todayMinutes: 100,
      weekCount: 7,
      weekMinutes: 180,
      streak: 3,
      bestStreak: 5,
      last14DaysMinutes: [100, 25, 0, 40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };

    render(<PomodoroStatsWidget />);

    expect(screen.getByRole('button', { name: '오늘 포모도로 4회, 1시간 40분, 3일 연속' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /streak/i })).not.toBeInTheDocument();
  });

  it('opens a labelled stats dialog with a concise description', () => {
    mockStats.value = {
      todayCount: 2,
      todayMinutes: 50,
      weekCount: 5,
      weekMinutes: 150,
      streak: 1,
      bestStreak: 4,
      last14DaysMinutes: [50, 25, 0, 40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };

    render(<PomodoroStatsWidget />);

    fireEvent.click(screen.getByRole('button', { name: '오늘 포모도로 2회, 50분' }));

    expect(screen.getByRole('dialog', { name: '🍅 포모도로 통계' }))
      .toHaveAccessibleDescription('오늘과 이번 주의 포모도로 횟수, 집중 시간, 연속 기록을 확인합니다.');
  });
});
