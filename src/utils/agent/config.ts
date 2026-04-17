export type AutoAgentComplexity = 'standard' | 'deep';
export type AutoAgentQualityTier = 'balanced' | 'premium' | 'search-first';
export type AutoAgentSearchPolicy = 'auto' | 'always' | 'never';

export interface AutoAgentConfig {
  plannerModel: string;
  workerModel: string;
  finalModel: string;
  reviewModel: string;
  directModel: string;
  enableAgent: boolean;
  searchPolicy: AutoAgentSearchPolicy;
  minComplexity: AutoAgentComplexity;
  maxTasks: number;
  maxDirectTokens: number;
  maxFinalTokens: number;
  reviewMinChars: number;
  qualityTier: AutoAgentQualityTier;
}

export const AUTO_AGENT_CONFIG: Record<string, AutoAgentConfig> = {
  'auto-gpt': {
    plannerModel: 'openai/gpt-4.1-mini',
    workerModel: 'openai/gpt-4.1-mini',
    finalModel: 'openai/gpt-4.1',
    reviewModel: 'openai/gpt-4.1',
    directModel: 'openai/gpt-4.1-mini',
    enableAgent: true,
    searchPolicy: 'auto',
    minComplexity: 'standard',
    maxTasks: 5,
    maxDirectTokens: 1400,
    maxFinalTokens: 3200,
    reviewMinChars: 1000,
    qualityTier: 'premium',
  },
  'auto-gemini': {
    plannerModel: 'google/gemini-2.5-flash-lite',
    workerModel: 'google/gemini-2.5-flash-lite',
    finalModel: 'google/gemini-2.5-flash',
    reviewModel: 'google/gemini-2.5-flash',
    directModel: 'google/gemini-2.5-flash-lite',
    enableAgent: true,
    searchPolicy: 'auto',
    minComplexity: 'standard',
    maxTasks: 5,
    maxDirectTokens: 1400,
    maxFinalTokens: 3400,
    reviewMinChars: 1050,
    qualityTier: 'premium',
  },
  'auto-claude': {
    plannerModel: 'anthropic/claude-haiku-4.5',
    workerModel: 'anthropic/claude-haiku-4.5',
    finalModel: 'anthropic/claude-sonnet-4.6',
    reviewModel: 'anthropic/claude-sonnet-4.6',
    directModel: 'anthropic/claude-haiku-4.5',
    enableAgent: true,
    searchPolicy: 'auto',
    minComplexity: 'standard',
    maxTasks: 5,
    maxDirectTokens: 1500,
    maxFinalTokens: 3400,
    reviewMinChars: 1050,
    qualityTier: 'premium',
  },
  'auto-grok': {
    plannerModel: 'x-ai/grok-4.1-fast',
    workerModel: 'x-ai/grok-4.1-fast',
    finalModel: 'x-ai/grok-4.1-fast',
    reviewModel: 'x-ai/grok-4.1-fast',
    directModel: 'x-ai/grok-4.1-fast',
    enableAgent: true,
    searchPolicy: 'auto',
    minComplexity: 'standard',
    maxTasks: 4,
    maxDirectTokens: 1300,
    maxFinalTokens: 3100,
    reviewMinChars: 950,
    qualityTier: 'premium',
  },
  'auto-perplexity': {
    plannerModel: 'perplexity/sonar',
    workerModel: 'perplexity/sonar',
    finalModel: 'perplexity/sonar',
    reviewModel: 'perplexity/sonar',
    directModel: 'perplexity/sonar',
    enableAgent: true,
    searchPolicy: 'always',
    minComplexity: 'standard',
    maxTasks: 5,
    maxDirectTokens: 1500,
    maxFinalTokens: 3200,
    reviewMinChars: 950,
    qualityTier: 'search-first',
  },
  'auto-deepseek': {
    plannerModel: 'deepseek/deepseek-3.2v',
    workerModel: 'deepseek/deepseek-3.2v',
    finalModel: 'deepseek/deepseek-3.2v',
    reviewModel: 'deepseek/deepseek-3.2v',
    directModel: 'deepseek/deepseek-3.2v',
    enableAgent: true,
    searchPolicy: 'auto',
    minComplexity: 'standard',
    maxTasks: 4,
    maxDirectTokens: 1400,
    maxFinalTokens: 3200,
    reviewMinChars: 1000,
    qualityTier: 'premium',
  },
  'auto-qwen': {
    plannerModel: 'qwen/qwen3.5-9b',
    workerModel: 'qwen/qwen3.5-flash-02-23',
    finalModel: 'qwen/qwen3.6-plus',
    reviewModel: 'qwen/qwen3.6-plus',
    directModel: 'qwen/qwen3.5-flash-02-23',
    enableAgent: true,
    searchPolicy: 'auto',
    minComplexity: 'standard',
    maxTasks: 4,
    maxDirectTokens: 1400,
    maxFinalTokens: 3200,
    reviewMinChars: 1000,
    qualityTier: 'premium',
  },
};
