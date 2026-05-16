/**
 * 클라우드 문서 에디터용 AI 액션.
 * /api/cloud-ai 엔드포인트 호출. OpenRouter 재사용.
 *
 * 짧은 인라인 작업 = Gemini Flash Lite (속도)
 * 긴 생성·재구성 = 상위 모델 (필요 시)
 */

export const QUICK_MODEL = 'google/gemini-2.5-flash-lite';
export const QUALITY_MODEL = 'google/gemini-2.5-flash';

export async function quickAi(system: string, user: string, opts: { model?: string; maxTokens?: number; temperature?: number } = {}): Promise<string> {
  const res = await fetch('/api/cloud-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system,
      user,
      model: opts.model ?? QUICK_MODEL,
      maxTokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.7,
    }),
  });
  if (!res.ok) {
    let msg = `AI 호출 실패 (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data.error === 'string') msg = data.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const data = await res.json();
  return typeof data.text === 'string' ? data.text.trim() : '';
}

// ─────────────────────────────────────────────
// 5가지 액션
// ─────────────────────────────────────────────

export async function aiSummarize(text: string): Promise<string> {
  return quickAi(
    '당신은 핵심을 잘 잡는 편집자입니다. 사용자가 준 글을 한 문단(2~4문장)으로 핵심만 요약해주세요. 군더더기 설명·인사·결론 표기 없이 결과만 출력합니다.',
    text,
    { model: QUICK_MODEL, temperature: 0.3 },
  );
}

export async function aiRewrite(text: string, style: '명확' | '간결' | '정중' = '명확'): Promise<string> {
  const styleHint = style === '간결' ? '더 짧고 간결하게'
    : style === '정중' ? '더 정중하고 격식 있게'
    : '더 명확하고 자연스럽게';
  return quickAi(
    `당신은 글을 다듬는 편집자입니다. 사용자가 준 문장(들)을 ${styleHint} 다시 써주세요. 원래 의미·정보는 보존합니다. 설명·머리말 없이 결과만 출력합니다.`,
    text,
    { model: QUICK_MODEL, temperature: 0.5 },
  );
}

export type Lang = '영어' | '일본어' | '중국어 간체' | '한국어';

export async function aiTranslate(text: string, lang: Lang): Promise<string> {
  return quickAi(
    `사용자가 준 글을 자연스러운 ${lang}로 번역해주세요. 원문의 의미·뉘앙스를 살리되 어색하지 않게. 결과만 출력합니다.`,
    text,
    { model: QUICK_MODEL, temperature: 0.3 },
  );
}

export type Tone = '친근하게' | '전문적으로' | '간결하게' | '유머있게';

export async function aiChangeTone(text: string, tone: Tone): Promise<string> {
  return quickAi(
    `사용자가 준 글을 "${tone}" 톤으로 바꿔주세요. 의미·정보는 그대로. 결과만 출력합니다.`,
    text,
    { model: QUICK_MODEL, temperature: 0.6 },
  );
}

export async function aiContinue(text: string): Promise<string> {
  return quickAi(
    '당신은 사용자의 글을 자연스럽게 이어 쓰는 작가입니다. 주어진 글의 흐름·문체·주제를 유지하면서 다음 1~3문단을 이어 써주세요. **이어질 부분만** 출력하고 원문을 반복하지 마세요. 설명·머리말 없음.',
    text,
    { model: QUALITY_MODEL, temperature: 0.8 },
  );
}
