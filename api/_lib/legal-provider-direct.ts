import { fetchWithTimeout, parseXmlResponse, sanitizeApiResponse } from './api-enrichment.js';
import type { ApiSourceCitation } from './api-enrichment.js';
import type { LegalResearchInput, LegalResearchProvider, LegalResearchResult, LegalSearchType } from './legal-provider-types.js';

interface ParsedArticleHint {
  articleNumber: string;
  branchNumber?: string;
  label: string;
  joCode: string;
}

interface LawSearchCandidate {
  id?: string;
  mst?: string;
  name: string;
  detailUrl?: string;
  summary?: string;
}

interface PrecedentSearchCandidate {
  id?: string;
  name: string;
  caseNumber?: string;
  detailUrl?: string;
  summary?: string;
}

interface LawArticleUnit {
  articleNumber: string;
  branchNumber?: string;
  label: string;
  title?: string;
  content: string;
}

const LAW_SOURCE = '국가법령정보센터';
const MAX_SEARCH_KEYWORDS = 3;
const MAX_STATUTE_DETAILS = 2;
const MAX_PRECEDENT_DETAILS = 2;

const LAW_SEARCH_FIELD_KEYS = {
  lawId: ['법령ID', '법령id'],
  lawSerial: ['법령일련번호'],
  lawName: ['법령명한글', '법령명_한글'],
  lawDetailLink: ['법령상세링크'],
  effectiveDate: ['시행일자'],
  promulgationDate: ['공포일자'],
} as const;

const PRECEDENT_SEARCH_FIELD_KEYS = {
  precedentId: ['판례일련번호'],
  caseName: ['사건명'],
  caseNumber: ['사건번호'],
  detailLink: ['판례상세링크'],
  summary: ['판례내용'],
  decisionDate: ['선고일자'],
} as const;

const LAW_DETAIL_FIELD_KEYS = {
  lawName: ['법령명한글', '법령명_한글'],
  ministry: ['소관부처', '소관부처명'],
  effectiveDate: ['시행일자'],
  revisionReason: ['제개정이유내용'],
  articleNumber: ['조문번호'],
  articleBranch: ['조문가지번호'],
  articleTitle: ['조문제목'],
  articleBody: ['조문내용', '항내용', '호내용', '목내용'],
} as const;

const PRECEDENT_DETAIL_FIELD_KEYS = {
  caseName: ['사건명'],
  caseNumber: ['사건번호'],
  decisionDate: ['선고일자'],
  issue: ['판시사항'],
  holding: ['판결요지'],
  referenceLaw: ['참조조문'],
  referenceCase: ['참조판례'],
  body: ['판례내용'],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null;
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

function toCleanString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined;
  if (!text) return undefined;
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function findDirectString(record: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    const text = toCleanString(value);
    if (text) return text;
  }
  return undefined;
}

function findFirstString(node: unknown, keys: readonly string[]): string | undefined {
  if (Array.isArray(node)) {
    for (const item of node) {
      const text = findFirstString(item, keys);
      if (text) return text;
    }
    return undefined;
  }

  if (!isRecord(node)) {
    return undefined;
  }

  const direct = findDirectString(node, keys);
  if (direct) return direct;

  for (const value of Object.values(node)) {
    const text = findFirstString(value, keys);
    if (text) return text;
  }

  return undefined;
}

function collectNodesByKey(node: unknown, key: string): unknown[] {
  if (Array.isArray(node)) {
    return node.flatMap((item) => collectNodesByKey(item, key));
  }

  if (!isRecord(node)) {
    return [];
  }

  const collected = key in node ? asArray(node[key]) : [];
  for (const value of Object.values(node)) {
    collected.push(...collectNodesByKey(value, key));
  }
  return collected;
}

function collectStringsByKeys(node: unknown, keys: readonly string[]): string[] {
  const results = new Set<string>();

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (!isRecord(value)) return;

    const direct = findDirectString(value, keys);
    if (direct) results.add(direct);

    for (const child of Object.values(value)) {
      visit(child);
    }
  };

  visit(node);
  return [...results];
}

