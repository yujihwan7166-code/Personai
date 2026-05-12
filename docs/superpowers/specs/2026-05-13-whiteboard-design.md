# 화이트보드 (Whiteboard) — 디자인 스펙

- **작성일**: 2026-05-13
- **대상**: expert-chat-forum 4번째 페이지 (`/whiteboard`)
- **범위**: Phase 1 (MVP) + Phase 2 (정밀·연결·통합)
- **컨셉**: Excalidraw의 자유 캔버스 + Miro의 스티키·커넥터·프레임을 결합한 **"생각을 정리하고 다른 영역으로 흘려보내는 허브"**

---

## 1. 기술 기반 결정

### 1.1 렌더링: SVG + roughjs

- 모든 요소를 SVG로 렌더링, roughjs로 손그림 path 생성
- 텍스트 inline 편집은 `<foreignObject>` + contentEditable
- 평균 보드 (50~200 요소) 60fps 보장
- 500+ 요소 시 freedraw만 canvas 오버레이 분리 (Phase 2 후순위)

### 1.2 좌표계: world coords + viewport transform

- 모든 요소 좌표는 절대(world) 좌표
- 화면 표시는 `<svg viewBox={`${vx} ${vy} ${vw/zoom} ${vh/zoom}`}>` 로 갱신
- `screenToWorld(clientX, clientY)` 헬퍼 단일 사용
- 줌·팬과 무관하게 hit-test·드래그·스냅은 world 좌표

### 1.3 상태 관리: Zustand store 1개 (`whiteboardStore`)

슬라이스:
- `boards`: 메타 (id, name, folderId, thumbnail, archivedAt, trashedAt, ...)
- `folders`: 메모와 동일 구조
- `activeBoardId`
- `elementsByBoard`: Map<boardId, WBElement[]>
- `selection`: Set<elementId>
- `tool`: 현재 도구 + 옵션 (스티키 색, 도형 종류 등)
- `viewport`: { x, y, zoom }
- `historyByBoard`: Map<boardId, { stack: HistoryEntry[], cursor: number }>

shallow selector로 활성 보드만 구독.

### 1.4 저장: localStorage(메타) + IDB(데이터·이미지)

```
localStorage:
  wb:boards            → Board[] 메타
  wb:folders           → WBFolder[]
  wb:trash             → TrashedBoard[] (30일 자동 영구삭제)
  wb:settings          → 설정

IndexedDB (DB: wb):
  store 'boardData'    key: boardId, value: BoardData
  store 'images'       key: imageId, value: { blob, name, w, h, createdAt }
```

자동저장: elements 변경 시 400ms debounce → IDB write.
BroadcastChannel 로 다중 탭 단일 활성 강제.

### 1.5 Undo/Redo: immer patches 기반

- 보드별 스택 50 entry
- 트랜잭션 단위: 한 인터랙션 (드래그·텍스트입력·도구그리기·스타일변경 1회)
- `produceWithPatches` 로 메모리 절약
- 세션 한정 (저장 안 함)

### 1.6 패키지

- `roughjs` (~20KB) — 스케치 SVG path
- `perfect-freehand` (~5KB) — 펜 outline
- `immer` (~10KB) — patches
- `nanoid` (~1KB) — 요소 ID

---

## 2. 데이터 모델

### 2.1 공통

```ts
interface WBElementBase {
  id: string                  // nanoid(10)
  type: WBElementType
  x: number; y: number        // world 좌표 (좌상)
  w: number; h: number        // bounding box (양수)
  angle: number               // 0~2π, 중심점 기준
  zIndex: number
  opacity: number             // 0~1
  locked: boolean
  groupIds: string[]
  createdAt: number; updatedAt: number
}

interface WBStyleStroke {
  strokeColor: WBColor
  strokeWidth: 'thin'|'normal'|'thick'   // 1.5/2.5/4
  strokeStyle: 'solid'|'dashed'|'dotted'
  roughness: 0|1|2                       // 0=clean, 1=hand, 2=rough
}

interface WBStyleFill {
  fillColor: WBColor | 'none'
  fillStyle: 'solid'|'hachure'|'cross-hatch'|'none'
}

type WBColor =
  | 'ink' | 'slate' | 'red' | 'orange' | 'amber'
  | 'green' | 'teal' | 'blue' | 'violet' | 'pink'
```

