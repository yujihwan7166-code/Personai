export const AI_AGENT_IDS = [
  'ancano-pro',
  'auto-gpt',
  'auto-gemini',
  'auto-claude',
  'auto-grok',
  'auto-perplexity',
  'auto-deepseek',
  'auto-qwen',
] as const;

export type AiAgentId = typeof AI_AGENT_IDS[number];

const AI_AGENT_ID_SET = new Set<string>(AI_AGENT_IDS);

export function isAiAgentId(id?: string | null): id is AiAgentId {
  return typeof id === 'string' && AI_AGENT_ID_SET.has(id);
}

export function isConfiguredAutoAgent(id?: string | null) {
  return typeof id === 'string' && id.startsWith('auto-');
}
