import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyText, copyRich } from '@/lib/clipboard';

describe('copyText', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('navigator.clipboard.writeText 성공 → true', async () => {
    const ok = await copyText('hi');
    expect(ok).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hi');
  });

  it('writeText 실패 → textarea fallback 시도', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    document.execCommand = vi.fn().mockReturnValue(true);
    const ok = await copyText('x');
    expect(ok).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });
});

describe('copyRich', () => {
  it('ClipboardItem 미지원 → plain text fallback', async () => {
    // ClipboardItem 제거
    // @ts-expect-error — 의도적
    delete globalThis.ClipboardItem;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    const ok = await copyRich('<b>hi</b>', 'hi');
    expect(ok).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hi');
  });

  it('plain 생략 → HTML 태그 제거 fallback', async () => {
    // @ts-expect-error — 의도적
    delete globalThis.ClipboardItem;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    await copyRich('<p>안녕<br>하세요</p>');
    expect(writeText).toHaveBeenCalledWith('안녕하세요');
  });
});
