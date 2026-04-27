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
}

export const WIKI_TEMPLATES: WikiTemplate[] = [
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
    id: 'moc',
    label: '메인 문서 (주제 묶음)',
    description: '여러 페이지를 묶는 길찾기 허브',
    emoji: '📖',
    type: 'moc',
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
    refersTo: [],
    cites: [],
    inherits: [],
    similarTo: [],
    parentMocs: [],
    createdAt: now,
    updatedAt: now,
  };
}
