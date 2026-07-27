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

/**
 * 인포박스 — 위키 문서 옆에 서는 요약 상자(사진 + 항목/값).
 *
 * 있는 문서에만 있다. 인물·장소·제품처럼 '같은 항목을 매번 묻게 되는' 글에는
 * 값어치가 크지만, 하루 일기 같은 글에 붙으면 빈 칸만 남는다.
 *
 * 항목을 미리 정해 주지 않는 이유 — 문서마다 물어야 할 것이 다르다.
 * 약에는 '분류·용량·주의', 사람에는 '생일·연락처'. 정해 주면 안 맞는 문서에서
 * 억지로 채우거나 빈 줄을 지우는 일이 생긴다.
 */
export interface WikiInfobox {
  /** 압축된 Base64 (infoboxPhoto.ts). 없으면 사진 칸 자체가 없다. */
  photo?: string;
  rows: { k: string; v: string }[];
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
  /** 없으면 인포박스 없음. 빈 상자는 두지 않는다 — 지우면 undefined 로 돌린다. */
  infobox?: WikiInfobox;
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

/**
 * 저장. 자리가 모자라면 false.
 *
 * 예전엔 quota 예외를 조용히 삼켰다. 글만 담을 땐 넘칠 일이 거의 없어 넘어갔지만,
 * 인포박스 사진이 들어오면서 얘기가 달라졌다 — 넘친 줄 모르고 계속 쓰다가 방을
 * 나가면 그동안 쓴 게 통째로 없다. 부르는 쪽이 알 수 있게 돌려준다.
 */
export function saveWiki(store: WikiStore): boolean {
  try {
    localStorage.setItem(WIKI4_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(WIKI3_CHANGED));
    return true;
  } catch {
    return false;
  }
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

/**
 * 「약물」 한 권 — 차례가 깊고 긴 책이 어떻게 보이는지 시험하기 위한 예시.
 *
 * 문서 33개 · 4단 깊이. 총론의 '약동학'은 일부러 아주 긴 본문으로 두었다
 * (제목이 여럿이라 문서 안 목차와 스크롤 거동을 함께 볼 수 있다).
 *
 * 내용은 교과서 수준의 공부 노트다 — 진료·복약 판단의 근거로 쓰라고 만든 게 아니다.
 * 첫 문서에 그 사실을 적어 둔다.
 */
export function buildDrugBook(stamp: string = String(Date.now()).slice(-6)): { books: WikiBook[]; docs: WikiDoc[] } {
  const now = Date.now();
  const B = `bkdrug_${stamp}`;
  const D = (s: string) => `wkdrug_${s}_${stamp}`;
  let t = now;
  const doc = (id: string, title: string, parent: string | null, body: unknown[], tags: string[] = [], pinned = false, infobox?: WikiInfobox): WikiDoc => {
    t -= 60000;
    return { id, book: B, title, parent, tags, pinned, updated: t, body: body as Value, infobox };
  };
  /** 인포박스 한 상자 — 사진 없이 항목만. 계열 문서엔 매번 같은 것을 묻게 된다. */
  const ib = (...rows: [string, string][]): WikiInfobox => ({ rows: rows.map(([k, v]) => ({ k, v })) });

  const books: WikiBook[] = [
    { id: B, title: '약물', tint: '#33465e', intro: '계통별로 정리하는 공부 노트', updated: now },
  ];

  const docs: WikiDoc[] = [
    /* ── 1 총론 ── */
    doc(D('basics'), '총론', null, [
      _p('약이 몸에서 어떻게 움직이고(약동학), 몸에 무엇을 하는지(약력학). 계통별 각론은 이 둘의 응용이다.'),
      _quote('이 책은 공부 노트다. 실제 복약·처방 판단은 최신 허가사항과 지침을 따른다.'),
      _pl(['몸이 약에게 하는 일 → ', { link: '약동학', to: D('pk') }]),
      _pl(['약이 몸에게 하는 일 → ', { link: '약력학', to: D('pd') }]),
      _pl(['좁은 안전역을 다루는 법 → ', { link: '치료역과 TDM', to: D('tdm') }]),
    ], ['총론'], true),

    doc(D('pk'), '약동학', D('basics'), [
      _p('흡수·분포·대사·배설(ADME). 용량을 정하고 간격을 정하는 근거가 전부 여기서 나온다.'),
      _h2('흡수'),
      _p('경구약은 위장관을 지나 간을 한 번 거친 뒤에야 전신 순환에 닿는다. 이 과정에서 깎이는 몫이 초회통과효과다.'),
      _li('생체이용률(F) — 정맥 투여를 1로 놓고 견준 값'),
      _li('음식은 흡수 속도와 양을 모두 바꾼다 — 어떤 약은 같이, 어떤 약은 공복에'),
      _li('제형이 흡수를 지배한다 — 서방정을 쪼개면 하루치가 한 번에 들어간다'),
      _pl(['자세히 → ', { link: '흡수', to: D('absorb') }]),
      _h2('분포'),
      _p('혈류를 타고 조직으로 퍼진다. 지용성이 높을수록 넓게 퍼지고, 단백결합이 높을수록 혈중에 묶여 있다.'),
      _li('분포용적(Vd) — 겉보기 부피. 크면 조직에 많이 가 있다는 뜻'),
      _li('알부민이 낮으면 유리형이 늘어 같은 용량도 세게 작용한다'),
      _pl(['자세히 → ', { link: '분포', to: D('dist') }]),
      _h2('대사'),
      _p('대개 간에서 수용성으로 바꿔 내보내기 좋게 만든다. 1상(산화·환원·가수분해) 뒤 2상(포합).'),
      _li('1상의 주역이 CYP450 — 상호작용의 대부분이 여기서 난다'),
      _li('전구약물은 대사되어야 비로소 듣는다 — 대사가 막히면 효과가 사라진다'),
      _pl(['효소 이야기 → ', { link: 'CYP450', to: D('cyp') }]),
      _h2('배설'),
      _p('주로 신장. 사구체 여과 + 세뇨관 분비 − 재흡수.'),
      _li('신기능이 떨어지면 신배설 약은 쌓인다 — 용량·간격 조정'),
      _li('반감기 — 혈중 농도가 절반이 되는 시간. 4~5 반감기면 정상상태에 든다'),
      _pl(['자세히 → ', { link: '배설', to: D('elim') }]),
      _h2('반복 투여'),
      _p('한 번 주고 끝이 아니라 쌓였다 빠지기를 되풀이한다. 간격이 반감기보다 짧으면 쌓이고, 길면 골짜기가 깊어진다.'),
      _li('부하용량 — 정상상태까지 기다릴 수 없을 때 첫 회를 크게'),
      _li('유지용량 — 빠져나가는 만큼만 채운다'),
      _quote('용량은 세기를 정하고, 간격은 흔들림을 정한다.'),
    ], ['ADME']),

    doc(D('absorb'), '흡수', D('pk'), [
      _p('경구 흡수를 좌우하는 것: 용해도 · 막 투과성 · 위 배출 속도 · 초회통과.'),
      _h2('음식과 함께'),
      _li('지용성 약은 식후가 유리'),
      _li('제산제·칼슘·철분은 여러 약의 흡수를 막는다 — 시간 간격을 둔다'),
      _h2('제형'),
      _li('서방·장용정은 쪼개거나 씹지 않는다'),
      _li('설하·경피는 초회통과를 피해 간다'),
    ]),
    doc(D('dist'), '분포', D('pk'), [
      _p('조직으로 퍼지는 정도. 혈류량 · 지용성 · 단백결합 · 장벽이 정한다.'),
      _li('뇌로 가려면 혈뇌장벽을 넘어야 한다 — 지용성이 관건'),
      _li('임신·수유 시 태반·모유 이행 여부가 따로 문제된다'),
    ]),
    doc(D('cyp'), 'CYP450', D('pk'), [
      _p('간 미세소체 효소군. 유도되면 대사가 빨라져 약이 약해지고, 억제되면 느려져 약이 세진다.'),
      _h2('자주 걸리는 짝'),
      _li('억제 — 마크로라이드계 일부, 아졸계 항진균제, 자몽주스'),
      _li('유도 — 리팜핀, 카바마제핀, 세인트존스워트'),
      _pl(['상호작용 정리 → ', { link: '상호작용', to: D('interact') }]),
      _quote('전구약물은 반대로 움직인다 — 억제하면 오히려 안 듣는다.'),
    ], ['상호작용']),
    doc(D('elim'), '배설', D('pk'), [
      _p('신장이 주 경로. 담즙으로 나가 장간순환을 도는 약도 있다.'),
      _li('신기능 지표에 따라 용량을 조정하는 약이 많다'),
      _li('소변 pH를 바꾸면 이온화가 변해 재흡수가 달라진다'),
    ]),

    doc(D('pd'), '약력학', D('basics'), [
      _p('약이 표적에 붙어 일으키는 변화. 얼마나 잘 붙나(친화도)와 붙어서 무엇을 하나(내인활성)로 갈린다.'),
      _h2('작용 방식'),
      _li('작용제 — 붙어서 신호를 켠다'),
      _li('길항제 — 붙되 켜지 않고 자리를 막는다'),
      _li('부분작용제 — 최대보다 낮은 높이까지만 켠다'),
      _pl(['곡선으로 보기 → ', { link: '용량-반응', to: D('dose') }]),
      _h2('내성과 의존'),
      _li('수용체 하향조절 — 오래 쓰면 같은 용량이 덜 듣는다'),
      _li('갑작스러운 중단이 반동을 부르는 약들이 있다'),
    ]),
    doc(D('dose'), '용량-반응', D('pd'), [
      _p('가로축을 로그 용량으로 두면 S자 곡선이 된다.'),
      _li('EC50 — 최대효과의 절반을 내는 농도. 낮을수록 역가가 높다'),
      _li('Emax — 아무리 올려도 넘지 못하는 천장'),
      _li('치료지수 — 독성용량과 유효용량의 거리'),
    ]),
    doc(D('tdm'), '치료역과 TDM', D('basics'), [
      _p('유효농도와 독성농도가 가까운 약은 혈중농도를 직접 잰다.'),
      _li('디곡신 · 리튬 · 페니토인 · 반코마이신 · 아미노글리코사이드'),
      _li('언제 재느냐가 값만큼 중요하다 — 최저점(trough)인지 최고점인지'),
      _quote('농도는 참고값이지 판단 그 자체가 아니다. 환자의 상태가 먼저다.'),
    ]),

    /* ── 2 순환기 ── */
    doc(D('cv'), '순환기', null, [
      _p('혈압·지질·혈전 — 오래 먹는 약이 많아 순응도와 부작용 관리가 효과만큼 중요하다.'),
      _pl([{ link: '고혈압', to: D('htn') }, ' · ', { link: '이상지질혈증', to: D('lipid') }, ' · ', { link: '항혈전', to: D('anticoag') }]),
    ]),
    doc(D('htn'), '고혈압', D('cv'), [
      _p('대부분 평생 복용한다. 한 가지로 안 되면 기전이 다른 약을 더한다.'),
      _h2('계열'),
      _pl([{ link: 'ACE 억제제', to: D('acei') }, ' / ', { link: 'ARB', to: D('arb') }, ' / ', { link: '칼슘채널차단제', to: D('ccb') }, ' / ', { link: '이뇨제', to: D('diuretic') }, ' / ', { link: '베타차단제', to: D('bb') }]),
      _h2('복약 안내에서 자주 나오는 것'),
      _li('아침에 어지럽다 — 기립성 저혈압. 천천히 일어나기'),
      _li('한두 번 걸렀다고 두 배로 먹지 않는다'),
    ], ['만성질환']),
    doc(D('acei'), 'ACE 억제제', D('htn'), [
      _p('안지오텐신 II 생성을 막는다. -프릴로 끝나는 이름들.'),
      _li('마른기침이 흔하다 — 브라디키닌이 쌓여서'),
      _li('고칼륨혈증 · 신기능 확인'),
      _pl(['기침 때문에 못 쓰면 → ', { link: 'ARB', to: D('arb') }]),
      _quote('임신 중 금기.'),
    ], [], false, ib(
      ['계열', '안지오텐신 전환효소 억제제'],
      ['이름 끝', '-프릴 (프릴계)'],
      ['주 용도', '고혈압 · 심부전 · 당뇨병성 신증'],
      ['흔한 부작용', '마른기침 · 어지럼'],
      ['확인할 수치', '혈압 · 칼륨 · 신기능'],
      ['금기', '임신 · 양측 신동맥 협착'],
    )),
    doc(D('arb'), 'ARB', D('htn'), [
      _p('수용체 쪽을 막는다. -사르탄으로 끝난다.'),
      _li('기침이 거의 없다'),
      _li('나머지 주의점은 ACE 억제제와 비슷하다'),
    ]),
    doc(D('ccb'), '칼슘채널차단제', D('htn'), [
      _p('혈관을 넓히는 계열(-디핀)과 심장을 누르는 계열로 갈린다.'),
      _li('발목 부종 · 안면홍조 · 두통'),
      _li('자몽주스가 농도를 올린다'),
      _pl(['왜 그런지 → ', { link: 'CYP450', to: D('cyp') }]),
    ]),
    doc(D('diuretic'), '이뇨제', D('htn'), [
      _p('몸의 물과 소금을 덜어 압을 낮춘다.'),
      _li('티아지드 — 저칼륨 · 요산 상승'),
      _li('루프 — 강력, 심부전 부종에'),
      _li('칼륨보존 — 반대로 고칼륨 주의'),
      _li('저녁 늦게 먹으면 밤에 깬다 — 아침 복용'),
    ]),
    doc(D('bb'), '베타차단제', D('htn'), [
      _p('심박수와 심근 수축력을 낮춘다. -올롤로 끝난다.'),
      _li('갑자기 끊으면 반동성 빈맥·협심증'),
      _li('저혈당 증상을 가려 당뇨 환자에서 주의'),
    ]),
    doc(D('lipid'), '이상지질혈증', D('cv'), [
      _p('LDL을 낮추는 것이 중심. 식사·운동과 함께 간다.'),
      _pl(['1차 선택 → ', { link: '스타틴', to: D('statin') }]),
    ]),
    doc(D('statin'), '스타틴', D('lipid'), [
      _p('HMG-CoA 환원효소를 막아 간의 콜레스테롤 합성을 줄인다.'),
      _li('근육통 — 흔한 중단 사유. 심하면 횡문근융해'),
      _li('간효소 상승'),
      _li('일부는 자몽주스와 겹치면 농도가 오른다'),
    ], [], false, ib(
      ['계열', 'HMG-CoA 환원효소 억제제'],
      ['이름 끝', '-스타틴'],
      ['주 용도', 'LDL 낮추기 · 심혈관 예방'],
      ['먹는 때', '대개 저녁 (합성이 밤에 는다)'],
      ['흔한 부작용', '근육통 · 간효소 상승'],
      ['같이 조심', '자몽주스 · 일부 항진균제'],
    )),
    doc(D('anticoag'), '항혈전', D('cv'), [
      _p('피떡을 막는다. 출혈이 늘 짝으로 따라온다.'),
      _pl([{ link: '항혈소판제', to: D('antiplt') }, ' · ', { link: '항응고제', to: D('warfarin') }]),
    ]),
    doc(D('antiplt'), '항혈소판제', D('anticoag'), [
      _p('혈소판이 뭉치는 걸 막는다. 아스피린 저용량, 클로피도그렐 등.'),
      _li('멍·잇몸출혈이 늘면 알린다'),
      _li('시술·발치 전 중단 여부는 처방의와 상의'),
    ]),
    doc(D('warfarin'), '항응고제', D('anticoag'), [
      _p('와파린은 비타민 K 의존 응고인자를 막는다. INR로 조절한다.'),
      _li('비타민 K가 많은 음식을 갑자기 늘리거나 줄이지 않는다 — 일정하게'),
      _li('상호작용이 매우 많다 — 새 약을 더할 때마다 확인'),
      _pl(['효소 쪽 배경 → ', { link: 'CYP450', to: D('cyp') }]),
    ], ['주의']),

    /* ── 3 감염 ── */
    doc(D('inf'), '감염', null, [
      _p('원인균을 좁혀 고르는 것이 원칙. 넓게 쓸수록 내성이 는다.'),
      _pl([{ link: '항생제 고르기', to: D('abx') }, ' · ', { link: '항바이러스', to: D('antiviral') }]),
    ]),
    doc(D('abx'), '항생제 고르기', D('inf'), [
      _p('부위 · 추정 균 · 환자 상태(신기능·알레르기·임신)로 좁힌다.'),
      _pl([{ link: '베타락탐', to: D('betalactam') }, ' / ', { link: '마크로라이드', to: D('macrolide') }, ' / ', { link: '퀴놀론', to: D('quinolone') }]),
      _quote('증상이 나아도 처방 기간을 채운다 — 이건 복약지도의 단골이다.'),
      _pl(['복약지도 쪽 → ', { link: '복약 순응도', to: D('adherence') }]),
    ], ['항생제']),
    doc(D('betalactam'), '베타락탐', D('abx'), [
      _p('세포벽 합성을 막는다. 페니실린 · 세팔로스포린 계열.'),
      _li('발진·아나필락시스 — 알레르기 병력 확인이 먼저'),
      _li('설사가 흔하다'),
    ]),
    doc(D('macrolide'), '마크로라이드', D('abx'), [
      _p('단백 합성을 막는다. 페니실린 알레르기의 대안이 되기도.'),
      _li('위장장애'),
      _li('QT 연장 · CYP 억제로 상호작용'),
    ]),
    doc(D('quinolone'), '퀴놀론', D('abx'), [
      _p('DNA 자이레이스를 막는다. 조직 침투가 좋다.'),
      _li('제산제·철분·칼슘과 같이 먹으면 흡수가 크게 준다 — 시간 간격'),
      _li('건염·건파열, 광과민'),
    ]),
    doc(D('antiviral'), '항바이러스', D('inf'), [
      _p('증식 단계를 막는다. 대개 이르게 시작할수록 이득이 크다.'),
      _li('신기능에 따라 용량 조정하는 약이 많다'),
    ]),

    /* ── 4 통증과 염증 ── */
    doc(D('pain'), '통증과 염증', null, [
      _p('가장 흔히 팔리고 가장 자주 잘못 쓰이는 자리.'),
      _pl([{ link: 'NSAIDs', to: D('nsaid') }, ' · ', { link: '아세트아미노펜', to: D('apap') }, ' · ', { link: '오피오이드', to: D('opioid') }]),
    ]),
    doc(D('nsaid'), 'NSAIDs', D('pain'), [
      _p('COX를 막아 프로스타글란딘을 줄인다. 진통·해열·항염.'),
      _li('위장관 손상 — 식후 복용, 위험군은 위보호제 병용'),
      _li('신기능 저하 · 혈압 상승 · 부종'),
      _li('여러 제품에 중복으로 들어 있다 — 종합감기약과 겹치기 쉽다'),
      _pl(['겹침 확인 → ', { link: '상호작용', to: D('interact') }]),
    ], ['OTC']),
    doc(D('apap'), '아세트아미노펜', D('pain'), [
      _p('해열·진통. 항염 작용은 거의 없다.'),
      _li('하루 최대 용량을 넘지 않는다 — 간독성'),
      _li('여러 복합제에 숨어 있어 합산이 문제된다'),
      _li('음주와 겹치면 위험이 커진다'),
    ], ['OTC']),
    doc(D('opioid'), '오피오이드', D('pain'), [
      _p('중추 오피오이드 수용체에 작용한다. 강한 통증에.'),
      _li('변비는 내성이 안 생긴다 — 처음부터 같이 관리'),
      _li('졸음·호흡억제 · 운전 주의'),
    ], ['주의']),

    /* ── 5 소화기 ── */
    doc(D('gi'), '소화기', null, [
      _p('위산 · 장운동 · 간담도.'),
      _pl([{ link: '위산 억제', to: D('ppi') }]),
    ]),
    doc(D('ppi'), '위산 억제', D('gi'), [
      _p('PPI는 양성자펌프를 비가역적으로 막는다. H2 차단제보다 강하고 오래간다.'),
      _li('식전 30~60분 복용이 원칙'),
      _li('장기 복용 시 흡수 저하(B12·철·칼슘·마그네슘) 고려'),
      _pl(['NSAIDs 와 함께 쓰는 이유 → ', { link: 'NSAIDs', to: D('nsaid') }]),
    ]),

    /* ── 6 내분비 ── */
    doc(D('endo'), '내분비', null, [
      _p('당뇨 · 갑상선 · 골대사.'),
      _pl([{ link: '당뇨약', to: D('dm') }]),
    ]),
    doc(D('dm'), '당뇨약', D('endo'), [
      _p('기전이 다른 계열을 겹쳐 쓴다. 저혈당 위험이 계열마다 다르다.'),
      _pl(['1차 선택 → ', { link: '메트포르민', to: D('metformin') }]),
      _li('설포닐우레아 — 저혈당 위험이 크다'),
      _li('SGLT2 억제제 — 요로·생식기 감염, 탈수 주의'),
    ]),
    doc(D('metformin'), '메트포르민', D('dm'), [
      _p('간의 포도당 생성을 줄인다. 단독으로는 저혈당을 잘 일으키지 않는다.'),
      _li('위장장애 — 서서히 증량, 식후 복용'),
      _li('신기능에 따라 제한. 조영제 검사 전후 중단 여부 확인'),
      _li('오래 쓰면 B12 결핍'),
    ], [], false, ib(
      ['계열', '비구아나이드'],
      ['주 용도', '2형 당뇨 1차 선택'],
      ['먹는 때', '식후 — 서서히 증량'],
      ['저혈당', '단독으로는 드묾'],
      ['흔한 부작용', '위장장애 · 오래 쓰면 B12 결핍'],
      ['확인할 수치', '신기능 · B12'],
    )),

    /* ── 7 복약지도 ── */
    doc(D('counsel'), '복약지도', null, [
      _p('약을 아는 것과 전하는 것은 다른 일이다. 환자가 실제로 하게 되는 말로 바꿔야 한다.'),
      _pl([{ link: '상호작용', to: D('interact') }, ' · ', { link: '흔한 부작용 대응', to: D('adr') }, ' · ', { link: '복약 순응도', to: D('adherence') }]),
    ], [], true),
    doc(D('interact'), '상호작용', D('counsel'), [
      _p('약-약뿐 아니라 약-음식, 약-건강기능식품도 본다.'),
      _h2('자주 걸리는 것'),
      _li('자몽주스 — 일부 CCB·스타틴 농도 상승'),
      _li('제산제·철분·칼슘 — 퀴놀론·테트라사이클린 흡수 저하'),
      _li('세인트존스워트 — 여러 약을 약하게 만든다'),
      _li('같은 성분이 복합제에 중복 — 아세트아미노펜이 대표'),
      _pl(['효소 배경 → ', { link: 'CYP450', to: D('cyp') }]),
    ], ['상호작용']),
    doc(D('adr'), '흔한 부작용 대응', D('counsel'), [
      _p('“그럴 수 있다”와 “바로 알리세요”를 나눠 말한다.'),
      _li('지켜봐도 되는 것 — 초기 위장장애, 가벼운 졸음'),
      _li('바로 알릴 것 — 발진·호흡곤란, 검은 변, 심한 근육통, 소변량 감소'),
    ]),
    doc(D('adherence'), '복약 순응도', D('counsel'), [
      _p('안 먹으면 어떤 약도 듣지 않는다. 못 먹는 이유를 먼저 찾는다.'),
      _li('횟수를 줄인다 — 복합제·서방형'),
      _li('생활의 고정점에 붙인다 — 양치·식사'),
      _li('부작용이 무서워 끊는 경우가 많다 — 미리 설명해 두기'),
      _quote('“하루 세 번”보다 “아침 먹고, 점심 먹고, 자기 전”이 지켜진다.'),
    ]),
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
