const { DEFAULT_EXPERTS } = await import('../src/types/expert.ts');
const { isVisibleGeneralTextModel } = await import('../src/lib/generalModelCatalog.ts');

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const compactOutput = process.argv.includes('--compact');
const MAJOR_PROVIDER_PREFIX = /^(openai|anthropic|google|x-ai|perplexity|deepseek|qwen|meta-llama|mistralai|cohere|microsoft|amazon|nvidia|moonshotai|z-ai|minimax)\//;
const LOW_CONFIDENCE_PROVIDER_PREFIXES = [
  'aion-labs/',
  'anthracite-org/',
  'gryphe/',
  'mancer/',
  'sao10k/',
  'thedrummer/',
  'undi95/',
];
const EXCLUDE_MODEL_IDS = new Set([
  'openai/gpt-4o-2024-05-13',
  'openai/gpt-4o-2024-08-06',
  'openai/gpt-4o-2024-11-20',
  'openai/gpt-4o-mini-2024-07-18',
  'openai/gpt-3.5-turbo-0613',
  'openai/gpt-3.5-turbo-16k',
  'openai/gpt-3.5-turbo-instruct',
]);
const NON_GENERAL_MODEL_PATTERNS = [
  /\bmoderation\b/i,
  /\bguard\b/i,
  /\bguardrail\b/i,
  /\bsafeguard\b/i,
  /\bcontent[-\s]?safety\b/i,
  /\bembedding\b/i,
  /\btts\b/i,
  /\bwhisper\b/i,
  /\bvision\b/i,
  /\bvl\b/i,
  /\brouter\b/i,
  /\brp\b/i,
  /\brole[-\s]?play(?:ing)?\b/i,
  /\buncensored\b/i,
  /\bimage generation\b/i,
  /\bdeprecated\b/i,
];

function isTextOnlyModel(model) {
  const haystack = `${model.id} ${model.name} ${model.description ?? ''}`;
  return model.architecture?.input_modalities?.includes('text')
    && model.architecture?.output_modalities?.includes('text')
    && !(model.architecture?.output_modalities ?? []).some((item) => item !== 'text')
    && !model.id.startsWith('~')
    && !model.id.startsWith('openrouter/')
    && !EXCLUDE_MODEL_IDS.has(model.id)
    && !LOW_CONFIDENCE_PROVIDER_PREFIXES.some((prefix) => model.id.startsWith(prefix))
    && !NON_GENERAL_MODEL_PATTERNS.some((pattern) => pattern.test(haystack));
}

function scoreModel(model) {
  const created = model.created
    ? Math.min(80, Math.max(0, (model.created - 1_700_000_000) / 2_000_000))
    : 0;
  const text = `${model.id} ${model.name} ${model.description ?? ''}`.toLowerCase();
  return created
    + (MAJOR_PROVIDER_PREFIX.test(model.id) ? 70 : 20)
    + (/reasoning|thinking|r1|o3|o4|opus|sonnet|gpt-4|gemini-3|grok-4|deepseek/.test(text) ? 20 : 0)
    + (/code|coder|devstral|codestral/.test(text) ? 12 : 0)
    + ((model.context_length ?? 0) >= 262_144 ? 8 : 0);
}

const response = await fetch(OPENROUTER_MODELS_URL);
if (!response.ok) throw new Error(`OpenRouter fetch failed: ${response.status}`);

const payload = await response.json();
const models = Array.isArray(payload.data) ? payload.data : [];
const remoteIds = new Set(models.map((model) => model.id));
const visibleGeneralModels = DEFAULT_EXPERTS.filter(isVisibleGeneralTextModel);
const localOpenRouterIds = new Set(
  DEFAULT_EXPERTS
    .map((expert) => expert.openrouterModel)
    .filter((id) => typeof id === 'string' && id.length > 0),
);

const majorMissingTop = models
  .filter((model) => isTextOnlyModel(model) && MAJOR_PROVIDER_PREFIX.test(model.id) && !localOpenRouterIds.has(model.id))
  .sort((a, b) => scoreModel(b) - scoreModel(a))
  .slice(0, 40)
  .map((model) => ({
    id: model.id,
    name: model.name,
    createdAt: model.created ? new Date(model.created * 1000).toISOString().slice(0, 10) : undefined,
    contextLength: model.context_length,
    inputModalities: model.architecture?.input_modalities,
  }));

const staleLocalOpenRouterIds = [...localOpenRouterIds]
  .filter((id) => !remoteIds.has(id))
  .sort();

const visibleExistingGeneralModels = visibleGeneralModels
  .filter((expert) => !expert.id.startsWith('or-'))
  .map((expert) => ({
    id: expert.id,
    name: expert.name,
    openrouterModel: expert.openrouterModel,
    description: expert.description,
    tags: expert.tags,
    provider: expert.modelInfo?.provider,
    createdAt: expert.modelInfo?.createdAt,
    contextLength: expert.modelInfo?.contextLength,
  }));

const summary = {
  fetchedAt: new Date().toISOString(),
  source: OPENROUTER_MODELS_URL,
  openrouterModelCount: models.length,
  localOpenRouterCount: localOpenRouterIds.size,
  visibleGeneralCount: visibleGeneralModels.length,
  staleLocalOpenRouterIds,
  majorMissingTop,
  visibleExistingGeneralModels,
};

const compactSummary = {
  fetchedAt: summary.fetchedAt,
  openrouterModelCount: summary.openrouterModelCount,
  localOpenRouterCount: summary.localOpenRouterCount,
  visibleGeneralCount: summary.visibleGeneralCount,
  staleLocalOpenRouterIdCount: summary.staleLocalOpenRouterIds.length,
  majorMissingTopCount: summary.majorMissingTop.length,
  staleLocalOpenRouterIds: summary.staleLocalOpenRouterIds.slice(0, 20),
  majorMissingTop: summary.majorMissingTop.slice(0, 20).map((model) => ({
    id: model.id,
    name: model.name,
    createdAt: model.createdAt,
  })),
};

console.log(JSON.stringify(compactOutput ? compactSummary : summary, null, 2));

const failedChecks = [
  summary.staleLocalOpenRouterIds.length === 0
    ? null
    : `local catalog contains ${summary.staleLocalOpenRouterIds.length} OpenRouter ids missing from the live API`,
  summary.majorMissingTop.length === 0
    ? null
    : `local catalog is missing ${summary.majorMissingTop.length} high-priority major-provider text models`,
  summary.visibleGeneralCount >= 200
    ? null
    : `visible general catalog only has ${summary.visibleGeneralCount} models`,
].filter(Boolean);

if (failedChecks.length > 0) {
  console.error(`\nOpenRouter coverage audit failed:\n- ${failedChecks.join('\n- ')}`);
  process.exitCode = 1;
}
