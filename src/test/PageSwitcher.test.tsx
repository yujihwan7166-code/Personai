import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageSwitcher } from '@/components/PageSwitcher';
import {
  PAGE_SWITCHER_DESKTOP_CLASS,
  PAGE_SWITCHER_MOBILE_MENU_CLASS,
  PAGE_SWITCHER_MOBILE_POSITION_CLASS,
} from '@/components/PageWorkspaceTokens';

function renderSwitcher(current: Parameters<typeof PageSwitcher>[0]['current'] = 'wiki') {
  return render(
    <MemoryRouter>
      <PageSwitcher current={current} />
    </MemoryRouter>,
  );
}

function renderCompactSwitcher(current: Parameters<typeof PageSwitcher>[0]['current'] = 'wiki') {
  return render(
    <MemoryRouter>
      <PageSwitcher current={current} compact showMobile={false} />
    </MemoryRouter>,
  );
}

describe('PageSwitcher', () => {
  it('opens the mobile menu with focus on the current page item', async () => {
    renderSwitcher('wiki');

    const trigger = screen.getByRole('button', { name: /현재 마이위키/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('data-page-switcher-trigger', 'true');
    expect(trigger).toHaveTextContent('마이위키');
    expect(trigger).toHaveClass('max-w-[132px]');
    expect(trigger.parentElement).toHaveClass(...PAGE_SWITCHER_MOBILE_POSITION_CLASS.split(' '));
    expect(PAGE_SWITCHER_MOBILE_POSITION_CLASS).toContain('env(safe-area-inset-bottom)');
    expect(PAGE_SWITCHER_MOBILE_POSITION_CLASS).toContain('env(safe-area-inset-left)');
    expect(trigger.parentElement).toHaveAttribute('data-page-switcher-root', 'mobile');
    expect(screen.getByRole('navigation', { name: '페이지 이동' })).toHaveClass(
      ...PAGE_SWITCHER_DESKTOP_CLASS.split(' '),
    );
    expect(screen.getByRole('navigation', { name: '페이지 이동' })).toHaveAttribute('data-page-switcher-root', 'desktop');
    expect(document.querySelector('[data-page-switcher-current="true"]')).toHaveAttribute('data-page-switcher-item', 'wiki');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('navigation', { name: '페이지 이동 메뉴' });
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveClass(...PAGE_SWITCHER_MOBILE_MENU_CLASS.split(' '));

    await waitFor(() => {
      expect(within(menu).getByRole('button', { name: '마이위키' })).toHaveFocus();
    });
  });

  it('closes the mobile menu with Escape and returns focus to the trigger', async () => {
    renderSwitcher('journal');

    const trigger = screen.getByRole('button', { name: /현재 일기/ });
    fireEvent.click(trigger);
    const menu = screen.getByRole('navigation', { name: '페이지 이동 메뉴' });
    await waitFor(() => {
      expect(within(menu).getByRole('button', { name: '일기' })).toHaveFocus();
    });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('navigation', { name: '페이지 이동 메뉴' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it('moves through the mobile menu with arrow, Home, and End keys', async () => {
    renderSwitcher('wiki');

    fireEvent.click(screen.getByRole('button', { name: /현재 마이위키/ }));
    const menu = screen.getByRole('navigation', { name: '페이지 이동 메뉴' });

    await waitFor(() => {
      expect(within(menu).getByRole('button', { name: '마이위키' })).toHaveFocus();
    });

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(within(menu).getByRole('button', { name: '메모' })).toHaveFocus();

    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(within(menu).getByRole('button', { name: '마이위키' })).toHaveFocus();

    fireEvent.keyDown(menu, { key: 'End' });
    expect(within(menu).getByRole('button', { name: '일기' })).toHaveFocus();

    fireEvent.keyDown(menu, { key: 'Home' });
    expect(within(menu).getByRole('button', { name: '홈' })).toHaveFocus();
  });

  it('closes the mobile menu when focus leaves the switcher', async () => {
    render(
      <MemoryRouter>
        <PageSwitcher current="memos" />
        <button type="button">외부 버튼</button>
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: /현재 메모/ });
    fireEvent.click(trigger);
    const menu = screen.getByRole('navigation', { name: '페이지 이동 메뉴' });

    await waitFor(() => {
      expect(within(menu).getByRole('button', { name: '메모' })).toHaveFocus();
    });

    const outside = screen.getByRole('button', { name: '외부 버튼' });
    fireEvent.blur(within(menu).getByRole('button', { name: '메모' }), { relatedTarget: outside });
    outside.focus();

    expect(screen.queryByRole('navigation', { name: '페이지 이동 메뉴' })).not.toBeInTheDocument();
  });

  it('keeps compact desktop icon buttons named for assistive tech', () => {
    renderCompactSwitcher('planner');

    const desktop = screen.getByRole('navigation', { name: '페이지 이동' });
    expect(within(desktop).getByRole('button', { name: '통합플래너' })).toHaveAttribute('aria-current', 'page');
    expect(within(desktop).getByRole('button', { name: '마이위키' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /현재/ })).not.toBeInTheDocument();
  });
});
