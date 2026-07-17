/**
 * 인맥노트 — 사람(Person) / 관계 기록(Interaction) 타입.
 *
 * 모델: 사람 카드에 정적 정보(관계·친밀도·기억할 것·경조사)를 두고,
 * 시간이 흐르는 것(대화·만남·선물·안부)은 Interaction 으로 쌓는다.
 * "오늘 챙길 것"은 이 둘에서 파생 — 마지막 연락이 오래된 사람 + 다가오는 경조사.
 */

export const PEOPLE_CHANGED = 'people:changed';

export type Relation = 'family' | 'friend' | 'senior' | 'work' | 'business' | 'acquaintance' | 'etc';
export const RELATION_META: Record<Relation, { label: string }> = {
  family: { label: '가족' },
  friend: { label: '친구' },
  senior: { label: '선후배' },
  work: { label: '직장' },
  business: { label: '거래처' },
  acquaintance: { label: '지인' },
  etc: { label: '기타' },
};
export const RELATION_ORDER: Relation[] = ['family', 'friend', 'senior', 'work', 'business', 'acquaintance', 'etc'];

export type Closeness = 'best' | 'close' | 'normal' | 'distant';
export const CLOSENESS_META: Record<Closeness, { label: string; /** 이 개월수 넘게 연락 없으면 "오랜만이에요" */ pingMonths: number }> = {
  best: { label: '절친', pingMonths: 1 },
  close: { label: '가까움', pingMonths: 2 },
  normal: { label: '보통', pingMonths: 4 },
  distant: { label: '소원', pingMonths: 8 },
};
export const CLOSENESS_ORDER: Closeness[] = ['best', 'close', 'normal', 'distant'];

/** 반복 경조사 — 생일 외 추가 기념일 (매년 MM-DD). */
export interface Anniv {
  id: string;
  label: string;
  /** MM-DD */
  monthDay: string;
  type: 'anniversary' | 'etc';
}

/** 사용자가 만든 그룹 — 사람을 여러 카테고리에 동시에 편입할 수 있다. */
export interface PeopleCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface Person {
  id: string;
  name: string;
  relation: Relation;
  closeness: Closeness;
  /** 한 줄 소개 — "대학 동기 · 등산 모임". */
  intro?: string;
  tags: string[];
  /** 편입된 카테고리 id 목록 (여러 개 동시 가능). */
  categoryIds: string[];
  /** 카드 색 — 직접 고른 값(hsl/hex). 없으면 이름 해시색(avatarColor). */
  color?: string;
  /** 첨부 사진(dataURL) — 프로필 또는 명함 등. */
  photo?: string;
  phone?: string;
  region?: string;
  /** 생일 MM-DD (매년 반복). */
  birthday?: string;
  annivs: Anniv[];
  /** 기억할 것. */
  likes: string[];
  dislikes: string[];
  familyNote?: string;
  /** 잊지 못할 에피소드. */
  episode?: string;
  createdAt: string;
}

export type InteractionKind = 'chat' | 'meet' | 'gift_given' | 'gift_received' | 'ping';
export const INTERACTION_META: Record<InteractionKind, { label: string; tint: string }> = {
  chat: { label: '대화', tint: 'hsl(210 55% 48%)' },
  meet: { label: '만남', tint: 'hsl(16 62% 48%)' },
  gift_given: { label: '선물 줌', tint: 'hsl(38 75% 44%)' },
  gift_received: { label: '선물 받음', tint: 'hsl(150 40% 40%)' },
  ping: { label: '안부', tint: 'hsl(146 27% 39%)' },
};
export const INTERACTION_ORDER: InteractionKind[] = ['chat', 'meet', 'gift_given', 'gift_received', 'ping'];

export interface Interaction {
  id: string;
  personId: string;
  kind: InteractionKind;
  /** YYYY-MM-DD */
  date: string;
  note: string;
  createdAt: string;
}

/** 아바타 색 — 이름 해시로 결정 (목업의 다색 이니셜 원). 색 직접 고르기 팔레트로도 재사용. */
export const AVATAR_COLORS = [
  'hsl(16 62% 48%)',  // 테라코타
  'hsl(150 38% 40%)', // 그린
  'hsl(210 52% 46%)', // 블루
  'hsl(262 42% 52%)', // 바이올렛
  'hsl(340 50% 52%)', // 로즈
  'hsl(32 62% 44%)',  // 앰버
  'hsl(182 42% 38%)', // 틸
];
export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** 실존 가능한 MM-DD 인지 — 13-40 같은 값이 저장돼 알림이 조용히 죽는 것 방지. */
export const isValidMonthDay = (v: string): boolean =>
  /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v);

const isLeapYear = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** MM-DD 의 다음 도래일 — D-day 계산 (오늘 포함).
 * 2월 29일은 평년엔 2월 28일에 축하하는 관례를 따른다 (롤오버/NaN 방지). */
export function nextOccurrence(monthDay: string, todayYYYYMMDD: string): { date: string; dday: number } {
  const resolve = (y: number) => (monthDay === '02-29' && !isLeapYear(y) ? `${y}-02-28` : `${y}-${monthDay}`);
  const year = Number(todayYYYYMMDD.slice(0, 4));
  const thisYear = resolve(year);
  const target = thisYear >= todayYYYYMMDD ? thisYear : resolve(year + 1);
  const dday = Math.round(
    (Date.parse(`${target}T00:00:00`) - Date.parse(`${todayYYYYMMDD}T00:00:00`)) / 86400000,
  );
  return { date: target, dday };
}
