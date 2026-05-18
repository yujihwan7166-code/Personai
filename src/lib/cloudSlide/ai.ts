/**
 * 클라우드 슬라이드 AI 액션.
 * cloudDoc/ai.ts 의 quickAi 재사용.
 */

import { quickAi, QUICK_MODEL, QUALITY_MODEL } from '@/lib/cloudDoc/ai';

interface SlideTextLike { content: string; }

// ─────────────────────────────────────────────
// 슬라이드 → 텍스트 직렬화 (프롬프트 용)
// ─────────────────────────────────────────────

export function slideToText(slide: { elements: { type: string; content?: string }[] }): string {
  const lines: string[] = [];
  for (const el of slide.elements) {
    if (el.type === 'text' && el.content) {
      lines.push(el.content);
    }
  }
  return lines.join('\n').trim();
}

/**
 * 전체 slides → outline 텍스트. 너무 길면 (예: 100장+) 토큰 한계 초과 가능 →
 * 각 슬라이드 본문은 최대 200자로 truncate.
 */
const SLIDE_OUTLINE_MAX_CHARS = 200;

export function slidesToOutline(slides: Array<{ elements: { type: string; content?: string }[] }>): string {
  return slides
    .map((s, i) => {
      const text = slideToText(s);
      const shortened = text.length > SLIDE_OUTLINE_MAX_CHARS
        ? text.slice(0, SLIDE_OUTLINE_MAX_CHARS) + '…'
        : text;
      return `[슬라이드 ${i + 1}]\n${shortened}`;
    })
    .join('\n\n');
}

// ─────────────────────────────────────────────
// AI 액션
// ─────────────────────────────────────────────

/** 다음 슬라이드 내용 추천 — 줄바꿈으로 구분된 텍스트들 반환. */
export async function aiNextSlide(currentText: string, allOutline: string): Promise<string> {
  return quickAi(
    `당신은 프레젠테이션 전문가입니다.
지금까지의 슬라이드 내용을 보고, 자연스럽게 이어질 다음 슬라이드의 본문을 생성해주세요.
- 첫 줄: 슬라이드 제목 (짧고 명확하게)
- 그 다음: 본문 3~5개 줄 (각 줄이 하나의 핵심 포인트, • 같은 기호 없이 그냥 텍스트)
- 설명·머리말·결론 표기 X. 슬라이드에 직접 들어갈 내용만.`,
    `전체 흐름:\n${allOutline}\n\n현재 슬라이드:\n${currentText}\n\n다음 슬라이드 내용을 만들어주세요.`,
    { model: QUALITY_MODEL, temperature: 0.7, maxTokens: 800 },
  );
}

/** 슬라이드 텍스트 개선 — 더 명확하고 임팩트 있게. */
export async function aiImproveSlide(text: string): Promise<string> {
  return quickAi(
    `당신은 프레젠테이션 카피라이터입니다.
사용자가 준 슬라이드 본문을 더 명확하고 임팩트 있게 다듬어주세요.
- 줄 수·구조 유지 (제목 한 줄 + 본문 여러 줄)
- 군더더기 빼고 핵심만
- 결과만 출력. 설명·머리말 X.`,
    text,
    { model: QUICK_MODEL, temperature: 0.5, maxTokens: 600 },
  );
}

/** 프레젠테이션 개요 — 주제 → 슬라이드 5장 outline. */
export async function aiOutlinePresentation(topic: string): Promise<string> {
  return quickAi(
    `당신은 프레젠테이션 기획자입니다.
사용자가 주제를 주면, 5장짜리 슬라이드 개요를 작성해주세요. 형식 (엄격히 준수):

[슬라이드 1]
제목
본문 줄 1
본문 줄 2
본문 줄 3

[슬라이드 2]
...

빈 줄 두 개로 슬라이드 구분. 머리말·결론 표기 없이 5개 슬라이드만 출력.`,
    `주제: ${topic}`,
    { model: QUALITY_MODEL, temperature: 0.6, maxTokens: 1500 },
  );
}

/** 텍스트 한 줄(또는 여러 줄) → 줄별로 분리한 배열. */
export function parseAiSlideContent(text: string): { title: string; body: string[] } {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { title: '', body: [] };
  return { title: lines[0], body: lines.slice(1) };
}
