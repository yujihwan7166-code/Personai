/**
 * 한국어 친화 날짜·시각 포맷 — 한 곳 모음.
 *
 * 각 페이지가 toLocaleDateString('ko-KR', {...}) 옵션을 다르게 써서 표기가 들쭉.
 * 공용 시그니처로 통일.
 *
 * ── 표기 단 (이 셋 중 하나를 고른다) ──
 *   fmtMonthDayNum   '5.12'          자리가 좁은 곳 — 목록의 날짜 열, 좁은 헤더
 *   fmtMonthDay      '5월 12일'      기본. 대부분의 자리
 *   fmtFullDate      '2026년 5월 12일'  올해가 아니거나 연도가 뜻을 갖는 자리
 * 요일이 필요하면 fmtDateWithWeekday('5월 12일 (화)').
 *
 * '5/12' 같은 빗금 표기는 쓰지 않는다 — 나라마다 월·일 순서가 달라 읽는 사람이 헷갈린다.
 * 티켓북의 '2026.05.12' 는 표 밖의 예외다 — 실물 티켓의 글씨를 흉내내는 자리라서.
 */

/** '5.12' — 자리가 좁을 때만. 넓으면 fmtMonthDay 를 쓴다. */
export function fmtMonthDayNum(d: Date | string | number): string {
  const dt = typeof d === 'object' ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${dt.getMonth() + 1}.${dt.getDate()}`;
}

/** '5월 12일' (월/일). */
export function fmtMonthDay(d: Date | string | number): string {
  const dt = typeof d === 'object' ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
}

/** '2026년 5월 12일'. */
export function fmtFullDate(d: Date | string | number): string {
  const dt = typeof d === 'object' ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`;
}

/** '월'/'화'/.../'일' — 1글자 한국 요일. */
export function fmtWeekdayShort(d: Date | string | number): string {
  const dt = typeof d === 'object' ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[dt.getDay()];
}

/** '월요일' 등 긴 요일. */
export function fmtWeekdayLong(d: Date | string | number): string {
  const s = fmtWeekdayShort(d);
  return s ? `${s}요일` : '';
}

/** '오후 3:25' / '오전 9:05'. */
export function fmtTime12(d: Date | string | number): string {
  const dt = typeof d === 'object' ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  const h = dt.getHours();
  const m = dt.getMinutes();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${ampm} ${h12}:${String(m).padStart(2, '0')}`;
}

/** '15:25' 24시간 표기. */
export function fmtTime24(d: Date | string | number): string {
  const dt = typeof d === 'object' ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

/**
 * '5월 12일 (월)' — 카드/리스트 헤더용.
 */
export function fmtDateWithWeekday(d: Date | string | number): string {
  const md = fmtMonthDay(d);
  const wd = fmtWeekdayShort(d);
  return md && wd ? `${md} (${wd})` : md;
}
