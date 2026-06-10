import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlannerAgendaMini } from '@/components/planner/PlannerAgendaMini';
import { PlannerAgendaPopover } from '@/components/planner/PlannerAgendaPopover';
import { eventStore } from '@/services/planner/eventStore';
import { taskStore } from '@/services/planner/taskStore';

describe('PlannerAgendaPopover', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 5, 10, 8, 0));
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('labels grouped agenda items by kind, day, time, and status', async () => {
    const onItemClick = vi.fn();
    const task = taskStore.add({
      title: '코딩',
      startAt: new Date(2026, 5, 10, 9, 0).toISOString(),
      endAt: new Date(2026, 5, 10, 10, 0).toISOString(),
      done: true,
    });
    eventStore.add({
      title: '저녁약속',
      startAt: new Date(2026, 5, 11, 19, 0).toISOString(),
      endAt: new Date(2026, 5, 11, 20, 30).toISOString(),
      source: 'user',
    });

    render(<PlannerAgendaMini large onItemClick={onItemClick} />);

    const list = await screen.findByRole('list', { name: '다가오는 일정 목록' });
    expect(within(list).getByRole('list', { name: '오늘 일정' })).toBeInTheDocument();
    expect(within(list).getByRole('list', { name: '내일 일정' })).toBeInTheDocument();

    const taskButton = within(list).getByRole('button', { name: '할 일 코딩, 오늘 09:00, 완료됨' });
    const eventButton = within(list).getByRole('button', { name: '일정 저녁약속, 내일 19:00' });
    expect(taskButton).toBeInTheDocument();
    expect(eventButton).toBeInTheDocument();

    fireEvent.click(taskButton);
    expect(onItemClick).toHaveBeenCalledWith({ id: task.id, title: '코딩' });
  });

  it('uses a named dialog and a specific close button label', async () => {
    const onOpenChange = vi.fn();
    render(<PlannerAgendaPopover open onOpenChange={onOpenChange} />);

    const dialog = screen.getByRole('dialog', { name: '다가오는 일정' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('다가오는 일정과 할 일을 날짜별로 확인하고 선택할 수 있습니다.');
    expect(screen.getByRole('button', { name: '다가오는 일정 닫기' })).toHaveFocus();
    expect(await screen.findByRole('status')).toHaveTextContent('예정된 일정 없음');

    fireEvent.click(screen.getByRole('button', { name: '다가오는 일정 닫기' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('only closes from a complete backdrop press', () => {
    const onOpenChange = vi.fn();
    render(<PlannerAgendaPopover open onOpenChange={onOpenChange} />);

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
          <button type="button" onClick={() => setOpen(true)}>일정 열기</button>
          <PlannerAgendaPopover open={open} onOpenChange={setOpen} />
        </>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole('button', { name: '일정 열기' });

    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole('dialog', { name: '다가오는 일정' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다가오는 일정 닫기' })).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '다가오는 일정' })).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('restores focus to the opener when closed from the close button', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>일정 열기</button>
          <PlannerAgendaPopover open={open} onOpenChange={setOpen} />
        </>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole('button', { name: '일정 열기' });

    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole('button', { name: '다가오는 일정 닫기' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '다가오는 일정' })).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('closes after picking an agenda item and returns focus to the opener', async () => {
    const task = taskStore.add({
      title: '헬스장 가기',
      startAt: new Date(2026, 5, 10, 12, 30).toISOString(),
      endAt: new Date(2026, 5, 10, 14, 0).toISOString(),
      done: false,
    });
    const onItemClick = vi.fn();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>일정 열기</button>
          <PlannerAgendaPopover open={open} onOpenChange={setOpen} onItemClick={onItemClick} />
        </>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole('button', { name: '일정 열기' });

    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(await screen.findByRole('button', { name: '할 일 헬스장 가기, 오늘 12:30' }));

    expect(onItemClick).toHaveBeenCalledWith({ id: task.id, title: '헬스장 가기' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '다가오는 일정' })).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
