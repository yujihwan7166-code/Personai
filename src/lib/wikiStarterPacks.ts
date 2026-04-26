/**
 * 빈 위키 온보딩 — 첫 진입 사용자용 4 스타터 팩.
 * 각 팩은 (대문 MOC + 시드 페이지 3~5개) 묶음. 사용자가 1초 안에
 * "내 위키구나" 체감하도록 *비어있지 않은 출발점* 을 제공.
 */

import type { WikiPage } from '@/types/wiki';
import { newWikiId } from '@/types/wiki';

export interface StarterPack {
  id: string;
  emoji: string;
  label: string;
  description: string;
  /** 팩이 만들어질 페이지 spec — body·tags 등을 갖춘 데이터. */
  build: () => WikiPage[];
}

function nowFactory() {
  // 같은 팩 내에서 updatedAt 이 1ms 단위로 다르게 보이도록.
  let n = Date.now();
  return () => ++n;
}

function mkPage(p: Partial<WikiPage> & Pick<WikiPage, 'title' | 'type' | 'body'>): WikiPage {
  const t = Date.now();
  return {
    id: newWikiId(),
    title: p.title,
    aliases: p.aliases ?? [],
    type: p.type,
    status: p.status ?? 'active',
    tags: p.tags ?? [],
    body: p.body,
    refersTo: [],
    cites: [],
    inherits: [],
    similarTo: [],
    parentMocs: [],
    createdAt: t,
    updatedAt: t,
    ...p,
  };
}

