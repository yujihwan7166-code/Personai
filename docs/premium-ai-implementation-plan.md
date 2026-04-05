# 프리미엄 AI 모드 — 구현 계획서 v2

> 디자인 레퍼런스 리서치 반영 (Harvey AI, Perplexity, Ada Health, Wealthfront)

---

## 현재 상태 진단

### 이미 만들어진 것
- **PremiumDomainLanding.tsx** — 3개 도메인(법률/의약/금융) 카드 랜딩 페이지
- **PremiumConsultChat.tsx** — 상담 채팅 UI (스트리밍, 인용 배지, 소스 패널)
- **TrustIndicator.tsx** — 신뢰도 배지 (초록: API 연동, 노랑: 미연동)
- **CitationBadge.tsx** — `{{cite:법령명}}` 파싱 및 인라인 배지 렌더링
- **premium-consult.ts** — 6개 도메인 API (키워드 추출 → 공공데이터 검색 → Gemini 스트리밍)
- **api-enrichment.ts** — 인용 컨텍스트 빌드, 신뢰 헤더 생성

### 깨진 부분 (핵심 문제)
- **PremiumConsultChat가 연결 안 됨** — 도메인을 클릭해도 상담 화면이 안 열림
- **ExpertModePanel이 끼어 있음** — 레거시 시스템이 premium 진입을 가로채는 구조
- **6개 도메인 중 3개(부동산/세무/노무)는 전용 API 엔드포인트 없음** — AI 지식 기반 답변만 가능

---

## 디자인 레퍼런스

### Harvey AI (법률) — 디자인 시스템 철학
- 색상 토큰: **의미 기반 네이밍** (`bg-hy-bg-base`, `text-hy-fg-subtle`)
- 법률 도메인 전체에 **warm amber hue 90도 고정** — 모든 서피스/액센트 일관 톤
- 타이포: 커스텀 서체, heading/body 의미 기반 계층 (`heading-2`, `body-1`)
- 12컬럼 그리드, 최대 폭 1728px, 반응형 gap 토큰
- 핵심: **채팅 + 문서 편집이 하나의 스레드** — citation paper trail로 출처 역추적

### Perplexity AI (인용) — 인라인 각주 패턴
- **3색 코어**: Offblack + Paper White + True Turquoise(`#20b8cd`)
- 다크 서피스 3단계: `#1a1a1a` → `#242424` → `#3a3a3a`
- 인용 UI: 인라인 `[1]` superscript → 호버 시 favicon + 제목 + 스니펫 팝오버
- 진행 단계: plan → step-by-step 실행 과정을 실시간 표시
- 철학: "색상이 거의 투명해야 한다 — 과도한 브랜딩은 검색을 방해"

### Ada Health (의료) — 단계별 문진
- 프라이머리: `#4E6EA9` (slate blue — 의료 신뢰감)
- **1문항 1화면**: 복잡한 의학 문진을 차분한 step-by-step 채팅으로 분해
- 봇/유저 메시지: **완전히 다른 폰트, 크기, 색상** — 발화자 즉시 구분
- 결과: **확률 아이콘 그리드** + 긴급도 컬러코드 (녹→주황→적)
- Progressive disclosure: 요약 먼저, 탭하면 의학 세부사항

### Wealthfront (금융) — 데이터 시각화
- **순자산 프로젝션 차트** — 텍스트가 아닌 시각적 표현이 핵심
- 모듈형 카드: 계좌, 부채, 부동산 평가가 개별 플러그인
- 그린=수익/성공, 레드=손실/위험 의미 기반 컬러
- OKLCh 색공간 사용

### 인용 UI 패턴 비교 (ShapeofAI 9개 제품 분석)

| 패턴 | 제품 | 우리 적용 |
|------|------|----------|
| 인라인 `[n]` + 호버 팝오버 | Perplexity | **법률/의약/금융 전 도메인** |
| 정책 근거 인용 | Fin Copilot | 법률 도메인 (법령 조문 인용) |
| 원문 passage 하이라이트 | Adobe PDF | 의약 도메인 (식약처 데이터 직접 인용) |
| 모듈형 데이터 카드 | Wealthfront | 금융 도메인 (금리/지표 카드) |

---

## 1. 도메인 선택 화면 (Landing)

### 레이아웃: 2행 × 3열 그리드

