# 구현계획서 (2026-04-10)

## 진행 상태

| # | 항목 | 상태 |
|---|------|------|
| 1 | 탭 전환 모션 | **완료** (framer-motion layoutId 슬라이딩 pill 적용) |
| 2 | 색상 띠 누락 | **완료** (slate/green/cyan/sky 4색 추가) |
| 3 | Auto 모델 설명 | **완료** (6개 모델 description + AUTO 배지 추가) |
| 4 | 레이더 차트 | **완료** (AIAbilityRadar 컴포넌트 + 15개 모델 데이터 추가) |
| 5 | 설정 패널 | **완료** (글꼴 크기, 스트리밍 토글, 자동저장, 대화 내보내기, 캐시 초기화 추가) |
| 6 | 보안/품질 | **완료** (CORS, 에러일반화, CSS Injection 방지. Rate Limiting/파일분할은 장기과제) |

---

## 1. AI 토론 탭 전환 모션 개선

### 현재 상태
- **파일:** `src/components/ExpertSelectionPanel.tsx:2164-2187`
- 탭 전환: `transition-all duration-300` (CSS만 사용)
- 활성 탭: `bg-indigo-500` 배경 + 흰 텍스트
- 콘텐츠 전환: opacity + scale 변화 (200ms/400ms)
- framer-motion **미설치**, tailwindcss-animate + CSS transition만 사용

### 문제
서브탭 전환이 단순 색상 변경만 있어 탭 간 종속 관계가 시각적으로 느껴지지 않음

### 구현계획

#### A. 탭 인디케이터 슬라이딩 모션
```
설치: npm install framer-motion
```

1. **슬라이딩 배경 인디케이터** — 활성 탭 뒤에 움직이는 배경 pill 추가
   - `motion.div`로 `layoutId="debate-tab-indicator"` 사용
   - 탭 클릭 시 현재 위치에서 목표 위치로 부드럽게 이동 (spring 물리)
   - `ExpertSelectionPanel.tsx:2164` 부근에 적용

2. **콘텐츠 전환 애니메이션** — AnimatePresence + 방향 감지
   - 탭 인덱스 비교로 좌→우 / 우→좌 슬라이드 방향 결정
   - `mode="wait"` 또는 `mode="popLayout"`으로 이전 콘텐츠 exit → 새 콘텐츠 enter
   - 적용 위치: `ExpertSelectionPanel.tsx` 내부 콘텐츠 렌더링 영역

3. **탭 호버 효과** — 비활성 탭에 미세 하이라이트
   - `whileHover={{ backgroundColor: "rgba(99,102,241,0.08)" }}`
   - 탭 간 이동 시 "연결감" 제공

#### B. 구현 단계
| 단계 | 작업 | 파일 |
|------|------|------|
| 1 | framer-motion 설치 | package.json |
| 2 | 탭 배경 슬라이딩 pill 구현 | ExpertSelectionPanel.tsx:2164 |
| 3 | 콘텐츠 슬라이드 전환 (방향 감지) | ExpertSelectionPanel.tsx:2210 |
| 4 | 돌아가기 버튼 모션 (탭바 축소/확장) | ExpertSelectionPanel.tsx:2140 |

#### C. 코드 스케치
```tsx
// 탭 슬라이딩 인디케이터
{tabs.map(t => (
  <button key={t.mode} onClick={() => onModeChange(t.mode)} className="relative px-3 py-1">
    {isActive && (
      <motion.div
        layoutId="debate-tab-bg"
        className="absolute inset-0 bg-indigo-500 rounded-full"
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      />
    )}
    <span className="relative z-10">{t.label}</span>
  </button>
))}

// 콘텐츠 방향 슬라이드
<AnimatePresence mode="wait" initial={false}>
  <motion.div
    key={discussionMode}
    initial={{ x: direction > 0 ? 80 : -80, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: direction > 0 ? -80 : 80, opacity: 0 }}
    transition={{ duration: 0.25, ease: "easeInOut" }}
  >
    {renderContent()}
  </motion.div>
</AnimatePresence>
```

---

## 2. AI 봇 색상 띠 누락 수정

