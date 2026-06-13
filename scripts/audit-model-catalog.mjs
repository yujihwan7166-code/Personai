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
const { mergePersistedExperts } = await import('../src/lib/expertPersistence.ts');
const {
  AI_GROUP_CATS,
  buildExpertSelectionGroups,
} = await import('../src/lib/expertSelectionGroups.ts');
const { getExpertPrompt } = await import('../src/lib/expertPromptLoader.ts');
const {
  GENERAL_QUICK_FILTER_IDS,
  NEW_GENERAL_MODEL_IDS,
  GENERAL_SPEC_LABELS,
  GENERAL_TRAIT_LABELS,
  getGeneralSpecIds,
  getGeneralTraitIds,
  matchesGeneralQuickFilter,
} = await import('../src/lib/generalModelExplorerFilters.ts');

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const statsKeys = ['coding', 'creativity', 'reasoning', 'math', 'multilingual', 'speed', 'costEfficiency', 'contextWindow'];
const TODAY_ISO = '2026-06-13';
const MIN_AVATAR_DIMENSION = 24;
const compactOutput = process.argv.includes('--compact');
const REQUIRED_VISIBLE_GENERAL_PROVIDERS = [
  'OpenAI',
  'Anthropic',
  'Google',
  'xAI',
  'Perplexity',
  'DeepSeek',
  'Alibaba Qwen',
  'Meta',
  'Mistral AI',
  'Cohere',
  'Amazon',
  'NVIDIA',
  'Moonshot AI',
  'Z.ai',
  'MiniMax',
];
const KNOWN_VISIBLE_GENERAL_TAGS = new Set([
  '검색',
  '고속',
  '구조화',
  '문맥처리',
  '문서입력',
  '멀티모달',
  '무료',
  '범용',
  '생산성',
  '시각입력',
  '업무',
  '오픈웨이트',
  '저비용',
  '장문맥',
  '중국어',
  '창작',
  '추론',
  '코딩',
  '툴사용',
  '한국어',
]);
const GENERAL_TRAIT_FILTER_IDS = GENERAL_TRAIT_LABELS.map(([id]) => id);
const GENERAL_SPEC_FILTER_IDS = GENERAL_SPEC_LABELS.map(([id]) => id);
const AWKWARD_COPY_PATTERN = /성향으로|관점에서 핵심만 비교|\?{2,}|강점을 둔|범용 모델답게/;
const SELECTION_GROUP_QUALITY_RULES = {
  ai_recommended: {
    minProviderCount: 6,
    maxProviderShare: 0.35,
    minCreatedAt2025Share: 1,
    minCreatedAt2026Count: 2,
  },
  ai_flagship: {
    minProviderCount: 10,
    maxProviderShare: 0.35,
    minCreatedAt2025Share: 1,
    minCreatedAt2026Count: 8,
  },
  ai_fast: {
    minProviderCount: 10,
    maxProviderShare: 0.35,
    minCreatedAt2025Share: 0.85,
    minCreatedAt2026Count: 8,
  },
  ai_reasoning: {
    minProviderCount: 10,
    maxProviderShare: 0.35,
    minCreatedAt2025Share: 1,
    minCreatedAt2026Count: 8,
  },
  ai_minor: {
    minProviderCount: 8,
    maxProviderShare: 0.3,
    minCreatedAt2025Share: 1,
    minCreatedAt2026Count: 6,
  },
  ai_open: {
    minProviderCount: 12,
    maxProviderShare: 0.35,
    minCreatedAt2025Share: 0.8,
    minCreatedAt2026Count: 30,
  },
  ai: {
    minProviderCount: 30,
    maxProviderShare: 0.25,
    minCreatedAt2025Share: 0.8,
    minCreatedAt2026Count: 70,
  },
};
const aiExperts = DEFAULT_EXPERTS.filter((expert) => expert.category === 'ai');
const customExperts = DEFAULT_EXPERTS.filter((expert) => expert.category !== 'ai');
const persistedMergeFixture = mergePersistedExperts([
  {
    ...DEFAULT_EXPERTS.find((expert) => expert.id === 'gpt'),
    id: 'stale-persisted-image-ai',
    name: 'Stale Persisted Image AI',
    nameKo: 'Stale Persisted Image AI',
    category: 'ai',
    openrouterModel: 'example/stale-persisted-image-ai',
    modelInfo: {
      provider: 'Example',
      contextLength: 8192,
      inputModalities: ['text'],
      outputModalities: ['image'],
      priceTier: 'standard',
      createdAt: '2025-01-01',
    },
  },
  {
    ...DEFAULT_EXPERTS.find((expert) => expert.id === 'doctor'),
    id: 'persisted-custom-doctor-copy',
    name: 'Persisted Custom Doctor',
    nameKo: '저장된 커스텀 의사',
    category: 'occupation',
  },
]);
const persistedMergeVisibleGeneral = persistedMergeFixture.filter(isVisibleGeneralTextModel);
const persistedMergeStaleAiRetained = persistedMergeFixture.filter((expert) => expert.id === 'stale-persisted-image-ai');
const persistedMergeCustomRetained = persistedMergeFixture.filter((expert) => expert.id === 'persisted-custom-doctor-copy');
const selectionGroups = buildExpertSelectionGroups({
  experts: DEFAULT_EXPERTS,
  favoriteIds: [],
  visibleCategories: ['ai'],
  aiAgentIds: [],
});
const genericBadAvatars = new Set(['/logos/router.svg']);
const multimodalInputModels = aiExperts.filter((expert) => {
  const input = expert.modelInfo?.inputModalities ?? [];
  return input.some((item) => item === 'image' || item === 'video');
});
const imageVideoOutputModels = aiExperts.filter(hasImageVideoOutput);
const nonTextOutputModels = aiExperts.filter(hasNonTextOutput);
const visibleGeneralAiExperts = aiExperts.filter(isVisibleGeneralTextModel);
const visibleGeneralProviderCounts = visibleGeneralAiExperts.reduce((acc, expert) => {
  const provider = expert.modelInfo?.provider ?? 'missing';
  acc[provider] = (acc[provider] ?? 0) + 1;
  return acc;
}, {});
const visibleGeneralMajorProviderMissing = REQUIRED_VISIBLE_GENERAL_PROVIDERS
  .filter((provider) => !visibleGeneralProviderCounts[provider]);
