/**
 * 데일리 브리핑 v3 — iOS 위젯 스타일 그리드.
 *
 * - 6×4 셀 그리드 (총 24 셀)
 * - 위젯 사이즈: S(1×1) / M(2×1) / L(2×2)
 * - 사용자가 위젯 추가·삭제·위치 이동·사이즈 변경 가능
 * - autoShow 옵션 (off 기본), 매일 첫 진입 시 자동 표시
 *
 * 옛 v1/v2 키는 초기화 시 자동 삭제.
 */
import { useSyncExternalStore } from 'react';

const SETTINGS_KEY = 'personai.daily-briefing.v3';
const LEGACY_KEYS = ['personai.daily-briefing.v1', 'personai.daily-briefing.v2'];

export const GRID_COLS = 6;
export const GRID_ROWS = 4;

// ──────────────────────────────────────────
// 위젯 종류 + 사이즈

export type WidgetSize = 'S' | 'M' | 'L';

export type WidgetKind =
  // 내 데이터 (Step 1)
  | 'schedule'       // 오늘 일정 (M)
  | 'tasks'          // 오늘 할일 (M)
  | 'calendar'       // 달력 한 달 (L)
  | 'habits'         // 습관 (S)
  | 'dday'           // D-day (S)
  | 'pickFirst'      // 가장 먼저 (M)
  | 'overdue'        // 어제 미완료 (S)
  | 'recentJournal'  // 최근 일기 (M)
  | 'clock'          // 시계 (S)
  // 외부 (Step 2 — 자리만 잡음)
  | 'weather'        // 날씨 (M)
  | 'forex'          // 환율 (S)
  | 'news'           // 뉴스 (M)
  | 'stock'          // 주식·코인 (S)
  | 'heatmap';       // S&P 500 히트맵 (L)

export interface WidgetMeta {
  label: string;
  emoji: string;
  defaultSize: WidgetSize;
  /** S/M/L 중 어떤 사이즈로 바꿀 수 있는지 (일부 위젯은 고정). */
  allowedSizes: WidgetSize[];
  group: '내 데이터' | '외부 정보';
  /** Step 2 미구현 placeholder 표시용. */
  soon?: boolean;
  /** 이미 추가됐을 때 동일 위젯 또 추가 가능? (시계 같은 건 1개만, 환율은 여러 통화별 — false 기본). */
  multiInstance?: boolean;
}

export const WIDGET_META: Record<WidgetKind, WidgetMeta> = {
  // 내 데이터
  schedule:      { label: '오늘 일정',   emoji: '📅', defaultSize: 'M', allowedSizes: ['M', 'L'], group: '내 데이터' },
  tasks:         { label: '오늘 할일',   emoji: '☑',  defaultSize: 'M', allowedSizes: ['M', 'L'], group: '내 데이터' },
  calendar:      { label: '달력',        emoji: '🗓', defaultSize: 'L', allowedSizes: ['L'],      group: '내 데이터' },
  habits:        { label: '오늘 습관',   emoji: '🔥', defaultSize: 'S', allowedSizes: ['S', 'M'], group: '내 데이터' },
  dday:          { label: '가까운 D-day', emoji: '⚑', defaultSize: 'S', allowedSizes: ['S', 'M'], group: '내 데이터' },
  pickFirst:     { label: '가장 먼저',   emoji: '✨', defaultSize: 'M', allowedSizes: ['M'],      group: '내 데이터' },
  overdue:       { label: '어제 미완료', emoji: '⚠', defaultSize: 'S', allowedSizes: ['S', 'M'], group: '내 데이터' },
  recentJournal: { label: '최근 일기',   emoji: '📓', defaultSize: 'M', allowedSizes: ['M'],      group: '내 데이터' },
  clock:         { label: '시계',        emoji: '🕒', defaultSize: 'S', allowedSizes: ['S'],      group: '내 데이터' },
  // 외부 정보
  weather:       { label: '날씨',        emoji: '🌤', defaultSize: 'M', allowedSizes: ['M'],      group: '외부 정보' },
  forex:         { label: '환율',        emoji: '💱', defaultSize: 'S', allowedSizes: ['S', 'M'], group: '외부 정보' },
  news:          { label: '뉴스',        emoji: '📰', defaultSize: 'M', allowedSizes: ['M', 'L'], group: '외부 정보' },
  stock:         { label: '주식·코인',   emoji: '📈', defaultSize: 'S', allowedSizes: ['S', 'M'], group: '외부 정보' },
  heatmap:       { label: 'S&P 500 히트맵', emoji: '🟢', defaultSize: 'L', allowedSizes: ['L'],   group: '외부 정보' },
};

export const ALL_WIDGET_KINDS: WidgetKind[] = Object.keys(WIDGET_META) as WidgetKind[];

