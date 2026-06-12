const { DEFAULT_EXPERTS } = await import('../src/types/expert.ts');
const { isVisibleGeneralTextModel } = await import('../src/lib/generalModelCatalog.ts');

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const MAJOR_PROVIDER_PREFIX = /^(openai|anthropic|google|x-ai|perplexity|deepseek|qwen|meta-llama|mistralai|cohere|microsoft|amazon|nvidia|moonshotai|z-ai|minimax)\//;

function isTextOnlyModel(model) {
  return model.architecture?.input_modalities?.includes('text')
    && model.architecture?.output_modalities?.includes('text')
    && !(model.architecture?.output_modalities ?? []).some((item) => item !== 'text')
    && !model.id.startsWith('~')
    && !model.id.startsWith('openrouter/');
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

console.log(JSON.stringify({
  fetchedAt: new Date().toISOString(),
  source: OPENROUTER_MODELS_URL,
  openrouterModelCount: models.length,
  localOpenRouterCount: localOpenRouterIds.size,
  visibleGeneralCount: visibleGeneralModels.length,
  staleLocalOpenRouterIds,
  majorMissingTop,
  visibleExistingGeneralModels,
}, null, 2));
