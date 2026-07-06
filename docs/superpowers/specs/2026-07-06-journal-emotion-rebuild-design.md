# 일기 감정중심 전면 재설계 (StoryPad 참고)

작성일: 2026-07-06

## 배경 · 목표
기존 일기(`Journal.tsx` 668줄 + `journalStore`/`journalTags`/`journalStats`/`journalPrompts`/`journalStreak`/`JournalCalendarMini` 등, **mood 1-5 중심**)를 **감정 중심**으로 전면 재설계한다.

- StoryPad(theachoem/storypad)의 **타임라인 · 감정 · throwback** 경험을 차용.
- **최우선 제약: "메인화면과 동떨어지지 않게"** — 화면 골격·색·카드는 앱 공통 토큰/레일을 그대로 쓰고, **감정 색만 이 일기의 시각적 시그니처**로 둔다. StoryPad의 Flutter 룩을 그대로 옮기지 않는다.
- 사용자 결정: 데이터 모델까지 새로("싹 다 설정 바꿔"), 감정이 최우선.

## 핵심 결정
1. 데이터 모델 신규(감정 우선). 기존 엔트리는 **무손실 마이그레이션**.
2. 본문 에디터는 **Plate**(앱 통일, TipTap 폐기 방향과 일치).
3. 룩은 앱-네이티브 + 감정 액센트. 기존 "황혼 잉크" 전용 테마는 폐기.

## 데이터 모델

### DiaryEntry (신규)
```ts
interface DiaryEntry {
  id: string;
  date: string;            // 'YYYY-MM-DD' (하루 여러 개 허용)
  title?: string;          // 짧은 제목(옵션)
  body: PlateValue;        // 리치텍스트 (Plate Value)
  feelings: string[];      // 감정 id 다중 선택
  primaryFeeling?: string; // feelings 중 대표 1 — 카드/캘린더 색·이모지 결정
  intensity?: 1|2|3|4|5;   // 대표 감정 강도
  starred?: boolean;       // 별표(StoryPad stars)
  photos?: { id: string; src: string }[]; // base64/URL
  tags?: string[];
  weather?: Weather;       // 옵션 유지
  createdAt: string;
  updatedAt: string;
}
```
- **제거 필드**: `mood(1-5)`, `activities`, `sleepHours`, `energy`.
- **저장**: `diaryStore` (localStorage, 키 `personai.diary.v1`), `useSyncExternalStore` 구독 훅(노트/메모 스토어 패턴 동일).

### 감정 카탈로그 (feelings.ts)
```ts
type FeelingGroup = 'joy' | 'calm' | 'sad' | 'anxious' | 'anger';
interface Feeling { id: string; label: string; emoji: string; group: FeelingGroup; }
```
- **24개 감정 · 5계열**, 계열별 시그니처 색(앱 톤 범위 내 hsl):
  - 기쁨 joy 🟡 amber · 평온 calm 🟢 emerald · 슬픔 sad 🔵 blue · 불안 anxious 🟣 violet · 분노 anger 🔴 red
- 예시 세트(계열당 4-5):
  - 기쁨: 행복, 설렘, 뿌듯, 감사, 신남
  - 평온: 평온, 편안, 여유, 만족, 무던
  - 슬픔: 슬픔, 우울, 외로움, 그리움, 허탈
  - 불안: 불안, 초조, 긴장, 두려움, 부담
  - 분노: 화남, 짜증, 억울, 답답, 실망
- `primaryFeeling`의 group → 카드/캘린더 색을 결정.

### 마이그레이션 (migrate.ts, 1회)
- 기존 `journalStore`(`JournalEntry`) 읽어 `DiaryEntry`로 변환:
  - `mood 1-5` → 대표 감정 매핑(1→슬픔, 2→우울, 3→무던, 4→만족, 5→행복), `intensity`는 mood 기반 근사.
  - `body`(plain/markdown) → Plate Value(문단 분리 + 최소 마크다운 파싱).
  - `tags` / `images`(→photos) / `weather` 그대로.
  - `activities` / `sleepHours` / `energy` 폐기.
