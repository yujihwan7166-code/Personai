import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkspaceSidebarSwitchButton } from '@/components/WorkspaceSidebarSwitchButton';

describe('WorkspaceSidebarSwitchButton', () => {
  it('uses readable Korean labels for the mode launcher', () => {
    render(
      <MemoryRouter>
        <WorkspaceSidebarSwitchButton current="memos" contentAlign="start" />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: '모드 전환: 현재 메모' });
    expect(trigger).toHaveAttribute('title', '모드 전환: 현재 메모');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls');
    expect(trigger).toHaveAttribute('data-workspace-switch-current', 'memos');
    expect(trigger).toHaveClass('justify-start');
  });

  it('opens the floating mode launcher from workspace pages', async () => {
    render(
      <MemoryRouter>
        <WorkspaceSidebarSwitchButton current="whiteboard" />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: '모드 전환: 현재 화이트보드' });
    fireEvent.click(trigger);

    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));
    const menu = await screen.findByRole('menu', { name: '모드 전환' });
    expect(menu).toBeVisible();
    expect(menu.id).toBe(trigger.getAttribute('aria-controls'));
    expect(document.querySelector('[data-hidden-interactive-mount]')).not.toContainElement(menu);
  });
});
