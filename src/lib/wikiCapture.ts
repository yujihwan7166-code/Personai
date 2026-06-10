import { newWikiId, type WikiPage, type WikiPageType } from '@/types/wiki';

const URL_RE = /(https?:\/\/[^\s)]+)/gi;
const TAG_RE = /(?:^|\s)#([가-힣a-zA-Z0-9_-]{1,32})/g;

export interface QuickCaptureDraft {
  title: string;
  tags: string[];
  urls: string[];
  page: WikiPage;
}

export function extractCaptureUrls(text: string): string[] {
  const urls = new Set<string>();
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(text)) !== null) {
    urls.add(match[1].replace(/[.,;:!?]+$/, ''));
  }
  return [...urls];
}

export function extractCaptureTags(text: string): string[] {
  const tags = new Set<string>();
  let match: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(text)) !== null) {
    const tag = match[1].trim();
    if (tag) tags.add(tag);
  }
  return [...tags];
}

export function deriveCaptureTitle(text: string, urls = extractCaptureUrls(text)): string {
  const firstLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('#'));
  if (firstLine && firstLine.length <= 60) return firstLine;
  if (firstLine) return `${firstLine.slice(0, 50)}...`;
  if (urls.length > 0) {
    try {
      const url = new URL(urls[0]);
      return `${url.hostname.replace(/^www\./, '')}${url.pathname && url.pathname !== '/' ? url.pathname : ''}`.slice(0, 80);
    } catch {
      return urls[0].slice(0, 60);
    }
  }
  const d = new Date();
  return `수집 메모 ${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function normalizeCaptureTags(tags: string[]): string[] {
  const out = new Set<string>();
  for (const raw of tags) {
    const tag = raw.trim().replace(/^#+/, '');
    if (tag) out.add(tag);
  }
  return [...out];
}

export function buildQuickCapturePage({
  text,
  title,
  extraTags = [],
  type = 'concept',
}: {
  text: string;
  title?: string;
  extraTags?: string[];
  type?: WikiPageType;
}): QuickCaptureDraft {
  const urls = extractCaptureUrls(text);
  const tags = normalizeCaptureTags(['수집함', ...extractCaptureTags(text), ...extraTags]);
  const now = Date.now();
  const pageTitle = (title?.trim() || deriveCaptureTitle(text, urls)).slice(0, 120);
  const sourceBlock = urls.length > 0
    ? `\n\n## 출처\n${urls.map((url) => `- ${url}`).join('\n')}`
    : '';
  const body = `${text.trim()}${sourceBlock}`;

  return {
    title: pageTitle,
    tags,
    urls,
    page: {
      id: newWikiId(),
      title: pageTitle,
      aliases: [],
      type,
      status: 'draft',
      tags,
      body,
      refersTo: [],
      cites: [],
      inherits: [],
      similarTo: [],
      parentMocs: [],
      createdAt: now,
      updatedAt: now,
    },
  };
}
