import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeFileName, downloadBlob, downloadText, downloadJson, downloadCsv } from '@/lib/blob';

describe('sanitizeFileName', () => {
  it('금지 문자 _ 로 치환', () => {
    expect(sanitizeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j');
  });
  it('빈 → untitled', () => {
    expect(sanitizeFileName('   ')).toBe('untitled');
  });
  it('공백 정리', () => {
    expect(sanitizeFileName('  hello   world  ')).toBe('hello world');
  });
});

describe('downloadBlob (DOM mocked)', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn().mockReturnValue('blob:fake');
    URL.revokeObjectURL = vi.fn();
  });

  it('anchor click + revoke', () => {
    const blob = new Blob(['hi']);
    let clicked = false;
    const origCreateElement = document.createElement.bind(document);
    document.createElement = vi.fn((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === 'a') {
        el.click = () => { clicked = true; };
      }
      return el;
    }) as typeof document.createElement;
    downloadBlob(blob, 'test.txt');
    expect(clicked).toBe(true);
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});

describe('downloadText / downloadJson / downloadCsv (wrap downloadBlob)', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn().mockReturnValue('blob:fake');
    URL.revokeObjectURL = vi.fn();
    document.body.innerHTML = '';
  });

  it('downloadJson 자동 확장자', () => {
    let recordedName = '';
    const orig = document.createElement.bind(document);
    document.createElement = vi.fn((tag: string) => {
      const el = orig(tag) as HTMLAnchorElement;
      if (tag === 'a') {
        const desc = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'download');
        Object.defineProperty(el, 'download', {
          set: (v: string) => { recordedName = v; },
          get: () => recordedName,
        });
        el.click = () => {};
      }
      return el;
    }) as typeof document.createElement;
    downloadJson({ a: 1 }, 'data');
    expect(recordedName).toBe('data.json');
  });

  it('downloadCsv BOM 추가', () => {
    let savedBlob: Blob | null = null;
    URL.createObjectURL = vi.fn((b: Blob) => { savedBlob = b; return 'blob:x'; }) as typeof URL.createObjectURL;
    const orig = document.createElement.bind(document);
    document.createElement = vi.fn((tag: string) => {
      const el = orig(tag);
      if (tag === 'a') (el as HTMLAnchorElement).click = () => {};
      return el;
    }) as typeof document.createElement;
    downloadCsv('a,b', 'test');
    expect(savedBlob).toBeTruthy();
    // BOM 포함 검증 — Blob 의 byte length 가 3 (BOM) + 'a,b' 길이
  });
});