### 2.2 요소 타입 (10종 Phase 1, +이미지·프레임·괄호 = 13종 Phase 2)

**도형 (text 임베드 가능)**: WBRect, WBEllipse, WBDiamond, WBTriangle, WBSpeech
- 공통 필드: cornerRadius?, text?, textAlign?, fontSize?
- WBSpeech: tailDirection: 'bl'|'br'|'tl'|'tr'

**선·화살표**: WBLine, WBArrow
- points: Array<[number, number]>
- WBArrow: startArrow/endArrow, curve, startBinding/endBinding (Phase 2), label?

**자유 펜**: WBFreedraw
- points: Array<[number, number, number?]> (x, y, pressure?)

**텍스트**: WBText
- content, fontSize (12/14/16/20/28/40), fontFamily ('sans'|'serif'|'mono'), textColor, textAlign

**스티키** ★: WBSticky
- content (마크다운 라이트)
- color: 'amber'|'pink'|'mint'|'sky'|'lavender'|'slate'
- linkedMemoId?, linkedWikiPageId?, linkedTaskId? (자리만 잡고 Phase 3 통합)

**Phase 2 추가**: WBImage(imageId IDB), WBFrame(name, childIds, clipChildren), WBBracket

### 2.3 Board 모델

```ts
interface Board {
  id, name, folderId|null, thumbnail?(SVG→dataURL 200×120),
  starred?, archivedAt?, trashedAt?, createdAt, updatedAt
}

interface BoardData {
  schemaVersion: 1
  elements: WBElement[]
  viewport: { x, y, zoom }
}
```

### 2.4 ToolState

```ts
type ToolKind = 'select'|'pan'|'text'|'sticky'|'shape'|'line'|'pen'|'eraser'

interface ToolState {
  kind: ToolKind
  stickyColor: WBSticky['color']
  shapeKind: 'rect'|'ellipse'|'diamond'|'triangle'|'speech'
  lineKind: 'line'|'arrow-solid'|'arrow-dashed'|'arrow-curved'|'arrow-elbow'
  penWidth: 'thin'|'normal'|'thick'
  penColor: WBColor
  strokeColor: WBColor; fillColor: WBColor|'none'; roughness: 0|1|2
}
```

---

## 3. 페이지 레이아웃

```
<div className="whiteboard-warm-theme min-h-screen flex bg-background">
  <aside w-[268px] bg-background>                       // 메모 톤
    <WhiteboardSidebar />                               // 다중 보드 + 폴더
  </aside>
  <main flex-1 relative overflow-hidden>
    <WhiteboardCanvas />                                // SVG 풀블리드
    <BoardHeader />        floating 좌상
    <ToolPalette />        floating 좌측 세로 (48px)
    <PageSwitcher current="whiteboard" />  floating 우상
    <ContextualPanel />    floating 선택 시 등장
    <ZoomControls />       floating 좌하
    <MiniMap />            floating 우하 (180×120)
    <HelpHint />           floating 우하 ?
  </main>
</div>
```

- 플로팅 카드 톤: `bg-card/95 backdrop-blur-sm rounded-xl border border-[hsl(var(--hairline))] shadow-[0_4px_14px_-8px_hsl(30_30%_8%/0.12)]`
- `Tab` 키로 모든 플로팅 토글 (몰입 모드)

---

## 4. 컴포넌트 아키텍처

### 4.1 파일 트리