### 현재 상태
- **렌더링 코드:** `ExpertSelectionPanel.tsx:2590-2599`
- **지원 색상:** 8가지만 — blue, emerald, red, amber, purple, orange, teal, pink
- **타입 정의:** `src/types/expert.ts:1` — `EXPERT_COLORS` 배열

### 문제 원인
EXPERTS_LIST.ts에서 일부 모델이 **지원되지 않는 색상**을 사용 중:

| 색상 | 해당 모델 | 라인 |
|------|-----------|------|
| `slate` | mistral-large, mistral-medium, mistral-small, codestral, mistral-creative, devstral | 190-226 |
| `cyan` | dolphin, mercury | 268, 340 |
| `sky` | hermes | 382 |
| `green` | command-r-plus, command-a, nemotron | 244, 250, 298 |

이 색상들은 `ExpertSelectionPanel.tsx:2591-2598`의 조건문에 없어서 색상 띠가 렌더링되지 않음.

### 구현계획

#### 방법 A: EXPERT_COLORS 확장 + 그래디언트 추가 (권장)

1. `src/types/expert.ts:1` 수정:
```typescript
export const EXPERT_COLORS = [
  'blue', 'emerald', 'red', 'amber', 'purple', 'orange', 'teal', 'pink',
  'slate', 'cyan', 'sky', 'green', 'indigo'
] as const;
```

2. `ExpertSelectionPanel.tsx:2590-2599`에 그래디언트 추가:
```typescript
'bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400': hoveredExpert.color === 'slate',
'bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-400': hoveredExpert.color === 'cyan',
'bg-gradient-to-r from-sky-400 via-sky-300 to-sky-400': hoveredExpert.color === 'sky',
'bg-gradient-to-r from-green-400 via-green-300 to-green-400': hoveredExpert.color === 'green',
```

3. **Tailwind safelist 추가** — 동적 클래스가 purge되지 않도록

#### 방법 B: 폴백 색상 추가

조건에 맞지 않을 때 기본 그래디언트 표시:
```tsx
<div className={cn('h-[3px] mx-2 mb-1 rounded-full bg-gradient-to-r from-gray-300 to-gray-400', {
  // ... 기존 조건들
})} />
```

#### 구현 단계
| 단계 | 작업 | 파일 |
|------|------|------|
| 1 | EXPERT_COLORS 배열에 누락 색상 추가 | src/types/expert.ts:1 |
| 2 | 색상 띠 그래디언트 조건 추가 | ExpertSelectionPanel.tsx:2590 |
| 3 | 색상 사용처 전체 검색 후 동일하게 적용 | ExpertAvatar.tsx 등 |
| 4 | Tailwind safelist 설정 | tailwind.config.ts |

---

## 3. Auto 모델 설명 텍스트 추가

### 현재 상태
- **Auto 모델 6개:** `EXPERTS_LIST.ts` 라인 22-54
  - `auto-gpt` (GPT) — "OpenAI 대표 AI 모델"
  - `auto-claude` (Claude) — "Anthropic 대표 AI 모델"
  - `auto-gemini` (Gemini) — "Google 대표 AI 모델"
  - `auto-grok` (Grok) — "xAI 대표 AI 모델"
  - `auto-perplexity` (Perplexity) — "Perplexity 대표 검색 AI"
  - `auto-qwen` (Qwen) — "Alibaba 대표 AI 모델"

### 문제
현재 description이 단순하여 auto 컨셉(질문에 맞는 최적 버전 자동 선택)이 전달되지 않음

### 구현계획

#### A. description 필드 업데이트

`EXPERTS_LIST.ts`에서 각 auto 모델의 description을 수정:

```typescript
// 라인 22-25
{ id: 'auto-gpt', name: 'GPT', description: '질문에 맞는 최적의 GPT 버전을 자동 선택하여 응답합니다', ... }
// 라인 28-30
{ id: 'auto-claude', name: 'Claude', description: '질문에 맞는 최적의 Claude 버전을 자동 선택하여 응답합니다', ... }
// 라인 34-36
{ id: 'auto-gemini', name: 'Gemini', description: '질문에 맞는 최적의 Gemini 버전을 자동 선택하여 응답합니다', ... }
// ... 동일 패턴
```

