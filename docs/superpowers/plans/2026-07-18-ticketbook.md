# 티켓북 (/tickets) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 엔터테인먼트 기록 방 `/tickets` — 제목만 치면 API(TMDB·카카오 책)/AI가 메타데이터를 채우는 티켓 수집형 기록집.

**Architecture:** 순수 로직(`src/lib/tickets/`: store·search·aiFill·milestones)을 먼저 TDD로 만들고, 그 위에 페이지 UI(`src/pages/Tickets.tsx` + `src/components/tickets/`)를 얹는다. 저장은 localStorage `ticketbook.v1`(archiveStore 패턴), AI는 기존 `quickAi` 서버 경유, 외부 API는 `VITE_*` 키 부재 시 조용히 AI 폴백.

**Tech Stack:** React 18 + TS, Vite, Tailwind(+ 방 테마 CSS 변수), Vitest, lucide-react, TMDB API, 카카오 책 API, `quickAi`(OpenRouter/gemini 서버 라우트).

**Spec:** `docs/superpowers/specs/2026-07-18-ticketbook-design.md`

## 레퍼런스 병합 최종 결정 (2026-07-18)

사용자가 완성형 HTML 시안 2개(`1.html`, `2.html`)를 제공. 요소별 채택:

| 요소 | 채택 | 비고 |
|---|---|---|
| 방 내부 사이드바 IA | 2번 | 전체보기 / 최고의티켓 / 마일스톤·스탬프 / 연말결산 / 다음뭐볼까 → 카테고리(영화·드라마·책·게임·공연). 72px 아이콘 레일은 이미 AppWorkspaceShell 이 제공 → 방 안에서는 사이드바 1단만 |
| 마스트헤드 | 2번 | 제목+장수 + 연도칩 + 우측 통계 타일(올해 편수·평균★·이번 달) + "다음 뭐 볼까?" |
| 포스터 월 카드 + 호버 | 2번 | 다크 그라데 커버 / 크림색 실물 티켓 노커버(절취 구멍) / 호버 시 별점·본곳·날짜·"티켓 열기 →" |
| 기록 폼 | 1번 | 중앙 모달 |
| 상세 카드 | 2번 | 좌 스텁 + 절취선(반원 노치) + 우 RATED 스탬프 |
| 마일스톤·스탬프 페이지 | 1번 + 강화 | 포일 그라데 티켓에 `NO.0010` 시리얼 · 바코드 줄 · 원형 인장 추가. 장르 스탬프(원형 도장). 연간 목표 링 **이 페이지 안에만** |
| 연말결산 | 1번 + Wrapped 밴드 | 상단 하이라이트 밴드(올해총N·올해의창작자·단골·최애장르·인생작·올해의문장·첫/마지막티켓·작년대비·최다월·재관람·총별개수) + 하단 대시보드(베스트5·장르분포·월별막대). 데이터 없는 카드는 렌더 생략 |
| **내 사진 업로드** | 신규 | 상세에만 표시, IndexedDB 저장, 여러 장. 카드 앞면은 API 포스터만 |
| 분위기 방사광 | 넣기(1번) | 화면 위 은은한 앰버 방사광 + 비네팅 (`pointer-events:none` 오버레이) |
| 마일스톤 축하 모달 | 넣기(1번) | 10·25·50·100 달성 순간 기념 티켓 팝업 |
| Space Mono 숫자 | 넣기(2번) | 날짜·시리얼·별점 등 숫자에 고정폭 |
| 테마색 | 넣기(2번) | 앰버 기본 + 빨강·초록·보라·파랑 5종. `--accent` CSS 변수 + localStorage `ticketbook.accent` |
| 별점 감성 라벨 | **제외** | — |
| 모션 | 전부 포함 | ticketIn / stampIn(2번, -13deg 이중선) / slideInRight / fadeUp / popIn / blink / spin / toastIn / 카드 호버 ty(-5px) / 포스터월 fadeIn |

### 등록 지점 실측 (구현 시 정확히 이 위치)

- `src/App.tsx`: `:25` 근처 `const Tickets = lazy(() => import("./pages/Tickets"))`, `:59` 근처 `<Route path="/tickets" element={<AppWorkspaceShell current="tickets"><Tickets /></AppWorkspaceShell>} />`
- `src/components/AppWorkspaceShell.tsx`: `:31` `WorkspaceKey` 유니온에 `'tickets'`; `:53` 근처 `WORKSPACE_DESTINATIONS`에 `{ key: 'tickets', label: '티켓북', to: '/tickets', icon: Ticket }` (lucide `Ticket` import 추가 — 현재 미import); `:64` 근처 `RAIL_ACCENT`에 `tickets: '#d97706'`; `:74` `MOBILE_MORE` 배열에 `'tickets'` 추가
- `src/components/MainModeTabs.tsx`: `:248` HUB_TOOLS ticketbook 항목에서 `pending: true` 제거 + label `'티켓북'`; `:1070` `openFav` route 맵에 `ticketbook: '/tickets'` 추가; `:2257` 근처 onClick 분기에 `else if (item.id === 'ticketbook') { setOpen(false); navigate('/tickets'); }` 추가 (`Ticket` 아이콘은 `:17` 이미 import됨)
- `src/index.css`: `:671` `.archive-theme` 블록 뒤에 `.tickets-theme` 라이트/다크 쌍 추가

### 데이터 모델 변경 (스펙 대비)

`TicketEntry`에 `photoIds?: string[]`(IndexedDB 사진 키 배열) 추가. `TicketStoreData`에 `accent?: string`(테마색) 추가. 사진 바이너리는 localStorage 가 아니라 IndexedDB(`ticketbook-photos` DB)에 저장 — `src/lib/tickets/photoStore.ts`.

**공용 재사용(새로 만들지 말 것):** `newId` (`src/lib/idGenerator.ts`), `toDayKey`/`parseDayKey` (`src/lib/planner/timeKeys.ts`), `quickAi`/`QUICK_MODEL` (`src/lib/cloudDoc/ai.ts`), `fmtMonthDay` 등 (`src/lib/dateFormat.ts`).

---

### Task 1: 타입 + 스토어 (`ticketStore`)

