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
];

const PRESERVE_EXISTING_CARD_IDS = new Set(['developer-yjh', 'ancano-pro', 'auto-gpt']);

const MUST_INCLUDE_PREFIXES = new Set(BRAND_CONFIG.slice(0, 24).map((item) => item.prefix));
const KNOWN_OPEN_WEIGHT_PREFIXES = new Set([
  'meta-llama/',
  'mistralai/',
  'deepseek/',
  'qwen/',
  'google/',
  'microsoft/',
  'nvidia/',
  'z-ai/',
  'nousresearch/',
  'cognitivecomputations/',
  'allenai/',
  'arcee-ai/',
  'deepcogito/',
  'inclusionai/',
  'liquid/',
  'prime-intellect/',
  'rekaai/',
]);

const EXCLUDE_PATTERNS = [
  /\bmoderation\b/i,
  /\bsafety\b/i,
  /\bguard\b/i,
  /\bembedding\b/i,
  /\btts\b/i,
  /\baudio\b/i,
  /\bwhisper\b/i,
  /\bimage generation\b/i,
  /\bdeprecated\b/i,
];

const LOW_CONFIDENCE_PROVIDER_PREFIXES = new Set([
  'anthracite-org/',
  'gryphe/',
  'mancer/',
  'sao10k/',
  'thedrummer/',
  'undi95/',
]);

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

function isImageOrVideoModel(model) {
  const input = model.architecture?.input_modalities ?? [];
  const output = model.architecture?.output_modalities ?? [];
  return [...input, ...output].some((item) => item === 'image' || item === 'video');
}

function isFree(model) {
  const prompt = Number(model.pricing?.prompt ?? '0');
  const completion = Number(model.pricing?.completion ?? '0');
  return model.id.endsWith(':free') || (prompt === 0 && completion === 0);
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
  if (isReasoningModel(model)) tags.push('추론');
  if (isCodingModel(model)) tags.push('코딩');
  if (isVisionModel(model)) tags.push('멀티모달');
  if ((model.context_length ?? 0) >= 500_000) tags.push('장문맥');
  if (isFree(model)) tags.push('무료');
  if (priceTier(model) === 'low') tags.push('저비용');
  if (KNOWN_OPEN_WEIGHT_PREFIXES.has(brandFor(model.id).prefix) && !['openai/', 'anthropic/'].includes(brandFor(model.id).prefix)) tags.push('오픈웨이트');
  if (/search|sonar|perplexity/i.test(model.id)) tags.push('검색');
  if (/creative|story|writer|writing/i.test(model.id)) tags.push('창작');
  if (/mini|small|lite|flash|fast|turbo|haiku|nano/i.test(model.id)) tags.push('고속');
  if (/korean|solar|upstage/i.test(model.id)) tags.push('한국어');
  if (/qwen|glm|ernie|hunyuan|baidu|tencent|moonshot|kimi/i.test(model.id)) tags.push('중국어');
  if (tags.length < 3) tags.push('범용');
  if (tags.length < 3) tags.push('업무');
  return [...new Set(tags)].slice(0, 4);
}

function descriptionFor(model) {
  const tags = tagsFor(model);
  const cfg = brandFor(model.id);
  const name = cleanName(model.name);
  const contextLength = model.context_length ?? model.top_provider?.context_length ?? 0;
  const contextLabel = contextLength >= 1_000_000 ? '1M 장문맥' : contextLength >= 262_144 ? '대용량 문맥' : contextLength >= 128_000 ? '128K급 문맥' : '일반 문맥';
  if (tags.includes('코딩')) return `${cfg.provider}의 ${name} 코딩 및 에이전트 작업 특화 모델`;
  if (tags.includes('검색')) return `${cfg.provider}의 출처 기반 검색 및 리서치 모델`;
  if (tags.includes('멀티모달')) return `${cfg.provider}의 이미지 이해가 가능한 ${contextLabel} 모델`;
  if (tags.includes('추론')) return `${cfg.provider}의 복잡한 추론과 분석에 강한 모델`;
  if (tags.includes('고속')) return `${cfg.provider}의 빠른 응답과 비용 효율 중심 모델`;
  return `${cfg.provider}의 ${contextLabel} 범용 대화 모델`;
}

function sampleQuestionsFor(tags) {
  if (tags.includes('코딩')) return ['이 코드 구조를 리팩터링해줘', '버그 원인을 단계별로 찾아줘', 'API 설계를 검토해줘'];
  if (tags.includes('검색')) return ['최신 자료를 근거와 함께 정리해줘', '이 주장에 대한 출처를 찾아줘', '여러 자료의 차이를 비교해줘'];
  if (tags.includes('멀티모달')) return ['이미지 내용을 분석해줘', '화면을 읽고 요약해줘', '시각 자료에서 핵심을 뽑아줘'];
  if (tags.includes('추론')) return ['복잡한 문제를 단계별로 풀어줘', '논리의 약점을 찾아줘', '선택지를 기준별로 비교해줘'];
  if (tags.includes('창작')) return ['초안을 더 매력적으로 바꿔줘', '스토리 아이디어를 확장해줘', '브랜드 문구를 다듬어줘'];
  return ['핵심만 빠르게 요약해줘', '실행 가능한 계획으로 정리해줘', '장단점을 표로 비교해줘'];
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
  if (isImageOrVideoModel(model)) return true;
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
      quote: tags.includes('추론') ? '깊게 따져보고 정리하겠습니다' : tags.includes('코딩') ? '코드와 작업 흐름에 강합니다' : tags.includes('고속') ? '가볍고 빠르게 처리합니다' : '상황에 맞게 균형 있게 답합니다',
      sampleQuestions: sampleQuestionsFor(tags),
      greeting: `${cfg.provider}의 ${cleanName(model.name)} 모델입니다. ${tags.join(', ')} 작업에 맞춰 도와드리겠습니다`,
      tags,
      modelInfo: {
        provider: cfg.provider,
        contextLength,
        inputModalities,
        outputModalities,
        priceTier: priceTier(model),
        ...(createdAt ? { createdAt } : {}),
        openWeight: KNOWN_OPEN_WEIGHT_PREFIXES.has(cfg.prefix) && cfg.brand !== 'gemini',
      },
    },
    brand: cfg.brand,
    abilities: abilitiesFor(model),
  };
}

function overrideForExistingModel(entry, model) {
  const cfg = brandFor(model.id);
  const tags = tagsFor(model);
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
      description: descriptionFor(model),
      tags,
      modelInfo: {
        provider: cfg.provider,
        contextLength,
        inputModalities,
        outputModalities,
        priceTier: priceTier(model),
        ...(createdAt ? { createdAt } : {}),
        openWeight: KNOWN_OPEN_WEIGHT_PREFIXES.has(cfg.prefix) && cfg.brand !== 'gemini',
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
