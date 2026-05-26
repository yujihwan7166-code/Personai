import { extractWikiLinks, isMainDoc, type WikiPage, type WikiPageStatus, type WikiPageType } from '@/types/wiki';

export type WikiSearchHitKind = 'title' | 'alias' | 'tag' | 'link' | 'body' | 'none';
export type WikiGraphEdgeKind = 'refersTo' | 'cites' | 'inherits' | 'similarTo' | 'parentMocs';

export interface WikiGraphEdge {
  from: string;
  to: string;
  kind: WikiGraphEdgeKind;
}

export interface WikiGraphModel {
  edges: WikiGraphEdge[];
  neighborMap: Map<string, Set<string>>;
  degree: Map<string, number>;
}

export interface WikiSearchHit {
  page: WikiPage;
  hit: WikiSearchHitKind;
  bodySnippet?: string;
  matchedAlias?: string;
  matchedTag?: string;
  matchedLink?: string;
  score: number;
}

export interface WikiRelations {
  byId: Map<string, WikiPage>;
  byTitle: Map<string, WikiPage>;
  backlinks: Map<string, Set<string>>;
  wanted: Array<{ title: string; count: number }>;
  orphans: WikiPage[];
}

export interface WikiOutgoingLinks {
  existing: WikiPage[];
  missing: string[];
}

export interface WikiRelatedSuggestion {
  page: WikiPage;
  score: number;
  reasons: string[];
}

export interface WikiLinkMentionSuggestion {
  page: WikiPage;
  matchedText: string;
  reason: '제목 언급' | '별칭 언급';
  index: number;
}

export interface WikiBacklinkPreview {
  page: WikiPage;
  reasons: string[];
  snippet: string;
}

export type WikiManualRelationKind = 'cites' | 'inherits' | 'similarTo' | 'parentMocs';

export interface WikiManualRelationGroup {
  kind: WikiManualRelationKind;
  label: string;
  pages: WikiPage[];
  missingIds: string[];
}

export type WikiPageHealthLevel = 'warning' | 'notice';

export interface WikiPageHealthItem {
  id: 'draft' | 'short-body' | 'no-tags' | 'missing-links' | 'no-outgoing' | 'no-backlinks';
  level: WikiPageHealthLevel;
  label: string;
  detail: string;
}

export interface WikiCleanupQueueItem {
  page: WikiPage;
  issues: WikiPageHealthItem[];
  warningCount: number;
  score: number;
}

export interface WikiFacetItem<T extends string = string> {
  value: T;
  count: number;
}

export interface WikiFacetSummary {
  tags: WikiFacetItem[];
  types: WikiFacetItem<WikiPageType>[];
  statuses: WikiFacetItem<WikiPageStatus>[];
  categories: WikiFacetItem[];
}

export interface WikiPagePickOptions {
  excludeIds?: Iterable<string>;
  includeArchived?: boolean;
  limit?: number;
}

const normalize = (value: string): string => value.trim().toLowerCase();
const TOKEN_STOPWORDS = new Set(['그리고', '하지만', '또는', '관련', '정리', '메모', '문서', '대한', 'the', 'and', 'for', 'with']);
const WIKI_TYPE_ORDER: WikiPageType[] = ['concept', 'moc', 'source', 'project', 'meeting', 'person', 'index'];
const WIKI_STATUS_ORDER: WikiPageStatus[] = ['draft', 'active', 'stable', 'archived'];
const WIKI_TYPE_SET = new Set<WikiPageType>(WIKI_TYPE_ORDER);
const WIKI_STATUS_SET = new Set<WikiPageStatus>(WIKI_STATUS_ORDER);

interface WikiParsedSearchQuery {
  text: string;
  tags: string[];
  types: WikiPageType[];
  statuses: WikiPageStatus[];
  categories: string[];
}

export function getActiveWikiPages(pages: WikiPage[]): WikiPage[] {
  return pages.filter((page) => page.status !== 'archived');
}

export function getArchivedWikiPages(pages: WikiPage[]): WikiPage[] {
  return pages.filter((page) => page.status === 'archived');
}

