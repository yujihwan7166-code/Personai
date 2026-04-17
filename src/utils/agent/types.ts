// Agent pipeline type definitions

import type { QuestionPattern, QuestionPatternAuxTag } from './questionPattern';

/** The coarse analysis pattern chosen for the agent run. */
export type StrategyType =
  | 'multi_perspective'
  | 'comparison'
  | 'step_by_step'
  | 'pros_cons'
  | 'deep_dive';

export type ClassificationMode = 'simple' | 'standard' | 'deep';

/** Step 1 strategy returned by the planner. */
export interface AgentStrategy {
  type: StrategyType;
  tasks: AgentTaskDef[];
  reasoning: string;
  publicPlan?: string;
  publicSteps?: string[];
  needsSearch?: boolean;
  depth?: ClassificationMode;
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
  startedAt?: number;
  completedAt?: number;
}

/** Overall agent state streamed to the chat UI. */
export interface AgentState {
  status: 'analyzing' | 'planning' | 'processing' | 'synthesizing' | 'reviewing' | 'complete' | 'error';
  strategy: AgentStrategy | null;
  tasks: AgentTask[];
  finalAnswer: string;
  totalTokensUsed: number;
  elapsedMs: number;
  /** The selected AI agent id, used for brand-aware copy in the UI. */
  agentBrand?: string;
  /** Best-known intent for the current run. */
  intent?: StrategyType;
  /** Complexity mode selected for the current run. */
  complexityMode?: ClassificationMode;
  /** UI-only question pattern used for the progress panel. */
  questionPattern?: QuestionPattern;
  patternLabel?: string;
  patternFocus?: string;
  patternSteps?: string[];
  patternStageIndex?: number;
  /** True when the visible progress steps came from the agent planner for this exact question. */
  generatedProgressSteps?: boolean;
  canRevealAnswer?: boolean;
  auxTags?: QuestionPatternAuxTag[];
}

/** Lightweight local question classification result. */
export interface ClassificationResult {
  mode: ClassificationMode;
  score: number;
  reasons: string[];
  intent?: StrategyType;
  needsSearch?: boolean;
}

/** Agent pipeline options passed by the chat orchestrator. */
export interface AgentPipelineOptions {
  message: string;
  model: string;
  systemPrompt?: string;
  conversationHistory?: { role: string; content: string }[];
  expertId?: string;
  intentHint?: StrategyType;
  complexityMode?: ClassificationMode;
  questionPattern?: QuestionPattern;
  patternLabel?: string;
  patternFocus?: string;
  patternSteps?: string[];
  auxTags?: QuestionPatternAuxTag[];
  needsSearchHint?: boolean;
  profile?: import('./config').AutoAgentConfig;
  onStateChange: (state: AgentState) => void;
  onStreamToken: (token: string) => void;
  onSearchSources?: (sources: import('@/lib/chatStream').SearchSourcePayload) => void;
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
