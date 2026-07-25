/**
 * 마이위키 v4 저장소 — localStorage 'mywiki.v4'.
 *
 * v4 = "서재와 책들": 책(표지 있는 컨테이너) 여러 권 + 책 안의 무한 parent 트리.
 *  - 링크는 본문 링크 노드(url = "wiki://<docId>") — 책 경계 없이 어디로든 (서재 = 한 지식망)
 *  - 문서 틀은 템플릿으로 (templates.ts) — 인포박스는 폐기됨
 * v3(책 없는 트리)는 1회 자동 이관: 최상위 문서마다 책 한 권을 만들어 그 아래로.
 * v2(분류·플레인 텍스트)는 v3 규칙으로 이관 후 다시 v4 로.
 */
import type { Value } from 'platejs';

/** 책 표지 팔레트 — 서가 시안(마이위키 서재.dc.html)의 책등 색 그대로. */
export const BOOK_PALETTE = ['#9a4632', '#33465e', '#3f6058', '#b98a2e', '#6d4457', '#7c5638', '#4a5d3a', '#3c3833'];

export interface WikiBook {
  id: string;
  title: string;
  tint: string;      // 책등·표지 색 (BOOK_PALETTE 중 하나가 기본)
  intro: string;     // 한 줄 소개 — 표지 부제
  updated: number;
}

export interface WikiDoc {
  id: string;
  book: string;            // 소속 책 id
  title: string;
  parent: string | null;   // null = 책의 최상위
  tags: string[];
  pinned: boolean;
  updated: number;
  body: Value;
}

export interface WikiStore {
  books: WikiBook[];
  docs: WikiDoc[];
  recent: string[];
}

export const WIKI4_KEY = 'mywiki.v4';
export const WIKI3_KEY = 'mywiki.v3';
const V2_KEY = 'mywiki.v2';
export const WIKI3_CHANGED = 'mywiki3:changed';

/** id 해시 → 팔레트 색 (v3 이관 때 뿌리 색 관례 유지). */
export function hashTint(id: string): string {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return BOOK_PALETTE[Math.abs(h) % BOOK_PALETTE.length];
}

export const emptyBody = (): Value => [{ type: 'p', children: [{ text: '' }] }];

/* ── v2 → v3 마이그레이션 ── */

/** v3 모양 — 책 없던 시절의 문서. 이관 중간 단계에서만 쓴다. */
export interface V3Doc {
  id: string; title: string; parent: string | null;
  tags: string[]; pinned: boolean; updated: number; body: Value;
}
export interface V3Store { docs: V3Doc[]; recent: string[] }

interface V2Cat { id: string; name: string }
interface V2Doc { id: string; title: string; cat: string; tags?: string[]; pinned?: boolean; updated?: number; body?: string }

