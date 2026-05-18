import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useHover } from '@/hooks/useHover';

function Demo() {
  const [ref, hovered] = useHover<HTMLDivElement>();
  return <div ref={ref} data-testid="el">{hovered ? 'YES' : 'NO'}</div>;
}

describe('useHover', () => {
  it('초기 false', () => {
    const { getByTestId } = render(<Demo />);
    expect(getByTestId('el').textContent).toBe('NO');
  });
  it('mouseenter → true', () => {
    const { getByTestId } = render(<Demo />);
    fireEvent.mouseEnter(getByTestId('el'));
    expect(getByTestId('el').textContent).toBe('YES');
  });
  it('mouseleave → false', () => {
    const { getByTestId } = render(<Demo />);
    fireEvent.mouseEnter(getByTestId('el'));
    fireEvent.mouseLeave(getByTestId('el'));
    expect(getByTestId('el').textContent).toBe('NO');
  });
});
