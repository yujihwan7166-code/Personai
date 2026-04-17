import type { QuestionPattern } from './questionPattern';

export type QuestionPatternVisual =
  | 'pulse'
  | 'concept'
  | 'compare'
  | 'funnel'
  | 'timeline'
  | 'routes'
  | 'stairs'
  | 'review'
  | 'cluster'
  | 'compose';

export interface QuestionPatternMeta {
  label: string;
  visual: QuestionPatternVisual;
  skeleton: string[];
}

export const QUESTION_PATTERN_META: Record<QuestionPattern, QuestionPatternMeta> = {
  quick_answer: {
    label: '즉답 검증형',
    visual: 'pulse',
    skeleton: ['요구 범위 식별', '핵심 근거 선별', '결론 문장 검증'],
  },
  concept_explain: {
    label: '개념 해설형',
    visual: 'concept',
    skeleton: ['개념 범위 설정', '핵심 원리 추출', '설명 구조 재구성'],
  },
  compare_choose: {
    label: '비교 판정형',
    visual: 'compare',
    skeleton: ['평가 기준 정렬', '차이 지점 대조', '조건별 적합도 판정'],
  },
  cause_diagnose: {
    label: '원인 진단형',
    visual: 'funnel',
    skeleton: ['증상 분류', '원인 가설 계층화', '핵심 병목 도출'],
  },
  forecast_scenario: {
    label: '전망 시나리오형',
    visual: 'timeline',
    skeleton: ['핵심 변수 식별', '시나리오 분해', '우세 경로 도출'],
  },
  strategy_design: {
    label: '전략 설계형',
    visual: 'routes',
    skeleton: ['목표 정의', '제약 조건 검토', '전략 옵션 평가', '우선 전략 판정'],
  },
  procedure_execute: {
    label: '실행 절차형',
    visual: 'stairs',
    skeleton: ['시작 조건 확인', '실행 순서 배열', '리스크 지점 점검', '절차 확정'],
  },
  review_feedback: {
    label: '평가 피드백형',
    visual: 'review',
    skeleton: ['평가 기준 설정', '강점 검증', '취약점 진단', '수정 우선순위 정리'],
  },
  idea_expand: {
    label: '아이디어 확장형',
    visual: 'cluster',
    skeleton: ['발상 범위 확장', '후보군 군집화', '상위 후보 선별'],
  },
  rewrite_compose: {
    label: '재구성 작성형',
    visual: 'compose',
    skeleton: ['입력 요구 해석', '구조와 톤 설계', '초안 구성', '문장 밀도 보정'],
  },
};

export function getQuestionPatternMeta(pattern: QuestionPattern) {
  return QUESTION_PATTERN_META[pattern];
}
