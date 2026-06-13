import type { Expert } from '@/types/expert';

const POPULAR_MODEL_RANKS: Record<string, number> = {
  'or-anthropic-claude-fable-5': 1,
  'or-openai-gpt-5-5': 2,
  'gemini-pro': 3,
  'or-anthropic-claude-opus-4-8': 4,
  'perplexity-pro': 5,
  'or-deepseek-deepseek-v4-pro': 6,
  'or-openai-gpt-5-5-pro': 7,
  'or-qwen-qwen3-coder-next': 8,
  'grok-4.2': 9,
  'or-anthropic-claude-opus-4-7': 10,
  'or-moonshotai-kimi-k2-6': 11,
  'or-openai-gpt-5-3-codex': 12,
  'or-google-gemini-3-1-pro-preview-customtools': 14,
  'or-qwen-qwen3-7-max': 15,
  'or-minimax-minimax-m3': 16,
  'or-z-ai-glm-5': 17,
  'claude-sonnet-4.6': 18,
  'or-openai-gpt-5-4': 19,
  'or-x-ai-grok-build-0-1': 20,
  'or-openai-gpt-5-4-pro': 21,
  'claude-sonnet': 22,
  'or-openai-gpt-5-2-codex': 23,
  'or-anthropic-claude-opus-4-8-fast': 24,
  'or-openai-gpt-5-codex': 25,
  'or-anthropic-claude-opus-4-7-fast': 26,
  'or-openai-gpt-5-2': 27,
  'or-openai-gpt-5-2-pro': 28,
  'or-openai-o3-pro': 29,
  'claude': 30,
  'or-openai-gpt-5': 31,
  'or-openai-gpt-5-1-codex': 32,
};

function textFor(expert: Expert) {
  return `${expert.id} ${expert.name ?? ''} ${expert.nameKo ?? ''} ${expert.openrouterModel ?? ''} ${expert.modelInfo?.provider ?? ''}`.toLowerCase();
}

function recencyScore(createdAt = '') {
  if (createdAt >= '2026-05-01') return 8;
  if (createdAt >= '2026-01-01') return 6;
  if (createdAt >= '2025-07-01') return 4;
  if (createdAt >= '2025-01-01') return 2;
  if (createdAt >= '2024-01-01') return -4;
  return -8;
}

export function generalModelPopularityScore(expert: Expert): number {
  const fixedRank = POPULAR_MODEL_RANKS[expert.id];
  if (fixedRank) return 10_000 - fixedRank * 30;

  const abilities = expert.abilities;
  const text = textFor(expert);
  const quality =
    (abilities?.reasoning ?? 60) * 0.34 +
    (abilities?.coding ?? 60) * 0.24 +
    (abilities?.creativity ?? 60) * 0.12 +
    (abilities?.contextWindow ?? 60) * 0.12 +
    (abilities?.speed ?? 60) * 0.08 +
    (abilities?.costEfficiency ?? 60) * 0.04;
  const flagshipBonus = /fable|opus|sonnet|gpt-5|gemini.*pro|grok-4|deepseek-v4|qwen3.*(?:max|coder)|kimi-k2|glm-5|codestral|devstral/.test(text) ? 9 : 0;
  const codingBonus = /codex|coder|codestral|devstral/.test(text) ? 4 : 0;
  const broadUseBonus = /openai|anthropic|google|deepseek|qwen|x-ai|perplexity/.test(text) ? 3 : 0;
  const lightPenalty = /nano|mini|lite|haiku|small|micro|1b|3b|4b/.test(text) ? -10 : 0;
  const searchPenalty = /search|sonar|perplexity/.test(text) ? -3 : 0;
  const oldPenalty = /gpt-4o|gpt-4\.1|2024|2023/.test(text) ? -5 : 0;

  return quality + flagshipBonus + codingBonus + broadUseBonus + lightPenalty + searchPenalty + oldPenalty + recencyScore(expert.modelInfo?.createdAt);
}

export function compareGeneralModelPopularity(a: Expert, b: Expert): number {
  const scoreDelta = generalModelPopularityScore(b) - generalModelPopularityScore(a);
  if (scoreDelta !== 0) return scoreDelta;

  const dateDelta = (b.modelInfo?.createdAt ?? '').localeCompare(a.modelInfo?.createdAt ?? '');
  if (dateDelta !== 0) return dateDelta;

  return a.nameKo.localeCompare(b.nameKo, 'ko');
}
