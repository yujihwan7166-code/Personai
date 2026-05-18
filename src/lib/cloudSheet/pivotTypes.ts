/**
 * 피벗 테이블 구성 (MVP).
 *
 *   행 그룹 1개 + 열 그룹 0~1개 + 값 컬럼 N개(+ 집계 함수) + 필터 0~N개.
 *
 * 이 구조면 "월별 카테고리별 매출 합계" 같은 표준 피벗 케이스를 다 표현 가능.
 * 다차원(rows 여러 개) 은 v2.
 */

export type PivotAgg = 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface PivotValueSpec {
  /** 원본 시트의 컬럼 이름 (헤더 row 의 값). */
  col: string;
  /** 집계 함수. */
  agg: PivotAgg;
  /** 결과 시트에 표시할 라벨. 생략 시 `<agg>(<col>)`. */
  label?: string;
}

export interface PivotFilterSpec {
  col: string;
  /** SUMIF/COUNTIF 식 criteria — ">5", "abc", "*foo*" 등. */
  criteria: string;
}

export interface PivotConfig {
  /** 행 그룹 1개 (필수). */
  rowCol: string;
  /** 열 그룹 0 또는 1개. 없으면 단순 그룹화 표. */
  colCol?: string;
  /** 값 N개. */
  values: PivotValueSpec[];
  /** 필터 0~N개 (AND). */
  filters?: PivotFilterSpec[];
  /** 정렬 — 'rowAsc' | 'rowDesc' | 'totalDesc' (총합 기준). 기본 'totalDesc'. */
  sort?: 'rowAsc' | 'rowDesc' | 'totalDesc';
}
