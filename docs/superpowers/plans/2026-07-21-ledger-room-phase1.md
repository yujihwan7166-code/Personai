# 가계부 방 1차 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/ledger` 가계부 방 1차 출시 — 대시보드(위젯 7종) + 내역 + 예산(3버킷) + 고정지출 + 하단 플로팅 AI 채팅 입력(로컬 파서 우선·LLM 폴백) + JSON 백업.

**Architecture:** healthStore/archiveStore 패턴 복제(localStorage 싱글턴 + CustomEvent broadcast + 구독 훅). 파서·통계는 순수 함수 lib으로 분리해 TDD. 페이지는 캐논 사이드바 + 마스트헤드 + 뷰 전환, AI 채팅바는 콘텐츠 하단부 플로팅. LLM은 기존 `quickAi`(`/api/cloud-ai`) 재사용.

**Tech Stack:** React 18 + TS + vite + vitest, react-router, lucide-react, localStorage. 스펙: `docs/superpowers/specs/2026-07-21-ledger-room-design.md`

**공통 규칙 (전 태스크):**
- main 브랜치에서 직접 작업·커밋. 워크트리 금지.
- 날짜는 로컬 YMD (`toISOString` 금지 — KST 하루 밀림).
- lucide 아이콘 import 추가 전 해당 파일에 기존 import 여부 grep (중복 시 vite 흰화면).
- 큰 컴포넌트에 hook 추가 시 TDZ 주의: state 선언 → useCallback → useEffect 순서.
- 테스트 실행: `npx vitest run src/test/<file>.test.ts`

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/types/ledger.ts` (생성) | 타입·기본 카테고리·이벤트 상수 |
| `src/lib/ledger/parse.ts` (생성) | 한 줄 입력 로컬 파서 (순수) |
| `src/lib/ledger/stats.ts` (생성) | 월 집계·예산 페이스·브리핑 (순수) |
| `src/lib/ledger/ai.ts` (생성) | LLM 파싱 폴백 + 자연어 질의 |
| `src/services/ledgerStore.ts` (생성) | 영속화·고정지출 자동 기록·백업 |
| `src/hooks/useLedger.ts` (생성) | store 구독 훅 |
| `src/components/ledger/ChatBar.tsx` (생성) | 플로팅 AI 채팅바 |
| `src/components/ledger/EntryFormDialog.tsx` (생성) | 정식 입력/수정 폼 |
| `src/components/ledger/DashboardView.tsx` (생성) | 위젯 대시보드 |
| `src/components/ledger/EntriesView.tsx` (생성) | 월별 내역 리스트 |
| `src/components/ledger/BudgetView.tsx` (생성) | 3버킷 예산 |
| `src/components/ledger/RecurringView.tsx` (생성) | 고정지출 관리 |
| `src/pages/Ledger.tsx` (생성) | 방 셸(사이드바·마스트헤드·뷰 전환) |
| `src/index.css` (수정) | `.ledger-theme` 딥 네이비 토큰 |
| `src/App.tsx` 외 등록 6곳 (수정) | 라우트·메뉴·레일 |
| `src/test/ledgerParse.test.ts` 등 3개 (생성) | 파서·통계·스토어 테스트 |

---

### Task 1: 타입 + 기본 카테고리 (`src/types/ledger.ts`)

**Files:** Create: `src/types/ledger.ts`

- [ ] **Step 1: 파일 작성**

```ts
/**
 * 가계부 타입 — 수입/지출/이체 3종 거래 + 3버킷 예산 + 고정지출.
 * 날짜는 전부 로컬 YMD 문자열. amount 는 항상 원 단위 정수(내 부담액).
 */
export const LEDGER_CHANGED = 'ledger-changed';

export type EntryType = 'expense' | 'income' | 'transfer';
export type PayMethod = 'card' | 'cash' | 'account';
export type BudgetBucket = 'fixed' | 'variable' | 'irregular';

export interface LedgerEntry {
  id: string;
  type: EntryType;
  amount: number;          // 원 단위 정수. 더치페이면 '내 부담액'
  date: string;            // 로컬 YMD
  categoryId: string;      // LedgerCategory.id — 수입/이체는 'etc' 고정이어도 무방
  memo: string;
  method?: PayMethod;
  groupTotal?: number;     // 더치페이 총액(참고용, 선택)
  createdAt: string;       // ISO
}

export interface LedgerCategory {
  id: string;
  label: string;
  emoji: string;
  bucket: BudgetBucket;    // 예산 3버킷 귀속
  custom?: boolean;
}

/** 기본 10개 — AI 자동분류 대상. 애매하면 'etc'. */
export const DEFAULT_CATEGORIES: LedgerCategory[] = [
  { id: 'food',         label: '식비',        emoji: '🍚', bucket: 'variable' },
  { id: 'cafe',         label: '카페·간식',   emoji: '☕', bucket: 'variable' },
  { id: 'transport',    label: '교통',        emoji: '🚌', bucket: 'variable' },
  { id: 'shopping',     label: '쇼핑',        emoji: '🛍️', bucket: 'variable' },
  { id: 'subscription', label: '구독',        emoji: '🔁', bucket: 'fixed' },
  { id: 'housing',      label: '주거·통신',   emoji: '🏠', bucket: 'fixed' },
  { id: 'medical',      label: '의료',        emoji: '🏥', bucket: 'irregular' },
  { id: 'event',        label: '경조사·선물', emoji: '🎁', bucket: 'irregular' },
  { id: 'leisure',      label: '여가',        emoji: '🎬', bucket: 'variable' },
  { id: 'etc',          label: '기타',        emoji: '📎', bucket: 'variable' },
];

export const BUCKET_META: Record<BudgetBucket, { label: string; desc: string }> = {
  fixed:     { label: '고정비',  desc: '구독·월세·통신 등 매달 비슷한 지출' },
  variable:  { label: '변동비',  desc: '식비·쇼핑·여가 등 이번 달에 조절 가능한 지출' },
  irregular: { label: '비정기',  desc: '경조사·의료 등 가끔 크게 나가는 지출' },
};

export interface RecurringRule {
  id: string;
  label: string;
  amount: number;
  type: EntryType;         // 보통 expense, 월급 자동 기록이면 income
  categoryId: string;
  day: number;             // 매달 며칠 (1~28로 클램프)
  method?: PayMethod;
  active: boolean;
  lastPostedMonth?: string; // 'YYYY-MM' — 이 달까지 기록 완료
  createdAt: string;
}

/** 버킷별 월 예산(원). 미설정 버킷은 undefined. */
export type LedgerBudgets = Partial<Record<BudgetBucket, number>>;

export interface LedgerSettings {
  cardBillingDay?: number; // 카드 결제일 (선택)
}

export const TYPE_META: Record<EntryType, { label: string; sign: string }> = {
  expense:  { label: '지출', sign: '-' },
  income:   { label: '수입', sign: '+' },
  transfer: { label: '이체', sign: '→' },
};
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 0 (기존 에러가 있다면 이 파일 관련 에러 0)

- [ ] **Step 3: Commit**

```bash
git add src/types/ledger.ts
git commit -m "feat(ledger): 가계부 타입·기본 카테고리 10종·3버킷 정의"
```

---

### Task 2: 한 줄 입력 로컬 파서 (`src/lib/ledger/parse.ts`) — TDD

**Files:** Create: `src/lib/ledger/parse.ts`, Test: `src/test/ledgerParse.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { parseAmountToken, parseInput } from '@/lib/ledger/parse';

const TODAY = new Date(2026, 6, 21); // 2026-07-21 (로컬)

describe('parseAmountToken', () => {
  it('일반 숫자·콤마·원 접미', () => {
    expect(parseAmountToken('4500')).toBe(4500);
    expect(parseAmountToken('4,500')).toBe(4500);
    expect(parseAmountToken('12000원')).toBe(12000);
  });
  it('축약 단위 — 천/만/조합/소수', () => {
    expect(parseAmountToken('5천')).toBe(5000);
    expect(parseAmountToken('1.5만')).toBe(15000);
    expect(parseAmountToken('3만5천')).toBe(35000);
    expect(parseAmountToken('만원')).toBe(10000);
    expect(parseAmountToken('15만')).toBe(150000);
  });
  it('금액이 아닌 토큰은 null', () => {
    expect(parseAmountToken('점심')).toBeNull();
    expect(parseAmountToken('7/19')).toBeNull();
    expect(parseAmountToken('')).toBeNull();
  });
});

describe('parseInput', () => {
  it('기본 한 건 — 오늘·카테고리·메모', () => {
    const r = parseInput('점심 김밥 4500', { today: TODAY });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ type: 'expense', amount: 4500, date: '2026-07-21', categoryId: 'food', memo: '점심 김밥' });
  });
  it('여러 건 + 상대날짜 — 어제가 이후 건에도 유지', () => {
    const r = parseInput('어제 택시 12000 커피 4500', { today: TODAY });
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ amount: 12000, date: '2026-07-20', categoryId: 'transport' });
    expect(r[1]).toMatchObject({ amount: 4500, date: '2026-07-20', categoryId: 'cafe' });
  });
  it('몰아서 입력 — 날짜 혼합', () => {
    const r = parseInput('그저께 편의점 8000 어제 점심 9000', { today: TODAY });
    expect(r[0].date).toBe('2026-07-19');
    expect(r[1].date).toBe('2026-07-20');
  });
  it('수입 감지', () => {
    const r = parseInput('월급 300만', { today: TODAY });
    expect(r[0]).toMatchObject({ type: 'income', amount: 3000000 });
  });
  it('이체 감지 — 적금은 지출이 아님', () => {
    const r = parseInput('적금 50만', { today: TODAY });
    expect(r[0].type).toBe('transfer');
  });
  it('고정지출 감지 — 매달', () => {
    const r = parseInput('넷플 17000 매달', { today: TODAY });
    expect(r[0]).toMatchObject({ categoryId: 'subscription', recurring: true });
  });
  it('결제수단·M/D 날짜', () => {
    const r = parseInput('7/15 병원 현금 30000', { today: TODAY });
    expect(r[0]).toMatchObject({ date: '2026-07-15', categoryId: 'medical', method: 'cash' });
  });
  it('학습 사전이 기본 사전보다 우선', () => {
    const r = parseInput('스벅 4500', { today: TODAY, keywordDict: { '스벅': 'cafe' } });
    expect(r[0].categoryId).toBe('cafe');
  });
  it('금액 없으면 빈 배열 (AI 폴백 신호)', () => {
    expect(parseInput('어제 뭐 샀더라', { today: TODAY })).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/ledgerParse.test.ts`
Expected: FAIL — "Cannot find module '@/lib/ledger/parse'"

- [ ] **Step 3: 파서 구현**