function normalizeArticlePart(value: string | number | undefined | null): string | undefined {
  if (value == null) return undefined;
  const digits = String(value).replace(/[^\d]/g, '');
  if (!digits) return undefined;
  return String(Number(digits));
}

export function buildLawArticleLabel(articleNumber: string | number, branchNumber?: string | number): string {
  const normalizedArticle = normalizeArticlePart(articleNumber) ?? String(articleNumber);
  const normalizedBranch = normalizeArticlePart(branchNumber);
  return normalizedBranch ? `제${normalizedArticle}조의${normalizedBranch}` : `제${normalizedArticle}조`;
}

export function parseArticleHint(value: string | number | undefined | null): ParsedArticleHint | undefined {
  if (value == null) return undefined;
  const text = String(value);
  const match = text.match(/(\d+)\s*조(?:\s*의\s*(\d+))?/);
  if (!match) return undefined;

  const articleNumber = normalizeArticlePart(match[1]);
  if (!articleNumber) return undefined;
  const branchNumber = normalizeArticlePart(match[2]);
  const joCode = `${articleNumber.padStart(4, '0')}${(branchNumber ?? '0').padStart(2, '0')}`;

  return {
    articleNumber,
    branchNumber,
    label: buildLawArticleLabel(articleNumber, branchNumber),
    joCode,
  };
}

function deriveArticleHint(question: string | undefined, explicitHint: string | number | undefined, keywords: string[]): ParsedArticleHint | undefined {
  return (
    parseArticleHint(explicitHint) ??
    parseArticleHint(question) ??
    keywords.map((keyword) => parseArticleHint(keyword)).find(Boolean)
  );
}

function absoluteLawUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `https://law.go.kr${path}`;
}

function parseLawSearchCandidates(parsed: Record<string, unknown> | null, fallbackKeyword: string): LawSearchCandidate[] {
  const items = asArray((parsed as Record<string, unknown> | null)?.LawSearch && (parsed as Record<string, unknown>).LawSearch)
    .flatMap((root) => (isRecord(root) ? asArray(root.law) : []));

  return items
    .map((item): LawSearchCandidate | null => {
      if (!isRecord(item)) return null;
      const name = findDirectString(item, LAW_SEARCH_FIELD_KEYS.lawName) ?? fallbackKeyword;
      const candidate: LawSearchCandidate = {
        id: findDirectString(item, LAW_SEARCH_FIELD_KEYS.lawId),
        mst: findDirectString(item, LAW_SEARCH_FIELD_KEYS.lawSerial),
        name,
        detailUrl: absoluteLawUrl(findDirectString(item, LAW_SEARCH_FIELD_KEYS.lawDetailLink)),
        summary: sanitizeApiResponse(
          [findDirectString(item, LAW_SEARCH_FIELD_KEYS.effectiveDate), findDirectString(item, LAW_SEARCH_FIELD_KEYS.promulgationDate)]
            .filter((part): part is string => Boolean(part))
            .join(' · '),
          400
        ),
      };
      return candidate;
    })
    .filter(isPresent);
}