/** [[제목]] 이 섞인 한 줄 → 텍스트/링크 노드 children. titleToId 에 있으면 링크, 없으면 평문. */
function inlineChildren(text: string, titleToId: Map<string, string>): { text: string }[] | ({ text: string } | { type: 'a'; url: string; children: { text: string }[] })[] {
  const out: ({ text: string } | { type: 'a'; url: string; children: { text: string }[] })[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let last = 0;
  let m = re.exec(text);
  while (m) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    const title = m[1];
    const id = titleToId.get(title.trim());
    if (id) out.push({ type: 'a', url: `wiki://${id}`, children: [{ text: title }] });
    else out.push({ text: title });
    last = re.lastIndex;
    m = re.exec(text);
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out.length ? out : [{ text: '' }];
}

/** v2 플레인 텍스트 본문 → Plate Value. ## 소제목 / - 목록 / > 인용 / [[링크]] 변환. */
export function plainToValue(body: string, titleToId: Map<string, string>): Value {
  const out: Value = [];
  for (const raw of body.split('\n')) {
    const s = raw.trim();
    if (!s) continue;
    if (s.startsWith('## ')) out.push({ type: 'h2', children: inlineChildren(s.slice(3), titleToId) });
    else if (s.startsWith('- ')) out.push({ type: 'p', indent: 1, listStyleType: 'disc', children: inlineChildren(s.slice(2), titleToId) });
    else if (s.startsWith('> ')) out.push({ type: 'blockquote', children: inlineChildren(s.slice(2), titleToId) });
    else out.push({ type: 'p', children: inlineChildren(s, titleToId) });
  }
  return out.length ? out : emptyBody();
}

/** v2 스냅샷 → v3 모양. 분류는 본문 빈 최상위 문서로 승격(같은 id 재사용). */
export function migrateV2ToV3(raw: unknown): V3Store | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as { docs?: V2Doc[]; cats?: V2Cat[]; recent?: string[] };
  if (!Array.isArray(d.docs) || !Array.isArray(d.cats)) return null;
  const titleToId = new Map<string, string>();
  for (const doc of d.docs) if (doc?.title && doc.id) titleToId.set(doc.title.trim(), doc.id);
  const catIds = new Set(d.cats.map((c) => c.id));
  const now = Date.now();
  const roots: V3Doc[] = d.cats.filter((c) => c && c.id && c.name).map((c) => ({
    id: c.id, title: c.name, parent: null, tags: [], pinned: false, updated: now, body: emptyBody(),
  }));
  const children: V3Doc[] = d.docs.filter((x) => x && x.id && x.title).map((x) => ({
    id: x.id,
    title: x.title,
    parent: catIds.has(x.cat) ? x.cat : null,
    tags: Array.isArray(x.tags) ? x.tags.filter((t): t is string => typeof t === 'string') : [],
    pinned: x.pinned === true,
    updated: typeof x.updated === 'number' ? x.updated : now,
    body: plainToValue(typeof x.body === 'string' ? x.body : '', titleToId),
  }));
  return {
    docs: [...roots, ...children],
    recent: Array.isArray(d.recent) ? d.recent.filter((r): r is string => typeof r === 'string') : [],
  };
}

/* ── v3 → v4 마이그레이션 ── */

/**
 * 책 없는 트리 → 서재. 최상위 문서(고아 포함)마다 책 한 권을 만들고,
 * 그 최상위 문서와 자손 전부를 그 책 소속으로. 문서·본문·링크는 무손실.
 */
export function migrateV3ToV4(v3: V3Store): WikiStore {
  const ids = new Set(v3.docs.map((d) => d.id));
  const isRoot = (d: V3Doc) => d.parent === null || !ids.has(d.parent);
  const roots = v3.docs.filter(isRoot);
  const now = Date.now();

  const books: WikiBook[] = roots.map((r) => ({
    id: `bk_${r.id}`, title: r.title || '무제', tint: hashTint(r.id), intro: '', updated: r.updated || now,
  }));

  // 각 문서의 뿌리 찾기 (순환 방어)
  const byId = new Map(v3.docs.map((d) => [d.id, d]));
  const rootIdOf = (d: V3Doc): string => {
    const seen = new Set<string>([d.id]);
    let cur = d;
    while (cur.parent && byId.has(cur.parent) && !seen.has(cur.parent)) {
      seen.add(cur.parent);
      cur = byId.get(cur.parent)!;
    }
    return cur.id;
  };

  const docs: WikiDoc[] = v3.docs.map((d) => ({
    ...d,
    book: `bk_${rootIdOf(d)}`,
    // 뿌리였던 문서는 책의 최상위 문서로 (책이 부모 역할을 이어받음)
    parent: isRoot(d) ? null : d.parent,
  }));

  return { books, docs, recent: v3.recent };
}

/* ── load / save ── */

function normalizeBook(raw: unknown): WikiBook | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id || typeof r.title !== 'string') return null;
  return {
    id: r.id,
    title: r.title,
    tint: typeof r.tint === 'string' && r.tint ? r.tint : BOOK_PALETTE[0],
    intro: typeof r.intro === 'string' ? r.intro : '',
    updated: typeof r.updated === 'number' ? r.updated : Date.now(),
  };
}

function normalizeDoc(raw: unknown): WikiDoc | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id || typeof r.title !== 'string') return null;
  return {
    id: r.id,
    book: typeof r.book === 'string' ? r.book : '',
    title: r.title,
    parent: typeof r.parent === 'string' ? r.parent : null,
    tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string') : [],
    pinned: r.pinned === true,
    updated: typeof r.updated === 'number' ? r.updated : Date.now(),
    body: Array.isArray(r.body) && r.body.length ? (r.body as Value) : emptyBody(),
  };
}

function normalizeV3Doc(raw: unknown): V3Doc | null {
  const d = normalizeDoc(raw);
  if (!d) return null;
  const { book: _book, ...rest } = d;
  return rest;
}

