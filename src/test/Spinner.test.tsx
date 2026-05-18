import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '@/components/shared/Spinner';

describe('Spinner', () => {
  it('role=status', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeTruthy();
  });
  it('label aria', () => {
    render(<Spinner label="저장 중" />);
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('저장 중');
  });
  it('size sm/lg svg 크기 다름', () => {
    const { container, rerender } = render(<Spinner size="sm" />);
    const sm = container.querySelector('svg')?.getAttribute('width');
    rerender(<Spinner size="lg" />);
    const lg = container.querySelector('svg')?.getAttribute('width');
    expect(sm).toBe('14');
    expect(lg).toBe('28');
  });
});
