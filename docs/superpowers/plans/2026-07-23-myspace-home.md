# 마이스페이스 홈 (/myspace) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마이스페이스 존의 현관 `/myspace` — 내가 등록한 방 타일(실데이터 스니펫) + 방 카탈로그(추가/숨기기) + 오늘 브리핑(오늘의 나 흡수) + 최근 활동 흐름.

**Architecture:** 새 데이터 모델 없음. ① 방 레지스트리(`lib/myspace/rooms.ts`)가 방 12개의 메타+스니펫 리더를 한 곳에 정의하고, "내 방" 여부는 **레일의 숨김 상태(`rail.icons.v1`)와 순서(`rail.order.v1`)를 그대로 공유**(단일 진실). ② 최근 활동은 각 방 스토어의 createdAt에서 파생. ③ /today 는 /myspace 로 흡수·리다이렉트. 카탈로그의 [추가] 버튼이 미래 결제/구독 버튼이 놓일 자리다 — **결제는 구현하지 않는다** (자리 주석만).

**Tech Stack:** React+TS+vite, react-router, lucide-react, localStorage(기존 스토어 재사용), vitest.

**공통 규칙:** main 직접 작업·커밋 / 날짜 로컬 YMD / lucide import 전 기존 여부 grep / 새 방 등록 지점 체크리스트 / preview 자발 실행 금지.

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/myspace/rooms.ts` (생성) | 방 레지스트리(메타·스니펫) + 레일 노출 상태 공유 헬퍼 |
| `src/lib/myspace/activity.ts` (생성) | 크로스룸 최근 활동 수집 (읽기 전용 파생) |
| `src/components/myspace/RoomCatalog.tsx` (생성) | 방 카탈로그 다이얼로그 (추가/숨기기 — 미래 스토어 표면) |
| `src/components/myspace/TodayBriefing.tsx` (생성) | 오늘 브리핑 — Today.tsx 본문 이식 |
| `src/pages/MySpace.tsx` (생성) | 현관 셸: 인사 + 방 타일 그리드 + 브리핑 + 최근 활동 |
| `src/pages/Today.tsx` (삭제) | /myspace 로 흡수 |
| `src/App.tsx` 외 등록 지점 (수정) | 라우트·레일·메뉴 교체 |
| `src/test/myspaceRooms.test.ts`, `src/test/myspaceActivity.test.ts` (생성) | 레지스트리·활동 수집 테스트 |

실측된 스토어 API (스니펫 소스): `careerStore.listItems()` · `healthStore.listMeds()` · `ledgerStore.listEntries()`+`summarizeMonth` · `archiveStore.listItems()` · `loadTickets().entries`(lib/tickets/ticketStore) · `journalStore.list()` · wiki `mywiki.v3`/people `people.persons.v1` 는 localStorage 직접 파싱(형태 불확실 → try/catch null). 플래너는 `useTodayTasks` 훅(페이지에서 주입). 노트·클라우드는 스니펫 없음(설명문 표기).

---

### Task 1: 방 레지스트리 + 레일 상태 공유 (`src/lib/myspace/rooms.ts`) — TDD

**Files:** Create: `src/lib/myspace/rooms.ts` · Test: `src/test/myspaceRooms.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MYSPACE_ROOMS, isRoomUnlocked, readHiddenRooms, setRoomHidden, orderedRooms } from '@/lib/myspace/rooms';

beforeEach(() => { localStorage.clear(); });

describe('MYSPACE_ROOMS 레지스트리', () => {
  it('12개 방 — id·route 유일', () => {
    expect(MYSPACE_ROOMS).toHaveLength(12);
    expect(new Set(MYSPACE_ROOMS.map((r) => r.id)).size).toBe(12);
    expect(new Set(MYSPACE_ROOMS.map((r) => r.route)).size).toBe(12);
  });
  it('모든 방에 카탈로그 소개(3포인트)가 있다', () => {
    for (const r of MYSPACE_ROOMS) expect(r.points).toHaveLength(3);
  });
  it('스니펫 리더는 절대 throw 하지 않는다 (빈 저장소)', () => {
    for (const r of MYSPACE_ROOMS) expect(() => r.snippet?.()).not.toThrow();
  });
});

