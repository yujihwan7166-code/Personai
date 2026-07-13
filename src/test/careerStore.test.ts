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

  it('addItem() — 날짜·기간·기관·링크·세부사항 지정 시 그대로 저장', () => {
    const item = careerStore.addItem({
      raw: '동아리 회장 함',
      categoryName: '동아리·활동',
      date: '2025-03-01',
      ongoing: true,
      org: 'IT 연합동아리',
      link: 'https://example.com/club',
      detail: '부원 32명, 세미나 12회 운영',
    });
    expect(item.date).toBe('2025-03-01');
    expect(item.ongoing).toBe(true);
    expect(item.org).toBe('IT 연합동아리');
    expect(item.link).toBe('https://example.com/club');

    const saved = careerStore.listItems()[0];
    expect(saved.detail).toBe('부원 32명, 세미나 12회 운영');
    expect(saved.ongoing).toBe(true);

    // 종료일은 형식이 맞을 때만
    const ranged = careerStore.addItem({ raw: '인턴 함', categoryName: '인턴', date: '2025-01-02', endDate: '2025-06-30' });
    expect(ranged.endDate).toBe('2025-06-30');
    const bad = careerStore.addItem({ raw: 'x', categoryName: '기타', endDate: '2025/06/30' });
    expect(bad.endDate).toBeUndefined();
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

  it('getProfile()/setProfile() — 기본값과 부분 갱신, persona 검증', () => {
    expect(careerStore.getProfile()).toEqual({ name: '', tagline: '', persona: '' });
    careerStore.setProfile({ name: '김도현' });
    careerStore.setProfile({ tagline: '컴퓨터공학 3학년', persona: 'student' });
    expect(careerStore.getProfile()).toEqual({ name: '김도현', tagline: '컴퓨터공학 3학년', persona: 'student' });

    // 저장소에 깨진 persona 가 있어도 빈 값으로 복구
    window.localStorage.setItem('career.profile.v1', JSON.stringify({ name: 'a', persona: 'alien' }));
    expect(careerStore.getProfile().persona).toBe('');

    careerStore.clear();
    expect(careerStore.getProfile()).toEqual({ name: '', tagline: '', persona: '' });
  });

  it('removeCategory() — 빈 칸만 삭제, 항목 있으면 무시', () => {
    const empty = careerStore.ensureCategory('봉사');
    const used = careerStore.ensureCategory('경력');
    careerStore.addItem({ raw: 'x', categoryName: '경력' });

    careerStore.removeCategory(empty.id);
    careerStore.removeCategory(used.id);
    expect(careerStore.listCategories().map((c) => c.name)).toEqual(['경력']);
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

  /* ── 멀티 보드 (2026-07-13) ── */

  it('보드가 없으면 기본 보드가 만들어지고, 구 데이터는 그 보드로 스탬프된다', () => {
    window.localStorage.setItem('career.items.v1', JSON.stringify([
      { id: 'sp_legacy', raw: '구 항목', refined: '구 항목', categoryId: 'c1', date: '2026-07-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
    ]));
    const boards = careerStore.listBoards();
    expect(boards).toHaveLength(1);
    expect(boards[0].name).toBe('기본 보드');
    // 마이그레이션 후 활성 보드 스코프에서 보인다
    const items = careerStore.listItems();
    expect(items).toHaveLength(1);
    expect(items[0].boardId).toBe(boards[0].id);
  });

  it('addBoard() — 새 보드 생성 + 활성화, 기록·카테고리는 보드별로 격리', () => {
    careerStore.addItem({ raw: 'a', categoryName: '자격증' }); // 기본 보드
    const second = careerStore.addBoard('대학원용');
    expect(second).not.toBeNull();
    expect(careerStore.getActiveBoardId()).toBe(second!.id);
    expect(careerStore.listItems()).toEqual([]); // 새 보드는 비어 있다
    expect(careerStore.listCategories()).toEqual([]);

    careerStore.addItem({ raw: 'b', categoryName: '자격증' });
    expect(careerStore.listItems()).toHaveLength(1);
    expect(careerStore.listCategories()).toHaveLength(1); // 이름 같아도 보드별 별도 칸

    const counts = careerStore.countItemsByBoard();
    expect(Object.values(counts).sort()).toEqual([1, 1]);
  });

  it('removeBoard() — 마지막 보드는 못 지우고, 지운 보드는 번들로 복원된다', () => {
    const first = careerStore.listBoards()[0];
    expect(careerStore.removeBoard(first.id)).toBeNull(); // 하나뿐이면 불가

    careerStore.addItem({ raw: 'a', categoryName: '자격증' });
    const second = careerStore.addBoard('취업용')!;
    careerStore.addItem({ raw: 'b', categoryName: '인턴' });

    const bundle = careerStore.removeBoard(second.id);
    expect(bundle).not.toBeNull();
    expect(bundle!.items).toHaveLength(1);
    expect(careerStore.listBoards()).toHaveLength(1);
    expect(careerStore.getActiveBoardId()).toBe(first.id); // 첫 보드로 폴백

    careerStore.restoreBoard(bundle!);
    expect(careerStore.listBoards()).toHaveLength(2);
    expect(careerStore.getActiveBoardId()).toBe(second.id); // 복원되면 다시 활성
    expect(careerStore.listItems().map((i) => i.raw)).toEqual(['b']);
  });

  it('addDoc() — 만든 보드가 스탬프된다', () => {
    const board = careerStore.addBoard('이직용')!;
    const doc = careerStore.addDoc({ purpose: '자기소개서 초안', content: '본문' });
    expect(doc.boardId).toBe(board.id);
  });

  it('프로필은 보드별로 분리 — 새 보드는 이름·연락처가 비고, persona 만 이어받는다', () => {
    const base = careerStore.getActiveBoardId();
    careerStore.setProfile({ name: '김도현', phone: '010-1111-2222', persona: 'student' });

    // 새 보드 — 신분만 시드로 상속
    careerStore.addBoard('대학원용', { persona: 'student' });
    const fresh = careerStore.getProfile();
    expect(fresh.name).toBe('');            // 이전 보드 이름이 넘어오지 않는다
    expect(fresh.phone).toBeUndefined();    // 연락처도 비어 있다
    expect(fresh.persona).toBe('student');  // 신분은 이어받아 설정 화면 재노출 방지

    // 새 보드에서 이름을 바꿔도 원래 보드엔 영향 없음
    careerStore.setProfile({ name: '이수민' });
    careerStore.setActiveBoard(base);
    expect(careerStore.getProfile().name).toBe('김도현');
    careerStore.setActiveBoard(careerStore.listBoards().find((b) => b.name === '대학원용')!.id);
    expect(careerStore.getProfile().name).toBe('이수민');
  });

  it('프로필 없는 보드(구버전 생성)는 다른 보드의 persona 를 이어받아 설정 화면을 안 띄운다', () => {
    careerStore.setProfile({ name: '김도현', persona: 'worker' });
    const legacy = careerStore.addBoard('구보드')!; // seed 없이 생성 → 프로필 없음
    expect(careerStore.getProfile().persona).toBe('worker'); // 상속
    expect(careerStore.getProfile().name).toBe(''); // 이름은 비어 있음
    expect(legacy.id).toBe(careerStore.getActiveBoardId());
  });
});
