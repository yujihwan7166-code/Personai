import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DEFAULT_OPENROUTER_TEXT_MODEL,
  OPENROUTER_API_URL,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
} from './_lib/openrouter.js';

type Lens = 'summary' | 'keypoints' | 'mindmap' | 'quiz' | 'guide' | 'debate' | 'flashcards';
type Tone = 'plain' | 'student' | 'exam' | 'interview' | 'kid';
type Level = 'basic' | 'standard' | 'advanced';

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

  switch (req.lens) {
    case 'summary':
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
      return {
        system: '당신은 공부 도우미입니다. 객관식 퀴즈를 JSON으로 생성합니다.',
        user: `${common}
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
        max_tokens: body.lens === 'quiz' ? 2500 : 3500,
      }),
    });
    if (!response.ok) {
      const t = await response.text();
      return res.status(response.status).json({ error: t || '생성 실패' });
    }
    const data = await response.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';

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
