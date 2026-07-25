# 되감기 (/rewind) — 설계

2026-07-25 확정. 사용자 호칭 "데일리 로그 V2". 기존 `/journal` 은 **그대로 둔다** (코드·디자인 모두 무수정).

## 왜 이 방이 있는가

이미 `/today`(오늘의 나)가 **오늘**을 가로로 모아 보여준다. 되감기는 그 **거울상**이다 — 같은 크로스룸 조립을 **과거** 축에 세운다. 축이 정반대라 겹치지 않는다.

핵심 성질: **쓰기보다 읽기**. 이 방은 입력 위젯이 하나도 없고 localStorage 에 아무것도 쓰지 않는다.

## 데이터 — 읽기 전용 크로스룸

새 데이터 모델 0개. 다른 방들이 이미 쌓아둔 레코드를 `RewindEvent` 하나로 정규화한다.

```
RewindEvent { id, ymd, time?, room, glyph?, text, detail?, photo?, weight }
```

v1 출처 6개 — "하루의 삶"에 해당하는 것만:

| room | 스토어 | 날짜 필드 | 뽑는 것 |
|---|---|---|---|
| `daylog` | `daylog.items.v1` | `date` YMD + `time` HH:mm | 먹은 것·간 곳·메모 + **사진** |
| `journal` | `journal.entries.v1` | `date` YMD | 제목/요약/본문 첫 줄 + **사진** |
| `ledger` | `ledger.entries.v1` | `date` YMD | 메모 + 금액 + 카테고리 이모지 |
| `health` | `health.{vitals,meds,visits,symptoms}.v1` | `date` YMD, `takenDates[]` YMD | 수치·복약(날짜별 집계)·진료·증상 |
| `tickets` | `ticketbook.v1` | `watchedAt` YMD | 제목 + 별점 + 한 줄 + **포스터** |
| `people` | `people.interactions.v1` | `date` YMD | 이름(조인) + 메모 + 종류 |

**의도적 제외**: `planner`(ISO/YMD 혼재 + 할일은 회고 재료로 약함), `career`(항목 희소 + 활성 보드 필터 우회 필요), `archive`·`notes`·`wiki`(사용자가 인지하는 날짜 개념이 없음 — epoch ms 뿐). 필요해지면 어댑터 하나 추가로 끝난다.

### 반드시 지킬 것 — 조사에서 나온 지뢰

- `useLedger()` 는 마운트마다 고정지출을 **쓴다**. `useHealth()` 는 예시 시드를 **쓴다**.
  → 훅을 쓰지 말고 `ledgerStore.listEntries()` · `healthStore.list*()` 를 직접 호출한다.
- 날짜 형식이 3종 혼재(YMD / ISO / epoch ms). 어댑터 경계에서 **로컬 YMD 로 통일**하고,
  `toISOString().slice(0,10)` 은 절대 쓰지 않는다 (KST 하루 밀림).
- 사진이 base64 인라인(daylog·journal)이라 전량 로드는 무겁다 → 필름은 게이트 주변만 인화한다.

## 되감는 방식 — 필름 릴

한 칸 = 하루. 스트립을 좌우로 끌면 시간이 흐르고, 가운데 **게이트**에 걸린 날이 아래로 펼쳐진다.

- 드래그(관성·스냅) · 휠 · `←→` 하루 · `Shift+←→` 30일 · `Home` 오늘
- 릴 카운터(연·월) 클릭 → 월 점프 팝오버. **풀스크린 오버레이 아님**
- **기록 없는 날도 빈 프레임으로 지나간다.** 건너뛰지 않는다 — 빈 날도 시간이다.
  대신 "다음 기록으로" 버튼으로 건너뛸 수 있다.

프레임에 보이는 것: ① 사진 있으면 사진 ② 없으면 그날 최고 `weight` 이벤트의 한 줄 ③ 아무것도 없으면 빈 베이스.

## 재질 — 라이트테이블 위의 필름

실제 사물의 부품을 그대로 옮긴다. "필름 느낌"을 감으로 흉내내지 않는다.

| 실제 | 화면 |
|---|---|
| 스프로킷 구멍 | 스트립 위·아래 천공 |
| 프레임 라인 | 칸 사이 얇은 틈 = 하루의 경계 |
| 게이트 | 가운데 발광하는 창. 걸린 칸만 선명, 나머지는 어둡고 채도가 빠진다 |
| 엣지 코드 | 칸 아래 각인 숫자 → 날짜 `07·25` |
| 릴 카운터 | 되감은 위치 → 연·월 |

색: **차가운 빛 ↔ 따뜻한 필름**. 실제로 네거티브는 주황빛 갈색이고 라이트테이블은 차가운 백청색이다 — 그 대비가 이 방의 전부다.

- `--rw-glow` 청록 `#3f9fb8` — 게이트·활성·레일 알약. 기존 방 어느 색과도 안 겹침
  (티켓북 앰버 `#d97706` 와 레일에서 뭉개지던 문제 때문에 호박에서 갈아탐)
- `--rw-base` 따뜻한 갈색 — 필름 베이스
- 앱 라이트/다크와 무관한 **차콜 단일 다크** (티켓북 패턴)

## 가드레일 자가검증

잔디밭·스트릭·완성도 게이지 **없음** · 스탯 타일 **없음** · 균일 라운드 카드 그리드 **없음** ·
풀스크린 오버레이 **없음** · 매일 조각 입력층 **없음**(입력 0) · 구조를 실제 사물에서 가져옴 ·
`/journal` 무수정.

## 파일

```
src/lib/rewind/types.ts     RewindEvent · ReelFrame · 방 메타
src/lib/rewind/sources.ts   방별 어댑터 6개 → RewindEvent[]
src/lib/rewind/reel.ts      날짜 범위 → ReelFrame[] (빈 날 포함)
src/hooks/useRewind.ts      수집 + 6개 CHANGED 이벤트 구독
src/pages/Rewind.tsx        필름 릴 + 게이트 + 펼침
```

등록 7곳: `App.tsx` · `AppWorkspaceShell`(WorkspaceKey·DESTINATIONS·RAIL_ACCENT·MOBILE_MORE) ·
`MainModeTabs`(HUB_TOOLS·클릭체인·openFav route맵) · `ModeMenu`(HUB_ICONS) ·
`FavoriteChips`(삼항체인) · `WorkspaceSidebarSwitchButton`(WORKSPACE_LABELS) · `index.css`(테마)
