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

  it('creates a timed task after choosing color and priority controls', async () => {
    const onClose = vi.fn();
    const startIso = new Date(2026, 4, 12, 14, 30, 0).toISOString();

    render(
      <InlineQuickAdd
        startIso={startIso}
        durationMin={30}
        style={{ top: 0, height: 90 }}
        onClose={onClose}
      />,
    );

    const title = screen.getByRole('textbox', { name: '새 일정 제목' });
    await waitFor(() => expect(title).toHaveFocus());

    fireEvent.pointerDown(screen.getByRole('button', { name: '초록' }));
    fireEvent.click(screen.getByRole('button', { name: '초록' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: '높음' }));
    fireEvent.click(screen.getByRole('button', { name: '높음' }));

    await waitFor(() => expect(title).toHaveFocus());

    fireEvent.change(title, { target: { value: '회의 1시간' } });
    fireEvent.keyDown(title, { key: 'Enter' });

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

  it('keeps the whole blank body usable as the title editor after toolbar clicks', async () => {
    const onClose = vi.fn();
    const startIso = new Date(2026, 4, 12, 11, 0, 0).toISOString();

    const { container } = render(
      <InlineQuickAdd
        startIso={startIso}
        durationMin={180}
        style={{ top: 0, height: 150 }}
        onClose={onClose}
      />,
    );

    const wrapper = container.querySelector('[data-inline-quick-add="true"]')!;
    const title = screen.getByRole('textbox', { name: '새 일정 제목' });

    fireEvent.pointerDown(screen.getByRole('button', { name: '보라' }));
    fireEvent.click(screen.getByRole('button', { name: '보라' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: '보통' }));
    fireEvent.click(screen.getByRole('button', { name: '보통' }));

    fireEvent.click(wrapper);
    await waitFor(() => expect(title).toHaveFocus());

    fireEvent.change(title, { target: { value: '코딩' } });
    expect(title).toHaveValue('코딩');
  });

  it('does not let the timeline pointer handler steal interaction from the inline editor', async () => {
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
          style={{ top: 0, height: 110 }}
          onClose={onClose}
        />
      </div>,
    );

    const title = screen.getByRole('textbox', { name: '새 일정 제목' });
    await waitFor(() => expect(title).toHaveFocus());

    fireEvent.pointerDown(screen.getByRole('button', { name: '초록' }));
    fireEvent.click(screen.getByRole('button', { name: '초록' }));
    fireEvent.pointerDown(title);
    fireEvent.click(title);
    fireEvent.change(title, { target: { value: '코딩' } });

    expect(parentPointerDown).not.toHaveBeenCalled();
    expect(title).toHaveValue('코딩');
  });
});
