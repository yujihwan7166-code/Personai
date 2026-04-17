import type { ResponseState } from '@/lib/responseProgress';
import type { AgentTask } from './types';
import { getQuestionPatternMeta } from './questionPatternMeta';
import type { QuestionPattern, QuestionPatternAuxTag, QuestionPatternContext } from './questionPattern';

export interface QuestionPatternPlan {
  pattern: QuestionPattern;
  label: string;
  focusLabel: string;
  steps: string[];
  auxTags: QuestionPatternAuxTag[];
}

function formatFocus(subject: string) {
  return subject || '핵심 질의';
}

function hasTag(tags: QuestionPatternAuxTag[], tag: QuestionPatternAuxTag) {
  return tags.includes(tag);
}

function sourceLabel(tags: QuestionPatternAuxTag[]) {
  if (hasTag(tags, 'file')) return '첨부 자료';
  if (hasTag(tags, 'code')) return '코드와 실행 맥락';
  if (hasTag(tags, 'search') || hasTag(tags, 'latest')) return '최신 자료';
  return '질문 맥락';
}

function latestQualifier(tags: QuestionPatternAuxTag[]) {
  return hasTag(tags, 'latest') || hasTag(tags, 'search') ? '최신 흐름을 반영해 ' : '';
}

function pickVariantIndex(seed: string, count: number, salt: string) {
  let hash = 0;
  const text = `${salt}:${seed}`;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) % count;
}

function pickVariant(seed: string, salt: string, variants: string[][]) {
  return variants[pickVariantIndex(seed, variants.length, salt)] ?? variants[0];
}

function buildQuickAnswerSteps(focus: string, tags: QuestionPatternAuxTag[], seed: string) {
  return pickVariant(seed, 'quick', [
    [
      `${focus}의 요구 범위와 답변 단위를 식별 중`,
      `${sourceLabel(tags)}에서 즉시 필요한 근거만 선별 중`,
      `${focus}에 대한 결론 문장을 검증 중`,
    ],
    [
      `${focus}의 핵심 의도와 응답 범위를 압축 중`,
      `${sourceLabel(tags)} 기준으로 불필요한 맥락을 제거 중`,
      `${focus}에 맞는 최소 충분 답변을 확정 중`,
    ],
    [
      `${focus}에서 바로 답해야 할 쟁점을 분리 중`,
      `${sourceLabel(tags)}의 사실 관계를 빠르게 대조 중`,
      `${focus} 결론을 간결한 형태로 정제 중`,
    ],
  ]);
}

function buildConceptSteps(focus: string, tags: QuestionPatternAuxTag[], seed: string) {
  return pickVariant(seed, 'concept', [
    [
      `${focus}의 설명 범위와 전제 수준을 설정 중`,
      `${latestQualifier(tags)}${focus}를 구성하는 핵심 개념과 혼동 지점을 분리 중`,
      `${focus}를 이해 가능한 개념 구조로 재구성 중`,
    ],
    [
      `${focus}를 어디까지 설명할지 개념 경계를 설정 중`,
      `${focus} 이해에 필요한 원리와 용어를 선별 중`,
      `${focus}를 사례와 구조 중심의 설명 흐름으로 정리 중`,
    ],
    [
      `${focus}의 기본 원리와 배경 맥락을 분리 중`,
      `${sourceLabel(tags)}를 참고해 ${focus}의 핵심 관계를 추출 중`,
      `${focus}를 비전문가도 따라갈 수 있는 논리 순서로 재배치 중`,
    ],
  ]);
}