export function loadWiki(): WikiStore {
  try {
    const raw = localStorage.getItem(WIKI4_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Record<string, unknown>;
      const books = Array.isArray(d.books) ? d.books.map(normalizeBook).filter((x): x is WikiBook => !!x) : [];
      const bookIds = new Set(books.map((b) => b.id));
      const docs = (Array.isArray(d.docs) ? d.docs.map(normalizeDoc).filter((x): x is WikiDoc => !!x) : [])
        .filter((x) => bookIds.has(x.book)); // 고아 문서(책 없음)는 버리지 않고 싶지만 화면에 못 놓음 — 방어
      return { books, docs, recent: Array.isArray(d.recent) ? (d.recent as string[]).filter((r) => typeof r === 'string') : [] };
    }
    // v3 → v4 1회 자동 이관
    const v3raw = localStorage.getItem(WIKI3_KEY);
    if (v3raw) {
      const d = JSON.parse(v3raw) as Record<string, unknown>;
      const docs = Array.isArray(d.docs) ? d.docs.map(normalizeV3Doc).filter((x): x is V3Doc => !!x) : [];
      const migrated = migrateV3ToV4({
        docs,
        recent: Array.isArray(d.recent) ? (d.recent as string[]).filter((r) => typeof r === 'string') : [],
      });
      saveWiki(migrated);
      return migrated;
    }
    // v2 → v3 → v4
    const v2 = localStorage.getItem(V2_KEY);
    if (v2) {
      const v3 = migrateV2ToV3(JSON.parse(v2));
      if (v3) {
        const migrated = migrateV3ToV4(v3);
        saveWiki(migrated);
        return migrated;
      }
    }
  } catch { /* 손상 저장분 → 빈 서재 */ }
  return { books: [], docs: [], recent: [] };
}

export function saveWiki(store: WikiStore): void {
  try {
    localStorage.setItem(WIKI4_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(WIKI3_CHANGED));
  } catch { /* quota — 무시 */ }
}

/* ── 예시 시드 — 빈 서재로 시작하는 첫 사용자에게 기능이 보이는 책 3권.
 * 1회만 (flag) — 다 지워도 다시 안 깔린다. */

const SEED_FLAG = 'mywiki.v4.seeded';

const _p = (text: string) => ({ type: 'p', children: [{ text }] });
const _h2 = (text: string) => ({ type: 'h2', children: [{ text }] });
const _h3 = (text: string) => ({ type: 'h3', children: [{ text }] });
const _quote = (text: string) => ({ type: 'blockquote', children: [{ text }] });
const _li = (text: string) => ({ type: 'p', indent: 1, listStyleType: 'disc', children: [{ text }] });
const _pl = (parts: Array<string | { link: string; to: string }>) => ({
  type: 'p',
  children: parts.map((x) => (typeof x === 'string' ? { text: x } : { type: 'a', url: `wiki://${x.to}`, children: [{ text: x.link }] })),
});

