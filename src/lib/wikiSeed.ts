/**
 * 마이위키 첫 방문 시 시드 — 사용자가 빈 화면 보지 않도록 샘플 1+2 페이지 자동 생성.
 * 시드 플래그(localStorage)로 한 번만 실행, 사용자가 지우면 재생성 X.
 */

import type { WikiPage } from '@/types/wiki';
import { newWikiId } from '@/types/wiki';
import { upsertPage } from '@/lib/wikiStore';

const SEED_KEY = 'wiki_seeded_v1';

const NOW = Date.now();

const SEED_PAGES: WikiPage[] = [
  {
    id: newWikiId(),
    title: '🏠 대문',
    aliases: ['Home', 'Atlas'],
    type: 'index',
    status: 'active',
    tags: ['atlas'],
    body: `# 환영합니다

여기는 **나만의 위키** 입니다. 자유롭게 페이지를 만들고, \`[[다른 페이지]]\` 로 서로 연결하세요.

## 시작하기

1. 좌측 \`+\` 버튼으로 새 페이지를 만듭니다.
2. 본문에 \`[[\` 를 입력하면 기존 페이지가 자동완성됩니다.
3. 없는 제목으로 링크하면 빨간색으로 표시되고, 클릭 시 새 페이지가 만들어집니다.

## 추천 구조

설계 원칙은 [[위키 설계 원칙]] 페이지를 참고하세요. 이 대문은 **MOC** (Map of Content) 역할로 자주 가는 페이지의 입구로 쓰면 좋습니다.

## 자주 가는 페이지

- [[위키 설계 원칙]]
- (직접 추가하세요)
`,
    refersTo: [],
    cites: [],
    inherits: [],
    similarTo: [],
    parentMocs: [],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: newWikiId(),
    title: '위키 설계 원칙',
    aliases: ['MOC 패턴'],
    type: 'concept',
    category: '메타',
    status: 'stable',
    tags: ['설계', '메타'],
    body: `# 위키 설계 원칙

옵시디언·나무위키 같은 개인 위키를 잘 굴리기 위한 4가지 원칙.

## 1. 폴더와 분류를 분리한다

폴더는 **거친 저장 위치**, 속성은 **통제 분류**, 태그는 **교차 관점**, MOC 는 **길찾기 허브** 로 역할 분리.

## 2. 모든 것을 한 화면에 보이게 하지 않는다

전역 그래프는 멋지지만 항목이 많아지면 일상 탐색이 아니라 **품질 점검 도구** 가 된다.

## 3. 4가지 관계를 명확히

- **참조 (refers_to)**: 일반 언급
- **인용 (cites)**: 출처
- **상속 (inherits)**: 상위 개념
- **유사 (similar_to)**: 비교 대상

## 4. 항목 생애주기

\`초안 → 작업중 → 안정 → 보관\`. 상태를 두고 주기적으로 정리한다.

> 자세한 내용은 [[대문|🏠 대문]] 으로 돌아가서 다른 페이지를 만들어 확장해보세요.
`,
    refersTo: [],
    cites: [],
    inherits: [],
    similarTo: [],
    parentMocs: [],
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export function isWikiSeeded(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(SEED_KEY) === '1';
}

export function markWikiSeeded(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SEED_KEY, '1');
}

export async function seedWiki(): Promise<WikiPage[]> {
  // refersTo 자동 채우기 — 본문 [[link]] 파싱
  const titleToId = new Map<string, string>();
  for (const p of SEED_PAGES) {
    titleToId.set(p.title, p.id);
    for (const a of p.aliases) titleToId.set(a, p.id);
  }
  const seeded: WikiPage[] = SEED_PAGES.map((p) => {
    const m = p.body.matchAll(/\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g);
    const refs = new Set<string>();
    for (const match of m) {
      const id = titleToId.get(match[1].trim());
      if (id && id !== p.id) refs.add(id);
    }
    return { ...p, refersTo: Array.from(refs) };
  });
  for (const p of seeded) await upsertPage(p);
  markWikiSeeded();
  return seeded;
}
