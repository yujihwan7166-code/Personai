// ══════════════════════════════════════════
// Agent Pipeline Type Definitions
// ══════════════════════════════════════════

/** 에이전트 전략 유형 */
export type StrategyType =
  | 'multi_perspective'
  | 'comparison'
  | 'step_by_step'
  | 'pros_cons'
  | 'deep_dive';

/** Step 1에서 결정하는 분석 전략 */
export interface AgentStrategy {
  type: StrategyType;
  tasks: AgentTaskDef[];
  reasoning: string;
}

/** 개별 분석 태스크 정의 (Step 1 결과) */
export interface AgentTaskDef {
  id: string;
  label: string;
  prompt: string;
}

/** 개별 분석 태스크 실행 상태 */
export interface AgentTask {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  result: string;
}

/** 에이전트 파이프라인 전체 상태 */
export interface AgentState {
  status: 'analyzing' | 'processing' | 'synthesizing' | 'complete' | 'error';
  strategy: AgentStrategy | null;
  tasks: AgentTask[];
  finalAnswer: string;
  totalTokensUsed: number;
  elapsedMs: number;
}

/** 질문 분류 결과 */
export interface ClassificationResult {
  mode: 'simple' | 'agent';
  score: number;
  reasons: string[];
}

/** 에이전트 파이프라인 옵션 */
export interface AgentPipelineOptions {
  message: string;
  model: string;
  systemPrompt?: string;
  conversationHistory?: { role: string; content: string }[];
  onStateChange: (state: AgentState) => void;
  onStreamToken: (token: string) => void;
  signal?: AbortSignal;
}

/** Agent Step API 요청 body */
export interface AgentStepRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

/** Agent Step API 응답 */
export interface AgentStepResponse {
  content: string;
  tokensUsed: number;
}
