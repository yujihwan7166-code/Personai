import { describe, it, expect } from 'vitest';
import { parseAmountToken, parseInput } from '@/lib/ledger/parse';

const TODAY = new Date(2026, 6, 21); // 2026-07-21 (로컬)

describe('parseAmountToken', () => {
  it('일반 숫자·콤마·원 접미', () => {
    expect(parseAmountToken('4500')).toBe(4500);
    expect(parseAmountToken('4,500')).toBe(4500);
    expect(parseAmountToken('12000원')).toBe(12000);
  });
  it('축약 단위 — 천/만/조합/소수', () => {
    expect(parseAmountToken('5천')).toBe(5000);
    expect(parseAmountToken('1.5만')).toBe(15000);
    expect(parseAmountToken('3만5천')).toBe(35000);
    expect(parseAmountToken('만원')).toBe(10000);
    expect(parseAmountToken('15만')).toBe(150000);
  });
  it('금액이 아닌 토큰은 null', () => {
    expect(parseAmountToken('점심')).toBeNull();
    expect(parseAmountToken('7/19')).toBeNull();
    expect(parseAmountToken('')).toBeNull();
  });
});

describe('parseInput', () => {
  it('기본 한 건 — 오늘·카테고리·메모', () => {
    const r = parseInput('점심 김밥 4500', { today: TODAY });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ type: 'expense', amount: 4500, date: '2026-07-21', categoryId: 'food', memo: '점심 김밥' });
  });
  it('여러 건 + 상대날짜 — 어제가 이후 건에도 유지', () => {
    const r = parseInput('어제 택시 12000 커피 4500', { today: TODAY });
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ amount: 12000, date: '2026-07-20', categoryId: 'transport' });
    expect(r[1]).toMatchObject({ amount: 4500, date: '2026-07-20', categoryId: 'cafe' });
  });
  it('몰아서 입력 — 날짜 혼합', () => {
    const r = parseInput('그저께 편의점 8000 어제 점심 9000', { today: TODAY });
    expect(r[0].date).toBe('2026-07-19');
    expect(r[1].date).toBe('2026-07-20');
  });
  it('수입 감지', () => {
    const r = parseInput('월급 300만', { today: TODAY });
    expect(r[0]).toMatchObject({ type: 'income', amount: 3000000 });
  });
  it('이체 감지 — 적금은 지출이 아님', () => {
    const r = parseInput('적금 50만', { today: TODAY });
    expect(r[0].type).toBe('transfer');
  });
  it('고정지출 감지 — 매달', () => {
    const r = parseInput('넷플 17000 매달', { today: TODAY });
    expect(r[0]).toMatchObject({ categoryId: 'subscription', recurring: true });
  });
  it('결제수단·M/D 날짜', () => {
    const r = parseInput('7/15 병원 현금 30000', { today: TODAY });
    expect(r[0]).toMatchObject({ date: '2026-07-15', categoryId: 'medical', method: 'cash' });
  });
  it('학습 사전이 기본 사전보다 우선', () => {
    const r = parseInput('스벅 4500', { today: TODAY, keywordDict: { '스벅': 'cafe' } });
    expect(r[0].categoryId).toBe('cafe');
  });
  it('금액 없으면 빈 배열 (AI 폴백 신호)', () => {
    expect(parseInput('어제 뭐 샀더라', { today: TODAY })).toHaveLength(0);
  });
});
