/**
 * 한국어 친화 날짜·시각 포맷 — 한 곳 모음.
 *
 * 각 페이지가 toLocaleDateString('ko-KR', {...}) 옵션을 다르게 써서 표기가 들쭉.
 * 공용 시그니처로 통일.
 */

/** '5월 12일' (월/일). */
export function fmtMonthDay(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '';
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
}

/** '2026년 5월 12일'. */
export function fmtFullDate(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '';
  return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`;
}

/** '월'/'화'/.../'일' — 1글자 한국 요일. */
export function fmtWeekdayShort(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '';
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[dt.getDay()];
}

/** '월요일' 등 긴 요일. */
export function fmtWeekdayLong(d: Date | string): string {
  const s = fmtWeekdayShort(d);
  return s ? `${s}요일` : '';
}

/** '오후 3:25' / '오전 9:05'. */
export function fmtTime12(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '';
  const h = dt.getHours();
  const m = dt.getMinutes();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${ampm} ${h12}:${String(m).padStart(2, '0')}`;
}

/** '15:25' 24시간 표기. */
export function fmtTime24(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '';
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

/**
 * '5월 12일 (월)' — 카드/리스트 헤더용.
 */
export function fmtDateWithWeekday(d: Date | string): string {
  const md = fmtMonthDay(d);
  const wd = fmtWeekdayShort(d);
  return md && wd ? `${md} (${wd})` : md;
}
