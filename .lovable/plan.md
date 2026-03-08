

## 계획: 4가지 개선 사항 일괄 적용

### 1. 디자인 전문가스럽게 개선

현재 디자인은 기본적이고 조금 밋밋합니다. 다음을 적용합니다:

- **헤더**: 더 세련된 그라데이션 배경, 로고 영역 개선, 타이포그래피 강화
- **카테고리 섹션 헤더**: 텍스트 중앙 정렬 (3번 이슈 해결 포함)
- **QuestionInput**: 그림자 효과 추가, placeholder 개선, 더 넓은 패딩
- **메시지 카드**: 미세한 그림자, 호버 효과 강화, 더 부드러운 전환
- **전체 배경**: 미세한 그라데이션 패턴 추가
- **빈 상태**: 질문 전 웰컴 화면에 아이콘/일러스트 추가
- **버튼/칩**: 더 정제된 border-radius와 미세한 그림자

### 2. 구글 로그인/회원가입

- Lovable Cloud의 관리형 Google OAuth 사용 (Configure Social Auth 도구 호출)
- `src/pages/Auth.tsx` 생성: 로그인/회원가입 페이지 (Google 버튼 + 이메일/비밀번호)
- `src/contexts/AuthContext.tsx` 생성: 인증 상태 관리
- `src/App.tsx` 수정: `/auth` 라우트 추가, 보호된 라우트 설정
- 프로필 데이터 저장이 필요한지 → 현재 앱 특성상 불필요. `auth.users`만 사용
- 헤더에 로그인 사용자 아바타/로그아웃 버튼 추가

### 3. 카테고리 라벨 정렬 수정

`ExpertSelectionPanel.tsx`의 카테고리 헤더 버튼에서 텍스트가 좌측으로 치우쳐 있습니다.
- 카테고리 라벨을 중앙 정렬하거나, 아이콘과 텍스트의 간격을 조정하여 시각적 균형 개선
- `flex justify-center` 또는 `text-center` 적용

### 4. 다른 AI 서비스에서 착안한 UX 개선

GPT, Gemini, Grok 등에서 영감을 받은 기능:

- **웰컴 화면 (GPT 스타일)**: 질문 전 빈 상태에 추천 질문 예시 4개를 카드로 표시 → 클릭 시 바로 질문 전송
- **타이핑 인디케이터 개선 (Gemini 스타일)**: 현재 "답변 중..." 텍스트를 dot animation으로 변경
- **새 대화 시작 (GPT 스타일)**: 토론 완료 후 "새 질문" 버튼을 더 눈에 띄게
- **입력창 개선 (Gemini 스타일)**: textarea 아래에 현재 모드를 작은 뱃지로 표시

### 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/Auth.tsx` | 새로 생성 - 로그인/회원가입 페이지 |
| `src/contexts/AuthContext.tsx` | 새로 생성 - 인증 상태 관리 |
| `src/App.tsx` | 라우트 추가, AuthProvider 래핑 |
| `src/pages/Index.tsx` | 웰컴 화면 추천 질문, 헤더 개선, 사용자 아바타, 디자인 전반 |
| `src/components/ExpertSelectionPanel.tsx` | 카테고리 라벨 정렬 수정, 디자인 개선 |
| `src/components/QuestionInput.tsx` | 입력창 디자인 개선, 모드 뱃지 |
| `src/components/DiscussionMessage.tsx` | 메시지 카드 디자인 개선 |
| `src/components/AppSidebar.tsx` | 로그인/로그아웃 메뉴 추가 |
| `src/index.css` | 추가 유틸리티 스타일, 타이핑 애니메이션 |