function buildCompareSteps(context: QuestionPatternContext) {
  const [left, right] = context.compareTargets;
  const seed = context.cleanedMessage;

  if (left && right) {
    return pickVariant(seed, 'compare-pair', [
      [
        `${left}와 ${right}의 비교 기준을 정렬 중`,
        `${left}와 ${right}의 성능·용도·제약 차이를 대조 중`,
        `${left}와 ${right}의 상황별 적합도를 판정 중`,
      ],
      [
        `${left}와 ${right}를 동일 평가 축에 배치 중`,
        `${left}와 ${right}의 차이를 사용 목적별로 분해 중`,
        `${left}와 ${right} 선택 기준을 조건별로 재구성 중`,
      ],
      [
        `${left}와 ${right}의 판단 축과 우선순위를 설정 중`,
        `${left}와 ${right}의 강점·한계·리스크를 교차 검토 중`,
        `${left}와 ${right} 중 어떤 조건에서 유리한지 결론화 중`,
      ],
    ]);
  }

  const focus = formatFocus(context.subject);
  return pickVariant(seed, 'compare-generic', [
    [
      `${focus} 비교에 필요한 평가 축을 설정 중`,
      `${focus}의 차이 지점을 항목별로 분해 중`,
      `${focus} 선택 기준을 상황별로 정리 중`,
    ],
    [
      `${focus}를 동일 조건에서 비교할 기준을 구성 중`,
      `${focus}에서 실제 판단을 가르는 변수를 선별 중`,
      `${focus} 결론이 달라지는 조건을 도출 중`,
    ],
    [
      `${focus}의 비교 대상과 우선순위를 정렬 중`,
      `${focus}의 장점·단점·제약을 교차 검토 중`,
      `${focus}에 대한 실사용 기준의 추천안을 구성 중`,
    ],
  ]);
}

function buildCauseSteps(focus: string, tags: QuestionPatternAuxTag[], seed: string) {
  return pickVariant(seed, 'cause', [
    [
      `${focus}의 표면 증상과 구조적 원인을 분리 중`,
      `${sourceLabel(tags)}를 바탕으로 원인 가설을 계층화 중`,
      `${focus}에 가장 큰 영향을 주는 핵심 원인을 판정 중`,
    ],
    [
      `${focus}에서 관찰되는 문제 신호를 분류 중`,
      `${focus}의 직접 원인과 배경 원인을 역추적 중`,
      `${focus} 원인의 우선순위와 파급 범위를 산정 중`,
    ],
    [
      `${focus}의 증상·맥락·제약 조건을 분리 중`,
      `${sourceLabel(tags)} 기준으로 가능한 원인 후보를 압축 중`,
      `${focus}의 핵심 병목과 대응 우선순위를 도출 중`,
    ],
  ]);
}

function buildForecastSteps(focus: string, tags: QuestionPatternAuxTag[], seed: string) {
  const evidenceSource = hasTag(tags, 'search') || hasTag(tags, 'latest')
    ? '최근 흐름과 확인 가능한 자료를 바탕으로'
    : `${focus}의 현재 맥락을 바탕으로`;
  const scope = focus.endsWith('전망') ? focus : `${focus} 전망`;

  return pickVariant(seed, 'forecast', [
    [
      `${evidenceSource} 영향을 줄 변수를 추려보는 중`,
      `${scope}이 어떤 조건에서 달라질 수 있는지 경우를 나눠보는 중`,
      `가능성이 더 높은 흐름과 주의해야 할 변곡점을 정리하는 중`,
    ],
    [
      `${scope}을 판단할 때 먼저 봐야 할 신호를 정리하는 중`,
      `현재 흐름이 이어질 때와 흔들릴 때의 차이를 비교하는 중`,
      `답변에서 조심해서 말해야 할 변수와 예외 조건을 고르는 중`,
    ],
    [
      `${latestQualifier(tags)}${focus}의 방향을 바꿀 수 있는 단서를 확인하는 중`,
      `단정하기 어려운 부분과 비교적 말할 수 있는 부분을 나누는 중`,
      `${scope}의 기준 흐름과 달라질 수 있는 조건을 정리하는 중`,
    ],
  ]);
}

function buildStrategySteps(focus: string, tags: QuestionPatternAuxTag[], seed: string) {
  return pickVariant(seed, 'strategy', [
    [
      `${focus}의 목표와 제약 조건을 정의 중`,
      `${sourceLabel(tags)}를 기준으로 실행 가능한 전략 경로를 설계 중`,
      `${focus}의 선택지별 기대효과와 리스크를 비교 중`,
      `${focus}에 적합한 우선 전략을 판정 중`,
    ],
    [
      `${focus}에서 달성해야 할 핵심 목표를 명확화 중`,
      `${focus}를 제한하는 자원·시간·리스크 조건을 검토 중`,
      `${focus}의 전략 옵션을 비용 대비 효과 기준으로 평가 중`,
      `${focus}의 우선 실행 방향을 결정 중`,
    ],
    [
      `${focus} 전략의 문제 정의와 성공 기준을 재정렬 중`,
      `${sourceLabel(tags)}를 바탕으로 선택지 지도를 구성 중`,
      `${focus} 전략별 장단기 효과를 비교 중`,
      `${focus}에 바로 적용 가능한 전략안을 압축 중`,
    ],
  ]);
}

