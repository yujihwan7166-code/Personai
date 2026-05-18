import { describe, it, expect } from 'vitest';
import { escapeMarkdown, escapeMarkdownTableCell, stripMarkdown } from '@/lib/markdownEscape';

describe('escapeMarkdown', () => {
  it('특수문자 escape', () => {
    expect(escapeMarkdown('*굵게* and _기울임_')).toBe('\\*굵게\\* and \\_기울임\\_');
  });
  it('일반 텍스트 그대로', () => {
    expect(escapeMarkdown('hello world')).toBe('hello world');
  });
});

describe('escapeMarkdownTableCell', () => {
  it('파이프 escape', () => {
    expect(escapeMarkdownTableCell('a|b')).toBe('a\\|b');
  });
  it('줄바꿈 → 공백', () => {
    expect(escapeMarkdownTableCell('a\nb')).toBe('a b');
  });
});

describe('stripMarkdown', () => {
  it('굵게/기울임 제거', () => {
    expect(stripMarkdown('**hello** _world_')).toBe('hello world');
  });
  it('헤더 # 제거', () => {
    expect(stripMarkdown('# Title')).toBe('Title');
  });
  it('링크 → 라벨', () => {
    expect(stripMarkdown('[link](https://x)')).toBe('link');
  });
  it('이미지 → alt', () => {
    expect(stripMarkdown('![alt](image.png)')).toBe('alt');
  });
  it('인라인 코드', () => {
    expect(stripMarkdown('use `code` here')).toBe('use code here');
  });
  it('리스트 마커', () => {
    expect(stripMarkdown('- one\n- two')).toBe('one\ntwo');
  });
});