#### B. 팝업 UI에 "Auto" 배지 추가

`ExpertSelectionPanel.tsx`의 호버 팝업에서 auto 모델 식별:

```tsx
// id가 'auto-'로 시작하는지 확인
{hoveredExpert.id.startsWith('auto-') && (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-[9px] font-bold">
    <Sparkles className="w-3 h-3" /> AUTO
  </span>
)}
```

#### C. 그리드 표시에서도 "Auto" 라벨 추가

```tsx
// ExpertSelectionPanel.tsx:424 부근 description 아래
{expert.id.startsWith('auto-') && (
  <span className="text-[8px] text-violet-500 font-medium">⚡ 자동 버전 선택</span>
)}
```

#### 구현 단계
| 단계 | 작업 | 파일 |
|------|------|------|
| 1 | auto 모델 6개 description 업데이트 | EXPERTS_LIST.ts:22-54 |
| 2 | 호버 팝업에 AUTO 배지 추가 | ExpertSelectionPanel.tsx:2580 부근 |
| 3 | 그리드 뷰에 자동선택 라벨 추가 | ExpertSelectionPanel.tsx:424 |

---

## 4. 8각형 레이더 차트 능력치 표시

### 현재 상태
- **Recharts 설치됨:** `package.json:75` — `recharts: ^2.15.4`
- **RadarChart 미사용:** 현재 프로젝트에서 RadarChart 사용처 없음
- **참고할 기존 능력치 시스템:** `src/lib/gameProgress.ts:23-30` (5각형, 플레이어용)

### 구현계획

#### A. 데이터 구조 설계

**Expert 타입 확장** — `src/types/expert.ts`:
```typescript
export interface AIAbilityStats {
  coding: number;       // 코딩 능력 (0-100)
  creativity: number;   // 창의성 (0-100)
  reasoning: number;    // 추론력 (0-100)
  math: number;         // 수학 능력 (0-100)
  multilingual: number; // 다국어 (0-100)
  speed: number;        // 응답 속도 (0-100)
  costEfficiency: number; // 비용 효율성 (0-100)
  contextWindow: number;  // 토큰 용량 (0-100, 정규화)
}

export interface Expert {
  // ... 기존 필드
  abilities?: AIAbilityStats;  // 선택적 필드
}
```

#### B. 능력치 데이터 기준

| 평가축 | 데이터 소스 | 정규화 방법 |
|--------|-------------|-------------|
| 코딩 | HumanEval, SWE-bench | 벤치마크 점수 → 0-100 |
| 창의성 | 창작 벤치마크 + 정성 평가 | 상대 평가 |
| 추론력 | MMLU, ARC, HellaSwag | 벤치마크 점수 → 0-100 |
| 수학 | GSM8K, MATH | 벤치마크 점수 → 0-100 |
| 다국어 | 다국어 벤치마크 | 언어 수 + 품질 |
| 속도 | OpenRouter TTFT/TPS | 응답시간 역수 정규화 |
| 비용효율 | OpenRouter pricing | 가격 역수 정규화 |
| 토큰용량 | context window size | log 스케일 정규화 |

#### C. 레이더 차트 컴포넌트

**새 파일:** `src/components/AIAbilityRadar.tsx`

```tsx
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

interface Props {
  abilities: AIAbilityStats;
  color: string;
  name: string;
}

export function AIAbilityRadar({ abilities, color, name }: Props) {
  const data = [
    { axis: '코딩', value: abilities.coding },
    { axis: '창의성', value: abilities.creativity },
    { axis: '추론력', value: abilities.reasoning },
    { axis: '수학', value: abilities.math },
    { axis: '다국어', value: abilities.multilingual },
    { axis: '속도', value: abilities.speed },
    { axis: '비용효율', value: abilities.costEfficiency },
    { axis: '토큰용량', value: abilities.contextWindow },
  ];

  return (
    <ResponsiveContainer width={280} height={240}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="rgba(148,163,184,0.3)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={false}
          axisLine={false}
        />
        <Radar
          name={name}
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
```

#### D. 팝업 모달에 통합