describe('레일 상태 공유', () => {
  it('해금 판정 seam — 현재는 전부 무료(true)', () => {
    for (const r of MYSPACE_ROOMS) expect(isRoomUnlocked(r.id)).toBe(true);
  });
  it('숨김 토글 라운드트립 — rail.icons.v1 과 동일 키', () => {
    expect(readHiddenRooms().has('ledger')).toBe(false);
    setRoomHidden('ledger', true);
    expect(readHiddenRooms().has('ledger')).toBe(true);
    expect(JSON.parse(localStorage.getItem('rail.icons.v1')!)).toContain('ledger');
    setRoomHidden('ledger', false);
    expect(readHiddenRooms().has('ledger')).toBe(false);
  });
  it('orderedRooms — rail.order.v1 순서 반영, 미저장 방은 뒤에', () => {
    localStorage.setItem('rail.order.v1', JSON.stringify(['wiki', 'ledger']));
    const ids = orderedRooms().map((r) => r.id);
    expect(ids[0]).toBe('wiki');
    expect(ids[1]).toBe('ledger');
    expect(ids).toHaveLength(12);
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/test/myspaceRooms.test.ts` → FAIL (module not found)

- [ ] **Step 3: 구현**

```ts
/**
 * 마이스페이스 방 레지스트리 — 홈 타일·카탈로그의 단일 원천.
 * "내 방" 여부는 레일의 숨김 목록(rail.icons.v1)·순서(rail.order.v1)를 그대로 공유한다
 * (레일 = 마이스페이스 등록 상태라는 사용자 멘탈 모델).
 * 스니펫은 각 방 스토어에서 읽되 전부 try/catch — 홈은 어떤 방이 깨져도 열려야 한다.
 */
import {
  Archive, CalendarDays, Cloud, Contact, FileUser, HeartPulse, Library,
  NotebookPen, PiggyBank, StickyNote, Ticket, type LucideIcon,
} from 'lucide-react';
import { careerStore } from '@/services/careerStore';
import { healthStore, todayKey } from '@/services/healthStore';
import { ledgerStore } from '@/services/ledgerStore';
import { archiveStore } from '@/services/archiveStore';
import { journalStore } from '@/services/journalStore';
import { loadTickets } from '@/lib/tickets/ticketStore';
import { summarizeMonth, monthOf } from '@/lib/ledger/stats';

/** 레일과 같은 키 — AppWorkspaceShell 의 RAIL_HIDDEN_KEY/RAIL_ORDER_KEY 와 동일 문자열. */
const HIDDEN_KEY = 'rail.icons.v1';
const ORDER_KEY = 'rail.order.v1';
export const MYSPACE_CHANGED = 'myspace:changed';

export interface MySpaceRoom {
  id: string;            // WorkspaceKey 와 동일 (레일 숨김 키가 이 id 를 씀)
  label: string;
  desc: string;          // 한 줄 소개 (타일 스니펫 없을 때·카탈로그)
  points: [string, string, string]; // 카탈로그 핵심 기능 3
  icon: LucideIcon;
  tint: string;          // hex — RAIL_ACCENT 와 동일 값
  route: string;
  /** 실데이터 한 조각 ("이번 달 −84만"). null 이면 desc 표기. 절대 throw 금지. */
  snippet?: () => string | null;
}

const safeCount = (key: string, pick?: (parsed: unknown) => number): number | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (pick) return pick(parsed);
    return Array.isArray(parsed) ? parsed.length : null;
  } catch { return null; }
};

const daysAgoLabel = (ymd: string): string => {
  const [y, m, d] = ymd.split('-').map(Number);
  const [ty, tm, td] = todayKey().split('-').map(Number);
  const diff = Math.round((new Date(ty, tm - 1, td).getTime() - new Date(y, m - 1, d).getTime()) / 86400000);
  return diff <= 0 ? '오늘 기록함' : diff === 1 ? '어제 기록함' : `마지막 기록 ${diff}일 전`;
};

const KRW = (n: number) => `${Math.round(Math.abs(n)).toLocaleString('ko-KR')}원`;

export const MYSPACE_ROOMS: MySpaceRoom[] = [
  {
    id: 'planner', label: '통합 플래너', desc: '캘린더·할일·습관·목표 한 화면에',
    points: ['캘린더와 할일을 한 화면에서', '습관·목표 추적', '반복 일정'],
    icon: CalendarDays, tint: '#3a72b8', route: '/planner',
    // 스니펫은 페이지에서 useTodayTasks 훅으로 주입 (아래 MySpace.tsx 의 plannerSnippet)
  },
  {
    id: 'notes', label: '올인원 노트', desc: '노트·화이트보드·시트 한 곳에',
    points: ["'/' 로 뭐든 삽입하는 에디터", '글과 판(tldraw) 전환', '자동 저장'],
    icon: StickyNote, tint: '#2c4f93', route: '/notes',
  },
  {
    id: 'journal', label: '데일리 로그', desc: '일기 · 먹은 것 · 간 곳 · 여행',
    points: ['하루 한 장 일기', '여행·지도·푸드 로드', '1년 전 오늘 플래시백'],
    icon: NotebookPen, tint: '#6d5dd3', route: '/journal',
    snippet: () => {
      try {
        const list = journalStore.list();
        if (!list.length) return null;
        const latest = list.map((e) => e.date).sort().at(-1);
        return latest ? daysAgoLabel(latest.slice(0, 10)) : null;
      } catch { return null; }
    },
  },
  {
    id: 'career', label: '마이커리어', desc: '이룬 것을 이력서로 정리',
    points: ['한 줄 적으면 AI가 이력서 문장으로', '보드 여러 개(취업용·대학원용)', '이력서 PDF·자소서 생성'],
    icon: FileUser, tint: '#8a3550', route: '/career',
    snippet: () => { try { const n = careerStore.listItems().length; return n ? `스펙 ${n}개` : null; } catch { return null; } },
  },
  {
    id: 'people', label: '인맥노트', desc: '사람 카드 · 경조사 · 관계 흐름',
    points: ['친밀도별 안부 주기', '경조사 캘린더·D-day', '주고받은 선물 장부'],
    icon: Contact, tint: '#a15008', route: '/people',
    snippet: () => { const n = safeCount('people.persons.v1'); return n ? `${n}명 기록 중` : null; },
  },
  {
    id: 'archive', label: '아카이브', desc: '서류·링크·사진 보관·정리',
    points: ['컬렉션 = 저장 양식', '파일은 브라우저 안에 원본 보관', 'AI 시맨틱 검색'],
    icon: Archive, tint: '#a5642e', route: '/archive',
    snippet: () => { try { const n = archiveStore.listItems().length; return n ? `보관 ${n}개` : null; } catch { return null; } },
  },
  {
    id: 'wiki', label: '마이위키', desc: '책을 만들어 깊게 파는 백과사전',
    points: ['문서 안에 문서, 무한 트리', '드래그로 문서 연결', '노트와 같은 에디터'],
    icon: Library, tint: '#8b3d6e', route: '/wiki',
    snippet: () => {
      const n = safeCount('mywiki.v3', (p) => {
        if (typeof p !== 'object' || p === null) return 0;
        const docs = (p as { docs?: unknown }).docs;
        return docs && typeof docs === 'object' ? Object.keys(docs).length : 0;
      });
      return n ? `문서 ${n}개` : null;
    },
  },
  {
    id: 'health', label: '건강기록', desc: '수치·복약·진료·증상 기록',
    points: ['복약 체크·다음 진료 D-day', '혈압·혈당 추이 그래프', '규칙 기반 건강 요약'],
    icon: HeartPulse, tint: '#2f9e6e', route: '/health',
    snippet: () => {
      try {
        const meds = healthStore.listMeds().filter((m) => m.active);
        if (!meds.length) return null;
        const taken = meds.filter((m) => m.takenDates.includes(todayKey())).length;
        return `오늘 복약 ${taken}/${meds.length}`;
      } catch { return null; }
    },
  },
  {
    id: 'tickets', label: '티켓북', desc: '본 것들을 티켓으로 수집',
    points: ['영화·책·공연을 티켓 카드로', '마일스톤 스탬프 수집', '연말 Wrapped 결산'],
    icon: Ticket, tint: '#d97706', route: '/tickets',
    snippet: () => { try { const n = loadTickets().entries.length; return n ? `티켓 ${n}장` : null; } catch { return null; } },
  },
  {
    id: 'ledger', label: '가계부', desc: 'AI 한 줄 입력 · 예산 · 월 결산',
    points: ['"점심 김밥 4500" 한 줄로 기록', '자산·순자산 월말 스냅샷', '월 결산·연간 Wrapped'],
    icon: PiggyBank, tint: '#2d4a7c', route: '/ledger',
    snippet: () => {
      try {
        const entries = ledgerStore.listEntries();
        if (!entries.length) return null;
        const s = summarizeMonth(entries, monthOf(todayKey()));
        return `이번 달 지출 ${KRW(s.expense)}`;
      } catch { return null; }
    },
  },
  {
    id: 'cloud', label: '클라우드 오피스', desc: '문서·시트·슬라이드',
    points: ['함수 90+ 스프레드시트', '슬라이드 · PDF/PPTX 내보내기', 'AI 문서 도우미'],
    icon: Cloud, tint: '#5b7a9d', route: '/cloud',
  },
  {
    id: 'myspace-planner-placeholder-removed', label: '', desc: '', points: ['', '', ''], icon: Cloud, tint: '', route: '',
  },
].filter((r) => r.label) as MySpaceRoom[];
// ↑ 주의: placeholder 행은 실수 방지용 필터 데모가 아니라 **넣지 말 것** — 최종 배열은 정확히 12개
// (planner·notes·journal·career·people·archive·wiki·health·tickets·ledger·cloud + 아래 today 대체 없음).
// 12번째 방은 '오늘의 나'가 아니라 '통합 플래너'~'클라우드'에 더해 **스터디룸이 아닌 신규 방이 생기면 여기 추가**.

/* ── 레일 상태 공유 ── */

export function readHiddenRooms(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return new Set(Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : []);
  } catch { return new Set(); }
}

export function setRoomHidden(id: string, hidden: boolean): void {
  const s = readHiddenRooms();
  if (hidden) s.add(id); else s.delete(id);
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...s]));
    window.dispatchEvent(new CustomEvent(MYSPACE_CHANGED));
  } catch { /* noop */ }
}

