import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiSidebar } from '@/components/cloud/AiSidebar';
import {
  PAGE_AI_PANEL_SCROLL_CLASS,
  PAGE_AI_PANEL_SURFACE_CLASS,
  PAGE_AI_PANEL_TRANSITION_CLASS,
} from '@/components/PageAiTokens';
import type { AiContext } from '@/lib/cloudAi/types';

const memoContext: AiContext = {
  kind: 'memo',
  summary: '전체 메모 3개',
  fullText: 'memo context',
};

function renderSidebar(context: AiContext = memoContext) {
  const onClose = vi.fn();
  return render(
    <AiSidebar
      open
      onClose={onClose}
      title="메모 AI"
      context={context}
      messages={[]}
      sending={false}
      onSend={vi.fn()}
      onClear={vi.fn()}
    />,
  );
}

describe('AiSidebar', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses the shared default width when no saved width exists', () => {
    renderSidebar();

    const panel = screen.getByRole('complementary', { name: '메모 AI' });
    expect(panel).toHaveAttribute('data-page-ai-panel', 'memo');
    expect(panel).toHaveAttribute('data-page-ai-panel-open', 'true');
    expect(panel).toHaveStyle({ '--ai-sidebar-w': '340px' });
    expect(panel).toHaveClass('overflow-hidden');
    expect(panel).toHaveClass(...PAGE_AI_PANEL_SURFACE_CLASS.split(' '));
    expect(panel).toHaveClass(...PAGE_AI_PANEL_TRANSITION_CLASS.split(' '));
    expect(panel.querySelector('[data-page-ai-header]')).toHaveClass('pt-[calc(0.5rem+env(safe-area-inset-top))]');
    expect(screen.getByLabelText('AI 입력').closest('.shrink-0')).toHaveClass('pb-[calc(0.625rem+env(safe-area-inset-bottom))]');
    expect(screen.getByRole('separator', { name: '보조 도구 패널 너비 조정' })).toHaveAttribute('aria-valuenow', '340');
    expect(screen.getByRole('navigation', { name: '보조 도구 탭' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '플래너' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '메모' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '참조 범위' })).toHaveValue('current');
    expect(screen.getByText('요약').closest(`.${PAGE_AI_PANEL_SCROLL_CLASS.split(' ').join('.')}`)).toBeInTheDocument();
  });

  it('keeps a zero-width desktop dock while closed so pages open by pushing content', () => {
    render(
      <AiSidebar
        open={false}
        onClose={vi.fn()}
        title="메모 AI"
        context={memoContext}
        messages={[]}
        sending={false}
        onSend={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    const panel = document.querySelector('[data-page-ai-panel="memo"]');
    expect(panel).toHaveAttribute('data-page-ai-panel-open', 'false');
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(panel).toHaveClass('sm:w-0', 'sm:translate-x-0', 'max-sm:hidden');
    expect(screen.queryByText('요약')).not.toBeInTheDocument();
  });

  it('shows only tool tabs and close on non-AI tool headers', () => {
    render(
      <AiSidebar
        open
        onClose={vi.fn()}
        title="메모 AI"
        context={memoContext}
        messages={[{ id: 'm1', role: 'user', content: 'hello', ts: 1 }]}
        sending={false}
        onSend={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    const header = document.querySelector('[data-page-ai-header]');
    const tabButtons = header?.querySelectorAll('nav button') ?? [];
    expect(tabButtons.length).toBeGreaterThan(1);
    expect(header?.querySelector('select')).toBeInTheDocument();
    expect((header?.querySelectorAll('button') ?? []).length).toBeGreaterThan(tabButtons.length + 1);

    fireEvent.click(tabButtons[1]);

    expect(header?.querySelector('select')).not.toBeInTheDocument();
    expect((header?.querySelectorAll('button') ?? []).length).toBe(tabButtons.length + 1);
  });

  it('restores the saved panel width for the current AI kind', () => {
    window.localStorage.setItem('personai.ai-panel.width.memo', '512');

    renderSidebar();

    const panel = screen.getByRole('complementary', { name: '메모 AI' });
    expect(panel).toHaveStyle({ '--ai-sidebar-w': '420px' });
    expect(screen.getByRole('separator', { name: '보조 도구 패널 너비 조정' })).toHaveAttribute('aria-valuenow', '420');
  });

  it('persists keyboard resize changes by AI kind', () => {
    renderSidebar();

    const handle = screen.getByRole('separator', { name: '보조 도구 패널 너비 조정' });
    fireEvent.keyDown(handle, { key: 'End' });

    expect(screen.getByRole('complementary', { name: '메모 AI' })).toHaveStyle({ '--ai-sidebar-w': '420px' });
    expect(window.localStorage.getItem('personai.ai-panel.width.memo')).toBe('420');
  });

  it('uses separate saved widths for memo and journal panels', () => {
    window.localStorage.setItem('personai.ai-panel.width.memo', '520');
    window.localStorage.setItem('personai.ai-panel.width.journal', '448');
    const { rerender } = render(
      <AiSidebar
        open
        onClose={vi.fn()}
        title="메모 AI"
        context={memoContext}
        messages={[]}
        sending={false}
        onSend={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByRole('complementary', { name: '메모 AI' })).toHaveStyle({ '--ai-sidebar-w': '420px' });

    rerender(
      <AiSidebar
        open
        onClose={vi.fn()}
        title="일기 AI"
        context={{ kind: 'journal', summary: '전체 일기 2편', fullText: 'journal context' }}
        messages={[]}
        sending={false}
        onSend={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByRole('complementary', { name: '일기 AI' })).toHaveStyle({ '--ai-sidebar-w': '420px' });
    expect(screen.getByRole('button', { name: '메모' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: '보조 도구 패널 너비 조정' })).toHaveAttribute('aria-valuenow', '420');
  });

  it('keeps Escape consistent: inputs keep focus, panel chrome closes', () => {
    const onClose = vi.fn();
    render(
      <AiSidebar
        open
        onClose={onClose}
        title="메모 AI"
        context={memoContext}
        messages={[]}
        sending={false}
        onSend={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByLabelText('AI 입력'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
