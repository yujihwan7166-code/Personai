// Deep Research 단계별 실행 로직 (Sonnet-only)
import {
  CompletenessResult,
  QuestionSpec,
  ClarifierQuestion,
  ResearchPlan,
  ResearcherResult,
  ResearchSource,
  SubQuestion,
} from './types';
import {
  S0_COMPLETENESS_SYSTEM,
  S1_CLARIFIER_SYSTEM,
  S2_PLANNER_SYSTEM,
  S3_RESEARCHER_SYSTEM,
  S3_CONTRARIAN_SYSTEM,
} from './prompts';

export const DEEP_RESEARCH_MODEL = 'anthropic/claude-sonnet-4.6';

interface AgentStepArgs {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

type AgentCaller = (args: AgentStepArgs) => Promise<string>;

function extractJson(text: string): string {
  const trimmed = text.trim();
  // ```json ... ``` fence 제거
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

function safeParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(extractJson(text)) as T;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// S0: Completeness Check
// ═══════════════════════════════════════════════════════════
export async function runCompletenessCheck(
  question: string,
  callAgent: AgentCaller,
): Promise<CompletenessResult> {
  const raw = await callAgent({
    systemPrompt: S0_COMPLETENESS_SYSTEM,
    userPrompt: `유저 질문: ${question}`,
    maxTokens: 500,
    temperature: 0.2,
  });

  const parsed = safeParseJson<{
    domain: CompletenessResult['domain'];
    parsed: Partial<QuestionSpec>;
    missing: ClarifierQuestion['slot'][];
    needsClarification: boolean;
  }>(raw);

  if (!parsed) {
    // JSON 파싱 실패 → 보수적으로 clarification 요청
    return {
      needsClarification: true,
      domain: 'generic',
      parsed: { topic: question },
      missingSlots: ['timeHorizon', 'perspective'],
      questions: [],
    };
  }

  return {
    needsClarification: parsed.needsClarification && parsed.missing?.length > 0,
    domain: parsed.domain || 'generic',
    parsedSpec: parsed.parsed || { topic: question },
    missingSlots: parsed.missing || [],
    questions: [],
  };
}

// ═══════════════════════════════════════════════════════════
// S1: Clarifier Questions
// ═══════════════════════════════════════════════════════════
export async function runClarifier(
  question: string,
  domain: string,
  missingSlots: string[],
  callAgent: AgentCaller,
): Promise<ClarifierQuestion[]> {
  const raw = await callAgent({
    systemPrompt: S1_CLARIFIER_SYSTEM,
    userPrompt: `원 질문: ${question}\ndomain: ${domain}\nmissing slots: ${missingSlots.join(', ')}`,
    maxTokens: 800,
    temperature: 0.3,
  });

  const parsed = safeParseJson<ClarifierQuestion[]>(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [];
  }
  return parsed.slice(0, 3);
}

// ═══════════════════════════════════════════════════════════
// S2: Planner
// ═══════════════════════════════════════════════════════════
export async function runPlanner(
  question: string,
  spec: QuestionSpec,
  callAgent: AgentCaller,
): Promise<ResearchPlan> {
  const raw = await callAgent({
    systemPrompt: S2_PLANNER_SYSTEM,
    userPrompt: `원 질문: ${question}\nQuestionSpec: ${JSON.stringify(spec)}`,
    maxTokens: 900,
    temperature: 0.5,
  });

  const parsed = safeParseJson<ResearchPlan>(raw);
  if (!parsed || !Array.isArray(parsed.subQuestions) || parsed.subQuestions.length === 0) {
    // 실패시 최소 plan
    return {
      subQuestions: [
        { id: 'q1', question: spec.topic, angle: 'factual', freshness: 'recent' },
      ],
      outline: ['개요', '핵심 분석', '결론'],
      format: spec.format === 'auto' ? 'report' : spec.format,
    };
  }
  // 최대 4개로 제한
  parsed.subQuestions = parsed.subQuestions.slice(0, 4).map((sq, i) => ({
    ...sq,
    id: sq.id || `q${i + 1}`,
  }));
  return parsed;
}

// ═══════════════════════════════════════════════════════════
// S3: Researchers (병렬)
// ═══════════════════════════════════════════════════════════
interface SearchFn {
  (query: string): Promise<ResearchSource[]>;
}

export async function runResearcher(
  subQuestion: SubQuestion,
  searchFn: SearchFn,
  callAgent: AgentCaller,
): Promise<ResearcherResult> {
  const sources = await searchFn(subQuestion.question);
  if (sources.length === 0) {
    return {
      subQuestionId: subQuestion.id,
      query: subQuestion.question,
      sources: [],
      summary: '검색 결과를 가져오지 못했습니다.',
    };
  }

  const sourcesList = sources
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}\n(${s.link})`)
    .join('\n\n');

  const systemPrompt = subQuestion.angle === 'contrarian'
    ? S3_CONTRARIAN_SYSTEM
    : S3_RESEARCHER_SYSTEM;

  const summary = await callAgent({
    systemPrompt,
    userPrompt: `서브질문: ${subQuestion.question}\n\n검색 결과:\n${sourcesList}`,
    maxTokens: 600,
    temperature: 0.3,
  });

  return {
    subQuestionId: subQuestion.id,
    query: subQuestion.question,
    sources: sources.map((s) => ({ ...s, subQuestionId: subQuestion.id })),
    summary: summary.trim(),
  };
}

// ═══════════════════════════════════════════════════════════
// 유틸: Clarifier 응답 → QuestionSpec merge
// ═══════════════════════════════════════════════════════════
export function mergeClarifierAnswers(
  base: Partial<QuestionSpec>,
  domain: string,
  questions: ClarifierQuestion[],
  answers: Record<string, string>, // slot → value
): QuestionSpec {
  const spec: QuestionSpec = {
    topic: base.topic || '',
    domain: (base.domain || domain || 'generic') as QuestionSpec['domain'],
    timeHorizon: base.timeHorizon || 'any',
    perspective: base.perspective || ['general'],
    geography: base.geography || ['any'],
    depth: base.depth || 'deep',
    format: base.format || 'auto',
    constraints: base.constraints || [],
  };

  for (const q of questions) {
    const value = answers[q.slot];
    if (!value) continue;
    if (q.slot === 'timeHorizon') spec.timeHorizon = value as QuestionSpec['timeHorizon'];
    else if (q.slot === 'perspective') spec.perspective = [value as QuestionSpec['perspective'][number]];
    else if (q.slot === 'geography') spec.geography = [value as QuestionSpec['geography'][number]];
    else if (q.slot === 'depth') spec.depth = value as QuestionSpec['depth'];
    else if (q.slot === 'format') spec.format = value as QuestionSpec['format'];
    else if (q.slot === 'custom') spec.constraints.push(value);
  }

  return spec;
}

// ═══════════════════════════════════════════════════════════
// 전역 출처 번호 부여 (Writer 입력용)
// ═══════════════════════════════════════════════════════════
export interface GlobalSource extends ResearchSource {
  globalId: number;
}

export function buildGlobalSources(results: ResearcherResult[]): {
  globalSources: GlobalSource[];
  perResearcherMapping: Map<string, Map<string, number>>; // subQId → (link → globalId)
} {
  const globalSources: GlobalSource[] = [];
  const linkToId = new Map<string, number>();
  const perResearcherMapping = new Map<string, Map<string, number>>();

  for (const r of results) {
    const subMap = new Map<string, number>();
    for (const s of r.sources) {
      let id = linkToId.get(s.link);
      if (id === undefined) {
        id = globalSources.length + 1;
        linkToId.set(s.link, id);
        globalSources.push({ ...s, globalId: id });
      }
      subMap.set(s.link, id);
    }
    perResearcherMapping.set(r.subQuestionId, subMap);
  }

  return { globalSources, perResearcherMapping };
}
