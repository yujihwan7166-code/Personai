import { describe, expect, it } from 'vitest';
import { parseVisionBlocks } from '../../api/study-vision-extract';
import { hasUsableVisionLayoutBlocks } from '@/lib/studyVisionQueue';

describe('study vision extract helpers', () => {
  it('parses layout blocks with bbox arrays', () => {
    expect(parseVisionBlocks(`
[
  {"text":"전선 1","bbox":[0.12,0.2,0.22,0.24]},
  {"text":"6 V","bbox":[0.8,0.74,0.86,0.78]}
]
    `)).toEqual([
      { text: '전선 1', x0: 0.12, y0: 0.2, x1: 0.22, y1: 0.24 },
      { text: '6 V', x0: 0.8, y0: 0.74, x1: 0.86, y1: 0.78 },
    ]);
  });

  it('accepts common coordinate variants from vision models', () => {
    expect(parseVisionBlocks(`
[
  {"text":"ㄱ","x0":0.01,"y0":0.02,"x1":0.03,"y1":0.04},
  {"text":"표 제목","box":[0.2,0.1,0.5,0.16]},
  {"text":"캡션","bounds":[-0.1,0.9,1.2,0.98]}
]
    `)).toEqual([
      { text: 'ㄱ', x0: 0.01, y0: 0.02, x1: 0.03, y1: 0.04 },
      { text: '표 제목', x0: 0.2, y0: 0.1, x1: 0.5, y1: 0.16 },
      { text: '캡션', x0: 0, y0: 0.9, x1: 1, y1: 0.98 },
    ]);
  });

  it('accepts object-wrapped blocks, percent coordinates, and xywh boxes', () => {
    expect(parseVisionBlocks(`
{
  "blocks": [
    {"label":"diagram A","bbox":[12,20,32,28]},
    {"content":"caption","box":{"x":40,"y":50,"width":20,"height":10}},
    {"text":"direct","bounds":{"x0":0.1,"y0":0.7,"x1":0.4,"y1":0.8}}
  ]
}
    `)).toEqual([
      { text: 'diagram A', x0: 0.12, y0: 0.2, x1: 0.32, y1: 0.28 },
      { text: 'caption', x0: 0.4, y0: 0.5, x1: 0.6, y1: 0.6 },
      { text: 'direct', x0: 0.1, y0: 0.7, x1: 0.4, y1: 0.8 },
    ]);
  });

  it('requires enough layout blocks for long Vision OCR text when selection blocks are requested', () => {
    const longText = Array.from({ length: 90 }, (_, i) => `token${i}`).join(' ');

    expect(hasUsableVisionLayoutBlocks(longText, undefined, true)).toBe(false);
    expect(hasUsableVisionLayoutBlocks(longText, [
      { text: 'line 1', x0: 0.1, y0: 0.1, x1: 0.8, y1: 0.14 },
      { text: 'line 2', x0: 0.1, y0: 0.16, x1: 0.8, y1: 0.2 },
      { text: 'line 3', x0: 0.1, y0: 0.22, x1: 0.8, y1: 0.26 },
    ], true)).toBe(true);
    expect(hasUsableVisionLayoutBlocks('short label', undefined, true)).toBe(true);
    expect(hasUsableVisionLayoutBlocks(longText, undefined, false)).toBe(true);
  });
});