/**
 * 방 해금 판정 — 미래 결제·구독 시스템이 붙는 유일한 지점.
 * 지금은 전부 무료(항상 true). 나중에 구매 도입 시 이 함수 하나만
 * 엔타이틀먼트(서버/로컬)를 읽도록 바꾸면 타일·카탈로그·추가 버튼이 전부 따라온다.
 * 결제 로직·가격 데이터는 지금 절대 넣지 않는다.
 */
export function isRoomUnlocked(_id: string): boolean {
  return true;
}

/** rail.order.v1 순서 반영 — 저장 안 된 방은 레지스트리 순서로 뒤에. */
export function orderedRooms(): MySpaceRoom[] {
  let order: string[] = [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]');
    if (Array.isArray(parsed)) order = parsed.filter((k): k is string => typeof k === 'string');
  } catch { /* noop */ }
  const idx = new Map(order.map((id, i) => [id, i]));
  return [...MYSPACE_ROOMS].sort((a, b) =>
    (idx.get(a.id) ?? 1e9) - (idx.get(b.id) ?? 1e9) ||
    MYSPACE_ROOMS.findIndex((r) => r.id === a.id) - MYSPACE_ROOMS.findIndex((r) => r.id === b.id));
}
```

⚠️ 위 코드의 placeholder 데모 행(`myspace-planner-placeholder-removed`)과 그 아래 3줄 주석은 **작성하지 말 것** — 배열은 planner…cloud 11개로 끝난다. 테스트의 `toHaveLength(12)`는 **11로 고쳐서 작성**한다 (오늘의 나는 홈에 흡수돼 방이 아님. 레지스트리는 11개가 정답).

- [ ] **Step 4: 통과 확인** — `npx vitest run src/test/myspaceRooms.test.ts` → PASS (테스트의 12 → 11 수정 포함)

- [ ] **Step 5: Commit** — `git add src/lib/myspace/rooms.ts src/test/myspaceRooms.test.ts && git commit -m "feat(myspace): 방 레지스트리 + 레일 노출 상태 공유"`

---

### Task 2: 최근 활동 수집 (`src/lib/myspace/activity.ts`) — TDD

**Files:** Create: `src/lib/myspace/activity.ts` · Test: `src/test/myspaceActivity.test.ts`

- [ ] **Step 1: 실패하는 테스트**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { collectRecentActivity } from '@/lib/myspace/activity';
import { ledgerStore } from '@/services/ledgerStore';
import { careerStore } from '@/services/careerStore';

beforeEach(() => { localStorage.clear(); });

describe('collectRecentActivity', () => {
  it('빈 저장소 → 빈 배열 (throw 없음)', () => {
    expect(collectRecentActivity(10)).toEqual([]);
  });
  it('여러 방을 최신순으로 합친다', () => {
    ledgerStore.addEntries([{ type: 'expense', amount: 4500, date: '2026-07-23', categoryId: 'food', memo: '김밥' }]);
    careerStore.addItem({ raw: '정처기 취득', categoryName: '자격증' });
    const acts = collectRecentActivity(10);
    expect(acts.length).toBeGreaterThanOrEqual(2);
    expect(acts.some((a) => a.roomId === 'ledger')).toBe(true);
    expect(acts.some((a) => a.roomId === 'career')).toBe(true);
    // 최신순 정렬
    for (let i = 1; i < acts.length; i++) expect(acts[i - 1].ts >= acts[i].ts).toBe(true);
  });
  it('limit 을 지킨다', () => {
    ledgerStore.addEntries(Array.from({ length: 8 }, (_, i) => ({
      type: 'expense' as const, amount: 100 + i, date: '2026-07-23', categoryId: 'etc', memo: `m${i}`,
    })));
    expect(collectRecentActivity(5)).toHaveLength(5);
  });
});
```

