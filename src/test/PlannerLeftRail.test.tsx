import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PlannerLeftRail } from '@/components/planner/PlannerLeftRail';
import { RAIL_EVENT } from '@/components/planner/plannerRailEvents';

describe('PlannerLeftRail', () => {
  it('names the mode launcher clearly and keeps dispatching the mode event', () => {
    const listener = vi.fn();
    window.addEventListener(RAIL_EVENT.openModePalette, listener);

    render(
      <MemoryRouter>
        <PlannerLeftRail />
      </MemoryRouter>,
    );

    const modeButton = screen.getByRole('button', { name: '모드 전환: 현재 통합 플래너' });
    fireEvent.click(modeButton);

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(RAIL_EVENT.openModePalette, listener);
  });
});
