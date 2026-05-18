/** 시트 셀에 삽입할 오늘 날짜 / 현재 시각 문자열. Ctrl+; / Ctrl+Shift+; 단축키용. */

/** 오늘 날짜 (YYYY-MM-DD). */
export function todayString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 현재 시각 (HH:MM:SS). */
export function nowTimeString(d: Date = new Date()): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
