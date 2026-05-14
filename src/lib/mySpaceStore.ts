/**
 * 내 공간 (My Space) — 퍼스널 위젯 대시보드 스토어.
 *
 * localStorage 기반. 위젯 타입별 설정을 union 으로 관리.
 * 좌측 드롭다운 컬럼 + 풀 페이지에서 공통 사용.
 */

export type WidgetKind =
  | 'bookmark'
  | 'memo'
  | 'checklist'
  | 'calculator'
  | 'worldclock'
  | 'timer'
  | 'quickvalue'
  | 'weather'
  | 'exchange'
  | 'calendar'
  | 'expert';

interface WidgetBase {
  id: string;
  kind: WidgetKind;
  size?: 'S' | 'M' | 'L';
}

export interface BookmarkWidget extends WidgetBase {
  kind: 'bookmark';
  title: string;
  url: string;
  favicon?: string;
}

export interface MemoWidget extends WidgetBase {
  kind: 'memo';
  title?: string;
  body: string;
}

export interface ChecklistWidget extends WidgetBase {
  kind: 'checklist';
  title: string;
  items: Array<{ id: string; text: string; done: boolean }>;
}

export interface CalculatorWidget extends WidgetBase {
  kind: 'calculator';
}

export interface WorldClockWidget extends WidgetBase {
  kind: 'worldclock';
  label: string;
  timeZone: string; // e.g. 'Asia/Seoul', 'America/New_York'
}

export interface TimerWidget extends WidgetBase {
  kind: 'timer';
  label: string;
  minutes: number; // default 25 (뽀모도로)
}

export interface QuickValueWidget extends WidgetBase {
  kind: 'quickvalue';
  label: string;
  value: string;
}

export interface WeatherWidget extends WidgetBase {
  kind: 'weather';
  city: string;
  lat: number;
  lon: number;
}

export interface ExchangeWidget extends WidgetBase {
  kind: 'exchange';
  from: string; // 'USD'
  to: string;   // 'KRW'
}

export interface CalendarWidget extends WidgetBase {
  kind: 'calendar';
}

export interface ExpertShortcutWidget extends WidgetBase {
  kind: 'expert';
  expertId: string;
  label: string;
  emoji?: string;
}

export type WidgetItem =
  | BookmarkWidget
  | MemoWidget
  | ChecklistWidget
  | CalculatorWidget
  | WorldClockWidget
  | TimerWidget
  | QuickValueWidget
  | WeatherWidget
  | ExchangeWidget
  | CalendarWidget
  | ExpertShortcutWidget;

const STORAGE_KEY = 'personai.mySpace.v1';

export function loadWidgets(): WidgetItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 'serendipity' 위젯은 제거됨 — 기존 저장 값이 있으면 조용히 필터링.
    return (parsed as Array<{ kind?: string }>).filter(
      (w): w is WidgetItem => w?.kind !== 'serendipity',
    );
  } catch {
    return [];
  }
}

export function saveWidgets(widgets: WidgetItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  } catch {
    /* quota or privacy mode */
  }
}

export function newWidgetId(): string {
  return `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** 간단한 pub/sub — 같은 탭 내 여러 컴포넌트가 같은 데이터 공유. */
type Listener = (items: WidgetItem[]) => void;
const listeners = new Set<Listener>();
let cache: WidgetItem[] | null = null;

export function getWidgets(): WidgetItem[] {
  if (cache === null) cache = loadWidgets();
  return cache;
}

export function setWidgets(next: WidgetItem[]): void {
  cache = next;
  saveWidgets(next);
  listeners.forEach((l) => l(next));
}

export function subscribeWidgets(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function addWidget(w: WidgetItem): void {
  setWidgets([...getWidgets(), w]);
}

export function removeWidget(id: string): void {
  setWidgets(getWidgets().filter((w) => w.id !== id));
}

export function updateWidget<T extends WidgetItem>(id: string, patch: Partial<T>): void {
  setWidgets(getWidgets().map((w) => (w.id === id ? ({ ...w, ...patch } as WidgetItem) : w)));
}

export function reorderWidget(fromIdx: number, toIdx: number): void {
  const arr = [...getWidgets()];
  const [moved] = arr.splice(fromIdx, 1);
  arr.splice(toIdx, 0, moved);
  setWidgets(arr);
}

/** 위젯 타입별 기본 인스턴스 생성기. */
export function createDefaultWidget(kind: WidgetKind): WidgetItem {
  const id = newWidgetId();
  switch (kind) {
    case 'bookmark':  return { id, kind, title: '새 북마크', url: 'https://' };
    case 'memo':      return { id, kind, title: '메모', body: '' };
    case 'checklist': return { id, kind, title: '할 일', items: [] };
    case 'calculator':return { id, kind };
    case 'worldclock':return { id, kind, label: '서울', timeZone: 'Asia/Seoul' };
    case 'timer':     return { id, kind, label: '뽀모도로', minutes: 25 };
    case 'quickvalue':return { id, kind, label: '라벨', value: '' };
    case 'weather':   return { id, kind, city: '서울', lat: 37.5665, lon: 126.9780 };
    case 'exchange':  return { id, kind, from: 'USD', to: 'KRW' };
    case 'calendar':  return { id, kind };
    case 'expert':    return { id, kind, expertId: '', label: '전문가' };
  }
}

export const WIDGET_META: Record<WidgetKind, { label: string; emoji: string; desc: string }> = {
  bookmark:  { label: '북마크',     emoji: '🔖', desc: '자주 가는 사이트' },
  memo:      { label: '메모',       emoji: '📝', desc: '짧은 글·할 일' },
  checklist: { label: '체크리스트', emoji: '✅', desc: '오늘의 할 일' },
  calculator:{ label: '계산기',     emoji: '🧮', desc: '빠른 계산' },
  worldclock:{ label: '세계시간',   emoji: '🕐', desc: '타임존별 현재 시각' },
  timer:     { label: '타이머',     emoji: '⏱', desc: '뽀모도로·집중' },
  quickvalue:{ label: '빠른 값',    emoji: '🔢', desc: '클릭 복사 텍스트' },
  weather:   { label: '날씨',       emoji: '☀️', desc: '도시별 기온' },
  exchange:  { label: '환율',       emoji: '💱', desc: '실시간 환율' },
  calendar:    { label: '달력',         emoji: '📅', desc: '이번 달' },
  expert:      { label: '전문가',       emoji: '⭐', desc: '바로 대화' },
};

export const WIDGET_ORDER: WidgetKind[] = [
  'bookmark','memo','checklist','quickvalue','calculator',
  'worldclock','timer','weather','exchange','calendar','expert',
];
