import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WikiCommandPalette } from '@/components/wiki/WikiCommandPalette';
import { WikiHome } from '@/components/wiki/WikiHome';
import { WikiQuickCapture } from '@/components/wiki/WikiQuickCapture';
import { createEmptyWikiPage } from '@/types/wiki';

vi.mock('@/lib/notify', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
Element.prototype.scrollIntoView = vi.fn();

describe('wiki capture surfaces', () => {
  it('shows the quick capture action as a Korean collection flow', () => {
    render(
      <WikiCommandPalette
        open
        onOpenChange={vi.fn()}
        pages={[]}
        onOpen={vi.fn()}
        onCreate={vi.fn()}
        onCreateByTitle={vi.fn()}
        onGoHome={vi.fn()}
        onGoGraph={vi.fn()}
        onImport={vi.fn()}
        onClearAll={vi.fn()}
        onQuickCapture={vi.fn()}
      />,
    );

    expect(screen.getByText('빠른 캡처 — 수집함에 저장')).toBeInTheDocument();
    expect(screen.queryByText(/Inbox/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/문서·동작 검색/), {
      target: { value: '새 아이디어' },
    });

    expect(screen.getByText('"새 아이디어" 새 문서 만들기')).toBeInTheDocument();
    expect(screen.getByText('초안')).toBeInTheDocument();
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
  });

  it('keeps legacy inbox-tagged drafts visible under 수집함', () => {
    const legacyCapture = createEmptyWikiPage({
      id: 'old-inbox',
      title: '예전 캡처',
      status: 'active',
      tags: ['inbox'],
      updatedAt: 200,
    });
    const newCapture = createEmptyWikiPage({
      id: 'new-capture',
      title: '새 캡처',
      status: 'active',
      tags: ['수집함'],
      updatedAt: 100,
    });

    render(
      <WikiHome
        pages={[legacyCapture, newCapture]}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
      />,
    );

    expect(screen.getByText('📥 수집함')).toBeInTheDocument();
    expect(screen.getAllByText('예전 캡처').length).toBeGreaterThan(0);
    expect(screen.getAllByText('새 캡처').length).toBeGreaterThan(0);
    expect(screen.queryByText('📥 Inbox')).not.toBeInTheDocument();
  });

  it('creates quick captures with the 수집함 tag', async () => {
    const onCreate = vi.fn();
    render(
      <WikiQuickCapture
        open
        onClose={vi.fn()}
        onCreate={onCreate}
        onOpenPage={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: '빠른 캡처' });
    expect(dialog).toHaveAccessibleDescription('떠오른 내용을 수집함 문서로 빠르게 저장합니다.');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => {
      expect(screen.getByLabelText('빠른 캡처 내용')).toHaveFocus();
    });
    expect(screen.getByRole('button', { name: '빠른 캡처 닫기' })).toBeInTheDocument();
    expect(screen.getAllByText('#수집함').length).toBeGreaterThan(0);
    expect(screen.queryByText('#inbox')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('빠른 캡처 내용'), {
      target: { value: '나중에 정리할 생각' },
    });
    fireEvent.click(screen.getByRole('button', { name: '나중에 정리할 생각 수집함에 저장' }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
        tags: ['수집함'],
        title: '나중에 정리할 생각',
      }));
    });
  });

  it('keeps quick capture open when pointer selection starts inside and ends on the backdrop', () => {
    const onClose = vi.fn();
    render(
      <WikiQuickCapture
        open
        onClose={onClose}
        onCreate={vi.fn()}
        onOpenPage={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: '빠른 캡처' });
    const textarea = screen.getByLabelText('빠른 캡처 내용');

    fireEvent.pointerDown(textarea);
    fireEvent.pointerUp(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(dialog);
    fireEvent.pointerUp(textarea);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(dialog);
    fireEvent.pointerUp(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows saving a quick capture with only a title', async () => {
    const onCreate = vi.fn();
    render(
      <WikiQuickCapture
        open
        onClose={vi.fn()}
        onCreate={onCreate}
        onOpenPage={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '빠른 캡처 저장' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('제목'), {
      target: { value: '나중에 정리할 주제' },
    });

    const saveButton = screen.getByRole('button', { name: '나중에 정리할 주제 수집함에 저장' });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
        title: '나중에 정리할 주제',
        body: '',
        tags: ['수집함'],
      }));
    });
  });

  it('saves title-only quick captures with Enter while respecting Korean IME composition', async () => {
    const onCreate = vi.fn();
    render(
      <WikiQuickCapture
        open
        onClose={vi.fn()}
        onCreate={onCreate}
        onOpenPage={vi.fn()}
      />,
    );

    const titleInput = screen.getByLabelText('제목');
    fireEvent.change(titleInput, {
      target: { value: '엔터로 저장할 주제' },
    });

    fireEvent.keyDown(titleInput, {
      key: 'Enter',
      isComposing: true,
    });
    expect(onCreate).not.toHaveBeenCalled();

    fireEvent.keyDown(titleInput, { key: 'Enter' });

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
        title: '엔터로 저장할 주제',
        body: '',
        tags: ['수집함'],
      }));
    });
  });
});
