import { describe, it, expect } from 'vitest';
import {
  isText, isShape, isImage, isLineLike,
  emptySlide, defaultMeta,
  type SlideElement,
} from '@/lib/cloudSlide/types';

const base = { id: 'e1', xPct: 0, yPct: 0, wPct: 10, hPct: 10 };

describe('type guards', () => {
  it('isText', () => {
    const t: SlideElement = { ...base, type: 'text', content: 'x', fontSizeRem: 1 };
    expect(isText(t)).toBe(true);
    expect(isShape(t)).toBe(false);
    expect(isImage(t)).toBe(false);
  });
  it('isShape — 5종 모두', () => {
    for (const type of ['rect', 'ellipse', 'triangle', 'line', 'arrow'] as const) {
      const s: SlideElement = { ...base, type, fillColor: '#fff' };
      expect(isShape(s)).toBe(true);
    }
  });
  it('isLineLike — line / arrow 만', () => {
    expect(isLineLike({ ...base, type: 'line', fillColor: '#000' })).toBe(true);
    expect(isLineLike({ ...base, type: 'arrow', fillColor: '#000' })).toBe(true);
    expect(isLineLike({ ...base, type: 'rect', fillColor: '#000' })).toBe(false);
    expect(isLineLike({ ...base, type: 'text', content: '', fontSizeRem: 1 })).toBe(false);
  });
  it('isImage', () => {
    expect(isImage({ ...base, type: 'image', src: 'data:' })).toBe(true);
  });
});

describe('emptySlide / defaultMeta', () => {
  it('emptySlide — 새 id + 빈 elements', () => {
    const s = emptySlide();
    expect(s.id).toMatch(/^s/);
    expect(s.elements).toEqual([]);
  });
  it('emptySlide 호출마다 다른 id', () => {
    expect(emptySlide().id).not.toBe(emptySlide().id);
  });
  it('defaultMeta — 1장 + currentIdx=0', () => {
    const m = defaultMeta();
    expect(m.slides).toHaveLength(1);
    expect(m.currentIdx).toBe(0);
  });
});
