import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useScrollLock } from '@/hooks/useScrollLock';

function ScrollLockProbe({ active = true }: { active?: boolean }) {
  useScrollLock(active);
  return null;
}

describe('useScrollLock', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  it('locks body scroll while active and restores the previous overflow', () => {
    document.body.style.overflow = 'auto';

    const { unmount } = render(<ScrollLockProbe />);

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('auto');
  });

  it('keeps body scroll locked until every active lock is released', () => {
    const first = render(<ScrollLockProbe />);
    const second = render(<ScrollLockProbe />);

    expect(document.body.style.overflow).toBe('hidden');

    first.unmount();
    expect(document.body.style.overflow).toBe('hidden');

    second.unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('does not lock body scroll when inactive', () => {
    render(<ScrollLockProbe active={false} />);

    expect(document.body.style.overflow).toBe('');
  });
});
