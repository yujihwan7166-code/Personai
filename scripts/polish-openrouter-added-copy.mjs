import fs from 'node:fs/promises';
import path from 'node:path';

import {
  OPENROUTER_ADDED_ABILITIES,
  OPENROUTER_ADDED_BRANDS,
  OPENROUTER_ADDED_EXPERTS,
  OPENROUTER_ADDED_FAST_IDS,
  OPENROUTER_ADDED_FLAGSHIP_IDS,
  OPENROUTER_ADDED_OPENSOURCE_IDS,
  OPENROUTER_ADDED_REASONING_IDS,
} from '../src/data/openrouter-added-models.ts';

const OUT_PATH = path.join(process.cwd(), 'src/data/openrouter-added-models.ts');

function providerOf(expert) {
  return expert.modelInfo?.provider || 'OpenRouter';
}

function contextLabel(expert) {
  const context = expert.modelInfo?.contextLength ?? 0;
  if (context >= 1_000_000) return '1M급 초장문';
  if (context >= 262_144) return '대용량 문맥';
  if (context >= 128_000) return '128K급 장문';
  return '일반 문맥';
}

function refinedDescription(expert) {
  const name = expert.nameKo || expert.name;
  const provider = providerOf(expert);
  const context = contextLabel(expert);
  const tags = expert.tags ?? [];

  if (tags.includes('검색')) return `${name}: 출처 확인, 최신 이슈 비교, 근거 요약에 맞춘 ${provider} 계열 검색 모델`;
  if (tags.includes('코딩')) return `${name}: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 ${provider} 모델`;
  if (tags.includes('시각입력')) return `${name}: ${context}에서 이미지, 표, 문서 화면을 함께 읽어내는 ${provider} 모델`;
  if (tags.includes('추론')) return `${name}: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 ${provider} 모델`;
  if (tags.includes('고속')) return `${name}: 빠른 응답과 낮은 비용을 우선한 ${provider} 경량 모델`;
  if (tags.includes('오픈웨이트')) return `${name}: 배포 유연성과 커스터마이징 여지가 있는 ${provider} 오픈웨이트 모델`;
  return `${name}: ${provider}의 ${context} 기반 범용 대화 모델`;
}

const QUOTE_FOCUS_A = [
  '구조 검토',
  '근거 정리',
  '문맥 해석',
  '전제 점검',
  '실행 순서',
  '비용 균형',
  '응답 속도',
  '도구 활용',
  '코드 경계',
  '자료 요약',
  '대안 비교',
  '리스크 확인',
  '긴 문서 흐름',
  '언어 뉘앙스',
  '표현 다듬기',
  '수치 검증',
  '문서 화면',
  '오픈 활용',
  '실무 적용',
  '핵심 압축',
];

const QUOTE_FOCUS_B = [
  '테스트 관점',
  '판단 기준',
  '출처 맥락',
  '사용 사례',
  '작업 흐름',
  '품질 기준',
  '비교 기준',
  '안전한 선택지',
  '결론의 근거',
  '다음 행동',
];

function quoteFocus(index) {
  const first = QUOTE_FOCUS_A[index % QUOTE_FOCUS_A.length];
  const second = QUOTE_FOCUS_B[Math.floor(index / QUOTE_FOCUS_A.length) % QUOTE_FOCUS_B.length];
  return `${first}·${second}`;
}

function uniqueQuote(expert, index) {
  const name = expert.nameKo || expert.name;
  const provider = providerOf(expert);
  const focus = quoteFocus(index);
  const tags = expert.tags ?? [];

  if (tags.includes('검색')) return `${name} 기준으로 ${focus}까지 근거 중심으로 보겠습니다`;
  if (tags.includes('코딩')) return `${name} 기준으로 ${focus}까지 개발 맥락에서 짚겠습니다`;
  if (tags.includes('시각입력')) return `${name} 기준으로 ${focus}까지 보이는 정보와 함께 읽겠습니다`;
  if (tags.includes('추론')) return `${name} 기준으로 ${focus}까지 차근히 따져보겠습니다`;
  if (tags.includes('고속')) return `${name} 기준으로 ${focus}까지 빠르게 정리하겠습니다`;
  if (tags.includes('오픈웨이트')) return `${name} 기준으로 ${focus}까지 오픈 활용 관점에서 보겠습니다`;
  return `${name} 기준으로 ${focus}까지 균형 있게 정리하겠습니다`;
}

function uniqueModelQuestion(expert) {
  const name = expert.nameKo || expert.name;
  const provider = providerOf(expert);
  const tags = expert.tags ?? [];

  if (tags.includes('검색')) return `${name}로 최신 이슈를 출처와 함께 점검해줘`;
  if (tags.includes('코딩')) return `${name}가 잘 맞는 개발 작업을 예시로 비교해줘`;
  if (tags.includes('추론')) return `${name}로 복잡한 판단을 단계별로 풀어줘`;
  if (tags.includes('시각입력')) return `${name}로 이미지와 문서를 함께 분석해줘`;
  if (tags.includes('오픈웨이트')) return `${name}의 오픈웨이트 활용 장단점을 정리해줘`;
  return `${provider}의 ${name}를 언제 쓰면 좋은지 알려줘`;
}

const polishedExperts = OPENROUTER_ADDED_EXPERTS.map((expert, index) => {
  const sampleQuestions = [...(expert.sampleQuestions ?? [])];
  const uniqueQuestion = uniqueModelQuestion(expert);
  if (sampleQuestions.length === 0) sampleQuestions.push(uniqueQuestion);
  else sampleQuestions[sampleQuestions.length - 1] = uniqueQuestion;

  return {
    ...expert,
    description: refinedDescription(expert),
    quote: uniqueQuote(expert, index),
    sampleQuestions,
  };
});

function toTsString(value) {
  return JSON.stringify(value, null, 2);
}

const output = `import type { AIAbilityStats, Expert, ModelInfo } from '@/types/expert';
import type { ModelBrand } from '@/lib/modelTaxonomy';

export const OPENROUTER_ADDED_EXPERTS = ${toTsString(polishedExperts)} satisfies Expert[];

export const OPENROUTER_ADDED_ABILITIES = ${toTsString(OPENROUTER_ADDED_ABILITIES)} satisfies Record<string, AIAbilityStats>;

export const OPENROUTER_ADDED_BRANDS = ${toTsString(OPENROUTER_ADDED_BRANDS)} satisfies Record<string, ModelBrand>;

export const OPENROUTER_ADDED_OPENSOURCE_IDS = ${toTsString(OPENROUTER_ADDED_OPENSOURCE_IDS)} as const;

export const OPENROUTER_ADDED_REASONING_IDS = ${toTsString(OPENROUTER_ADDED_REASONING_IDS)} as const;

export const OPENROUTER_ADDED_FAST_IDS = ${toTsString(OPENROUTER_ADDED_FAST_IDS)} as const;

export const OPENROUTER_ADDED_FLAGSHIP_IDS = ${toTsString(OPENROUTER_ADDED_FLAGSHIP_IDS)} as const;

export type { ModelInfo };
`;

await fs.writeFile(OUT_PATH, output, 'utf8');
console.log(`Polished copy for ${polishedExperts.length} generated OpenRouter models.`);
