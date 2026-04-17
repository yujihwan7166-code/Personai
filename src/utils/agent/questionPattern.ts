export type QuestionPattern =
  | 'quick_answer'
  | 'concept_explain'
  | 'compare_choose'
  | 'cause_diagnose'
  | 'forecast_scenario'
  | 'strategy_design'
  | 'procedure_execute'
  | 'review_feedback'
  | 'idea_expand'
  | 'rewrite_compose';

export type QuestionPatternAuxTag = 'latest' | 'search' | 'file' | 'code' | 'forecast';

export interface QuestionPatternContext {
  pattern: QuestionPattern;
  auxTags: QuestionPatternAuxTag[];
  subject: string;
  compareTargets: string[];
  cleanedMessage: string;
  reasons: string[];
}

const COMPARE_KEYWORDS = ['비교', '차이', 'vs', 'versus', '뭐가 더', '무엇이 더', '장단점', '중에서 뭐'];
const CONCEPT_KEYWORDS = ['뭐야', '무엇', '뜻', '의미', '원리', '설명', '개념', '쉽게 설명'];
const CAUSE_KEYWORDS = ['왜', '원인', '문제', '리스크', '이유', '악화', '진단', '영향'];
const FORECAST_KEYWORDS = ['전망', '예측', '향후', '앞으로', '추세', '유가', '금리', '환율', '시나리오', '가능성'];
const STRATEGY_KEYWORDS = ['전략', '방향', '포지셔닝', '로드맵', '계획', '우선순위', '전술'];
const PROCEDURE_KEYWORDS = ['어떻게', '단계', '순서', '방법', '가이드', '실행', '세팅', '설정', '절차', '설치'];
const REVIEW_KEYWORDS = ['평가', '검토', '피드백', '어때', '어떤지', '리뷰', '진단해줘', '봐줘'];
const IDEA_KEYWORDS = ['아이디어', '브레인스토밍', '네이밍', '컨셉', '발상', '기획안'];
const REWRITE_KEYWORDS = ['요약', '정리', '재작성', '다듬', '번역', '초안', '문안', '문구 작성', '작성해줘'];
const LATEST_KEYWORDS = ['최신', '최근', '오늘', '현재', '요즘', '방금'];
const SEARCH_KEYWORDS = ['시장', '데이터', '수치', '근거', '검색', '뉴스', '자료', '통계', '트렌드', '리포트'];
const CODE_KEYWORDS = ['코드', '버그', '에러', '함수', '리팩터링', 'typescript', 'javascript', 'react', 'api', 'sql', 'python', 'ts', 'tsx'];

const PATTERN_PRIORITY: QuestionPattern[] = [
  'rewrite_compose',
  'idea_expand',
  'compare_choose',
  'review_feedback',
  'forecast_scenario',
  'strategy_design',
  'procedure_execute',
  'cause_diagnose',
  'concept_explain',
  'quick_answer',
];

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function countMatches(text: string, keywords: string[]) {
  return keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
}

