import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HiddenInteractiveMount } from '@/components/HiddenInteractiveMount';

describe('HiddenInteractiveMount', () => {
  it('hides mounted interactive content from layout, pointer use, and focus navigation', () => {
    render(
      <HiddenInteractiveMount>
        <button type="button">숨겨진 버튼</button>
      </HiddenInteractiveMount>,
    );

    expect(screen.queryByRole('button', { name: '숨겨진 버튼' })).not.toBeInTheDocument();

    const button = screen.getByText('숨겨진 버튼').closest('button');
    expect(button).toBeInTheDocument();
    const mount = button.closest('[data-hidden-interactive-mount]') as HTMLDivElement & { inert?: boolean };

    expect(mount).toHaveAttribute('aria-hidden', 'true');
    expect(mount).toHaveStyle({
      width: '0px',
      height: '0px',
      overflow: 'hidden',
      pointerEvents: 'none',
      visibility: 'hidden',
    });
    expect(mount.inert).toBe(true);
  });
});
