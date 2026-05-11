/**
 * 데일리 브리핑 설정·표시 이력.
 *
 * - autoShow: 매일 첫 접속 시 자동 표시
 * - lastShownDate: 마지막으로 표시한 날짜(YYYY-MM-DD). 같은 날이면 다시 안 띄움.
 *
 * localStorage 만 — 가벼움, 기기별로 독립.
 */

const SETTINGS_KEY = 'personai.daily-briefing.v1';

interface BriefingSettings {
  /** 매일 첫 접속 시 자동 표시 여부. 기본 false. */
  autoShow: boolean;
  /** 마지막 표시 날짜 (로컬 YYYY-MM-DD). */
  lastShownDate?: string;
}

const DEFAULT: BriefingSettings = { autoShow: false };

const safeRead = (): BriefingSettings => {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT;
    return {
      autoShow: typeof parsed.autoShow === 'boolean' ? parsed.autoShow : false,
      lastShownDate: typeof parsed.lastShownDate === 'string' ? parsed.lastShownDate : undefined,
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const dailyBriefingStore = {
  getSettings: (): BriefingSettings => safeRead(),
  setAutoShow: (v: boolean): void => safeWrite({ ...safeRead(), autoShow: v }),
  markShownToday: (): void => safeWrite({ ...safeRead(), lastShownDate: todayKey() }),

  /** 오늘 첫 접속인지 — autoShow 켜져있고 오늘 아직 안 띄웠으면 true. */
  shouldAutoShow: (): boolean => {
    const s = safeRead();
    if (!s.autoShow) return false;
    return s.lastShownDate !== todayKey();
  },
};