export function sizeToSpan(size: WidgetSize): { w: number; h: number } {
  switch (size) {
    case 'S': return { w: 1, h: 1 };
    case 'M': return { w: 2, h: 1 };
    case 'L': return { w: 2, h: 2 };
  }
}

// ──────────────────────────────────────────
// 데이터 타입

export interface PlacedWidget {
  /** 인스턴스 고유 ID — 같은 종류 여러 개 가능 (multiInstance) */
  id: string;
  kind: WidgetKind;
  size: WidgetSize;
  col: number;   // 0 ~ GRID_COLS-1
  row: number;   // 0 ~ GRID_ROWS-1
  /** 위젯별 사용자 설정 (예: 환율 통화 리스트). */
  config?: Record<string, unknown>;
}

export interface BriefingSettings {
  v: 3;
  widgets: PlacedWidget[];
  autoShow: boolean;
  lastShownDate?: string;
}

// ──────────────────────────────────────────
// Default 7개 위젯 (Q15 결정대로)
// 그리드 6×4: 가장먼저 (M, 0,0) · 시계 (S, 2,0) · 환율 (S, 3,0) [step2]
//              일정 (M, 4,0) · 달력 (L, 0,1+2,1) · 할일 (M, 4,1) · 날씨 (M, 4,2)
//
// Step 1 default 는 외부 위젯 빼고 6개로 시작 (날씨·환율 제외):
//   pickFirst (M 0,0), schedule (M 2,0), tasks (M 4,0)
//   calendar (L 0,1), clock (S 2,1), habits (S 3,1)
//   dday (S 2,2), overdue (S 3,2)
//   recentJournal (M 4,1)
function buildDefaultWidgets(): PlacedWidget[] {
  return [
    placed('pickFirst', 'M', 0, 0),
    placed('schedule', 'M', 2, 0),
    placed('tasks', 'M', 4, 0),
    placed('calendar', 'L', 0, 1),    // 0,1 + 1,1 + 0,2 + 1,2
    placed('clock', 'S', 2, 1),
    placed('habits', 'S', 3, 1),
    placed('recentJournal', 'M', 4, 1),
    placed('dday', 'S', 2, 2),
    placed('overdue', 'S', 3, 2),
  ];
}

