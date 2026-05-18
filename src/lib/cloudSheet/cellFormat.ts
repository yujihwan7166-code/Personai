/** 셀 서식 (정렬/색/폰트/숫자포맷/테두리) 통합 타입. */

import type { BorderStyle } from './borderStyle';
import type { FontFamily } from './fontFamily';
import type { NumberFmt } from './numberFormat';

export type VAlign = 'top' | 'middle' | 'bottom';
export type Wrap = 'overflow' | 'wrap' | 'clip';
export type HAlign = 'left' | 'center' | 'right';

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textColor?: string;
  bgColor?: string;
  align?: HAlign;
  vAlign?: VAlign;
  wrap?: Wrap;
  fontFamily?: FontFamily;
  /** 폰트 크기 (px). 8~48. */
  fontSize?: number;
  numberFmt?: NumberFmt;
  border?: BorderStyle;
}

export type CellFormats = Record<string, CellFormat>;