**Files:**
- Create: `src/lib/tickets/ticketStore.ts`
- Test: `src/test/ticketStore.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/test/ticketStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeEntry, loadTickets, saveTickets, type TicketEntry } from '@/lib/tickets/ticketStore';

const base = (over: Partial<TicketEntry> = {}): TicketEntry => ({
  id: 'tkt_a', kind: 'movie', title: '기생충', creator: '봉준호', year: 2019,
  rating: 4.5, watchedAt: '2026-07-01', oneLiner: '수직의 영화', rewatch: false,
  createdAt: 1000, ...over,
});

describe('normalizeEntry', () => {
  it('정상 항목은 그대로 통과한다', () => {
    expect(normalizeEntry(base(), 0)).toEqual(base());
  });
  it('title 없는 항목은 버린다(null)', () => {
    expect(normalizeEntry({ ...base(), title: '' }, 0)).toBeNull();
    expect(normalizeEntry({ ...base(), title: undefined }, 0)).toBeNull();
  });
  it('알 수 없는 kind는 movie로, 범위 밖 rating은 클램프', () => {
    const n = normalizeEntry({ ...base(), kind: 'vhs', rating: 9 }, 0)!;
    expect(n.kind).toBe('movie');
    expect(n.rating).toBe(5);
  });
  it('watchedAt이 YMD가 아니면 오늘(로컬)로 대체', () => {
    const n = normalizeEntry({ ...base(), watchedAt: 'not-a-date' }, 0)!;
    expect(n.watchedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('id 없으면 복구 id 부여', () => {
    const n = normalizeEntry({ ...base(), id: undefined }, 3)!;
    expect(n.id).toMatch(/^tkt_recovered_3/);
  });
});

describe('load/save', () => {
  beforeEach(() => localStorage.clear());
  it('빈 저장소면 빈 entries', () => {
    expect(loadTickets()).toEqual({ entries: [] });
  });
  it('저장 후 다시 읽으면 동일', () => {
    const s = { entries: [base()], yearGoal: { year: 2026, count: 50 } };
    saveTickets(s);
    expect(loadTickets()).toEqual(s);
  });
  it('손상 JSON이면 빈 entries로 폴백', () => {
    localStorage.setItem('ticketbook.v1', '{{{broken');
    expect(loadTickets()).toEqual({ entries: [] });
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/test/ticketStore.test.ts` · Expected: FAIL (모듈 없음)

- [ ] **Step 3: 최소 구현**

```ts
// src/lib/tickets/ticketStore.ts
/** 티켓북 저장소 — localStorage 'ticketbook.v1'. archiveStore 패턴(safeRead/normalize/broadcast). */
import { toDateKey } from '@/lib/planner/habitStats';

export type TicketKind = 'movie' | 'tv' | 'book' | 'game' | 'stage';
export const TICKET_KINDS: TicketKind[] = ['movie', 'tv', 'book', 'game', 'stage'];
export const KIND_LABEL: Record<TicketKind, string> = {
  movie: '영화', tv: '드라마', book: '책', game: '게임', stage: '공연',
};

export interface TicketEntry {
  id: string;
  kind: TicketKind;
  title: string;
  creator: string;
  year?: number;
  posterUrl?: string;
  rating: number;          // 0.5~5 (0.5 단위)
  watchedAt: string;       // 로컬 'YYYY-MM-DD'
  where?: string;
  oneLiner: string;
  longNote?: string;
  quotes?: string[];
  rewatch: boolean;
  genres?: string[];
  createdAt: number;
}

export interface TicketStoreData {
  entries: TicketEntry[];
  yearGoal?: { year: number; count: number };
}

const KEY = 'ticketbook.v1';
export const TICKETS_CHANGED = 'ticketbook:changed';

const isYmd = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const clampRating = (v: unknown): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  return Math.min(5, Math.max(0, Math.round(n * 2) / 2));
};

export function normalizeEntry(raw: unknown, index: number): TicketEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === 'string' ? r.title.trim() : '';
  if (!title) return null;
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `tkt_recovered_${index}_${Date.now().toString(36)}`,
    kind: TICKET_KINDS.includes(r.kind as TicketKind) ? (r.kind as TicketKind) : 'movie',
    title,
    creator: typeof r.creator === 'string' ? r.creator : '',
    year: typeof r.year === 'number' && Number.isFinite(r.year) ? r.year : undefined,
    posterUrl: typeof r.posterUrl === 'string' && r.posterUrl ? r.posterUrl : undefined,
    rating: clampRating(r.rating),
    watchedAt: isYmd(r.watchedAt) ? r.watchedAt : toDateKey(new Date()),
    where: typeof r.where === 'string' && r.where ? r.where : undefined,
    oneLiner: typeof r.oneLiner === 'string' ? r.oneLiner : '',
    longNote: typeof r.longNote === 'string' && r.longNote ? r.longNote : undefined,
    quotes: Array.isArray(r.quotes) ? r.quotes.filter((q): q is string => typeof q === 'string' && !!q) : undefined,
    rewatch: r.rewatch === true,
    genres: Array.isArray(r.genres) ? r.genres.filter((g): g is string => typeof g === 'string' && !!g) : undefined,
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
  };
}

export function loadTickets(): TicketStoreData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { entries: [] };
    const d = JSON.parse(raw) as Record<string, unknown>;
    const entries = Array.isArray(d.entries)
      ? d.entries.map(normalizeEntry).filter((e): e is TicketEntry => !!e)
      : [];
    const g = d.yearGoal as Record<string, unknown> | undefined;
    const yearGoal = g && typeof g.year === 'number' && typeof g.count === 'number' && g.count > 0
      ? { year: g.year, count: g.count } : undefined;
    return yearGoal ? { entries, yearGoal } : { entries };
  } catch {
    return { entries: [] };
  }
}

export function saveTickets(data: TicketStoreData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(TICKETS_CHANGED));
  } catch { /* QuotaExceeded — 조용히 무시 (포스터는 URL만이라 실제로는 희박) */ }
}
```

주의: `normalizeEntry`를 `.map(normalizeEntry)`로 쓰므로 두 번째 인자가 index로 자연 전달된다. quotes/genres의 빈 배열은 `undefined`로 두지 않아도 무방하나 테스트의 `toEqual` 왕복이 성립해야 한다(빈 배열을 만들지 말고 원본 부재 시 `undefined` 유지 — 위 구현이 그렇게 함).

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/test/ticketStore.test.ts` · Expected: PASS (전부)

- [ ] **Step 5: Commit** — `git add src/lib/tickets/ticketStore.ts src/test/ticketStore.test.ts && git commit -m "feat(tickets): 티켓북 스토어 + normalize 폴백"`

---

### Task 2: 마일스톤·스탬프·요약 통계 (`milestones`)

**Files:**
- Create: `src/lib/tickets/milestones.ts`
- Test: `src/test/ticketMilestones.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/test/ticketMilestones.test.ts
import { describe, it, expect } from 'vitest';
import { MILESTONES, earnedMilestones, newlyEarned, genreStamps, yearStats } from '@/lib/tickets/milestones';
import type { TicketEntry } from '@/lib/tickets/ticketStore';

