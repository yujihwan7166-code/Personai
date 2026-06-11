import { DndContext } from '@dnd-kit/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlannerLibraryPanel } from '@/components/planner/PlannerLibraryPanel';
import type { PlannerLibraryItem } from '@/services/planner/libraryStore';

const STORAGE_KEY = 'planner.library.v1';

const seedLibrary = (items: PlannerLibraryItem[]) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const renderPanel = (onQuickAdd = vi.fn()) => {
  const onOpenChange = vi.fn();
  render(
    <DndContext>
      <PlannerLibraryPanel
        open
        anchorIso="2026-06-10T00:00:00.000Z"
        onOpenChange={onOpenChange}
        onQuickAdd={onQuickAdd}
      />
    </DndContext>,
  );
  return { onOpenChange, onQuickAdd };
};

describe('PlannerLibraryPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('labels the floating library panel and exposes focused item actions without truncating the real title', () => {
    const longTitle = '아주 긴 보관 항목 제목 전체 확인';
    seedLibrary([
      {
        id: 'lib-long-title',
        kind: 'task',
        title: longTitle,
        durationMin: 90,
        color: 'amber',
        priority: 0,
        createdAt: '2026-06-10T00:00:00.000Z',
        updatedAt: '2026-06-10T00:00:00.000Z',
      },
    ]);
    const { onQuickAdd } = renderPanel();

    const panel = screen.getByRole('dialog', { name: '보관함' });
    expect(panel).toHaveAccessibleDescription('자주 쓰는 일정과 할 일을 저장하고, 주간 플래너로 드래그하거나 빠르게 추가합니다.');
    expect(panel).toHaveClass('top-[112px]');
    expect(panel).toHaveClass('max-h-[calc(100vh-128px)]');
    expect(within(panel).getByRole('heading', { name: '보관함' })).toHaveClass('leading-5');
    const item = within(panel).getByRole('button', { name: `${longTitle} 빠르게 추가` });
    expect(item).toHaveAttribute('title', longTitle);
    expect(item).toHaveClass('focus-visible:ring-2');

    const toolbar = within(panel).getByRole('toolbar', { name: `${longTitle} 빠른 작업` });
    expect(toolbar).toHaveClass('group-focus-within:opacity-100');
    expect(within(toolbar).getByRole('button', { name: `${longTitle} 추가` })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: `${longTitle} 수정` })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: `${longTitle} 삭제` })).toBeInTheDocument();

    fireEvent.keyDown(item, { key: 'Enter' });
    expect(onQuickAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'lib-long-title' }));
  });

  it('closes the floating library panel with Escape', () => {
    seedLibrary([]);
    const { onOpenChange } = renderPanel();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('marks the panel as non-modal and restores focus to the opener when closed', async () => {
    seedLibrary([]);

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <DndContext>
          <button type="button" onClick={() => setOpen(true)}>
            보관함 열기
          </button>
          <PlannerLibraryPanel
            open={open}
            anchorIso="2026-06-10T00:00:00.000Z"
            onOpenChange={setOpen}
            onQuickAdd={vi.fn()}
          />
        </DndContext>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole('button', { name: '보관함 열기' });
    opener.focus();
    fireEvent.click(opener);

    const panel = screen.getByRole('dialog', { name: '보관함' });
    expect(panel).toHaveAttribute('aria-modal', 'false');

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '보관함' })).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
