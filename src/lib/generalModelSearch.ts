import type { Expert } from '@/types/expert';
import { buildGeneralModelMeta } from '@/lib/generalModelExplorerMeta';

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
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return buildGeneralModelSearchTerms(expert, providerLabel, tags)
    .some((value) => value.toLowerCase().includes(q));
}
