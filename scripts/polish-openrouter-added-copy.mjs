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

function uniqueModelQuestion(expert) {
  const name = expert.nameKo || expert.name;
  const provider = expert.modelInfo?.provider;
  if (expert.tags?.includes('검색')) return `${name}로 최신 이슈를 출처와 함께 점검해줘`;
  if (expert.tags?.includes('코딩')) return `${name}가 잘 맞는 개발 작업을 예시로 비교해줘`;
  if (expert.tags?.includes('추론')) return `${name}로 복잡한 판단을 단계별로 풀어줘`;
  if (expert.tags?.includes('시각입력')) return `${name}로 이미지와 문서를 함께 분석해줘`;
  if (expert.tags?.includes('오픈웨이트')) return `${name}의 오픈웨이트 활용 장단점을 정리해줘`;
  if (provider) return `${provider}의 ${name}를 언제 쓰면 좋은지 알려줘`;
  return `${name}의 추천 사용 사례를 정리해줘`;
}

const polishedExperts = OPENROUTER_ADDED_EXPERTS.map((expert) => {
  const sampleQuestions = [...(expert.sampleQuestions ?? [])];
  const uniqueQuestion = uniqueModelQuestion(expert);
  if (sampleQuestions.length === 0) sampleQuestions.push(uniqueQuestion);
  else sampleQuestions[sampleQuestions.length - 1] = uniqueQuestion;
  return {
    ...expert,
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
console.log(`Polished sample questions for ${polishedExperts.length} generated OpenRouter models.`);
