/**
 * 데일리 브리핑 설정·표시 이력.
 *
 * - autoShow: 매일 첫 접속 시 자동 표시
 * - lastShownDate: 마지막으로 표시한 날짜(YYYY-MM-DD)
 * - widgets: 표시할 위젯 + 순서 (사용자가 customize)
 *
 * localStorage 만 — 가벼움, 기기별 독립.
 */

const SETTINGS_KEY = 'personai.daily-briefing.v2';

/** 위젯 종류 — 추가 시 여기 + WIDGET_META + buildDailyBriefing 같이. */
export type BriefingWidgetId =
  | 'pickFirst'    // ✨ 가장 먼저
  | 'timed'        // 📅 오늘 시간 잡힌 항목
  | 'inbox'        // ☑ 오늘 할 일
  | 'overdue'      // ⚠ 어제 미완료
  | 'habits'       // 🔥 습관
  | 'dday'         // ⚑ D-day
  // ── 외부 정보 (placeholder, 추후 API 연동) ──
  | 'weather'      // 🌤 날씨
  | 'news'         // 📰 뉴스
  | 'stocks'       // 📈 주식·코인
  | 'exchange';    // 💱 환율

export type WidgetGroup = '내 데이터' | '외부 정보';
export type WidgetColumn = 'left' | 'right';

export const WIDGET_META: Record<BriefingWidgetId, {
  label: string; emoji: string; group: WidgetGroup; column: WidgetColumn;
  /** true 면 아직 미구현 — 'soon' 표시. */
  soon?: boolean;
}> = {
  // ── 좌측: 하루 정보 (외부 API) ──
  weather:   { label: '날씨',              emoji: '🌤', group: '외부 정보', column: 'left', soon: true },
  news:      { label: '뉴스 헤드라인',      emoji: '📰', group: '외부 정보', column: 'left', soon: true },
  stocks:    { label: '주식·코인',          emoji: '📈', group: '외부 정보', column: 'left', soon: true },
  exchange:  { label: '환율',              emoji: '💱', group: '외부 정보', column: 'left', soon: true },

  // ── 우측: 데일리(내 데이터) ──
  pickFirst: { label: '가장 먼저',          emoji: '✨', group: '내 데이터', column: 'right' },
  timed:     { label: '오늘 시간 잡힌 항목', emoji: '📅', group: '내 데이터', column: 'right' },
  inbox:     { label: '오늘 할 일',         emoji: '☑',  group: '내 데이터', column: 'right' },
  overdue:   { label: '어제 미완료',         emoji: '⚠',  group: '내 데이터', column: 'right' },
  habits:    { label: '오늘 습관',          emoji: '🔥', group: '내 데이터', column: 'right' },
  dday:      { label: '가까운 D-day',       emoji: '⚑',  group: '내 데이터', column: 'right' },
};

/** 기본 활성 위젯 — 처음 사용자에게 보여줄 set. */
const DEFAULT_ENABLED: BriefingWidgetId[] = [
  'pickFirst', 'timed', 'inbox', 'overdue', 'habits', 'dday',
];

/** 모든 위젯 — 비활성도 포함. UI 의 설정 패널이 이 순서로 노출. */
export const ALL_WIDGETS: BriefingWidgetId[] = [
  // 좌측 (하루 정보 — 외부 API)
  'weather', 'news', 'stocks', 'exchange',
  // 우측 (내 데이터)
  'pickFirst', 'timed', 'inbox', 'overdue', 'habits', 'dday',
];

export interface BriefingSettings {
  autoShow: boolean;
  lastShownDate?: string;
  /** 표시 순서로 정렬된 활성 위젯 id 들. */
  widgets: BriefingWidgetId[];
}

const DEFAULT: BriefingSettings = {
  autoShow: false,
  widgets: DEFAULT_ENABLED,
};

const safeRead = (): BriefingSettings => {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      // v1 마이그레이션 시도 — autoShow 만이라도 가져옴
      const v1 = window.localStorage.getItem('personai.daily-briefing.v1');
      if (v1) {
        try {
          const old = JSON.parse(v1);
          return {
            autoShow: !!old?.autoShow,
            lastShownDate: typeof old?.lastShownDate === 'string' ? old.lastShownDate : undefined,
            widgets: DEFAULT_ENABLED,
          };
        } catch { /* fallthrough */ }
      }
      return DEFAULT;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT;
    const widgets = Array.isArray(parsed.widgets)
      ? (parsed.widgets as unknown[]).filter((w): w is BriefingWidgetId =>
          typeof w === 'string' && (ALL_WIDGETS as string[]).includes(w))
      : DEFAULT_ENABLED;
    return {
      autoShow: typeof parsed.autoShow === 'boolean' ? parsed.autoShow : false,
      lastShownDate: typeof parsed.lastShownDate === 'string' ? parsed.lastShownDate : undefined,
      widgets: widgets.length > 0 ? widgets : DEFAULT_ENABLED,
    };
  } catch {
    return DEFAULT;
  }
};

const safeWrite = (s: BriefingSettings): void => {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* silent */ }
};

const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dailyBriefingStore = {
  getSettings: (): BriefingSettings => safeRead(),
  setAutoShow: (v: boolean): void => safeWrite({ ...safeRead(), autoShow: v }),
  markShownToday: (): void => safeWrite({ ...safeRead(), lastShownDate: todayKey() }),

  /** 위젯 활성/비활성 토글. enabled=true 면 끝에 추가, false 면 제거. */
  toggleWidget: (id: BriefingWidgetId, enabled: boolean): void => {
    const cur = safeRead();
    const has = cur.widgets.includes(id);
    if (enabled && !has) safeWrite({ ...cur, widgets: [...cur.widgets, id] });
    else if (!enabled && has) safeWrite({ ...cur, widgets: cur.widgets.filter((w) => w !== id) });
  },

  /** 위젯 순서 변경 — fromIdx 의 위젯을 toIdx 위치로 이동. */
  moveWidget: (fromIdx: number, toIdx: number): void => {
    const cur = safeRead();
    if (fromIdx < 0 || fromIdx >= cur.widgets.length) return;
    const next = [...cur.widgets];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(Math.max(0, Math.min(next.length, toIdx)), 0, moved);
    safeWrite({ ...cur, widgets: next });
  },

  /** 한 칸 위로. */
  moveUp: (id: BriefingWidgetId): void => {
    const cur = safeRead();
    const idx = cur.widgets.indexOf(id);
    if (idx <= 0) return;
    const next = [...cur.widgets];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    safeWrite({ ...cur, widgets: next });
  },
  moveDown: (id: BriefingWidgetId): void => {
    const cur = safeRead();
    const idx = cur.widgets.indexOf(id);
    if (idx < 0 || idx >= cur.widgets.length - 1) return;
    const next = [...cur.widgets];
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    safeWrite({ ...cur, widgets: next });
  },

  /** 기본 set 으로 복귀. */
  resetWidgets: (): void => safeWrite({ ...safeRead(), widgets: DEFAULT_ENABLED }),

  shouldAutoShow: (): boolean => {
    const s = safeRead();
    if (!s.autoShow) return false;
    return s.lastShownDate !== todayKey();
  },
};
