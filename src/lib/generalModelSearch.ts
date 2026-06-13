import type { Expert } from '@/types/expert';
import { buildGeneralModelMeta } from '@/lib/generalModelExplorerMeta';

function normalizeGeneralModelSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9가-힣]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function buildGeneralModelSearchTerms(
  expert: Expert,
  providerLabel: string,
  tags: readonly string[],
) {
  return [
    expert.name,
    expert.nameKo,
    expert.description,
    expert.openrouterModel ?? '',
    expert.subCategory ?? '',
    providerLabel,
    expert.modelInfo?.provider ?? '',
    expert.modelInfo?.priceTier ?? '',
    String(expert.modelInfo?.contextLength ?? ''),
    ...(expert.modelInfo?.inputModalities ?? []),
    ...(expert.modelInfo?.outputModalities ?? []),
    ...tags,
    ...buildGeneralModelMeta(expert, providerLabel).flatMap(([label, value]) => [label, value]),
  ];
}

export function matchesGeneralModelQuery(
  expert: Expert,
  query: string,
  providerLabel: string,
  tags: readonly string[],
) {
  const q = normalizeGeneralModelSearchText(query);
  if (!q) return true;
  const queryTokens = q.split(' ');
  return buildGeneralModelSearchTerms(expert, providerLabel, tags)
    .some((value) => {
      const normalizedValue = normalizeGeneralModelSearchText(value);
      return normalizedValue.includes(q) || queryTokens.every((token) => normalizedValue.includes(token));
    });
}