- [ ] **Step 2: 실패 확인** — FAIL (module not found)

- [ ] **Step 3: 구현**

```ts
/**
 * 크로스룸 최근 활동 — 각 방 스토어의 createdAt 에서 파생 (새 데이터 모델 없음).
 * 수집기는 방마다 try/catch: 한 방이 깨져도 흐름은 흐른다.
 */
import { journalStore } from '@/services/journalStore';
import { careerStore } from '@/services/careerStore';
import { ledgerStore } from '@/services/ledgerStore';
import { archiveStore } from '@/services/archiveStore';
import { healthStore } from '@/services/healthStore';
import { loadTickets } from '@/lib/tickets/ticketStore';

export interface RecentActivity {
  roomId: string;
  label: string;   // "가계부에 3건 기록" 처럼 사람이 읽는 문장
  ts: number;      // 정렬 키 (epoch ms)
}

type Collector = () => RecentActivity[];

const ts = (iso: string | undefined): number => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? 0 : t;
};

const COLLECTORS: Collector[] = [
  () => journalStore.list().slice(0, 5).map((e) => ({
    roomId: 'journal', label: `일기 「${(e.title || e.body || '').slice(0, 18) || '무제'}」`, ts: ts(e.createdAt),
  })),
  () => careerStore.listItems().slice(0, 5).map((i) => ({
    roomId: 'career', label: `스펙 등재 — ${i.refined.slice(0, 22)}`, ts: ts(i.createdAt),
  })),
  () => ledgerStore.listEntries().slice(0, 8).map((e) => ({
    roomId: 'ledger', label: `가계부 — ${e.memo || '기록'} ${e.amount.toLocaleString('ko-KR')}원`, ts: ts(e.createdAt),
  })),
  () => archiveStore.listItems().slice(0, 5).map((i) => ({
    roomId: 'archive', label: `보관 — ${(i.title || i.fileName || '항목').slice(0, 22)}`, ts: ts(i.createdAt),
  })),
  () => healthStore.listVisits().slice(0, 3).map((v) => ({
    roomId: 'health', label: `진료 기록 — ${v.place}`, ts: ts(v.createdAt),
  })),
  () => loadTickets().entries.slice(0, 5).map((t2) => ({
    roomId: 'tickets', label: `티켓 — ${(t2.title ?? '기록').slice(0, 22)}`, ts: ts(t2.createdAt),
  })),
];

export function collectRecentActivity(limit: number): RecentActivity[] {
  const out: RecentActivity[] = [];
  for (const collect of COLLECTORS) {
    try { out.push(...collect()); } catch { /* 방 하나가 깨져도 무시 */ }
  }
  return out.filter((a) => a.ts > 0).sort((a, b) => b.ts - a.ts).slice(0, limit);
}
```

