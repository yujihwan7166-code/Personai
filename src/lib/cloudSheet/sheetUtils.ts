/** 시트 에디터 — 작은 순수 헬퍼 (regex/링크 감지/셀 ref 라벨). */

import { idxToCol } from '@/lib/cloudSheet/formula';

export function colLabel(col: number): string {
  return idxToCol(col); // A, B, ..., Z, AA, AB, ...
}

export function cellRef(row: number, col: number): string {
  return `${colLabel(col)}${row + 1}`;
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 셀 값이 링크 형식이면 정규화된 URL 반환, 아니면 null.
 *  지원: http(s)://, mailto:, www. (자동으로 https:// 붙임) */
export function detectLink(value: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^https?:\/\/[^\s]+$/i.test(trimmed)) return trimmed;
  if (/^mailto:[^\s]+$/i.test(trimmed)) return trimmed;
  if (/^[\w.-]+@[\w.-]+\.[a-z]{2,}$/i.test(trimmed)) return `mailto:${trimmed}`;
  if (/^www\.[^\s]+$/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}
