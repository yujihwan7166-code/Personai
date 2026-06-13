import type { Expert } from '@/types/expert';

const HIDDEN_GENERAL_MODEL_IDS = new Set(['ancano-pro', 'developer-yjh', 'dolphin', 'or-nex-agi-nex-n2-pro-free']);
const MOJIBAKE_MARKERS = /[\uFFFD\u5360\u7B4C\u75AB\u7652\u7570\u8084\u934E\u936E\uF900-\uFAFF]/u;

export function hasImageVideoOutput(expert: Expert) {
  return (expert.modelInfo?.outputModalities ?? []).some((modality) => modality === 'image' || modality === 'video');
}

export function hasNonTextOutput(expert: Expert) {
  return (expert.modelInfo?.outputModalities ?? []).some((modality) => modality !== 'text');
}

export function isVisibleGeneralTextModel(expert: Expert) {
  if (expert.category !== 'ai') return false;
  if (expert.id.startsWith('auto-')) return false;
  if (HIDDEN_GENERAL_MODEL_IDS.has(expert.id)) return false;
  return !hasNonTextOutput(expert);
}

export function hasLikelyMojibake(text: string) {
  return MOJIBAKE_MARKERS.test(text);
}
