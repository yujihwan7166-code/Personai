import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import {
  OPENROUTER_ADDED_ABILITIES,
  OPENROUTER_ADDED_EXPERTS,
} from '@/data/openrouter-added-models';
import { OPENROUTER_EXISTING_MODEL_OVERRIDES } from '@/data/openrouter-existing-model-overrides';
import { DEFAULT_EXPERTS } from '@/types/expert';

describe('openrouter added model catalog', () => {
  it('adds OpenRouter-backed text AI models', () => {
    expect(OPENROUTER_ADDED_EXPERTS).toHaveLength(126);
    expect(OPENROUTER_ADDED_EXPERTS.every((expert) => expert.category === 'ai')).toBe(true);
    expect(OPENROUTER_ADDED_EXPERTS.every((expert) => expert.openrouterModel)).toBe(true);
  });

  it('excludes image and video models from generated general models', () => {
    OPENROUTER_ADDED_EXPERTS.forEach((expert) => {
      expect(expert.modelInfo?.inputModalities, `${expert.id} should not accept image input`).not.toContain('image');
      expect(expert.modelInfo?.inputModalities, `${expert.id} should not accept video input`).not.toContain('video');
      expect(expert.modelInfo?.outputModalities, `${expert.id} should not output images`).not.toContain('image');
      expect(expert.modelInfo?.outputModalities, `${expert.id} should not output video`).not.toContain('video');
      expect(expert.tags ?? [], `${expert.id} should not be tagged multimodal`).not.toContain('멀티모달');
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

  it('uses varied tags instead of repetitive consultation labels', () => {
    const tags = OPENROUTER_ADDED_EXPERTS.flatMap((expert) => expert.tags ?? []);
    const uniqueTags = new Set(tags);

    expect(uniqueTags.size).toBeGreaterThanOrEqual(10);
    expect(tags.some((tag) => tag.includes('전문가 상담'))).toBe(false);
    expect(tags.some((tag) => tag.includes('상담'))).toBe(false);
  });

  it('does not emit mojibake in generated model labels', () => {
    const mojibakePattern = /[�]|[硫異怨踰湲援먯쑁]/;
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

    expect(generatedText).not.toMatch(mojibakePattern);
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
    const visibleGeneralModels = DEFAULT_EXPERTS.filter((expert) => {
      const outputModalities = expert.modelInfo?.outputModalities ?? [];
      return expert.category === 'ai'
        && !expert.id.startsWith('auto-')
        && expert.id !== 'ancano-pro'
        && expert.id !== 'developer-yjh'
        && !outputModalities.some((modality) => modality === 'image' || modality === 'video');
    });

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
