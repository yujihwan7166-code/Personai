/**
 * 파일 크기 포매팅 — bytes → "12.3 KB" 등.
 *
 * 1024 (binary) 기준. 한국어 환경 단위 표기.
 */

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

export function formatFileSize(bytes: number, fractionDigits: number = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < UNITS.length - 1) {
    n /= 1024;
    i++;
  }
  const fixed = i === 0 ? n.toFixed(0) : n.toFixed(fractionDigits);
  // trailing .0 제거
  const clean = fixed.replace(/\.0+$/, '');
  return `${clean} ${UNITS[i]}`;
}

/** 파일명 확장자 (소문자, dot 없음). */
export function getFileExt(filename: string): string {
  if (!filename) return '';
  const idx = filename.lastIndexOf('.');
  if (idx <= 0 || idx === filename.length - 1) return '';
  return filename.slice(idx + 1).toLowerCase();
}

/** 파일명 base (확장자 제외). */
export function getFileBase(filename: string): string {
  if (!filename) return '';
  const idx = filename.lastIndexOf('.');
  if (idx <= 0) return filename;
  return filename.slice(0, idx);
}
