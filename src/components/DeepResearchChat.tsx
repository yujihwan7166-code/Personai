import { useState, useRef, useEffect, useMemo, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LazyMarkdown } from '@/components/LazyMarkdown';
import { QuestionInput } from '@/components/QuestionInput';
import { buildAttachmentPrompt, type AttachedFile } from '@/lib/fileProcessor';
import {
  Loader2, Send, Search, FileText, Sparkles, CheckCircle2, ShieldCheck,
  AlertTriangle, Scale, Clock, Circle, BookOpen, Zap, ChevronRight, ChevronDown,
  Target, PenLine, Wand2, ArrowRight, Telescope,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ───────────────────────── 예시 질문 (도메인별) ─────────────────────────
interface ExampleCategory {
  title: string;
  emoji: string;
  examples: string[];
  chipClass: string;
  dotClass: string;
}

// 색상 틴트 제거 — 통일된 흰/neutral bg로 가시성 업
const UNIFIED_CHIP_CLASS = 'bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/70 hover:border-slate-400 dark:hover:border-slate-600';

const EXAMPLE_CATEGORIES: ExampleCategory[] = [
  {
    title: '시장·전망',
    emoji: '📊',
    examples: [
      '2025 하반기 반도체 시장 전망',
      '전기차 시장의 현대·테슬라 경쟁 구도',
    ],
    chipClass: UNIFIED_CHIP_CLASS,
    dotClass: 'bg-blue-500',
  },
  {
    title: '기술·비교',
    emoji: '🔬',
    examples: [
      'Rust vs Go 언어 장단 비교',
      'LLM 기반 RAG 아키텍처 최신 동향',
    ],
    chipClass: UNIFIED_CHIP_CLASS,
    dotClass: 'bg-purple-500',
  },
  {
    title: '인물·역사',
    emoji: '📜',
    examples: [
      '앨런 튜링의 생애와 계산이론 기여',
      '2008 금융위기의 원인·영향·교훈',
    ],
    chipClass: UNIFIED_CHIP_CLASS,
    dotClass: 'bg-amber-500',
  },
  {
    title: '이슈·사건',
    emoji: '⚖️',
    examples: [
      'AI 저작권 분쟁 현황과 주요 판례',
      'OPEC+ 감산 결정이 유가에 미친 영향',
    ],
    chipClass: UNIFIED_CHIP_CLASS,
    dotClass: 'bg-rose-500',
  },
];

// ───────────────────────── AI 모델 메타 ─────────────────────────
interface AiModelMeta {
  key: string;           // matches modelUsed prefix
  label: string;
  logo: string;
  role: string;
  dotClass: string;
}

const AI_MODELS: AiModelMeta[] = [
  { key: 'openai/', label: 'GPT-4.1', logo: '/logos/gpt.svg', role: '광범위 지식', dotClass: 'bg-emerald-500' },
  { key: 'anthropic/claude-sonnet', label: 'Claude Sonnet', logo: '/logos/claude.png', role: '논리·뉘앙스', dotClass: 'bg-orange-500' },
  { key: 'anthropic/claude-haiku', label: 'Claude Haiku', logo: '/logos/claude.png', role: '빠른 판단', dotClass: 'bg-orange-400' },
  { key: 'google/', label: 'Gemini 2.5', logo: '/logos/gemini.svg', role: '구조·분석', dotClass: 'bg-blue-500' },
  { key: 'perplexity/', label: 'Perplexity', logo: '/logos/perplexity.svg', role: '실시간 검색', dotClass: 'bg-indigo-500' },
];

function getModelMeta(modelId?: string): AiModelMeta | null {
  if (!modelId) return null;
  return AI_MODELS.find((m) => modelId.startsWith(m.key)) || null;
}

// 진행 단계 미리보기용 (이모지 대신 Lucide 아이콘)
type AiLogoKey = 'gpt' | 'claude' | 'gemini' | 'perplexity' | 'grok';

interface ProcessStep {
  label: string;
  Icon: LucideIcon;
  ai: string;
  aiShort: string;
  ais?: { logoKey: AiLogoKey; label: string }[]; // 2개 이상 AI 조합 표시용
  desc?: string; // 부연 설명 (한 줄)
}

function getLogoSrc(key: AiLogoKey): string {
  return key === 'claude' ? '/logos/claude.png' : `/logos/${key}.svg`;
}

const PROCESS_PREVIEW: ProcessStep[] = [
  { label: '질문 정교화',       Icon: Target,      ai: 'Claude Sonnet 4.6',        aiShort: 'claude'     }, // 0
  { label: '프롬프트 설계',      Icon: Sparkles,    ai: 'Gemini 3 Flash',           aiShort: 'gemini'     }, // 1
  { label: '멀티모델 데이터 수집', Icon: Search,      ai: '5 AI 협업',                aiShort: 'multi'      }, // 2
  { label: '데이터 종합 정리',   Icon: Scale,       ai: 'GPT 5.4 + Grok 4.2 Fast',  aiShort: 'gpt',
    ais: [
      { logoKey: 'gpt',  label: 'GPT 5.4' },
      { logoKey: 'grok', label: 'Grok 4.2 Fast' },
    ],
  }, // 3
  { label: '최종 리포트 작성',   Icon: PenLine,     ai: 'Claude Opus 4.7',          aiShort: 'claude',
    desc: '목차 · 섹션별 분석 · 기여 AI',
  }, // 4
  { label: '문체 다듬기',       Icon: Wand2,       ai: 'Gemini 2.5 Pro',           aiShort: 'gemini'     }, // 5 (unused)
  { label: '데이터 교차 검증',   Icon: ShieldCheck, ai: 'Perplexity Sonar',         aiShort: 'perplexity' }, // 6
  { label: '품질 검증',         Icon: CheckCircle2, ai: 'Claude Haiku + 규칙',    aiShort: 'claude',
    desc: '인용 · 출처 리스트 · 신뢰도',
  }, // 7
  { label: '아웃라인 설계',     Icon: FileText,    ai: 'Gemini 3.1 Pro Preview',   aiShort: 'gemini'     }, // 8
];

// Phase 그룹 (PHASE I / II / III — 로마자, 번호 원 제거)
interface Phase {
  roman: 'I' | 'II' | 'III';
  title: string;
  stepIndices: number[];
  accent: { dot: string; border: string };
}

const PHASES: Phase[] = [
  { roman: 'I',   title: '계획 · 데이터 수집',    stepIndices: [0, 1, 2], accent: { dot: 'bg-violet-500',  border: 'before:bg-violet-500/70'  } },
  { roman: 'II',  title: '인용 검증 · 데이터 종합', stepIndices: [6, 3, 8], accent: { dot: 'bg-sky-500',     border: 'before:bg-sky-500/70'     } },
  { roman: 'III', title: '답변 작성 · 품질 검증', stepIndices: [4, 7],    accent: { dot: 'bg-emerald-500', border: 'before:bg-emerald-500/70' } },
];

// 전역 step 번호 맵 (1부터 시작, Phase 순서대로 누적)
const GLOBAL_STEP_NUMBERS: Record<number, number> = (() => {
  const map: Record<number, number> = {};
  let count = 0;
  for (const phase of PHASES) {
    for (const idx of phase.stepIndices) {
      count += 1;
      map[idx] = count;
    }
  }
  return map;
})();

// 2×2 예시 질문 카드 (카테고리 + 질문)
interface ExampleCard {
  category: string;
  accent?: string;
  question: string;
}

const EXAMPLE_CARDS: ExampleCard[] = [
  { category: '시장·전망',  accent: 'bg-amber-500',   question: '2026년 하반기 글로벌 반도체 시장 전망과 한국 기업의 대응 전략' },
  { category: '기술·비교',  accent: 'bg-sky-500',     question: 'Rust와 Go의 성능·생산성·생태계를 항목별로 비교 분석해줘' },
  { category: '역사·사건',  accent: 'bg-rose-500',    question: '2008 글로벌 금융위기의 원인, 파급 효과, 정책적 교훈 정리' },
  { category: '이슈·판례',  accent: 'bg-violet-500',  question: '2026년 가상자산 규제 동향과 거래소·투자자 간 주요 판례' },
];

// ───────────────────────── 단계 정의 ─────────────────────────
type StageKey = 'planner' | 'researchers' | 'compiler' | 'writer' | 'polish' | 'verifier';

interface StageInfo {
  key: StageKey;
  label: string;
  weight: number; // 전체 진행률의 가중치 (합 = 100)
}

const STAGES: StageInfo[] = [
  { key: 'planner', label: '리서치 계획 수립', weight: 5 },
  { key: 'researchers', label: '웹 검색 & 요약', weight: 30 },
  { key: 'compiler', label: '주장·모순 정리', weight: 10 },
  { key: 'writer', label: '답변 작성', weight: 35 },
  { key: 'polish', label: '문체 다듬기', weight: 15 },
  { key: 'verifier', label: '인용 검증', weight: 5 },
];

interface StageTiming {
  startedAt?: number;
  finishedAt?: number;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ───────────────────────── 타입 ─────────────────────────
interface ClarifierOption {
  id: string;
  label: string;
  value: string;
}

interface ClarifierQuestion {
  slot: string;
  question: string;
  options: ClarifierOption[];
  defaultOptionId: string;
}

interface PrepareResponse {
  needsClarification: boolean;
  domain: string;
  parsedSpec: {
    topic?: string;
    timeHorizon?: string;
    perspective?: string[];
    geography?: string[];
    depth?: string;
    format?: string;
  };
  missingSlots: string[];
  questions: ClarifierQuestion[];
}

interface SubQuestion {
  id: string;
  question: string;
  angle: string;
  freshness: string;
}

interface Plan {
  subQuestions: SubQuestion[];
  outline: string[];
  format: string;
}

interface ResearcherDone {
  subQuestionId: string;
  query: string;
  sources: { title: string; link: string; snippet: string }[];
  summary: string;
}

interface GlobalSource {
  globalId: number;
  title: string;
  link: string;
  snippet: string;
}

interface AtomicClaim {
  id: string;
  text: string;
  sourceIds: number[];
  confidence: 'high' | 'medium' | 'low';
  topic?: string;
}

interface Conflict {
  topic: string;
  claimA: string;
  sourceAIds: number[];
  claimB: string;
  sourceBIds: number[];
}

interface FlaggedCitation {
  n: number;
  reason: string;
}

interface ClaimVerdict {
  claim: string;
  sourceIds: number[];
  status: 'verified' | 'partial' | 'mismatch' | 'unknown';
  reason?: string;
}

interface VerifierResult {
  confidence: number;
  flaggedCitations: FlaggedCitation[];
  claimVerdicts: ClaimVerdict[];
  citationDensityOk: boolean;
  totalCitations: number;
  uniqueCitations: number[];
}

type Phase =
  | 'idle'
  | 'preparing'
  | 'clarifying'
  | 'running'
  | 'done'
  | 'error';

interface ProgressState {
  stage: string;
  label: string;
}

interface ResearcherStatus {
  id: string;
  question: string;
  angle: string;
  status: 'pending' | 'searching' | 'sources' | 'done';
  sourcesCount?: number;
  modelAssigned?: string;       // 할당된 1차 모델
  modelUsed?: string;           // 실제 사용된 모델 (fallback 시 변경)
  fallbackOccurred?: boolean;
}

interface ModelInfo {
  id: string;
  label: string;
}

interface DeepResearchChatProps {
  initialQuestion?: string;
  onInitialQuestionConsumed?: () => void;
}

export function DeepResearchChat({ initialQuestion, onInitialQuestionConsumed }: DeepResearchChatProps = {}) {
  const [question, setQuestion] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [prepareResult, setPrepareResult] = useState<PrepareResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [researchers, setResearchers] = useState<ResearcherStatus[]>([]);
  const [globalSources, setGlobalSources] = useState<GlobalSource[]>([]);
  const [finalAnswer, setFinalAnswer] = useState('');
  const [polishedAnswer, setPolishedAnswer] = useState('');
  const [atomicClaims, setAtomicClaims] = useState<AtomicClaim[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [verifier, setVerifier] = useState<VerifierResult | null>(null);
  const [modelsUsed, setModelsUsed] = useState<ModelInfo[]>([]);
  const [partialResults, setPartialResults] = useState<{ got: number; planned: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 타이머 + 단계별 타이밍
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const [stageTimings, setStageTimings] = useState<Record<StageKey, StageTiming>>({
    planner: {}, researchers: {}, compiler: {}, writer: {}, polish: {}, verifier: {},
  });
  const [currentStage, setCurrentStage] = useState<StageKey | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // 1초마다 타이머 갱신 (running 중에만)
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // 외부에서 initialQuestion 전달 시 자동으로 prepare 단계 시작 (→ Clarifier)
  const consumedRef = useRef(false);
  useEffect(() => {
    if (!initialQuestion || consumedRef.current) return;
    if (phase !== 'idle') return;
    consumedRef.current = true;
    setQuestion(initialQuestion);
    void submitQuestion(initialQuestion);
    onInitialQuestionConsumed?.();
    // submitQuestion은 선언 순서상 아래에 있지만 hoisting 대상이 아님 — 함수 선언이므로 실제로는 ESLint가 경고할 수 있으나 런타임 문제 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  const reset = () => {
    abortRef.current?.abort();
    setPhase('idle');
    setPrepareResult(null);
    setAnswers({});
    setProgress(null);
    setPlan(null);
    setResearchers([]);
    setGlobalSources([]);
    setFinalAnswer('');
    setPolishedAnswer('');
    setAtomicClaims([]);
    setConflicts([]);
    setVerifier(null);
    setModelsUsed([]);
    setPartialResults(null);
    setErrorMessage(null);
    setStartedAt(null);
    setStageTimings({ planner: {}, researchers: {}, compiler: {}, writer: {}, polish: {}, verifier: {} });
    setCurrentStage(null);
  };

  const submitQuestion = async (overrideQuestion?: string) => {
    const q = (overrideQuestion ?? question).trim();
    if (!q) return;

    setPhase('preparing');
    setErrorMessage(null);
    setProgress({ stage: 'completeness', label: '질문 분석 중...' });

    try {
      const res = await fetch('/api/deep-research?phase=prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'prepare failed' }));
        throw new Error(data.error || 'prepare failed');
      }
      const data = (await res.json()) as PrepareResponse;
      setPrepareResult(data);

      if (data.needsClarification && data.questions.length > 0) {
        // default 값으로 초기화
        const defaults: Record<string, string> = {};
        for (const q of data.questions) {
          const defaultOpt = q.options.find((o) => o.id === q.defaultOptionId) || q.options[0];
          if (defaultOpt) defaults[q.slot] = defaultOpt.value;
        }
        setAnswers(defaults);
        setPhase('clarifying');
      } else {
        // Clarifier 불필요 → 바로 실행
        await runResearch(q, data, {});
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'prepare failed');
      setPhase('error');
    }
  };

  const proceedWithAnswers = async () => {
    if (!prepareResult) return;
    await runResearch(question.trim(), prepareResult, answers);
  };

  const skipClarifier = async () => {
    if (!prepareResult) return;
    // default 값 그대로 사용
    await runResearch(question.trim(), prepareResult, answers);
  };

  const buildSpec = (
    q: string,
    prep: PrepareResponse,
    userAnswers: Record<string, string>,
  ) => {
    const parsed = prep.parsedSpec || {};
    const spec = {
      topic: parsed.topic || q,
      domain: prep.domain || 'generic',
      timeHorizon: parsed.timeHorizon || 'any',
      perspective: parsed.perspective || ['general'],
      geography: parsed.geography || ['any'],
      depth: parsed.depth || 'deep',
      format: parsed.format || 'auto',
      constraints: [] as string[],
    };

    for (const cq of prep.questions) {
      const value = userAnswers[cq.slot];
      if (!value) continue;
      if (cq.slot === 'timeHorizon') spec.timeHorizon = value;
      else if (cq.slot === 'perspective') spec.perspective = [value];
      else if (cq.slot === 'geography') spec.geography = [value];
      else if (cq.slot === 'depth') spec.depth = value;
      else if (cq.slot === 'format') spec.format = value;
      else if (cq.slot === 'custom') spec.constraints.push(value);
    }

    return spec;
  };

  const runResearch = async (
    q: string,
    prep: PrepareResponse,
    userAnswers: Record<string, string>,
  ) => {
    setPhase('running');
    setProgress({ stage: 'planner', label: '리서치 계획 수립 중...' });
    setPlan(null);
    setResearchers([]);
    setGlobalSources([]);
    setFinalAnswer('');
    setPolishedAnswer('');
    setAtomicClaims([]);
    setConflicts([]);
    setVerifier(null);
    setModelsUsed([]);
    setPartialResults(null);
    setStartedAt(Date.now());
    setNowTs(Date.now());
    setStageTimings({ planner: {}, researchers: {}, compiler: {}, writer: {}, polish: {}, verifier: {} });
    setCurrentStage(null);

    const spec = buildSpec(q, prep, userAnswers);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/deep-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, spec }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: 'run failed' }));
        throw new Error(data.error || 'run failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE parse: event: X\ndata: {...}\n\n
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const block of events) {
          if (!block.trim()) continue;
          const lines = block.split('\n');
          let eventName = 'message';
          let dataLine = '';
          for (const line of lines) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLine = line.slice(5).trim();
          }
          if (!dataLine) continue;
          let payload: unknown;
          try {
            payload = JSON.parse(dataLine);
          } catch {
            continue;
          }
          handleStreamEvent(eventName, payload as Record<string, unknown>);
        }
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setErrorMessage(err instanceof Error ? err.message : 'run failed');
        setPhase('error');
      }
    }
  };

  const handleStreamEvent = (event: string, data: Record<string, unknown>) => {
    switch (event) {
      case 'progress': {
        const stageStr = String(data.stage);
        setProgress({ stage: stageStr, label: String(data.label) });
        const stageKey = STAGES.find((s) => s.key === stageStr)?.key;
        if (stageKey) {
          const nowT = Date.now();
          setStageTimings((prev) => {
            const next = { ...prev };
            // 이전 currentStage 마무리
            setCurrentStage((prevStage) => {
              if (prevStage && prevStage !== stageKey && !next[prevStage].finishedAt) {
                next[prevStage] = { ...next[prevStage], finishedAt: nowT };
              }
              return stageKey;
            });
            // 새 단계 시작
            if (!next[stageKey].startedAt) {
              next[stageKey] = { ...next[stageKey], startedAt: nowT };
            }
            return next;
          });
        }
        break;
      }
      case 'plan': {
        const p = data as unknown as Plan;
        setPlan(p);
        setResearchers(
          p.subQuestions.map((sq) => ({
            id: sq.id,
            question: sq.question,
            angle: sq.angle,
            status: 'pending',
          })),
        );
        break;
      }
      case 'researcher_start':
        setResearchers((prev) =>
          prev.map((r) =>
            r.id === data.subQuestionId
              ? { ...r, status: 'searching', modelAssigned: String(data.modelAssigned || ''), modelUsed: String(data.modelAssigned || '') }
              : r,
          ),
        );
        break;
      case 'researcher_fallback':
        setResearchers((prev) =>
          prev.map((r) =>
            r.id === data.subQuestionId
              ? { ...r, modelUsed: String(data.to || ''), fallbackOccurred: true }
              : r,
          ),
        );
        break;
      case 'partial_results':
        setPartialResults({ got: Number(data.got || 0), planned: Number(data.planned || 0) });
        break;
      case 'researcher_sources':
        setResearchers((prev) =>
          prev.map((r) =>
            r.id === data.subQuestionId
              ? { ...r, status: 'sources', sourcesCount: data.count as number }
              : r,
          ),
        );
        break;
      case 'researcher_done': {
        const rd = data as unknown as ResearcherDone & { modelUsed?: string; fallbackOccurred?: boolean };
        setResearchers((prev) =>
          prev.map((r) =>
            r.id === rd.subQuestionId
              ? {
                  ...r,
                  status: 'done',
                  sourcesCount: rd.sources?.length || 0,
                  modelUsed: rd.modelUsed || r.modelUsed,
                  fallbackOccurred: rd.fallbackOccurred ?? r.fallbackOccurred,
                }
              : r,
          ),
        );
        break;
      }
      case 'sources':
        setGlobalSources((data.globalSources as GlobalSource[]) || []);
        break;
      case 'compiler_done':
        setAtomicClaims((data.atomicClaims as AtomicClaim[]) || []);
        setConflicts((data.conflicts as Conflict[]) || []);
        break;
      case 'writer_delta':
        setFinalAnswer((prev) => prev + String(data.text || ''));
        break;
      case 'writer_done':
        break;
      case 'polish_delta':
        setPolishedAnswer((prev) => prev + String(data.text || ''));
        break;
      case 'verifier_done':
        setVerifier(data as unknown as VerifierResult);
        break;
      case 'done': {
        const nowT = Date.now();
        setStageTimings((prev) => {
          const next = { ...prev };
          for (const s of STAGES) {
            if (next[s.key].startedAt && !next[s.key].finishedAt) {
              next[s.key] = { ...next[s.key], finishedAt: nowT };
            }
          }
          return next;
        });
        setCurrentStage(null);
        if (Array.isArray(data.modelsUsed)) {
          setModelsUsed(data.modelsUsed as ModelInfo[]);
        }
        setPhase('done');
        setProgress(null);
        break;
      }
      case 'error':
        setErrorMessage(String(data.message || 'unknown'));
        setPhase('error');
        break;
    }
  };

  const stageIcon = (stage: string) => {
    if (stage === 'completeness' || stage === 'planner') return <Sparkles className="w-4 h-4" />;
    if (stage === 'researchers') return <Search className="w-4 h-4" />;
    if (stage === 'compiler') return <Scale className="w-4 h-4" />;
    if (stage === 'writer' || stage === 'polish') return <FileText className="w-4 h-4" />;
    if (stage === 'verifier') return <ShieldCheck className="w-4 h-4" />;
    return <Loader2 className="w-4 h-4 animate-spin" />;
  };

  const confidenceColor = (score: number) => {
    if (score >= 85) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 70) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (score >= 50) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  // ───────────────────────── 진행 상태 계산 ─────────────────────────
  const elapsedMs = startedAt ? nowTs - startedAt : 0;

  // 단계별 progress fraction 계산 (0~1)
  const stageFraction = (key: StageKey): number => {
    const timing = stageTimings[key];
    if (timing.finishedAt) return 1;
    if (!timing.startedAt) return 0;
    // 진행 중 — 단계별 휴리스틱
    if (key === 'researchers') {
      const total = researchers.length || 1;
      const done = researchers.filter((r) => r.status === 'done').length;
      const sourcing = researchers.filter((r) => r.status === 'sources').length;
      return Math.min(0.95, (done + sourcing * 0.7) / total);
    }
    if (key === 'writer') {
      // 대략 3000자 기준으로 본다
      const chars = finalAnswer.length;
      return Math.min(0.9, chars / 3000);
    }
    if (key === 'polish') {
      const chars = polishedAnswer.length;
      return Math.min(0.9, chars / 3000);
    }
    // planner / compiler / verifier — 시간 기반 (10초 기준)
    const elapsedStage = (nowTs - timing.startedAt) / 1000;
    return Math.min(0.9, elapsedStage / 10);
  };

  // 전체 진행률 %
  const overallProgress = useMemo(() => {
    if (phase !== 'running' && phase !== 'done') return 0;
    if (phase === 'done') return 100;
    let total = 0;
    for (const s of STAGES) {
      total += s.weight * stageFraction(s.key);
    }
    return Math.min(99, Math.round(total));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageTimings, researchers, finalAnswer, polishedAnswer, nowTs, phase]);

  // 각 단계별 상태 라벨
  const stageStatus = (key: StageKey): 'pending' | 'active' | 'done' => {
    const t = stageTimings[key];
    if (t.finishedAt) return 'done';
    if (t.startedAt) return 'active';
    return 'pending';
  };

  // 단계별 narrator 텍스트
  const stageDetail = (key: StageKey): string => {
    const t = stageTimings[key];
    const status = stageStatus(key);
    // 완료된 경우 소요 시간
    if (status === 'done' && t.startedAt && t.finishedAt) {
      const sec = Math.round((t.finishedAt - t.startedAt) / 1000);
      switch (key) {
        case 'planner':
          return plan ? `${plan.subQuestions.length} 서브질문 + ${plan.outline.length} 섹션 · ${sec}s` : `${sec}s`;
        case 'researchers':
          return `${researchers.length}개 검색 · 출처 ${globalSources.length}개 · ${sec}s`;
        case 'compiler':
          return `atomic claim ${atomicClaims.length}개 · 모순 ${conflicts.length}건 · ${sec}s`;
        case 'writer':
          return `${finalAnswer.length.toLocaleString()}자 · ${sec}s`;
        case 'polish':
          return `${polishedAnswer.length.toLocaleString()}자 · ${sec}s`;
        case 'verifier':
          return verifier ? `신뢰도 ${verifier.confidence} · 샘플 ${verifier.claimVerdicts.length}개 검증 · ${sec}s` : `${sec}s`;
      }
    }
    // 진행 중
    if (status === 'active') {
      switch (key) {
        case 'planner':
          return '서브질문·outline 설계 중...';
        case 'researchers': {
          const done = researchers.filter((r) => r.status === 'done').length;
          const total = researchers.length;
          return total > 0 ? `${done}/${total} 완료 · 출처 ${globalSources.length}개 수집` : '검색 준비 중...';
        }
        case 'compiler':
          return '출처 간 주장 추출·모순 탐색 중...';
        case 'writer':
          return finalAnswer.length > 0 ? `${finalAnswer.length.toLocaleString()}자 작성 중...` : '답변 구조 준비 중...';
        case 'polish':
          return polishedAnswer.length > 0 ? `${polishedAnswer.length.toLocaleString()}자 다듬는 중...` : '문체 정리 준비 중...';
        case 'verifier':
          return '인용 범위 + 주장 샘플 검증 중...';
      }
    }
    return '';
  };

  const displayAnswer = polishedAnswer || finalAnswer;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 md:p-6 min-h-full">
      {/* ───────── 헤더 ───────── */}
      {phase === 'idle' ? (
        <div className="flex flex-col gap-7 pt-3">
          {/* Hero 좌측 정렬: [아이콘+타이틀] [설명+AI 로고] 붙여서 */}
          <div className="flex items-center gap-4 md:gap-5 flex-wrap">
            {/* Left: 아이콘 + 제목 */}
            <div className="shrink-0 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 via-sky-500/15 to-emerald-500/10 border border-border/60 flex items-center justify-center shadow-sm">
                <Telescope className="w-5 h-5 text-violet-600/80" strokeWidth={1.8} />
              </div>
              <h1 className="font-display font-semibold text-[28px] md:text-[32px] tracking-[-0.025em] leading-none">심층 리서치</h1>
            </div>

            {/* Divider */}
            <div className="hidden md:block self-stretch w-px bg-border" />

            {/* Right: 설명 + AI 로고 */}
            <div className="min-w-[260px]">
              <div className="text-[13px] text-foreground/80 mb-1.5 leading-snug">
                여러 AI가 분담·검증해 인용 기반 리포트를 작성합니다
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 shrink-0">
                  <img src="/logos/gpt.svg" alt="GPT" title="GPT" className="w-3.5 h-3.5 object-contain" />
                  <span className="text-[11.5px] font-medium text-foreground/85">GPT</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <img src="/logos/claude.png" alt="Claude" title="Claude" className="w-3.5 h-3.5 object-contain" />
                  <span className="text-[11.5px] font-medium text-foreground/85">Claude</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <img src="/logos/gemini.svg" alt="Gemini" title="Gemini" className="w-3.5 h-3.5 object-contain" />
                  <span className="text-[11.5px] font-medium text-foreground/85">Gemini</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <img src="/logos/perplexity.svg" alt="Perplexity" title="Perplexity" className="w-3.5 h-3.5 object-contain" />
                  <span className="text-[11.5px] font-medium text-foreground/85">Perplexity</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <img src="/logos/grok.svg" alt="Grok" title="Grok" className="w-3.5 h-3.5 object-contain" />
                  <span className="text-[11.5px] font-medium text-foreground/85">Grok</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="flex items-center gap-4 md:gap-5 flex-wrap">
          <div className="shrink-0 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 via-sky-500/15 to-emerald-500/10 border border-border/60 flex items-center justify-center shadow-sm">
              <Telescope className="w-5 h-5 text-violet-600/80" strokeWidth={1.8} />
            </div>
            <h1 className="font-display font-semibold text-[28px] md:text-[32px] tracking-[-0.025em] leading-none">심층 리서치</h1>
          </div>

          <div className="hidden md:block self-stretch w-px bg-border" />

          <div className="min-w-[260px]">
            <div className="text-[13px] text-foreground/80 mb-1.5 leading-snug">
              여러 AI가 분담·검증해 인용 기반 리포트를 작성합니다
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 shrink-0">
                <img src="/logos/gpt.svg" alt="GPT" className="w-3.5 h-3.5 object-contain" />
                <span className="text-[11.5px] font-medium text-foreground/85">GPT</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <img src="/logos/claude.png" alt="Claude" className="w-3.5 h-3.5 object-contain" />
                <span className="text-[11.5px] font-medium text-foreground/85">Claude</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <img src="/logos/gemini.svg" alt="Gemini" className="w-3.5 h-3.5 object-contain" />
                <span className="text-[11.5px] font-medium text-foreground/85">Gemini</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <img src="/logos/perplexity.svg" alt="Perplexity" className="w-3.5 h-3.5 object-contain" />
                <span className="text-[11.5px] font-medium text-foreground/85">Perplexity</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <img src="/logos/grok.svg" alt="Grok" className="w-3.5 h-3.5 object-contain" />
                <span className="text-[11.5px] font-medium text-foreground/85">Grok</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────── idle: Process → Examples → Floating Input ───────── */}
      {phase === 'idle' && (
        <>
          {/* Process preview — Phase 그룹 (균일 높이 + step divider) */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60 font-medium mb-2">
              진행 흐름 예시
            </div>
            <div className="flex flex-col md:flex-row md:items-center items-stretch gap-2.5">
              {PHASES.map((phase, pi) => {
                const isLast = pi === PHASES.length - 1;
                return (
                  <Fragment key={phase.roman}>
                    <div className="flex-1 min-w-0 px-5 pt-3.5 pb-5 rounded-2xl bg-card border border-border/50 hover:border-border transition-colors flex flex-col">
                      {/* Phase 헤더 — em-dash로 구분 */}
                      <div className="mb-3 flex items-baseline gap-2 pb-2.5 border-b border-border/40">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold tabular-nums">
                          Phase&nbsp;{phase.roman}
                        </span>
                        <span className="text-muted-foreground/40 text-xs">—</span>
                        <span className="text-[13.5px] font-semibold text-foreground">{phase.title}</span>
                      </div>
                      {/* Steps — 세로 중앙 정렬, step 개수에 따른 gap */}
                      <div className="flex flex-col gap-3">
                        {phase.stepIndices.map((stepIdx, si) => {
                          const step = PROCESS_PREVIEW[stepIdx];
                          const logoSrc = step.aiShort === 'gpt' ? '/logos/gpt.svg'
                            : step.aiShort === 'gemini' ? '/logos/gemini.svg'
                            : step.aiShort === 'perplexity' ? '/logos/perplexity.svg'
                            : '/logos/claude.png';
                          const isLastStep = si === phase.stepIndices.length - 1;
                          return (
                            <Fragment key={step.label}>
                              <div className="flex items-start gap-2.5">
                                <span className="w-5 h-5 mt-0.5 shrink-0 rounded-full bg-muted/70 flex items-center justify-center text-[10.5px] font-semibold text-foreground/75 tabular-nums">
                                  {GLOBAL_STEP_NUMBERS[stepIdx]}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[13px] font-medium text-foreground tracking-tight">{step.label}</div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    {step.ais ? (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {step.ais.map((ai, i) => (
                                          <Fragment key={ai.label}>
                                            {i > 0 && <span className="text-muted-foreground/50 text-[11px]">+</span>}
                                            <div className="flex items-center gap-1">
                                              <img src={getLogoSrc(ai.logoKey)} alt="" className="w-3.5 h-3.5 object-contain" />
                                              <span className="text-[11px] text-muted-foreground">{ai.label}</span>
                                            </div>
                                          </Fragment>
                                        ))}
                                      </div>
                                    ) : step.aiShort === 'multi' ? (
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2.5">
                                          <div className="flex items-center gap-1">
                                            <img src="/logos/gpt.svg" alt="" className="w-3.5 h-3.5 object-contain" />
                                            <span className="text-[11px] text-muted-foreground">GPT</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <img src="/logos/claude.png" alt="" className="w-3.5 h-3.5 object-contain" />
                                            <span className="text-[11px] text-muted-foreground">Claude</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <img src="/logos/gemini.svg" alt="" className="w-3.5 h-3.5 object-contain" />
                                            <span className="text-[11px] text-muted-foreground">Gemini</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                          <div className="flex items-center gap-1">
                                            <img src="/logos/perplexity.svg" alt="" className="w-3.5 h-3.5 object-contain" />
                                            <span className="text-[11px] text-muted-foreground">Perplexity</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <img src="/logos/grok.svg" alt="" className="w-3.5 h-3.5 object-contain" />
                                            <span className="text-[11px] text-muted-foreground">Grok</span>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <img src={logoSrc} alt="" className="w-3.5 h-3.5 rounded-full bg-white object-contain p-[1px]" />
                                        <span className="text-[11px] text-muted-foreground truncate">{step.ai}</span>
                                      </>
                                    )}
                                  </div>
                                  {step.desc && (
                                    <div className="text-[11px] text-muted-foreground/70 mt-2 leading-relaxed">
                                      {step.desc}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {!isLastStep && (
                                <div className="border-t border-border/25 ml-6" />
                              )}
                            </Fragment>
                          );
                        })}
                      </div>
                    </div>
                    {/* Phase 사이 connector — 더 뚜렷한 arrow */}
                    {!isLast && (
                      <div className="flex items-center justify-center shrink-0 text-foreground/85">
                        <ArrowRight className="hidden md:block w-7 h-7" strokeWidth={2.5} />
                        <ChevronDown className="md:hidden w-7 h-7" strokeWidth={2.5} />
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>

          {/* Example cards — 2×2 (Phase와 차별화된 배경) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {EXAMPLE_CARDS.map((card) => (
              <button
                key={card.question}
                onClick={() => {
                  setQuestion(card.question);
                  const ta = document.querySelector<HTMLTextAreaElement>('textarea');
                  ta?.focus();
                }}
                className="group text-left p-4 rounded-xl border border-border/50 bg-card hover:border-foreground/25 hover:shadow-md hover:-translate-y-[2px] transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full", card.accent ?? 'bg-muted-foreground')} />
                      <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/70 font-semibold">
                        {card.category}
                      </div>
                    </div>
                    <div className="text-[13.5px] font-medium text-foreground leading-snug">
                      {card.question}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0 group-hover:text-foreground/80 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>

          {/* Spacer to push input near viewport bottom when content is short */}
          <div className="flex-1 min-h-[40px]" />

          {/* Floating Input — 일반 채팅과 동일한 QuestionInput 사용 (파일 첨부 지원) */}
          <div className="sticky bottom-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 pt-2 pb-4 bg-gradient-to-t from-background via-background/95 to-background/0 [&_textarea]:min-h-[72px] [&_textarea]:!pt-4">
            <QuestionInput
              onSubmit={(q) => { setQuestion(q); void submitQuestion(q); }}
              onSubmitWithFiles={(q, files: AttachedFile[]) => {
                const merged = files.length > 0 ? `${q}\n\n${buildAttachmentPrompt(files)}` : q;
                setQuestion(merged);
                void submitQuestion(merged);
              }}
              placeholderOverride="어떤 주제를 깊이 조사할까요? 질문이 짧아도 괜찮습니다."
            />
          </div>
        </>
      )}

      {/* ───────── preparing ───────── */}
      {phase === 'preparing' && (
        <Card className="p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <div className="text-sm">{progress?.label || '질문 분석 중...'}</div>
        </Card>
      )}

      {/* ───────── clarifying (S1) ───────── */}
      {phase === 'clarifying' && prepareResult && (
        <Card className="p-4 space-y-4">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">"{question}"에 대해 심층 리서치하기 전, 확인할게요:</div>
              <div className="text-xs text-muted-foreground mt-1">
                도메인: {prepareResult.domain} · 각 항목 기본값으로도 진행 가능합니다
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {prepareResult.questions.map((q, idx) => (
              <div key={q.slot} className="space-y-2">
                <div className="text-sm font-medium">
                  {idx + 1}. {q.question}
                </div>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.slot] === opt.value;
                    const isDefault = opt.id === q.defaultOptionId;
                    return (
                      <button
                        key={opt.id}
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [q.slot]: opt.value }))
                        }
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-xs transition-all',
                          selected
                            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                            : 'border-border bg-card hover:bg-secondary/50',
                        )}
                      >
                        {opt.label}
                        {isDefault && !selected && (
                          <span className="ml-1.5 text-[10px] opacity-60">기본</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              취소
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={skipClarifier}>
                기본값으로 진행
              </Button>
              <Button size="sm" onClick={proceedWithAnswers}>
                리서치 시작
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ───────── running ───────── */}
      {(phase === 'running' || phase === 'done') && (
        <>
          {(phase === 'running' || phase === 'done') && startedAt && (
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              {/* 상단: 타이머 + 진행률 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-mono font-semibold tabular-nums">{formatElapsed(elapsedMs)}</span>
                  <span className="text-xs text-muted-foreground">/ 예상 3~4분</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary">{overallProgress}%</span>
                  {phase === 'done' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                </div>
              </div>
              {/* 진행률 바 */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
                <div
                  className={cn(
                    'h-full transition-all duration-500 ease-out',
                    phase === 'done' ? 'bg-green-500' : 'bg-primary',
                  )}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              {/* 단계 체크리스트 */}
              <div className="space-y-1.5">
                {STAGES.map((s) => {
                  const status = stageStatus(s.key);
                  const detail = stageDetail(s.key);
                  return (
                    <div key={s.key} className={cn(
                      'flex items-start gap-2 text-xs rounded px-2 py-1 transition-colors',
                      status === 'active' && 'bg-primary/10',
                    )}>
                      <div className="mt-0.5">
                        {status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                        {status === 'active' && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
                        {status === 'pending' && <Circle className="w-3.5 h-3.5 text-muted-foreground/40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'font-medium',
                          status === 'done' && 'text-muted-foreground',
                          status === 'active' && 'text-primary',
                          status === 'pending' && 'text-muted-foreground/60',
                        )}>
                          {s.label}
                        </div>
                        {detail && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {detail}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {plan && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="w-4 h-4 text-primary" />
                리서치 계획
              </div>
              <div className="space-y-2">
                {researchers.map((r, idx) => {
                  const meta = getModelMeta(r.modelUsed || r.modelAssigned);
                  return (
                    <div key={r.id} className="flex items-start gap-2 text-xs p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <span className="text-muted-foreground mt-1 w-4 text-center font-mono">{idx + 1}</span>
                      {/* AI 로고 */}
                      <div className="mt-0.5 shrink-0">
                        {meta ? (
                          <img src={meta.logo} alt={meta.label} title={`${meta.label} — ${meta.role}`} className="w-5 h-5 rounded-full bg-white object-contain p-0.5 border border-slate-200 dark:border-slate-700 shadow-sm" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {meta && (
                            <span className="text-[10px] font-semibold text-foreground/70">
                              {meta.label}
                            </span>
                          )}
                          {r.angle === 'contrarian' && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-rose-50/50 border-rose-200 text-rose-700">
                              반대 관점
                            </Badge>
                          )}
                          {r.fallbackOccurred && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-amber-50/60 border-amber-200 text-amber-700" title="1차 모델 실패 → Claude로 자동 전환">
                              fallback
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11.5px] font-medium text-foreground/90 mt-0.5 leading-snug">
                          {r.question}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-[11px]">
                          {r.status === 'pending' && <span>⏳ 대기</span>}
                          {r.status === 'searching' && (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>검색 중</span>
                            </>
                          )}
                          {r.status === 'sources' && (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>출처 {r.sourcesCount}개 요약 중</span>
                            </>
                          )}
                          {r.status === 'done' && (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                              <span>완료 · 출처 {r.sourcesCount || 0}개</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {partialResults && (
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  ⚠️ 일부 리서처가 실패해 {partialResults.got}/{partialResults.planned}개로 진행합니다.
                </div>
              )}
              {plan.outline.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-1">답변 구조:</div>
                  <div className="text-xs">{plan.outline.join(' · ')}</div>
                </div>
              )}
            </Card>
          )}

          {displayAnswer && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                <FileText className="w-4 h-4 text-primary" />
                {phase === 'done' ? '최종 리포트' : '답변 작성 중...'}
                {phase === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}

                {/* Trust 배지 — verifier 결과 있을 때만 */}
                {verifier && phase === 'done' && (
                  <div className="ml-auto flex items-center gap-2 text-xs">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-full border font-semibold',
                      confidenceColor(verifier.confidence),
                    )}>
                      <ShieldCheck className="w-3 h-3" />
                      신뢰도 {verifier.confidence}
                    </span>
                    {verifier.flaggedCitations.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        {verifier.flaggedCitations.length} 환각
                      </span>
                    )}
                    {conflicts.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                        <Scale className="w-3 h-3" />
                        {conflicts.length} 모순
                      </span>
                    )}
                  </div>
                )}
              </div>
              <LazyMarkdown content={displayAnswer} className="prose prose-sm dark:prose-invert max-w-none" />

              {/* Verifier 디테일 — 펼쳐서 보기 */}
              {verifier && phase === 'done' && (verifier.flaggedCitations.length > 0 || verifier.claimVerdicts.some((v) => v.status !== 'verified')) && (
                <details className="mt-4 pt-3 border-t border-border">
                  <summary className="text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                    🔍 검증 상세 보기 ({verifier.totalCitations}개 인용 중 {verifier.flaggedCitations.length}개 범위 밖 · {verifier.claimVerdicts.length}개 주장 샘플 검증)
                  </summary>
                  <div className="mt-2 space-y-2 text-xs">
                    {verifier.flaggedCitations.length > 0 && (
                      <div className="p-2 bg-red-50 rounded border border-red-100">
                        <div className="font-semibold text-red-700 mb-1">⚠️ 범위 밖 인용 (환각 의심)</div>
                        <ul className="space-y-0.5 text-red-600">
                          {verifier.flaggedCitations.map((f) => (
                            <li key={f.n}>[{f.n}] — {f.reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {verifier.claimVerdicts.length > 0 && (
                      <div className="space-y-1">
                        <div className="font-semibold text-muted-foreground">📋 샘플 주장 검증</div>
                        {verifier.claimVerdicts.map((v, i) => {
                          const badgeColor = v.status === 'verified' ? 'text-green-700 bg-green-50'
                            : v.status === 'partial' ? 'text-blue-700 bg-blue-50'
                            : v.status === 'mismatch' ? 'text-red-700 bg-red-50'
                            : 'text-slate-600 bg-slate-50';
                          const statusLabel = v.status === 'verified' ? '✅ 확인'
                            : v.status === 'partial' ? '◐ 부분'
                            : v.status === 'mismatch' ? '❌ 불일치'
                            : '? 판단불가';
                          return (
                            <div key={i} className="p-2 bg-muted/30 rounded">
                              <div className="flex items-start gap-2">
                                <span className={cn('inline-flex px-1.5 py-0.5 rounded font-semibold', badgeColor)}>
                                  {statusLabel}
                                </span>
                                <span className="flex-1 text-muted-foreground">{v.claim}</span>
                              </div>
                              {v.reason && <div className="mt-1 text-[10px] text-muted-foreground pl-2">→ {v.reason}</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!verifier.citationDensityOk && (
                      <div className="p-2 bg-amber-50 rounded border border-amber-100 text-amber-700">
                        💡 citation density 낮음 — 일부 단락에 출처 인용이 부족합니다.
                      </div>
                    )}
                  </div>
                </details>
              )}
            </Card>
          )}

          {/* 미해결 모순 섹션 */}
          {phase === 'done' && conflicts.length > 0 && (
            <Card className="p-4 border-amber-200 bg-amber-50/30">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-amber-800">
                <Scale className="w-4 h-4" />
                미해결 모순 ({conflicts.length}건)
              </div>
              <div className="space-y-3 text-xs">
                {conflicts.map((c, i) => (
                  <div key={i} className="p-2 bg-white rounded border border-amber-100">
                    <div className="font-semibold text-amber-900 mb-1">{c.topic}</div>
                    <div className="space-y-1">
                      <div className="text-slate-700">
                        <span className="text-slate-500">출처 {c.sourceAIds.join(',')}:</span> {c.claimA}
                      </div>
                      <div className="text-slate-700">
                        <span className="text-slate-500">출처 {c.sourceBIds.join(',')}:</span> {c.claimB}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {phase === 'done' && globalSources.length > 0 && (
            <Card className="p-4">
              <div className="text-sm font-medium mb-2">📚 출처 ({globalSources.length}개)</div>
              <div className="space-y-1">
                {globalSources.map((s) => (
                  <a
                    key={s.globalId}
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs hover:text-primary transition-colors"
                  >
                    [{s.globalId}] {s.title}
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* 기여 AI 요약 — 최종 답변 하단 */}
          {phase === 'done' && modelsUsed.length > 0 && (
            <Card className="p-4 bg-gradient-to-br from-slate-50/60 to-white dark:from-slate-900/40 dark:to-slate-900/20">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                🤝 이 리포트에 기여한 AI
              </div>
              <div className="flex flex-wrap gap-2">
                {modelsUsed.map((m) => {
                  const meta = getModelMeta(m.id);
                  if (!meta) return null;
                  return (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm"
                      title={meta.role}
                    >
                      <img src={meta.logo} alt="" className="w-4 h-4 rounded-full bg-white object-contain p-0.5" />
                      <span className="text-xs font-medium">{meta.label}</span>
                      <span className="text-[10px] text-muted-foreground">· {meta.role}</span>
                    </span>
                  );
                })}
              </div>
            </Card>
          )}

          {phase === 'done' && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={reset}>
                새 리서치
              </Button>
            </div>
          )}
        </>
      )}

      {/* ───────── error ───────── */}
      {phase === 'error' && (
        <Card className="p-4 border-destructive/40 bg-destructive/5">
          <div className="text-sm font-medium text-destructive mb-2">오류가 발생했어요</div>
          <div className="text-xs text-muted-foreground mb-3">{errorMessage}</div>
          <Button variant="outline" size="sm" onClick={reset}>
            다시 시도
          </Button>
        </Card>
      )}
    </div>
  );
}
