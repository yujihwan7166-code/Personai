/**
 * 통합 플래너 — /planner 라우트.
 *
 * UX 패턴 (다른 캘린더 앱 표준):
 * - 시간 이동: ←/→ 버튼 + 키보드 좌/우
 * - 오늘로: 'T' 키 + 버튼
 * - 현재 기간 라벨: 헤더에 명확히 표시
 *
 * 단축키 (input/textarea/contentEditable 안에서는 비활성):
 * - n: 인박스 빠른 추가 포커스 (필요 시 day 뷰로 전환)
 * - d/w/m/y/h: 뷰 전환 (day/week/month/year/habits)
 * - ← / →: 이전 / 다음 (시간 네비)
 * - t: 오늘로
 * - ?: 단축키 도움말
 * - / 또는 ⌘K(⌃K): 명령 팔레트
 */
import { useEffect, useId, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarClock,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  ListTodo,
  Plus,
  Search,
  Sparkles,
  Settings,
  X,
} from 'lucide-react';
import { MainModeTabs, type MainModeTabsApi } from '@/components/MainModeTabs';
import { HiddenInteractiveMount } from '@/components/HiddenInteractiveMount';
import { ModeErrorBoundary } from '@/components/ModeErrorBoundary';
import { MAIN_MODE_LABELS, type MainMode, type PremiumDomainId } from '@/types/expert';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type DragMoveEvent,
} from '@dnd-kit/core';
import { PlannerSidebar } from '@/components/planner/PlannerSidebar';
import { PlannerLeftRail } from '@/components/planner/PlannerLeftRail';
import { RAIL_EVENT } from '@/components/planner/plannerRailEvents';
import { PlannerAIPanel } from '@/components/planner/ai/PlannerAIPanel';
import { PlannerTrashDialog } from '@/components/planner/PlannerTrashDialog';
import { PlannerLibraryPanel } from '@/components/planner/PlannerLibraryPanel';
import { TodayTimeline } from '@/components/planner/TodayTimeline';
import { TodayScheduledList } from '@/components/planner/TodayScheduledList';
import { TodayTodoList } from '@/components/planner/TodayTodoList';
import { useTodayTasks } from '@/hooks/planner/useTodayTasks';
import { usePlannerNotifications } from '@/hooks/planner/usePlannerNotifications';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useBackdropDismiss } from '@/hooks/useBackdropDismiss';
import { useScrollLock } from '@/hooks/useScrollLock';
import { WeekView } from '@/components/planner/WeekView';
import { MonthView } from '@/components/planner/MonthView';
import { YearView } from '@/components/planner/YearView';
import { HabitsView } from '@/components/planner/HabitsView';
import { ShortcutHelpDialog } from '@/components/planner/ShortcutHelpDialog';
import { type PlannerView } from '@/components/planner/ViewToggle';
import { TaskScheduleDialog } from '@/components/planner/TaskScheduleDialog';
import { PlannerMatrixPopover } from '@/components/planner/PlannerMatrixPopover';
import { PlannerAgendaPopover } from '@/components/planner/PlannerAgendaPopover';
import { PlannerCommandPalette, type CommandAction } from '@/components/planner/PlannerCommandPalette';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import type { PlannerLibraryItem } from '@/services/planner/libraryStore';
import { notify } from '@/lib/notify';
import { editThisOnly } from '@/lib/planner/seriesEdit';
import { isInstanceId, parseInstanceId } from '@/lib/planner/recurrence';
import { getSnapMin } from '@/lib/planner/snapMin';
import { moveIntervalToLocalDayStart } from '@/lib/planner/timeRange';
import { nextHalfHourSlot } from '@/lib/planner/timeSlots';
import { buildWeekSchedulePatch, buildWeekTodoMovePatch, defaultWeekScheduleTime } from '@/lib/planner/weekDrag';
import { nextTodoOrderForDay } from '@/lib/planner/todoOrder';
import { toDateKey } from '@/lib/planner/habitStats';
import { formatDurationMinutes } from '@/lib/formatDuration';
import { useWindowEvent } from '@/hooks/useWindowEvent';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { PAGE_AI_PANEL_WIDTH, clampPageAiPanelWidth } from '@/components/PageAiTokens';
import {
  DRAG_ACTIVATION_DISTANCE,
  transposeTimeToDate,
  type PlannerDragData,
  type PlannerDropData,
} from '@/components/planner/dnd/plannerDndTypes';
import { cn } from '@/lib/utils';

const taskStoreSnapshot = () => taskStore.list();
const plannerCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
};
const PLANNER_VIEW_STORAGE_KEY = 'planner.view.v1';
const PLANNER_VIEWS: PlannerView[] = ['day', 'week', 'month', 'year', 'habits'];
const isPlannerView = (value: string | null): value is PlannerView =>
  !!value && PLANNER_VIEWS.includes(value as PlannerView);

const PLANNER_VIEW_META: Record<PlannerView, { label: string; shortcut: string }> = {
  day: { label: '일', shortcut: 'D' },
  week: { label: '주', shortcut: 'W' },
  month: { label: '월', shortcut: 'M' },
  year: { label: '연도', shortcut: 'Y' },
  habits: { label: '습관', shortcut: 'H' },
};

import type { PlannerEvent, PlannerTask, Priority } from '@/types/planner';

type DialogMode =
  | {
      kind: 'schedule';
      taskId: string;
      initialTitle: string;
      initialStart?: string;
      initialEnd?: string;
      initialPriority?: Priority;
      initialNote?: string;
      initialPinned?: boolean;
    }
  | { kind: 'create'; presetStartIso: string; presetIsEvent?: boolean };

type WeekScheduleTimePromptState = {
  task: PlannerTask;
  dayKey: string;
  copy: boolean;
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const getOverlineText = (secondary?: string): string | null => {
  if (!secondary) return null;
  if (secondary === '오늘') return 'TODAY';
  if (secondary === '내일') return 'TOMORROW';
  if (secondary === '어제') return 'YESTERDAY';
  return secondary.toUpperCase();
};

const formatDragTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

const formatDragDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

type HeaderSearchResult =
  | { type: 'task'; task: PlannerTask; score: number; label: string; meta: string; detail?: string }
  | { type: 'event'; event: PlannerEvent; score: number; label: string; meta: string; detail?: string };

const HEADER_SEARCH_LIMIT = 8;
const HEADER_SEARCH_SUGGESTION_LIMIT = 6;

const normalizeSearchText = (value?: string): string =>
  (value ?? '').trim().toLocaleLowerCase('ko-KR');

const formatSearchDate = (iso?: string): string => {
  if (!iso) return '날짜 없음';
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
};

const formatSearchDateTime = (startIso?: string, endIso?: string): string => {
  if (!startIso) return '시간 미배정';
  const date = formatSearchDate(startIso);
  const start = formatDragTime(startIso);
  if (!endIso) return `${date} ${start}`;
  return `${date} ${start}-${formatDragTime(endIso)}`;
};

const scoreSearchText = (query: string, title: string, extra = ''): number => {
  const q = normalizeSearchText(query);
  const t = normalizeSearchText(title);
  const e = normalizeSearchText(extra);
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  if (e.includes(q)) return 35;
  return 0;
};

const buildHeaderSearchResults = (query: string): HeaderSearchResult[] => {
  const q = normalizeSearchText(query);
  if (!q) return [];

  const taskResults: HeaderSearchResult[] = taskStore
    .list()
    .map((task) => {
      const extra = [task.note, ...(task.tags ?? []), task.plannedFor].filter(Boolean).join(' ');
      const score = scoreSearchText(q, task.title, extra);
      if (score === 0) return null;
      const isScheduled = Boolean(task.startAt);
      const taskDateMeta = task.plannedFor
        ? formatSearchDate(`${task.plannedFor}T09:00:00`)
        : '시간 미배정';
      return {
        type: 'task' as const,
        task,
        score: score + (task.done ? -8 : 0) + (isScheduled ? 4 : 0),
        label: task.title,
        meta: isScheduled ? formatSearchDateTime(task.startAt, task.endAt) : `할 일 · ${taskDateMeta}`,
        detail: task.done ? '완료됨' : task.canceled ? '취소됨' : isScheduled ? '시간 배정됨' : '할 일',
      };
    })
    .filter((result): result is HeaderSearchResult => Boolean(result));

  const eventResults: HeaderSearchResult[] = eventStore
    .list()
    .map((event) => {
      const score = scoreSearchText(q, event.title);
      if (score === 0) return null;
      return {
        type: 'event' as const,
        event,
        score: score + 2,
        label: event.title,
        meta: formatSearchDateTime(event.startAt, event.endAt),
        detail: '일정',
      };
    })
    .filter((result): result is HeaderSearchResult => Boolean(result));

  return [...taskResults, ...eventResults]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aIso = a.type === 'task' ? a.task.startAt ?? a.task.plannedFor ?? a.task.createdAt : a.event.startAt;
      const bIso = b.type === 'task' ? b.task.startAt ?? b.task.plannedFor ?? b.task.createdAt : b.event.startAt;
      return String(aIso).localeCompare(String(bIso));
    })
    .slice(0, HEADER_SEARCH_LIMIT);
};

const searchResultIso = (result: HeaderSearchResult): string => {
  if (result.type === 'event') return result.event.startAt;
  return result.task.startAt ?? (result.task.plannedFor ? `${result.task.plannedFor}T09:00:00` : result.task.createdAt);
};

const buildHeaderSearchSuggestions = (anchorIso: string): HeaderSearchResult[] => {
  const anchorKey = toDateKey(new Date(anchorIso));
  const now = Date.now();

  const taskResults: HeaderSearchResult[] = taskStore
    .list()
    .filter((task) => !task.done && !task.canceled)
    .map((task) => {
      const isScheduled = Boolean(task.startAt);
      const dayKey = task.startAt ? toDateKey(new Date(task.startAt)) : task.plannedFor;
      return {
        type: 'task' as const,
        task,
        score: (dayKey === anchorKey ? 30 : 0) + (isScheduled ? 12 : 0) + (task.pinned ? 8 : 0),
        label: task.title,
        meta: isScheduled ? formatSearchDateTime(task.startAt, task.endAt) : `할 일 · ${task.plannedFor ? formatSearchDate(`${task.plannedFor}T09:00:00`) : '날짜 없음'}`,
        detail: isScheduled ? '일정화' : '할 일',
      };
    });

  const eventResults: HeaderSearchResult[] = eventStore
    .list()
    .map((event) => ({
      type: 'event' as const,
      event,
      score: toDateKey(new Date(event.startAt)) === anchorKey ? 34 : 10,
      label: event.title,
      meta: formatSearchDateTime(event.startAt, event.endAt),
      detail: '일정',
    }));

  return [...taskResults, ...eventResults]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aTime = new Date(searchResultIso(a)).getTime();
      const bTime = new Date(searchResultIso(b)).getTime();
      const aFuture = aTime >= now ? 0 : 1;
      const bFuture = bTime >= now ? 0 : 1;
      if (aFuture !== bFuture) return aFuture - bFuture;
      return Math.abs(aTime - now) - Math.abs(bTime - now);
    })
    .slice(0, HEADER_SEARCH_SUGGESTION_LIMIT);
};

const taskDragRestorePatch = (task: PlannerTask): Partial<Omit<PlannerTask, 'id' | 'createdAt'>> => ({
  startAt: task.startAt,
  endAt: task.endAt,
  plannedFor: task.plannedFor,
  laneOrder: task.laneOrder,
  todoOrder: task.todoOrder,
  listId: task.listId,
});

const eventDragRestorePatch = (event: PlannerEvent): Partial<Omit<PlannerEvent, 'id' | 'createdAt'>> => ({
  startAt: event.startAt,
  endAt: event.endAt,
  laneOrder: event.laneOrder,
});

