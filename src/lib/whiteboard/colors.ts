/**
 * 화이트보드 색 토큰 — HSL 직접 값 (테마 무관, 캔버스용).
 */
import type { WBColor, WBStickyColor } from '@/types/whiteboard';

export const WB_COLOR_HSL: Record<WBColor, string> = {
  ink:    'hsl(0 0% 15%)',
  slate:  'hsl(215 16% 47%)',
  red:    'hsl(0 72% 51%)',
  orange: 'hsl(20 90% 55%)',
  amber:  'hsl(38 92% 50%)',
  green:  'hsl(142 70% 45%)',
  teal:   'hsl(175 60% 40%)',
  blue:   'hsl(217 91% 55%)',
  violet: 'hsl(265 70% 60%)',
  pink:   'hsl(330 80% 60%)',
};

/** 스티키 배경·테두리 톤 (파스텔). */
export const WB_STICKY_BG: Record<WBStickyColor, { bg: string; border: string; text: string }> = {
  amber:    { bg: 'hsl(48 95% 88%)',  border: 'hsl(40 80% 70%)',  text: 'hsl(30 60% 25%)' },
  pink:     { bg: 'hsl(340 90% 92%)', border: 'hsl(335 70% 75%)', text: 'hsl(335 50% 30%)' },
  mint:     { bg: 'hsl(155 65% 88%)', border: 'hsl(150 50% 65%)', text: 'hsl(155 40% 25%)' },
  sky:      { bg: 'hsl(205 90% 90%)', border: 'hsl(205 70% 70%)', text: 'hsl(210 50% 25%)' },
  lavender: { bg: 'hsl(260 75% 92%)', border: 'hsl(260 55% 75%)', text: 'hsl(260 40% 30%)' },
  slate:    { bg: 'hsl(220 15% 90%)', border: 'hsl(220 12% 70%)', text: 'hsl(220 20% 25%)' },
};

export const WB_STROKE_WIDTH: Record<'thin' | 'normal' | 'thick', number> = {
  thin:   1.5,
  normal: 2.5,
  thick:  4,
};

export const WB_STROKE_DASH: Record<'solid' | 'dashed' | 'dotted', string> = {
  solid:  '',
  dashed: '8 6',
  dotted: '2 4',
};
