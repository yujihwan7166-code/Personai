/**
 * 대화 공유 링크 — #14
 *
 * 백엔드 없이 URL fragment 에 압축된 JSON 을 담아 공유.
 * - 전송 방식: #s=<base64url>
 * - 압축: CompressionStream('deflate-raw') 가 있으면 사용, 없으면 raw base64.
 * - 포맷: { v:1, q:question, mode?, ts, msgs:[{r:role, n:name, c:content}] }
 *
 * 한계: fragment 길이 제한(브라우저마다 수 KB~수 MB). 대용량 대화는 경고.
 */

import type { DiscussionMessage } from '@/types/expert';

export interface ShareSnapshot {
  v: 1;
  q: string;
  mode?: string;
  ts: number;
  msgs: Array<{ r: 'user' | 'ai' | 'system'; n: string; c: string }>;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const pad = (4 - (str.length % 4)) % 4;
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function maybeCompress(json: string): Promise<Uint8Array> {
  const enc = new TextEncoder().encode(json);
  const CS = (window as unknown as { CompressionStream?: typeof CompressionStream }).CompressionStream;
  if (!CS) return enc;
  try {
    const stream = new Blob([enc]).stream().pipeThrough(new CS('deflate-raw'));
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return enc;
  }
}

async function maybeDecompress(bytes: Uint8Array): Promise<string> {
  const DS = (window as unknown as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream;
  if (!DS) return new TextDecoder().decode(bytes);
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DS('deflate-raw'));
    const buf = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(buf);
  } catch {
    // 압축되지 않은 경우 fallback
    return new TextDecoder().decode(bytes);
  }
}

/** 대화 → 공유용 스냅샷 (메시지 경량화). */
export function buildSnapshot(opts: {
  question: string;
  messages: DiscussionMessage[];
  nameOf: (expertId: string) => string;
  mode?: string;
}): ShareSnapshot {
  const { question, messages, nameOf, mode } = opts;
  return {
    v: 1,
    q: question.slice(0, 500),
    mode,
    ts: Date.now(),
    msgs: messages
      .filter((m) => m.expertId !== '__round__')
      .slice(0, 80) // 너무 긴 대화는 잘라서 URL 초과 방지
      .map((m) => ({
        r: m.expertId === '__user__' ? 'user' as const : 'ai' as const,
        n: m.expertId === '__user__' ? '사용자' : nameOf(m.expertId),
        c: (typeof m.content === 'string' ? m.content : '').slice(0, 4000),
      })),
  };
}

/** 스냅샷 → 공유 URL. */
export async function buildShareUrl(snapshot: ShareSnapshot): Promise<string> {
  const json = JSON.stringify(snapshot);
  const compressed = await maybeCompress(json);
  const encoded = toBase64Url(compressed);
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#s=${encoded}`;
}

/** 현재 URL fragment 에서 스냅샷을 복원. */
export async function readShareFromUrl(): Promise<ShareSnapshot | null> {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  const m = hash.match(/[#&]s=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const bytes = fromBase64Url(m[1]);
    const json = await maybeDecompress(bytes);
    const obj = JSON.parse(json);
    if (obj && typeof obj === 'object' && obj.v === 1 && Array.isArray(obj.msgs)) {
      return obj as ShareSnapshot;
    }
    return null;
  } catch {
    return null;
  }
}

/** URL 크기 안내용 — kB 단위. */
export function approxUrlSize(url: string): number {
  return Math.ceil(url.length / 1024);
}
