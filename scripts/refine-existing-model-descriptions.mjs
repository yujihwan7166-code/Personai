import fs from 'node:fs';
import { OPENROUTER_EXISTING_MODEL_OVERRIDES } from '../src/data/openrouter-existing-model-overrides.ts';

const OUT_PATH = 'src/data/openrouter-existing-model-overrides.ts';

function providerOf(override) {
  return override.modelInfo?.provider ?? 'OpenRouter';
}

function textFor(id, override) {
  return `${id} ${override.name ?? ''} ${override.nameKo ?? ''} ${providerOf(override)}`.toLowerCase();
}

function isVision(override) {
  return override.modelInfo?.inputModalities?.includes('image') ?? false;
}

function isFile(override) {
  return override.modelInfo?.inputModalities?.includes('file') ?? false;
}

function modelKind(id, override) {
  const text = textFor(id, override);
  if (/sonar|perplexity|command-r/.test(text)) return 'search';
  if (/codex|coder|codestral|devstral/.test(text)) return 'coding';
  if (/thinking|reasoning|r1|qwq|o1|o3|o4|opus|grok-4|kimi-thinking/.test(text)) return 'reasoning';
  if (/nano|mini|lite|flash|haiku|small|fast|micro/.test(text)) return 'fast';
  if (override.modelInfo?.openWeight) return 'open';
  if (isVision(override)) return 'vision';
  return 'general';
}

const SPECIFIC_DESCRIPTIONS = {
  'developer-yjh': '복잡한 개발 맥락과 긴 코드 흐름을 함께 보며 구현 방향을 잡는 Anthropic 개발 모델',
  'ancano-pro': '질문 성격에 맞춰 비용과 품질 균형이 좋은 경로를 고르는 ANCA 자동 선택 모델',
  'auto-gpt': '일반 대화와 개발 보조를 상황에 맞게 이어 주는 Anthropic 기반 자동 선택 모델',
  gpt: '긴 문서와 이미지 자료를 함께 보며 글쓰기와 코드 작업을 안정적으로 돕는 OpenAI 모델',
  'gpt-mini': '문서 요약과 화면 이해를 빠르게 처리하며 비용 부담을 낮춘 OpenAI 모델',
  'gpt-nano': '짧은 답변, 분류, 간단한 자동화 작업을 빠르게 처리하는 OpenAI 경량 모델',
  claude: '긴 문서와 까다로운 판단을 차분하게 풀어내는 Anthropic 고성능 모델',
  'claude-sonnet': '코딩, 문서 작성, 분석 업무를 균형 있게 이어 가는 Anthropic 주력 모델',
  'claude-sonnet-4.6': '에이전트형 코딩과 긴 작업 흐름을 안정적으로 다루는 Anthropic Sonnet 모델',
  'claude-haiku': '시각 입력이 섞인 자료를 빠르게 읽고 실행 항목으로 정리하는 Anthropic 모델',
  gemini: '텍스트와 멀티모달 자료를 빠르게 읽고 요약과 비교를 돕는 Google 모델',
  'gemini-3-flash': '빠른 응답과 추론 균형을 살려 대화와 문서 작업을 처리하는 Google 모델',
  'gemini-3.1': '가벼운 비용으로 긴 자료 요약과 일상 업무 처리를 돕는 Google 모델',
  'gemini-pro': '복잡한 분석과 멀티모달 이해를 함께 다루는 Google 상위 모델',
  'gemini-flash-lite': '일상 대화와 대량 요약을 빠르게 처리하는 Google 경량 모델',
  perplexity: '최신 자료 확인과 출처 기반 요약을 빠르게 돕는 Perplexity 검색 모델',
  'perplexity-pro': '깊은 리서치와 출처 비교가 필요한 질문에 맞춘 Perplexity 상위 모델',
  grok: '직설적인 요약과 분위기 파악이 필요한 대화에 강한 xAI 모델',
  'grok-4.2': '긴 대화 맥락과 복잡한 판단을 함께 다루는 xAI 고성능 모델',
  deepseek: '코드 문제와 구조화된 분석을 낮은 비용으로 풀어내는 DeepSeek 모델',
  'deepseek-r1': '수학, 논리, 코드 판단을 단계적으로 풀어내는 DeepSeek 추론 모델',
  qwen: '다국어 문서와 코딩 보조를 폭넓게 처리하는 Qwen 오픈웨이트 모델',
  'qwen-9b': '가벼운 코딩 보조와 다국어 응답을 빠르게 처리하는 Qwen 모델',
  'qwen-plus': '문서 분석과 다국어 추론을 안정적으로 이어 가는 Qwen 상위 모델',
  'qwen-thinking': '생각 과정이 필요한 문제를 단계적으로 정리하는 Qwen 추론 모델',
  'llama-maverick': '이미지와 긴 문서를 함께 다루는 Meta 오픈웨이트 모델',
  'llama-scout': '넓은 자료 탐색과 빠른 멀티모달 처리를 돕는 Meta 모델',
  'mistral-large': '유럽권 언어와 업무 문서 처리에 강한 Mistral 상위 모델',
  'mistral-medium': '일반 업무와 문서 분석을 균형 있게 처리하는 Mistral 모델',
  'mistral-small': '가벼운 비용으로 요약과 시각 입력을 처리하는 Mistral 모델',
  codestral: '코드 생성, 보완, 리뷰 흐름에 초점을 둔 Mistral 개발 모델',
  devstral: '저장소 이해와 에이전트형 개발 작업에 맞춘 Mistral 개발 모델',
  gemma: '일반 대화와 문서 처리를 가볍게 실행하는 Google 오픈웨이트 모델',
  phi: '작은 규모에서도 논리 문제와 구조화된 답변을 노리는 Microsoft 모델',
  'command-r-plus': 'RAG 검색, 인용 기반 답변, 기업용 질의응답에 맞춘 Cohere 모델',
  'command-a': '업무용 검색과 구조화된 답변을 안정적으로 처리하는 Cohere 모델',
  'nova-premier': '대규모 문서와 멀티모달 업무를 폭넓게 다루는 Amazon 상위 모델',
  'nova-2-lite': '긴 자료를 빠르게 훑고 요약하는 Amazon 경량 멀티모달 모델',
  dolphin: '자유로운 지시 수행과 창작형 대화에 맞춘 오픈웨이트 모델',
  glm: '중국어와 업무형 추론을 균형 있게 처리하는 Z.ai 모델',
  mimo: '다국어 업무와 일반 분석을 함께 처리하는 Xiaomi 모델',
  'mimo-flash': '짧은 질의와 빠른 응답을 중심으로 설계된 Xiaomi 경량 모델',
  nemotron: '기업형 추론과 코드 보조 작업을 겨냥한 NVIDIA 모델',
  seed: '빠른 응답과 멀티모달 이해를 함께 제공하는 ByteDance 모델',
  'seed-mini': '비용 효율적인 요약과 일상 작업에 맞춘 ByteDance 경량 모델',
  minimax: '긴 문맥과 업무형 대화를 안정적으로 처리하는 MiniMax 모델',
  kimi: '긴 문서 리서치와 코딩 보조에 강한 Moonshot 모델',
  'kimi-thinking': '단계적 추론과 장문 분석을 함께 다루는 Moonshot 모델',
  solar: '한국어 업무 문서와 논리 정리를 돕는 Upstage 모델',
  mercury: '낮은 지연 시간으로 빠른 추론 응답을 제공하는 Inception 모델',
  hunyuan: '중국어 업무 대화와 구조화된 답변에 맞춘 Tencent 모델',
  jamba: '긴 문서 처리와 기업형 질의응답을 지원하는 AI21 모델',
  granite: '기업 문서와 코드 보조를 안정적으로 처리하는 IBM 모델',
  step: '중국어 실무 질의와 빠른 응답에 맞춘 StepFun 모델',
  palmyra: '비즈니스 문서 작성과 긴 글 작업에 특화된 Writer 모델',
  hermes: '자유로운 지시 수행과 코딩 보조를 함께 다루는 Nous Research 모델',
};

