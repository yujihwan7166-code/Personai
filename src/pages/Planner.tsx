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
 * - d/w/m/y/g/h: 뷰 전환 (day/week/month/year/goals/habits)
 * - ← / →: 이전 / 다음 (시간 네비)
 * - t: 오늘로
 * - ?: 단축키 도움말
 * - / 또는 ⌘K(⌃K): 명령 팔레트
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Bot } from 'lucide-react';
import { MainModeTabs, type MainModeTabsApi } from '@/components/MainModeTabs';
import { PageSwitcher } from '@/components/PageSwitcher';
import { MAIN_MODE_LABELS, type MainMode } from '@/types/expert';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragMoveEvent,
} from '@dnd-kit/core';
import { PlannerSidebar } from '@/components/planner/PlannerSidebar';
import { PlannerLeftRail, RAIL_EVENT } from '@/components/planner/PlannerLeftRail';
import { PlannerAIPanel } from '@/components/planner/ai/PlannerAIPanel';
import { TodayTimeline } from '@/components/planner/TodayTimeline';
import { TodayScheduledList } from '@/components/planner/TodayScheduledList';
import { TodayTodoList } from '@/components/planner/TodayTodoList';
import { useTodayTasks } from '@/hooks/planner/useTodayTasks';
import { usePlannerNotifications } from '@/hooks/planner/usePlannerNotifications';
import { WeekView } from '@/components/planner/WeekView';
import { MonthView } from '@/components/planner/MonthView';
import { YearView } from '@/components/planner/YearView';
import { GoalProgressView } from '@/components/planner/GoalProgressView';
import { HabitsView } from '@/components/planner/HabitsView';
import { ShortcutHelpDialog } from '@/components/planner/ShortcutHelpDialog';
import { ViewToggle, type PlannerView } from '@/components/planner/ViewToggle';
import { TaskScheduleDialog } from '@/components/planner/TaskScheduleDialog';
import { PlannerMatrixPopover } from '@/components/planner/PlannerMatrixPopover';
import { PlannerAgendaPopover } from '@/components/planner/PlannerAgendaPopover';
import { PlannerCommandPalette, type CommandAction } from '@/components/planner/PlannerCommandPalette';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import { notify } from '@/lib/notify';
import { editThisOnly } from '@/lib/planner/seriesEdit';
import { isInstanceId, parseInstanceId } from '@/lib/planner/recurrence';
import { getSnapMin } from '@/lib/planner/snapMin';
import { nextHalfHourSlot } from '@/lib/planner/timeSlots';
import { useWindowEvent } from '@/hooks/useWindowEvent';
import {
  DRAG_ACTIVATION_DISTANCE,
  transposeTimeToDate,
  type PlannerDragData,
  type PlannerDropData,
} from '@/components/planner/dnd/plannerDndTypes';
import { cn } from '@/lib/utils';

const taskStoreSnapshot = () => taskStore.list();

