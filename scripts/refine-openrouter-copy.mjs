import fs from 'node:fs';

const DATA_PATH = 'src/data/openrouter-added-models.ts';

const source = fs.readFileSync(DATA_PATH, 'utf8');
const arrayStart = source.indexOf('export const OPENROUTER_ADDED_EXPERTS = ');
const jsonStart = source.indexOf('[', arrayStart);
const suffix = '] satisfies Expert[];';
const jsonEnd = source.indexOf(suffix, jsonStart);

if (arrayStart < 0 || jsonStart < 0 || jsonEnd < 0) {
  throw new Error('Could not locate OPENROUTER_ADDED_EXPERTS array');
}

const before = source.slice(0, jsonStart);
const after = source.slice(jsonEnd + 1);
const experts = JSON.parse(source.slice(jsonStart, jsonEnd + 1));

const contextLabel = (expert) => {
  const length = expert.modelInfo?.contextLength ?? 0;
  if (length >= 1_000_000) return '초장문';
  if (length >= 262_144) return '장문';
  if (length >= 128_000) return '128K급 문맥';
  return '표준 문맥';
};

const priceLabel = (expert) => {
  const tier = expert.modelInfo?.priceTier;
  if (tier === 'free') return '무료 호출';
  if (tier === 'low') return '저비용 호출';
  if (tier === 'premium') return '고난도 작업';
  return '균형형 비용';
};

const familyLabel = (expert) => {
  const id = expert.openrouterModel ?? '';
  if (id.includes('gpt-oss')) return '오픈웨이트 GPT 계열';
  if (id.includes('codex') || id.includes('coder') || id.includes('codestral') || id.includes('devstral')) return '개발자용';
  if (id.includes('deep-research') || id.includes('search') || id.includes('sonar')) return '검색형';
  if (id.includes('thinking') || /\/o[134]/.test(id) || id.includes('reasoning')) return '추론형';
  if (/mini|nano|flash|lite|small|haiku|fast/i.test(id)) return '경량';
  if (/pro|max|large|opus|premier|super/i.test(id)) return '상위';
  return '범용';
};

const primaryUse = (expert) => {
  const id = expert.openrouterModel ?? '';
  if (id.includes('search') || id.includes('sonar') || id.includes('deep-research')) return '근거 검색과 최신 정보 요약';
  if (id.includes('codex') || id.includes('coder') || id.includes('codestral') || id.includes('devstral')) return '코드 작성, 리팩터링, 저장소 분석';
  if (id.includes('thinking') || id.includes('reasoning') || /\/o[134]/.test(id)) return '복잡한 추론과 단계별 판단';
  if (/mini|nano|flash|lite|small|haiku|fast/i.test(id)) return '빠른 응답과 대량 처리';
  if (expert.modelInfo?.openWeight) return '오픈웨이트 실험과 자체 배포 검토';
  if ((expert.modelInfo?.inputModalities ?? []).includes('image')) return '문서와 화면까지 함께 보는 분석';
  return '업무 문서, 요약, 대화형 분석';
};

