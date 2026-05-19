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

// ─────────────────────────────────────────────
// 신규 액션 (글 다듬기·변환·구조)
// ─────────────────────────────────────────────

/** 글 더 길게 (예시·설명 추가) */
export async function aiMakeLonger(text: string): Promise<string> {
  return quickAi(
    '사용자가 준 글을 약 1.5~2배 더 길게 확장해주세요. 예시·설명·문맥을 추가하되 핵심 메시지·톤은 보존. 머리말·결론 표기 없이 결과만 출력합니다.',
    text,
    { model: QUICK_MODEL, temperature: 0.6 },
  );
}

/** 글 더 짧게 (군더더기 제거) */
export async function aiMakeShorter(text: string): Promise<string> {
  return quickAi(
    '사용자가 준 글에서 군더더기를 빼고 약 절반 길이로 줄여주세요. 핵심 정보는 모두 유지. 머리말 없이 결과만 출력합니다.',
    text,
    { model: QUICK_MODEL, temperature: 0.3 },
  );
}

/** 핵심 추출 — bullet list */
export async function aiKeyPoints(text: string): Promise<string> {
  return quickAi(
    '사용자가 준 글의 핵심을 3~6개 bullet 으로 추출해주세요. 각 줄은 "- " 로 시작하고 한 줄에 한 핵심. 머리말·인사 없이 bullet 만 출력.',
    text,
    { model: QUICK_MODEL, temperature: 0.3 },
  );
}

/** 액션 아이템 추출 — 회의록·메모에서 할 일 뽑기 */
export async function aiExtractActions(text: string): Promise<string> {
  return quickAi(
    '사용자가 준 글(회의록·메모 등)에서 "해야 할 일(action items)" 만 추출해주세요. 각 줄은 "- [ ] " 체크박스 markdown 으로 시작. 담당자·기한이 명시된 경우 함께. 없으면 빈 결과("").',
    text,
    { model: QUICK_MODEL, temperature: 0.2 },
  );
}

/** 맞춤법·문법 교정 (한국어 우선) */
export async function aiFixGrammar(text: string): Promise<string> {
  return quickAi(
    '사용자가 준 글의 맞춤법·띄어쓰기·문법·어색한 표현을 교정해주세요. 의미·길이·톤은 그대로 유지. 결과만 출력합니다.',
    text,
    { model: QUICK_MODEL, temperature: 0.2 },
  );
}

/** 목차 만들기 — 긴 글 → markdown 헤딩 목차 */
export async function aiBuildToc(text: string): Promise<string> {
  return quickAi(
    '사용자가 준 글을 분석해 markdown 목차를 만들어주세요. 형식: "# 제목", "## 소제목", "### 세부" — 글에 실제로 등장하는 주제를 반영. 머리말 없이 목차만 출력합니다.',
    text,
    { model: QUICK_MODEL, temperature: 0.3 },
  );
}

/** 표로 변환 — 정보를 markdown 표로 */
export async function aiToTable(text: string): Promise<string> {
  return quickAi(
    '사용자가 준 정보를 markdown 표로 변환해주세요. 헤더 행과 정렬 행("|---|") 포함. 정보를 자연스러운 컬럼으로 분리. 머리말 없이 표만 출력.',
    text,
    { model: QUICK_MODEL, temperature: 0.3 },
  );
}

/** 리스트로 변환 — 산문 → bullet */
export async function aiToList(text: string): Promise<string> {
  return quickAi(
    '사용자가 준 산문 형식 글을 bullet list 로 재구성해주세요. 각 줄 "- " 시작. 정보를 잃지 않으면서 평탄화. 머리말 없이 리스트만 출력.',
    text,
    { model: QUICK_MODEL, temperature: 0.3 },
  );
}

/** 질문으로 변환 — 글 내용에서 학습용 질문 생성 */
export async function aiToQuestions(text: string): Promise<string> {
  return quickAi(
    '사용자가 준 글 내용에서 학습/복습용 질문 3~6개를 만들어주세요. 각 줄 "Q. ..." 형식. 정답은 적지 않음. 머리말 없이 질문만 출력.',
    text,
    { model: QUICK_MODEL, temperature: 0.5 },
  );
}

/** 제목 제안 — 글 내용에서 가능한 제목 3개 */
export async function aiSuggestTitle(text: string): Promise<string> {
  return quickAi(
    '사용자가 준 글에 어울리는 제목 후보 3개를 제안해주세요. 각 줄에 하나씩, 번호·기호 없이 제목 텍스트만. 머리말 없이 3줄만 출력.',
    text,
    { model: QUICK_MODEL, temperature: 0.7 },
  );
}

/** 자유 입력 — 사용자 prompt + 선택/맥락 텍스트 */
export async function aiCustom(prompt: string, context: string): Promise<string> {
  return quickAi(
    '당신은 사용자의 글쓰기를 돕는 편집자입니다. 사용자가 준 텍스트(있다면)에 사용자의 지시를 적용해 결과만 출력하세요. 설명·머리말·인사는 없습니다.',
    `[지시]\n${prompt}\n\n[텍스트]\n${context || '(텍스트 없음 — 새로 생성)'}`,
    { model: QUICK_MODEL, temperature: 0.6 },
  );
}
