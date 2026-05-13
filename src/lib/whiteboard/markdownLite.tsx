/**
 * 화이트보드 인라인 마크다운 라이트 — 스티키/텍스트/도형 안 텍스트용.
 *
 * 지원: **굵게** _기울임_ ~취소~ `inline code`
 * HTML 주입 X — React 요소로 반환.
 */
import type { ReactNode } from 'react';

type Token =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'strike'; value: string }
  | { type: 'code'; value: string };

const PATTERN = /(\*\*([^*\n]+?)\*\*)|(_([^_\n]+?)_)|(~([^~\n]+?)~)|(`([^`\n]+?)`)/g;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PATTERN.exec(text)) !== null) {
    if (m.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, m.index) });
    }
    if (m[1]) tokens.push({ type: 'bold', value: m[2] });
    else if (m[3]) tokens.push({ type: 'italic', value: m[4] });
    else if (m[5]) tokens.push({ type: 'strike', value: m[6] });
    else if (m[7]) tokens.push({ type: 'code', value: m[8] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return tokens;
}

/**
 * 마크다운 라이트 → React 노드. 줄바꿈은 \n 그대로 둠 (CSS white-space: pre-wrap 으로 처리).
 */
export function renderMarkdownLite(text: string): ReactNode[] {
  if (!text) return [];
  return tokenize(text).map((tok, i) => {
    if (tok.type === 'bold') return <strong key={i}>{tok.value}</strong>;
    if (tok.type === 'italic') return <em key={i}>{tok.value}</em>;
    if (tok.type === 'strike') return <s key={i}>{tok.value}</s>;
    if (tok.type === 'code') return <code key={i} style={{
      fontFamily: 'ui-monospace, monospace',
      background: 'hsl(0 0% 0% / 0.06)',
      padding: '0 4px',
      borderRadius: 3,
      fontSize: '0.92em',
    }}>{tok.value}</code>;
    return <span key={i}>{tok.value}</span>;
  });
}
