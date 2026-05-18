/**
 * 이미지 MIME / 확장자 추정 유틸.
 *
 * Sheet IMAGE 함수, 메모/위키/일기 첨부, AI 생성 결과 등에서
 * 파일명/Data URL/Blob 으로 타입 판단 필요.
 */

const EXT_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
  heic: 'image/heic',
};

/** 파일명 → 추정 MIME. 알 수 없으면 undefined. */
export function mimeFromFileName(name: string): string | undefined {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)(?:\?|#|$)/);
  if (!m) return undefined;
  return EXT_TO_MIME[m[1]];
}

/** URL / 파일명 / Data URL → 이미지 타입인지 판정. */
export function isImageSrc(src: string): boolean {
  if (!src) return false;
  if (src.startsWith('data:image/')) return true;
  return !!mimeFromFileName(src);
}

/** Data URL 의 MIME 추출. 실패 시 빈 문자열. */
export function mimeFromDataUrl(dataUrl: string): string {
  const m = dataUrl.match(/^data:([^;,]+)/);
  return m ? m[1] : '';
}

/** SVG 인지 (XSS 검토 필요한 타입). */
export function isSvg(src: string): boolean {
  return mimeFromDataUrl(src) === 'image/svg+xml' || /\.svg(?:\?|#|$)/i.test(src);
}