```
┌──────────────────────────────────────────────────────┐
│  🔬 분야별 전문가 팀이 깊이 있는 상담을 제공합니다    │
│  실시간 공공 데이터 연동 · 구조화된 전문가 답변        │
├──────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                  │
│ │ ⚖️ 법률  │ │ 💊 의약  │ │ 💰 금융  │  ← 1행         │
│ │ amber   │ │ emerald │ │ blue    │                  │
│ └─────────┘ └─────────┘ └─────────┘                  │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                  │
│ │ 🏠 부동산│ │ 🧾 세무  │ │ 👷 노무  │  ← 2행         │
│ │ violet  │ │ cyan    │ │ orange  │                  │
│ └─────────┘ └─────────┘ └─────────┘                  │
├──────────────────────────────────────────────────────┤
│ ⚠️ AI 참고 자문이며, 전문가 확인이 필요합니다         │
└──────────────────────────────────────────────────────┘
```

### 카드 디자인 — Harvey AI 토큰 철학 적용

```
┌─ 3px amber 상단 악센트 ──────────────────────┐
│  padding: 20px                                │
│                                               │
│  ⚖️  법률 자문관         ← 16px bold          │
│                                               │
│  ⚡ 국가법령정보센터      ← 9px 배지 (API 연동) │
│  또는                                          │
│  🧠 AI 전문 지식         ← 9px 배지 (미연동)   │
│                                               │
│  법령·판례 기반 법률 분석 ← 11px slate-500      │
│                                               │
│  "전세 사기 당했을 때?"  ← 10px 샘플 1개       │
│                                               │
│  [  상담 시작 →  ]       ← CTA, 도메인 색상   │
│                                               │
│  border-radius: 12px                          │
│  border: 1px solid slate-200                  │
│  hover: shadow-lg + 악센트 3px→4px            │
└───────────────────────────────────────────────┘
```

**핵심 원칙**:
- 카드 배경은 **흰색** — Perplexity 철학 "과도한 브랜딩 금지"
- 색상은 **상단 악센트 라인 + CTA 버튼**에만 사용
- 호버 시 과한 스케일/회전 없음 — shadow + 악센트 두께만 미세 변화
- API 연동 도메인과 미연동 도메인을 배지로 명확히 구분

### 6개 도메인 색상 시스템

| 도메인 | 메인 | 서피스 | CTA gradient | 데이터 출처 |
|--------|------|--------|-------------|------------|
| 법률 | amber-500 | amber-50 | amber-500→amber-600 | ⚡ 국가법령정보센터 |
| 의약 | emerald-500 | emerald-50 | emerald-500→emerald-600 | ⚡ 식약처 의약품안전나라 |
| 금융 | blue-500 | blue-50 | blue-500→blue-600 | ⚡ 한국은행 · 금감원 |
| 부동산 | violet-500 | violet-50 | violet-500→violet-600 | 🧠 AI 전문 지식 |
| 세무 | cyan-500 | cyan-50 | cyan-500→cyan-600 | 🧠 AI 전문 지식 |
| 노무 | orange-500 | orange-50 | orange-500→orange-600 | 🧠 AI 전문 지식 |

---

## 2. 상담 진입 흐름

```
[프리미엄 AI 모드 탭]
    ↓
[PremiumDomainLanding] — 6개 도메인 카드
    ↓ (도메인 클릭)
[PremiumConsultChat] — 해당 도메인 상담 채팅
    ↓ (← 뒤로)
[PremiumDomainLanding] — 돌아오기
```

### 상태 관리
```typescript
// Index.tsx
const [selectedPremiumDomain, setSelectedPremiumDomain] = useState<PremiumDomainId | null>(null);
```
- `null` → 랜딩 표시
- `'law'` 등 → 상담 채팅 표시

### 전환 시 필요한 작업
1. `ExpertSelectionPanel`에서 `selectedExpertModeTemplate` 레거시 분기 제거
2. `onSelectPremiumDomain` → Index.tsx의 `setSelectedPremiumDomain` 연결
3. 조건부 렌더: domain 있으면 `PremiumConsultChat`, 없으면 `PremiumDomainLanding`

---

## 3. 상담 채팅 화면

### 레이아웃 (데스크탑) — Perplexity 참조 패널 패턴

