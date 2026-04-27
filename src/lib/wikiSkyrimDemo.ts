/**
 * 스카이림 데모 — 위키 설계 검증용 시드.
 *
 * 구조:
 * - 1 root 메인: 스카이림
 * - 5 sub 메인: 등장인물 / 마법 / 퀘스트 / 홀드 / 종족
 * - 15+ 일반 문서 (각 메인의 자식)
 * - 2 독립 일반 문서 (OST / 모드 추천)
 *
 * isMain + type 분리 검증:
 * - 인물 페이지는 type='person', 일반 문서
 * - 메인 문서들은 type='concept' + isMain=true
 * - 퀘스트는 type='project'
 */

import type { WikiPage } from '@/types/wiki';
import { newWikiId } from '@/types/wiki';

function mk(p: Partial<WikiPage> & Pick<WikiPage, 'title' | 'type' | 'body'>): WikiPage {
  const t = Date.now();
  return {
    id: newWikiId(),
    title: p.title,
    aliases: p.aliases ?? [],
    type: p.type,
    status: p.status ?? 'active',
    tags: p.tags ?? [],
    body: p.body,
    isMain: p.isMain,
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

/** 데모 페이지 묶음 빌드 — 호출 시점마다 새 id. */
export function buildSkyrimDemo(): WikiPage[] {
  let n = Date.now();
  const next = () => ++n;
  const tag = ['스카이림'];

  return [
    /* ── ROOT 메인 ── */
    mk({
      title: '스카이림',
      aliases: ['Skyrim', 'TES V'],
      type: 'concept',
      isMain: true,
      status: 'stable',
      tags: tag,
      body: `# 스카이림

엘더 스크롤 5: 스카이림 (The Elder Scrolls V: Skyrim) — 베데스다의 오픈월드 RPG.

## 핵심 묶음

- [[스카이림 등장인물]] — 도바킨·알두인·델피네 등
- [[스카이림 마법]] — 파괴·회복·변이·환영
- [[스카이림 퀘스트]] — 메인 / 내전 / 다이달릭
- [[홀드]] — 9개 행정구역
- [[종족]] — 플레이어 가능 10종족

## 같이 보기

- [[OST]] — 제레미 소울의 음악
- [[모드 추천]] — 필수 / 그래픽 / 컨텐츠
`,
      updatedAt: next(),
    }),

    /* ── SUB 메인 ── */
    mk({
      title: '스카이림 등장인물',
      type: 'concept',
      isMain: true,
      tags: tag,
      body: `# 스카이림 등장인물

주요 NPC 와 적대자.

## 주인공
- [[도바킨]] — 용 학살자, 플레이어 캐릭터

## 동맹
- [[델피네]] — 블레이드의 마지막 후예
- [[유르겐 윈드콜러]] — 흐림자의 길 창시자
- [[파선시]] — 그레이비어드의 수장

## 적
- [[알두인]] — 세계를 먹는 용
- [[미라크]] — 첫 도바킨 (드래곤본 DLC)
`,
      updatedAt: next(),
    }),

    mk({
      title: '스카이림 마법',
      type: 'concept',
      isMain: true,
      tags: tag,
      body: `# 스카이림 마법

마법 학파 5가지.

## 학파
- [[파괴 마법]] — 화염·냉기·번개
- [[회복 마법]] — 치유·보호·언데드 퇴치
- [[변이 마법]] — 신체 강화·이동
- [[환영 마법]] — 공포·격노·평정
- [[소환 마법]] — 데이드라·언데드 소환

## 관련
- [[마법 학교 윈터홀드]]
`,
      updatedAt: next(),
    }),

    mk({
      title: '스카이림 퀘스트',
      type: 'concept',
      isMain: true,
      tags: tag,
      body: `# 스카이림 퀘스트

메인 / 사이드 / 다이달릭 퀘스트.

## 메인
- [[메인 퀘스트]] — 알두인 위협
- [[내전 퀘스트]] — 제국 vs 스톰클로크

## 다이달릭
- [[다곤의 가면]]
- [[헤르메우스 모라의 책]]
`,
      updatedAt: next(),
    }),

    mk({
      title: '홀드',
      aliases: ['Holds'],
      type: 'concept',
      isMain: true,
      tags: tag,
      body: `# 홀드

스카이림의 9개 행정구역.

## 주요 도시
- [[화이트런]] — 중앙, 거대한 평원
- [[솔리튜드]] — 수도, 제국파
- [[리프튼]] — 동남부, 도적 길드
- [[윈도헬름]] — 동북부, 스톰클로크 본거지

## 작은 마을
- [[리버우드]]
- [[헬겐]]
`,
      updatedAt: next(),
    }),

    mk({
      title: '종족',
      type: 'concept',
      isMain: true,
      tags: tag,
      body: `# 종족

플레이 가능한 10 종족.

## 인간
- [[노드]] — 스카이림 토착민, 냉기 저항
- [[임페리얼]] — 제국, 외교
- [[브레튼]] — 마법 25% 흡수

## 엘프
- [[알트머]] — 하이엘프
- [[보스머]] — 우드엘프
- [[던머]] — 다크엘프

## 짐승
- [[카짓]] — 고양이
- [[아르고니안]] — 도마뱀

## 기타
- [[오크]] — 오시머
- [[레드가드]]
`,
      updatedAt: next(),
    }),

    /* ── 일반 문서 — 등장인물 ── */
    mk({
      title: '도바킨',
      aliases: ['Dovahkiin', '드래곤본'],
      type: 'person',
      tags: tag,
      body: `# 도바킨

용의 영혼을 가진 자. 플레이어 캐릭터.

## 능력
- 외침 (Thu'um) — 용의 언어
- 영혼 흡수 — 용을 죽이면 영혼 흡수

## 관련
- [[알두인]] — 숙적
- [[그레이비어드]] — 스승
- [[블레이드]] — 동맹
`,
      updatedAt: next(),
    }),

    mk({
      title: '알두인',
      aliases: ['Alduin'],
      type: 'concept',
      tags: tag,
      body: `# 알두인

세계를 먹는 용 (World-Eater). 메인 빌런.

> "Zu'u Alduin, zok sahrot do naan ko Lein!"
> (나는 알두인, 세상에서 가장 위대하다!)

## 약점
- 외침 *드래곤렌드* (Dragonrend) — 시간 인지 강제

## 같이 보기
- [[메인 퀘스트]]
`,
      updatedAt: next(),
    }),

    mk({
      title: '델피네',
      type: 'person',
      tags: tag,
      body: `# 델피네

블레이드의 마지막 후예. 리버우드 *잠자는 거인 여관* 운영.

플레이어를 메인 퀘스트의 핵심 단계로 이끔.
`,
      updatedAt: next(),
    }),

    mk({
      title: '유르겐 윈드콜러',
      type: 'person',
      status: 'draft',
      tags: tag,
      body: `# 유르겐 윈드콜러

흐림자의 길 창시자. 외침 사용자들의 평화주의 전통.
`,
      updatedAt: next(),
    }),

    /* ── 일반 문서 — 마법 ── */
    mk({
      title: '파괴 마법',
      type: 'concept',
      tags: tag,
      body: `# 파괴 마법

화염·냉기·번개 3 속성.

## 대표 주문
- 파이어볼 — 광역 화염
- 아이스 스파이크 — 단발 냉기
- 라이트닝 볼트 — 빠른 번개
`,
      updatedAt: next(),
    }),

    mk({
      title: '회복 마법',
      type: 'concept',
      tags: tag,
      body: `# 회복 마법

체력 회복 + 언데드 퇴치 + 방어막.
`,
      updatedAt: next(),
    }),

    mk({
      title: '변이 마법',
      type: 'concept',
      tags: tag,
      body: `# 변이 마법

신체 강화·이동·금속 변환.
`,
      updatedAt: next(),
    }),

    mk({
      title: '환영 마법',
      type: 'concept',
      tags: tag,
      body: `# 환영 마법

공포·격노·평정·은신.
`,
      updatedAt: next(),
    }),

    /* ── 일반 문서 — 퀘스트 ── */
    mk({
      title: '메인 퀘스트',
      type: 'project',
      status: 'active',
      tags: tag,
      body: `# 메인 퀘스트

알두인 처치까지의 본 스토리.

## 단계
1. 헬겐 탈출
2. [[화이트런]] 도착
3. 용 처치 → 도바킨 각성
4. 그레이비어드 만남
5. [[알두인]] 처치

## 동반자
- [[델피네]] — 블레이드 인도
`,
      updatedAt: next(),
    }),

    mk({
      title: '내전 퀘스트',
      type: 'project',
      tags: tag,
      body: `# 내전 퀘스트

제국 (임페리얼) vs 스톰클로크 (독립파).

## 선택
- 제국 측: 합법, 탈모어 평화 유지
- 스톰클로크: 노드 자치, 탈모어 적대
`,
      updatedAt: next(),
    }),

    /* ── 일반 문서 — 홀드 ── */
    mk({
      title: '화이트런',
      type: 'concept',
      tags: tag,
      body: `# 화이트런

스카이림 중앙의 거대 평원 도시. 중립.

## 주요 NPC
- 발그루프 (영주)
- 아엘라 (컴패니언)
`,
      updatedAt: next(),
    }),

    mk({
      title: '솔리튜드',
      type: 'concept',
      tags: tag,
      body: `# 솔리튜드

스카이림 수도. 제국 본거지. 음유시인 학교 위치.
`,
      updatedAt: next(),
    }),

    mk({
      title: '리프튼',
      type: 'concept',
      tags: tag,
      body: `# 리프튼

동남부 도시. 도적 길드 본거지. 폐허 지하.
`,
      updatedAt: next(),
    }),

    /* ── 일반 문서 — 종족 (대표만) ── */
    mk({
      title: '노드',
      type: 'person',
      tags: tag,
      body: `# 노드

스카이림 토착 인간 종족. 냉기 저항 +50%.

문화: 사후 소번카 (전사들의 영원한 연회) 신앙.
`,
      updatedAt: next(),
    }),

    mk({
      title: '엘프',
      type: 'person',
      tags: tag,
      body: `# 엘프 (메르)

세 종류:
- 알트머 (하이엘프)
- 보스머 (우드엘프)
- 던머 (다크엘프)
`,
      updatedAt: next(),
    }),

    mk({
      title: '오크',
      aliases: ['오시머'],
      type: 'person',
      tags: tag,
      body: `# 오크 (오시머)

말라카스 신을 따르는 메르. 스트롱홀드 (요새 마을) 거주.

스미싱 +5 보너스.
`,
      updatedAt: next(),
    }),

    /* ── 독립 일반 문서 (어느 메인도 안 가리킴) ── */
    mk({
      title: 'OST',
      aliases: ['스카이림 음악', 'Skyrim Soundtrack'],
      type: 'source',
      status: 'stable',
      tags: ['스카이림', '음악'],
      body: `# Skyrim OST

작곡: 제레미 소울 (Jeremy Soule).

## 대표 곡
- *Sons of Skyrim* — 메인 테마, 노드 합창
- *The Streets of Whiterun*
- *Far Horizons*

## 외부
- 링크/위치: (Spotify·YouTube 등 사용자가 추가)
`,
      updatedAt: next(),
    }),

    mk({
      title: '모드 추천',
      type: 'concept',
      status: 'draft',
      tags: ['스카이림', '모드'],
      body: `# 스카이림 모드 추천

## 필수
- SKSE — 스크립트 익스텐더
- SkyUI — UI 개선

## 그래픽
- ENB
- Skyrim 2020 — 텍스처

## 컨텐츠
- Falskaar
- Wyrmstooth
`,
      updatedAt: next(),
    }),
  ];
}
