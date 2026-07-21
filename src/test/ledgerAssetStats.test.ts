import { describe, it, expect, beforeEach } from 'vitest';
import { netWorth, sumByKind, assetProfit, monthlyDividends } from '@/lib/ledger/assetStats';
import { ledgerStore } from '@/services/ledgerStore';
import type { LedgerAsset } from '@/types/ledger';

const a = (p: Partial<LedgerAsset>): LedgerAsset => ({
  id: 'x', kind: 'cash', label: 'a', value: 0, createdAt: '', updatedAt: '', ...p,
});

describe('assetStats', () => {
  it('netWorth — 부채 차감', () => {
    const n = netWorth([a({ kind: 'cash', value: 1000000 }), a({ kind: 'invest', value: 500000 }), a({ kind: 'debt', value: 300000 })]);
    expect(n).toMatchObject({ assets: 1500000, debt: 300000, net: 1200000 });
  });
  it('sumByKind — 부채 제외, 내림차순', () => {
    const s = sumByKind([a({ kind: 'cash', value: 100 }), a({ kind: 'invest', value: 500 }), a({ kind: 'debt', value: 900 })]);
    expect(s[0]).toEqual({ kind: 'invest', total: 500 });
    expect(s.find((x) => x.kind === 'debt')).toBeUndefined();
  });
  it('assetProfit — 평단 있으면 손익·수익률', () => {
    const p = assetProfit(a({ kind: 'invest', value: 800000, qty: 10, avgPrice: 72000 }));
    expect(p?.profit).toBe(80000);
    expect(p?.rate).toBeCloseTo(80000 / 720000);
    expect(assetProfit(a({ value: 100 }))).toBeNull();
  });
  it('monthlyDividends — 지급 월로 분배', () => {
    const d = monthlyDividends([a({ kind: 'invest', value: 1, annualDividend: 120000, dividendMonths: [3, 6, 9, 12] })]);
    expect(d[2]).toBe(30000);
    expect(d[11]).toBe(30000);
    expect(d[0]).toBe(0);
  });
});

describe('ledgerStore assets/snapshots', () => {
  beforeEach(() => { localStorage.clear(); });
  it('자산 CRUD', () => {
    ledgerStore.addAsset({ kind: 'invest', label: '삼성전자', value: 720000, qty: 10, avgPrice: 70000 });
    let list = ledgerStore.listAssets();
    expect(list).toHaveLength(1);
    ledgerStore.updateAsset(list[0].id, { value: 800000 });
    list = ledgerStore.listAssets();
    expect(list[0].value).toBe(800000);
    ledgerStore.removeAsset(list[0].id);
    expect(ledgerStore.listAssets()).toHaveLength(0);
  });
  it('스냅샷 upsert — 같은 달 덮어쓰기, 순자산 계산', () => {
    ledgerStore.addAsset({ kind: 'cash', label: '통장', value: 1000000 });
    ledgerStore.addAsset({ kind: 'debt', label: '대출', value: 400000 });
    const s1 = ledgerStore.upsertSnapshot('2026-07');
    expect(s1).toMatchObject({ assets: 1000000, debt: 400000, net: 600000 });
    ledgerStore.updateAsset(ledgerStore.listAssets().find((x) => x.kind === 'cash')!.id, { value: 1200000 });
    ledgerStore.upsertSnapshot('2026-07');
    const snaps = ledgerStore.listSnapshots();
    expect(snaps).toHaveLength(1);
    expect(snaps[0].net).toBe(800000);
  });
  it('백업 round-trip 에 자산·스냅샷 포함', () => {
    ledgerStore.addAsset({ kind: 'coin', label: '비트코인', value: 500000 });
    ledgerStore.upsertSnapshot('2026-07');
    const json = ledgerStore.exportJson();
    localStorage.clear();
    // entries 배열이 필수 스키마라 빈 배열이어도 통과해야 함
    expect(ledgerStore.importJson(json)).toBe(true);
    expect(ledgerStore.listAssets()).toHaveLength(1);
    expect(ledgerStore.listSnapshots()).toHaveLength(1);
  });
});
