import type { Expert } from '@/types/expert';
import { MODEL_IS_OPENSOURCE } from '@/lib/modelTaxonomy';
import { isFastModel, modelFieldTags } from '@/lib/generalModelExplorerFilters';

export type GeneralModelMetaRow = readonly [label: string, value: string];

export function formatGeneralModelContextLength(contextLength = 0) {
  if (contextLength >= 1_000_000) return '1M+ 토큰';
  if (contextLength >= 262_144) return `${Math.round(contextLength / 1024)}K 토큰`;
  if (contextLength > 0) return `${Math.round(contextLength / 1000)}K 토큰`;
  return '128K 토큰';
}

export function formatGeneralModelPriceTier(expert: Expert) {
  const priceLabel: Record<NonNullable<Expert['modelInfo']>['priceTier'], string> = {
    free: '무료',
    low: '저비용',
    standard: '표준',
    premium: '프리미엄',
  };
  if (expert.modelInfo?.priceTier) return priceLabel[expert.modelInfo.priceTier];
  if (expert.modelInfo?.openWeight || MODEL_IS_OPENSOURCE.has(expert.id)) return '무료/저비용';
  return '표준 가격';
}

export function formatGeneralModelInputModalities(inputModalities: string[] = ['text']) {
  const modalityParts = [
    inputModalities.includes('text') ? '텍스트' : null,
    inputModalities.includes('image') ? '이미지' : null,
    inputModalities.includes('audio') ? '음성' : null,
    inputModalities.includes('video') ? '비디오' : null,
    inputModalities.includes('file') ? '파일' : null,
  ].filter(Boolean);

  return modalityParts.length > 0 ? modalityParts.join('+') : '텍스트';
}

export function buildGeneralModelMeta(expert: Expert, providerLabel: string): GeneralModelMetaRow[] {
  return [
    ['제공사', providerLabel],
    ['분야', modelFieldTags(expert).join(', ')],
    ['속도', isFastModel(expert) ? '빠름' : '보통'],
    ['가격', formatGeneralModelPriceTier(expert)],
    ['컨텍스트 길이', formatGeneralModelContextLength(expert.modelInfo?.contextLength ?? 0)],
    ['출시일', expert.modelInfo?.createdAt ?? '2025년 5월'],
    ['입력', formatGeneralModelInputModalities(expert.modelInfo?.inputModalities ?? ['text'])],
    ['모델 유형', expert.modelInfo?.openWeight || MODEL_IS_OPENSOURCE.has(expert.id) ? '오픈웨이트' : '폐쇄형'],
  ];
}
