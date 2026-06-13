import fs from 'node:fs';

const ADDED_PATH = 'src/data/openrouter-added-models.ts';
const EXPERT_PATH = 'src/types/expert.ts';
const ARTIFICIAL_ANALYSIS_MODELS_URL = 'https://artificialanalysis.ai/leaderboards/models';
const STAT_KEYS = ['coding', 'creativity', 'reasoning', 'math', 'multilingual', 'speed', 'costEfficiency', 'contextWindow'];
const EXISTING_IDS = [
  'gpt',
  'gpt-mini',
  'gpt-nano',
  'claude',
  'claude-sonnet',
  'claude-sonnet-4.6',
  'claude-haiku',
  'gemini',
  'gemini-3-flash',
  'gemini-3.1',
  'gemini-pro',
  'gemini-flash-lite',
  'perplexity',
  'perplexity-pro',
  'grok',
  'grok-4.2',
  'deepseek',
  'deepseek-r1',
  'qwen',
  'qwen-9b',
  'qwen-plus',
  'qwen-thinking',
  'llama-maverick',
  'llama-scout',
  'mistral-large',
  'mistral-medium',
  'mistral-small',
  'codestral',
  'devstral',
  'gemma',
  'phi',
  'command-r-plus',
  'command-a',
  'nova-premier',
  'nova-2-lite',
  'dolphin',
  'glm',
  'mimo',
  'mimo-flash',
  'nemotron',
  'seed',
  'seed-mini',
  'minimax',
  'kimi',
  'kimi-thinking',
  'solar',
  'mercury',
  'hunyuan',
  'jamba',
  'granite',
  'step',
  'palmyra',
  'hermes',
];

const CODING_SCORE_OVERRIDES = {
  'or-arcee-ai-coder-large': 78,
};

function parseConstArray(source, marker, suffix) {
  const start = source.indexOf(marker);
  const jsonStart = source.indexOf('[', start);
  const jsonEnd = source.indexOf(suffix, jsonStart);
  if (start < 0 || jsonStart < 0 || jsonEnd < 0) throw new Error(`Could not parse ${marker}`);
  return JSON.parse(source.slice(jsonStart, jsonEnd + 1));
}

function parseConstObject(source, marker, suffix) {
  const start = source.indexOf(marker);
  const objectStart = source.indexOf('{', start);
  const objectEnd = source.indexOf(suffix, objectStart);
  if (start < 0 || objectStart < 0 || objectEnd < 0) throw new Error(`Could not parse ${marker}`);
  return JSON.parse(source.slice(objectStart, objectEnd + 1));
}

function clamp(value, min = 35, max = 98) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function scaleArtificialAnalysisIndex(value, max = 65) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return clamp(45 + (Math.max(0, value) / max) * 53, 45, 98);
}

function scaleArtificialAnalysisRatio(value, max) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return clamp(45 + (Math.max(0, value) / max) * 53, 45, 98);
}

function scaleArtificialAnalysisSpeed(tokensPerSecond, latencySeconds) {
  if (typeof tokensPerSecond !== 'number' || Number.isNaN(tokensPerSecond)) return null;
  const outputScore = 45 + (Math.log1p(Math.max(0, tokensPerSecond)) / Math.log1p(750)) * 53;
  const latencyScore = typeof latencySeconds === 'number' && !Number.isNaN(latencySeconds)
    ? 98 - (Math.log1p(Math.max(0, latencySeconds)) / Math.log1p(30)) * 35
    : outputScore;
  return clamp(outputScore * 0.78 + latencyScore * 0.22, 45, 98);
}

function scaleArtificialAnalysisCost(blendedPrice) {
  if (typeof blendedPrice !== 'number' || Number.isNaN(blendedPrice) || blendedPrice <= 0) return null;
  const minPrice = 0.01;
  const maxPrice = 20;
  const normalized = Math.log(Math.max(minPrice, blendedPrice) / minPrice) / Math.log(maxPrice / minPrice);
  return clamp(98 - normalized * 53, 45, 98);
}

function contextScore(contextLength = 0) {
  if (contextLength >= 1_000_000) return 98;
  if (contextLength >= 512_000) return 94;
  if (contextLength >= 262_144) return 88;
  if (contextLength >= 131_072) return 78;
  if (contextLength >= 65_536) return 68;
  if (contextLength >= 32_768) return 58;
  return 45;
}

