import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DEFAULT_OPENROUTER_TEXT_MODEL,
  OPENROUTER_API_URL,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
} from './_lib/openrouter.js';

type Lens = 'summary' | 'keypoints' | 'mindmap' | 'quiz' | 'guide' | 'debate' | 'flashcards' | 'podcast' | 'diagram' | 'diagram-suggest';
type Tone = 'plain' | 'student' | 'exam' | 'interview' | 'kid';
type Level = 'basic' | 'standard' | 'advanced';
type SummaryMode = 'whole' | 'pages-index' | 'pages-detail' | 'pages-vision-index' | 'pages-vision-detail';
type SummaryDensity = 'oneline' | 'standard' | 'detailed';

interface SourceInput {
  title: string;
  content: string;
}

interface GenReq {
  lens: Lens;
  sources: SourceInput[];
  tone?: Tone;
  level?: Level;
  options?: {
    count?: number;
    weakConcepts?: string[];
    expertA?: { name: string; role?: string };
    expertB?: { name: string; role?: string };
    summaryMode?: SummaryMode;
    pages?: number[];
    density?: SummaryDensity;
    /** 비전 모드용 — 페이지 이미지 dataURL 배열 */
    pageImages?: Array<{ page: number; dataUrl: string }>;
  };
}

const TONE_HINTS: Record<Tone, string> = {
  plain: '명료하고 중립적인 문체',
  student: '대학생 수준, 핵심 위주',
  exam: '시험 대비 — 출제 포인트와 암기 핵심 강조',
  interview: '면접/발표 대비 — 한 문장으로 정리 가능하도록',
  kid: '초등학생이 이해할 쉬운 언어, 비유 활용',
};

const LEVEL_HINTS: Record<Level, string> = {
  basic: '기초: 용어부터 천천히',
  standard: '표준: 개념과 예시 균형',
  advanced: '심화: 배경·파생 개념·응용까지',
};