```
┌─ 헤더 ──────────────────────────────────────────────────────────┐
│ ← 뒤로  ⚖️ 법률 자문관  [✅ 국가법령정보센터 · 3건 참조] 📋    │
│          ↑ 도메인명       ↑ TrustIndicator        ↑ 소스 토글   │
└─────────────────────────────────────────────────────────────────┘
┌─ 채팅 영역 ──────────────────────┬─ 참조 패널 (280px) ──────────┐
│                                  │                              │
│  [빈 상태: 아이콘 + 설명 +       │  📋 참조 데이터 (0)           │
│   샘플 질문 3개]                 │                              │
│                                  │  상담을 시작하면              │
│  또는                             │  참조된 법령·판례가           │
│                                  │  여기에 표시됩니다            │
│  [메시지 스트림]                  │                              │
│                                  │  ─────────────────────────   │
│                                  │  [1] 📋 민법 제303조         │
│                                  │      국가법령정보센터         │
│                                  │      "전세권자는 전세금의..." │
│                                  │      [원문 보기 →]           │
│                                  │  ─────────────────────────   │
│                                  │  [2] ⚖️ 대법원 2023다1234   │
│                                  │      ...                     │
│                                  │                              │
├─ 입력 ───────────────────────────┤                              │
│ [질문 입력...]            [전송]  │                              │
└──────────────────────────────────┴──────────────────────────────┘
```

### 레이아웃 (모바일)
- 참조 패널 숨김, 헤더 📋 버튼 → 바텀시트로 표시
- 현재 `PremiumConsultChat`에 이미 이 로직 구현되어 있음

### 빈 상태 (Ada Health 단순 진입 패턴)

```
              ⚖️
          법률 자문관
          
    법령·판례 데이터를 실시간 검색하여
    구조화된 법률 분석을 제공합니다

    ┌──────────────────────────────────┐
    │ 💬 전세 사기 당했을 때 대처법은?  │
    ├──────────────────────────────────┤
    │ 💬 중고거래 환불 의무가 있나요?   │
    ├──────────────────────────────────┤
    │ 💬 초상권 침해 기준이 뭔가요?    │
    └──────────────────────────────────┘
    
    ↑ 클릭하면 자동으로 입력창에 들어가고 전송
```

---

## 4. 상담 진행 시각화 — Perplexity step-by-step 패턴

일반 챗봇과 프리미엄의 **가장 큰 차이**. Perplexity가 "검색 중... → 분석 중..."을 보여주는 것처럼, API 파이프라인의 각 단계를 시각적으로 표시.

### 진행 UI (메시지 영역에 인라인으로 표시)

```
┌─ 분석 진행 ──────────────────────────────┐
│                                          │
│  ✓ 키워드 분석 완료                0.8s  │
│  ✓ 관련 법령 3건 발견              1.2s  │
│  ● 법률 분석 수행 중...                   │
│  ○ 답변 생성                             │
│                                          │
│  ▰▰▰▰▰▰▱▱▱▱ 60%                        │
└──────────────────────────────────────────┘

→ 스트리밍 시작 시: 위 UI가 fade-out + collapse, 답변 메시지로 자연스럽게 전환
```

### API 구현 — SSE step 이벤트

```
// premium-consult.ts 수정
// 기존: trust 이벤트 1개만 전송
// 변경: step 이벤트를 단계별로 전송

res.write(`data: ${JSON.stringify({ type: 'step', step: 1, label: '키워드 분석 완료' })}\n\n`);
// ... 키워드 추출 후 ...
res.write(`data: ${JSON.stringify({ type: 'step', step: 2, label: '관련 법령 3건 발견', count: 3 })}\n\n`);
// ... 검색 후 ...
res.write(`data: ${JSON.stringify({ type: 'trust', trustHeader, citations })}\n\n`);
// ... Gemini 스트리밍 시작 ...
res.write(`data: ${JSON.stringify({ type: 'step', step: 3, label: '답변 생성 중' })}\n\n`);
```

### 도메인별 스텝 라벨

| 단계 | 법률 | 의약 | 금융 | 부동산 | 세무 | 노무 |
|------|------|------|------|--------|------|------|
| 1 | 키워드 분석 | 증상 파악 | 재무 진단 | 매물 분석 | 세무 진단 | 사건 파악 |
| 2 | 법령·판례 검색 | 약품 정보 조회 | 시장 데이터 조회 | 시세 조회 | 법령 조회 | 법령 조회 |
| 3 | 법률 분석 | 약학 분석 | 재무 분석 | 권리 분석 | 세액 분석 | 권리 분석 |
| 4 | 답변 생성 | 건강 안내 | 전략 제시 | 투자 판단 | 절세 전략 | 대응 전략 |

