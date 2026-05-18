/**
 * Blob 다운로드 유틸 — 파일/텍스트 저장 패턴 통합.
 *
 * cloudSheet/xlsx, dataBackup, briefing 등에서 매번 anchor 생성→click→revoke
 * 패턴 반복. 한 함수로.
 *
 * 사용:
 *   downloadBlob(blob, '결과.xlsx');
 *   downloadText('hello', 'note.txt');
 *   downloadJson(obj, 'data.json');
 */

/** 파일명을 OS 친화로 sanitize — 금지 문자 _ 로. */
export function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim() || 'untitled';
}

/** Blob 다운로드 trigger. anchor 동적 생성 + 자동 정리. */
export function downloadBlob(blob: Blob, fileName: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeFileName(fileName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 약간의 지연 후 revoke — 일부 브라우저에서 즉시 revoke 시 다운로드 실패.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 텍스트 → blob 다운로드. UTF-8. */
export function downloadText(content: string, fileName: string, mime = 'text/plain;charset=utf-8'): void {
  downloadBlob(new Blob([content], { type: mime }), fileName);
}

/** 객체 → JSON 다운로드 (pretty print). */
export function downloadJson(value: unknown, fileName: string): void {
  const json = JSON.stringify(value, null, 2);
  downloadText(json, fileName.endsWith('.json') ? fileName : `${fileName}.json`, 'application/json;charset=utf-8');
}

/** CSV 다운로드 — UTF-8 BOM 포함 (Excel 한글 깨짐 방지). */
export function downloadCsv(csv: string, fileName: string): void {
  const bom = '﻿';
  downloadText(bom + csv, fileName.endsWith('.csv') ? fileName : `${fileName}.csv`, 'text/csv;charset=utf-8');
}
