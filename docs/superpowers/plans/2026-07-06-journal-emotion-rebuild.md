# 일기 감정중심 전면 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 일기를 감정 중심 신규 데이터 모델 + 타임라인/감정캘린더/Plate 에디터로 전면 재구축하되, 룩은 앱 토큰·레일과 코히어런트하게(감정 색만 시그니처) 만든다.

**Architecture:** 신규 `DiaryEntry` 모델을 `diaryStore`(localStorage + `useSyncExternalStore`, 기존 `noteStore` 패턴 복제)에 저장. 기존 `journalStore` 데이터는 1회 무손실 마이그레이션. UI는 타임라인 피드(홈) + 감정 캘린더 + Plate 리치텍스트 에디터. 감정은 24개·5계열 카탈로그로 색·이모지 부여, 대표 감정이 카드/캘린더 색을 결정. 브리핑 위젯·플래너 드로어를 신규 스토어로 재연결.

**Tech Stack:** React 18, TypeScript, Tailwind v3, Vitest, Plate(platejs), localStorage.

**Spec:** `docs/superpowers/specs/2026-07-06-journal-emotion-rebuild-design.md`

**작업 위치:** 메인 체크아웃(`C:\Users\ygh71\OneDrive\바탕 화면\ai debate 1\expert-chat-forum`), `main` 브랜치 직접 커밋. 각 태스크 끝에 `npx tsc --noEmit` 통과 확인.

---

## File Structure

**신규**
- `src/types/diary.ts` — `DiaryEntry`, `FeelingGroup`, `Feeling`, `Weather`(재정의), 상수 이벤트명.
- `src/lib/diary/feelings.ts` — 24감정 카탈로그, 그룹 색, 조회 헬퍼.
- `src/lib/diary/diaryStore.ts` — localStorage CRUD + `useDiary` 구독 훅.
- `src/lib/diary/migrate.ts` — 기존 `journalStore` → `diaryStore` 마이그레이션.
- `src/lib/diary/throwback.ts` — "과거의 오늘" 계산.
- `src/lib/diary/diaryStats.ts` — 감정 분포·집계.
- `src/lib/diary/bodyText.ts` — Plate Value ↔ 평문(발췌·검색용).
- `src/components/diary/DiaryCard.tsx`
- `src/components/diary/DiaryTimeline.tsx`
- `src/components/diary/ThrowbackBanner.tsx`
- `src/components/diary/FeelingPicker.tsx`
- `src/components/diary/DiaryEditor.tsx`
- `src/components/diary/DiaryMoodCalendar.tsx`
- `src/components/diary/DiaryStats.tsx`
- `src/components/diary/DiaryBody.tsx` — 읽기 전용 Plate 렌더(카드 발췌는 평문, 상세는 리치).
- 테스트: `src/test/diaryStore.test.ts`, `diaryFeelings.test.ts`, `diaryMigrate.test.ts`, `diaryThrowback.test.ts`, `diaryStats.test.ts`, `diaryBodyText.test.ts`.

**교체/수정**
- `src/pages/Journal.tsx` — 전면 교체(타임라인 + 에디터 + 캘린더 셸).
- `src/hooks/useJournal.ts` — 신규 스토어로 리다이렉트하거나 폐기(소비처를 diaryStore 훅으로 이전).
- 브리핑 위젯(`src/components/briefing/widgets.tsx`), 플래너 `src/components/planner/JournalDrawer.tsx` — diaryStore 기반 갱신.

**폐기(마지막 단계)**
- 기존 `Journal.tsx` 내부 mood 1-5 UI, 활동/수면/에너지 입력, 황혼잉크 전용 스타일, 그에만 쓰이던 컴포넌트.

---

## Phase 1 — 데이터 기반 (TDD)

### Task 1: 타입 정의 `src/types/diary.ts`

**Files:**
- Create: `src/types/diary.ts`

- [ ] **Step 1: 타입 파일 작성**

```ts
import type { Value } from 'platejs';

/** 감정 계열 5종. */
export type FeelingGroup = 'joy' | 'calm' | 'sad' | 'anxious' | 'anger';

export interface Feeling {
  id: string;
  label: string;
  emoji: string;
  group: FeelingGroup;
}

export type Weather = 'sunny' | 'cloudy' | 'overcast' | 'rainy' | 'stormy' | 'snowy';

export interface DiaryPhoto {
  id: string;
  src: string; // base64 or URL
}

export interface DiaryEntry {
  id: string;
  /** 'YYYY-MM-DD' — 하루 여러 개 허용. */
  date: string;
  title?: string;
  /** 본문 — Plate Value(리치텍스트). */
  body: Value;
  /** 감정 id 다중. */
  feelings: string[];
  /** feelings 중 대표 — 카드/캘린더 색·이모지 결정. */
  primaryFeeling?: string;
  /** 대표 감정 강도. */
  intensity?: 1 | 2 | 3 | 4 | 5;
  starred?: boolean;
  photos?: DiaryPhoto[];
  tags?: string[];
  weather?: Weather;
  createdAt: string;
  updatedAt: string;
}

export const DIARY_CHANGED = 'personai:diary-changed';
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: PASS (에러 없음)

- [ ] **Step 3: Commit**

```bash
git add src/types/diary.ts
git commit -m "feat(diary): DiaryEntry 감정중심 타입 정의"
```

---

### Task 2: 감정 카탈로그 `src/lib/diary/feelings.ts`

**Files:**
- Create: `src/lib/diary/feelings.ts`
- Test: `src/test/diaryFeelings.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/test/diaryFeelings.test.ts
import { describe, it, expect } from 'vitest';
import { FEELINGS, getFeeling, feelingsByGroup, GROUP_COLOR, GROUP_LABEL } from '@/lib/diary/feelings';

