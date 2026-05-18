/**
 * Markdown 안전 처리 유틸 — 메모/일기/AI 응답 등에서.
 *
 * 표시 텍스트로 markdown 특수 문자를 escape 해 의도치 않은 서식 회피.
 * (e.g. 사용자가 *별표* 텍스트를 입력해도 그대로 보이게.)
 */

/** markdown 특수 문자 escape. */
export function escapeMarkdown(s: string): string {
  return s.replace(/([\\`*_{}[\]()#+\-.!|>])/g, '\\$1');
}

/** 표 셀 내부 — | 만 escape. */
export function escapeMarkdownTableCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * markdown 텍스트 → plain text (간단 strip).
 * 완벽한 파서 X — 미리보기·검색용으로 충분한 수준.
 */
export function stripMarkdown(s: string): string {
  return s
    // 코드블록 — 내용 유지하되 ``` 제거
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, '').replace(/```/g, ''))
    // 인라인 코드
    .replace(/`([^`]+)`/g, '$1')
    // 이미지/링크
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 굵게/기울임 (**·__·*·_)
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)([^\s*_].*?)\1/g, '$2')
    // 헤더 #
    .replace(/^#{1,6}\s+/gm, '')
    // 인용 >
    .replace(/^>\s+/gm, '')
    // 리스트 마커
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // 가로선
    .replace(/^[-*_]{3,}$/gm, '')
    .trim();
}
