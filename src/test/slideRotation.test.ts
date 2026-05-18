import { describe, it, expect } from 'vitest';
import { computeRotation, angleBetween } from '@/lib/cloudSlide/rotation';

describe('computeRotation', () => {
  it('변화 없음 → 0 (startRotation 만 유지)', () => {
    expect(computeRotation({ startRotation: 30, startAngle: 0, curAngle: 0 })).toBe(30);
  });

  it('+45도 회전', () => {
    expect(computeRotation({ startRotation: 0, startAngle: 0, curAngle: 45 })).toBe(45);
  });

  it('음수 → 양수 정규화', () => {
    expect(computeRotation({ startRotation: 0, startAngle: 0, curAngle: -90 })).toBe(270);
  });

  it('360 wrap', () => {
    expect(computeRotation({ startRotation: 350, startAngle: 0, curAngle: 20 })).toBe(10);
  });

  it('shift = 15도 snap', () => {
    expect(computeRotation({ startRotation: 0, startAngle: 0, curAngle: 47, shift: true })).toBe(45);
    expect(computeRotation({ startRotation: 0, startAngle: 0, curAngle: 8, shift: true })).toBe(15);
  });

  it('0/360 근처 → 정확히 0', () => {
    expect(computeRotation({ startRotation: 0, startAngle: 0, curAngle: 0.3 })).toBe(0);
    expect(computeRotation({ startRotation: 0, startAngle: 0, curAngle: 359.8 })).toBe(0);
  });
});

describe('angleBetween', () => {
  it('오른쪽 → 0도', () => {
    expect(angleBetween(0, 0, 10, 0)).toBe(0);
  });
  it('아래 → 90도', () => {
    expect(angleBetween(0, 0, 0, 10)).toBe(90);
  });
  it('왼쪽 → 180도', () => {
    expect(angleBetween(0, 0, -10, 0)).toBe(180);
  });
});
