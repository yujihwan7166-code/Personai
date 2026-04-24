import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadBookmarks, saveBookmarks, emptySlots, guessFavicon,
  BOOKMARK_SLOT_COUNT, BOOKMARKS_CHANGED_EVENT,
  type BookmarkSlot,
} from '@/lib/bookmarkStore';

describe('bookmarkStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('emptySlots returns array of correct length filled with empty slots', () => {
    const slots = emptySlots();
    expect(slots).toHaveLength(BOOKMARK_SLOT_COUNT);
    expect(slots.every((s) => s.kind === 'empty')).toBe(true);
  });

  it('loadBookmarks returns empty slots when storage is clear', () => {
    const slots = loadBookmarks();
    expect(slots).toHaveLength(BOOKMARK_SLOT_COUNT);
    expect(slots.every((s) => s.kind === 'empty')).toBe(true);
  });

  it('saveBookmarks persists to localStorage and loadBookmarks restores', () => {
    const slots: BookmarkSlot[] = emptySlots();
    slots[0] = { kind: 'url', label: 'GitHub', url: 'https://github.com' };
    slots[2] = { kind: 'internal', label: 'AI Chat', emoji: '💬', target: { type: 'mode', mode: 'general' } };
    saveBookmarks(slots);
    const restored = loadBookmarks();
    expect(restored[0]).toEqual(slots[0]);
    expect(restored[2]).toEqual(slots[2]);
    expect(restored[1].kind).toBe('empty');
  });

  it('loadBookmarks pads short arrays and truncates long ones to SLOT_COUNT', () => {
    window.localStorage.setItem(
      'personai.bookmarks',
      JSON.stringify([{ kind: 'url', label: 'a', url: 'https://a' }]),
    );
    const padded = loadBookmarks();
    expect(padded).toHaveLength(BOOKMARK_SLOT_COUNT);
    expect(padded[0].kind).toBe('url');
    expect(padded[BOOKMARK_SLOT_COUNT - 1].kind).toBe('empty');

    const over = Array.from({ length: BOOKMARK_SLOT_COUNT + 3 }, () => ({ kind: 'empty' }));
    window.localStorage.setItem('personai.bookmarks', JSON.stringify(over));
    expect(loadBookmarks()).toHaveLength(BOOKMARK_SLOT_COUNT);
  });

  it('loadBookmarks returns empty slots on malformed storage', () => {
    window.localStorage.setItem('personai.bookmarks', '{invalid');
    expect(loadBookmarks().every((s) => s.kind === 'empty')).toBe(true);
  });

  it('saveBookmarks dispatches BOOKMARKS_CHANGED_EVENT', () => {
    let fired = 0;
    const handler = () => { fired += 1; };
    window.addEventListener(BOOKMARKS_CHANGED_EVENT, handler);
    saveBookmarks(emptySlots());
    expect(fired).toBe(1);
    window.removeEventListener(BOOKMARKS_CHANGED_EVENT, handler);
  });

  it('guessFavicon returns Google S2 URL for valid URL', () => {
    const favicon = guessFavicon('https://github.com/some/path');
    expect(favicon).toContain('google.com/s2/favicons');
    expect(favicon).toContain('domain=github.com');
  });

  it('guessFavicon returns undefined for invalid URL', () => {
    expect(guessFavicon('not a url')).toBeUndefined();
  });
});
