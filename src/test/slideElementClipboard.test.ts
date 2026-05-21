import { describe, expect, it } from 'vitest';
import {
  createSlideElementClipboard,
  pasteSlideElementClipboard,
} from '@/lib/cloudSlide/elementClipboard';
import type { Slide } from '@/lib/cloudSlide/types';

function idFactory() {
  let n = 0;
  return (prefix: string) => `${prefix}${++n}`;
}

describe('cloudSlide element clipboard', () => {
  const slide: Slide = {
    id: 's1',
    elements: [
      { id: 'a', type: 'text', content: 'A', xPct: 10, yPct: 10, wPct: 20, hPct: 10, fontSizeRem: 1 },
      { id: 'b', type: 'rect', xPct: 80, yPct: 85, wPct: 20, hPct: 15, fillColor: '#fff', groupId: 'g1' },
      { id: 'c', type: 'ellipse', xPct: 30, yPct: 30, wPct: 10, hPct: 10, fillColor: '#000', groupId: 'g1' },
      { id: 'locked', type: 'text', content: 'Locked', xPct: 0, yPct: 0, wPct: 10, hPct: 10, fontSizeRem: 1, locked: true },
    ],
  };

  it('copies selected unlocked elements only', () => {
    const payload = createSlideElementClipboard(slide, ['locked'], 'a');

    expect(payload?.elements.map((el) => el.id)).toEqual(['a']);
  });

  it('pastes with new ids, clamped offset, and fresh group ids', () => {
    const payload = createSlideElementClipboard(slide, ['b', 'c']);
    const pasted = pasteSlideElementClipboard(payload!, { offsetPct: 5, newIdFactory: idFactory() });

    expect(pasted.selectedIds).toEqual(['el1', 'el3']);
    expect(pasted.elements[0]).toMatchObject({ id: 'el1', xPct: 80, yPct: 85 });
    expect(pasted.elements[1]).toMatchObject({ id: 'el3', xPct: 35, yPct: 35 });
    expect(pasted.elements[0].groupId).toBe('g2');
    expect(pasted.elements[1].groupId).toBe('g2');
  });

  it('removes lock state from pasted copies', () => {
    const payload = {
      elements: [
        { id: 'x', type: 'text', content: 'X', xPct: 1, yPct: 1, wPct: 10, hPct: 10, fontSizeRem: 1, locked: true },
      ],
    } as const;
    const pasted = pasteSlideElementClipboard(payload, { newIdFactory: idFactory() });

    expect(pasted.elements[0].locked).toBeUndefined();
  });
});
