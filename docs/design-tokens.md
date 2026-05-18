# Personai 디자인 토큰 가이드

**버전**: 2026-04 · **브랜치**: `design/remodel`

이 문서는 Personai 의 디자인 일관성을 위한 공식 토큰 체계입니다. 새 컴포넌트를 작성하거나 기존 요소를 수정할 때 이 값을 **반드시** 사용하세요. 토큰에 없는 값을 쓰려면 먼저 이 문서를 업데이트하는 PR 을 내주세요.

---

## 1. 색상 토큰 (`src/index.css` `:root`)

### 1-1. 시맨틱 기본
| 토큰 | 용도 |
|---|---|
| `--background` | 앱 쉘 전체 배경 |
| `--foreground` | 기본 텍스트 |
| `--card` / `--card-foreground` | 카드 컨테이너 |
| `--muted` / `--muted-foreground` | 비활성·보조 텍스트 |
| `--primary` / `--primary-foreground` | 메인 CTA |
| `--secondary` / `--secondary-foreground` | 서브 CTA, 토글 off |
| `--accent` / `--accent-foreground` | 호버·선택 하이라이트 |
| `--destructive` | 경고·삭제 |
| `--border` / `--hairline` | 테두리 (`hairline` 이 더 얇은 구분선) |
| `--surface-1` / `--surface-2` | 깊이 표현용 배경 2단 |
| `--focus-ring` | 포커스 링 HSL 값 |

### 1-2. 모드 시그니처 (Phase A)
각 메인 모드별 시그니처 컬러. 헤더·아이콘·그라데이션에 사용.

| 토큰 | 모드 |
|---|---|
| `--mode-general` | 일반 채팅 |
| `--mode-multi` | 멀티 AI |
| `--mode-debate-a` | 토론 / 브레인스토밍 |
| `--mode-simulation` | 이해관계자 |
| `--mode-premium` | 프리미엄 자문 |
| `--mode-research` | 심층 리서치 |
| `--mode-assistant` | 어시스턴트 / 번역 |
| `--mode-study` | 공부 노트북 |

**사용 예**:
```tsx
<div className="text-[hsl(var(--mode-research))]">...</div>
<div className="bg-[hsl(var(--mode-premium)/0.1)] border-[hsl(var(--mode-premium))]">...</div>
```

---

## 2. 타이포그래피

### 2-1. 폰트 패밀리
- `font-sans` (기본): Pretendard / system-ui
- `font-display`: 세리프 · 히어로 제목 전용
- `font-mono`: 코드·단축키·에디토리얼 라벨

### 2-2. 사이즈 스케일 (한정)
| 토큰 | px | 용도 |
|---|---|---|
| `text-[9.5px]` ~ `text-[10px]` | 9.5–10 | 라벨 · 단축키 · kbd |
| `text-[10.5px]` ~ `text-[11.5px]` | 10.5–11.5 | 보조 메타 · 배지 |
| `text-[12px]` ~ `text-[13px]` | 12–13 | 본문 · 리스트 아이템 |
| `text-sm` / `text-[14px]` | 14 | 섹션 제목 (작은) |
| `text-base` / `text-[15px]` | 15–16 | 기본 본문 (긴 글) |
| `text-lg` ~ `text-xl` | 18–20 | 서브 제목 |
| `text-2xl` / `text-[22px]` | 22–24 | 모달 · 섹션 헤더 |
| `text-[26px]` / `text-[28px]` | 26–28 | 모드 히어로 (모바일) |
| `text-[32px]` | 32 | 모드 히어로 (데스크탑) |

**금지**: 7px, 8px, 9px, 17px, 19px, 21px, 25px, 30px — 위 스케일에 없는 값은 리뷰 거절.

### 2-3. tracking (자간)
- 제목: `tracking-[-0.02em]` ~ `tracking-[-0.025em]`
- 에디토리얼 라벨: `tracking-[0.18em]` ~ `tracking-[0.22em]` (uppercase 전용)
- 본문: 기본 (0)

---

## 3. 간격 (spacing)

**8-point grid**. Tailwind 기본 스케일만 사용.

| 클래스 | px | 주 용도 |
|---|---|---|
| `gap-1` / `p-1` | 4 | 아이콘 간 타이트 |
| `gap-1.5` / `p-1.5` | 6 | 칩 내부 |
| `gap-2` / `p-2` | 8 | 카드 내부 패딩 (작은) |
| `gap-2.5` / `p-2.5` | 10 | 리스트 아이템 |
| `gap-3` / `p-3` | 12 | 기본 카드 패딩 |
| `gap-3.5` / `p-3.5` | 14 | 강조 카드 |
| `gap-4` / `p-4` | 16 | 섹션 내부 |
| `gap-5` / `p-5` | 20 | (드묾) |
| `gap-6` / `p-6` | 24 | 모달·페이지 수준 |
| `gap-8` | 32 | 큰 섹션 간 |

