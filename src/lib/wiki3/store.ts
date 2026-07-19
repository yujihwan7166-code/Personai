/**
 * 마이위키 v3 저장소 — localStorage 'mywiki.v3'.
 *
 * v3 = 전면 재구축: 분류 폐지(무한 parent 트리) + 본문이 Plate Value(블록 JSON).
 * 문서 링크는 본문 안의 링크 노드(url = "wiki://<docId>")로 저장 — [[문법]] 없음.
 * v2(분류·플레인 텍스트) 저장분은 1회 자동 마이그레이션:
 *   분류 → 최상위 문서 승격, "## / - / > " 줄 문법 → 블록, [[제목]] → 링크 노드.
 */
import type { Value } from 'platejs';

export interface WikiDoc {
  id: string;
  title: string;
  parent: string | null;   // null = 최상위
  tags: string[];
  pinned: boolean;
  updated: number;
  body: Value;
}

export interface WikiStore {
  docs: WikiDoc[];
  recent: string[];
}

export const WIKI3_KEY = 'mywiki.v3';
const V2_KEY = 'mywiki.v2';
export const WIKI3_CHANGED = 'mywiki3:changed';

export const emptyBody = (): Value => [{ type: 'p', children: [{ text: '' }] }];

/* ── v2 → v3 마이그레이션 ── */

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

/** v2 스냅샷 → v3. 분류는 본문 빈 최상위 문서로 승격(같은 id 재사용). */
export function migrateV2ToV3(raw: unknown): WikiStore | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as { docs?: V2Doc[]; cats?: V2Cat[]; recent?: string[] };
  if (!Array.isArray(d.docs) || !Array.isArray(d.cats)) return null;
  const titleToId = new Map<string, string>();
  for (const doc of d.docs) if (doc?.title && doc.id) titleToId.set(doc.title.trim(), doc.id);
  const catIds = new Set(d.cats.map((c) => c.id));
  const now = Date.now();
  const roots: WikiDoc[] = d.cats.filter((c) => c && c.id && c.name).map((c) => ({
    id: c.id, title: c.name, parent: null, tags: [], pinned: false, updated: now, body: emptyBody(),
  }));
  const children: WikiDoc[] = d.docs.filter((x) => x && x.id && x.title).map((x) => ({
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

/* ── load / save ── */

function normalizeDoc(raw: unknown): WikiDoc | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id || typeof r.title !== 'string') return null;
  return {
    id: r.id,
    title: r.title,
    parent: typeof r.parent === 'string' ? r.parent : null,
    tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string') : [],
    pinned: r.pinned === true,
    updated: typeof r.updated === 'number' ? r.updated : Date.now(),
    body: Array.isArray(r.body) && r.body.length ? (r.body as Value) : emptyBody(),
  };
}

export function loadWiki(): WikiStore {
  try {
    const raw = localStorage.getItem(WIKI3_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Record<string, unknown>;
      const docs = Array.isArray(d.docs) ? d.docs.map(normalizeDoc).filter((x): x is WikiDoc => !!x) : [];
      return { docs, recent: Array.isArray(d.recent) ? (d.recent as string[]).filter((r) => typeof r === 'string') : [] };
    }
    // v2 → v3 1회 자동 이관
    const v2 = localStorage.getItem(V2_KEY);
    if (v2) {
      const migrated = migrateV2ToV3(JSON.parse(v2));
      if (migrated) { saveWiki(migrated); return migrated; }
    }
  } catch { /* 손상 저장분 → 빈 위키 */ }
  return { docs: [], recent: [] };
}

export function saveWiki(store: WikiStore): void {
  try {
    localStorage.setItem(WIKI3_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(WIKI3_CHANGED));
  } catch { /* quota — 무시 */ }
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
