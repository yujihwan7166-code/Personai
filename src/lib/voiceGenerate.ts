// AI 녹음 분석 창조물 생성 API 클라이언트.
// SSE 스트리밍 + 일반 JSON 모드 둘 다 지원. 추가로 Refine(자연어 수정) 플로우 제공.

import type {
  VoiceRecording,
  ArtifactKind,
  ArtifactTone,
  ArtifactLength,
} from '@/types/voiceAnalysis';

interface BaseInput {
  recording: VoiceRecording;
  kind: ArtifactKind;
  tone: ArtifactTone;
  length: ArtifactLength;
  signal?: AbortSignal;
}

interface GenerateInput extends BaseInput {
  /** 토큰 delta가 들어올 때마다 호출. 누적된 전체 content 문자열 전달. */
  onDelta?: (content: string) => void;
}

interface RefineInput extends BaseInput {
  previousContent: string;
  refineInstruction: string;
  onDelta?: (content: string) => void;
}

interface GenerateResponse {
  content?: string;
  error?: string;
}

function buildBody(input: BaseInput) {
  const { recording, kind, tone, length } = input;
  const transcriptText = recording.transcript
    .map((s) => `[${Math.round(s.start)}s] ${s.text}`)
    .join('\n');
  return {
    kind,
    tone,
    length,
    title: recording.title,
    summary: recording.summary,
    transcript: transcriptText,
    chapters: recording.chapters,
    actionItems: recording.actionItems,
    durationSec: recording.durationSec,
  };
}

/**
 * SSE 스트림을 파싱해 `data: {json}` 라인에서 `choices[0].delta.content`를 뽑아
 * 누적 content를 onDelta로 전달. 완료 시 최종 content 반환.
 */
async function consumeStream(res: Response, onDelta?: (content: string) => void): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error('스트림을 열 수 없어요.');
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let errorMsg: string | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: 이벤트 구분 = 빈 줄 (\n\n)
    let idx = buffer.indexOf('\n\n');
    while (idx !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      idx = buffer.indexOf('\n\n');

      // 각 줄에서 data: 추출
      for (const line of rawEvent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const obj = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
            error?: string | { message?: string };
          };
          if (obj.error) {
            errorMsg = typeof obj.error === 'string' ? obj.error : (obj.error.message || '스트림 오류');
          }
          const delta = obj.choices?.[0]?.delta?.content ?? obj.choices?.[0]?.message?.content;
          if (delta) {
            content += delta;
            onDelta?.(content);
          }
        } catch {
          /* 파싱 실패한 이벤트는 건너뜀 (OpenRouter 주기적 코멘트 등) */
        }
      }
    }
  }
  if (errorMsg) throw new Error(errorMsg);
  if (!content) throw new Error('빈 응답이 돌아왔어요.');
  return content;
}

export async function generateArtifact(input: GenerateInput): Promise<string> {
  const { signal, onDelta } = input;
  const body = buildBody(input);

  const r = await fetch('/api/voice-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stream: Boolean(onDelta) }),
    signal,
  });

  if (!r.ok) {
    let msg = '생성에 실패했어요.';
    try {
      const data = (await r.json()) as GenerateResponse;
      msg = data.error || msg;
    } catch { /* noop */ }
    throw new Error(msg);
  }

  if (!onDelta) {
    const data = (await r.json()) as GenerateResponse;
    if (!data.content) throw new Error('빈 응답이 돌아왔어요.');
    return data.content;
  }
  return consumeStream(r, onDelta);
}

export async function refineArtifact(input: RefineInput): Promise<string> {
  const { signal, onDelta, previousContent, refineInstruction } = input;
  const body = buildBody(input);

  const r = await fetch('/api/voice-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...body,
      previousContent,
      refineInstruction,
      stream: Boolean(onDelta),
    }),
    signal,
  });

  if (!r.ok) {
    let msg = '수정에 실패했어요.';
    try {
      const data = (await r.json()) as GenerateResponse;
      msg = data.error || msg;
    } catch { /* noop */ }
    throw new Error(msg);
  }

  if (!onDelta) {
    const data = (await r.json()) as GenerateResponse;
    if (!data.content) throw new Error('빈 응답이 돌아왔어요.');
    return data.content;
  }
  return consumeStream(r, onDelta);
}