**금지**: 임의값 (`p-[13px]`, `gap-[9px]` 등) — 굳이 써야 하면 PR 에서 사유 명시.

---

## 4. border-radius

| 클래스 | px | 용도 |
|---|---|---|
| `rounded-md` | 6 | 아이콘 박스, kbd |
| `rounded-lg` | 8 | 버튼, 입력 |
| `rounded-xl` | 12 | 카드 (작은) |
| `rounded-2xl` | 16 | 카드 (일반) — **가장 많이 씀** |
| `rounded-[22px]` | 22 | 큰 모달 |
| `rounded-full` | 9999 | 뱃지, 토글, 원형 |

**권장**: 2xl 을 기본, sm/md/lg 는 내부 요소에 한정. xl 과 2xl 혼용은 시각 노이즈이므로 한 컴포넌트 안에서는 둘 중 하나만.

---

## 5. shadow

| 클래스 | 용도 |
|---|---|
| `shadow-sm` | 기본 카드 (정적) |
| `shadow-md` | 호버 상승 (hover 상태) |
| `shadow-lg` | 드롭다운, 팝오버 |
| `shadow-[0_18px_60px_hsl(220_20%_5%_/_0.35)]` | ⌘K 팔레트 전용 |
| `shadow-2xl` | 모달 전용 |

**금지**: `shadow-xl` (shadow-lg 와 차이가 모호함).

---

## 6. 애니메이션

### 6-1. duration
- `duration-150` ~ `duration-200`: 호버·포커스
- `duration-300`: 탭 전환, 페이드
- `duration-500` ~ `duration-700`: 페이지 전환, 모드 스위프

### 6-2. easing
- 기본: `ease-out`
- 진입: `ease-[cubic-bezier(0.2,0.8,0.2,1)]`

### 6-3. reduced-motion
`@media (prefers-reduced-motion: reduce)` 전역 규칙이 `src/index.css` 에 있음 — 모든 애니메이션이 0.01ms 로 축소됨. 새 애니메이션 추가 시 별도 처리 불필요.

---

## 7. 포커스 링

모든 인터랙티브 요소는 `focus-visible` 시 자동으로 `outline: 2px solid hsl(var(--focus-ring))` + `outline-offset: 2px` 가 적용됩니다 (`src/index.css` 전역 규칙). 별도 스타일 금지.

커스텀이 필요하면:
```css
.my-button:focus-visible {
  outline: 2px solid hsl(var(--focus-ring));
  outline-offset: 2px;
}
```

---

## 8. 아이콘

- 라이브러리: `lucide-react`
- 기본 크기: `h-4 w-4` (16px)
- 작은 버튼 내부: `h-3.5 w-3.5` (14px)
- 아주 작은 인디케이터: `h-3 w-3` (12px)
- 모드 히어로: `h-5 w-5` (20px)
- 스트로크: 기본 2, 얇게 쓸 땐 `strokeWidth={1.6}` ~ `1.8`

**이모지 아이콘**: 빠른 프로토타입 외엔 지양. 봇 카드의 특기 인디케이터 같은 경우는 예외.

---

## 9. 카드·컨테이너 레시피

```tsx
// 기본 카드
<div className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4">
  ...
</div>

// 호버 카드 (클릭 가능)
<button className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4 hover:border-[hsl(var(--border))] hover:shadow-md transition-all">
  ...
</button>

// 모드 컬러 강조 카드
<div className="rounded-2xl border border-[hsl(var(--mode-research)/0.3)] bg-[hsl(var(--mode-research)/0.04)] p-4">
  ...
</div>
```

---

## 10. 체크리스트 (PR 리뷰용)

- [ ] 모든 색상이 토큰(`hsl(var(--...))`) 을 통해 전달됨 (임의 hex 금지)
- [ ] 폰트 사이즈가 §2-2 스케일 내
- [ ] spacing 이 tailwind 기본값 내
- [ ] border-radius 가 §4 목록 내
- [ ] 모든 인터랙티브 요소에 `aria-label` (아이콘 전용 버튼) 또는 텍스트
- [ ] `tabIndex` 음수 금지 (키보드 접근성)
- [ ] 애니메이션 추가 시 `prefers-reduced-motion` 자동 적용 확인
- [ ] 다크모드 지원 (`dark:` 변형 또는 토큰 사용)

---

**변경 이력**
- 2026-04-22: 초안 작성 (#20)
- 2026-05-18: 토큰 사용 audit (grep 기반) — mode-* 9개 시그니처 컬러 모두 활성 사용 중 (general·multi·premium·assistant 9~12회 / debate-b 가 2회로 가장 적지만 유효 사용). dead token 없음.
- 2026-05-18: 시트 CellFormat 5종 신규 필드(fontFamily/fontSize/vAlign/wrap/underline/strikethrough) — 셀 인라인 스타일로만 적용, 디자인 토큰 변경 없음.
