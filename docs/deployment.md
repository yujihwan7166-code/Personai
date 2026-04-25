# 배포 가이드

> Vercel 기준. Hobby 플랜으로도 충분히 운영 가능.

## 사전 준비

1. GitHub 저장소가 Vercel 프로젝트와 연결돼 있어야 함 (이미 됨).
2. `.env.example` 의 키 목록 확인.
3. 외부 서비스 키 발급:
   - **OpenRouter** — https://openrouter.ai/keys
   - **Serper** — https://serper.dev/api-key
   - **OpenAI** (음성 전사용) — https://platform.openai.com/api-keys
   - 나머지(법령·BOK·FSS·DRUG)는 해당 기능 사용 시에만 발급

## Vercel 환경변수 등록

Vercel 대시보드 → Project Settings → Environment Variables 에서 `.env.example` 의 필수 키들을 등록.

**환경별 분리 권장**:
- `Production` — 실제 키
- `Preview` — 테스트 키 (또는 동일 키 재사용)
- `Development` — 로컬 `.env.local` 에서 관리

## 자동 배포

`main` 푸시 시 자동 배포되도록 Vercel 대시보드 → Settings → Git 에서 확인:
- **Production Branch**: `main`
- **Preview**: 다른 브랜치는 자동 프리뷰 URL 생성

## 배포 후 점검 체크리스트

- [ ] 메인 페이지 로드 확인
- [ ] `/privacy`, `/terms` 페이지 접속 가능
- [ ] 존재하지 않는 경로(예: `/asdf`) → 404 페이지로 리다이렉트
- [ ] AI 채팅 1회 호출 — OPENROUTER_API_KEY 정상
- [ ] 검색 1회 호출 — SERPER_API_KEY 정상
- [ ] 보안 헤더 확인:
  ```bash
  curl -I https://your-domain.com | grep -iE "x-frame|x-content|referrer|hsts"
  ```
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: SAMEORIGIN
  - Referrer-Policy: strict-origin-when-cross-origin
  - Strict-Transport-Security: …

## 도메인 연결

커스텀 도메인이 있으면 Vercel 대시보드 → Settings → Domains 에 추가.
DNS 는 Vercel 가이드대로 (A 레코드 또는 CNAME).

## 롤백

문제 발생 시 Vercel 대시보드 → Deployments → 이전 배포에서 "Promote to Production" 클릭.

## 모니터링 (TODO)

배포 후 다음 도구 도입 검토:
- **Sentry** — 클라이언트·서버 에러 추적 (무료 5K events/month)
- **Vercel Analytics** — Web Vitals
- **API 사용량 모니터링** — `docs/architecture/data-and-auth.md` 의 Step 1 이후 자체 구현

## 문제 해결

**빌드 실패**:
- Vercel 빌드 로그 확인
- 로컬에서 `npm run verify` 통과 여부 확인
- 환경변수 누락 시 `process.env.X` 사용처에서 런타임 에러

**API 호출 실패**:
- Vercel Functions 로그에서 해당 라우트 확인
- 키 발급 직후 키가 활성화될 때까지 시간차 (몇 분) 가능
