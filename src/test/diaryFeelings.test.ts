import { describe, it, expect } from 'vitest';
import { FEELINGS, getFeeling, feelingsByGroup, GROUP_COLOR, GROUP_LABEL } from '@/lib/diary/feelings';

describe('feelings catalog', () => {
  it('25개 감정, 5계열', () => {
    expect(FEELINGS).toHaveLength(25);
    const groups = new Set(FEELINGS.map((f) => f.group));
    expect(groups.size).toBe(5);
  });
  it('id 로 감정 조회', () => {
    expect(getFeeling('haengbok')?.group).toBe('joy');
    expect(getFeeling('nope')).toBeUndefined();
  });
  it('계열별 그룹핑 + 색·라벨 존재', () => {
    expect(feelingsByGroup('joy').length).toBeGreaterThan(0);
    expect(GROUP_COLOR.joy).toMatch(/^hsl\(/);
    expect(GROUP_LABEL.sad).toBe('슬픔');
  });
});
