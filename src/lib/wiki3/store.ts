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
import { buildStarterLibrary } from './starterLibrary';

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

/* ── 처음 여는 서재 ──
 * 빈 서재는 이 방이 무엇을 하는 방인지 알려주지 못한다. 다섯 권을 미리 꽂아 둔다.
 * 내용은 starterLibrary.ts 에 있다 — 여기 두면 저장소 파일이 책 원고에 파묻힌다.
 * 1회만 (flag) — 다 지워도 다시 안 깔린다. */

const SEED_FLAG = 'mywiki.v4.seeded';

/** 다섯 권을 담은 새 서재 한 벌. */
export function buildStarterStore(): WikiStore {
  const { books, docs } = buildStarterLibrary();
  return { books, docs, recent: [] };
}

/** 완전 빈 상태 + 시드 안 깔린 적 있으면 처음 여는 서재를 깐다. */
export function seedIfEmpty(store: WikiStore): WikiStore {
  if (store.books.length > 0 || store.docs.length > 0) return store;
  try {
    if (localStorage.getItem(SEED_FLAG)) return store;
    localStorage.setItem(SEED_FLAG, '1');
    const seeded = buildStarterStore();
    saveWiki(seeded);
    return seeded;
  } catch { return store; }
}

/**
 * 서재를 통째로 갈아 끼운다 — 지금 있는 책·문서를 다 버리고 처음 상태로.
 * 되돌릴 수 없으므로 부르는 쪽에서 반드시 한 번 묻는다.
 */
export function resetToStarter(): WikiStore {
  const fresh = buildStarterStore();
  saveWiki(fresh);
  return fresh;
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