```
src/pages/Whiteboard.tsx

src/components/whiteboard/
├── sidebar/      WhiteboardSidebar, BoardRow, BoardFolderGroup, NewBoardInput
├── canvas/       WhiteboardCanvas, ViewportProvider, DotGrid,
│                 ElementsLayer, SelectionLayer, GuidesLayer (P2), MarqueeLayer
│   └── elements/ Rect, Ellipse, Diamond, Triangle, Speech, Line, Arrow,
│                 Freedraw, Text, Sticky (+ Image/Frame/Bracket Phase 2)
├── tools/        ToolPalette, ToolButton
│   └── flyouts/  StickyColorFlyout, ShapeFlyout, LineStyleFlyout, PenStyleFlyout
├── floating/     BoardHeader, ContextualPanel, ZoomControls, MiniMap, HelpHint
├── interactions/ useSelectTool, usePanTool, useShapeTool, useTextTool,
│                 useStickyTool, useLineTool, usePenTool, useEraserTool,
│                 useKeyboard, useWheel
└── modals/       BoardRenameModal, ShortcutCheatsheet, ExportModal(P2)

src/lib/whiteboard/
├── store.ts          zustand
├── persistStore.ts   store ↔ localStorage·IDB
├── boardData.ts      BoardData IDB CRUD
├── imageStore.ts     이미지 IDB
├── history.ts        immer patches undo/redo
├── selection.ts      hit-test, multi-select 유틸
├── hitTest.ts        좌표 → element (회전·z-order)
├── geometry.ts       순수 수학 (rotate, intersect, bbox, normalize)
├── snapping.ts       (Phase 2) 스마트 가이드
├── binding.ts        (Phase 2) 화살표 binding
├── rough.ts          roughjs wrapper + WeakMap 캐시
├── freehand.ts       perfect-freehand wrapper
├── colors.ts         WBColor → CSS 변수
├── shortcuts.ts      단축키 매핑
├── thumbnail.ts      SVG → dataURL
└── migrate.ts        schemaVersion 마이그레이션

src/types/whiteboard.ts
src/styles/whiteboard.css   whiteboard-warm-theme 토큰 + grid pattern
```

### 4.2 책임 경계

- 렌더러(XxxElement)는 **순수 함수형** — 요소 데이터만 받음
- 도구 훅(useXxxTool)은 **상태 변경 단일 진입점** — pointer 이벤트를 store로 전달
- store 변경은 `history.transaction(fn)` 래퍼로만 → undo 트랜잭션 보장
- persistStore 가 store 구독 → 자동저장은 도구 코드와 분리

### 4.3 이벤트 흐름

```
pointer event → WhiteboardCanvas → useActiveTool() 훅
→ hitTest → history.begin() → store update (immer)
→ ElementsLayer (변경 요소만 리렌더) + SelectionLayer
→ pointer up → history.commit() (1 entry)
→ persistStore (debounce 400ms) → IDB write
```

---

## 5. 도구 상태 머신

### 5.1 글로벌 규칙

- 도구 선택 후 V/Esc 누를 때까지 **Miro식 연속 모드**
- `Esc` 한 번: 그리는 중이면 그 인스턴스 취소, 도구 유지
- `Esc` 두 번 (또는 V): 선택 도구로 복귀
- `Space` hold: 임시 팬, release 시 원 도구 복귀
- `Delete`: 선택 요소 모두 삭제 (텍스트 편집 중 제외)
- 텍스트 편집 중에는 위 모든 단축키 비활성

### 5.2 도구별 명세 (요약)

**SELECT (V)**: 클릭/Shift+클릭 토글/marquee/드래그 이동/8핸들 리사이즈/회전 핸들/우클릭 메뉴

**PAN (H)**: 드래그로 viewport 이동, Space hold로도 동일

**SHAPE (R)**: flyout 5도형, 드래그로 bbox, Shift=비율, Alt=중심기준, 완료 후 텍스트 편집 자동 진입

**STICKY (S)**: flyout 6색, 클릭=200×200 + 편집, 드래그=사이즈

**LINE (L)**: flyout 5스타일, Shift=15° 스냅, edge binding은 Phase 2

**PEN (P)**: flyout 두께·색, pointerrawupdate로 점 수집, perfect-freehand outline

**TEXT (T)**: 클릭=즉시 편집, 드래그=폭 지정, 빈 채로 commit 시 자동 삭제

**ERASER (E)**: 드래그 경로 위 요소 즉시 삭제, 호버 빨간 강조

### 5.3 텍스트 편집 모드

- 진입: TEXT 클릭 / 도형·스티키 더블클릭 / SHAPE 그리기 직후 / 선택 후 Enter
- 진행: foreignObject contentEditable, 마크다운 라이트, 한글 IME (composition + keyCode 229)
- 종료: Esc 또는 외부 클릭 → commit, 빈 내용은 도형 안이면 도형 살림 / 독립 텍스트면 삭제

### 5.4 selection state machine

```
idle / marquee / dragging / resizing / rotating / editing-text
```

