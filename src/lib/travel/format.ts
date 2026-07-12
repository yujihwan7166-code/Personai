/**
 * 여행기록 표시 유틸 — 컴포넌트 파일 밖으로 분리 (react-refresh 규칙).
 */

/** Leaflet 팝업 HTML 에 넣을 사용자 텍스트 이스케이프. */
export const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** 과거 여행 상대 시간 라벨 — 절대 날짜보다 기억을 먼저 소환한다. */
export function agoLabel(days: number): string {
  if (days <= 0) return '오늘 돌아옴';
  if (days === 1) return '어제 돌아옴';
  if (days < 30) return `${days}일 전 다녀옴`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전 다녀옴`;
  return `${Math.floor(days / 365)}년 전 다녀옴`;
}
