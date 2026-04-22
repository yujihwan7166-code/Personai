import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DEFAULT_OPENROUTER_TEXT_MODEL,
  OPENROUTER_API_URL,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
} from './_lib/openrouter.js';

/**
 * 음성 분석 결과(전사·요약·챕터·액션)를 받아서 다양한 창조물(블로그/SNS/이메일/슬랙/학습노트/회의록)을
 * 생성하는 엔드포인트. 벤치마크: AudioPen, Voicenotes, Fathom, Granola.
 *
 * 스트리밍은 이번 라운드에선 생략 — 단순 JSON 응답으로 시작. 나중에 SSE 업그레이드 가능.
 */

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

export type ArtifactKind = 'blog' | 'sns' | 'email' | 'slack' | 'note' | 'minutes';
export type ArtifactTone = 'formal' | 'casual' | 'expert';
export type ArtifactLength = 'short' | 'medium' | 'long';

interface Chapter { start: number; end: number; title: string }
interface ActionItem { text: string; owner?: string; due?: string }

interface ReqBody {
  kind?: ArtifactKind;
  tone?: ArtifactTone;
  length?: ArtifactLength;
  title?: string;
  summary?: string;
  transcript?: string;
  chapters?: Chapter[];
  actionItems?: ActionItem[];
  durationSec?: number;
  /** true면 SSE 스트림 응답 */
  stream?: boolean;
  /** 이전 생성물 + 자연어 refinement — Refine 플로우 */
  previousContent?: string;
  refineInstruction?: string;
}

const TONE_HINTS: Record<ArtifactTone, string> = {
  formal: '정중하고 격식 있는 문체',
  casual: '편안하고 친근한 문체, 이모지 적절히',
  expert: '전문가 톤, 정밀한 용어 사용',
};

const LENGTH_HINTS: Record<ArtifactLength, string> = {
  short: '간결하게. 핵심만.',
  medium: '적당한 분량. 맥락 포함.',
  long: '상세하게. 배경과 디테일 풍부히.',
};

const KIND_PROMPTS: Record<ArtifactKind, string> = {
  blog: `녹음 내용을 블로그 글로 재구성하세요.

포맷:
# [제목 — 클릭하고 싶게]

(도입 문단 — 왜 이 얘기를 쓰는지, 2~4줄)

## [소제목 1]
(본문 문단)

## [소제목 2]
(본문 문단)

## [소제목 3]
(본문 문단)

(마무리 문단 — 독자에게 남길 한 마디)

규칙:
- 녹음에 없는 사실은 추가하지 마세요
- 구어체 "음", "어" 같은 것은 제거
- 중복된 주장은 통합`,

  sns: `녹음 내용을 SNS 포스트로 재구성하세요. X(트위터) 기준.

포맷: 스레드 형식으로 3~5개 포스트를 작성.
각 포스트는 280자 이내.
첫 포스트는 후킹이 강해야 함. 마지막은 교훈 또는 질문.

출력 형식:
1/ (첫 포스트)

2/ (두 번째)

3/ (세 번째)

...`,

  email: `녹음 내용을 바탕으로 이메일 초안을 작성하세요.
상황이 회의면 "회의 후속 이메일", 인터뷰면 "감사 이메일", 공지면 "공지 이메일"로.

포맷:
제목: [이메일 제목]

안녕하세요, [수신자],

(본문 — 맥락 한 문장 + 핵심 내용 bullet 3~5 + 다음 단계)

감사합니다.
[발신자]`,

  slack: `녹음 내용을 슬랙 또는 카톡 공유용 요약 메시지로 재구성하세요.

포맷:
🎙️ *[제목]* (녹음 길이)

📌 핵심
· (핵심 1)
· (핵심 2)
· (핵심 3)

✅ 해야 할 일 (있을 때만)
· (액션 1)
· (액션 2)

규칙:
- 5줄을 넘기지 마세요
- 이모지는 섹션 헤더에만`,

  note: `녹음 내용을 학습 노트로 재구성하세요.

포맷:
## 📚 개념
(핵심 개념 bullet 3~5개)

## 💡 예시
(구체적 예시 bullet 2~3개)

## ❓ 질문
(이해 확인용 질문 3개)

규칙:
- 구어체를 교과서체로 변환
- 각 개념은 한 줄로 요약
- 질문은 "~는 무엇인가요?" 또는 "~의 차이는?" 같은 개방형`,

  minutes: `녹음이 회의라고 가정하고 회의록을 작성하세요.

포맷:
# 회의록 — [주제]
일시: [추정 · 녹음 날짜]
길이: [녹음 분 단위]

## 참석자
(녹음에서 언급된 이름. 없으면 "미상")

## 안건
1. (안건 1)
2. (안건 2)

## 논의 내용
### 안건 1
(요점)

### 안건 2
(요점)

## 결정사항
· (결정 1)
· (결정 2)

## 다음 단계
· (액션 — 담당 — 기한)

규칙:
- 녹음에 없으면 "미정" 또는 생략`,
};

