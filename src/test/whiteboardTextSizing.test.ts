import { describe, expect, it } from 'vitest';
import type { WBElement } from '@/types/whiteboard';
import {
  coerceWhiteboardTextSize,
  getWhiteboardTextSize,
  isWhiteboardTextShape,
  stepWhiteboardTextSize,
  supportsWhiteboardTextSizing,
  withWhiteboardTextSize,
} from '@/lib/whiteboard/textSizing';

const base = {
  id: 'el_1',
  x: 0,
  y: 0,
  w: 160,
  h: 120,
  angle: 0,
  zIndex: 1,
  opacity: 1,
  locked: false,
  groupIds: [],
  createdAt: 1,
  updatedAt: 1,
};

describe('whiteboard text sizing', () => {
  it('steps sticky text within sticky size options', () => {
    const sticky = {
      ...base,
      type: 'sticky',
      content: 'memo',
      color: 'amber',
      fontSize: 14,
      textAlign: 'left',
    } as WBElement;

    expect(supportsWhiteboardTextSizing(sticky)).toBe(true);
    expect(stepWhiteboardTextSize(sticky, 1)).toBe(16);
    expect(stepWhiteboardTextSize(sticky, -1)).toBe(12);
    expect(coerceWhiteboardTextSize(sticky, 11)).toBe(12);
  });

  it('uses 16px as the default shape text size and clamps shape sizes', () => {
    const rect = {
      ...base,
      type: 'rect',
      cornerRadius: 8,
      strokeColor: 'ink',
      strokeWidth: 'normal',
      strokeStyle: 'solid',
      roughness: 0,
      fillColor: 'none',
      fillStyle: 'none',
      text: 'shape',
    } as WBElement;

    expect(isWhiteboardTextShape(rect)).toBe(true);
    expect(getWhiteboardTextSize(rect)).toBe(16);
    expect(stepWhiteboardTextSize(rect, 1)).toBe(18);
    expect(withWhiteboardTextSize(rect, 40)).toMatchObject({ fontSize: 32 });
  });

  it('ignores elements without editable inner text', () => {
    const frame = {
      ...base,
      type: 'frame',
      name: 'frame',
      bgColor: 'transparent',
      childIds: [],
      clipChildren: false,
    } as WBElement;

    expect(supportsWhiteboardTextSizing(frame)).toBe(false);
    expect(getWhiteboardTextSize(frame)).toBeNull();
    expect(stepWhiteboardTextSize(frame, 1)).toBeNull();
  });
});
