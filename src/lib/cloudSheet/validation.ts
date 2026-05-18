/** 데이터 검증 (드롭다운/체크박스) 타입 + id 생성. */

export interface Validation {
  id: string;
  range: { minR: number; maxR: number; minC: number; maxC: number };
  kind: 'list' | 'checkbox';
  /** kind='list' 면 사용자 정의 목록, kind='checkbox' 면 항상 ['TRUE','FALSE']. */
  items: string[];
}

export function newValidationId(): string {
  return `vd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
