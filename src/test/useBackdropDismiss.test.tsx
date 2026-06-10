import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBackdropDismiss } from '@/hooks/useBackdropDismiss';

const BackdropFixture = ({ onDismiss }: { onDismiss: () => void }) => {
  const backdropHandlers = useBackdropDismiss<HTMLDivElement>(onDismiss);

  return (
    <div data-testid="backdrop" {...backdropHandlers}>
      <section data-testid="panel">
        <button type="button">안쪽 버튼</button>
      </section>
    </div>
  );
};

describe('useBackdropDismiss', () => {
  it('dismisses only when pointer starts and ends on the backdrop', () => {
    const onDismiss = vi.fn();
    render(<BackdropFixture onDismiss={onDismiss} />);

    const backdrop = screen.getByTestId('backdrop');
    const panel = screen.getByTestId('panel');

    fireEvent.pointerDown(panel);
    fireEvent.pointerUp(backdrop);
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.pointerDown(backdrop);
    fireEvent.pointerUp(panel);
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.pointerDown(backdrop);
    fireEvent.pointerUp(backdrop);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
