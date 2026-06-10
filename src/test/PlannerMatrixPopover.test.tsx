import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlannerMatrixPopover } from '@/components/planner/PlannerMatrixPopover';

describe('PlannerMatrixPopover', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('opens as a named modal and focuses the close button', () => {
    render(<PlannerMatrixPopover open onOpenChange={() => {}} />);

    const dialog = screen.getByRole('dialog', { name: '아이젠하워 매트릭스' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('할 일을 긴급도와 중요도 기준으로 나누어 확인하고 선택할 수 있습니다.');
    expect(screen.getByRole('button', { name: '아이젠하워 매트릭스 닫기' })).toHaveFocus();
  });

  it('only closes from a complete backdrop press', () => {
    const onOpenChange = vi.fn();
    render(<PlannerMatrixPopover open onOpenChange={onOpenChange} />);

    const backdrop = screen.getByRole('dialog');
    const panel = backdrop.firstElementChild as HTMLElement;

    fireEvent.pointerDown(panel);
    fireEvent.pointerUp(backdrop);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.pointerDown(backdrop);
    fireEvent.pointerUp(panel);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.pointerDown(backdrop);
    fireEvent.pointerUp(backdrop);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('traps focus and restores it to the opener on Escape', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>매트릭스 열기</button>
          <PlannerMatrixPopover open={open} onOpenChange={setOpen} />
        </>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole('button', { name: '매트릭스 열기' });

    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole('dialog', { name: '아이젠하워 매트릭스' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '아이젠하워 매트릭스 닫기' })).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '아이젠하워 매트릭스' })).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
