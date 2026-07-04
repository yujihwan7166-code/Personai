import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DEFAULT_OPENROUTER_TEXT_MODEL,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
  OPENROUTER_API_URL,
  parseOpenRouterStreamBuffer,
} from './_lib/openrouter.js';
import { searchSerper } from './_lib/search/serperClient.js';

// 심층 리서치 API (P1 MVP)
// 두 가지 모드:
//   1) POST /api/deep-research?phase=prepare
//      → S0 Completeness Check + (필요 시) S1 Clarifier
//      → JSON 반환: { needsClarification, domain, parsedSpec, questions }
//   2) POST /api/deep-research (phase 없음, SSE stream)
//      → S2 Planner → S3 Researchers(병렬) → S7 Writer → S9 Polish
//      → SSE 이벤트: progress, plan, sources, writer(delta), polish(delta), done

// ─── 모델 라우팅 ────────────────────────────────────────────────
// 기본: Sonnet 4.6. 특정 역할만 다른 모델로 라우팅.
const MODEL_CLAUDE_SONNET = 'anthropic/claude-sonnet-4.6';
const MODEL_CLAUDE_HAIKU = 'anthropic/claude-haiku-4.5';
const MODEL_GPT = 'openai/gpt-4.1';
const MODEL_GEMINI = 'google/gemini-2.5-flash';
const MODEL_PERPLEXITY = 'perplexity/sonar';
const DEEP_RESEARCH_MODEL = MODEL_CLAUDE_SONNET;

// Researcher 역할 → 1차 모델 매핑. 타임아웃·실패 시 Sonnet fallback.
function pickResearcherModel(angle: string, freshness: string): string {
  // contrarian = Claude (뉘앙스 최강)
  if (angle === 'contrarian') return MODEL_CLAUDE_SONNET;
  // 최신 정보 필요 = Perplexity (네이티브 웹검색)
  if (freshness === 'fresh') return MODEL_PERPLEXITY;
  // 비교·분석 = Gemini (구조화 강점)
  if (angle === 'comparative') return MODEL_GEMINI;
  // breadth/factual = GPT (광범위 지식)
  return MODEL_GPT;
}

function modelLabel(model: string): string {
  if (model.startsWith('anthropic/claude-haiku')) return 'Claude Haiku';
  if (model.startsWith('anthropic/claude')) return 'Claude Sonnet';
  if (model.startsWith('openai/')) return 'GPT-4.1';
  if (model.startsWith('google/')) return 'Gemini 2.5';
  if (model.startsWith('perplexity/')) return 'Perplexity Sonar';
  return model;
}

const RESEARCHER_TIMEOUT_MS = 45_000;

function timeoutPromise<T>(ms: number): Promise<T> {
  return new Promise((_resolve, reject) => {
    setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
  });
}

// Citation 포맷 정규화 — 모든 모델 출력을 [n] 표준으로 변환
const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
};

function normalizeCitations(text: string): string {
  return text
    // [source 1] / [ref 1] / [citation 1] → [1]
    .replace(/\[(?:source|ref|citation|출처)[\s:]*(\d+)\]/gi, '[$1]')
    // 연속 첨자 ¹², ¹⁰ 등을 [12], [10] 로 변환 (두 자릿수 이상은 묶음)
    .replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (m) => `[${[...m].map((c) => SUPERSCRIPT_MAP[c] ?? '').join('')}]`)
    // **[1]** / **1** → [1]
    .replace(/\*\*\[?(\d+)\]?\*\*/g, '[$1]')
    // (1), (2) 패턴 중 출처 표기인 것만 → [1] (주의: 모든 괄호숫자를 바꾸면 안 됨)
    // 보수적으로 [숫자] 형식만 유지하고, 정체불명 포맷은 그대로 둠
    ;
}

// ───────────────────────── Prompts (서버 측 inline) ─────────────────────────
const S0_COMPLETENESS_SYSTEM = `당신은 심층 리서치 요청의 완전성을 판단하는 분석가다.

유저의 질문을 받아서 아래 JSON을 정확히 출력한다 (다른 텍스트 절대 금지):

{
  "domain": "market_forecast|tech_explain|person_history|event_analysis|finance_earnings|comparison|generic",
  "parsed": {
    "topic": "핵심 주제 (짧게)",
    "timeHorizon": "short|mid|long|historical|any",
    "perspective": ["investor|industry|policy|consumer|academic|general"],
    "geography": ["global|korea|us|china|eu|other|any"],
    "depth": "overview|deep|technical",
    "format": "report|table|timeline|compare|auto"
  },
  "missing": ["timeHorizon|perspective|geography|depth|format" 중 질문에 명시·추론 불가능한 slot들],
  "needsClarification": true|false
}

판단 규칙:
- 질문에 명시되거나 문맥상 명확히 추론 가능한 slot은 parsed에 채운다
- 질문이 sparse("유가 전망", "AI 미래")면 missing에 핵심 slot 2~3개 추가
- domain이 'generic'이거나 missing이 2개 이상이면 needsClarification = true
- 질문이 이미 구체적이면 needsClarification = false, missing = []

출력은 반드시 JSON 한 덩어리.`;

