import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Planner from '@/pages/Planner';
import type { PlannerTask } from '@/types/planner';

const task = (patch: Partial<PlannerTask> & Pick<PlannerTask, 'id' | 'title' | 'createdAt'>): PlannerTask => ({
  done: false,
  ...patch,
});

const renderPlanner = () =>
  render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Planner />
    </MemoryRouter>,
  );

describe('Planner header search', () => {
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
    window.localStorage.clear();
    window.localStorage.setItem('planner.tasks.v1', JSON.stringify([
      task({
        id: 'task-search-1',
        title: '코딩 첫번째',
        createdAt: '2026-06-09T08:00:00.000Z',
      }),
      task({
        id: 'task-search-2',
        title: '코딩 두번째',
        createdAt: '2026-06-10T08:00:00.000Z',
      }),
    ]));
    window.localStorage.setItem('planner.events.v1', JSON.stringify([]));
  });

  it('connects header search results to keyboard selection', async () => {
    renderPlanner();

    fireEvent.click(screen.getByRole('button', { name: '플래너 검색' }));
    const input = await screen.findByRole('combobox', { name: '검색어' });

    fireEvent.change(input, { target: { value: '코딩' } });

    const listbox = await screen.findByRole('listbox', { name: '검색 결과' });
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', options[1].id);

    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByDisplayValue('코딩 두번째')).toBeInTheDocument();
    });
  });
});