function buildProcedureSteps(focus: string, tags: QuestionPatternAuxTag[], seed: string) {
  return pickVariant(seed, 'procedure', [
    [
      `${focus}의 시작 조건과 선행 준비 항목을 확인 중`,
      `${focus} 실행 순서를 의존 관계 기준으로 배열 중`,
      `${sourceLabel(tags)}를 바탕으로 실패 가능 지점을 사전 점검 중`,
      `${focus}를 단계별 실행 절차로 확정 중`,
    ],
    [
      `${focus}에서 먼저 확보해야 할 조건을 식별 중`,
      `${focus}의 작업 흐름을 순차 실행 단위로 분해 중`,
      `${focus} 진행 중 발생 가능한 오류 지점을 표시 중`,
      `${focus} 절차를 바로 따라갈 수 있는 형태로 정리 중`,
    ],
    [
      `${focus}의 출발점과 완료 기준을 설정 중`,
      `${sourceLabel(tags)}를 참고해 ${focus}의 실행 순서를 재배치 중`,
      `${focus}의 병목·주의·검증 구간을 분리 중`,
      `${focus}를 실행 체크리스트 형태로 구성 중`,
    ],
  ]);
}

function buildReviewSteps(focus: string, tags: QuestionPatternAuxTag[], seed: string) {
  return pickVariant(seed, 'review', [
    [
      `${focus}의 평가 기준과 검토 범위를 설정 중`,
      `${focus}의 강점과 유지해야 할 요소를 식별 중`,
      `${sourceLabel(tags)}를 기준으로 약점·오류·리스크를 진단 중`,
      `${focus}의 수정 우선순위를 피드백 구조로 정리 중`,
    ],
    [
      `${focus}를 어떤 기준으로 판단할지 평가 축을 구성 중`,
      `${focus}에서 이미 작동하는 부분을 분리 중`,
      `${focus}의 취약 지점과 개선 여지를 추출 중`,
      `${focus}의 개선안을 영향도 순서로 배열 중`,
    ],
    [
      `${focus}의 품질 기준과 사용 목적을 대조 중`,
      `${sourceLabel(tags)} 기반으로 ${focus}의 장점을 검증 중`,
      `${focus}에서 위험하거나 불명확한 부분을 표시 중`,
      `${focus} 피드백을 실행 가능한 수정 항목으로 전환 중`,
    ],
  ]);
}

function buildIdeaSteps(focus: string, tags: QuestionPatternAuxTag[], seed: string) {
  return pickVariant(seed, 'idea', [
    [
      `${focus}의 발상 범위와 제약 조건을 확장 중`,
      `${sourceLabel(tags)}와 연결되는 아이디어 후보군을 군집화 중`,
      `${focus}에서 차별성과 실행 가능성이 높은 후보를 선별 중`,
    ],
    [
      `${focus}의 발상 축을 넓혀 후보군을 생성 중`,
      `${focus} 아이디어를 테마·용도·실행 난이도별로 묶는 중`,
      `${focus}에서 신선도와 현실성을 동시에 만족하는 안을 추출 중`,
    ],
    [
      `${focus}의 가능 공간을 넓힌 뒤 중복 후보를 제거 중`,
      `${sourceLabel(tags)}를 참고해 ${focus} 아이디어를 클러스터로 분류 중`,
      `${focus}에 적합한 상위 후보와 조합 가능성을 압축 중`,
    ],
  ]);
}