const isCopyModifierEvent = (event: Event | null | undefined): boolean =>
  Boolean(event && 'ctrlKey' in event && ((event as MouseEvent | KeyboardEvent).ctrlKey || (event as MouseEvent | KeyboardEvent).metaKey));

const duplicateTaskInput = (
  task: PlannerTask,
  patch: Partial<Omit<PlannerTask, 'id' | 'createdAt' | 'done'>> & { done?: boolean },
): Omit<PlannerTask, 'id' | 'createdAt' | 'done'> & { done?: boolean } => ({
  title: task.title,
  startAt: task.startAt,
  endAt: task.endAt,
  allDay: task.allDay,
  goalId: task.goalId,
  milestoneId: task.milestoneId,
  plannedFor: task.plannedFor,
  status: undefined,
  priority: task.priority,
  color: task.color,
  note: task.note,
  pinned: undefined,
  canceled: undefined,
  someday: task.someday,
  sourceRecordingId: task.sourceRecordingId,
  sourceRecordingTitle: task.sourceRecordingTitle,
  sourceActionIndex: task.sourceActionIndex,
  recurrence: undefined,
  tags: task.tags ? [...task.tags] : undefined,
  subtasks: task.subtasks ? task.subtasks.map((subtask) => ({ ...subtask })) : undefined,
  listId: task.listId,
  seriesCompletions: undefined,
  laneOrder: undefined,
  todoOrder: undefined,
  deletedAt: undefined,
  done: false,
  ...patch,
});

const duplicateEventInput = (
  event: PlannerEvent,
  patch: Partial<Omit<PlannerEvent, 'id' | 'createdAt'>>,
): Omit<PlannerEvent, 'id' | 'createdAt'> => ({
  title: event.title,
  startAt: event.startAt,
  endAt: event.endAt,
  allDay: event.allDay,
  color: event.color,
  source: event.source,
  recurrence: undefined,
  laneOrder: undefined,
  deletedAt: undefined,
  ...patch,
});

