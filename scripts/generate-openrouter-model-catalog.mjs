import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const EXPERTS_PATH = path.join(ROOT, 'src/types/expert.ts');
const OUT_PATH = path.join(ROOT, 'src/data/openrouter-added-models.ts');
const EXISTING_OVERRIDES_PATH = path.join(ROOT, 'src/data/openrouter-existing-model-overrides.ts');
const GENERATED_LOGO_DIR = path.join(ROOT, 'public/logos/openrouter');
const REPORT_PATH = path.join(ROOT, 'tmp-openrouter-model-selection-report.json');
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const OPENROUTER_ORIGIN = 'https://openrouter.ai';
const TARGET_NEW_MODELS = 200;

const BRAND_CONFIG = [
  { prefix: 'openai/', brand: 'gpt', provider: 'OpenAI', logo: '/logos/gpt.svg', color: 'blue', icon: '🤖', famous: 120 },
  { prefix: 'anthropic/', brand: 'claude', provider: 'Anthropic', logo: '/logos/claude.png', color: 'orange', icon: '🧠', famous: 120 },
  { prefix: 'google/', brand: 'gemini', provider: 'Google', logo: '/logos/gemini.svg', color: 'emerald', icon: '💎', famous: 110 },
  { prefix: 'x-ai/', brand: 'grok', provider: 'xAI', logo: '/logos/grok.svg', color: 'teal', icon: '⚡', famous: 105 },
  { prefix: 'perplexity/', brand: 'perplexity', provider: 'Perplexity', logo: '/logos/perplexity.svg', color: 'pink', icon: '🔍', famous: 100 },
  { prefix: 'deepseek/', brand: 'deepseek', provider: 'DeepSeek', logo: '/logos/deepseek.png', color: 'purple', icon: '🧭', famous: 102 },
  { prefix: 'qwen/', brand: 'qwen', provider: 'Alibaba Qwen', logo: '/logos/qwen.png', color: 'amber', icon: '🧩', famous: 103 },
  { prefix: 'meta-llama/', brand: 'other', provider: 'Meta', logo: '/logos/meta.png', color: 'blue', icon: '🌐', famous: 98 },
  { prefix: 'mistralai/', brand: 'other', provider: 'Mistral AI', logo: '/logos/mistral.png', color: 'slate', icon: '🌬️', famous: 95 },
  { prefix: 'cohere/', brand: 'other', provider: 'Cohere', logo: '/logos/cohere.png', color: 'green', icon: '📚', famous: 88 },
  { prefix: 'microsoft/', brand: 'other', provider: 'Microsoft', logo: '/logos/microsoft.png', color: 'blue', icon: '🏢', famous: 82 },
  { prefix: 'amazon/', brand: 'other', provider: 'Amazon', logo: '/logos/amazon.png', color: 'amber', icon: '📦', famous: 82 },
  { prefix: 'nvidia/', brand: 'other', provider: 'NVIDIA', logo: '/logos/nvidia.png', color: 'green', icon: '⚙️', famous: 82 },
  { prefix: 'moonshotai/', brand: 'other', provider: 'Moonshot AI', logo: '/logos/moonshot.png', color: 'slate', icon: '🌙', famous: 86 },
  { prefix: 'z-ai/', brand: 'other', provider: 'Z.ai', logo: '/logos/glm.png', color: 'blue', icon: '🧠', famous: 80 },
  { prefix: 'minimax/', brand: 'other', provider: 'MiniMax', logo: '/logos/minimax.png', color: 'purple', icon: '🧬', famous: 78 },
  { prefix: 'baidu/', brand: 'other', provider: 'Baidu', logo: '/logos/baidu.png', color: 'blue', icon: '🔎', famous: 76 },
  { prefix: 'tencent/', brand: 'other', provider: 'Tencent', logo: '/logos/tencent.png', color: 'teal', icon: '💬', famous: 76 },
  { prefix: 'ai21/', brand: 'other', provider: 'AI21 Labs', logo: '/logos/ai21.png', color: 'green', icon: '✍️', famous: 74 },
  { prefix: 'writer/', brand: 'other', provider: 'Writer', logo: '/logos/writer.png', color: 'slate', icon: '📝', famous: 74 },
  { prefix: 'upstage/', brand: 'other', provider: 'Upstage', logo: '/logos/solar.png', color: 'orange', icon: '☀️', famous: 72 },
  { prefix: 'ibm-granite/', brand: 'other', provider: 'IBM', logo: '/logos/ibm.png', color: 'blue', icon: '🏛️', famous: 72 },
  { prefix: 'stepfun/', brand: 'other', provider: 'StepFun', logo: '/logos/stepfun.png', color: 'cyan', icon: '👣', famous: 70 },
  { prefix: 'bytedance-seed/', brand: 'other', provider: 'ByteDance Seed', logo: '/logos/bytedance.png', color: 'blue', icon: '🌱', famous: 70 },
  { prefix: 'nousresearch/', brand: 'other', provider: 'Nous Research', logo: '/logos/nous.png', color: 'purple', icon: '🧪', famous: 68 },
  { prefix: 'liquid/', brand: 'other', provider: 'Liquid AI', logo: '/logos/openrouter/liquid.png', color: 'cyan', icon: '💧', famous: 66 },
  { prefix: 'rekaai/', brand: 'other', provider: 'Reka AI', logo: '/logos/openrouter/rekaai.png', color: 'pink', icon: '✨', famous: 66 },
  { prefix: 'inception/', brand: 'other', provider: 'Inception Labs', logo: '/logos/openrouter/inception.png', color: 'purple', icon: '🌌', famous: 64 },
  { prefix: 'cognitivecomputations/', brand: 'other', provider: 'Cognitive Computations', logo: '/logos/openrouter/cognitivecomputations.png', color: 'cyan', icon: '🧪', famous: 62 },
  { prefix: 'xiaomi/', brand: 'other', provider: 'Xiaomi', logo: '/logos/xiaomi.png', color: 'orange', icon: '📱', famous: 62 },
  { prefix: 'arcee-ai/', brand: 'other', provider: 'Arcee AI', logo: '/logos/openrouter/arcee-ai.png', color: 'teal', icon: '🧭', famous: 65 },
  { prefix: 'poolside/', brand: 'other', provider: 'Poolside', logo: '/logos/openrouter/poolside.png', color: 'blue', icon: '🌊', famous: 64 },
  { prefix: 'inclusionai/', brand: 'other', provider: 'InclusionAI', logo: '/logos/openrouter/inclusionai.png', color: 'slate', icon: '🤖', famous: 63 },
  { prefix: 'aion-labs/', brand: 'other', provider: 'Aion Labs', logo: '/logos/openrouter/aion-labs.png', color: 'violet', icon: '🧠', famous: 61 },
  { prefix: 'morph/', brand: 'other', provider: 'Morph', logo: '/logos/openrouter/morph.png', color: 'indigo', icon: '🧬', famous: 60 },
  { prefix: 'prime-intellect/', brand: 'other', provider: 'Prime Intellect', logo: '/logos/openrouter/prime-intellect.png', color: 'purple', icon: '🧪', famous: 60 },
  { prefix: 'allenai/', brand: 'other', provider: 'Ai2', logo: '/logos/openrouter/allenai.png', color: 'blue', icon: '📚', famous: 60 },
  { prefix: 'deepcogito/', brand: 'other', provider: 'Deep Cogito', logo: '/logos/openrouter/deepcogito.png', color: 'purple', icon: '🧠', famous: 58 },
  { prefix: 'relace/', brand: 'other', provider: 'Relace', logo: '/logos/openrouter/relace.png', color: 'emerald', icon: '🔎', famous: 56 },
  { prefix: 'essentialai/', brand: 'other', provider: 'Essential AI', logo: '/logos/openrouter/essentialai.png', color: 'orange', icon: '🧩', famous: 55 },
  { prefix: 'inflection/', brand: 'other', provider: 'Inflection AI', logo: '/logos/openrouter/inflection.png', color: 'blue', icon: '💬', famous: 55 },
  { prefix: 'kwaipilot/', brand: 'other', provider: 'KwaiPilot', logo: '/logos/openrouter/kwaipilot.png', color: 'orange', icon: '🧰', famous: 54 },
  { prefix: 'switchpoint/', brand: 'other', provider: 'Switchpoint', logo: '/logos/openrouter/switchpoint.png', color: 'green', icon: '🔀', famous: 52 },
  { prefix: 'thedrummer/', brand: 'other', provider: 'TheDrummer', logo: '/logos/openrouter/thedrummer.png', color: 'purple', icon: '🎭', famous: 50 },
  { prefix: 'sao10k/', brand: 'other', provider: 'Sao10K', logo: '/logos/openrouter/sao10k.png', color: 'pink', icon: '🎨', famous: 50 },
  { prefix: 'anthracite-org/', brand: 'other', provider: 'Anthracite', logo: '/logos/openrouter/anthracite-org.png', color: 'slate', icon: '🧲', famous: 49 },
  { prefix: 'mancer/', brand: 'other', provider: 'Mancer', logo: '/logos/openrouter/mancer.png', color: 'indigo', icon: '🧵', famous: 48 },
  { prefix: 'undi95/', brand: 'other', provider: 'Undi95', logo: '/logos/openrouter/undi95.png', color: 'cyan', icon: '🧬', famous: 48 },
  { prefix: 'gryphe/', brand: 'other', provider: 'Gryphe', logo: '/logos/openrouter/gryphe.png', color: 'amber', icon: '📜', famous: 48 },
];

