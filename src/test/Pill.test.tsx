import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Pill } from '@/components/shared/Pill';

describe('Pill', () => {
  it('children 표시', () => {
    render(<Pill>NEW</Pill>);
    expect(screen.getByText('NEW')).toBeTruthy();
  });
  it('tone 클래스 적용', () => {
    const { container } = render(<Pill tone="danger">위험</Pill>);
    expect(container.firstElementChild?.className).toContain('text-red');
  });
  it('기본 neutral', () => {
    const { container } = render(<Pill>x</Pill>);
    expect(container.firstElementChild?.className).toContain('bg-muted');
  });
});
