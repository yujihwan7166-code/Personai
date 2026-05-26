/**
 * 새 페이지 템플릿 — 빈 화면 마찰 ↓.
 * type 별 적절한 본문 골격 + 메타 채움.
 */

import type { WikiPage, WikiPageType } from '@/types/wiki';
import { newWikiId } from '@/types/wiki';

export interface WikiTemplate {
  id: string;
  label: string;
  description: string;
  emoji: string;
  type: WikiPageType;
  defaultTitle: string;
  body: string;
  tags?: string[];
  /** 이 템플릿으로 만든 페이지를 자동으로 *메인 문서* 역할로 표시. */
  isMain?: boolean;
}

export const WIKI_TEMPLATES: WikiTemplate[] = [
  {
    id: 'moc',
    label: '메인 문서 만들기',
    description: '여러 페이지를 묶는 길찾기 허브 — 추천 시작점',
    emoji: '📖',
    type: 'concept',  // type 은 일반 (개념). 역할만 메인.
    isMain: true,     // ← 메인 문서 역할
    defaultTitle: '새 메인 문서',
    body: `## 개요

이 메인 문서가 다루는 범위와 제외 범위를 한두 문장으로.

## 핵심 페이지

- [[ ]]

## 하위 주제

###${' '}
- [[ ]]

## 같이 보기

- [[ ]]

## 출처/참고

- [[ ]]
`,
    tags: ['main'],
  },
  {
    id: 'blank',
    label: '빈 페이지',
    description: '아무것도 없는 깨끗한 시작',
    emoji: '📄',
    type: 'concept',
    defaultTitle: '제목 없음',
    body: '',
  },
  {
    id: 'concept',
    label: '개념·주제',
    description: '한 가지 개념을 정의·설명',
    emoji: '💡',
    type: 'concept',
    defaultTitle: '새 개념',
    body: `## 한 줄 정의

> 이 개념은 ____ 이다.

## 자세히

-

## 예시

-

## 같이 보기

- [[ ]]
`,
  },
  {
    id: 'source',
    label: '출처 (책·논문·강의)',
    description: '읽거나 본 자료를 카드화',
    emoji: '📚',
    type: 'source',
    defaultTitle: '새 출처',
    body: `## 메타

- **저자/제작자**:${' '}
- **발행/공개**:${' '}
- **링크/위치**:${' '}

## 한 줄 요약

>

## 핵심 메모

-

## 인용

-

## 적용·아이디어

- [[ ]]
`,
  },
  {
    id: 'project',
    label: '프로젝트',
    description: '진행 중인 일·작업',
    emoji: '🚀',
    type: 'project',
    defaultTitle: '새 프로젝트',
    body: `## 목표

- 무엇을 끝내려는가?

## 진행 상황

- [ ]
- [ ]
- [ ]

## 의사결정·기록

-

## 자료

- [[ ]]
`,
    tags: ['project'],
  },
  {
    id: 'meeting',
    label: '회의·결정',
    description: '논의·결정 기록',
    emoji: '🗣️',
    type: 'meeting',
    defaultTitle: `회의 ${new Date().toISOString().slice(0, 10)}`,
    body: `## 메타

- **일시**: ${new Date().toLocaleString('ko-KR')}
- **참석자**:${' '}
- **장소/툴**:${' '}

## 안건

1.

## 결정사항

-

## 액션 아이템

- [ ]
- [ ]

## 다음 회의

-
`,
    tags: ['meeting'],
  },
  {
    id: 'person',
    label: '인물',
    description: '사람 카드',
    emoji: '👤',
    type: 'person',
    defaultTitle: '새 인물',
    body: `## 기본

- **소속/역할**:${' '}
- **연락**:${' '}

## 만난 계기

-

## 관심사·전문분야

-

## 함께 한 일

- [[ ]]
`,
  },
  {
    id: 'reading',
    label: '독서 노트',
    description: '책 읽으며 정리 — 요약·인용·적용',
    emoji: '📚',
    type: 'source',
    defaultTitle: '새 책',
    body: `## 메타

- **저자**:${' '}
- **출판**:${' '}
- **읽은 기간**:${' '}
- **별점**: ⭐⭐⭐⭐⭐

## 한 줄 요약

>

## 핵심 요점

-

## 인상 깊은 인용

> "..."

## 적용·아이디어

-

## 같이 보기

- [[ ]]
`,
    tags: ['reading'],
  },
  {
    id: 'movie',
    label: '영화·드라마',
    description: '본 작품 — 줄거리·인물·감상',
    emoji: '🎬',
    type: 'concept',
    defaultTitle: '새 영화',
    body: `## 메타

- **감독/연출**:${' '}
- **개봉**:${' '}
- **장르**:${' '}
- **별점**: ⭐⭐⭐⭐⭐

## 줄거리 (스포 주의)

-

## 인물

- [[ ]]

## 감상

-

## 명장면·명대사

-
`,
    tags: ['film'],
  },
  {
    id: 'travel',
    label: '여행 기록',
    description: '장소·일정·맛집·인상',
    emoji: '✈️',
    type: 'project',
    defaultTitle: '새 여행',
    body: `## 메타

- **장소**:${' '}
- **기간**:${' '}
- **동행**:${' '}

## 일정

- Day 1 —${' '}
- Day 2 —${' '}

## 맛집·카페

-

## 인상에 남은 것

-

## 다음에 또 가면

-

## 사진

-
`,
    tags: ['travel'],
  },
  {
    id: 'study',
    label: '학습 노트',
    description: '주제 공부 — 핵심·예시·질문',
    emoji: '🎓',
    type: 'concept',
    defaultTitle: '새 학습',
    body: `## 한 줄 정의

>

## 왜 중요한가

-

## 핵심 개념

###${' '}
-

## 예시

-

## 헷갈리는 부분 / 질문

-

## 같이 보기

- [[ ]]
`,
    tags: ['study'],
  },
  {
    id: 'decision',
    label: '결정 기록',
    description: '의사결정 — 선택지·근거·결과',
    emoji: '🤔',
    type: 'meeting',
    defaultTitle: '새 결정',
    body: `## 결정 (한 줄)

> ____ 을 ____ 하기로

## 배경

- 왜 결정이 필요했나?

## 선택지

- A: ${' '}
- B: ${' '}
- C: ${' '}

## 결정 근거

-

## 결과 (시간 흐른 뒤 추가)

-

## 같이 보기

- [[ ]]
`,
    tags: ['decision'],
  },
  {
    id: 'recipe',
    label: '레시피',
    description: '요리 — 재료·만드는 법·팁',
    emoji: '🍳',
    type: 'concept',
    defaultTitle: '새 레시피',
    body: `## 메타

- **분량**: 1인분
- **소요 시간**: 약 30분
- **난이도**: ⭐⭐

## 재료

- 주재료:${' '}
- 양념:${' '}

## 만드는 법

1.${' '}
2.${' '}
3.${' '}

## 팁

-

## 변형·응용

-
`,
    tags: ['recipe', 'cooking'],
  },
];