const PRESERVE_EXISTING_CARD_IDS = new Set(['developer-yjh', 'ancano-pro', 'auto-gpt']);

const MUST_INCLUDE_PREFIXES = new Set(BRAND_CONFIG.slice(0, 24).map((item) => item.prefix));
const MUST_INCLUDE_MODEL_IDS = [
  'google/gemini-3.1-flash-lite',
  'openai/gpt-5-mini',
  'openai/gpt-5.5-pro',
  'openai/gpt-5.5',
  'openai/gpt-5.4-pro',
  'openai/gpt-5.4',
  'openai/gpt-5.1',
  'openai/gpt-chat-latest',
  'openai/o3-pro',
  'openai/o3-deep-research',
  'openai/o4-mini-deep-research',
  'openai/o4-mini-high',
  'openai/o3-mini-high',
  'openai/o3-mini',
  'openai/o1-pro',
  'openai/o1',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/gpt-4o-search-preview',
  'openai/gpt-4o-mini-search-preview',
  'qwen/qwen3-coder-plus',
  'qwen/qwen3-coder-flash',
  'qwen/qwen3-coder',
  'qwen/qwen3-coder:free',
  'qwen/qwen3-coder-30b-a3b-instruct',
  'qwen/qwen3-next-80b-a3b-instruct',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'qwen/qwen3-235b-a22b-thinking-2507',
  'qwen/qwen3-30b-a3b-thinking-2507',
  'qwen/qwen3-235b-a22b-2507',
  'qwen/qwen3-30b-a3b-instruct-2507',
  'qwen/qwen3-235b-a22b',
  'qwen/qwen3-32b',
  'qwen/qwen3-14b',
  'qwen/qwen3-8b',
  'qwen/qwen3-30b-a3b',
  'qwen/qwen-2.5-coder-32b-instruct',
];
const KNOWN_OPEN_WEIGHT_PREFIXES = new Set([
  'meta-llama/',
  'mistralai/',
  'deepseek/',
  'qwen/',
  'microsoft/',
  'nvidia/',
  'z-ai/',
  'ibm-granite/',
  'nousresearch/',
  'cognitivecomputations/',
  'allenai/',
  'arcee-ai/',
  'deepcogito/',
  'inclusionai/',
  'liquid/',
  'prime-intellect/',
  'rekaai/',
  'sao10k/',
  'anthracite-org/',
  'gryphe/',
  'undi95/',
]);

const OPEN_WEIGHT_MODEL_PATTERNS = [
  /gemma/i,
  /llama/i,
  /granite/i,
  /mythomax/i,
  /euryale/i,
  /magnum/i,
  /wizardlm/i,
  /dolphin/i,
  /openchat/i,
  /olmo/i,
];

const EXCLUDE_PATTERNS = [
  /\bmoderation\b/i,
  /\bguard\b/i,
  /\bembedding\b/i,
  /\btts\b/i,
  /\bwhisper\b/i,
  /\bimage generation\b/i,
  /\bdeprecated\b/i,
];

