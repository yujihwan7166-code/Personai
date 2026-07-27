/**
 * 인맥노트 예시 — 스무 명.
 *
 * 이 방이 무엇을 하는 방인지는 사람 이름 세 개로는 안 보인다. "다가오는 경조사",
 * "다시 챙길 사람", "선물 균형" 같은 화면은 사람이 스무 명쯤 되고 그 사이가
 * 제각각일 때 비로소 제 일을 한다.
 *
 * 그래서 **고르게 만들지 않았다.**
 *  · 관계 일곱 종(가족·친구·선후배·직장·거래처·지인·기타)을 다 쓴다
 *  · 친밀도가 절친부터 소원까지 흩어져 있다 — '다시 챙길 사람' 이 실제로 걸리게
 *  · 생일이 이번 달·다음 달·먼 달에 나뉘어 있다 — 달력이 비지도 몰리지도 않게
 *  · 어떤 사람은 적어둔 것이 많고 어떤 사람은 이름과 관계뿐이다. 실제 수첩이 그렇다
 *  · 마지막 연락이 어제인 사람과 열 달 전인 사람이 함께 있다
 *
 * 생일은 MM-DD 라 해가 없다. 그래서 이 파일은 오늘이 언제든 그대로 쓸 수 있다.
 * 반면 주고받은 기록(Interaction)은 실제 날짜라 '오늘 기준 며칠 전' 으로 만든다.
 */
import type { Interaction, Person, PeopleCategory } from '@/types/people';
import { PEOPLE_CHANGED } from '@/types/people';

const PERSONS_KEY = 'people.persons.v1';
const INTERACTIONS_KEY = 'people.interactions.v1';
const CATEGORIES_KEY = 'people.categories.v1';

