import fs from 'node:fs';
import path from 'node:path';

const { DEFAULT_EXPERTS } = await import('../src/types/expert.ts');
const {
  OPENROUTER_ADDED_ABILITIES,
  OPENROUTER_ADDED_EXPERTS,
} = await import('../src/data/openrouter-added-models.ts');
const { OPENROUTER_EXISTING_MODEL_OVERRIDES } = await import('../src/data/openrouter-existing-model-overrides.ts');
const {
  hasImageVideoOutput,
  hasLikelyMojibake,
  hasNonTextOutput,
  isVisibleGeneralTextModel,
} = await import('../src/lib/generalModelCatalog.ts');

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const statsKeys = ['coding', 'creativity', 'reasoning', 'math', 'multilingual', 'speed', 'costEfficiency', 'contextWindow'];
const TODAY_ISO = '2026-06-13';
const aiExperts = DEFAULT_EXPERTS.filter((expert) => expert.category === 'ai');
const customExperts = DEFAULT_EXPERTS.filter((expert) => expert.category !== 'ai');
const genericBadAvatars = new Set(['/logos/router.svg']);
const multimodalInputModels = aiExperts.filter((expert) => {
  const input = expert.modelInfo?.inputModalities ?? [];
  return input.some((item) => item === 'image' || item === 'video');
});
const imageVideoOutputModels = aiExperts.filter(hasImageVideoOutput);
const nonTextOutputModels = aiExperts.filter(hasNonTextOutput);
const visibleGeneralAiExperts = aiExperts.filter(isVisibleGeneralTextModel);
const visibleGeneralImageVideoOutputModels = visibleGeneralAiExperts.filter(hasImageVideoOutput);
const visibleGeneralNonTextOutputModels = visibleGeneralAiExperts.filter(hasNonTextOutput);
const roleplayHeavyProviderPrefixes = [
  'aion-labs/',
  'anthracite-org/',
  'gryphe/',
  'mancer/',
  'sao10k/',
  'thedrummer/',
  'undi95/',
];
const visibleGeneralRoleplayHeavyModels = visibleGeneralAiExperts.filter((expert) => {
  const text = [
    expert.openrouterModel,
    expert.name,
    expert.nameKo,
    expert.description,
  ].join(' ');
  return /\b(rp|role[-\s]?play(?:ing)?|uncensored)\b/i.test(text)
    || roleplayHeavyProviderPrefixes.some((prefix) => expert.openrouterModel?.startsWith(prefix));
});
const visibleExistingGeneralModels = visibleGeneralAiExperts.filter((expert) => !expert.id.startsWith('or-'));
const visibleExistingDescriptionTemplates = {
  codingTemplate: visibleExistingGeneralModels.filter((expert) => expert.description?.includes('코드 작성·리팩터링 중심 모델') ?? false),
  visionTemplate: visibleExistingGeneralModels.filter((expert) => expert.description?.includes('이미지·문서 이해를 곁들인 대화 모델') ?? false),
};
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
    const keys = [
      input.some((item) => item !== 'text') ? null : 'textOnly',
      input.includes('image') ? 'image' : null,
      input.includes('audio') ? 'audio' : null,
      input.includes('video') ? 'video' : null,
      input.includes('file') ? 'file' : null,
    ].filter(Boolean);
    keys.forEach((key) => {
      acc[key] = (acc[key] ?? 0) + 1;
    });
    return acc;
  }, {}),
};

const visibleGeneralMissingCreatedAt = visibleGeneralAiExperts.filter((expert) => !expert.modelInfo?.createdAt);
const visibleGeneralInvalidCreatedAt = visibleGeneralAiExperts.filter((expert) =>
  Boolean(expert.modelInfo?.createdAt) && !/^\d{4}-\d{2}-\d{2}$/.test(expert.modelInfo.createdAt));