describe('feelings catalog', () => {
  it('24개 감정, 5계열 각 5개 이내', () => {
    expect(FEELINGS).toHaveLength(24);
    const groups = new Set(FEELINGS.map((f) => f.group));
    expect(groups.size).toBe(5);
  });
  it('id 로 감정 조회', () => {
    expect(getFeeling('haengbok')?.group).toBe('joy');
    expect(getFeeling('nope')).toBeUndefined();
  });
  it('계열별 그룹핑 + 색·라벨 존재', () => {
    expect(feelingsByGroup('joy').length).toBeGreaterThan(0);
    expect(GROUP_COLOR.joy).toMatch(/^hsl\(/);
    expect(GROUP_LABEL.sad).toBe('슬픔');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/diaryFeelings.test.ts`
Expected: FAIL ("Cannot find module '@/lib/diary/feelings'")

- [ ] **Step 3: 구현**

```ts
// src/lib/diary/feelings.ts
import type { Feeling, FeelingGroup } from '@/types/diary';

export const GROUP_LABEL: Record<FeelingGroup, string> = {
  joy: '기쁨', calm: '평온', sad: '슬픔', anxious: '불안', anger: '분노',
};

/** 계열 시그니처 색 (앱 톤 범위 내). */
export const GROUP_COLOR: Record<FeelingGroup, string> = {
  joy: 'hsl(42 95% 55%)',
  calm: 'hsl(160 55% 45%)',
  sad: 'hsl(215 70% 58%)',
  anxious: 'hsl(265 55% 62%)',
  anger: 'hsl(6 78% 60%)',
};

export const FEELINGS: Feeling[] = [
  { id: 'haengbok', label: '행복', emoji: '😊', group: 'joy' },
  { id: 'seollem',  label: '설렘', emoji: '🥰', group: 'joy' },
  { id: 'ppudeut',  label: '뿌듯', emoji: '😌', group: 'joy' },
  { id: 'gamsa',    label: '감사', emoji: '🙏', group: 'joy' },
  { id: 'sinnam',   label: '신남', emoji: '🤩', group: 'joy' },
  { id: 'pyeongon', label: '평온', emoji: '🍃', group: 'calm' },
  { id: 'pyeonan',  label: '편안', emoji: '☺️', group: 'calm' },
  { id: 'yeoyu',    label: '여유', emoji: '🍵', group: 'calm' },
  { id: 'manjok',   label: '만족', emoji: '😋', group: 'calm' },
  { id: 'mudeon',   label: '무던', emoji: '😐', group: 'calm' },
  { id: 'seulpeum', label: '슬픔', emoji: '😢', group: 'sad' },
  { id: 'uul',      label: '우울', emoji: '😞', group: 'sad' },
  { id: 'oeroum',   label: '외로움', emoji: '🥲', group: 'sad' },
  { id: 'geurium',  label: '그리움', emoji: '🌙', group: 'sad' },
  { id: 'heotal',   label: '허탈', emoji: '😔', group: 'sad' },
  { id: 'buran',    label: '불안', emoji: '😰', group: 'anxious' },
  { id: 'chojo',    label: '초조', emoji: '😥', group: 'anxious' },
  { id: 'ginjang',  label: '긴장', emoji: '😬', group: 'anxious' },
  { id: 'duryeoum', label: '두려움', emoji: '😨', group: 'anxious' },
  { id: 'budam',    label: '부담', emoji: '😓', group: 'anxious' },
  { id: 'hwanam',   label: '화남', emoji: '😠', group: 'anger' },
  { id: 'jjajeung', label: '짜증', emoji: '😤', group: 'anger' },
  { id: 'eogul',    label: '억울', emoji: '😣', group: 'anger' },
  { id: 'dabdab',   label: '답답', emoji: '😮‍💨', group: 'anger' },
  { id: 'silmang',  label: '실망', emoji: '🙁', group: 'anger' },
];

const BY_ID = new Map(FEELINGS.map((f) => [f.id, f]));
export const getFeeling = (id?: string): Feeling | undefined => (id ? BY_ID.get(id) : undefined);
export const feelingsByGroup = (g: FeelingGroup): Feeling[] => FEELINGS.filter((f) => f.group === g);
export const GROUPS: FeelingGroup[] = ['joy', 'calm', 'sad', 'anxious', 'anger'];

/** 대표 감정 → 색(없으면 중립). */
export const feelingColor = (id?: string): string => {
  const f = getFeeling(id);
  return f ? GROUP_COLOR[f.group] : 'hsl(var(--muted-foreground))';
};
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/test/diaryFeelings.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/diary/feelings.ts src/test/diaryFeelings.test.ts
git commit -m "feat(diary): 24감정 5계열 카탈로그 + 색/조회 헬퍼"
```

---

### Task 3: 본문 평문 변환 `src/lib/diary/bodyText.ts`

**Files:**
- Create: `src/lib/diary/bodyText.ts`
- Test: `src/test/diaryBodyText.test.ts`

- [ ] **Step 1: 실패 테스트**

```ts
// src/test/diaryBodyText.test.ts
import { describe, it, expect } from 'vitest';
import { plainFromValue, valueFromPlain, emptyBody } from '@/lib/diary/bodyText';

describe('diary bodyText', () => {
  it('빈 본문', () => {
    expect(plainFromValue(emptyBody())).toBe('');
  });
  it('평문 → value → 평문 왕복', () => {
    const v = valueFromPlain('첫 줄\n둘째 줄');
    expect(plainFromValue(v)).toBe('첫 줄 둘째 줄');
  });
  it('중첩 children 텍스트 수집', () => {
    const v = [{ type: 'p', children: [{ text: '가' }, { text: '나' }] }];
    expect(plainFromValue(v as never)).toBe('가나');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/diaryBodyText.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

```ts
// src/lib/diary/bodyText.ts
import type { Value } from 'platejs';

export function emptyBody(): Value {
  return [{ type: 'p', children: [{ text: '' }] }];
}

/** 평문(줄바꿈 분리) → Plate Value(문단들). */
export function valueFromPlain(text: string): Value {
  const lines = text.split(/\r?\n/);
  const paras = lines.map((line) => ({ type: 'p', children: [{ text: line }] }));
  return (paras.length > 0 ? paras : emptyBody()) as Value;
}

/** Plate Value → 평문(발췌·검색용). */
export function plainFromValue(value: Value): string {
  const out: string[] = [];
  const walk = (nodes: unknown[]) => {
    for (const node of nodes) {
      if (node && typeof node === 'object') {
        const nd = node as { text?: string; children?: unknown[] };
        if (typeof nd.text === 'string') out.push(nd.text);
        if (Array.isArray(nd.children)) walk(nd.children);
      }
    }
  };
  walk(value as unknown[]);
  return out.join(' ').replace(/\s+/g, ' ').trim();
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/test/diaryBodyText.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/diary/bodyText.ts src/test/diaryBodyText.test.ts
git commit -m "feat(diary): Plate Value ↔ 평문 변환 유틸"
```

---

### Task 4: 저장소 `src/lib/diary/diaryStore.ts`

**Files:**
- Create: `src/lib/diary/diaryStore.ts`
- Test: `src/test/diaryStore.test.ts`

패턴: `src/lib/notes/noteStore.ts`(localStorage + `useSyncExternalStore`)와 동일.

- [ ] **Step 1: 실패 테스트**

```ts
// src/test/diaryStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { listEntries, addEntry, updateEntry, removeEntry, getEntry, listByDate, toggleStar } from '@/lib/diary/diaryStore';
import { emptyBody } from '@/lib/diary/bodyText';

beforeEach(() => window.localStorage.clear());

describe('diaryStore', () => {
  it('추가/조회/날짜필터', () => {
    const e = addEntry({ date: '2026-07-06', body: emptyBody(), feelings: ['haengbok'], primaryFeeling: 'haengbok' });
    expect(getEntry(e.id)?.primaryFeeling).toBe('haengbok');
    expect(listByDate('2026-07-06')).toHaveLength(1);
    expect(listEntries()).toHaveLength(1);
  });
  it('수정/별표/삭제', () => {
    const e = addEntry({ date: '2026-07-06', body: emptyBody(), feelings: [] });
    updateEntry(e.id, { title: '제목' });
    expect(getEntry(e.id)?.title).toBe('제목');
    toggleStar(e.id);
    expect(getEntry(e.id)?.starred).toBe(true);
    removeEntry(e.id);
    expect(getEntry(e.id)).toBeUndefined();
  });
  it('최신 업데이트 우선 정렬', () => {
    const a = addEntry({ date: '2026-07-01', body: emptyBody(), feelings: [] });
    const b = addEntry({ date: '2026-07-05', body: emptyBody(), feelings: [] });
    updateEntry(a.id, { title: 'touched' });
    expect(listEntries()[0].id).toBe(a.id); // updatedAt 최신
    expect(b.id).toBeDefined();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/diaryStore.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

```ts
// src/lib/diary/diaryStore.ts
import { useSyncExternalStore } from 'react';
import type { DiaryEntry } from '@/types/diary';
import { DIARY_CHANGED } from '@/types/diary';
import { emptyBody } from '@/lib/diary/bodyText';

const STORAGE_KEY = 'personai.diary.v1';
const uid = () => (crypto.randomUUID?.() ?? String(Date.now() + Math.random()));

function readAll(): DiaryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

function writeAll(entries: DiaryEntry[]): void {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* quota */ }
  window.dispatchEvent(new CustomEvent(DIARY_CHANGED));
}

/** updatedAt 최신순. */
export function listEntries(): DiaryEntry[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function getEntry(id: string): DiaryEntry | undefined {
  return readAll().find((e) => e.id === id);
}
export function listByDate(date: string): DiaryEntry[] {
  return readAll().filter((e) => e.date === date);
}

export function addEntry(input: Partial<DiaryEntry> & { date: string }): DiaryEntry {
  const now = new Date().toISOString();
  const entry: DiaryEntry = {
    id: uid(),
    date: input.date,
    title: input.title,
    body: input.body ?? emptyBody(),
    feelings: input.feelings ?? [],
    primaryFeeling: input.primaryFeeling,
    intensity: input.intensity,
    starred: input.starred ?? false,
    photos: input.photos ?? [],
    tags: input.tags ?? [],
    weather: input.weather,
    createdAt: now,
    updatedAt: now,
  };
  writeAll([entry, ...readAll()]);
  return entry;
}

export function updateEntry(id: string, patch: Partial<Omit<DiaryEntry, 'id' | 'createdAt'>>): void {
  const all = readAll();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
  writeAll(all);
}
export function removeEntry(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id));
}
export function toggleStar(id: string): void {
  const e = getEntry(id);
  if (e) updateEntry(id, { starred: !e.starred });
}

/** 마이그레이션 등 내부용 — 통째 교체(정렬 유지 X). */
export function _seed(entries: DiaryEntry[]): void { writeAll(entries); }

/* ── 구독 훅 ── */
function subscribe(cb: () => void) {
  window.addEventListener(DIARY_CHANGED, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(DIARY_CHANGED, cb);
    window.removeEventListener('storage', cb);
  };
}
let snap: DiaryEntry[] = [];
let key = '';
function getSnapshot(): DiaryEntry[] {
  const list = listEntries();
  const k = list.map((e) => `${e.id}:${e.updatedAt}`).join('|');
  if (k !== key) { key = k; snap = list; }
  return snap;
}
export function useDiary(): DiaryEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => snap);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/test/diaryStore.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/diary/diaryStore.ts src/test/diaryStore.test.ts
git commit -m "feat(diary): diaryStore(localStorage + useSyncExternalStore) CRUD"
```

---

### Task 5: 마이그레이션 `src/lib/diary/migrate.ts`

**Files:**
- Create: `src/lib/diary/migrate.ts`
- Test: `src/test/diaryMigrate.test.ts`

기존 `journalStore`(`journal.entries.v1`) → `diaryStore`(`personai.diary.v1`). `personai.diary.migrated` 플래그로 1회만.

- [ ] **Step 1: 실패 테스트**

```ts
// src/test/diaryMigrate.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { migrateJournalToDiary } from '@/lib/diary/migrate';
import { listEntries } from '@/lib/diary/diaryStore';
import { plainFromValue } from '@/lib/diary/bodyText';

beforeEach(() => window.localStorage.clear());

describe('migrateJournalToDiary', () => {
  it('mood → 대표감정 매핑 + 본문 변환 + 필드 보존', () => {
    const old = [{
      id: 'a', date: '2026-06-01', body: '옛 일기\n둘째 줄', bodyFormat: 'plain',
      mood: 5, tags: ['여행'], weather: 'sunny',
      images: [{ id: 'i1', src: 'data:x' }],
      activities: ['run'], sleepHours: 7, energy: 4,
      createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z',
    }];
    window.localStorage.setItem('journal.entries.v1', JSON.stringify(old));

    migrateJournalToDiary();

    const migrated = listEntries();
    expect(migrated).toHaveLength(1);
    const e = migrated[0];
    expect(e.primaryFeeling).toBe('haengbok'); // mood 5
    expect(e.feelings).toContain('haengbok');
    expect(plainFromValue(e.body)).toBe('옛 일기 둘째 줄');
    expect(e.tags).toEqual(['여행']);
    expect(e.weather).toBe('sunny');
    expect(e.photos?.[0].src).toBe('data:x');
    expect(window.localStorage.getItem('personai.diary.migrated')).toBe('1');
  });

  it('플래그 있으면 재실행 안 함', () => {
    window.localStorage.setItem('personai.diary.migrated', '1');
    window.localStorage.setItem('journal.entries.v1', JSON.stringify([{ id: 'x', date: '2026-01-01', body: 'y', createdAt: '', updatedAt: '' }]));
    migrateJournalToDiary();
    expect(listEntries()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/diaryMigrate.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

```ts
// src/lib/diary/migrate.ts
import type { DiaryEntry } from '@/types/diary';
import { _seed, listEntries } from '@/lib/diary/diaryStore';
import { valueFromPlain } from '@/lib/diary/bodyText';

const OLD_KEY = 'journal.entries.v1';
const FLAG = 'personai.diary.migrated';

/** mood 1-5 → 대표 감정 + 강도. */
const MOOD_MAP: Record<number, { feeling: string; intensity: 1 | 2 | 3 | 4 | 5 }> = {
  1: { feeling: 'seulpeum', intensity: 4 },
  2: { feeling: 'uul', intensity: 3 },
  3: { feeling: 'mudeon', intensity: 3 },
  4: { feeling: 'manjok', intensity: 3 },
  5: { feeling: 'haengbok', intensity: 4 },
};

interface OldEntry {
  id: string; date: string; body: string;
  mood?: number; tags?: string[];
  images?: { id: string; src: string }[];
  weather?: DiaryEntry['weather'];
  createdAt: string; updatedAt: string;
}

export function migrateJournalToDiary(): void {
  if (typeof window === 'undefined') return;
  if (window.localStorage.getItem(FLAG) === '1') return;
  let old: OldEntry[] = [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(OLD_KEY) || '[]');
    if (Array.isArray(raw)) old = raw;
  } catch { /* ignore */ }

  const migrated: DiaryEntry[] = old.map((o) => {
    const m = o.mood ? MOOD_MAP[o.mood] : undefined;
    return {
      id: o.id,
      date: o.date,
      body: valueFromPlain(o.body ?? ''),
      feelings: m ? [m.feeling] : [],
      primaryFeeling: m?.feeling,
      intensity: m?.intensity,
      starred: false,
      photos: o.images ?? [],
      tags: o.tags ?? [],
      weather: o.weather,
      createdAt: o.createdAt || new Date().toISOString(),
      updatedAt: o.updatedAt || new Date().toISOString(),
    };
  });

  // 기존 diary 가 이미 있으면 앞에 유지(중복 방지: id 기준).
  const existing = listEntries();
  const existingIds = new Set(existing.map((e) => e.id));
  const merged = [...existing, ...migrated.filter((e) => !existingIds.has(e.id))];
  _seed(merged);
  window.localStorage.setItem(FLAG, '1');
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/test/diaryMigrate.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/diary/migrate.ts src/test/diaryMigrate.test.ts
git commit -m "feat(diary): journalStore→diaryStore 무손실 마이그레이션"
```

---

### Task 6: Throwback + Stats 유틸

**Files:**
- Create: `src/lib/diary/throwback.ts`, `src/lib/diary/diaryStats.ts`
- Test: `src/test/diaryThrowback.test.ts`, `src/test/diaryStats.test.ts`

- [ ] **Step 1: 실패 테스트 (throwback)**

```ts
// src/test/diaryThrowback.test.ts
import { describe, it, expect } from 'vitest';
import { throwbackEntries } from '@/lib/diary/throwback';
import type { DiaryEntry } from '@/types/diary';

const mk = (date: string): DiaryEntry => ({ id: date, date, body: [], feelings: [], createdAt: '', updatedAt: '' });

describe('throwbackEntries', () => {
  it('같은 월-일, 과거 연도만', () => {
    const all = [mk('2025-07-06'), mk('2024-07-06'), mk('2026-07-06'), mk('2025-07-05')];
    const res = throwbackEntries(all, new Date('2026-07-06T09:00:00'));
    expect(res.map((e) => e.date)).toEqual(['2025-07-06', '2024-07-06']);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/test/diaryThrowback.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현 (throwback)**

```ts
// src/lib/diary/throwback.ts
import type { DiaryEntry } from '@/types/diary';

/** 오늘과 같은 MM-DD 이면서 과거 연도인 엔트리(최근 연도순). */
export function throwbackEntries(all: DiaryEntry[], today = new Date()): DiaryEntry[] {
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const y = today.getFullYear();
  return all
    .filter((e) => {
      const [ey, em, ed] = e.date.split('-');
      return em === mm && ed === dd && Number(ey) < y;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/test/diaryThrowback.test.ts`
Expected: PASS

- [ ] **Step 5: 실패 테스트 (stats)**

```ts
// src/test/diaryStats.test.ts
import { describe, it, expect } from 'vitest';
import { groupDistribution, monthEntries } from '@/lib/diary/diaryStats';
import type { DiaryEntry } from '@/types/diary';

const mk = (date: string, primary?: string): DiaryEntry => ({ id: date + (primary ?? ''), date, body: [], feelings: primary ? [primary] : [], primaryFeeling: primary, createdAt: '', updatedAt: '' });

describe('diaryStats', () => {
  it('이달 엔트리 필터', () => {
    const all = [mk('2026-07-01', 'haengbok'), mk('2026-06-30', 'uul')];
    expect(monthEntries(all, 2026, 7)).toHaveLength(1);
  });
  it('계열 분포 집계', () => {
    const all = [mk('2026-07-01', 'haengbok'), mk('2026-07-02', 'seollem'), mk('2026-07-03', 'uul')];
    const dist = groupDistribution(all);
    expect(dist.joy).toBe(2);
    expect(dist.sad).toBe(1);
    expect(dist.anger).toBe(0);
  });
});
```

- [ ] **Step 6: 실패 확인**

Run: `npx vitest run src/test/diaryStats.test.ts`
Expected: FAIL

- [ ] **Step 7: 구현 (stats)**

```ts
// src/lib/diary/diaryStats.ts
import type { DiaryEntry, FeelingGroup } from '@/types/diary';
import { getFeeling, GROUPS } from '@/lib/diary/feelings';

export function monthEntries(all: DiaryEntry[], year: number, month1: number): DiaryEntry[] {
  const mm = String(month1).padStart(2, '0');
  const prefix = `${year}-${mm}`;
  return all.filter((e) => e.date.startsWith(prefix));
}

/** 대표 감정 기준 계열별 카운트. */
export function groupDistribution(entries: DiaryEntry[]): Record<FeelingGroup, number> {
  const dist = Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<FeelingGroup, number>;
  for (const e of entries) {
    const f = getFeeling(e.primaryFeeling);
    if (f) dist[f.group] += 1;
  }
  return dist;
}
```

- [ ] **Step 8: 통과 확인**

Run: `npx vitest run src/test/diaryStats.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/diary/throwback.ts src/lib/diary/diaryStats.ts src/test/diaryThrowback.test.ts src/test/diaryStats.test.ts
git commit -m "feat(diary): throwback(과거의 오늘) + 감정 분포 통계 유틸"
```

---

## Phase 2 — 읽기 UI (타임라인)

### Task 7: `DiaryBody` (읽기 전용 Plate 렌더) + `DiaryCard`

**Files:**
- Create: `src/components/diary/DiaryBody.tsx`, `src/components/diary/DiaryCard.tsx`

- [ ] **Step 1: DiaryBody 작성** — `NoteEditor`의 plugin 조립을 재사용하되 `readOnly`.

```tsx
// src/components/diary/DiaryBody.tsx
import { Plate, usePlateEditor } from 'platejs/react';
import type { Value } from 'platejs';
import { Editor, EditorContainer } from '@/components/plate/ui/editor';
import { BasicNodesKit } from '@/components/plate/editor/plugins/basic-nodes-kit';
import { ListKit } from '@/components/plate/editor/plugins/list-kit';
import { LinkKit } from '@/components/plate/editor/plugins/link-kit';
import { MediaKit } from '@/components/plate/editor/plugins/media-kit';

/** 읽기 전용 본문 렌더(상세 보기용). 카드 발췌는 plainFromValue 사용. */
export function DiaryBody({ value }: { value: Value }) {
  const editor = usePlateEditor({
    plugins: [...BasicNodesKit, ...ListKit, ...LinkKit, ...MediaKit],
    value,
    readOnly: true,
  });
  return (
    <Plate editor={editor}>
      <EditorContainer>
        <Editor variant="none" readOnly className="px-0" />
      </EditorContainer>
    </Plate>
  );
}
```

> 구현 시 `Editor`의 실제 prop(`variant`, `readOnly`)은 `src/components/plate/ui/editor.tsx`를 열어 확인하고 맞춘다.

- [ ] **Step 2: DiaryCard 작성** — 대표감정 색 띠 + 이모지 + 발췌 + 감정칩 + 별표.

```tsx
// src/components/diary/DiaryCard.tsx
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiaryEntry } from '@/types/diary';
import { getFeeling, feelingColor } from '@/lib/diary/feelings';
import { plainFromValue } from '@/lib/diary/bodyText';

interface Props { entry: DiaryEntry; onClick: () => void; onToggleStar: () => void; }

export function DiaryCard({ entry, onClick, onToggleStar }: Props) {
  const primary = getFeeling(entry.primaryFeeling);
  const color = feelingColor(entry.primaryFeeling);
  const excerpt = plainFromValue(entry.body).slice(0, 140);
  const day = entry.date.slice(8, 10);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full gap-3 rounded-xl border border-[hsl(var(--hairline))] bg-card px-4 py-3 text-left transition-colors hover:bg-accent/40"
    >
      <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl" style={{ backgroundColor: color }} />
      <div className="flex flex-col items-center pt-0.5">
        <span className="text-[20px] leading-none">{primary?.emoji ?? '📝'}</span>
        <span className="mt-1 text-[11px] tabular-nums text-muted-foreground">{day}일</span>
      </div>
      <div className="min-w-0 flex-1">
        {entry.title && <div className="truncate text-[14px] font-semibold text-foreground">{entry.title}</div>}
        <p className="line-clamp-2 text-[12.5px] leading-5 text-muted-foreground">{excerpt || '(내용 없음)'}</p>
        {entry.feelings.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {entry.feelings.slice(0, 4).map((id) => {
              const f = getFeeling(id);
              if (!f) return null;
              return <span key={id} className="rounded-full bg-accent px-1.5 py-0.5 text-[10.5px] text-foreground/70">{f.emoji} {f.label}</span>;
            })}
          </div>
        )}
      </div>
      <span
        role="button" tabIndex={0}
        onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onToggleStar(); } }}
        className={cn('shrink-0 self-start rounded p-1', entry.starred ? 'text-amber-400' : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100')}
        aria-label="별표"
      >
        <Star className={cn('h-4 w-4', entry.starred && 'fill-amber-400')} />
      </span>
    </button>
  );
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/diary/DiaryBody.tsx src/components/diary/DiaryCard.tsx
git commit -m "feat(diary): DiaryCard(대표감정 색·이모지·발췌·별표) + 읽기 본문"
```

---

### Task 8: `ThrowbackBanner` + `DiaryTimeline`

**Files:**
- Create: `src/components/diary/ThrowbackBanner.tsx`, `src/components/diary/DiaryTimeline.tsx`

- [ ] **Step 1: ThrowbackBanner**

```tsx
// src/components/diary/ThrowbackBanner.tsx
import type { DiaryEntry } from '@/types/diary';
import { getFeeling } from '@/lib/diary/feelings';

export function ThrowbackBanner({ entries, onOpen }: { entries: DiaryEntry[]; onOpen: (id: string) => void }) {
  if (entries.length === 0) return null;
  const y = new Date().getFullYear();
  return (
    <div className="mb-3 rounded-xl border border-[hsl(var(--hairline))] bg-accent/30 px-4 py-3">
      <div className="mb-1.5 text-[12px] font-semibold text-foreground/80">📅 과거의 오늘</div>
      <div className="flex flex-col gap-1">
        {entries.map((e) => (
          <button key={e.id} type="button" onClick={() => onOpen(e.id)} className="flex items-center gap-2 rounded-md px-1 py-0.5 text-left text-[12.5px] hover:bg-accent">
            <span>{getFeeling(e.primaryFeeling)?.emoji ?? '📝'}</span>
            <span className="text-muted-foreground">{y - Number(e.date.slice(0, 4))}년 전</span>
            <span className="min-w-0 flex-1 truncate text-foreground/80">{e.title || e.date}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: DiaryTimeline** — 월별 그룹 + throwback + streak + 카드 리스트. 필터 상태는 상위(Journal.tsx)에서 주입.

```tsx
// src/components/diary/DiaryTimeline.tsx
import { useMemo } from 'react';
import type { DiaryEntry } from '@/types/diary';
import { DiaryCard } from './DiaryCard';
import { ThrowbackBanner } from './ThrowbackBanner';
import { throwbackEntries } from '@/lib/diary/throwback';

interface Props {
  entries: DiaryEntry[];          // 필터 적용된 목록(최신순)
  allEntries: DiaryEntry[];       // throwback 계산용 전체
  streak: number;
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
}

export function DiaryTimeline({ entries, allEntries, streak, onOpen, onToggleStar }: Props) {
  const throwbacks = useMemo(() => throwbackEntries(allEntries), [allEntries]);
  const byMonth = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const e of entries) {
      const key = e.date.slice(0, 7); // YYYY-MM
      (map.get(key) ?? map.set(key, []).get(key)!).push(e);
    }
    return [...map.entries()];
  }, [entries]);

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6 sm:px-6">
      {streak > 0 && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[12.5px] font-semibold text-amber-600">
          🔥 {streak}일 연속
        </div>
      )}
      <ThrowbackBanner entries={throwbacks} onOpen={onOpen} />
      {byMonth.length === 0 && (
        <p className="py-16 text-center text-[13px] text-muted-foreground">아직 기록이 없어요. 오늘 감정을 남겨보세요.</p>
      )}
      {byMonth.map(([month, list]) => (
        <section key={month} className="mb-5">
          <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {month.replace('-', '년 ')}월
          </h2>
          <div className="space-y-2">
            {list.map((e) => (
              <DiaryCard key={e.id} entry={e} onClick={() => onOpen(e.id)} onToggleStar={() => onToggleStar(e.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/diary/ThrowbackBanner.tsx src/components/diary/DiaryTimeline.tsx
git commit -m "feat(diary): 타임라인 피드(월별 그룹·throwback·streak)"
```

---

## Phase 3 — 에디터

### Task 9: `FeelingPicker`

**Files:**
- Create: `src/components/diary/FeelingPicker.tsx`

다중 선택 + 대표 지정(선택된 것 중 클릭 시 대표 토글) + 강도 슬라이더.

- [ ] **Step 1: 구현**

```tsx
// src/components/diary/FeelingPicker.tsx
import { cn } from '@/lib/utils';
import { GROUPS, GROUP_LABEL, GROUP_COLOR, feelingsByGroup } from '@/lib/diary/feelings';

interface Props {
  feelings: string[];
  primary?: string;
  intensity?: 1 | 2 | 3 | 4 | 5;
  onChange: (patch: { feelings?: string[]; primary?: string; intensity?: 1 | 2 | 3 | 4 | 5 }) => void;
}

export function FeelingPicker({ feelings, primary, intensity = 3, onChange }: Props) {
  const toggle = (id: string) => {
    const has = feelings.includes(id);
    const next = has ? feelings.filter((f) => f !== id) : [...feelings, id];
    // 대표 처리: 없으면 첫 선택을 대표로, 대표 해제 시 남은 것 중 첫째로.
    let nextPrimary = primary;
    if (!has && !primary) nextPrimary = id;
    if (has && primary === id) nextPrimary = next[0];
    onChange({ feelings: next, primary: nextPrimary });
  };
  return (
    <div className="space-y-3">
      {GROUPS.map((g) => (
        <div key={g}>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GROUP_COLOR[g] }} /> {GROUP_LABEL[g]}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {feelingsByGroup(g).map((f) => {
              const on = feelings.includes(f.id);
              const isPrimary = primary === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggle(f.id)}
                  onDoubleClick={() => on && onChange({ primary: f.id })}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                    on ? 'border-transparent text-white' : 'border-[hsl(var(--hairline))] text-foreground/70 hover:bg-accent',
                    isPrimary && 'ring-2 ring-offset-1',
                  )}
                  style={on ? { backgroundColor: GROUP_COLOR[g] } : undefined}
                  title={on ? '더블클릭 = 대표 감정' : undefined}
                >
                  {f.emoji} {f.label}{isPrimary ? ' ★' : ''}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {feelings.length > 0 && (
        <label className="flex items-center gap-2 pt-1 text-[12px] text-muted-foreground">
          강도
          <input type="range" min={1} max={5} value={intensity} onChange={(e) => onChange({ intensity: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })} className="flex-1" />
          <span className="w-4 text-center tabular-nums">{intensity}</span>
        </label>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 + Commit**

Run: `npx tsc --noEmit` → PASS

```bash
git add src/components/diary/FeelingPicker.tsx
git commit -m "feat(diary): FeelingPicker(다중선택·대표·강도)"
```

---

### Task 10: `DiaryEditor`

**Files:**
- Create: `src/components/diary/DiaryEditor.tsx`

Plate 본문(NoteEditor 재사용 가능하면 재사용) + FeelingPicker + 제목/태그/날씨/별표/프롬프트. 디바운스 자동저장은 상위(Journal.tsx)에서 처리하고, 여기선 값+onChange만.

- [ ] **Step 1: 구현** — `NoteEditor`를 본문 에디터로 재사용.

```tsx
// src/components/diary/DiaryEditor.tsx
import { useState } from 'react';
import type { Value } from 'platejs';
import type { DiaryEntry } from '@/types/diary';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { FeelingPicker } from './FeelingPicker';

interface Props {
  entry: DiaryEntry;
  onPatch: (patch: Partial<DiaryEntry>) => void;
}

export function DiaryEditor({ entry, onPatch }: Props) {
  const [tagDraft, setTagDraft] = useState('');
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6 sm:px-6">
      <input
        defaultValue={entry.title ?? ''}
        onChange={(e) => onPatch({ title: e.target.value })}
        placeholder="제목 (선택)"
        className="w-full bg-transparent text-[20px] font-bold text-foreground outline-none placeholder:text-muted-foreground/40"
      />
      <div className="my-3 rounded-xl border border-[hsl(var(--hairline))] bg-card p-3">
        <FeelingPicker
          feelings={entry.feelings}
          primary={entry.primaryFeeling}
          intensity={entry.intensity}
          onChange={(p) => onPatch({
            ...(p.feelings !== undefined ? { feelings: p.feelings } : {}),
            ...(p.primary !== undefined ? { primaryFeeling: p.primary } : {}),
            ...(p.intensity !== undefined ? { intensity: p.intensity } : {}),
          })}
        />
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {(entry.tags ?? []).map((t) => (
          <span key={t} className="rounded-full bg-accent px-2 py-0.5 text-[11px]">
            #{t}
            <button type="button" className="ml-1 text-muted-foreground" onClick={() => onPatch({ tags: (entry.tags ?? []).filter((x) => x !== t) })}>×</button>
          </span>
        ))}
        <input
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && tagDraft.trim()) {
              onPatch({ tags: [...new Set([...(entry.tags ?? []), tagDraft.trim()])] });
              setTagDraft('');
            }
          }}
          placeholder="태그 추가"
          className="bg-transparent text-[12px] outline-none"
        />
      </div>
      <NoteEditor
        key={entry.id}
        initialValue={entry.body as Value}
        onChange={(v) => onPatch({ body: v })}
        placeholder="오늘 하루를 적어보세요…"
      />
    </div>
  );
}
```

> 사진 첨부는 Plate MediaKit(본문 내 이미지)로 대체. 별도 `JournalImagePicker` 재사용이 필요하면 후속 태스크로.

- [ ] **Step 2: 타입 체크 + Commit**

Run: `npx tsc --noEmit` → PASS

```bash
git add src/components/diary/DiaryEditor.tsx
git commit -m "feat(diary): DiaryEditor(Plate 본문 + 감정/제목/태그)"
```

---

## Phase 4 — 감정 캘린더 + 통계

### Task 11: `DiaryMoodCalendar`

**Files:**
- Create: `src/components/diary/DiaryMoodCalendar.tsx`

월 그리드, 각 날 = 그날 첫 엔트리 대표감정 색.

- [ ] **Step 1: 구현**

```tsx
// src/components/diary/DiaryMoodCalendar.tsx
import { useMemo } from 'react';
import type { DiaryEntry } from '@/types/diary';
import { feelingColor } from '@/lib/diary/feelings';

interface Props { entries: DiaryEntry[]; year: number; month1: number; onPickDate: (date: string) => void; }

export function DiaryMoodCalendar({ entries, year, month1, onPickDate }: Props) {
  const colorByDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) if (!map.has(e.date)) map.set(e.date, feelingColor(e.primaryFeeling));
    return map;
  }, [entries]);
  const first = new Date(year, month1 - 1, 1);
  const days = new Date(year, month1, 0).getDate();
  const lead = first.getDay();
  const cells: (string | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => `${year}-${String(month1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  ];
  return (
    <div className="grid grid-cols-7 gap-1">
      {cells.map((d, i) => d === null ? <div key={i} /> : (
        <button
          key={d}
          type="button"
          onClick={() => onPickDate(d)}
          className="flex aspect-square items-center justify-center rounded-md text-[11px] text-foreground/70 hover:ring-1 hover:ring-primary/40"
          style={{ backgroundColor: colorByDate.has(d) ? colorByDate.get(d) : 'hsl(var(--accent))' }}
        >
          <span className={colorByDate.has(d) ? 'font-semibold text-white' : ''}>{Number(d.slice(8))}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 + Commit**

```bash
git add src/components/diary/DiaryMoodCalendar.tsx
git commit -m "feat(diary): 감정 캘린더(그날 대표감정 색)"
```

---

### Task 12: `DiaryStats`

**Files:**
- Create: `src/components/diary/DiaryStats.tsx`

- [ ] **Step 1: 구현** — 이달 계열 분포 바 + 작성일수 + streak.

```tsx
// src/components/diary/DiaryStats.tsx
import type { DiaryEntry } from '@/types/diary';
import { GROUPS, GROUP_LABEL, GROUP_COLOR } from '@/lib/diary/feelings';
import { groupDistribution, monthEntries } from '@/lib/diary/diaryStats';

export function DiaryStats({ entries, year, month1, streak }: { entries: DiaryEntry[]; year: number; month1: number; streak: number }) {
  const month = monthEntries(entries, year, month1);
  const dist = groupDistribution(month);
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  const days = new Set(month.map((e) => e.date)).size;
  return (
    <div className="space-y-3 rounded-xl border border-[hsl(var(--hairline))] bg-card p-4">
      <div className="flex gap-4 text-[12.5px]">
        <div><span className="font-bold text-foreground">{days}</span><span className="text-muted-foreground">일 기록</span></div>
        <div><span className="font-bold text-amber-600">{streak}</span><span className="text-muted-foreground">일 연속</span></div>
      </div>
      <div>
        <div className="mb-1 text-[11px] font-semibold text-muted-foreground">이달의 감정</div>
        <div className="flex h-3 overflow-hidden rounded-full">
          {GROUPS.map((g) => dist[g] > 0 && (
            <div key={g} style={{ width: `${(dist[g] / total) * 100}%`, backgroundColor: GROUP_COLOR[g] }} title={`${GROUP_LABEL[g]} ${dist[g]}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 + Commit**

```bash
git add src/components/diary/DiaryStats.tsx
git commit -m "feat(diary): 감정 분포·연속 통계 패널"
```

---

## Phase 5 — 페이지 조립 · 통합 · 정리

### Task 13: `Journal.tsx` 전면 교체

**Files:**
- Modify(교체): `src/pages/Journal.tsx`

기존 내부를 새 컴포넌트로 대체. 셸: 좌측 리스트/타임라인 + 우측 에디터(선택 시). 필터 상태·디바운스 자동저장·마이그레이션 트리거 포함.

- [ ] **Step 1: 새 Journal 페이지 작성** — 아래 골격으로 교체.

```tsx
// src/pages/Journal.tsx (요지 — 실제 구현 시 앱 레이아웃/토큰에 맞춤)
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DiaryEntry } from '@/types/diary';
import { useDiary, addEntry, updateEntry, removeEntry, toggleStar, getEntry } from '@/lib/diary/diaryStore';
import { migrateJournalToDiary } from '@/lib/diary/migrate';
import { plainFromValue } from '@/lib/diary/bodyText';
import { DiaryTimeline } from '@/components/diary/DiaryTimeline';
import { DiaryEditor } from '@/components/diary/DiaryEditor';
import { DiaryMoodCalendar } from '@/components/diary/DiaryMoodCalendar';
import { DiaryStats } from '@/components/diary/DiaryStats';
import { useJournalStreak } from '@/hooks/useJournalStreak';

export default function Journal() {
  useEffect(() => { migrateJournalToDiary(); }, []);
  const entries = useDiary();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const active = activeId ? getEntry(activeId) : undefined;

  // streak: 기존 훅은 {date} 배열만 사용 → DiaryEntry 그대로 호환.
  const streak = useJournalStreak(entries as unknown as { date: string }[]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? entries.filter((e) => `${e.title ?? ''} ${plainFromValue(e.body)}`.toLowerCase().includes(q)) : entries;
  }, [entries, query]);

  const saveTimer = useRef<number | null>(null);
  const patch = (id: string, p: Partial<DiaryEntry>) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => updateEntry(id, p), 400);
  };

  const newToday = () => {
    const e = addEntry({ date: new Date().toISOString().slice(0, 10) });
    setActiveId(e.id);
  };

  // 레이아웃: 좌 타임라인/캘린더/통계, 우 에디터 — 앱 레일 안(AppWorkspaceShell current="journal")에서 렌더.
  return (
    <div className="flex h-dvh">
      <div className="min-w-0 flex-1 overflow-y-auto">
        {active ? (
          <DiaryEditor entry={active} onPatch={(p) => patch(active.id, p)} />
        ) : (
          <DiaryTimeline entries={filtered} allEntries={entries} streak={streak} onOpen={setActiveId} onToggleStar={toggleStar} />
        )}
      </div>
      {/* TODO(구현): 우측 사이드에 DiaryMoodCalendar + DiaryStats, 상단 검색/새 기록 버튼, 뒤로가기 */}
    </div>
  );
}
```

> 구현 시: 검색 입력, "오늘 기록" 버튼, 에디터에서 목록으로 돌아가기, 삭제(확인) 배치. `DiaryMoodCalendar`/`DiaryStats`는 우측 패널 또는 타임라인 상단 탭으로. 라우트는 `App.tsx`의 `/journal`(AppWorkspaceShell current="journal") 그대로 사용.

- [ ] **Step 2: 라우트 확인** — `App.tsx`에서 `Journal` lazy import 경로 유지되는지 확인(`export default`).

- [ ] **Step 3: 타입 체크 + 빌드**

Run: `npx tsc --noEmit && npx vite build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/Journal.tsx
git commit -m "feat(diary): Journal 페이지 감정중심 타임라인+에디터로 교체"
```

---

### Task 14: 브리핑 위젯 재연결

**Files:**
- Modify: `src/components/briefing/widgets.tsx` (일기 위젯 부분)

- [ ] **Step 1:** 기존 `useJournal`/`journalStore` 참조를 `useDiary`(또는 `listByDate`)로 교체하고, 표시를 `mood` → `primaryFeeling` 이모지+발췌로 변경. `getFeeling(primaryFeeling)?.emoji` 사용.

- [ ] **Step 2:** 타입 체크 → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/briefing/widgets.tsx
git commit -m "feat(diary): 데일리 브리핑 일기 위젯 diaryStore 연결"
```

---

### Task 15: 플래너 JournalDrawer 재연결

**Files:**
- Modify: `src/components/planner/JournalDrawer.tsx`

- [ ] **Step 1:** `journalStore`/`useJournal` → `diaryStore`(`useDiary`, `listByDate`, `addEntry`). mood UI 제거, primaryFeeling 이모지 표시. 새 기록은 `addEntry({ date })` 후 `/journal` 이동 또는 인라인.

- [ ] **Step 2:** 타입 체크 → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/planner/JournalDrawer.tsx
git commit -m "feat(diary): 플래너 일기 드로어 diaryStore 연결"
```

---

### Task 16: 구 일기 코드 정리

**Files:**
- Delete/정리: 구 `journalStore` 소비처가 모두 이전됐는지 확인 후, 미사용된 구 파일 제거.

- [ ] **Step 1: 잔여 참조 스캔**

Run:
```bash
grep -rln "@/services/journalStore\|useJournal\b\|from '@/hooks/useJournal'\|types/journal'" src/ | grep -v "diary"
```
Expected: 목록에 남은 파일들을 확인. 각 파일이 여전히 필요한지 판단.

- [ ] **Step 2:** 완전히 대체된 구 파일만 삭제(`services/journalStore.ts`, `hooks/useJournal.ts`, `lib/journalMarkdown.ts`, `lib/journalWeek.ts`, `components/journal/*` 중 미사용분, 구 `types/journal.ts` 중 미참조 타입). **`useJournalStreak`·`journalPrompts`·이미지 피커는 재사용하므로 유지.** 삭제 전 각 파일 `grep` 로 참조 0 확인.

- [ ] **Step 3: 빌드 + 전체 테스트**

Run: `npx tsc --noEmit && npx vite build && npx vitest run`
Expected: 빌드 PASS. 신규 diary 테스트 전부 PASS. (기존에 실패하던 테스트 외 신규 실패 0)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(diary): 구 일기 코드 정리(대체된 store/hook/컴포넌트 제거)"
```

---

### Task 17: 최종 검증 · 푸시

- [ ] **Step 1:** `npx tsc --noEmit` → PASS
- [ ] **Step 2:** `npx eslint src/pages/Journal.tsx src/components/diary src/lib/diary` → 0 error
- [ ] **Step 3:** `npx vite build` → PASS
- [ ] **Step 4:** `npx vitest run` → 신규 diary 테스트 전부 통과, 신규 실패 0 (기존 실패 목록과 대조)
- [ ] **Step 5:** `git push origin main`

---

## Self-Review 결과 (스펙 대비)

- **데이터 모델(신규 DiaryEntry)** → Task 1 ✓
- **감정 24·5계열 + 색** → Task 2 ✓
- **diaryStore(localStorage)** → Task 4 ✓
- **무손실 마이그레이션** → Task 5 ✓
- **타임라인 피드 + throwback + streak** → Task 6·8 ✓
- **감정 캘린더** → Task 11 ✓
- **Plate 에디터 + 감정 피커(다중·대표·강도)** → Task 9·10 ✓
- **통계** → Task 6·12 ✓
- **별표/태그/검색 필터** → Card(별표)·Editor(태그)·Journal(검색) ✓
- **브리핑·플래너 재연결** → Task 14·15 ✓
- **구 코드 정리(mood/활동/수면/에너지/황혼잉크 폐기)** → Task 16 ✓
- **앱 코히어런트 룩** → 전 컴포넌트가 hsl(var) 토큰·공통 카드/헤어라인 사용, 감정 색만 시그니처 ✓

미해결 애매점(구현 중 결정): 사진 첨부를 Plate MediaKit로 통합할지 별도 피커 유지할지 — MVP는 MediaKit(본문 내 이미지)로, 필요 시 후속.
