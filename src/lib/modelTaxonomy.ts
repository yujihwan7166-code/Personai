/**
 * AI 모델 분류 메타데이터.
 *
 * 1차 탭 큐레이션(추천/빠른/추론) + 2차 브랜드 필터(전체 모델 탭 안)에서 사용.
 *
 * 주의: 새 모델 추가 시 이 파일에 brand / opensource / (필요 시) reasoning 매핑을 함께 추가해야 함.
 * `modelTaxonomy.test.ts` 가 누락 검출.
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

/** 칩 노출 순서 (전체 → 메이저 브랜드 → 기타). 오픈소스는 별도 칩으로 panel 에서 추가. */
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
 * 모델 ID → 브랜드 매핑.
 * ID prefix 매칭이 아니라 명시 매핑 — 잘못된 분류 방지.
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

  // Moonshot Kimi → 기타로 통합
  'kimi': 'other',
  'kimi-thinking': 'other',

  // Mistral 계열 → 기타로 통합
  'mistral-large': 'other',
  'mistral-medium': 'other',
  'mistral-small': 'other',
  'mistral-creative': 'other',
  'codestral': 'other',
  'devstral': 'other',

  // Meta Llama → 기타로 통합
  'llama-maverick': 'other',
  'llama-scout': 'other',

  // 특수 (앱 자체 어시스턴트 / 개발자 카드)
  'developer-yjh': 'claude',  // Sonnet 4.6 기반
  'ancano-pro': 'other',      // 자체 라우팅 (auto)
  'glm-5v': 'other',          // GLM 비전

  // 기타 (브랜드별 모델 수 적음)
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
  'ernie': 'other',
  'hunyuan': 'other',
  'jamba': 'other',
  'granite': 'other',
  'step': 'other',
  'palmyra': 'other',
  'longcat': 'other',
};

/**
 * 오픈 소스(open-weight) 모델 ID 집합.
 *
 * 기준: 가중치가 공개되어 자체 호스팅 가능한 모델.
 * Closed API 전용(GPT/Claude/Gemini 메인 라인 등)은 제외.
 */
export const MODEL_IS_OPENSOURCE: ReadonlySet<string> = new Set<string>([
  // Google open
  'gemma',
  // Meta
  'llama-maverick',
  'llama-scout',
  // Mistral (open-weight)
  'mistral-large',
  'mistral-medium',
  'mistral-small',
  'mistral-creative',
  'codestral',
  'devstral',
  // Microsoft
  'phi',
  // DeepSeek (open weights)
  'deepseek',
  'deepseek-r1',
  // Qwen (open weights)
  'qwen',
  'qwen-9b',
  'qwen-plus',
  'qwen-thinking',
  // 기타 open
  'dolphin',
  'nemotron',
  'granite',
  'jamba',
  'glm',
  'glm-5v',
  'hunyuan',
  'command-r-plus',
]);

/**
 * 추론(reasoning) 특화 모델.
 *
 * 기준: 모델 카드 description 에 "추론 특화", "심층 리서치", thinking 명시가 있는 모델.
 * 일반 강력 모델(Claude Opus, GPT-5)은 제외 — overlap 줄이기 위해 보수적으로 선별.
 */
export const MODEL_IS_REASONING: ReadonlySet<string> = new Set<string>([
  'deepseek-r1',
  'qwen-thinking',
  'kimi-thinking',
  'perplexity-pro',
]);

/**
 * 추천 모델 셀렉션 (5~7개).
 *
 * 신규 유저 직진 동선. 브랜드 다양성 + 품질 + 무난함 기준.
 * 출시 후 사용 데이터 보고 조정 예정.
 */
export const RECOMMENDED_MODEL_IDS: readonly string[] = [
  'auto-gpt',          // 심층 리서치 (여러 AI 협업 인용 리포트)
  'claude-sonnet',     // 균형 만능
  'gpt',               // OpenAI 플래그십
  'gemini-pro',        // Gemini 최상위
  'grok',              // 위트
  'deepseek-r1',       // 추론 무료급
  'claude',            // Opus 최고 지능
  'gemini',            // Flash 가성비
] as const;

/** 헬퍼 */
export const getBrandOf = (modelId: string): ModelBrand =>
  MODEL_BRAND[modelId] ?? 'other';

export const isOpenSource = (modelId: string): boolean =>
  MODEL_IS_OPENSOURCE.has(modelId);

export const isReasoning = (modelId: string): boolean =>
  MODEL_IS_REASONING.has(modelId);
