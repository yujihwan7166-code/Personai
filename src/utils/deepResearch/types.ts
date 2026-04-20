// Deep Research 파이프라인 타입 (P1 MVP)
// S0 Completeness → S1 Clarifier → S2 Planner → S3 Researchers → S7 Writer → S9 Polish

export type DeepResearchDomain =
  | 'market_forecast'
  | 'tech_explain'
  | 'person_history'
  | 'event_analysis'
  | 'finance_earnings'
  | 'comparison'
  | 'generic';

export type TimeHorizon = 'short' | 'mid' | 'long' | 'historical' | 'any';
export type Perspective = 'investor' | 'industry' | 'policy' | 'consumer' | 'academic' | 'general';
export type Geography = 'global' | 'korea' | 'us' | 'china' | 'eu' | 'other' | 'any';
export type DepthPreference = 'overview' | 'deep' | 'technical';
export type OutputFormat = 'report' | 'table' | 'timeline' | 'compare' | 'auto';

export interface QuestionSpec {
  topic: string;
  domain: DeepResearchDomain;
  timeHorizon: TimeHorizon;
  perspective: Perspective[];
  geography: Geography[];
  depth: DepthPreference;
  format: OutputFormat;
  constraints: string[];
}

export interface ClarifierOption {
  id: string;
  label: string;
  value: string;
}

export interface ClarifierQuestion {
  slot: 'timeHorizon' | 'perspective' | 'geography' | 'depth' | 'format' | 'custom';
  question: string;
  options: ClarifierOption[];
  defaultOptionId: string;
}

export interface CompletenessResult {
  needsClarification: boolean;
  domain: DeepResearchDomain;
  parsedSpec: Partial<QuestionSpec>;
  missingSlots: ClarifierQuestion['slot'][];
  questions: ClarifierQuestion[];
}

export interface SubQuestion {
  id: string;
  question: string;
  angle: 'factual' | 'comparative' | 'temporal' | 'contrarian' | 'opinion';
  freshness: 'fresh' | 'recent' | 'timeless';
}

export interface ResearchPlan {
  subQuestions: SubQuestion[];
  outline: string[];
  format: OutputFormat;
}

export interface ResearchSource {
  title: string;
  link: string;
  snippet: string;
  subQuestionId: string;
}

export interface ResearcherResult {
  subQuestionId: string;
  query: string;
  sources: ResearchSource[];
  summary: string;
}

export type DeepResearchStage =
  | 'completeness'
  | 'clarifier_wait'
  | 'planner'
  | 'researchers'
  | 'writer'
  | 'polish'
  | 'done'
  | 'error';

export interface StageEvent {
  stage: DeepResearchStage;
  status: 'started' | 'progress' | 'done' | 'error';
  label: string;
  detail?: string;
  data?: unknown;
}