`ExpertSelectionPanel.tsx` 호버 팝업에 조건부 레이더 차트 추가:

```tsx
{hoveredExpert.abilities && !hoveredExpert.id.startsWith('auto-') && hoveredExpert.id !== 'ancano' && (
  <AIAbilityRadar
    abilities={hoveredExpert.abilities}
    color={getColorHex(hoveredExpert.color)}
    name={hoveredExpert.nameKo}
  />
)}
```

#### E. EXPERTS_LIST.ts 데이터 추가 예시

```typescript
{
  id: 'gpt-5.4',
  name: 'GPT-5.4',
  abilities: {
    coding: 95, creativity: 90, reasoning: 95, math: 92,
    multilingual: 88, speed: 75, costEfficiency: 60, contextWindow: 85,
  },
  // ...
}
```

#### 구현 단계
| 단계 | 작업 | 파일 |
|------|------|------|
| 1 | AIAbilityStats 타입 정의 | src/types/expert.ts |
| 2 | Expert 인터페이스에 abilities 필드 추가 | src/types/expert.ts |
| 3 | AIAbilityRadar 컴포넌트 생성 | src/components/AIAbilityRadar.tsx (신규) |
| 4 | 주요 AI 모델 능력치 데이터 수집/입력 | EXPERTS_LIST.ts |
| 5 | 호버 팝업에 레이더 차트 조건부 렌더링 | ExpertSelectionPanel.tsx:2580 부근 |
| 6 | 색상 hex 변환 유틸 함수 | src/lib/utils.ts |

---

## 5. 설정 패널 개선

### 현재 상태
- 모드별 분산된 설정 패널 (`ExpertSelectionPanel.tsx` 내 6개 함수)
- 설정은 **세션 메모리에만 저장** (새로고침 시 초기화)
- 전역 설정 없음 (테마, 언어, 기본 모델 등)

### 현재 설정 항목
- 응답 길이, 라운드 수, 결론 포함 여부 (공통)
- 토론 톤, 말투, 근거 수, 형식 (찬반)
- 창의성, 아이디어 수, 중복 제거 (브레인스토밍)
- 검증 강도, 초점, 투자자 시뮬레이션 (검증)
- 상대 AI, 난이도 (키보드배틀)

### 추가 필요 설정 항목

#### A. 전역 설정 (새로 추가)

| 설정 | 타입 | 설명 |
|------|------|------|
| 테마 | `'light' \| 'dark' \| 'system'` | 다크모드 지원 |
| 언어 | `'ko' \| 'en' \| 'ja'` | UI 언어 |
| 기본 AI 모델 | `string` | 새 대화 시 기본 선택 모델 |
| 응답 언어 | `'auto' \| 'ko' \| 'en'` | AI 응답 언어 |
| 대화 내보내기 형식 | `'md' \| 'pdf' \| 'txt'` | 내보내기 기본 형식 |
| 자동 저장 | `boolean` | 대화 자동 저장 |
| 알림 설정 | `boolean` | 토론 완료 알림 |
| 글꼴 크기 | `'small' \| 'medium' \| 'large'` | 텍스트 크기 |

#### B. 고급 설정

| 설정 | 타입 | 설명 |
|------|------|------|
| 스트리밍 응답 | `boolean` | 실시간 타이핑 효과 on/off |
| Temperature | `number (0-2)` | AI 응답 창의성 조절 |
| 최대 토큰 | `number` | 응답 최대 길이 |
| 대화 기록 보관 일수 | `number` | 자동 삭제 기간 |

#### C. 구현 방법

1. **전역 설정 저장소** — `src/lib/settingsStore.ts` (신규)
```typescript
interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'ko' | 'en' | 'ja';
  defaultModel: string;
  fontSize: 'small' | 'medium' | 'large';
  autoSave: boolean;
  streaming: boolean;
  temperature: number;
}

// localStorage 기반 저장
const SETTINGS_KEY = 'ai-debate-settings-v1';
export function loadSettings(): AppSettings { ... }
export function saveSettings(settings: AppSettings): void { ... }
```

2. **설정 모달 컴포넌트** — `src/components/SettingsModal.tsx` (신규)
   - 탭 구조: 일반 / 토론 / 고급 / 계정
   - 각 탭에 해당 설정 그룹 배치

