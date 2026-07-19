/**
 * 마이위키 v3 트리 — 순수 함수. 무한 parent 트리의 순회·이동·삭제 규칙.
 * 모든 함수는 고아 parent·순환 데이터가 주입돼도 종료한다(방문 집합).
 */
import type { WikiDoc } from './store';

/** 뿌리 색 팔레트 — 뿌리 조상 id 해시로 결정(저장 안 함). */
export const ROOT_PALETTE = ['#8b3d6e', '#31456a', '#2f5d50', '#8a6d3b', '#7a4988', '#a63a50'];

const byId = (docs: WikiDoc[]) => new Map(docs.map((d) => [d.id, d]));

/** 직계 자식 — 핀 우선, 최신 수정순. */
export function childrenOf(docs: WikiDoc[], parentId: string | null): WikiDoc[] {
  const ids = new Set(docs.map((d) => d.id));
  return docs
    .filter((d) => (parentId === null
      ? d.parent === null || !ids.has(d.parent)   // 고아는 최상위로 간주
      : d.parent === parentId))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated);
}

/** 뿌리 → … → 부모 경로 (자신 제외). 순환이면 도는 데까지만. */
export function ancestorsOf(docs: WikiDoc[], id: string): WikiDoc[] {
  const map = byId(docs);
  const seen = new Set<string>([id]);
  const path: WikiDoc[] = [];
  let cur = map.get(id);
  while (cur && cur.parent && !seen.has(cur.parent)) {
    const p = map.get(cur.parent);
    if (!p) break;
    seen.add(p.id);
    path.unshift(p);
    cur = p;
  }
  return path;
}

/** 뿌리 조상 (자신이 최상위면 자신). */
export function rootOf(docs: WikiDoc[], id: string): WikiDoc | null {
  const map = byId(docs);
  const self = map.get(id);
  if (!self) return null;
  const anc = ancestorsOf(docs, id);
  return anc[0] ?? self;
}

/** 모든 자손 id — 순환 방지·삭제용. */
export function descendantIdsOf(docs: WikiDoc[], id: string): Set<string> {
  const out = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const cur = queue.pop()!;
    for (const d of docs) {
      if (d.parent === cur && !out.has(d.id)) { out.add(d.id); queue.push(d.id); }
    }
  }
  return out;
}

export function isDescendant(docs: WikiDoc[], id: string, maybeAncestorId: string): boolean {
  return descendantIdsOf(docs, maybeAncestorId).has(id);
}

/** 상위 문서 select 목록 — 트리 순서 들여쓰기, 자신·자손 제외. */
export function moveOptions(docs: WikiDoc[], id: string): { id: string; title: string; depth: number }[] {
  const banned = descendantIdsOf(docs, id);
  banned.add(id);
  const out: { id: string; title: string; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number, seen: Set<string>) => {
    for (const d of childrenOf(docs, parentId)) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      if (!banned.has(d.id)) out.push({ id: d.id, title: d.title, depth });
      walk(d.id, depth + 1, seen);
    }
  };
  walk(null, 0, new Set());
  return out;
}

/** 삭제 — 자식은 삭제 문서의 부모로 승격(자손 연쇄 삭제 금지). */
export function deleteWithPromotion(docs: WikiDoc[], id: string): WikiDoc[] {
  const target = docs.find((d) => d.id === id);
  if (!target) return docs;
  return docs
    .filter((d) => d.id !== id)
    .map((d) => (d.parent === id ? { ...d, parent: target.parent } : d));
}

/** 포커스 트리 — 항상 부모/형제/자식 3단. activeId 없으면 최상위만. */
export function focusView(docs: WikiDoc[], activeId: string | null): {
  parent: WikiDoc | null; siblings: WikiDoc[]; children: WikiDoc[];
} {
  if (!activeId) return { parent: null, siblings: childrenOf(docs, null), children: [] };
  const map = byId(docs);
  const self = map.get(activeId);
  if (!self) return { parent: null, siblings: childrenOf(docs, null), children: [] };
  const parent = self.parent ? map.get(self.parent) ?? null : null;
  return {
    parent,
    siblings: childrenOf(docs, parent ? parent.id : null),
    children: childrenOf(docs, activeId),
  };
}

/** 뿌리 기반 색 — 뿌리 id 해시. */
export function colorOf(docs: WikiDoc[], id: string): string {
  const root = rootOf(docs, id);
  if (!root) return ROOT_PALETTE[0];
  let h = 7;
  for (let i = 0; i < root.id.length; i++) h = (h * 31 + root.id.charCodeAt(i)) | 0;
  return ROOT_PALETTE[Math.abs(h) % ROOT_PALETTE.length];
}

/** 상징 글자 — 뿌리 제목 첫 글자. */
export function symOf(docs: WikiDoc[], id: string): string {
  const root = rootOf(docs, id);
  return root?.title.trim().charAt(0) || '·';
}
