import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlannerTrashDialog } from '@/components/planner/PlannerTrashDialog';
import { eventStore } from '@/services/planner/eventStore';
import { taskStore } from '@/services/planner/taskStore';

vi.mock('@/lib/notify', () => ({
  notify: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PlannerTrashDialog', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('exposes trash filters and item actions with clear labels', () => {
    const task = taskStore.add({ title: '대출 심사 전화하기' });
    const event = eventStore.add({
      title: '저녁약속',
      startAt: new Date(2026, 5, 10, 19, 0).toISOString(),
      endAt: new Date(2026, 5, 10, 20, 30).toISOString(),
      source: 'user',
    });
    taskStore.remove(task.id);
    eventStore.remove(event.id);

    render(<PlannerTrashDialog open onOpenChange={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: '휴지통' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAccessibleDescription('삭제된 일정과 할 일을 복원하거나 영구 삭제할 수 있습니다.');
    expect(screen.getByRole('button', { name: '휴지통 닫기' })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: '휴지통 항목 필터' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '전체 2' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '할 일 1' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('list', { name: '삭제된 플래너 항목' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '대출 심사 전화하기 복원' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저녁약속 영구 삭제' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '휴지통 2개 항목 모두 영구 삭제' })).toBeInTheDocument();
  });

  it('restores a trashed task and permanently deletes a named event after confirmation', async () => {
    const task = taskStore.add({ title: '코딩' });
    const event = eventStore.add({
      title: '운동',
      startAt: new Date(2026, 5, 10, 9, 0).toISOString(),
      endAt: new Date(2026, 5, 10, 10, 0).toISOString(),
      source: 'user',
    });
    taskStore.remove(task.id);
    eventStore.remove(event.id);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<PlannerTrashDialog open onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '코딩 복원' }));
    await waitFor(() => expect(taskStore.list().map((item) => item.title)).toContain('코딩'));
    expect(taskStore.listDeleted()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: '운동 영구 삭제' }));
    expect(confirmSpy).toHaveBeenCalledWith('"운동"을(를) 영구 삭제할까요? 복구할 수 없어요.');
    await waitFor(() => expect(eventStore.listDeleted()).toHaveLength(0));
    expect(eventStore.list()).toHaveLength(0);
  });

  it('announces an empty trash state', () => {
    render(<PlannerTrashDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('휴지통이 비어 있어요.');
  });
});