주의: `archiveStore.listItems()`의 항목 필드(title/fileName)와 `loadTickets().entries` 의 title/createdAt 필드명은 구현 시 해당 타입 파일(`src/types/archive.ts`, `src/lib/tickets/ticketStore.ts`의 TicketEntry)을 열어 실제 이름으로 맞춘다 — 다르면 그 필드로 교체 (구조는 동일하게 유지).

- [ ] **Step 4: 통과 확인** — PASS (3 tests)
- [ ] **Step 5: Commit** — `git add src/lib/myspace/activity.ts src/test/myspaceActivity.test.ts && git commit -m "feat(myspace): 크로스룸 최근 활동 수집"`

---

### Task 3: 오늘 브리핑 컴포넌트 (`src/components/myspace/TodayBriefing.tsx`)

**Files:** Create: `src/components/myspace/TodayBriefing.tsx` (원본: `src/pages/Today.tsx` 55~끝행 본문)

- [ ] **Step 1:** `Today.tsx` 를 열어 `export default function Today()` 본문 전체(인사말·SectionCard 4종: 할일·건강·안부·오늘기록)를 **페이지 셸(h-dvh 래퍼·상단 인사 header) 없이** 섹션 그리드만 남겨 `TodayBriefing` 이라는 named export 컴포넌트로 이식한다. import 는 Today.tsx 것을 그대로 가져온다(useTodayTasks/useUpcomingEvent/useHealth/useTodayJournal/usePersons/useInteractions/computeOverdue/healthStore/todayKey). `SectionCard`·`Empty`·TINT·헬퍼(c/cs/ddayLabel/hhmm/parseYmd/WEEKDAY)도 함께 이동. 시그니처:

```tsx
export function TodayBriefing() {
  /* Today.tsx 의 데이터 훅·파생값 계산 전체 + 카드 4종 그리드 return */
}
```

레이아웃 래퍼만 다음으로 교체 (원본의 최상위 div·인사 header 제거):

```tsx
return (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    {/* 원본의 SectionCard 4개 그대로 */}
  </div>
);
```

- [ ] **Step 2:** `npx tsc --noEmit` → 에러 0
- [ ] **Step 3: Commit** — `git add src/components/myspace/TodayBriefing.tsx && git commit -m "feat(myspace): 오늘 브리핑 컴포넌트 (오늘의 나 본문 이식)"`

---

### Task 4: 방 카탈로그 (`src/components/myspace/RoomCatalog.tsx`)

**Files:** Create: `src/components/myspace/RoomCatalog.tsx`

- [ ] **Step 1: 구현** — 다이얼로그: 전체 방을 "내 방"과 "더 볼 수 있는 방"으로 나눠 카드로. [추가]=숨김 해제, [숨기기]=숨김. **여기 [추가] 버튼이 미래에 가격/구독 버튼이 놓일 자리다(주석만, 결제 구현 금지).**