const visibleGeneralTags = visibleGeneralAiExperts.flatMap((expert) => expert.tags ?? []);
const visibleGeneralTagCounts = visibleGeneralTags.reduce((acc, tag) => {
  acc[tag] = (acc[tag] ?? 0) + 1;
  return acc;
}, {});
const visibleGeneralTopTags = Object.entries(visibleGeneralTagCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([tag, count]) => ({ tag, count }));
const visibleGeneralOverHalfTags = Object.entries(visibleGeneralTagCounts)
  .filter(([, count]) => count > visibleGeneralAiExperts.length / 2)
  .map(([tag, count]) => ({ tag, count }));
const visibleGeneralInvalidTags = visibleGeneralAiExperts.flatMap((expert) =>
  (expert.tags ?? [])
    .filter((tag) => !KNOWN_VISIBLE_GENERAL_TAGS.has(tag) || tag.includes('?') || hasLikelyMojibake(tag))
    .map((tag) => ({
      id: expert.id,
      name: expert.name,
      tag,
    })));
const TAG_METADATA_RULES = {
  시각입력: (expert) => (expert.modelInfo?.inputModalities ?? []).includes('image'),
  문서입력: (expert) => (expert.modelInfo?.inputModalities ?? []).includes('file'),
  멀티모달: (expert) => (expert.modelInfo?.inputModalities ?? []).some((item) => item === 'audio' || item === 'video'),
  무료: (expert) => expert.modelInfo?.priceTier === 'free',
  저비용: (expert) => expert.modelInfo?.priceTier === 'low',
  오픈웨이트: (expert) => expert.modelInfo?.openWeight === true,
  장문맥: (expert) => (expert.modelInfo?.contextLength ?? 0) >= 500_000,
  문맥처리: (expert) => (expert.modelInfo?.contextLength ?? 0) >= 128_000,
};
const visibleGeneralTagMetadataMismatches = visibleGeneralAiExperts.flatMap((expert) =>
  Object.entries(TAG_METADATA_RULES)
    .filter(([tag, predicate]) => (expert.tags ?? []).includes(tag) && !predicate(expert))
    .map(([tag]) => ({
      id: expert.id,
      name: expert.name,
      tag,
      modelInfo: expert.modelInfo,
    })));
const visibleGeneralMissingAbilities = visibleGeneralAiExperts.filter((expert) => !expert.abilities);
const visibleGeneralAbilityRanges = Object.fromEntries(statsKeys.map((key) => {
  const values = visibleGeneralAiExperts
    .map((expert) => expert.abilities?.[key])
    .filter((value) => typeof value === 'number');
  return [key, {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    unique: new Set(values).size,
  }];
}));
const visibleGeneralMissingGreeting = visibleGeneralAiExperts.filter((expert) => !expert.greeting?.trim());
const visibleGeneralStaleGreetingNames = visibleGeneralAiExperts.filter((expert) => {
  const name = expert.nameKo || expert.name;
  const greeting = expert.greeting ?? '';
  return Boolean(name)
    && !greeting.includes(name)
    && /에서 개발한 .+?입니다/u.test(greeting);
});
const visibleGeneralMissingQuotes = visibleGeneralAiExperts.filter((expert) => !expert.quote?.trim());
const visibleGeneralTooShortQuotes = visibleGeneralAiExperts.filter((expert) => (expert.quote?.trim().length ?? 0) < 6);
const visibleGeneralAwkwardCopyPatterns = visibleGeneralAiExperts.flatMap((expert) => {
  const fields = [
    ['description', expert.description],
    ['quote', expert.quote],
    ['greeting', expert.greeting],
    ...(expert.sampleQuestions ?? []).map((question, index) => [`sampleQuestions[${index}]`, question]),
  ];
  return fields
    .filter(([, value]) => AWKWARD_COPY_PATTERN.test(value ?? ''))
    .map(([field, value]) => ({
      id: expert.id,
      field,
      value,
    }));
});
const visibleGeneralRuntimePromptEntries = await Promise.all(visibleGeneralAiExperts.map(async (expert) => ({
  expert,
  prompt: await getExpertPrompt(expert),
})));
const visibleGeneralMissingRuntimePrompts = visibleGeneralRuntimePromptEntries
  .filter((entry) => entry.prompt.trim().length < 120);
