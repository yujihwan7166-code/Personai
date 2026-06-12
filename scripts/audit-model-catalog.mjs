import fs from 'node:fs';
import path from 'node:path';

const { DEFAULT_EXPERTS } = await import('../src/types/expert.ts');
const {
  OPENROUTER_ADDED_ABILITIES,
  OPENROUTER_ADDED_EXPERTS,
} = await import('../src/data/openrouter-added-models.ts');
const { OPENROUTER_EXISTING_MODEL_OVERRIDES } = await import('../src/data/openrouter-existing-model-overrides.ts');

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const statsKeys = ['coding', 'creativity', 'reasoning', 'math', 'multilingual', 'speed', 'costEfficiency', 'contextWindow'];
const aiExperts = DEFAULT_EXPERTS.filter((expert) => expert.category === 'ai');
const customExperts = DEFAULT_EXPERTS.filter((expert) => expert.category !== 'ai');
const mojibakePattern = /[�]|(?:[硫異怨踰湲援먯쑁]{2,})|\?[가-힣]*\?/;
const genericBadAvatars = new Set(['/logos/router.svg']);
const multimodalInputModels = aiExperts.filter((expert) => {
  const input = expert.modelInfo?.inputModalities ?? [];
  return input.some((item) => item === 'image' || item === 'video');
});
const imageVideoOutputModels = aiExperts.filter((expert) => {
  const output = expert.modelInfo?.outputModalities ?? [];
  return output.some((item) => item === 'image' || item === 'video');
});
const visibleGeneralAiExperts = aiExperts.filter((expert) => {
  if (expert.id.startsWith('auto-')) return false;
  if (expert.id === 'ancano-pro' || expert.id === 'developer-yjh') return false;
  return true;
});
const visibleGeneralImageVideoOutputModels = visibleGeneralAiExperts.filter((expert) => {
  const output = expert.modelInfo?.outputModalities ?? [];
  return output.some((item) => item === 'image' || item === 'video');
});
const visibleGeneralFilterBuckets = {
  priceTier: visibleGeneralAiExperts.reduce((acc, expert) => {
    const key = expert.modelInfo?.priceTier ?? 'missing';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {}),
  context: visibleGeneralAiExperts.reduce((acc, expert) => {
    const contextLength = expert.modelInfo?.contextLength ?? 0;
    const key = contextLength >= 1_000_000 ? 'xl' : contextLength >= 262_144 ? 'long' : 'standard';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {}),
  input: visibleGeneralAiExperts.reduce((acc, expert) => {
    const input = expert.modelInfo?.inputModalities ?? [];
    const key = input.includes('image') ? 'vision' : 'text';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {}),
};

const missingAvatars = DEFAULT_EXPERTS.filter((expert) => {
  if (!expert.avatarUrl?.startsWith('/logos/')) return false;
  return !fs.existsSync(path.join(PUBLIC_DIR, expert.avatarUrl));
});

const badTextAi = aiExperts.filter((expert) =>
  mojibakePattern.test([expert.name, expert.nameKo, expert.description, ...(expert.tags ?? [])].join(' ')),
);

const badGenericAvatars = aiExperts.filter((expert) => expert.avatarUrl && genericBadAvatars.has(expert.avatarUrl));

const avatarProviderMismatches = OPENROUTER_ADDED_EXPERTS.filter((expert) => {
  const provider = expert.modelInfo?.provider?.toLowerCase() ?? '';
  const avatar = expert.avatarUrl?.toLowerCase() ?? '';
  if (!avatar) return true;
  if (avatar.startsWith('/logos/openrouter/')) return false;
  if (provider.includes('openai')) return !avatar.includes('gpt');
  if (provider.includes('google')) return !avatar.includes('gemini');
  if (provider.includes('anthropic')) return !avatar.includes('claude');
  if (provider.includes('perplexity')) return !avatar.includes('perplexity');
  if (provider.includes('deepseek')) return !avatar.includes('deepseek');
  if (provider.includes('qwen') || provider.includes('alibaba')) return !avatar.includes('qwen');
  if (provider.includes('meta')) return !avatar.includes('meta');
  if (provider.includes('mistral')) return !avatar.includes('mistral');
  if (provider.includes('cohere')) return !avatar.includes('cohere');
  if (provider.includes('amazon')) return !avatar.includes('amazon');
  if (provider.includes('nvidia')) return !avatar.includes('nvidia');
  if (provider.includes('moonshot')) return !avatar.includes('moonshot');
  if (provider.includes('z.ai')) return !avatar.includes('glm');
  if (provider.includes('minimax')) return !avatar.includes('minimax');
  return false;
});

const duplicateCustomDescriptions = customExperts.length - new Set(customExperts.map((expert) => expert.description)).size;
const duplicateCustomAvatars = customExperts.filter((expert) => expert.avatarUrl).length
  - new Set(customExperts.map((expert) => expert.avatarUrl).filter(Boolean)).size;
const duplicateCustomStats = customExperts.length
  - new Set(customExperts.map((expert) => statsKeys.map((key) => expert.abilities?.[key]).join('|'))).size;

const generatedAbilityRanges = Object.fromEntries(statsKeys.map((key) => {
  const values = OPENROUTER_ADDED_EXPERTS.map((expert) => OPENROUTER_ADDED_ABILITIES[expert.id]?.[key]).filter((value) => typeof value === 'number');
  return [key, {
    min: Math.min(...values),
    max: Math.max(...values),
    unique: new Set(values).size,
  }];
}));

const customAbilityRanges = Object.fromEntries(statsKeys.map((key) => {
  const values = customExperts.map((expert) => expert.abilities?.[key]).filter((value) => typeof value === 'number');
  return [key, {
    min: Math.min(...values),
    max: Math.max(...values),
    unique: new Set(values).size,
  }];
}));

const summary = {
  aiCount: aiExperts.length,
  customCount: customExperts.length,
  addedOpenRouterCount: OPENROUTER_ADDED_EXPERTS.length,
  existingOverrideCount: Object.keys(OPENROUTER_EXISTING_MODEL_OVERRIDES).length,
  multimodalInputModelCount: multimodalInputModels.length,
  multimodalInputModels: multimodalInputModels.map((expert) => ({
    id: expert.id,
    openrouterModel: expert.openrouterModel,
    input: expert.modelInfo?.inputModalities,
    output: expert.modelInfo?.outputModalities,
  })),
  imageVideoOutputModelCount: imageVideoOutputModels.length,
  imageVideoOutputModels: imageVideoOutputModels.map((expert) => ({
    id: expert.id,
    openrouterModel: expert.openrouterModel,
    input: expert.modelInfo?.inputModalities,
    output: expert.modelInfo?.outputModalities,
  })),
  visibleGeneralImageVideoOutputModelCount: visibleGeneralImageVideoOutputModels.length,
  visibleGeneralImageVideoOutputModels: visibleGeneralImageVideoOutputModels.map((expert) => ({
    id: expert.id,
    openrouterModel: expert.openrouterModel,
    input: expert.modelInfo?.inputModalities,
    output: expert.modelInfo?.outputModalities,
  })),
  visibleGeneralFilterBuckets,
  missingAvatarCount: missingAvatars.length,
  missingAvatars: missingAvatars.map((expert) => ({ id: expert.id, avatarUrl: expert.avatarUrl })),
  badTextAiCount: badTextAi.length,
  badTextAi: badTextAi.slice(0, 20).map((expert) => ({
    id: expert.id,
    name: expert.name,
    description: expert.description,
    tags: expert.tags,
  })),
  badGenericAvatarCount: badGenericAvatars.length,
  badGenericAvatars: badGenericAvatars.map((expert) => ({ id: expert.id, avatarUrl: expert.avatarUrl })),
  avatarProviderMismatchCount: avatarProviderMismatches.length,
  avatarProviderMismatches: avatarProviderMismatches.slice(0, 20).map((expert) => ({
    id: expert.id,
    provider: expert.modelInfo?.provider,
    avatarUrl: expert.avatarUrl,
  })),
  duplicateCustomDescriptions,
  duplicateCustomAvatars,
  duplicateCustomStats,
  generatedAbilityRanges,
  customAbilityRanges,
};

console.log(JSON.stringify(summary, null, 2));
