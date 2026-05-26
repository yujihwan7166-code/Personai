export type NumericValidationOperator =
  | 'between'
  | 'notBetween'
  | 'equal'
  | 'notEqual'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual';

interface ValidationBase {
  id: string;
  range: { minR: number; maxR: number; minC: number; maxC: number };
  allowBlank?: boolean;
  showInputMessage?: boolean;
  promptTitle?: string;
  prompt?: string;
  showErrorMessage?: boolean;
  errorStyle?: 'stop' | 'warning' | 'information';
  errorTitle?: string;
  error?: string;
}

export interface ListValidation extends ValidationBase {
  kind: 'list';
  items: string[];
}

export interface CheckboxValidation extends ValidationBase {
  kind: 'checkbox';
  items: string[];
}

export interface NumberValidation extends ValidationBase {
  kind: 'number' | 'integer';
  operator: NumericValidationOperator;
  formula1: string;
  formula2?: string;
}

export interface DateValidation extends ValidationBase {
  kind: 'date';
  operator: NumericValidationOperator;
  formula1: string;
  formula2?: string;
}

export interface TextLengthValidation extends ValidationBase {
  kind: 'textLength';
  operator: NumericValidationOperator;
  formula1: string;
  formula2?: string;
}

export interface CustomValidation extends ValidationBase {
  kind: 'custom';
  formula1: string;
}

export type Validation =
  | ListValidation
  | CheckboxValidation
  | NumberValidation
  | DateValidation
  | TextLengthValidation
  | CustomValidation;

export function newValidationId(): string {
  return `vd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
