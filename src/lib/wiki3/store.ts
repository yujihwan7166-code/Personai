/**
 * 마이위키 v4 저장소 — localStorage 'mywiki.v4'.
 *
 * v4 = "서재와 책들": 책(표지 있는 컨테이너) 여러 권 + 책 안의 무한 parent 트리.
 *  - 링크는 본문 링크 노드(url = "wiki://<docId>") — 책 경계 없이 어디로든 (서재 = 한 지식망)
 *  - 문서에 선택적 인포박스(요약 카드) — 위키식 읽기 뷰의 재료
 * v3(책 없는 트리)는 1회 자동 이관: 최상위 문서마다 책 한 권을 만들어 그 아래로.
 * v2(분류·플레인 텍스트)는 v3 규칙으로 이관 후 다시 v4 로.
 */
import type { Value } from 'platejs';

/** 책 표지 팔레트 — 서가에서 등이 구분되는 깊은 색들. */
export const BOOK_PALETTE = ['#8b3d6e', '#31456a', '#2f5d50', '#8a6d3b', '#7a4988', '#a63a50'];

export interface WikiBook {
  id: string;
  title: string;
  tint: string;      // 책등·표지 색 (BOOK_PALETTE 중 하나가 기본)
  intro: string;     // 한 줄 소개 — 표지 부제
  updated: number;
}

export interface InfoboxRow { label: string; value: string }

export interface WikiDoc {
  id: string;
  book: string;            // 소속 책 id
  title: string;
  parent: string | null;   // null = 책의 최상위
  tags: string[];
  pinned: boolean;
  updated: number;
  body: Value;
  /** 위키식 요약 카드 — 행이 있어야 읽기 뷰에 나타난다. */
  infobox?: InfoboxRow[];
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
  const infobox = Array.isArray(r.infobox)
    ? (r.infobox as unknown[])
        .map((row) => {
          if (!row || typeof row !== 'object') return null;
          const x = row as Record<string, unknown>;
          return typeof x.label === 'string' && typeof x.value === 'string' ? { label: x.label, value: x.value } : null;
        })
        .filter((x): x is InfoboxRow => !!x)
    : undefined;
  return {
    id: r.id,
    book: typeof r.book === 'string' ? r.book : '',
    title: r.title,
    parent: typeof r.parent === 'string' ? r.parent : null,
    tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string') : [],
    pinned: r.pinned === true,
    updated: typeof r.updated === 'number' ? r.updated : Date.now(),
    body: Array.isArray(r.body) && r.body.length ? (r.body as Value) : emptyBody(),
    infobox: infobox && infobox.length ? infobox : undefined,
  };
}

function normalizeV3Doc(raw: unknown): V3Doc | null {
  const d = normalizeDoc(raw);
  if (!d) return null;
  const { book: _book, infobox: _ib, ...rest } = d;
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
    { id: 'bkseed_guide', title: '위키 사용법', tint: '#8b3d6e', intro: '이 서재를 쓰는 법 — 한 권으로 끝', updated: now },
    { id: 'bkseed_coffee', title: '커피 노트', tint: '#8a6d3b', intro: '집에서 내리는 커피의 기록', updated: now },
    { id: 'bkseed_travel', title: '여행', tint: '#31456a', intro: '다녀온 도시들', updated: now },
  ];
  const docs: WikiDoc[] = [
    {
      id: 'wkseed_start', book: 'bkseed_guide', title: '시작하기', parent: null, tags: ['안내'], pinned: true, updated: now,
      infobox: [
        { label: '무엇', value: '책 속에 문서를 쌓는 나만의 위키' },
        { label: '쓰기', value: '노트처럼 — "/" 로 뭐든 삽입' },
        { label: '읽기', value: '위키처럼 — 목차·인포박스·백링크' },
      ],
      body: [
        _p('이 문서가 바로 읽기 화면이에요. 오른쪽 요약 카드가 인포박스, 위의 차례가 자동 목차입니다.'),
        _h2('책과 문서'),
        _p('책 한 권이 하나의 세계예요. 책 안에서 문서는 나란히 놓이기도, 문서 아래 층층이 쌓이기도 합니다.'),
        _li('책장에서 책등을 눌러 책을 펼쳐요'),
        _li('문서 오른쪽 위 [편집]을 누르면 노트처럼 적을 수 있어요'),
        _li('사이드바 검색은 서재 전체를 뒤져요'),
        _h2('문서 잇기'),
        _pl(['편집하다가 텍스트를 드래그하면 "문서로 연결" 버블이 떠요. 책을 넘어서도 이어집니다 — 예를 들면 ', { link: '드립 커피', to: 'wkseed_drip' }, ' 처럼요.']),
        _quote('링크를 따라가면 그 문서의 책이 자동으로 펼쳐져요.'),
        _h2('인포박스'),
        _p('편집 화면의 "인포박스"를 펴고 항목·내용을 채우면, 읽기 화면 오른쪽에 요약 카드가 생겨요. 이 문서의 카드처럼요.'),
      ] as Value,
    },
    {
      id: 'wkseed_drip', book: 'bkseed_coffee', title: '드립 커피', parent: null, tags: ['추출'], pinned: false, updated: now - 3600000,
      infobox: [
        { label: '분류', value: '푸어 오버 추출' },
        { label: '도구', value: '드리퍼 · 서버 · 주전자' },
        { label: '시간', value: '2분 30초 안팎' },
        { label: '비율', value: '원두 1 : 물 16' },
      ],
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
      infobox: [
        { label: '보관', value: '밀폐 · 실온 · 2주 안에' },
        { label: '단골', value: '에티오피아 예가체프' },
      ],
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
      infobox: [
        { label: '나라', value: '일본' },
        { label: '다녀옴', value: '2026년 봄' },
        { label: '며칠', value: '3박 4일' },
      ],
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