const visibleGeneralRuntimePromptMissingIdentity = visibleGeneralRuntimePromptEntries
  .filter(({ expert, prompt }) => {
    const name = expert.nameKo || expert.name;
    const provider = expert.modelInfo?.provider ?? '';
    return !prompt.includes(name) && Boolean(provider) && !prompt.includes(provider);
  });
function countFilterMatches(ids, predicate) {
  return Object.fromEntries(ids.map((id) => [
    id,
    visibleGeneralAiExperts.filter((expert) => predicate(expert, id)).length,
  ]));
}

const visibleGeneralExplorerFilterCoverage = {
  quick: countFilterMatches(GENERAL_QUICK_FILTER_IDS, matchesGeneralQuickFilter),
  trait: countFilterMatches(GENERAL_TRAIT_FILTER_IDS, (expert, id) => getGeneralTraitIds(expert).includes(id)),
  detail: countFilterMatches(GENERAL_SPEC_FILTER_IDS, (expert, id) => getGeneralSpecIds(expert).includes(id)),
};
const visibleGeneralNewFilterModels = visibleGeneralAiExperts.filter((expert) => matchesGeneralQuickFilter(expert, 'new'));
const visibleGeneralNewFilterOlderModels = visibleGeneralNewFilterModels.filter((expert) => (expert.modelInfo?.createdAt ?? '') < '2026-01-01');
const visibleGeneralNewFilterProviderCount = new Set(visibleGeneralNewFilterModels.map((expert) => expert.modelInfo?.provider ?? 'missing')).size;
const visibleGeneralNewFilterMissingIds = [...NEW_GENERAL_MODEL_IDS]
  .filter((id) => !visibleGeneralAiExperts.some((expert) => expert.id === id));
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
      input.includes('audio') || input.includes('video') ? 'audioVideo' : null,
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
const visibleGeneralIdSet = new Set(visibleGeneralAiExperts.map((expert) => expert.id));
const visibleGeneralOpenRouterModelCounts = visibleGeneralAiExperts.reduce((acc, expert) => {
  if (!expert.openrouterModel) return acc;
  acc[expert.openrouterModel] = [...(acc[expert.openrouterModel] ?? []), expert];
  return acc;
}, {});
const visibleGeneralDuplicateOpenRouterModels = Object.entries(visibleGeneralOpenRouterModelCounts)
  .filter(([, experts]) => experts.length > 1)
  .map(([openrouterModel, experts]) => ({
    openrouterModel,
    ids: experts.map((expert) => expert.id),
    names: experts.map((expert) => expert.name),
  }));