function textFor(expert) {
  return `${expert.id} ${expert.name ?? ''} ${expert.nameKo ?? ''} ${expert.openrouterModel ?? ''} ${expert.modelInfo?.provider ?? ''}`.toLowerCase();
}

function normalizeModelKey(value = '') {
  return value
    .toLowerCase()
    .replace(/:free\b/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(?:high|medium|low|xhigh|max|adaptive|reasoning|non|with|fallback|preview|instruct|chat|pro)\b/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeOpenRouterModel(value = '') {
  return value.toLowerCase().replace(/:free\b/g, '');
}

function parseEscapedJsonArrayFromHtml(html, markerIndex) {
  const start = html.indexOf('[', markerIndex);
  let depth = 0;
  let end = -1;
  let inString = false;
  let escaped = false;

  for (let index = start; index < html.length; index += 1) {
    const char = html[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }

  if (start < 0 || end < 0) return null;
  const escapedJson = html.slice(start, end + 1)
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\\//g, '/');
  return JSON.parse(escapedJson);
}

async function loadArtificialAnalysisMetrics() {
  const html = await fetch(ARTIFICIAL_ANALYSIS_MODELS_URL).then((response) => {
    if (!response.ok) throw new Error(`Artificial Analysis request failed: ${response.status}`);
    return response.text();
  });
  const marker = '\\"models\\":[';
  const arrays = [];
  let markerIndex = 0;
  while ((markerIndex = html.indexOf(marker, markerIndex)) >= 0) {
    const parsed = parseEscapedJsonArrayFromHtml(html, markerIndex);
    if (parsed) arrays.push(parsed);
    markerIndex += marker.length;
  }
  const models = arrays.find((items) => items[0]?.intelligenceIndex !== undefined) ?? [];
  const byOpenRouter = new Map();
  const bySlug = new Map();
  const byName = new Map();
  const preferStrongerMetric = (map, key, model) => {
    if (!key) return;
    const current = map.get(key);
    const currentScore = current?.intelligenceIndex ?? -1;
    const nextScore = model.intelligenceIndex ?? -1;
    if (!current || nextScore > currentScore) {
      map.set(key, model);
    }
  };

  for (const model of models) {
    if (model.openrouterApiId) {
      preferStrongerMetric(byOpenRouter, normalizeOpenRouterModel(model.openrouterApiId), model);
    }
    if (model.slug) preferStrongerMetric(bySlug, normalizeModelKey(model.slug), model);
    [model.name, model.shortName].filter(Boolean).forEach((name) => {
      const key = normalizeModelKey(name);
      preferStrongerMetric(byName, key, model);
    });
  }

  return { models, byOpenRouter, bySlug, byName };
}

function artificialAnalysisMetricFor(expert, artificialAnalysis) {
  const openrouterModel = normalizeOpenRouterModel(expert.openrouterModel ?? '');
  if (openrouterModel && artificialAnalysis.byOpenRouter.has(openrouterModel)) {
    return artificialAnalysis.byOpenRouter.get(openrouterModel);
  }

  const modelPart = openrouterModel.split('/').pop() ?? '';
  const slugKey = normalizeModelKey(modelPart.replaceAll('.', '-'));
  if (slugKey && artificialAnalysis.bySlug.has(slugKey)) {
    return artificialAnalysis.bySlug.get(slugKey);
  }

  const nameKey = normalizeModelKey(expert.name ?? expert.nameKo ?? '');
  if (nameKey && artificialAnalysis.byName.has(nameKey)) {
    return artificialAnalysis.byName.get(nameKey);
  }

  const looseName = [...artificialAnalysis.byName.entries()].find(([key]) => key && nameKey && (key.includes(nameKey) || nameKey.includes(key)));
  return looseName?.[1] ?? null;
}

function sizePenalty(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*b\b/);
  if (!match) return 0;
  const size = Number(match[1]);
  if (size >= 400) return -2;
  if (size >= 100) return -2;
  if (size <= 4) return -12;
  if (size <= 9) return -8;
  if (size <= 14) return -5;
  return 0;
}

function speedSizeImpact(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*b\b/);
  if (!match) return 0;
  const size = Number(match[1]);
  if (size >= 400) return -18;
  if (size >= 100) return -12;
  if (size >= 30) return -6;
  if (size <= 4) return 10;
  if (size <= 9) return 7;
  if (size <= 14) return 4;
  return 0;
}

function recencyQualityAdjustment(createdAt = '') {
  if (createdAt >= '2026-05-01') return 4;
  if (createdAt >= '2026-01-01') return 3;
  if (createdAt >= '2025-10-01') return 2;
  if (createdAt >= '2025-01-01') return 0;
  if (createdAt >= '2024-01-01') return -4;
  if (createdAt) return -8;
  return 0;
}

function familyBase(text, provider) {
  if (/gpt-5.*nano|gpt-5.*mini/.test(text)) return /nano/.test(text) ? 78 : 84;
  if (/gpt-5.*codex/.test(text)) return 92;
  if (/gpt-5-pro|gpt-5\.?2-pro|gpt-5/.test(text)) return 96;
  if (/claude-fable-5|fable-5/.test(text)) return 97;
  if (/claude-opus-4|claude/.test(text) && /opus/.test(text)) return 96;
  if (/claude-sonnet-4|sonnet-4/.test(text)) return 93;
  if (/gemini.*(?:flash.*lite|lite)/.test(text)) return 78;
  if (/gemini.*flash/.test(text)) return 84;
  if (/gemini-3|gemini-2-5-pro|gemini.*pro/.test(text)) return 92;
  if (/grok-4|grok-4\.?3/.test(text)) return 91;
  if (/\/o1|\/o3|\/o4|openai-o1|openai-o3|openai-o4/.test(text)) return 94;
  if (/r1|qwq|thinking|reasoning/.test(text)) return 88;
  if (/deepseek-v4|deepseek-r1|kimi-k2|qwen3-max|qwen3-7-plus|glm-5/.test(text)) return 88;
  if (/gpt-4\.1.*nano|gpt-4o.*mini/.test(text)) return 72;
  if (/gpt-4\.1.*mini/.test(text)) return 80;
  if (/gpt-4\.1|gpt-4o|gpt-4-turbo/.test(text)) return 87;
  if (/mistral-large|mistral-medium|command-a|nova-premier/.test(text)) return 82;
  if (/cogito/.test(text)) return 82;
  if (/haiku|mini|nano|lite|small|flash/.test(text)) return 68;
  if (/llama|gemma|mistral|qwen|deepseek|glm|kimi|nemotron|hermes|cogito/.test(text)) return 76;
  if (/openai|anthropic|google/i.test(provider)) return 84;
  return 72;
}

function codingWorkBase(text) {
  if (/claude-fable-5|fable-5/.test(text)) return 100;
  if (/claude-opus-4-8/.test(text)) return 98;
  if (/claude-opus-4-7/.test(text)) return 97;
  if (/claude-opus-4-6/.test(text)) return 96;
  if (/claude-opus-4-5/.test(text)) return 95;
  if (/gpt-5.*nano/.test(text)) return 74;
  if (/gpt-5.*mini/.test(text)) return 80;
  if (/gpt-5.*codex/.test(text)) return 95;
  if (/claude-sonnet-4-6|sonnet-4\.6|sonnet 4\.6/.test(text)) return 94;
  if (/claude-sonnet-4-5|sonnet-4\.5|sonnet 4\.5/.test(text)) return 93;
  if (/gpt-5\.5|gpt-5-5/.test(text)) return 93;
  if (/gpt-5\.4|gpt-5-4/.test(text)) return 91;
  if (/gemini.*(?:flash.*lite|lite|flash-lite)/.test(text)) return 72;
  if (/gemini.*flash/.test(text)) return 84;
  if (/gemini-3|gemini-3\.1|gemini.*3.*pro/.test(text)) return 91;
  if (/qwen3.*coder|qwen3-coder|qwen-3-coder/.test(text)) return 90;
  if (/deepseek-v4|deepseek.*coder|deepseek.*pro/.test(text)) return 89;
  if (/codestral|devstral|morph|poolside/.test(text)) return 88;
  if (/arcee.*coder/.test(text)) return 74;
  if (/kimi-k2|glm-5|minimax-m3|grok-build/.test(text)) return 87;
  if (/gpt-5(?:\.|-)?.*(?:pro)?/.test(text)) return 87;
  if (/\/o3|openai-o3|\/o4|openai-o4/.test(text)) return 85;
  if (/\/o1|openai-o1/.test(text)) return 82;
  if (/claude-sonnet-4|sonnet-4/.test(text)) return 86;
  if (/gpt-4\.1|gpt-4o|gpt-4-turbo/.test(text)) return 80;
  if (/qwen3|max|qwen-plus|deepseek-r1|r1|qwq|thinking/.test(text)) return 79;
  if (/mistral-large|mistral-medium|command-a|nova-premier|grok-4/.test(text)) return 78;
  if (/coder|code|programming|software/.test(text)) return 78;
  if (/haiku|mini|nano|lite|small|flash|micro|1b|3b/.test(text)) return 62;
  return 68;
}

function codingWorkScore(expert, artificialAnalysisMetric = null) {
  const text = textFor(expert);
  const input = expert.modelInfo?.inputModalities ?? [];
  const output = expert.modelInfo?.outputModalities ?? [];
  const tier = expert.modelInfo?.priceTier ?? 'standard';
  const openWeight = Boolean(expert.modelInfo?.openWeight);
  const aaCoding = scaleArtificialAnalysisIndex(artificialAnalysisMetric?.codingIndex);
  const aaReasoning = scaleArtificialAnalysisIndex(artificialAnalysisMetric?.intelligenceIndex);
  const codingTag = /codex|coder|code|codestral|devstral|programming|software/.test(text);
  const reasoningOnlyTag = /\/o1|openai-o1|\/o3|openai-o3|\/o4|openai-o4|reasoning|thinking|qwq|r1/.test(text)
    && !codingTag
    && !/claude|sonnet|opus|fable|gpt-5/.test(text);
  const visionBonus = input.includes('image') ? 1.5 : 0;
  const fileBonus = input.includes('file') ? 1 : 0;
  const apiOnlyPenalty = output.some((item) => item !== 'text') ? -8 : 0;
  const recencyQuality = recencyQualityAdjustment(expert.modelInfo?.createdAt) * 0.7;
  const oldPenalty = /gpt-3-5|gpt-4\b|llama-3(?:-|\/)|gemma-2|2024|2023/.test(text) ? -6 : 0;
  const size = sizePenalty(text) * 0.6;
  const tierPenalty = tier === 'premium' ? 0 : tier === 'standard' ? -0.5 : 1;
  const fastVariantPenalty = /\bfast\b/.test(text) && /opus|sonnet|claude/.test(text) ? -2 : 0;
  const heuristic = codingWorkBase(text)
    + (codingTag ? 4 : 0)
    + (openWeight && codingTag ? 1.5 : 0)
    + visionBonus
    + fileBonus
    + apiOnlyPenalty
    + recencyQuality
    + oldPenalty
    + size
    + tierPenalty
    + fastVariantPenalty;

  if (aaCoding != null) {
    const aaBlend = heuristic * 0.78 + aaCoding * 0.22;
    return reasoningOnlyTag ? Math.min(aaBlend, 84) : aaBlend;
  }

  if (aaReasoning != null && reasoningOnlyTag) {
    return Math.min(heuristic * 0.85 + aaReasoning * 0.15, 84);
  }

  return heuristic;
}

function rawScores(expert, artificialAnalysisMetric = null) {
  const text = textFor(expert);
  const provider = expert.modelInfo?.provider ?? '';
  const tier = expert.modelInfo?.priceTier ?? 'standard';
  const contextLength = artificialAnalysisMetric?.contextWindowTokens ?? expert.modelInfo?.contextLength ?? 0;
  const recencyQuality = recencyQualityAdjustment(expert.modelInfo?.createdAt);
  const input = expert.modelInfo?.inputModalities ?? [];
  const output = expert.modelInfo?.outputModalities ?? [];
  const openWeight = Boolean(expert.modelInfo?.openWeight);
  const base = familyBase(text, provider);
  const size = sizePenalty(text);
  const latest = /2026|gpt-5|claude-(?:opus|sonnet|fable).*(?:4|5)|gemini-3|grok-4|deepseek-v4|qwen3|glm-5|minimax-m3/.test(text) ? 3 : 0;
  const old = /gpt-3-5|gpt-4\b|llama-3(?:-|\/)|gemma-2|mistral-large-2407|2024|2023/.test(text) ? -7 : 0;
  const reasoningTag = /reasoning|thinking|reasoner|r1|qwq|o1|o3|o4|opus|fable|pro/.test(text);
  const codingTag = /codex|coder|code|codestral|devstral|programming|software/.test(text);
  const searchTag = /search|sonar|perplexity|research/.test(text);
  const fastTag = /mini|nano|lite|flash|fast|small|haiku|turbo|micro|1b|3b|4b|7b|8b|9b/.test(text);
  const premiumPenalty = tier === 'premium' ? -7 : tier === 'standard' ? -2 : 3;
  const freeBoost = tier === 'free' ? 10 : tier === 'low' ? 6 : 0;
  const visionBonus = input.includes('image') ? 3 : 0;
  const fileBonus = input.includes('file') ? 2 : 0;
  const apiOnlyPenalty = output.some((item) => item !== 'text') ? -12 : 0;

  let reasoning = base + (reasoningTag ? 5 : 0) + latest + recencyQuality + old + size + apiOnlyPenalty;
  if (openWeight) reasoning -= 3;
  if (/intellect|olmo|lfm|rnj|reka|relace/.test(text)) reasoning -= 7;
  if (/distill/.test(text)) reasoning -= 8;
  if (/free/.test(text) && !/gpt-oss|deepseek|qwen/.test(text)) reasoning -= 3;

  let math = reasoning - 1 + (/deepseek|qwen|o1|o3|o4|r1|qwq|gemini.*pro|gpt-5/.test(text) ? 5 : 0);
  if (/creative|writer|story|dolphin|hermes/.test(text)) math -= 8;

  let creativity = base - 2 + (/claude|gpt|gemini|grok|writer|creative|story|hermes|dolphin|magnum|palmyra/.test(text) ? 8 : 0) + recencyQuality + old;
  if (codingTag && !/claude|gpt|gemini/.test(text)) creativity -= 5;
  if (fastTag) creativity -= 3;

  let multilingual = 66 + (/qwen|glm|kimi|moonshot|mistral|cohere|command|aya|hunyuan|baidu|tencent|solar|upstage/.test(text) ? 14 : 0);
  if (/gemini|gpt|claude/.test(text)) multilingual += 10;
  if (/korean|solar|upstage/.test(text)) multilingual += 8;
  if (/llama|gemma|phi|granite/.test(text)) multilingual += 3;

  let speed = 58 + (fastTag ? 24 : 0) + freeBoost * 0.45 + speedSizeImpact(text) - (reasoningTag ? 6 : 0) + premiumPenalty;
  if (/opus|pro|max|671b|550b|405b|235b|120b/.test(text)) speed -= 12;
  if (/sonar|search/.test(text)) speed -= 4;

  let costEfficiency = 58 + freeBoost + (tier === 'premium' ? -18 : tier === 'standard' ? -4 : 0) + (fastTag ? 9 : 0);
  if (openWeight) costEfficiency += 7;
  if (/opus|gpt-5-pro|premium|max|671b|550b|405b/.test(text)) costEfficiency -= 10;

  if (searchTag) {
    reasoning += 1;
    creativity -= 4;
    costEfficiency -= tier === 'premium' ? 5 : 0;
  }

  if (!artificialAnalysisMetric) {
    reasoning -= 6;
    math -= 4;
    creativity -= 2;
    if (/cogito|r1-distill|distill|experimental|preview|free/.test(text)) {
      reasoning -= 8;
      math -= 6;
    }
  }

  const aaReasoning = scaleArtificialAnalysisIndex(artificialAnalysisMetric?.intelligenceIndex);
  const scienceScores = [
    scaleArtificialAnalysisRatio(artificialAnalysisMetric?.hle, 0.55),
    scaleArtificialAnalysisRatio(artificialAnalysisMetric?.gpqa, 0.93),
    scaleArtificialAnalysisRatio(artificialAnalysisMetric?.critpt, 0.3),
    scaleArtificialAnalysisRatio(artificialAnalysisMetric?.scicode, 0.62),
    scaleArtificialAnalysisRatio(artificialAnalysisMetric?.lcr, 0.72),
  ].filter((value) => typeof value === 'number');
  const aaMath = scienceScores.length > 0
    ? scienceScores.reduce((sum, value) => sum + value, 0) / scienceScores.length
    : null;
  const aaSpeed = scaleArtificialAnalysisSpeed(
    artificialAnalysisMetric?.medianOutputTokensPerSecond,
    artificialAnalysisMetric?.medianTimeToFirstTokenSeconds,
  );
  const aaCost = scaleArtificialAnalysisCost(artificialAnalysisMetric?.price1mBlended7To2To1);
  const intelligenceBackbone = aaReasoning ?? reasoning;

  return {
    coding: codingWorkScore(expert, artificialAnalysisMetric),
    creativity: artificialAnalysisMetric
      ? intelligenceBackbone * 0.62 + creativity * 0.38 + visionBonus
      : creativity + visionBonus,
    reasoning: aaReasoning ?? reasoning,
    math: aaMath ? aaMath * 0.62 + intelligenceBackbone * 0.38 : math,
    multilingual,
    speed: aaSpeed ?? speed,
    costEfficiency: aaCost ?? costEfficiency,
    contextWindow: contextScore(contextLength),
  };
}

function rankToScores(experts, rawById, key) {
  if (key === 'contextWindow') {
    return new Map(experts.map((expert) => [expert.id, clamp(rawById[expert.id][key], 35, 98)]));
  }
  const sorted = [...experts].sort((a, b) => {
    const delta = rawById[b.id][key] - rawById[a.id][key];
    if (delta !== 0) return delta;
    return a.nameKo.localeCompare(b.nameKo, 'ko');
  });
  const maxRank = Math.max(1, sorted.length - 1);
  return new Map(sorted.map((expert, index) => {
    const percentile = index / maxRank;
    const score = key === 'coding'
      ? 98 - Math.pow(percentile, 0.72) * 47
      : 98 - percentile * 47;
    return [expert.id, clamp(score, 45, 98)];
  }));
}

function buildAbilityMap(experts, artificialAnalysis) {
  const rawById = Object.fromEntries(experts.map((expert) => [
    expert.id,
    rawScores(expert, artificialAnalysisMetricFor(expert, artificialAnalysis)),
  ]));
  const ranked = Object.fromEntries(STAT_KEYS.map((key) => [key, rankToScores(experts, rawById, key)]));
  return Object.fromEntries(experts.map((expert) => {
    const abilities = Object.fromEntries(STAT_KEYS.map((key) => [key, ranked[key].get(expert.id)]));
    if (CODING_SCORE_OVERRIDES[expert.id] != null) {
      abilities.coding = CODING_SCORE_OVERRIDES[expert.id];
    }
    return [expert.id, abilities];
  }));
}

function selectBalancedIds(experts, abilityMap, {
  filter,
  score,
  limit,
  maxPerProvider,
}) {
  const providerCounts = new Map();
  const selected = [];
  const sorted = experts
    .filter((expert) => filter(expert, abilityMap[expert.id]))
    .sort((a, b) => score(b, abilityMap[b.id]) - score(a, abilityMap[a.id]));

  for (const expert of sorted) {
    const provider = expert.modelInfo?.provider ?? 'Other';
    const providerCount = providerCounts.get(provider) ?? 0;
    if (providerCount >= maxPerProvider) continue;
    selected.push(expert.id);
    providerCounts.set(provider, providerCount + 1);
    if (selected.length >= limit) break;
  }

  return selected;
}

function recencyScore(expert) {
  const createdAt = expert.modelInfo?.createdAt ?? '';
  if (createdAt >= '2026-01-01') return 8;
  if (createdAt >= '2025-01-01') return 4;
  if (createdAt >= '2024-01-01') return -4;
  return -10;
}

function isCurrentModel(expert) {
  return (expert.modelInfo?.createdAt ?? '') >= '2025-01-01';
}

function replaceJsonObject(source, marker, suffix, nextObject) {
  const start = source.indexOf(marker);
  const objectStart = source.indexOf('{', start);
  const objectEnd = source.indexOf(suffix, objectStart);
  if (start < 0 || objectStart < 0 || objectEnd < 0) throw new Error(`Could not replace ${marker}`);
  return `${source.slice(0, objectStart)}${JSON.stringify(nextObject, null, 2)}${source.slice(objectEnd + 1)}`;
}

function replaceConstArray(source, marker, suffix, nextArray) {
  const start = source.indexOf(marker);
  const arrayStart = source.indexOf('[', start);
  const arrayEnd = source.indexOf(suffix, arrayStart);
  if (start < 0 || arrayStart < 0 || arrayEnd < 0) throw new Error(`Could not replace ${marker}`);
  return `${source.slice(0, arrayStart)}${JSON.stringify(nextArray, null, 2)}${source.slice(arrayEnd + 1)}`;
}

const addedSource = fs.readFileSync(ADDED_PATH, 'utf8');
const experts = parseConstArray(addedSource, 'export const OPENROUTER_ADDED_EXPERTS = ', '] satisfies Expert[];');
const existingOverrides = parseConstObject(
  fs.readFileSync('src/data/openrouter-existing-model-overrides.ts', 'utf8'),
  'export const OPENROUTER_EXISTING_MODEL_OVERRIDES = ',
  '} satisfies Record<string, OpenRouterExistingModelOverride>;',
);
const existingExperts = EXISTING_IDS
  .filter((id) => existingOverrides[id])
  .map((id) => ({
    id,
    name: existingOverrides[id].name ?? id,
    nameKo: existingOverrides[id].nameKo ?? existingOverrides[id].name ?? id,
    openrouterModel: existingOverrides[id].openrouterModel ?? id,
    modelInfo: existingOverrides[id].modelInfo,
  }));

const allExperts = [...existingExperts, ...experts];
const artificialAnalysis = await loadArtificialAnalysisMetrics();
const matchedArtificialAnalysisCount = allExperts
  .filter((expert) => artificialAnalysisMetricFor(expert, artificialAnalysis))
  .length;
const allAbilities = buildAbilityMap(allExperts, artificialAnalysis);
const addedAbilities = Object.fromEntries(experts.map((expert) => [expert.id, allAbilities[expert.id]]));
const existingAbilities = Object.fromEntries(existingExperts.map((expert) => [expert.id, allAbilities[expert.id]]));
const reasoningIds = selectBalancedIds(experts, addedAbilities, {
  filter: (expert, abilities) => isCurrentModel(expert) && abilities.reasoning >= 78,
  score: (expert, abilities) => abilities.reasoning + recencyScore(expert) * 0.8,
  limit: 16,
  maxPerProvider: 2,
});
const fastIds = selectBalancedIds(experts, addedAbilities, {
  filter: (expert, abilities) => isCurrentModel(expert) && abilities.speed >= 80,
  score: (expert, abilities) => abilities.speed + recencyScore(expert) * 1.8,
  limit: 16,
  maxPerProvider: 2,
});
const flagshipIds = selectBalancedIds(experts, addedAbilities, {
  filter: (expert, abilities) => isCurrentModel(expert) && (abilities.reasoning >= 80 || abilities.coding >= 84),
  score: (expert, abilities) => abilities.reasoning + abilities.coding * 0.35 + recencyScore(expert),
  limit: 20,
  maxPerProvider: 2,
});

let nextAddedSource = replaceJsonObject(
  addedSource,
  'export const OPENROUTER_ADDED_ABILITIES = ',
  '} satisfies Record<string, AIAbilityStats>;',
  addedAbilities,
);
nextAddedSource = replaceConstArray(
  nextAddedSource,
  'export const OPENROUTER_ADDED_REASONING_IDS = ',
  '] as const;',
  reasoningIds,
);
nextAddedSource = replaceConstArray(
  nextAddedSource,
  'export const OPENROUTER_ADDED_FAST_IDS = ',
  '] as const;',
  fastIds,
);
nextAddedSource = replaceConstArray(
  nextAddedSource,
  'export const OPENROUTER_ADDED_FLAGSHIP_IDS = ',
  '] as const;',
  flagshipIds,
);
fs.writeFileSync(ADDED_PATH, nextAddedSource, 'utf8');

const expertSource = fs.readFileSync(EXPERT_PATH, 'utf8');
const nextExpertSource = replaceJsonObject(
  expertSource,
  'const AI_ABILITIES: Record<string, AIAbilityStats> = ',
  '};',
  existingAbilities,
);
fs.writeFileSync(EXPERT_PATH, nextExpertSource, 'utf8');

const cogito = allAbilities['or-deepcogito-cogito-v2-1-671b'];
if (cogito) {
  console.log(`Cogito v2.1 671B reasoning: ${cogito.reasoning}`);
}
console.log(`Artificial Analysis matched models: ${matchedArtificialAnalysisCount}/${allExperts.length}`);
