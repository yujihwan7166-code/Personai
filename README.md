# Expert Chat Forum (Personai)

Personai is a React + Vite + TypeScript application for multi-model AI chat, AI debate, study workspaces, personal knowledge, planning, journaling, media generation, and file conversion.

## 주요 기능

- AI 채팅: 단일 AI, 멀티 AI 비교, AI 토론, 찬반 토론, 시뮬레이션, 프리미엄 상담
- 리서치: 심층 리서치, 검색 문맥, 출처 표시
- 스터디: PDF/DOCX/PPTX/URL 기반 요약, 퀴즈, 플래시카드, 다이어그램, 팟캐스트
- 개인 도구: 마이위키, 플래너, 메모, 일기, 뽀모도로
- 미디어/파일: 이미지 생성, 영상 생성 상태 추적, 번역, 파일 변환, OCR
- 법률/금융/의약 보조 API: 외부 API 키가 있을 때 보강 정보 제공

## 기술 스택

- React 18
- Vite 5
- TypeScript
- Tailwind CSS
- shadcn/Radix UI
- Supabase Auth/DB
- Vercel Serverless Functions
- Vitest
- Playwright smoke checks

## 개발 환경

필수:

- Node.js 20+
- npm

환경 변수:

```bash
cp .env.example .env.local
```

주요 키는 `.env.example`을 기준으로 채웁니다. 최소 AI 채팅에는 `OPENROUTER_API_KEY`가 필요합니다. 검색, 이미지/음성/법률 보강 기능은 각 API 키가 있을 때 활성화됩니다.

## 실행

```bash
npm install
npm run dev
```

로컬 주소:

```text
http://127.0.0.1:3001
```

`npm run dev`는 Vite 개발 서버와 로컬 API 미들웨어를 함께 사용합니다.

## 검증

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run smoke:core
npm run verify
```

`smoke:core`는 Playwright로 다음 흐름을 확인합니다.

- 홈/일반 채팅 진입
- 토론 모드 전환
- 공부 모드 전환
- 플래너 라우트
- 위키 라우트

이미 실행 중인 서버를 검사하려면:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3001 npm run smoke:core
```

## 주요 디렉터리

```text
api/                  Vercel Serverless Functions
api/_lib/             API 공통 유틸리티
scripts/              로컬 개발/검증 스크립트
src/components/       React 컴포넌트
src/components/study/ AI 스터디룸
src/components/wiki/  마이위키
src/hooks/            React hooks
src/lib/              비 React 도메인 로직과 저장소
src/pages/            라우트 페이지
src/services/         서비스/스토어 계층
src/test/             Vitest 테스트
docs/                 아키텍처와 운영 문서
```

## 배포

기본 배포 대상은 Vercel입니다. `main` 브랜치 푸시 후 Vercel 프로젝트의 Production 배포 상태를 확인합니다.

```bash
vercel ls expert-chat-forum
```

자세한 배포 메모는 [docs/deployment.md](docs/deployment.md)를 참고합니다.

## 회귀 방지

기능을 손본 뒤에는 최소한 `npm run typecheck`, `npm test`, `npm run build`, `npm run smoke:core`를 확인합니다. 변경 범위가 UI나 라우팅이면 [docs/regression-checklist.md](docs/regression-checklist.md)를 따라 수동 확인도 병행합니다.
