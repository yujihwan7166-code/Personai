import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WikiAiPanel } from '@/components/wiki/WikiAiPanel';

vi.mock('@/pages/indexRuntime', () => ({
  streamExpert: vi.fn(),
}));

describe('WikiAiPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const renderPanel = (onClose = vi.fn()) => render(
    <MemoryRouter>
      <WikiAiPanel
        open
        onClose={onClose}
        page={null}
        allPages={[]}
        totalPages={0}
      />
    </MemoryRouter>,
  );

  it('does not close from Escape while typing, but closes from panel chrome', () => {
    const onClose = vi.fn();
    renderPanel(onClose);

    expect(screen.getByRole('complementary', { name: '보조 도구' })).toHaveAttribute('data-page-ai-panel', 'wiki');
    expect(screen.getByRole('separator', { name: '보조 도구 패널 너비 조정' })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByLabelText('AI 입력'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hides AI-only chat actions when a reference tool tab is selected', () => {
    renderPanel();

    expect(document.querySelector('[data-page-ai-chat-actions="true"]')).toBeInTheDocument();

    const tabButtons = document.querySelectorAll('[data-page-ai-header] nav button');
    expect(tabButtons.length).toBeGreaterThan(1);
    fireEvent.click(tabButtons[1]);

    expect(document.querySelector('[data-page-ai-chat-actions="true"]')).not.toBeInTheDocument();
  });
});