function parsePrecedentSearchCandidates(parsed: Record<string, unknown> | null, fallbackKeyword: string): PrecedentSearchCandidate[] {
  const items = asArray((parsed as Record<string, unknown> | null)?.PrecSearch && (parsed as Record<string, unknown>).PrecSearch)
    .flatMap((root) => (isRecord(root) ? asArray(root.prec) : []));

  return items
    .map((item): PrecedentSearchCandidate | null => {
      if (!isRecord(item)) return null;
      const name = findDirectString(item, PRECEDENT_SEARCH_FIELD_KEYS.caseName) ?? fallbackKeyword;
      const caseNumber = findDirectString(item, PRECEDENT_SEARCH_FIELD_KEYS.caseNumber);
      const summaryParts = [
        findDirectString(item, PRECEDENT_SEARCH_FIELD_KEYS.decisionDate),
        findDirectString(item, PRECEDENT_SEARCH_FIELD_KEYS.summary),
      ].filter((part): part is string => Boolean(part));

      const candidate: PrecedentSearchCandidate = {
        id: findDirectString(item, PRECEDENT_SEARCH_FIELD_KEYS.precedentId),
        name,
        caseNumber,
        detailUrl: absoluteLawUrl(findDirectString(item, PRECEDENT_SEARCH_FIELD_KEYS.detailLink)),
        summary: sanitizeApiResponse(summaryParts.join(' · '), 600),
      };
      return candidate;
    })
    .filter(isPresent);
}

function extractLawArticles(detail: Record<string, unknown>, articleHint?: ParsedArticleHint): LawArticleUnit[] {
  const nodes = collectNodesByKey(detail, '조문단위');

  const units = nodes
    .map((node): LawArticleUnit | null => {
      if (!isRecord(node)) return null;
      const articleNumber = normalizeArticlePart(findFirstString(node, LAW_DETAIL_FIELD_KEYS.articleNumber));
      if (!articleNumber) return null;

      const branchNumber = normalizeArticlePart(findFirstString(node, LAW_DETAIL_FIELD_KEYS.articleBranch));
      const label = buildLawArticleLabel(articleNumber, branchNumber);
      const title = findFirstString(node, LAW_DETAIL_FIELD_KEYS.articleTitle);
      const content = sanitizeApiResponse(collectStringsByKeys(node, LAW_DETAIL_FIELD_KEYS.articleBody).join(' '), 1800);

      if (!content) return null;

      const unit: LawArticleUnit = {
        articleNumber,
        branchNumber,
        label,
        title,
        content,
      };
      return unit;
    })
    .filter(isPresent);

  if (!articleHint) {
    return units.slice(0, 2);
  }

  const exact = units.find(
    (unit) =>
      unit.articleNumber === articleHint.articleNumber &&
      (articleHint.branchNumber ? unit.branchNumber === articleHint.branchNumber : true)
  );
  if (exact) return [exact];

  const sameArticle = units.find((unit) => unit.articleNumber === articleHint.articleNumber);
  return sameArticle ? [sameArticle] : units.slice(0, 2);
}

async function fetchLawDetail(oc: string, candidate: LawSearchCandidate, articleHint?: ParsedArticleHint): Promise<Record<string, unknown> | null> {
  const params = new URLSearchParams({ OC: oc, target: 'law', type: 'XML' });

  if (candidate.id) {
    params.set('ID', candidate.id);
  } else if (candidate.mst) {
    params.set('MST', candidate.mst);
  } else {
    return null;
  }

  if (articleHint) {
    params.set('JO', articleHint.joCode);
  }

  const response = await fetchWithTimeout(`https://www.law.go.kr/DRF/lawService.do?${params.toString()}`, 10000);
  if (!response.ok) return null;

  return parseXmlResponse(await response.text());
}

async function fetchPrecedentDetail(oc: string, candidate: PrecedentSearchCandidate): Promise<Record<string, unknown> | null> {
  if (!candidate.id) return null;

  const params = new URLSearchParams({ OC: oc, target: 'prec', type: 'XML', ID: candidate.id });
  const response = await fetchWithTimeout(`https://www.law.go.kr/DRF/lawService.do?${params.toString()}`, 10000);
  if (!response.ok) return null;

  return parseXmlResponse(await response.text());
}