function buildRewriteSteps(focus: string, tags: QuestionPatternAuxTag[], seed: string) {
  return pickVariant(seed, 'rewrite', [
    [
      `${sourceLabel(tags)}와 ${focus}의 요구 형식을 대조 중`,
      `${focus}에 맞는 문서 구조와 톤을 설계 중`,
      `${focus} 초안을 논리 흐름 중심으로 구성 중`,
      `${focus}의 문장 밀도와 표현 일관성을 조정 중`,
    ],
    [
      `${focus} 결과물의 목적·독자·형식을 고정 중`,
      `${sourceLabel(tags)}를 바탕으로 ${focus}의 아웃라인을 구성 중`,
      `${focus} 초안을 읽히는 순서로 재배열 중`,
      `${focus}의 문체와 완성도를 최종 점검 중`,
    ],
    [
      `${focus} 작성 목적과 출력 포맷을 정렬 중`,
      `${focus} 문서의 정보 배치와 강조 지점을 설계 중`,
      `${focus} 초안을 일관된 구조로 조립 중`,
      `${focus}의 문장 표현과 마무리 품질을 보정 중`,
    ],
  ]);
}

export function buildQuestionPatternPlan(context: QuestionPatternContext): QuestionPatternPlan {
  const meta = getQuestionPatternMeta(context.pattern);
  const focus = formatFocus(context.subject);
  const seed = `${context.cleanedMessage}:${focus}:${context.reasons.join('|')}`;

  let steps: string[];
  switch (context.pattern) {
    case 'quick_answer':
      steps = buildQuickAnswerSteps(focus, context.auxTags, seed);
      break;
    case 'concept_explain':
      steps = buildConceptSteps(focus, context.auxTags, seed);
      break;
    case 'compare_choose':
      steps = buildCompareSteps(context);
      break;
    case 'cause_diagnose':
      steps = buildCauseSteps(focus, context.auxTags, seed);
      break;
    case 'forecast_scenario':
      steps = buildForecastSteps(focus, context.auxTags, seed);
      break;
    case 'strategy_design':
      steps = buildStrategySteps(focus, context.auxTags, seed);
      break;
    case 'procedure_execute':
      steps = buildProcedureSteps(focus, context.auxTags, seed);
      break;
    case 'review_feedback':
      steps = buildReviewSteps(focus, context.auxTags, seed);
      break;
    case 'idea_expand':
      steps = buildIdeaSteps(focus, context.auxTags, seed);
      break;
    case 'rewrite_compose':
      steps = buildRewriteSteps(focus, context.auxTags, seed);
      break;
    default:
      steps = meta.skeleton;
      break;
  }

  return {
    pattern: context.pattern,
    label: meta.label,
    focusLabel: focus,
    steps,
    auxTags: context.auxTags,
  };
}

export function resolvePatternStageIndexFromAgentState(
  status: 'analyzing' | 'planning' | 'processing' | 'synthesizing' | 'reviewing' | 'complete' | 'error',
  tasks: Pick<AgentTask, 'status'>[],
  stepCount: number,
) {
  if (stepCount <= 1) return 0;

  if (status === 'analyzing') return 0;
  if (status === 'planning') return Math.min(1, stepCount - 1);

  if (status === 'processing') {
    const middleEnd = Math.max(1, stepCount - 2);
    if (middleEnd <= 1 || tasks.length === 0) {
      return middleEnd;
    }

    const completed = tasks.filter((task) => task.status === 'done').length;
    const running = tasks.some((task) => task.status === 'running') ? 0.5 : 0;
    const progress = Math.min(1, (completed + running) / tasks.length);
    return Math.min(stepCount - 2, 1 + Math.floor(progress * (stepCount - 2)));
  }

  if (status === 'synthesizing' || status === 'reviewing' || status === 'complete') {
    return stepCount - 1;
  }

  return Math.min(stepCount - 1, Math.max(0, stepCount - 2));
}

export function resolvePatternStageIndexFromProgress(
  state: ResponseState,
  stepCount: number,
) {
  if (stepCount <= 1) return 0;

  if (state === 'queued' || state === 'analyzing') return 0;
  if (state === 'searching' || state === 'planning') return Math.min(1, stepCount - 1);
  if (state === 'processing' || state === 'drafting') return Math.max(1, stepCount - 2);
  if (state === 'reviewing' || state === 'finalizing' || state === 'complete') return stepCount - 1;
  return Math.min(stepCount - 1, Math.max(0, stepCount - 2));
}
