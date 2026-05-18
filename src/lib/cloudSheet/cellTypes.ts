/** 시트 셀 자료 타입 — 모든 시트/페이지에서 공유. */

/** ref(예: 'A1') → 셀 raw 값 */
export type Cells = Record<string, string>;

/** sheet id → cells */
export type AllCells = Record<string, Cells>;

/** 병합 범위 */
export interface Merge { minR: number; maxR: number; minC: number; maxC: number }
export type AllMerges = Record<string, Merge[]>;

/** 셀 코멘트 */
export type Comments = Record<string, string>;
export type AllComments = Record<string, Comments>;

/** 현재 선택 범위 (그리드 영역) */
export interface SelBounds { minR: number; maxR: number; minC: number; maxC: number; }