const S1_CLARIFIER_SYSTEM = `당신은 심층 리서치 전 유저에게 짧은 확인 질문을 던지는 분석가다.

입력: 원 질문 + 누락된 slot 목록 + 감지된 domain
출력: 누락 slot별 확인 질문 JSON 배열 (최대 3개).

각 질문은 도메인에 맞는 구체적 선택지 3개를 제공한다.

형식:
[
  {
    "slot": "timeHorizon|perspective|geography|depth|format|custom",
    "question": "한 줄 질문",
    "options": [
      { "id": "a", "label": "선택지1 (짧게)", "value": "내부표현" },
      { "id": "b", "label": "선택지2", "value": "..." },
      { "id": "c", "label": "선택지3", "value": "..." }
    ],
    "defaultOptionId": "b"
  }
]

반드시 JSON 배열만 출력.`;

const S2_PLANNER_SYSTEM = `당신은 심층 리서치 플래너다. 확정된 QuestionSpec을 받아 서브질문과 개요를 짠다.

출력 JSON:
{
  "subQuestions": [
    {"id":"q1","question":"구체적 서브질문","angle":"factual|comparative|temporal|contrarian|opinion","freshness":"fresh|recent|timeless"}
  ],
  "outline": ["섹션1 제목","섹션2 제목","섹션3 제목"],
  "format": "report|table|timeline|compare"
}

규칙:
- subQuestions 3~4개 (병렬 검색용)
- 반드시 1개는 angle="contrarian"
- outline 3~5개 섹션
- 각 서브질문은 검색 쿼리로 쓸 수 있게 구체적

반드시 JSON 한 덩어리만.`;

const S3_RESEARCHER_SYSTEM = `당신은 웹 검색 결과를 바탕으로 서브질문에 대한 간결한 리서치 노트를 작성한다.

출력: 한국어 200~400자 요약
- 검색 결과의 핵심 사실·수치만 추출
- 출처는 [1], [2] 형식 인라인
- 추측·의견 금지
- 마크다운 없음`;

const S3_CONTRARIAN_SYSTEM = `당신은 contrarian 리서처다. 반대 근거·대안 해석·비관 시나리오를 중심으로 요약한다.

출력: 한국어 200~400자
- 반대·회의적 관점 중심
- 출처 [1], [2] 인라인
- 정보 부족시 명시`;

const S5_COMPILER_SYSTEM = `당신은 리서치 노트에서 atomic claim을 추출하고 출처 간 모순을 찾는 편집자다.

입력:
- 서브질문별 researcher 노트 (이미 [n] 전역 출처 번호로 매핑됨)
- 전역 출처 리스트

출력 JSON (다른 텍스트 없이 한 덩어리):
{
  "atomicClaims": [
    {
      "id": "c1",
      "text": "한 문장 atomic claim (수치·사실·주장 단위)",
      "sourceIds": [1, 3],
      "confidence": "high|medium|low",
      "topic": "이 claim이 속하는 주제 태그"
    }
  ],
  "conflicts": [
    {
      "topic": "모순 주제",
      "claimA": "주장 A 내용",
      "sourceAIds": [1],
      "claimB": "주장 B 내용",
      "sourceBIds": [3]
    }
  ]
}

규칙:
- atomicClaims: 각 주장은 한 문장, 단일 사실·수치 단위로 쪼갠다 (여러 주장이 섞인 긴 문장 금지)
- sourceIds: 해당 주장을 뒷받침하는 전역 출처 번호 배열 (다중 출처 = 합의 claim)
- confidence: 2+ 출처 일치=high / 단일 출처=medium / 추론·부분적=low
- 같은 주장이 여러 출처에 나오면 하나의 claim으로 합쳐 sourceIds에 모두 포함
- conflicts: 서로 다른 출처가 같은 주제에 대해 다른 수치·방향의 주장을 할 때만 생성 (억지로 만들지 않음)
- claim 개수 20개 이내 권장`;

const S6_GAP_SYSTEM = `당신은 리서치 커버리지 감사관이다. outline 대비 수집된 claim 의 빈틈을 찾는다.

입력: outline 섹션 목록 + 수집된 atomicClaims (topic 태그 포함) + 이미 수행한 서브질문들

출력 JSON (다른 텍스트 없이):
{
  "gaps": [
    { "section": "커버리지가 약한 outline 섹션", "query": "그 빈틈을 메울 구체적 검색 쿼리 (한국어 또는 영어)" }
  ]
}

규칙:
- claim 이 0~1개뿐인 outline 섹션, 수치·최신 데이터가 없는 섹션을 우선
- 이미 수행한 서브질문과 중복되는 쿼리 금지
- 빈틈이 없으면 gaps: []
- 최대 2개`;

