/**
 * 비서 컨텍스트 빌더 — 플래너·메모·위키 데이터를 AI 프롬프트용 텍스트로 조립.
 *
 * 비서 모드에서 사용자가 질문하면, 선택된 소스의 개인 데이터를 읽어
 * 시스템 프롬프트에 주입한다. AI 는 이 컨텍스트를 근거로 "내 상황" 에 맞게 답변.
 *
 * 크기 가드: 각 섹션 별 항목 수·글자 수 제한 (프롬프트 폭주 방지).
 */
import { getMemos, memoTitle, memoPreview } from '@/lib/memoStore';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import { loadAllPages } from '@/lib/wikiStore';
import { getActiveWikiPages, searchWikiPages, stripMarkdown } from '@/lib/wikiQuery';

export type SecretaryScope = 'all' | 'planner' | 'memo' | 'wiki';

export const SECRETARY_SCOPES: {
  id: SecretaryScope;
  label: string;
  emoji: string;
}[] = [
  { id: 'all',     label: '전체',   emoji: '💼' },
  { id: 'planner', label: '플래너', emoji: '📅' },
  { id: 'memo',    label: '메모',   emoji: '📝' },
  { id: 'wiki',    label: '위키',   emoji: '🌐' },
];

const MAX_TASKS = 20;
const MAX_EVENTS = 20;
const MAX_MEMOS = 15;
const MAX_WIKI_PAGES = 5;
const MAX_WIKI_CHARS = 900;   // 페이지당
const MAX_MEMO_CHARS = 200;   // 메모당

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

/** 메모 섹션 — 핀 우선 + 최신순. */
function buildMemoSection(): string {
  const memos = getMemos()
    .filter((m) => !m.deletedAt && !m.archivedAt)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, MAX_MEMOS);

  if (memos.length === 0) return '### 메모\n(메모 없음)';

  const lines = ['### 메모'];
  for (const m of memos) {
    const title = memoTitle(m);
    const preview = memoPreview(m).slice(0, MAX_MEMO_CHARS);
    const pin = m.pinned ? '📌 ' : '';
    lines.push(`- ${pin}${title}: ${preview}`);
  }
  return lines.join('\n');
}

/** 위키 섹션 — 질문 연관 페이지 우선, 없으면 제목 목록. */
async function buildWikiSection(question: string): Promise<string> {
  let pages;
  try {
    pages = getActiveWikiPages(await loadAllPages());
  } catch {
    return '### 위키\n(위키 접근 불가)';
  }
  if (pages.length === 0) return '### 위키\n(위키 페이지 없음)';

  const lines = ['### 위키'];

  // 질문과 연관된 페이지 본문 발췌 (hit 없는 항목 제외).
  const matches = question.trim()
    ? searchWikiPages(pages, question)
        .filter((h) => h.hit !== 'none')
        .slice(0, MAX_WIKI_PAGES)
        .map((h) => h.page)
    : [];

  if (matches.length > 0) {
    for (const page of matches) {
      const body = stripMarkdown(page.body ?? '').slice(0, MAX_WIKI_CHARS);
      lines.push(`#### ${page.title}\n${body}`);
    }
  } else {
    // 연관 페이지 없음 → 전체 제목 목록만 (AI 가 어떤 지식이 있는지 알 수 있게).
    lines.push(
      '페이지 목록: ' + pages.slice(0, 40).map((p) => p.title).join(' · '),
    );
  }
  return lines.join('\n');
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
  if (scope === 'all' || scope === 'memo') sections.push(buildMemoSection());
  if (scope === 'all' || scope === 'wiki') sections.push(await buildWikiSection(question));

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
