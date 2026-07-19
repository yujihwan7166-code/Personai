import { describe, it, expect } from 'vitest';
import {
  childrenOf, ancestorsOf, rootOf, descendantIdsOf, isDescendant,
  moveOptions, deleteWithPromotion, focusView,
} from '@/lib/wiki3/tree';
import { migrateV2ToV3, plainToValue, linkedDocIds, bodyText, emptyBody, type WikiDoc } from '@/lib/wiki3/store';

const doc = (id: string, parent: string | null, over: Partial<WikiDoc> = {}): WikiDoc => ({
  id, title: id.toUpperCase(), parent, tags: [], pinned: false, updated: 0, body: emptyBody(), ...over,
});

/* 트리:  r1 ─ a ─ a1 ─ a1x
 *            └ a2
 *        r2 */
const DOCS = [
  doc('r1', null), doc('r2', null),
  doc('a', 'r1'), doc('a1', 'a'), doc('a2', 'a'), doc('a1x', 'a1'),
];

describe('tree 순회', () => {
  it('childrenOf — 직계만, 고아는 최상위 취급', () => {
    expect(childrenOf(DOCS, 'a').map((d) => d.id).sort()).toEqual(['a1', 'a2']);
    const withOrphan = [...DOCS, doc('lost', 'ghost-parent')];
    expect(childrenOf(withOrphan, null).map((d) => d.id)).toContain('lost');
  });
  it('ancestorsOf — 뿌리→부모 순', () => {
    expect(ancestorsOf(DOCS, 'a1x').map((d) => d.id)).toEqual(['r1', 'a', 'a1']);
    expect(ancestorsOf(DOCS, 'r1')).toEqual([]);
  });
  it('rootOf — 깊어도 뿌리, 최상위는 자신', () => {
    expect(rootOf(DOCS, 'a1x')?.id).toBe('r1');
    expect(rootOf(DOCS, 'r2')?.id).toBe('r2');
  });
  it('descendantIds / isDescendant', () => {
    expect([...descendantIdsOf(DOCS, 'a')].sort()).toEqual(['a1', 'a1x', 'a2']);
    expect(isDescendant(DOCS, 'a1x', 'a')).toBe(true);
    expect(isDescendant(DOCS, 'a', 'a1x')).toBe(false);
  });
  it('순환 데이터가 주입돼도 종료한다', () => {
    const cyc = [doc('x', 'y'), doc('y', 'x')];
    expect(() => ancestorsOf(cyc, 'x')).not.toThrow();
    expect(() => moveOptions(cyc, 'x')).not.toThrow();
  });
});

describe('moveOptions / delete / focusView', () => {
  it('moveOptions — 자신·자손 제외, 들여쓰기 깊이 포함', () => {
    const opts = moveOptions(DOCS, 'a');
    expect(opts.map((o) => o.id)).toEqual(expect.arrayContaining(['r1', 'r2']));
    expect(opts.map((o) => o.id)).not.toEqual(expect.arrayContaining(['a', 'a1', 'a2', 'a1x']));
    expect(opts.find((o) => o.id === 'r1')?.depth).toBe(0);
  });
  it('deleteWithPromotion — 자식이 조부모로 승격', () => {
    const after = deleteWithPromotion(DOCS, 'a');
    expect(after.find((d) => d.id === 'a')).toBeUndefined();
    expect(after.find((d) => d.id === 'a1')?.parent).toBe('r1');
    expect(after.find((d) => d.id === 'a2')?.parent).toBe('r1');
    expect(after.find((d) => d.id === 'a1x')?.parent).toBe('a1'); // 손자는 그대로
  });
  it('최상위 삭제 시 자식이 최상위로', () => {
    const after = deleteWithPromotion(DOCS, 'r1');
    expect(after.find((d) => d.id === 'a')?.parent).toBeNull();
  });
  it('focusView — 항상 부모/형제/자식 3단', () => {
    const v = focusView(DOCS, 'a1');
    expect(v.parent?.id).toBe('a');
    expect(v.siblings.map((d) => d.id).sort()).toEqual(['a1', 'a2']);
    expect(v.children.map((d) => d.id)).toEqual(['a1x']);
    const home = focusView(DOCS, null);
    expect(home.siblings.map((d) => d.id).sort()).toEqual(['r1', 'r2']);
  });
});

describe('v2 → v3 마이그레이션', () => {
  const v2 = {
    cats: [{ id: 'c1', name: '영화', sym: '영', color: '#f00' }],
    docs: [
      { id: 'd1', title: '기생충', cat: 'c1', tags: ['영화'], pinned: true, updated: 5, body: '## 감상\n- 좋았다\n> 명대사\n[[아가씨]] 참고' },
      { id: 'd2', title: '아가씨', cat: 'c1', tags: [], pinned: false, updated: 3, body: '박찬욱.' },
    ],
    recent: ['d1'],
  };
  it('분류 → 최상위 문서 승격 + 자식 매핑 + 필드 보존', () => {
    const s = migrateV2ToV3(v2)!;
    const c1 = s.docs.find((d) => d.id === 'c1')!;
    expect(c1.parent).toBeNull();
    expect(c1.title).toBe('영화');
    const d1 = s.docs.find((d) => d.id === 'd1')!;
    expect(d1.parent).toBe('c1');
    expect(d1.pinned).toBe(true);
    expect(d1.tags).toEqual(['영화']);
    expect(s.recent).toEqual(['d1']);
  });
  it('[[제목]] → wiki:// 링크 노드, 줄 문법 → 블록', () => {
    const s = migrateV2ToV3(v2)!;
    const d1 = s.docs.find((d) => d.id === 'd1')!;
    expect(linkedDocIds(d1.body)).toEqual(['d2']);
    const types = (d1.body as Array<{ type?: string }>).map((b) => b.type);
    expect(types).toEqual(['h2', 'p', 'blockquote', 'p']);
    expect(bodyText(d1.body)).toContain('아가씨');
  });
  it('없는 문서 [[링크]]는 평문으로', () => {
    const v = plainToValue('[[유령문서]] 봐', new Map());
    expect(linkedDocIds(v)).toEqual([]);
    expect(bodyText(v)).toBe('유령문서 봐');
  });
  it('깨진 입력이면 null', () => {
    expect(migrateV2ToV3(null)).toBeNull();
    expect(migrateV2ToV3({ docs: 'x' })).toBeNull();
  });
});