```tsx
/**
 * 방 카탈로그 — 마이스페이스의 "더보기". 방을 상품처럼 소개하고 추가/숨기기.
 * NOTE: [추가] 버튼 자리가 미래의 결제·구독 버튼 자리다 — 지금은 전부 무료, 결제 구현 금지.
 */
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { MYSPACE_ROOMS, isRoomUnlocked, type MySpaceRoom } from '@/lib/myspace/rooms';

interface Props {
  open: boolean;
  hidden: Set<string>;
  onToggle: (id: string, hide: boolean) => void;
  onClose: () => void;
}

function RoomCard({ room, isMine, onToggle }: { room: MySpaceRoom; isMine: boolean; onToggle: () => void }) {
  const Icon = room.icon;
  return (
    <div className="flex flex-col rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${room.tint}1f`, color: room.tint }}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold">{room.label}</p>
          <p className="truncate text-[11.5px] text-muted-foreground">{room.desc}</p>
        </div>
      </div>
      <ul className="mb-3 flex-1 space-y-1">
        {room.points.map((p) => (
          <li key={p} className="flex gap-1.5 text-[12px] text-muted-foreground">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: room.tint }} />{p}
          </li>
        ))}
      </ul>
      {/* 해금 게이트 — 지금은 항상 true. 미래에 여기가 "₩3,000" / "구독" 버튼으로 바뀐다. */}
      <button
        type="button" onClick={onToggle} disabled={!isMine && !isRoomUnlocked(room.id)}
        className={cn('rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
          isMine
            ? 'border-[hsl(var(--input))] text-muted-foreground hover:text-foreground'
            : 'border-transparent text-white disabled:opacity-45')}
        style={isMine ? undefined : { backgroundColor: room.tint }}
      >
        {isMine ? '마이스페이스에서 숨기기' : isRoomUnlocked(room.id) ? '마이스페이스에 추가' : '준비 중'}
      </button>
    </div>
  );
}