const KIND_LABEL: Record<ArtifactKind, string> = {
  blog: '블로그 글',
  sns: 'SNS 포스트',
  email: '이메일',
  slack: '슬랙/카톡 요약',
  note: '학습 노트',
  minutes: '회의록',
};

function buildMessages(body: ReqBody) {
  const kind = body.kind ?? 'blog';
  const tone = TONE_HINTS[body.tone ?? 'casual'];
  const length = LENGTH_HINTS[body.length ?? 'medium'];
  const transcript = (body.transcript ?? '').slice(0, 24000);
  const summary = body.summary ?? '';
  const chapters = (body.chapters ?? [])
    .map((c) => `- [${Math.round(c.start)}s] ${c.title}`)
    .join('\n');
  const actions = (body.actionItems ?? [])
    .map((a) => `- ${a.text}${a.owner ? ` (담당: ${a.owner})` : ''}${a.due ? ` (기한: ${a.due})` : ''}`)
    .join('\n');

  const isRefine = Boolean(body.previousContent && body.refineInstruction);

  const system = `당신은 녹음 전사본을 받아 ${KIND_LABEL[kind]}(으)로 재구성하는 작가입니다.
모든 응답은 한국어.
문체: ${tone}
분량: ${length}

${KIND_PROMPTS[kind]}${isRefine ? `

지금은 **수정 요청**을 처리 중입니다. 이전 결과물을 유지하되 사용자의 지시에 따라 고치세요.
메타 설명 없이 최종 결과만 출력하세요.` : ''}`;

  const user = isRefine
    ? `이전 결과물:
${body.previousContent}

수정 요청: ${body.refineInstruction}

위 결과물을 수정 요청에 맞게 고쳐 주세요.`
    : [
        body.title ? `녹음 제목: ${body.title}` : '',
        typeof body.durationSec === 'number' ? `녹음 길이: ${Math.round(body.durationSec)}초` : '',
        summary ? `\n자동 요약:\n${summary}` : '',
        chapters ? `\n챕터:\n${chapters}` : '',
        actions ? `\n자동 추출 액션:\n${actions}` : '',
        transcript ? `\n전사:\n${transcript}` : '',
      ]
        .filter(Boolean)
        .join('\n');

  return { system, user };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return res.status(501).json({ error: '생성 서비스가 연결되지 않았어요. OPENROUTER_API_KEY를 설정해 주세요.' });
  }

  const body = (req.body || {}) as ReqBody;
  const transcript = body.transcript ?? '';
  const isRefine = Boolean(body.previousContent && body.refineInstruction);
  if (!isRefine && (!transcript || transcript.trim().length === 0)) {
    return res.status(400).json({ error: '전사본이 비어 있어요. 분석이 완료된 녹음에서만 생성할 수 있어요.' });
  }

  const { system, user } = buildMessages(body);
  const wantStream = body.stream === true;

  try {
    const r = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model: DEFAULT_OPENROUTER_TEXT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.7,
        stream: wantStream,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: t || '생성 실패' });
    }

    if (!wantStream) {
      const data = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content ?? '';
      if (!content) return res.status(500).json({ error: '빈 응답이 돌아왔어요.' });
      return res.status(200).json({ content });
    }

    // ── SSE 스트림 프록시 — OpenRouter 그대로 전달.
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (typeof (res as unknown as { flushHeaders?: () => void }).flushHeaders === 'function') {
      (res as unknown as { flushHeaders: () => void }).flushHeaders();
    }

    const reader = r.body?.getReader();
    if (!reader) {
      res.write(`data: ${JSON.stringify({ error: '스트림을 읽을 수 없어요.' })}\n\n`);
      res.end();
      return;
    }
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        // OpenRouter의 SSE chunk를 그대로 전달 — 클라이언트가 파싱.
        res.write(decoder.decode(value, { stream: true }));
      }
    } finally {
      try { reader.releaseLock(); } catch { /* noop */ }
      res.end();
    }
    return;
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).json({ error: err instanceof Error ? err.message : '오류' });
    }
    try {
      res.write(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : '오류' })}\n\n`);
    } catch { /* noop */ }
    res.end();
  }
}
