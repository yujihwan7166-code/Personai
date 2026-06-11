import { describe, expect, it } from 'vitest';
import { estimateWhiteboardTextWidth, estimateWrappedLineCount } from '@/lib/whiteboard/textLayout';

describe('whiteboard text layout helpers', () => {
  it('estimates Korean glyphs wider than ASCII glyphs for inline editing', () => {
    expect(estimateWhiteboardTextWidth('가', 16)).toBeGreaterThan(estimateWhiteboardTextWidth('a', 16));
  });

  it('counts automatic wraps when shape text is wider than the editable area', () => {
    const lineCount = estimateWrappedLineCount('긴문장이도형안에서여러줄로접혀야합니다', 16, 96);

    expect(lineCount).toBeGreaterThan(1);
  });

  it('keeps explicit line breaks in the visual line count', () => {
    expect(estimateWrappedLineCount('첫 줄\n둘째 줄', 16, 240)).toBe(2);
  });
});
