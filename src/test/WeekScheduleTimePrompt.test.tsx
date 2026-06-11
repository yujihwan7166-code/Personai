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
  it('labels the dialog, focuses the time input, and exposes selected presets', () => {
    render(
      <WeekScheduleTimePrompt
        pending={{ task, dayKey: '2026-06-11', copy: false }}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: /시간 정하기 코딩/ });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('시작 시간')).toHaveFocus();
    expect(screen.getByRole('button', { name: '09:00 시작 시간 선택' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '1시간 길이 선택' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '12:00 시작 시간 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '1시간 30분 길이 선택' }));

    expect(screen.getByRole('button', { name: '12:00 시작 시간 선택' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '1시간 30분 길이 선택' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('현재 선택: 12:00 시작, 1시간 30분')).toBeInTheDocument();
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
    // 새 디자인에서는 풀폭 CTA(일정화 버튼) 가 모달의 마지막 포커스 가능 요소.
    const confirmButton = screen.getByRole('button', { name: /일정화/ });

    confirmButton.focus();
    fireEvent.keyDown(confirmButton, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
    expect(confirmButton).toHaveFocus();
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

    fireEvent.click(screen.getByRole('button', { name: '18:00 시작 시간 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '30분 길이 선택' }));
    fireEvent.click(screen.getByRole('button', { name: /18:00 시작 30분 일정화/ }));
    expect(onConfirm).toHaveBeenCalledWith('18:00', 30);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