export function pickWikiPagesByIds(pages: WikiPage[], ids: string[], options: WikiPagePickOptions = {}): WikiPage[] {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const excludeIds = new Set(options.excludeIds ?? []);
  const seen = new Set<string>();
  const picked: WikiPage[] = [];

  for (const id of ids) {
    if (seen.has(id) || excludeIds.has(id)) continue;
    seen.add(id);
    const page = byId.get(id);
    if (!page) continue;
    if (!options.includeArchived && page.status === 'archived') continue;
    picked.push(page);
    if (options.limit && picked.length >= options.limit) break;
  }

  return picked;
}

export function buildWikiFacetSummary(pages: WikiPage[]): WikiFacetSummary {
  const tagCounts = new Map<string, number>();
  const typeCounts = new Map<WikiPageType, number>();
  const statusCounts = new Map<WikiPageStatus, number>();
  const categoryCounts = new Map<string, number>();

  for (const page of pages) {
    typeCounts.set(page.type, (typeCounts.get(page.type) ?? 0) + 1);
    statusCounts.set(page.status, (statusCounts.get(page.status) ?? 0) + 1);
    if (page.category?.trim()) {
      const category = page.category.trim();
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
    for (const tag of page.tags) {
      const clean = tag.trim();
      if (clean) tagCounts.set(clean, (tagCounts.get(clean) ?? 0) + 1);
    }
  }

  const byCountThenName = <T extends string>(a: WikiFacetItem<T>, b: WikiFacetItem<T>) =>
    b.count - a.count || a.value.localeCompare(b.value, 'ko');

  return {
    tags: [...tagCounts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort(byCountThenName),
    types: WIKI_TYPE_ORDER
      .map((value) => ({ value, count: typeCounts.get(value) ?? 0 }))
      .filter((item) => item.count > 0),
    statuses: WIKI_STATUS_ORDER
      .map((value) => ({ value, count: statusCounts.get(value) ?? 0 }))
      .filter((item) => item.count > 0),
    categories: [...categoryCounts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort(byCountThenName),
  };
}

export function buildWikiRelations(pages: WikiPage[]): WikiRelations {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const byTitle = new Map<string, WikiPage>();
  for (const page of pages) {
    byTitle.set(normalize(page.title), page);
    for (const alias of page.aliases) byTitle.set(normalize(alias), page);
  }

  const backlinks = new Map<string, Set<string>>();
  const wantedCount = new Map<string, number>();

  const addBacklink = (targetId: string, sourceId: string) => {
    if (targetId === sourceId) return;
    if (!backlinks.has(targetId)) backlinks.set(targetId, new Set());
    backlinks.get(targetId)!.add(sourceId);
  };

  for (const source of pages) {
    for (const link of extractWikiLinks(source.body)) {
      const target = byId.get(link) ?? byTitle.get(normalize(link));
      if (target) addBacklink(target.id, source.id);
      else wantedCount.set(link, (wantedCount.get(link) ?? 0) + 1);
    }

    for (const relationIds of [source.refersTo, source.cites, source.inherits, source.similarTo, source.parentMocs]) {
      for (const targetId of relationIds) {
        if (byId.has(targetId)) addBacklink(targetId, source.id);
      }
    }
  }

  const referencedIds = new Set<string>();
  for (const page of pages) {
    for (const id of [...page.refersTo, ...page.cites, ...page.inherits, ...page.similarTo, ...page.parentMocs]) {
      if (byId.has(id)) referencedIds.add(id);
    }
  }
  for (const targetId of backlinks.keys()) referencedIds.add(targetId);

  const orphans = pages.filter((page) =>
    !isMainDoc(page)
    && page.type !== 'index'
    && !referencedIds.has(page.id)
    && extractWikiLinks(page.body).length === 0
    && page.refersTo.length === 0
    && page.cites.length === 0
    && page.inherits.length === 0
    && page.similarTo.length === 0
    && page.parentMocs.length === 0,
  );

  return {
    byId,
    byTitle,
    backlinks,
    wanted: [...wantedCount.entries()]
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)),
    orphans,
  };
}

export function collectWikiOutgoingLinks(page: WikiPage, pages: WikiPage[]): WikiOutgoingLinks {
  const byId = new Map(pages.map((item) => [item.id, item]));
  const byTitle = new Map<string, WikiPage>();
  for (const item of pages) {
    byTitle.set(normalize(item.title), item);
    for (const alias of item.aliases) byTitle.set(normalize(alias), item);
  }

  const existing = new Map<string, WikiPage>();
  const missing = new Map<string, string>();
  const addTarget = (raw: string) => {
    const targetText = raw.trim();
    if (!targetText) return;
    const target = byId.get(targetText) ?? byTitle.get(normalize(targetText));
    if (target && target.id !== page.id) {
      existing.set(target.id, target);
      return;
    }
    if (!target && !targetText.startsWith('w_')) missing.set(normalize(targetText), targetText);
  };

  for (const link of extractWikiLinks(page.body)) addTarget(link);
  for (const id of [...page.refersTo, ...page.cites, ...page.inherits, ...page.similarTo, ...page.parentMocs]) {
    const target = byId.get(id);
    if (target && target.id !== page.id) existing.set(target.id, target);
  }

  return {
    existing: [...existing.values()].sort((a, b) => a.title.localeCompare(b.title)),
    missing: [...missing.values()].sort((a, b) => a.localeCompare(b)),
  };
}

export function suggestRelatedWikiPages(page: WikiPage, pages: WikiPage[], limit = 6): WikiRelatedSuggestion[] {
  const activePages = getActiveWikiPages(pages);
  const relations = buildWikiRelations(activePages);
  const directOut = new Set(collectWikiOutgoingLinks(page, activePages).existing.map((target) => target.id));
  const directIn = relations.backlinks.get(page.id) ?? new Set<string>();
  const myTitleTokens = tokenSet(page.title);
  const myBodyTokens = tokenSet(stripMarkdown(page.body), 80);
  const myTags = new Set(page.tags.map(normalize));
  const graph = buildWikiGraphModel(activePages);
  const myNeighbors = graph.neighborMap.get(page.id) ?? new Set<string>();

  return activePages
    .filter((candidate) =>
      candidate.id !== page.id
      && !directOut.has(candidate.id)
      && !directIn.has(candidate.id),
    )
    .map((candidate) => {
      let score = 0;
      const reasons: string[] = [];

      const sharedTags = candidate.tags.filter((tag) => myTags.has(normalize(tag)));
      if (sharedTags.length > 0) {
        score += sharedTags.length * 18;
        reasons.push(...sharedTags.slice(0, 2).map((tag) => `#${tag}`));
      }

      const titleOverlap = overlapCount(myTitleTokens, tokenSet([candidate.title, ...candidate.aliases].join(' ')));
      if (titleOverlap > 0) {
        score += titleOverlap * 12;
        reasons.push('제목 유사');
      }

      const bodyOverlap = overlapCount(myBodyTokens, tokenSet(stripMarkdown(candidate.body), 80));
      if (bodyOverlap > 1) {
        score += Math.min(bodyOverlap, 6) * 5;
        reasons.push('본문 유사');
      }

      const candidateNeighbors = graph.neighborMap.get(candidate.id) ?? new Set<string>();
      const sharedNeighbors = overlapCount(myNeighbors, candidateNeighbors);
      if (sharedNeighbors > 0) {
        score += sharedNeighbors * 8;
        reasons.push('연결 구조 유사');
      }

      if (candidate.type === page.type && score > 0) score += 2;

      return {
        page: candidate,
        score,
        reasons: [...new Set(reasons)].slice(0, 4),
      };
    })
    .filter((suggestion) => suggestion.score >= 12)
    .sort((a, b) => b.score - a.score || b.page.updatedAt - a.page.updatedAt || a.page.title.localeCompare(b.page.title))
    .slice(0, limit);
}

export function findUnlinkedWikiMentions(page: WikiPage, pages: WikiPage[], limit = 6): WikiLinkMentionSuggestion[] {
  const activePages = getActiveWikiPages(pages);
  const linkedIds = new Set(collectWikiOutgoingLinks(page, activePages).existing.map((target) => target.id));
  const maskedBody = maskLinkedMarkdown(page.body);
  const suggestions: WikiLinkMentionSuggestion[] = [];

  for (const target of activePages) {
    if (target.id === page.id || linkedIds.has(target.id)) continue;
    const terms = [target.title, ...target.aliases]
      .map((term) => term.trim())
      .filter((term, index, arr) =>
        term.length >= 2
        && arr.findIndex((item) => normalize(item) === normalize(term)) === index,
      )
      .sort((a, b) => b.length - a.length);

    for (const term of terms) {
      const idx = indexOfInsensitive(maskedBody, term);
      if (idx < 0) continue;
      suggestions.push({
        page: target,
        matchedText: page.body.slice(idx, idx + term.length),
        reason: normalize(term) === normalize(target.title) ? '제목 언급' : '별칭 언급',
        index: idx,
      });
      break;
    }
  }

  return suggestions
    .sort((a, b) => a.index - b.index || b.matchedText.length - a.matchedText.length || a.page.title.localeCompare(b.page.title))
    .slice(0, limit);
}

export function buildWikiBacklinkPreviews(page: WikiPage, pages: WikiPage[], limit = 12): WikiBacklinkPreview[] {
  const activePages = getActiveWikiPages(pages);
  const targetKeys = new Set([page.id, page.title, ...page.aliases].map(normalize));
  const previews: WikiBacklinkPreview[] = [];

  for (const source of activePages) {
    if (source.id === page.id) continue;
    const reasons: string[] = [];
    const links = extractWikiLinks(source.body);
    if (links.some((link) => targetKeys.has(normalize(link)))) reasons.push('본문 링크');
    if (source.refersTo.includes(page.id)) reasons.push('참조');
    if (source.cites.includes(page.id)) reasons.push('인용');
    if (source.inherits.includes(page.id)) reasons.push('상위 개념');
    if (source.similarTo.includes(page.id)) reasons.push('유사 문서');
    if (source.parentMocs.includes(page.id)) reasons.push('소속');
    if (reasons.length === 0) continue;

    previews.push({
      page: source,
      reasons,
      snippet: makeBacklinkPreviewSnippet(source.body, [page.title, ...page.aliases, page.id]),
    });
  }

  return previews
    .sort((a, b) => b.page.updatedAt - a.page.updatedAt || a.page.title.localeCompare(b.page.title))
    .slice(0, limit);
}

export function collectWikiManualRelations(page: WikiPage, pages: WikiPage[]): WikiManualRelationGroup[] {
  const byId = new Map(getActiveWikiPages(pages).map((item) => [item.id, item]));
  const specs: Array<{ kind: WikiManualRelationKind; label: string; ids: string[] }> = [
    { kind: 'parentMocs', label: '소속 메인', ids: page.parentMocs },
    { kind: 'inherits', label: '상위 개념', ids: page.inherits },
    { kind: 'cites', label: '인용', ids: page.cites },
    { kind: 'similarTo', label: '유사 문서', ids: page.similarTo },
  ];

  return specs
    .map(({ kind, label, ids }) => {
      const seen = new Set<string>();
      const uniqueIds = ids.filter((id) => {
        if (seen.has(id) || id === page.id) return false;
        seen.add(id);
        return true;
      });
      return {
        kind,
        label,
        pages: uniqueIds.map((id) => byId.get(id)).filter((item): item is WikiPage => !!item),
        missingIds: uniqueIds.filter((id) => !byId.has(id)),
      };
    })
    .filter((group) => group.pages.length > 0 || group.missingIds.length > 0);
}

export function analyzeWikiPageHealth(page: WikiPage, pages: WikiPage[]): WikiPageHealthItem[] {
  if (page.status === 'archived') return [];

  const activePages = getActiveWikiPages(pages);
  const outgoing = collectWikiOutgoingLinks(page, activePages);
  const relations = buildWikiRelations(activePages);
  const backlinkCount = relations.backlinks.get(page.id)?.size ?? 0;
  const bodyChars = stripMarkdown(page.body).replace(/\s+/g, '').length;
  const items: WikiPageHealthItem[] = [];
  const isIndex = page.type === 'index';
  const isMain = isMainDoc(page);

  if (page.status === 'draft') {
    items.push({
      id: 'draft',
      level: 'notice',
      label: '초안 상태',
      detail: '내용 정리가 끝났다면 상태를 작업중이나 완성으로 바꿔도 됩니다.',
    });
  }

  if (!isIndex && bodyChars < 80) {
    items.push({
      id: 'short-body',
      level: 'warning',
      label: '본문이 짧음',
      detail: '검색과 추천 품질을 위해 핵심 설명을 조금 더 적어두는 편이 좋습니다.',
    });
  }

  if (!isIndex && page.tags.length === 0) {
    items.push({
      id: 'no-tags',
      level: 'notice',
      label: '태그 없음',
      detail: '태그가 있으면 검색, 관련 문서 추천, 정리가 쉬워집니다.',
    });
  }

  if (outgoing.missing.length > 0) {
    items.push({
      id: 'missing-links',
      level: 'warning',
      label: `미완성 링크 ${outgoing.missing.length}개`,
      detail: '아직 만들어지지 않은 위키링크가 있습니다.',
    });
  }

  if (!isIndex && outgoing.existing.length === 0 && outgoing.missing.length === 0) {
    items.push({
      id: 'no-outgoing',
      level: 'notice',
      label: '나가는 연결 없음',
      detail: '관련 문서를 한두 개 연결하면 위키 탐색성이 좋아집니다.',
    });
  }

  if (!isIndex && !isMain && backlinkCount === 0 && page.parentMocs.length === 0) {
    items.push({
      id: 'no-backlinks',
      level: 'notice',
      label: '들어오는 연결 없음',
      detail: '다른 문서나 메인 문서에서 이 문서를 연결하면 찾기 쉬워집니다.',
    });
  }

  return items;
}

export function buildWikiCleanupQueue(pages: WikiPage[], limit = 8): WikiCleanupQueueItem[] {
  const activePages = getActiveWikiPages(pages);
  return activePages
    .filter((page) => page.type !== 'index')
    .map((page) => {
      const issues = analyzeWikiPageHealth(page, activePages);
      const warningCount = issues.filter((issue) => issue.level === 'warning').length;
      return {
        page,
        issues,
        warningCount,
        score: warningCount * 3 + (issues.length - warningCount),
      };
    })
    .filter((item) => item.issues.length > 0)
    .sort((a, b) =>
      b.score - a.score
      || b.warningCount - a.warningCount
      || a.page.updatedAt - b.page.updatedAt
      || a.page.title.localeCompare(b.page.title),
    )
    .slice(0, limit);
}

export function buildWikiGraphModel(pages: WikiPage[]): WikiGraphModel {
  const relations = buildWikiRelations(pages);
  const edgeSet = new Set<string>();
  const edges: WikiGraphEdge[] = [];
  const neighborMap = new Map<string, Set<string>>();
  const degree = new Map<string, number>();

  const add = (from: string, to: string, kind: WikiGraphEdgeKind) => {
    if (from === to || !relations.byId.has(from) || !relations.byId.has(to)) return;
    const key = from < to ? `${from}|${to}|${kind}` : `${to}|${from}|${kind}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ from, to, kind });
    degree.set(from, (degree.get(from) ?? 0) + 1);
    degree.set(to, (degree.get(to) ?? 0) + 1);
    if (!neighborMap.has(from)) neighborMap.set(from, new Set());
    if (!neighborMap.has(to)) neighborMap.set(to, new Set());
    neighborMap.get(from)!.add(to);
    neighborMap.get(to)!.add(from);
  };

  for (const source of pages) {
    for (const link of extractWikiLinks(source.body)) {
      const target = relations.byId.get(link) ?? relations.byTitle.get(normalize(link));
      if (target) add(source.id, target.id, 'refersTo');
    }
    for (const targetId of source.refersTo) add(source.id, targetId, 'refersTo');
    for (const targetId of source.cites) add(source.id, targetId, 'cites');
    for (const targetId of source.inherits) add(source.id, targetId, 'inherits');
    for (const targetId of source.similarTo) add(source.id, targetId, 'similarTo');
    for (const targetId of source.parentMocs) add(source.id, targetId, 'parentMocs');
  }

  return { edges, neighborMap, degree };
}

export function shortestWikiPath(neighborMap: Map<string, Set<string>>, start: string, end: string): string[] | null {
  if (start === end) return [start];
  const visited = new Set<string>([start]);
  const parent = new Map<string, string>();
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const neighbors = neighborMap.get(cur);
    if (!neighbors) continue;
    for (const next of neighbors) {
      if (visited.has(next)) continue;
      visited.add(next);
      parent.set(next, cur);
      if (next === end) {
        const path = [end];
        let cursor = end;
        while (cursor !== start) {
          const prev = parent.get(cursor);
          if (!prev) return null;
          path.push(prev);
          cursor = prev;
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return null;
}

export function searchWikiPages(pages: WikiPage[], query: string): WikiSearchHit[] {
  const parsed = parseWikiSearchQuery(query);
  const q = parsed.text;
  if (!q && !hasSearchFilters(parsed)) return pages.map((page, index) => ({ page, hit: 'none', score: -index }));

  const hits: WikiSearchHit[] = [];
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    if (!matchesParsedSearch(page, parsed)) continue;

    if (!q) {
      const matchedTag = findMatchingTag(page, parsed.tags);
      hits.push({
        page,
        hit: matchedTag ? 'tag' : 'none',
        matchedTag,
        score: (matchedTag ? 70 : 40) - index / 100,
      });
      continue;
    }

    const title = normalize(page.title);
    if (title.includes(q)) {
      hits.push({ page, hit: 'title', score: title === q ? 100 : 90 - index / 100 });
      continue;
    }

    const matchedAlias = page.aliases.find((alias) => normalize(alias).includes(q));
    if (matchedAlias) {
      hits.push({ page, hit: 'alias', matchedAlias, score: 80 - index / 100 });
      continue;
    }

    const matchedTag = page.tags.find((tag) => normalize(tag).includes(q));
    if (matchedTag) {
      hits.push({ page, hit: 'tag', matchedTag, score: normalize(matchedTag) === q ? 75 : 70 - index / 100 });
      continue;
    }

    const matchedLink = extractWikiLinks(page.body).find((link) => normalize(link).includes(q));
    if (matchedLink) {
      hits.push({ page, hit: 'link', matchedLink, score: 62 - index / 100 });
      continue;
    }

    if (q.length >= 2) {
      const body = stripMarkdown(page.body);
      const idx = normalize(body).indexOf(q);
      if (idx >= 0) {
        hits.push({
          page,
          hit: 'body',
          bodySnippet: makeSnippet(body, idx, q.length),
          score: 50 - index / 100,
        });
      }
    }
  }

  return hits.sort((a, b) => b.score - a.score || b.page.updatedAt - a.page.updatedAt);
}

function parseWikiSearchQuery(query: string): WikiParsedSearchQuery {
  const parsed: WikiParsedSearchQuery = { text: '', tags: [], types: [], statuses: [], categories: [] };
  const textTokens: string[] = [];

  for (const rawToken of query.trim().split(/\s+/).filter(Boolean)) {
    if (rawToken.startsWith('#') && rawToken.length > 1) {
      parsed.tags.push(rawToken.slice(1));
      continue;
    }

    const operator = /^(tag|type|status|category|cat):(.+)$/i.exec(rawToken);
    if (!operator) {
      textTokens.push(rawToken);
      continue;
    }

    const key = operator[1].toLowerCase();
    const values = operator[2].split(',').map((value) => value.trim()).filter(Boolean);
    if (key === 'tag') {
      parsed.tags.push(...values);
      continue;
    }
    if (key === 'category' || key === 'cat') {
      parsed.categories.push(...values);
      continue;
    }
    if (key === 'type') {
      const types = values.filter((value): value is WikiPageType => WIKI_TYPE_SET.has(value as WikiPageType));
      if (types.length > 0) {
        parsed.types.push(...types);
        continue;
      }
    }
    if (key === 'status') {
      const statuses = values.filter((value): value is WikiPageStatus => WIKI_STATUS_SET.has(value as WikiPageStatus));
      if (statuses.length > 0) {
        parsed.statuses.push(...statuses);
        continue;
      }
    }

    textTokens.push(rawToken);
  }

  parsed.text = normalize(textTokens.join(' '));
  parsed.tags = uniqueNormalizedValues(parsed.tags);
  parsed.types = [...new Set(parsed.types)];
  parsed.statuses = [...new Set(parsed.statuses)];
  parsed.categories = uniqueNormalizedValues(parsed.categories);
  return parsed;
}

function hasSearchFilters(query: WikiParsedSearchQuery): boolean {
  return query.tags.length > 0 || query.types.length > 0 || query.statuses.length > 0 || query.categories.length > 0;
}

function matchesParsedSearch(page: WikiPage, query: WikiParsedSearchQuery): boolean {
  if (query.types.length > 0 && !query.types.includes(page.type)) return false;
  if (query.statuses.length > 0 && !query.statuses.includes(page.status)) return false;
  if (query.tags.length > 0 && !query.tags.every((tag) => page.tags.some((item) => normalize(item).includes(tag)))) return false;
  if (query.categories.length > 0) {
    const category = normalize(page.category ?? '');
    if (!query.categories.every((item) => category.includes(item))) return false;
  }
  return true;
}

function findMatchingTag(page: WikiPage, tags: string[]): string | undefined {
  if (tags.length === 0) return undefined;
  return page.tags.find((tag) => tags.some((item) => normalize(tag).includes(item)));
}

function uniqueNormalizedValues(values: string[]): string[] {
  return [...new Set(values.map(normalize).filter(Boolean))];
}

export function stripMarkdown(value: string): string {
  return value
    .replace(/^---[\s\S]*?^---/m, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?]]/g, (_match, target: string, label?: string) => label ?? target)
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[`*_>#~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeSnippet(body: string, idx: number, length: number): string {
  const start = Math.max(0, idx - 34);
  const end = Math.min(body.length, idx + length + 50);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < body.length ? '...' : '';
  return `${prefix}${body.slice(start, end).trim()}${suffix}`;
}

function tokenSet(value: string, limit = 40): Set<string> {
  return new Set(
    normalize(value)
      .match(/[가-힣a-z0-9]{2,}/g)
      ?.filter((token) => !TOKEN_STOPWORDS.has(token))
      .slice(0, limit) ?? [],
  );
}

function overlapCount<T>(a: Set<T>, b: Set<T>): number {
  let count = 0;
  for (const item of a) {
    if (b.has(item)) count += 1;
  }
  return count;
}

function maskLinkedMarkdown(value: string): string {
  const chars = value.split('');
  const mask = (regex: RegExp) => {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(value)) !== null) {
      for (let i = match.index; i < match.index + match[0].length; i += 1) chars[i] = ' ';
    }
  };

  mask(/```[\s\S]*?```/g);
  mask(/`[^`\n]+`/g);
  mask(/\[\[[^\]]+?]]/g);
  mask(/!\[[^\]]*]\([^)]+\)/g);
  mask(/\[[^\]]+]\([^)]+\)/g);
  return chars.join('');
}

function indexOfInsensitive(value: string, search: string): number {
  return value.toLowerCase().indexOf(normalize(search));
}

function makeBacklinkPreviewSnippet(body: string, terms: string[]): string {
  const clean = stripMarkdown(body);
  if (!clean) return '본문 미리보기가 없습니다.';
  const lower = clean.toLowerCase();
  const hit = terms
    .map((term) => term.trim())
    .filter(Boolean)
    .map((term) => lower.indexOf(term.toLowerCase()))
    .filter((idx) => idx >= 0)
    .sort((a, b) => a - b)[0];
  const idx = hit ?? 0;
  return makeSnippet(clean, idx, 0) || clean.slice(0, 90);
}
