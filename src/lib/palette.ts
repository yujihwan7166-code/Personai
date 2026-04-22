// JS/SVG/Canvas 컨텍스트에서 쓰는 색 팔레트 — Tailwind 클래스를 쓸 수 없는 곳 전용.
// Recharts, Mermaid, Mindmap canvas, SVG fill 등이 여기서 참조.
// 라이트/다크 자동 전환이 필요할 때는 `readCssVar('--expert-blue')`로 CSS 변수 읽기.

/** Tailwind 400~500 대비 톤. 차트·마크업 기본 팔레트 */
export const CHART_COLORS = {
  blue:    '#60a5fa',
  emerald: '#34d399',
  red:     '#f87171',
  amber:   '#fbbf24',
  purple:  '#a78bfa',
  orange:  '#fb923c',
  teal:    '#2dd4bf',
  pink:    '#f472b6',
  slate:   '#94a3b8',
  green:   '#4ade80',
  cyan:    '#22d3ee',
  sky:     '#38bdf8',
  indigo:  '#818cf8',
} as const;

export type ChartColorKey = keyof typeof CHART_COLORS;

/** 차트 텍스트·축 기본 색 */
export const NEUTRAL_AXIS = '#94a3b8';        // slate-400
export const NEUTRAL_GRID = 'rgba(148,163,184,0.25)';

/** CSS 변수(`--primary` 등)를 런타임에 hsl 문자열로 읽어옴 — 다크/라이트 자동 대응 */
export function readCssVar(name: string, fallback = '0 0% 50%'): string {
  if (typeof window === 'undefined') return `hsl(${fallback})`;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return `hsl(${v || fallback})`;
}

export function pickChartColor(key: string, fallback: string = CHART_COLORS.indigo): string {
  return (CHART_COLORS as Record<string, string>)[key] ?? fallback;
}
