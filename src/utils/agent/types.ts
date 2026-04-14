// Agent pipeline type definitions

/** The coarse analysis pattern chosen for the agent run. */
export type StrategyType =
  | 'multi_perspective'
  | 'comparison'
  | 'step_by_step'
  | 'pros_cons'
  | 'deep_dive';

/** Step 1 strategy returned by the planner. */
export interface AgentStrategy {
  type: StrategyType;
  tasks: AgentTaskDef[];
  reasoning: string;
}

/** Step 1 task definition. */
export interface AgentTaskDef {
  id: string;
  label: string;
  prompt: string;
}

/** Runtime task state shown in the UI. */
export interface AgentTask {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  result: string;
  /** Safe, user-facing summary of what happened in this task. */
  publicNote?: string;
}

/** Overall agent state streamed to the chat UI. */
export interface AgentState {
  status: 'analyzing' | 'processing' | 'synthesizing' | 'complete' | 'error';
  strategy: AgentStrategy | null;
  tasks: AgentTask[];
  finalAnswer: string;
  totalTokensUsed: number;
  elapsedMs: number;
  /** The selected AI agent id, used for brand-aware copy in the UI. */
  agentBrand?: string;
  /** Best-known intent for the current run. */
  intent?: StrategyType;
}

/** Lightweight local question classification result. */
export interface ClassificationResult {
  mode: 'simple' | 'agent';
  score: number;
  reasons: string[];
}

/** Agent pipeline options passed by the chat orchestrator. */
export interface AgentPipelineOptions {
  message: string;
  model: string;
  systemPrompt?: string;
  conversationHistory?: { role: string; content: string }[];
  expertId?: string;
  intentHint?: StrategyType;
  onStateChange: (state: AgentState) => void;
  onStreamToken: (token: string) => void;
  signal?: AbortSignal;
}

/** Request body for one internal agent step. */
export interface AgentStepRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

/** Response body for one internal agent step. */
export interface AgentStepResponse {
  content: string;
  tokensUsed: number;
}
