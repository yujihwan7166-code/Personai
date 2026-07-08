import { describe, it, expect, beforeEach } from 'vitest';
import { careerStore } from '@/services/careerStore';
import { FALLBACK_CATEGORY } from '@/types/career';

describe('careerStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('초기 상태는 비어 있다', () => {
    expect(careerStore.listItems()).toEqual([]);
    expect(careerStore.listCategories()).toEqual([]);
  });

  it('addItem() — 항목 생성 + 카테고리 자동 생성', () => {
    const item = careerStore.addItem({ raw: '정처기 땄음', refined: '정보처리기사 취득', categoryName: '자격증' });
    expect(item.id).toMatch(/^sp_/);
    expect(item.raw).toBe('정처기 땄음');
    expect(item.refined).toBe('정보처리기사 취득');
    expect(item.date).toBe(new Date().toISOString().slice(0, 10));

    const categories = careerStore.listCategories();
    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('자격증');
    expect(item.categoryId).toBe(categories[0].id);
  });

  it('addItem() — refined 없으면 raw 를 그대로 쓴다', () => {
    const item = careerStore.addItem({ raw: '동아리 회장 됨', categoryName: '동아리·활동' });
    expect(item.refined).toBe('동아리 회장 됨');
  });

  it('ensureCategory() — 같은 이름은 재사용, 새 이름은 뒤 순서로 생성', () => {
    const a = careerStore.ensureCategory('경력');
    const b = careerStore.ensureCategory('경력');
    expect(b.id).toBe(a.id);

    const c = careerStore.ensureCategory('수상');
    expect(c.order).toBeGreaterThan(a.order);
    expect(careerStore.listCategories().map((x) => x.name)).toEqual(['경력', '수상']);
  });

  it('ensureCategory() — 빈 이름은 기타로 폴백', () => {
    expect(careerStore.ensureCategory('  ').name).toBe(FALLBACK_CATEGORY);
  });

  it('moveItem() — 다른 카테고리로 이동, 없는 카테고리는 무시', () => {
    const item = careerStore.addItem({ raw: 'x', categoryName: '기타' });
    const target = careerStore.ensureCategory('경력');
    careerStore.moveItem(item.id, target.id);
    expect(careerStore.listItems()[0].categoryId).toBe(target.id);

    careerStore.moveItem(item.id, 'spc_없는것');
    expect(careerStore.listItems()[0].categoryId).toBe(target.id);
  });

  it('updateItem() / removeItem()', () => {
    const item = careerStore.addItem({ raw: 'a', categoryName: '기타' });
    careerStore.updateItem(item.id, { refined: '다듬은 문장' });
    expect(careerStore.listItems()[0].refined).toBe('다듬은 문장');

    careerStore.removeItem(item.id);
    expect(careerStore.listItems()).toEqual([]);
  });

  it('pruneEmptyCategories() — 항목 없는 섹션만 정리', () => {
    const kept = careerStore.addItem({ raw: 'a', categoryName: '경력' });
    careerStore.ensureCategory('수상'); // 빈 섹션
    careerStore.pruneEmptyCategories();
    const names = careerStore.listCategories().map((c) => c.name);
    expect(names).toEqual(['경력']);
    expect(careerStore.listItems()[0].id).toBe(kept.id);
  });

  it('깨진 저장 데이터는 무시하고 복구한다', () => {
    window.localStorage.setItem('career.items.v1', JSON.stringify([
      null,
      { id: 'sp_ok', raw: '유효', refined: '유효 항목', categoryId: 'c1', date: '2026-07-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: 'garbage' },
      { raw: '' },
      'not-an-object',
    ]));
    const items = careerStore.listItems();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('sp_ok');
    expect(items[0].updatedAt).toBe(items[0].createdAt);
  });
});
