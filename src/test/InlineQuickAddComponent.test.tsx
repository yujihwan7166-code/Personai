import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InlineQuickAdd } from '@/components/planner/InlineQuickAdd';
import { taskStore } from '@/services/planner/taskStore';

vi.mock('@/lib/notify', () => ({
  notify: {
    success: vi.fn(),
  },
}));

describe('InlineQuickAdd', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps typing available after choosing color and priority controls', async () => {
    const onClose = vi.fn();
    const startIso = new Date(2026, 4, 12, 14, 30, 0).toISOString();

    render(
      <InlineQuickAdd
        startIso={startIso}
        durationMin={30}
        style={{ top: 0, height: 80 }}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('group', { name: '인라인 일정 빠른 추가' })).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: '새 일정 제목' });
    await waitFor(() => expect(input).toHaveFocus());

    fireEvent.mouseDown(screen.getByRole('button', { name: '초록' }));
    fireEvent.click(screen.getByRole('button', { name: '초록' }));

    await waitFor(() => expect(input).toHaveFocus());

    fireEvent.mouseDown(screen.getByRole('button', { name: '높음' }));
    fireEvent.click(screen.getByRole('button', { name: '높음' }));

    await waitFor(() => expect(input).toHaveFocus());

    fireEvent.change(input, { target: { value: '회의 1시간' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const [created] = taskStore.list();
    expect(created).toMatchObject({
      title: '회의',
      startAt: startIso,
      color: 'green',
      priority: 3,
    });
    expect(created.endAt).toBe(new Date(new Date(startIso).getTime() + 60 * 60_000).toISOString());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not let the timeline pointer handler steal focus from the inline form', async () => {
    const onClose = vi.fn();
    const parentPointerDown = vi.fn((event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
    });
    const startIso = new Date(2026, 4, 12, 20, 30, 0).toISOString();

    render(
      <div onPointerDown={parentPointerDown}>
        <InlineQuickAdd
          startIso={startIso}
          durationMin={90}
          style={{ top: 0, height: 96 }}
          onClose={onClose}
        />
      </div>,
    );

    const input = screen.getByRole('textbox', { name: '새 일정 제목' });
    await waitFor(() => expect(input).toHaveFocus());

    fireEvent.pointerDown(screen.getByRole('button', { name: '초록' }));
    fireEvent.click(screen.getByRole('button', { name: '초록' }));
    await waitFor(() => expect(input).toHaveFocus());

    fireEvent.pointerDown(input);
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: '코딩' } });

    expect(parentPointerDown).not.toHaveBeenCalled();
    expect(input).toHaveValue('코딩');
  });
});
