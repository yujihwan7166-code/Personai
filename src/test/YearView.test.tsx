import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { YearView } from '@/components/planner/YearView';

vi.mock('@/hooks/planner/usePlannerRange', () => ({
  usePlannerRange: () => [],
}));

describe('YearView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 10, 9, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks the current month with a clear border instead of a gray fill', () => {
    render(<YearView anchorIso={new Date(2026, 0, 1).toISOString()} />);

    const currentMonth = screen.getByRole('button', { name: '6월 보기 (현재 월)' });
    expect(currentMonth).toHaveAttribute('data-current-month', 'true');
    expect(currentMonth).toHaveClass('bg-card', 'ring-[3px]', 'ring-inset', 'ring-primary/55');
    expect(currentMonth).not.toHaveClass('bg-muted', 'bg-accent', 'bg-foreground');
  });
});
