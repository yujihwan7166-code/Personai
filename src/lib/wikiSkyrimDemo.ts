/**
 * 데모 데이터 4종 — 위키 설계 검증 + 본문은 줄글 위주 (마크다운 부호 최소).
 *
 * 패턴:
 * - 1 root 메인 + 2~5 sub-main + 4~6 일반 문서 + 1 독립
 * - 본문에 [[]] 위키링크가 *문장 안에 자연스럽게* 박혀
 * - 메인 ↔ 자식 관계 자동 인식 (parent main row 작동)
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

/* ── 1. 스카이림 (게임) ── */
export function buildSkyrimDemo(): WikiPage[] {
  let n = Date.now();
  const next = () => ++n;
  const tag = ['스카이림'];

  return [
    mk({
      title: '스카이림',
      aliases: ['Skyrim', 'TES V'],
      type: 'concept',
      isMain: true,
      status: 'stable',
      tags: tag,
      body: `엘더 스크롤 5: 스카이림은 베데스다의 오픈월드 RPG다. 거대한 세계, 깊은 전설, 그리고 무한한 자유로 오랫동안 사랑받았다.

이 게임의 핵심은 [[스카이림 등장인물]] 에 정리한 주요 인물들과, 다섯 학파로 나뉘는 [[스카이림 마법]], 그리고 세계의 행정구역인 [[홀드]] 다.

곁들여 [[OST]] (제레미 소울의 음악) 도 함께 봐두면 좋다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '스카이림 등장인물',
      type: 'concept',
      isMain: true,
      tags: tag,
      body: `스카이림에 등장하는 주요 NPC 와 적대자들을 정리한 페이지.

플레이어 캐릭터인 [[도바킨]] 은 용의 영혼을 가진 자로, 외침(Thu'um)을 사용한다. 메인 스토리의 빌런 [[알두인]] 은 세계를 먹는 용으로, 도바킨의 숙적이다. 그 외에 블레이드의 마지막 후예 [[델피네]], 흐림자의 길 창시자 [[유르겐 윈드콜러]] 도 핵심 인물이다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '스카이림 마법',
      type: 'concept',
      isMain: true,
      tags: tag,
      body: `스카이림의 마법은 다섯 학파로 나뉜다.

가장 화려한 [[파괴 마법]] 은 화염·냉기·번개 세 속성을 다루고, 체력 회복과 언데드 퇴치를 맡는 [[회복 마법]] 도 핵심이다. 신체 강화와 이동을 다루는 변이, 공포·격노·평정의 환영, 그리고 데이드라·언데드를 부르는 소환 마법까지 — 학파마다 분위기가 완전히 다르다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '홀드',
      aliases: ['Holds'],
      type: 'concept',
      isMain: true,
      tags: tag,
      body: `스카이림은 9개의 홀드로 나뉜 봉건 행정구역이다.

중앙의 거대 평원 도시 [[화이트런]], 수도이자 제국 본거지 [[솔리튜드]] 가 가장 자주 들르는 곳. 그 외에 동남부의 도적 길드 본거지 리프튼, 동북부의 스톰클로크 본거지 윈도헬름도 있다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '도바킨',
      aliases: ['Dovahkiin', '드래곤본'],
      type: 'person',
      tags: tag,
      body: `용의 영혼을 가진 자. 플레이어 캐릭터.

특별한 능력으로 외침(Thu'um, 용의 언어)을 사용할 수 있고, 용을 죽이면 그 영혼을 흡수한다. 숙적은 [[알두인]] (세계를 먹는 용), 스승은 그레이비어드, 동맹은 블레이드와 [[델피네]] 다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '알두인',
      aliases: ['Alduin'],
      type: 'concept',
      tags: tag,
      body: `세계를 먹는 용(World-Eater). 메인 스토리의 빌런.

"Zu'u Alduin, zok sahrot do naan ko Lein!" — 나는 알두인, 세상에서 가장 위대하다.

약점은 외침 드래곤렌드(Dragonrend). 시간 인지를 강제로 적용해 알두인을 땅으로 끌어내릴 수 있다. [[도바킨]] 이 마지막 결투에서 처치한다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '델피네',
      type: 'person',
      tags: tag,
      body: `블레이드의 마지막 후예. 리버우드의 *잠자는 거인 여관* 을 운영하며 신분을 숨기고 있다.

[[도바킨]] 을 메인 퀘스트의 핵심 단계로 이끄는 안내자 역할을 한다. 다소 강경한 성격으로 후반부 스토리에서 도덕적 갈등의 축이 된다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '유르겐 윈드콜러',
      type: 'person',
      status: 'draft',
      tags: tag,
      body: `흐림자의 길(Way of the Voice) 창시자. 외침 사용자들에게 *침묵을 통한 평화* 를 가르쳤다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '파괴 마법',
      type: 'concept',
      tags: tag,
      body: `화염·냉기·번개 세 속성을 다루는 학파.

대표 주문으로 광역 화염의 파이어볼, 단발 냉기의 아이스 스파이크, 빠른 번개의 라이트닝 볼트가 있다. 후반엔 위자드 강화로 광역 폭딜이 가능해진다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '회복 마법',
      type: 'concept',
      tags: tag,
      body: `체력 회복, 언데드 퇴치, 방어막을 담당하는 학파.

전투의 생존성을 담당해 [[파괴 마법]] 못지않게 자주 쓰인다. 후반엔 부활 능력까지 열려 동료를 살릴 수 있다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '화이트런',
      type: 'concept',
      tags: tag,
      body: `스카이림 중앙의 거대 평원 도시. 정치적으로 중립.

영주는 발그루프, 컴패니언 길드의 거점도 이곳에 있다. 메인 퀘스트 초반부에 거의 반드시 들르게 되는 도시다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '솔리튜드',
      type: 'concept',
      tags: tag,
      body: `스카이림의 수도. 제국군의 본거지이며 음유시인 학교가 있다.

서북단 절벽 위에 자리해 풍경이 아름답다. 내전 퀘스트의 제국 측 거점이기도 하다.
`,
      updatedAt: next(),
    }),
    mk({
      title: 'OST',
      aliases: ['스카이림 음악', 'Skyrim Soundtrack'],
      type: 'source',
      status: 'stable',
      tags: ['스카이림', '음악'],
      body: `작곡: 제레미 소울 (Jeremy Soule).

대표 곡으로 노드 합창의 *Sons of Skyrim* (메인 테마), 화이트런의 평화로움이 담긴 *The Streets of Whiterun*, 광활한 세계관의 *Far Horizons* 가 있다.
`,
      updatedAt: next(),
    }),
  ];
}

/* ── 2. 인맥 (사람·관계) ── */
export function buildRelationshipDemo(): WikiPage[] {
  let n = Date.now();
  const next = () => ++n;
  const tag = ['인맥'];

  return [
    mk({
      title: '인맥',
      type: 'concept',
      isMain: true,
      status: 'stable',
      tags: tag,
      body: `내가 알고 지낸 사람들을 정리한 페이지.

크게 세 묶음으로 나뉜다. 가장 가까운 [[가족]], 학창 시절부터 같이 한 [[친구]], 그리고 일하며 만난 [[직장]] 사람들.

연락처와 명함은 [[명함첩]] 에 따로 모아둔다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '가족',
      type: 'concept',
      isMain: true,
      tags: tag,
      body: `가장 가까운 사람들.

[[엄마]] 는 김치찌개의 마스터, [[아빠]] 는 자전거를 사랑하는 사람이다. 형은 어릴 때부터 게임을 같이 해줬고 지금도 의지가 된다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '친구',
      type: 'concept',
      isMain: true,
      tags: tag,
      body: `대학 시절부터 함께한 친구들.

룸메이트였던 [[김철수]] 와 동아리 회장이던 [[이영희]] 가 가장 자주 만나는 사람들. 박지훈은 군대 동기로, 멀리 살아 자주 못 보지만 통화는 자주 한다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '직장',
      type: 'concept',
      isMain: true,
      tags: tag,
      body: `일하며 만난 사람들.

합리적이고 차분한 [[박부장]], 요리를 좋아하는 [[최팀장]] 이 같은 팀의 핵심 멤버. 외부 협력사 사람들은 따로 분리해두지 않고 본문에 메모만 한다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '엄마',
      type: 'person',
      tags: tag,
      body: `김치찌개를 세상에서 제일 잘 만드시는 분.

생신은 5월 12일. 늘 새벽에 일어나 산책을 하시고, 해질녘엔 베란다에서 화초를 돌보신다. 전화는 거의 매일 한 번씩 한다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '아빠',
      type: 'person',
      tags: tag,
      body: `자전거를 평생의 취미로 두신 분.

주말마다 한강을 따라 라이딩을 가신다. 말수는 적지만 한 번 시작하면 자전거 얘기는 끝이 없다. 70 다 되어가시는데 종아리 근육이 청년 같다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '김철수',
      type: 'person',
      tags: tag,
      body: `대학교 룸메이트, 03학번 동기.

같이 게임을 자주 하는데 술은 약하다. 생일은 3월 15일. 회사를 다니다가 최근에 카페를 차렸는데 라떼아트가 점점 좋아지고 있다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '박부장',
      type: 'person',
      tags: tag,
      body: `같은 팀의 부장님.

판단이 빠르고 합리적이라 회의를 끌고 가는 능력이 좋다. 본인 일도 많은데 후배들 멘토링을 잊지 않는다. 등산을 즐기신다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '명함첩',
      type: 'source',
      status: 'draft',
      tags: ['인맥', '연락처'],
      body: `직업적으로 만난 사람들의 명함과 연락처를 정리한 곳. 외부 협력사·행사 인연·강연 자리에서 만난 사람들이 여기 들어간다.
`,
      updatedAt: next(),
    }),
  ];
}

/* ── 3. 요리 (음식·레시피) ── */
export function buildCookingDemo(): WikiPage[] {
  let n = Date.now();
  const next = () => ++n;
  const tag = ['요리'];

  return [
    mk({
      title: '요리',
      type: 'concept',
      isMain: true,
      status: 'stable',
      tags: tag,
      body: `집에서 만들어 본 요리들을 정리하는 페이지.

크게 [[한식]] 과 [[양식]] 으로 나누어두었다. 매일 먹는 익숙한 한식이 가장 자주 등록되고, 가끔 도전해보는 양식이 그 다음. 디저트는 아직 두 개뿐이라 별도 페이지를 만들지 않았다.

부엌 살림에 대한 메모는 [[부엌 장비]] 에 따로 정리.
`,
      updatedAt: next(),
    }),
    mk({
      title: '한식',
      type: 'concept',
      isMain: true,
      tags: tag,
      body: `매일 먹어도 질리지 않는 집밥의 기본.

대표 메뉴는 추울 때 끓이는 [[김치찌개]] 와 점심으로 자주 만드는 [[비빔밥]]. 둘 다 재료가 단순하고 실패가 적다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '양식',
      type: 'concept',
      isMain: true,
      tags: tag,
      body: `주말이나 손님 올 때 만드는 약간 격식 있는 메뉴.

빠르게 만들 수 있는 [[파스타]] 와 시간 들여 굽는 [[스테이크]] 가 단골. 와인 한 잔 곁들이면 분위기가 산다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '김치찌개',
      type: 'concept',
      tags: tag,
      body: `푹 익은 김치를 잘게 썰어 들기름에 살짝 볶다가 물을 부어 끓인다. 돼지고기 앞다리살을 같이 넣으면 국물이 진해진다.

마지막에 두부와 대파, 청양고추를 넣고 한소끔. 밥 두 그릇은 우습게 들어간다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '비빔밥',
      type: 'concept',
      tags: tag,
      body: `남은 반찬을 모아 한 그릇으로 만드는 마법.

밥 위에 시금치·콩나물·당근채·고사리·소고기 볶음을 둥글게 두르고, 가운데 계란 노른자 하나. 고추장 한 숟갈에 참기름 한 방울을 떨어뜨려 비비면 끝.
`,
      updatedAt: next(),
    }),
    mk({
      title: '파스타',
      type: 'concept',
      tags: tag,
      body: `15분이면 차려지는 가장 빠른 양식.

올리브유에 마늘을 노릇하게 볶다가 파스타 삶은 물 두 국자를 넣고, 알 덴테로 삶은 면을 넣어 휘저으면 알리오올리오. 베이컨을 추가하면 까르보나라 베이스가 된다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '스테이크',
      type: 'concept',
      status: 'draft',
      tags: tag,
      body: `굽기 직전 30분은 실온에 두고, 굽기 직전에 소금만. 후추는 굽고 나서.

팬은 무겁고 두꺼울수록 좋다. 한 면당 2~3분, 옆면도 30초씩. 꺼낸 뒤 5분은 무조건 레스팅.
`,
      updatedAt: next(),
    }),
    mk({
      title: '부엌 장비',
      type: 'source',
      status: 'draft',
      tags: ['요리', '도구'],
      body: `자주 쓰는 도구와 사고 싶은 것들을 메모한 페이지.

지금 가장 자주 쓰는 건 무쇠팬 28cm 와 누름판. 다음 살 후보는 즙이 잘 빠지는 마늘 다지기와 두꺼운 도마.
`,
      updatedAt: next(),
    }),
  ];
}

/* ── 4. 독서 (책 정리) ── */
export function buildReadingDemo(): WikiPage[] {
  let n = Date.now();
  const next = () => ++n;
  const tag = ['독서'];

  return [
    mk({
      title: '독서',
      type: 'concept',
      isMain: true,
      status: 'stable',
      tags: tag,
      body: `읽은 책을 정리해두는 페이지.

분야는 크게 [[소설]] 과 [[자기계발]] 두 묶음. 에세이는 따로 페이지를 만들지 않고 자기계발 안에 같이 둔다.

매일 한 줄씩이라도 적어두는 [[독서 일지]] 가 가장 활발하게 쓰는 페이지.
`,
      updatedAt: next(),
    }),
    mk({
      title: '소설',
      type: 'concept',
      isMain: true,
      tags: tag,
      body: `시간이 빠르게 흐르는 책들.

가장 인상 깊었던 건 조지 오웰의 [[1984]]. 한 번 더 읽어야겠다고 생각만 한 지 일 년이 됐다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '자기계발',
      type: 'concept',
      isMain: true,
      tags: tag,
      body: `행동·습관·사고방식을 다루는 책들.

기시미 이치로의 [[미움받을 용기]] 와 제임스 클리어의 [[아주 작은 습관의 힘]] 이 가장 자주 다시 펴보는 책. 한 권은 *나*, 한 권은 *행동* 의 책이라 짝이 잘 맞는다.
`,
      updatedAt: next(),
    }),
    mk({
      title: '1984',
      aliases: ['1984년', 'Nineteen Eighty-Four'],
      type: 'source',
      status: 'stable',
      tags: tag,
      body: `조지 오웰, 1949년. 20세기 디스토피아 소설의 전형.

전체주의 정권 *오세아니아* 에서 진실부 직원으로 일하는 윈스턴 스미스의 이야기. *Big Brother is watching you* 라는 문구는 이 책에서 나왔다.

읽으면서 가장 충격적이었던 건 결말의 *2 + 2 = 5* 장면. 사상의 자유가 어떻게 무너지는지에 대한 가장 정직한 묘사.
`,
      updatedAt: next(),
    }),
    mk({
      title: '미움받을 용기',
      type: 'source',
      status: 'stable',
      tags: tag,
      body: `기시미 이치로·고가 후미타케, 2013년. 아들러 심리학을 청년과 철학자의 대화로 풀어낸 책.

핵심 메시지는 *모든 고민은 인간 관계에서 온다* 와 *과제 분리* 다. 내 과제와 남의 과제를 구분하지 못해서 휘둘리는 경우가 많다는 통찰.

작중 청년의 격렬한 반박이 주는 카타르시스가 이 책의 진짜 매력.
`,
      updatedAt: next(),
    }),
    mk({
      title: '아주 작은 습관의 힘',
      aliases: ['Atomic Habits'],
      type: 'source',
      status: 'stable',
      tags: tag,
      body: `제임스 클리어, 2018년. 1% 의 변화를 매일 누적하는 습관 시스템.

핵심 4법칙: 분명하게, 매력적으로, 쉽게, 만족스럽게. 환경 설계가 의지력보다 강하다는 점을 반복해 강조한다.

지금까지 가장 도움이 된 건 *습관 쌓기* (기존 습관 뒤에 새 습관 붙이기) 와 *2분 규칙* (시작은 2분만).
`,
      updatedAt: next(),
    }),
    mk({
      title: '독서 일지',
      type: 'project',
      status: 'active',
      tags: ['독서', '일지'],
      body: `매일 한 줄씩이라도 *오늘 무엇을 읽었는가* 를 적는 페이지. 책 한 권 끝낼 때마다 별도 페이지로 옮긴다.

이 페이지의 진짜 가치는 *완독* 이 아니라 *꾸준함* 의 흔적을 남기는 것.
`,
      updatedAt: next(),
    }),
  ];
}
