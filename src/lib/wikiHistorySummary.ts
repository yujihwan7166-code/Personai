import type { WikiPage } from '@/types/wiki';

export interface WikiPageDelta {
  changed: boolean;
  titleChanged: boolean;
  typeChanged: boolean;
  statusChanged: boolean;
  bodyCharDelta: number;
  bodyWordDelta: number;
  tagsAdded: string[];
  tagsRemoved: string[];
  aliasesAdded: string[];
  aliasesRemoved: string[];
  relationChanges: number;
  summary: string[];
}

const RELATION_KEYS = ['refersTo', 'cites', 'inherits', 'similarTo', 'parentMocs'] as const;

function normalizeList(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function diffList(base: string[], next: string[]): { added: string[]; removed: string[] } {
  const baseSet = new Set(normalizeList(base));
  const nextSet = new Set(normalizeList(next));
  return {
    added: [...nextSet].filter((value) => !baseSet.has(value)),
    removed: [...baseSet].filter((value) => !nextSet.has(value)),
  };
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatDelta(value: number, suffix: string): string | null {
  if (value === 0) return null;
  return `${value > 0 ? '+' : ''}${value}${suffix}`;
}

export function summarizeWikiPageDelta(base: WikiPage, next: WikiPage): WikiPageDelta {
  const tagDelta = diffList(base.tags, next.tags);
  const aliasDelta = diffList(base.aliases, next.aliases);
  const bodyCharDelta = next.body.length - base.body.length;
  const bodyWordDelta = wordCount(next.body) - wordCount(base.body);
  const relationChanges = RELATION_KEYS.reduce((count, key) => {
    const delta = diffList(base[key], next[key]);
    return count + delta.added.length + delta.removed.length;
  }, 0);

  const titleChanged = base.title !== next.title;
  const typeChanged = base.type !== next.type;
  const statusChanged = base.status !== next.status;
  const bodyDeltaLabel = formatDelta(bodyCharDelta, '자');
  const tagDeltaLabel = tagDelta.added.length || tagDelta.removed.length
    ? `태그 +${tagDelta.added.length}/-${tagDelta.removed.length}`
    : null;
  const aliasDeltaLabel = aliasDelta.added.length || aliasDelta.removed.length
    ? `별칭 +${aliasDelta.added.length}/-${aliasDelta.removed.length}`
    : null;
  const relationLabel = relationChanges > 0 ? `관계 ${relationChanges}개` : null;

  const summary = [
    titleChanged ? '제목 변경' : null,
    typeChanged ? '유형 변경' : null,
    statusChanged ? '상태 변경' : null,
    bodyDeltaLabel ? `본문 ${bodyDeltaLabel}` : null,
    tagDeltaLabel,
    aliasDeltaLabel,
    relationLabel,
  ].filter(Boolean) as string[];

  return {
    changed: summary.length > 0,
    titleChanged,
    typeChanged,
    statusChanged,
    bodyCharDelta,
    bodyWordDelta,
    tagsAdded: tagDelta.added,
    tagsRemoved: tagDelta.removed,
    aliasesAdded: aliasDelta.added,
    aliasesRemoved: aliasDelta.removed,
    relationChanges,
    summary,
  };
}

export function estimateReadingMinutes(text: string): number {
  const words = wordCount(text);
  if (words === 0) return 0;
  return Math.max(1, Math.ceil(words / 220));
}

export function firstMeaningfulLine(text: string): string {
  const line = text
    .split(/\r?\n/)
    .map((part) => part.replace(/[#*_`>~-]/g, '').trim())
    .find(Boolean);
  return line ?? '';
}
