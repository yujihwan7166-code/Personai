# Expert Chat Forum (Personai)

246+ AI 전문가와 토론·상담·브레인스토밍, 그리고 캘린더·할일·습관·학습까지 한 곳에서.
React 18 + Vite + TypeScript + Tailwind + Vercel.

## 주요 기능

**대화·자문**
- 단일 AI / 멀티 AI 비교 / AI 토론(찬반·자유·심층·키보드배틀)
- AI 리허설 — 이해관계자 역할극으로 아이디어 검증
- AI 법률 자문 (참고용 정보)
- 심층 리서치 (멀티 AI 교차 검증 리포트)

**학습·창작**
- AI 스터디룸 — PDF/녹음/URL → 요약·퀴즈·플래시카드·팟캐스트·도식
- 음성 분석 — 전사·요약·챕터·액션 추출
- 다국어 번역, 파일 변환, 이미지·동영상 생성

**라이프**
- 사주·타로·AI 캐릭터 챗·게임 (AI Play)
- 쇼핑·여행·운동·식단 (예정)

**노트(행동·성장 8개)** — 구현 예정
- 행동: 오늘 / 캘린더 / 할 일 / 습관
- 성장: 마이위키 / 포모도로 / 데일리 브리핑 / 일기

## 첨부파일 정책

- 파일당 최대 10MB / 전체 20MB / 한 번에 최대 5개
- 이미지·PDF: 모델에 직접 전달
- DOCX·XLSX: 텍스트 추출 후 전달
- 질문 없이 파일만 첨부해도 자동 질문으로 전송

## 개발 환경

**필수**: Node.js 20+ (CI 기준), npm

**환경변수 설정**
```bash
cp .env.example .env.local
# 필수 키 채우기: OPENROUTER_API_KEY, SERPER_API_KEY, OPENAI_API_KEY
```

자세한 키 목록은 [`.env.example`](.env.example) 참고.

## 실행

```bash
npm install
npm run dev          # http://127.0.0.1:3001
```

## 빌드·검증

```bash
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest 전체
npm run build        # 프로덕션 빌드
npm run verify       # lint + typecheck + test + build (PR 게이트)

ANALYZE=1 npm run build   # dist/bundle-stats.html 생성
```

## 배포

Vercel 자동 배포(main 푸시). 자세한 가이드: [`docs/deployment.md`](docs/deployment.md).

## 아키텍처 문서

- [`docs/architecture/data-and-auth.md`](docs/architecture/data-and-auth.md) — 데이터 모델·인증 결정 (노트 8개 구현 전 필독)

## 법적 페이지

- [`/privacy`](src/pages/Privacy.tsx) — 개인정보 처리방침
- [`/terms`](src/pages/Terms.tsx) — 이용약관

## 디렉터리 구조 (요약)

```
api/                  Vercel Serverless Functions (36 routes)
api/_lib/             API 공유 유틸 (OpenRouter·검색·법률 provider)
src/components/       React 컴포넌트
src/components/study/ AI 스터디룸 (노트북 시스템)
src/components/voice-analysis/  음성 분석
src/hooks/            React 훅
src/lib/              비-React 유틸·저장소
src/services/         서비스 레이어 (usageTracker 등)
src/pages/            라우트 페이지
src/types/            도메인 타입
docs/                 아키텍처·배포 문서
.github/workflows/    CI
```

## 기여

- 작업 브랜치는 기본 `main` (단일 개발자 워크플로우)
- pre-commit: lint-staged 가 변경 파일 ESLint 자동 수정
- PR 게이트(CI): lint + typecheck + 전체 테스트 + 빌드 — 모두 통과해야 머지

## 참고

- 첫 빌드는 청크 분리(charts/ppt/xlsx/auth/markdown/motion/radix) 적용. 추가 분리는 [`vite.config.ts`](vite.config.ts) `manualChunks` 에서.
- 서버 API 는 첨부파일 형식·크기를 클라와 별도로 재검증.
