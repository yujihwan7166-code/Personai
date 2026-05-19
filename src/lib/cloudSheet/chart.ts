/**
 * 시트 → 차트 데이터 변환.
 *
 * 선택 범위 + 시리즈 방향(행/열) 으로 Recharts 가 먹는 형태로 변환.
 *
 * 예: 범위 A1:C3 (가로 첫 행을 카테고리, 세로 첫 열을 시리즈 라벨)
 *     orientation='columns' → 시리즈는 B/C 열, 카테고리는 1~3행 첫 셀
 *     orientation='rows'    → 시리즈는 2/3행, 카테고리는 1행 B/C열
 *
 * v1 규칙 (단순):
 * - 첫 행/열을 라벨로 사용
 * - 숫자가 아닌 셀은 0 으로 처리
 * - 빈 범위 → 빈 결과
 */

import { evalCell } from './formula';

type Cells = Record<string, string>;

export interface SelRange { minR: number; maxR: number; minC: number; maxC: number }

/** 시트에 영구 embed 된 차트 한 개 (시트 별로 배열 보유). */
export interface EmbeddedChart {
  id: string;
  type: 'bar' | 'line' | 'area' | 'pie';
  orientation: 'columns' | 'rows';
  range: SelRange;
  title?: string;
  /** 팔레트 프리셋 이름 — getChartPalette 가 fallback 처리. */
  palette?: string;
  /** 카드 접힘 상태 (헤더만 표시). 미지정 = 펼침. */
  collapsed?: boolean;
}

export interface ChartData {
  // Recharts 가 먹는 dataKey/x 구조
  rows: Array<{ name: string } & Record<string, number>>;
  seriesKeys: string[]; // dataKey 후보들
}

function colLabel(i: number): string {
  let s = '';
  let n = i;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function readCell(cells: Cells, row: number, col: number): string {
  const ref = `${colLabel(col)}${row + 1}`;
  const raw = cells[ref];
  if (!raw) return '';
  if (raw.startsWith('=')) return evalCell(ref, cells);
  return raw;
}

function toNumberOrZero(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** 시리즈가 column 방향: 첫 행이 시리즈 라벨, 첫 열이 카테고리 */
function buildColumnsOriented(cells: Cells, r: SelRange): ChartData {
  const rows: ChartData['rows'] = [];
  const seriesKeys: string[] = [];
  // 첫 행에서 시리즈 라벨 (minC+1..maxC)
  for (let c = r.minC + 1; c <= r.maxC; c++) {
    const label = readCell(cells, r.minR, c).trim() || colLabel(c);
    seriesKeys.push(label);
  }
  // minR+1..maxR : 각 행이 하나의 카테고리
  for (let row = r.minR + 1; row <= r.maxR; row++) {
    const name = readCell(cells, row, r.minC).trim() || `${row + 1}`;
    const entry: { name: string } & Record<string, number> = { name };
    let i = 0;
    for (let c = r.minC + 1; c <= r.maxC; c++) {
      entry[seriesKeys[i] ?? colLabel(c)] = toNumberOrZero(readCell(cells, row, c));
      i++;
    }
    rows.push(entry);
  }
  return { rows, seriesKeys };
}

/** 시리즈가 row 방향: 첫 열이 시리즈 라벨, 첫 행이 카테고리 */
function buildRowsOriented(cells: Cells, r: SelRange): ChartData {
  const rows: ChartData['rows'] = [];
  const seriesKeys: string[] = [];
  // 첫 열의 minR+1..maxR : 시리즈 라벨
  for (let row = r.minR + 1; row <= r.maxR; row++) {
    const label = readCell(cells, row, r.minC).trim() || `${row + 1}`;
    seriesKeys.push(label);
  }
  // minC+1..maxC : 각 열이 하나의 카테고리
  for (let c = r.minC + 1; c <= r.maxC; c++) {
    const name = readCell(cells, r.minR, c).trim() || colLabel(c);
    const entry: { name: string } & Record<string, number> = { name };
    let i = 0;
    for (let row = r.minR + 1; row <= r.maxR; row++) {
      entry[seriesKeys[i] ?? `${row + 1}`] = toNumberOrZero(readCell(cells, row, c));
      i++;
    }
    rows.push(entry);
  }
  return { rows, seriesKeys };
}

export function buildChartData(
  cells: Cells,
  range: SelRange,
  orientation: 'columns' | 'rows',
): ChartData {
  // 범위가 1×1 이면 빈 결과
  if (range.minR === range.maxR || range.minC === range.maxC) {
    return { rows: [], seriesKeys: [] };
  }
  return orientation === 'columns'
    ? buildColumnsOriented(cells, range)
    : buildRowsOriented(cells, range);
}

/** 원형 차트용: 시리즈 1개를 카테고리·값 페어로 평탄화 */
export function flattenForPie(data: ChartData, seriesKey?: string): Array<{ name: string; value: number }> {
  const key = seriesKey ?? data.seriesKeys[0];
  if (!key) return [];
  return data.rows.map((r) => ({ name: r.name, value: r[key] ?? 0 }));
}

/** 차트 팔레트 프리셋 — 사용자가 차트별로 선택 가능. */
export const CHART_PALETTES = {
  default: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9', '#EC4899', '#84CC16'],
  warm:    ['#EF4444', '#F97316', '#F59E0B', '#EAB308', '#EC4899', '#F43F5E', '#FB923C', '#FACC15'],
  cool:    ['#0EA5E9', '#10B981', '#06B6D4', '#3B82F6', '#14B8A6', '#22C55E', '#6366F1', '#8B5CF6'],
  mono:    ['#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6'],
} as const;

export type ChartPaletteName = keyof typeof CHART_PALETTES;

export const CHART_PALETTE_LABELS: Record<ChartPaletteName, string> = {
  default: '기본',
  warm:    '따뜻',
  cool:    '시원',
  mono:    '단색',
};

/** 차트용 기본 팔레트 (default) — 하위 호환 alias. */
export const CHART_PALETTE = CHART_PALETTES.default;

/** name → palette 배열. 잘못된 name 은 default. */
export function getChartPalette(name?: string): readonly string[] {
  if (name && name in CHART_PALETTES) return CHART_PALETTES[name as ChartPaletteName];
  return CHART_PALETTES.default;
}