---

## 5. 인라인 인용 — Perplexity `[n]` 패턴

### 현재 → 목표

```
현재: {{cite:민법 제303조}} → "[민법 제303조]" 텍스트

목표: {{cite:민법 제303조}} → [1] superscript + hover popover
```

### 렌더링 예시

```
전세보증금은 민법 제303조[1]에 따라 우선변제권이 인정되며,
주택임대차보호법 제3조의2[2]에 의해 대항력을 갖습니다.

     [1] 호버 시:
     ┌───────────────────────────────┐
     │ 📋 민법 제303조               │
     │ 출처: 국가법령정보센터         │
     │ "전세권자는 전세금의 반환..."  │
     │ 원문 보기 →                   │
     └───────────────────────────────┘
```

### 구현 — 기존 인프라 활용
- `CitationBadge.tsx`의 `parseCitedContent` 이미 `{{cite:...}}` 파싱
- 변경: 배지 대신 `[n]` superscript 렌더 + shadcn `Popover` 컴포넌트로 호버
- 각주 번호 색상: 도메인 색상 (`text-amber-500` 법률, `text-emerald-500` 의약 등)
- 참조 패널의 `[n]` 번호와 동기화

---

## 6. 메시지 렌더링 — Ada Health 메시지 차별화

### AI 응답: 구조화된 보고서 형태 (말풍선 아님)

```
┌─ 3px amber 좌측 악센트 ──────────────────────────────┐
│                                                      │
│ ⚖️ 법률 자문관                                10:42  │
│ ────────────────────────────────────────────────     │
│                                                      │
│ ## 사건 분석                                         │
│ 전세 사기 피해의 핵심 쟁점은 보증금 반환             │
│ 청구권입니다. 민법 제303조[1]에 따라...              │
│                                                      │
│ ## 적용 법령                                         │
│ - 민법 제303조 (전세권의 내용)[1]                    │
│ - 주택임대차보호법 제3조의2[2]                       │
│                                                      │
│ ## 권장 조치                                         │
│ 1. 내용증명 발송 (기한: 14일 이내)                  │
│ 2. 임차권등기명령 신청                               │
│ 3. 보증금반환 소송 검토                              │
│                                                      │
│ ────────────────────────────────────────────────     │
│ ⚠️ AI 참고 자문입니다. 변호사 확인이 필요합니다.     │
│                                                      │
│ [1] 민법 제303조  [2] 주택임대차보호법 제3조의2      │
└──────────────────────────────────────────────────────┘
```

### 사용자 메시지: 오른쪽 정렬, 미니멀

```
                               ┌─ slate-800 bg ──────┐
                               │ 전세 사기 당했을 때  │
                               │ 어떻게 해야 하나요?  │
                               └─────────────────────┘
```

### 핵심 차별화 (Ada Health 참고)
- AI 메시지: **좌측 도메인 색상 악센트 라인 3px** + 넓은 여백 + 마크다운 구조
- 유저 메시지: **오른쪽 정렬** + 다크 버블 + 작은 크기
- 폰트 크기 차이: AI 13px / 유저 12px — 미세하지만 계층 형성
- 면책 고지: 매 AI 응답 하단에 자동 삽입 (프롬프트에서 생성)

---

## 7. 후속 질문 제안

```
[AI 응답 완료]

💡 이어서 물어보기:
┌─────────────────────────────────────┐
│ 내용증명 작성 방법을 알려주세요      │  ← 클릭 → 자동 전송
├─────────────────────────────────────┤
│ 소송 비용은 얼마나 드나요?          │
├─────────────────────────────────────┤
│ 전세보증보험으로 보상받을 수 있나요? │
└─────────────────────────────────────┘
```

### 구현
- 프롬프트 추가: "답변 끝에 `{{followup:질문1||질문2||질문3}}` 형식으로 후속 질문 3개"
- 프론트: 파싱 → 클릭 가능한 카드로 렌더
- 클릭 시 자동 입력 + 전송

---

## 8. 대화 이력 관리

### 사이드바 통합 (기존 AppSidebar 활용)

