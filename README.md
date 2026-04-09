# Expert Chat Forum

멀티 AI 토론, 일반 채팅, 프리미엄 자문을 한 화면에서 다루는 React + Vite 프로젝트입니다.

## 핵심 기능

- 일반 채팅, 멀티 AI, 찬반토론, 자유토론
- 프리미엄 자문 모드
  - 법률
  - 의약품
  - 금융
  - 부동산
  - 세무
  - 노무
- 첨부파일 기반 질문
  - 이미지: PNG, JPG, GIF, WEBP
  - 문서: PDF, DOCX, XLSX
- 이미지 붙여넣기, 드래그 앤 드롭, 다중 첨부

## 첨부파일 정책

- 파일당 최대 10MB
- 전체 최대 20MB
- 한 번에 최대 5개
- DOCX, XLSX는 텍스트를 추출해서 전송
- 이미지와 PDF는 모델에 직접 전달
- 질문 없이 파일만 첨부해도 자동 질문으로 전송

## 개발 환경

필수:

- Node.js 18+
- npm
- `GEMINI_API_KEY`

예시 `.env.local`

```bash
GEMINI_API_KEY=your_key_here
```

## 실행 방법

```bash
npm install
npm run dev
```

추가 명령어:

```bash
npm run build
npm run test
```

## 확인한 주요 경로

- 메인 입력창: `src/components/QuestionInput.tsx`
- 프리미엄 자문 채팅: `src/components/PremiumConsultChat.tsx`
- 파일 처리: `src/lib/fileProcessor.ts`
- 일반 채팅 API: `api/chat.ts`
- 프리미엄 자문 API: `api/premium-consult.ts`

## 수동 QA 체크리스트

1. 일반 채팅에서 이미지 1장만 첨부 후 전송
2. 일반 채팅에서 PDF만 첨부 후 전송
3. 일반 채팅에서 DOCX/XLSX 첨부 후 전송
4. 일반 채팅에서 이미지 붙여넣기 후 전송
5. 일반 채팅에서 파일 2~3개 동시 첨부
6. 프리미엄 자문에서 이미지/PDF 첨부 후 전송
7. 프리미엄 자문에서 파일만 첨부 후 전송
8. 10MB 초과 파일 차단 확인
9. 지원하지 않는 형식 차단 확인
10. 같은 파일 중복 첨부 차단 확인

## 참고

- 빌드 시 대형 chunk 경고가 나올 수 있지만 현재 동작 자체를 막는 오류는 아닙니다.
- 서버 API도 첨부파일 형식과 크기를 다시 검증합니다.
