/** 조건부 서식 (Conditional Formatting) 타입 + 평가 함수. */

export type CondOp = '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'between' | 'empty' | 'nonempty';

export interface CondRule {
  id: string;
  range: { minR: number; maxR: number; minC: number; maxC: number };
  op: CondOp;
  value: string;  // op === 'between' 이면 'a,b'
  format: { bgColor?: string; textColor?: string; bold?: boolean };
}

export function newCondRuleId(): string {
  return `cr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** 셀 값이 rule 의 조건을 만족하는지 */
export function evalCondRule(value: string, op: CondOp, target: string): boolean {
  if (op === 'empty') return value === '' || value === undefined;
  if (op === 'nonempty') return value !== '' && value !== undefined;
  if (op === 'contains') return value.toLowerCase().includes(target.toLowerCase());
  if (op === 'between') {
    const [a, b] = target.split(',').map((s) => Number(s.trim()));
    const v = Number(value);
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(v)) return false;
    return v >= Math.min(a, b) && v <= Math.max(a, b);
  }
  const tn = Number(target);
  const vn = Number(value);
  // 숫자 비교 가능하면 숫자, 아니면 문자열
  if (Number.isFinite(tn) && Number.isFinite(vn) && value.trim() !== '') {
    switch (op) {
      case '>': return vn > tn;
      case '<': return vn < tn;
      case '>=': return vn >= tn;
      case '<=': return vn <= tn;
      case '==': return vn === tn;
      case '!=': return vn !== tn;
    }
  }
  // 문자열 비교 (숫자 op 는 비교 불가 → false)
  switch (op) {
    case '==': return value === target;
    case '!=': return value !== target;
    default: return false;
  }
}
