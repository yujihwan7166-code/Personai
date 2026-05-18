import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from '@/components/shared/Progress';

describe('Progress', () => {
  it('value 0~100 표시', () => {
    render(<Progress value={42} />);
    const p = screen.getByRole('progressbar');
    expect(p.getAttribute('aria-valuenow')).toBe('42');
  });
  it('범위 초과 → clamp', () => {
    render(<Progress value={200} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });
  it('음수 → 0', () => {
    render(<Progress value={-10} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  });
  it('indeterminate (value 없음) → aria-valuenow 없음', () => {
    render(<Progress />);
    expect(screen.getByRole('progressbar').hasAttribute('aria-valuenow')).toBe(false);
  });
});
