import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageAiResizeHandle } from '@/components/PageAiScaffold';

function ResizeHarness({
  initialWidth = 384,
  onCommit,
}: {
  initialWidth?: number;
  onCommit?: (next: number) => void;
}) {
  const [width, setWidth] = useState(initialWidth);

  return (
    <div>
      <PageAiResizeHandle
        open
        width={width}
        minWidth={320}
        maxWidth={560}
        defaultWidth={384}
        onWidthChange={setWidth}
        onWidthCommit={onCommit}
      />
      <output data-testid="width">{width}</output>
    </div>
  );
}

describe('PageAiResizeHandle', () => {
  it('exposes accessible slider-like separator state', () => {
    render(<ResizeHarness />);

    const handle = screen.getByRole('separator', { name: '보조 도구 패널 너비 조정' });
    expect(handle).toHaveAttribute('aria-orientation', 'vertical');
    expect(handle).toHaveAttribute('aria-valuemin', '320');
    expect(handle).toHaveAttribute('aria-valuemax', '560');
    expect(handle).toHaveAttribute('aria-valuenow', '384');
    expect(handle).toHaveAttribute('tabindex', '0');
  });

  it('supports keyboard resizing and default reset', () => {
    const onCommit = vi.fn();
    render(<ResizeHarness onCommit={onCommit} />);

    const handle = screen.getByRole('separator', { name: '보조 도구 패널 너비 조정' });

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(screen.getByTestId('width')).toHaveTextContent('400');
    expect(handle).toHaveAttribute('aria-valuenow', '400');
    expect(onCommit).toHaveBeenLastCalledWith(400);

    fireEvent.keyDown(handle, { key: 'ArrowRight', shiftKey: true });
    expect(screen.getByTestId('width')).toHaveTextContent('352');
    expect(handle).toHaveAttribute('aria-valuenow', '352');

    fireEvent.keyDown(handle, { key: 'End' });
    expect(screen.getByTestId('width')).toHaveTextContent('560');

    fireEvent.keyDown(handle, { key: 'Enter' });
    expect(screen.getByTestId('width')).toHaveTextContent('384');
  });

  it('clamps pointer resizing and commits the final width', () => {
    const onCommit = vi.fn();
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1000,
    });

    try {
      render(<ResizeHarness onCommit={onCommit} />);
      const handle = screen.getByRole('separator', { name: '보조 도구 패널 너비 조정' });

      fireEvent(handle, new MouseEvent('pointerdown', { bubbles: true, clientX: 616 }));
      fireEvent(handle, new MouseEvent('pointermove', { bubbles: true, clientX: 100 }));
      expect(screen.getByTestId('width')).toHaveTextContent('560');

      fireEvent(handle, new MouseEvent('pointermove', { bubbles: true, clientX: 620 }));
      expect(screen.getByTestId('width')).toHaveTextContent('380');

      fireEvent(handle, new MouseEvent('pointerup', { bubbles: true, clientX: 620 }));
      expect(onCommit).toHaveBeenLastCalledWith(380);
      expect(document.body.style.cursor).toBe('');
      expect(document.body.style.userSelect).toBe('');
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('stays out of tab order while closed', () => {
    render(
      <PageAiResizeHandle
        open={false}
        width={384}
        minWidth={320}
        maxWidth={560}
        defaultWidth={384}
        onWidthChange={() => {}}
      />,
    );

    expect(screen.getByRole('separator', { name: '보조 도구 패널 너비 조정' })).toHaveAttribute('tabindex', '-1');
  });
});
