/**
 * 대화 내보내기 유틸 — 마크다운·클립보드·다운로드.
 *
 * 각 모드(general/multi/debate/...)의 DiscussionMessage 배열을 받아
 * 사람이 읽기 좋은 마크다운으로 변환.
 */
import type { DiscussionMessage, Expert } from '@/types/expert';

export interface ChatExportOptions {
  question: string;
  messages: DiscussionMessage[];
  experts: Expert[];
  /** 모드 표시용 (옵션). */
  modeLabel?: string;
  /** 날짜 표시 (기본 now). */
  timestamp?: number;
}

export function chatToMarkdown(opts: ChatExportOptions): string {
  const { question, messages, experts, modeLabel, timestamp = Date.now() } = opts;
  const date = new Date(timestamp).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });

  const findExpert = (id: string) =>
    experts.find((e) => e.id === id) || null;

  const lines: string[] = [];
  // 헤더
  lines.push(`# ${question || '대화'}`);
  lines.push('');
  lines.push(`> ${modeLabel ? `**모드**: ${modeLabel}  ·  ` : ''}**시간**: ${date}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 메시지들
  let currentRound: string | undefined = undefined;
  for (const msg of messages) {
    if (msg.expertId === '__round__') {
      currentRound = typeof msg.content === 'string' ? msg.content : undefined;
      lines.push('');
      lines.push(`## ${currentRound}`);
      lines.push('');
      continue;
    }
    const expert = findExpert(msg.expertId);
    const name = expert?.nameKo || expert?.name || msg.expertId;
    const role = expert?.description ? ` — *${expert.description}*` : '';
    lines.push(`### ${name}${role}`);
    lines.push('');
    lines.push(msg.content || '');
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // 폴백
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** 파일명 안전 슬러그화. */
export function safeFilename(input: string, ext: string = 'md'): string {
  const base = (input || 'chat').slice(0, 40).replace(/[\\/:*?"<>|]/g, '-').trim();
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${base}-${stamp}.${ext}`;
}
