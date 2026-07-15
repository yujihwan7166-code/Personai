/**
 * 비서 컨텍스트 빌더 — 플래너 데이터를 AI 프롬프트용 텍스트로 조립.
 *
 * 비서 모드에서 사용자가 질문하면, 선택된 소스의 개인 데이터를 읽어
 * 시스템 프롬프트에 주입한다. AI 는 이 컨텍스트를 근거로 "내 상황" 에 맞게 답변.
 * (위키 스코프는 2026-07-15 마이위키 철거와 함께 제거.)
 *
 * 크기 가드: 각 섹션 별 항목 수·글자 수 제한 (프롬프트 폭주 방지).
 */
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';

export type SecretaryScope = 'all' | 'planner';

export const SECRETARY_SCOPES: {
  id: SecretaryScope;
  label: string;
  emoji: string;
}[] = [
  { id: 'all',     label: '전체',   emoji: '💼' },
  { id: 'planner', label: '플래너', emoji: '📅' },
];

const MAX_TASKS = 20;
const MAX_EVENTS = 20;

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${fmtDate(d)} ${hh}:${mm}`;
}

/** 플래너 섹션 — 미완료 할일 + 오늘~7일 일정. */
function buildPlannerSection(): string {
  const lines: string[] = [];

  // 미완료 할일 (최신순).
  const tasks = taskStore.list().filter((t) => !t.done).slice(0, MAX_TASKS);
  if (tasks.length > 0) {
    lines.push('### 할 일 (미완료)');
    for (const t of tasks) {
      const when = t.startAt ? ` — ${fmtDateTime(t.startAt)}` : '';
      lines.push(`- ${t.title}${when}`);
    }
  }

  // 오늘부터 7일간 일정.
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  try {
    const events = eventStore.listByRange(now, weekLater).slice(0, MAX_EVENTS);
    if (events.length > 0) {
      lines.push('### 일정 (오늘~7일)');
      for (const e of events) {
        lines.push(`- ${e.title} — ${fmtDateTime(e.startAt)}`);
      }
    }
  } catch {
    /* eventStore 미가용 시 무시 */
  }

  return lines.length > 0 ? lines.join('\n') : '### 플래너\n(등록된 할일·일정 없음)';
}

/**
 * 비서 시스템 프롬프트 + 개인 데이터 컨텍스트 조립.
 * scope 에 따라 포함 섹션이 달라진다.
 */
export async function buildSecretaryPrompt(
  scope: SecretaryScope,
  question: string,
): Promise<string> {
  const today = new Date();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const todayLabel = `${fmtDate(today)} (${dayNames[today.getDay()]})`;

  const sections: string[] = [];
  if (scope === 'all' || scope === 'planner') sections.push(buildPlannerSection());

  return [
    '[System]',
    '당신은 사용자의 유능한 개인 비서입니다.',
    `오늘은 ${todayLabel} 입니다.`,
    '아래는 사용자의 개인 데이터입니다. 이 데이터를 근거로 사용자의 상황에 맞게 구체적으로 답하세요.',
    '데이터에 없는 내용은 추측하지 말고 없다고 말하세요. 답변은 간결하고 실용적으로.',
    '',
    '## 사용자 데이터',
    sections.join('\n\n'),
    '',
    '[User]',
    question,
  ].join('\n');
}