- 마이그레이션 완료 플래그(`personai.diary.migrated`)로 1회만 실행. 원본 키는 보존(롤백 여지).

## 화면 · 컴포넌트

### 1. 타임라인 피드 (홈 — `DiaryTimeline`)
- 역시간순, **월별 헤더 그룹**.
- `DiaryCard`: 날짜, 좌측 **대표감정 색 띠 + 이모지**, 제목/발췌, 감정 칩(다중), 사진 썸네일, 별표 토글.
- 상단 **Throwback 배너**: 오늘 `MM-DD`에 과거 연도 엔트리 있으면 "N년 전 오늘".
- **streak 배지**(기존 `useJournalStreak` 로직 재활용, 날짜 기반이라 그대로 동작).
- 필터/검색: 감정 계열 · 별표 · 태그 · 텍스트.

### 2. 감정 캘린더 (`DiaryMoodCalendar`)
- 월 그리드, 각 날 = 그날 **대표감정 색** 셀/dot → 한 달이 **내 감정 지도**.
- 날 클릭 → 그날 엔트리로 이동/작성.
- 하단 이달 감정 분포 미니 통계.

### 3. 에디터 (`DiaryEditor`)
- **Plate 리치텍스트** 본문(노트와 동일 스택).
- `FeelingPicker`: 5계열 섹션, **다중 선택 + 대표 지정 + 강도 슬라이더**.
- 사진 피커(기존 재활용), 태그 입력, 날씨(옵션), 별표, **글감 프롬프트 제안**(`journalPrompts` 재활용).
- 디바운스 자동저장(노트 패턴 동일).

### 통계 (`DiaryStats`)
- 이달 감정 분포(계열별 비율 바), streak, 작성일수, 자주 쓴 감정/태그.

## 앱 통합
- 라우트 `/journal` 유지, 내부 전면 교체. `AppWorkspaceShell` 레일 그대로.
- **브리핑 위젯**: `diaryStore`에서 오늘 엔트리 대표감정 + 발췌 표시로 갱신.
- **플래너 `JournalDrawer`**: `diaryStore` 기반으로 갱신.
- 룩: 앱 토큰(hsl var)·카드·헤어라인 공통. 감정 색만 시그니처.

## 범위
- **In**: 위 데이터모델·마이그레이션·감정계·타임라인·감정캘린더·Plate 에디터·throwback·별표·필터·통계·통합 재연결.
- **Out(후속)**: 멀티페이지 엔트리, 템플릿, 음성 일기, PIN/생체 잠금, 클라우드 동기화(Supabase) — 나중.

## 재활용 · 폐기
- **재활용**: `useJournalStreak`, `journalPrompts`, 이미지 피커, 통계 집계 뼈대 일부.
- **폐기**: mood 1-5 UI, 활동/수면/에너지 입력, 황혼 잉크 전용 테마, 기존 `Journal.tsx` 대부분.

## 테스트
- `diaryStore` CRUD + 마이그레이션 단위 테스트(mood→감정 매핑, body→Plate, 필드 보존/폐기).
- 감정 카탈로그 그룹·색 매핑.
- throwback 날짜 매칭, streak 집계, 이달 감정 분포 집계.

## 예상 파일
- 신규: `src/types/diary.ts`, `src/lib/diary/{diaryStore,feelings,migrate,diaryStats}.ts`, `src/components/diary/{DiaryTimeline,DiaryCard,DiaryEditor,FeelingPicker,DiaryMoodCalendar,DiaryStats,ThrowbackBanner}.tsx`
- 교체: `src/pages/Journal.tsx`
- 갱신: 브리핑 위젯, `src/components/planner/JournalDrawer.tsx`, `src/hooks/useJournal.ts`
