import { describe, it, expect, beforeEach } from 'vitest';
import { estimateUsedBytes, listUsageByKey, usagePercent } from '@/lib/storageQuota';

describe('storageQuota', () => {
  beforeEach(() => { window.localStorage.clear(); });

  it('빈 localStorage → 0', () => {
    expect(estimateUsedBytes()).toBe(0);
    expect(listUsageByKey()).toEqual([]);
    expect(usagePercent()).toBe(0);
  });

  it('단일 key 추가 → bytes 측정', () => {
    window.localStorage.setItem('a', 'hello');
    // key 'a'(1) + value 'hello'(5) = 6 chars × 2 (UTF-16) = 12 bytes
    expect(estimateUsedBytes()).toBe(12);
  });

  it('listUsageByKey — 크기 내림차순', () => {
    window.localStorage.setItem('small', 'x');
    window.localStorage.setItem('big', 'x'.repeat(100));
    const list = listUsageByKey();
    expect(list[0].key).toBe('big');
    expect(list[0].bytes).toBeGreaterThan(list[1].bytes);
  });

  it('usagePercent — limit 대비 %', () => {
    window.localStorage.setItem('test', 'x'.repeat(100));
    const pct = usagePercent(1000); // 1KB limit
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThanOrEqual(100);
  });
});