const S7_WRITER_SYSTEM = `당신은 심층 리서치 리포트 작성자다.

입력:
- 원 질문 + QuestionSpec
- outline (섹션 순서)
- atomicClaims 리스트 (각 claim에 sourceIds·confidence 포함) — 이게 유일한 사실 근거
- conflicts 리스트 — 출처 간 모순
- 전역 출처 리스트 (번호 부여됨)

리포트 구조 (반드시 이 순서):
1. "## 핵심 요약" — 가장 중요한 발견 3~5개 불릿 (각 불릿에 [n] 인용) + 마지막 줄에 **한 줄 결론** 볼드
2. outline 순서대로 본문 섹션 — 각 섹션 끝에 "**소결:** 한 줄" 형태의 섹션 소결론
3. conflicts 가 있으면 "## 미해결 모순" 섹션 — "출처 [a]는 X, 출처 [b]는 Y" 병기
4. "## 결론" — 세 부분으로 구조화: **확실한 것** (고신뢰 claim 기반) / **불확실한 것** (low confidence·모순) / **지켜볼 포인트** (다음 관찰 지점)
5. "## 참고 출처" — 전체 출처 리스트

작성 규칙:
- 사실 주장은 **반드시 atomicClaims 리스트 안에서만 선택**해서 쓴다
- 주장을 쓸 때 해당 claim의 sourceIds를 전부 [n] 인라인 인용 (복수 출처는 [1][3] 연속 표기)
- atomicClaims에 없는 사실·수치는 절대 꺼내지 말 것 (환각 금지)
- 일반론·배경 설명은 인용 없이 가능하지만 수치·고유명사·날짜는 반드시 [n]
- 수치가 3개 이상 나열되는 비교·추이는 마크다운 표로 정리 (format 이 table/compare 면 표 필수)
- confidence 가 low 인 claim 은 "~로 알려져 있으나 근거는 제한적" 처럼 불확실성을 명시
- depth 가 deep/technical 이면 섹션당 2~3문단으로 상세히, overview 면 간결히
- 한국어, 경어체 통일`;

const S8_VERIFIER_SYSTEM = `당신은 리서치 리포트의 중요 주장을 원본 출처와 대조해 검증하는 검수관이다.

입력:
- 작성된 리포트 (마크다운)
- 전역 출처 리스트 (번호·제목·snippet)
- atomicClaims (원 사실 근거)
- 샘플링된 검증 대상 주장 리스트 (리포트에서 수치·고유명사·날짜 포함 5개 샘플)

출력 JSON (다른 텍스트 없이):
{
  "verdicts": [
    {
      "claim": "검증 대상 주장 원문",
      "sourceIds": [1, 3],
      "status": "verified|partial|mismatch|unknown",
      "reason": "판단 근거 한 줄"
    }
  ]
}

status 기준:
- verified: 주장의 핵심 수치·고유명사·주체가 출처 snippet에서 확인됨
- partial: 일부만 확인, 일부는 출처에 없음
- mismatch: 출처와 반대·다른 수치
- unknown: snippet이 부족해 판단 불가`;

const S9_POLISH_SYSTEM = `당신은 리포트를 다듬는 편집자다.

규칙:
- 문체 통일 (경어체)
- 중복 제거, 흐름 매끄럽게
- [n] 인용 절대 수정 금지
- "## 참고 출처" 섹션 그대로 유지
- 헤딩 계층 정리
- 최종본만 출력, 설명 없음`;

// ───────────────────────── OpenRouter 호출 유틸 ─────────────────────────
async function callAgent(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 800,
  temperature = 0.4,
  model: string = DEEP_RESEARCH_MODEL,
): Promise<string> {
  const res = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: getOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

// 타임아웃 포함 + 실패 시 Sonnet fallback
async function callAgentWithFallback(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  temperature: number,
  primaryModel: string,
  fallbackModel: string = MODEL_CLAUDE_SONNET,
  timeoutMs: number = RESEARCHER_TIMEOUT_MS,
): Promise<{ text: string; modelUsed: string; fallbackOccurred: boolean }> {
  try {
    const text = await Promise.race([
      callAgent(apiKey, systemPrompt, userPrompt, maxTokens, temperature, primaryModel),
      timeoutPromise<string>(timeoutMs),
    ]);
    if (!text || !text.trim()) throw new Error('empty response');
    return { text, modelUsed: primaryModel, fallbackOccurred: false };
  } catch (err) {
    console.warn(`[deep-research] ${primaryModel} failed → fallback ${fallbackModel}:`, err instanceof Error ? err.message : err);
    if (primaryModel === fallbackModel) throw err;
    const text = await callAgent(apiKey, systemPrompt, userPrompt, maxTokens, temperature, fallbackModel);
    return { text, modelUsed: fallbackModel, fallbackOccurred: true };
  }
}

async function streamAgent(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  onDelta: (text: string) => void,
): Promise<string> {
  const res = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: getOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model: DEEP_RESEARCH_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      temperature: 0.6,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter stream error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No stream reader');
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseOpenRouterStreamBuffer(buffer);
    buffer = parsed.remainder;
    for (const text of parsed.texts) {
      full += text;
      onDelta(text);
    }
    if (parsed.done) break;
  }
  return full;
}

