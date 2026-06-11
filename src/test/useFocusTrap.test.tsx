import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

function Modal({
  active = true,
  restoreFocus,
}: {
  active?: boolean;
  restoreFocus?: boolean;
}) {
  const ref = useFocusTrap<HTMLDivElement>(
    restoreFocus === undefined ? active : { active, restoreFocus },
  );
  return (
    <div ref={ref}>
      <button data-testid="a">A</button>
      <button data-testid="b">B</button>
      <button data-testid="c">C</button>
    </div>
  );
}

function Harness({
  open: controlledOpen,
  restoreFocus = true,
}: {
  open?: boolean;
  restoreFocus?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  return (
    <>
      <button data-testid="opener" type="button" onClick={() => setUncontrolledOpen(true)}>
        Opener
      </button>
      {open && <Modal restoreFocus={restoreFocus} />}
    </>
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

  it('기본적으로 이전 포커스를 복원한다', () => {
    const { getByTestId, rerender } = render(<Harness open={false} />);
    const opener = getByTestId('opener');
    opener.focus();
    rerender(<Harness open />);
    expect(document.activeElement).toBe(getByTestId('a'));

    rerender(<Harness open={false} />);

    expect(document.activeElement).toBe(getByTestId('opener'));
  });

  it('다른 표면이 이어서 열릴 때 포커스 복원을 건너뛸 수 있다', () => {
    const { getByTestId, rerender } = render(<Harness open={false} restoreFocus={false} />);
    const opener = getByTestId('opener');
    opener.focus();
    rerender(<Harness open restoreFocus={false} />);
    expect(document.activeElement).toBe(getByTestId('a'));
    getByTestId('b').focus();

    rerender(<Harness open={false} restoreFocus={false} />);

    expect(document.activeElement).not.toBe(getByTestId('opener'));
  });
});