#### 구현 단계
| 단계 | 작업 | 파일 |
|------|------|------|
| 1 | AppSettings 인터페이스 정의 | src/types/expert.ts |
| 2 | settingsStore 생성 (localStorage) | src/lib/settingsStore.ts (신규) |
| 3 | SettingsModal 컴포넌트 구현 | src/components/SettingsModal.tsx (신규) |
| 4 | Index.tsx에서 설정 버튼 연결 | src/pages/Index.tsx |
| 5 | 테마/폰트 적용 로직 구현 | src/App.tsx 또는 index.css |

---

## 6. 코드 품질 & 보안 취약점 수정

### 즉시 수정 (높음 심각도)

#### 6.1 API 키 하드코딩 — `.env`
- **문제:** OpenRouter, DeepSeek API 키가 `.env`에 평문 저장, git에 커밋될 위험
- **수정:**
  1. `.gitignore`에 `.env`, `.env.local` 확인
  2. `git filter-branch` 또는 BFG Repo-Cleaner로 히스토리 정리
  3. OpenRouter, DeepSeek 키 즉시 재발급
  4. Vercel 환경 변수로만 관리

#### 6.2 CORS 와일드카드 — `api/chat.ts:134`
- **문제:** `Access-Control-Allow-Origin: *` → 모든 도메인 허용
- **수정:**
```typescript
const ALLOWED_ORIGINS = [process.env.FRONTEND_URL, 'http://localhost:5173'];
const origin = req.headers.origin;
if (ALLOWED_ORIGINS.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}
```
- **적용 범위:** api/ 디렉토리의 모든 엔드포인트

#### 6.3 CSS Injection — `src/components/ui/chart.tsx:70`
- **문제:** `dangerouslySetInnerHTML`에 검증 없이 색상값 삽입
- **수정:** CSS 색상값 화이트리스트 검증 함수 추가

### 단기 수정 (중간 심각도)

#### 6.4 Rate Limiting 부재
- **문제:** 모든 API에 요청 제한 없음
- **수정:** Vercel Edge Middleware + Upstash Redis rate limiter
```
파일: api/_middleware.ts (신규)
- IP별 분당 30회 제한
- 사용자별 시간당 100회 제한
```

#### 6.5 에러 메시지 정보 노출
- **위치:** `api/drug-search.ts:69`, `api/procon-stance.ts:86-88`
- **수정:** 사용자에게는 일반 메시지, 서버 로그에만 상세 에러

#### 6.6 프롬프트 인젝션
- **위치:** `api/chat.ts:50` — 사용자 입력이 프롬프트에 직접 연결
- **수정:** 입력 새니타이징 + 시스템 프롬프트 격리

### 장기 개선 (성능)

#### 6.7 Index.tsx 분할 (7,498줄)
- **목표:** 2,000줄 이하로 분할
- **방법:**
  - `src/pages/DebateMode.tsx` — 토론 로직 분리
  - `src/pages/PremiumMode.tsx` — 프리미엄 자문 분리
  - `src/pages/BattleMode.tsx` — AI vs User 분리
  - `src/hooks/useDiscussionState.ts` — 상태 로직 커스텀 훅

#### 6.8 상태 관리 최적화
- **문제:** 37개+ useState가 하나의 컴포넌트에 집중
- **수정:** Zustand 도입으로 관련 상태 그룹화

### 수정 우선순위 표

| 순위 | 항목 | 심각도 | 예상 작업량 |
|------|------|--------|-------------|
| 1 | API 키 재발급 + gitignore | 높음 | 30분 |
| 2 | CORS 제한 | 높음 | 1시간 |
| 3 | Rate Limiting | 중간 | 3시간 |
| 4 | 에러 메시지 일반화 | 중간 | 1시간 |
| 5 | CSS Injection 방지 | 높음 | 30분 |
| 6 | 프롬프트 인젝션 방지 | 중간 | 2시간 |
| 7 | Index.tsx 분할 | 중간 | 8시간 |
| 8 | 상태 관리 리팩토링 | 낮음 | 12시간 |