function generatedDescription(id, override) {
  if (SPECIFIC_DESCRIPTIONS[id]) return SPECIFIC_DESCRIPTIONS[id];
  const provider = providerOf(override);
  const kind = modelKind(id, override);
  if (kind === 'search') return `출처 확인과 최신 정보 정리를 중심으로 답변하는 ${provider} 모델`;
  if (kind === 'coding') return `코드 구조 파악과 테스트 점검을 함께 돕는 ${provider} 개발 모델`;
  if (kind === 'reasoning') return `복잡한 판단을 단계별로 나눠 검토하는 ${provider} 추론 모델`;
  if (kind === 'fast') return `짧은 응답과 반복 작업을 빠르게 처리하는 ${provider} 경량 모델`;
  if (kind === 'open') return `자체 배포와 비용 효율을 고려한 ${provider} 오픈웨이트 모델`;
  if (kind === 'vision') return `문서와 이미지 자료를 함께 읽고 정리하는 ${provider} 모델`;
  if (isFile(override)) return `긴 문서와 업무 자료를 안정적으로 정리하는 ${provider} 모델`;
  return `일상 대화와 문서 작업을 균형 있게 처리하는 ${provider} 모델`;
}

function normalizeQuestion(question) {
  return question
    .replaceAll('발표 대본를', '발표 대본을')
    .replaceAll('예상 질문를', '예상 질문을')
    .replaceAll('상황별 답변를', '상황별 답변을')
    .replaceAll('액션아이템를', '액션아이템을')
    .replaceAll('단호한 표현를', '단호한 표현을')
    .replaceAll('결론를', '결론을')
    .replaceAll('낮은 중요도과', '낮은 중요도와')
    .replaceAll('핵심 메시지과', '핵심 메시지와')
    .replaceAll('반박 포인트과', '반박 포인트와')
    .replaceAll('다음 질문과 요약', '다음 질문과 요약문')
    .replaceAll('액션아이템과 요약', '액션아이템과 요약문');
}

const nextOverrides = Object.fromEntries(Object.entries(OPENROUTER_EXISTING_MODEL_OVERRIDES).map(([id, override]) => [
  id,
  {
    ...override,
    description: generatedDescription(id, override),
    sampleQuestions: override.sampleQuestions?.map(normalizeQuestion),
  },
]));

const source = `import type { Expert } from '@/types/expert';\n\ntype OpenRouterExistingModelOverride = Partial<Pick<Expert, 'name' | 'nameKo' | 'description' | 'tags' | 'sampleQuestions' | 'modelInfo'>>;\n\nexport const OPENROUTER_EXISTING_MODEL_OVERRIDES = ${JSON.stringify(nextOverrides, null, 2)} satisfies Record<string, OpenRouterExistingModelOverride>;\n`;

fs.writeFileSync(OUT_PATH, source, 'utf8');
