/**
 * HTML escape — < > & " ' → entities.
 *
 * dangerouslySetInnerHTML 직전, AI 응답 raw 출력 직전.
 * unescape 는 텍스트 추출 용도 (DB 저장된 값 표시 등).
 */

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

export function escapeHtml(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s).replace(/[&<>"'/]/g, c => ESC[c]);
}

const UNESC: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x2F;': '/',
  '&apos;': "'",
  '&nbsp;': ' ',
};

export function unescapeHtml(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s).replace(/&(?:amp|lt|gt|quot|#39|#x2F|apos|nbsp);/g, m => UNESC[m] ?? m);
}