const visibleGeneralFutureCreatedAt = visibleGeneralAiExperts.filter((expert) =>
  Boolean(expert.modelInfo?.createdAt) && expert.modelInfo.createdAt > TODAY_ISO);
const visibleGeneralMissingContextLength = visibleGeneralAiExperts.filter((expert) => !(expert.modelInfo?.contextLength > 0));
const visibleGeneralMissingPriceTier = visibleGeneralAiExperts.filter((expert) => !expert.modelInfo?.priceTier);

const missingAvatars = DEFAULT_EXPERTS.filter((expert) => {
  if (!expert.avatarUrl?.startsWith('/logos/')) return false;
  return !fs.existsSync(path.join(PUBLIC_DIR, expert.avatarUrl));
});

const badTextAi = aiExperts.filter((expert) =>
  hasLikelyMojibake([expert.name, expert.nameKo, expert.description, ...(expert.tags ?? [])].join(' ')),
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
const generatedDescriptionCount = new Set(OPENROUTER_ADDED_EXPERTS.map((expert) => expert.description)).size;
const generatedSampleQuestionCount = new Set(OPENROUTER_ADDED_EXPERTS.flatMap((expert) => expert.sampleQuestions ?? [])).size;
const generatedQuoteCount = new Set(OPENROUTER_ADDED_EXPERTS.map((expert) => expert.quote)).size;
const generatedProviders = [...new Set(OPENROUTER_ADDED_EXPERTS
  .map((expert) => expert.modelInfo?.provider)
  .filter(Boolean))]
  .sort((a, b) => b.length - a.length);
const generatedProviderPattern = generatedProviders.length > 0
  ? new RegExp(` (${generatedProviders.map((provider) => provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
  : null;
const generatedDescriptionSkeletons = OPENROUTER_ADDED_EXPERTS.map((expert) => {
  const withoutName = expert.description?.replace(/^[^:]+: /, '') ?? '';
  return generatedProviderPattern ? withoutName.replace(generatedProviderPattern, ' {provider}') : withoutName;
});
const generatedDescriptionSkeletonCounts = generatedDescriptionSkeletons.reduce((acc, skeleton) => {
  acc[skeleton] = (acc[skeleton] ?? 0) + 1;
  return acc;
}, {});
const generatedDescriptionMaxSkeletonRepeat = Math.max(0, ...Object.values(generatedDescriptionSkeletonCounts));
const generatedDescriptionTopSkeletons = Object.entries(generatedDescriptionSkeletonCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([skeleton, count]) => ({ skeleton, count }));
const generatedAwkwardProviderParticleQuestions = OPENROUTER_ADDED_EXPERTS.flatMap((expert) => (expert.sampleQuestions ?? [])
  .filter((question) => /[A-Za-z0-9. ]+를 써야/.test(question))
  .map((question) => ({
    id: expert.id,
    question,
  })));
const generatedModelSpecificQuestionCount = OPENROUTER_ADDED_EXPERTS.filter((expert) => {
  const name = expert.nameKo || expert.name;
  const provider = expert.modelInfo?.provider ?? '';
  return (expert.sampleQuestions ?? []).some((question) => question.includes(name) || (provider && question.includes(provider)));
}).length;
const generatedOpenWeightModels = OPENROUTER_ADDED_EXPERTS.filter((expert) => expert.modelInfo?.openWeight);
const generatedOpenWeightTagMissing = generatedOpenWeightModels.filter((expert) => !(expert.tags ?? []).includes('오픈웨이트'));
const generatedCodingTagCount = OPENROUTER_ADDED_EXPERTS.filter((expert) => (expert.tags ?? []).includes('코딩')).length;

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
  nonTextOutputModelCount: nonTextOutputModels.length,
  nonTextOutputModels: nonTextOutputModels.map((expert) => ({
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
  visibleGeneralNonTextOutputModelCount: visibleGeneralNonTextOutputModels.length,
  visibleGeneralNonTextOutputModels: visibleGeneralNonTextOutputModels.map((expert) => ({
    id: expert.id,
    openrouterModel: expert.openrouterModel,
    input: expert.modelInfo?.inputModalities,
    output: expert.modelInfo?.outputModalities,
  })),
  visibleGeneralRoleplayHeavyModelCount: visibleGeneralRoleplayHeavyModels.length,
  visibleGeneralRoleplayHeavyModels: visibleGeneralRoleplayHeavyModels.map((expert) => ({
    id: expert.id,
    name: expert.nameKo,
    openrouterModel: expert.openrouterModel,
    description: expert.description,
  })),
  visibleExistingDescriptionTemplateCounts: {
    codingTemplate: visibleExistingDescriptionTemplates.codingTemplate.length,
    visionTemplate: visibleExistingDescriptionTemplates.visionTemplate.length,
    codingTemplateIds: visibleExistingDescriptionTemplates.codingTemplate.map((expert) => expert.id),
    visionTemplateIds: visibleExistingDescriptionTemplates.visionTemplate.map((expert) => expert.id),
  },
  visibleGeneralFilterBuckets,
  visibleGeneralMetadataQuality: {
    checkedAsOf: TODAY_ISO,
    missingCreatedAtCount: visibleGeneralMissingCreatedAt.length,
    missingCreatedAt: visibleGeneralMissingCreatedAt.map((expert) => ({
      id: expert.id,
      openrouterModel: expert.openrouterModel,
    })),
    invalidCreatedAtCount: visibleGeneralInvalidCreatedAt.length,
    invalidCreatedAt: visibleGeneralInvalidCreatedAt.map((expert) => ({
      id: expert.id,
      openrouterModel: expert.openrouterModel,
      createdAt: expert.modelInfo?.createdAt,
    })),
    futureCreatedAtCount: visibleGeneralFutureCreatedAt.length,
    futureCreatedAt: visibleGeneralFutureCreatedAt.map((expert) => ({
      id: expert.id,
      openrouterModel: expert.openrouterModel,
      createdAt: expert.modelInfo?.createdAt,
    })),
    missingContextLengthCount: visibleGeneralMissingContextLength.length,
    missingContextLength: visibleGeneralMissingContextLength.map((expert) => ({
      id: expert.id,
      openrouterModel: expert.openrouterModel,
    })),
    missingPriceTierCount: visibleGeneralMissingPriceTier.length,
    missingPriceTier: visibleGeneralMissingPriceTier.map((expert) => ({
      id: expert.id,
      openrouterModel: expert.openrouterModel,
    })),
  },
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
  generatedCopyDiversity: {
    uniqueDescriptions: generatedDescriptionCount,
    uniqueDescriptionSkeletons: new Set(generatedDescriptionSkeletons).size,
    maxDescriptionSkeletonRepeat: generatedDescriptionMaxSkeletonRepeat,
    topDescriptionSkeletons: generatedDescriptionTopSkeletons,
    awkwardProviderParticleQuestionCount: generatedAwkwardProviderParticleQuestions.length,
    awkwardProviderParticleQuestions: generatedAwkwardProviderParticleQuestions.slice(0, 20),
    uniqueSampleQuestions: generatedSampleQuestionCount,
    uniqueQuotes: generatedQuoteCount,
    modelSpecificQuestionCount: generatedModelSpecificQuestionCount,
  },
  generatedTagCoverage: {
    openWeightModelCount: generatedOpenWeightModels.length,
    openWeightTagMissingCount: generatedOpenWeightTagMissing.length,
    openWeightTagMissing: generatedOpenWeightTagMissing.slice(0, 20).map((expert) => ({
      id: expert.id,
      openrouterModel: expert.openrouterModel,
      tags: expert.tags,
    })),
    codingTagCount: generatedCodingTagCount,
  },
  generatedAbilityRanges,
  customAbilityRanges,
};

console.log(JSON.stringify(summary, null, 2));
