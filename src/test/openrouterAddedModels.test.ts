import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';
import {
  OPENROUTER_ADDED_ABILITIES,
  OPENROUTER_ADDED_EXPERTS,
  OPENROUTER_ADDED_FAST_IDS,
  OPENROUTER_ADDED_FLAGSHIP_IDS,
} from '@/data/openrouter-added-models';
import { AI_MODEL_IDS, AI_MODEL_PROMPTS } from '@/data/prompts/ai-models';
import { OPENROUTER_EXISTING_MODEL_OVERRIDES } from '@/data/openrouter-existing-model-overrides';
import {
  AI_GROUP_CATS,
  buildExpertSelectionGroups,
  FAST_MODEL_IDS,
  FLAGSHIP_MODEL_IDS,
} from '@/lib/expertSelectionGroups';
import { getExpertPrompt } from '@/lib/expertPromptLoader';
import {
  GENERAL_SPEC_LABELS,
  getGeneralModelDisplayTags,
  getGeneralSpecIds,
  getGeneralTraitIds,
  isFastModel,
  matchesGeneralQuickFilter,
} from '@/lib/generalModelExplorerFilters';
import {
  buildGeneralModelMeta,
  formatGeneralModelContextLength,
  formatGeneralModelInputModalities,
  formatGeneralModelPriceTier,
} from '@/lib/generalModelExplorerMeta';
import { matchesGeneralModelQuery } from '@/lib/generalModelSearch';
import { hasLikelyMojibake, isVisibleGeneralTextModel } from '@/lib/generalModelCatalog';
import { REASONING_MODEL_IDS } from '@/lib/modelTaxonomy';
import { mergePersistedExperts } from '@/lib/expertPersistence';
import { DEFAULT_EXPERTS } from '@/types/expert';
import { buildPageNumbers } from '@/lib/pagination';