export function buildSeedStore(): WikiStore {
  const now = Date.now();
  const books: WikiBook[] = [
    { id: 'bkseed_guide', title: '위키 사용법', tint: '#3f6058', intro: '이 서재를 쓰는 법 — 한 권으로 끝', updated: now },
    { id: 'bkseed_coffee', title: '커피 노트', tint: '#9a4632', intro: '집에서 내리는 커피의 기록', updated: now },
    { id: 'bkseed_travel', title: '여행', tint: '#33465e', intro: '다녀온 도시들', updated: now },
  ];
  const docs: WikiDoc[] = [
    {
      id: 'wkseed_start', book: 'bkseed_guide', title: '시작하기', parent: null, tags: ['안내'], pinned: true, updated: now,
      body: [
        _p('이 문서가 바로 읽기 화면이에요. 왼쪽의 차례는 제목 블록에서 자동으로 만들어집니다.'),
        _h2('책과 문서'),
        _p('책 한 권이 하나의 세계예요. 책 안에서 문서는 나란히 놓이기도, 문서 아래 층층이 쌓이기도 합니다.'),
        _li('책장에서 책등을 눌러 책을 펼쳐요'),
        _li('문서 오른쪽 위 [편집]을 누르면 노트처럼 적을 수 있어요'),
        _li('사이드바 검색은 서재 전체를 뒤져요'),
        _h2('문서 잇기'),
        _pl(['편집하다가 텍스트를 드래그하면 "문서로 연결" 버블이 떠요. 책을 넘어서도 이어집니다 — 예를 들면 ', { link: '드립 커피', to: 'wkseed_drip' }, ' 처럼요.']),
        _quote('링크를 따라가면 그 문서의 책이 자동으로 펼쳐져요.'),
        _h2('템플릿'),
        _p('편집 화면의 [템플릿] 버튼을 누르면 회의록·독서 메모·문제 해결 같은 틀을 골라 넣을 수 있어요. 자주 쓰는 문서는 "이 문서를 템플릿으로"로 저장해 두세요.'),
      ] as Value,
    },
    {
      id: 'wkseed_drip', book: 'bkseed_coffee', title: '드립 커피', parent: null, tags: ['추출'], pinned: false, updated: now - 3600000,
      body: [
        _pl(['뜨거운 물을 천천히 부어 내리는 방식. 맛의 절반은 ', { link: '원두', to: 'wkseed_bean' }, '가 정합니다.']),
        _h2('순서'),
        _li('물 93도 안팎으로 끓이기'),
        _li('원두 20g을 중간 굵기로 갈기'),
        _li('뜸 30초 — 원두가 부풀어 오르면 성공'),
        _li('세 번에 나눠 320g까지 붓기'),
        _h2('맛이 이상할 때'),
        _h3('시큼할 때'),
        _p('추출이 부족한 신호 — 더 가늘게 갈거나 물을 더 천천히.'),
        _h3('쓸 때'),
        _p('과추출 — 더 굵게 갈거나 물 온도를 낮춰요.'),
      ] as Value,
    },
    {
      id: 'wkseed_bean', book: 'bkseed_coffee', title: '원두', parent: 'wkseed_drip', tags: [], pinned: false, updated: now - 7200000,
      body: [
        _p('볶은 지 1~3주 사이가 가장 맛있어요. 냉동 보관은 결로 때문에 오히려 손해.'),
        _h2('산지 메모'),
        _li('에티오피아 — 꽃향, 홍차 같은 산미'),
        _li('콜롬비아 — 균형, 단맛'),
        _li('브라질 — 고소함, 낮은 산미'),
      ] as Value,
    },
    {
      id: 'wkseed_kyoto', book: 'bkseed_travel', title: '교토', parent: null, tags: ['일본'], pinned: false, updated: now - 86400000,
      body: [
        _p('오래된 골목과 정원의 도시. 아침 일찍 움직일수록 좋다.'),
        _h2('걸었던 코스'),
        _li('철학의 길 — 벚꽃 아침 산책'),
        _li('기요미즈데라 — 해 질 무렵'),
        _li('니시키 시장 — 점심'),
        _h2('기억할 것'),
        _pl(['골목 킷사텐의 드립이 훌륭했다 — 집에서 재현하려고 ', { link: '드립 커피', to: 'wkseed_drip' }, ' 문서를 정리함.']),
        _quote('다음엔 가을 단풍 때.'),
      ] as Value,
    },
  ];
  return { books, docs, recent: ['wkseed_start'] };
}

/**
 * 예시 책 3권 — 이미 쓰고 있는 서재에 '덧붙이는' 용도.
 *
 * 시드(buildSeedStore)는 빈 서재에서 1회만 깔려서, 이미 책이 있는 사람은 영영 못 본다.
 * 이건 언제 눌러도 되도록 id 에 stamp 를 붙여 충돌을 피한다.
 *
 * 세 권은 '몸을 굴리는 하루'라는 한 축으로 서로 얽혀 있다 —
 * 달리기↔잠(회복), 부엌↔달리기(먹을 것), 부엌↔잠(카페인).
 * 책을 넘나드는 링크가 어떻게 하나의 지식망이 되는지 보이는 게 목적.
 */