function extractJson(text: string): string {
  const trimmed = text.trim();
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

// ───────────────────────── SSE 유틸 ─────────────────────────
function sseWrite(res: VercelResponse, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ───────────────────────── 메인 핸들러 ─────────────────────────
interface PrepareBody {
  question: string;
}

interface RunBody {
  question: string;
  spec: {
    topic: string;
    domain: string;
    timeHorizon: string;
    perspective: string[];
    geography: string[];
    depth: string;
    format: string;
    constraints: string[];
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY가 설정되지 않았어요.' });
  }

  // ── Phase 1: prepare (S0 + S1) — JSON 응답 ──
  if (req.query.phase === 'prepare') {
    try {
      const body = (req.body || {}) as PrepareBody;
      const question = (body.question || '').trim();
      if (!question) {
        return res.status(400).json({ error: 'question is required' });
      }
      if (question.length > 2000) {
        return res.status(400).json({ error: '질문이 너무 깁니다.' });
      }

      // S0 — Haiku (빠르고 저렴)
      const s0Raw = await callAgent(
        apiKey,
        S0_COMPLETENESS_SYSTEM,
        `유저 질문: ${question}`,
        500,
        0.2,
        MODEL_CLAUDE_HAIKU,
      );
      const s0 = safeParseJson<{
        domain: string;
        parsed: Record<string, unknown>;
        missing: string[];
        needsClarification: boolean;
      }>(s0Raw);

      if (!s0) {
        return res.status(200).json({
          needsClarification: true,
          domain: 'generic',
          parsedSpec: { topic: question },
          missingSlots: ['timeHorizon', 'perspective'],
          questions: [],
        });
      }

      const needsClarification = s0.needsClarification && (s0.missing?.length || 0) > 0;

      if (!needsClarification) {
        return res.status(200).json({
          needsClarification: false,
          domain: s0.domain || 'generic',
          parsedSpec: s0.parsed || { topic: question },
          missingSlots: [],
          questions: [],
        });
      }

      // S1
      const s1Raw = await callAgent(
        apiKey,
        S1_CLARIFIER_SYSTEM,
        `원 질문: ${question}\ndomain: ${s0.domain}\nmissing slots: ${(s0.missing || []).join(', ')}`,
        800,
        0.3,
      );
      const questions = safeParseJson<unknown[]>(s1Raw) || [];

      return res.status(200).json({
        needsClarification: true,
        domain: s0.domain || 'generic',
        parsedSpec: s0.parsed || { topic: question },
        missingSlots: s0.missing || [],
        questions: Array.isArray(questions) ? questions.slice(0, 3) : [],
      });
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'prepare failed',
      });
    }
  }

  // ── Phase 2: run (S2 → S3 → S7 → S9) — SSE stream ──
  const body = (req.body || {}) as RunBody;
  const question = (body.question || '').trim();
  const spec = body.spec;
  if (!question || !spec) {
    return res.status(400).json({ error: 'question and spec are required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const allowedOrigin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);

  try {
    // ── S2 Planner ──
    sseWrite(res, 'progress', { stage: 'planner', label: '리서치 계획 수립 중...' });
    const planRaw = await callAgent(
      apiKey,
      S2_PLANNER_SYSTEM,
      `원 질문: ${question}\nQuestionSpec: ${JSON.stringify(spec)}`,
      900,
      0.5,
    );
    const plan = safeParseJson<{
      subQuestions: { id: string; question: string; angle: string; freshness: string }[];
      outline: string[];
      format: string;
    }>(planRaw);

    if (!plan || !Array.isArray(plan.subQuestions) || plan.subQuestions.length === 0) {
      sseWrite(res, 'error', { message: '리서치 계획 수립 실패' });
      res.end();
      return;
    }

    // 4개 제한 + id 보정
    plan.subQuestions = plan.subQuestions.slice(0, 4).map((sq, i) => ({
      ...sq,
      id: sq.id || `q${i + 1}`,
    }));

    sseWrite(res, 'plan', plan);

    // ── S3 Researchers (병렬) ──
    sseWrite(res, 'progress', { stage: 'researchers', label: `${plan.subQuestions.length}개 서브질문 병렬 리서치 중...` });

    const researcherTasks = plan.subQuestions.map(async (sq) => {
      const assignedModel = pickResearcherModel(sq.angle, sq.freshness);
      try {
        sseWrite(res, 'researcher_start', {
          subQuestionId: sq.id,
          question: sq.question,
          angle: sq.angle,
          modelAssigned: assignedModel,
          modelLabel: modelLabel(assignedModel),
        });

        // 웹 검색
        let sources: { title: string; link: string; snippet: string }[] = [];
        try {
          const searchRes = await searchSerper(sq.question);
          sources = searchRes.results;
        } catch (err) {
          console.warn('[deep-research] searchSerper failed:', err);
        }

        if (sources.length === 0) {
          const result = {
            subQuestionId: sq.id,
            query: sq.question,
            sources: [],
            summary: '검색 결과를 가져오지 못했습니다.',
            modelUsed: assignedModel,
            fallbackOccurred: false,
          };
          sseWrite(res, 'researcher_done', result);
          return result;
        }

        sseWrite(res, 'researcher_sources', { subQuestionId: sq.id, count: sources.length });

        // 요약 — 모델 라우팅 + 타임아웃 + Sonnet fallback
        const sourcesList = sources
          .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}\n(${s.link})`)
          .join('\n\n');
        const sys = sq.angle === 'contrarian' ? S3_CONTRARIAN_SYSTEM : S3_RESEARCHER_SYSTEM;
        const { text: rawSummary, modelUsed, fallbackOccurred } = await callAgentWithFallback(
          apiKey,
          sys,
          `서브질문: ${sq.question}\n\n검색 결과:\n${sourcesList}\n\n⚠️ 인용 표기는 반드시 [1], [2] 형식. 다른 포맷(첨자·**bold**·(source 1)) 금지.`,
          600,
          0.3,
          assignedModel,
        );
        const summary = normalizeCitations(rawSummary.trim());

        if (fallbackOccurred) {
          sseWrite(res, 'researcher_fallback', {
            subQuestionId: sq.id,
            from: assignedModel,
            to: modelUsed,
            fromLabel: modelLabel(assignedModel),
            toLabel: modelLabel(modelUsed),
          });
        }

        const result = {
          subQuestionId: sq.id,
          query: sq.question,
          sources,
          summary,
          modelUsed,
          fallbackOccurred,
        };
        sseWrite(res, 'researcher_done', result);
        return result;
      } catch (err) {
        console.warn('[deep-research] researcher failed totally:', err);
        const failed = {
          subQuestionId: sq.id,
          query: sq.question,
          sources: [],
          summary: '리서치 실패',
          modelUsed: assignedModel,
          fallbackOccurred: false,
        };
        sseWrite(res, 'researcher_done', failed);
        return failed;
      }
    });

    // Graceful degradation — 개별 실패 허용
    const settled = await Promise.allSettled(researcherTasks);
    const researcherResults = settled
      .filter((r): r is PromiseFulfilledResult<{
        subQuestionId: string;
        query: string;
        sources: { title: string; link: string; snippet: string }[];
        summary: string;
        modelUsed: string;
        fallbackOccurred: boolean;
      }> => r.status === 'fulfilled')
      .map((r) => r.value);

    const validResults = researcherResults.filter((r) => r.sources.length > 0);
    if (validResults.length === 0) {
      sseWrite(res, 'error', { message: '모든 리서처에서 검색 결과를 확보하지 못했습니다.' });
      res.end();
      return;
    }
    if (validResults.length < plan.subQuestions.length) {
      sseWrite(res, 'partial_results', {
        got: validResults.length,
        planned: plan.subQuestions.length,
      });
    }

    // ── 전역 출처 번호 부여 (validResults만) ──
    const globalSources: { globalId: number; title: string; link: string; snippet: string; subQuestionId: string }[] = [];
    const linkToId = new Map<string, number>();
    for (const r of validResults) {
      for (const s of r.sources) {
        if (!linkToId.has(s.link)) {
          const id = globalSources.length + 1;
          linkToId.set(s.link, id);
          globalSources.push({ ...s, globalId: id, subQuestionId: r.subQuestionId });
        }
      }
    }

    sseWrite(res, 'sources', { globalSources });

    // researcher 노트를 전역 번호로 재매핑 + citation 재정규화
    const remappedNotes = validResults.map((r) => {
      let remapped = r.summary;
      r.sources.forEach((s, i) => {
        const globalId = linkToId.get(s.link);
        if (globalId !== undefined) {
          const localTag = `[${i + 1}]`;
          remapped = remapped.split(localTag).join(`[${globalId}]`);
        }
      });
      return { subQuestionId: r.subQuestionId, summary: normalizeCitations(remapped) };
    });

    // 사용된 모델 집계 (done 이벤트에 포함)
    const modelsUsedSet = new Set<string>();
    modelsUsedSet.add(MODEL_CLAUDE_SONNET); // planner/compiler/writer/polish 공통
    modelsUsedSet.add(MODEL_CLAUDE_HAIKU);  // S0
    for (const r of validResults) modelsUsedSet.add(r.modelUsed);
    const modelsUsed = [...modelsUsedSet].map((m) => ({ id: m, label: modelLabel(m) }));

    // ── S5 Compiler: atomic claims + conflicts ──
    sseWrite(res, 'progress', { stage: 'compiler', label: '출처 간 주장·모순 정리 중...' });

    type AtomicClaim = { id: string; text: string; sourceIds: number[]; confidence: 'high' | 'medium' | 'low'; topic?: string };
    type Conflict = { topic: string; claimA: string; sourceAIds: number[]; claimB: string; sourceBIds: number[] };

    const compilerInput = [
      '=== 서브질문별 리서치 노트 (전역 [n]) ===',
      ...remappedNotes.map((n) => {
        const sq = plan.subQuestions.find((s) => s.id === n.subQuestionId);
        return `[${n.subQuestionId}] ${sq?.question || ''}\n${n.summary}`;
      }),
      '',
      '=== 전역 출처 목록 ===',
      ...globalSources.map((s) => `[${s.globalId}] ${s.title} — ${s.snippet.slice(0, 150)}`),
    ].join('\n');

    let atomicClaims: AtomicClaim[] = [];
    let conflicts: Conflict[] = [];
    try {
      const compilerRaw = await callAgent(
        apiKey,
        S5_COMPILER_SYSTEM,
        compilerInput,
        2200,
        0.3,
      );
      const compiled = safeParseJson<{ atomicClaims?: AtomicClaim[]; conflicts?: Conflict[] }>(compilerRaw);
      if (compiled?.atomicClaims) atomicClaims = compiled.atomicClaims.slice(0, 30);
      if (compiled?.conflicts) conflicts = compiled.conflicts.slice(0, 10);
    } catch (err) {
      console.warn('[deep-research] compiler failed:', err);
    }

    sseWrite(res, 'compiler_done', { atomicClaims, conflicts });

    // ── S6 Gap-fill: 커버리지 빈틈 감지 → 보강 검색 → claim 병합 (품질 라운드) ──
    try {
      sseWrite(res, 'progress', { stage: 'compiler', label: '커버리지 점검·보강 검색 중...' });
      const gapRaw = await callAgent(
        apiKey,
        S6_GAP_SYSTEM,
        [
          `Outline: ${plan.outline.join(' / ')}`,
          `수집된 claims (topic): ${atomicClaims.map((c) => `[${c.topic || '-'}] ${c.text.slice(0, 60)}`).join(' | ')}`,
          `이미 수행한 서브질문: ${plan.subQuestions.map((s) => s.question).join(' / ')}`,
        ].join('\n'),
        400,
        0.2,
        MODEL_CLAUDE_HAIKU,
      );
      const gapPlan = safeParseJson<{ gaps?: { section: string; query: string }[] }>(gapRaw);
      const gaps = (gapPlan?.gaps || []).slice(0, 2);

      const gapNotes: { subQuestionId: string; summary: string }[] = [];
      for (const [gi, gap] of gaps.entries()) {
        try {
          const searchRes = await searchSerper(gap.query);
          // 기존 출처와 중복 제거 후 새 전역 id 부여.
          const fresh = searchRes.results.filter((s) => !linkToId.has(s.link)).slice(0, 6);
          if (fresh.length === 0) continue;
          const localToGlobal: number[] = [];
          for (const s of fresh) {
            const id = globalSources.length + 1;
            linkToId.set(s.link, id);
            globalSources.push({ ...s, globalId: id, subQuestionId: `g${gi + 1}` });
            localToGlobal.push(id);
          }
          const sourcesList = fresh
            .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}\n(${s.link})`)
            .join('\n\n');
          const { text: rawNote } = await callAgentWithFallback(
            apiKey,
            S3_RESEARCHER_SYSTEM,
            `서브질문: ${gap.query}\n\n검색 결과:\n${sourcesList}\n\n⚠️ 인용 표기는 반드시 [1], [2] 형식.`,
            600,
            0.3,
            MODEL_GEMINI,
          );
          let note = normalizeCitations(rawNote.trim());
          localToGlobal.forEach((globalId, i) => {
            note = note.split(`[${i + 1}]`).join(`[${globalId}]`);
          });
          gapNotes.push({ subQuestionId: `g${gi + 1}`, summary: normalizeCitations(note) });
        } catch (err) {
          console.warn('[deep-research] gap-fill researcher failed:', err);
        }
      }

      if (gapNotes.length > 0) {
        // 갱신된 전역 출처 재전송 + 신규 노트만 컴파일해 claim 병합.
        sseWrite(res, 'sources', { globalSources });
        const appendRaw = await callAgent(
          apiKey,
          S5_COMPILER_SYSTEM,
          [
            '=== 서브질문별 리서치 노트 (전역 [n]) ===',
            ...gapNotes.map((n) => `[${n.subQuestionId}] 보강 리서치\n${n.summary}`),
            '',
            '=== 전역 출처 목록 ===',
            ...globalSources.map((s) => `[${s.globalId}] ${s.title} — ${s.snippet.slice(0, 150)}`),
          ].join('\n'),
          1400,
          0.3,
        );
        const appended = safeParseJson<{ atomicClaims?: AtomicClaim[]; conflicts?: Conflict[] }>(appendRaw);
        if (appended?.atomicClaims?.length) {
          const extra = appended.atomicClaims.slice(0, 12).map((c, i) => ({ ...c, id: `g${i + 1}` }));
          atomicClaims = [...atomicClaims, ...extra].slice(0, 40);
        }
        if (appended?.conflicts?.length) {
          conflicts = [...conflicts, ...appended.conflicts].slice(0, 12);
        }
        remappedNotes.push(...gapNotes);
        sseWrite(res, 'compiler_done', { atomicClaims, conflicts });
      }
    } catch (err) {
      console.warn('[deep-research] gap-fill round failed (무시하고 진행):', err);
    }

    // ── S7 Writer (streaming) — atomic claims 기반 ──
    sseWrite(res, 'progress', { stage: 'writer', label: '최종 답변 작성 중...' });

    const writerInput = [
      `원 질문: ${question}`,
      `QuestionSpec: ${JSON.stringify(spec)}`,
      `Outline: ${plan.outline.join(' / ')}`,
      '',
      '=== AtomicClaims (유일한 사실 근거) ===',
      ...atomicClaims.map((c) => `${c.id} [${c.sourceIds.map((n) => `[${n}]`).join('')}][${c.confidence}] ${c.text}`),
      '',
      '=== Conflicts (모순 병기 필요) ===',
      ...(conflicts.length > 0
        ? conflicts.map((c) => `주제: ${c.topic}\n  A (출처 ${c.sourceAIds.join(',')}): ${c.claimA}\n  B (출처 ${c.sourceBIds.join(',')}): ${c.claimB}`)
        : ['(없음)']),
      '',
      '=== 전역 출처 목록 ===',
      ...globalSources.map((s) => `[${s.globalId}] ${s.title} — ${s.link}`),
      '',
      '=== 보조 컨텍스트 (원본 researcher 노트) ===',
      ...remappedNotes.map((n) => {
        const sq = plan.subQuestions.find((s) => s.id === n.subQuestionId);
        return `[${n.subQuestionId}] ${sq?.question || ''}\n${n.summary}`;
      }),
    ].join('\n');

    // depth 가 깊을수록 긴 리포트 허용.
    const isDeep = spec.depth === 'deep' || spec.depth === 'technical';
    const writerTokens = isDeep ? 6000 : 4500;

    const writerDraft = await streamAgent(
      apiKey,
      S7_WRITER_SYSTEM,
      writerInput,
      writerTokens,
      (text) => sseWrite(res, 'writer_delta', { text }),
    );

    sseWrite(res, 'writer_done', {});

    // ── S9 Polish (streaming) ──
    sseWrite(res, 'progress', { stage: 'polish', label: '문체·구조 다듬는 중...' });

    const polished = await streamAgent(
      apiKey,
      S9_POLISH_SYSTEM,
      writerDraft,
      writerTokens + 300,
      (text) => sseWrite(res, 'polish_delta', { text }),
    );

    // ── S8 Verifier: rule-based + LLM sampling ──
    sseWrite(res, 'progress', { stage: 'verifier', label: '인용·사실 검증 중...' });

    const verification = runVerifier(polished, globalSources, atomicClaims, apiKey);
    const verificationResult = await verification;
    sseWrite(res, 'verifier_done', verificationResult);

    // ── 인용 리페어 (rule-based): 범위 밖 [n] 은 본문에서 제거 — 환각 인용이
    // 최종본에 남지 않게. 클라이언트는 done.finalAnswer 로 교체 렌더. ──
    let repairedAnswer = polished;
    if (verificationResult.flaggedCitations.length > 0) {
      const badIds = new Set(verificationResult.flaggedCitations.map((f) => f.n));
      repairedAnswer = polished.replace(/\[(\d+)\](?!\()/g, (m, n) => (badIds.has(Number(n)) ? '' : m));
    }

    sseWrite(res, 'done', {
      finalAnswer: repairedAnswer,
      sourcesCount: globalSources.length,
      subQuestionsCount: plan.subQuestions.length,
      atomicClaimsCount: atomicClaims.length,
      conflictsCount: conflicts.length,
      confidence: verificationResult.confidence,
      modelsUsed,
    });
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    sseWrite(res, 'error', { message });
    res.end();
  }
}

// ───────────────────────── S8 Verifier ─────────────────────────
interface VerifierGlobalSource {
  globalId: number;
  title: string;
  link: string;
  snippet: string;
}

interface VerifierAtomicClaim {
  id: string;
  text: string;
  sourceIds: number[];
  confidence: 'high' | 'medium' | 'low';
  topic?: string;
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

async function runVerifier(
  draft: string,
  globalSources: VerifierGlobalSource[],
  atomicClaims: VerifierAtomicClaim[],
  apiKey: string,
): Promise<VerifierResult> {
  const maxId = globalSources.length;

  // ── Rule 1: citation ID 범위 체크 ──
  const citationMatches = [...draft.matchAll(/\[(\d+)\]/g)];
  const uniqueIds = new Set<number>();
  const flagged: FlaggedCitation[] = [];
  for (const m of citationMatches) {
    const n = Number(m[1]);
    if (!uniqueIds.has(n)) {
      uniqueIds.add(n);
      if (n < 1 || n > maxId) {
        flagged.push({ n, reason: `출처 번호 [${n}]가 존재하지 않음 (1~${maxId} 범위 밖)` });
      }
    }
  }

  // ── Rule 2: citation density ──
  // "## 참고 출처" 앞까지를 본문으로 간주
  const refMatch = draft.match(/##\s*참고 출처/);
  const bodyEnd = refMatch?.index ?? draft.length;
  const body = draft.slice(0, bodyEnd);
  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim().length > 80 && !p.trim().startsWith('#'));
  const paragraphsWithCitation = paragraphs.filter((p) => /\[\d+\]/.test(p));
  const densityRatio = paragraphs.length === 0 ? 1 : paragraphsWithCitation.length / paragraphs.length;
  const citationDensityOk = densityRatio >= 0.6;

  // ── LLM 샘플링: 숫자·날짜 포함 claim 5개 샘플 검증 ──
  const importantClaims = atomicClaims
    .filter((c) => /\d|[가-힣]{2,}사|주식회사|[A-Z][a-z]+/.test(c.text))
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);

  let verdicts: ClaimVerdict[] = [];
  if (importantClaims.length > 0) {
    const sourcesForSample = new Set<number>();
    importantClaims.forEach((c) => c.sourceIds.forEach((id) => sourcesForSample.add(id)));
    const sourcesList = globalSources
      .filter((s) => sourcesForSample.has(s.globalId))
      .map((s) => `[${s.globalId}] ${s.title}\n스니펫: ${s.snippet.slice(0, 300)}`)
      .join('\n\n');

    const verifierInput = [
      '=== 검증 대상 주장 ===',
      ...importantClaims.map((c) => `${c.id} (출처 ${c.sourceIds.join(',')}): ${c.text}`),
      '',
      '=== 해당 출처 스니펫 ===',
      sourcesList,
    ].join('\n');

    try {
      const verifierRaw = await callAgent(
        apiKey,
        S8_VERIFIER_SYSTEM,
        verifierInput,
        1500,
        0.2,
        MODEL_CLAUDE_HAIKU,
      );
      const parsed = safeParseJson<{ verdicts?: ClaimVerdict[] }>(verifierRaw);
      if (parsed?.verdicts) verdicts = parsed.verdicts;
    } catch (err) {
      console.warn('[deep-research] verifier failed:', err);
    }
  }

  // ── 신뢰도 점수 계산 ──
  // Base 100
  // - 범위 밖 citation 1개당 -15
  // - density < 0.6 이면 -10
  // - verdict별: verified 0, partial -5, mismatch -20, unknown -3
  let score = 100;
  score -= flagged.length * 15;
  if (!citationDensityOk) score -= 10;
  for (const v of verdicts) {
    if (v.status === 'partial') score -= 5;
    else if (v.status === 'mismatch') score -= 20;
    else if (v.status === 'unknown') score -= 3;
  }
  score = Math.max(0, Math.min(100, score));

  return {
    confidence: score,
    flaggedCitations: flagged,
    claimVerdicts: verdicts,
    citationDensityOk,
    totalCitations: citationMatches.length,
    uniqueCitations: [...uniqueIds].sort((a, b) => a - b),
  };
}

// 사용되지 않는 DEFAULT_OPENROUTER_TEXT_MODEL import 경고 방지용 no-op (Sonnet 고정이므로)
void DEFAULT_OPENROUTER_TEXT_MODEL;
