import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlannerDday } from '@/components/planner/PlannerDday';

const STORAGE_KEY = 'planner.ddays.v1';

vi.mock('@/lib/notify', () => ({
  notify: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('PlannerDday', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('opens the D-day manager as a described dialog and focuses the name field', async () => {
    render(<PlannerDday />);

    fireEvent.click(screen.getByRole('button', { name: '새 디데이' }));

    const dialog = screen.getByRole('dialog', { name: 'D-day' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('시험, 발표, 마감 같은 중요한 날짜를 추가하고 수정합니다.');
    expect(screen.getByRole('button', { name: 'D-day 관리 닫기' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText('디데이 이름')).toHaveFocus();
    });
  });

  it('only closes the manager from a complete backdrop press', async () => {
    render(<PlannerDday />);

    fireEvent.click(screen.getByRole('button', { name: '새 디데이' }));

    const dialog = screen.getByRole('dialog', { name: 'D-day' });
    const backdrop = dialog.parentElement as HTMLElement;
    const nameInput = screen.getByLabelText('디데이 이름');
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.pointerDown(nameInput);
    fireEvent.pointerUp(backdrop);
    expect(screen.getByRole('dialog', { name: 'D-day' })).toBeInTheDocument();

    fireEvent.pointerDown(backdrop);
    fireEvent.pointerUp(nameInput);
    expect(screen.getByRole('dialog', { name: 'D-day' })).toBeInTheDocument();

    fireEvent.pointerDown(backdrop);
    fireEvent.pointerUp(backdrop);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'D-day' })).not.toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe('');
  });

  it('lets keyboard users select an existing D-day for editing and close with Escape', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([
      {
        id: 'dday-license',
        label: '약사 국가고시',
        dateIso: '2027-01-14',
        createdAt: '2026-06-10T00:00:00.000Z',
      },
    ]));

    render(<PlannerDday />);

    fireEvent.click(screen.getByRole('button', { name: '새 디데이' }));

    const item = screen.getByRole('button', { name: '약사 국가고시 수정' });
    expect(item).toHaveAttribute('aria-pressed', 'false');

    fireEvent.keyDown(item, { key: 'Enter' });

    expect(item).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('디데이 이름')).toHaveValue('약사 국가고시');
    expect(screen.getByLabelText('목표 날짜')).toHaveValue('2027-01-14');

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'D-day' })).not.toBeInTheDocument();
    });
  });
});