function buildLawCitation(candidate: LawSearchCandidate, detail: Record<string, unknown> | null, articleHint?: ParsedArticleHint): ApiSourceCitation {
  const lawName = detail ? findFirstString(detail, LAW_DETAIL_FIELD_KEYS.lawName) ?? candidate.name : candidate.name;
  const ministry = detail ? findFirstString(detail, LAW_DETAIL_FIELD_KEYS.ministry) : undefined;
  const effectiveDate = detail ? findFirstString(detail, LAW_DETAIL_FIELD_KEYS.effectiveDate) : undefined;
  const selectedArticles = detail ? extractLawArticles(detail, articleHint) : [];
  const selectedArticle = selectedArticles[0];
  const revisionReason = detail ? findFirstString(detail, LAW_DETAIL_FIELD_KEYS.revisionReason) : undefined;

  const segments = [
    selectedArticle
      ? `${selectedArticle.label}${selectedArticle.title ? ` (${selectedArticle.title})` : ''}: ${selectedArticle.content}`
      : candidate.summary,
    revisionReason ? `제개정 이유: ${revisionReason}` : undefined,
  ].filter((part): part is string => Boolean(part));

  return {
    id: `law-${candidate.id ?? candidate.mst ?? lawName}`,
    type: 'law_article',
    label: selectedArticle ? `${lawName} ${selectedArticle.label}` : lawName,
    source: LAW_SOURCE,
    sourceType: 'statute',
    url: candidate.detailUrl,
    rawData: segments.length > 0 ? sanitizeApiResponse(segments.join('\n'), 2200) : undefined,
    lawName,
    articleNumber: selectedArticle?.label,
    ministry,
    effectiveDate,
    fetchedAt: new Date().toISOString(),
  };
}

function buildPrecedentCitation(candidate: PrecedentSearchCandidate, detail: Record<string, unknown> | null): ApiSourceCitation {
  const caseName = detail ? findFirstString(detail, PRECEDENT_DETAIL_FIELD_KEYS.caseName) ?? candidate.name : candidate.name;
  const caseNumber = detail ? findFirstString(detail, PRECEDENT_DETAIL_FIELD_KEYS.caseNumber) ?? candidate.caseNumber : candidate.caseNumber;
  const decisionDate = detail ? findFirstString(detail, PRECEDENT_DETAIL_FIELD_KEYS.decisionDate) : undefined;

  const segments = [
    detail ? findFirstString(detail, PRECEDENT_DETAIL_FIELD_KEYS.issue) : undefined,
    detail ? findFirstString(detail, PRECEDENT_DETAIL_FIELD_KEYS.holding) : undefined,
    detail ? findFirstString(detail, PRECEDENT_DETAIL_FIELD_KEYS.referenceLaw) : undefined,
    detail ? findFirstString(detail, PRECEDENT_DETAIL_FIELD_KEYS.referenceCase) : undefined,
    detail ? findFirstString(detail, PRECEDENT_DETAIL_FIELD_KEYS.body) : candidate.summary,
  ]
    .filter((part): part is string => Boolean(part))
    .map((part, index) => {
      if (index === 0 && detail) return `판시사항: ${part}`;
      if (index === 1 && detail) return `판결요지: ${part}`;
      if (index === 2 && detail) return `참조조문: ${part}`;
      if (index === 3 && detail) return `참조판례: ${part}`;
      return index >= 4 && detail ? `판례내용: ${part}` : part;
    });

  return {
    id: `prec-${candidate.id ?? caseNumber ?? caseName}`,
    type: 'precedent',
    label: caseNumber ? `${caseName} (${caseNumber})` : caseName,
    source: LAW_SOURCE,
    sourceType: 'precedent',
    url: candidate.detailUrl,
    rawData: segments.length > 0 ? sanitizeApiResponse(segments.join('\n'), 2600) : undefined,
    caseNumber,
    decisionDate,
    fetchedAt: new Date().toISOString(),
  };
}

