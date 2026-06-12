import {
  OPENROUTER_ADDED_BRANDS,
  OPENROUTER_ADDED_OPENSOURCE_IDS,
  OPENROUTER_ADDED_REASONING_IDS,
} from '@/data/openrouter-added-models';

/**
 * 일반 AI 모델 분류 메타데이터.
 *
 * 1차 홈 섹션(추천/빠른 모델/추론 모델)과 전체 모델 탐색의 브랜드 필터에서 사용한다.
 * 새 모델을 추가할 때는 brand, open-weight, 필요 시 reasoning 매핑을 함께 갱신해야 한다.
 */

export type ModelBrand =
  | 'gpt'
  | 'claude'
  | 'gemini'
  | 'grok'
  | 'perplexity'
  | 'deepseek'
  | 'qwen'
  | 'other';

/** UI 라벨 */
export const BRAND_LABEL: Record<ModelBrand, string> = {
  gpt: 'GPT',
  claude: 'Claude',
  gemini: 'Gemini',
  grok: 'Grok',
  perplexity: 'Perplexity',
  deepseek: 'DeepSeek',
  qwen: 'Qwen',
  other: '기타',
};

/** 브랜드 로고 경로. null이면 이미지 배지를 사용하지 않는다. */
export const BRAND_LOGO: Record<ModelBrand, string | null> = {
  gpt: '/logos/gpt.svg',
  claude: '/logos/claude.png',
  gemini: '/logos/gemini.svg',
  grok: '/logos/grok.svg',
  perplexity: '/logos/perplexity.svg',
  deepseek: '/logos/deepseek.png',
  qwen: '/logos/qwen.png',
  other: null,
};

/** 브랜드 필터 노출 순서. 오픈웨이트는 별도 필터로 다룬다. */
export const BRAND_ORDER: ModelBrand[] = [
  'gpt',
  'claude',
  'gemini',
  'grok',
  'perplexity',
  'deepseek',
  'qwen',
  'other',
];

/**
 * 모델 ID별 브랜드 매핑.
 * prefix 추론에만 기대지 않고 명시적으로 매핑해 잘못된 분류를 방지한다.
 */
export const MODEL_BRAND: Record<string, ModelBrand> = {
  // OpenAI
  'gpt': 'gpt',
  'gpt-mini': 'gpt',
  'gpt-nano': 'gpt',
  'auto-gpt': 'gpt',

  // Anthropic
  'claude': 'claude',
  'claude-sonnet': 'claude',
  'claude-sonnet-4.6': 'claude',
  'claude-haiku': 'claude',

  // Google
  'gemini': 'gemini',
  'gemini-3-flash': 'gemini',
  'gemini-3.1': 'gemini',
  'gemini-pro': 'gemini',
  'gemini-flash-lite': 'gemini',
  'gemma': 'gemini',

  // xAI
  'grok': 'grok',
  'grok-4.2': 'grok',

  // Perplexity
  'perplexity': 'perplexity',
  'perplexity-pro': 'perplexity',

  // DeepSeek
  'deepseek': 'deepseek',
  'deepseek-r1': 'deepseek',

  // Alibaba Qwen
  'qwen': 'qwen',
  'qwen-9b': 'qwen',
  'qwen-plus': 'qwen',
  'qwen-thinking': 'qwen',

  // Moonshot Kimi
  'kimi': 'other',
  'kimi-thinking': 'other',

  // Mistral
  'mistral-large': 'other',
  'mistral-medium': 'other',
  'mistral-small': 'other',
  'codestral': 'other',
  'devstral': 'other',

  // Meta Llama
  'llama-maverick': 'other',
  'llama-scout': 'other',

  // Special app cards
  'developer-yjh': 'claude',
  'ancano-pro': 'other',

  // Other known providers
  'phi': 'other',
  'command-r-plus': 'other',
  'command-a': 'other',
  'nova-premier': 'other',
  'nova-2-lite': 'other',
  'dolphin': 'other',
  'glm': 'other',
  'mimo': 'other',
  'mimo-flash': 'other',
  'nemotron': 'other',
  'seed': 'other',
  'seed-mini': 'other',
  'minimax': 'other',
  'solar': 'other',
  'mercury': 'other',
  'hunyuan': 'other',
  'jamba': 'other',
  'granite': 'other',
  'step': 'other',
  'palmyra': 'other',
  ...OPENROUTER_ADDED_BRANDS,
};

/**
 * 오픈웨이트 모델 ID 집합.
 * 가중치가 공개되어 자체 호스팅이나 로컬 실행 생태계와 연결되는 모델을 포함한다.
 */
export const MODEL_IS_OPENSOURCE: ReadonlySet<string> = new Set<string>([
  // Google open
  'gemma',
  // Meta
  'llama-maverick',
  'llama-scout',
  // Mistral open-weight
  'mistral-large',
  'mistral-medium',
  'mistral-small',
  'codestral',
  'devstral',
  // Microsoft
  'phi',
  // DeepSeek open weights
  'deepseek',
  'deepseek-r1',
  // Qwen open weights
  'qwen',
  'qwen-9b',
  'qwen-plus',
  'qwen-thinking',
  // Other open-weight families
  'dolphin',
  'nemotron',
  'granite',
  'jamba',
  'glm',
  'hunyuan',
  'command-r-plus',
  ...OPENROUTER_ADDED_OPENSOURCE_IDS,
]);

/**
 * 추론 특화 모델.
 * 홈의 "추론 모델" 섹션과 전체 탐색의 "특징 > 추론" 필터에서 사용한다.
 */
export const REASONING_MODEL_IDS: readonly string[] = [
  'gpt',
  'gemini-pro',
  'claude',
  'grok',
  'perplexity-pro',
  'deepseek-r1',
  'qwen-thinking',
  'kimi-thinking',
  ...OPENROUTER_ADDED_REASONING_IDS,
] as const;

/** 빠른 boolean lookup용 Set */
export const MODEL_IS_REASONING: ReadonlySet<string> = new Set<string>(REASONING_MODEL_IDS);

/**
 * 기본 추천 모델 섹션.
 * 대중성, 브랜드 다양성, 속도, 검색/출처 활용성을 함께 고려한다.
 */
export const RECOMMENDED_MODEL_IDS: readonly string[] = [
  'gpt',
  'claude-sonnet',
  'gemini-flash-lite',
  'claude-haiku',
  'grok',
  'perplexity',
  'deepseek',
  'qwen-9b',
] as const;

/** Helpers */
export const getBrandOf = (modelId: string): ModelBrand =>
  MODEL_BRAND[modelId] ?? 'other';

export const isOpenSource = (modelId: string): boolean =>
  MODEL_IS_OPENSOURCE.has(modelId);

export const isReasoning = (modelId: string): boolean =>
  MODEL_IS_REASONING.has(modelId);
