import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

function Modal({ active = true }: { active?: boolean }) {
  const ref = useFocusTrap<HTMLDivElement>(active);
  return (
    <div ref={ref}>
      <button data-testid="a">A</button>
      <button data-testid="b">B</button>
      <button data-testid="c">C</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('마운트 시 첫 요소 focus', () => {
    const { getByTestId } = render(<Modal />);
    expect(document.activeElement).toBe(getByTestId('a'));
  });

  it('Tab forward from last → first', () => {
    const { getByTestId, container } = render(<Modal />);
    const c = getByTestId('c');
    c.focus();
    fireEvent.keyDown(container.firstElementChild!, { key: 'Tab' });
    expect(document.activeElement).toBe(getByTestId('a'));
  });

  it('Shift+Tab from first → last', () => {
    const { getByTestId, container } = render(<Modal />);
    const a = getByTestId('a');
    a.focus();
    fireEvent.keyDown(container.firstElementChild!, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(getByTestId('c'));
  });
});