export function makePageFromTemplate(t: WikiTemplate, titleOverride?: string): WikiPage {
  const now = Date.now();
  return {
    id: newWikiId(),
    title: titleOverride?.trim() || t.defaultTitle,
    aliases: [],
    type: t.type,
    status: 'draft',
    tags: t.tags ?? [],
    body: t.body,
    isMain: t.isMain ?? false,
    refersTo: [],
    cites: [],
    inherits: [],
    similarTo: [],
    parentMocs: [],
    createdAt: now,
    updatedAt: now,
  };
}

export type WikiEditorTemplateId = 'daily' | 'meeting' | 'source' | 'concept' | 'moc';

export interface WikiEditorTemplate {
  id: WikiEditorTemplateId;
  title: string;
  description: string;
  html: string;
}

export const WIKI_EDITOR_TEMPLATES: WikiEditorTemplate[] = [
  {
    id: 'daily',
    title: '데일리 노트',
    description: '오늘 할 일, 기록, 내일로 넘길 일을 빠르게 정리',
    html: [
      '<h2>오늘의 초점</h2>',
      '<ul><li>가장 중요한 일:</li><li>막힌 것:</li></ul>',
      '<h2>기록</h2>',
      '<ul><li></li></ul>',
      '<h2>내일로 넘길 것</h2>',
      '<ul><li></li></ul>',
      '<p></p>',
    ].join(''),
  },
  {
    id: 'meeting',
    title: '회의 노트',
    description: '안건, 결정, 액션 아이템을 한 번에 남김',
    html: [
      '<h2>안건</h2>',
      '<ul><li></li></ul>',
      '<h2>결정 사항</h2>',
      '<ul><li></li></ul>',
      '<h2>액션 아이템</h2>',
      '<ul><li>[ ] 담당자 - 할 일 - 기한</li></ul>',
      '<h2>연결 문서</h2>',
      '<p>[[관련 문서]]</p>',
      '<p></p>',
    ].join(''),
  },
  {
    id: 'source',
    title: '출처 카드',
    description: '책, 논문, 링크에서 뽑은 근거를 위키로 정리',
    html: [
      '<h2>출처</h2>',
      '<p>링크 또는 서지 정보:</p>',
      '<h2>핵심 주장</h2>',
      '<ul><li></li></ul>',
      '<h2>인용/메모</h2>',
      '<blockquote><p>중요한 문장을 여기에 정리</p></blockquote>',
      '<h2>연결할 개념</h2>',
      '<p>[[개념]]</p>',
      '<p></p>',
    ].join(''),
  },
  {
    id: 'concept',
    title: '개념 정리',
    description: '정의, 예시, 반례, 관련 문서를 한 페이지에 정리',
    html: [
      '<h2>한 줄 정의</h2>',
      '<p></p>',
      '<h2>핵심 설명</h2>',
      '<ul><li></li></ul>',
      '<h2>예시</h2>',
      '<ul><li></li></ul>',
      '<h2>반례/주의점</h2>',
      '<ul><li></li></ul>',
      '<h2>관련 문서</h2>',
      '<p>[[상위 개념]] · [[비슷한 개념]]</p>',
      '<p></p>',
    ].join(''),
  },
  {
    id: 'moc',
    title: 'MOC 지도',
    description: '큰 주제의 목차와 하위 문서를 만드는 뼈대',
    html: [
      '<h2>개요</h2>',
      '<p>이 주제에서 다룰 범위:</p>',
      '<h2>핵심 문서</h2>',
      '<ul><li>[[핵심 문서 1]]</li><li>[[핵심 문서 2]]</li></ul>',
      '<h2>출처/근거</h2>',
      '<ul><li>[[출처]]</li></ul>',
      '<h2>다음에 정리할 것</h2>',
      '<ul><li></li></ul>',
      '<p></p>',
    ].join(''),
  },
];

export function getWikiEditorTemplate(id: WikiEditorTemplateId): WikiEditorTemplate {
  const template = WIKI_EDITOR_TEMPLATES.find((item) => item.id === id);
  if (!template) throw new Error(`Unknown wiki editor template: ${id}`);
  return template;
}

export function buildWikiTemplateHtml(id: WikiEditorTemplateId): string {
  return getWikiEditorTemplate(id).html;
}
