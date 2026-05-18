# 테스트 가이드

vitest + JSDOM 환경. 현재 누적 500+ cases.

## 🏁 빠른 시작

```bash
npm test                  # 전체 vitest run
npm run test:watch        # 변경 감지 모드
npx vitest run src/test/foo.test.ts   # 단일 파일
```

`npm run verify` = lint + typecheck + test + build + smoke.

## 📂 파일 구조

```
src/test/                 # 모든 단위·통합 테스트
  ├─ <lib>.test.ts       # lib/ 유틸용
  ├─ <store>.test.ts     # services/planner/* store
  ├─ <hook>.test.ts      # hooks/ — @testing-library/react renderHook
  └─ <agent>.test.tsx    # 컴포넌트 — @testing-library/react render
```

## 🎯 무엇을 테스트할지

✅ **반드시**:
- 순수 함수 (`lib/`) — input → output, edge case 포함
- Store API (CRUD, 도메인 일관성, sanitize)
- Custom hook 의 동작 (state transition, cleanup)
- 회귀 위험 큰 핵심 로직 (recurrence, parseNaturalLanguage, formula, pivot)

❌ **테스트 X**:
- 외부 라이브러리 (shadcn, react, etc.)
- 단순 prop forwarding 컴포넌트
- 디자인 토큰 / Tailwind 클래스

## 📝 작성 패턴

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { 대상 } from '@/lib/...';

describe('대상 — 시나리오 그룹', () => {
  beforeEach(() => {
    // 격리 — store 테스트는 window.localStorage.clear()
  });

  it('한 가지 동작 명확히', () => {
    expect(대상(입력)).toBe(기대);
  });
});
```

## 🪝 Hook 테스트

```ts
import { renderHook, act } from '@testing-library/react';

const { result, rerender, unmount } = renderHook(({ v }) => useMyHook(v), {
  initialProps: { v: 1 },
});
expect(result.current).toBe(...);
rerender({ v: 2 });
act(() => { vi.advanceTimersByTime(100); });
```

`vi.useFakeTimers()` / `vi.useRealTimers()` — 디바운스/인터벌 테스트에.

## ⚙️ Mock 패턴

```ts
import { vi } from 'vitest';

const fn = vi.fn();
fn.mockReturnValue(42);
fn.mockResolvedValue('async');
fn.mockRejectedValue(new Error('fail'));

expect(fn).toHaveBeenCalledTimes(1);
expect(fn).toHaveBeenCalledWith('arg');
```

## ⚠️ 자주 만나는 함정

- **JSDOM 한계**:
  - `File.arrayBuffer()` 미지원 → ArrayBuffer 직접 처리
  - `el.isContentEditable` 정확치 않음 → role=textbox 로 대체 테스트
  - `Clipboard API` mock 필요
- **store 격리**: 모든 store 테스트는 `beforeEach` 에서 `window.localStorage.clear()`.
- **timer**: `setTimeout` 이 있는 hook 은 `vi.useFakeTimers()` 로 결정적.
- **시간대 의존 테스트**: `new Date(2026, 4, 12)` (로컬) 사용. UTC ISO 는 timezone 변화에 취약.

## 📊 현재 커버리지 영역

- 시트: formula (50+) / pivot (19) / xlsx (17) / sparkline (16) / aiCell (12) / spill (10)
- 플래너: taskStore / habitStore / habitCheckin / taskList / goalStore / pomodoro /
  dday / streak / goalProgress / seriesEdit / recurrence / parseNaturalLanguage /
  timeKeys / taskDomain / smartLists / habitStats
- 공용 lib: formatters / clipboard / textSearch / safeJson / arrayUtils / asyncQueue /
  keyboardScope / dateFormat / url / colorUtils / csv / blob / mathUtils /
  markdownEscape / imageType / typeGuards / eventBus / idGenerator / notify (sonner wrap)
- 공용 hooks: useDebouncedValue / useEscapeKey / useLocalStorageState

## 🚧 미커버 (의도적 또는 후속)

- 시트 거대 컴포넌트 `CloudSheetEditor.tsx` 내부 핸들러 (통합 테스트 필요)
- AI 호출 / OpenRouter — mock 복잡
- d3-hierarchy 차트 렌더 — 시각 회귀는 별도 도구 필요 (playwright)

---

새 테스트 추가 후 `docs/CHANGELOG.md` 에 한 줄 메모.