const LOW_CONFIDENCE_PROVIDER_PREFIXES = new Set();

function readExistingModels(source) {
  const rawStart = source.indexOf('export const _DEFAULT_EXPERTS_RAW');
  const rawEnd = source.indexOf('\n];\n\n// abilities', rawStart);
  const rawSource = rawStart >= 0 && rawEnd > rawStart ? source.slice(rawStart, rawEnd) : source;
  const ids = new Set();
  const openrouterModels = new Set();
  const aiEntries = [];
  for (const match of rawSource.matchAll(/\{\s*id:\s*'([^']+)'/g)) {
    const id = match[1];
    ids.add(id);
  }
  for (const match of rawSource.matchAll(/\{\s*id:\s*'([^']+)'[^\n]*category:\s*'ai'[^\n]*openrouterModel:\s*'([^']+)'/g)) {
    const id = match[1];
    const model = match[2];
    if (model) {
      openrouterModels.add(model);
      aiEntries.push({ id, openrouterModel: model });
    }
  }
  return { ids, openrouterModels, aiEntries };
}

function brandFor(modelId) {
  return BRAND_CONFIG.find((config) => modelId.startsWith(config.prefix)) ?? {
    prefix: modelId.split('/')[0] + '/',
    brand: 'other',
    provider: titleCase(modelId.split('/')[0] ?? 'Other'),
    logo: '/logos/router.svg',
    color: 'slate',
    icon: '🤖',
    famous: 40,
  };
}

function providerSlug(provider) {
  return provider
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'provider';
}

function needsProviderLogo(config) {
  return !config.logo || config.logo === '/logos/router.svg';
}

function localLogoPath(logoUrl) {
  if (!logoUrl?.startsWith('/logos/openrouter/') || !logoUrl.endsWith('.png')) return undefined;
  return path.join(ROOT, 'public', logoUrl);
}

async function downloadOpenRouterProviderFavicons(configs) {
  const targets = configs
    .map((config) => ({
      pageSlug: config.prefix.replace(/\/$/, ''),
      outputPath: localLogoPath(config.logo),
    }))
    .filter((target) => target.outputPath);

  await fs.mkdir(GENERATED_LOGO_DIR, { recursive: true });
  await Promise.all(targets.map(async ({ pageSlug, outputPath }) => {
    try {
      const pageResponse = await fetch(`${OPENROUTER_ORIGIN}/${pageSlug}`);
      if (!pageResponse.ok) throw new Error(`provider page ${pageResponse.status}`);
      const html = await pageResponse.text();
      const faviconMatch = html.match(new RegExp(`alt="Favicon for ${pageSlug}"[^>]+src="([^"]+)"`))
        ?? html.match(/alt="Favicon for [^"]+"[^>]+src="([^"]+)"/);
      if (!faviconMatch) throw new Error('provider favicon not found');
      const faviconUrl = new URL(faviconMatch[1].replaceAll('&amp;', '&'), OPENROUTER_ORIGIN).toString();
      const imageResponse = await fetch(faviconUrl);
      if (!imageResponse.ok) throw new Error(`favicon ${imageResponse.status}`);
      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      await fs.writeFile(outputPath, buffer);
    } catch (error) {
      console.warn(`Skipped OpenRouter favicon for ${pageSlug}: ${error.message}`);
    }
  }));
}

function titleCase(value) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugFromOpenRouterId(modelId) {
  return `or-${modelId}`
    .toLowerCase()
    .replace(/:free$/i, '-free')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function cleanName(rawName) {
  return rawName.replace(/\s*\(free\)\s*$/i, ' Free').replace(/^[^:]+:\s*/, '').trim();
}

function isReasoningModel(model) {
  const haystack = `${model.id} ${model.name} ${model.description ?? ''}`.toLowerCase();
  return model.supported_parameters?.includes('reasoning')
    || model.supported_parameters?.includes('include_reasoning')
    || /\b(reasoning|thinking|r1|o1|o3|o4|opus|pro|max)\b/.test(haystack);
}

function isCodingModel(model) {
  const haystack = `${model.id} ${model.name} ${model.description ?? ''}`.toLowerCase();
  return /\b(code|coding|coder|codestral|devstral|programming|software|agentic)\b/.test(haystack);
}

function isVisionModel(model) {
  return model.architecture?.input_modalities?.some((item) => item === 'image' || item === 'video') ?? false;
}

function hasNonTextOutput(model) {
  const output = model.architecture?.output_modalities ?? [];
  return output.some((item) => item !== 'text');
}

function isFree(model) {
  const prompt = Number(model.pricing?.prompt ?? '0');
  const completion = Number(model.pricing?.completion ?? '0');
  return model.id.endsWith(':free') || (prompt === 0 && completion === 0);
}

function isOpenWeightModel(model) {
  const cfg = brandFor(model.id);
  const text = `${model.id} ${model.name} ${model.description ?? ''}`;
  if (KNOWN_OPEN_WEIGHT_PREFIXES.has(cfg.prefix) && !['openai/', 'anthropic/'].includes(cfg.prefix)) return true;
  return OPEN_WEIGHT_MODEL_PATTERNS.some((pattern) => pattern.test(text));
}

function priceTier(model) {
  if (isFree(model)) return 'free';
  const prompt = Number(model.pricing?.prompt ?? '0');
  const completion = Number(model.pricing?.completion ?? '0');
  const blended = prompt * 1_000_000 + completion * 1_000_000;
  if (blended <= 1.5) return 'low';
  if (blended <= 8) return 'standard';
  return 'premium';
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

function arenaScore(model, categories = []) {
  const arenas = model.benchmarks?.design_arena;
  if (!Array.isArray(arenas) || arenas.length === 0) return undefined;
  const selected = categories.length > 0
    ? arenas.filter((item) => categories.some((category) => `${item.category}`.toLowerCase().includes(category)))
    : arenas;
  const pool = selected.length > 0 ? selected : arenas;
  const scores = pool.map((item) => {
    const elo = typeof item.elo === 'number' ? Math.max(0, Math.min(1, (item.elo - 900) / 500)) : 0.45;
    const win = typeof item.win_rate === 'number' ? Math.max(0, Math.min(1, item.win_rate / 70)) : 0.45;
    const rank = typeof item.rank === 'number' ? Math.max(0, Math.min(1, (120 - item.rank) / 120)) : 0.45;
    return 40 + (elo * 28) + (win * 18) + (rank * 14);
  });
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function modelSizeHint(model) {
  const text = `${model.id} ${model.name}`.toLowerCase();
  const match = text.match(/(\d+(?:\.\d+)?)\s*b\b/);
  if (!match) return 0;
  const size = Number(match[1]);
  if (size >= 400) return 10;
  if (size >= 100) return 7;
  if (size >= 30) return 4;
  if (size <= 3) return -5;
  if (size <= 8) return -2;
  return 1;
}

function clamp(value) {
  return Math.max(40, Math.min(98, Math.round(value)));
}

function hashText(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickMany(pool, seed, count = 3) {
  const selected = [];
  for (let i = 0; i < pool.length && selected.length < count; i += 1) {
    selected.push(pool[(seed + i * 5) % pool.length]);
  }
  return selected;
}

function abilitiesFor(model) {
  const cfg = brandFor(model.id);
  const analysis = model.benchmarks?.artificial_analysis ?? {};
  const intelligence = typeof analysis.intelligence_index === 'number' ? analysis.intelligence_index : 45;
  const codingIndex = typeof analysis.coding_index === 'number' ? analysis.coding_index : undefined;
  const agenticIndex = typeof analysis.agentic_index === 'number' ? analysis.agentic_index : undefined;
  const contextLength = model.context_length ?? model.top_provider?.context_length ?? 0;
  const reasoning = isReasoningModel(model);
  const coding = isCodingModel(model);
  const tier = priceTier(model);
  const free = tier === 'free';
  const low = tier === 'low';
  const flagshipBias = cfg.famous >= 95 ? 8 : cfg.famous >= 80 ? 4 : 0;
  const text = `${model.id} ${model.name}`.toLowerCase();
  const codeArena = arenaScore(model, ['code', 'fullstack', 'website', 'uicomponent', 'gamedev']);
  const creativeArena = arenaScore(model, ['ascii', 'svg', '3d', 'website']);
  const generalArena = arenaScore(model);
  const sizeBias = modelSizeHint(model);
  const toolBonus = model.supported_parameters?.includes('tools') || model.supported_parameters?.includes('tool_choice') ? 6 : 0;
  const structuredBonus = model.supported_parameters?.includes('structured_outputs') || model.supported_parameters?.includes('response_format') ? 4 : 0;
  const speedPenalty = tier === 'premium' ? 7 : tier === 'standard' ? 3 : 0;
  const speedBonus = /mini|small|lite|flash|fast|turbo|haiku|nano|1\.2b|3b|7b|8b/i.test(text) ? 13 : 0;
  const languageBonus = /qwen|glm|ernie|hunyuan|baidu|tencent|moonshot|kimi|mistral|aya|solar|upstage|jamba|command-r/i.test(text) ? 9 : 0;

  return {
    coding: clamp((codingIndex != null ? 47 + codingIndex * 0.82 : codeArena ?? 64) + (coding ? 12 : 0) + toolBonus + flagshipBias + sizeBias),
    creativity: clamp((creativeArena ?? generalArena ?? 62) + (/creative|story|writing|writer|roleplay|rp|magnum|euryale|mytho|dolphin/i.test(text) ? 11 : 0) + flagshipBias * 0.45),
    reasoning: clamp(50 + intelligence * 0.72 + (agenticIndex != null ? agenticIndex * 0.16 : 0) + (reasoning ? 10 : 0) + structuredBonus + flagshipBias + sizeBias),
    math: clamp(54 + intelligence * 0.46 + (reasoning ? 11 : 0) + (coding ? 5 : 0) + structuredBonus + sizeBias),
    multilingual: clamp(58 + languageBonus + (cfg.brand === 'qwen' || cfg.brand === 'gemini' ? 8 : 0) + (/korean|solar|upstage/i.test(text) ? 8 : 0) + Math.min(10, Math.log10(Math.max(contextLength, 8000)) * 2)),
    speed: clamp(66 + speedBonus - speedPenalty - Math.max(0, sizeBias * 0.8) + (low || free ? 5 : 0)),
    costEfficiency: clamp((free ? 98 : low ? 88 : tier === 'standard' ? 72 : 50) + speedBonus * 0.35 - Math.max(0, sizeBias * 0.7)),
    contextWindow: contextScore(contextLength),
  };
}

function tagsFor(model) {
  const tags = [];
  const searchModel = /search|sonar|perplexity/i.test(model.id);
  if (isReasoningModel(model)) tags.push('추론');
  if (searchModel) tags.push('검색');
  if (isCodingModel(model) && !searchModel) tags.push('코딩');
  if (isOpenWeightModel(model)) tags.push('오픈웨이트');
  if (isVisionModel(model)) tags.push('시각입력');
  if ((model.context_length ?? 0) >= 500_000) tags.push('장문맥');
  if (isFree(model)) tags.push('무료');
  if (priceTier(model) === 'low') tags.push('저비용');
  if (/creative|story|writer|writing/i.test(model.id)) tags.push('창작');
  if (/mini|small|lite|flash|fast|turbo|haiku|nano/i.test(model.id)) tags.push('고속');
  if (/korean|solar|upstage/i.test(model.id)) tags.push('한국어');
  if (/qwen|glm|ernie|hunyuan|baidu|tencent|moonshot|kimi/i.test(model.id)) tags.push('중국어');
  if (model.supported_parameters?.includes('tools') || model.supported_parameters?.includes('tool_choice')) tags.push('툴사용');
  if (model.supported_parameters?.includes('structured_outputs') || model.supported_parameters?.includes('response_format')) tags.push('구조화');
  if (tags.length < 3) tags.push('범용');
  if (tags.length < 3) tags.push('업무');
  return [...new Set(tags)].slice(0, 4);
}

function contextLabelFor(model) {
  const contextLength = model.context_length ?? model.top_provider?.context_length ?? 0;
  if (contextLength >= 1_000_000) return '1M급 초장문';
  if (contextLength >= 262_144) return '대용량 문맥';
  if (contextLength >= 128_000) return '128K급 장문';
  return '일반 문맥';
}

function descriptionFor(model) {
  const tags = tagsFor(model);
  const cfg = brandFor(model.id);
  const name = cleanName(model.name);
  const contextLabel = contextLabelFor(model);
  const id = model.id.toLowerCase();
  if (tags.includes('검색')) {
    if (id.includes('sonar-pro')) return name + ': 더 긴 검색 맥락과 심층 리서치 보고서에 맞춘 Perplexity 상위 모델';
    if (id.includes('sonar')) return name + ': 빠른 웹 검색과 짧은 출처 요약에 맞춘 Perplexity 기본 검색 모델';
    return name + ': 출처 확인, 최신 이슈 비교, 근거 요약에 맞춘 ' + cfg.provider + ' 계열 검색 모델';
  }
  if (tags.includes('코딩')) return name + ': 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 ' + cfg.provider + ' 모델';
  if (tags.includes('시각입력')) return name + ': ' + contextLabel + '에서 이미지, 표, 문서 화면을 함께 읽어내는 ' + cfg.provider + ' 모델';
  if (tags.includes('추론')) {
    if (id.includes('deepseek-r1')) return name + ': 수학·논리·코딩 판단을 단계별로 풀어내는 DeepSeek 추론 모델';
    if (id.includes('qwen') && id.includes('thinking')) return name + ': 긴 문맥에서 사고 과정을 길게 유지하는 Qwen 사고형 모델';
    if (id.includes('phi')) return name + ': 작은 문맥에서도 논리 문제와 구조화 응답을 겨냥한 Microsoft 경량 추론 모델';
    if (id.includes('nemotron')) return name + ': 합성 데이터와 기업형 추론 워크로드에 맞춘 NVIDIA 대형 모델';
    if (id.includes('solar') || id.includes('upstage')) return name + ': 한국어 업무 문서와 논리 정리에 강점을 둔 Upstage 모델';
    if (id.includes('mercury') || id.includes('inception')) return name + ': 지연 시간을 낮춘 빠른 추론과 실시간 응답 흐름에 맞춘 Inception Labs 모델';
    if (id.includes('hunyuan') || id.includes('tencent')) return name + ': 중국어권 업무 대화와 구조화 답변에 맞춘 Tencent 모델';
    if (id.includes('stepfun') || id.includes('step-')) return name + ': 빠른 응답과 중국어권 실무 질의에 맞춘 StepFun 모델';
    return name + ': 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 ' + cfg.provider + ' 모델';
  }
  if (tags.includes('고속')) return name + ': 빠른 응답과 낮은 비용을 우선한 ' + cfg.provider + ' 경량 모델';
  if (tags.includes('오픈웨이트')) {
    if (id.includes('deepseek-chat')) return name + ': 저비용 코딩 보조와 구조화된 문제 해결에 강한 DeepSeek 대화 모델';
    if (id.includes('dolphin')) return name + ': 실험적 자유 대화와 오픈웨이트 활용을 전제로 한 Cognitive Computations 모델';
    return name + ': 배포 유연성과 커스터마이징 여지가 있는 ' + cfg.provider + ' 오픈웨이트 모델';
  }
  if (id.includes('command-r-plus')) return name + ': RAG 검색, 인용 기반 답변, 기업 지식 질의에 맞춘 Cohere 모델';
  return name + ': ' + cfg.provider + '의 ' + contextLabel + ' 기반 범용 대화 모델';
}

const EXISTING_DESCRIPTION_BY_ID = {
  'gpt-mini': 'GPT-4.1 Mini: 긴 문서 처리와 시각 입력을 속도·비용 균형으로 다루는 OpenAI 모델',
  'gpt-nano': 'GPT-4.1 Nano: 대량 호출, 분류, 짧은 자동화 응답에 맞춘 OpenAI 초경량 모델',
  'claude': 'Claude Opus 4.6: 긴 사고 흐름과 고난도 분석을 우선하는 Anthropic 고성능 모델',
  'claude-sonnet': 'Claude Sonnet 4.5: 코딩·문서 작성·분석을 균형 있게 처리하는 Anthropic 주력 모델',
  'claude-sonnet-4.6': 'Claude Sonnet 4.6: 에이전트 코딩과 긴 작업 흐름에 강한 Anthropic 최신 Sonnet 모델',
  'gemini': 'Gemini 2.5 Flash: 1M 문맥과 멀티모달 입력을 빠르게 다루는 Google 모델',
  'gemini-3-flash': 'Gemini 3 Flash Preview: 최신 Gemini 계열의 속도와 추론 균형을 보는 프리뷰 모델',
  'gemini-pro': 'Gemini 3.1 Pro Preview: 복잡한 분석과 멀티모달 이해에 맞춘 Google 상위 프리뷰',
  'gemini-3.1': 'Gemini 3.1 Flash Lite Preview: 긴 문맥을 저비용으로 처리하는 Gemini 경량 프리뷰',
  'gemini-flash-lite': 'Gemini 2.5 Flash Lite: 일상 대화와 대량 요약에 적합한 저비용 Gemini 모델',
  'grok': 'Grok 4.3: 실시간성 있는 대화와 분석을 넓은 문맥으로 처리하는 xAI 모델',
  'grok-4.2': 'Grok 4.20: 2M 문맥과 강한 추론 성향을 가진 xAI 장문맥 모델',
  'qwen': 'Qwen3.5-Flash: 긴 문맥과 다국어 응답을 빠르게 처리하는 Qwen 오픈웨이트 모델',
  'qwen-plus': 'Qwen3.6 Plus: 1M 문맥 기반의 문서 분석과 다국어 추론에 강한 Qwen 모델',
  'llama-maverick': 'Llama 4 Maverick: 긴 문맥과 시각 입력을 지원하는 Meta의 대형 오픈웨이트 모델',
  'llama-scout': 'Llama 4 Scout: 초장문 컨텍스트 탐색과 빠른 멀티모달 처리에 맞춘 Meta 모델',
  'mistral-large': 'Mistral Large 3 2512: 유럽권 언어와 도구 사용 흐름에 강한 Mistral 상위 모델',
  'mistral-small': 'Mistral Small 4: 가벼운 비용으로 추론과 시각 입력을 지원하는 Mistral 모델',
  'codestral': 'Codestral 2508: 코드 생성과 보완 작업에 초점을 둔 Mistral 개발자용 모델',
  'devstral': 'Devstral 2 2512: 저장소 이해와 에이전트식 개발 작업을 겨냥한 Mistral 모델',
  'nova-premier': 'Nova Premier 1.0: 대규모 문서와 멀티모달 업무를 겨냥한 Amazon 상위 모델',
  'nova-2-lite': 'Nova 2 Lite: 긴 문맥을 빠르게 처리하는 Amazon 경량 멀티모달 모델',
  'seed': 'Seed-2.0-Lite: 빠른 응답과 멀티모달 이해를 결합한 ByteDance Seed 모델',
  'seed-mini': 'Seed-2.0-Mini: 비용 효율적인 멀티모달 요약과 일상 작업에 맞춘 Seed 모델',
  'kimi': 'Kimi K2.5: 긴 문맥 기반 리서치와 중국어권 코딩 작업에 강한 Moonshot 모델',
  'kimi-thinking': 'Kimi K2 Thinking: 단계별 추론과 도구 사용 흐름에 초점을 둔 Moonshot 모델',
  'jamba': 'Jamba Large 1.7: 긴 문서 처리와 구조화된 업무 응답에 적합한 AI21 모델',
  'palmyra': 'Palmyra X5: 긴 문맥 기반 글쓰기와 비즈니스 문서 작업에 특화된 Writer 모델',
};

function descriptionForExistingModel(entry, model) {
  if (EXISTING_DESCRIPTION_BY_ID[entry.id]) {
    return EXISTING_DESCRIPTION_BY_ID[entry.id];
  }
  if (entry.id === 'developer-yjh') {
    return 'Claude Sonnet 4.6: 이 앱의 개발 맥락과 긴 코드 작업을 우선하도록 맞춘 Anthropic Sonnet 모델';
  }
  if (entry.id === 'ancano-pro') {
    return 'Auto Router: 질문 성격에 따라 비용 효율적인 OpenRouter 경로를 고르는 ANCA 자동 라우터';
  }
  if (entry.id === 'auto-gpt') {
    return 'Claude Sonnet 4.6: 질문 성격에 맞춰 일반 답변과 개발 보조를 균형 있게 맡는 자동 선택용 Sonnet 모델';
  }
  return descriptionFor(model);
}

function tagsForExistingModel(entry, model) {
  const tags = tagsFor(model);
  if (entry.id === 'ancano-pro') {
    return ['추론', '자동선택', '장문맥', '저비용'];
  }
  if (entry.id === 'deepseek') {
    return ['코딩', '오픈웨이트', '저비용', '구조화'];
  }
  if (entry.id === 'command-r-plus') {
    return ['검색', '구조화', '범용'];
  }
  return tags;
}

function sampleQuestionsFor(tags, model) {
  const seed = hashText(model.id);
  const name = cleanName(model.name);
  if (tags.includes('검색')) return pickMany([
    '최신 자료를 근거와 함께 요약해줘',
    '이 주장에 대한 출처를 비교해줘',
    '서로 다른 자료의 관점 차이를 정리해줘',
    '팩트체크할 쟁점을 먼저 나눠줘',
    '시장 동향을 핵심 수치 중심으로 찾아줘',
    name + '로 최신 이슈를 출처와 함께 점검해줘',
  ], seed);
  if (tags.includes('코딩')) return pickMany([
    '이 코드 구조를 더 단순하게 리팩터링해줘',
    '버그 원인을 재현 단계부터 찾아줘',
    'API 응답 형식을 검토하고 개선안을 줘',
    '테스트 케이스에서 빠진 경계를 찾아줘',
    '성능 병목 가능성을 짚어줘',
    name + '가 잘 맞는 개발 작업을 예시로 비교해줘',
  ], seed);
  if (tags.includes('시각입력')) return pickMany([
    '이미지에서 중요한 정보를 뽑아줘',
    '화면 내용을 읽고 작업 순서로 정리해줘',
    '표나 차트의 핵심만 설명해줘',
    '스크린샷 속 문제점을 찾아줘',
    '문서 이미지에서 결정해야 할 항목을 뽑아줘',
    name + '로 이미지와 문서를 함께 분석해줘',
  ], seed);
  if (tags.includes('추론')) return pickMany([
    '복잡한 문제를 전제부터 단계별로 풀어줘',
    '이 결론의 논리적 약점을 찾아줘',
    '선택지를 기준별로 점수화해줘',
    '반례를 먼저 생각하고 답해줘',
    '의사결정 트레이드오프를 정리해줘',
    name + '로 복잡한 판단을 단계별로 풀어줘',
  ], seed);
  if (tags.includes('창작')) return pickMany([
    '초안을 더 자연스럽고 설득력 있게 바꿔줘',
    '스토리 아이디어를 세 가지 방향으로 확장해줘',
    '브랜드 문구를 여러 톤으로 다듬어줘',
    '짧은 카피와 긴 설명문을 함께 만들어줘',
    '독자가 더 몰입하도록 도입부를 고쳐줘',
    '컨셉은 유지하면서 표현만 새롭게 바꿔줘',
  ], seed);
  return pickMany([
    '핵심만 빠르게 요약해줘',
    '실행 가능한 계획으로 정리해줘',
    '장단점을 표로 비교해줘',
    '우선순위를 정하고 이유를 말해줘',
    '회의 전에 볼 브리핑으로 만들어줘',
    name + '의 추천 사용 사례를 정리해줘',
  ], seed);
}

const QUOTE_FOCUS_A = [
  '구조 검토',
  '근거 정리',
  '문맥 해석',
  '전제 점검',
  '실행 순서',
  '비용 균형',
  '응답 속도',
  '도구 활용',
  '코드 경계',
  '자료 요약',
  '대안 비교',
  '리스크 확인',
  '긴 문서 흐름',
  '언어 뉘앙스',
  '표현 다듬기',
  '수치 검증',
  '문서 화면',
  '오픈 활용',
  '실무 적용',
  '핵심 압축',
];

const QUOTE_FOCUS_B = [
  '테스트 관점',
  '판단 기준',
  '출처 맥락',
  '사용 사례',
  '작업 흐름',
  '품질 기준',
  '비교 기준',
  '안전한 선택지',
  '결론의 근거',
  '다음 행동',
];

function quoteFocus(model) {
  const seed = hashText(`${model.id}:quote-focus`);
  const first = QUOTE_FOCUS_A[seed % QUOTE_FOCUS_A.length];
  const second = QUOTE_FOCUS_B[Math.floor(seed / QUOTE_FOCUS_A.length) % QUOTE_FOCUS_B.length];
  return `${first}·${second}`;
}

function quoteFor(tags, model) {
  const name = cleanName(model.name);
  const cfg = brandFor(model.id);
  const focus = quoteFocus(model);
  if (tags.includes('검색')) return name + ' 기준으로 ' + focus + '까지 근거 중심으로 보겠습니다';
  if (tags.includes('코딩')) return name + ' 기준으로 ' + focus + '까지 개발 맥락에서 짚겠습니다';
  if (tags.includes('시각입력')) return name + ' 기준으로 ' + focus + '까지 보이는 정보와 함께 읽겠습니다';
  if (tags.includes('추론')) return name + ' 기준으로 ' + focus + '까지 차근히 따져보겠습니다';
  if (tags.includes('고속')) return name + ' 기준으로 ' + focus + '까지 빠르게 정리하겠습니다';
  if (tags.includes('오픈웨이트')) return name + ' 기준으로 ' + focus + '까지 오픈 활용 관점에서 보겠습니다';
  return name + ' 기준으로 ' + focus + '까지 균형 있게 정리하겠습니다';
}

function scoreModel(model) {
  const cfg = brandFor(model.id);
  const created = Number(model.created ?? 0);
  const recentScore = created > 0 ? Math.min(80, Math.max(0, (created - 1_700_000_000) / 2_000_000)) : 0;
  const famous = cfg.famous;
  const useful = (isReasoningModel(model) ? 20 : 0)
    + (isCodingModel(model) ? 18 : 0)
    + (isVisionModel(model) ? 10 : 0)
    + ((model.context_length ?? 0) >= 262_144 ? 12 : 0)
    + (isFree(model) ? 5 : 0);
  const variantPenalty = /(^~|latest$|preview|beta|experimental|:free)/i.test(model.id) ? 8 : 0;
  return famous + recentScore + useful - variantPenalty;
}

function shouldExclude(model, existingOpenrouterModels) {
  const haystack = `${model.id} ${model.name} ${model.description ?? ''}`;
  if (model.id.startsWith('~')) return true;
  if (model.id.startsWith('openrouter/')) return true;
  if (existingOpenrouterModels.has(model.id)) return true;
  if (!model.architecture?.output_modalities?.includes('text')) return true;
  if (!model.architecture?.input_modalities?.includes('text')) return true;
  if (hasNonTextOutput(model)) return true;
  if (needsProviderLogo(brandFor(model.id))) return true;
  if ([...LOW_CONFIDENCE_PROVIDER_PREFIXES].some((prefix) => model.id.startsWith(prefix))) return true;
  if (EXCLUDE_PATTERNS.some((pattern) => pattern.test(haystack))) return true;
  return false;
}

function selectModels(models, existingOpenrouterModels) {
  const candidates = models
    .filter((model) => !shouldExclude(model, existingOpenrouterModels))
    .map((model) => ({ model, score: scoreModel(model), config: brandFor(model.id) }))
    .sort((a, b) => b.score - a.score);

  const selected = [];
  const selectedIds = new Set();

  for (const id of MUST_INCLUDE_MODEL_IDS) {
    const item = candidates.find((candidate) => candidate.model.id === id && !selectedIds.has(candidate.model.id));
    if (item) {
      selected.push(item);
      selectedIds.add(item.model.id);
    }
  }

  for (const prefix of MUST_INCLUDE_PREFIXES) {
    const best = candidates.find((item) => item.model.id.startsWith(prefix) && !selectedIds.has(item.model.id));
    if (best) {
      selected.push(best);
      selectedIds.add(best.model.id);
    }
  }

  const perPrefix = new Map();
  for (const item of candidates) {
    if (selected.length >= TARGET_NEW_MODELS) break;
    if (selectedIds.has(item.model.id)) continue;
    const prefix = item.config.prefix;
    const count = perPrefix.get(prefix) ?? selected.filter((chosen) => chosen.config.prefix === prefix).length;
    const cap = item.config.famous >= 95 ? 24 : item.config.famous >= 80 ? 14 : 8;
    if (count >= cap && selected.length < TARGET_NEW_MODELS - 35) continue;
    selected.push(item);
    selectedIds.add(item.model.id);
    perPrefix.set(prefix, count + 1);
  }

  return {
    selected: selected.slice(0, TARGET_NEW_MODELS).map((item) => item.model),
    candidates: candidates.map((item) => ({ id: item.model.id, name: item.model.name, score: item.score, provider: item.config.provider })),
  };
}

function toTsString(value) {
  return JSON.stringify(value, null, 2);
}

function expertForModel(model, existingIds) {
  let id = slugFromOpenRouterId(model.id);
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `${slugFromOpenRouterId(model.id)}-${suffix}`;
    suffix += 1;
  }
  existingIds.add(id);
  const cfg = brandFor(model.id);
  const tags = tagsFor(model);
  const createdAt = model.created ? new Date(model.created * 1000).toISOString().slice(0, 10) : undefined;
  const contextLength = model.context_length ?? model.top_provider?.context_length ?? 0;
  const inputModalities = model.architecture?.input_modalities ?? ['text'];
  const outputModalities = model.architecture?.output_modalities ?? ['text'];

  return {
    expert: {
      id,
      name: cleanName(model.name),
      nameKo: cleanName(model.name),
      icon: cfg.icon,
      avatarUrl: cfg.logo,
      color: cfg.color,
      category: 'ai',
      openrouterModel: model.id,
      description: descriptionFor(model),
      quote: quoteFor(tags, model),
      sampleQuestions: sampleQuestionsFor(tags, model),
      greeting: `${cfg.provider}의 ${cleanName(model.name)} 모델입니다. ${tags.join(', ')} 작업에 맞춰 도와드리겠습니다`,
      tags,
      modelInfo: {
        provider: cfg.provider,
        contextLength,
        inputModalities,
        outputModalities,
        priceTier: priceTier(model),
        ...(createdAt ? { createdAt } : {}),
        openWeight: isOpenWeightModel(model),
      },
    },
    brand: cfg.brand,
    abilities: abilitiesFor(model),
  };
}

function overrideForExistingModel(entry, model) {
  const cfg = brandFor(model.id);
  const tags = tagsForExistingModel(entry, model);
  const createdAt = model.created ? new Date(model.created * 1000).toISOString().slice(0, 10) : undefined;
  const contextLength = model.context_length ?? model.top_provider?.context_length ?? 0;
  const inputModalities = model.architecture?.input_modalities ?? ['text'];
  const outputModalities = model.architecture?.output_modalities ?? ['text'];

  return [
    entry.id,
    {
      ...(!PRESERVE_EXISTING_CARD_IDS.has(entry.id) ? {
        name: cleanName(model.name),
        nameKo: cleanName(model.name),
      } : {}),
      description: descriptionForExistingModel(entry, model),
      tags,
      modelInfo: {
        provider: cfg.provider,
        contextLength,
        inputModalities,
        outputModalities,
        priceTier: priceTier(model),
        ...(createdAt ? { createdAt } : {}),
        openWeight: isOpenWeightModel(model),
      },
    },
  ];
}

async function main() {
  const source = await fs.readFile(EXPERTS_PATH, 'utf8');
  const existing = readExistingModels(source);
  const response = await fetch(OPENROUTER_MODELS_URL);
  if (!response.ok) throw new Error(`OpenRouter fetch failed: ${response.status}`);
  const payload = await response.json();
  const models = Array.isArray(payload.data) ? payload.data : [];
  const modelsById = new Map(models.map((model) => [model.id, model]));
  const existingOverrides = Object.fromEntries(existing.aiEntries
    .filter((entry) => modelsById.has(entry.openrouterModel))
    .map((entry) => overrideForExistingModel(entry, modelsById.get(entry.openrouterModel))));
  const existingMissing = existing.aiEntries
    .filter((entry) => !modelsById.has(entry.openrouterModel))
    .map((entry) => entry.openrouterModel);
  const { selected, candidates } = selectModels(models, existing.openrouterModels);
  const usedIds = new Set(existing.ids);
  const generated = selected.map((model) => expertForModel(model, usedIds));
  const experts = generated.map((item) => item.expert);
  const abilityEntries = Object.fromEntries(generated.map((item) => [item.expert.id, item.abilities]));
  const brandEntries = Object.fromEntries(generated.map((item) => [item.expert.id, item.brand]));
  const openSourceIds = experts.filter((expert) => expert.modelInfo?.openWeight).map((expert) => expert.id);
  const reasoningIds = experts
    .filter((expert) => (expert.tags ?? []).includes('추론'))
    .sort((a, b) => (b.abilities?.reasoning ?? abilityEntries[b.id].reasoning) - (a.abilities?.reasoning ?? abilityEntries[a.id].reasoning))
    .slice(0, 16)
    .map((expert) => expert.id);
  const fastIds = experts
    .filter((expert) => (abilityEntries[expert.id]?.speed ?? 0) >= 88)
    .slice(0, 16)
    .map((expert) => expert.id);
  const flagshipIds = experts
    .filter((expert) => (abilityEntries[expert.id]?.reasoning ?? 0) >= 88 || (expert.tags ?? []).includes('코딩'))
    .slice(0, 20)
    .map((expert) => expert.id);

  const output = `import type { AIAbilityStats, Expert, ModelInfo } from '@/types/expert';\nimport type { ModelBrand } from '@/lib/modelTaxonomy';\n\nexport const OPENROUTER_ADDED_EXPERTS = ${toTsString(experts)} satisfies Expert[];\n\nexport const OPENROUTER_ADDED_ABILITIES = ${toTsString(abilityEntries)} satisfies Record<string, AIAbilityStats>;\n\nexport const OPENROUTER_ADDED_BRANDS = ${toTsString(brandEntries)} satisfies Record<string, ModelBrand>;\n\nexport const OPENROUTER_ADDED_OPENSOURCE_IDS = ${toTsString(openSourceIds)} as const;\n\nexport const OPENROUTER_ADDED_REASONING_IDS = ${toTsString(reasoningIds)} as const;\n\nexport const OPENROUTER_ADDED_FAST_IDS = ${toTsString(fastIds)} as const;\n\nexport const OPENROUTER_ADDED_FLAGSHIP_IDS = ${toTsString(flagshipIds)} as const;\n\nexport type { ModelInfo };\n`;
  const overridesOutput = `import type { Expert } from '@/types/expert';\n\nexport const OPENROUTER_EXISTING_MODEL_OVERRIDES = ${toTsString(existingOverrides)} satisfies Partial<Record<string, Pick<Expert, 'name' | 'nameKo' | 'description' | 'tags' | 'modelInfo'>>>;\n`;
  await downloadOpenRouterProviderFavicons(BRAND_CONFIG);
  await fs.writeFile(OUT_PATH, output, 'utf8');
  await fs.writeFile(EXISTING_OVERRIDES_PATH, overridesOutput, 'utf8');
  await fs.writeFile(REPORT_PATH, JSON.stringify({
    fetchedAt: new Date().toISOString(),
    source: OPENROUTER_MODELS_URL,
    totalOpenRouterModels: models.length,
    existingAiIds: existing.ids.size,
    existingOpenrouterModels: existing.openrouterModels.size,
    existingOverrides: Object.keys(existingOverrides).length,
    existingMissingOpenrouterModels: [...new Set(existingMissing)].sort(),
    selectedCount: experts.length,
    selectedProviders: experts.reduce((acc, expert) => {
      const provider = expert.modelInfo?.provider ?? 'Other';
      acc[provider] = (acc[provider] ?? 0) + 1;
      return acc;
    }, {}),
    selected: experts.map((expert) => ({
      id: expert.id,
      name: expert.name,
      openrouterModel: expert.openrouterModel,
      tags: expert.tags,
      provider: expert.modelInfo?.provider,
      contextLength: expert.modelInfo?.contextLength,
      createdAt: expert.modelInfo?.createdAt,
    })),
    topCandidates: candidates.slice(0, 260),
  }, null, 2), 'utf8');
  console.log(`Generated ${experts.length} models -> ${path.relative(ROOT, OUT_PATH)}`);
  console.log(`Generated ${Object.keys(existingOverrides).length} existing overrides -> ${path.relative(ROOT, EXISTING_OVERRIDES_PATH)}`);
  console.log(`Report -> ${path.relative(ROOT, REPORT_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