const e = (over: Partial<TicketEntry>): TicketEntry => ({
  id: Math.random().toString(36), kind: 'movie', title: 't', creator: '', rating: 4,
  watchedAt: '2026-03-01', oneLiner: '', rewatch: false, createdAt: 0, ...over,
});

describe('earnedMilestones', () => {
  it('9편이면 없음, 10편이면 [10]', () => {
    expect(earnedMilestones(9)).toEqual([]);
    expect(earnedMilestones(10)).toEqual([10]);
  });
  it('100편이면 전부', () => {
    expect(earnedMilestones(100)).toEqual(MILESTONES);
  });
});

describe('newlyEarned', () => {
  it('9→10 저장 순간에만 [10]을 준다', () => {
    expect(newlyEarned(9, 10)).toEqual([10]);
    expect(newlyEarned(10, 11)).toEqual([]);   // 중복 발급 방지
    expect(newlyEarned(24, 26)).toEqual([25]);
  });
});

describe('genreStamps', () => {
  it('같은 장르 5편부터 스탬프', () => {
    const four = Array.from({ length: 4 }, () => e({ genres: ['SF'] }));
    expect(genreStamps(four)).toEqual([]);
    const five = [...four, e({ genres: ['SF', '드라마'] })];
    expect(genreStamps(five)).toEqual([{ genre: 'SF', count: 5 }]);
  });
});

