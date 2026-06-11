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
  it('labels the dialog, focuses the time input, and reflects manual edits', () => {
    render(
      <WeekScheduleTimePrompt
        pending={{ task, dayKey: '2026-06-11', copy: false }}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: /코딩/ });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // 시간 input 은 시계 popover trigger button 으로 바뀜 — 텍스트로 현재 시각 표시.
    const timeTrigger = screen.getByRole('button', { name: '시작 시간' });
    expect(timeTrigger).toHaveFocus();
    expect(timeTrigger).toHaveTextContent('09:00');
    // 기본 1시간(60분) 선택 — 칩 active.
    expect(screen.getByRole('button', { name: '1시간 길이 선택' })).toHaveAttribute('aria-pressed', 'true');

    // 길이는 분 input 직접 변경.
    const durationInput = screen.getByLabelText('길이 직접 입력 (분)') as HTMLInputElement;
    fireEvent.change(durationInput, { target: { value: '90' } });

    expect(durationInput.value).toBe('90');
    // 빠른 칩 3종 어디에도 안 잡히므로 모두 pressed=false.
    expect(screen.getByRole('button', { name: '30분 길이 선택' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '1시간 길이 선택' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '2시간 길이 선택' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('현재 선택: 09:00 시작, 1시간 30분')).toBeInTheDocument();
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

    const dialog = screen.getByRole('dialog', { name: /코딩/ });
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
    const timeTrigger = screen.getByRole('button', { name: '시작 시간' });

    fireEvent.pointerDown(timeTrigger);
    fireEvent.pointerUp(backdrop);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(backdrop);
    fireEvent.pointerUp(timeTrigger);
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

    // 시간 변경은 시계 popover 의 빠른 칩 (e.g. "18:00 선택") 으로 처리.
    // jsdom 에서도 radix Popover 가 동작하므로 trigger click → preset chip click.
    fireEvent.click(screen.getByRole('button', { name: '시작 시간' }));
    fireEvent.click(screen.getByRole('button', { name: '18:00 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '30분 길이 선택' }));
    fireEvent.click(screen.getByRole('button', { name: /18:00 시작 30분 일정화/ }));
    expect(onConfirm).toHaveBeenCalledWith('18:00', 30);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