export function buildExampleBooks(stamp: string = String(Date.now()).slice(-6)): { books: WikiBook[]; docs: WikiDoc[] } {
  const now = Date.now();
  const B = (s: string) => `bkex_${s}_${stamp}`;
  const D = (s: string) => `wkex_${s}_${stamp}`;

  const books: WikiBook[] = [
    { id: B('run'), title: '달리기', tint: '#3f6058', intro: '천천히, 오래 달리기 위한 기록', updated: now },
    { id: B('kit'), title: '부엌', tint: '#9a4632', intro: '자주 해먹는 것들', updated: now - 1000 },
    { id: B('sleep'), title: '잠', tint: '#33465e', intro: '잘 자려고 해본 것들', updated: now - 2000 },
  ];

  const docs: WikiDoc[] = [
    /* ── 달리기 ── */
    {
      id: D('run_start'), book: B('run'), title: '처음 4주', parent: null, tags: ['기본'], pinned: true, updated: now,
      body: [
        _p('숨이 안 찰 만큼 느리게. 이 시기에 빨리 달리면 무릎부터 나간다.'),
        _h2('주차별로'),
        _li('1주 — 걷기 5분 / 달리기 1분 × 6회'),
        _li('2주 — 걷기 4분 / 달리기 2분 × 6회'),
        _li('3주 — 걷기 3분 / 달리기 3분 × 6회'),
        _li('4주 — 걷기 2분 / 달리기 5분 × 5회'),
        _h2('무엇을 먼저 챙기나'),
        _pl(['장비는 하나면 된다 — ', { link: '신발 고르기', to: D('run_shoes') }, '. 나머지는 있는 옷으로 충분하다.']),
        _pl(['달리고 나서 몸이 안 돌아온다면 훈련이 아니라 ', { link: '회복과 잠', to: D('sleep_rec') }, ' 문제일 때가 많다.']),
        _quote('4주를 채우는 게 목표지, 빨라지는 게 목표가 아니다.'),
      ] as Value,
    },
    {
      id: D('run_shoes'), book: B('run'), title: '신발 고르기', parent: D('run_start'), tags: ['장비'], pinned: false, updated: now - 3600000,
      body: [
        _p('발볼과 착지만 맞으면 나머지는 취향이다. 가격은 성능 순서가 아니다.'),
        _h2('매장에서 확인할 것'),
        _li('저녁에 신어볼 것 — 발은 하루 동안 붓는다'),
        _li('엄지 앞에 손가락 하나 만큼 여유'),
        _li('평소 신는 러닝 양말을 신고 갈 것'),
        _h2('바꿀 때'),
        _p('바닥 무늬가 닳아 평평해지면 교체. 보통 600~800km.'),
      ] as Value,
    },
    {
      id: D('run_pace'), book: B('run'), title: '페이스와 심박', parent: null, tags: [], pinned: false, updated: now - 7200000,
      body: [
        _p('속도를 숫자로 보면 욕심이 생긴다. 심박으로 보면 몸이 하는 말이 들린다.'),
        _h2('대화 테스트'),
        _p('옆 사람과 문장을 끊지 않고 말할 수 있으면 맞는 속도. 단어로만 대답하게 되면 너무 빠르다.'),
        _pl(['숫자로 관리하고 싶다면 ', { link: '존2 훈련', to: D('run_z2') }, '을 보라.']),
      ] as Value,
    },
    {
      id: D('run_z2'), book: B('run'), title: '존2 훈련', parent: D('run_pace'), tags: [], pinned: false, updated: now - 8000000,
      body: [
        _p('최대심박의 60~70% 구간. 지루할 만큼 느린 게 정상이다.'),
        _li('최대심박 어림 = 220 − 나이'),
        _li('주 달리기의 8할을 이 구간에'),
        _li('나머지 2할만 빠르게'),
        _quote('느리게 달린 거리가 빠른 날의 밑천이 된다.'),
      ] as Value,
    },
    {
      id: D('run_fuel'), book: B('run'), title: '달리기 전에 먹는 것', parent: null, tags: ['먹기'], pinned: false, updated: now - 9000000,
      body: [
        _p('아침 공복으로 30분까지는 괜찮다. 그 이상이면 뭔가 넣고 나가는 편이 낫다.'),
        _pl(['가볍게 먹을 것 — ', { link: '아침 오트밀', to: D('kit_oat') }, '을 절반만.']),
        _li('출발 60분 전 — 바나나 하나'),
        _li('출발 20분 전 — 물 200ml'),
        _li('피할 것 — 기름진 것, 유제품'),
      ] as Value,
    },

    /* ── 부엌 ── */
    {
      id: D('kit_oat'), book: B('kit'), title: '아침 오트밀', parent: null, tags: ['아침'], pinned: false, updated: now - 10000000,
      body: [
        _p('5분이면 되고 설거지는 냄비 하나. 아침을 거르지 않게 된 결정적인 한 그릇.'),
        _h2('기본'),
        _li('오트 40g + 물이나 우유 200ml'),
        _li('약불 3분, 눌어붙지 않게 저어주기'),
        _li('불 끄고 소금 한 꼬집 — 단맛이 살아난다'),
        _h2('얹는 것'),
        _li('바나나 · 견과 · 계핏가루'),
        _pl(['달리는 날 아침이면 ', { link: '달리기 전에 먹는 것', to: D('run_fuel') }, '을 함께 볼 것.']),
      ] as Value,
    },
    {
      id: D('kit_caf'), book: B('kit'), title: '카페인', parent: null, tags: [], pinned: false, updated: now - 11000000,
      body: [
        _p('끊는 게 아니라 시간을 옮기는 문제였다.'),
        _h2('반감기'),
        _p('보통 5~6시간. 오후 3시의 커피 절반이 밤 9시까지 남아 있다는 뜻이다.'),
        _pl(['몇 시까지가 안전한지는 ', { link: '카페인 끊는 시간', to: D('sleep_caf') }, '에 정리해 두었다.']),
        _h2('대체'),
        _li('오후엔 보리차 · 루이보스'),
        _li('디카페인도 완전히 0은 아니다'),
      ] as Value,
    },
    {
      id: D('kit_shop'), book: B('kit'), title: '장보기 원칙', parent: null, tags: [], pinned: false, updated: now - 12000000,
      body: [
        _p('배고플 때 장을 보면 반은 버리게 된다.'),
        _li('일주일에 한 번, 목록을 적어서'),
        _li('채소는 사흘 치만 — 그 이상은 시든다'),
        _pl([{ link: '냉장고 비우는 주', to: D('kit_empty') }, '를 끼워 넣으면 낭비가 확 준다.']),
      ] as Value,
    },
    {
      id: D('kit_empty'), book: B('kit'), title: '냉장고 비우는 주', parent: D('kit_shop'), tags: [], pinned: false, updated: now - 13000000,
      body: [
        _p('한 달에 한 주는 아무것도 사지 않고 있는 것만 먹는다.'),
        _li('첫날 — 남은 재료를 전부 적기'),
        _li('중간 — 국·볶음밥으로 자투리 소진'),
        _li('끝 — 냉동실 정리, 다음 장보기 목록 자동 완성'),
        _quote('버리는 음식이 줄면 장보기 목록이 저절로 짧아진다.'),
      ] as Value,
    },

    /* ── 잠 ── */
    {
      id: D('sleep_base'), book: B('sleep'), title: '잘 자는 기본', parent: null, tags: ['기본'], pinned: true, updated: now - 14000000,
      body: [
        _p('여러 가지를 해봤지만 결국 남은 건 세 가지였다.'),
        _li('같은 시각에 일어나기 — 자는 시각보다 이게 먼저다'),
        _li('아침에 바깥 빛 보기'),
        _li('자기 전 90분은 화면 밝기 낮추기'),
        _pl(['방을 어떻게 만들지는 ', { link: '빛과 온도', to: D('sleep_light') }, '에.']),
        _pl(['커피를 줄여도 안 되면 ', { link: '카페인 끊는 시간', to: D('sleep_caf') }, '을 다시 볼 것.']),
      ] as Value,
    },
    {
      id: D('sleep_light'), book: B('sleep'), title: '빛과 온도', parent: D('sleep_base'), tags: [], pinned: false, updated: now - 15000000,
      body: [
        _h2('빛'),
        _li('취침 2시간 전부터 천장등 끄고 스탠드만'),
        _li('암막 커튼 — 새벽 빛 한 줄이 생각보다 크다'),
        _h2('온도'),
        _p('18~20도가 대체로 잘 맞았다. 이불은 두껍게, 공기는 서늘하게.'),
      ] as Value,
    },
    {
      id: D('sleep_caf'), book: B('sleep'), title: '카페인 끊는 시간', parent: null, tags: [], pinned: false, updated: now - 16000000,
      body: [
        _p('11시에 잔다면 오후 2시가 마지노선이었다.'),
        _pl(['왜 그런지는 ', { link: '카페인', to: D('kit_caf') }, '의 반감기 부분에.']),
        _li('오전 — 마음껏'),
        _li('12~14시 — 한 잔까지'),
        _li('14시 이후 — 디카페인이나 차'),
      ] as Value,
    },
    {
      id: D('sleep_rec'), book: B('sleep'), title: '회복과 잠', parent: null, tags: [], pinned: false, updated: now - 17000000,
      body: [
        _p('운동은 자극이고, 실제로 좋아지는 건 자는 동안이다.'),
        _pl(['달린 다음 날 다리가 무겁다면 ', { link: '페이스와 심박', to: D('run_pace') }, '을 먼저 의심할 것 — 대개 너무 빨리 달렸다.']),
        _h2('신호'),
        _li('아침 안정심박이 평소보다 5 이상 높으면 쉬는 날로'),
        _li('잠들기까지 오래 걸리면 그날 훈련이 과했다는 뜻'),
        _pl(['가벼운 날의 아침은 ', { link: '아침 오트밀', to: D('kit_oat') }, ' 정도면 충분하다.']),
      ] as Value,
    },
  ];

  return { books, docs };
}

