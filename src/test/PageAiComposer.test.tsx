import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageAiPanelHeader } from '@/components/PageAiPanelHeader';
import {
  PageAiComposer,
  PageAiContextStrip,
  PageAiEmptyState,
  PageAiMessageActionButton,
  PageAiMessageActions,
  PageAiMessageBubble,
  PageAiPromptSet,
  PageAiQuickAction,
  PageAiTypingIndicator,
} from '@/components/PageAiScaffold';

describe('PageAiComposer', () => {
  it('keeps the empty composer compact and sends trimmed text', () => {
    const onSend = vi.fn();
    render(<PageAiComposer onSend={onSend} placeholder="입력" />);

    const input = screen.getByLabelText('AI 입력') as HTMLTextAreaElement;
    expect(input.style.height).toBe('40px');
    const composer = input.closest('[data-page-ai-composer="true"]');
    expect(composer).toBeInTheDocument();
    expect(composer).toHaveClass('pb-[calc(0.625rem+env(safe-area-inset-bottom))]');

    fireEvent.change(input, { target: { value: '  정리해줘  ' } });
    fireEvent.click(screen.getByRole('button', { name: '보내기' }));

    expect(onSend).toHaveBeenCalledWith('정리해줘');
    expect(input).toHaveValue('');
    expect(input.style.height).toBe('40px');
  });
});

describe('PageAiPanelHeader', () => {
  it('keeps the shared AI header clear of mobile safe areas', () => {
    const onClose = vi.fn();
    render(<PageAiPanelHeader title="Memo AI" subtitle="Context" onClose={onClose} />);

    const header = screen.getByText('Memo AI').closest('[data-page-ai-header]');
    expect(header).toHaveClass('pt-[calc(0.5rem+env(safe-area-inset-top))]');

    const close = header?.querySelector('button');
    expect(close).toBeInTheDocument();
    fireEvent.click(close as HTMLButtonElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('PageAiContextStrip', () => {
  it('marks the shared context row for panel audits', () => {
    render(<PageAiContextStrip summary="전체 메모 3개" />);

    expect(screen.getByText('참조').closest('[data-page-ai-context-strip]')).toBeInTheDocument();
  });
});

describe('PageAiEmptyState', () => {
  it('keeps empty AI panels top-aligned across workspaces', () => {
    render(<PageAiEmptyState title="시작" description="추천 요청을 고르세요" />);

    expect(screen.getByText('시작').closest('.min-h-full')).toHaveClass(
      'justify-start',
      'pt-4',
      'sm:pt-5',
    );
  });
});

describe('PageAiPromptSet', () => {
  it('groups shared quick actions with stable labels and audit markers', () => {
    const onPick = vi.fn();
    render(
      <PageAiPromptSet label="메모 추천 요청">
        <PageAiQuickAction
          label="요약"
          description="핵심만 짧게 정리"
          onClick={onPick}
        />
      </PageAiPromptSet>,
    );

    const group = screen.getByRole('group', { name: '메모 추천 요청' });
    expect(group).toHaveAttribute('data-page-ai-prompt-set');

    const action = screen.getByRole('button', { name: '요약 - 핵심만 짧게 정리' });
    expect(action).toHaveAttribute('title', '요약 - 핵심만 짧게 정리');
    expect(action).toHaveAttribute('data-page-ai-quick-action');

    fireEvent.click(action);
    expect(onPick).toHaveBeenCalledTimes(1);
  });
});

describe('PageAiMessageBubble', () => {
  it('renders shared user and assistant message treatments', () => {
    render(
      <>
        <PageAiMessageBubble role="user">사용자 질문</PageAiMessageBubble>
        <PageAiMessageBubble>AI 답변</PageAiMessageBubble>
        <PageAiTypingIndicator />
      </>,
    );

    expect(screen.getByText('사용자 질문')).toHaveClass('bg-primary/12');
    expect(screen.getByText('AI 답변')).toHaveClass('bg-card');
    expect(screen.getByLabelText('AI 답변 작성 중')).toBeInTheDocument();
  });

  it('renders shared message action buttons', () => {
    const onCopy = vi.fn();
    render(
      <PageAiMessageActions>
        <PageAiMessageActionButton onClick={onCopy} title="AI 답변 복사">
          복사
        </PageAiMessageActionButton>
      </PageAiMessageActions>,
    );

    fireEvent.click(screen.getByRole('button', { name: '복사' }));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });
});
