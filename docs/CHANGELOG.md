# 변경 이력

릴리스 노트가 아닌 **세션 단위 작업 이력**. 사용자 시각 영향 중심으로 요약.

---

## 2026-05-18 — 시트 강화 + 공용 자산 묶음

### ✨ 시트 (Sheets/Excel 호환성 + 신규 기능)
- 함수 86 → 90+ : SPARKLINE / AI(•/CLASSIFY/TRANSLATE/SUMMARIZE) /
  FILTER / SORT / UNIQUE / SEQUENCE / IFERROR / IFNA / IS\* /
  IFS / SWITCH / XLOOKUP / TEXTJOIN / SUBSTITUTE / REPLACE / FIND /
  SEARCH / HYPERLINK / ROUNDUP / ROUNDDOWN / CEILING / FLOOR /
  COUNTA / COUNTBLANK / STDEV / VAR / RANK / DATE / EOMONTH /
  EDATE / DATEDIF / NETWORKDAYS / TEXT / REGEX\*
- 메뉴 바 (파일/수정/보기/삽입/서식/데이터/도구/AI/도움말)
- Toolbar — 폰트·크기·U/S·세로정렬·줄바꿈·통화/%/.← .→/줌/인쇄/차트 진입점
- import 정확도 — 폰트·세로정렬·줄바꿈·numFmt 자릿수·freeze·셀크기
- 셀 sentinel 패턴 5종 — IMAGE / SPARKLINE / AI / SPILL / LINK
- 셀 위젯 — 체크박스 (validation kind=checkbox), 클릭 가능한 링크
- Pivot 엔진 + Dialog UI (단순/교차표/필터/정렬)
- 시트 탭 — 더블클릭 이름변경 / 우클릭 메뉴 + 8 색
- 자동저장 배지 — 마지막 저장 시각 ('방금'/'N분 전')
- 파워 단축키 — Ctrl+; / Ctrl+Shift+; / Ctrl+Alt+1~5 / Ctrl+\\

### 🛠 플래너 (잠재 버그 + 도메인 일관성)
- 할 일 ↔ 일정 도메인 일관성 — taskDomain.ts sanitize (priority/plannedFor)
- 깃발 잔존 / 잘못된 모달 (Bug #1 #2) 수정
- 일정→할 일 변환 undo 토스트
- 반복 일정 ContextMenu 'silent no-op' 수정 — exdate + 인박스 항목 detach
- timeKeys.ts — 시간·날짜 키 변환 공용 (toDayKey / shiftDayKey 등)
- eventStore — 레거시 안내 명시 (마이그레이션 진행 중)

### 🧰 공용 자산 (모든 페이지)
- 컴포넌트: KbdHint / EmptyState / LoadingShimmer / UsageStatBadge
- 모달: InsertLinkDialog / PivotDialog
- hooks: useDebouncedValue / useEscapeKey / useMediaQuery
- lib: formatters (compact 숫자·바이트·상대시각·% 등) / clipboard / textSearch /
  safeJson / arrayUtils / asyncQueue / timeKeys

### 🧪 테스트 추가 (이전 158 → 360+)
- formatters / clipboard / textSearch / safeJson / arrayUtils / asyncQueue
- useDebouncedValue / useEscapeKey
- taskDomain / parseNaturalLanguage / recurrence / timeKeys
- habitStore / goalStore / pomodoroStore / ddayStore / streak / goalProgress / seriesEdit
- cloudSheet — formula / sparkline / xlsx / pivot (edge cases) / aiCell / spill

### 📚 문서
- `docs/SITE_MAP.md` — 신규 공용 자산 cheat sheet 반영
- `docs/design-tokens.md` — 토큰 사용 audit + 시트 CellFormat 신규 필드
- `docs/CHANGELOG.md` — 본 문서 신설

---

이전 작업은 git log 와 메모리 파일(`~/.claude/projects/.../memory/*.md`) 참조.
