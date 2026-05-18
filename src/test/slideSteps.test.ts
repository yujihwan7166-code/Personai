import { describe, it, expect } from 'vitest';
import {
  nextFontSize, nextStrokeWidth, nextLineHeight, nextRadius,
  FONT_STEPS_REM, STROKE_STEPS_PX, LINE_HEIGHT_STEPS, RADIUS_STEPS_PX,
} from '@/lib/cloudSlide/steps';

describe('nextFontSize', () => {
  it('+1 → 다음 단계', () => {
    expect(nextFontSize(1, 1)).toBe(1.125);
    expect(nextFontSize(2, 1)).toBe(2.25);
  });
  it('-1 → 이전 단계', () => {
    expect(nextFontSize(1.5, -1)).toBe(1.25);
  });
  it('범위 밖 → clamp', () => {
    expect(nextFontSize(FONT_STEPS_REM[0], -1)).toBe(FONT_STEPS_REM[0]);
    expect(nextFontSize(FONT_STEPS_REM[FONT_STEPS_REM.length - 1], 1)).toBe(FONT_STEPS_REM[FONT_STEPS_REM.length - 1]);
  });
  it('근사값 → 가장 가까운 단계 기준', () => {
    expect(nextFontSize(1.1, 1)).toBe(1.25); // 1.125 와 가까움 → +1 = 1.25
  });
});

describe('nextStrokeWidth', () => {
  it('+1', () => {
    expect(nextStrokeWidth(2, 1)).toBe(3);
  });
  it('범위 밖', () => {
    expect(nextStrokeWidth(STROKE_STEPS_PX[0], -1)).toBe(STROKE_STEPS_PX[0]);
    expect(nextStrokeWidth(STROKE_STEPS_PX[STROKE_STEPS_PX.length - 1], 1)).toBe(STROKE_STEPS_PX[STROKE_STEPS_PX.length - 1]);
  });
});

describe('nextLineHeight', () => {
  it('순환 (dir 없음)', () => {
    const first = LINE_HEIGHT_STEPS[0];
    const second = LINE_HEIGHT_STEPS[1];
    const last = LINE_HEIGHT_STEPS[LINE_HEIGHT_STEPS.length - 1];
    expect(nextLineHeight(first)).toBe(second);
    expect(nextLineHeight(last)).toBe(first); // wrap-around
  });
  it('단계 외 값 → 첫 번째 (idx=-1, (-1+1)%n=0)', () => {
    expect(nextLineHeight(99)).toBe(LINE_HEIGHT_STEPS[0]);
  });
  it('dir=1 → clamp (다른 next* 와 동일)', () => {
    const last = LINE_HEIGHT_STEPS[LINE_HEIGHT_STEPS.length - 1];
    expect(nextLineHeight(last, 1)).toBe(last); // clamp, wrap X
    expect(nextLineHeight(LINE_HEIGHT_STEPS[0], -1)).toBe(LINE_HEIGHT_STEPS[0]);
  });
  it('dir=1 + 근사값', () => {
    // 1.3 은 1.25 와 가장 가까움 (거리 0.05). +1 → 1.5
    expect(nextLineHeight(1.3, 1)).toBe(1.5);
  });
});

describe('nextRadius', () => {
  it('+1 / -1', () => {
    expect(nextRadius(0, 1)).toBe(4);
    expect(nextRadius(8, -1)).toBe(4);
  });
  it('clamp', () => {
    expect(nextRadius(RADIUS_STEPS_PX[RADIUS_STEPS_PX.length - 1], 1))
      .toBe(RADIUS_STEPS_PX[RADIUS_STEPS_PX.length - 1]);
  });
});