function placed(kind: WidgetKind, size: WidgetSize, col: number, row: number): PlacedWidget {
  return {
    id: `${kind}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    kind, size, col, row,
  };
}

const DEFAULT: BriefingSettings = {
  v: 3,
  widgets: [],   // buildDefaultWidgets() 첫 로드 시 채움
  autoShow: false,
};

// ──────────────────────────────────────────
// IO

let cache: BriefingSettings | null = null;
const listeners = new Set<() => void>();

function safeRead(): BriefingSettings {
  if (cache) return cache;
  if (typeof window === 'undefined') return { ...DEFAULT, widgets: buildDefaultWidgets() };
  // 옛 키 정리 (Q26 결정대로 d — auto delete)
  for (const k of LEGACY_KEYS) {
    try { window.localStorage.removeItem(k); } catch { /* silent */ }
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      cache = { ...DEFAULT, widgets: buildDefaultWidgets() };
      return cache;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || parsed.v !== 3) {
      cache = { ...DEFAULT, widgets: buildDefaultWidgets() };
      return cache;
    }
    cache = {
      v: 3,
      widgets: Array.isArray(parsed.widgets) ? sanitizeWidgets(parsed.widgets) : buildDefaultWidgets(),
      autoShow: typeof parsed.autoShow === 'boolean' ? parsed.autoShow : false,
      lastShownDate: typeof parsed.lastShownDate === 'string' ? parsed.lastShownDate : undefined,
    };
    return cache;
  } catch {
    cache = { ...DEFAULT, widgets: buildDefaultWidgets() };
    return cache;
  }
}

function sanitizeWidgets(input: unknown[]): PlacedWidget[] {
  const out: PlacedWidget[] = [];
  for (const w of input) {
    if (!w || typeof w !== 'object') continue;
    const obj = w as Partial<PlacedWidget>;
    if (typeof obj.id !== 'string' || typeof obj.kind !== 'string') continue;
    if (!(obj.kind in WIDGET_META)) continue;
    if (obj.size !== 'S' && obj.size !== 'M' && obj.size !== 'L') continue;
    if (typeof obj.col !== 'number' || typeof obj.row !== 'number') continue;
    out.push({
      id: obj.id,
      kind: obj.kind as WidgetKind,
      size: obj.size,
      col: Math.max(0, Math.min(GRID_COLS - 1, obj.col)),
      row: Math.max(0, Math.min(GRID_ROWS - 1, obj.row)),
      config: obj.config && typeof obj.config === 'object' ? obj.config : undefined,
    });
  }
  return out;
}

function commit(next: BriefingSettings): void {
  cache = next;
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* silent */ }
  }
  listeners.forEach((l) => l());
}

const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ──────────────────────────────────────────
// Grid utilities

export type Grid = boolean[][];   // [row][col] 점유 여부

export function buildGrid(widgets: PlacedWidget[]): Grid {
  const grid: Grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(false));
  for (const w of widgets) {
    const { w: ww, h: wh } = sizeToSpan(w.size);
    for (let r = w.row; r < Math.min(GRID_ROWS, w.row + wh); r++) {
      for (let c = w.col; c < Math.min(GRID_COLS, w.col + ww); c++) {
        grid[r][c] = true;
      }
    }
  }
  return grid;
}

/** 주어진 사이즈가 (col, row) 에 배치 가능한지 — 그리드 밖 X, 점유 X (excludeId 자기 자신 제외). */
export function canPlace(
  widgets: PlacedWidget[],
  size: WidgetSize,
  col: number,
  row: number,
  excludeId?: string,
): boolean {
  const { w, h } = sizeToSpan(size);
  if (col < 0 || row < 0 || col + w > GRID_COLS || row + h > GRID_ROWS) return false;
  const grid = buildGrid(widgets.filter((x) => x.id !== excludeId));
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      if (grid[r][c]) return false;
    }
  }
  return true;
}

/** 첫 빈 칸 — left-to-right, top-to-bottom 으로 검색. */
export function findFirstEmpty(widgets: PlacedWidget[], size: WidgetSize): { col: number; row: number } | null {
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (canPlace(widgets, size, c, r)) return { col: c, row: r };
    }
  }
  return null;
}

// ──────────────────────────────────────────
// Public API

export const dailyBriefingStore = {
  getSettings(): BriefingSettings { return safeRead(); },

  setAutoShow(v: boolean): void {
    commit({ ...safeRead(), autoShow: v });
  },

  markShownToday(): void {
    commit({ ...safeRead(), lastShownDate: todayKey() });
  },

  shouldAutoShow(): boolean {
    const s = safeRead();
    if (!s.autoShow) return false;
    return s.lastShownDate !== todayKey();
  },

  /** 위젯 추가 — 빈 칸 자동 찾기. 자리 없으면 false. */
  addWidget(kind: WidgetKind, size?: WidgetSize): PlacedWidget | null {
    const meta = WIDGET_META[kind];
    const useSize = size && meta.allowedSizes.includes(size) ? size : meta.defaultSize;
    const cur = safeRead();
    // multiInstance 가 아닌데 이미 있으면 skip
    if (!meta.multiInstance && cur.widgets.some((w) => w.kind === kind)) return null;
    const pos = findFirstEmpty(cur.widgets, useSize);
    if (!pos) return null;
    const w: PlacedWidget = placed(kind, useSize, pos.col, pos.row);
    commit({ ...cur, widgets: [...cur.widgets, w] });
    return w;
  },

  removeWidget(id: string): void {
    const cur = safeRead();
    commit({ ...cur, widgets: cur.widgets.filter((w) => w.id !== id) });
  },

  moveWidget(id: string, col: number, row: number): boolean {
    const cur = safeRead();
    const target = cur.widgets.find((w) => w.id === id);
    if (!target) return false;
    if (!canPlace(cur.widgets, target.size, col, row, id)) return false;
    commit({
      ...cur,
      widgets: cur.widgets.map((w) => (w.id === id ? { ...w, col, row } : w)),
    });
    return true;
  },

  resizeWidget(id: string, size: WidgetSize): boolean {
    const cur = safeRead();
    const target = cur.widgets.find((w) => w.id === id);
    if (!target) return false;
    const meta = WIDGET_META[target.kind];
    if (!meta.allowedSizes.includes(size)) return false;
    // 같은 위치에서 새 사이즈 가능?
    if (canPlace(cur.widgets, size, target.col, target.row, id)) {
      commit({
        ...cur,
        widgets: cur.widgets.map((w) => (w.id === id ? { ...w, size } : w)),
      });
      return true;
    }
    // 빈 자리 자동 찾기
    const newPos = findFirstEmpty(cur.widgets.filter((w) => w.id !== id), size);
    if (!newPos) return false;
    commit({
      ...cur,
      widgets: cur.widgets.map((w) => (w.id === id ? { ...w, size, col: newPos.col, row: newPos.row } : w)),
    });
    return true;
  },

  updateWidgetConfig(id: string, config: Record<string, unknown>): void {
    const cur = safeRead();
    commit({
      ...cur,
      widgets: cur.widgets.map((w) => (w.id === id ? { ...w, config: { ...w.config, ...config } } : w)),
    });
  },

  resetWidgets(): void {
    commit({ ...safeRead(), widgets: buildDefaultWidgets() });
  },

  // ──────────────────────────────────────────
  // React hook
  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

/** React 훅 — useSyncExternalStore */
export function useBriefingSettings(): BriefingSettings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => safeRead(),
    () => safeRead(),
  );
}