/** 오늘에서 n일 전 (YYYY-MM-DD, 로컬) */
function daysAgo(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 이번 달 기준으로 n달 뒤의 MM — 생일을 '다가오는' 자리에 놓을 때 쓴다. */
function monthFromNow(n: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return String(d.getMonth() + 1).padStart(2, '0');
}
const MD = (monthOffset: number, day: number) => `${monthFromNow(monthOffset)}-${String(day).padStart(2, '0')}`;

type Rel = Person['relation'];
type Close = Person['closeness'];

interface Seed {
  key: string;
  name: string;
  relation: Rel;
  closeness: Close;
  intro?: string;
  tags?: string[];
  cats?: string[];          // 카테고리 이름
  phone?: string;
  region?: string;
  /** MM-DD. monthOffset 을 쓰면 오늘 기준으로 다가오게 놓인다. */
  birthday?: string;
  annivs?: { label: string; monthDay: string; type?: 'anniversary' | 'etc' }[];
  likes?: string[];
  dislikes?: string[];
  familyNote?: string;
  episode?: string;
  /** [며칠 전, 종류, 메모] */
  log?: [number, Interaction['kind'], string][];
}

/* ── 카테고리 ── */
const CATS = ['가족', '대학 동기', '직장', '동아리', '거래처'];

/* ── 스무 명 ──
   이름은 흔한 한국 이름에서 골랐고 실존 인물과 무관하다. */
const SEEDS: Seed[] = [
  /* 가족 4 */
  {
    key: 'mom', name: '이경숙', relation: 'family', closeness: 'best',
    intro: '엄마 · 매주 통화', cats: ['가족'], region: '대구',
    birthday: MD(1, 12),
    annivs: [{ label: '결혼기념일', monthDay: '05-19' }],
    likes: ['카스테라', '트로트', '화분'], dislikes: ['향 강한 꽃'],
    familyNote: '무릎 안 좋으심 — 오래 걷는 코스는 피하기',
    episode: '수능 끝난 날 아무 말 없이 미역국만 끓여 주셨다.',
    log: [[2, 'chat', '통화 — 김장 언제 할지'], [23, 'meet', '본가 다녀옴'], [61, 'gift_given', '생신 케이크']],
  },
  {
    key: 'dad', name: '유정호', relation: 'family', closeness: 'close',
    intro: '아빠 · 말수 적음', cats: ['가족'], region: '대구',
    birthday: MD(4, 3),
    likes: ['등산', '막걸리'], dislikes: ['시끄러운 곳'],
    familyNote: '고혈압 약 복용 중',
    log: [[23, 'meet', '본가에서 같이 저녁'], [88, 'chat', '전화 — 차 정기점검 얘기']],
  },
  {
    key: 'sis', name: '유지민', relation: 'family', closeness: 'best',
    intro: '동생 · 부산에서 직장 다님', cats: ['가족'], region: '부산',
    birthday: MD(0, 26),
    likes: ['디저트 카페', '고양이'],
    episode: '첫 월급으로 나한테 신발 사 줬다. 아직 신는다.',
    log: [[1, 'chat', '카톡 — 주말에 올라온다고'], [34, 'meet', '부산에서 하루']],
  },
  {
    key: 'aunt', name: '정민아', relation: 'family', closeness: 'normal',
    intro: '사촌 누나 · 가족 모임 총무', cats: ['가족'],
    birthday: MD(3, 8),
    annivs: [{ label: '결혼기념일', monthDay: MD(0, 6) }],
    likes: ['핸드크림'],
    log: [[12, 'chat', '단톡 — 추석 모임 날짜'], [40, 'gift_received', '텀블러 받음']],
  },

  /* 친구 5 */
  {
    key: 'seoyeon', name: '김서연', relation: 'friend', closeness: 'best',
    intro: '대학 동기 · 같은 동네', cats: ['대학 동기'], region: '서울 마포',
    birthday: MD(0, 23), phone: '010-2431-8890',
    likes: ['위스키', '재즈바', '농구'], dislikes: ['오이'],
    episode: '졸업 논문 마감 전날 밤새 같이 있어 줬다.',
    log: [[3, 'meet', '동네에서 저녁'], [11, 'chat', '통화'], [29, 'meet', '전시 보러 감']],
  },
  {
    key: 'junho', name: '박준호', relation: 'friend', closeness: 'close',
    intro: '고등학교 친구 · 지금은 제주 살아', cats: [], region: '제주',
    birthday: MD(2, 17),
    likes: ['서핑', '맥주'],
    episode: '고3 때 도시락 매일 나눠 먹었다.',
    log: [[19, 'chat', '오랜만에 통화 — 제주 놀러 오라고'], [140, 'meet', '제주에서 이틀']],
  },
  {
    key: 'hana', name: '최하나', relation: 'friend', closeness: 'close',
    intro: '전 직장 동기 · 지금도 자주 봄', cats: [],
    birthday: MD(5, 30),
    likes: ['등산', '커피'], dislikes: ['단 음료'],
    log: [[8, 'meet', '북한산'], [37, 'chat', '카톡']],
  },
  {
    key: 'minsu', name: '강민수', relation: 'friend', closeness: 'normal',
    intro: '군대 동기', cats: [],
    birthday: MD(7, 9),
    likes: ['게임', '치킨'],
    log: [[95, 'chat', '생일 축하 카톡']],
  },
  {
    key: 'yerin', name: '송예린', relation: 'friend', closeness: 'distant',
    intro: '중학교 친구 · 연락 뜸해짐', cats: [],
    birthday: MD(9, 14),
    episode: '중2 때 같은 반. 그때 별명이 아직도 기억난다.',
    log: [[300, 'chat', '생일 축하만 주고받음']],
  },

  /* 선후배 3 */
  {
    key: 'sunbae', name: '임태경', relation: 'senior', closeness: 'close',
    intro: '학과 선배 · 지금 같은 업계', cats: ['대학 동기'],
    birthday: MD(1, 27), phone: '010-7712-3340',
    likes: ['와인', '축구'],
    episode: '첫 이직 때 밤 열두 시에 전화 받아 주고 두 시간 들어 줬다.',
    log: [[16, 'meet', '점심 — 이직 상담'], [58, 'chat', '통화'], [58, 'gift_received', '책 선물 받음']],
  },
  {
    key: 'hubae', name: '조은우', relation: 'senior', closeness: 'normal',
    intro: '동아리 후배 · 요즘 취준 중', cats: ['동아리'],
    birthday: MD(6, 5),
    likes: ['사진'],
    log: [[27, 'chat', '카톡 — 포트폴리오 봐 줌'], [70, 'meet', '동아리 모임']],
  },
  {
    key: 'woosuk', name: '최우석', relation: 'senior', closeness: 'distant',
    intro: '고등학교 선배 · 일 년에 한 번쯤', cats: [],
    birthday: MD(1, 14),
    log: [[210, 'chat', '새해 인사']],
  },

  /* 직장 4 */
  {
    key: 'lead', name: '박도현', relation: 'work', closeness: 'normal',
    intro: '팀장님', cats: ['직장'],
    birthday: MD(0, 3),
    likes: ['골프', '아메리카노'], dislikes: ['갑작스러운 일정 변경'],
    familyNote: '아이 둘 — 초등 저학년',
    log: [[1, 'chat', '업무 메신저'], [14, 'meet', '팀 회식']],
  },
  {
    key: 'colleague1', name: '한소영', relation: 'work', closeness: 'close',
    intro: '옆자리 · 같이 프로젝트', cats: ['직장'],
    birthday: MD(2, 21),
    likes: ['샐러드', '요가'],
    episode: '내가 실수한 날 아무 말 없이 야근 같이 해 줬다.',
    log: [[1, 'meet', '점심'], [6, 'chat', '주말에도 이슈 대응']],
  },
  {
    key: 'colleague2', name: '윤재혁', relation: 'work', closeness: 'normal',
    intro: '다른 팀 · 협업 자주', cats: ['직장'],
    birthday: MD(4, 11),
    log: [[9, 'chat', '스펙 문의'], [45, 'meet', '워크숍']],
  },
  {
    key: 'exboss', name: '오현주', relation: 'work', closeness: 'distant',
    intro: '전 직장 팀장님 · 명절에만', cats: [],
    birthday: MD(8, 2),
    episode: '퇴사할 때 "언제든 연락해" 라고 했는데 아직 못 했다.',
    log: [[180, 'chat', '명절 인사']],
  },

  /* 거래처 2 */
  {
    key: 'client1', name: '유지환', relation: 'business', closeness: 'normal',
    intro: '거래처 담당 · 계약 갱신 건', cats: ['거래처'], phone: '010-3355-1104',
    birthday: MD(1, 18),
    annivs: [{ label: '계약 갱신', monthDay: MD(2, 1), type: 'etc' }],
    likes: ['한정식'], dislikes: ['늦은 회신'],
    log: [[7, 'chat', '메일 — 일정 확인'], [33, 'meet', '미팅']],
  },
  {
    key: 'client2', name: '노은채', relation: 'business', closeness: 'distant',
    intro: '작년 프로젝트 담당 · 지금은 다른 회사', cats: [],
    birthday: MD(10, 7),
    log: [[240, 'chat', '이직 소식 듣고 축하']],
  },

  /* 지인 2 */
  {
    key: 'climb', name: '이하늘', relation: 'acquaintance', closeness: 'normal',
    intro: '등산 모임에서 만남', cats: [],
    birthday: MD(5, 22),
    annivs: [{ label: '집들이', monthDay: MD(0, 29), type: 'etc' }],
    likes: ['디퓨저', '트레킹화'],
    log: [[21, 'meet', '북한산 같이'], [21, 'gift_given', '디퓨저 세트']],
  },
  {
    key: 'vet', name: '신다움', relation: 'acquaintance', closeness: 'distant',
    intro: '고양이 병원 원장님', cats: [],
    birthday: MD(3, 30),
    familyNote: '우리 고양이 담당 — 예방접종 6개월마다',
    log: [[130, 'meet', '정기 접종']],
  },
];

/**
 * 기존 사람·기록을 전부 지우고 예시 스무 명으로 갈아 끼운다.
 * 되돌릴 수 없으므로 부르는 쪽에서 반드시 한 번 묻는다.
 *
 * @returns 되돌리기용 이전 상태 — 부르는 쪽이 들고 있다가 그대로 되돌릴 수 있다.
 */
export function replacePeopleWithSample(): {
  before: { persons: unknown; interactions: unknown; categories: unknown };
  count: { persons: number; logs: number };
} {
  const before = {
    persons: window.localStorage.getItem(PERSONS_KEY),
    interactions: window.localStorage.getItem(INTERACTIONS_KEY),
    categories: window.localStorage.getItem(CATEGORIES_KEY),
  };

  const now = Date.now();
  const iso = (offset: number) => new Date(now - offset * 1000).toISOString();

  /* 카테고리 먼저 — 사람이 이름으로 가리키므로 id 를 만들어 표로 들고 있는다 */
  const catId = new Map<string, string>();
  const categories: PeopleCategory[] = CATS.map((name, i) => {
    const id = `pcat_smp_${i}`;
    catId.set(name, id);
    return { id, name, createdAt: iso(CATS.length - i) };
  });

  const persons: Person[] = [];
  const interactions: Interaction[] = [];

  SEEDS.forEach((s, i) => {
    const id = `psn_smp_${s.key}`;
    persons.push({
      id,
      name: s.name,
      relation: s.relation,
      closeness: s.closeness,
      intro: s.intro,
      tags: s.tags ?? [],
      categoryIds: (s.cats ?? []).map((n) => catId.get(n)).filter((x): x is string => !!x),
      phone: s.phone,
      region: s.region,
      birthday: s.birthday,
      annivs: (s.annivs ?? []).map((a, j) => ({
        id: `anv_smp_${s.key}_${j}`,
        label: a.label,
        monthDay: a.monthDay,
        type: a.type ?? 'anniversary',
      })),
      likes: s.likes ?? [],
      dislikes: s.dislikes ?? [],
      familyNote: s.familyNote,
      episode: s.episode,
      createdAt: iso(SEEDS.length - i),
    });

    (s.log ?? []).forEach(([ago, kind, note], j) => {
      interactions.push({
        id: `itx_smp_${s.key}_${j}`,
        personId: id,
        kind,
        date: daysAgo(ago),
        note,
        createdAt: iso(ago * 60),
      });
    });
  });

  window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  window.localStorage.setItem(PERSONS_KEY, JSON.stringify(persons));
  window.localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(interactions));
  window.dispatchEvent(new CustomEvent(PEOPLE_CHANGED));

  return { before, count: { persons: persons.length, logs: interactions.length } };
}

/** 예시로 갈아 끼우기 직전 상태로 되돌린다. */
export function restorePeople(before: { persons: unknown; interactions: unknown; categories: unknown }): void {
  const put = (key: string, v: unknown) => {
    if (typeof v === 'string') window.localStorage.setItem(key, v);
    else window.localStorage.removeItem(key);
  };
  put(PERSONS_KEY, before.persons);
  put(INTERACTIONS_KEY, before.interactions);
  put(CATEGORIES_KEY, before.categories);
  window.dispatchEvent(new CustomEvent(PEOPLE_CHANGED));
}