export function RoomCatalog({ open, hidden, onToggle, onClose }: Props) {
  useEscapeKey(onClose, { enabled: open, evenInInput: true });
  if (!open) return null;
  const mine = MYSPACE_ROOMS.filter((r) => !hidden.has(r.id));
  const rest = MYSPACE_ROOMS.filter((r) => hidden.has(r.id));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-[860px] flex-col rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--background))] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[18px] font-bold">방 카탈로그</h3>
          <button type="button" aria-label="닫기 (Esc)" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-4 text-[12.5px] text-muted-foreground">숨겨도 데이터는 그대로예요 — 언제든 다시 추가할 수 있어요</p>
        <div className="overflow-y-auto">
          {rest.length > 0 && (
            <>
              <p className="mb-2 text-[12px] font-semibold text-muted-foreground">더 볼 수 있는 방 {rest.length}</p>
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((r) => <RoomCard key={r.id} room={r} isMine={false} onToggle={() => onToggle(r.id, false)} />)}
              </div>
            </>
          )}
          <p className="mb-2 text-[12px] font-semibold text-muted-foreground">내 마이스페이스 {mine.length}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((r) => <RoomCard key={r.id} room={r} isMine onToggle={() => onToggle(r.id, true)} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2:** `npx tsc --noEmit` → 에러 0
- [ ] **Step 3: Commit** — `git add src/components/myspace/RoomCatalog.tsx && git commit -m "feat(myspace): 방 카탈로그 (추가/숨기기 — 미래 스토어 표면)"`

---

### Task 5: 현관 페이지 (`src/pages/MySpace.tsx`)

**Files:** Create: `src/pages/MySpace.tsx`

- [ ] **Step 1: 구현** — 인사 헤더 + 방 타일 그리드(레일 순서·숨김 반영, 스니펫, [+ 더보기] 타일) + 오늘 브리핑 + 최근 활동.

```tsx
/**
 * 마이스페이스 홈 (/myspace) — 존의 현관. 오늘의 나(/today)를 흡수.
 * 1층 방 타일(레일 등록 상태 공유·실데이터 스니펫) → 2층 오늘 브리핑 → 3층 최근 활동.
 * 새 데이터 모델 없음. 카탈로그가 미래 스토어 표면(결제 구현 금지).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Plus } from 'lucide-react';
import { useTodayTasks } from '@/hooks/planner/useTodayTasks';
import { MYSPACE_CHANGED, orderedRooms, readHiddenRooms, setRoomHidden, type MySpaceRoom } from '@/lib/myspace/rooms';
import { collectRecentActivity } from '@/lib/myspace/activity';
import { TodayBriefing } from '@/components/myspace/TodayBriefing';
import { RoomCatalog } from '@/components/myspace/RoomCatalog';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const d = Math.floor(diff / 86400000);
  if (d <= 0) return '오늘';
  if (d === 1) return '어제';
  if (d < 7) return `${d}일 전`;
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

function RoomTile({ room, snippetOverride, onOpen }: { room: MySpaceRoom; snippetOverride?: string | null; onOpen: () => void }) {
  const Icon = room.icon;
  const snippet = snippetOverride !== undefined ? snippetOverride : room.snippet?.() ?? null;
  return (
    <button
      type="button" onClick={onOpen}
      className="group flex items-center gap-3 rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4 text-left transition-colors hover:border-[color:var(--tile-tint)]"
      style={{ '--tile-tint': `${room.tint}66` } as React.CSSProperties}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
        style={{ backgroundColor: `${room.tint}1c`, color: room.tint }}>
        <Icon className="h-5 w-5" strokeWidth={1.9} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-bold">{room.label}</span>
        <span className="block truncate text-[12px] text-muted-foreground">{snippet ?? room.desc}</span>
      </span>
    </button>
  );
}

export default function MySpace() {
  const navigate = useNavigate();
  const [hidden, setHidden] = useState<Set<string>>(() => readHiddenRooms());
  const [catalogOpen, setCatalogOpen] = useState(false);
  const tasks = useTodayTasks();

  const refresh = useCallback(() => setHidden(readHiddenRooms()), []);
  useEffect(() => {
    window.addEventListener(MYSPACE_CHANGED, refresh);
    return () => window.removeEventListener(MYSPACE_CHANGED, refresh);
  }, [refresh]);

  const rooms = useMemo(() => orderedRooms().filter((r) => !hidden.has(r.id)), [hidden]);
  const activity = useMemo(() => collectRecentActivity(12), []);
  const roomLabel = useMemo(() => new Map(orderedRooms().map((r) => [r.id, r] as const)), []);

  const now = new Date();
  const greeting = now.getHours() < 5 ? '늦은 밤이에요' : now.getHours() < 11 ? '좋은 아침이에요' : now.getHours() < 17 ? '좋은 오후예요' : now.getHours() < 22 ? '좋은 저녁이에요' : '오늘 하루 고생했어요';
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAY[now.getDay()]}요일`;

  const plannerSnippet = tasks.length > 0 ? `오늘 할 일 ${tasks.length}개` : null;

  const toggleRoom = (id: string, hide: boolean) => { setRoomHidden(id, hide); setHidden(readHiddenRooms()); };

  return (
    <div className="h-dvh overflow-y-auto bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1040px] px-5 pb-20 pt-8 lg:px-8">
        <header className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[12.5px] font-semibold text-muted-foreground">{dateLabel}</p>
            <h1 className="mt-0.5 text-[27px] font-bold leading-tight">{greeting}</h1>
          </div>
          <button type="button" onClick={() => setCatalogOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[hsl(var(--input))] px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
            <LayoutGrid className="h-4 w-4" /> 방 카탈로그
          </button>
        </header>

        {/* 1층 — 내 방 타일 */}
        <section className="mb-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r) => (
              <RoomTile key={r.id} room={r}
                snippetOverride={r.id === 'planner' ? plannerSnippet : undefined}
                onOpen={() => navigate(r.route)} />
            ))}
            <button type="button" onClick={() => setCatalogOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[hsl(var(--input))] p-4 text-[13px] text-muted-foreground transition-colors hover:border-[hsl(var(--foreground)/0.35)] hover:text-foreground">
              <Plus className="h-4 w-4" /> 방 더보기
            </button>
          </div>
        </section>

        {/* 2층 — 오늘 브리핑 */}
        <section className="mb-8">
          <h2 className="mb-3 text-[13px] font-semibold text-muted-foreground">오늘</h2>
          <TodayBriefing />
        </section>

        {/* 3층 — 최근 활동 */}
        <section>
          <h2 className="mb-3 text-[13px] font-semibold text-muted-foreground">최근 활동</h2>
          {activity.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[hsl(var(--input))] py-8 text-center text-[13px] text-muted-foreground">
              방에서 기록을 시작하면 여기로 흘러와요
            </p>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]">
              {activity.map((a, i) => {
                const room = roomLabel.get(a.roomId);
                return (
                  <li key={`${a.roomId}-${a.ts}-${i}`} className="border-b border-[hsl(var(--hairline))] last:border-b-0">
                    <button type="button" onClick={() => room && navigate(room.route)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[hsl(var(--muted)/0.5)]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: room?.tint ?? '#999' }} />
                      <span className="min-w-0 flex-1 truncate text-[13px]">{a.label}</span>
                      <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">{relTime(a.ts)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <RoomCatalog open={catalogOpen} hidden={hidden} onToggle={toggleRoom} onClose={() => setCatalogOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 2:** `npx tsc --noEmit` → 에러 0
- [ ] **Step 3: Commit** — `git add src/pages/MySpace.tsx && git commit -m "feat(myspace): 현관 페이지 - 방 타일·오늘 브리핑·최근 활동"`

---

### Task 6: 등록 교체 — /today → /myspace

**Files:** Modify: `src/App.tsx`, `src/components/AppWorkspaceShell.tsx`, `src/components/MainModeTabs.tsx`, `src/components/WorkspaceSidebarSwitchButton.tsx` · Delete: `src/pages/Today.tsx`

- [ ] **Step 1: App.tsx** — `const Today = lazy(...)` 를 `const MySpace = lazy(() => import("./pages/MySpace"));` 로 교체. 라우트:

```tsx
<Route path="/myspace" element={<AppWorkspaceShell current="myspace"><MySpace /></AppWorkspaceShell>} />
{/* 오늘의 나는 마이스페이스 홈에 흡수 */}
<Route path="/today" element={<Navigate to="/myspace" replace />} />
```

- [ ] **Step 2: AppWorkspaceShell.tsx** — WorkspaceKey 의 `'today'` → `'myspace'` 로 교체. WORKSPACE_DESTINATIONS 의 today 행을 `{ key: 'myspace', label: '마이스페이스', to: '/myspace', icon: LayoutDashboard }` 로 교체(자리 유지 — 홈 다음 최상단). RAIL_ACCENT `today` → `myspace: '#3a72b8'`. MOBILE_MORE 배열 `'today'` → `'myspace'`.

- [ ] **Step 3: MainModeTabs.tsx** — HUB_TOOLS 의 today 항목을 `{ id: 'myspace', label: '마이스페이스', desc: '내 방들 · 오늘 · 최근 활동', emoji: '🏠', icon: LayoutDashboard, tint: 'hsl(200 65% 48%)', axis: '정리' }` 로 교체. 허브 클릭 체인의 `item.id === 'today'` 분기 → `'myspace'`+`navigate('/myspace')`. openFav route 맵: `today: '/myspace'` 로 값만 교체(레거시 즐겨찾기 호환)하고 `myspace: '/myspace'` 추가. FAV_SUGGESTIONS 에 today 항목 있으면 hubId 'myspace' 로 교체.

- [ ] **Step 4: WorkspaceSidebarSwitchButton.tsx** — WORKSPACE_LABELS `today: '오늘의 나'` → `myspace: '마이스페이스'`.

- [ ] **Step 5:** `src/pages/Today.tsx` 삭제 (`git rm src/pages/Today.tsx`). Today 를 import 하는 다른 파일이 있는지 `grep -rn "pages/Today" src` 로 확인 — 있으면 해당 참조를 MySpace 로 교체.

- [ ] **Step 6: 검증** — `npx tsc --noEmit` → 0 / `npx vitest run src/test/myspaceRooms.test.ts src/test/myspaceActivity.test.ts` → PASS / `npx vite build` → 성공

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(myspace): /myspace 등록 + /today 흡수·리다이렉트 (레일·메뉴·라벨 교체)"`

---

### Task 7: 최종 점검

- [ ] `npx vitest run` — 신규 전부 PASS (기존 실패 5건: Planner 2·AiSidebar 2·openrouter 1 은 무관 기존 실패)
- [ ] `npx vite build` — 성공
- [ ] 수동 체크리스트(사용자 dev 서버, preview 자발 실행 금지): 레일 최상단 '마이스페이스' 진입 → 타일에 스니펫 표시 → 카탈로그에서 방 숨기기 → 타일·레일에서 사라짐(레일은 재진입 시 반영) → 다시 추가 → /today 접속 시 /myspace 로 이동 → 즐겨찾기에 있던 '오늘의 나'가 /myspace 로 열림
- [ ] 메모리 갱신: `zone_myspace_rooms.md` 에 "홈 /myspace (오늘의나 흡수, 레일 상태 공유, 카탈로그=미래 스토어 표면)" 추기
- [ ] 잔여 커밋

---

## 확장 절차 (앞으로 방을 계속 만들 때)

**새 방 추가** = ① 방 자체 구현(페이지·스토어·테마) ② 기존 등록 7곳 체크리스트([[guardrails-revert-lessons]]) ③ **`MYSPACE_ROOMS` 에 1항목 추가** — 이것만 하면 홈 타일·카탈로그·최근 활동 후보에 자동 등장. 스니펫·points 3개를 그 자리에서 정의.

**구매/구독 도입 시** (결정되면): `isRoomUnlocked()` 하나만 엔타이틀먼트 소스로 교체 → 카탈로그 버튼이 가격 버튼으로, 잠긴 방 타일은 자동 비노출. 그 전까지 가격·결제 코드는 어디에도 없다.

---

## Self-Review 결과

- **레지스트리 개수**: 오늘의 나 흡수로 방은 11개가 정답 — Task 1 테스트·주석에 11로 명시 (본문 코드의 placeholder 데모는 작성 금지 경고 포함)
- **레일 양방향 반영 한계**: 홈에서 숨기면 레일은 다음 라우트 진입 시 반영(레일 상태가 mount 시 초기화되므로). 실사용상 자연스러움 — 문제 시 AppWorkspaceShell 에 MYSPACE_CHANGED 리스너 추가가 후속 개선
- **결제 요소 0**: 카탈로그 버튼 주석으로 자리만 표시 — [[사이트 컨셉]] 방침 준수
- **필드명 확인 지점**: Task 2 의 archive(title/fileName)·tickets(title/createdAt) 필드는 구현 시 타입 파일 대조 (명시됨)
- **타입 일관성**: MySpaceRoom/RecentActivity/컴포넌트 프롭 시그니처 교차 확인 완료