전이 규칙:
- empty 클릭 → marquee
- 미선택 요소 클릭 → 선택 갈음 + dragging
- 선택된 요소 클릭 → dragging (유지)
- 핸들 클릭 → resizing
- 회전 핸들 클릭 → rotating
- 더블클릭 (편집 가능 요소) → editing-text

### 5.5 단축키 전체

**도구**: V H R O D L A P T S E
**편집**: Ctrl+Z, Ctrl+Shift+Z(redo), Ctrl+C/X/V, Ctrl+D(복제), Ctrl+A, Delete, Ctrl+G/Shift+G(P2), Ctrl+L, [ ], Ctrl+[ ], 화살표키 (Shift 10px)
**뷰**: Space hold, Ctrl+0/1/+/-, Tab(플로팅 토글), ?(치트시트)
**마우스**: 휠 팬, Shift+휠 가로, Ctrl+휠 줌, 트랙패드 핀치·2손가락, 중간버튼 팬, 우클릭 메뉴

### 5.6 우클릭 메뉴

```
복제 (Ctrl+D)
복사 (Ctrl+C)  잘라내기 (Ctrl+X)
─
맨 앞으로  한 칸 앞  한 칸 뒤  맨 뒤
─
그룹 (Phase 2)  그룹 해제 (Phase 2)
잠금 (Ctrl+L)
─
[스티키만, Phase 3 자리]
  메모로 보내기 (회색)
  위키 페이지로 변환 (회색)
  플래너 할일로 (회색)
─
삭제 (Del)
```

---

## 6. Phase 1 범위 (최종 동결)

### 코어
- 사이드바: 다중 보드, 폴더, 검색, 정렬, 고정, 휴지통(30일), 카드 hover ⋯
- 캔버스: 무한 + dot grid + 팬·줌 + 자동저장(400ms debounce, IDB)
- 도구 8개 (4 flyout): V H | T S R L P | E
- 요소 10종: rect, ellipse, diamond, triangle, speech, line, arrow, freedraw, text, sticky

### 조작
- 단일·다중 선택 / marquee / 드래그 / 8핸들 리사이즈 / 회전
- 복제·복사·붙여넣기·잘라내기 / z-order / 잠금 / 화살표키 이동

### 스타일
- WBColor 10팔레트 + 스티키 6색
- strokeWidth 3, strokeStyle 3, fillStyle 3+none, roughness 0/1/2, cornerRadius 0~16

### 텍스트
- inline 편집, 마크다운 라이트, 한글 IME

### Undo/Redo
- 보드별 immer patches 스택 50, 세션 한정

### 플로팅 UI
- BoardHeader, ToolPalette, PageSwitcher, ContextualPanel, ZoomControls, MiniMap, HelpHint
- Tab 토글

### 단축키 30+

### 기술
- React + Zustand + roughjs + perfect-freehand + immer + nanoid
- localStorage(메타) + IDB(BoardData·이미지)
- schemaVersion 1, migrate.ts, BroadcastChannel 단일 탭 가드

### 우클릭 메뉴 자리잡이 (Phase 3 기능은 회색 비활성)

---

## 7. Phase 2 범위 (정밀·연결·통합)

- **스마트 커넥터**: edge anchor, binding, elbow 라우팅, 중간 vertex, 라벨
- **Frame**: F 도구, 이름 라벨, 자동 child 등록, frame 단위 이동
- **정렬·분배**: 6 정렬 + 2 균등 + 매치 사이즈, 스마트 가이드(6px 스냅), 그리드 스냅 옵션
- **그룹·잠금 정교화**: Ctrl+G/Shift+G 활성
- **검색**: Ctrl+F, 매치 강조 + 점프
- **부분 지우개**: Shift+ERASER, freedraw 부분 지우기
- **태그**: 스티키 태그 색 라벨 + 사이드바 필터
- **이미지**: Img 도구 + 드롭존, IDB 저장
- **bracket** 도형 추가
- **Export**: PNG(2x DPI)/SVG/JSON
- **보드 옵션**: 그리드 종류·크기·배경색
- **성능**: viewport culling, roughjs WeakMap 캐시 정교화
- **다중 탭**: read-only 배너 정교화

---

## 8. 위험·검증 매트릭스