const visibleGeneralSelectionGroupQuality = selectionGroups
  .filter((group) => AI_GROUP_CATS.includes(group.cat))
  .map((group) => {
    const ids = group.items.map((expert) => expert.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const hiddenIds = ids.filter((id) => !visibleGeneralIdSet.has(id));
    const providerCounts = group.items.reduce((acc, expert) => {
      const provider = expert.modelInfo?.provider ?? 'missing';
      acc[provider] = (acc[provider] ?? 0) + 1;
      return acc;
    }, {});
    const maxProviderCount = Math.max(0, ...Object.values(providerCounts));
    const createdAt2025Count = group.items.filter((expert) => (expert.modelInfo?.createdAt ?? '') >= '2025-01-01').length;
    const createdAt2026Count = group.items.filter((expert) => (expert.modelInfo?.createdAt ?? '') >= '2026-01-01').length;
    return {
      cat: group.cat,
      label: group.label,
      count: ids.length,
      duplicateIds: [...new Set(duplicateIds)],
      hiddenIds,
      providerCounts,
      uniqueProviderCount: Object.keys(providerCounts).length,
      maxProviderShare: group.items.length > 0 ? maxProviderCount / group.items.length : 0,
      createdAt2025Count,
      createdAt2026Count,
      qualityRule: SELECTION_GROUP_QUALITY_RULES[group.cat] ?? null,
    };
  });

const missingAvatars = DEFAULT_EXPERTS.filter((expert) => {
  if (!expert.avatarUrl?.startsWith('/logos/')) return false;
  return !fs.existsSync(path.join(PUBLIC_DIR, expert.avatarUrl));
});

function readImageAssetInfo(avatarUrl) {
  if (!avatarUrl?.startsWith('/')) return { type: 'external-or-empty', width: 0, height: 0, bytes: 0 };
  const filePath = path.join(PUBLIC_DIR, avatarUrl);
  if (!fs.existsSync(filePath)) return { type: 'missing', width: 0, height: 0, bytes: 0 };
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 16) return { type: 'unknown', width: 0, height: 0, bytes: buffer.length };
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { type: 'png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), bytes: buffer.length };
  }
  if (buffer.slice(0, 2).equals(Buffer.from([0xff, 0xd8]))) {
    let offset = 2;
    while (offset < buffer.length - 9) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { type: 'jpeg', width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), bytes: buffer.length };
      }
      offset += 2 + length;
    }
    return { type: 'jpeg', width: 0, height: 0, bytes: buffer.length };
  }
  const head = buffer.slice(0, 500).toString('utf8');
  if (head.includes('<svg')) {
    const widthMatch = head.match(/width="([0-9.]+)/);
    const heightMatch = head.match(/height="([0-9.]+)/);
    const viewBoxMatch = head.match(/viewBox="[^"]*?([0-9.]+)\s+([0-9.]+)"/);
    return {
      type: 'svg',
      width: Number(widthMatch?.[1] ?? viewBoxMatch?.[1] ?? 0),
      height: Number(heightMatch?.[1] ?? viewBoxMatch?.[2] ?? 0),
      bytes: buffer.length,
    };
  }
  return { type: 'unknown', width: 0, height: 0, bytes: buffer.length };
}

const visibleGeneralAvatarAssetIssues = visibleGeneralAiExperts
  .map((expert) => ({
    id: expert.id,
    avatarUrl: expert.avatarUrl,
    asset: readImageAssetInfo(expert.avatarUrl),
  }))
  .filter(({ asset }) =>
    asset.type === 'missing'
    || asset.type === 'unknown'
    || asset.width < MIN_AVATAR_DIMENSION
    || asset.height < MIN_AVATAR_DIMENSION
    || asset.bytes <= 0);

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
const generatedAwkwardCopyPatterns = OPENROUTER_ADDED_EXPERTS.flatMap((expert) => {
  const fields = [
    ['description', expert.description],
    ['quote', expert.quote],
    ['greeting', expert.greeting],
    ...(expert.sampleQuestions ?? []).map((question, index) => [`sampleQuestions[${index}]`, question]),
  ];
  return fields
    .filter(([, value]) => AWKWARD_COPY_PATTERN.test(value ?? ''))
    .map(([field, value]) => ({
      id: expert.id,
      field,
      value,
    }));
});
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
  visibleGeneralCount: visibleGeneralAiExperts.length,
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
  visibleGeneralProviderCoverage: {
    requiredProviders: REQUIRED_VISIBLE_GENERAL_PROVIDERS,
    providerCounts: visibleGeneralProviderCounts,
    missingRequiredProviders: visibleGeneralMajorProviderMissing,
  },
  visibleGeneralTagDiversity: {
    totalTags: visibleGeneralTags.length,
    uniqueTags: Object.keys(visibleGeneralTagCounts).length,
    topTags: visibleGeneralTopTags,
    overHalfTags: visibleGeneralOverHalfTags,
    invalidTagCount: visibleGeneralInvalidTags.length,
    invalidTags: visibleGeneralInvalidTags,
    metadataMismatchCount: visibleGeneralTagMetadataMismatches.length,
    metadataMismatches: visibleGeneralTagMetadataMismatches,
  },
  visibleGeneralAbilityQuality: {
    missingAbilityCount: visibleGeneralMissingAbilities.length,
    missingAbilityIds: visibleGeneralMissingAbilities.map((expert) => expert.id),
    ranges: visibleGeneralAbilityRanges,
  },
  visibleGeneralCopyCompleteness: {
    missingGreetingCount: visibleGeneralMissingGreeting.length,
    missingGreetingIds: visibleGeneralMissingGreeting.map((expert) => expert.id),
    staleGreetingNameCount: visibleGeneralStaleGreetingNames.length,
    staleGreetingNames: visibleGeneralStaleGreetingNames.map((expert) => ({
      id: expert.id,
      name: expert.nameKo || expert.name,
      greeting: expert.greeting,
    })),
    missingQuoteCount: visibleGeneralMissingQuotes.length,
    missingQuoteIds: visibleGeneralMissingQuotes.map((expert) => expert.id),
    tooShortQuoteCount: visibleGeneralTooShortQuotes.length,
    tooShortQuotes: visibleGeneralTooShortQuotes.map((expert) => ({
      id: expert.id,
      quote: expert.quote,
    })),
    awkwardCopyPatternCount: visibleGeneralAwkwardCopyPatterns.length,
    awkwardCopyPatterns: visibleGeneralAwkwardCopyPatterns.slice(0, 20),
  },
  visibleGeneralRuntimePromptQuality: {
    missingRuntimePromptCount: visibleGeneralMissingRuntimePrompts.length,
    missingRuntimePrompts: visibleGeneralMissingRuntimePrompts.map(({ expert, prompt }) => ({
      id: expert.id,
      promptLength: prompt.length,
    })),
    missingIdentityCount: visibleGeneralRuntimePromptMissingIdentity.length,
    missingIdentity: visibleGeneralRuntimePromptMissingIdentity.map(({ expert, prompt }) => ({
      id: expert.id,
      name: expert.nameKo || expert.name,
      provider: expert.modelInfo?.provider,
      promptStart: prompt.slice(0, 140),
    })),
  },
  visibleGeneralExplorerFilterCoverage,
  visibleGeneralNewFilterQuality: {
    count: visibleGeneralNewFilterModels.length,
    uniqueProviderCount: visibleGeneralNewFilterProviderCount,
    olderModelCount: visibleGeneralNewFilterOlderModels.length,
    olderModels: visibleGeneralNewFilterOlderModels.map((expert) => ({
      id: expert.id,
      name: expert.nameKo || expert.name,
      createdAt: expert.modelInfo?.createdAt,
      provider: expert.modelInfo?.provider,
    })),
    missingConfiguredIds: visibleGeneralNewFilterMissingIds,
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
  visibleGeneralDuplicateOpenRouterModelCount: visibleGeneralDuplicateOpenRouterModels.length,
  visibleGeneralDuplicateOpenRouterModels,
  visibleGeneralSelectionGroupQuality,
  persistedMergeSafety: {
    mergedVisibleGeneralCount: persistedMergeVisibleGeneral.length,
    stalePersistedAiRetainedCount: persistedMergeStaleAiRetained.length,
    stalePersistedAiRetainedIds: persistedMergeStaleAiRetained.map((expert) => expert.id),
    customPersistedRetainedCount: persistedMergeCustomRetained.length,
    customPersistedRetainedIds: persistedMergeCustomRetained.map((expert) => expert.id),
  },
  missingAvatarCount: missingAvatars.length,
  missingAvatars: missingAvatars.map((expert) => ({ id: expert.id, avatarUrl: expert.avatarUrl })),
  visibleGeneralAvatarAssetIssueCount: visibleGeneralAvatarAssetIssues.length,
  visibleGeneralAvatarAssetIssues,
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
    awkwardCopyPatternCount: generatedAwkwardCopyPatterns.length,
    awkwardCopyPatterns: generatedAwkwardCopyPatterns.slice(0, 20),
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

const compactSummary = {
  aiCount: summary.aiCount,
  addedOpenRouterCount: summary.addedOpenRouterCount,
  visibleGeneralCount: visibleGeneralAiExperts.length,
  visibleGeneralNonTextOutputModelCount: summary.visibleGeneralNonTextOutputModelCount,
  visibleGeneralRoleplayHeavyModelCount: summary.visibleGeneralRoleplayHeavyModelCount,
  visibleGeneralDuplicateOpenRouterModelCount: summary.visibleGeneralDuplicateOpenRouterModelCount,
  missingAvatarCount: summary.missingAvatarCount,
  visibleGeneralAvatarAssetIssueCount: summary.visibleGeneralAvatarAssetIssueCount,
  badTextAiCount: summary.badTextAiCount,
  avatarProviderMismatchCount: summary.avatarProviderMismatchCount,
  metadataQuality: {
    missingCreatedAtCount: summary.visibleGeneralMetadataQuality.missingCreatedAtCount,
    invalidCreatedAtCount: summary.visibleGeneralMetadataQuality.invalidCreatedAtCount,
    futureCreatedAtCount: summary.visibleGeneralMetadataQuality.futureCreatedAtCount,
    missingContextLengthCount: summary.visibleGeneralMetadataQuality.missingContextLengthCount,
    missingPriceTierCount: summary.visibleGeneralMetadataQuality.missingPriceTierCount,
  },
  providerCoverage: {
    requiredProviderCount: summary.visibleGeneralProviderCoverage.requiredProviders.length,
    missingRequiredProviders: summary.visibleGeneralProviderCoverage.missingRequiredProviders,
    topProviders: Object.entries(summary.visibleGeneralProviderCoverage.providerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([provider, count]) => ({ provider, count })),
  },
  tagDiversity: {
    totalTags: summary.visibleGeneralTagDiversity.totalTags,
    uniqueTags: summary.visibleGeneralTagDiversity.uniqueTags,
    topTags: summary.visibleGeneralTagDiversity.topTags.slice(0, 12),
    overHalfTags: summary.visibleGeneralTagDiversity.overHalfTags,
    invalidTagCount: summary.visibleGeneralTagDiversity.invalidTagCount,
    invalidTags: summary.visibleGeneralTagDiversity.invalidTags,
    metadataMismatchCount: summary.visibleGeneralTagDiversity.metadataMismatchCount,
    metadataMismatches: summary.visibleGeneralTagDiversity.metadataMismatches,
  },
  abilityQuality: {
    missingAbilityCount: summary.visibleGeneralAbilityQuality.missingAbilityCount,
    ranges: summary.visibleGeneralAbilityQuality.ranges,
  },
  copyDiversity: {
    uniqueDescriptionSkeletons: summary.generatedCopyDiversity.uniqueDescriptionSkeletons,
    maxDescriptionSkeletonRepeat: summary.generatedCopyDiversity.maxDescriptionSkeletonRepeat,
    uniqueSampleQuestions: summary.generatedCopyDiversity.uniqueSampleQuestions,
    uniqueQuotes: summary.generatedCopyDiversity.uniqueQuotes,
    modelSpecificQuestionCount: summary.generatedCopyDiversity.modelSpecificQuestionCount,
    awkwardCopyPatternCount: summary.generatedCopyDiversity.awkwardCopyPatternCount,
  },
  copyCompleteness: {
    missingGreetingCount: summary.visibleGeneralCopyCompleteness.missingGreetingCount,
    staleGreetingNameCount: summary.visibleGeneralCopyCompleteness.staleGreetingNameCount,
    missingQuoteCount: summary.visibleGeneralCopyCompleteness.missingQuoteCount,
    tooShortQuoteCount: summary.visibleGeneralCopyCompleteness.tooShortQuoteCount,
    awkwardCopyPatternCount: summary.visibleGeneralCopyCompleteness.awkwardCopyPatternCount,
  },
  runtimePromptQuality: {
    missingRuntimePromptCount: summary.visibleGeneralRuntimePromptQuality.missingRuntimePromptCount,
    missingIdentityCount: summary.visibleGeneralRuntimePromptQuality.missingIdentityCount,
  },
  persistedMergeSafety: {
    mergedVisibleGeneralCount: summary.persistedMergeSafety.mergedVisibleGeneralCount,
    stalePersistedAiRetainedCount: summary.persistedMergeSafety.stalePersistedAiRetainedCount,
    customPersistedRetainedCount: summary.persistedMergeSafety.customPersistedRetainedCount,
  },
  explorerFilterCoverage: summary.visibleGeneralExplorerFilterCoverage,
  newFilterQuality: summary.visibleGeneralNewFilterQuality,
  filterBuckets: summary.visibleGeneralFilterBuckets,
  selectionGroups: summary.visibleGeneralSelectionGroupQuality.map((group) => ({
    cat: group.cat,
    count: group.count,
    uniqueProviderCount: group.uniqueProviderCount,
    maxProviderShare: Number(group.maxProviderShare.toFixed(3)),
    createdAt2025Count: group.createdAt2025Count,
    createdAt2026Count: group.createdAt2026Count,
    duplicateCount: group.duplicateIds.length,
    hiddenCount: group.hiddenIds.length,
  })),
};

console.log(JSON.stringify(compactOutput ? compactSummary : summary, null, 2));

const detailFilterCounts = summary.visibleGeneralExplorerFilterCoverage.detail;
const filterBucketCounts = summary.visibleGeneralFilterBuckets;
const expectedDetailFilterCounts = {
  'price-free': filterBucketCounts.priceTier.free ?? 0,
  'price-low': filterBucketCounts.priceTier.low ?? 0,
  'price-standard': filterBucketCounts.priceTier.standard ?? 0,
  'price-premium': filterBucketCounts.priceTier.premium ?? 0,
  'context-xl': filterBucketCounts.context.xl ?? 0,
  'context-long': filterBucketCounts.context.long ?? 0,
  'context-standard': filterBucketCounts.context.standard ?? 0,
  'input-text': filterBucketCounts.input.textOnly ?? 0,
  'input-vision': filterBucketCounts.input.image ?? 0,
  'input-file': filterBucketCounts.input.file ?? 0,
  'input-audio-video': filterBucketCounts.input.audioVideo ?? 0,
};
const mismatchedDetailFilterCounts = Object.entries(expectedDetailFilterCounts)
  .filter(([id, expected]) => detailFilterCounts[id] !== expected)
  .map(([id, expected]) => ({ id, expected, actual: detailFilterCounts[id] ?? 0 }));

const failedChecks = [
  summary.addedOpenRouterCount === 200 ? null : `expected 200 added OpenRouter models, got ${summary.addedOpenRouterCount}`,
  summary.visibleGeneralImageVideoOutputModelCount === 0
    ? null
    : `visible general catalog includes ${summary.visibleGeneralImageVideoOutputModelCount} image/video output models`,
  summary.visibleGeneralNonTextOutputModelCount === 0
    ? null
    : `visible general catalog includes ${summary.visibleGeneralNonTextOutputModelCount} non-text output models`,
  summary.visibleGeneralRoleplayHeavyModelCount === 0
    ? null
    : `visible general catalog includes ${summary.visibleGeneralRoleplayHeavyModelCount} roleplay-heavy models`,
  summary.visibleGeneralMetadataQuality.missingCreatedAtCount === 0
    ? null
    : `visible general catalog has ${summary.visibleGeneralMetadataQuality.missingCreatedAtCount} models without createdAt`,
  summary.visibleGeneralMetadataQuality.invalidCreatedAtCount === 0
    ? null
    : `visible general catalog has ${summary.visibleGeneralMetadataQuality.invalidCreatedAtCount} invalid createdAt values`,
  summary.visibleGeneralMetadataQuality.futureCreatedAtCount === 0
    ? null
    : `visible general catalog has ${summary.visibleGeneralMetadataQuality.futureCreatedAtCount} future createdAt values`,
  summary.visibleGeneralMetadataQuality.missingContextLengthCount === 0
    ? null
    : `visible general catalog has ${summary.visibleGeneralMetadataQuality.missingContextLengthCount} models without context length`,
  summary.visibleGeneralMetadataQuality.missingPriceTierCount === 0
    ? null
    : `visible general catalog has ${summary.visibleGeneralMetadataQuality.missingPriceTierCount} models without price tier`,
  summary.visibleGeneralDuplicateOpenRouterModelCount === 0
    ? null
    : `visible general catalog has ${summary.visibleGeneralDuplicateOpenRouterModelCount} duplicate OpenRouter model ids`,
  summary.visibleGeneralProviderCoverage.missingRequiredProviders.length === 0
    ? null
    : `visible general catalog is missing required providers: ${summary.visibleGeneralProviderCoverage.missingRequiredProviders.join(', ')}`,
  summary.visibleGeneralTagDiversity.uniqueTags >= 14
    ? null
    : `visible general catalog only has ${summary.visibleGeneralTagDiversity.uniqueTags} unique tags`,
  summary.visibleGeneralTagDiversity.overHalfTags.length === 0
    ? null
    : `visible general catalog has over-repeated tags: ${summary.visibleGeneralTagDiversity.overHalfTags.map((item) => item.tag).join(', ')}`,
  summary.visibleGeneralTagDiversity.invalidTagCount === 0
    ? null
    : `visible general catalog has invalid tags: ${summary.visibleGeneralTagDiversity.invalidTags.map((item) => `${item.id}:${item.tag}`).join(', ')}`,
  summary.visibleGeneralTagDiversity.metadataMismatchCount === 0
    ? null
    : `visible general catalog has tag metadata mismatches: ${summary.visibleGeneralTagDiversity.metadataMismatches.map((item) => `${item.id}:${item.tag}`).join(', ')}`,
  mismatchedDetailFilterCounts.length === 0
    ? null
    : `visible general detail filter counts do not match model metadata buckets: ${mismatchedDetailFilterCounts.map((item) => `${item.id} expected ${item.expected} got ${item.actual}`).join('; ')}`,
  (detailFilterCounts['speed-fast'] ?? 0) + (detailFilterCounts['speed-normal'] ?? 0) === summary.visibleGeneralCount
    ? null
    : `visible general speed filter counts do not cover the catalog: fast ${detailFilterCounts['speed-fast'] ?? 0} + normal ${detailFilterCounts['speed-normal'] ?? 0} != ${summary.visibleGeneralCount}`,
  summary.visibleGeneralNewFilterQuality.missingConfiguredIds.length === 0
    ? null
    : `new model quick filter references hidden or missing ids: ${summary.visibleGeneralNewFilterQuality.missingConfiguredIds.join(', ')}`,
  summary.visibleGeneralNewFilterQuality.olderModelCount === 0
    ? null
    : `new model quick filter includes older models: ${summary.visibleGeneralNewFilterQuality.olderModels.map((item) => `${item.id}:${item.createdAt}`).join(', ')}`,
  summary.visibleGeneralNewFilterQuality.uniqueProviderCount >= 8
    ? null
    : `new model quick filter only covers ${summary.visibleGeneralNewFilterQuality.uniqueProviderCount} providers`,
  summary.visibleGeneralAbilityQuality.missingAbilityCount === 0
    ? null
    : `visible general catalog has ${summary.visibleGeneralAbilityQuality.missingAbilityCount} models without ability stats`,
  ...Object.entries(summary.visibleGeneralAbilityQuality.ranges).flatMap(([key, range]) => [
    range.count === summary.visibleGeneralCount ? null : `${key} ability is missing on ${summary.visibleGeneralCount - range.count} visible general models`,
    range.min >= 0 && range.max <= 100 ? null : `${key} ability range is out of bounds: ${range.min}-${range.max}`,
    range.unique >= 12 ? null : `${key} ability only has ${range.unique} unique values`,
  ]),
  summary.missingAvatarCount === 0 ? null : `catalog has ${summary.missingAvatarCount} missing local avatars`,
  summary.visibleGeneralAvatarAssetIssueCount === 0
    ? null
    : `visible general catalog has ${summary.visibleGeneralAvatarAssetIssueCount} invalid avatar assets`,
  summary.badTextAiCount === 0 ? null : `AI catalog has ${summary.badTextAiCount} mojibake text entries`,
  summary.badGenericAvatarCount === 0 ? null : `AI catalog has ${summary.badGenericAvatarCount} generic router avatars`,
  summary.avatarProviderMismatchCount === 0
    ? null
    : `generated OpenRouter catalog has ${summary.avatarProviderMismatchCount} provider/avatar mismatches`,
  summary.generatedCopyDiversity.uniqueDescriptions === summary.addedOpenRouterCount
    ? null
    : 'generated OpenRouter model descriptions are not unique',
  summary.generatedCopyDiversity.uniqueDescriptionSkeletons >= 70
    ? null
    : `generated descriptions only have ${summary.generatedCopyDiversity.uniqueDescriptionSkeletons} skeletons`,
  summary.generatedCopyDiversity.maxDescriptionSkeletonRepeat <= 10
    ? null
    : `generated description skeleton repeats ${summary.generatedCopyDiversity.maxDescriptionSkeletonRepeat} times`,
  summary.generatedCopyDiversity.awkwardProviderParticleQuestionCount === 0
    ? null
    : `generated questions contain ${summary.generatedCopyDiversity.awkwardProviderParticleQuestionCount} awkward provider particles`,
  summary.generatedCopyDiversity.awkwardCopyPatternCount === 0
    ? null
    : `generated copy contains ${summary.generatedCopyDiversity.awkwardCopyPatternCount} awkward repeated patterns`,
  summary.generatedCopyDiversity.uniqueQuotes === summary.addedOpenRouterCount
    ? null
    : 'generated OpenRouter model quotes are not unique',
  summary.generatedCopyDiversity.modelSpecificQuestionCount === summary.addedOpenRouterCount
    ? null
    : 'not every generated model has a model/provider-specific question',
  summary.visibleGeneralCopyCompleteness.missingGreetingCount === 0
    ? null
    : `visible general catalog has ${summary.visibleGeneralCopyCompleteness.missingGreetingCount} models without greetings`,
  summary.visibleGeneralCopyCompleteness.staleGreetingNameCount === 0
    ? null
    : `visible general catalog has ${summary.visibleGeneralCopyCompleteness.staleGreetingNameCount} stale greeting model names`,
  summary.visibleGeneralCopyCompleteness.missingQuoteCount === 0
    ? null
    : `visible general catalog has ${summary.visibleGeneralCopyCompleteness.missingQuoteCount} models without quotes`,
  summary.visibleGeneralCopyCompleteness.tooShortQuoteCount === 0
    ? null
    : `visible general catalog has ${summary.visibleGeneralCopyCompleteness.tooShortQuoteCount} quotes shorter than 6 characters`,
  summary.visibleGeneralCopyCompleteness.awkwardCopyPatternCount === 0
    ? null
    : `visible general catalog has ${summary.visibleGeneralCopyCompleteness.awkwardCopyPatternCount} awkward copy patterns`,
  summary.visibleGeneralRuntimePromptQuality.missingRuntimePromptCount === 0
    ? null
    : `visible general catalog has ${summary.visibleGeneralRuntimePromptQuality.missingRuntimePromptCount} missing runtime prompts`,
  summary.visibleGeneralRuntimePromptQuality.missingIdentityCount === 0
    ? null
    : `visible general catalog has ${summary.visibleGeneralRuntimePromptQuality.missingIdentityCount} runtime prompts without model identity`,
  summary.persistedMergeSafety.mergedVisibleGeneralCount === summary.visibleGeneralCount
    ? null
    : `persisted expert merge changes visible general model count to ${summary.persistedMergeSafety.mergedVisibleGeneralCount}`,
  summary.persistedMergeSafety.stalePersistedAiRetainedCount === 0
    ? null
    : `persisted expert merge retained stale AI ids: ${summary.persistedMergeSafety.stalePersistedAiRetainedIds.join(', ')}`,
  summary.persistedMergeSafety.customPersistedRetainedCount === 1
    ? null
    : `persisted expert merge failed to retain custom non-AI experts`,
  ...Object.entries(summary.visibleGeneralExplorerFilterCoverage.quick).flatMap(([id, count]) => [
    count >= 5 ? null : `general quick filter ${id} only matches ${count} models`,
    count <= Math.ceil(summary.visibleGeneralCount * 0.55) ? null : `general quick filter ${id} is too broad with ${count} models`,
  ]),
  ...Object.entries(summary.visibleGeneralExplorerFilterCoverage.trait).flatMap(([id, count]) => [
    count >= 5 ? null : `general trait filter ${id} only matches ${count} models`,
    count <= Math.ceil(summary.visibleGeneralCount * 0.55) ? null : `general trait filter ${id} is too broad with ${count} models`,
  ]),
  ...Object.entries(summary.visibleGeneralExplorerFilterCoverage.detail).map(([id, count]) => (
    count > 0 ? null : `general detail filter ${id} matches no models`
  )),
  summary.generatedTagCoverage.openWeightTagMissingCount === 0
    ? null
    : `${summary.generatedTagCoverage.openWeightTagMissingCount} open-weight models are missing the open-weight tag`,
  ...summary.visibleGeneralSelectionGroupQuality.flatMap((group) => [
    group.duplicateIds.length === 0 ? null : `${group.cat} has duplicate ids: ${group.duplicateIds.join(', ')}`,
    group.hiddenIds.length === 0 ? null : `${group.cat} exposes hidden ids: ${group.hiddenIds.join(', ')}`,
    !group.qualityRule || group.uniqueProviderCount >= group.qualityRule.minProviderCount
      ? null
      : `${group.cat} only has ${group.uniqueProviderCount} providers`,
    !group.qualityRule || group.maxProviderShare <= group.qualityRule.maxProviderShare
      ? null
      : `${group.cat} max provider share is ${(group.maxProviderShare * 100).toFixed(1)}%`,
    !group.qualityRule || group.createdAt2025Count >= Math.ceil(group.count * group.qualityRule.minCreatedAt2025Share)
      ? null
      : `${group.cat} only has ${group.createdAt2025Count} models from 2025 or newer`,
    !group.qualityRule || group.createdAt2026Count >= group.qualityRule.minCreatedAt2026Count
      ? null
      : `${group.cat} only has ${group.createdAt2026Count} models from 2026 or newer`,
  ]),
].filter(Boolean);

if (failedChecks.length > 0) {
  console.error(`\nModel catalog audit failed:\n- ${failedChecks.join('\n- ')}`);
  process.exitCode = 1;
}
