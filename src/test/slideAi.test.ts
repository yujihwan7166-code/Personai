import { describe, it, expect } from 'vitest';
import { slideToText, slidesToOutline, parseAiSlideContent } from '@/lib/cloudSlide/ai';

describe('slideToText', () => {
  it('text 요소만 추출', () => {
    const slide = {
      elements: [
        { type: 'text', content: '제목' },
        { type: 'rect' },
        { type: 'text', content: '본문' },
        { type: 'image' },
      ],
    };
    expect(slideToText(slide)).toBe('제목\n본문');
  });
  it('빈 / undefined content 무시', () => {
    expect(slideToText({ elements: [{ type: 'text', content: '' }] })).toBe('');
    expect(slideToText({ elements: [{ type: 'text' }] })).toBe('');
  });
  it('빈 슬라이드', () => {
    expect(slideToText({ elements: [] })).toBe('');
  });
});

describe('slidesToOutline', () => {
  it('번호 + 텍스트', () => {
    const slides = [
      { elements: [{ type: 'text', content: 'A' }] },
      { elements: [{ type: 'text', content: 'B' }] },
    ];
    expect(slidesToOutline(slides)).toBe('[슬라이드 1]\nA\n\n[슬라이드 2]\nB');
  });
  it('긴 본문 → 200자 + … truncate (토큰 한계 보호)', () => {
    const long = 'a'.repeat(300);
    const r = slidesToOutline([{ elements: [{ type: 'text', content: long }] }]);
    expect(r).toContain('a'.repeat(200) + '…');
    expect(r.length).toBeLessThan(long.length);
  });
});

describe('parseAiSlideContent', () => {
  it('title + body 분리', () => {
    const r = parseAiSlideContent('제목\n본문1\n본문2');
    expect(r.title).toBe('제목');
    expect(r.body).toEqual(['본문1', '본문2']);
  });
  it('빈 줄/공백 줄 제거', () => {
    const r = parseAiSlideContent('  제목  \n\n  본문  \n   \n');
    expect(r.title).toBe('제목');
    expect(r.body).toEqual(['본문']);
  });
  it('빈 입력', () => {
    expect(parseAiSlideContent('')).toEqual({ title: '', body: [] });
    expect(parseAiSlideContent('   ')).toEqual({ title: '', body: [] });
  });
  it('한 줄', () => {
    expect(parseAiSlideContent('only')).toEqual({ title: 'only', body: [] });
  });
});
