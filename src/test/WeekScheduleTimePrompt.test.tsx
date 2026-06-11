import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WeekScheduleTimePrompt } from '@/pages/Planner';
import type { PlannerTask } from '@/types/planner';

const task: PlannerTask = {
  id: 'task-week-prompt',
  title: '코딩',
  done: false,
  createdAt: '2026-06-10T00:00:00.000Z',
};

describe('WeekScheduleTimePrompt', () => {
  it('labels the dialog, focuses the start time input, and exposes a start/end range', () => {
    render(
      <WeekScheduleTimePrompt
        pending={{ task, dayKey: '2026-07-11', copy: false }}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: /시간 정하기 코딩/ });
    const startInput = screen.getByLabelText('시작 시간');
    const endInput = screen.getByLabelText('종료 시간');

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(startInput).toHaveFocus();
    expect(startInput).toHaveValue('09:00');
    expect(endInput).toHaveValue('10:00');
    expect(screen.queryByRole('button', { name: '09:00 시작 시간 선택' })).not.toBeInTheDocument();

    fireEvent.change(startInput, { target: { value: '12:00' } });
    expect(endInput).toHaveValue('13:00');

    fireEvent.change(endInput, { target: { value: '14:30' } });
    expect(screen.getByText('12:00 ~ 14:30 · 2시간 30분')).toBeInTheDocument();
  });

  it('keeps keyboard focus inside the time prompt', () => {
    render(
      <>
        <button type="button">뒤쪽 버튼</button>
        <WeekScheduleTimePrompt
          pending={{ task, dayKey: '2026-06-11', copy: false }}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </>,
    );

    const dialog = screen.getByRole('dialog', { name: /시간 정하기 코딩/ });
    const closeButton = screen.getByRole('button', { name: '시간 설정 닫기' });
    const scheduleButton = screen.getByRole('button', { name: /일정화/ });

    scheduleButton.focus();
    fireEvent.keyDown(scheduleButton, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
    expect(scheduleButton).toHaveFocus();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: '뒤쪽 버튼' })).not.toHaveFocus();
  });

  it('only closes from a complete backdrop press', () => {
    const onClose = vi.fn();
    render(
      <WeekScheduleTimePrompt
        pending={{ task, dayKey: '2026-06-11', copy: false }}
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement as HTMLElement;
    const timeInput = dialog.querySelector('input[type="time"]') as HTMLElement;

    fireEvent.pointerDown(timeInput);
    fireEvent.pointerUp(backdrop);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(backdrop);
    fireEvent.pointerUp(timeInput);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(backdrop);
    fireEvent.pointerUp(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('confirms with the selected time and duration and supports Escape close', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <WeekScheduleTimePrompt
        pending={{ task, dayKey: '2026-06-11', copy: false }}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.change(screen.getByLabelText('시작 시간'), { target: { value: '18:00' } });
    fireEvent.change(screen.getByLabelText('종료 시간'), { target: { value: '22:00' } });
    fireEvent.click(screen.getByRole('button', { name: /18:00 ~ 22:00 · 4시간 일정화/ }));
    expect(onConfirm).toHaveBeenCalledWith('18:00', 240);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('treats an end time before the start time as ending on the next day', () => {
    const onConfirm = vi.fn();
    render(
      <WeekScheduleTimePrompt
        pending={{ task, dayKey: '2026-07-11', copy: false }}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.change(screen.getByLabelText('시작 시간'), { target: { value: '22:00' } });
    fireEvent.change(screen.getByLabelText('종료 시간'), { target: { value: '02:00' } });

    expect(screen.getByText('22:00 ~ 02:00 · 4시간')).toBeInTheDocument();
    expect(screen.getByText('다음날 종료')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /22:00 ~ 02:00 · 4시간 일정화/ }));
    expect(onConfirm).toHaveBeenCalledWith('22:00', 240);
  });
});
