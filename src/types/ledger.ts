/**
 * 가계부 타입 — 수입/지출/이체 3종 거래 + 3버킷 예산 + 고정지출.
 * 날짜는 전부 로컬 YMD 문자열. amount 는 항상 원 단위 정수(내 부담액).
 */
export const LEDGER_CHANGED = 'ledger-changed';

export type EntryType = 'expense' | 'income' | 'transfer';
export type PayMethod = 'card' | 'cash' | 'account';
export type BudgetBucket = 'fixed' | 'variable' | 'irregular';

export interface LedgerEntry {
  id: string;
  type: EntryType;
  amount: number;          // 원 단위 정수. 더치페이면 '내 부담액'
  date: string;            // 로컬 YMD
  categoryId: string;      // LedgerCategory.id — 수입/이체는 'etc' 고정이어도 무방
  memo: string;
  method?: PayMethod;
  groupTotal?: number;     // 더치페이 총액(참고용, 선택)
  createdAt: string;       // ISO
}

export interface LedgerCategory {
  id: string;
  label: string;
  emoji: string;
  bucket: BudgetBucket;    // 예산 3버킷 귀속
  custom?: boolean;
}

/** 기본 10개 — AI 자동분류 대상. 애매하면 'etc'. */
export const DEFAULT_CATEGORIES: LedgerCategory[] = [
  { id: 'food',         label: '식비',        emoji: '🍚', bucket: 'variable' },
  { id: 'cafe',         label: '카페·간식',   emoji: '☕', bucket: 'variable' },
  { id: 'transport',    label: '교통',        emoji: '🚌', bucket: 'variable' },
  { id: 'shopping',     label: '쇼핑',        emoji: '🛍️', bucket: 'variable' },
  { id: 'subscription', label: '구독',        emoji: '🔁', bucket: 'fixed' },
  { id: 'housing',      label: '주거·통신',   emoji: '🏠', bucket: 'fixed' },
  { id: 'medical',      label: '의료',        emoji: '🏥', bucket: 'irregular' },
  { id: 'event',        label: '경조사·선물', emoji: '🎁', bucket: 'irregular' },
  { id: 'leisure',      label: '여가',        emoji: '🎬', bucket: 'variable' },
  { id: 'etc',          label: '기타',        emoji: '📎', bucket: 'variable' },
];

export const BUCKET_META: Record<BudgetBucket, { label: string; desc: string }> = {
  fixed:     { label: '고정비',  desc: '구독·월세·통신 등 매달 비슷한 지출' },
  variable:  { label: '변동비',  desc: '식비·쇼핑·여가 등 이번 달에 조절 가능한 지출' },
  irregular: { label: '비정기',  desc: '경조사·의료 등 가끔 크게 나가는 지출' },
};

export interface RecurringRule {
  id: string;
  label: string;
  amount: number;
  type: EntryType;         // 보통 expense, 월급 자동 기록이면 income
  categoryId: string;
  day: number;             // 매달 며칠 (1~28로 클램프)
  method?: PayMethod;
  active: boolean;
  lastPostedMonth?: string; // 'YYYY-MM' — 이 달까지 기록 완료
  createdAt: string;
}

/** 버킷별 월 예산(원). 미설정 버킷은 undefined. */
export type LedgerBudgets = Partial<Record<BudgetBucket, number>>;

export interface LedgerSettings {
  cardBillingDay?: number; // 카드 결제일 (선택)
}

export const TYPE_META: Record<EntryType, { label: string; sign: string }> = {
  expense:  { label: '지출', sign: '-' },
  income:   { label: '수입', sign: '+' },
  transfer: { label: '이체', sign: '→' },
};

// ── 2차: 자산·순자산 ──

/** 부채(debt)는 value 를 양수로 저장하고 순자산 계산에서만 뺀다. */
export type AssetKind = 'cash' | 'invest' | 'coin' | 'property' | 'debt';

export const ASSET_KIND_META: Record<AssetKind, { label: string; emoji: string; desc: string }> = {
  cash:     { label: '현금·예적금', emoji: '💵', desc: '통장 잔고 · 예금 · 적금' },
  invest:   { label: '주식·ETF·채권', emoji: '📈', desc: '수량·평단 적으면 수익률 계산' },
  coin:     { label: '코인', emoji: '🪙', desc: '암호화폐' },
  property: { label: '부동산·차·기타', emoji: '🏢', desc: '실물 자산 — 대략적 시세로' },
  debt:     { label: '부채', emoji: '📉', desc: '대출·할부 잔액 (순자산에서 차감)' },
};

export interface LedgerAsset {
  id: string;
  kind: AssetKind;
  label: string;            // 예: "삼성전자", "주택청약", "전세대출"
  value: number;            // 현재 평가액(원, 항상 양수). 월말 스냅샷 리듬으로 수동 갱신
  qty?: number;             // 주식·코인 수량 (선택)
  avgPrice?: number;        // 평단 (선택) — qty 와 함께 있으면 수익률 표시
  annualDividend?: number;  // 연 배당(원, 선택)
  dividendMonths?: number[]; // 배당 지급 월 1~12 (선택)
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/** 월말 스냅샷 — 순자산 추이의 점 하나. 같은 달은 덮어씀. */
export interface AssetSnapshot {
  month: string;   // 'YYYY-MM'
  assets: number;  // 부채 제외 자산 합
  debt: number;
  net: number;     // assets - debt
  savedAt: string; // ISO
}