/** 완전 빈 상태 + 시드 안 깔린 적 있으면 예시 서재를 깐다. */
export function seedIfEmpty(store: WikiStore): WikiStore {
  if (store.books.length > 0 || store.docs.length > 0) return store;
  try {
    if (localStorage.getItem(SEED_FLAG)) return store;
    localStorage.setItem(SEED_FLAG, '1');
    const seeded = buildSeedStore();
    saveWiki(seeded);
    return seeded;
  } catch { return store; }
}

/* ── 본문 유틸 ── */

/** 본문에서 wiki:// 링크 대상 문서 id 수집 — 백링크 계산용. */
export function linkedDocIds(body: Value): string[] {
  const out = new Set<string>();
  const walk = (nodes: unknown[]): void => {
    for (const n of nodes) {
      if (!n || typeof n !== 'object') continue;
      const node = n as { type?: string; url?: string; children?: unknown[] };
      if (node.type === 'a' && typeof node.url === 'string' && node.url.startsWith('wiki://')) out.add(node.url.slice(7));
      if (Array.isArray(node.children)) walk(node.children);
    }
  };
  walk(body as unknown[]);
  return [...out];
}

/**
 * 백링크 인용 발췌 — 본문에서 target 문서로 가는 링크 주변 문맥을 { 앞 | 링크 텍스트 | 뒤 }로.
 * 시안의 "…쿠라스에서 마신 한 잔이 [교토] 여행 전체의 향으로…" 하이라이트 재료.
 */
