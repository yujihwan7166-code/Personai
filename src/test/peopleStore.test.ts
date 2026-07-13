import { describe, it, expect, beforeEach } from 'vitest';
import { peopleStore } from '@/services/peopleStore';

describe('peopleStore — 카테고리(그룹)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // CRUD 테스트는 깨끗한 상태에서 — 예시 seed 비활성화(플래그 미리 설정).
    window.localStorage.setItem('people.catSeeded.v1', '1');
  });

  it('예시 카테고리 seed — 최초 1회만, 지운 뒤엔 재생성 안 함', () => {
    window.localStorage.removeItem('people.catSeeded.v1');
    const seeded = peopleStore.listCategories();
    expect(seeded.map((c) => c.name)).toEqual(['가족', '직장', '대학동기']);
    // 전부 지워도 다시 안 깔린다
    for (const c of seeded) peopleStore.removeCategory(c.id);
    expect(peopleStore.listCategories()).toEqual([]);
  });

  it('addCategory() — 생성 + 같은 이름(대소문자 무시)은 기존 것 반환', () => {
    const a = peopleStore.addCategory('대학동기');
    expect(a).not.toBeNull();
    expect(peopleStore.listCategories()).toHaveLength(1);

    const dup = peopleStore.addCategory('  대학동기 ');
    expect(dup?.id).toBe(a!.id);
    expect(peopleStore.listCategories()).toHaveLength(1);

    const empty = peopleStore.addCategory('   ');
    expect(empty).toBeNull();
  });

  it('사람은 여러 카테고리에 동시에 편입된다', () => {
    const c1 = peopleStore.addCategory('대학동기')!;
    const c2 = peopleStore.addCategory('등산모임')!;
    const p = peopleStore.addPerson({ name: '김철수', categoryIds: [c1.id, c2.id] });
    expect(p).not.toBeNull();
    const saved = peopleStore.getPerson(p!.id)!;
    expect(saved.categoryIds.sort()).toEqual([c1.id, c2.id].sort());
  });

  it('updatePerson() — 편입 변경', () => {
    const c1 = peopleStore.addCategory('가족')!;
    const p = peopleStore.addPerson({ name: '이영희' })!;
    expect(peopleStore.getPerson(p.id)!.categoryIds).toEqual([]);
    peopleStore.updatePerson(p.id, { categoryIds: [c1.id] });
    expect(peopleStore.getPerson(p.id)!.categoryIds).toEqual([c1.id]);
  });

  it('removeCategory() — 모든 사람에게서 편입 제거 + 되돌리기로 복원', () => {
    const c1 = peopleStore.addCategory('회사')!;
    const c2 = peopleStore.addCategory('동네')!;
    const a = peopleStore.addPerson({ name: '박', categoryIds: [c1.id, c2.id] })!;
    const b = peopleStore.addPerson({ name: '최', categoryIds: [c1.id] })!;

    const removed = peopleStore.removeCategory(c1.id);
    expect(removed).not.toBeUndefined();
    expect(removed!.memberIds.sort()).toEqual([a.id, b.id].sort());
    expect(peopleStore.listCategories().map((c) => c.id)).toEqual([c2.id]);
    // 편입에서 c1 만 빠지고 c2 는 유지
    expect(peopleStore.getPerson(a.id)!.categoryIds).toEqual([c2.id]);
    expect(peopleStore.getPerson(b.id)!.categoryIds).toEqual([]);

    peopleStore.restoreCategory(removed!);
    expect(peopleStore.listCategories().some((c) => c.id === c1.id)).toBe(true);
    expect(peopleStore.getPerson(a.id)!.categoryIds.sort()).toEqual([c1.id, c2.id].sort());
    expect(peopleStore.getPerson(b.id)!.categoryIds).toEqual([c1.id]);
  });

  it('renameCategory() — 이름 변경', () => {
    const c = peopleStore.addCategory('구이름')!;
    peopleStore.renameCategory(c.id, '새이름');
    expect(peopleStore.listCategories()[0].name).toBe('새이름');
  });
});
