import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageWorkspaceChrome } from '@/components/PageWorkspaceChrome';
import {
  PAGE_AI_LAUNCHER_POSITION_CLASS,
  PAGE_AI_LAUNCHER_SIZE_CLASS,
} from '@/components/PageAiTokens';

function renderChrome(
  props: Partial<Parameters<typeof PageWorkspaceChrome>[0]> = {},
) {
  return render(
    <MemoryRouter>
      <PageWorkspaceChrome
        current="wiki"
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('PageWorkspaceChrome', () => {
  it('shows the common page switcher without an AI launcher by default', () => {
    renderChrome({ current: 'whiteboard' });

    const chrome = document.querySelector('[data-page-workspace-chrome="true"]');
    expect(chrome).toHaveAttribute('data-page-workspace-current', 'whiteboard');
    expect(chrome).toHaveAttribute('data-page-workspace-ai', 'none');
    expect(screen.getByRole('navigation', { name: '페이지 이동' })).toBeInTheDocument();
    expect(document.querySelector('[data-page-switcher-root="desktop"]')).toBeInTheDocument();
    expect(document.querySelector('[data-page-switcher-current="true"]')).toHaveAttribute('data-page-switcher-item', 'whiteboard');
    expect(screen.getByRole('button', { name: '화이트보드' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: /AI 열기/ })).not.toBeInTheDocument();
  });

  it('shows one AI launcher while the panel is closed', () => {
    const onOpen = vi.fn();
    renderChrome({
      current: 'memos',
      ai: {
        label: '메모 AI',
        open: false,
        onOpen,
      },
    });

    const launcher = screen.getByRole('button', { name: '메모 AI 열기' });
    expect(document.querySelector('[data-page-workspace-chrome="true"]')).toHaveAttribute('data-page-workspace-ai', 'closed');
    expect(launcher).toHaveAttribute('data-page-ai-launcher', 'true');
    expect(screen.getByRole('navigation', { name: '페이지 이동' })).toBeInTheDocument();
    expect(launcher).toHaveClass(
      ...PAGE_AI_LAUNCHER_POSITION_CLASS.split(' '),
      ...PAGE_AI_LAUNCHER_SIZE_CLASS.split(' '),
    );

    fireEvent.click(launcher);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('hides switcher and launcher while the AI panel is open', () => {
    renderChrome({
      current: 'journal',
      ai: {
        label: '일기 AI',
        open: true,
        onOpen: vi.fn(),
      },
    });

    expect(document.querySelector('[data-page-workspace-chrome="true"]')).toHaveAttribute('data-page-workspace-ai', 'open');
    expect(screen.queryByRole('navigation', { name: '페이지 이동' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '일기 AI 열기' })).not.toBeInTheDocument();
  });
});
