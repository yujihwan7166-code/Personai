/**
 * 셀 내 미니 차트 (Sparkline) — SVG path 생성기.
 *
 * 셀 evaluator 가 SPARKLINE_SENTINEL prefix 의 JSON 페이로드를 반환하면
 * CloudSheetEditor 의 셀 렌더가 이 모듈로 SVG 를 그린다.
 *
 * 지원 차트 타입:
 *   line     — 폴리라인 (기본)
 *   bar      — 가로 막대 (값 = 막대 1개)
 *   column   — 세로 막대 (Excel '열형')
 *   winloss  — 양수 위 / 음수 아래 / 0 가운데 ('+1/−1')
 *
 * 옵션:
 *   color    — 단색 (기본 currentColor)
 *   negcolor — winloss/bar 의 음수 색 (기본 #ef4444)
 *   min/max  — 강제 범위 (생략 시 데이터에서 자동)
 *
 * 출력은 viewBox 기반이라 셀 폭/높이에 자동 stretch.
 */

export interface SparklineOptions {
  /** 'line' | 'bar' | 'column' | 'winloss'. 기본 'line'. */
  charttype?: string;
  /** 양수/일반 색 — CSS 색 표현 (기본 'currentColor'). */
  color?: string;
  /** 음수 색 (winloss·column·bar 에서만 의미). 기본 '#ef4444'. */
  negcolor?: string;
  /** Y 축 강제 최소 — 생략 시 data min. */
  ymin?: number;
  /** Y 축 강제 최대 — 생략 시 data max. */
  ymax?: number;
}

export interface SparklinePayload {
  values: number[];
  options: SparklineOptions;
}

export const SPARKLINE_SENTINEL = '__CLOUDSHEET_SPARKLINE__:';

const VIEW_W = 100;
const VIEW_H = 24;
const PAD = 1;

/** 안전 색 — javascript: / url(...) 스킴 차단 (사용자 입력 → 인라인 style 진입 방지). */
function safeColor(c: string | undefined, fallback: string): string {
  if (!c) return fallback;
  const t = String(c).trim();
  if (!t) return fallback;
  if (/[<>"`{}\\]/.test(t)) return fallback;
  if (/^\s*(javascript|data|vbscript):/i.test(t)) return fallback;
  if (/url\s*\(/i.test(t)) return fallback;
  if (t.length > 32) return fallback;
  return t;
}

/** JSON 옵션 파싱 — 실패 시 빈 옵션. */
export function parseOptions(raw: string | undefined): SparklineOptions {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return v as SparklineOptions;
    }
  } catch { /* fallthrough */ }
  return {};
}

/** Sparkline SVG 마크업 생성 (string). React dangerouslySetInnerHTML 또는 직접 렌더용. */
export function buildSparklineSvg(payload: SparklinePayload): string {
  const { values, options } = payload;
  const type = (options.charttype ?? 'line').toLowerCase();
  const color = safeColor(options.color, 'currentColor');
  const negColor = safeColor(options.negcolor, '#ef4444');

  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true">`;
  const tail = '</svg>';

  if (values.length === 0) return head + tail;

  if (type === 'winloss') {
    return head + winlossBars(values, color, negColor) + tail;
  }
  if (type === 'bar') {
    return head + horizontalBar(values, color, negColor) + tail;
  }
  if (type === 'column') {
    return head + columnBars(values, options, color, negColor) + tail;
  }
  // default: line
  return head + linePath(values, options, color) + tail;
}

function linePath(values: number[], opts: SparklineOptions, color: string): string {
  const { min, max } = bounds(values, opts);
  const range = max - min || 1;
  const w = VIEW_W - PAD * 2;
  const h = VIEW_H - PAD * 2;
  const n = values.length;
  if (n === 1) {
    const cy = PAD + h / 2;
    return `<circle cx="${VIEW_W / 2}" cy="${cy}" r="1.5" fill="${color}"/>`;
  }
  const step = w / (n - 1);
  const points = values.map((v, i) => {
    const x = PAD + i * step;
    const y = PAD + h - ((v - min) / range) * h;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `<polyline fill="none" stroke="${color}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round" points="${points.join(' ')}"/>`;
}

function columnBars(values: number[], opts: SparklineOptions, posColor: string, negColor: string): string {
  const { min, max } = bounds(values, opts);
  const zero = min < 0 && max > 0 ? 0 : (max > 0 ? min : max);
  const range = max - min || 1;
  const w = VIEW_W - PAD * 2;
  const h = VIEW_H - PAD * 2;
  const n = values.length;
  const gap = Math.min(1, w / (n * 4));
  const barW = (w - gap * (n - 1)) / Math.max(1, n);
  const zeroY = PAD + h - ((zero - min) / range) * h;
  return values.map((v, i) => {
    const x = PAD + i * (barW + gap);
    const yTop = PAD + h - ((v - min) / range) * h;
    const top = Math.min(yTop, zeroY);
    const height = Math.max(0.5, Math.abs(yTop - zeroY));
    const fill = v < 0 ? negColor : posColor;
    return `<rect x="${x.toFixed(2)}" y="${top.toFixed(2)}" width="${barW.toFixed(2)}" height="${height.toFixed(2)}" fill="${fill}"/>`;
  }).join('');
}

function winlossBars(values: number[], posColor: string, negColor: string): string {
  const w = VIEW_W - PAD * 2;
  const h = VIEW_H - PAD * 2;
  const n = values.length;
  const gap = Math.min(1, w / (n * 4));
  const barW = (w - gap * (n - 1)) / Math.max(1, n);
  const halfH = h / 2;
  const mid = PAD + halfH;
  return values.map((v, i) => {
    const x = PAD + i * (barW + gap);
    if (v === 0) {
      // zero: 가운데 가는 회색 점
      return `<rect x="${x.toFixed(2)}" y="${(mid - 0.5).toFixed(2)}" width="${barW.toFixed(2)}" height="1" fill="#9ca3af"/>`;
    }
    const fill = v < 0 ? negColor : posColor;
    const barH = halfH - 1;
    const y = v > 0 ? mid - barH : mid + 1;
    return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barW.toFixed(2)}" height="${barH.toFixed(2)}" fill="${fill}"/>`;
  }).join('');
}

function horizontalBar(values: number[], posColor: string, negColor: string): string {
  // 단일 값 또는 첫 값만 — Google Sheets SPARKLINE bar 와 동일 (한 셀=한 막대).
  const v = values[0] ?? 0;
  const max = Math.max(1, Math.abs(v));
  const w = VIEW_W - PAD * 2;
  const h = VIEW_H - PAD * 2;
  const barH = h * 0.55;
  const y = PAD + (h - barH) / 2;
  const barW = (Math.abs(v) / max) * w;
  const fill = v < 0 ? negColor : posColor;
  return `<rect x="${PAD}" y="${y.toFixed(2)}" width="${barW.toFixed(2)}" height="${barH.toFixed(2)}" fill="${fill}"/>`;
}

function bounds(values: number[], opts: SparklineOptions): { min: number; max: number } {
  let min = Number.isFinite(opts.ymin as number) ? Number(opts.ymin) : Math.min(...values);
  let max = Number.isFinite(opts.ymax as number) ? Number(opts.ymax) : Math.max(...values);
  if (min === max) {
    // 일직선 → 중앙선 + 여유 약간
    const delta = Math.abs(min) || 1;
    min -= delta * 0.1;
    max += delta * 0.1;
  }
  return { min, max };
}