export const STARTER_PACKS: StarterPack[] = [
  {
    id: 'learner',
    emoji: '🎓',
    label: '학습자',
    description: '책·강의·정리 노트를 한 위키에. 개념끼리 연결하며 깊이 파기.',
    build: () => {
      const next = nowFactory();
      return [
        mkPage({
          title: '🏠 대문',
          aliases: ['Home', 'Atlas'],
          type: 'index',
          tags: ['atlas'],
          body: `# 학습 위키

읽고 들은 것을 \`[[페이지]]\` 로 연결해 쌓습니다.

## 시작점
- [[학습 일지]]
- [[독서 메모]]
- [[자료함]]

\`[[\` 입력으로 자동완성. 없는 제목으로 쓰면 빨간색 → 클릭하면 새 페이지.
`,
          updatedAt: next(),
        }),
        mkPage({
          title: '학습 일지',
          type: 'project',
          status: 'active',
          tags: ['journal', 'study'],
          body: `# 학습 일지

> 매일 한 줄이라도. 오늘 무엇을 배웠는지.

## 최근 항목
- (날짜)  배운 것 / 의문점 / 다음 액션

## 관련
- [[독서 메모]]
- [[자료함]]
`,
          updatedAt: next(),
        }),
        mkPage({
          title: '독서 메모',
          type: 'moc',
          tags: ['reading'],
          body: `# 독서 메모 (MOC)

읽은 책을 모은 길찾기 허브.

## 진행 중
- [[ ]]

## 완독
- [[ ]]
`,
          updatedAt: next(),
        }),
        mkPage({
          title: '자료함',
          type: 'moc',
          tags: ['source'],
          body: `# 자료함

URL·논문·강의 링크를 모음. 각 항목은 type='source' 페이지로.

- [[ ]]
`,
          updatedAt: next(),
        }),
      ];
    },
  },
  {
    id: 'researcher',
    emoji: '🔬',
    label: '연구자',
    description: '주제·문헌·결론을 분리해 보관. 인용·관련 자료 연결.',
    build: () => {
      const next = nowFactory();
      return [
        mkPage({
          title: '🏠 대문',
          aliases: ['Home', 'Atlas'],
          type: 'index',
          tags: ['atlas'],
          body: `# 연구 위키

문헌·실험·노트를 분리·연결해 관리.

## 시작점
- [[연구 주제]]
- [[문헌 노트]]
- [[방법론]]
- [[결과·해석]]
`,
          updatedAt: next(),
        }),
        mkPage({
          title: '연구 주제',
          type: 'moc',
          tags: ['topic'],
          body: `# 연구 주제 (MOC)

- 핵심 질문:
- 가설:
- 관련 위키
  - [[방법론]]
  - [[결과·해석]]
`,
          updatedAt: next(),
        }),
        mkPage({
          title: '문헌 노트',
          type: 'moc',
          tags: ['literature'],
          body: `# 문헌 노트

각 논문/책을 type='source' 페이지로 만들고 여기에 링크.

- [[ ]]  (저자, 연도)
`,
          updatedAt: next(),
        }),
        mkPage({
          title: '방법론',
          type: 'concept',
          tags: ['method'],
          body: `## 한 줄 정의

> 사용한 방법은 ____ 이다.

## 자세히

-
`,
          updatedAt: next(),
        }),
        mkPage({
          title: '결과·해석',
          type: 'project',
          status: 'draft',
          tags: ['result'],
          body: `# 결과·해석

## 결과
-

## 해석
-

## 한계
-
`,
          updatedAt: next(),
        }),
      ];
    },
  },
  {
    id: 'worker',
    emoji: '💼',
    label: '직장인',
    description: '회의·결정·프로젝트·사람. 팩트와 약속을 한 곳에.',
    build: () => {
      const next = nowFactory();
      return [
        mkPage({
          title: '🏠 대문',
          aliases: ['Home', 'Atlas'],
          type: 'index',
          tags: ['atlas'],
          body: `# 업무 위키

회의·결정·프로젝트를 분리·연결.

## 시작점
- [[회의록]]
- [[프로젝트]]
- [[사람들]]
`,
          updatedAt: next(),
        }),
        mkPage({
          title: '회의록',
          type: 'moc',
          tags: ['meeting'],
          body: `# 회의록 (MOC)

각 회의는 type='meeting' 페이지. 액션 추출은 본문 체크리스트로.

- [[ ]]  (YYYY-MM-DD · 주제)
`,
          updatedAt: next(),
        }),
        mkPage({
          title: '프로젝트',
          type: 'moc',
          tags: ['project'],
          body: `# 프로젝트 (MOC)

진행 중·보류·완료 분리.

## 진행 중
- [[ ]]

## 완료
- [[ ]]
`,
          updatedAt: next(),
        }),
        mkPage({
          title: '사람들',
          type: 'moc',
          tags: ['person'],
          body: `# 사람들 (MOC)

각 인물은 type='person' 페이지. 누가 무엇을 결정했는지 역추적.

- [[ ]]
`,
          updatedAt: next(),
        }),
      ];
    },
  },
  {
    id: 'hobby',
    emoji: '🎨',
    label: '취미',
    description: '영화·게임·음악·여행을 모아 즐겁게 정리.',
    build: () => {
      const next = nowFactory();
      return [
        mkPage({
          title: '🏠 대문',
          aliases: ['Home', 'Atlas'],
          type: 'index',
          tags: ['atlas'],
          body: `# 취미 위키

좋아하는 것을 자유롭게.

## 시작점
- [[영화·드라마]]
- [[게임]]
- [[여행]]
`,
          updatedAt: next(),
        }),
        mkPage({
          title: '영화·드라마',
          type: 'moc',
          tags: ['film'],
          body: `# 영화·드라마 (MOC)

본 작품·보고싶은 작품 분리.

## 본 것
- [[ ]]

## 보고싶은 것
- [[ ]]
`,
          updatedAt: next(),
        }),
        mkPage({
          title: '게임',
          type: 'moc',
          tags: ['game'],
          body: `# 게임 (MOC)

플레이 중·완료·관심 분리.

## 플레이 중
- [[ ]]

## 완료
- [[ ]]
`,
          updatedAt: next(),
        }),
        mkPage({
          title: '여행',
          type: 'moc',
          tags: ['travel'],
          body: `# 여행 (MOC)

다녀온 곳·가고싶은 곳.

## 다녀온 곳
- [[ ]]

## 가고싶은 곳
- [[ ]]
`,
          updatedAt: next(),
        }),
      ];
    },
  },
];
