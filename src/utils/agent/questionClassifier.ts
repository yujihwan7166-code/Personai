import { inferAgentIntent } from './agentDisplay';
import type { ClassificationResult } from './types';

const GREETING_PATTERNS = [
  /^(안녕|하이|헬로|hi|hello|hey|반가워|좋은 아침|좋은 오후|좋은 저녁)/i,
  /^(고마워|감사|thanks?|thx|오케이|okay|ok)\b/i,
  /^(ㅎㅎ+|ㅋㅋ+|...|굿|오|음|응)$/i,
];

const FOLLOW_UP_PATTERNS = [
  /^(더 알려|더 설명|자세히|자세하게|계속|이어서|그럼|그런데)/,
  /^(요약|정리|짧게|간단히|다시|번역)/,
];

const STRONG_DEEP_KEYWORDS = [
  '전망', '예측', '전략', '로드맵', '비교', '차이', '장단점', '찬반', '왜', '원인',
  '영향', '분석', '구조', '리스크', '미래', '추세', '추천', '어떻게', '구현',
];

const SEARCH_KEYWORDS = [
  '최신', '최근', '오늘', '지금', '현재', '뉴스', '시장', '가격', '주가', '유가',
  '환율', '금리', '데이터', '통계', '수치', '근거',
];

const COMPARISON_KEYWORDS = ['비교', '차이', 'vs', 'versus', '뭐가', '어느 쪽', '더 낫'];
const STRATEGY_KEYWORDS = ['전략', '계획', '로드맵', '방안', '플랜', '단계', '실행'];
const PROS_CONS_KEYWORDS = ['찬반', '장단점', '장점', '단점', 'pros', 'cons'];
const CAUSAL_KEYWORDS = ['왜', '원인', '영향', '이유', '배경', '구조', '전망', '추세'];
const DEEP_HINTS = ['깊게', '깊이', '상세', '심층', '구체적', '자세히', '꼼꼼하게'];
const DECISION_CONTEXT_KEYWORDS = ['어떤 상황', '언제', '추천', '선택', '고르면', '써야', '적합'];
const CONJUNCTION_KEYWORDS = ['그리고', '또한', '추가로', '반면', '한편', '동시에'];

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function countMatches(text: string, keywords: string[]) {
  return keywords.filter((keyword) => text.includes(keyword)).length;
}

export function classifyQuestion(message: string): ClassificationResult {
  const trimmed = message.trim();
  const normalized = trimmed.toLowerCase();
  const reasons: string[] = [];

  if (!trimmed) {
    return { mode: 'simple', score: 0, reasons: ['empty'], intent: inferAgentIntent(trimmed), needsSearch: false };
  }

  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { mode: 'simple', score: 0, reasons: ['greeting'], intent: inferAgentIntent(trimmed), needsSearch: false };
    }
  }

  for (const pattern of FOLLOW_UP_PATTERNS) {
    if (pattern.test(trimmed) && trimmed.length <= 20) {
      return { mode: 'simple', score: 1, reasons: ['short_followup'], intent: inferAgentIntent(trimmed), needsSearch: false };
    }
  }

  const hasStrongDeepKeyword = includesAny(normalized, STRONG_DEEP_KEYWORDS);
  const needsSearch = includesAny(normalized, SEARCH_KEYWORDS);

  let score = 0;

  if (includesAny(normalized, COMPARISON_KEYWORDS)) {
    score += 3;
    reasons.push('comparison');
  }

  if (includesAny(normalized, STRATEGY_KEYWORDS)) {
    score += 3;
    reasons.push('strategy');
  }

  if (includesAny(normalized, PROS_CONS_KEYWORDS)) {
    score += 2;
    reasons.push('pros_cons');
  }

  if (includesAny(normalized, CAUSAL_KEYWORDS)) {
    score += 2;
    reasons.push('causal');
  }

  if (includesAny(normalized, DEEP_HINTS)) {
    score += 2;
    reasons.push('deep_hint');
  }

  if (includesAny(normalized, DECISION_CONTEXT_KEYWORDS)) {
    score += 2;
    reasons.push('decision_context');
  }

  if (needsSearch) {
    score += 2;
    reasons.push('search');
  }

  if (countMatches(normalized, CONJUNCTION_KEYWORDS) >= 2) {
    score += 2;
    reasons.push('multi_clause');
  }

  if (trimmed.includes('```')) {
    score += 2;
    reasons.push('code_block');
  }

  if (trimmed.length >= 25) {
    score += 1;
    reasons.push('length_25');
  }

  if (trimmed.length >= 40) {
    score += 1;
    reasons.push('length_40');
  }

  if (trimmed.length >= 100) {
    score += 1;
    reasons.push('length_100');
  }

  if (/\d{2,}/.test(trimmed)) {
    score += 1;
    reasons.push('numbers');
  }

  if (/[0-9]+\s*(개월|년|일|주|%|원|달러|명|개)/.test(trimmed)) {
    score += 1;
    reasons.push('time_or_metric');
  }

  const questionMarkCount = (trimmed.match(/\?/g) || []).length;
  if (questionMarkCount >= 2) {
    score += 1;
    reasons.push('multi_question_marks');
  }

  if (hasStrongDeepKeyword && trimmed.length <= 12) {
    score += 4;
    reasons.push('short_but_complex');
  }

  let mode: ClassificationResult['mode'] = 'simple';
  if (score >= 6) {
    mode = 'deep';
  } else if (score >= 3) {
    mode = 'standard';
  }

  return {
    mode,
    score,
    reasons,
    intent: inferAgentIntent(trimmed),
    needsSearch,
  };
}