function dedupeCitations(citations: ApiSourceCitation[]): ApiSourceCitation[] {
  const seen = new Set<string>();

  return citations.filter((citation) => {
    const key = [citation.type, citation.lawName, citation.articleNumber, citation.caseNumber, citation.label].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export class DirectLegalResearchProvider implements LegalResearchProvider {
  readonly name = 'direct' as const;

  constructor(private readonly oc = process.env.LAW_OC || process.env.LAW_API_KEY) {}

  async search(input: LegalResearchInput): Promise<LegalResearchResult> {
    const { keywords, searchType = 'both', limit = 5, question, articleHint } = input;

    if (!this.oc) {
      return {
        provider: this.name,
        citations: [],
        rawContext: '',
        error: 'LAW_OC가 설정되지 않았습니다. 우선 AI 일반 지식 기반으로만 답변합니다.',
      };
    }

    const parsedArticleHint = deriveArticleHint(question, articleHint, keywords);
    const citations: ApiSourceCitation[] = [];

    try {
      for (const keyword of keywords.slice(0, MAX_SEARCH_KEYWORDS)) {
        const query = encodeURIComponent(keyword);

        if (searchType === 'statute' || searchType === 'both') {
          await this.appendStatuteCitations(citations, keyword, query, limit, parsedArticleHint);
        }

        if (searchType === 'precedent' || searchType === 'both') {
          await this.appendPrecedentCitations(citations, keyword, query, limit);
        }
      }
    } catch (error) {
      return {
        provider: this.name,
        citations: [],
        rawContext: '',
        error: `법령 조회에 실패했습니다: ${error instanceof Error ? error.message : 'unknown'}`,
      };
    }

    const unique = dedupeCitations(citations);

    return {
      provider: this.name,
      citations: unique,
      rawContext: unique
        .map((citation) => {
          const metaParts = [citation.lawName, citation.articleNumber, citation.caseNumber, citation.decisionDate]
            .filter((part): part is string => Boolean(part));
          const meta = metaParts.length > 0 ? ` (${metaParts.join(' · ')})` : '';
          return `[${citation.label}]${meta} ${citation.rawData || ''}`.trim();
        })
        .join('\n\n'),
    };
  }

  private async appendStatuteCitations(
    citations: ApiSourceCitation[],
    keyword: string,
    query: string,
    limit: number,
    articleHint?: ParsedArticleHint
  ) {
    try {
      const response = await fetchWithTimeout(
        `https://www.law.go.kr/DRF/lawSearch.do?OC=${encodeURIComponent(this.oc as string)}&target=law&type=XML&query=${query}&display=${limit}`,
        9000
      );
      const parsed = parseXmlResponse(await response.text());
      const candidates = parseLawSearchCandidates(parsed, keyword).slice(0, MAX_STATUTE_DETAILS);

      for (const candidate of candidates) {
        let detail: Record<string, unknown> | null = null;
        try {
          detail = await fetchLawDetail(this.oc as string, candidate, articleHint);
        } catch {
          detail = null;
        }
        citations.push(buildLawCitation(candidate, detail, articleHint));
      }
    } catch {
      // Ignore individual search failure and continue.
    }
  }

  private async appendPrecedentCitations(citations: ApiSourceCitation[], keyword: string, query: string, limit: number) {
    try {
      const response = await fetchWithTimeout(
        `https://www.law.go.kr/DRF/lawSearch.do?OC=${encodeURIComponent(this.oc as string)}&target=prec&type=XML&query=${query}&display=${limit}`,
        9000
      );
      const parsed = parseXmlResponse(await response.text());
      const candidates = parsePrecedentSearchCandidates(parsed, keyword).slice(0, MAX_PRECEDENT_DETAILS);

      for (const candidate of candidates) {
        let detail: Record<string, unknown> | null = null;
        try {
          detail = await fetchPrecedentDetail(this.oc as string, candidate);
        } catch {
          detail = null;
        }
        citations.push(buildPrecedentCitation(candidate, detail));
      }
    } catch {
      // Ignore individual search failure and continue.
    }
  }
}

export function createDirectLegalResearchProvider(oc?: string): LegalResearchProvider {
  return new DirectLegalResearchProvider(oc);
}

export type { ParsedArticleHint, LegalSearchType };
