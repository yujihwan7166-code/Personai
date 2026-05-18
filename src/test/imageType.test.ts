import { describe, it, expect } from 'vitest';
import { mimeFromFileName, isImageSrc, mimeFromDataUrl, isSvg } from '@/lib/imageType';

describe('mimeFromFileName', () => {
  it('확장자 매핑', () => {
    expect(mimeFromFileName('photo.png')).toBe('image/png');
    expect(mimeFromFileName('Photo.JPG')).toBe('image/jpeg');
    expect(mimeFromFileName('icon.svg')).toBe('image/svg+xml');
    expect(mimeFromFileName('anim.webp')).toBe('image/webp');
  });
  it('쿼리 / fragment 무시', () => {
    expect(mimeFromFileName('a.png?v=1')).toBe('image/png');
    expect(mimeFromFileName('a.png#frag')).toBe('image/png');
  });
  it('알 수 없는 확장자 → undefined', () => {
    expect(mimeFromFileName('doc.pdf')).toBeUndefined();
    expect(mimeFromFileName('noext')).toBeUndefined();
  });
});

describe('isImageSrc', () => {
  it('이미지 확장자', () => {
    expect(isImageSrc('https://example.com/x.png')).toBe(true);
  });
  it('data:image/...', () => {
    expect(isImageSrc('data:image/png;base64,xxx')).toBe(true);
  });
  it('PDF / 빈 → false', () => {
    expect(isImageSrc('doc.pdf')).toBe(false);
    expect(isImageSrc('')).toBe(false);
  });
});

describe('mimeFromDataUrl', () => {
  it('정상', () => {
    expect(mimeFromDataUrl('data:image/png;base64,xxx')).toBe('image/png');
    expect(mimeFromDataUrl('data:text/plain,hi')).toBe('text/plain');
  });
  it('잘못된 → 빈', () => {
    expect(mimeFromDataUrl('not data url')).toBe('');
  });
});

describe('isSvg', () => {
  it('SVG 인식', () => {
    expect(isSvg('icon.svg')).toBe(true);
    expect(isSvg('data:image/svg+xml,<svg/>')).toBe(true);
  });
  it('PNG 아님', () => {
    expect(isSvg('a.png')).toBe(false);
  });
});
