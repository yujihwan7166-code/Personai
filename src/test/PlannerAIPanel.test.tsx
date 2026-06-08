import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlannerAIPanel } from '@/components/planner/ai/PlannerAIPanel';

describe('PlannerAIPanel', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('does not close from Escape while typing, but closes from panel chrome', () => {
    const onClose = vi.fn();
    render(
      <PlannerAIPanel
        open
        onClose={onClose}
        view="day"
        anchorIso="2026-05-24"
        width={384}
        onWidthChange={vi.fn()}
      />,
    );

    const panel = screen.getByRole('complementary', { name: '보조 도구' });
    expect(panel).toHaveAttribute('data-page-ai-panel', 'planner');
    expect(panel).toHaveClass('z-50', 'overflow-hidden');
    expect(screen.getByRole('separator', { name: '보조 도구 패널 너비 조정' })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByLabelText('AI 입력'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