| 위험 | 대응 |
|---|---|
| SVG 5000+요소 끊김 | Phase 1 시나리오 아님. 발생 시 freedraw만 canvas 오버레이 |
| localStorage 한계 | BoardData를 IDB로 → 메모리 한계 사실상 없음 |
| 200요소 store 성능 | shallow selector, React.memo, Phase 2 viewport culling |
| undo 메모리 폭증 | immer patches로 1/10 |
| 다중 탭 충돌 | BroadcastChannel 단일 탭 강제 |
| 한글 IME | composition 이벤트 + keyCode 229 분기 (메모 검증 패턴) |
| 이미지 quota | IDB 분리, blob URL 캐시 (메모 패턴) |
| 모바일 터치 | pointer events 통일. Phase 1은 데스크탑 우선 |
| 회전된 요소 hit-test | bounding box angle 역변환 후 AABB |
| 그리는 중 도구 전환 | 현 인스턴스 자동 commit (0.5px 미만 폐기) |
| 텍스트 편집 외부 클릭 | foreignObject blur → commit |
| 트랙패드 핀치 vs 휠 줌 | ctrlKey 검사 |
| 화살표 binding 요소 삭제 | binding만 제거, endpoint는 마지막 위치 고정 |
| Frame 삭제 시 children | 기본 살림, 우클릭 메뉴에서 children 동시 삭제 옵션 |
| 그룹 안 그룹 | groupIds 배열로 자연스럽게 |
| 잠긴 요소 + 그룹 | 그룹 이동 시 잠금 무시(그룹 위) |
| 보드 삭제 race | 휴지통 이동 후 5초 후 IDB delete |
| zoom 극단 | clamp 0.1~5 |
| 정렬 가이드 무한 루프 | 디바운스 + last value 비교 |

---

## 9. 통합 시뮬레이션

| 시나리오 | Phase | 검증 |
|---|---|---|
| 빈 보드 → 사각형 그리기 → 텍스트 → Esc | P1 | SHAPE → 드래그 → text 자동 편집 → commit |
| 스티키 6장 한 줄 정렬 | P2 | ContextualPanel 정렬 버튼 |
| 화살표로 스티키 두 개 연결 | P2 | edge anchor → binding |
| 200요소 보드 자동저장 | P1 | 400ms debounce → IDB |
| 100개 보드 보관 | P1 | IDB 사실상 무제한 |
| 메모↔스티키 sync | P3 (보류) | 메뉴 자리만 회색 |
| AI 스티키 클러스터 | P4 (보류) | — |
| 그리던 중 V 전환 | P1 | 현 인스턴스 commit |
| 회전된 스티키 클릭 | P1 | hitTest.ts angle 역변환 |
| 같은 보드 다중 탭 | P1 | BroadcastChannel 가드 |
| 한글 IME 텍스트 | P1 | composition + 229 |
| Undo 50회 후 새 작업 | P1 | history.cursor 이후 폐기 |
| 보드 삭제 → 5초 내 undo | P1 | 휴지통 메모 패턴 |
| Tab 키 몰입 모드 | P1 | 플로팅 전체 페이드 |
| 트랙패드 핀치 줌 | P1 | wheel + ctrlKey |

---

## 10. 라우팅·통합 변경

- `App.tsx` (라우터): `/whiteboard` 추가, `<Whiteboard />` 마운트
- `src/components/PageSwitcher.tsx`: whiteboard 항목 onClick → `notify.info` 제거, `navigate('/whiteboard')` 로 변경
- 다른 페이지의 PageSwitcher에서 화이트보드 진입 활성화

---

## 11. 비범위 (NOT DOING)

- 실시간 협업·다중 사용자 (혼자 쓰는 앱)
- 댓글 스레드
- 투표·타이머
- 임베드(YouTube·Figma 등)
- 반응(👏❤️)
- AI 통합 (Phase 4 별도)
- 메모/위키/플래너 양방향 sync (Phase 3 별도, UI 자리만 잡음)
- 모바일 터치 풀 지원 (Phase 1 데스크탑 우선)
- 버전 히스토리 (Phase 2 후순위)

---

## 12. 데이터 마이그레이션

- `schemaVersion: 1` 모든 BoardData에 박음
- `migrate.ts`: `migrate(data: any): BoardData` 분기 함수
- 향후 요소 타입 추가 시 마이그레이션 헬퍼 추가
