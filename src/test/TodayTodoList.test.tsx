import { DndContext } from '@dnd-kit/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { TodayTodoList } from '@/components/planner/TodayTodoList';
import { taskStore } from '@/services/planner/taskStore';

const renderTodoList = () => render(
  <DndContext>
    <TodayTodoList anchorIso="2026-06-10T00:00:00.000Z" embedded />
  </DndContext>,
);

const expectTaskOrder = (container: HTMLElement, titles: string[]) => {
  const text = container.querySelector('[data-planner-readable="todo"]')?.textContent ?? '';
  const indexes = titles.map((title) => text.indexOf(title));
  indexes.forEach((index) => expect(index).toBeGreaterThanOrEqual(0));
  expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
};

describe('TodayTodoList', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('hides reorder controls for collapsed overdue items and restores them when expanded', () => {
    for (let i = 1; i <= 4; i += 1) {
      taskStore.add({
        title: `밀린 할 일 ${i}`,
        plannedFor: '2026-06-09',
      });
    }

    renderTodoList();

    expect(screen.getByRole('button', { name: '+1개 더 보기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /위로 이동$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /아래로 이동$/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '+1개 더 보기' }));

    expect(screen.getAllByRole('button', { name: /위로 이동$/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /아래로 이동$/ }).length).toBeGreaterThan(0);
  });

  it('moves today todos within the visible list and names reorder buttons by task', () => {
    taskStore.add({ title: '첫째', plannedFor: '2026-06-10', todoOrder: 10 });
    taskStore.add({ title: '둘째', plannedFor: '2026-06-10', todoOrder: 20 });
    taskStore.add({ title: '셋째', plannedFor: '2026-06-10', todoOrder: 30 });

    const { container } = renderTodoList();

    expectTaskOrder(container, ['첫째', '둘째', '셋째']);

    fireEvent.click(screen.getByRole('button', { name: '셋째 위로 이동' }));
    expectTaskOrder(container, ['첫째', '셋째', '둘째']);

    fireEvent.click(screen.getByRole('button', { name: '첫째 아래로 이동' }));
    expectTaskOrder(container, ['셋째', '첫째', '둘째']);
  });
});
