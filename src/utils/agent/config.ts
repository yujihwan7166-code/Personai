// ══════════════════════════════════════════
// AUTO Agent Configuration — 브랜드별 에이전트 설정
// ══════════════════════════════════════════

export interface AutoAgentConfig {
  /** 에이전트용 저렴 모델 (OpenRouter ID) */
  agentModel: string;
  /** 진짜 3단계 파이프라인 활성화 */
  enableAgent: boolean;
  /** 가짜 에이전트 (단일 호출 + UI 연출) */
  fakeAgent: boolean;
}

export const AUTO_AGENT_CONFIG: Record<string, AutoAgentConfig> = {
  'auto-gpt':        { agentModel: 'openai/gpt-5.4-nano',          enableAgent: true,  fakeAgent: false },
  'auto-gemini':     { agentModel: 'google/gemini-2.5-flash-lite', enableAgent: true,  fakeAgent: false },
  'auto-claude':     { agentModel: 'anthropic/claude-4.5-haiku',   enableAgent: false, fakeAgent: true  },
  'auto-grok':       { agentModel: 'x-ai/grok-4.1-fast',          enableAgent: true,  fakeAgent: false },
  'auto-perplexity': { agentModel: 'perplexity/sonar',             enableAgent: false, fakeAgent: false },
  'auto-deepseek':   { agentModel: 'deepseek/deepseek-3.2v',      enableAgent: true,  fakeAgent: false },
  'auto-qwen':       { agentModel: 'qwen/qwen3.5-9b',             enableAgent: true,  fakeAgent: false },
};
