/**
 * 자산 집계 — 순수 함수. 부채(debt)는 value 양수 저장, 순자산에서만 차감.
 */
import type { AssetKind, LedgerAsset } from '@/types/ledger';

export interface NetWorth { assets: number; debt: number; net: number }

export function netWorth(assets: LedgerAsset[]): NetWorth {
  let plus = 0, minus = 0;
  for (const a of assets) { if (a.kind === 'debt') minus += a.value; else plus += a.value; }
  return { assets: plus, debt: minus, net: plus - minus };
}

/** 종류별 합 — 도넛용. 부채 제외. */
export function sumByKind(assets: LedgerAsset[]): Array<{ kind: AssetKind; total: number }> {
  const m = new Map<AssetKind, number>();
  for (const a of assets) {
    if (a.kind === 'debt') continue;
    m.set(a.kind, (m.get(a.kind) ?? 0) + a.value);
  }
  return [...m.entries()].map(([kind, total]) => ({ kind, total })).sort((a, b) => b.total - a.total);
}

/** 수량·평단이 있으면 평가손익, 없으면 null. */
export function assetProfit(a: LedgerAsset): { profit: number; rate: number } | null {
  if (!a.qty || !a.avgPrice) return null;
  const cost = a.qty * a.avgPrice;
  if (cost <= 0) return null;
  const profit = a.value - cost;
  return { profit, rate: profit / cost };
}

/** 월별 예상 배당(1~12월 인덱스 0~11) — 연 배당을 지급 월 수로 나눔. */
export function monthlyDividends(assets: LedgerAsset[]): number[] {
  const out = Array(12).fill(0) as number[];
  for (const a of assets) {
    if (!a.annualDividend || a.annualDividend <= 0) continue;
    const months = a.dividendMonths?.length ? a.dividendMonths : [4]; // 미지정 시 4월(국내 결산배당 관행)
    const per = a.annualDividend / months.length;
    for (const m of months) out[m - 1] += per;
  }
  return out.map((v) => Math.round(v));
}