function normalizeMessage(message: string) {
  return message
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSubject(text: string) {
  const cleaned = text
    .replace(/[?!.]/g, ' ')
    .replace(/(설명해줘|알려줘|정리해줘|요약해줘|비교해줘|평가해줘|검토해줘|피드백해줘|전략 짜줘|초안 써줘|초안 작성해줘|번역해줘|재작성해줘|봐줘)/g, ' ')
    .replace(/(뭐야|무엇이야|무엇인가요|어때|어떤지|방법|순서|단계별|가이드|전망|예측|원인|차이|비교|전략|리뷰)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return '';
  }

  return cleaned.length > 28 ? `${cleaned.slice(0, 28).trim()}...` : cleaned;
}

function extractCompareTargets(message: string) {
  const normalized = normalizeMessage(message);
  const vsMatch = normalized.match(/^(.+?)\s+(?:vs\.?|versus)\s+(.+)$/i);
  if (vsMatch) {
    return [cleanSubject(vsMatch[1]), cleanSubject(vsMatch[2])].filter(Boolean).slice(0, 2);
  }

  const pairMatch = normalized.match(/^(.+?)\s*(?:와|과|랑|하고)\s*(.+?)\s*(?:비교|차이|장단점|뭐가 더|무엇이 더|중에서|중에)/);
  if (pairMatch) {
    return [cleanSubject(pairMatch[1]), cleanSubject(pairMatch[2])].filter(Boolean).slice(0, 2);
  }

  return [];
}

function extractSubject(message: string, compareTargets: string[]) {
  if (compareTargets.length >= 2) {
    return `${compareTargets[0]}와 ${compareTargets[1]}`;
  }

  const normalized = normalizeMessage(message);
  const stripped = cleanSubject(normalized);
  if (stripped) {
    return stripped;
  }

  return normalized.length > 24 ? `${normalized.slice(0, 24).trim()}...` : normalized;
}

function scorePatterns(normalized: string, compareTargets: string[], options?: { hasFiles?: boolean }) {
  const scores: Record<QuestionPattern, number> = {
    quick_answer: normalized.length <= 18 ? 2 : 0,
    concept_explain: countMatches(normalized, CONCEPT_KEYWORDS) * 4,
    compare_choose: compareTargets.length >= 2 ? 10 : countMatches(normalized, COMPARE_KEYWORDS) * 4,
    cause_diagnose: countMatches(normalized, CAUSE_KEYWORDS) * 4,
    forecast_scenario: countMatches(normalized, FORECAST_KEYWORDS) * 4,
    strategy_design: countMatches(normalized, STRATEGY_KEYWORDS) * 4,
    procedure_execute: countMatches(normalized, PROCEDURE_KEYWORDS) * 4,
    review_feedback: countMatches(normalized, REVIEW_KEYWORDS) * 4,
    idea_expand: countMatches(normalized, IDEA_KEYWORDS) * 5,
    rewrite_compose: countMatches(normalized, REWRITE_KEYWORDS) * 5,
  };

  const reasons: string[] = [];

  if (includesAny(normalized, LATEST_KEYWORDS)) {
    scores.forecast_scenario += 2;
    reasons.push('latest');
  }

  if (includesAny(normalized, SEARCH_KEYWORDS)) {
    scores.forecast_scenario += 2;
    scores.cause_diagnose += 1;
    scores.review_feedback += 1;
    reasons.push('search');
  }

  if (includesAny(normalized, CODE_KEYWORDS)) {
    scores.review_feedback += 3;
    scores.procedure_execute += 2;
    reasons.push('code');
  }

  if (options?.hasFiles) {
    scores.review_feedback += 3;
    scores.rewrite_compose += 2;
    reasons.push('file');
  }

  if (normalized.includes('왜')) {
    scores.cause_diagnose += 3;
  }

  if (normalized.includes('어떻게')) {
    scores.procedure_execute += 2;
    scores.strategy_design += 1;
  }

  if (normalized.includes('추천')) {
    scores.compare_choose += 2;
    scores.strategy_design += 1;
  }

  if (normalized.includes('요약') || normalized.includes('정리')) {
    scores.rewrite_compose += 3;
  }

  if (normalized.length >= 24) {
    scores.concept_explain += 1;
    scores.cause_diagnose += 1;
  }

  if (normalized.length <= 14) {
    scores.quick_answer += 1;
  }

  if (compareTargets.length >= 2) {
    reasons.push('compare_targets');
  }

  return { scores, reasons };
}

function pickPattern(scores: Record<QuestionPattern, number>) {
  return PATTERN_PRIORITY.reduce((best, pattern) => (
    scores[pattern] > scores[best] ? pattern : best
  ), 'quick_answer' as QuestionPattern);
}

export function classifyQuestionPattern(
  message: string,
  options?: { hasFiles?: boolean },
): QuestionPatternContext {
  const cleanedMessage = normalizeMessage(message);
  const normalized = cleanedMessage.toLowerCase();
  const compareTargets = extractCompareTargets(cleanedMessage);
  const { scores, reasons } = scorePatterns(normalized, compareTargets, options);

  let pattern = pickPattern(scores);

  if (pattern === 'quick_answer' && (includesAny(normalized, CONCEPT_KEYWORDS) || cleanedMessage.length >= 22)) {
    pattern = 'concept_explain';
    reasons.push('long_or_explanatory');
  }

  if (pattern === 'strategy_design' && includesAny(normalized, ['단계', '순서', '설치', '설정', '구현'])) {
    pattern = 'procedure_execute';
    reasons.push('procedure_bias');
  }

  if (pattern === 'procedure_execute' && includesAny(normalized, ['전략', '방향', '포지셔닝', '로드맵'])) {
    pattern = 'strategy_design';
    reasons.push('strategy_bias');
  }

  if (pattern === 'cause_diagnose' && includesAny(normalized, ['평가', '검토', '리뷰']) && (options?.hasFiles || includesAny(normalized, CODE_KEYWORDS))) {
    pattern = 'review_feedback';
    reasons.push('review_bias');
  }

  const auxTags = new Set<QuestionPatternAuxTag>();
  if (options?.hasFiles) {
    auxTags.add('file');
  }
  if (includesAny(normalized, LATEST_KEYWORDS)) {
    auxTags.add('latest');
  }
  if (includesAny(normalized, SEARCH_KEYWORDS) || pattern === 'forecast_scenario') {
    auxTags.add('search');
  }
  if (includesAny(normalized, CODE_KEYWORDS) || cleanedMessage.includes('```')) {
    auxTags.add('code');
  }
  if (pattern === 'forecast_scenario') {
    auxTags.add('forecast');
  }

  return {
    pattern,
    auxTags: Array.from(auxTags),
    subject: extractSubject(cleanedMessage, compareTargets),
    compareTargets,
    cleanedMessage,
    reasons,
  };
}