import type { PlannerTask, Priority } from '@/types/planner';

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

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const Planner = () => {
  // Day 뷰 공통 input — NL 라우팅(시간 있으면 일정/타임라인, 없으면 할 일).
  const dayInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<PlannerView>('day');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [matrixPopoverOpen, setMatrixPopoverOpen] = useState(false);
  const [agendaPopoverOpen, setAgendaPopoverOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem('planner.ai-panel.open') === '1'; } catch { return false; }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('planner.ai-panel.open', aiPanelOpen ? '1' : '0'); } catch { /* silent */ }
  }, [aiPanelOpen]);

  // AI 패널 너비 — 사용자가 좌측 가장자리 드래그로 조정. 280~560 범위.
  const AI_WIDTH_MIN = 280;
  const AI_WIDTH_MAX = 560;
  const AI_WIDTH_DEFAULT = 340;
  const [aiPanelWidth, setAiPanelWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return AI_WIDTH_DEFAULT;
    try {
      const raw = window.localStorage.getItem('planner.ai-panel.width');
      const n = raw ? Number(raw) : NaN;
      if (!Number.isFinite(n)) return AI_WIDTH_DEFAULT;
      return Math.max(AI_WIDTH_MIN, Math.min(AI_WIDTH_MAX, Math.round(n)));
    } catch { return AI_WIDTH_DEFAULT; }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('planner.ai-panel.width', String(aiPanelWidth)); } catch { /* silent */ }
  }, [aiPanelWidth]);
  const todayTasks = useTodayTasks();
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
  }, []);

  const handleMonthClick = useCallback((monthIso: string) => {
    setAnchorIso(monthIso);
    setView('month');
  }, []);

  const handleInboxClick = useCallback((task: { id: string; title: string }) => {
    const full = taskStore.list().find((t) => t.id === task.id);
    // 시간 미정 task: 모달 기본 날짜를 plannedFor (계획 잡힌 날) 또는 현재 보고 있는 anchor 날짜로.
    // 이걸 안 하면 default = new Date() 로 잡혀, 사용자가 5/2 페이지에서 5/2 계획 항목 시간 배정해도
    // 모달 default 가 오늘(5/3 등)이라 startAt 이 다른 날로 저장되고 타임라인엔 안 보임.
    let initialStart: string | undefined;
    let initialEnd: string | undefined;
    if (full && !full.startAt) {
      const dayKey = full.plannedFor ?? new Date(anchorIso).toISOString().slice(0, 10);
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
    setDialogMode({ kind: 'create', presetStartIso: slotIso });
  }, []);

  /**
   * Day 뷰 공통 입력 핸들러 — NL 라우팅.
   * 시간(startAt) 있으면 계획/타임라인으로, 없으면 anchor 날짜의 할 일(plannedFor) 로.
   */
  const handleDayAdd = useCallback((
    title: string,
    parsed?: {
      startAt?: string;
      endAt?: string;
      recurrence?: PlannerTask['recurrence'];
      tags?: string[];
      priority?: PlannerTask['priority'];
    },
  ) => {
    const day = new Date(anchorIso);
    const dayKey = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
    taskStore.add({
      title,
      startAt: parsed?.startAt,
      endAt: parsed?.endAt,
      recurrence: parsed?.recurrence,
      tags: parsed?.tags,
      priority: parsed?.priority,
      plannedFor: parsed?.startAt ? undefined : dayKey,
    });
    notify.success(parsed?.startAt ? '일정에 추가했어요' : '할 일에 추가했어요', { duration: 1200 });
  }, [anchorIso]);

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
      else if (view === 'year' || view === 'goals') d.setFullYear(d.getFullYear() + direction);
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
        setDialogMode({ kind: 'create', presetStartIso: nextHalfHourSlot().toISOString() });
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
  }, []);

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
      return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
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

  // 헤더 라벨 — day 뷰만 "오늘"/"내일" smart label + 보조 라벨, 그 외 periodLabel.
  // habits 뷰는 시간 네비 무관 — "오늘 + 날짜" 로 컨텍스트 명확화.
  const headerLabels = useMemo<{ primary: string; secondary?: string }>(() => {
    if (view === 'habits') {
      const t = new Date();
      const fullLabel = t.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
      return { primary: '오늘', secondary: fullLabel };
    }
    if (view !== 'day') return { primary: periodLabel };
    const d = new Date(anchorIso);
    const t = new Date();
    const tm = new Date(t); tm.setDate(t.getDate() + 1);
    const fullLabel = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
    if (isSameDay(d, t)) return { primary: '오늘', secondary: fullLabel };
    if (isSameDay(d, tm)) return { primary: '내일', secondary: fullLabel };
    return { primary: fullLabel };
  }, [anchorIso, view, periodLabel]);

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
      if (dialogMode || paletteOpen || helpOpen || matrixPopoverOpen || agendaPopoverOpen || aiPanelOpen) {
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
        case 'g': e.preventDefault(); setView('goals'); break;
        case 'h': e.preventDefault(); setView('habits'); break;
        case 't': e.preventDefault(); goToday(); break;
        case 'arrowleft':  e.preventDefault(); goPrev(); break;
        case 'arrowright': e.preventDefault(); goNext(); break;
        case '?': e.preventDefault(); setHelpOpen(true); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, dialogMode, paletteOpen, helpOpen, matrixPopoverOpen, agendaPopoverOpen, aiPanelOpen, goPrev, goNext, goToday]);

  // ── Rail 이벤트 핸들러 ── (useWindowEvent 로 보일러플레이트 제거)
  const handleOpenPalette = useCallback(() => setPaletteOpen(true), []);
  const handleOpenMatrix = useCallback(() => setMatrixPopoverOpen(true), []);
  const handleOpenAgenda = useCallback(() => setAgendaPopoverOpen(true), []);
  const handleOpenHabits = useCallback(() => setView('habits'), []);
  const handleGoToday = useCallback(() => {
    setView('day');
    goToday();
  }, [goToday]);
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


  const isFullscreen = view === 'month' || view === 'year' || view === 'goals' || view === 'habits';

  // ────── DnD ──────
  // 드래그 기준점 (5px) 으로 클릭과 분리.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE } }),
    useSensor(KeyboardSensor),
  );

  // 드래그 중 미리보기 상태 — DragOverlay 가 사용.
  const [activeDrag, setActiveDrag] = useState<{ data: PlannerDragData; deltaY: number } | null>(null);
  // 드래그 시작 시점 타임라인 scrollTop — handleDragEnd 에서 자동 스크롤만큼 보상하기 위해.
  const dragInitialScrollTop = useRef<number | null>(null);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const data = e.active.data.current as PlannerDragData | undefined;
    if (data) setActiveDrag({ data, deltaY: 0 });
    const container = document.querySelector<HTMLElement>('[data-timeline-scroll="true"]');
    dragInitialScrollTop.current = container ? container.scrollTop : null;
  }, []);

  const handleDragMove = useCallback((e: DragMoveEvent) => {
    setActiveDrag((prev) => (prev ? { ...prev, deltaY: e.delta.y } : prev));
  }, []);

  // 드래그 중 시간 미리보기 (DragOverlay).
  // - scheduled (시간표 안 이동): 블록 자체가 transform 으로 따라옴 + 블록 안 라이브 라벨로 충분 → null
  // - inbox-task (대기함 → 시간표): 새 task 라 위치 미정, 작은 라벨 칩만 마우스 옆에 표시
  // - resize: 네이티브 pointer event 가 처리, 블록 안 inline chip
  const previewLabel = useMemo(() => {
    if (!activeDrag) return null;
    const { data } = activeDrag;
    if (data.kind === 'inbox-task') {
      return `← ${data.task.title}`;
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
    // 모든 분기에서 reset 보장 — early return 누락으로 다음 드래그가 잘못된 보정값 사용하는 버그 방지.
    const initialScrollTop = dragInitialScrollTop.current;
    dragInitialScrollTop.current = null;

    if (!dragData) {
      return;
    }

    // ─── List 트리에 드롭: 분류 변경 ───
    if (
      rawDropData &&
      'kind' in rawDropData &&
      rawDropData.kind === 'assign-list' &&
      (dragData.kind === 'inbox-task' || dragData.kind === 'scheduled-task')
    ) {
      const task = dragData.task;
      const targetId = isInstanceId(task.id)
        ? (parseInstanceId(task.id)?.masterId ?? task.id)
        : task.id;
      taskStore.update(targetId, { listId: (rawDropData as AssignListDropData).listId });
      notify.success('분류 변경됐어요', { duration: 1200 });
      return;
    }

    // resize 는 DraggableBlock 안 네이티브 pointer event 가 처리 — 여기서는 무시.

    if (!dropData) return;

    // ─── 인박스 → 시간 슬롯: 시간 배정 ───
    // 기본 길이 = 사용자 snap × 2 (15→30, 30→60). 너무 짧으면 클릭하기 어려움.
    if (dragData.kind === 'inbox-task' && dropData.kind === 'time-slot') {
      const start = dropData.startIso;
      const blockMin = Math.max(30, getSnapMin() * 2);
      const end = new Date(new Date(start).getTime() + blockMin * 60_000).toISOString();
      taskStore.schedule(dragData.task.id, start, end);
      const startD = new Date(start);
      const hh = String(startD.getHours()).padStart(2, '0');
      const mm = String(startD.getMinutes()).padStart(2, '0');
      notify.success(`${hh}:${mm} 에 배정됐어요`, { duration: 1500 });
      return;
    }

    // ─── 시간 블록 → 시간 슬롯: 시간 변경 (길이 유지, 15분 스냅) ───
    // delta.y 기반 정밀 이동 — slot 의 30분 boundary 가 아니라 마우스 이동량으로 결정.
    if (
      (dragData.kind === 'scheduled-task' || dragData.kind === 'scheduled-event') &&
      dropData.kind === 'time-slot'
    ) {
      const item = dragData.kind === 'scheduled-task' ? dragData.task : dragData.event;
      if (!item.startAt || !item.endAt) {
        notify.warning('이 항목은 시간이 없어 이동할 수 없어요', { duration: 1500 });
        return;
      }
      const HOUR_PX = 56;
      const oldStart = new Date(item.startAt);
      const oldEnd = new Date(item.endAt);
      const dur = oldEnd.getTime() - oldStart.getTime();
      const snap = getSnapMin();
      // 자동 스크롤 보상 — 드래그 중 컨테이너가 스크롤된 만큼 e.delta.y 에 더함.
      const container = document.querySelector<HTMLElement>('[data-timeline-scroll="true"]');
      const scrollDelta = container && initialScrollTop !== null
        ? container.scrollTop - initialScrollTop
        : 0;
      const adjustedDeltaY = e.delta.y + scrollDelta;
      const deltaMinutes = Math.round((adjustedDeltaY / HOUR_PX) * 60 / snap) * snap; // 사용자 스냅 단위
      const newStartDate = new Date(oldStart.getTime() + deltaMinutes * 60_000);
      const newStart = newStartDate.toISOString();
      const newEnd = new Date(newStartDate.getTime() + dur).toISOString();

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
      notify.success(newLaneOrder !== undefined ? '순서도 변경됐어요' : '이동됐어요', { duration: 1200 });
      return;
    }

    // ─── 시간 블록 → 다른 day column: 시:분 유지, 날짜 교체 ───
    if (
      (dragData.kind === 'scheduled-task' || dragData.kind === 'scheduled-event') &&
      dropData.kind === 'day-column'
    ) {
      const item = dragData.kind === 'scheduled-task' ? dragData.task : dragData.event;
      if (!item.startAt || !item.endAt) {
        notify.warning('이 항목은 시간이 없어 이동할 수 없어요', { duration: 1500 });
        return;
      }
      const oldStart = new Date(item.startAt);
      const dur = new Date(item.endAt).getTime() - oldStart.getTime();
      const targetDay = new Date(dropData.dayIso);
      const newStart = transposeTimeToDate(oldStart, targetDay).toISOString();
      const newEnd = new Date(new Date(newStart).getTime() + dur).toISOString();

      if (dragData.kind === 'scheduled-task') {
        if (!tryDetachInstance(item.id, 'task', newStart, newEnd)) {
          taskStore.schedule(item.id, newStart, newEnd);
        }
      } else {
        if (!tryDetachInstance(item.id, 'event', newStart, newEnd)) {
          eventStore.update(item.id, { startAt: newStart, endAt: newEnd });
        }
      }
      notify.success('이동됐어요', { duration: 1200 });
      return;
    }

    // ─── 인박스 → 다른 day column: 그날 09:00 기본 배정 ───
    if (dragData.kind === 'inbox-task' && dropData.kind === 'day-column') {
      const targetDay = new Date(dropData.dayIso);
      targetDay.setHours(9, 0, 0, 0);
      const newStart = targetDay.toISOString();
      const newEnd = new Date(targetDay.getTime() + 30 * 60_000).toISOString();
      taskStore.schedule(dragData.task.id, newStart, newEnd);
      notify.success('시간 배정됐어요', { duration: 1500 });
      return;
    }

    // ─── 시간 블록 → 인박스: 시간 해제 (시리즈는 detach 후 단발 변환) ───
    if (
      (dragData.kind === 'scheduled-task' || dragData.kind === 'scheduled-event') &&
      dropData.kind === 'inbox'
    ) {
      // 일정(Event) 은 인박스 개념 없음 — 무시.
      if (dragData.kind === 'scheduled-event') return;
      const task = dragData.task;
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
      notify.info('인박스로 옮겼어요', { duration: 1500 });
      return;
    }

    // ─── 시간 블록 → 좌하 "할 일" 박스: 시간 빼고 plannedFor=오늘 (일정 → 할 일 변환) ───
    if (
      (dragData.kind === 'scheduled-task' || dragData.kind === 'scheduled-event') &&
      dropData.kind === 'todo-list'
    ) {
      // event 는 task 가 아니라 무시.
      if (dragData.kind === 'scheduled-event') return;
      const task = dragData.task;
      const dayKey = dropData.dayKey;
      if (isInstanceId(task.id)) {
        const parsed = parseInstanceId(task.id);
        if (!parsed) return;
        const master = taskStore.findMaster(parsed.masterId);
        if (!master) return;
        editThisOnly(taskStore, master, parsed.occurrenceIso, {
          startAt: undefined,
          endAt: undefined,
          plannedFor: dayKey,
        });
      } else {
        taskStore.update(task.id, {
          startAt: undefined,
          endAt: undefined,
          plannedFor: dayKey,
        });
      }
      notify.success('할 일로 옮겼어요', { duration: 1500 });
    }
  }, [tryDetachInstance]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      autoScroll={{ threshold: { x: 0, y: 0.15 }, acceleration: 12 }}
    >
    <div
      className={cn(
        'planner-theme min-h-screen bg-background flex',
        // AI 패널 열렸을 때 본문이 가려지지 않도록 우측 여백 — 패널 너비랑 동기.
        // 너비가 동적이라 CSS 변수 + sm: 미디어쿼리로 처리 (모바일은 패널이 풀스크린이라 여백 X).
        'transition-[padding] duration-200 ease-out',
        aiPanelOpen && 'sm:pr-[var(--ai-panel-w)]',
      )}
      style={{ ['--ai-panel-w' as string]: `${aiPanelWidth}px` }}
    >
      {/* 좌측 icon rail — 라우트/drawer 빠른 접근 */}
      <aside className="shrink-0 w-12 border-r hairline bg-card/30">
        <PlannerLeftRail aiOpen={aiPanelOpen} />
      </aside>
      <main className="flex-1 min-w-0 px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-7 max-w-[1320px] w-full mx-auto">
        {/* ── Universal top bar ── 모든 뷰 공유.
            [AI 도우미] [◀ 라벨 ▶ 오늘로]   [spacer]   [뷰 / 페이지 스위처]
            ← 좌측 보조        ← 시간 네비                  ← 우측 utility */}
        <div className="mb-5 flex items-center gap-4 px-0.5 flex-wrap">
          {/* AI 도우미 — 좌측 끝. 패널 열려있으면 숨김 (rail 의 ✨ 와 중복 방지). */}
          {!aiPanelOpen && (
            <button
              type="button"
              onClick={() => setAiPanelOpen(true)}
              className="shrink-0 h-8 w-8 sm:w-auto sm:px-3 inline-flex items-center justify-center sm:justify-start gap-1.5 rounded-full border border-primary/30 bg-primary/8 text-foreground hover:bg-primary/15 hover:border-primary/50 transition-colors"
              title="AI 도우미"
              aria-label="AI 도우미 열기"
            >
              <Bot className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="hidden sm:inline text-[12px] font-semibold">AI 도우미</span>
            </button>
          )}
          {/* 시간 네비 cluster — goals 외 모든 뷰. habits 뷰는 시간 네비 무관 — 라벨만 노출. */}
          {view !== 'goals' && (
            <div className="shrink-0 flex items-center gap-2">
              {view !== 'habits' && (
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="이전"
                  title="이전 (←)"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="h-[18px] w-[18px]" />
                </button>
              )}
              <div className="min-w-0 flex items-baseline gap-3">
                <h2 className="font-display text-[28px] sm:text-[32px] font-semibold tracking-tight text-foreground leading-tight truncate">
                  {headerLabels.primary}
                </h2>
                {headerLabels.secondary && (
                  <span className="hidden sm:inline text-[15px] sm:text-[16px] text-muted-foreground tabular-nums font-medium leading-tight">
                    {headerLabels.secondary}
                  </span>
                )}
                {view === 'habits' && (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('planner-habit-new'))}
                    title="새 습관 추가"
                    className="ml-1 inline-flex items-center gap-1 h-8 px-3 rounded-full border hairline bg-card text-[12.5px] font-semibold text-foreground hover:bg-accent transition-colors self-center"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    새 습관
                  </button>
                )}
              </div>
              {view !== 'habits' && (
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="다음"
                  title="다음 (→)"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <ChevronRight className="h-[18px] w-[18px]" />
                </button>
              )}
              {view !== 'habits' && (
                <button
                  type="button"
                  onClick={goToday}
                  disabled={anchorIsToday}
                  aria-label="오늘로"
                  title="오늘로 (T)"
                  className={cn(
                    'ml-1.5 h-8 px-3.5 text-[12.5px] font-semibold rounded-full transition-all',
                    anchorIsToday
                      ? 'text-muted-foreground/40 cursor-default'
                      : 'border hairline bg-card text-foreground hover:bg-accent hover:border-foreground/30',
                  )}
                >
                  오늘로
                </button>
              )}
            </div>
          )}

          {/* spacer — ViewToggle 을 가운데로 민다. */}
          <div className="flex-1" />

          {/* 뷰 토글 — 중앙. */}
          <ViewToggle value={view} onChange={setView} />

          {/* spacer — PageSwitcher 를 우측 끝으로 민다. */}
          <div className="flex-1" />

          {/* 페이지 스위처 — 우측 끝. */}
          <PageSwitcher current="planner" />
        </div>

        {isFullscreen ? (
          <div className={cn(
            'rounded-2xl border hairline bg-card min-h-[600px] h-[calc(100vh-180px)] shadow-[0_1px_2px_hsl(30_15%_8%/0.04)] overflow-hidden',
            // habits 는 자체 헤더·배경이 있어 외곽 패딩 줄임 (다른 풀뷰 p-4/p-5 보다 슬림)
            view === 'habits' ? 'p-2 sm:p-2.5' : 'p-4 sm:p-5',
          )}>
            {view === 'month' && (
              <MonthView
                anchorIso={anchorIso}
                onDayClick={handleDayClick}
                onItemClick={handleItemClick}
                onAddForDate={(dayIso) => {
                  // 그 날짜 09:00 default + 일정 모달
                  const day = new Date(dayIso);
                  day.setHours(9, 0, 0, 0);
                  setDialogMode({
                    kind: 'create',
                    presetStartIso: day.toISOString(),
                    presetIsEvent: true,
                  });
                }}
              />
            )}
            {view === 'year' && (
              <YearView
                anchorIso={anchorIso}
                onMonthClick={handleMonthClick}
                onDayClick={handleDayClick}
              />
            )}
            {view === 'goals' && (
              <GoalProgressView
                onTaskClick={(task) => handleInboxClick({ id: task.id, title: task.title })}
              />
            )}
            {view === 'habits' && <HabitsView />}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[228px_minmax(0,1fr)] gap-4 sm:gap-5 h-[calc(100vh-180px)] min-h-[600px]">
            <div className="min-h-0 max-h-[45vh] md:max-h-none overflow-y-auto">
              <PlannerSidebar
                anchorIso={anchorIso}
                onSelectDay={(dayIso) => {
                  setAnchorIso(dayIso);
                  setView('day');
                }}
                onTaskClick={(task) => handleInboxClick({ id: task.id, title: task.title })}
                onOpenHabits={() => setView('habits')}
              />
            </div>
            {view === 'day' ? (
              <div className="min-h-0 flex flex-col">
                {/* 헤더는 universal topbar 로 이동됨. day content 만 여기 — 좌측 계획/할일 + 우측 타임라인. */}
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-3">
                  <div className="grid grid-rows-[auto_minmax(0,1fr)] gap-3 min-h-0">
                    <TodayScheduledList
                      anchorIso={anchorIso}
                      onTaskClick={(task) => handleInboxClick({ id: task.id, title: task.title })}
                      onAdd={() => {
                        // anchor 오늘/과거 → 지금 다음 30분 슬롯, 미래 → anchor 09:00.
                        const anchor = new Date(anchorIso);
                        const today = new Date();
                        const isSame = anchor.toDateString() === today.toDateString();
                        const isPast = !isSame && anchor.getTime() < today.getTime();
                        const preset = (isSame || isPast)
                          ? nextHalfHourSlot()
                          : (() => { const d = new Date(anchor); d.setHours(9, 0, 0, 0); return d; })();
                        setDialogMode({
                          kind: 'create',
                          presetStartIso: preset.toISOString(),
                          presetIsEvent: true,
                        });
                      }}
                    />
                    <TodayTodoList
                      anchorIso={anchorIso}
                      onTaskClick={(task) => handleInboxClick({ id: task.id, title: task.title })}
                      onAdd={() => {
                        // 할 일 추가 — anchor 날짜 09:00 default + presetIsEvent=false (시간 input 숨김).
                        const day = new Date(anchorIso);
                        day.setHours(9, 0, 0, 0);
                        setDialogMode({
                          kind: 'create',
                          presetStartIso: day.toISOString(),
                          presetIsEvent: false,
                        });
                      }}
                    />
                  </div>
                  <TodayTimeline
                    dateIso={anchorIso}
                    onItemClick={handleItemClick}
                    onSlotClick={handleSlotClick}
                    hideHeader
                  />
                </div>
              </div>
            ) : view === 'week' ? (
              <div className="rounded-2xl border hairline bg-card p-4 sm:p-5 min-h-0 shadow-[0_1px_2px_hsl(30_15%_8%/0.04)]">
                <WeekView
                  anchorIso={anchorIso}
                  onDayClick={handleDayClick}
                  onItemClick={handleItemClick}
                />
              </div>
            ) : null}
          </div>
        )}
      </main>
      <TaskScheduleDialog
        open={dialogMode !== null}
        mode={dialogMode}
        onClose={() => setDialogMode(null)}
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
        <div className="pointer-events-none select-none rounded-md bg-foreground text-background px-2.5 py-1 text-[11.5px] font-mono tabular-nums shadow-lg whitespace-nowrap">
          {previewLabel}
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
    {/* AI 컴패니언 패널 — 우측 슬라이드, backdrop 없음. 본문이랑 동시 사용 가능. */}
    <PlannerAIPanel
      open={aiPanelOpen}
      onClose={() => setAiPanelOpen(false)}
      view={view}
      anchorIso={anchorIso}
      width={aiPanelWidth}
      onWidthChange={setAiPanelWidth}
      minWidth={AI_WIDTH_MIN}
      maxWidth={AI_WIDTH_MAX}
    />
    {/* MainModeTabs (offscreen) — rail "모드" 클릭 시 apiRef 로 패널 오픈.
        트리거 pill 자체는 화면 밖, dropdown panel 만 portal 로 등장 (Index.tsx 동일 패턴). */}
    <div
      style={{ position: 'fixed', left: -9999, top: -9999, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
      aria-hidden
    >
      <MainModeTabs
        modes={['general', 'research_main', 'study_main', 'multi', 'debate', 'stakeholder_main', 'premium_main', 'assistant']}
        labels={mainModeLabelMap}
        currentMode={'general'}
        pendingMode={null}
        isDiscussing={false}
        transitionPhase={0}
        showPlayerBg={false}
        onChange={handleSelectMainMode}
        onSelectDebateSub={() => handleSelectMainMode('debate')}
        onSelectAssistantCard={() => handleSelectMainMode('assistant')}
        onSelectLifeTool={() => handleSelectMainMode('general')}
        onSelectPlayerTool={() => handleSelectMainMode('player')}
        apiRef={mainModeTabsApiRef}
      />
    </div>
    </DndContext>
  );
};

export default Planner;