describe('yearStats', () => {
  it('해당 연도만 세고 평균 별점 소수 1자리', () => {
    const entries = [
      e({ watchedAt: '2026-01-01', rating: 5 }),
      e({ watchedAt: '2026-07-01', rating: 4 }),
      e({ watchedAt: '2025-12-31', rating: 1 }),
    ];
    expect(yearStats(entries, 2026)).toEqual({ count: 2, avgRating: 4.5, monthCounts: expect.any(Array) });
    expect(yearStats(entries, 2026).monthCounts[0]).toBe(1);  // 1월
    expect(yearStats(entries, 2026).monthCounts[6]).toBe(1);  // 7월
  });
  it('기록 없으면 avgRating 0', () => {
    expect(yearStats([], 2026).avgRating).toBe(0);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/test/ticketMilestones.test.ts` · Expected: FAIL

- [ ] **Step 3: 구현**

```ts
// src/lib/tickets/milestones.ts
/** 수집형 게이미피케이션 판정 — 전부 파생 계산(저장 없음)이라 중복 발급이 원리적으로 불가. */
import type { TicketEntry } from './ticketStore';

export const MILESTONES = [10, 25, 50, 100] as const;
export const STAMP_THRESHOLD = 5;

export const earnedMilestones = (count: number): number[] =>
  MILESTONES.filter((m) => count >= m);

/** 저장 직전/직후 개수를 비교해 "이번 저장으로 새로 달성한" 마일스톤만 반환 (토스트용). */
export const newlyEarned = (prevCount: number, nextCount: number): number[] =>
  MILESTONES.filter((m) => prevCount < m && nextCount >= m);

export function genreStamps(entries: TicketEntry[]): { genre: string; count: number }[] {
  const map = new Map<string, number>();
  for (const en of entries) for (const g of en.genres ?? []) map.set(g, (map.get(g) ?? 0) + 1);
  return [...map.entries()]
    .filter(([, c]) => c >= STAMP_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([genre, count]) => ({ genre, count }));
}

export function yearStats(entries: TicketEntry[], year: number): { count: number; avgRating: number; monthCounts: number[] } {
  const inYear = entries.filter((e) => e.watchedAt.startsWith(`${year}-`));
  const monthCounts = Array.from({ length: 12 }, () => 0);
  let sum = 0;
  for (const e of inYear) {
    monthCounts[Number(e.watchedAt.slice(5, 7)) - 1]++;
    sum += e.rating;
  }
  return {
    count: inYear.length,
    avgRating: inYear.length ? Math.round((sum / inYear.length) * 10) / 10 : 0,
    monthCounts,
  };
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/test/ticketMilestones.test.ts` · Expected: PASS

- [ ] **Step 5: Commit** — `git add src/lib/tickets/milestones.ts src/test/ticketMilestones.test.ts && git commit -m "feat(tickets): 마일스톤·장르 스탬프·연간 통계"`

---

### Task 3: 외부 검색 (`search` — TMDB·카카오 책, 키 부재 폴백)

**Files:**
- Create: `src/lib/tickets/search.ts`
- Test: `src/test/ticketSearch.test.ts`
- Modify: `.env.example` (마지막 줄에 키 2개 추가)

- [ ] **Step 1: 실패하는 테스트 작성** — `import.meta.env`는 모듈 로드 시 고정되므로 키 주입 함수(`__setKeysForTest`)를 export해 테스트한다.

```ts
// src/test/ticketSearch.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchMedia, hasApiFor, __setKeysForTest } from '@/lib/tickets/search';

beforeEach(() => {
  vi.restoreAllMocks();
  __setKeysForTest(undefined, undefined);
});

describe('hasApiFor', () => {
  it('키 없으면 전부 false', () => {
    expect(hasApiFor('movie')).toBe(false);
    expect(hasApiFor('book')).toBe(false);
  });
  it('TMDB 키만 있으면 movie/tv만 true', () => {
    __setKeysForTest('tmdb-key', undefined);
    expect(hasApiFor('movie')).toBe(true);
    expect(hasApiFor('tv')).toBe(true);
    expect(hasApiFor('book')).toBe(false);
    expect(hasApiFor('game')).toBe(false);  // game/stage는 API 자체가 없음
  });
});

describe('searchMedia', () => {
  it('키 없으면 fetch 없이 빈 배열', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    expect(await searchMedia('movie', '기생충')).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
  it('TMDB 응답을 SearchResult로 매핑한다', async () => {
    __setKeysForTest('k', undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      results: [
        { media_type: 'movie', title: '기생충', release_date: '2019-05-30', poster_path: '/p.jpg', genre_ids: [53, 18] },
        { media_type: 'person', name: '봉준호' },
      ],
    })));
    const r = await searchMedia('movie', '기생충');
    expect(r).toHaveLength(1);  // person 제외
    expect(r[0]).toMatchObject({
      kind: 'movie', title: '기생충', year: 2019,
      posterUrl: 'https://image.tmdb.org/t/p/w342/p.jpg',
      genres: ['스릴러', '드라마'],
    });
  });
  it('카카오 책 응답을 매핑한다', async () => {
    __setKeysForTest(undefined, 'kk');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      documents: [{ title: '채식주의자', authors: ['한강'], thumbnail: 'https://t.jpg', datetime: '2007-10-30T00:00:00.000+09:00' }],
    })));
    const r = await searchMedia('book', '채식주의자');
    expect(r[0]).toMatchObject({ kind: 'book', title: '채식주의자', creator: '한강', year: 2007, posterUrl: 'https://t.jpg' });
  });
  it('네트워크 실패 시 빈 배열(throw 금지)', async () => {
    __setKeysForTest('k', undefined);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await searchMedia('movie', 'x')).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/test/ticketSearch.test.ts` · Expected: FAIL

- [ ] **Step 3: 구현**

```ts
// src/lib/tickets/search.ts
/** TMDB(영화·드라마)·카카오 책 검색. 키 부재·네트워크 실패 시 [] — 호출부가 AI 폴백으로 넘어간다. */
import type { TicketKind } from './ticketStore';

export interface MediaSearchResult {
  kind: TicketKind;
  title: string;
  creator: string;
  year?: number;
  posterUrl?: string;
  genres?: string[];
}

let tmdbKey = import.meta.env.VITE_TMDB_KEY as string | undefined;
let kakaoKey = import.meta.env.VITE_KAKAO_KEY as string | undefined;
/** 테스트 전용 — 프로덕션 코드에서 호출 금지. */
export function __setKeysForTest(tmdb: string | undefined, kakao: string | undefined): void {
  tmdbKey = tmdb; kakaoKey = kakao;
}

export function hasApiFor(kind: TicketKind): boolean {
  if (kind === 'movie' || kind === 'tv') return !!tmdbKey;
  if (kind === 'book') return !!kakaoKey;
  return false;
}

/** TMDB genre id → 한국어 이름 (movie+tv 통합, 공식 장르 목록 고정 사본). */
const TMDB_GENRES: Record<number, string> = {
  28: '액션', 12: '모험', 16: '애니메이션', 35: '코미디', 80: '범죄', 99: '다큐멘터리',
  18: '드라마', 10751: '가족', 14: '판타지', 36: '역사', 27: '공포', 10402: '음악',
  9648: '미스터리', 10749: '로맨스', 878: 'SF', 10770: 'TV 영화', 53: '스릴러',
  10752: '전쟁', 37: '서부', 10759: '액션 어드벤처', 10762: '키즈', 10763: '뉴스',
  10764: '리얼리티', 10765: 'SF 판타지', 10766: '연속극', 10767: '토크', 10768: '정치',
};

export async function searchMedia(kind: TicketKind, query: string): Promise<MediaSearchResult[]> {
  const q = query.trim();
  if (!q || !hasApiFor(kind)) return [];
  try {
    if (kind === 'movie' || kind === 'tv') {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&language=ko-KR&query=${encodeURIComponent(q)}`,
      );
      if (!res.ok) return [];
      const data = await res.json() as { results?: Array<Record<string, unknown>> };
      return (data.results ?? [])
        .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
        .slice(0, 8)
        .map((r) => {
          const isMovie = r.media_type === 'movie';
          const date = (isMovie ? r.release_date : r.first_air_date) as string | undefined;
          return {
            kind: (isMovie ? 'movie' : 'tv') as TicketKind,
            title: String(isMovie ? r.title : r.name ?? ''),
            creator: '',   // TMDB multi에는 감독이 없음 — AI 보완 또는 수동
            year: date ? Number(date.slice(0, 4)) || undefined : undefined,
            posterUrl: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : undefined,
            genres: Array.isArray(r.genre_ids)
              ? (r.genre_ids as number[]).map((g) => TMDB_GENRES[g]).filter(Boolean)
              : undefined,
          };
        })
        .filter((r) => r.title);
    }
    // book — 카카오
    const res = await fetch(
      `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(q)}&size=8`,
      { headers: { Authorization: `KakaoAK ${kakaoKey}` } },
    );
    if (!res.ok) return [];
    const data = await res.json() as { documents?: Array<Record<string, unknown>> };
    return (data.documents ?? []).map((d) => ({
      kind: 'book' as TicketKind,
      title: String(d.title ?? ''),
      creator: Array.isArray(d.authors) ? (d.authors as string[]).join(', ') : '',
      year: typeof d.datetime === 'string' ? Number(d.datetime.slice(0, 4)) || undefined : undefined,
      posterUrl: typeof d.thumbnail === 'string' && d.thumbnail ? d.thumbnail : undefined,
    })).filter((r) => r.title);
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: `.env.example`에 키 추가** — 파일 끝에:

```
# 티켓북 — 외부 메타데이터 검색 (없으면 AI 채움으로 자동 폴백)
VITE_TMDB_KEY=
VITE_KAKAO_KEY=
```

- [ ] **Step 5: 통과 확인** — Run: `npx vitest run src/test/ticketSearch.test.ts` · Expected: PASS

- [ ] **Step 6: Commit** — `git add src/lib/tickets/search.ts src/test/ticketSearch.test.ts .env.example && git commit -m "feat(tickets): TMDB·카카오 책 검색 + 키 부재 폴백"`

---

### Task 4: AI 채움·추천 (`aiFill`)

**Files:**
- Create: `src/lib/tickets/aiFill.ts`
- Test: `src/test/ticketAiFill.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성** — `quickAi`를 모킹.

```ts
// src/test/ticketAiFill.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/cloudDoc/ai', () => ({
  quickAi: vi.fn(),
  QUICK_MODEL: 'test-model',
}));
import { quickAi } from '@/lib/cloudDoc/ai';
import { aiFillEntry, aiRecommend, MIN_ENTRIES_FOR_RECO } from '@/lib/tickets/aiFill';
import type { TicketEntry } from '@/lib/tickets/ticketStore';

const liked = (title: string): TicketEntry => ({
  id: title, kind: 'movie', title, creator: '', rating: 4.5,
  watchedAt: '2026-01-01', oneLiner: '좋았다', rewatch: false, createdAt: 0,
});

beforeEach(() => vi.mocked(quickAi).mockReset());

describe('aiFillEntry', () => {
  it('JSON 응답을 파싱해 부분 필드를 반환', async () => {
    vi.mocked(quickAi).mockResolvedValue('```json\n{"creator":"봉준호","year":2019,"genres":["스릴러"]}\n```');
    const r = await aiFillEntry('movie', '기생충');
    expect(r).toEqual({ creator: '봉준호', year: 2019, genres: ['스릴러'] });
  });
  it('깨진 응답이면 null', async () => {
    vi.mocked(quickAi).mockResolvedValue('그건 좋은 영화죠!');
    expect(await aiFillEntry('movie', '기생충')).toBeNull();
  });
  it('quickAi가 throw해도 null(전파 금지)', async () => {
    vi.mocked(quickAi).mockRejectedValue(new Error('500'));
    expect(await aiFillEntry('movie', 'x')).toBeNull();
  });
});

describe('aiRecommend', () => {
  it('기록이 기준 미만이면 quickAi 호출 없이 null', async () => {
    const few = Array.from({ length: MIN_ENTRIES_FOR_RECO - 1 }, (_, i) => liked(`t${i}`));
    expect(await aiRecommend(few)).toBeNull();
    expect(quickAi).not.toHaveBeenCalled();
  });
  it('취향 한 줄 + 추천 목록을 파싱한다', async () => {
    vi.mocked(quickAi).mockResolvedValue(JSON.stringify({
      taste: '서늘한 스릴러 취향',
      picks: [{ kind: 'movie', title: '살인의 추억', creator: '봉준호', reason: '결이 같다' }],
    }));
    const r = await aiRecommend([liked('a'), liked('b'), liked('c')]);
    expect(r?.taste).toBe('서늘한 스릴러 취향');
    expect(r?.picks[0].title).toBe('살인의 추억');
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/test/ticketAiFill.test.ts` · Expected: FAIL

- [ ] **Step 3: 구현**

```ts
// src/lib/tickets/aiFill.ts
/** AI 채움(메타데이터) + AI 온디맨드 추천. 실패는 전부 null — UI가 수동 입력/재시도로 처리. */
import { quickAi, QUICK_MODEL } from '@/lib/cloudDoc/ai';
import { KIND_LABEL, type TicketEntry, type TicketKind } from './ticketStore';

export const MIN_ENTRIES_FOR_RECO = 3;

function extractJson<T>(text: string): T | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)) as T; } catch { return null; }
}

export interface AiFillResult { creator?: string; year?: number; genres?: string[] }

export async function aiFillEntry(kind: TicketKind, title: string): Promise<AiFillResult | null> {
  try {
    const raw = await quickAi(
      `너는 ${KIND_LABEL[kind]} 메타데이터 조수다. 주어진 제목의 대표작 기준으로 JSON만 출력한다: {"creator":"감독/저자/개발사/극단","year":연도숫자,"genres":["장르1","장르2"]}. 확실하지 않은 필드는 생략. 다른 말 금지.`,
      title,
      { model: QUICK_MODEL, temperature: 0.1, maxTokens: 200 },
    );
    const j = extractJson<Record<string, unknown>>(raw);
    if (!j) return null;
    const out: AiFillResult = {};
    if (typeof j.creator === 'string' && j.creator) out.creator = j.creator;
    if (typeof j.year === 'number' && j.year > 1800 && j.year < 2100) out.year = j.year;
    if (Array.isArray(j.genres)) {
      const g = j.genres.filter((x): x is string => typeof x === 'string' && !!x).slice(0, 4);
      if (g.length) out.genres = g;
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

export interface RecoPick { kind: TicketKind; title: string; creator: string; reason: string }
export interface RecoResult { taste: string; picks: RecoPick[] }

export async function aiRecommend(likedEntries: TicketEntry[]): Promise<RecoResult | null> {
  if (likedEntries.length < MIN_ENTRIES_FOR_RECO) return null;
  const catalog = likedEntries.slice(0, 30)
    .map((e) => `- [${KIND_LABEL[e.kind]}] ${e.title}${e.creator ? ` (${e.creator})` : ''} ★${e.rating}${e.oneLiner ? ` — ${e.oneLiner}` : ''}`)
    .join('\n');
  try {
    const raw = await quickAi(
      `너는 취향 분석가다. 사용자가 높게 평가한 작품 목록을 보고 JSON만 출력한다: {"taste":"취향 한 줄(한국어, 40자 이내)","picks":[{"kind":"movie|tv|book|game|stage","title":"제목","creator":"만든 이","reason":"추천 이유 한 문장"}]}. picks는 정확히 5개, 목록에 이미 있는 작품 제외, 카테고리를 섞어도 좋다. 다른 말 금지.`,
      catalog,
      { model: QUICK_MODEL, temperature: 0.7, maxTokens: 700 },
    );
    const j = extractJson<{ taste?: unknown; picks?: unknown }>(raw);
    if (!j || typeof j.taste !== 'string' || !Array.isArray(j.picks)) return null;
    const picks = (j.picks as Array<Record<string, unknown>>)
      .filter((p) => typeof p.title === 'string' && !!p.title)
      .slice(0, 5)
      .map((p) => ({
        kind: (['movie', 'tv', 'book', 'game', 'stage'].includes(p.kind as string) ? p.kind : 'movie') as TicketKind,
        title: String(p.title),
        creator: typeof p.creator === 'string' ? p.creator : '',
        reason: typeof p.reason === 'string' ? p.reason : '',
      }));
    return picks.length ? { taste: j.taste, picks } : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/test/ticketAiFill.test.ts` · Expected: PASS

- [ ] **Step 5: Commit** — `git add src/lib/tickets/aiFill.ts src/test/ticketAiFill.test.ts && git commit -m "feat(tickets): AI 채움·온디맨드 추천"`

---

### Task 5: 방 등록 (라우트 + 셸 + 메가메뉴 + 테마 CSS) + 페이지 스켈레톤

**Files:**
- Create: `src/pages/Tickets.tsx` (임시 스켈레톤)
- Modify: `src/App.tsx:25-26` 근처(lazy), `:59-61` 근처(Route)
- Modify: `src/components/AppWorkspaceShell.tsx:31` (`WorkspaceKey`), `:50-52` (`WORKSPACE_DESTINATIONS`), `:63-64` (`RAIL_ACCENT`), `:73-75` (`MOBILE_MORE`)
- Modify: `src/components/MainModeTabs.tsx:248` (`HUB_TOOLS`의 ticketbook 항목), `:1070` (`openFav` route 맵)
- Modify: `src/index.css` (`.tickets-theme` 라이트/다크 토큰)

- [ ] **Step 1: 페이지 스켈레톤 생성**

```tsx
// src/pages/Tickets.tsx  (Task 6에서 본격 구현 — 지금은 라우팅 확인용)
export default function Tickets() {
  return (
    <div className="tickets-theme flex min-h-dvh items-center justify-center bg-background text-foreground">
      <div className="text-sm opacity-60">티켓북 — 준비 중</div>
    </div>
  );
}
```

- [ ] **Step 2: `App.tsx` 등록** — 기존 Archive/Health 줄과 같은 모양으로:

```tsx
const Tickets = lazy(() => import("./pages/Tickets"));
// Routes 안, /archive 근처:
<Route path="/tickets" element={<AppWorkspaceShell current="tickets"><Tickets /></AppWorkspaceShell>} />
```

- [ ] **Step 3: `AppWorkspaceShell.tsx` 등록** — 4곳. lucide `Ticket` import 추가(중복 import 주의 — 기존 import 여부 grep 먼저: `grep -n "Ticket" src/components/AppWorkspaceShell.tsx`).

```tsx
// WorkspaceKey 유니온에:  | 'tickets'
// WORKSPACE_DESTINATIONS에 (archive 항목 뒤):
{ key: 'tickets', label: '티켓북', to: '/tickets', icon: Ticket },
// RAIL_ACCENT에:
tickets: '#b45309' 대신 앰버: tickets: '#d97706',
// MOBILE_MORE 배열에 'tickets' 추가
```

- [ ] **Step 4: `MainModeTabs.tsx` 등록** — `HUB_TOOLS`의 ticketbook 항목(`:248`)에서 `pending: true` 제거, `label: '티켓북'`, `desc: '영화 · 책 · 게임 감상 기록'` 유지. `openFav`의 route 맵(`:1070`)에 **HUB_TOOLS의 id와 같은 키로** `ticketbook: '/tickets'` 추가 (실제 키 이름은 그 줄의 archive/health 키가 hub id인지 확인 후 맞출 것 — archive는 hub id와 route 키가 같음).

- [ ] **Step 5: `index.css` 테마 토큰** — `.archive-theme` 블록(`src/index.css:671` 근처) 뒤에 같은 구조로 추가. 미드나이트 네이비 배경 + 앰버 강조:

```css
/* ── 티켓북(/tickets) — 미드나이트 네이비 + 앰버 ── */
.tickets-theme {
  --background: 222 47% 10%;        /* 미드나이트 네이비 */
  --foreground: 40 30% 92%;
  --card: 222 42% 13%;
  --card-foreground: 40 30% 92%;
  --border: 222 30% 22%;
  --input: 222 30% 22%;
  --muted: 222 35% 17%;
  --muted-foreground: 222 12% 62%;
  --primary: 38 92% 50%;            /* 앰버 (영사기 불빛) */
  --primary-foreground: 222 47% 10%;
  --accent: 222 35% 17%;
  --accent-foreground: 40 30% 92%;
  --ring: 38 92% 50%;
  --ticket-amber: 38 92% 50%;
  --ticket-navy-deep: 222 47% 7%;
}
.tickets-theme :is(h1, h2, h3) { font-family: 'Pretendard Variable', Pretendard, sans-serif; }
.tickets-theme ::selection { background: hsl(38 92% 50% / 0.35); }
```

(이 방은 "어두운 극장"이 정체성이므로 라이트/다크 분기 없이 다크 단일 톤 — 스펙의 네이비+앰버를 그대로. 앱 다크모드 토글과 충돌 시 `.dark .tickets-theme` 오버라이드는 동일 값 재선언으로 고정.)

- [ ] **Step 6: 수동 확인** — Run: `npx tsc --noEmit` · Expected: 에러 0. 이후 `npm run build` 1회로 vite 번들 확인 (lucide 중복 import로 인한 흰 화면 예방 — 메모리의 HeartPulse 사고 전례).

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(tickets): /tickets 방 등록 + 네이비·앰버 테마 (메가메뉴 pending 해제)"`

---

### Task 6: 홈 화면 — 캐논 사이드바 + 마스트헤드 + 포스터 월

**Files:**
- Create: `src/components/tickets/TicketPosterCard.tsx`
- Modify: `src/pages/Tickets.tsx` (스켈레톤 → 본 구현)

구조는 `src/pages/Archive.tsx:133-256`을 본뜬다 (flex 2단 + `hidden lg:flex` 사이드바 + 인라인 NavRow). 상태는 페이지 로컬 `useState` + `loadTickets()` 초기화 + `TICKETS_CHANGED` 구독.

- [ ] **Step 1: `TicketPosterCard` 구현** — 포스터가 있으면 이미지(2:3 비율, `object-cover`, `onError` 시 폴백 전환), 없으면 티켓형 폴백 카드:

```tsx
// src/components/tickets/TicketPosterCard.tsx
import { useState } from 'react';
import { Star } from 'lucide-react';
import { KIND_LABEL, type TicketEntry } from '@/lib/tickets/ticketStore';

export function TicketPosterCard({ entry, onClick }: { entry: TicketEntry; onClick: () => void }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showPoster = !!entry.posterUrl && !imgFailed;
  return (
    <button type="button" onClick={onClick}
      className="group relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-border bg-card text-left transition-transform hover:-translate-y-1 hover:shadow-lg">
      {showPoster ? (
        <img src={entry.posterUrl} alt={entry.title} loading="lazy"
          onError={() => setImgFailed(true)} className="h-full w-full object-cover" />
      ) : (
        /* 티켓형 폴백 — 절취선 + 제목 타이포 */
        <div className="flex h-full flex-col justify-between p-3"
          style={{ background: 'hsl(var(--ticket-navy-deep))' }}>
          <div className="text-[10px] font-bold tracking-widest text-[hsl(var(--ticket-amber))]">
            {KIND_LABEL[entry.kind]} TICKET
          </div>
          <div className="text-[15px] font-extrabold leading-snug">{entry.title}</div>
          <div className="border-t border-dashed border-border pt-2 text-[10px] opacity-60">{entry.watchedAt}</div>
        </div>
      )}
      {/* 호버 오버레이: 별점·제목 */}
      <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/85 to-transparent p-2.5 pt-6 transition-transform group-hover:translate-y-0">
        <div className="flex items-center gap-1 text-[11px] font-bold text-[hsl(var(--ticket-amber))]">
          <Star size={11} fill="currentColor" /> {entry.rating.toFixed(1)}
        </div>
        <div className="truncate text-[12px] font-semibold text-white">{entry.title}</div>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: `Tickets.tsx` 본 구현** — 다음 구조로 작성 (Archive.tsx의 검증된 골격 이식):

```tsx
// 상태·파생값
const [store, setStore] = useState(loadTickets);
const [kindFilter, setKindFilter] = useState<TicketKind | 'all'>('all');
const [yearFilter, setYearFilter] = useState<number>(() => new Date().getFullYear());
const [detailId, setDetailId] = useState<string | null>(null);   // Task 8
const [entryOpen, setEntryOpen] = useState(false);               // Task 7
const [recoOpen, setRecoOpen] = useState(false);                 // Task 9
// TICKETS_CHANGED 구독: useEffect(() => { const f = () => setStore(loadTickets()); window.addEventListener(TICKETS_CHANGED, f); return () => window.removeEventListener(TICKETS_CHANGED, f); }, []);
const stats = yearStats(store.entries, yearFilter);
const shown = store.entries
  .filter((e) => kindFilter === 'all' || e.kind === kindFilter)
  .filter((e) => e.watchedAt.startsWith(`${yearFilter}-`))
  .sort((a, b) => b.watchedAt.localeCompare(a.watchedAt) || b.createdAt - a.createdAt);
```

레이아웃 (클래스는 Archive 관례 유지, 색만 테마 토큰):
- 래퍼: `<div className="tickets-theme flex min-h-dvh bg-background text-foreground">`
- 사이드바 `<aside className="hidden w-[256px] shrink-0 flex-col border-r border-border lg:flex">`
  - 헤더: 34px 앰버 사각 마크(`Ticket` 아이콘) + "티켓북" 16px bold + 부제 "본 것의 기록집" 12px
  - CTA: `+ 티켓 추가` (bg `hsl(var(--ticket-amber))`, 진네이비 글자) → `setEntryOpen(true)`
  - NavRow 목록: 전체 / 영화 / 드라마 / 책 / 게임 / 공연 (= kindFilter, 활성 = 앰버 채움 알약 + 우측 개수)
  - 하단: 마일스톤 티켓 섹션 — `earnedMilestones(store.entries.length)` 를 작은 기념 티켓 배지로, `genreStamps` 상위 3개 스탬프
  - 푸터: `티켓 {n}장 · {월}월 {일}일`
- 메인 마스트헤드: `<h1 className="text-[27px] font-extrabold">티켓북</h1>` + 실데이터 한 조각 `올해 {stats.count}편 · ★{stats.avgRating}` + (yearGoal 있으면 진행률 링 svg) + 연도 select + "다음 뭐 볼까?" 버튼(`setRecoOpen(true)`, `store.entries.length < 3`이면 disabled + title="3편만 기록하면 취향을 분석해드려요")
- 포스터 월: `grid grid-cols-3 gap-4 sm:grid-cols-4 xl:grid-cols-6` + `TicketPosterCard` 나열, 빈 상태면 중앙 안내("첫 티켓을 끊어보세요") + CTA

- [ ] **Step 3: 확인** — `npx tsc --noEmit` 통과 후, 시드 데이터가 없으므로 브라우저 확인은 Task 7(입력) 뒤로 미룬다. 빈 상태 화면만 육안 확인.

- [ ] **Step 4: Commit** — `git add src/pages/Tickets.tsx src/components/tickets/TicketPosterCard.tsx && git commit -m "feat(tickets): 홈 — 사이드바·마스트헤드·포스터 월"`

---

### Task 7: 입력 모달 (검색 → 자동 채움 → 30초 마무리)

**Files:**
- Create: `src/components/tickets/TicketEntryModal.tsx`
- Create: `src/components/tickets/StarRatingInput.tsx`
- Modify: `src/pages/Tickets.tsx` (모달 연결 + 저장 핸들러)

- [ ] **Step 1: `StarRatingInput`** — 별 5개, 클릭 위치 좌/우로 0.5 단위. 접근성: `role="radiogroup"`, 좌우 화살표로 0.5 증감.

```tsx
// src/components/tickets/StarRatingInput.tsx
import { Star } from 'lucide-react';

export function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup" aria-label="별점" tabIndex={0} className="flex gap-1 outline-none"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); onChange(Math.min(5, value + 0.5)); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); onChange(Math.max(0.5, value - 0.5)); }
      }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" className="relative p-0.5"
          onClick={(e) => {
            const { left, width } = e.currentTarget.getBoundingClientRect();
            onChange(e.clientX - left < width / 2 ? i - 0.5 : i);
          }}>
          <Star size={26} className="text-muted-foreground/40" />
          {value >= i - 0.5 && (
            <span className="absolute inset-0 overflow-hidden p-0.5" style={{ width: value >= i ? '100%' : '50%' }}>
              <Star size={26} fill="hsl(var(--ticket-amber))" className="text-[hsl(var(--ticket-amber))]" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `TicketEntryModal`** — 2단계 상태 머신 `phase: 'search' | 'form'`:

핵심 로직 (마크업은 Archive의 모달 관례 — 배경 dim + 중앙 카드 `max-w-lg` + Esc 닫기):

```tsx
// 편집 모드: initial prop(TicketEntry)이 오면 phase='form'으로 시작 + 필드 프리필
// [search 단계]
// - kind 칩 5개 (movie 기본) + 검색 input (autoFocus)
// - 입력 400ms 디바운스 → hasApiFor(kind) ? searchMedia(kind, q) : 스킵
// - 결과 리스트: 썸네일 + 제목 + 연도 → 클릭 시 phase='form' + 필드 프리필
// - 결과 없음 or API 미지원 kind: "직접 입력" 버튼(제목만 갖고 form으로) +
//   "AI로 채우기" 버튼 → aiFillEntry(kind, q) → 성공 시 프리필, null이면 toast 후 직접 입력
// [form 단계]
// - 제목(수정 가능) / 만든 이 / 연도 / 별점(StarRatingInput, 기본 3.5)
// - 본 날: <input type="date"> 기본 오늘(toDateKey(new Date()))
// - 어디서: kind별 프리셋 칩 + 자유 입력
//   movie: 극장/넷플릭스/디즈니+/왓챠/기타, tv: 넷플릭스/티빙/쿠팡플레이/본방/기타,
//   book: 종이책/전자책/오디오북, game: PC/콘솔/모바일, stage: 공연장
// - 한줄평 input / [접힘] 긴 감상 textarea + 명대사(줄바꿈 구분) / 재관람 체크
// - 저장: onSave(entry) 호출 후 닫기
```

- [ ] **Step 3: `Tickets.tsx` 저장 핸들러** — 마일스톤 토스트 포함:

```tsx
const handleSave = (draft: Omit<TicketEntry, 'id' | 'createdAt'>, editingId?: string) => {
  const prev = store.entries.length;
  const entries = editingId
    ? store.entries.map((e) => (e.id === editingId ? { ...e, ...draft } : e))
    : [...store.entries, { ...draft, id: newId('tkt'), createdAt: Date.now() }];
  saveTickets({ ...store, entries });
  if (!editingId) {
    for (const m of newlyEarned(prev, entries.length)) {
      toast.success(`🎟️ ${m}번째 티켓 달성! 기념 티켓이 발급됐어요`);
    }
  }
};
```

(toast는 저장소 기존 관례 — `sonner`의 `toast` import. archiveStore가 쓰는 것과 동일한 소스를 grep해 맞출 것: `grep -rn "from 'sonner'" src/services/archiveStore.ts src/pages/Archive.tsx`)

- [ ] **Step 4: 수동 검증 (핵심 플로우)** — 개발 서버에서: ① 키 없이 → 검색 스킵되고 "AI로 채우기"/"직접 입력"만 노출되는지 ② 티켓 3장 입력 → 포스터 월·요약띠 갱신 ③ 10장까지는 안 가도 `newlyEarned` 로직은 Task 2 테스트가 보증. `npx tsc --noEmit` 통과.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(tickets): 입력 모달 — API 검색·AI 채움·30초 폼"`

---

### Task 8: 티켓 상세 (절취선 티켓 디자인)

**Files:**
- Create: `src/components/tickets/TicketDetailModal.tsx`
- Modify: `src/pages/Tickets.tsx` (`detailId` 연결, 수정·삭제 핸들러)

- [ ] **Step 1: 구현** — 모달형 상세. 티켓 반쪽 메타포:

```tsx
// 레이아웃: 상단 = 포스터(있으면 좌측 96px) + 제목/만든 이/연도/장르 칩
// 중단 = 절취선(border-t border-dashed + 좌우 반원 노치:
//   양끝에 absolute rounded-full bg-background w-5 h-5 -translate-x/y 로 펀치홀)
// 하단 = "탑승권" 스타일 그리드: 별점 스탬프(앰버, 큰 숫자) · 본 날 · 어디서 · 재관람 배지
// 그 아래 = 한줄평(큰 따옴표 타이포) · 긴 감상 · 명대사 리스트(각 줄 앞 " 기호)
// 액션: 수정(→ TicketEntryModal 편집 모드) · 삭제(window.confirm) · 닫기(Esc/배경)
```

삭제 핸들러 (`Tickets.tsx`):

```tsx
const handleDelete = (id: string) => {
  const t = store.entries.find((e) => e.id === id);
  if (!t || !window.confirm(`"${t.title}" 티켓을 삭제할까요?`)) return;
  saveTickets({ ...store, entries: store.entries.filter((e) => e.id !== id) });
  setDetailId(null);
};
```

- [ ] **Step 2: 수동 검증** — 포스터 有/無 각 1장씩 상세 열어 절취선·스탬프 확인, 수정→저장 왕복, 삭제 확인. `npx tsc --noEmit`.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat(tickets): 티켓 상세 — 절취선·스탬프 디자인"`

---

### Task 9: AI 추천 모달 + 연말결산 라이트

**Files:**
- Create: `src/components/tickets/RecommendModal.tsx`
- Modify: `src/pages/Tickets.tsx` (연말결산 섹션 + 연간 목표 설정)

- [ ] **Step 1: `RecommendModal`** —

```tsx
// open 시 즉시: const likedEntries = entries.filter((e) => e.rating >= 4);
// aiRecommend(likedEntries) 호출. 로딩 상태(티켓이 도는 스피너 + "취향을 읽는 중…")
// 성공: 상단 taste 한 줄(앰버 강조) + picks 5개 카드(kind 라벨·제목·만든 이·reason)
//   각 카드에 "티켓북에 담기" → onPickToEntry(pick) → TicketEntryModal이
//   search phase, 검색어=pick.title, kind=pick.kind 프리필로 열림
// null: "추천을 만들지 못했어요. 잠시 후 다시 시도해 주세요" + 재시도 버튼
// 재호출 방지: 모달이 열려 있는 동안 결과 캐시(useState), 닫으면 폐기
```

- [ ] **Step 2: 연말결산 섹션** — 포스터 월 하단에 접힌 섹션 "연말결산":

```tsx
// yearStats(entries, yearFilter) 재사용:
// - 그 해 베스트: rating 내림차순 상위 5 (동점이면 watchedAt 최신) — 미니 포스터 행
// - 장르 분포: genres 빈도 상위 6개를 가로 바(폭 = count/max)로 — 차트 라이브러리 없이 div
// - 월별 편수: monthCounts 12칸 미니 막대
// - 연간 목표: yearGoal 없으면 "목표 세우기" 버튼 → 숫자 input(연 단위) → saveTickets로 저장
//   있으면 진행률 링 + "목표 지우기"
```

- [ ] **Step 3: 수동 검증** — 별점 4+ 3장 이상 상태에서 추천 열기(실 AI 응답), "담기"→입력 모달 프리필 확인. 3장 미만이면 버튼 disabled 확인. `npx tsc --noEmit`.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(tickets): AI 추천 모달 + 연말결산 라이트"`

---

### Task 10: 마무리 — 전체 테스트·빌드·실기기 확인

**Files:** (수정 없음이 이상적)

- [ ] **Step 1: 전체 테스트** — Run: `npm test` · Expected: 기존 + 신규(ticketStore·ticketMilestones·ticketSearch·ticketAiFill) 전부 PASS
- [ ] **Step 2: 타입·빌드** — Run: `npx tsc --noEmit && npm run build` · Expected: 에러 0 (lucide 중복 import 흰 화면 전례 방지 차원에서 빌드 필수)
- [ ] **Step 3: 브라우저 최종 점검** — 메인 메뉴 메가메뉴에서 티켓북 클릭 → `/tickets` 진입, 레일 활성 알약 앰버 확인, 모바일 뷰(375px)에서 사이드바 숨김 + 포스터 월 3열 확인
- [ ] **Step 4: Commit** — 잔여 수정이 있으면 `git add -A && git commit -m "fix(tickets): 마무리 점검 수정"`

---

## Self-Review 결과 (계획 작성 후 점검)

- **스펙 커버리지**: 데이터 모델(T1) · 입력 플로우 3단(T7) · API 키 폴백(T3) · 화면 4종(T6 홈/T8 상세/T7 입력/T9 연말결산) · 수집 게이미피케이션(T2 판정 + T6 표시 + T7 토스트) · AI 추천(T4+T9) · 방 등록(T5) · 테스트(T1–T4) — 전 항목 태스크 존재. "오늘의 나 연동 안 함"은 스펙대로 미포함.
- **타입 일관성**: `TicketEntry`/`TicketKind`/`KIND_LABEL`은 T1 정의를 T2·T4·T6·T7이 동일 이름으로 import. `MediaSearchResult`(T3)와 `AiFillResult`(T4)는 프리필 시 `Partial<TicketEntry>` 필드명과 일치(creator/year/posterUrl/genres).
- **주의점**: `MainModeTabs.tsx` route 맵 키는 hub id와 일치시켜야 함(T5 Step 4에 실측 지시 포함). lucide `Ticket`은 MainModeTabs에 이미 import돼 있으므로 AppWorkspaceShell에만 신규 추가 — grep 선행 지시 포함.