export function backlinkExcerpt(body: Value, targetId: string): { pre: string; mid: string; post: string } | null {
  for (const block of body as Array<{ children?: unknown[] }>) {
    const kids = block.children;
    if (!Array.isArray(kids)) continue;
    for (let i = 0; i < kids.length; i++) {
      const n = kids[i] as { type?: string; url?: string; children?: Array<{ text?: string }> };
      if (n?.type === 'a' && n.url === `wiki://${targetId}`) {
        const textOf = (x: unknown): string => {
          const node = x as { text?: string; children?: Array<{ text?: string }> };
          if (typeof node?.text === 'string') return node.text;
          return (node?.children ?? []).map((c) => c.text ?? '').join('');
        };
        const pre = kids.slice(0, i).map(textOf).join('');
        const post = kids.slice(i + 1).map(textOf).join('');
        return {
          pre: pre.length > 34 ? `…${pre.slice(-34)}` : pre,
          mid: (n.children ?? []).map((c) => c.text ?? '').join('') || '링크',
          post: post.length > 34 ? `${post.slice(0, 34)}…` : post,
        };
      }
    }
  }
  return null;
}

/** 본문 평문 추출 — 미리보기·검색용. */
export function bodyText(body: Value): string {
  const parts: string[] = [];
  const walk = (nodes: unknown[]): void => {
    for (const n of nodes) {
      if (!n || typeof n !== 'object') continue;
      const node = n as { text?: string; children?: unknown[] };
      if (typeof node.text === 'string') parts.push(node.text);
      if (Array.isArray(node.children)) walk(node.children);
    }
  };
  walk(body as unknown[]);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}
