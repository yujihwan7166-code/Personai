import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlannerCommandPalette } from '@/components/planner/PlannerCommandPalette';
import type { PlannerTask } from '@/types/planner';

const storeMock = vi.hoisted(() => ({
  tasks: [] as PlannerTask[],
  events: [] as Array<{ id: string; title: string; startAt: string }>,
}));

vi.mock('@/services/planner/taskStore', () => ({
  taskStore: {
    list: () => storeMock.tasks,
  },
}));

vi.mock('@/services/planner/eventStore', () => ({
  eventStore: {
    list: () => storeMock.events,
  },
}));

describe('PlannerCommandPalette', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  beforeEach(() => {
    storeMock.tasks = [];
    storeMock.events = [];
  });

  it('opens as a labelled modal command surface and runs quick actions', async () => {
    const onOpenChange = vi.fn();
    const onAction = vi.fn();
    render(<PlannerCommandPalette open onOpenChange={onOpenChange} onAction={onAction} />);

    const dialog = screen.getByRole('dialog', { name: '명령 팔레트' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('동작, 보기, 일정, 할 일을 검색하고 Enter로 실행합니다.');
    expect(screen.getByLabelText('명령 검색')).toHaveFocus();
    expect(screen.getByRole('listbox', { name: '명령 결과' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('주 뷰'));
    expect(onAction).toHaveBeenCalledWith({ kind: 'view', view: 'week' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('filters tasks and events, restoring focus only for dismissals', async () => {
    storeMock.tasks = [{
      id: 'task-command-1',
      title: '코딩 복습',
      done: false,
      createdAt: '2026-06-10T00:00:00.000Z',
      startAt: '2026-06-10T09:00:00.000Z',
    }];
    storeMock.events = [{
      id: 'event-command-1',
      title: '코딩 약속',
      startAt: '2026-06-10T12:00:00.000Z',
    }];

    const onOpenChange = vi.fn();
    const onAction = vi.fn();
    const Harness = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button">이전 위치</button>
          <PlannerCommandPalette
            open={open}
            onOpenChange={(nextOpen) => {
              onOpenChange(nextOpen);
              setOpen(nextOpen);
            }}
            onAction={onAction}
          />
        </>
      );
    };

    render(<Harness />);
    const previousFocus = screen.getByRole('button', { name: '이전 위치' });
    previousFocus.focus();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    fireEvent.change(screen.getByLabelText('명령 검색'), { target: { value: '코딩' } });
    expect(await screen.findByText('코딩 복습')).toBeInTheDocument();
    expect(screen.getByText('코딩 약속')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(previousFocus).toHaveFocus());

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.change(screen.getByLabelText('명령 검색'), { target: { value: '코딩' } });
    fireEvent.click(screen.getByText('코딩 복습'));
    expect(onAction).toHaveBeenCalledWith({
      kind: 'jumpToTask',
      id: 'task-command-1',
      startAt: '2026-06-10T09:00:00.000Z',
    });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '명령 팔레트' })).not.toBeInTheDocument());
    expect(screen.getByText('이전 위치')).not.toHaveFocus();
  });

  it('shows a useful empty state for searches with no matching command or item', async () => {
    render(<PlannerCommandPalette open onOpenChange={vi.fn()} onAction={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('명령 검색'), { target: { value: '없는검색어zz' } });

    expect(await screen.findByRole('status')).toHaveTextContent('일치하는 항목이 없어요.');
    expect(screen.getByRole('status')).toHaveTextContent('할 일, 일정 제목이나 동작 이름을 검색할 수 있어요.');
  });

  it('closes only when the backdrop press starts and ends on the backdrop', () => {
    const onOpenChange = vi.fn();
    render(<PlannerCommandPalette open onOpenChange={onOpenChange} onAction={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: '명령 팔레트' });
    const input = screen.getByLabelText('명령 검색');

    fireEvent.pointerDown(input);
    fireEvent.pointerUp(dialog);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.pointerDown(dialog);
    fireEvent.pointerUp(input);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.pointerDown(dialog);
    fireEvent.pointerUp(dialog);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
