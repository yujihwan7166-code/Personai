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
  it('keeps workspace metadata without rendering a second page switcher', () => {
    renderChrome({ current: 'whiteboard' });

    const chrome = document.querySelector('[data-page-workspace-chrome="true"]');
    expect(chrome).toHaveAttribute('data-page-workspace-current', 'whiteboard');
    expect(chrome).toHaveAttribute('data-page-workspace-ai', 'none');
    expect(document.querySelector('[data-page-workspace-actions="true"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-page-switcher-root="mobile"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-page-switcher-root="desktop"]')).not.toBeInTheDocument();
  });

  it('shows one positioned AI launcher while the panel is closed', () => {
    const onOpen = vi.fn();
    renderChrome({
      current: 'memos',
      ai: {
        label: 'Assistant tools',
        open: false,
        onOpen,
      },
    });

    const launcher = screen.getByRole('button', { name: 'Assistant tools 열기' });
    expect(screen.getAllByRole('button', { name: 'Assistant tools 열기' })).toHaveLength(1);
    expect(document.querySelector('[data-page-workspace-chrome="true"]')).toHaveAttribute('data-page-workspace-ai', 'closed');
    expect(launcher).toHaveAttribute('data-page-ai-launcher', 'true');
    expect(document.querySelector('[data-page-switcher-root="desktop"]')).not.toBeInTheDocument();
    expect(launcher).toHaveClass(
      ...PAGE_AI_LAUNCHER_SIZE_CLASS.split(' '),
      ...PAGE_AI_LAUNCHER_POSITION_CLASS.split(' '),
    );
    expect(launcher).not.toHaveClass('static', 'right-auto', 'top-auto');

    fireEvent.click(launcher);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('hides the launcher while the AI panel is open', () => {
    renderChrome({
      current: 'journal',
      ai: {
        label: 'Journal tools',
        open: true,
        onOpen: vi.fn(),
      },
    });

    expect(document.querySelector('[data-page-workspace-chrome="true"]')).toHaveAttribute('data-page-workspace-ai', 'open');
    expect(screen.queryByRole('button', { name: 'Journal tools 열기' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-page-switcher-root="desktop"]')).not.toBeInTheDocument();
  });
});
