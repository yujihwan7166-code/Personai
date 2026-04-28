/**
 * 시드 — 3번 메인 "🚀 프로젝트" + 개인 프로젝트 5개.
 */

import type { WikiPage } from '@/types/wiki';
import { newWikiId } from '@/types/wiki';

const NOW = Date.now();
const CALLOUT = `> 📌 **예시 문서** — 본인의 프로젝트로 자유롭게 바꿔 쓰세요.\n> 모든 내용은 가상입니다.\n\n`;

interface ProjectInput {
  title: string;
  status: '진행 중' | '마무리' | '보류';
  pageStatus: 'active' | 'stable' | 'draft' | 'archived';
  body: string;
}

export function buildProjectsPages(): WikiPage[] {
  const mainId = newWikiId();

  const base = {
    aliases: [] as string[],
    cites: [] as string[],
    inherits: [] as string[],
    similarTo: [] as string[],
    refersTo: [] as string[],
    createdAt: NOW,
    updatedAt: NOW,
    tags: ['example', '프로젝트'] as string[],
  };

  const main: WikiPage = {
    ...base,
    id: mainId,
    title: '🚀 프로젝트',
    aliases: ['Projects', 'Side', '프로젝트'],
    type: 'moc',
    isMain: true,
    status: 'active',
    category: '예시 · 프로젝트',
    parentMocs: [],
    body: `${CALLOUT}# 🚀 프로젝트

> "회사 일은 회사가, 내가 자라는 일은 내가." — [[👤 김민철]]

회사 밖에서 굴리는 사이드 프로젝트들. 동시에 너무 많이 벌이지 않으려고 의식적으로 \`진행 중\` 은 1~2개로 제한.

---

## 한눈에

| 상태 | 프로젝트 | 시작 | 비고 |
|---|---|---|---|
| 🟢 진행 중 | [[개인 위키 v2]] | 2025.09 | 머릿속 정돈 도구 |
| 🟢 진행 중 | [[홈서버 NAS 구축]] | 2025.06 | 마무리 단계 |
| 🟡 보류 | [[주식 자동매매 봇]] | 2024.11 | 원칙 미정으로 중단 |
| ✅ 마무리 | [[블로그 리뉴얼]] | 2024.07 | 1년 운영 중 |
| ✅ 마무리 | [[독서 트래커 앱]] | 2024.02 | 학습용 — 졸업 |

## 분류

### 🟢 진행 중
- [[개인 위키 v2]] — 메모와 위키 합치기 (가장 신경 쓰는 것)
- [[홈서버 NAS 구축]] — 잔여 작업 사진 백업 자동화

### 🟡 보류
- [[주식 자동매매 봇]] — [[📈 주식 투자]] 원칙 정해지면 재개

### ✅ 마무리
- [[블로그 리뉴얼]] — Astro 로 이전 완료
- [[독서 트래커 앱]] — 6개월 학습 마무리

## 운영 원칙

1. **하나에 60일 집중** — 새 걸 시작하기 전에 60일 우선 굴려본다.
2. **사용자 한 명** — 가장 큰 사용자는 [[👤 김민철]] 본인. 본인이 안 쓰면 아무도 안 씀.
3. **회고는 분기** — 진행 중 / 보류 / 마무리 재분류.

## 다음 분기 (2026 Q1)

- [[개인 위키 v2]] AI 사이드 패널 시작
- [[주식 자동매매 봇]] 재개 여부 결정

## 관련

- [[👤 김민철]] · [[현재 (2024-)]] · [[📈 주식 투자]]
`,
  };

  const projects: ProjectInput[] = [
    {
      title: '개인 위키 v2',
      status: '진행 중',
      pageStatus: 'active',
      body: `# 개인 위키 v2

| 항목 | 내용 |
|---|---|
| 상태 | 🟢 진행 중 |
| 시작 | 2025.09 |
| 사용자 | [[👤 김민철]] 본인 |
| 기술 | React · TypeScript · IndexedDB · TipTap |

## 왜 만드나

옵시디언과 노션을 둘 다 쓰는데 매번 어디에 적을지 헷갈렸다. 둘의 장점만 — **나무위키처럼 길찾기 + 옵시디언처럼 연결** — 골라 직접 만들어 보고 싶어졌다.

## 핵심 가설

> "메인 문서(MoC) 가 폴더보다 강하다."

- 폴더는 1차원, MoC 는 다차원 길찾기
- 모든 페이지에 \`type / status / tags\` 메타로 분류 통제

## 마일스톤

- [x] 페이지 CRUD + IndexedDB 저장
- [x] 위키링크 자동완성 (\`[[\` 입력 시 후보 표시)
- [x] 4가지 관계 (refers_to / cites / inherits / similar_to)
- [x] 메인 문서 패턴 + 부모 칩
- [ ] 그래프 뷰 폴리시
- [ ] AI 사이드 패널 — 본문 기반 질문
- [ ] 모바일 폴리시

## 회고 한 줄

> "사이드 프로젝트는 개발 시간보다 **꺼내 쓰는 시간** 이 길어야 의미 있다."

## 관련

- [[🚀 프로젝트]] · [[현재 (2024-)]] · [[홈서버 NAS 구축]]`,
    },
    {
      title: '홈서버 NAS 구축',
      status: '진행 중',
      pageStatus: 'active',
      body: `# 홈서버 NAS 구축

| 항목 | 내용 |
|---|---|
| 상태 | 🟢 마무리 단계 |
| 시작 | 2025.06 |
| 예산 | 약 90만원 |
| 기술 | TrueNAS · Docker · Tailscale |

## 왜 만드나

- 클라우드 사진 백업 비용 줄이기
- 가족 사진 한 곳에 — [[김누나]] 와 공유
- 자체 백업이라는 안정감

## 구성

- 본체: 미니 PC · RAM 32GB · NVMe 1TB + HDD 8TB×2 (RAID1)
- OS: TrueNAS Scale
- 네트워크: Tailscale 로 외부 접근 (포트 포워딩 X)

## 마일스톤

- [x] 하드웨어 조립
- [x] TrueNAS 설치 + 데이터셋 분리
- [x] Photoprism 사진 라이브러리
- [x] 외부 접근 (Tailscale)
- [ ] iPhone 자동 백업 — 마지막 작업
- [ ] 가족 공유 폴더 (간단한 비밀번호)

## 배운 것

- ZFS 의 스냅샷이 진짜 강하다 (실수 복구가 1초)
- 처음 4주는 전기료가 무서웠는데 월 1만원 내외로 정착

## 관련

- [[🚀 프로젝트]] · [[김누나]] · [[현재 (2024-)]]`,
    },
    {
      title: '주식 자동매매 봇',
      status: '보류',
      pageStatus: 'draft',
      body: `# 주식 자동매매 봇

| 항목 | 내용 |
|---|---|
| 상태 | 🟡 보류 (2025.03 이후) |
| 시작 | 2024.11 |
| 기술 | Python · 증권사 OpenAPI |

## 왜 보류했나

> "**전략 없는 자동화는 더 빠르게 잃는다.**"

- 코드는 동작하는데 [[📈 주식 투자]] 원칙이 정해지지 않음
- 백테스트로는 수익 → 실거래는 0% 신뢰
- "감정 제거" 라는 자동화의 장점 < "원칙 미정" 의 약점

## 만들어둔 것 (자산)

- 증권사 API 연결 모듈
- 백테스트 엔진 (Pandas)
- 단순 모멘텀 전략 1개

## 재개 조건

- [[📈 주식 투자]] 의 [[투자 원칙]] 1년치 검증 완료
- 6개월 페이퍼 트레이딩으로 원칙 강화

## 회고

> "엔지니어가 빠지기 쉬운 함정 — **만들 수 있다고 만들면 안 된다.**"

## 관련

- [[🚀 프로젝트]] · [[📈 주식 투자]] · [[투자 원칙]]`,
    },
    {
      title: '블로그 리뉴얼',
      status: '마무리',
      pageStatus: 'stable',
      body: `# 블로그 리뉴얼

| 항목 | 내용 |
|---|---|
| 상태 | ✅ 마무리 (2024.10) |
| 시작 | 2024.07 |
| 기술 | Astro · MDX · Cloudflare Pages |

## 무엇을 했나

10년 가까이 쓰던 워드프레스 → Astro 정적 사이트로 이전.

## 결정 근거

| 비교 | WordPress | Astro |
|---|---|---|
| 속도 | 느림 (DB) | 빠름 (정적) |
| 비용 | 월 만원대 호스팅 | 무료 (Cloudflare) |
| 작성 | WP 에디터 | Markdown 직접 |
| 백업 | 플러그인 | git 자체 |

## 회고

- 글 쓰는 페이스가 늘었다 (월 0.5 → 월 1.5편)
- 디자인은 이전이 더 풍부했지만, **마찰 없이 쓰기** 가 압도적
- 독자수 신경 쓰지 않게 됨 — 글이 자산이라는 감각

## 다음

- [[현재 (2024-)]] 한 달 1편 페이스 유지
- [[개인 위키 v2]] 의 일부 페이지를 블로그로 발행하는 파이프라인 (구상 중)

## 관련

- [[🚀 프로젝트]] · [[현재 (2024-)]] · [[개인 위키 v2]]`,
    },
    {
      title: '독서 트래커 앱',
      status: '마무리',
      pageStatus: 'archived',
      body: `# 독서 트래커 앱

| 항목 | 내용 |
|---|---|
| 상태 | ✅ 졸업 (2024.07) |
| 시작 | 2024.02 |
| 기술 | React Native · Firebase |

## 왜 만들었나

당시 React Native 학습 목적. "내가 매일 쓸 만한 작은 앱" 으로 골라 6개월 굴림.

## 무엇을 배웠나

- React Native 의 진짜 단점들 (네비게이션·이미지 캐싱)
- Firebase 무료 티어의 한계
- **"학습 프로젝트는 명확한 종료 조건"** 이 있어야 한다

## 왜 종료했나

- 목적(학습)을 달성
- 기능 자체는 \`구글 시트\` 로도 충분하다는 결론
- [[개인 위키 v2]] 의 한 페이지로 흡수 가능

## 코드 처분

- GitHub 보관용 README 추가 후 archive
- 서비스 종료 — Firebase 프로젝트 삭제

## 관련

- [[🚀 프로젝트]] · [[개인 위키 v2]]`,
    },
  ];

  const subs: WikiPage[] = projects.map((p) => ({
    ...base,
    id: newWikiId(),
    title: p.title,
    aliases: [],
    type: 'project' as const,
    status: p.pageStatus,
    category: `예시 · 프로젝트 · ${p.status}`,
    tags: ['example', '프로젝트', p.status],
    parentMocs: [mainId],
    body: `${CALLOUT}${p.body}\n`,
  }));

  return [main, ...subs];
}
