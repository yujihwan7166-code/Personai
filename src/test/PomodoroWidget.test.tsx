import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PomodoroWidget, QuickPomodoroButton, StartPomodoroButton } from '@/components/planner/PomodoroWidget';
import { pomodoroStore } from '@/services/planner/pomodoroStore';

vi.mock('@/lib/notify', () => ({
  notify: {
    info: vi.fn(),
    success: vi.fn(),
  },
}));

describe('PomodoroWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 10, 9, 0, 0, 0));
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('describes the running timer and icon controls with clear context', () => {
    pomodoroStore.start({
      durationMin: 25,
      autoComplete: false,
      phase: 'work',
      setIndex: 1,
      taskTitle: '헬스장 가기',
    });

    render(<PomodoroWidget />);

    expect(screen.getByRole('region', { name: '포모도로 집중 타이머, 25:00 남음, 헬스장 가기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '포모도로 일시정지' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '포모도로 중단' })).toBeInTheDocument();
  });

  it('exposes the quick-start duration picker as a menu', () => {
    render(<QuickPomodoroButton />);

    const trigger = screen.getByRole('button', { name: '자유 포모도로 시간 선택' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: '포모도로 시간 선택' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '25분 집중 시작, 기본' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '90분 집중 시작' })).toBeInTheDocument();
  });

  it('names task-linked start buttons with task and duration', () => {
    render(<StartPomodoroButton taskTitle="코딩" durationMin={45} />);

    expect(screen.getByRole('button', { name: '코딩 45분 포모도로 집중 시작' })).toBeInTheDocument();
  });
});
