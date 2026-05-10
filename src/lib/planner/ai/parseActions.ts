/**
 * AI 답변 본문에서 ```action ... ``` 코드 블록을 파싱.
 *
 * 형식:
 *   ```action
 *   { "type": "add_event", "title": "과외", "startAt": "2026-05-11T09:00:00", "endAt": "2026-05-11T11:00:00" }
 *   ```
 *
 * 한 답변에 여러 개 가능. 잘못된 JSON 은 silent skip.
 * 본문에서 action 블록을 제거한 displayContent 도 같이 반환.
 */
import type { AIAction, AIActionInstance } from '@/types/plannerAI';

const ACTION_BLOCK = /```action\s*\n([\s\S]*?)\n?```/g;

const isValidAction = (v: unknown): v is AIAction => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (typeof o.type !== 'string') return false;
  if (typeof o.title !== 'string' || o.title.trim().length === 0) return false;
  switch (o.type) {
    case 'add_event':
    case 'add_scheduled_task':
      return typeof o.startAt === 'string'
        && typeof o.endAt === 'string'
        && !isNaN(new Date(o.startAt).getTime())
        && !isNaN(new Date(o.endAt).getTime());
    case 'add_inbox_task':
      return o.plannedFor === undefined || (typeof o.plannedFor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.plannedFor));
    default:
      return false;
  }
};

export interface ParsedAIContent {
  /** 본문에서 action 블록 제거된 텍스트 (마크다운 렌더용). */
  displayContent: string;
  /** 추출된 액션들. 잘못된 JSON 은 제외. */
  actions: AIActionInstance[];
}

export const parseAIContent = (raw: string): ParsedAIContent => {
  const actions: AIActionInstance[] = [];
  let displayContent = raw;

  // 매칭 모두 추출
  const matches = Array.from(raw.matchAll(ACTION_BLOCK));
  for (const m of matches) {
    const jsonStr = m[1].trim();
    try {
      const parsed: unknown = JSON.parse(jsonStr);
      if (isValidAction(parsed)) {
        actions.push({ action: parsed, status: 'pending' });
      }
    } catch {
      // 잘못된 JSON — skip
    }
  }

  // 액션 블록 제거 (본문에서 raw JSON 노출 방지)
  displayContent = raw.replace(ACTION_BLOCK, '').trim();

  return { displayContent, actions };
};
