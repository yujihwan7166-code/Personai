import { describe, it, expect, beforeEach } from 'vitest';
import { ledgerStore } from '@/services/ledgerStore';
import { parseInput } from '@/lib/ledger/parse';

beforeEach(() => { localStorage.clear(); });

describe('ledgerStore', () => {
  it('addEntries → listEntries 날짜 내림차순', () => {
    ledgerStore.addEntries([
      { type: 'expense', amount: 4500, date: '2026-07-20', categoryId: 'food', memo: '김밥' },
      { type: 'expense', amount: 12000, date: '2026-07-21', categoryId: 'transport', memo: '택시' },
    ]);
    const list = ledgerStore.listEntries();
    expect(list).toHaveLength(2);
    expect(list[0].date).toBe('2026-07-21');
    expect(list[0].id).toBeTruthy();
  });
  it('updateEntry / removeEntry', () => {
    ledgerStore.addEntries([{ type: 'expense', amount: 1000, date: '2026-07-21', categoryId: 'etc', memo: 'x' }]);
    const id = ledgerStore.listEntries()[0].id;
    ledgerStore.updateEntry(id, { amount: 2000, categoryId: 'food' });
    expect(ledgerStore.listEntries()[0].amount).toBe(2000);
    ledgerStore.removeEntry(id);
    expect(ledgerStore.listEntries()).toHaveLength(0);
  });
  it('duplicateEntry — 오늘 날짜로 복제', () => {
    ledgerStore.addEntries([{ type: 'expense', amount: 4500, date: '2026-01-01', categoryId: 'cafe', memo: '커피' }]);
    const id = ledgerStore.listEntries()[0].id;
    ledgerStore.duplicateEntry(id, '2026-07-21');
    const list = ledgerStore.listEntries();
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ date: '2026-07-21', amount: 4500, memo: '커피' });
  });
  it('카테고리 수정 시 키워드 학습 → getKeywordDict', () => {
    ledgerStore.addEntries([{ type: 'expense', amount: 4500, date: '2026-07-21', categoryId: 'etc', memo: '스벅 아아' }]);
    const id = ledgerStore.listEntries()[0].id;
    ledgerStore.updateEntry(id, { categoryId: 'cafe' }, { learn: true });
    expect(ledgerStore.getKeywordDict()['스벅']).toBe('cafe');
  });
  it('고정지출 — postDueRecurring 이 지난 달분까지 소급 기록, 중복 없음', () => {
    ledgerStore.addRecurring({ label: '넷플릭스', amount: 17000, type: 'expense', categoryId: 'subscription', day: 15 });
    ledgerStore.postDueRecurring('2026-07-21');
    const first = ledgerStore.listEntries();
    expect(first).toHaveLength(1); // 등록 당월(7월) 15일분
    expect(first[0]).toMatchObject({ date: '2026-07-15', amount: 17000 });
    ledgerStore.postDueRecurring('2026-07-22'); // 재호출해도 중복 기록 없음
    expect(ledgerStore.listEntries()).toHaveLength(1);
  });
  it('고정지출 — day 가 아직 안 왔으면 기록 안 함', () => {
    ledgerStore.addRecurring({ label: '월세', amount: 500000, type: 'expense', categoryId: 'housing', day: 25 });
    ledgerStore.postDueRecurring('2026-07-21');
    expect(ledgerStore.listEntries()).toHaveLength(0);
  });
  it('budgets·settings round-trip', () => {
    ledgerStore.setBudgets({ variable: 400000 });
    expect(ledgerStore.getBudgets().variable).toBe(400000);
    ledgerStore.setSettings({ cardBillingDay: 25 });
    expect(ledgerStore.getSettings().cardBillingDay).toBe(25);
  });
  it('exportJson → importJson round-trip', () => {
    ledgerStore.addEntries([{ type: 'income', amount: 100, date: '2026-07-01', categoryId: 'etc', memo: '' }]);
    ledgerStore.setBudgets({ fixed: 1 });
    const json = ledgerStore.exportJson();
    localStorage.clear();
    expect(ledgerStore.listEntries()).toHaveLength(0);
    expect(ledgerStore.importJson(json)).toBe(true);
    expect(ledgerStore.listEntries()).toHaveLength(1);
    expect(ledgerStore.getBudgets().fixed).toBe(1);
  });
  it('importJson — 깨진 JSON 은 false, 기존 데이터 보존', () => {
    ledgerStore.addEntries([{ type: 'expense', amount: 1, date: '2026-07-01', categoryId: 'etc', memo: '' }]);
    expect(ledgerStore.importJson('not json')).toBe(false);
    expect(ledgerStore.listEntries()).toHaveLength(1);
  });
});

describe('분류 규칙(keywordDict)', () => {
  it('setKeywordRule 저장·덮어쓰기, removeKeywordRule 삭제', () => {
    ledgerStore.setKeywordRule('스벅', 'cafe');
    expect(ledgerStore.getKeywordDict()).toEqual({ 스벅: 'cafe' });
    ledgerStore.setKeywordRule('스벅', 'food');           // 같은 키워드는 하나만
    expect(ledgerStore.getKeywordDict()).toEqual({ 스벅: 'food' });
    ledgerStore.removeKeywordRule('스벅');
    expect(ledgerStore.getKeywordDict()).toEqual({});
  });

  it('빈 키워드·공백은 무시', () => {
    ledgerStore.setKeywordRule('   ', 'cafe');
    ledgerStore.setKeywordRule('택시', '');
    expect(ledgerStore.getKeywordDict()).toEqual({});
  });

  it('저장한 규칙이 파서에서 기본 사전보다 먼저 적용된다', () => {
    // '치킨'은 기본 사전에서 food — 내 규칙으로 leisure 로 덮어쓴다
    ledgerStore.setKeywordRule('치킨', 'leisure');
    const [e] = parseInput('치킨 20000', { today: new Date(2026, 6, 21), keywordDict: ledgerStore.getKeywordDict() });
    expect(e.categoryId).toBe('leisure');
  });

  it('백업 export/import 로 규칙이 보존된다', () => {
    ledgerStore.setKeywordRule('스벅', 'cafe');
    const dump = ledgerStore.exportJson();
    localStorage.clear();
    expect(ledgerStore.importJson(dump)).toBe(true);
    expect(ledgerStore.getKeywordDict()).toEqual({ 스벅: 'cafe' });
  });
});
