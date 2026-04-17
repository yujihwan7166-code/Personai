import type { AutoAgentConfig } from '@/utils/agent/config';
import type { ClassificationMode, StrategyType } from './types';

type Profile = AutoAgentConfig | undefined;

export function resolveSearchPolicy(
  profileSearchPolicy: 'auto' | 'always' | 'never' | undefined,
  needsSearch?: boolean,
) {
  if (profileSearchPolicy === 'never') {
    return 'never' as const;
  }

  if (needsSearch || profileSearchPolicy === 'always') {
    return 'always' as const;
  }

  return 'auto' as const;
}

export function resolveTaskBudget(profile: Profile, complexityMode: ClassificationMode) {
  const base = profile?.maxTasks ?? 4;
  const qualityTier = profile?.qualityTier ?? 'balanced';

  if (complexityMode === 'deep') {
    return Math.min(base + (qualityTier === 'premium' || qualityTier === 'search-first' ? 1 : 0), 6);
  }

  if (qualityTier === 'premium') {
    return Math.min(base + 1, 5);
  }

  return base;
}

export function resolveFinalTokenBudget(profile: Profile, complexityMode: ClassificationMode) {
  const base = profile?.maxFinalTokens ?? 2400;
  const qualityTier = profile?.qualityTier ?? 'balanced';

  if (complexityMode === 'deep') {
    return Math.min(base + (qualityTier === 'premium' ? 600 : 450), 4096);
  }

  if (qualityTier === 'search-first') {
    return Math.min(base + 250, 4096);
  }

  return base;
}

export function resolveReviewThreshold(profile: Profile, complexityMode: ClassificationMode) {
  const base = profile?.reviewMinChars ?? 800;
  const qualityTier = profile?.qualityTier ?? 'balanced';

  if (complexityMode === 'deep') {
    return base + (qualityTier === 'premium' ? 220 : 140);
  }

  if (qualityTier === 'search-first') {
    return base + 80;
  }

  return base;
}

export function shouldRunReviewPass(
  answer: string,
  strategyType: StrategyType,
  complexityMode: ClassificationMode,
  minChars: number,
) {
  if (answer.trim().length >= minChars) {
    return false;
  }

  if (complexityMode === 'deep') {
    return true;
  }

  return ['comparison', 'deep_dive', 'multi_perspective', 'pros_cons'].includes(strategyType);
}
