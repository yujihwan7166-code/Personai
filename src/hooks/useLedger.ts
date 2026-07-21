/**
 * 가계부 store 구독 훅 — LEDGER_CHANGED 로 자동 re-render.
 * 마운트 시 도래한 고정지출 자동 기록. 시드 없음.
 * TDZ 주의: state → useCallback → useEffect 순서.
 */
import { useCallback, useEffect, useState } from 'react';
import { LEDGER_CHANGED, type LedgerBudgets, type LedgerCategory, type LedgerEntry, type LedgerSettings, type RecurringRule } from '@/types/ledger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';

export interface LedgerData {
  entries: LedgerEntry[];
  recurring: RecurringRule[];
  budgets: LedgerBudgets;
  settings: LedgerSettings;
  categories: LedgerCategory[];
}

export function useLedger(): LedgerData {
  const [data, setData] = useState<LedgerData>(() => ({
    entries: [], recurring: [], budgets: {}, settings: {}, categories: [],
  }));

  const refresh = useCallback(() => {
    setData({
      entries: ledgerStore.listEntries(),
      recurring: ledgerStore.listRecurring(),
      budgets: ledgerStore.getBudgets(),
      settings: ledgerStore.getSettings(),
      categories: ledgerStore.listCategories(),
    });
  }, []);

  useEffect(() => {
    ledgerStore.postDueRecurring(todayKey());
    refresh();
    window.addEventListener(LEDGER_CHANGED, refresh);
    return () => window.removeEventListener(LEDGER_CHANGED, refresh);
  }, [refresh]);

  return data;
}
