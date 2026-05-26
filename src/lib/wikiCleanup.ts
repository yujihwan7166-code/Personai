import type { WikiPage } from '@/types/wiki';
import { stripMarkdown } from '@/lib/wikiQuery';
import { addAliasOnce } from '@/lib/wikiLinks';

export interface DuplicateWikiCandidate {
  a: WikiPage;
  b: WikiPage;
  score: number;
  reasons: string[];
}

export function findDuplicateWikiCandidates(pages: WikiPage[], limit = 8): DuplicateWikiCandidate[] {
  const activePages = pages.filter((page) => page.status !== 'archived');
  const out: DuplicateWikiCandidate[] = [];

  for (let i = 0; i < activePages.length; i += 1) {
    for (let j = i + 1; j < activePages.length; j += 1) {
      const a = activePages[i];
      const b = activePages[j];
      const { score, reasons } = scoreDuplicatePair(a, b);
      if (score >= 55) out.push({ a, b, score, reasons });
    }
  }

  return out
    .sort((left, right) => right.score - left.score || right.a.updatedAt - left.a.updatedAt)
    .slice(0, limit);
}

export function mergeWikiPages({
  primary,
  secondary,
  now = Date.now(),
}: {
  primary: WikiPage;
  secondary: WikiPage;
  now?: number;
}): { merged: WikiPage; archived: WikiPage } {
  let aliases = [...primary.aliases];
  for (const alias of [secondary.title, ...secondary.aliases]) {
    const clean = alias.trim();
    if (clean && clean.toLowerCase() !== primary.title.trim().toLowerCase()) {
      aliases = addAliasOnce(aliases, clean);
    }
  }

  const mergedBody = mergeBodies(primary, secondary);
  const merged: WikiPage = {
    ...primary,
    aliases,
    tags: unique([...primary.tags, ...secondary.tags]),
    body: mergedBody,
    refersTo: unique([...primary.refersTo, ...secondary.refersTo]).filter((id) => id !== primary.id && id !== secondary.id),
    cites: unique([...primary.cites, ...secondary.cites]).filter((id) => id !== primary.id && id !== secondary.id),
    inherits: unique([...primary.inherits, ...secondary.inherits]).filter((id) => id !== primary.id && id !== secondary.id),
    similarTo: unique([...primary.similarTo, ...secondary.similarTo]).filter((id) => id !== primary.id && id !== secondary.id),
    parentMocs: unique([...primary.parentMocs, ...secondary.parentMocs]).filter((id) => id !== secondary.id),
    updatedAt: now,
  };

  const archived: WikiPage = {
    ...secondary,
    status: 'archived',
    tags: unique([...secondary.tags, 'merged']),
    body: [
      `> 이 문서는 [[${primary.title}]] 문서로 병합되어 보관됐습니다.`,
      '',
      secondary.body,
    ].join('\n'),
    updatedAt: now,
  };

  return { merged, archived };
}

export function replaceRelationTarget(ids: string[], fromId: string, toId: string): string[] {
  return unique(ids.map((id) => (id === fromId ? toId : id))).filter((id) => id !== fromId);
}

export function setWikiPageArchived(page: WikiPage, archived: boolean, now = Date.now()): WikiPage {
  const status = archived ? 'archived' : 'active';
  if (page.status === status) return page;
  return { ...page, status, updatedAt: now };
}

function scoreDuplicatePair(a: WikiPage, b: WikiPage): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const titleA = normalize(a.title);
  const titleB = normalize(b.title);
  if (titleA && titleA === titleB) {
    score += 80;
    reasons.push('제목 같음');
  } else {
    const titleSimilarity = jaccard(tokens(a.title), tokens(b.title));
    if (titleSimilarity >= 0.65) {
      score += Math.round(titleSimilarity * 55);
      reasons.push('제목 유사');
    }
  }

  const aliasHit = a.aliases.some((alias) => normalize(alias) === titleB)
    || b.aliases.some((alias) => normalize(alias) === titleA)
    || overlaps(a.aliases.map(normalize), b.aliases.map(normalize));
  if (aliasHit) {
    score += 35;
    reasons.push('별칭 겹침');
  }

  const tagOverlap = jaccard(a.tags.map(normalize), b.tags.map(normalize));
  if (tagOverlap >= 0.5 && (a.tags.length > 0 || b.tags.length > 0)) {
    score += Math.round(tagOverlap * 18);
    reasons.push('태그 유사');
  }

  const bodySimilarity = jaccard(tokens(stripMarkdown(a.body)).slice(0, 80), tokens(stripMarkdown(b.body)).slice(0, 80));
  if (bodySimilarity >= 0.45) {
    score += Math.round(bodySimilarity * 22);
    reasons.push('본문 유사');
  }

  return { score: Math.min(100, score), reasons };
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function tokens(value: string): string[] {
  return normalize(value)
    .replace(/[^\p{L}\p{N}\s_-]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function overlaps(a: string[], b: string[]): boolean {
  const bSet = new Set(b.filter(Boolean));
  return a.some((value) => bSet.has(value));
}

function jaccard(a: string[], b: string[]): number {
  const left = new Set(a.filter(Boolean));
  const right = new Set(b.filter(Boolean));
  if (left.size === 0 && right.size === 0) return 0;
  let intersection = 0;
  for (const value of left) {
    if (right.has(value)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection);
}

function mergeBodies(primary: WikiPage, secondary: WikiPage): string {
  const left = primary.body.trimEnd();
  const right = secondary.body.trim();
  if (!right) return left;
  if (stripMarkdown(left).includes(stripMarkdown(right).slice(0, 80))) return left;
  return [
    left,
    '',
    `## 병합된 내용: ${secondary.title}`,
    '',
    right,
  ].filter((part) => part.length > 0).join('\n');
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = value.trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}
