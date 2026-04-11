// ══════════════════════════════════════════
// Question Complexity Classifier
// 비용 0 — 프론트엔드 동기 실행
// ══════════════════════════════════════════

import type { ClassificationResult } from './types';

/** 즉시 simple 판정 패턴 */
const GREETING_PATTERNS = [
  /^(안녕|하이|헬로|hi|hello|hey|ㅎㅇ|ㅎㅎ|ㅋㅋ|ㅎ|반갑|잘\s?지내|좋은\s?아침|좋은\s?하루)/i,
  /^(고마워|감사|땡큐|thank|thx|ㄳ|ㅇㅋ|ㅇㅇ|넵|네|응|ㅎ|ok|okay|ㅇㅇㅇ)/i,
  /^(ㅋ{2,}|ㅎ{2,}|ㅠ{2,}|ㅜ{2,}|\.{1,3}|ㄱㄱ|ㄴㄴ|ㅇㅋ|ㄷㄷ)/,
];

/** 후속 질문 패턴 (이전 답변 기반 → 에이전트 불필요) */
const FOLLOWUP_PATTERNS = [
  /^(더\s?(알려|설명|자세히)|자세히|예시|예를\s?들|계속|이어서|그래서|그러면|근데)/,
  /^(요약|정리|한줄로|짧게|간단히|다시\s?말|번역)/,
];

/** 분석/비교 명시 키워드 (+3점) */
const ANALYSIS_KEYWORDS = [
  '분석해', '분석좀', '분석 좀', '비교해', '비교좀', '비교 좀',
  '평가해', '검토해', '리뷰해', '진단해', '감사해줘',
  '분석하고', '비교하고', '평가하고',
];

/** 전략/계획 키워드 (+3점) */
const STRATEGY_KEYWORDS = [
  '전략', '계획 세워', '로드맵', '방안', '대책',
  '계획을', '플랜', '설계해', '기획해',
];

/** 다각도 키워드 (+2점) */
const MULTI_ANGLE_KEYWORDS = [
  '장단점', '찬반', '여러 관점', '다각도', '종합적',
  '장점과 단점', '긍정과 부정', '양면',
];

/** 인과/추론 키워드 (+2점) */
const CAUSAL_KEYWORDS = [
  '왜 그런', '원인', '영향', '전망', '예측', '어떻게 될',
  '앞으로', '미래', '추세', '트렌드', '향후',
];

/** 복수 주제 연결 패턴 (+2점, 2개 이상 출현 시) */
const CONJUNCTION_KEYWORDS = [
  '그리고', '또한', '추가로', '더불어', '아울러', '뿐만 아니라',
];

/**
 * 질문 복잡도를 판별한다.
 * API 호출 없이 키워드 + 가중치 스코어링으로 동기 실행.
 */
export function classifyQuestion(message: string): ClassificationResult {
  const trimmed = message.trim();
  const reasons: string[] = [];

  // ── 즉시 simple 판정 ──
  if (trimmed.length <= 5) {
    return { mode: 'simple', score: 0, reasons: ['5자 이하'] };
  }

  for (const pat of GREETING_PATTERNS) {
    if (pat.test(trimmed)) {
      return { mode: 'simple', score: 0, reasons: ['인사/잡담'] };
    }
  }

  for (const pat of FOLLOWUP_PATTERNS) {
    if (pat.test(trimmed)) {
      return { mode: 'simple', score: 0, reasons: ['후속 질문'] };
    }
  }

  // ── 가중치 점수 산출 ──
  let score = 0;
  const lower = trimmed.toLowerCase();

  // +3: 분석/비교 키워드
  if (ANALYSIS_KEYWORDS.some(kw => lower.includes(kw))) {
    score += 3;
    reasons.push('분석/비교 키워드');
  }

  // +3: 전략/계획 키워드
  if (STRATEGY_KEYWORDS.some(kw => lower.includes(kw))) {
    score += 3;
    reasons.push('전략/계획 키워드');
  }

  // +2: 다각도 키워드
  if (MULTI_ANGLE_KEYWORDS.some(kw => lower.includes(kw))) {
    score += 2;
    reasons.push('다각도 키워드');
  }

  // +2: 인과/추론 키워드
  if (CAUSAL_KEYWORDS.some(kw => lower.includes(kw))) {
    score += 2;
    reasons.push('인과/추론 키워드');
  }

  // +2: 복수 주제 연결 (2개 이상)
  const conjCount = CONJUNCTION_KEYWORDS.filter(kw => lower.includes(kw)).length;
  if (conjCount >= 2) {
    score += 2;
    reasons.push('복수 주제 연결');
  }

  // +2: 코드 블록 포함
  if (trimmed.includes('```')) {
    score += 2;
    reasons.push('코드 블록 포함');
  }

  // +1: 80자 이상
  if (trimmed.length >= 80) {
    score += 1;
    reasons.push('80자 이상');
  }

  // +1: 150자 이상 (중복 가산)
  if (trimmed.length >= 150) {
    score += 1;
    reasons.push('150자 이상');
  }

  // +1: 물음표 2개 이상
  const qCount = (trimmed.match(/\?/g) || []).length;
  if (qCount >= 2) {
    score += 1;
    reasons.push('물음표 2개 이상');
  }

  // +1: 숫자/데이터 포함
  if (/\d{2,}/.test(trimmed)) {
    score += 1;
    reasons.push('숫자/데이터 포함');
  }

  // ── 임계값: 4점 이상이면 에이전트 모드 ──
  const THRESHOLD = 4;
  return {
    mode: score >= THRESHOLD ? 'agent' : 'simple',
    score,
    reasons,
  };
}
