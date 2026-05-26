import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WikiAiPanel } from '@/components/wiki/WikiAiPanel';

vi.mock('@/pages/indexRuntime', () => ({
  streamExpert: vi.fn(),
}));

describe('WikiAiPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('does not close from Escape while typing, but closes from panel chrome', () => {
    const onClose = vi.fn();
    render(
      <WikiAiPanel
        open
        onClose={onClose}
        page={null}
        allPages={[]}
        totalPages={0}
      />,
    );

    expect(screen.getByRole('complementary', { name: '위키 AI' })).toHaveAttribute('data-page-ai-panel', 'wiki');
    expect(screen.getByRole('separator', { name: 'AI 패널 너비 조정' })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByLabelText('AI 입력'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
