/**
 * 가계부 타입 — 수입/지출/이체 3종 거래 + 3버킷 예산 + 고정지출.
 * 날짜는 전부 로컬 YMD 문자열. amount 는 항상 원 단위 정수(내 부담액).
 */
export const LEDGER_CHANGED = 'ledger-changed';

export type EntryType = 'expense' | 'income' | 'transfer';
export type PayMethod = 'card' | 'cash' | 'account';
/**
 * 예산 버킷 id.
 *
 * 예전엔 'fixed' | 'variable' | 'irregular' 세 개로 못 박혀 있었다. 사람마다 나누는 축이
 * 다른데(유흥비·자기계발·반려동물…) 셋 밖으로 나갈 수가 없었다 → 문자열 id 로 열어두고,
 * 기본 세 개는 시드로 깐다. 기존 데이터의 'fixed'/'variable'/'irregular' 가 그대로 id 가 된다.
 */
export type BudgetBucket = string;

/** 기본 세 버킷의 id — 마이그레이션·폴백에서 참조. */
export const BUCKET_FIXED = 'fixed';
export const BUCKET_VARIABLE = 'variable';
export const BUCKET_IRREGULAR = 'irregular';

export interface LedgerBucket {
  id: string;
  label: string;
  desc: string;
  order: number;
  /** 기본 3종은 지울 수 없다(카테고리가 갈 곳이 없어진다). */
  builtin?: boolean;
}

export interface LedgerEntry {
  id: string;
  type: EntryType;
  amount: number;          // 원 단위 정수. 더치페이면 '내 부담액'
  date: string;            // 로컬 YMD
  categoryId: string;      // LedgerCategory.id — 수입/이체는 'etc' 고정이어도 무방
  memo: string;
  method?: PayMethod;
  groupTotal?: number;     // 더치페이 총액(참고용, 선택)
  /** 영수증 사진 — 압축된 dataURL. 금액만 남기면 "이게 뭐였더라"가 되는 지출이 있다. */
  photo?: string;
  /**
   * 이 건만 다른 예산으로 — 카테고리가 정한 버킷을 건별로 덮어쓴다.
   * 같은 '식비'라도 친구 만나 쓴 밥값은 유흥비로 세고 싶을 때가 있다.
   * 비어 있으면 카테고리의 버킷을 따른다.
   */
  bucketId?: string;
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

/** 시드로 깔리는 기본 버킷 3종. 사용자가 여기에 더 만들 수 있다. */
export const DEFAULT_BUCKETS: LedgerBucket[] = [
  { id: BUCKET_FIXED,     label: '고정비', desc: '구독·월세·통신 등 매달 비슷한 지출',        order: 0, builtin: true },
  { id: BUCKET_VARIABLE,  label: '변동비', desc: '식비·쇼핑·여가 등 이번 달에 조절 가능한 지출', order: 1, builtin: true },
  { id: BUCKET_IRREGULAR, label: '비정기', desc: '경조사·의료 등 가끔 크게 나가는 지출',       order: 2, builtin: true },
];

/** @deprecated 버킷이 사용자 정의가 되면서 store 의 목록이 진실이다. 기본 3종 라벨 폴백용으로만. */
export const BUCKET_META: Record<string, { label: string; desc: string }> = Object.fromEntries(
  DEFAULT_BUCKETS.map((b) => [b.id, { label: b.label, desc: b.desc }]),
);

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

/** 카테고리별 한도(원) — 선택. 버킷 예산 위에 얹는 세부 한도, categoryId → 금액. */
export type LedgerCatBudgets = Record<string, number>;

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
