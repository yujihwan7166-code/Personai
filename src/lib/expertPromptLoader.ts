import type { Expert } from '@/types/expert';

type PromptLibrary = Record<string, string>;

let promptLibraryPromise: Promise<PromptLibrary> | null = null;

async function loadPromptLibrary(): Promise<PromptLibrary> {
  if (!promptLibraryPromise) {
    promptLibraryPromise = import('@/data/prompts').then((module) => module.PROMPTS);
  }

  return promptLibraryPromise;
}

export async function getExpertPrompt(expert: Pick<Expert, 'id' | 'systemPrompt'>): Promise<string> {
  if (expert.systemPrompt) {
    return expert.systemPrompt;
  }

  const promptLibrary = await loadPromptLibrary();
  return promptLibrary[expert.id] || '';
}

export async function buildExpertWithPrompt(expert: Expert, extra = ''): Promise<Expert> {
  const systemPrompt = `${await getExpertPrompt(expert)}${extra}`;

  if (systemPrompt === expert.systemPrompt) {
    return expert;
  }

  return { ...expert, systemPrompt };
}