function buildPrompt(req: GenReq): { system: string; user: string } {
  const tone = TONE_HINTS[req.tone ?? 'plain'];
  const level = LEVEL_HINTS[req.level ?? 'standard'];
  const sourceBlock = req.sources
    .map((s, i) => `[S${i + 1}] ${s.title}\n${s.content.slice(0, 12000)}`)
    .join('\n\n---\n\n');

  const common = `아래 소스만을 근거로 작성하세요. 소스 밖 사실은 추측하지 마세요.
문체: ${tone}
난이도: ${level}
모든 응답은 한국어.

=== 소스 ===
${sourceBlock}
=== /소스 ===
`;

  const summaryMode: SummaryMode = req.options?.summaryMode ?? 'whole';

  switch (req.lens) {
    case 'summary':
      if (summaryMode === 'pages-index') {
        return {
          system: `당신은 공부 도우미입니다. 학습 자료를 의미 단위 챕터(덩어리)로 자르고 각 페이지를 한 줄씩 요약합니다.
원본에 없는 사실 금지. 페이지 마커 [p.N] 만 신뢰.`,
          user: `${common}
위 소스에는 [p.N] 형식의 페이지 마커가 들어 있습니다.

다음 JSON 객체만 출력하세요(코드블록·주석·부가 텍스트 금지):

{
  "chunks": [
    {
      "range": [1, 11],
      "title": "간 해부학",
      "summary": "이 챕터는 간의 혈관 구조와 소엽 단위 미세구조를 다룬다. 하대정맥·간문맥·간동맥의 흐름과 30~40 / 60~70 비율, 간소엽의 구역별 대사 경로가 핵심이다."
    }
  ],
  "notes": [
    { "page": 1, "title": "표지/섹션 제목(있으면, 없으면 생략)", "oneLiner": "한 줄 요약(≤45자)", "kind": "text" }
  ]
}

규칙 — chunks:
- **자료를 의미 단위로 4~8개 챕터로 자르세요**. 페이지 수가 많아도 8개 이하로.
- 각 챕터는 보통 **8~15페이지** 분량. 자료 전체 페이지를 빠짐없이 분배(겹침·누락 금지).
- 'range' 는 [시작, 끝] 페이지 번호(포함). 'pages' 필드는 생략(서버가 채움).
- 'title' 은 그 덩어리의 핵심 주제를 ≤15자 명사구로.
- 'summary' 는 **2~4문장 마크다운**. 그 챕터에서 무엇을 다루는지 + 핵심 개념·수치·관계. 단순 나열 금지, 인과·흐름·비교로 서술.

규칙 — notes:
- **모든 페이지**를 빠짐없이 포함 (소스에 등장한 [p.N] 전부)
- 'oneLiner' 는 **반드시 ≤45자**, 명사구·요점만, 마침표 X
- 'title' 은 그 페이지의 헤딩이 보일 때만
- 텍스트 거의 없이 그림·도식만 있는 페이지는 "kind":"image-only", 'oneLiner' 는 "🖼️ 도식/그림" 으로
- 빈 페이지면 "kind":"image-only", 'oneLiner' 는 "(빈 페이지)" 로

페이지 마커가 없으면 {"chunks":[], "notes":[]} 만 출력`,
        };
      }
      if (summaryMode === 'pages-detail') {
        const pages = (req.options?.pages ?? []).filter((n) => Number.isFinite(n));
        const density = req.options?.density ?? 'standard';
        const lengthHint = density === 'oneline'
          ? '각 페이지 1-2문장 (≤80자)'
          : density === 'detailed'
          ? '각 페이지 7-10문장, 핵심 용어 굵게(**), 가능하면 예시 1개'
          : '각 페이지 3-5문장, 핵심 용어 굵게(**)';
        return {
          system: `당신은 공부 도우미입니다. 지정된 페이지만 학습 노트로 정리합니다.
원본에 없는 사실 금지. 인접 페이지는 맥락 참고만, 본문은 지정 페이지 내용만.`,
          user: `${common}
다음 페이지들만 학습 노트로 정리하세요: ${pages.join(', ')}

각 페이지의 노트를 아래 JSON 배열로만 출력 (코드블록·주석 금지):

[
  { "page": 1, "body": "마크다운 본문" },
  { "page": 2, "body": "..." }
]

규칙:
- ${lengthHint}
- 'body' 는 마크다운, 핵심 용어는 **굵게**
- 도입부·결론부 금지, 바로 핵심 서술
- 해당 페이지에 텍스트가 거의 없으면 'body' 를 "🖼️ 그림 위주 페이지로 텍스트 정리가 어려워요" 로
- 지정한 페이지만 정확히 출력 (다른 페이지 추가 금지)`,
        };
      }
      return {
        system: `당신은 공부 도우미입니다. 학습 자료를 "심층 구조화 요약"으로 만듭니다.
핵심 원칙: 원본에 없는 사실 금지 · 단순 나열 금지 · 인과·흐름·비교로 서술 · 핵심 용어는 반드시 굵게(**)`,
        user: `${common}
위 소스를 "시험 직전 이 요약만 읽어도 되도록" 심층적으로 요약합니다.

# 출력 규칙

1) **목차 자동 생성**: 자료 전체를 포괄하는 대주제 6~10개를 뽑아 "## 1. 제목", "## 2. 제목" 형식으로 번호를 매깁니다. 가능하면 한자/영어 용어가 있으면 한글 옆에 병기하세요. 예: "## 1. 기회비용(Opportunity Cost)"

2) **각 대주제 안의 구조**:
   - 첫 줄: **핵심 한 줄 요약** (bold + 한두 문장). 이 주제가 무엇인지/왜 중요한지.
   - 이어서 3~6문장의 상세 서술. 정의 → 원리 → 예시 → 응용 순서가 이상적.
   - 중요 용어·수치·고유명사는 **bold** 처리.
   - 대조·비교가 있으면 표 또는 "A vs B" 형태로 짧게.

3) **페이지 인용 뱃지**: 원본 소스에 "p.N", "페이지 N", "(N쪽)" 등 페이지 표시가 보이면 해당 문장 끝에 [p.N] 토큰으로 정확히 남기세요. 원본에 페이지 표시가 없으면 생략합니다(지어내지 마세요).

4) **더 하위 구조가 필요하면** "### 부제목" 을 사용해 세분할 수 있지만 불릿 나열은 최소화합니다.

5) **도입부·결론부 불필요**: 바로 "## 1." 부터 시작합니다. 인사말·메타 설명 금지.

# 예시 (형식 참고용)

## 1. 기회비용(Opportunity Cost)

**어떤 선택의 기회비용은 포기한 대안 중 가장 가치 있는 것이다.** 경제학에서 가장 근본적인 개념으로, 합리적 선택 여부를 판단하는 기준이 된다.

예를 들어 대학 진학의 기회비용은 등록금뿐 아니라 **그 시간에 일했다면 벌 수 있었던 소득**과 **얻을 수 있었던 경험**까지 포함한다. 단순 지출이 아니라 "포기한 차선책의 가치" 로 정의하는 것이 핵심이다. 이 개념은 정부의 정책 우선순위 결정에도 동일하게 적용된다.[p.3]

## 2. ...

이제 위 형식대로 생성하세요. 마크다운만 출력하세요.`,
      };
    case 'keypoints':
      return {
        system: '당신은 공부 도우미입니다. 핵심 용어와 정의를 추출합니다.',
        user: `${common}
위 소스의 핵심 용어/개념 8-12개를 추출해 주세요.
각 항목을 다음 형식으로:
### <용어>
<한 문장 정의>. <1-2문장의 부가 설명과 예시>.

마크다운만 사용. 다른 부가 텍스트 금지.`,
      };
    case 'mindmap':
      return {
        system: '당신은 공부 도우미입니다. 개념 구조를 JSON 마인드맵으로 표현합니다.',
        user: `${common}
위 소스의 지식 구조를 **JSON 마인드맵** 으로 만들어 주세요.

반드시 아래 스키마만 출력 (코드블록·주석·부가 텍스트 금지):
{
  "root": {
    "id": "n",
    "label": "자료의 주제(짧게)",
    "summary": "한 줄 정의 (≤30자, 선택)",
    "pages": [1],
    "emoji": "📘",
    "children": [
      {
        "id": "n_1",
        "label": "주요 개념 A",
        "summary": "짧은 설명",
        "pages": [2,3],
        "branchColor": "#6366F1",
        "children": [
          { "id": "n_1_1", "label": "세부 개념", "summary": "...", "pages": [4], "children": [] }
        ]
      }
    ]
  },
  "crossLinks": [
    { "from": "n_1_1", "to": "n_2_1", "label": "상호 관련" }
  ]
}

엄격 규칙:
- **루트 1개** — 자료 전체 주제를 짧게 (≤15자)
- **depth 1 가지 3~7개** — 가지가 너무 많으면 가독성 저하
- **depth 2 자식 2~5개** — 각 주요 개념의 세부
- **depth 3 은 꼭 필요할 때만** (구체 예시·사실)
- 각 노드의 'label' 은 짧은 구(句), **≤ 20자**
- 'summary' 는 해당 개념의 한 줄 정의 (≤30자)
- 'pages' 는 원문 [p.N] 마커 기반 배열. 없으면 생략
- 'branchColor' 는 depth 1 노드에만 지정, 다음 팔레트에서 순서대로 다양하게:
  #6366F1 #10B981 #F59E0B #0EA5E9 #EF4444 #8B5CF6 #14B8A6
- 'emoji' 는 의미 있는 노드에만 (과용 금지, 생략 OK)
- 'id' 는 경로 기반(n, n_1, n_1_2 ...) 으로 일관성 유지
- 'crossLinks' 는 진짜 핵심 상호관계 **최대 3개** (생략 가능)
- 전체 노드 수 **20~60개** 범위 권장`,
      };
    case 'quiz': {
      const count = req.options?.count ?? 5;
      const weak = req.options?.weakConcepts?.length
        ? `특히 다음 취약 개념 중심으로 출제: ${req.options.weakConcepts.join(', ')}`
        : '';
      const focus = (req.options as unknown as { focus?: string })?.focus?.trim();
      const focusLine = focus ? `출제 범위·주제 한정: ${focus}\n위 범위를 벗어나지 마세요.` : '';
      return {
        system: '당신은 공부 도우미입니다. 객관식 퀴즈를 JSON으로 생성합니다.',
        user: `${common}
${focusLine}
${weak}
위 소스로 객관식 문제 ${count}개를 생성해 주세요.
반드시 아래 JSON 배열 형식만 출력(코드블록·주석·부가 텍스트 금지):
[
  {
    "question": "문제",
    "choices": ["선택지1", "선택지2", "선택지3", "선택지4"],
    "answerIndex": 0,
    "explanation": "왜 그 답이 정답인지 1-2문장 해설",
    "concept": "관련 개념 키워드"
  }
]`,
      };
    }
    case 'guide':
      return {
        system: '당신은 공부 도우미입니다. 학습 가이드를 구조화해서 작성합니다.',
        user: `${common}
위 소스로 학습 가이드를 만들어 주세요. 다음 4섹션을 마크다운 헤더로:

## 🎯 학습 목표
(3-5개 불릿)

## 📚 선수 지식
(알고 있으면 좋을 개념 3-5개)

## 🪜 학습 순서
(단계별로 번호 매겨서)

## ❓ 점검 질문
(스스로 답해볼 질문 5개)`,
      };
    case 'flashcards': {
      const count = req.options?.count ?? 12;
      const focus = (req.options as unknown as { focus?: string })?.focus?.trim();
      const cardTypes = (req.options as unknown as { cardTypes?: string[] })?.cardTypes;
      const level = req.level;
      const typeMap: Record<string, string> = {
        definition: '용어 정의 (개념·용어의 뜻)',
        example: '예시·사례 (구체 사례·적용)',
        comparison: '개념 비교 (A vs B 대조)',
        mechanism: '메커니즘 (원리·작동 과정)',
      };
      const typeGuide = cardTypes && cardTypes.length > 0
        ? `# 카드 유형 가이드\n다음 유형들을 균형있게 섞어 출제: ${cardTypes.map((t) => typeMap[t] ?? t).join(', ')}`
        : '# 카드 유형 가이드\n정의 · 예시 · 비교 · 메커니즘 을 골고루 섞어 출제';
      const focusBlock = focus
        ? `# 집중 범위·주제 (사용자 지정)\n"${focus}"\n이 범위·주제에 맞는 내용 위주로 카드를 구성. 범위 밖 내용은 제외.`
        : '';
      const levelLabel = level === 'basic' ? '기초' : level === 'advanced' ? '심화' : '표준';
      return {
        system: '당신은 공부 도우미입니다. 암기용 플래시카드를 JSON 배열로 생성합니다.',
        user: `${common}
${focusBlock}

위 소스의 핵심 내용을 암기하기 좋게 앞/뒷면 카드 ${count}장으로 뽑아주세요. 난이도: ${levelLabel}.

${typeGuide}

# 카드 원칙
- 앞면(front): 질문형 또는 용어/개념 한두 단어. 뒷면 보기 전에 떠올릴 수 있는 트리거.
- 뒷면(back): 1~2문장의 정의·설명·보충. 지나치게 길지 않게.
- 카드 간 독립: 다른 카드를 참조하지 말 것(A는 B에서 설명함 같은 연결 금지).
- 소스 밖 사실 추가 금지.
- 앞면과 뒷면 길이 균형: 앞면은 짧게, 뒷면은 자족적 설명.

# 출력 형식 (JSON 배열만, 코드블록·주석·부가 텍스트 금지)
[
  {
    "front": "앞면 (질문 또는 용어)",
    "back": "뒷면 (정의/설명 1-2문장)",
    "concept": "관련 개념 키워드"
  }
]`,
      };
    }
    case 'diagram-suggest': {
      return {
        system: '당신은 공부 도우미입니다. 자료를 도식화하기 좋은 개념을 추천합니다. JSON 만 출력합니다.',
        user: `${common}
위 자료를 살펴보고, 도식으로 만들면 이해가 확 쉬워질 **핵심 개념 4개**를 골라주세요.
각 개념마다 가장 적합한 도식 유형을 함께 추천하세요.

유형: flowchart(프로세스), timeline(시간순), comparison(A vs B), cause(원인→결과), tree(계층), sequence(상호작용)

JSON 스키마 (코드블록 금지):
{
  "suggestions": [
    {"concept": "혈액 순환", "kind": "flowchart", "reason": "순환 과정이라 흐름도로 보면 명확"},
    ...
  ]
}`,
      };
    }
    case 'diagram': {
      const opts = (req.options as unknown as {
        concept?: string;
        focus?: string;
        diagramKind?: string;
        isMobile?: boolean;
      }) ?? {};
      const concept = opts.concept?.trim() || '자료 핵심 개념';
      const focusLine = opts.focus?.trim() ? `집중 범위: ${opts.focus.trim()}` : '';
      const forcedKind = opts.diagramKind && opts.diagramKind !== 'auto' ? opts.diagramKind : null;
      const mobileHint = opts.isMobile ? '\n모바일 뷰입니다. flowchart 는 반드시 `flowchart TB` (세로) 로 작성하세요.' : '';
      return {
        system: '당신은 공부 도우미의 도식 생성기입니다. JSON 만 출력합니다.',
        user: `${common}
${focusLine}
사용자가 "${concept}" 를 도식으로 요청했습니다.${mobileHint}

${forcedKind
  ? `유형은 "${forcedKind}" 으로 고정합니다.`
  : `먼저 이 개념에 가장 적합한 유형을 고르세요:
- flowchart: 프로세스·절차·의사결정
- timeline: 시간 순서·사건
- comparison: A vs B 대조
- cause: 원인→결과 체인
- tree: 계층·분류
- sequence: 상호작용·주고받음`}

규칙:
- Mermaid 코드는 즉시 렌더 가능해야 (노드 id 중복 금지, 한국어 라벨은 대괄호 안에 "..." 꼴)
- 노드 id 는 의미 있는 짧은 영문 (A, B, C 또는 node_heart, step_1 등)
- 노드 라벨은 10자 이내 우선. 길면 "긴 라벨"
- 자료에 없는 사실 금지
- 원본 페이지 참조가 있으면 caption 에 [p.N] 형식으로 포함

출력 JSON 스키마:
{
  "kind": "flowchart",
  "kindLabel": "플로우차트",
  "title": "제목 (20자 이내)",
  "mermaid": "flowchart TD\\n  A[심장] -->|수축| B[대동맥]\\n  ...",
  "caption": "도식만 봐서 놓치기 쉬운 핵심 맥락 2-3문장"
}

단, kind 가 "comparison" 이면 mermaid 대신 table 을 출력:
{
  "kind": "comparison",
  "title": "...",
  "table": {
    "columns": ["A", "B"],
    "rows": [{"label": "항목", "cells": ["A값", "B값"]}]
  },
  "caption": "..."
}`,
      };
    }
    case 'podcast': {
      const opts = (req.options as unknown as {
        lengthMin?: number; purpose?: string; podcastTone?: string; focus?: string;
      }) ?? {};
      const minutes = opts.lengthMin ?? 5;
      const targetWords = Math.round(minutes * 150);
      const purpose = opts.purpose && opts.purpose !== 'auto' ? opts.purpose : 'auto';
      const pTone = opts.podcastTone ?? 'friendly';
      const focusLine = opts.focus?.trim() ? `집중 범위: ${opts.focus.trim()}` : '';
      return {
        system: '당신은 두 호스트의 팟캐스트 대본을 작성합니다. 반드시 JSON 만 출력합니다.',
        user: `${common}
${focusLine}

자료 성격을 먼저 살펴보고, purpose 필드에 다음 중 하나를 고르세요:
- exam (시험 자료 · 출제 포인트 위주)
- overview (균형 잡힌 입문 설명)
- review (강의 필기 복습)
- briefing (짧은 기사·뉴스 요점)
- deep-dive (배경·응용까지 심화)
${purpose !== 'auto' ? `단, 사용자가 "${purpose}"를 지정했으니 이를 우선 사용하세요.` : ''}

두 호스트의 대화 대본을 작성:
- 호스트 A: 호기심 많은 청취자 — 짧게 질문·요약·되짚기
- 호스트 B: 분야 전문가 — 깊게 설명·비유·예시

목표 길이: 약 ${minutes}분 (${targetWords}단어 내외)
톤: ${pTone} (friendly=친근, serious=진지, lecture=강의형)

규칙:
- 인사/자기소개는 1턴 이내로 짧게, 바로 본론.
- 자료에 없는 사실은 절대 넣지 말 것.
- 중요 개념 언급 시 원본 페이지가 있으면 [p.N] 표기.
- 마지막에 30초 요점 정리 1-2턴.
- 자료가 빈약하면 억지로 늘리지 말고 짧게 마무리.

다음 JSON 스키마만 출력 (코드블록 금지, 부가 텍스트 금지):
{
  "purpose": "exam|overview|review|briefing|deep-dive",
  "purposeLabel": "시험 대비",
  "title": "에피소드 제목 (20자 이내)",
  "script": [
    {"speaker":"A","text":"..."},
    {"speaker":"B","text":"..."}
  ]
}`,
      };
    }
    case 'debate': {
      const a = req.options?.expertA ?? { name: '전문가 A' };
      const b = req.options?.expertB ?? { name: '전문가 B' };
      return {
        system: '당신은 공부 도우미입니다. 두 전문가의 토론을 생성해 학습 효과를 높입니다.',
        user: `${common}
위 소스 주제에 대해 두 전문가의 관점 대립 토론을 생성해 주세요.

전문가 A: ${a.name}${a.role ? ` (${a.role})` : ''}
전문가 B: ${b.name}${b.role ? ` (${b.role})` : ''}

형식(마크다운):
**${a.name}:** (발언 2-4문장)

**${b.name}:** (반박 또는 보완, 2-4문장)

...이런 식으로 총 4-6 턴. 마지막에

## 📌 학습 포인트
토론에서 배울 수 있는 요지를 3개 불릿.`,
      };
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY가 설정되지 않았어요.' });
  }
  const body = (req.body || {}) as GenReq;
  if (!body.lens || !Array.isArray(body.sources) || body.sources.length === 0) {
    return res.status(400).json({ error: '소스와 렌즈를 지정해 주세요.' });
  }

  // ── 비전 모드 분기: 멀티모달 메시지 ──
  const isVisionMode = body.lens === 'summary'
    && (body.options?.summaryMode === 'pages-vision-index' || body.options?.summaryMode === 'pages-vision-detail');
  if (isVisionMode) {
    const images = body.options?.pageImages ?? [];
    if (images.length === 0) {
      return res.status(400).json({ error: '페이지 이미지가 필요해요.' });
    }
    const isIndex = body.options?.summaryMode === 'pages-vision-index';
    const density = body.options?.density ?? 'standard';
    const lengthHint = density === 'oneline'
      ? '각 페이지 1-2문장 (≤80자)'
      : density === 'detailed'
      ? '각 페이지 7-10문장, 핵심 용어 굵게(**), 가능하면 예시 1개'
      : '각 페이지 3-5문장, 핵심 용어 굵게(**)';

    const visionSystem = isIndex
      ? `당신은 공부 도우미입니다. 학습 자료의 각 페이지 이미지를 보고 한 줄씩 요약해 JSON 배열로 출력합니다.
이미지에 보이는 내용만 신뢰하세요. 보이지 않는 내용을 추측하지 마세요.`
      : `당신은 공부 도우미입니다. 지정된 페이지 이미지들을 보고 학습 노트로 정리합니다.
이미지에 보이는 내용만 신뢰하세요. 보이지 않는 내용을 추측하지 마세요.`;

    const visionUserText = isIndex
      ? `다음은 학습 자료의 페이지 이미지들입니다. 각 이미지는 페이지 번호 라벨과 함께 제공됩니다.

다음 JSON 객체만 출력하세요(코드블록·주석·부가 텍스트 금지):

{
  "chunks": [
    {
      "range": [1, 11],
      "title": "간 해부학",
      "summary": "이 챕터는 간의 혈관 구조와 소엽 단위 미세구조를 다룬다. 하대정맥·간문맥·간동맥의 흐름과 30~40 / 60~70 비율, 간소엽의 구역별 대사 경로가 핵심이다."
    }
  ],
  "notes": [
    { "page": 1, "title": "페이지 제목/헤딩(있으면, 없으면 생략)", "oneLiner": "한 줄 요약(≤45자)", "kind": "text" }
  ]
}

규칙 — chunks:
- 자료를 의미 단위로 4~8개 챕터로 자르세요. 페이지가 많아도 8개 이하.
- 각 챕터 보통 8~15페이지. 전체 페이지를 빠짐없이 분배(겹침·누락 금지).
- 'range' 는 [시작, 끝] (포함). 'pages' 필드는 생략(서버가 채움).
- 'title' 은 ≤15자 명사구.
- 'summary' 는 **2~4문장 마크다운**, 챕터에서 다루는 핵심 개념·관계·수치를 인과·흐름으로 서술.

규칙 — notes:
- 입력된 모든 페이지를 빠짐없이 포함
- 'oneLiner' 는 ≤45자, 명사구·요점만, 마침표 X
- 'title' 은 그 페이지의 헤딩이 보일 때만
- 페이지에 텍스트는 거의 없고 그림/도식만 있다면 "kind":"image-only", 'oneLiner' 는 그 그림이 보여주는 내용을 한 줄로 (예: "🖼️ 간 혈관 구조 도식")
- 완전히 빈 페이지면 "kind":"image-only", 'oneLiner' 는 "(빈 페이지)" 로`
      : `다음은 학습 자료의 특정 페이지 이미지들입니다. 각 페이지를 학습 노트로 정리하세요.
아래 JSON 배열로만 출력 (코드블록·주석 금지):

[
  { "page": 1, "body": "마크다운 본문" }
]

규칙:
- ${lengthHint}
- 'body' 는 마크다운, 핵심 용어는 **굵게**, 페이지에 도식/그림이 있으면 그 의미도 풀어 설명
- 도입부·결론부 금지, 바로 핵심 서술
- 입력된 페이지만 정확히 출력 (다른 페이지 추가 금지)`;

    // 멀티모달 content 구성: 각 이미지마다 라벨 텍스트 + 이미지 순서로 삽입
    const userContent: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    > = [{ type: 'text', text: visionUserText }];
    for (const img of images) {
      userContent.push({ type: 'text', text: `[페이지 ${img.page}]` });
      userContent.push({ type: 'image_url', image_url: { url: img.dataUrl } });
    }

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: getOpenRouterHeaders(apiKey),
        body: JSON.stringify({
          model: DEFAULT_OPENROUTER_TEXT_MODEL,
          messages: [
            { role: 'system', content: visionSystem },
            { role: 'user', content: userContent },
          ],
          stream: false,
          temperature: 0.3,
          max_tokens: isIndex ? 4500 : 4500,
        }),
      });
      if (!response.ok) {
        const t = await response.text();
        return res.status(response.status).json({ error: t || '비전 생성 실패' });
      }
      const data = await response.json();
      const content: string = data?.choices?.[0]?.message?.content ?? '';
      let parsed: unknown = null;
      try {
        const trimmed = content.replace(/^```json\s*|\s*```$/g, '').trim();
        parsed = JSON.parse(trimmed);
      } catch {
        const obj = content.match(/\{[\s\S]*\}/);
        if (obj) {
          try { parsed = JSON.parse(obj[0]); } catch { /* noop */ }
        }
        if (!parsed) {
          const arr = content.match(/\[[\s\S]*\]/);
          if (arr) {
            try { parsed = JSON.parse(arr[0]); } catch { /* noop */ }
          }
        }
      }
      return res.status(200).json({ content, structured: parsed });
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : '오류' });
    }
  }

  const { system, user } = buildPrompt(body);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model: DEFAULT_OPENROUTER_TEXT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        stream: false,
        temperature: body.lens === 'debate' ? 0.85 : 0.4,
        max_tokens: body.lens === 'quiz' ? 2500
          : body.lens === 'podcast' ? 5000
          : body.lens === 'diagram-suggest' ? 800
          : body.lens === 'diagram' ? 2500
          : (body.lens === 'summary' && body.options?.summaryMode === 'pages-index') ? 4500
          : (body.lens === 'summary' && body.options?.summaryMode === 'pages-detail') ? 4500
          : 3500,
      }),
    });
    if (!response.ok) {
      const t = await response.text();
      return res.status(response.status).json({ error: t || '생성 실패' });
    }
    const data = await response.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';

    if (body.lens === 'summary' && (body.options?.summaryMode === 'pages-index' || body.options?.summaryMode === 'pages-detail')) {
      let parsed: unknown = null;
      try {
        const trimmed = content.replace(/^```json\s*|\s*```$/g, '').trim();
        parsed = JSON.parse(trimmed);
      } catch {
        // pages-index 는 객체, pages-detail 는 배열
        const obj = content.match(/\{[\s\S]*\}/);
        if (obj) {
          try { parsed = JSON.parse(obj[0]); } catch { /* noop */ }
        }
        if (!parsed) {
          const arr = content.match(/\[[\s\S]*\]/);
          if (arr) {
            try { parsed = JSON.parse(arr[0]); } catch { /* noop */ }
          }
        }
      }
      return res.status(200).json({ content, structured: parsed });
    }

    if (body.lens === 'quiz' || body.lens === 'flashcards') {
      let parsed: unknown = null;
      try {
        const trimmed = content.replace(/^```json\s*|\s*```$/g, '').trim();
        parsed = JSON.parse(trimmed);
      } catch {
        const match = content.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch {
            /* noop */
          }
        }
      }
      return res.status(200).json({ content, structured: parsed });
    }

    if (body.lens === 'diagram' || body.lens === 'diagram-suggest') {
      let parsed: unknown = null;
      try {
        const trimmed = content.replace(/^```json\s*|\s*```$/g, '').trim();
        parsed = JSON.parse(trimmed);
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch { /* noop */ }
        }
      }
      return res.status(200).json({ content, structured: parsed });
    }

    if (body.lens === 'podcast') {
      let parsed: unknown = null;
      try {
        const trimmed = content.replace(/^```json\s*|\s*```$/g, '').trim();
        parsed = JSON.parse(trimmed);
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch { /* noop */ }
        }
      }
      return res.status(200).json({ content, structured: parsed });
    }

    if (body.lens === 'mindmap') {
      let parsed: unknown = null;
      try {
        const trimmed = content.replace(/^```json\s*|\s*```$/g, '').trim();
        parsed = JSON.parse(trimmed);
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch { /* noop */ }
        }
      }
      return res.status(200).json({ content, structured: parsed });
    }

    return res.status(200).json({ content });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : '오류' });
  }
}
