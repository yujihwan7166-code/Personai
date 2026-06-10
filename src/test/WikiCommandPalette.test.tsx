import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { WikiCommandPalette } from '@/components/wiki/WikiCommandPalette';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
Element.prototype.scrollIntoView = vi.fn();

const paletteProps = {
  pages: [],
  onOpen: vi.fn(),
  onCreate: vi.fn(),
  onCreateByTitle: vi.fn(),
  onGoHome: vi.fn(),
  onGoGraph: vi.fn(),
  onImport: vi.fn(),
  onClearAll: vi.fn(),
  onQuickCapture: vi.fn(),
};

describe('WikiCommandPalette', () => {
  it('opens as a labelled modal command surface', () => {
    render(
      <WikiCommandPalette
        open
        onOpenChange={vi.fn()}
        {...paletteProps}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: '명령 팔레트' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('문서, 동작, 검색 결과를 찾고 Enter로 실행합니다.');
    expect(screen.getByLabelText('명령 검색')).toHaveFocus();
    expect(screen.getByRole('listbox', { name: '명령 결과' })).toBeInTheDocument();
  });

  it('restores focus to the opener after Escape', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button">열기</button>
          <WikiCommandPalette
            open={open}
            onOpenChange={setOpen}
            {...paletteProps}
          />
        </>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole('button', { name: '열기' });
    opener.focus();

    fireEvent.keyDown(opener, { key: 'k', ctrlKey: true });

    expect(screen.getByRole('dialog', { name: '명령 팔레트' })).toBeInTheDocument();
    expect(screen.getByLabelText('명령 검색')).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '명령 팔레트' })).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('does not steal focus back when a command opens a new surface', async () => {
    const onQuickCapture = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button">열기</button>
          <WikiCommandPalette
            open={open}
            onOpenChange={setOpen}
            {...paletteProps}
            onQuickCapture={onQuickCapture}
          />
        </>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole('button', { name: '열기' });
    opener.focus();
    fireEvent.keyDown(opener, { key: 'k', ctrlKey: true });

    fireEvent.click(await screen.findByText('빠른 캡처 — 수집함에 저장'));

    expect(onQuickCapture).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '명령 팔레트' })).not.toBeInTheDocument());
    expect(opener).not.toHaveFocus();
  });

  it('announces when a search has no existing page results', async () => {
    render(
      <WikiCommandPalette
        open
        onOpenChange={vi.fn()}
        {...paletteProps}
      />,
    );

    fireEvent.change(screen.getByLabelText('명령 검색'), { target: { value: '없는문서zz' } });

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('기존 문서 결과가 없어요.');
    expect(status).toHaveTextContent('새 문서로 만들거나 다른 검색어를 입력해 보세요.');
  });

  it('closes only when the backdrop press starts and ends on the backdrop', () => {
    const onOpenChange = vi.fn();
    render(
      <WikiCommandPalette
        open
        onOpenChange={onOpenChange}
        {...paletteProps}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: '명령 팔레트' });
    const input = screen.getByLabelText('명령 검색');

    fireEvent.pointerDown(input);
    fireEvent.pointerUp(dialog);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.pointerDown(dialog);
    fireEvent.pointerUp(input);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.pointerDown(dialog);
    fireEvent.pointerUp(dialog);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