describe('openrouter added model catalog', () => {
  const metadataCheckedAsOf = '2026-06-13';
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  it('adds OpenRouter-backed text AI models', () => {
    expect(OPENROUTER_ADDED_EXPERTS).toHaveLength(200);
    expect(OPENROUTER_ADDED_EXPERTS.every((expert) => expert.category === 'ai')).toBe(true);
    expect(OPENROUTER_ADDED_EXPERTS.every((expert) => expert.openrouterModel)).toBe(true);
  });

  it('keeps model catalog audits available through npm scripts', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));

    expect(packageJson.scripts['audit:models']).toBe('vite-node scripts/audit-model-catalog.mjs');
    expect(packageJson.scripts['audit:models:compact']).toBe('vite-node scripts/audit-model-catalog.mjs --compact');
    expect(packageJson.scripts['audit:openrouter']).toBe('vite-node scripts/audit-openrouter-coverage.mjs');
    expect(packageJson.scripts['audit:openrouter:compact']).toBe('vite-node scripts/audit-openrouter-coverage.mjs --compact');
  });

  it('emits a parseable compact local model audit summary', () => {
    const output = execFileSync(process.execPath, [
      path.join(process.cwd(), 'node_modules', 'vite-node', 'vite-node.mjs'),
      'scripts/audit-model-catalog.mjs',
      '--compact',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const summary = JSON.parse(output);

    expect(summary.addedOpenRouterCount).toBe(200);
    expect(summary.visibleGeneralCount).toBeGreaterThanOrEqual(200);
    expect(summary.visibleGeneralNonTextOutputModelCount).toBe(0);
    expect(summary.visibleGeneralRoleplayHeavyModelCount).toBe(0);
    expect(summary.visibleGeneralDuplicateOpenRouterModelCount).toBe(0);
    expect(summary.visibleGeneralAvatarAssetIssueCount).toBe(0);
    expect(summary.metadataQuality.missingCreatedAtCount).toBe(0);
    expect(summary.providerCoverage.requiredProviderCount).toBeGreaterThanOrEqual(10);
    expect(summary.providerCoverage.missingRequiredProviders).toEqual([]);
    expect(summary.tagDiversity.uniqueTags).toBeGreaterThanOrEqual(14);
    expect(summary.tagDiversity.overHalfTags.length).toBe(0);
    expect(summary.tagDiversity.invalidTagCount).toBe(0);
    expect(summary.tagDiversity.invalidTags).toEqual([]);
    expect(summary.tagDiversity.metadataMismatchCount).toBe(0);
    expect(summary.tagDiversity.metadataMismatches).toEqual([]);
    expect(summary.displayTagQuality.invalidDisplayTagCount).toBe(0);
    expect(summary.displayTagQuality.invalidDisplayTags).toEqual([]);
    expect(summary.displayTagQuality.metadataMismatchCount).toBe(0);
    expect(summary.displayTagQuality.metadataMismatches).toEqual([]);
    expect(summary.abilityQuality.missingAbilityCount).toBe(0);
    Object.entries(summary.abilityQuality.ranges).forEach(([key, range]) => {
      expect((range as { unique: number }).unique).toBeGreaterThanOrEqual(key === 'contextWindow' ? 6 : 12);
    });
    expect(summary.copyDiversity.uniqueDescriptionSkeletons).toBeGreaterThanOrEqual(70);
    expect(summary.copyDiversity.awkwardCopyPatternCount).toBe(0);
    expect(summary.copyDiversity.routerIdDescriptionCount).toBe(0);
    expect(summary.copyDiversity.namePrefixedDescriptionCount).toBe(0);
    expect(summary.copyDiversity.sampleQuestionQuality).toMatchObject({
      missingCount: 0,
      tooLongCount: 0,
      selfReferentialCount: 0,
      metadataLikeCount: 0,
    });
    expect(summary.sampleQuestionQuality).toMatchObject({
      missingCount: 0,
      tooLongCount: 0,
      selfReferentialCount: 0,
      metadataLikeCount: 0,
    });
    expect(summary.copyCompleteness).toEqual({
      missingGreetingCount: 0,
      staleGreetingNameCount: 0,
      missingQuoteCount: 0,
      tooShortQuoteCount: 0,
      namePrefixedDescriptionCount: 0,
      awkwardCopyPatternCount: 0,
    });
    expect(summary.runtimePromptQuality).toEqual({
      missingRuntimePromptCount: 0,
      missingIdentityCount: 0,
    });
    Object.values(summary.explorerFilterCoverage.quick).forEach((count) => {
      expect(count as number).toBeGreaterThanOrEqual(5);
      expect(count as number).toBeLessThanOrEqual(Math.ceil(summary.visibleGeneralCount * 0.55));
    });
    Object.values(summary.explorerFilterCoverage.trait).forEach((count) => {
      expect(count as number).toBeGreaterThanOrEqual(5);
      expect(count as number).toBeLessThanOrEqual(Math.ceil(summary.visibleGeneralCount * 0.55));
    });
    Object.values(summary.explorerFilterCoverage.detail).forEach((count) => {
      expect(count as number).toBeGreaterThan(0);
    });
    expect(summary.explorerFilterCoverage.detail['input-file']).toBe(summary.filterBuckets.input.file);
    expect(summary.explorerFilterCoverage.detail['input-audio-video']).toBe(summary.filterBuckets.input.audioVideo);
    expect(summary.explorerFilterCoverage.detail['input-vision']).toBe(summary.filterBuckets.input.image);
    expect(summary.explorerFilterCoverage.detail['input-text']).toBe(summary.filterBuckets.input.textOnly);
    expect(summary.explorerFilterCoverage.detail['speed-fast'] + summary.explorerFilterCoverage.detail['speed-normal']).toBe(summary.visibleGeneralCount);
    expect(summary.newFilterQuality.olderModelCount).toBe(0);
    expect(summary.newFilterQuality.missingConfiguredIds).toEqual([]);
    expect(summary.newFilterQuality.uniqueProviderCount).toBeGreaterThanOrEqual(8);
    expect(summary.searchQuality.missingQueryCount).toBe(0);
    expect(summary.searchQuality.missingQueries).toEqual([]);
    expect(summary.searchQuality.overbroadQueryCount).toBe(0);
    expect(summary.searchQuality.queries.map((item: { query: string }) => item.query)).toEqual([
      'gpt 5',
      'claude opus',
      'qwen coder',
      '무료',
      '파일',
      '오픈웨이트',
      'moonshot',
    ]);
    expect(summary.selectionGroups.every((group: { duplicateCount: number; hiddenCount: number }) =>
      group.duplicateCount === 0 && group.hiddenCount === 0)).toBe(true);
    expect(summary.selectionGroups.find((group: { cat: string }) => group.cat === 'ai_flagship')?.uniqueProviderCount).toBeGreaterThanOrEqual(10);
    expect(summary.selectionGroups.find((group: { cat: string }) => group.cat === 'ai_reasoning')?.uniqueProviderCount).toBeGreaterThanOrEqual(10);
    expect(summary.selectionGroups.find((group: { cat: string }) => group.cat === 'ai_fast')?.uniqueProviderCount).toBeGreaterThanOrEqual(10);
    expect(summary.selectionGroups.every((group: { maxProviderShare: number }) => group.maxProviderShare <= 0.35)).toBe(true);
  }, 15_000);

  it('keeps generated general models text-output only', () => {
    OPENROUTER_ADDED_EXPERTS.forEach((expert) => {
      expect(expert.modelInfo?.outputModalities, `${expert.id} should output text`).toContain('text');
      expect(expert.modelInfo?.outputModalities, `${expert.id} should not output images`).not.toContain('image');
      expect(expert.modelInfo?.outputModalities, `${expert.id} should not output video`).not.toContain('video');
      expect(expert.modelInfo?.outputModalities, `${expert.id} should not output audio`).not.toContain('audio');
    });
  });

  it('is included in the default expert catalog', () => {
    const defaultIds = new Set(DEFAULT_EXPERTS.map((expert) => expert.id));
    OPENROUTER_ADDED_EXPERTS.forEach((expert) => {
      expect(defaultIds.has(expert.id), `${expert.id} should be in DEFAULT_EXPERTS`).toBe(true);
    });
  });

  it('keeps generated ids and OpenRouter model ids unique', () => {
    const ids = OPENROUTER_ADDED_EXPERTS.map((expert) => expert.id);
    const openrouterIds = OPENROUTER_ADDED_EXPERTS.map((expert) => expert.openrouterModel);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(openrouterIds).size).toBe(openrouterIds.length);
  });

  it('provides an OpenRouter/provider image for every generated model', () => {
    OPENROUTER_ADDED_EXPERTS.forEach((expert) => {
      expect(expert.avatarUrl, `${expert.id} is missing an avatar`).toBeTruthy();
      expect(expert.avatarUrl?.startsWith('/logos/'), `${expert.id} should use a local logo`).toBe(true);
      expect(expert.avatarUrl, `${expert.id} should not use the generic router mark`).not.toBe('/logos/router.svg');
      expect(fs.existsSync(path.join(process.cwd(), 'public', expert.avatarUrl ?? '')), `${expert.id} logo should exist`).toBe(true);
    });
  });

  it('uses OpenRouter provider favicons instead of generated fallback marks', () => {
    const openrouterProviderMarks = OPENROUTER_ADDED_EXPERTS.filter((expert) => expert.avatarUrl?.startsWith('/logos/openrouter/'));
    const openrouterLogoFiles = fs.readdirSync(path.join(process.cwd(), 'public', 'logos', 'openrouter'));

    expect(openrouterProviderMarks.length).toBeGreaterThan(15);
    expect(new Set(openrouterProviderMarks.map((expert) => expert.avatarUrl)).size).toBeGreaterThan(10);
    expect(openrouterProviderMarks.every((expert) => expert.avatarUrl?.endsWith('.png'))).toBe(true);
    expect(openrouterLogoFiles.every((file) => file.endsWith('.png'))).toBe(true);
  });

  it('covers famous and current model providers', () => {
    const providers = new Set(OPENROUTER_ADDED_EXPERTS.map((expert) => expert.modelInfo?.provider));
    [
      'OpenAI',
      'Google',
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
    ].forEach((provider) => {
      expect(providers.has(provider), `${provider} should be represented`).toBe(true);
    });
  });

  it('keeps important current OpenRouter models in the 200-model selection', () => {
    const openrouterIds = new Set(OPENROUTER_ADDED_EXPERTS.map((expert) => expert.openrouterModel));
    [
      'google/gemini-3.1-flash-lite',
      'openai/gpt-5',
      'openai/gpt-5-pro',
      'openai/gpt-5-mini',
      'openai/gpt-5-nano',
      'openai/gpt-5.4-nano',
      'openai/gpt-5.3-chat',
      'openai/gpt-5.3-codex',
      'openai/gpt-5.2-pro',
      'openai/gpt-5.2',
      'openai/gpt-5.2-chat',
      'openai/gpt-5.2-codex',
      'openai/gpt-5-codex',
      'openai/gpt-5.1-chat',
      'openai/gpt-5.1-codex-max',
      'openai/gpt-5.1-codex',
      'openai/gpt-5.1-codex-mini',
      'openai/gpt-5.5-pro',
      'openai/gpt-5.5',
      'openai/gpt-5.4-pro',
      'openai/gpt-5.4',
      'openai/gpt-5.1',
      'openai/gpt-chat-latest',
      'openai/o3-pro',
      'openai/o3',
      'openai/o3-deep-research',
      'openai/o4-mini-deep-research',
      'openai/o4-mini',
      'openai/o4-mini-high',
      'openai/o3-mini-high',
      'openai/o3-mini',
      'openai/o1-pro',
      'openai/o1',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/gpt-4o-search-preview',
      'openai/gpt-4o-mini-search-preview',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-120b:free',
      'openai/gpt-oss-20b',
      'openai/gpt-oss-20b:free',
      'qwen/qwen3-max',
      'qwen/qwen3.7-plus',
      'qwen/qwen3.5-plus-20260420',
      'qwen/qwen3.6-flash',
      'qwen/qwen3.6-35b-a3b',
      'qwen/qwen3.6-27b',
      'qwen/qwen3-next-80b-a3b-thinking',
      'qwen/qwen3-coder-next',
      'qwen/qwen3.6-max-preview',
      'qwen/qwen-plus-2025-07-28:thinking',
      'qwen/qwen-plus-2025-07-28',
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
    ].forEach((modelId) => {
      expect(openrouterIds.has(modelId), `${modelId} should remain selected`).toBe(true);
    });
  });

  it('does not include safety or vision-specialized models in generated general models', () => {
    const blockedPattern = /\b(content[-\s]?safety|safeguard|moderation|guardrail|vision|vl|router|rp|role[-\s]?play(?:ing)?|uncensored)\b/i;
    const lowConfidencePrefixes = [
      'aion-labs/',
      'anthracite-org/',
      'gryphe/',
      'mancer/',
      'sao10k/',
      'thedrummer/',
      'undi95/',
    ];
    const staleOpenAiSnapshots = new Set([
      'openai/gpt-4o-2024-05-13',
      'openai/gpt-4o-2024-08-06',
      'openai/gpt-4o-2024-11-20',
      'openai/gpt-4o-mini-2024-07-18',
      'openai/gpt-3.5-turbo-0613',
      'openai/gpt-3.5-turbo-16k',
      'openai/gpt-3.5-turbo-instruct',
    ]);

    OPENROUTER_ADDED_EXPERTS.forEach((expert) => {
      const text = [
        expert.openrouterModel,
        expert.name,
        expert.nameKo,
        expert.description,
      ].join(' ');

      expect(text, `${expert.id} should stay focused on general text models`).not.toMatch(blockedPattern);
      expect(
        lowConfidencePrefixes.some((prefix) => expert.openrouterModel?.startsWith(prefix)),
        `${expert.id} should not come from a roleplay-heavy provider`,
      ).toBe(false);
      expect(staleOpenAiSnapshots.has(expert.openrouterModel ?? ''), `${expert.id} should not be a stale OpenAI snapshot`).toBe(false);
    });
  });

  it('keeps the final visible general catalog free of roleplay-heavy providers', () => {
    const blockedPattern = /\b(rp|role[-\s]?play(?:ing)?|uncensored)\b/i;
    const lowConfidencePrefixes = [
      'aion-labs/',
      'anthracite-org/',
      'gryphe/',
      'mancer/',
      'sao10k/',
      'thedrummer/',
      'undi95/',
    ];
    const visibleGeneralModels = DEFAULT_EXPERTS.filter(isVisibleGeneralTextModel);

    visibleGeneralModels.forEach((expert) => {
      const text = [
        expert.openrouterModel,
        expert.name,
        expert.nameKo,
        expert.description,
      ].join(' ');

      expect(text, `${expert.id} should not expose RP or uncensored variants in general models`).not.toMatch(blockedPattern);
      expect(
        lowConfidencePrefixes.some((prefix) => expert.openrouterModel?.startsWith(prefix)),
        `${expert.id} should not expose a roleplay-heavy provider in general models`,
      ).toBe(false);
    });
  });

  it('keeps visible general model metadata complete and date-bounded', () => {
    const visibleGeneralModels = DEFAULT_EXPERTS.filter(isVisibleGeneralTextModel);

    visibleGeneralModels.forEach((expert) => {
      expect(expert.modelInfo?.createdAt, `${expert.id} should have an OpenRouter createdAt date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(
        (expert.modelInfo?.createdAt ?? '') <= metadataCheckedAsOf,
        `${expert.id} should not have a future createdAt date`,
      ).toBe(true);
      expect(expert.modelInfo?.contextLength, `${expert.id} should expose context length`).toBeGreaterThan(0);
      expect(expert.modelInfo?.priceTier, `${expert.id} should expose price tier`).toMatch(/^(free|low|standard|premium)$/);
    });
  });

  it('does not expose the same OpenRouter model twice in visible general models', () => {
    const visibleGeneralModels = DEFAULT_EXPERTS.filter(isVisibleGeneralTextModel);
    const openrouterModelCounts = visibleGeneralModels.reduce<Record<string, string[]>>((acc, expert) => {
      if (!expert.openrouterModel) return acc;
      acc[expert.openrouterModel] = [...(acc[expert.openrouterModel] ?? []), expert.id];
      return acc;
    }, {});
    const duplicateOpenrouterModels = Object.entries(openrouterModelCounts)
      .filter(([, ids]) => ids.length > 1)
      .map(([openrouterModel, ids]) => ({ openrouterModel, ids }));

    expect(duplicateOpenrouterModels).toEqual([]);
  });

  it('keeps generated fast model shortcuts populated and speed-aligned', () => {
    expect(OPENROUTER_ADDED_FAST_IDS.length).toBeGreaterThan(0);
    expect(OPENROUTER_ADDED_FAST_IDS.length).toBeLessThanOrEqual(16);

    OPENROUTER_ADDED_FAST_IDS.forEach((id) => {
      expect(OPENROUTER_ADDED_ABILITIES[id]?.speed, `${id} should be a high-speed generated model`).toBeGreaterThanOrEqual(80);
      expect(FAST_MODEL_IDS, `${id} should be available through the shared fast filter`).toContain(id);
    });
  });

  it('shares generated fast and flagship groups with the explorer filters', () => {
    const explorerSource = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'GeneralAiExplorer.tsx'), 'utf8');

    expect(OPENROUTER_ADDED_FLAGSHIP_IDS.length).toBeGreaterThan(0);
    OPENROUTER_ADDED_FLAGSHIP_IDS.forEach((id) => {
      const expert = DEFAULT_EXPERTS.find((item) => item.id === id);
      expect(FLAGSHIP_MODEL_IDS, `${id} should be available through the shared flagship filter`).toContain(id);
      expect(expert, `${id} should resolve to an expert`).toBeDefined();
      expect(matchesGeneralQuickFilter(expert!, 'flagship'), `${id} should match the shared flagship explorer filter`).toBe(true);
    });

    OPENROUTER_ADDED_FAST_IDS.forEach((id) => {
      const expert = DEFAULT_EXPERTS.find((item) => item.id === id);
      expect(expert, `${id} should resolve to an expert`).toBeDefined();
      expect(isFastModel(expert!), `${id} should match the shared fast helper`).toBe(true);
      expect(getGeneralTraitIds(expert!), `${id} should expose fast as a trait`).toContain('fast');
      expect(getGeneralSpecIds(expert!), `${id} should expose speed-fast as a spec`).toContain('speed-fast');
      expect(matchesGeneralQuickFilter(expert!, 'fast'), `${id} should match the shared fast explorer filter`).toBe(true);
    });

    expect(explorerSource).toContain("from '@/lib/generalModelExplorerFilters'");
    expect(explorerSource).toContain('matchesGeneralQuickFilter(expert, filterId)');
    expect(explorerSource).toContain('orderExpertsByIds(experts, SELECTION_FAST_MODEL_IDS)');
    expect(explorerSource).toContain('initialQuickFilter');
    expect(explorerSource).toContain("type HomeQuickFilterId = 'recommended' | 'fast' | 'reasoning'");
    expect(explorerSource).toContain('previousTabRef.current === tab');
    expect(explorerSource).toContain('const clearSearchAndFilters = () =>');
    expect(explorerSource).toContain('{mobileFilterOpen &&');
    expect(explorerSource).toContain('onClick={clearFilters}');
    expect(explorerSource).not.toContain("favorites: 'favorites'");
    expect(explorerSource).toContain("recommended: 'recommended'");
    expect(explorerSource).toContain("fast: 'fast'");
    expect(explorerSource).toContain("reasoning: 'reasoning'");
    expect(explorerSource).not.toContain('LegacyGeneralAiHome');
    expect(explorerSource).not.toContain('HomeModelCard');
  });
  it('uses varied tags instead of repetitive consultation labels', () => {
    const tags = OPENROUTER_ADDED_EXPERTS.flatMap((expert) => expert.tags ?? []);
    const uniqueTags = new Set(tags);

    expect(uniqueTags.size).toBeGreaterThanOrEqual(10);
    expect(tags.some((tag) => tag.includes('전문가 상담'))).toBe(false);
    expect(tags.some((tag) => tag.includes('상담'))).toBe(false);
  });

  it('keeps generated copy varied across the larger catalog', () => {
    const descriptions = OPENROUTER_ADDED_EXPERTS.map((expert) => expert.description);
    const providers = [...new Set(OPENROUTER_ADDED_EXPERTS
      .map((expert) => expert.modelInfo?.provider)
      .filter(Boolean))]
      .sort((a, b) => b.length - a.length);
    const providerPattern = new RegExp(` (${providers.map((provider) => provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
    const descriptionSkeletons = descriptions.map((description) => description
      .replace(/^[^:]+: /, '')
      .replace(providerPattern, ' {provider}'));
    const skeletonCounts = descriptionSkeletons.reduce<Record<string, number>>((acc, skeleton) => {
      acc[skeleton] = (acc[skeleton] ?? 0) + 1;
      return acc;
    }, {});
    const maxSkeletonRepeat = Math.max(...Object.values(skeletonCounts));
    const descriptionsWithRouterIds = descriptions.filter((description) =>
      /\([a-z0-9_.-]+\/[a-z0-9_.:-]+\)/i.test(description));
    const sampleQuestions = OPENROUTER_ADDED_EXPERTS.flatMap((expert) => expert.sampleQuestions ?? []);
    const awkwardProviderParticleQuestions = sampleQuestions.filter((question) => /[A-Za-z0-9. ]+를 써야/.test(question));
    const awkwardKoreanParticleQuestions = sampleQuestions.filter((question) =>
      /(?:대본를|질문를|답변를|아이템를|표현를|결론를|중요도과|메시지과|포인트과)/.test(question));
    const quotes = OPENROUTER_ADDED_EXPERTS.map((expert) => expert.quote);
    const metadataLikeQuestions = sampleQuestions.filter((question) => /(?:\uBAA8\uB378|\bAI\b|OpenRouter|\uD1A0\uD070|\uBB38\uB9E5|\uCEE8\uD14D\uC2A4\uD2B8|128K|200K|1M|\uCD08\uC7A5\uBB38|\uC7A5\uBB38\uB9E5|\uAE09 \uBB38\uB9E5)/i.test(question));
    const overlongQuestions = sampleQuestions.filter((question) => question.length > 34);
    const selfReferentialQuestionCount = OPENROUTER_ADDED_EXPERTS.filter((expert) => {
      const name = expert.nameKo || expert.name;
      const provider = expert.modelInfo?.provider ?? '';
      return (expert.sampleQuestions ?? []).some((question) => question.includes(name) || (provider && question.includes(provider)));
    }).length;

    expect(new Set(descriptions).size).toBeGreaterThanOrEqual(150);
    expect(new Set(descriptionSkeletons).size).toBeGreaterThanOrEqual(70);
    expect(maxSkeletonRepeat).toBeLessThanOrEqual(10);
    expect(descriptionsWithRouterIds).toHaveLength(0);
    expect(awkwardProviderParticleQuestions).toHaveLength(0);
    expect(awkwardKoreanParticleQuestions).toHaveLength(0);
    expect(metadataLikeQuestions).toHaveLength(0);
    expect(overlongQuestions).toHaveLength(0);
    expect(new Set(sampleQuestions).size).toBeGreaterThanOrEqual(330);
    expect(new Set(quotes).size).toBeGreaterThanOrEqual(200);
    ['해석와', '균형와', '요약와', '검증와', '화면와', '활용와', '적용와', '압축와'].forEach((token) => {
      expect(quotes.some((quote) => quote.includes(token)), `quotes should not contain "${token}"`).toBe(false);
    });
    expect(selfReferentialQuestionCount).toBe(0);
  });

  it('keeps open-weight and coding identity visible in generated tags', () => {
    const openWeightModels = OPENROUTER_ADDED_EXPERTS.filter((expert) => expert.modelInfo?.openWeight);
    const codingModels = OPENROUTER_ADDED_EXPERTS.filter((expert) => expert.tags?.includes('코딩'));

    expect(openWeightModels.length).toBeGreaterThanOrEqual(80);
    openWeightModels.forEach((expert) => {
      expect(expert.tags ?? [], `${expert.id} should visibly carry its open-weight tag`).toContain('오픈웨이트');
    });
    expect(codingModels.length).toBeGreaterThanOrEqual(40);
  });

  it('does not emit mojibake in generated model labels', () => {
    const generatedText = OPENROUTER_ADDED_EXPERTS
      .map((expert) => [
        expert.name,
        expert.nameKo,
        expert.description,
        expert.quote,
        expert.greeting,
        ...(expert.tags ?? []),
        ...(expert.sampleQuestions ?? []),
      ].join(' '))
      .join(' ');

    expect(hasLikelyMojibake(generatedText)).toBe(false);
  });

  it('does not keep mojibake in general model UI labels', () => {
    const uiSource = [
      fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'GeneralAiExplorer.tsx'), 'utf8'),
      fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'ExpertDetailModal.tsx'), 'utf8'),
      fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'ExpertHoverTip.tsx'), 'utf8'),
      fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'expertSelectionGroups.ts'), 'utf8'),
      fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'modelTaxonomy.ts'), 'utf8'),
    ].join('\n');

    expect(hasLikelyMojibake(uiSource)).toBe(false);
  });

  it('keeps base general model prompts readable and not strength-section driven', () => {
    expect(AI_MODEL_IDS).toHaveLength(8);

    AI_MODEL_IDS.filter((id) => id !== 'router').forEach((id) => {
      const prompt = AI_MODEL_PROMPTS[id];

      expect(prompt, `${id} prompt should be present`).toContain('한국어로 답하세요');
      expect(hasLikelyMojibake(prompt), `${id} prompt should not contain mojibake`).toBe(false);
      expect(prompt, `${id} prompt should avoid the old strengths section`).not.toContain('## 강점');
      expect(prompt, `${id} prompt should describe answer style`).toContain('## 답변 스타일');
    });

    expect(AI_MODEL_PROMPTS.gpt).toContain('GPT-4.1');
    expect(AI_MODEL_PROMPTS.claude).toContain('Claude Opus 4.6');
    expect(AI_MODEL_PROMPTS.gemini).toContain('Gemini 2.5 Flash');
    expect(AI_MODEL_PROMPTS.grok).toContain('Grok 4.3');
    expect(AI_MODEL_PROMPTS.qwen).toContain('Qwen3.5');
  });

  it('provides model-aware runtime prompts for every visible general model', async () => {
    const visibleGeneralModels = DEFAULT_EXPERTS.filter(isVisibleGeneralTextModel);

    await Promise.all(visibleGeneralModels.map(async (expert) => {
      const prompt = await getExpertPrompt(expert);
      const name = expert.nameKo || expert.name;
      const provider = expert.modelInfo?.provider ?? '';

      expect(prompt.trim().length, `${expert.id} should have a non-empty runtime prompt`).toBeGreaterThanOrEqual(120);
      expect(
        prompt.includes(name) || (provider && prompt.includes(provider)),
        `${expert.id} runtime prompt should include its model name or provider`,
      ).toBe(true);
    }));
  });

  it('provides bounded ability stats for every generated model', () => {
    OPENROUTER_ADDED_EXPERTS.forEach((expert) => {
      const abilities = OPENROUTER_ADDED_ABILITIES[expert.id];
      expect(abilities, `${expert.id} is missing ability stats`).toBeTruthy();
      Object.values(abilities).forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });
  });

  it('keeps generated ability stats meaningfully varied', () => {
    const keys = ['coding', 'creativity', 'reasoning', 'math', 'speed', 'costEfficiency'] as const;

    keys.forEach((key) => {
      const values = OPENROUTER_ADDED_EXPERTS.map((expert) => OPENROUTER_ADDED_ABILITIES[expert.id][key]);
      expect(new Set(values).size, `${key} should not collapse to a few repeated values`).toBeGreaterThan(10);
    });
  });

  it('keeps flagship, lightweight, and legacy reasoning stats in a believable order', () => {
    const ability = (id: string) => {
      const stats = OPENROUTER_ADDED_ABILITIES[id];
      expect(stats, `${id} should have generated abilities`).toBeTruthy();
      return stats;
    };

    const fable = ability('or-anthropic-claude-fable-5');
    const opus = ability('or-anthropic-claude-opus-4-8');
    const sonnet = ability('or-anthropic-claude-sonnet-4');
    const haiku = ability('or-anthropic-claude-3-5-haiku');
    const gpt5 = ability('or-openai-gpt-5');
    const gpt5Mini = ability('or-openai-gpt-5-mini');
    const gpt5Nano = ability('or-openai-gpt-5-nano');
    const geminiPro = ability('or-google-gemini-3-1-pro-preview-customtools');
    const geminiFlashLite = ability('or-google-gemini-3-1-flash-lite');
    const cogito = ability('or-deepcogito-cogito-v2-1-671b');

    expect(fable.reasoning).toBeGreaterThanOrEqual(96);
    expect(fable.reasoning).toBeGreaterThanOrEqual(opus.reasoning);
    expect(fable.reasoning).toBeGreaterThan(sonnet.reasoning);
    expect(fable.reasoning).toBeGreaterThan(haiku.reasoning);
    expect(fable.reasoning).toBeGreaterThan(cogito.reasoning);
    expect(gpt5.reasoning).toBeGreaterThan(gpt5Mini.reasoning);
    expect(gpt5Mini.reasoning).toBeGreaterThan(gpt5Nano.reasoning);
    expect(geminiPro.reasoning).toBeGreaterThan(geminiFlashLite.reasoning);
    expect(gpt5Nano.speed).toBeGreaterThan(gpt5.speed);
    expect(cogito.reasoning).toBeLessThanOrEqual(82);
  });

  it('enriches existing OpenRouter-backed models with verified metadata', () => {
    expect(Object.keys(OPENROUTER_EXISTING_MODEL_OVERRIDES).length).toBeGreaterThanOrEqual(50);

    ['gpt', 'claude', 'gemini'].forEach((id) => {
      const expert = DEFAULT_EXPERTS.find((item) => item.id === id);
      expect(expert?.modelInfo?.createdAt, `${id} should have OpenRouter created date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(expert?.modelInfo?.contextLength, `${id} should have context length`).toBeGreaterThan(0);
      expect(expert?.description, `${id} should have an enriched description`).not.toContain('최상위');
    });

    expect(DEFAULT_EXPERTS.find((item) => item.id === 'gpt')?.name).toBe('GPT-4.1');
    expect(DEFAULT_EXPERTS.find((item) => item.id === 'gpt-mini')?.name).toBe('GPT-4.1 Mini');
  });

  it('keeps existing visible model descriptions specific instead of template-heavy', () => {
    const existingVisibleModels = DEFAULT_EXPERTS
      .filter(isVisibleGeneralTextModel)
      .filter((expert) => !expert.id.startsWith('or-'));
    const descriptions = existingVisibleModels.map((expert) => expert.description);
    const codingTemplateDescriptions = descriptions.filter((description) => description.includes('코드 작성·리팩터링 중심 모델'));
    const visionTemplateDescriptions = descriptions.filter((description) => description.includes('이미지·문서 이해를 곁들인 대화 모델'));
    const genericReasoningDescriptions = descriptions.filter((description) => description.includes('복잡한 판단과 단계별 분석에 초점을 둔 모델'));
    const genericChatDescriptions = descriptions.filter((description) => description.includes('범용 대화 모델'));
    const specFirstDescriptions = descriptions.filter((description) => /(?:\d+\s*[KMB]|1M|128K|200K|9B)급|문맥에서/.test(description));

    expect(existingVisibleModels.length).toBeGreaterThanOrEqual(40);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    existingVisibleModels.forEach((expert) => {
      expect(expert.description, `${expert.id} should not repeat its Korean name at the start`)
        .not.toMatch(new RegExp(`^${escapeRegExp(expert.nameKo || expert.name)}[:：]`));
      expect(expert.description, `${expert.id} should not repeat its English name at the start`)
        .not.toMatch(new RegExp(`^${escapeRegExp(expert.name)}[:：]`));
    });
    expect(codingTemplateDescriptions).toHaveLength(0);
    expect(visionTemplateDescriptions).toHaveLength(0);
    expect(genericReasoningDescriptions).toHaveLength(0);
    expect(genericChatDescriptions).toHaveLength(0);
    expect(specFirstDescriptions).toHaveLength(0);
  });

  it('keeps visible general model sample questions natural enough for cards', () => {
    const sampleQuestions = DEFAULT_EXPERTS
      .filter(isVisibleGeneralTextModel)
      .flatMap((expert) => expert.sampleQuestions ?? []);
    const awkwardKoreanParticleQuestions = sampleQuestions.filter((question) =>
      /(?:대본를|질문를|답변를|아이템를|표현를|결론를|중요도과|메시지과|포인트과)/.test(question));

    expect(sampleQuestions.length).toBeGreaterThan(100);
    expect(awkwardKoreanParticleQuestions).toHaveLength(0);
  });

  it('keeps existing OpenRouter-backed model greetings aligned with refreshed names', () => {
    const byId = new Map(DEFAULT_EXPERTS.map((expert) => [expert.id, expert]));

    [
      'gpt-mini',
      'gpt-nano',
      'qwen',
      'qwen-9b',
      'qwen-plus',
      'seed',
      'seed-mini',
      'grok',
    ].forEach((id) => {
      const expert = byId.get(id);
      expect(expert?.greeting, `${id} greeting should use the current model name`).toContain(expert?.nameKo ?? expert?.name);
    });

    expect(byId.get('gpt-mini')?.greeting).not.toContain('GPT-5.4 Mini');
    expect(byId.get('gpt-nano')?.greeting).not.toContain('GPT-5.4 Nano');
    expect(byId.get('grok')?.greeting).not.toContain('Grok 4.1 Fast');
  });

  it('keeps existing OpenRouter override descriptions distinct and specific', () => {
    const overrideDescriptions = Object.values(OPENROUTER_EXISTING_MODEL_OVERRIDES)
      .map((override) => override.description)
      .filter((description): description is string => Boolean(description));

    expect(new Set(overrideDescriptions).size).toBe(overrideDescriptions.length);
    expect(overrideDescriptions.some((description) => /^[^:]{2,80}:\s/.test(description))).toBe(false);
    expect(overrideDescriptions.some((description) => description.includes('코드 작성·리팩터링 중심 모델'))).toBe(false);
    expect(overrideDescriptions.some((description) => description.includes('범용 대화 모델'))).toBe(false);
  });

  it('keeps key existing OpenRouter tags aligned with model roles', () => {
    expect(OPENROUTER_EXISTING_MODEL_OVERRIDES.deepseek?.tags).toContain('코딩');
    expect(OPENROUTER_EXISTING_MODEL_OVERRIDES.deepseek?.tags).toContain('오픈웨이트');
    expect(OPENROUTER_EXISTING_MODEL_OVERRIDES['command-r-plus']?.tags).toContain('검색');
    expect(OPENROUTER_EXISTING_MODEL_OVERRIDES['ancano-pro']?.tags).toContain('자동선택');
    expect(OPENROUTER_EXISTING_MODEL_OVERRIDES['ancano-pro']?.tags).not.toContain('시각입력');
  });

  it('keeps every AI avatar on an existing local provider or model mark', () => {
    DEFAULT_EXPERTS.filter((expert) => expert.category === 'ai').forEach((expert) => {
      expect(expert.avatarUrl, `${expert.id} is missing an avatar`).toBeTruthy();
      expect(expert.avatarUrl, `${expert.id} should not use the generic router mark`).not.toBe('/logos/router.svg');
      if (expert.avatarUrl?.startsWith('/logos/')) {
        expect(fs.existsSync(path.join(process.cwd(), 'public', expert.avatarUrl)), `${expert.id} avatar should exist`).toBe(true);
      }
    });
  });

  it('keeps visible general models filterable by structured metadata', () => {
    const visibleGeneralModels = DEFAULT_EXPERTS.filter(isVisibleGeneralTextModel);

    expect(visibleGeneralModels.length).toBeGreaterThan(100);
    visibleGeneralModels.forEach((expert) => {
      expect(expert.modelInfo?.provider, `${expert.id} should have provider metadata`).toBeTruthy();
      expect(expert.modelInfo?.contextLength, `${expert.id} should have context length metadata`).toBeGreaterThan(0);
      expect(expert.modelInfo?.priceTier, `${expert.id} should have price tier metadata`).toMatch(/^(free|low|standard|premium)$/);
      expect(expert.modelInfo?.inputModalities?.length, `${expert.id} should have input modality metadata`).toBeGreaterThan(0);
    });

    expect(visibleGeneralModels.some((expert) => expert.modelInfo?.priceTier === 'free' || expert.modelInfo?.priceTier === 'low')).toBe(true);
    expect(visibleGeneralModels.some((expert) => (expert.modelInfo?.contextLength ?? 0) >= 262_144)).toBe(true);
    expect(visibleGeneralModels.some((expert) => expert.modelInfo?.inputModalities?.includes('image'))).toBe(true);
  });

  it('keeps general model open-weight filtering discoverable without a coding preset', () => {
    const groups = buildExpertSelectionGroups({
      experts: DEFAULT_EXPERTS,
      favoriteIds: [],
      visibleCategories: ['ai'],
      aiAgentIds: [],
    });
    const openWeightGroup = groups.find((group) => group.cat === 'ai_open');
    const expectedOpenWeightIds = DEFAULT_EXPERTS
      .filter((expert) => isVisibleGeneralTextModel(expert) && expert.modelInfo?.openWeight)
      .map((expert) => expert.id);
    const actualOpenWeightIds = new Set(openWeightGroup?.items.map((expert) => expert.id) ?? []);
    const explorerSource = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'GeneralAiExplorer.tsx'), 'utf8');

    expect(openWeightGroup?.label).toContain('오픈소스');
    expect(expectedOpenWeightIds.length).toBeGreaterThan(10);
    expectedOpenWeightIds.forEach((id) => {
      expect(actualOpenWeightIds.has(id), `${id} should be available through the open-weight group`).toBe(true);
    });
    expect(explorerSource).not.toContain("{ id: 'coding', label: '코딩' }");
    expect(explorerSource).not.toContain("{ id: 'reasoning', label: '깊은 추론' }");
    expect(explorerSource).not.toContain("{ id: 'search', label: '검색/출처' }");
  });

  it('keeps every AI selection group aligned with visible general models', () => {
    const visibleGeneralIds = new Set(DEFAULT_EXPERTS.filter(isVisibleGeneralTextModel).map((expert) => expert.id));
    const groups = buildExpertSelectionGroups({
      experts: DEFAULT_EXPERTS,
      favoriteIds: [],
      visibleCategories: ['ai'],
      aiAgentIds: [],
    });

    groups.filter((group) => AI_GROUP_CATS.includes(group.cat)).forEach((group) => {
      const ids = group.items.map((expert) => expert.id);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      const hiddenIds = ids.filter((id) => !visibleGeneralIds.has(id));

      expect(new Set(ids).size, `${group.cat} should not contain duplicate models`).toBe(ids.length);
      expect(duplicateIds, `${group.cat} duplicate ids`).toEqual([]);
      expect(hiddenIds, `${group.cat} should only contain visible general text models`).toEqual([]);
    });
  });

  it('keeps prominent AI selection groups provider-balanced and current', () => {
    const groups = buildExpertSelectionGroups({
      experts: DEFAULT_EXPERTS,
      favoriteIds: [],
      visibleCategories: ['ai'],
      aiAgentIds: [],
    });
    const rules: Record<string, {
      minProviderCount: number;
      maxProviderShare: number;
      minCreatedAt2025Share: number;
      minCreatedAt2026Count: number;
    }> = {
      ai_recommended: { minProviderCount: 6, maxProviderShare: 0.35, minCreatedAt2025Share: 1, minCreatedAt2026Count: 2 },
      ai_flagship: { minProviderCount: 10, maxProviderShare: 0.35, minCreatedAt2025Share: 1, minCreatedAt2026Count: 8 },
      ai_fast: { minProviderCount: 10, maxProviderShare: 0.35, minCreatedAt2025Share: 0.85, minCreatedAt2026Count: 8 },
      ai_reasoning: { minProviderCount: 10, maxProviderShare: 0.35, minCreatedAt2025Share: 1, minCreatedAt2026Count: 8 },
      ai_minor: { minProviderCount: 8, maxProviderShare: 0.3, minCreatedAt2025Share: 1, minCreatedAt2026Count: 6 },
      ai_open: { minProviderCount: 12, maxProviderShare: 0.35, minCreatedAt2025Share: 0.8, minCreatedAt2026Count: 30 },
      ai: { minProviderCount: 30, maxProviderShare: 0.25, minCreatedAt2025Share: 0.8, minCreatedAt2026Count: 70 },
    };

    Object.entries(rules).forEach(([cat, rule]) => {
      const group = groups.find((item) => item.cat === cat);
      const providerCounts = (group?.items ?? []).reduce<Record<string, number>>((acc, expert) => {
        const provider = expert.modelInfo?.provider ?? 'missing';
        acc[provider] = (acc[provider] ?? 0) + 1;
        return acc;
      }, {});
      const maxProviderCount = Math.max(0, ...Object.values(providerCounts));
      const createdAt2025Count = (group?.items ?? []).filter((expert) => (expert.modelInfo?.createdAt ?? '') >= '2025-01-01').length;
      const createdAt2026Count = (group?.items ?? []).filter((expert) => (expert.modelInfo?.createdAt ?? '') >= '2026-01-01').length;

      expect(Object.keys(providerCounts).length, `${cat} should cover enough providers`).toBeGreaterThanOrEqual(rule.minProviderCount);
      expect(maxProviderCount / (group?.items.length ?? 1), `${cat} should not be dominated by one provider`).toBeLessThanOrEqual(rule.maxProviderShare);
      expect(createdAt2025Count, `${cat} should stay mostly current`).toBeGreaterThanOrEqual(Math.ceil((group?.items.length ?? 0) * rule.minCreatedAt2025Share));
      expect(createdAt2026Count, `${cat} should include current-year models`).toBeGreaterThanOrEqual(rule.minCreatedAt2026Count);
    });
  });

  it('keeps general model trait filters selective and clearly labeled', () => {
    const explorerSource = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'GeneralAiExplorer.tsx'), 'utf8');
    const filterSource = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'generalModelExplorerFilters.ts'), 'utf8');
    const metaSource = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'generalModelExplorerMeta.ts'), 'utf8');

    expect(REASONING_MODEL_IDS.length).toBeLessThanOrEqual(40);
    expect(explorerSource).toContain('items={traitItems}');
    expect(explorerSource).toContain('items={detailItems}');
    expect(explorerSource).not.toContain('title="Strengths"');
    expect(explorerSource).not.toContain('modelStrengthTags');
    expect(explorerSource).not.toContain('function DetailPanel');
    expect(explorerSource.slice(explorerSource.indexOf('function ExplorerDetailPanel'), explorerSource.indexOf('export function AllAiExplorerModal'))).not.toContain('강점');
    expect(explorerSource).not.toContain("expert.abilities?.reasoning && expert.abilities.reasoning >= 85 ? 'reasoning'");
    expect(GENERAL_SPEC_LABELS.map(([id]) => id)).toContain('input-vision');
    expect(GENERAL_SPEC_LABELS.map(([id]) => id)).toContain('input-file');
    expect(GENERAL_SPEC_LABELS.map(([id]) => id)).toContain('input-audio-video');
    const fileInputModel = DEFAULT_EXPERTS
      .filter(isVisibleGeneralTextModel)
      .find((expert) => expert.modelInfo?.inputModalities?.includes('file'));
    expect(fileInputModel).toBeTruthy();
    expect(getGeneralSpecIds(fileInputModel!)).toContain('input-file');
    expect(filterSource).toContain("inputModalities.includes('audio') || inputModalities.includes('video') ? 'input-audio-video' : null");
    expect(filterSource).toContain("inputModalities.includes('file') ? 'input-file' : null");
    expect(metaSource).toContain("inputModalities.includes('file') ?");
  });

  it('keeps general model pagination centered after page five', () => {
    expect(buildPageNumbers(1, 12)).toEqual([1, 2, 3, 4, 5]);
    expect(buildPageNumbers(5, 12)).toEqual([3, 4, 5, 6, 7]);
    expect(buildPageNumbers(6, 12)).toEqual([4, 5, 6, 7, 8]);
    expect(buildPageNumbers(12, 12)).toEqual([8, 9, 10, 11, 12]);
    expect(buildPageNumbers(99, 3)).toEqual([1, 2, 3]);
  });

  it('formats general model detail metadata from the same modelInfo used by filters', () => {
    expect(formatGeneralModelContextLength(1_000_000)).toBe('1M+ 토큰');
    expect(formatGeneralModelContextLength(262_144)).toBe('256K 토큰');
    expect(formatGeneralModelInputModalities(['text', 'image', 'file'])).toBe('텍스트+이미지+파일');

    const visibleGeneralModels = DEFAULT_EXPERTS.filter(isVisibleGeneralTextModel);
    const freeModel = visibleGeneralModels.find((expert) => expert.modelInfo?.priceTier === 'free');
    const fileInputModel = visibleGeneralModels.find((expert) => expert.modelInfo?.inputModalities?.includes('file'));
    const openWeightModel = visibleGeneralModels.find((expert) => expert.modelInfo?.openWeight);

    expect(freeModel).toBeTruthy();
    expect(fileInputModel).toBeTruthy();
    expect(openWeightModel).toBeTruthy();
    expect(formatGeneralModelPriceTier(freeModel!)).toBe('무료');

    const fileMeta = Object.fromEntries(buildGeneralModelMeta(fileInputModel!, fileInputModel!.modelInfo?.provider ?? ''));
    expect(fileMeta['입력']).toContain('파일');
    expect(fileMeta['컨텍스트 길이']).toMatch(/토큰$/);
    expect(fileMeta['출시일']).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const openMeta = Object.fromEntries(buildGeneralModelMeta(openWeightModel!, openWeightModel!.modelInfo?.provider ?? ''));
    expect(openMeta['모델 유형']).toBe('오픈웨이트');
  });

  it('prioritizes user-visible model card tags from the same metadata as detail filters', () => {
    const visibleGeneralModels = DEFAULT_EXPERTS.filter(isVisibleGeneralTextModel);
    const freeModel = visibleGeneralModels.find((expert) => expert.modelInfo?.priceTier === 'free');
    const lowCostModel = visibleGeneralModels.find((expert) => expert.modelInfo?.priceTier === 'low');
    const fileInputModel = visibleGeneralModels.find((expert) => expert.modelInfo?.inputModalities?.includes('file'));
    const visionModel = visibleGeneralModels.find((expert) => expert.modelInfo?.inputModalities?.includes('image'));

    expect(freeModel).toBeTruthy();
    expect(lowCostModel).toBeTruthy();
    expect(fileInputModel).toBeTruthy();
    expect(visionModel).toBeTruthy();
    expect(getGeneralModelDisplayTags(freeModel!)).toContain('무료');
    expect(getGeneralModelDisplayTags(lowCostModel!)).toContain('저비용');
    expect(getGeneralModelDisplayTags(fileInputModel!)).toContain('문서입력');
    expect(getGeneralModelDisplayTags(visionModel!)).toContain('시각입력');
  });

  it('searches general models by user-facing metadata labels', () => {
    const visibleGeneralModels = DEFAULT_EXPERTS.filter(isVisibleGeneralTextModel);
    const freeModel = visibleGeneralModels.find((expert) => expert.modelInfo?.priceTier === 'free');
    const standardPriceModel = visibleGeneralModels.find((expert) => expert.modelInfo?.priceTier === 'standard');
    const fileInputModel = visibleGeneralModels.find((expert) => expert.modelInfo?.inputModalities?.includes('file'));
    const textOnlyModel = visibleGeneralModels.find((expert) =>
      expert.modelInfo?.inputModalities?.length === 1 && expert.modelInfo.inputModalities[0] === 'text');
    const openWeightModel = visibleGeneralModels.find((expert) => expert.modelInfo?.openWeight);
    const closedModel = visibleGeneralModels.find((expert) => !expert.modelInfo?.openWeight);
    const providerModel = visibleGeneralModels.find((expert) => expert.modelInfo?.provider === 'Moonshot AI');
    const gpt5Model = visibleGeneralModels.find((expert) => expert.openrouterModel === 'openai/gpt-5');
    const qwenCoderModel = visibleGeneralModels.find((expert) => expert.openrouterModel === 'qwen/qwen3-coder');
    const claudeOpusModel = visibleGeneralModels.find((expert) => expert.openrouterModel === 'anthropic/claude-opus-4.5');

    expect(freeModel).toBeTruthy();
    expect(standardPriceModel).toBeTruthy();
    expect(fileInputModel).toBeTruthy();
    expect(textOnlyModel).toBeTruthy();
    expect(openWeightModel).toBeTruthy();
    expect(closedModel).toBeTruthy();
    expect(providerModel).toBeTruthy();
    expect(gpt5Model).toBeTruthy();
    expect(qwenCoderModel).toBeTruthy();
    expect(claudeOpusModel).toBeTruthy();

    expect(matchesGeneralModelQuery(freeModel!, '무료', freeModel!.modelInfo?.provider ?? '', freeModel!.tags ?? [])).toBe(true);
    expect(matchesGeneralModelQuery(standardPriceModel!, '무료', standardPriceModel!.modelInfo?.provider ?? '', standardPriceModel!.tags ?? [])).toBe(false);
    expect(matchesGeneralModelQuery(fileInputModel!, '파일', fileInputModel!.modelInfo?.provider ?? '', fileInputModel!.tags ?? [])).toBe(true);
    expect(matchesGeneralModelQuery(textOnlyModel!, '파일', textOnlyModel!.modelInfo?.provider ?? '', textOnlyModel!.tags ?? [])).toBe(false);
    expect(matchesGeneralModelQuery(openWeightModel!, '오픈웨이트', openWeightModel!.modelInfo?.provider ?? '', openWeightModel!.tags ?? [])).toBe(true);
    expect(matchesGeneralModelQuery(closedModel!, '오픈웨이트', closedModel!.modelInfo?.provider ?? '', closedModel!.tags ?? [])).toBe(false);
    expect(matchesGeneralModelQuery(providerModel!, 'moonshot', providerModel!.modelInfo?.provider ?? '', providerModel!.tags ?? [])).toBe(true);
    expect(matchesGeneralModelQuery(gpt5Model!, 'gpt 5', gpt5Model!.modelInfo?.provider ?? '', gpt5Model!.tags ?? [])).toBe(true);
    expect(matchesGeneralModelQuery(qwenCoderModel!, 'qwen coder', qwenCoderModel!.modelInfo?.provider ?? '', qwenCoderModel!.tags ?? [])).toBe(true);
    expect(matchesGeneralModelQuery(claudeOpusModel!, 'claude opus', claudeOpusModel!.modelInfo?.provider ?? '', claudeOpusModel!.tags ?? [])).toBe(true);
  });

  it('keeps special and non-text-output cards out of the general model selection group', () => {
    const groups = buildExpertSelectionGroups({
      experts: DEFAULT_EXPERTS,
      favoriteIds: [],
      visibleCategories: ['ai'],
      aiAgentIds: [],
    });
    const generalGroup = groups.find((group) => group.cat === 'ai');
    const generalIds = new Set(generalGroup?.items.map((expert) => expert.id) ?? []);

    expect(generalIds.has('developer-yjh')).toBe(false);
    expect(generalIds.has('ancano-pro')).toBe(false);
    generalGroup?.items.forEach((expert) => {
      expect(expert.modelInfo?.outputModalities ?? [], `${expert.id} should not output image in general selection`).not.toContain('image');
      expect(expert.modelInfo?.outputModalities ?? [], `${expert.id} should not output video in general selection`).not.toContain('video');
      expect(expert.modelInfo?.outputModalities ?? [], `${expert.id} should not output audio in general selection`).not.toContain('audio');
    });
  });

  it('matches the explorer and selection-panel visible general model sets', () => {
    const explorerVisibleIds = DEFAULT_EXPERTS
      .filter(isVisibleGeneralTextModel)
      .map((expert) => expert.id)
      .sort();
    const groups = buildExpertSelectionGroups({
      experts: DEFAULT_EXPERTS,
      favoriteIds: [],
      visibleCategories: ['ai'],
      aiAgentIds: [],
    });
    const selectionVisibleIds = (groups.find((group) => group.cat === 'ai')?.items ?? [])
      .map((expert) => expert.id)
      .sort();

    expect(selectionVisibleIds).toEqual(explorerVisibleIds);
  });

  it('drops stale persisted AI cards that are no longer in the managed general catalog', () => {
    const gpt = DEFAULT_EXPERTS.find((expert) => expert.id === 'gpt');
    const doctor = DEFAULT_EXPERTS.find((expert) => expert.id === 'doctor');
    expect(gpt).toBeDefined();
    expect(doctor).toBeDefined();

    const merged = mergePersistedExperts([
      {
        ...gpt!,
        id: 'stale-or-image-model',
        name: 'Stale Image Model',
        nameKo: 'Stale Image Model',
        category: 'ai',
        openrouterModel: 'example/stale-image-model',
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
        ...doctor!,
        id: 'custom-doctor-copy',
        name: 'Custom Doctor',
        nameKo: '커스텀 의사',
        category: 'occupation',
      },
    ]);

    expect(merged.some((expert) => expert.id === 'stale-or-image-model')).toBe(false);
    expect(merged.some((expert) => expert.id === 'custom-doctor-copy')).toBe(true);
    expect(merged.filter(isVisibleGeneralTextModel)).toHaveLength(250);
  });

  it('adds varied stats to custom non-model experts', () => {
    const customExperts = DEFAULT_EXPERTS.filter((expert) => expert.category !== 'ai');

    expect(customExperts.length).toBeGreaterThan(50);
    expect(customExperts.every((expert) => expert.abilities)).toBe(true);
    expect(new Set(customExperts.map((expert) => expert.abilities?.reasoning)).size).toBeGreaterThan(15);
    expect(DEFAULT_EXPERTS.find((expert) => expert.id === 'programmer')?.abilities?.coding).toBeGreaterThan(90);
    expect(DEFAULT_EXPERTS.find((expert) => expert.id === 'artist')?.abilities?.creativity).toBeGreaterThan(90);
  });

  it('keeps custom expert descriptions and images specific', () => {
    const customExperts = DEFAULT_EXPERTS.filter((expert) => expert.category !== 'ai');
    const descriptions = customExperts.map((expert) => expert.description);
    const avatarUrls = customExperts.map((expert) => expert.avatarUrl).filter(Boolean);

    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(new Set(avatarUrls).size).toBe(avatarUrls.length);
    customExperts.forEach((expert) => {
      if (expert.avatarUrl?.startsWith('/logos/')) {
        expect(fs.existsSync(path.join(process.cwd(), 'public', expert.avatarUrl)), `${expert.id} avatar should exist`).toBe(true);
      }
    });
  });

  it('aligns custom expert ability stats with the role domain', () => {
    const byId = new Map(DEFAULT_EXPERTS.map((expert) => [expert.id, expert]));

    expect(byId.get('gamedev')?.abilities?.coding).toBeGreaterThanOrEqual(88);
    expect(byId.get('scientist')?.abilities?.reasoning).toBeGreaterThanOrEqual(88);
    expect(byId.get('pilot')?.abilities?.speed).toBeGreaterThanOrEqual(88);
    expect(byId.get('diplomat')?.abilities?.multilingual).toBeGreaterThanOrEqual(88);
    expect(byId.get('physics')?.abilities?.math).toBeGreaterThanOrEqual(90);
    expect(byId.get('detective')?.abilities?.reasoning).toBeGreaterThanOrEqual(84);
  });
});
