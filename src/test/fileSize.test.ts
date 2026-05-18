import { describe, it, expect } from 'vitest';
import { formatFileSize, getFileExt, getFileBase } from '@/lib/fileSize';

describe('formatFileSize', () => {
  it('단위 자동', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });
  it('소수 자리', () => {
    expect(formatFileSize(1234567, 2)).toBe('1.18 MB');
  });
  it('잘못된 입력', () => {
    expect(formatFileSize(NaN)).toBe('0 B');
    expect(formatFileSize(-5)).toBe('0 B');
  });
});

describe('getFileExt / getFileBase', () => {
  it('일반', () => {
    expect(getFileExt('a.txt')).toBe('txt');
    expect(getFileBase('a.txt')).toBe('a');
  });
  it('다중 dot', () => {
    expect(getFileExt('archive.tar.gz')).toBe('gz');
    expect(getFileBase('archive.tar.gz')).toBe('archive.tar');
  });
  it('확장자 없음', () => {
    expect(getFileExt('README')).toBe('');
    expect(getFileBase('README')).toBe('README');
  });
  it('dotfile (시작이 dot)', () => {
    expect(getFileExt('.env')).toBe('');
    expect(getFileBase('.env')).toBe('.env');
  });
});