```ts
/**
 * 가계부 한 줄 입력 로컬 파서 — LLM 없이 90% 처리하는 게 목표.
 * 규칙: 토큰 순회하며 [날짜 컨텍스트] [메모 단어들] [금액] 을 한 건으로 묶는다.
 * 날짜 토큰은 이후 건에도 유지("어제 택시 12000 커피 4500" → 둘 다 어제).
 * 금액 없는 입력은 빈 배열 → 호출부가 AI 폴백 판단.
 */
import type { EntryType, PayMethod } from '@/types/ledger';

export interface ParsedEntry {
  type: EntryType;
  amount: number;
  date: string;        // 로컬 YMD
  categoryId: string;
  memo: string;
  method?: PayMethod;
  recurring?: boolean; // '매달/매월' — 고정지출 등록 제안
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shift = (d: Date, days: number) => { const c = new Date(d); c.setDate(c.getDate() + days); return c; };

/** '4,500' '5천' '1.5만' '3만5천' '만원' '12000원' → 원 단위 정수. 아니면 null. */
export function parseAmountToken(raw: string): number | null {
  const tok = raw.replace(/원$/, '');
  if (!tok) return null;
  if (/^\d{1,3}(,\d{3})+$/.test(tok)) return Number(tok.replace(/,/g, ''));
  if (/^\d+$/.test(tok)) return Number(tok);
  const m = tok.match(/^(\d+(?:\.\d+)?)?만(?:(\d+(?:\.\d+)?)천)?$/);
  if (m && (m[1] !== undefined || tok === '만')) {
    const man = m[1] !== undefined ? Number(m[1]) : 1;
    const chun = m[2] !== undefined ? Number(m[2]) : 0;
    return Math.round(man * 10000 + chun * 1000);
  }
  const t = tok.match(/^(\d+(?:\.\d+)?)천$/);
  if (t) return Math.round(Number(t[1]) * 1000);
  return null;
}

/** 상대날짜·M/D → YMD. 날짜 토큰이 아니면 null. */
function parseDateToken(tok: string, today: Date): string | null {
  if (tok === '오늘') return ymd(today);
  if (tok === '어제') return ymd(shift(today, -1));
  if (tok === '그제' || tok === '그저께' || tok === '엊그제') return ymd(shift(today, -2));
  const rel = tok.match(/^(\d+)일\s?전$/);
  if (rel) return ymd(shift(today, -Number(rel[1])));
  const md = tok.match(/^(\d{1,2})[/.](\d{1,2})$/);
  if (md) {
    const mo = Number(md[1]), da = Number(md[2]);
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) return ymd(new Date(today.getFullYear(), mo - 1, da));
  }
  return null;
}

const INCOME_KW = ['월급', '급여', '용돈', '보너스', '상여', '입금', '환급', '이자', '알바비', '페이백'];
const TRANSFER_KW = ['적금', '저축', '이체', '예금', '투자금', '증권'];
const METHOD_KW: Record<string, PayMethod> = { '현금': 'cash', '카드': 'card', '계좌': 'account' };

/** 기본 키워드 → 카테고리. 학습 사전(keywordDict)이 항상 우선. */
const DEFAULT_KW: Array<[string, string]> = [
  ['점심', 'food'], ['저녁', 'food'], ['아침', 'food'], ['밥', 'food'], ['식당', 'food'],
  ['김밥', 'food'], ['치킨', 'food'], ['배달', 'food'], ['야식', 'food'], ['편의점', 'food'], ['회식', 'food'],
  ['커피', 'cafe'], ['카페', 'cafe'], ['스타벅스', 'cafe'], ['디저트', 'cafe'], ['음료', 'cafe'], ['간식', 'cafe'],
  ['택시', 'transport'], ['버스', 'transport'], ['지하철', 'transport'], ['기차', 'transport'],
  ['주유', 'transport'], ['주차', 'transport'], ['톨비', 'transport'],
  ['쇼핑', 'shopping'], ['옷', 'shopping'], ['신발', 'shopping'], ['쿠팡', 'shopping'], ['다이소', 'shopping'], ['화장품', 'shopping'],
  ['넷플', 'subscription'], ['넷플릭스', 'subscription'], ['유튜브', 'subscription'], ['멜론', 'subscription'], ['구독', 'subscription'],
  ['월세', 'housing'], ['관리비', 'housing'], ['전기', 'housing'], ['가스', 'housing'], ['수도', 'housing'],
  ['통신', 'housing'], ['핸드폰', 'housing'], ['인터넷', 'housing'],
  ['병원', 'medical'], ['약국', 'medical'], ['진료', 'medical'], ['치과', 'medical'], ['약', 'medical'],
  ['축의금', 'event'], ['조의금', 'event'], ['부조', 'event'], ['선물', 'event'], ['생일', 'event'], ['생신', 'event'],
  ['영화', 'leisure'], ['노래방', 'leisure'], ['게임', 'leisure'], ['여행', 'leisure'], ['공연', 'leisure'], ['전시', 'leisure'],
];

function matchCategory(words: string[], dict?: Record<string, string>): string {
  if (dict) {
    for (const w of words) {
      for (const [kw, cat] of Object.entries(dict)) if (w.includes(kw)) return cat;
    }
  }
  for (const w of words) {
    for (const [kw, cat] of DEFAULT_KW) if (w.includes(kw)) return cat;
  }
  return 'etc';
}

export function parseInput(
  text: string,
  opts: { today: Date; keywordDict?: Record<string, string> },
): ParsedEntry[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const out: ParsedEntry[] = [];
  let curDate = ymd(opts.today);
  let words: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const d = parseDateToken(tok, opts.today);
    if (d) { curDate = d; continue; }
    const amount = parseAmountToken(tok);
    if (amount === null || amount <= 0) { words.push(tok); continue; }

    // 금액 확정 — 지금까지 모인 단어가 이 건의 메모/속성
    let recurring = false;
    if (tokens[i + 1] === '매달' || tokens[i + 1] === '매월') { recurring = true; i++; }
    let method: PayMethod | undefined;
    const memoWords = words.filter((w) => {
      if (METHOD_KW[w]) { method = METHOD_KW[w]; return false; }
      return true;
    });
    const type: EntryType = memoWords.some((w) => INCOME_KW.some((k) => w.includes(k)))
      ? 'income'
      : memoWords.some((w) => TRANSFER_KW.some((k) => w.includes(k)))
        ? 'transfer'
        : 'expense';
    out.push({
      type,
      amount,
      date: curDate,
      categoryId: type === 'expense' ? matchCategory(memoWords, opts.keywordDict) : 'etc',
      memo: memoWords.join(' '),
      method,
      recurring: recurring || undefined,
    });
    words = [];
  }
  return out;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/test/ledgerParse.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ledger/parse.ts src/test/ledgerParse.test.ts
git commit -m "feat(ledger): 한 줄 입력 로컬 파서 - 축약금액·상대날짜·다건·수입/이체/고정 감지"
```

---

### Task 3: 월 집계·예산 페이스·브리핑 (`src/lib/ledger/stats.ts`) — TDD

**Files:** Create: `src/lib/ledger/stats.ts`, Test: `src/test/ledgerStats.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { monthOf, summarizeMonth, categoryTotals, bucketSpent, budgetPace, cardCharge, dailyExpense, buildBriefing } from '@/lib/ledger/stats';
import { DEFAULT_CATEGORIES, type LedgerEntry } from '@/types/ledger';

const e = (p: Partial<LedgerEntry>): LedgerEntry => ({
  id: 'x', type: 'expense', amount: 0, date: '2026-07-01', categoryId: 'etc', memo: '', createdAt: '', ...p,
});

const ENTRIES: LedgerEntry[] = [
  e({ id: '1', type: 'income', amount: 3000000, date: '2026-07-01' }),
  e({ id: '2', amount: 10000, date: '2026-07-03', categoryId: 'food', method: 'card' }),
  e({ id: '3', amount: 40000, date: '2026-07-10', categoryId: 'food', method: 'card' }),
  e({ id: '4', type: 'transfer', amount: 500000, date: '2026-07-05' }),
  e({ id: '5', amount: 17000, date: '2026-07-15', categoryId: 'subscription' }),
  e({ id: '6', amount: 20000, date: '2026-06-20', categoryId: 'food' }),
];

describe('stats', () => {
  it('monthOf', () => { expect(monthOf('2026-07-21')).toBe('2026-07'); });
  it('summarizeMonth — 이체는 지출·수입 어느 쪽도 아님, 저축률 산출', () => {
    const s = summarizeMonth(ENTRIES, '2026-07');
    expect(s.income).toBe(3000000);
    expect(s.expense).toBe(67000);
    expect(s.transfer).toBe(500000);
    expect(s.net).toBe(3000000 - 67000);
    expect(s.savedRate).toBeCloseTo(500000 / 3000000);
  });
  it('categoryTotals — 지출만, 내림차순', () => {
    const t = categoryTotals(ENTRIES, '2026-07');
    expect(t[0]).toEqual({ categoryId: 'food', total: 50000 });
  });
  it('bucketSpent — 카테고리의 버킷으로 합산', () => {
    const b = bucketSpent(ENTRIES, '2026-07', DEFAULT_CATEGORIES);
    expect(b.variable).toBe(50000);
    expect(b.fixed).toBe(17000);
  });
  it('budgetPace — 월중 추세 투영', () => {
    // 15일까지 15만 썼고 예산 40만, 31일 달 → 예상 31만 (예산 내)
    const p = budgetPace(150000, 400000, 15, 31);
    expect(p.projected).toBe(310000);
    expect(p.over).toBe(false);
  });
  it('cardCharge — 카드 지출만', () => {
    expect(cardCharge(ENTRIES, '2026-07')).toBe(50000);
  });
  it('dailyExpense — 히트맵용 날짜별 합', () => {
    const d = dailyExpense(ENTRIES, '2026-07');
    expect(d['2026-07-03']).toBe(10000);
  });
  it('buildBriefing — 전월 대비 급증 카테고리 언급', () => {
    const lines = buildBriefing(ENTRIES, '2026-07', '2026-06', DEFAULT_CATEGORIES, {}, '2026-07-21');
    expect(lines.join(' ')).toContain('식비');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/ledgerStats.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 구현**

```ts
/**
 * 가계부 집계 — 전부 순수 함수. 이체는 지출도 수입도 아닌 제3종(저축률의 분자).
 */
import type { BudgetBucket, LedgerBudgets, LedgerCategory, LedgerEntry } from '@/types/ledger';

export const monthOf = (ymdStr: string) => ymdStr.slice(0, 7);
const inMonth = (e: LedgerEntry, month: string) => e.date.startsWith(month);

export interface MonthSummary { income: number; expense: number; transfer: number; net: number; savedRate: number | null; count: number }

export function summarizeMonth(entries: LedgerEntry[], month: string): MonthSummary {
  let income = 0, expense = 0, transfer = 0, count = 0;
  for (const e of entries) {
    if (!inMonth(e, month)) continue;
    count++;
    if (e.type === 'income') income += e.amount;
    else if (e.type === 'transfer') transfer += e.amount;
    else expense += e.amount;
  }
  return { income, expense, transfer, net: income - expense, savedRate: income > 0 ? transfer / income : null, count };
}

export function categoryTotals(entries: LedgerEntry[], month: string): Array<{ categoryId: string; total: number }> {
  const m = new Map<string, number>();
  for (const e of entries) {
    if (!inMonth(e, month) || e.type !== 'expense') continue;
    m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + e.amount);
  }
  return [...m.entries()].map(([categoryId, total]) => ({ categoryId, total })).sort((a, b) => b.total - a.total);
}

export function bucketSpent(entries: LedgerEntry[], month: string, categories: LedgerCategory[]): Record<BudgetBucket, number> {
  const bucketOf = new Map(categories.map((c) => [c.id, c.bucket]));
  const out: Record<BudgetBucket, number> = { fixed: 0, variable: 0, irregular: 0 };
  for (const e of entries) {
    if (!inMonth(e, month) || e.type !== 'expense') continue;
    out[bucketOf.get(e.categoryId) ?? 'variable'] += e.amount;
  }
  return out;
}

/** 월중 페이스 투영 — "이 속도면 월말 N원". */
export function budgetPace(spent: number, budget: number, dayOfMonth: number, daysInMonth: number) {
  const projected = dayOfMonth > 0 ? Math.round((spent / dayOfMonth) * daysInMonth) : spent;
  return { projected, over: budget > 0 && projected > budget };
}

export function cardCharge(entries: LedgerEntry[], month: string): number {
  return entries.filter((e) => inMonth(e, month) && e.type === 'expense' && e.method === 'card')
    .reduce((s, e) => s + e.amount, 0);
}

/** 히트맵용 — 날짜별 지출 합. */
export function dailyExpense(entries: LedgerEntry[], month: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) {
    if (!inMonth(e, month) || e.type !== 'expense') continue;
    out[e.date] = (out[e.date] ?? 0) + e.amount;
  }
  return out;
}

const KRW = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;

/**
 * AI 브리핑(규칙기반) — 담백한 사실형 최대 3줄. 잔소리·칭찬·이모지 금지.
 * 규칙: ① 전월 대비 1.5배↑ & 3만원↑ 급증 카테고리 ② 요일 집중(35%↑, 표본 8건↑) ③ 변동비 페이스 초과.
 */
export function buildBriefing(
  entries: LedgerEntry[], month: string, prevMonth: string,
  categories: LedgerCategory[], budgets: LedgerBudgets, todayYmd: string,
): string[] {
  const lines: string[] = [];
  const label = new Map(categories.map((c) => [c.id, c.label]));

  const cur = new Map(categoryTotals(entries, month).map((t) => [t.categoryId, t.total]));
  const prev = new Map(categoryTotals(entries, prevMonth).map((t) => [t.categoryId, t.total]));
  let top: { id: string; ratio: number; diff: number } | null = null;
  for (const [id, total] of cur) {
    const p = prev.get(id) ?? 0;
    if (p <= 0) continue;
    const ratio = total / p, diff = total - p;
    if (ratio >= 1.5 && diff >= 30000 && (!top || diff > top.diff)) top = { id, ratio, diff };
  }
  if (top) lines.push(`${label.get(top.id) ?? top.id}가 지난달의 ${top.ratio.toFixed(1)}배 (${KRW(top.diff)} 증가)`);

  const exp = entries.filter((e) => inMonth(e, month) && e.type === 'expense');
  if (exp.length >= 8) {
    const byDay = [0, 0, 0, 0, 0, 0, 0];
    let total = 0;
    for (const e of exp) {
      const [y, m, d] = e.date.split('-').map(Number);
      byDay[new Date(y, m - 1, d).getDay()] += e.amount;
      total += e.amount;
    }
    const max = Math.max(...byDay);
    if (total > 0 && max / total >= 0.35) {
      const names = ['일', '월', '화', '수', '목', '금', '토'];
      lines.push(`지출의 ${Math.round((max / total) * 100)}%가 ${names[byDay.indexOf(max)]}요일에 집중`);
    }
  }

  const vb = budgets.variable;
  if (vb && vb > 0) {
    const spent = bucketSpent(entries, month, categories).variable;
    const day = Number(todayYmd.slice(8, 10));
    const [y, m] = month.split('-').map(Number);
    const pace = budgetPace(spent, vb, day, new Date(y, m, 0).getDate());
    if (pace.over) lines.push(`이 속도면 변동비가 월말 ${KRW(pace.projected)} — 예산 ${KRW(vb)} 초과 예상`);
  }

  if (lines.length === 0) {
    const s = summarizeMonth(entries, month);
    lines.push(s.count > 0 ? `이번 달 ${s.count}건 기록 · 지출 ${KRW(s.expense)}` : '이번 달 기록이 아직 없어요');
  }
  return lines.slice(0, 3);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/test/ledgerStats.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ledger/stats.ts src/test/ledgerStats.test.ts
git commit -m "feat(ledger): 월 집계·3버킷·예산 페이스·규칙기반 브리핑"
```

---

### Task 4: 영속 스토어 (`src/services/ledgerStore.ts`) — TDD

**Files:** Create: `src/services/ledgerStore.ts`, Test: `src/test/ledgerStore.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

(vitest 환경은 jsdom — `src/test/habitStore.test.ts` 등 기존 스토어 테스트와 같은 방식으로 localStorage 사용 가능. 파일 상단에서 `localStorage.clear()`.)

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ledgerStore } from '@/services/ledgerStore';

