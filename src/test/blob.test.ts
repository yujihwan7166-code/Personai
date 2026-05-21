import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeFileName, downloadBlob, downloadJson, downloadCsv } from '@/lib/blob';

const readBlobBytes = (blob: Blob): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });

const readBlobText = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

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

  it('downloadCsv BOM 추가', async () => {
    let savedBlob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => { savedBlob = b; return 'blob:x'; }) as typeof URL.createObjectURL;
    const orig = document.createElement.bind(document);
    document.createElement = vi.fn((tag: string) => {
      const el = orig(tag);
      if (tag === 'a') (el as HTMLAnchorElement).click = () => {};
      return el;
    }) as typeof document.createElement;
    downloadCsv('a,b', 'test');
    expect(savedBlob).toBeTruthy();
    const bytes = await readBlobBytes(savedBlob!);
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(await readBlobText(savedBlob!)).toBe('a,b');
  });
});