```
┌─ 사이드바 ──────────────┐
│ 📋 대화 이력             │
│ ────────────────────────│
│ [일반 대화]              │
│  · GPT와 코딩 질문       │
│  · Claude 블로그 작성    │
│                          │
│ [프리미엄 상담]           │
│  · ⚖️ 전세 사기 대처법   │
│  · 💊 타이레놀 복용법     │
│  · 💰 ETF 포트폴리오     │
└──────────────────────────┘
```

### 저장 구조
- `DiscussionRecord`에 `domain?: PremiumDomainId` + `citations?: ApiSourceCitation[]` 추가
- 사이드바: 도메인 아이콘으로 구분 표시

---

## 9. 파일별 변경 계획

| 파일 | 변경 내용 |
|------|----------|
| `src/types/expert.ts` | `PREMIUM_DOMAIN_TEMPLATES`에 부동산/세무/노무 추가 |
| `src/components/PremiumDomainLanding.tsx` | 2x3 그리드, 카드 디자인 개선, 6개 도메인 |
| `src/components/PremiumConsultChat.tsx` | 진행 스텝 UI, 후속 질문 파싱, AI/유저 메시지 차별화 |
| `src/components/CitationBadge.tsx` | `[n]` superscript + Popover 호버 미리보기 |
| `src/components/ExpertSelectionPanel.tsx` | 레거시 `selectedExpertModeTemplate` 분기 정리, 상담 연결 |
| `src/pages/Index.tsx` | `selectedPremiumDomain` state, 상담↔랜딩 전환 |
| `src/lib/discussionHistoryStore.ts` | `domain`, `citations` 필드 추가 |
| `api/premium-consult.ts` | SSE step 이벤트 추가 |

---

## 10. 구현 순서

### Phase 1 — 연결 (깨진 핵심 복구)
1. `selectedPremiumDomain` state 추가 (Index.tsx)
2. 도메인 선택 → `PremiumConsultChat` 렌더 연결
3. 뒤로가기 → 랜딩 복귀
4. ExpertModePanel 레거시 분기 정리

### Phase 2 — 6개 도메인 확장
5. `PREMIUM_DOMAIN_TEMPLATES`에 부동산/세무/노무 추가
6. `PremiumDomainLanding` 2x3 그리드 + 카드 디자인 개선
7. 각 도메인 색상/아이콘/샘플질문/데이터 출처 배지

### Phase 3 — 상담 품질 (프리미엄 차별화)
8. 진행 스텝 시각화 (API SSE step 이벤트 → 프론트 스텝 UI)
9. 인용 `[n]` + Popover 호버 (Perplexity 패턴)
10. AI/유저 메시지 차별화 (Ada Health 패턴)
11. 후속 질문 제안 시스템

### Phase 4 — 이력 관리
12. 상담 이력 저장 (discussionHistoryStore 확장)
13. 사이드바 도메인별 아이콘 표시
14. 이전 상담 복원

---

## 보류 (v1 제외)

| 기능 | 제외 이유 |
|------|----------|
| PDF 내보내기 | pptGenerator 있으므로 나중에 추가 |
| AI 도메인 자동 라우터 | 6개면 직접 선택 충분 |
| 인라인 차트 (Wealthfront 스타일) | 금융 도메인 v2에서 |
| 부동산/세무/노무 공공 API 연동 | API 키 확보 후 별도 |
| 다크 모드 전용 테마 | 전체 다크모드 지원 시 함께 |

---

## 디자인 레퍼런스 링크

- [Harvey AI: Design System Rebuild](https://www.harvey.ai/blog/rebuilding-harveys-design-system-from-the-ground-up)
- [Harvey AI: Unified Experience](https://www.harvey.ai/blog/a-more-unified-harvey-experience)
- [Perplexity: Citation Design Guide](https://www.unusual.ai/blog/perplexity-platform-guide-design-for-citation-forward-answers)
- [ShapeofAI: Citation Patterns](https://www.shapeof.ai/patterns/citations)
- [Ada Health: Design Case Study](https://medium.com/nyc-design/ada-your-doctor-bot-design-case-study-and-sketch-4c4cb75bc9e8)
- [Wealthfront: New Dashboard](https://www.wealthfront.com/blog/introducing-new-dashboard/)
- [Dribbble: AI Dashboard](https://dribbble.com/tags/ai-dashboard)
- [Dribbble: Dark Dashboard](https://dribbble.com/tags/dark_dashboard)