beforeEach(() => { localStorage.clear(); });

describe('ledgerStore', () => {
  it('addEntries → listEntries 날짜 내림차순', () => {
    ledgerStore.addEntries([
      { type: 'expense', amount: 4500, date: '2026-07-20', categoryId: 'food', memo: '김밥' },
      { type: 'expense', amount: 12000, date: '2026-07-21', categoryId: 'transport', memo: '택시' },
    ]);
    const list = ledgerStore.listEntries();
    expect(list).toHaveLength(2);
    expect(list[0].date).toBe('2026-07-21');
    expect(list[0].id).toBeTruthy();
  });
  it('updateEntry / removeEntry', () => {
    ledgerStore.addEntries([{ type: 'expense', amount: 1000, date: '2026-07-21', categoryId: 'etc', memo: 'x' }]);
    const id = ledgerStore.listEntries()[0].id;
    ledgerStore.updateEntry(id, { amount: 2000, categoryId: 'food' });
    expect(ledgerStore.listEntries()[0].amount).toBe(2000);
    ledgerStore.removeEntry(id);
    expect(ledgerStore.listEntries()).toHaveLength(0);
  });
  it('duplicateEntry — 오늘 날짜로 복제', () => {
    ledgerStore.addEntries([{ type: 'expense', amount: 4500, date: '2026-01-01', categoryId: 'cafe', memo: '커피' }]);
    const id = ledgerStore.listEntries()[0].id;
    ledgerStore.duplicateEntry(id, '2026-07-21');
    const list = ledgerStore.listEntries();
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ date: '2026-07-21', amount: 4500, memo: '커피' });
  });
  it('카테고리 수정 시 키워드 학습 → getKeywordDict', () => {
    ledgerStore.addEntries([{ type: 'expense', amount: 4500, date: '2026-07-21', categoryId: 'etc', memo: '스벅 아아' }]);
    const id = ledgerStore.listEntries()[0].id;
    ledgerStore.updateEntry(id, { categoryId: 'cafe' }, { learn: true });
    expect(ledgerStore.getKeywordDict()['스벅']).toBe('cafe');
  });
  it('고정지출 — postDueRecurring 이 지난 달분까지 소급 기록, 중복 없음', () => {
    ledgerStore.addRecurring({ label: '넷플릭스', amount: 17000, type: 'expense', categoryId: 'subscription', day: 15 });
    ledgerStore.postDueRecurring('2026-07-21');
    const first = ledgerStore.listEntries();
    expect(first).toHaveLength(1); // 등록 당월(7월) 15일분
    expect(first[0]).toMatchObject({ date: '2026-07-15', amount: 17000 });
    ledgerStore.postDueRecurring('2026-07-22'); // 재호출해도 중복 기록 없음
    expect(ledgerStore.listEntries()).toHaveLength(1);
  });
  it('고정지출 — day 가 아직 안 왔으면 기록 안 함', () => {
    ledgerStore.addRecurring({ label: '월세', amount: 500000, type: 'expense', categoryId: 'housing', day: 25 });
    ledgerStore.postDueRecurring('2026-07-21');
    expect(ledgerStore.listEntries()).toHaveLength(0);
  });
  it('budgets·settings round-trip', () => {
    ledgerStore.setBudgets({ variable: 400000 });
    expect(ledgerStore.getBudgets().variable).toBe(400000);
    ledgerStore.setSettings({ cardBillingDay: 25 });
    expect(ledgerStore.getSettings().cardBillingDay).toBe(25);
  });
  it('exportJson → importJson round-trip', () => {
    ledgerStore.addEntries([{ type: 'income', amount: 100, date: '2026-07-01', categoryId: 'etc', memo: '' }]);
    ledgerStore.setBudgets({ fixed: 1 });
    const json = ledgerStore.exportJson();
    localStorage.clear();
    expect(ledgerStore.listEntries()).toHaveLength(0);
    expect(ledgerStore.importJson(json)).toBe(true);
    expect(ledgerStore.listEntries()).toHaveLength(1);
    expect(ledgerStore.getBudgets().fixed).toBe(1);
  });
  it('importJson — 깨진 JSON 은 false, 기존 데이터 보존', () => {
    ledgerStore.addEntries([{ type: 'expense', amount: 1, date: '2026-07-01', categoryId: 'etc', memo: '' }]);
    expect(ledgerStore.importJson('not json')).toBe(false);
    expect(ledgerStore.listEntries()).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/ledgerStore.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 구현**

```ts
/**
 * 가계부 영속 store — localStorage (healthStore 패턴).
 * vanilla 모듈 싱글턴, 변경 시 LEDGER_CHANGED broadcast → useLedger 자동 re-render.
 * 시드 데이터 없음(돈 데이터에 예시는 오염). 백업: exportJson/importJson.
 */
import {
  LEDGER_CHANGED,
  DEFAULT_CATEGORIES,
  type EntryType, type LedgerBudgets, type LedgerCategory, type LedgerEntry,
  type LedgerSettings, type PayMethod, type RecurringRule,
} from '@/types/ledger';
import { newId } from '@/lib/idGenerator';

const ENTRIES_KEY = 'ledger.entries.v1';
const RECURRING_KEY = 'ledger.recurring.v1';
const BUDGETS_KEY = 'ledger.budgets.v1';
const SETTINGS_KEY = 'ledger.settings.v1';
const DICT_KEY = 'ledger.dict.v1';
const CATEGORIES_KEY = 'ledger.categories.v1'; // 커스텀 추가분만 저장

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const nowIso = () => new Date().toISOString();
const isYmd = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isType = (v: unknown): v is EntryType => v === 'expense' || v === 'income' || v === 'transfer';
const isMethod = (v: unknown): v is PayMethod => v === 'card' || v === 'cash' || v === 'account';
const posInt = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null);

const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = (): string => ymd(new Date());

function normEntry(v: unknown, i: number): LedgerEntry | null {
  if (!isRecord(v)) return null;
  const amount = posInt(v.amount);
  if (!isType(v.type) || amount === null || !isYmd(v.date)) return null;
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `le_${i}`,
    type: v.type, amount, date: v.date,
    categoryId: typeof v.categoryId === 'string' && v.categoryId ? v.categoryId : 'etc',
    memo: typeof v.memo === 'string' ? v.memo : '',
    method: isMethod(v.method) ? v.method : undefined,
    groupTotal: posInt(v.groupTotal) ?? undefined,
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : nowIso(),
  };
}

function normRule(v: unknown, i: number): RecurringRule | null {
  if (!isRecord(v)) return null;
  const amount = posInt(v.amount);
  const label = typeof v.label === 'string' ? v.label.trim() : '';
  if (!label || amount === null) return null;
  const day = posInt(v.day) ?? 1;
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `lr_${i}`,
    label, amount,
    type: isType(v.type) ? v.type : 'expense',
    categoryId: typeof v.categoryId === 'string' && v.categoryId ? v.categoryId : 'subscription',
    day: Math.min(28, Math.max(1, day)),
    method: isMethod(v.method) ? v.method : undefined,
    active: v.active !== false,
    lastPostedMonth: typeof v.lastPostedMonth === 'string' && /^\d{4}-\d{2}$/.test(v.lastPostedMonth) ? v.lastPostedMonth : undefined,
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : nowIso(),
  };
}

function readArr<T>(key: string, norm: (v: unknown, i: number) => T | null): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(norm).filter((e): e is T => e !== null) : [];
  } catch { return []; }
}

function readObj<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? (parsed as T) : fallback;
  } catch { return fallback; }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(LEDGER_CHANGED));
  } catch (err) { console.error('가계부 저장 실패', err); }
}

const sortEntries = (arr: LedgerEntry[]) =>
  [...arr].sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));

export type NewEntry = Omit<LedgerEntry, 'id' | 'createdAt'>;

export const ledgerStore = {
  listEntries(): LedgerEntry[] { return sortEntries(readArr(ENTRIES_KEY, normEntry)); },

  addEntries(items: NewEntry[]): LedgerEntry[] {
    const cur = readArr(ENTRIES_KEY, normEntry);
    const added = items
      .map((it) => normEntry({ ...it, id: newId('le'), createdAt: nowIso() }, 0))
      .filter((e): e is LedgerEntry => e !== null);
    write(ENTRIES_KEY, [...cur, ...added]);
    return added;
  },

  updateEntry(id: string, patch: Partial<NewEntry>, opts?: { learn?: boolean }): void {
    const cur = readArr(ENTRIES_KEY, normEntry);
    const prev = cur.find((e) => e.id === id);
    const next = cur.map((e) => (e.id === id ? { ...e, ...patch, id: e.id, createdAt: e.createdAt } : e));
    write(ENTRIES_KEY, next);
    // 분류 수정 학습 — 메모 첫 단어를 카테고리 키워드로 (LLM 없는 자동완성 개선)
    if (opts?.learn && prev && patch.categoryId && patch.categoryId !== prev.categoryId) {
      const word = prev.memo.trim().split(/\s+/)[0];
      if (word && word.length >= 2) {
        const dict = readObj<Record<string, string>>(DICT_KEY, {});
        write(DICT_KEY, { ...dict, [word]: patch.categoryId });
      }
    }
  },

  removeEntry(id: string): void {
    write(ENTRIES_KEY, readArr(ENTRIES_KEY, normEntry).filter((e) => e.id !== id));
  },

  duplicateEntry(id: string, date: string): void {
    const src = readArr(ENTRIES_KEY, normEntry).find((e) => e.id === id);
    if (!src) return;
    this.addEntries([{ type: src.type, amount: src.amount, date, categoryId: src.categoryId, memo: src.memo, method: src.method }]);
  },

  // ── 고정지출 ──
  listRecurring(): RecurringRule[] { return readArr(RECURRING_KEY, normRule); },

  addRecurring(rule: Omit<RecurringRule, 'id' | 'createdAt' | 'active' | 'lastPostedMonth'> & { active?: boolean }): void {
    const cur = readArr(RECURRING_KEY, normRule);
    const next = normRule({ ...rule, id: newId('lr'), active: rule.active !== false, createdAt: nowIso() }, 0);
    if (next) write(RECURRING_KEY, [...cur, next]);
  },

  updateRecurring(id: string, patch: Partial<Omit<RecurringRule, 'id' | 'createdAt'>>): void {
    write(RECURRING_KEY, readArr(RECURRING_KEY, normRule).map((r) => (r.id === id ? { ...r, ...patch, id: r.id, createdAt: r.createdAt } : r)));
  },

  removeRecurring(id: string): void {
    write(RECURRING_KEY, readArr(RECURRING_KEY, normRule).filter((r) => r.id !== id));
  },

  /**
   * 도래한 고정지출을 내역에 기록 (앱 진입 시 호출).
   * 각 규칙: lastPostedMonth 다음 달부터 이번 달까지, day 가 지난 달만 기록.
   * 등록 이전 과거로는 소급하지 않음(createdAt 의 달부터).
   */
  postDueRecurring(todayYmd: string): void {
    const rules = readArr(RECURRING_KEY, normRule);
    if (!rules.length) return;
    const curMonth = todayYmd.slice(0, 7);
    const curDay = Number(todayYmd.slice(8, 10));
    const entries = readArr(ENTRIES_KEY, normEntry);
    const newEntries: LedgerEntry[] = [];
    let rulesChanged = false;

    const nextMonth = (m: string): string => {
      const [y, mo] = m.split('-').map(Number);
      return mo === 12 ? `${y + 1}-01` : `${y}-${pad(mo + 1)}`;
    };

    const updated = rules.map((r) => {
      if (!r.active) return r;
      const startMonth = r.lastPostedMonth ? nextMonth(r.lastPostedMonth) : r.createdAt.slice(0, 7);
      let m = startMonth;
      let last = r.lastPostedMonth;
      while (m <= curMonth) {
        const due = m < curMonth || r.day <= curDay;
        if (!due) break;
        newEntries.push({
          id: newId('le'), type: r.type, amount: r.amount, date: `${m}-${pad(r.day)}`,
          categoryId: r.categoryId, memo: r.label, method: r.method, createdAt: nowIso(),
        });
        last = m;
        m = nextMonth(m);
      }
      if (last !== r.lastPostedMonth) { rulesChanged = true; return { ...r, lastPostedMonth: last }; }
      return r;
    });

    if (newEntries.length) write(ENTRIES_KEY, [...entries, ...newEntries]);
    if (rulesChanged) write(RECURRING_KEY, updated);
  },

  // ── 예산·설정·사전·카테고리 ──
  getBudgets(): LedgerBudgets { return readObj<LedgerBudgets>(BUDGETS_KEY, {}); },
  setBudgets(b: LedgerBudgets): void { write(BUDGETS_KEY, b); },
  getSettings(): LedgerSettings { return readObj<LedgerSettings>(SETTINGS_KEY, {}); },
  setSettings(s: LedgerSettings): void { write(SETTINGS_KEY, s); },
  getKeywordDict(): Record<string, string> { return readObj<Record<string, string>>(DICT_KEY, {}); },

  listCategories(): LedgerCategory[] {
    const custom = readArr(CATEGORIES_KEY, (v): LedgerCategory | null => {
      if (!isRecord(v) || typeof v.id !== 'string' || typeof v.label !== 'string') return null;
      const bucket = v.bucket === 'fixed' || v.bucket === 'variable' || v.bucket === 'irregular' ? v.bucket : 'variable';
      return { id: v.id, label: v.label, emoji: typeof v.emoji === 'string' ? v.emoji : '🏷️', bucket, custom: true };
    });
    return [...DEFAULT_CATEGORIES, ...custom];
  },

  addCategory(label: string, emoji: string, bucket: LedgerCategory['bucket']): void {
    const custom = this.listCategories().filter((c) => c.custom);
    write(CATEGORIES_KEY, [...custom, { id: newId('lc'), label, emoji, bucket, custom: true }]);
  },

  // ── 백업 ──
  exportJson(): string {
    return JSON.stringify({
      version: 1,
      exportedAt: nowIso(),
      entries: readArr(ENTRIES_KEY, normEntry),
      recurring: readArr(RECURRING_KEY, normRule),
      budgets: this.getBudgets(),
      settings: this.getSettings(),
      dict: this.getKeywordDict(),
      categories: this.listCategories().filter((c) => c.custom),
    }, null, 2);
  },

  /** 전체 교체 방식. 파싱·검증 실패 시 false, 기존 데이터 보존. */
  importJson(raw: string): boolean {
    try {
      const data = JSON.parse(raw);
      if (!isRecord(data) || !Array.isArray(data.entries)) return false;
      write(ENTRIES_KEY, data.entries.map(normEntry).filter(Boolean));
      write(RECURRING_KEY, Array.isArray(data.recurring) ? data.recurring.map(normRule).filter(Boolean) : []);
      write(BUDGETS_KEY, isRecord(data.budgets) ? data.budgets : {});
      write(SETTINGS_KEY, isRecord(data.settings) ? data.settings : {});
      write(DICT_KEY, isRecord(data.dict) ? data.dict : {});
      write(CATEGORIES_KEY, Array.isArray(data.categories) ? data.categories : []);
      return true;
    } catch { return false; }
  },
};
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/test/ledgerStore.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/ledgerStore.ts src/test/ledgerStore.test.ts
git commit -m "feat(ledger): 영속 스토어 - CRUD·복제·키워드 학습·고정지출 자동기록·JSON 백업"
```

---

### Task 5: 구독 훅 + 테마 CSS

**Files:** Create: `src/hooks/useLedger.ts` · Modify: `src/index.css` (`.health-theme` 블록 뒤, `.paper-room` 앞에 삽입 — 현재 907행 근처)

- [ ] **Step 1: 훅 작성** (`src/hooks/useLedger.ts`)

```ts
/**
 * 가계부 store 구독 훅 — LEDGER_CHANGED 로 자동 re-render.
 * 마운트 시 도래한 고정지출 자동 기록. 시드 없음.
 * TDZ 주의: state → useCallback → useEffect 순서.
 */
import { useCallback, useEffect, useState } from 'react';
import { LEDGER_CHANGED, type LedgerBudgets, type LedgerCategory, type LedgerEntry, type LedgerSettings, type RecurringRule } from '@/types/ledger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';

export interface LedgerData {
  entries: LedgerEntry[];
  recurring: RecurringRule[];
  budgets: LedgerBudgets;
  settings: LedgerSettings;
  categories: LedgerCategory[];
}

export function useLedger(): LedgerData {
  const [data, setData] = useState<LedgerData>(() => ({
    entries: [], recurring: [], budgets: {}, settings: {}, categories: [],
  }));

  const refresh = useCallback(() => {
    setData({
      entries: ledgerStore.listEntries(),
      recurring: ledgerStore.listRecurring(),
      budgets: ledgerStore.getBudgets(),
      settings: ledgerStore.getSettings(),
      categories: ledgerStore.listCategories(),
    });
  }, []);

  useEffect(() => {
    ledgerStore.postDueRecurring(todayKey());
    refresh();
    window.addEventListener(LEDGER_CHANGED, refresh);
    return () => window.removeEventListener(LEDGER_CHANGED, refresh);
  }, [refresh]);

  return data;
}
```

- [ ] **Step 2: `.ledger-theme` CSS 추가** — `src/index.css` 의 `.health-theme ::selection { … }` 블록 바로 뒤에 삽입

```css
  .ledger-theme {
    /* 가계부 — 쿨 화이트 캐논 + 방 정체성은 딥 네이비 하나로 (금융·신뢰). */
    --background: 220 22% 98%;
    --foreground: 222 20% 16%;

    --card: 220 30% 99%;
    --card-foreground: 222 20% 16%;

    --popover: 220 30% 99%;
    --popover-foreground: 222 20% 16%;

    --muted: 220 16% 93%;
    --muted-foreground: 222 10% 43%;

    --accent: 221 22% 92%;
    --accent-foreground: 222 20% 16%;

    --secondary: 221 22% 92%;
    --secondary-foreground: 222 10% 36%;

    --border: 221 16% 85%;
    --input: 221 16% 85%;

    --primary: 222 20% 16%;
    --primary-foreground: 220 30% 99%;

    --ring: 222 47% 33%;
    --focus-ring: 222 50% 36%;
    --focus-offset: 220 22% 98%;

    --hairline:  221 16% 88%;
    --surface-1: 220 30% 99%;
    --surface-2: 220 22% 98%;
    --surface-3: 221 20% 94%;

    --sidebar-background: 222 26% 97%;

    /* 딥 네이비 — 유일한 강조색 (마크·CTA·활성·차트). 수입=네이비, 지출=먹색, 경고만 소량 레드. */
    --ledger-navy: 222 47% 33%;
    --ledger-red: 4 64% 48%;
  }

  .dark .ledger-theme {
    --background: 222 22% 8%;
    --foreground: 220 14% 90%;

    --card: 222 16% 13%;
    --card-foreground: 220 14% 90%;

    --popover: 222 16% 14%;
    --popover-foreground: 220 14% 90%;

    --muted: 222 12% 17%;
    --muted-foreground: 220 8% 62%;

    --accent: 222 12% 19%;
    --accent-foreground: 220 14% 90%;

    --secondary: 222 12% 17%;
    --secondary-foreground: 220 10% 75%;

    --border: 222 10% 22%;
    --input: 222 10% 22%;

    --primary: 220 14% 90%;
    --primary-foreground: 222 16% 10%;

    --ring: 221 55% 62%;
    --focus-ring: 221 57% 64%;
    --focus-offset: 222 22% 8%;

    --hairline:  222 10% 22%;
    --surface-1: 222 16% 13%;
    --surface-2: 222 12% 16%;
    --surface-3: 222 12% 19%;

    --sidebar-background: 222 16% 12%;

    --ledger-navy: 221 55% 62%;
    --ledger-red: 4 70% 62%;
  }

  .ledger-theme :is(h1, h2, h3) {
    font-family: 'Pretendard Variable', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    letter-spacing: -0.02em;
  }

  .ledger-theme ::selection {
    background-color: hsl(var(--ledger-navy) / 0.16);
  }
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 0

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useLedger.ts src/index.css
git commit -m "feat(ledger): useLedger 구독 훅 + 딥 네이비 테마 토큰"
```

---

### Task 6: LLM 폴백·질의 (`src/lib/ledger/ai.ts`)

**Files:** Create: `src/lib/ledger/ai.ts` (참고: `src/lib/archive/ai.ts` 동일 패턴, `quickAi` 재사용)

- [ ] **Step 1: 작성**

```ts
/**
 * 가계부 AI — 둘 다 온디맨드.
 *  1) aiParseEntries — 로컬 파서가 못 읽은 입력의 LLM 파싱 폴백
 *  2) aiQuery — 자연어 질의("이번 달 커피 얼마?") → 요약 데이터 기반 한 단락 답변
 * 실패 시 예외 → 호출부(ChatBar)가 안내 문구 폴백.
 */
import { quickAi, QUICK_MODEL } from '@/lib/cloudDoc/ai';
import type { ParsedEntry } from '@/lib/ledger/parse';
import type { LedgerCategory, LedgerEntry } from '@/types/ledger';
import { summarizeMonth, categoryTotals, monthOf } from '@/lib/ledger/stats';

function extractJsonArray<T>(text: string): T[] | null {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)) as T[]; } catch { return null; }
}

export async function aiParseEntries(
  input: string, todayYmd: string, categories: LedgerCategory[],
): Promise<ParsedEntry[]> {
  const catList = categories.map((c) => c.id).join(', ');
  const system =
    '너는 가계부 입력 파서다. 사용자의 자연어에서 거래를 추출해 JSON 배열만 출력한다(설명 없이). ' +
    '각 원소: {"type":"expense"|"income"|"transfer","amount":정수(원),"date":"YYYY-MM-DD","categoryId":string,"memo":string}. ' +
    `오늘은 ${todayYmd}. categoryId 는 다음 중 하나: [${catList}] (모르면 "etc"). ` +
    '적금·저축·투자 입금은 transfer, 월급·용돈은 income. 금액이 없는 문장이면 빈 배열 [].';
  const raw = await quickAi(system, input.slice(0, 500), { model: QUICK_MODEL, temperature: 0.1, maxTokens: 600 });
  const arr = extractJsonArray<Record<string, unknown>>(raw) ?? [];
  const allow = new Set(categories.map((c) => c.id));
  return arr
    .filter((e) =>
      (e.type === 'expense' || e.type === 'income' || e.type === 'transfer') &&
      typeof e.amount === 'number' && e.amount > 0 &&
      typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date))
    .map((e) => ({
      type: e.type as ParsedEntry['type'],
      amount: Math.round(e.amount as number),
      date: e.date as string,
      categoryId: typeof e.categoryId === 'string' && allow.has(e.categoryId) ? e.categoryId : 'etc',
      memo: typeof e.memo === 'string' ? e.memo : '',
    }));
}

/** 질의 — 원본 전체 대신 이번달·지난달 요약 + 최근 60건만 컨텍스트로 (토큰 절약). */
export async function aiQuery(
  question: string, entries: LedgerEntry[], categories: LedgerCategory[], todayYmd: string,
): Promise<string> {
  const month = monthOf(todayYmd);
  const [y, m] = month.split('-').map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const label = new Map(categories.map((c) => [c.id, c.label]));
  const catLine = (mo: string) =>
    categoryTotals(entries, mo).map((t) => `${label.get(t.categoryId) ?? t.categoryId} ${t.total}`).join(', ');
  const recent = entries.slice(0, 60)
    .map((e) => `${e.date} ${e.type} ${e.amount} ${label.get(e.categoryId) ?? ''} ${e.memo}`.trim())
    .join('\n');
  const s1 = summarizeMonth(entries, month);
  const s2 = summarizeMonth(entries, prev);
  const system =
    '너는 개인 가계부 데이터로 질문에 답하는 비서다. 담백한 사실형으로 2~3문장, 금액은 원 단위 콤마 표기. ' +
    '데이터에 없는 건 "기록에 없다"고 답한다. 투자·재테크 조언은 하지 않는다.';
  const user =
    `오늘: ${todayYmd}\n[이번 달 ${month}] 수입 ${s1.income} 지출 ${s1.expense} 이체 ${s1.transfer}\n` +
    `카테고리: ${catLine(month)}\n[지난달 ${prev}] 수입 ${s2.income} 지출 ${s2.expense}\n카테고리: ${catLine(prev)}\n` +
    `[최근 내역]\n${recent}\n\n[질문] ${question}`;
  return quickAi(system, user, { model: QUICK_MODEL, temperature: 0.3, maxTokens: 500 });
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 0

- [ ] **Step 3: Commit**

```bash
git add src/lib/ledger/ai.ts
git commit -m "feat(ledger): LLM 파싱 폴백 + 자연어 질의 (quickAi 재사용)"
```

---

### Task 7: AI 채팅바 (`src/components/ledger/ChatBar.tsx`)

**Files:** Create: `src/components/ledger/ChatBar.tsx`

동작: ① 입력이 질문형(`?` 포함 또는 얼마/뭐/어디/언제/왜/알려/비교 포함 & 금액 파싱 실패) → `aiQuery` 답변 카드. ② 그 외 → `parseInput` 시도 → 성공 시 즉시 저장 + 결과 칩(탭=수정 콜백) / 실패 시 `aiParseEntries` 폴백 → 그것도 실패 시 안내. ③ `recurring` 플래그 건은 저장 + "고정지출로 등록할까요?" 칩.

- [ ] **Step 1: 작성**

```tsx
/**
 * 가계부 플로팅 AI 채팅바 — 방 전체 상주.
 * 한 줄 입력(로컬 파서 우선 → LLM 폴백) + 자연어 질의. 저장 직후 결과 칩 탭 → 수정.
 */
import { useCallback, useRef, useState } from 'react';
import { ArrowUp, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseInput, type ParsedEntry } from '@/lib/ledger/parse';
import { aiParseEntries, aiQuery } from '@/lib/ledger/ai';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { TYPE_META, type LedgerCategory, type LedgerEntry } from '@/types/ledger';

const QUESTION_RE = /[?？]|얼마|알려|비교|많이 쓴|줄었|늘었/;

interface ChatBarProps {
  categories: LedgerCategory[];
  entries: LedgerEntry[];
  quickChips: Array<{ label: string; input: string }>; // 원탭 칩 (자주 쓰는 지출)
  onEdit: (id: string) => void;                         // 결과 칩 탭 → 수정 다이얼로그
  onSuggestRecurring: (e: ParsedEntry) => void;         // '매달' 감지 → 고정지출 등록 제안
}

export function ChatBar({ categories, entries, quickChips, onEdit, onSuggestRecurring }: ChatBarProps) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<LedgerEntry[]>([]); // 방금 저장한 건들 (칩)
  const [answer, setAnswer] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const catMeta = useCallback(
    (id: string) => categories.find((c) => c.id === id) ?? { label: id, emoji: '🏷️' },
    [categories],
  );

  const saveParsed = useCallback((parsed: ParsedEntry[]) => {
    const recurringOnes = parsed.filter((p) => p.recurring);
    const saved = ledgerStore.addEntries(parsed.map((p) => ({
      type: p.type, amount: p.amount, date: p.date, categoryId: p.categoryId, memo: p.memo, method: p.method,
    })));
    setAdded(saved);
    recurringOnes.forEach(onSuggestRecurring);
  }, [onSuggestRecurring]);

  const submit = useCallback(async (raw?: string) => {
    const q = (raw ?? text).trim();
    if (!q || busy) return;
    setAnswer(null); setNotice(null); setAdded([]);
    const local = parseInput(q, { today: new Date(), keywordDict: ledgerStore.getKeywordDict() });

    if (local.length > 0) { saveParsed(local); setText(''); return; }

    setBusy(true);
    try {
      if (QUESTION_RE.test(q)) {
        setAnswer(await aiQuery(q, entries, categories, todayKey()));
      } else {
        const ai = await aiParseEntries(q, todayKey(), categories);
        if (ai.length > 0) saveParsed(ai);
        else setNotice('금액을 못 찾았어요 — "점심 김밥 4500"처럼 금액과 함께 적어주세요');
      }
      setText('');
    } catch {
      setNotice('AI 연결에 실패했어요 — "점심 김밥 4500" 형식이면 AI 없이 바로 저장돼요');
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [text, busy, entries, categories, saveParsed]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-[640px]">
        {/* 답변 카드 */}
        {answer && (
          <div className="mb-2 rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-4 py-3 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{answer}</p>
              <button type="button" aria-label="닫기" onClick={() => setAnswer(null)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}
        {notice && (
          <div className="mb-2 rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-4 py-2.5 text-[13px] text-muted-foreground shadow-lg">{notice}</div>
        )}
        {/* 저장 결과 칩 — 탭하면 수정 */}
        {added.length > 0 && (
          <div className="mb-2 flex flex-wrap justify-center gap-1.5">
            {added.map((e) => (
              <button
                key={e.id} type="button" onClick={() => onEdit(e.id)}
                className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--ledger-navy)/0.3)] bg-[hsl(var(--ledger-navy)/0.08)] px-3 py-1.5 text-[12.5px] shadow-sm transition-colors hover:bg-[hsl(var(--ledger-navy)/0.15)]"
              >
                <span>{catMeta(e.categoryId).emoji}</span>
                <span className="font-medium">{e.memo || catMeta(e.categoryId).label}</span>
                <span className="tabular-nums">{TYPE_META[e.type].sign}{e.amount.toLocaleString('ko-KR')}원</span>
                <span className="text-muted-foreground">{e.date.slice(5).replace('-', '/')}</span>
              </button>
            ))}
            <span className="self-center text-[11.5px] text-muted-foreground">탭하면 수정</span>
          </div>
        )}
        {/* 원탭 칩 */}
        {quickChips.length > 0 && added.length === 0 && !answer && (
          <div className="mb-2 flex flex-wrap justify-center gap-1.5">
            {quickChips.map((c) => (
              <button key={c.label} type="button" onClick={() => submit(c.input)}
                className="rounded-full border border-[hsl(var(--hairline))] bg-[hsl(var(--card)/0.9)] px-3 py-1 text-[12px] text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground">
                {c.label}
              </button>
            ))}
          </div>
        )}
        {/* 입력바 */}
        <form
          onSubmit={(ev) => { ev.preventDefault(); void submit(); }}
          className="flex items-center gap-2 rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] py-2 pl-4 pr-2 shadow-xl"
        >
          <input
            ref={inputRef} value={text} onChange={(ev) => setText(ev.target.value)}
            placeholder='"점심 김밥 4500" 처럼 적거나, "이번 달 카페 얼마?" 라고 물어보세요'
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/70"
            aria-label="가계부 입력"
          />
          <button
            type="submit" disabled={busy || !text.trim()} aria-label="입력"
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--ledger-navy))] text-white transition-opacity',
              (busy || !text.trim()) && 'opacity-40',
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크** — `npx tsc --noEmit` → 에러 0

- [ ] **Step 3: Commit**

```bash
git add src/components/ledger/ChatBar.tsx
git commit -m "feat(ledger): 플로팅 AI 채팅바 - 로컬 파서 우선, 결과 칩 탭 수정, 질의 답변 카드"
```

---

### Task 8: 정식 입력/수정 폼 (`src/components/ledger/EntryFormDialog.tsx`)

**Files:** Create: `src/components/ledger/EntryFormDialog.tsx`

- [ ] **Step 1: 작성** — 수정 시 카테고리 변경이면 `{ learn: true }` 로 키워드 학습. 더치페이(총액) 입력 지원.

```tsx
/**
 * 가계부 정식 입력/수정 폼 — 채팅이 안 맞을 때 쓰는 상세 폼.
 * entryId 있으면 수정(카테고리 변경 시 키워드 학습), 없으면 신규.
 */
import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { TYPE_META, type EntryType, type LedgerCategory, type PayMethod } from '@/types/ledger';

interface Props {
  open: boolean;
  entryId: string | null;   // null = 신규
  categories: LedgerCategory[];
  onClose: () => void;
}

export function EntryFormDialog({ open, entryId, categories, onClose }: Props) {
  const [type, setType] = useState<EntryType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayKey());
  const [categoryId, setCategoryId] = useState('etc');
  const [memo, setMemo] = useState('');
  const [method, setMethod] = useState<PayMethod | ''>('');
  const [groupTotal, setGroupTotal] = useState('');
  const [origCategory, setOrigCategory] = useState('etc');

  useEffect(() => {
    if (!open) return;
    if (entryId) {
      const e = ledgerStore.listEntries().find((x) => x.id === entryId);
      if (e) {
        setType(e.type); setAmount(String(e.amount)); setDate(e.date);
        setCategoryId(e.categoryId); setOrigCategory(e.categoryId);
        setMemo(e.memo); setMethod(e.method ?? ''); setGroupTotal(e.groupTotal ? String(e.groupTotal) : '');
      }
    } else {
      setType('expense'); setAmount(''); setDate(todayKey()); setCategoryId('etc');
      setOrigCategory('etc'); setMemo(''); setMethod(''); setGroupTotal('');
    }
  }, [open, entryId]);

  if (!open) return null;

  const save = () => {
    const amt = Number(amount.replace(/,/g, ''));
    if (!Number.isFinite(amt) || amt <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const gt = Number(groupTotal.replace(/,/g, ''));
    const payload = {
      type, amount: Math.round(amt), date, categoryId, memo: memo.trim(),
      method: method || undefined,
      groupTotal: Number.isFinite(gt) && gt > amt ? Math.round(gt) : undefined,
    };
    if (entryId) ledgerStore.updateEntry(entryId, payload, { learn: categoryId !== origCategory });
    else ledgerStore.addEntries([payload]);
    onClose();
  };

  const remove = () => { if (entryId) { ledgerStore.removeEntry(entryId); onClose(); } };

  const field = 'w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-[13.5px] outline-none focus:border-[hsl(var(--ledger-navy))]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--background))] p-5 shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-bold">{entryId ? '내역 수정' : '내역 추가'}</h3>
          <button type="button" aria-label="닫기" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-3 flex gap-1.5">
          {(Object.keys(TYPE_META) as EntryType[]).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={cn('flex-1 rounded-lg border px-2 py-1.5 text-[13px] transition-colors',
                type === t ? 'border-transparent bg-[hsl(var(--ledger-navy))] font-semibold text-white' : 'border-[hsl(var(--input))] text-muted-foreground')}>
              {TYPE_META[t].label}
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          <div className="flex gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="금액(원)" className={field} aria-label="금액" />
            <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className={field} aria-label="날짜" />
          </div>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모 (예: 김밥천국)" className={field} aria-label="메모" />
          {type === 'expense' && (
            <div className="flex flex-wrap gap-1">
              {categories.map((c) => (
                <button key={c.id} type="button" onClick={() => setCategoryId(c.id)}
                  className={cn('rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                    categoryId === c.id ? 'border-transparent bg-[hsl(var(--ledger-navy))] text-white' : 'border-[hsl(var(--input))] text-muted-foreground')}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <select value={method} onChange={(e) => setMethod(e.target.value as PayMethod | '')} className={field} aria-label="결제수단">
              <option value="">결제수단 (선택)</option>
              <option value="card">카드</option>
              <option value="cash">현금</option>
              <option value="account">계좌이체</option>
            </select>
            {type === 'expense' && (
              <input value={groupTotal} onChange={(e) => setGroupTotal(e.target.value)} inputMode="numeric"
                placeholder="더치페이 총액 (선택)" className={field} aria-label="더치페이 총액" title="여럿이 낸 총액 — 위 금액은 내 부담액" />
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          {entryId ? (
            <button type="button" onClick={remove} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] text-[hsl(var(--ledger-red))] hover:bg-[hsl(var(--ledger-red)/0.08)]">
              <Trash2 className="h-3.5 w-3.5" /> 삭제
            </button>
          ) : <span />}
          <button type="button" onClick={save} className="rounded-xl bg-[hsl(var(--ledger-navy))] px-5 py-2 text-[13.5px] font-semibold text-white">저장</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크** — `npx tsc --noEmit` → 에러 0

- [ ] **Step 3: Commit**

```bash
git add src/components/ledger/EntryFormDialog.tsx
git commit -m "feat(ledger): 정식 입력/수정 폼 - 3타입·카테고리 칩·더치페이·키워드 학습"
```

---

### Task 9: 대시보드 뷰 (`src/components/ledger/DashboardView.tsx`)

**Files:** Create: `src/components/ledger/DashboardView.tsx`

위젯 7종: 결산 카드 / 예산 페이스 / 카테고리 도넛(SVG) / 히트맵 캘린더(금액 토글) / 다가오는 고정지출 / 카드 청구 예정액 / AI 브리핑. 차트는 Health.tsx 처럼 의존성 없는 인라인 SVG.

- [ ] **Step 1: 작성**

```tsx
/**
 * 가계부 대시보드 — 위젯 그리드. 전부 stats 순수 함수 + 인라인 SVG (차트 라이브러리 없음).
 */
import { useMemo, useState } from 'react';
import { CalendarClock, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LedgerData } from '@/hooks/useLedger';
import { todayKey } from '@/services/ledgerStore';
import {
  buildBriefing, bucketSpent, budgetPace, cardCharge, categoryTotals, dailyExpense, monthOf, summarizeMonth,
} from '@/lib/ledger/stats';
import { BUCKET_META, type BudgetBucket } from '@/types/ledger';

const KRW = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
const prevMonthOf = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

function Card({ title, right, children, className }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4', className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-muted-foreground">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

/** 카테고리 도넛 — conic 대신 SVG stroke-dasharray. */
function Donut({ data }: { data: Array<{ label: string; emoji: string; total: number }> }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  if (total === 0) return <p className="py-6 text-center text-[13px] text-muted-foreground">이번 달 지출이 아직 없어요</p>;
  const COLORS = ['hsl(var(--ledger-navy))', 'hsl(var(--ledger-navy)/0.75)', 'hsl(var(--ledger-navy)/0.55)', 'hsl(var(--ledger-navy)/0.4)', 'hsl(var(--ledger-navy)/0.28)', 'hsl(var(--muted-foreground)/0.3)'];
  const top = data.slice(0, 5);
  const rest = total - top.reduce((s, d) => s + d.total, 0);
  const segs = [...top, ...(rest > 0 ? [{ label: '그 외', emoji: '', total: rest }] : [])];
  const C = 2 * Math.PI * 40;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0">
        {segs.map((s, i) => {
          const frac = s.total / total;
          const el = (
            <circle key={s.label} cx="50" cy="50" r="40" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="14"
              strokeDasharray={`${frac * C} ${C}`} strokeDashoffset={-acc * C} transform="rotate(-90 50 50)" />
          );
          acc += frac;
          return el;
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1">
        {segs.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2 text-[12.5px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="truncate">{s.emoji} {s.label}</span>
            <span className="ml-auto tabular-nums text-muted-foreground">{Math.round((s.total / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 지출 히트맵 캘린더 — 금액 표시 토글. */
function Heatmap({ month, daily }: { month: string; daily: Record<string, number> }) {
  const [showAmount, setShowAmount] = useState(false);
  const [y, m] = month.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const firstDow = new Date(y, m - 1, 1).getDay();
  const max = Math.max(1, ...Object.values(daily));
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[10.5px] text-muted-foreground">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const key = `${month}-${String(d).padStart(2, '0')}`;
          const v = daily[key] ?? 0;
          const alpha = v === 0 ? 0 : 0.15 + 0.65 * (v / max);
          return (
            <div key={key} title={v ? `${d}일 ${KRW(v)}` : `${d}일`}
              className="flex aspect-square flex-col items-center justify-center rounded-md text-[10px] tabular-nums"
              style={{ background: v ? `hsl(var(--ledger-navy) / ${alpha.toFixed(2)})` : 'hsl(var(--muted) / 0.6)', color: alpha > 0.5 ? 'white' : undefined }}>
              <span>{d}</span>
              {showAmount && v > 0 && <span className="text-[8.5px] leading-none opacity-90">{Math.round(v / 1000)}k</span>}
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => setShowAmount((s) => !s)} className="mt-2 text-[11.5px] text-muted-foreground underline-offset-2 hover:underline">
        {showAmount ? '금액 숨기기' : '금액 표시'}
      </button>
    </div>
  );
}

export function DashboardView({ data }: { data: LedgerData }) {
  const today = todayKey();
  const month = monthOf(today);
  const prev = prevMonthOf(month);
  const { entries, budgets, recurring, settings, categories } = data;

  const sum = useMemo(() => summarizeMonth(entries, month), [entries, month]);
  const prevSum = useMemo(() => summarizeMonth(entries, prev), [entries, prev]);
  const cats = useMemo(() => {
    const meta = new Map(categories.map((c) => [c.id, c]));
    return categoryTotals(entries, month).map((t) => ({
      label: meta.get(t.categoryId)?.label ?? t.categoryId, emoji: meta.get(t.categoryId)?.emoji ?? '', total: t.total,
    }));
  }, [entries, month, categories]);
  const daily = useMemo(() => dailyExpense(entries, month), [entries, month]);
  const spent = useMemo(() => bucketSpent(entries, month, categories), [entries, month, categories]);
  const briefing = useMemo(
    () => buildBriefing(entries, month, prev, categories, budgets, today),
    [entries, month, prev, categories, budgets, today],
  );
  const card = useMemo(() => cardCharge(entries, month), [entries, month]);

  const [yy, mm] = month.split('-').map(Number);
  const daysInMonth = new Date(yy, mm, 0).getDate();
  const dayOfMonth = Number(today.slice(8, 10));

  const upcoming = recurring
    .filter((r) => r.active && r.day >= dayOfMonth)
    .sort((a, b) => a.day - b.day)
    .slice(0, 4);

  const expenseDiff = prevSum.expense > 0 ? sum.expense - prevSum.expense : null;

  return (
    <div className="grid grid-cols-1 gap-4 pb-32 xl:grid-cols-2">
      {/* ① 이번 달 결산 */}
      <Card title={`${mm}월 결산`} className="xl:col-span-2">
        <div className="grid grid-cols-3 gap-3">
          <div><p className="text-[12px] text-muted-foreground">수입</p><p className="text-[20px] font-bold tabular-nums text-[hsl(var(--ledger-navy))]">{KRW(sum.income)}</p></div>
          <div><p className="text-[12px] text-muted-foreground">지출</p><p className="text-[20px] font-bold tabular-nums">{KRW(sum.expense)}</p>
            {expenseDiff !== null && <p className={cn('text-[11.5px] tabular-nums', expenseDiff > 0 ? 'text-[hsl(var(--ledger-red))]' : 'text-muted-foreground')}>지난달 대비 {expenseDiff >= 0 ? '+' : ''}{KRW(expenseDiff)}</p>}
          </div>
          <div><p className="text-[12px] text-muted-foreground">남은 돈</p><p className={cn('text-[20px] font-bold tabular-nums', sum.net < 0 && 'text-[hsl(var(--ledger-red))]')}>{KRW(sum.net)}</p>
            {sum.savedRate !== null && sum.transfer > 0 && <p className="text-[11.5px] text-muted-foreground">저축·투자 이체 {Math.round(sum.savedRate * 100)}%</p>}
          </div>
        </div>
      </Card>

      {/* ⑦ AI 브리핑 */}
      <Card title="브리핑" className="xl:col-span-2">
        <ul className="space-y-1.5">
          {briefing.map((line) => <li key={line} className="text-[13.5px] leading-relaxed">· {line}</li>)}
        </ul>
      </Card>

      {/* ② 예산 페이스 */}
      <Card title="예산 페이스">
        {(['fixed', 'variable', 'irregular'] as BudgetBucket[]).map((b) => {
          const budget = budgets[b];
          if (!budget) return null;
          const s = spent[b];
          const pace = budgetPace(s, budget, dayOfMonth, daysInMonth);
          const pct = Math.min(100, Math.round((s / budget) * 100));
          return (
            <div key={b} className="mb-3 last:mb-0">
              <div className="mb-1 flex justify-between text-[12.5px]">
                <span>{BUCKET_META[b].label}</span>
                <span className="tabular-nums text-muted-foreground">{KRW(s)} / {KRW(budget)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                <div className={cn('h-full rounded-full', pace.over ? 'bg-[hsl(var(--ledger-red))]' : 'bg-[hsl(var(--ledger-navy))]')} style={{ width: `${pct}%` }} />
              </div>
              {pace.over && <p className="mt-1 text-[11.5px] text-[hsl(var(--ledger-red))]">이 속도면 월말 {KRW(pace.projected)}</p>}
            </div>
          );
        })}
        {!budgets.fixed && !budgets.variable && !budgets.irregular && (
          <p className="py-4 text-center text-[13px] text-muted-foreground">예산 탭에서 버킷별 월 예산을 정하면 페이스가 표시돼요</p>
        )}
      </Card>

      {/* ③ 카테고리 도넛 */}
      <Card title="어디에 썼나"><Donut data={cats} /></Card>

      {/* ④ 히트맵 캘린더 */}
      <Card title="지출 캘린더"><Heatmap month={month} daily={daily} /></Card>

      {/* ⑤+⑥ 다가오는 고정지출 · 카드 청구 */}
      <Card title="다가오는 돈">
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-[hsl(var(--surface-3))] px-3 py-2.5">
          <CreditCard className="h-4 w-4 shrink-0 text-[hsl(var(--ledger-navy))]" />
          <span className="text-[13px]">이번 달 카드 사용</span>
          <span className="ml-auto text-[14px] font-bold tabular-nums">{KRW(card)}</span>
          {settings.cardBillingDay && <span className="text-[11.5px] text-muted-foreground">{settings.cardBillingDay}일 결제</span>}
        </div>
        {upcoming.length === 0
          ? <p className="text-[12.5px] text-muted-foreground">이번 달 남은 고정지출이 없어요</p>
          : upcoming.map((r) => (
            <div key={r.id} className="flex items-center gap-2 py-1.5 text-[13px]">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{r.label}</span>
              <span className="ml-auto tabular-nums">{KRW(r.amount)}</span>
              <span className="w-9 text-right text-[11.5px] text-muted-foreground">{r.day}일</span>
            </div>
          ))}
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크** — `npx tsc --noEmit` → 에러 0

- [ ] **Step 3: Commit**

```bash
git add src/components/ledger/DashboardView.tsx
git commit -m "feat(ledger): 대시보드 위젯 7종 - 결산·브리핑·예산페이스·도넛·히트맵·고정지출·카드청구"
```

---

### Task 10: 내역 뷰 (`src/components/ledger/EntriesView.tsx`)

**Files:** Create: `src/components/ledger/EntriesView.tsx`

- [ ] **Step 1: 작성** — 월 이동, 타입 필터 칩, 날짜별 그룹, 행 클릭=수정, hover 복제/삭제.

```tsx
/**
 * 가계부 내역 — 월별 리스트. 행 클릭=수정, 복제=오늘 날짜로(후잉의 duplicate).
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { monthOf, summarizeMonth } from '@/lib/ledger/stats';
import { TYPE_META, type EntryType } from '@/types/ledger';

const KRW = (n: number) => `${n.toLocaleString('ko-KR')}원`;

export function EntriesView({ data, onEdit }: { data: LedgerData; onEdit: (id: string) => void }) {
  const [month, setMonth] = useState(() => monthOf(todayKey()));
  const [filter, setFilter] = useState<EntryType | 'all'>('all');
  const { entries, categories } = data;
  const meta = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const list = useMemo(
    () => entries.filter((e) => e.date.startsWith(month) && (filter === 'all' || e.type === filter)),
    [entries, month, filter],
  );
  const byDate = useMemo(() => {
    const m = new Map<string, typeof list>();
    for (const e of list) { const arr = m.get(e.date) ?? []; arr.push(e); m.set(e.date, arr); }
    return [...m.entries()];
  }, [list]);
  const sum = useMemo(() => summarizeMonth(entries, month), [entries, month]);

  return (
    <div className="pb-32">
      <div className="mb-4 flex items-center gap-3">
        <button type="button" aria-label="이전 달" onClick={() => shiftMonth(-1)} className="rounded-lg p-1.5 hover:bg-[hsl(var(--muted))]"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-[15px] font-bold tabular-nums">{month.replace('-', '. ')}</span>
        <button type="button" aria-label="다음 달" onClick={() => shiftMonth(1)} className="rounded-lg p-1.5 hover:bg-[hsl(var(--muted))]"><ChevronRight className="h-4 w-4" /></button>
        <span className="ml-auto text-[12.5px] tabular-nums text-muted-foreground">수입 {KRW(sum.income)} · 지출 {KRW(sum.expense)} · 이체 {KRW(sum.transfer)}</span>
      </div>

      <div className="mb-4 flex gap-1.5">
        {([['all', '전체'], ['expense', '지출'], ['income', '수입'], ['transfer', '이체']] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFilter(k)}
            className={cn('rounded-full border px-3 py-1 text-[12.5px] transition-colors',
              filter === k ? 'border-transparent bg-[hsl(var(--ledger-navy))] text-white' : 'border-[hsl(var(--input))] text-muted-foreground')}>
            {label}
          </button>
        ))}
      </div>

      {byDate.length === 0 && (
        <p className="py-16 text-center text-[13.5px] text-muted-foreground">
          이 달 기록이 없어요 — 아래 입력바에 "점심 김밥 4500"처럼 적어보세요
        </p>
      )}

      {byDate.map(([date, items]) => (
        <div key={date} className="mb-4">
          <p className="mb-1.5 text-[12px] font-semibold text-muted-foreground">
            {Number(date.slice(8, 10))}일 {['일', '월', '화', '수', '목', '금', '토'][(() => { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d).getDay(); })()]}요일
          </p>
          <div className="overflow-hidden rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]">
            {items.map((e) => (
              <div key={e.id} role="button" tabIndex={0} onClick={() => onEdit(e.id)}
                onKeyDown={(ev) => { if (ev.key === 'Enter') onEdit(e.id); }}
                className="group flex cursor-pointer items-center gap-2.5 border-b border-[hsl(var(--hairline))] px-3.5 py-2.5 last:border-b-0 hover:bg-[hsl(var(--surface-3))]">
                <span className="text-[16px]">{meta.get(e.categoryId)?.emoji ?? '📎'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px]">{e.memo || meta.get(e.categoryId)?.label || TYPE_META[e.type].label}</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {meta.get(e.categoryId)?.label}{e.method === 'card' ? ' · 카드' : e.method === 'cash' ? ' · 현금' : ''}
                    {e.groupTotal ? ` · 총 ${KRW(e.groupTotal)} 중 내 몫` : ''}
                  </p>
                </div>
                <span className={cn('tabular-nums text-[14px] font-semibold', e.type === 'income' ? 'text-[hsl(var(--ledger-navy))]' : e.type === 'transfer' ? 'text-muted-foreground' : '')}>
                  {TYPE_META[e.type].sign}{e.amount.toLocaleString('ko-KR')}
                </span>
                <span className="hidden shrink-0 gap-0.5 group-hover:flex">
                  <button type="button" aria-label="오늘로 복제" title="오늘 날짜로 복제"
                    onClick={(ev) => { ev.stopPropagation(); ledgerStore.duplicateEntry(e.id, todayKey()); }}
                    className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--muted))]"><Copy className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-label="삭제"
                    onClick={(ev) => { ev.stopPropagation(); ledgerStore.removeEntry(e.id); }}
                    className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--ledger-red)/0.1)] hover:text-[hsl(var(--ledger-red))]"><Trash2 className="h-3.5 w-3.5" /></button>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크** — `npx tsc --noEmit` → 에러 0

- [ ] **Step 3: Commit**

```bash
git add src/components/ledger/EntriesView.tsx
git commit -m "feat(ledger): 월별 내역 뷰 - 타입 필터·날짜 그룹·복제·삭제"
```

---

### Task 11: 예산 뷰 + 고정지출 뷰

**Files:** Create: `src/components/ledger/BudgetView.tsx`, `src/components/ledger/RecurringView.tsx`

- [ ] **Step 1: BudgetView 작성**

```tsx
/**
 * 예산 — Monarch식 3버킷(고정/변동/비정기). 버킷별 월 예산 입력 + 이번 달 사용 현황.
 */
import { useState } from 'react';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { bucketSpent, budgetPace, monthOf } from '@/lib/ledger/stats';
import { BUCKET_META, type BudgetBucket } from '@/types/ledger';
import { cn } from '@/lib/utils';

const KRW = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;

export function BudgetView({ data }: { data: LedgerData }) {
  const { entries, budgets, categories } = data;
  const [draft, setDraft] = useState<Record<BudgetBucket, string>>({
    fixed: budgets.fixed ? String(budgets.fixed) : '',
    variable: budgets.variable ? String(budgets.variable) : '',
    irregular: budgets.irregular ? String(budgets.irregular) : '',
  });

  const today = todayKey();
  const month = monthOf(today);
  const spent = bucketSpent(entries, month, categories);
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const dayOfMonth = Number(today.slice(8, 10));

  const save = () => {
    const toNum = (s: string) => { const n = Number(s.replace(/,/g, '')); return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined; };
    ledgerStore.setBudgets({ fixed: toNum(draft.fixed), variable: toNum(draft.variable), irregular: toNum(draft.irregular) });
  };

  return (
    <div className="max-w-[560px] space-y-4 pb-32">
      {(['fixed', 'variable', 'irregular'] as BudgetBucket[]).map((b) => {
        const budget = budgets[b];
        const s = spent[b];
        const pace = budget ? budgetPace(s, budget, dayOfMonth, daysInMonth) : null;
        const catNames = categories.filter((c) => c.bucket === b).map((c) => c.label).join(' · ');
        return (
          <section key={b} className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4">
            <div className="mb-1 flex items-baseline justify-between">
              <h3 className="text-[14.5px] font-bold">{BUCKET_META[b].label}</h3>
              <span className="text-[12px] text-muted-foreground">{BUCKET_META[b].desc}</span>
            </div>
            <p className="mb-3 text-[11.5px] text-muted-foreground">포함 카테고리: {catNames}</p>
            <div className="flex items-center gap-2">
              <input
                value={draft[b]} inputMode="numeric" placeholder="월 예산(원)" aria-label={`${BUCKET_META[b].label} 월 예산`}
                onChange={(ev) => setDraft((d) => ({ ...d, [b]: ev.target.value }))}
                onBlur={save}
                className="w-40 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-[13.5px] tabular-nums outline-none focus:border-[hsl(var(--ledger-navy))]"
              />
              <span className="text-[13px] tabular-nums text-muted-foreground">이번 달 {KRW(s)} 사용</span>
            </div>
            {budget && pace && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                  <div className={cn('h-full rounded-full', pace.over ? 'bg-[hsl(var(--ledger-red))]' : 'bg-[hsl(var(--ledger-navy))]')}
                    style={{ width: `${Math.min(100, Math.round((s / budget) * 100))}%` }} />
                </div>
                <p className={cn('mt-1.5 text-[12px] tabular-nums', pace.over ? 'text-[hsl(var(--ledger-red))]' : 'text-muted-foreground')}>
                  이 속도면 월말 {KRW(pace.projected)} {pace.over ? `— 예산 ${KRW(budget)} 초과 예상` : `(예산 ${KRW(budget)})`}
                </p>
              </div>
            )}
          </section>
        );
      })}
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        예산은 버킷 3개면 충분해요 — 카테고리별로 쪼개는 예산은 관리 부담만 늘려요. 입력 칸에서 포커스를 빼면 자동 저장됩니다.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: RecurringView 작성**

```tsx
/**
 * 고정지출 — 반복 규칙 목록 + 추가. 매달 day 일에 자동 기록(useLedger 마운트 시 소급).
 */
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore } from '@/services/ledgerStore';

const KRW = (n: number) => `${n.toLocaleString('ko-KR')}원`;

export function RecurringView({ data }: { data: LedgerData }) {
  const { recurring, categories, settings } = data;
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [categoryId, setCategoryId] = useState('subscription');
  const [billingDay, setBillingDay] = useState(settings.cardBillingDay ? String(settings.cardBillingDay) : '');

  const add = () => {
    const amt = Number(amount.replace(/,/g, ''));
    const d = Number(day);
    if (!label.trim() || !Number.isFinite(amt) || amt <= 0 || !Number.isFinite(d)) return;
    ledgerStore.addRecurring({ label: label.trim(), amount: Math.round(amt), type: 'expense', categoryId, day: Math.min(28, Math.max(1, Math.round(d))) });
    setLabel(''); setAmount(''); setDay('1');
  };

  const field = 'rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-[13.5px] outline-none focus:border-[hsl(var(--ledger-navy))]';

  return (
    <div className="max-w-[560px] space-y-4 pb-32">
      <section className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4">
        <h3 className="mb-3 text-[14px] font-bold">고정지출 추가</h3>
        <div className="flex flex-wrap gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="이름 (예: 넷플릭스)" className={cn(field, 'flex-1 min-w-[140px]')} aria-label="이름" />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="금액" className={cn(field, 'w-28')} aria-label="금액" />
          <select value={day} onChange={(e) => setDay(e.target.value)} className={field} aria-label="결제일">
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}일</option>)}
          </select>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field} aria-label="카테고리">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
          <button type="button" onClick={add} className="flex items-center gap-1 rounded-lg bg-[hsl(var(--ledger-navy))] px-3.5 py-2 text-[13px] font-semibold text-white">
            <Plus className="h-3.5 w-3.5" /> 추가
          </button>
        </div>
        <p className="mt-2 text-[11.5px] text-muted-foreground">채팅에 "넷플 17000 매달"이라고 적어도 등록을 제안해줘요. 매달 지정일에 자동으로 내역에 기록됩니다.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]">
        {recurring.length === 0 && <p className="py-10 text-center text-[13px] text-muted-foreground">등록된 고정지출이 없어요</p>}
        {recurring.map((r) => (
          <div key={r.id} className="flex items-center gap-2.5 border-b border-[hsl(var(--hairline))] px-4 py-3 last:border-b-0">
            <button
              type="button" role="switch" aria-checked={r.active} aria-label={`${r.label} 활성`}
              onClick={() => ledgerStore.updateRecurring(r.id, { active: !r.active })}
              className={cn('h-5 w-9 rounded-full p-0.5 transition-colors', r.active ? 'bg-[hsl(var(--ledger-navy))]' : 'bg-[hsl(var(--muted))]')}
            >
              <span className={cn('block h-4 w-4 rounded-full bg-white transition-transform', r.active && 'translate-x-4')} />
            </button>
            <div className="min-w-0 flex-1">
              <p className={cn('text-[13.5px]', !r.active && 'text-muted-foreground line-through')}>{r.label}</p>
              <p className="text-[11.5px] text-muted-foreground">매달 {r.day}일 · {categories.find((c) => c.id === r.categoryId)?.label ?? r.categoryId}</p>
            </div>
            <span className="tabular-nums text-[13.5px] font-semibold">{KRW(r.amount)}</span>
            <button type="button" aria-label="삭제" onClick={() => ledgerStore.removeRecurring(r.id)}
              className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--ledger-red)/0.1)] hover:text-[hsl(var(--ledger-red))]"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4">
        <h3 className="mb-2 text-[14px] font-bold">카드 결제일 (선택)</h3>
        <div className="flex items-center gap-2">
          <input value={billingDay} inputMode="numeric" placeholder="예: 25" aria-label="카드 결제일"
            onChange={(e) => setBillingDay(e.target.value)}
            onBlur={() => {
              const d = Number(billingDay);
              ledgerStore.setSettings({ ...settings, cardBillingDay: Number.isFinite(d) && d >= 1 && d <= 31 ? Math.round(d) : undefined });
            }}
            className={cn(field, 'w-24')} />
          <span className="text-[12.5px] text-muted-foreground">대시보드 "이번 달 카드 사용" 옆에 표시돼요</span>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: 타입 체크** — `npx tsc --noEmit` → 에러 0

- [ ] **Step 4: Commit**

```bash
git add src/components/ledger/BudgetView.tsx src/components/ledger/RecurringView.tsx
git commit -m "feat(ledger): 3버킷 예산 뷰 + 고정지출 관리 뷰(토글·카드 결제일)"
```

---

### Task 12: 방 셸 (`src/pages/Ledger.tsx`)

**Files:** Create: `src/pages/Ledger.tsx` (구조 참고: `src/pages/Health.tsx` 의 사이드바·마스트헤드)

- [ ] **Step 1: 작성** — 캐논 사이드바(마크+제목+부제 · 이모지 내비 · 활성=채움 알약) + 마스트헤드(제목 27px + 실데이터 부제) + 뷰 전환 + ChatBar + EntryFormDialog + '매달' 감지 시 고정지출 등록 confirm + 사이드바 푸터 JSON 백업.

```tsx
/**
 * 가계부 — 내 돈의 기록 (/ledger).
 *
 * 좌: 캐논 사이드바(마크+제목+부제 · 이모지 내비 · 백업 푸터)
 * 우: 마스트헤드(제목 + 실데이터 부제) + 뷰(대시보드·내역·예산·고정지출) + 하단 플로팅 AI 채팅바.
 *
 * 원칙: 입력이 쉬워야 한다. 죄책감 UI(스트릭·빈 날 경고) 금지. 데이터는 전부 localStorage.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Download, PiggyBank, Plus, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useLedger } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { monthOf, summarizeMonth } from '@/lib/ledger/stats';
import type { ParsedEntry } from '@/lib/ledger/parse';
import { ChatBar } from '@/components/ledger/ChatBar';
import { EntryFormDialog } from '@/components/ledger/EntryFormDialog';
import { DashboardView } from '@/components/ledger/DashboardView';
import { EntriesView } from '@/components/ledger/EntriesView';
import { BudgetView } from '@/components/ledger/BudgetView';
import { RecurringView } from '@/components/ledger/RecurringView';

type View = 'dashboard' | 'entries' | 'budget' | 'recurring';

const NAV: Array<{ id: View; label: string; emoji: string }> = [
  { id: 'dashboard', label: '대시보드', emoji: '🏠' },
  { id: 'entries',   label: '내역',     emoji: '📒' },
  { id: 'budget',    label: '예산',     emoji: '🎯' },
  { id: 'recurring', label: '고정지출', emoji: '🔁' },
];

const VIEW_TITLE: Record<View, string> = {
  dashboard: '가계부', entries: '내역', budget: '예산', recurring: '고정지출',
};

const KRW = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;

export default function Ledger() {
  const data = useLedger();
  const [view, setView] = useState<View>('dashboard');
  const [editId, setEditId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const today = todayKey();
  const month = monthOf(today);
  const sum = useMemo(() => summarizeMonth(data.entries, month), [data.entries, month]);

  const openEdit = useCallback((id: string) => { setEditId(id); setFormOpen(true); }, []);
  const openNew = useCallback(() => { setEditId(null); setFormOpen(true); }, []);

  /** 채팅에서 '매달' 감지 → 고정지출 등록 제안. */
  const suggestRecurring = useCallback((p: ParsedEntry) => {
    if (window.confirm(`"${p.memo || '이 항목'}" ${p.amount.toLocaleString('ko-KR')}원을 매달 ${Number(p.date.slice(8, 10))}일 고정지출로 등록할까요?`)) {
      ledgerStore.addRecurring({
        label: p.memo || '고정지출', amount: p.amount, type: p.type, categoryId: p.categoryId,
        day: Math.min(28, Number(p.date.slice(8, 10))), method: p.method,
      });
      toast('고정지출로 등록했어요 — 매달 자동 기록됩니다');
    }
  }, []);

  const exportBackup = useCallback(() => {
    const blob = new Blob([ledgerStore.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ledger-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const importBackup = useCallback(async (file: File) => {
    const ok = ledgerStore.importJson(await file.text());
    toast(ok ? '백업을 불러왔어요' : '백업 파일을 읽지 못했어요 — 내보내기로 만든 JSON 인지 확인해주세요');
  }, []);

  /** 원탭 칩 — 최근 30일 지출 중 같은 메모 2회↑ 상위 3개. */
  const quickChips = useMemo(() => {
    const cnt = new Map<string, { n: number; amount: number }>();
    for (const e of data.entries.slice(0, 200)) {
      if (e.type !== 'expense' || !e.memo) continue;
      const cur = cnt.get(e.memo) ?? { n: 0, amount: e.amount };
      cnt.set(e.memo, { n: cur.n + 1, amount: e.amount });
    }
    return [...cnt.entries()].filter(([, v]) => v.n >= 2).sort((a, b) => b[1].n - a[1].n).slice(0, 3)
      .map(([memo, v]) => ({ label: `${memo} ${v.amount.toLocaleString('ko-KR')}`, input: `${memo} ${v.amount}` }));
  }, [data.entries]);

  const subtitle = view === 'dashboard'
    ? <>이번 달 수입 {KRW(sum.income)} · 지출 {KRW(sum.expense)} · 내 기기에만 저장</>
    : view === 'entries' ? `이번 달 ${sum.count}건`
    : view === 'budget' ? '버킷 3개면 충분해요'
    : `규칙 ${data.recurring.filter((r) => r.active).length}개 활성`;

  return (
    <div className="ledger-theme flex h-dvh bg-background text-foreground">
      {/* ── 사이드바 (캐논) ── */}
      <aside className="hidden w-[256px] shrink-0 flex-col overflow-y-auto border-r border-[hsl(var(--hairline))] bg-[hsl(var(--sidebar-background))] px-4 pb-5 pt-4 lg:flex">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-[hsl(var(--ledger-navy)/0.25)] bg-[hsl(var(--ledger-navy)/0.12)] text-[hsl(var(--ledger-navy))]">
            <PiggyBank className="h-6 w-6" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">My Ledger</p>
            <h1 className="truncate text-[17px] font-bold leading-tight">가계부</h1>
            <p className="truncate text-[11.5px] text-muted-foreground">흐름과 잔고, 내 돈의 기록</p>
          </div>
        </div>

        <nav className="space-y-0.5" aria-label="가계부 섹션">
          {NAV.map((n) => (
            <button key={n.id} type="button" onClick={() => setView(n.id)}
              className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] transition-colors',
                view === n.id ? 'bg-[hsl(var(--ledger-navy))] font-semibold text-white' : 'hover:bg-[hsl(var(--muted))]')}>
              <span className="text-[15px]">{n.emoji}</span>{n.label}
            </button>
          ))}
        </nav>

        <button type="button" onClick={openNew}
          className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[hsl(var(--input))] px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:border-[hsl(var(--ledger-navy)/0.5)] hover:text-foreground">
          <Plus className="h-3.5 w-3.5" /> 상세 입력
        </button>

        <div className="mt-auto space-y-1 pt-6">
          <button type="button" onClick={exportBackup}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-[hsl(var(--muted))] hover:text-foreground">
            <Download className="h-3.5 w-3.5" /> JSON 백업 내보내기
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-[hsl(var(--muted))] hover:text-foreground">
            <Upload className="h-3.5 w-3.5" /> 백업 가져오기
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" aria-label="백업 파일"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void importBackup(f); e.target.value = ''; }} />
          <p className="px-2.5 pt-1 text-[10.5px] leading-relaxed text-muted-foreground/80">
            돈 기록은 내 기기에만 저장돼요 — 기기 변경 전 꼭 백업하세요.
          </p>
        </div>
      </aside>

      {/* ── 본문 ── */}
      <main className="relative min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[980px] px-5 pt-6 lg:px-8">
          <header className="mb-6">
            <h2 className="text-[27px] font-bold leading-tight">{VIEW_TITLE[view]}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>
          </header>

          {view === 'dashboard' && <DashboardView data={data} />}
          {view === 'entries' && <EntriesView data={data} onEdit={openEdit} />}
          {view === 'budget' && <BudgetView data={data} />}
          {view === 'recurring' && <RecurringView data={data} />}
        </div>

        <ChatBar
          categories={data.categories}
          entries={data.entries}
          quickChips={quickChips}
          onEdit={openEdit}
          onSuggestRecurring={suggestRecurring}
        />
      </main>

      <EntryFormDialog open={formOpen} entryId={editId} categories={data.categories} onClose={() => setFormOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크** — `npx tsc --noEmit` → 에러 0

- [ ] **Step 3: Commit**

```bash
git add src/pages/Ledger.tsx
git commit -m "feat(ledger): 방 셸 - 캐논 사이드바·마스트헤드·뷰 전환·백업·채팅바 마운트"
```

---

### Task 13: 등록 6곳 — 라우트·레일·메뉴

**Files:**
- Modify: `src/App.tsx` (lazy 목록 + Routes)
- Modify: `src/components/AppWorkspaceShell.tsx:38` (WorkspaceKey), `:49` (WORKSPACE_DESTINATIONS), `:65` (RAIL_ACCENT), `:111` (MOBILE_MORE)
- Modify: `src/components/MainModeTabs.tsx:240` (HUB_TOOLS pending 해제), `:1069` (openFav route 맵), `:2259` (허브 클릭 체인)
- Modify: `src/components/hero/ModeMenu.tsx:47` (HUB_ICONS)
- Modify: `src/components/hero/FavoriteChips.tsx:60` (route 맵)
- Modify: `src/components/WorkspaceSidebarSwitchButton.tsx:28` (WORKSPACE_LABELS)

⚠️ 각 파일에서 lucide `PiggyBank` import 기존 여부 grep 후 추가 (MainModeTabs.tsx 에는 **이미 있음** — 240행에서 사용 중, 추가 금지).

- [ ] **Step 1: App.tsx** — lazy 목록에 추가 + `/tickets` 라우트 다음 줄에 삽입

```tsx
const Ledger = lazy(() => import("./pages/Ledger"));
```
```tsx
<Route path="/ledger" element={<AppWorkspaceShell current="ledger"><Ledger /></AppWorkspaceShell>} />
```

- [ ] **Step 2: AppWorkspaceShell.tsx** — 4곳

```ts
// 38행 WorkspaceKey 에 'ledger' 추가
export type WorkspaceKey = 'today' | 'planner' | 'wiki' | 'journal' | 'career' | 'people' | 'archive' | 'health' | 'tickets' | 'ledger';
```
```ts
// WORKSPACE_DESTINATIONS 배열 tickets 다음에 (PiggyBank 를 lucide import 에 추가 — 이 파일엔 없음, grep 확인)
{ key: 'ledger', label: '가계부', to: '/ledger', icon: PiggyBank },
```
```ts
// RAIL_ACCENT 에 추가 — 딥 네이비 (라이트 기준 hsl(222 47% 33%) ≈ #2d4a7c)
ledger: '#2d4a7c',   // 가계부 — 딥 네이비
```
```ts
// MOBILE_MORE 필터 목록에 'ledger' 추가
const MOBILE_MORE = WORKSPACE_DESTINATIONS.filter((item) =>
  ['home', 'today', 'career', 'people', 'archive', 'wiki', 'health', 'tickets', 'ledger'].includes(item.key),
);
```

- [ ] **Step 3: MainModeTabs.tsx** — 3곳

```ts
// 240행 — pending 해제, 라벨 정리 (id 'ledger' 유지)
{ id: 'ledger',     label: '가계부',             desc: 'AI 한 줄 입력 · 예산 · 월 결산',  emoji: '💰', icon: PiggyBank,  tint: 'hsl(222 47% 38%)', axis: '정리' },
```
```ts
// ~1069행 openFav route 맵에 추가
const route: Record<string, string> = { today: '/today', notes: '/notes', wiki: '/wiki', planner: '/planner', journal: '/journal', career: '/career', travel: '/journal?view=travel', people: '/people', archive: '/archive', health: '/health', ticketbook: '/tickets', ledger: '/ledger', cloud: '/cloud' };
```
```ts
// ~2259행 허브 클릭 체인 — 'today' 분기 뒤에 추가
} else if (item.id === 'ledger') {
  setOpen(false);
  navigate('/ledger');
}
```

- [ ] **Step 4: ModeMenu.tsx HUB_ICONS + FavoriteChips.tsx route 맵**

```ts
// ModeMenu.tsx 47행 HUB_ICONS — PiggyBank lucide import 추가 후 (grep 확인)
ledger: PiggyBank,
```
```ts
// FavoriteChips.tsx ~69행 삼항 체인 — cloud 앞에 추가
target.hubId === 'ledger' ? '/ledger' :
```

- [ ] **Step 5: WorkspaceSidebarSwitchButton.tsx WORKSPACE_LABELS**

```ts
tickets: '티켓북',
ledger: '가계부',
```
(주의: `tickets` 가 현재 누락돼 있으면 함께 보완 — Partial Record 라 컴파일은 통과하지만 라벨이 '현재 화면'으로 뜸.)

- [ ] **Step 6: 검증**

Run: `npx tsc --noEmit` → 에러 0
Run: `npx vitest run src/test/ledgerParse.test.ts src/test/ledgerStats.test.ts src/test/ledgerStore.test.ts` → 전부 PASS

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/AppWorkspaceShell.tsx src/components/MainModeTabs.tsx src/components/hero/ModeMenu.tsx src/components/hero/FavoriteChips.tsx src/components/WorkspaceSidebarSwitchButton.tsx
git commit -m "feat(ledger): /ledger 라우트 + 레일·메가메뉴·즐겨찾기·모바일 등록 (준비 중 해제)"
```

---

### Task 14: 최종 검증

- [ ] **Step 1: 전체 테스트** — `npx vitest run` → 기존 포함 전부 PASS
- [ ] **Step 2: 타입** — `npx tsc --noEmit` → 에러 0
- [ ] **Step 3: 빌드** — `npx vite build` → 성공 (lucide 중복 import 흰화면 예방 확인)
- [ ] **Step 4: 수동 점검 체크리스트** (dev 서버는 사용자가 켜둔 것 사용, preview 도구 자발 호출 금지)
  - 메가메뉴 → 정리 축 → 가계부(흐림 해제) 클릭 → `/ledger` 진입
  - 채팅바 "점심 김밥 4500" → 칩 생성 → 칩 탭 → 수정 폼
  - "어제 택시 12000 커피 4500" → 내역 뷰에 어제 날짜 2건
  - "넷플 17000 매달" → confirm → 고정지출 목록에 등록
  - 예산 변동비 입력 → 대시보드 페이스 바 표시
  - JSON 내보내기 → 파일 다운로드 → 가져오기 → 데이터 복원
- [ ] **Step 5: Commit (잔여 수정 있으면)**

```bash
git add -A && git commit -m "fix(ledger): 1차 출시 마감 점검 수정"
```

---

## Self-Review 결과 (계획 작성 시 수행)

- 스펙 1차 범위 커버: 대시보드 위젯 ①~⑦ ✅ / 내역·복제·필터 ✅ / 3버킷 예산·페이스 ✅ / 고정지출 자동기록 ✅ / AI 채팅(로컬 파서→LLM 폴백, 질의, 결과 칩 수정, 원탭 칩, 몰아입력, 축약금액, 이체, 더치페이, 키워드 학습) ✅ / JSON 백업 ✅ / 죄책감 UI 없음(스트릭·빈 날 경고 미구현이 곧 구현) ✅ / 등록 지점 ✅
- 2차로 미룸(스펙대로): 자산·월 결산·순자산·배당·Wrapped·카테고리 커스텀 UI(store 는 `addCategory` 준비됨)
- 타입 일관성: `ParsedEntry`(parse.ts) ↔ ChatBar/ai.ts, `NewEntry`(store) ↔ 폼/뷰, `LedgerData`(useLedger) ↔ 뷰 4종 — 시그니처 일치 확인
