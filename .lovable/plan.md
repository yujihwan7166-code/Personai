

## 변경 사항 요약

두 가지를 수정합니다:

### 1. AI 최소 선택 기준: 2명 → 1명

현재 `toggleExpert`에서 최소 2명을 강제하고, `startDiscussion`에서도 `< 2` 체크를 합니다. **AI 카테고리 전문가는 1명만 선택해도 토론(또는 일반 질문)이 가능하도록** 변경합니다.

- `src/pages/Index.tsx`: `toggleExpert`의 `prev.length <= 2` → `prev.length <= 1`로 변경, `startDiscussion`의 `< 2` → `< 1`로 변경
- `src/components/ExpertSelectionPanel.tsx`: "2명 이상" 안내 텍스트를 "1명 이상"으로 변경, 뱃지 조건도 `>= 1`로 변경

### 2. "일반 질문" 모드 추가

새로운 모드 `'general'`을 추가합니다. 이 모드에서는 **AI 카테고리만 선택 가능**하고, 전문가/직업/유명인 카테고리가 숨겨집니다.

**수정 파일:**

- **`src/types/expert.ts`**:
  - `DiscussionMode` 타입에 `'general'` 추가
  - `DISCUSSION_MODE_LABELS`에 일반 질문 항목 추가 (아이콘: 💡, 설명: "AI에게 직접 질문")

- **`src/components/ExpertSelectionPanel.tsx`**:
  - `discussionMode` prop 추가 (이미 있음)
  - `grouped` 필터링: `discussionMode === 'general'`이면 `cat === 'ai'`인 카테고리만 표시
  - 헤더 텍스트를 모드에 따라 분기 ("AI 선택" vs "토론 전문가 선택")

- **`src/components/AppSidebar.tsx`**:
  - 모드 목록에 `'general'` 추가

- **`src/pages/Index.tsx`**:
  - 모드 변경 시 `general`로 전환하면, 선택된 전문가 중 AI가 아닌 것들을 자동 해제
  - `startDiscussion`에 `general` 모드 로직 추가: 선택된 AI 전문가 1명(또는 여러 명)이 각각 독립적으로 질문에 답변 (토론 없이 단순 Q&A)
  - 최소 인원 체크를 `general` 모드일 때 `< 1`로, 나머지 모드는 기존 `< 2` 유지

