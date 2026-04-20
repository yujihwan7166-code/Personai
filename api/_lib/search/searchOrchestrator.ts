import type { SearchContext } from './types.js';
import { shouldSearch } from './patternFilter.js';
import { classifySearchNeed } from './searchClassifier.js';
import { extractSearchQuery } from './queryExtractor.js';
import { searchSerper } from './serperClient.js';
import { getCached, setCache, cleanupCache } from './searchCache.js';

/**
 * 3단계 웹 검색 필터 메인 함수
 *
 * 1단계: 패턴 매칭 → 즉시 판별
 * 2단계: LLM 분류기 → UNCERTAIN만 처리
 * 3단계: 캐시 확인 → Serper 검색 → 결과 리턴
 *
 * @returns SearchContext (검색 결과) 또는 null (검색 불필요/실패)
 */
export async function getSearchContext(
  userMessage: string,
  options: { force?: boolean } = {},
): Promise<SearchContext | null> {
  try {
    const force = options.force === true;
    // 주기적 캐시 정리
    cleanupCache();

    // ── 1단계: 패턴 매칭 ──
    const decision = force ? 'SEARCH_REQUIRED' : shouldSearch(userMessage);

    if (decision === 'SEARCH_NOT_NEEDED') {
      return null;
    }

    let needsSearch = decision === 'SEARCH_REQUIRED';

    // ── 2단계: LLM 분류기 (UNCERTAIN만) ──
    if (!needsSearch) {
      needsSearch = await classifySearchNeed(userMessage);
      if (!needsSearch) return null;
    }

    // ── 3단계: 검색 쿼리 추출 → 캐시 확인 → Serper 호출 ──
    const searchQuery = await extractSearchQuery(userMessage);

    // 캐시 확인
    const cached = getCached(searchQuery);
    if (cached) {
      return {
        query: cached.query,
        results: cached.results,
        knowledgeGraph: cached.knowledgeGraph,
        cachedAt: cached.cachedAt,
      };
    }

    // Serper 검색
    const { results, knowledgeGraph } = await searchSerper(searchQuery);

    if (results.length === 0) return null;

    // 캐시 저장
    setCache(searchQuery, results, knowledgeGraph);

    return {
      query: searchQuery,
      results,
      knowledgeGraph,
    };
  } catch {
    // 검색 실패해도 AI 응답은 나가야 함
    return null;
  }
}

/**
 * 검색 결과 → 시스템 프롬프트 주입 텍스트 생성
 */
export function formatSearchContext(context: SearchContext): string {
  const lines: string[] = [
    '[웹 검색 결과 — 오늘 시점 기준 최신 정보]',
    '중요: 아래 검색 결과는 실제 현재 상황을 반영한다. 너의 학습 데이터 cutoff 시점보다 이 정보를 우선 신뢰해라.',
    '- "최근/올해/현재/지금" 같은 시점 표현은 반드시 이 검색 결과 기준으로 해석',
    '- 수치·사건·인물·날짜는 검색 결과가 학습 데이터와 다르면 검색 결과를 따른다',
    '- 검색 결과를 그대로 복사하지 말고, 네 페르소나/전문성에 맞게 소화해 답변',
    '',
  ];

  if (context.knowledgeGraph?.description) {
    lines.push(`핵심 정보: ${context.knowledgeGraph.title || ''} - ${context.knowledgeGraph.description}`);
    lines.push('');
  }

  lines.push('검색 결과:');
  context.results.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.title} - ${r.snippet}`);
  });

  return lines.join('\n');
}
