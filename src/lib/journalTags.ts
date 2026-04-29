/**
 * 일기 태그 헬퍼 — 본문 #태그 자동 추출 + 정규화.
 */
import type { JournalEntry } from '@/types/journal';

const TAG_PATTERN = /#([\p{L}\p{N}_]+)/gu;

/** 본문에서 #태그 추출. 중복 제거 + 소문자 정규화. */
export const extractTagsFromBody = (body: string): string[] => {
  const matches = body.match(TAG_PATTERN);
  if (!matches) return [];
  const set = new Set<string>();
  matches.forEach((m) => {
    const tag = m.slice(1).trim().toLowerCase();
    if (tag.length > 0) set.add(tag);
  });
  return Array.from(set);
};

/** 본문 + 수동 입력 태그 합치기 (중복 제거). */
export const mergeTags = (bodyTags: string[], manualTags: string[]): string[] => {
  const set = new Set<string>();
  [...bodyTags, ...manualTags].forEach((t) => {
    const norm = t.trim().toLowerCase().replace(/^#/, '');
    if (norm.length > 0) set.add(norm);
  });
  return Array.from(set);
};

/** 자주 쓴 태그 Top N (모든 일기 기준). */
export const getTopTags = (entries: JournalEntry[], n: number = 8): Array<{ tag: string; count: number }> => {
  const counts = new Map<string, number>();
  entries.forEach((e) => {
    (e.tags ?? []).forEach((t) => {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
};
