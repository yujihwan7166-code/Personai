import { DndContext } from '@dnd-kit/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DroppableTimeSlot } from '@/components/planner/dnd/DroppableTimeSlot';

describe('DroppableTimeSlot', () => {
  it('keeps timeline slots out of the keyboard tab order while preserving pointer add', () => {
    const onClick = vi.fn();

    const { container } = render(
      <DndContext>
        <DroppableTimeSlot
          startIso="2026-05-25T00:00:00.000Z"
          ariaLabel="09:00"
          onClick={onClick}
        />
      </DndContext>,
    );

    const slot = container.querySelector('[data-time-slot="09:00"]');
    expect(slot).toBeInTheDocument();
    expect(slot).not.toHaveAttribute('tabindex');
    expect(screen.queryByRole('button', { name: '09:00' })).not.toBeInTheDocument();

    fireEvent.click(slot!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