const templatePools = {
  search: [
    ({ name, provider, context }) => `${name}: ${context} 범위에서 출처 확인과 최신 쟁점 정리에 맞춘 ${provider} 검색형 모델`,
    ({ name, provider, price }) => `${name}: ${price} 조건에서 웹 근거, 비교 자료, 요약 보고서를 빠르게 묶는 ${provider} 모델`,
    ({ name, provider }) => `${name}: 질문의 배경 자료를 찾고 핵심 근거를 짧게 정리하는 ${provider} 리서치 모델`,
    ({ name, provider, family }) => `${name}: ${family} 흐름으로 사실 확인과 이슈 추적을 우선하는 ${provider} 모델`,
  ],
  coding: [
    ({ name, provider, context }) => `${name}: ${context} 코드 맥락에서 구조 파악, 수정안, 테스트 보완을 이어가기 좋은 ${provider} 모델`,
    ({ name, provider, family }) => `${name}: ${family} 작업에 맞춰 버그 원인 분석과 구현 대안을 비교하는 ${provider} 모델`,
    ({ name, provider, price }) => `${name}: ${price} 기준으로 코드 리뷰, 함수 설계, 리팩터링 초안을 빠르게 만드는 ${provider} 모델`,
    ({ name, provider }) => `${name}: 저장소 이해와 개발 질의 응답을 한 흐름으로 처리하기 좋은 ${provider} 모델`,
    ({ name, provider, context }) => `${name}: ${context} 입력을 활용해 API 설계와 테스트 케이스 점검을 돕는 ${provider} 개발 모델`,
  ],
  reasoning: [
    ({ name, provider, context }) => `${name}: ${context} 자료를 놓고 전제, 반례, 결론을 차분히 분리하는 ${provider} 추론 모델`,
    ({ name, provider, price }) => `${name}: ${price} 작업에서 수학적 판단과 논리 검토를 깊게 밀어붙이는 ${provider} 모델`,
    ({ name, provider, family }) => `${name}: ${family} 성향으로 복잡한 선택지를 기준별로 채점하는 ${provider} 모델`,
    ({ name, provider }) => `${name}: 모호한 질문을 쪼개고 단계별 판단 근거를 정리하는 ${provider} 모델`,
  ],
  vision: [
    ({ name, provider, context }) => `${name}: ${context} 안에서 이미지, 표, 문서 화면을 함께 해석하는 ${provider} 모델`,
    ({ name, provider, price }) => `${name}: ${price} 흐름에 맞춰 화면 캡처와 텍스트 자료를 같이 요약하는 ${provider} 모델`,
    ({ name, provider, context }) => `${name}: 시각 입력이 섞인 ${context} 업무 자료를 읽고 실행 항목으로 바꾸는 ${provider} 모델`,
    ({ name, provider, family }) => `${name}: ${family} 모델답게 문서 화면과 대화 맥락을 함께 연결하는 ${provider} 모델`,
    ({ name, provider, price, family }) => `${name}: ${price} 조건의 ${family} 입력에서 표와 화면 정보를 텍스트 판단으로 옮기는 ${provider} 모델`,
    ({ name, provider, context, family }) => `${name}: ${context} ${family} 입력을 바탕으로 이미지 단서와 문서 내용을 함께 정리하는 ${provider} 모델`,
  ],
  openWeight: [
    ({ name, provider, context }) => `${name}: ${context} 환경에서 오픈웨이트 실험과 비용 통제를 검토하기 좋은 ${provider} 모델`,
    ({ name, provider, price }) => `${name}: ${price} 장점을 살려 자체 배포 후보와 공개 모델 비교에 맞춘 ${provider} 모델`,
    ({ name, provider, family }) => `${name}: ${family} 공개 모델로 튜닝, 평가, 로컬 운용 가능성을 살피기 좋은 ${provider} 모델`,
    ({ name, provider, context, price }) => `${name}: ${context}·${price} 조건에서 라이선스와 배포 유연성을 함께 보는 ${provider} 오픈웨이트 모델`,
    ({ name, provider, family, context }) => `${name}: ${family} 계열의 ${context} 공개 모델로 평가 자동화와 실험 설계에 맞춘 ${provider} 모델`,
    ({ name, provider, price, family }) => `${name}: ${price} ${family} 운용을 염두에 둔 로컬 테스트와 모델 비교용 ${provider} 모델`,
  ],
  fast: [
    ({ name, provider, price }) => `${name}: ${price}과 짧은 지연 시간을 우선하는 반복 질의용 ${provider} 모델`,
    ({ name, provider, family }) => `${name}: ${family} 응답 속도로 분류, 초안, 짧은 자동화에 잘 맞는 ${provider} 모델`,
    ({ name, provider, context }) => `${name}: ${context} 자료를 빠르게 훑고 실무용 초안을 만드는 ${provider} 모델`,
  ],
  general: [
    ({ name, provider, context }) => `${name}: ${context} 기반으로 문서 요약, 비교, 일반 대화를 안정적으로 처리하는 ${provider} 모델`,
    ({ name, provider, price }) => `${name}: ${price} 균형을 살려 일상 업무와 지식 질의에 두루 쓰기 좋은 ${provider} 모델`,
    ({ name, provider, family }) => `${name}: ${family} 성향으로 초안 작성, 정리, 의사결정 보조를 맡기 좋은 ${provider} 모델`,
    ({ name, provider }) => `${name}: 복잡하지 않은 분석과 대화형 업무 보조를 균형 있게 처리하는 ${provider} 모델`,
  ],
};

function categoryFor(expert) {
  const id = expert.openrouterModel ?? '';
  if (id.includes('search') || id.includes('sonar') || id.includes('deep-research')) return 'search';
  if (id.includes('codex') || id.includes('coder') || id.includes('codestral') || id.includes('devstral')) return 'coding';
  if (id.includes('thinking') || id.includes('reasoning') || /\/o[134]/.test(id)) return 'reasoning';
  if (expert.modelInfo?.openWeight) return 'openWeight';
  if ((expert.modelInfo?.inputModalities ?? []).includes('image')) return 'vision';
  if (/mini|nano|flash|lite|small|haiku|fast/i.test(id)) return 'fast';
  return 'general';
}

function hash(value) {
  let out = 0;
  for (let i = 0; i < value.length; i += 1) out = ((out << 5) - out + value.charCodeAt(i)) | 0;
  return Math.abs(out);
}

function refinedDescription(expert) {
  const category = categoryFor(expert);
  const pool = templatePools[category];
  const context = {
    name: expert.nameKo || expert.name,
    provider: expert.modelInfo?.provider ?? 'OpenRouter',
    context: contextLabel(expert),
    price: priceLabel(expert),
    family: familyLabel(expert),
    use: primaryUse(expert),
  };
  return pool[hash(expert.id) % pool.length](context);
}

function refinedQuote(expert) {
  const name = expert.nameKo || expert.name;
  return `${name}로 ${primaryUse(expert)} 흐름을 먼저 잡아보겠습니다.`;
}

function refinedQuestions(expert) {
  const name = expert.nameKo || expert.name;
  const use = primaryUse(expert);
  const context = contextLabel(expert);
  const family = familyLabel(expert);
  return [
    `${name}로 ${use}에 맞는 작업 순서를 짜줘`,
    `${context} 자료를 ${family} 관점에서 핵심만 비교해줘`,
    `${expert.modelInfo?.provider ?? name} 모델이 잘 맞는 상황과 피해야 할 상황을 알려줘`,
  ];
}

function refinedGreeting(expert) {
  const provider = expert.modelInfo?.provider ?? 'OpenRouter';
  const name = expert.nameKo || expert.name;
  return `${provider}의 ${name}입니다. ${primaryUse(expert)}에 맞춰 핵심부터 정리해드릴게요.`;
}

const seenDescriptions = new Set();
for (const expert of experts) {
  expert.description = refinedDescription(expert);
  if (seenDescriptions.has(expert.description)) {
    expert.description = `${expert.description} (${expert.openrouterModel})`;
  }
  seenDescriptions.add(expert.description);
  expert.quote = refinedQuote(expert);
  expert.sampleQuestions = refinedQuestions(expert);
  expert.greeting = refinedGreeting(expert);
}

fs.writeFileSync(DATA_PATH, `${before}${JSON.stringify(experts, null, 2)}${after}`, 'utf8');