const Planner = () => {
  // Day 뷰 공통 input — NL 라우팅(시간 있으면 일정/타임라인, 없으면 할 일).
  const dayInputRef = useRef<HTMLInputElement>(null);
  const headerSearchInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const showTimeline = useMediaQuery('(min-width: 1024px)');
  const isCompactHeader = useMediaQuery('(max-width: 639px)');
  const [view, setViewState] = useState<PlannerView>(() => {
    const viewParam = searchParams.get('view');
    if (isPlannerView(viewParam)) return viewParam;
    if (typeof window === 'undefined') return 'day';
    try {
      const stored = window.localStorage.getItem(PLANNER_VIEW_STORAGE_KEY);
      return isPlannerView(stored) ? stored : 'day';
    } catch {
      return 'day';
    }
  });
  const setView = useCallback((next: PlannerView | ((prev: PlannerView) => PlannerView)) => {
    setViewState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      if (typeof window !== 'undefined') {
        try { window.localStorage.setItem(PLANNER_VIEW_STORAGE_KEY, resolved); } catch { /* silent */ }
      }
      return resolved;
    });
  }, []);
  // Rail "모드" → MainModeTabs 패널을 플래너 위에 플로팅. 외부 트리거용 apiRef.
  const mainModeTabsApiRef = useRef<MainModeTabsApi | null>(null);
  const [anchorIso, setAnchorIso] = useState(() => {
    // ?date=YYYY-MM-DD 로 사이드바 미니캘린더에서 점프 가능.
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const m = dateParam.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const [, y, mo, d] = m;
        const dt = new Date(Number(y), Number(mo) - 1, Number(d), 9, 0, 0);
        if (!isNaN(dt.getTime())) return dt.toISOString();
      }
    }
    return new Date().toISOString();
  });
  // 진입 시 한 번만 ?date 소비.
  useEffect(() => {
    if (searchParams.has('date')) {
      const next = new URLSearchParams(searchParams);
      next.delete('date');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  useEffect(() => {
    const current = searchParams.get('view');
    if (view === 'day') {
      if (!current) return;
      const next = new URLSearchParams(searchParams);
      next.delete('view');
      setSearchParams(next, { replace: true });
      return;
    }
    if (current === view) return;
    const next = new URLSearchParams(searchParams);
    next.set('view', view);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, view]);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [pendingWeekSchedule, setPendingWeekSchedule] = useState<WeekScheduleTimePromptState | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [headerSearchOpen, setHeaderSearchOpen] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [headerSearchActiveIndex, setHeaderSearchActiveIndex] = useState(0);
  const headerSearchListboxId = useId();
  const [helpOpen, setHelpOpen] = useState(false);
  const [matrixPopoverOpen, setMatrixPopoverOpen] = useState(false);
  const [agendaPopoverOpen, setAgendaPopoverOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem('planner.ai-panel.open') === '1'; } catch { return false; }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('planner.ai-panel.open', aiPanelOpen ? '1' : '0'); } catch { /* silent */ }
  }, [aiPanelOpen]);

  // AI 패널 너비 — 메모/일기 AI와 같은 기본 폭으로 시작하되 사용자가 줄인 폭도 보존.
  const [aiPanelWidth, setAiPanelWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return PAGE_AI_PANEL_WIDTH.default;
    try {
      const raw = window.localStorage.getItem('planner.ai-panel.width');
      const n = raw ? Number(raw) : NaN;
      if (!Number.isFinite(n)) return PAGE_AI_PANEL_WIDTH.default;
      return clampPageAiPanelWidth(n);
    } catch { return PAGE_AI_PANEL_WIDTH.default; }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('planner.ai-panel.width', String(aiPanelWidth)); } catch { /* silent */ }
  }, [aiPanelWidth]);

  // 일 뷰: 좌측 할일/일정 계획 패널 접기 상태
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = window.localStorage.getItem('planner.task-panel.open');
      return stored !== '0';
    } catch {
      return true;
    }
  });
  const toggleTaskPanel = useCallback(() => {
    setIsTaskPanelOpen((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try { window.localStorage.setItem('planner.task-panel.open', next ? '1' : '0'); } catch { /* silent */ }
      }
      return next;
    });
  }, []);

  const todayTasks = useTodayTasks();
  const showTimelinePanel = showTimeline;
  // 5분 전 + 시작 시점 브라우저 알림 (권한 있을 때만).
  usePlannerNotifications();

  // Things3 Today Badge — 페이지 타이틀에 미완료 카운트 노출.
  // 원본 타이틀은 mount 시점 1회만 캡처 (count 바뀔 때마다 캡처하면 "(N) 통합 플래너" 가 원본으로 잘못 저장됨).
  const originalTitleRef = useRef<string>('');
  useEffect(() => {
    originalTitleRef.current = document.title;
    return () => {
      document.title = originalTitleRef.current;
    };
  }, []);
  useEffect(() => {
    const count = todayTasks.length;
    document.title = count > 0 ? `(${count}) 통합 플래너` : '통합 플래너';
  }, [todayTasks.length]);

  const handleDayClick = useCallback((dayIso: string) => {
    setAnchorIso(dayIso);
    setView('day');
  }, [setView]);

  const handleMonthClick = useCallback((monthIso: string) => {
    setAnchorIso(monthIso);
    setView('month');
  }, [setView]);

  const handleInboxClick = useCallback((task: { id: string; title: string }) => {
    const full = taskStore.list().find((t) => t.id === task.id);
    // 시간 미정 task: 모달 기본 날짜를 plannedFor (계획 잡힌 날) 또는 현재 보고 있는 anchor 날짜로.
    // 이걸 안 하면 default = new Date() 로 잡혀, 사용자가 5/2 페이지에서 5/2 계획 항목 시간 배정해도
    // 모달 default 가 오늘(5/3 등)이라 startAt 이 다른 날로 저장되고 타임라인엔 안 보임.
    let initialStart: string | undefined;
    let initialEnd: string | undefined;
    if (full && !full.startAt) {
      const dayKey = full.plannedFor ?? toDateKey(new Date(anchorIso));
      // 로컬 자정 기준 09:00 으로 default — 사용자가 시간 input 만 바꾸면 그 날에 잘 떨어지도록.
      const start = new Date(`${dayKey}T09:00:00`);
      initialStart = start.toISOString();
      initialEnd = new Date(start.getTime() + 60 * 60_000).toISOString();
    } else if (full?.startAt) {
      initialStart = full.startAt;
      initialEnd = full.endAt;
    }
    setDialogMode({
      kind: 'schedule',
      taskId: task.id,
      initialTitle: task.title,
      initialStart,
      initialEnd,
      initialPriority: full?.priority,
      initialNote: full?.note,
      initialPinned: full?.pinned,
    });
  }, [anchorIso]);

  const handleSlotClick = useCallback((slotIso: string) => {
    setDialogMode({ kind: 'create', presetStartIso: slotIso, presetIsEvent: true });
  }, []);

  const handleItemClick = useCallback(
    (item: { kind: 'event' | 'task'; id: string; title: string; startAt: string; endAt: string }) => {
      if (item.kind === 'task') {
        const full = taskStore.list().find((t) => t.id === item.id);
        setDialogMode({
          kind: 'schedule',
          taskId: item.id,
          initialTitle: item.title,
          initialStart: item.startAt,
          initialEnd: item.endAt,
          initialPriority: full?.priority,
          initialNote: full?.note,
          initialPinned: full?.pinned,
        });
        return;
      }
      // 레거시 event — taskStore 로 마이그레이션 후 schedule 모달 열기.
      // (새 항목은 taskStore.add 로 직접 들어가지만 옛 eventStore 데이터 호환.)
      if (isInstanceId(item.id)) {
        notify.info('반복 일정 인스턴스는 시리즈에서 편집해 주세요', { duration: 1500 });
        return;
      }
      const ev = eventStore.findMaster(item.id);
      if (!ev) return;
      const newTask = taskStore.add({
        title: ev.title,
        startAt: ev.startAt,
        endAt: ev.endAt,
        recurrence: ev.recurrence,
      });
      eventStore.remove(ev.id);
      setDialogMode({
        kind: 'schedule',
        taskId: newTask.id,
        initialTitle: newTask.title,
        initialStart: newTask.startAt,
        initialEnd: newTask.endAt,
      });
    },
    [],
  );

  // 시간 이동 핸들러 — view 에 따라 ±1 day/week/month/year.
  const shiftAnchor = useCallback((direction: -1 | 1) => {
    setAnchorIso((prev) => {
      const d = new Date(prev);
      if (view === 'day') d.setDate(d.getDate() + direction);
      else if (view === 'week') d.setDate(d.getDate() + 7 * direction);
      else if (view === 'month') d.setMonth(d.getMonth() + direction);
      else if (view === 'year') d.setFullYear(d.getFullYear() + direction);
      return d.toISOString();
    });
  }, [view]);

  const goPrev = useCallback(() => shiftAnchor(-1), [shiftAnchor]);
  const goNext = useCallback(() => shiftAnchor(1), [shiftAnchor]);
  const goToday = useCallback(() => setAnchorIso(new Date().toISOString()), []);

  // 명령 팔레트 액션 라우터.
  const handleCommandAction = useCallback((action: CommandAction) => {
    switch (action.kind) {
      case 'view':
        setView(action.view);
        break;
      case 'today':
        setAnchorIso(new Date().toISOString());
        setView('day');
        break;
      case 'shift': {
        const d = new Date();
        d.setDate(d.getDate() + action.days);
        setAnchorIso(d.toISOString());
        setView('day');
        break;
      }
      case 'newTask':
        setView('day');
        // day 뷰의 공통 input 으로 포커스 (palette 닫힘 후).
        setTimeout(() => dayInputRef.current?.focus(), 50);
        break;
      case 'newAtNow': {
        setDialogMode({ kind: 'create', presetStartIso: nextHalfHourSlot().toISOString(), presetIsEvent: true });
        break;
      }
      case 'jumpToTask': {
        if (action.startAt) {
          setAnchorIso(action.startAt);
          setView('day');
        } else {
          // 인박스 → 시간 배정 모달.
          const task = taskStoreSnapshot().find((t) => t.id === action.id);
          if (task) {
            setDialogMode({ kind: 'schedule', taskId: task.id, initialTitle: task.title });
          }
        }
        break;
      }
      case 'jumpToEvent':
        setAnchorIso(action.startAt);
        setView('day');
        break;
    }
  }, [setView]);

  useEffect(() => {
    if (!headerSearchOpen) return;
    const id = window.setTimeout(() => headerSearchInputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [headerSearchOpen]);

  const closeHeaderSearch = useCallback(() => {
    setHeaderSearchOpen(false);
    setHeaderSearchQuery('');
    setHeaderSearchActiveIndex(0);
  }, []);

  useEffect(() => {
    if (!headerSearchOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('[data-planner-header-tools="true"]')) return;
      closeHeaderSearch();
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [closeHeaderSearch, headerSearchOpen]);

  const headerSearchResults = useMemo(
    () => buildHeaderSearchResults(headerSearchQuery),
    [headerSearchQuery],
  );
  const headerSearchSuggestions = useMemo(
    () => buildHeaderSearchSuggestions(anchorIso),
    [anchorIso],
  );
  const trimmedHeaderSearchQuery = headerSearchQuery.trim();
  const headerSearchPanelResults = useMemo(
    () => (trimmedHeaderSearchQuery ? headerSearchResults : headerSearchSuggestions),
    [headerSearchResults, headerSearchSuggestions, trimmedHeaderSearchQuery],
  );
  const headerSearchActiveResult = headerSearchPanelResults[headerSearchActiveIndex];
  const headerSearchActiveOptionId = headerSearchActiveResult
    ? `${headerSearchListboxId}-option-${headerSearchActiveIndex}`
    : undefined;

  useEffect(() => {
    setHeaderSearchActiveIndex(0);
  }, [trimmedHeaderSearchQuery]);

  useEffect(() => {
    if (!headerSearchOpen) {
      setHeaderSearchActiveIndex(0);
      return;
    }
    setHeaderSearchActiveIndex((current) => {
      const max = headerSearchPanelResults.length - 1;
      if (max < 0) return 0;
      return Math.min(current, max);
    });
  }, [headerSearchOpen, headerSearchPanelResults.length]);

  const selectHeaderSearchResult = useCallback((result: HeaderSearchResult) => {
    if (result.type === 'task') {
      const task = result.task;
      if (task.startAt) {
        setAnchorIso(task.startAt);
        setView('day');
      }
      setDialogMode({
        kind: 'schedule',
        taskId: task.id,
        initialTitle: task.title,
        initialStart: task.startAt,
        initialEnd: task.endAt,
        initialPriority: task.priority,
        initialNote: task.note,
        initialPinned: task.pinned,
      });
    } else {
      setAnchorIso(result.event.startAt);
      setView('day');
      notify.info('일정 위치로 이동했어요', { duration: 1200 });
    }
    closeHeaderSearch();
  }, [closeHeaderSearch, setView]);

  const runHeaderSearch = useCallback(() => {
    const q = trimmedHeaderSearchQuery;
    if (!q && headerSearchPanelResults.length === 0) {
      setHeaderSearchOpen(true);
      headerSearchInputRef.current?.focus();
      return;
    }

    const selectedResult = headerSearchPanelResults[headerSearchActiveIndex] ?? headerSearchPanelResults[0];
    if (selectedResult) {
      selectHeaderSearchResult(selectedResult);
      return;
    }

    notify.info('일치하는 할 일이나 일정이 없어요', { duration: 1400 });
    headerSearchInputRef.current?.focus();
    return;

  }, [headerSearchActiveIndex, headerSearchPanelResults, selectHeaderSearchResult, trimmedHeaderSearchQuery]);

  const createTaskFromHeaderSearch = useCallback((scheduled: boolean) => {
    const title = headerSearchQuery.trim();
    if (!title) return;

    if (scheduled) {
      const anchor = new Date(anchorIso);
      const today = new Date();
      const start = new Date(anchor);
      if (toDateKey(anchor) === toDateKey(today)) {
        const slot = nextHalfHourSlot(today);
        start.setHours(slot.getHours(), slot.getMinutes(), 0, 0);
      } else {
        start.setHours(9, 0, 0, 0);
      }
      const end = new Date(start.getTime() + 60 * 60_000);
      const task = taskStore.add({
        title,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        plannedFor: toDateKey(start),
      });
      setAnchorIso(start.toISOString());
      setView('day');
      setDialogMode({
        kind: 'schedule',
        taskId: task.id,
        initialTitle: task.title,
        initialStart: task.startAt,
        initialEnd: task.endAt,
      });
      notify.success('오늘 일정으로 만들었어요', { description: title, duration: 1800 });
    } else {
      const dayKey = toDateKey(new Date(anchorIso));
      const task = taskStore.add({ title, plannedFor: dayKey });
      setDialogMode({
        kind: 'schedule',
        taskId: task.id,
        initialTitle: task.title,
      });
      notify.success('할 일로 추가했어요', { description: title, duration: 1800 });
    }

    closeHeaderSearch();
  }, [anchorIso, closeHeaderSearch, headerSearchQuery, setView]);

  // anchor 가 오늘과 같은 기간인지 (Today 버튼 dim 판정).
  const anchorIsToday = useMemo(() => {
    const a = new Date(anchorIso);
    const today = new Date();
    if (view === 'day') return isSameDay(a, today);
    if (view === 'week') {
      const start = new Date(a);
      start.setDate(a.getDate() - a.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return today >= start && today < end;
    }
    if (view === 'month') return a.getFullYear() === today.getFullYear() && a.getMonth() === today.getMonth();
    return a.getFullYear() === today.getFullYear();
  }, [anchorIso, view]);

  const periodLabel = useMemo(() => {
    const d = new Date(anchorIso);
    if (view === 'day') {
      return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
    }
    if (view === 'week') {
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startFmt = start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
      const endFmt = end.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
      return `${startFmt} ~ ${endFmt}`;
    }
    if (view === 'month') return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
    return `${d.getFullYear()}년`;
  }, [anchorIso, view]);

  // 헤더 라벨 — 시인성을 극대화하기 위해 구체적인 '오늘 날짜'를 최우선 맨 처음에 크게(primary) 보여주고,
  // 해당 날짜가 '오늘' 또는 '내일' 인지 여부는 보조 라벨(secondary)로 뒤따르게 하여 자연스러운 시선 흐름 제공.
  const headerLabels = useMemo<{ primary: string; secondary?: string }>(() => {
    if (view === 'habits') {
      const t = new Date();
      const fullLabel = t.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
      return { primary: fullLabel, secondary: '오늘' };
    }
    if (view === 'week' && isCompactHeader) {
      const d = new Date(anchorIso);
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startFmt = `${start.getMonth() + 1}.${start.getDate()}`;
      const endFmt = `${end.getMonth() + 1}.${end.getDate()}`;
      return { primary: `${startFmt} ~ ${endFmt}` };
    }
    if (view !== 'day') return { primary: periodLabel };
    const d = new Date(anchorIso);
    const t = new Date();
    const tm = new Date(t); tm.setDate(t.getDate() + 1);
    const fullLabel = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
    if (isSameDay(d, t)) return { primary: fullLabel, secondary: '오늘' };
    if (isSameDay(d, tm)) return { primary: fullLabel, secondary: '내일' };
    return { primary: fullLabel };
  }, [anchorIso, isCompactHeader, view, periodLabel]);

  // 키보드 단축키.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // INPUT/TEXTAREA/contentEditable 외에도 Radix combobox(role="combobox")·search role 도 입력으로 간주.
      const isTyping = !!target && (
        target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.isContentEditable
        || target.getAttribute('role') === 'combobox'
        || target.getAttribute('role') === 'searchbox'
      );
      if (isTyping) return;
      // 모달·팝오버·AI 패널 떠있으면 글로벌 뷰 전환 단축키 모두 차단.
      // (Esc/?는 그래도 받고 싶지만 단순화: 모두 차단)
      if (dialogMode || paletteOpen || helpOpen || matrixPopoverOpen || agendaPopoverOpen || trashOpen || aiPanelOpen) {
        // helpOpen 인 경우 ? 로 다시 닫지 못하면 답답하니 ? 만 통과.
        if (helpOpen && e.key === '?') {
          e.preventDefault();
          setHelpOpen(false);
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'n':
          // n = day 뷰 공통 input 포커스 (현재 뷰가 day 가 아니면 day 로 전환).
          e.preventDefault();
          if (view !== 'day') setView('day');
          setTimeout(() => dayInputRef.current?.focus(), 50);
          break;
        case 'd': e.preventDefault(); setView('day'); break;
        case 'w': e.preventDefault(); setView('week'); break;
        case 'm': e.preventDefault(); setView('month'); break;
        case 'y': e.preventDefault(); setView('year'); break;
        case 'h': e.preventDefault(); setView('habits'); break;
        case 't': e.preventDefault(); goToday(); break;
        case 'arrowleft':  e.preventDefault(); goPrev(); break;
        case 'arrowright': e.preventDefault(); goNext(); break;
        case '?': e.preventDefault(); setHelpOpen(true); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, dialogMode, paletteOpen, helpOpen, matrixPopoverOpen, agendaPopoverOpen, trashOpen, libraryOpen, aiPanelOpen, goPrev, goNext, goToday, setView]);

  // ── Rail 이벤트 핸들러 ── (useWindowEvent 로 보일러플레이트 제거)
  const handleOpenPalette = useCallback(() => setHeaderSearchOpen(true), []);
  const handleOpenMatrix = useCallback(() => setMatrixPopoverOpen(true), []);
  const handleOpenAgenda = useCallback(() => setAgendaPopoverOpen(true), []);
  const handleOpenHabits = useCallback(() => setView('habits'), [setView]);
  const handleOpenTrash = useCallback(() => setTrashOpen(true), []);
  const handleOpenLibrary = useCallback(() => setLibraryOpen(true), []);
  const handleGoToday = useCallback(() => {
    setView('day');
    goToday();
  }, [goToday, setView]);
  const handleToggleAI = useCallback(() => setAiPanelOpen((v) => !v), []);
  // 모드 — apiRef 가 첫 렌더 직후라 미주입 가능 → rAF 3회 retry 후 안내.
  const handleOpenModePalette = useCallback(() => {
    const tryOpen = (retries: number) => {
      if (mainModeTabsApiRef.current) {
        mainModeTabsApiRef.current.open();
        return;
      }
      if (retries <= 0) {
        notify.info('모드 패널을 잠시 후 다시 시도해주세요', { duration: 1500 });
        return;
      }
      requestAnimationFrame(() => tryOpen(retries - 1));
    };
    tryOpen(3);
  }, []);

  useWindowEvent(RAIL_EVENT.openPalette, handleOpenPalette);
  useWindowEvent(RAIL_EVENT.openMatrix, handleOpenMatrix);
  useWindowEvent(RAIL_EVENT.openAgenda, handleOpenAgenda);
  useWindowEvent(RAIL_EVENT.openHabits, handleOpenHabits);
  useWindowEvent(RAIL_EVENT.openLibrary, handleOpenLibrary);
  useWindowEvent(RAIL_EVENT.openTrash, handleOpenTrash);
  useWindowEvent(RAIL_EVENT.goToday, handleGoToday);
  useWindowEvent(RAIL_EVENT.openModePalette, handleOpenModePalette);
  useWindowEvent(RAIL_EVENT.toggleAI, handleToggleAI);

  // MainModeTabs labels prop — MAIN_MODE_LABELS 에서 label 만 추출.
  const mainModeLabelMap = useMemo(() => {
    const out: Partial<Record<MainMode, string>> = {};
    for (const [k, v] of Object.entries(MAIN_MODE_LABELS)) {
      out[k as MainMode] = (v as { label: string }).label;
    }
    return out as Record<MainMode, string>;
  }, []);

  // 모드 선택 → 홈으로 이동, 해당 모드 자동 활성화 (Index.tsx 가 location.state 처리).
  const handleSelectMainMode = useCallback((m: MainMode) => {
    navigate('/', { state: { selectMainMode: m } });
  }, [navigate]);

  const handleSelectPremiumDomain = useCallback((domainId: PremiumDomainId) => {
    navigate('/', { state: { selectMainMode: 'premium_main', selectPremiumDomain: domainId } });
  }, [navigate]);

  const isFullscreen = view === 'year' || view === 'habits';

  // ────── DnD ──────
  // 드래그 기준점 (5px) 으로 클릭과 분리.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE } }),
    useSensor(KeyboardSensor),
  );

  // 드래그 중 미리보기 상태 — DragOverlay 가 사용.
  const [activeDrag, setActiveDrag] = useState<{ data: PlannerDragData; deltaY: number } | null>(null);
  const dragCopyModeRef = useRef(false);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const data = e.active.data.current as PlannerDragData | undefined;
    if (data) setActiveDrag({ data, deltaY: 0 });
    dragCopyModeRef.current = isCopyModifierEvent((e as DragStartEvent & { activatorEvent?: Event }).activatorEvent);
  }, []);

  useEffect(() => {
    if (!activeDrag) return;
    const updateCopyMode = (event: KeyboardEvent) => {
      dragCopyModeRef.current = event.ctrlKey || event.metaKey;
    };
    window.addEventListener('keydown', updateCopyMode);
    window.addEventListener('keyup', updateCopyMode);
    return () => {
      window.removeEventListener('keydown', updateCopyMode);
      window.removeEventListener('keyup', updateCopyMode);
    };
  }, [activeDrag]);

  const handleDragMove = useCallback((e: DragMoveEvent) => {
    setActiveDrag((prev) => (prev ? { ...prev, deltaY: e.delta.y } : prev));
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDrag(null);
    dragCopyModeRef.current = false;
  }, []);

  // 드래그 중 시간 미리보기 (DragOverlay).
  // - scheduled (시간표 안 이동): 블록 자체가 transform 으로 따라옴 + 블록 안 라이브 라벨로 충분 → null
  // - inbox-task (대기함 → 시간표): 새 task 라 위치 미정, 작은 라벨 칩만 마우스 옆에 표시
  // - resize: 네이티브 pointer event 가 처리, 블록 안 inline chip
  const previewLabel = useMemo(() => {
    if (!activeDrag) return null;
    const { data } = activeDrag;
    if (data.kind === 'inbox-task' || data.kind === 'planned-task') {
      return data.task.title;
    }
    if (data.kind === 'library-template') {
      return data.item.title;
    }
    return null;
  }, [activeDrag]);

  /** 가상 인스턴스 id 가 들어왔을 때 master + occurrenceIso 분해. 없으면 null. */
  const tryDetachInstance = useCallback(
    (
      id: string,
      kind: 'task' | 'event',
      newStart: string,
      newEnd: string,
    ): boolean => {
      if (!isInstanceId(id)) return false;
      const parsed = parseInstanceId(id);
      if (!parsed) return false;
      if (kind === 'task') {
        const master = taskStore.findMaster(parsed.masterId);
        if (!master) return false;
        editThisOnly(taskStore, master, parsed.occurrenceIso, { startAt: newStart, endAt: newEnd });
      } else {
        const master = eventStore.findMaster(parsed.masterId);
        if (!master) return false;
        editThisOnly(eventStore, master, parsed.occurrenceIso, { startAt: newStart, endAt: newEnd });
      }
      return true;
    },
    [],
  );

  const addLibraryItemToSlot = useCallback((item: PlannerLibraryItem, startIso: string) => {
    const start = new Date(startIso);
    const durationMin = Math.max(15, item.durationMin || 60);
    const end = new Date(start.getTime() + durationMin * 60_000).toISOString();

    taskStore.add({
      title: item.title,
      startAt: startIso,
      endAt: end,
      color: item.color,
      priority: item.priority,
      note: item.note,
    });

    notify.success(`보관함에서 ${formatDragTime(startIso)}에 추가했어요`, {
      description: item.title,
      duration: 2400,
    });
  }, []);

  const addLibraryItemToTodoDay = useCallback((item: PlannerLibraryItem, dayKey: string) => {
    taskStore.add({
      title: item.title,
      plannedFor: dayKey,
      color: item.color,
      priority: item.priority,
      note: item.note,
    });
    notify.success(`보관함에서 ${formatDragDate(`${dayKey}T00:00:00`)} 할 일로 추가했어요`, {
      description: item.title,
      duration: 2400,
    });
  }, []);

  const addLibraryItemToCalendarDay = useCallback((item: PlannerLibraryItem, dayKey: string) => {
    const durationMin = Math.max(15, item.durationMin || 60);
    const start = new Date(`${dayKey}T09:00:00`);
    const end = new Date(start.getTime() + durationMin * 60_000).toISOString();
    taskStore.add({
      title: item.title,
      startAt: start.toISOString(),
      endAt: end,
      color: item.color,
      priority: item.priority,
      note: item.note,
    });
    notify.success(`보관함에서 ${formatDragDate(start.toISOString())} 09:00에 추가했어요`, {
      description: item.title,
      duration: 2400,
    });
  }, []);

  const addLibraryItemQuick = useCallback((item: PlannerLibraryItem) => {
    const anchorDayKey = toDateKey(new Date(anchorIso));
    addLibraryItemToTodoDay(item, anchorDayKey);
  }, [addLibraryItemToTodoDay, anchorIso]);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const dragData = e.active.data.current as PlannerDragData | undefined;
    type AssignListDropData = { kind: 'assign-list'; listId: string };
    const rawDropData = e.over?.data.current as
      | PlannerDropData | AssignListDropData | undefined;
    const dropData = rawDropData && 'kind' in rawDropData
      && rawDropData.kind !== 'assign-list'
      ? (rawDropData as PlannerDropData)
      : undefined;
    setActiveDrag(null);
    // 모든 분기에서 reset 보장 — early return 누락으로 다음 드래그가 잘못된 상태를 쓰는 버그 방지.
    const copyDrag = dragCopyModeRef.current;
    dragCopyModeRef.current = false;

    if (!dragData) {
      return;
    }

    // ─── List 트리에 드롭: 분류 변경 ───
    if (
      rawDropData &&
      'kind' in rawDropData &&
      rawDropData.kind === 'assign-list' &&
      (dragData.kind === 'inbox-task' || dragData.kind === 'planned-task' || dragData.kind === 'scheduled-task')
    ) {
      const task = dragData.task;
      const targetId = isInstanceId(task.id)
        ? (parseInstanceId(task.id)?.masterId ?? task.id)
        : task.id;
      const previousListId = task.listId;
      taskStore.update(targetId, { listId: (rawDropData as AssignListDropData).listId });
      notify.success('분류를 바꿨어요', {
        duration: 3500,
        action: { label: '되돌리기', onClick: () => taskStore.update(targetId, { listId: previousListId }) },
      });
      return;
    }

    // resize 는 DraggableBlock 안 네이티브 pointer event 가 처리 — 여기서는 무시.

    if (!dropData) return;

    if (dragData.kind === 'library-template') {
      if (dropData.kind === 'time-slot') {
        addLibraryItemToSlot(dragData.item, dropData.startIso);
        return;
      }
      if (dropData.kind === 'day-column') {
        addLibraryItemToCalendarDay(dragData.item, toDateKey(new Date(dropData.dayIso)));
        return;
      }
      if (dropData.kind === 'schedule-day') {
        addLibraryItemToCalendarDay(dragData.item, dropData.dayKey);
        return;
      }
      if (dropData.kind === 'todo-list') {
        addLibraryItemToTodoDay(dragData.item, dropData.dayKey);
        return;
      }
      if (dropData.kind === 'inbox') {
        taskStore.add({
          title: dragData.item.title,
          color: dragData.item.color,
          priority: dragData.item.priority,
          note: dragData.item.note,
        });
        notify.success('보관함에서 할 일로 추가했어요', {
          description: dragData.item.title,
          duration: 2400,
        });
        return;
      }
    }

    // ─── 인박스 → 시간 슬롯: 시간 배정 ───
    // 기본 길이 = 사용자 snap × 2 (15→30, 30→60). 너무 짧으면 클릭하기 어려움.
    if ((dragData.kind === 'inbox-task' || dragData.kind === 'planned-task') && dropData.kind === 'time-slot') {
      const start = dropData.startIso;
      const blockMin = Math.max(30, getSnapMin() * 2);
      const end = new Date(new Date(start).getTime() + blockMin * 60_000).toISOString();
      if (copyDrag) {
        const copied = taskStore.add(duplicateTaskInput(dragData.task, {
          startAt: start,
          endAt: end,
          plannedFor: undefined,
          laneOrder: undefined,
        }));
        notify.success(`${formatDragTime(start)}~${formatDragTime(end)}에 복제했어요`, {
          description: '원본은 그대로 두었습니다.',
          duration: 4200,
          action: { label: '되돌리기', onClick: () => taskStore.remove(copied.id) },
        });
        return;
      }
      const restore = taskDragRestorePatch(dragData.task);
      taskStore.schedule(dragData.task.id, start, end);
      notify.success(`${formatDragTime(start)}~${formatDragTime(end)}에 배정했어요`, {
        description: '할 일이 타임라인으로 이동했습니다.',
        duration: 4200,
        action: { label: '되돌리기', onClick: () => taskStore.update(dragData.task.id, restore) },
      });
      return;
    }

    if ((dragData.kind === 'inbox-task' || dragData.kind === 'planned-task') && dropData.kind === 'schedule-day') {
      setPendingWeekSchedule({
        task: dragData.task,
        dayKey: dropData.dayKey,
        copy: copyDrag,
      });
      return;
    }

    if ((dragData.kind === 'inbox-task' || dragData.kind === 'planned-task') && dropData.kind === 'todo-list') {
      const targetKey = dropData.dayKey;
      if (!copyDrag && dragData.task.plannedFor === targetKey && !dragData.task.startAt) return;
      const todoPatch = {
        ...buildWeekTodoMovePatch(targetKey),
        todoOrder: nextTodoOrderForDay(taskStore.list(), targetKey, dragData.task.id),
      };

      if (copyDrag) {
        const copied = taskStore.add(duplicateTaskInput(dragData.task, todoPatch));
        notify.success(`${formatDragDate(`${targetKey}T00:00:00`)} 할 일로 복제했어요`, {
          description: dragData.task.title,
          duration: 4200,
          action: { label: '되돌리기', onClick: () => taskStore.remove(copied.id) },
        });
        return;
      }

      const restore = taskDragRestorePatch(dragData.task);
      taskStore.update(dragData.task.id, todoPatch);
      notify.success(`${formatDragDate(`${targetKey}T00:00:00`)} 할 일로 옮겼어요`, {
        description: dragData.task.title,
        duration: 4200,
        action: { label: '되돌리기', onClick: () => taskStore.update(dragData.task.id, restore) },
      });
      return;
    }

    // ─── 시간 블록 → 시간 슬롯: 시간 변경 (길이 유지) ───
    // 긴 블록은 rect 교차량이 아니라 포인터가 놓인 시간 슬롯을 새 시작점으로 삼는다.
    // 종료 시각은 자정에 자르지 않는다. 예: 22:00 + 4시간 = 다음날 02:00.
    if (
      (dragData.kind === 'scheduled-task' || dragData.kind === 'scheduled-event') &&
      dropData.kind === 'time-slot'
    ) {
      const item = dragData.kind === 'scheduled-task' ? dragData.task : dragData.event;
      if (!item.startAt || !item.endAt) {
        notify.warning('이 항목은 시간이 없어 이동할 수 없어요', { duration: 1500 });
        return;
      }
      const snap = getSnapMin();
      const moved = moveIntervalToLocalDayStart(
        item.startAt,
        item.endAt,
        dropData.startIso,
        dropData.startIso,
        snap * 60_000,
      );
      const newStart = moved.startAt;
      const newEnd = moved.endAt;
      const newStartDate = new Date(newStart);
      const dur = moved.durationMs;
      const restoreTask = dragData.kind === 'scheduled-task' ? taskDragRestorePatch(dragData.task) : null;
      const restoreEvent = dragData.kind === 'scheduled-event' ? eventDragRestorePatch(dragData.event) : null;

      // 가로 드래그 = lane 좌/우 swap. 임계 60px.
      // 단, 겹치는 다른 항목이 0개면 lane 개념 자체가 무의미 — swap 생략 + "순서도 변경" 거짓 알림 방지.
      // dayPrefix 는 로컬 날짜 기준 (ISO slice 는 UTC 라 자정 넘는 케이스에서 다른 날짜로 잘못 잡힘).
      const LANE_SWAP_THRESHOLD = 60;
      let newLaneOrder: number | undefined;
      if (Math.abs(e.delta.x) > LANE_SWAP_THRESHOLD) {
        const yyyy = newStartDate.getFullYear();
        const mm = String(newStartDate.getMonth() + 1).padStart(2, '0');
        const dd = String(newStartDate.getDate()).padStart(2, '0');
        const localDayAnchor = `${yyyy}-${mm}-${dd}T00:00:00`;
        const newStartMs = newStartDate.getTime();
        const newEndMs = newStartMs + dur;
        type WithLane = { id: string; startAt?: string; endAt?: string; laneOrder?: number };
        const overlapping: WithLane[] = [
          ...taskStore.listScheduled(localDayAnchor),
          ...eventStore.listByDate(localDayAnchor),
        ].filter((other) => {
          if (other.id === item.id) return false;
          if (!other.startAt || !other.endAt) return false;
          const oS = new Date(other.startAt).getTime();
          const oE = new Date(other.endAt).getTime();
          return oS < newEndMs && oE > newStartMs;
        });
        if (overlapping.length > 0) {
          const orders = overlapping.map((o) => o.laneOrder ?? 0);
          newLaneOrder = e.delta.x < 0
            ? Math.min(...orders) - 1
            : Math.max(...orders) + 1;
        }
      }

      if (copyDrag) {
        const copied = dragData.kind === 'scheduled-task'
          ? taskStore.add(duplicateTaskInput(dragData.task, {
              startAt: newStart,
              endAt: newEnd,
              plannedFor: undefined,
              laneOrder: newLaneOrder,
            }))
          : eventStore.add(duplicateEventInput(dragData.event, {
              startAt: newStart,
              endAt: newEnd,
              ...(newLaneOrder !== undefined && { laneOrder: newLaneOrder }),
            }));
        notify.success(`${formatDragTime(newStart)}~${formatDragTime(newEnd)}에 복제했어요`, {
          description: '원본은 그대로 두었습니다.',
          duration: 4200,
          action: {
            label: '되돌리기',
            onClick: () => {
              if (dragData.kind === 'scheduled-task') taskStore.remove(copied.id);
              if (dragData.kind === 'scheduled-event') eventStore.remove(copied.id);
            },
          },
        });
        return;
      }

      if (dragData.kind === 'scheduled-task') {
        if (!tryDetachInstance(item.id, 'task', newStart, newEnd)) {
          taskStore.schedule(item.id, newStart, newEnd);
          if (newLaneOrder !== undefined) {
            taskStore.update(item.id, { laneOrder: newLaneOrder });
          }
        }
      } else {
        if (!tryDetachInstance(item.id, 'event', newStart, newEnd)) {
          eventStore.update(item.id, {
            startAt: newStart,
            endAt: newEnd,
            ...(newLaneOrder !== undefined && { laneOrder: newLaneOrder }),
          });
        }
      }
      const canUndo = !isInstanceId(item.id);
      notify.success(
        newLaneOrder !== undefined
          ? `${formatDragTime(newStart)}~${formatDragTime(newEnd)}로 옮기고 겹침 순서도 바꿨어요`
          : `${formatDragTime(newStart)}~${formatDragTime(newEnd)}로 옮겼어요`,
        {
          duration: 4200,
          ...(canUndo ? {
            action: {
              label: '되돌리기',
              onClick: () => {
                if (dragData.kind === 'scheduled-task' && restoreTask) taskStore.update(item.id, restoreTask);
                if (dragData.kind === 'scheduled-event' && restoreEvent) eventStore.update(item.id, restoreEvent);
              },
            },
          } : {}),
        },
      );
      return;
    }

    // ─── 시간 블록 → 다른 day column: 시:분 유지, 날짜 교체 ───
    if (
      (dragData.kind === 'scheduled-task' || dragData.kind === 'scheduled-event') &&
      (dropData.kind === 'day-column' || dropData.kind === 'schedule-day')
    ) {
      const item = dragData.kind === 'scheduled-task' ? dragData.task : dragData.event;
      if (!item.startAt || !item.endAt) {
        notify.warning('이 항목은 시간이 없어 이동할 수 없어요', { duration: 1500 });
        return;
      }
      const oldStart = new Date(item.startAt);
      const dur = new Date(item.endAt).getTime() - oldStart.getTime();
      const targetDay = dropData.kind === 'schedule-day'
        ? new Date(`${dropData.dayKey}T00:00:00`)
        : new Date(dropData.dayIso);
      const newStart = transposeTimeToDate(oldStart, targetDay).toISOString();
      const newEnd = new Date(new Date(newStart).getTime() + dur).toISOString();
      const restoreTask = dragData.kind === 'scheduled-task' ? taskDragRestorePatch(dragData.task) : null;
      const restoreEvent = dragData.kind === 'scheduled-event' ? eventDragRestorePatch(dragData.event) : null;

      if (copyDrag) {
        const copied = dragData.kind === 'scheduled-task'
          ? taskStore.add(duplicateTaskInput(dragData.task, {
              startAt: newStart,
              endAt: newEnd,
              plannedFor: undefined,
              laneOrder: undefined,
            }))
          : eventStore.add(duplicateEventInput(dragData.event, {
              startAt: newStart,
              endAt: newEnd,
              laneOrder: undefined,
            }));
        notify.success(`${formatDragDate(newStart)} ${formatDragTime(newStart)}에 복제했어요`, {
          description: '원본은 그대로 두고 같은 시간으로 복제했습니다.',
          duration: 4200,
          action: {
            label: '되돌리기',
            onClick: () => {
              if (dragData.kind === 'scheduled-task') taskStore.remove(copied.id);
              if (dragData.kind === 'scheduled-event') eventStore.remove(copied.id);
            },
          },
        });
        return;
      }

      if (dragData.kind === 'scheduled-task') {
        if (!tryDetachInstance(item.id, 'task', newStart, newEnd)) {
          taskStore.schedule(item.id, newStart, newEnd);
        }
      } else {
        if (!tryDetachInstance(item.id, 'event', newStart, newEnd)) {
          eventStore.update(item.id, { startAt: newStart, endAt: newEnd });
        }
      }
      const canUndo = !isInstanceId(item.id);
      notify.success(`${formatDragDate(newStart)} ${formatDragTime(newStart)}로 옮겼어요`, {
        description: '시간은 그대로 유지했습니다.',
        duration: 4200,
        ...(canUndo ? {
          action: {
            label: '되돌리기',
            onClick: () => {
              if (dragData.kind === 'scheduled-task' && restoreTask) taskStore.update(item.id, restoreTask);
              if (dragData.kind === 'scheduled-event' && restoreEvent) eventStore.update(item.id, restoreEvent);
            },
          },
        } : {}),
      });
      return;
    }

    // ─── 날짜만 있는 할 일 → 다른 day column: 시간 없이 날짜만 변경 ───
    if (dragData.kind === 'planned-task' && dropData.kind === 'day-column') {
      const targetKey = toDateKey(new Date(dropData.dayIso));
      if (!copyDrag && dragData.task.plannedFor === targetKey) return;
      const todoPatch = {
        ...buildWeekTodoMovePatch(targetKey),
        todoOrder: nextTodoOrderForDay(taskStore.list(), targetKey, dragData.task.id),
      };
      if (copyDrag) {
        const copied = taskStore.add(duplicateTaskInput(dragData.task, todoPatch));
        notify.success(`${formatDragDate(dropData.dayIso)} 할 일로 복제했어요`, {
          description: '원본은 그대로 두었습니다.',
          duration: 4200,
          action: { label: '되돌리기', onClick: () => taskStore.remove(copied.id) },
        });
        return;
      }
      const restore = taskDragRestorePatch(dragData.task);
      taskStore.update(dragData.task.id, todoPatch);
      notify.success(`${formatDragDate(dropData.dayIso)} 할 일로 옮겼어요`, {
        duration: 4200,
        action: { label: '되돌리기', onClick: () => taskStore.update(dragData.task.id, restore) },
      });
      return;
    }

    // ─── 인박스 → 다른 day column: 그날 09:00 기본 배정 ───
    if (dragData.kind === 'inbox-task' && dropData.kind === 'day-column') {
      const targetDay = new Date(dropData.dayIso);
      targetDay.setHours(9, 0, 0, 0);
      const newStart = targetDay.toISOString();
      const newEnd = new Date(targetDay.getTime() + 30 * 60_000).toISOString();
      if (copyDrag) {
        const copied = taskStore.add(duplicateTaskInput(dragData.task, {
          startAt: newStart,
          endAt: newEnd,
          plannedFor: undefined,
          laneOrder: undefined,
        }));
        notify.success(`${formatDragDate(newStart)} 09:00에 복제했어요`, {
          description: '원본은 그대로 두었습니다.',
          duration: 4200,
          action: { label: '되돌리기', onClick: () => taskStore.remove(copied.id) },
        });
        return;
      }
      const restore = taskDragRestorePatch(dragData.task);
      taskStore.schedule(dragData.task.id, newStart, newEnd);
      notify.success(`${formatDragDate(newStart)} 09:00에 배정했어요`, {
        description: '다른 날짜로 옮기며 기본 시간에 올렸습니다.',
        duration: 4200,
        action: { label: '되돌리기', onClick: () => taskStore.update(dragData.task.id, restore) },
      });
      return;
    }

    // ─── 시간 블록 → 인박스: 시간 해제 (시리즈는 detach 후 단발 변환) ───
    if (
      (dragData.kind === 'scheduled-task' || dragData.kind === 'scheduled-event') &&
      dropData.kind === 'inbox'
    ) {
      // 일정(Event) 은 인박스 개념 없음 — 무시.
      if (dragData.kind === 'scheduled-event') {
        notify.warning('캘린더 일정은 할 일로 바로 바꿀 수 없어요', {
          description: '시간 배정된 할 일은 아래 할 일 영역으로 되돌릴 수 있어요.',
          duration: 2200,
        });
        return;
      }
      const task = dragData.task;
      const restore = taskDragRestorePatch(task);
      if (copyDrag) {
        const copied = taskStore.add(duplicateTaskInput(task, {
          startAt: undefined,
          endAt: undefined,
          plannedFor: undefined,
          laneOrder: undefined,
        }));
        notify.info('시간을 비운 복사본을 만들었어요', {
          description: '원본은 그대로 두었습니다.',
          duration: 4200,
          action: { label: '되돌리기', onClick: () => taskStore.remove(copied.id) },
        });
        return;
      }
      if (isInstanceId(task.id)) {
        // 시리즈 인스턴스를 인박스로 → detach + unschedule.
        const parsed = parseInstanceId(task.id);
        if (!parsed) return;
        const master = taskStore.findMaster(parsed.masterId);
        if (!master) return;
        // exdate 추가 + 인박스 항목으로 신규 (시간 없음).
        editThisOnly(taskStore, master, parsed.occurrenceIso, {
          startAt: undefined,
          endAt: undefined,
        });
      } else {
        taskStore.unschedule(task.id);
      }
      notify.info('시간을 빼고 인박스로 돌렸어요', {
        description: '할 일 자체는 유지되고 시간 배정만 제거됐습니다.',
        duration: 4200,
        ...(!isInstanceId(task.id) ? {
          action: { label: '되돌리기', onClick: () => taskStore.update(task.id, restore) },
        } : {}),
      });
      return;
    }

    // ─── 시간 블록 → 좌하 "할 일" 박스: 시간 빼고 plannedFor=오늘 (일정 → 할 일 변환) ───
    if (
      (dragData.kind === 'scheduled-task' || dragData.kind === 'scheduled-event') &&
      dropData.kind === 'todo-list'
    ) {
      // event 는 task 가 아니라 무시.
      if (dragData.kind === 'scheduled-event') {
        notify.warning('캘린더 일정은 할 일로 바로 바꿀 수 없어요', {
          description: '시간 배정된 할 일은 아래 할 일 영역으로 되돌릴 수 있어요.',
          duration: 2200,
        });
        return;
      }
      const task = dragData.task;
      const dayKey = dropData.dayKey;
      const todoPatch = {
        ...buildWeekTodoMovePatch(dayKey),
        todoOrder: nextTodoOrderForDay(taskStore.list(), dayKey, task.id),
      };
      const restore = taskDragRestorePatch(task);
      if (copyDrag) {
        const copied = taskStore.add(duplicateTaskInput(task, todoPatch));
        notify.success(`${formatDragDate(`${dayKey}T00:00:00`)} 할 일로 복제했어요`, {
          description: '원본은 그대로 두었습니다.',
          duration: 4200,
          action: { label: '되돌리기', onClick: () => taskStore.remove(copied.id) },
        });
        return;
      }
      if (isInstanceId(task.id)) {
        const parsed = parseInstanceId(task.id);
        if (!parsed) return;
        const master = taskStore.findMaster(parsed.masterId);
        if (!master) return;
        editThisOnly(taskStore, master, parsed.occurrenceIso, todoPatch);
      } else {
        taskStore.update(task.id, todoPatch);
      }
      notify.success(`${formatDragDate(`${dayKey}T00:00:00`)} 할 일로 돌렸어요`, {
        description: '시간만 제거하고 할 일 목록에 남겼습니다.',
        duration: 4200,
        ...(!isInstanceId(task.id) ? {
          action: { label: '되돌리기', onClick: () => taskStore.update(task.id, restore) },
        } : {}),
      });
    }
  }, [addLibraryItemToCalendarDay, addLibraryItemToSlot, addLibraryItemToTodoDay, tryDetachInstance]);

  const headerOverlineText = getOverlineText(headerLabels.secondary);
  const currentViewMeta = PLANNER_VIEW_META[view];
  const openCreateEvent = useCallback(() => {
    const anchor = new Date(anchorIso);
    const today = new Date();
    const isSame = toDateKey(anchor) === toDateKey(today);
    const preset = new Date(anchor);
    if (isSame) {
      const slot = nextHalfHourSlot(today);
      preset.setHours(slot.getHours(), slot.getMinutes(), 0, 0);
    } else {
      preset.setHours(9, 0, 0, 0);
    }
    setDialogMode({
      kind: 'create',
      presetStartIso: preset.toISOString(),
      presetIsEvent: true,
    });
  }, [anchorIso]);

  const openCreateEventForDay = useCallback((dayIso: string) => {
    const anchor = new Date(dayIso);
    const today = new Date();
    const isSame = toDateKey(anchor) === toDateKey(today);
    const preset = new Date(anchor);
    if (isSame) {
      const slot = nextHalfHourSlot(today);
      preset.setHours(slot.getHours(), slot.getMinutes(), 0, 0);
    } else {
      preset.setHours(9, 0, 0, 0);
    }
    setDialogMode({
      kind: 'create',
      presetStartIso: preset.toISOString(),
      presetIsEvent: true,
    });
  }, []);

  const openCreateTodoForDay = useCallback((dayIso: string) => {
    const day = new Date(dayIso);
    day.setHours(9, 0, 0, 0);
    setDialogMode({
      kind: 'create',
      presetStartIso: day.toISOString(),
      presetIsEvent: false,
    });
  }, []);

  const openCreateTodo = useCallback(() => {
    const day = new Date(anchorIso);
    day.setHours(9, 0, 0, 0);
    setDialogMode({
      kind: 'create',
      presetStartIso: day.toISOString(),
      presetIsEvent: false,
    });
  }, [anchorIso]);

  const confirmPendingWeekSchedule = useCallback((time: string, durationMin: number) => {
    if (!pendingWeekSchedule) return;

    const schedulePatch = buildWeekSchedulePatch(pendingWeekSchedule.dayKey, time, durationMin);
    const start = schedulePatch.startAt!;
    const end = schedulePatch.endAt!;
    const task = pendingWeekSchedule.task;

    if (pendingWeekSchedule.copy) {
      const copied = taskStore.add(duplicateTaskInput(task, schedulePatch));
      notify.success(`${formatDragTime(start)}~${formatDragTime(end)} 일정으로 복제했어요`, {
        description: task.title,
        duration: 4200,
        action: { label: '되돌리기', onClick: () => taskStore.remove(copied.id) },
      });
      setPendingWeekSchedule(null);
      return;
    }

    const restore = taskDragRestorePatch(task);
    taskStore.update(task.id, schedulePatch);
    notify.success(`${formatDragTime(start)}~${formatDragTime(end)} 일정으로 옮겼어요`, {
      description: task.title,
      duration: 4200,
      action: { label: '되돌리기', onClick: () => taskStore.update(task.id, restore) },
    });
    setPendingWeekSchedule(null);
  }, [pendingWeekSchedule]);

  const collapseContextSidebar = view === 'habits' && aiPanelOpen;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={plannerCollisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      autoScroll={{ threshold: { x: 0, y: 0.15 }, acceleration: 12 }}
    >
    <div className="planner-theme min-h-screen bg-background flex">
      <aside className="hidden h-screen w-12 shrink-0 border-r border-foreground/10 bg-card/35 sm:block">
        <PlannerLeftRail aiOpen={aiPanelOpen} />
      </aside>
      <main className="flex h-screen flex-1 min-w-0 flex-col overflow-hidden">
        <header className="relative z-40 shrink-0 border-b border-foreground/10 bg-background/95 px-3 py-1.5 shadow-[0_1px_0_hsl(var(--foreground)/0.03)] backdrop-blur sm:px-4">
          <div
            className={cn(
              'flex min-h-10 items-center gap-2',
              !aiPanelOpen && 'sm:pr-[calc(8rem+env(safe-area-inset-right))]',
            )}
          >
            <div className="min-w-0 flex-1 translate-y-1 px-1 sm:flex-none sm:pl-2 sm:pr-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1
                  className="truncate text-[28px] font-semibold leading-tight tracking-normal text-foreground sm:text-[36px]"
                  title={periodLabel}
                >
                  {headerLabels.primary}
                </h1>
                {headerOverlineText && (
                  <span className="hidden shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-[0.16em] text-primary sm:inline">
                    {headerOverlineText}
                  </span>
                )}
              </div>
            </div>

            <div className="hidden">
              <button
                type="button"
                onClick={goPrev}
                aria-label="이전"
                title="이전 (←)"
                className="inline-flex h-9 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.4} />
              </button>
              <button
                type="button"
                onClick={goToday}
                aria-label="오늘로"
                title="오늘로 (T)"
                className={cn(
                  'hidden h-9 shrink-0 items-center rounded-full border px-4 text-[13px] font-semibold transition-colors sm:inline-flex',
                  anchorIsToday
                    ? 'border-foreground/10 bg-transparent text-foreground/55'
                    : 'border-primary/25 bg-primary/8 text-primary hover:bg-primary/12',
                )}
              >
                오늘
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="다음"
                title="다음 (→)"
                className="inline-flex h-9 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </div>

            <div className="hidden flex-1 sm:block" />

            <div
              className="relative z-[45] ml-auto flex h-8 shrink-0 items-center gap-1"
              data-planner-header-tools="true"
            >
              <button
                type="button"
                onClick={() => setHeaderSearchOpen(true)}
                className={cn(
                  'hidden h-8 w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:outline-none focus-visible:ring-0 sm:inline-flex',
                  headerSearchOpen
                    ? 'rounded-l-lg rounded-r-none border border-r-0 border-foreground/30 bg-card'
                    : 'rounded-lg hover:bg-card',
                )}
                title="검색 (/ 또는 Ctrl/Cmd+K)"
                aria-label="플래너 검색"
              >
                <Search className="h-4 w-4" strokeWidth={2.2} />
              </button>
              <div
                className={cn(
                  'hidden h-8 shrink-0 items-center overflow-hidden rounded-r-lg rounded-l-none border border-l-0 bg-card shadow-[0_6px_16px_-14px_hsl(var(--foreground)/0.35)] transition-all duration-200 ease-out sm:inline-flex',
                  headerSearchOpen
                    ? 'w-[248px] border-foreground/30 px-2 opacity-100'
                    : 'w-0 border-transparent px-0 opacity-0',
                )}
                role="search"
                aria-hidden={!headerSearchOpen}
              >
                <input
                  ref={headerSearchInputRef}
                  value={headerSearchQuery}
                  onChange={(event) => {
                    setHeaderSearchQuery(event.target.value);
                    setHeaderSearchOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && headerSearchPanelResults.length > 0) {
                      event.preventDefault();
                      setHeaderSearchActiveIndex((current) => {
                        const max = headerSearchPanelResults.length - 1;
                        if (event.key === 'ArrowDown') return current >= max ? 0 : current + 1;
                        return current <= 0 ? max : current - 1;
                      });
                    }
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      runHeaderSearch();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      closeHeaderSearch();
                    }
                  }}
                  onBlur={() => {
                    if (!headerSearchQuery.trim()) setHeaderSearchOpen(false);
                  }}
                  placeholder="검색"
                  aria-label="검색어"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={headerSearchOpen}
                  aria-controls={headerSearchOpen ? headerSearchListboxId : undefined}
                  aria-activedescendant={headerSearchOpen ? headerSearchActiveOptionId : undefined}
                  className="h-full min-w-0 flex-1 bg-transparent px-1 text-[13px] font-medium text-foreground outline-none placeholder:text-muted-foreground/70 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                />
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={closeHeaderSearch}
                  className="inline-flex h-7 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="검색 닫기"
                  title="검색 닫기"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                </button>
              </div>
              {headerSearchOpen && (
                <div
                  className="absolute left-0 top-[38px] z-50 hidden w-[392px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-foreground/18 bg-card shadow-[0_18px_48px_-24px_hsl(var(--foreground)/0.4)] sm:block"
                  role="listbox"
                  id={headerSearchListboxId}
                  aria-label={trimmedHeaderSearchQuery ? '검색 결과' : '검색 추천'}
                >
                  <div className="flex items-center justify-between border-b border-foreground/10 px-3 py-2.5">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        {trimmedHeaderSearchQuery ? '검색 결과' : '빠른 이동'}
                        {headerSearchPanelResults.length > 0 && (
                          <span className="ml-1 tabular-nums text-foreground/70">{headerSearchPanelResults.length}</span>
                        )}
                      </p>
                      {!trimmedHeaderSearchQuery && (
                        <p className="mt-0.5 text-[10.5px] text-muted-foreground/75">
                          예정된 할 일과 일정을 바로 열 수 있어요.
                        </p>
                      )}
                    </div>
                    {trimmedHeaderSearchQuery && (
                      <span className="max-w-[170px] truncate rounded-md bg-foreground/[0.04] px-2 py-1 text-[10.5px] font-semibold text-foreground/65">
                        {trimmedHeaderSearchQuery}
                      </span>
                    )}
                  </div>
                  {headerSearchPanelResults.length === 0 ? (
                    trimmedHeaderSearchQuery ? (
                      <div className="px-3 py-4">
                        <div className="rounded-lg border border-dashed border-foreground/16 bg-muted/25 px-3 py-3 text-center">
                          <p className="text-[13px] font-semibold text-foreground">일치하는 항목이 없어요.</p>
                          <p className="mt-1 text-[11.5px] text-muted-foreground">
                            검색어를 새 할 일이나 오늘 일정으로 바로 만들 수 있어요.
                          </p>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => createTaskFromHeaderSearch(false)}
                            className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-foreground/12 bg-background text-[12px] font-semibold text-foreground transition-colors hover:border-primary/25 hover:bg-primary/5 hover:text-primary"
                          >
                            <ListTodo className="h-3.5 w-3.5" />
                            할 일로 추가
                          </button>
                          <button
                            type="button"
                            onClick={() => createTaskFromHeaderSearch(true)}
                            className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-primary/18 bg-primary/6 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/10"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            오늘 일정 만들기
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 py-5 text-center">
                        <Sparkles className="mx-auto h-4 w-4 text-muted-foreground/70" />
                        <p className="mt-2 text-[13px] font-semibold text-foreground">검색어를 입력해보세요.</p>
                        <p className="mt-1 text-[11.5px] text-muted-foreground">할 일 제목, 메모, 태그, 일정 제목을 찾을 수 있어요.</p>
                      </div>
                    )
                  ) : (
                    <div className="max-h-[360px] overflow-y-auto p-1.5">
                      {headerSearchPanelResults.map((result, index) => {
                        const selected = index === headerSearchActiveIndex;
                        const isTask = result.type === 'task';
                        const done = isTask && result.task.done;
                        const canceled = isTask && result.task.canceled;
                        const scheduled = isTask && Boolean(result.task.startAt);
                        const Icon = isTask
                          ? done
                            ? CheckCircle2
                            : scheduled
                              ? CalendarClock
                              : ListTodo
                          : CalendarClock;
                        return (
                          <button
                            key={`${result.type}-${isTask ? result.task.id : result.event.id}`}
                            type="button"
                            id={`${headerSearchListboxId}-option-${index}`}
                            onMouseEnter={() => setHeaderSearchActiveIndex(index)}
                            onClick={() => selectHeaderSearchResult(result)}
                            className={cn(
                              'group flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent focus:bg-accent',
                              selected && 'bg-accent/80',
                            )}
                            role="option"
                            aria-selected={selected}
                          >
                            <span className={cn(
                              'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors group-hover:text-foreground',
                              selected && 'border-primary/25 bg-primary/8 text-primary',
                            )}>
                              <Icon className="h-3.5 w-3.5" strokeWidth={2.15} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={cn(
                                'block truncate text-[13px] font-semibold leading-snug text-foreground',
                                (done || canceled) && 'text-foreground/55 line-through',
                              )}>
                                {result.label}
                              </span>
                              <span className="mt-0.5 block truncate text-[11.5px] font-medium text-muted-foreground">
                                {result.meta}
                              </span>
                            </span>
                            <span className="mt-1 shrink-0 rounded-full border border-foreground/10 bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              {result.detail}
                            </span>
                            <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-foreground/10 px-3 py-2 text-[10.5px] text-muted-foreground">
                    <span>{headerSearchPanelResults.length > 0 ? '↑↓ 이동 · Enter 열기' : '검색어 입력 후 Enter'}</span>
                    <span>Esc 닫기</span>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => notify.info('플래너 설정은 준비 중이에요', { duration: 1400 })}
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-foreground sm:inline-flex"
                title="설정"
                aria-label="플래너 설정"
              >
                <Settings className="h-4 w-4" strokeWidth={2.1} />
              </button>

              <div
                className="hidden h-8 shrink-0 items-center rounded-lg border border-foreground/35 bg-card p-0.5 shadow-[0_6px_16px_-14px_hsl(var(--foreground)/0.35)] sm:inline-flex"
                aria-label="날짜 이동"
              >
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="이전"
                  title="이전"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] text-muted-foreground transition-colors hover:bg-accent/80 hover:text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
                </button>
                <button
                  type="button"
                  onClick={goToday}
                  aria-label="오늘로"
                  title="오늘로 (T)"
                  className={cn(
                    'inline-flex h-7 min-w-[52px] items-center justify-center rounded-[7px] px-2 text-[12px] font-bold transition-colors',
                    anchorIsToday
                      ? 'text-foreground/60 hover:bg-accent/70 hover:text-foreground'
                      : 'bg-primary/[0.08] text-primary shadow-[0_1px_4px_hsl(var(--foreground)/0.08)] hover:bg-primary/[0.12]',
                  )}
                >
                  오늘
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="다음"
                  title="다음"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] text-muted-foreground transition-colors hover:bg-accent/80 hover:text-foreground"
                >
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                </button>
              </div>

              <div
                className="hidden h-8 shrink-0 items-center gap-0.5 rounded-[10px] border border-foreground/32 bg-[#f7f5ef] p-0.5 shadow-[inset_0_1px_2px_hsl(var(--foreground)/0.07),0_6px_16px_-14px_hsl(var(--foreground)/0.35)] min-[1180px]:inline-flex"
                role="tablist"
                aria-label="플래너 보기"
              >
                {PLANNER_VIEWS.map((nextView) => {
                  const meta = PLANNER_VIEW_META[nextView];
                  const active = nextView === view;
                  return (
                    <button
                      key={nextView}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setView(nextView)}
                      className={cn(
                        'relative inline-flex h-7 min-w-8 items-center justify-center rounded-[8px] px-2 text-[12px] font-semibold leading-none transition-colors',
                        active
                          ? 'border border-primary/25 bg-white text-foreground shadow-[0_1px_4px_hsl(var(--foreground)/0.10)]'
                          : 'border border-transparent text-foreground/62 hover:bg-white/45 hover:text-foreground/86',
                        nextView === 'habits' && 'min-w-10',
                      )}
                      title={`${meta.label} (${meta.shortcut})`}
                    >
                      {meta.label}
                      {active && (
                        <span
                          aria-hidden
                          className="absolute inset-x-2 bottom-0.5 h-0.5 rounded-full bg-primary/70"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-foreground/35 bg-card px-2 text-[12px] font-semibold text-foreground shadow-[0_6px_16px_-14px_hsl(var(--foreground)/0.35)] transition-colors hover:bg-accent min-[1180px]:hidden"
                    aria-label="뷰 선택"
                    title="뷰 선택"
                  >
                    {currentViewMeta.label}
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.2} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {PLANNER_VIEWS.map((nextView) => {
                    const meta = PLANNER_VIEW_META[nextView];
                    const active = nextView === view;
                    return (
                      <DropdownMenuItem
                        key={nextView}
                        onSelect={() => setView(nextView)}
                        className={cn(active && 'bg-primary/10 text-primary')}
                      >
                        <span className="flex-1">{meta.label}</span>
                        <DropdownMenuShortcut>{meta.shortcut}</DropdownMenuShortcut>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {!aiPanelOpen && (
                <button
                  type="button"
                  onClick={() => setAiPanelOpen(true)}
                  className="inline-flex h-8 w-[94px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-foreground/30 bg-card px-2 text-[12px] font-semibold text-muted-foreground shadow-[0_6px_16px_-14px_hsl(var(--foreground)/0.35)] transition-colors hover:border-foreground/40 hover:bg-primary/5 hover:text-primary"
                  title="보조 도구 열기"
                  aria-label="보조 도구 열기"
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
                  <span className="hidden sm:inline">보조 도구</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <ModeErrorBoundary
          modeLabel="통합 플래너"
          resetKey={`${view}:${anchorIso}`}
          onReset={() => {
            setAnchorIso(new Date().toISOString());
            setView('day');
          }}
        >
          <div
            className={cn(
              'grid flex-1 min-h-0 grid-cols-1 overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out',
              collapseContextSidebar
                ? 'md:grid-cols-[0px_minmax(0,1fr)]'
                : 'md:grid-cols-[248px_minmax(0,1fr)]',
            )}
          >
            <aside
              className={cn(
                'hidden min-h-0 overflow-hidden border-r bg-card/45 transition-[border-color,opacity,transform] duration-300 ease-in-out md:flex',
                collapseContextSidebar
                  ? 'pointer-events-none border-transparent opacity-0 -translate-x-2'
                  : 'border-foreground/10 opacity-100 translate-x-0',
              )}
            >
              <div className="min-h-0 w-[248px] flex-1 overflow-y-auto px-3 py-3 pr-4">
                <PlannerSidebar
                  anchorIso={anchorIso}
                  onSelectDay={(dayIso) => {
                    setAnchorIso(dayIso);
                    setView('day');
                  }}
                  onOpenHabits={() => setView('habits')}
                />
              </div>
            </aside>

            <section
              className={cn(
                'min-h-0 overflow-hidden bg-background',
                'p-0',
              )}
            >
              <div className="mb-2 max-h-[34vh] overflow-y-auto rounded-xl border border-foreground/10 bg-card/70 p-2 md:hidden">
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openCreateTodo}
                    className="inline-flex h-8 items-center rounded-full border border-foreground/10 px-3 text-[12px] font-semibold text-muted-foreground"
                  >
                    할 일
                  </button>
                </div>
                <PlannerSidebar
                  anchorIso={anchorIso}
                  onSelectDay={(dayIso) => {
                    setAnchorIso(dayIso);
                    setView('day');
                  }}
                  onOpenHabits={() => setView('habits')}
                />
              </div>

              {isFullscreen ? (
                <div
                  className={cn(
                    'h-full min-h-0 overflow-hidden bg-background',
                    'p-0',
                  )}
                >
                  {view === 'year' && (
                    <YearView
                      anchorIso={anchorIso}
                      onMonthClick={handleMonthClick}
                      onDayClick={handleDayClick}
                    />
                  )}
                  {view === 'habits' && <HabitsView />}
                </div>
              ) : view === 'day' ? (
                <div
                  className={cn(
                    'h-full min-h-0 min-w-0 grid grid-cols-1 gap-0 overflow-hidden transition-all duration-300 ease-in-out',
                    showTimelinePanel
                      ? isTaskPanelOpen
                        ? 'lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)] 2xl:grid-cols-[440px_minmax(0,1fr)]'
                        : 'lg:grid-cols-[minmax(0,1fr)]'
                      : 'lg:grid-cols-[minmax(0,760px)]',
                  )}
                >
                  <aside
                    className={cn(
                      'min-h-0 min-w-0 self-start overflow-hidden bg-card transition-all duration-300 lg:flex lg:flex-col lg:self-stretch',
                      showTimelinePanel && 'lg:border-r lg:border-foreground/10',
                      !showTimelinePanel && 'border-r border-foreground/10',
                      !isTaskPanelOpen && 'lg:hidden lg:w-0 lg:opacity-0 lg:overflow-hidden',
                    )}
                  >
                    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]">
                      <TodayScheduledList
                        anchorIso={anchorIso}
                        onTaskClick={(task) => handleInboxClick({ id: task.id, title: task.title })}
                        emptyHint={showTimelinePanel ? undefined : '+로 시간 잡힌 일정을 추가'}
                        onAdd={openCreateEvent}
                        embedded
                      />
                      <TodayTodoList
                        anchorIso={anchorIso}
                        onTaskClick={(task) => handleInboxClick({ id: task.id, title: task.title })}
                        onAdd={openCreateTodo}
                        embedded
                      />
                    </div>
                  </aside>
                  {showTimelinePanel && (
                    <div className="min-h-0 min-w-0 overflow-hidden bg-card" data-planner-timeline-shell="true">
                      <TodayTimeline
                        dateIso={anchorIso}
                        onItemClick={handleItemClick}
                        onSlotClick={handleSlotClick}
                        hideHeader
                        isTaskPanelOpen={isTaskPanelOpen}
                        onToggleTaskPanel={toggleTaskPanel}
                      />
                    </div>
                  )}
                </div>
              ) : view === 'week' ? (
                <div className="h-full min-h-0 overflow-hidden">
                  <WeekView
                    anchorIso={anchorIso}
                    onDayClick={handleDayClick}
                    onCreateEvent={openCreateEventForDay}
                    onCreateTask={openCreateTodoForDay}
                    onItemClick={handleItemClick}
                    onTaskClick={handleInboxClick}
                  />
                </div>
              ) : view === 'month' ? (
                <div className="h-full min-h-0 overflow-hidden">
                  <MonthView
                    anchorIso={anchorIso}
                    onDayClick={handleDayClick}
                    onItemClick={handleItemClick}
                    onTaskClick={handleInboxClick}
                    onAddForDate={(dayIso) => {
                      const day = new Date(dayIso);
                      day.setHours(9, 0, 0, 0);
                      setDialogMode({
                        kind: 'create',
                        presetStartIso: day.toISOString(),
                        presetIsEvent: true,
                      });
                    }}
                  />
                </div>
              ) : null}
            </section>
          </div>
        </ModeErrorBoundary>
      </main>
      <PlannerAIPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        view={view}
        anchorIso={anchorIso}
        width={aiPanelWidth}
        onWidthChange={setAiPanelWidth}
        minWidth={PAGE_AI_PANEL_WIDTH.min}
        maxWidth={PAGE_AI_PANEL_WIDTH.max}
      />
      <TaskScheduleDialog
        open={dialogMode !== null}
        mode={dialogMode}
        onClose={() => setDialogMode(null)}
      />
      {pendingWeekSchedule && (
        <WeekScheduleTimePrompt
          key={`${pendingWeekSchedule.task.id}:${pendingWeekSchedule.dayKey}:${pendingWeekSchedule.copy ? 'copy' : 'move'}`}
          pending={pendingWeekSchedule}
          onClose={() => setPendingWeekSchedule(null)}
          onConfirm={confirmPendingWeekSchedule}
        />
      )}
      <PlannerTrashDialog open={trashOpen} onOpenChange={setTrashOpen} />
      <PlannerLibraryPanel
        open={libraryOpen}
        anchorIso={anchorIso}
        onOpenChange={setLibraryOpen}
        onQuickAdd={addLibraryItemQuick}
      />
      <PlannerCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onAction={handleCommandAction}
      />
      <ShortcutHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <PlannerMatrixPopover
        open={matrixPopoverOpen}
        onOpenChange={setMatrixPopoverOpen}
        onTaskClick={(task) => handleInboxClick({ id: task.id, title: task.title })}
      />
      <PlannerAgendaPopover
        open={agendaPopoverOpen}
        onOpenChange={setAgendaPopoverOpen}
        onItemClick={(it) => handleInboxClick({ id: it.id, title: it.title })}
      />
    </div>
    {/* 드래그 시간 미리보기 — DragOverlay 로 마우스 옆 표시.
        scheduled 블록은 timeline overflow-y-auto 의 implicit overflow-x clip 때문에
        in-place transform 으로 옮기면 컬럼 밖으로 나갈 때 잘림. DragOverlay 로
        portal 띄워 clip 회피 (좌측 할일 패널 위로 자연스럽게 떠다님). */}
    <DragOverlay dropAnimation={null}>
      {previewLabel && (
        <div className="pointer-events-none flex max-w-[280px] select-none items-center gap-2 rounded-lg border border-foreground/12 bg-background/95 px-2.5 py-2 text-foreground shadow-[0_12px_30px_-18px_hsl(var(--foreground)/0.38)] ring-1 ring-foreground/[0.04] backdrop-blur-md">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-primary/[0.06] text-primary" aria-hidden>
            <span className="h-2 w-2 rounded-full border border-current bg-background" />
          </span>
          <span className="min-w-0 truncate text-[12.5px] font-semibold leading-tight text-foreground">
            {previewLabel}
          </span>
        </div>
      )}
      {(activeDrag?.data.kind === 'scheduled-task' || activeDrag?.data.kind === 'scheduled-event') && (() => {
        const item = activeDrag.data.kind === 'scheduled-task'
          ? activeDrag.data.task
          : activeDrag.data.event;
        const startAt = item.startAt;
        const endAt = (item as { endAt?: string }).endAt;
        const fmtTime = (iso?: string) => iso
          ? new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
          : '';
        return (
          <div
            className="pointer-events-none select-none flex items-center gap-2 rounded-md bg-card border border-primary/45 shadow-[0_8px_24px_-6px_hsl(30_15%_8%/0.25)] px-3 py-2 max-w-[260px] ring-1 ring-primary/15"
          >
            <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-hidden />
            <span className="text-[11.5px] tabular-nums text-muted-foreground font-medium shrink-0 whitespace-nowrap">
              {fmtTime(startAt)}{endAt ? `~${fmtTime(endAt)}` : ''}
            </span>
            <span className="text-[12.5px] text-foreground font-medium truncate">
              {item.title}
            </span>
          </div>
        );
      })()}
    </DragOverlay>
    {/* 포모도로 위젯은 App.tsx 에서 글로벌하게 렌더됨 — 여기 중복 X */}
    {/* MainModeTabs — rail "모드" 클릭 시 apiRef 로 패널 오픈.
        트리거 pill 자체는 시각적으로 숨기고 dropdown panel 만 portal 로 등장. */}
    <HiddenInteractiveMount>
      <MainModeTabs
        modes={['general', 'research_main', 'study_main', 'voice_main', 'multi', 'debate', 'stakeholder_main', 'premium_main', 'assistant']}
        labels={mainModeLabelMap}
        currentMode={'general'}
        pendingMode={null}
        isDiscussing={false}
        transitionPhase={0}
        showPlayerBg={false}
        onChange={handleSelectMainMode}
        onSelectDebateSub={() => handleSelectMainMode('debate')}
        onSelectPremiumDomain={handleSelectPremiumDomain}
        onSelectAssistantCard={(cardId) => handleSelectMainMode(cardId === 'voice-analysis' ? 'voice_main' : 'assistant')}
        onSelectLifeTool={() => handleSelectMainMode('general')}
        onSelectPlayerTool={() => handleSelectMainMode('player')}
        apiRef={mainModeTabsApiRef}
      />
    </HiddenInteractiveMount>
    </DndContext>
  );
};

export const WeekScheduleTimePrompt = ({
  pending,
  onClose,
  onConfirm,
}: {
  pending: WeekScheduleTimePromptState;
  onClose: () => void;
  onConfirm: (time: string, durationMin: number) => void;
}) => {
  useScrollLock(true);
  const initialStartTime = defaultWeekScheduleTime(pending.dayKey);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(() => addMinutesToTime(initialStartTime, 60));
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useFocusTrap<HTMLElement>(true);
  const backdropHandlers = useBackdropDismiss<HTMLDivElement>(onClose);
  const headingId = useId();
  const titleId = useId();
  const descId = useId();
  const selectionId = useId();
  const dateLabel = formatDragDate(`${pending.dayKey}T00:00:00`);
  const durationMin = durationBetweenTimes(startTime, endTime);
  const selectedDurationLabel = formatDurationMinutes(durationMin);
  const crossesMidnight = parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime);
  const rangeLabel = `${startTime} ~ ${endTime} · ${selectedDurationLabel}`;

  useEffect(() => {
    startInputRef.current?.focus();
    startInputRef.current?.select();
  }, []);

  const submit = () => onConfirm(startTime, durationMin);

  const updateStartTime = (nextTime: string) => {
    const currentDuration = durationBetweenTimes(startTime, endTime);
    setStartTime(nextTime);
    setEndTime(addMinutesToTime(nextTime, currentDuration));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (
      event.key === 'Enter'
      && (event.target === startInputRef.current || event.target === endInputRef.current)
    ) {
      event.preventDefault();
      event.stopPropagation();
      submit();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[55]"
      role="presentation"
      {...backdropHandlers}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${headingId} ${titleId}`}
        aria-describedby={`${descId} ${selectionId}`}
        className="absolute left-1/2 top-24 w-[min(360px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-foreground/16 bg-card p-3 text-foreground shadow-[0_20px_60px_-28px_hsl(var(--foreground)/0.45)] ring-1 ring-foreground/5"
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p id={headingId} className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" strokeWidth={2.2} />
              시간 정하기
            </p>
            <h3 id={titleId} className="mt-1 truncate text-[15px] font-extrabold text-foreground">
              {pending.task.title}
            </h3>
            <p id={descId} className="mt-0.5 text-[11.5px] font-medium text-muted-foreground">
              {dateLabel} 일정으로 이동
            </p>
            <p id={selectionId} className="sr-only" aria-live="polite">
              현재 선택: {rangeLabel}{crossesMidnight ? ', 다음날 종료' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="시간 설정 닫기"
            title="닫기"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </div>

        <div className="mt-3 rounded-lg border border-foreground/12 bg-background/70 p-2.5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-bold text-muted-foreground">시작</span>
              <input
                ref={startInputRef}
                data-autofocus="true"
                type="time"
                value={startTime}
                onChange={(event) => updateStartTime(event.target.value)}
                aria-label="시작 시간"
                className="h-9 w-full rounded-lg border border-foreground/14 bg-card px-3 text-[13px] font-bold tabular-nums text-foreground outline-none transition-colors focus:border-primary/45 focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <span className="pb-2 text-[13px] font-bold text-muted-foreground" aria-hidden>
              ~
            </span>
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-bold text-muted-foreground">종료</span>
              <input
                ref={endInputRef}
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                aria-label="종료 시간"
                className="h-9 w-full rounded-lg border border-foreground/14 bg-card px-3 text-[13px] font-bold tabular-nums text-foreground outline-none transition-colors focus:border-primary/45 focus:ring-2 focus:ring-primary/15"
              />
            </label>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-foreground/10 pt-2.5">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-bold tabular-nums text-foreground/82">
              {rangeLabel}
            </p>
            {crossesMidnight && (
              <p className="mt-0.5 text-[10.5px] font-semibold text-muted-foreground">다음날 종료</p>
            )}
          </div>
          <button
            type="button"
            onClick={submit}
            aria-label={`${pending.task.title} ${dateLabel} ${rangeLabel} 일정화`}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-foreground px-4 text-[12.5px] font-bold text-background transition-colors hover:bg-foreground/88"
          >
            일정화
          </button>
        </div>
      </section>
    </div>
  );
};

const TIME_FALLBACK_MINUTES = 9 * 60;

const parseTimeToMinutes = (time: string): number => {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return TIME_FALLBACK_MINUTES;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return TIME_FALLBACK_MINUTES;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return TIME_FALLBACK_MINUTES;
  return hours * 60 + minutes;
};

const addMinutesToTime = (time: string, minutes: number): string => {
  const total = (parseTimeToMinutes(time) + Math.max(15, Math.round(minutes))) % (24 * 60);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const durationBetweenTimes = (startTime: string, endTime: string): number => {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  const sameDayDuration = end - start;
  const duration = sameDayDuration > 0 ? sameDayDuration : sameDayDuration + 24 * 60;
  return Math.max(15, duration);
};

export default Planner;
