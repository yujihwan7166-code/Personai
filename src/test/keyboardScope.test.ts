import { describe, it, expect, vi } from 'vitest';
import { isEditableTarget, withGlobalShortcutGuard } from '@/lib/keyboardScope';

describe('isEditableTarget', () => {
  it('input / textarea / select → true', () => {
    expect(isEditableTarget(document.createElement('input'))).toBe(true);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    expect(isEditableTarget(document.createElement('select'))).toBe(true);
  });
  it('contentEditable → true', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    expect(isEditableTarget(div)).toBe(true);
  });
  it('role=textbox → true', () => {
    const div = document.createElement('div');
    div.setAttribute('role', 'textbox');
    expect(isEditableTarget(div)).toBe(true);
  });
  it('일반 div → false', () => {
    expect(isEditableTarget(document.createElement('div'))).toBe(false);
  });
  it('null → false', () => {
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe('withGlobalShortcutGuard', () => {
  it('일반 target → handler 호출', () => {
    const handler = vi.fn();
    const guarded = withGlobalShortcutGuard(handler);
    const e = new KeyboardEvent('keydown', { key: '/' });
    Object.defineProperty(e, 'target', { value: document.createElement('div') });
    guarded(e);
    expect(handler).toHaveBeenCalled();
  });

  it('input target → handler skip', () => {
    const handler = vi.fn();
    const guarded = withGlobalShortcutGuard(handler);
    const e = new KeyboardEvent('keydown', { key: '/' });
    Object.defineProperty(e, 'target', { value: document.createElement('input') });
    guarded(e);
    expect(handler).not.toHaveBeenCalled();
  });
});
