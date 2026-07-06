import { describe, it, expect } from 'vitest';
import { plainFromValue, valueFromPlain, emptyBody } from '@/lib/diary/bodyText';

describe('diary bodyText', () => {
  it('빈 본문', () => {
    expect(plainFromValue(emptyBody())).toBe('');
  });
  it('평문 → value → 평문 왕복', () => {
    const v = valueFromPlain('첫 줄\n둘째 줄');
    expect(plainFromValue(v)).toBe('첫 줄 둘째 줄');
  });
  it('중첩 children 텍스트 수집', () => {
    const v = [{ type: 'p', children: [{ text: '가' }, { text: '나' }] }];
    expect(plainFromValue(v as never)).toBe('가나');
  });
});
