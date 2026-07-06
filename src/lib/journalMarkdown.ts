/**
 * 마크다운 텍스트 → 미리보기용 plain text 추출.
 *
 * 카드 line-clamp 미리보기에서만 사용. 풀 본문은 마크다운 그대로 렌더.
 */

export const stripMarkdown = (md: string): string => {
  return md
    // 이미지·링크 제거 (텍스트만 남김)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // 헤딩 #
    .replace(/^#{1,6}\s+/gm, '')
    // 굵게·기울임·취소선
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/~~(.+?)~~/g, '$1')
    // 인라인 코드
    .replace(/`([^`]+)`/g, '$1')
    // 코드 블록 펜스
    .replace(/```[\s\S]*?```/g, '')
    // 리스트 마커
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // blockquote
    .replace(/^>\s+/gm, '')
    // 가로선
    .replace(/^---+$/gm, '')
    .trim();
};
