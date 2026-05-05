/**
 * 통합 플래너 — /planner 라우트.
 *
 * UX 패턴 (다른 캘린더 앱 표준):
 * - 시간 이동: ←/→ 버튼 + 키보드 좌/우
 * - 오늘로: 'T' 키 + 버튼
 * - 현재 기간 라벨: 헤더에 명확히 표시
 *
 * 단축키:
 * - n: 인박스 빠른 추가 포커스 (Day/Week 뷰)
 * - d/w/m/y/g: 뷰 전환
 * - ← / →: 이전 / 다음
 * - t: 오늘로
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
import { PlannerInput } from '@/components/planner/PlannerInput';
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
  | { kind: 'create'; presetStartIso: string };

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const Planner = () => {
  // Day 뷰 공통 input — NL 라우팅(시간 있으면 일정/타임라인, 없으면 할 일).
  const dayInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<PlannerView>('day');
  const [searchParams, setSearchParams] = useSearchParams();
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
  const todayTasks = useTodayTasks();
  // 5분 전 + 시작 시점 브라우저 알림 (권한 있을 때만).
  usePlannerNotifications();

  // Things3 Today Badge — 페이지 타이틀에 미완료 카운트 노출.
  useEffect(() => {
    const original = document.title;
    const count = todayTasks.length;
    document.title = count > 0 ? `(${count}) 통합 플래너` : '통합 플래너';
    return () => {
      document.title = original;
    };
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
      }
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
        const now = new Date();
        // 30분 단위로 반올림.
        const minutes = Math.floor(now.getMinutes() / 30) * 30;
        now.setMinutes(minutes, 0, 0);
        setDialogMode({ kind: 'create', presetStartIso: now.toISOString() });
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
  const headerLabels = useMemo<{ primary: string; secondary?: string }>(() => {
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
      const isTyping =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping) return;
      if (dialogMode) return;

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
  }, [view, dialogMode, goPrev, goNext, goToday]);

  // Rail 의 "검색" 클릭 → 명령 팔레트 열기.
  useEffect(() => {
    const open = () => setPaletteOpen(true);
    window.addEventListener(RAIL_EVENT.openPalette, open);
    return () => window.removeEventListener(RAIL_EVENT.openPalette, open);
  }, []);

  // Rail 의 "매트릭스" 클릭 → 매트릭스 팝오버.
  useEffect(() => {
    const open = () => setMatrixPopoverOpen(true);
    window.addEventListener(RAIL_EVENT.openMatrix, open);
    return () => window.removeEventListener(RAIL_EVENT.openMatrix, open);
  }, []);

  // Rail 의 "다가오는 일정" 클릭 → 아젠다 팝오버.
  useEffect(() => {
    const open = () => setAgendaPopoverOpen(true);
    window.addEventListener(RAIL_EVENT.openAgenda, open);
    return () => window.removeEventListener(RAIL_EVENT.openAgenda, open);
  }, []);

  // Rail 의 "습관" 클릭 → habits 풀뷰로 전환.
  useEffect(() => {
    const open = () => setView('habits');
    window.addEventListener(RAIL_EVENT.openHabits, open);
    return () => window.removeEventListener(RAIL_EVENT.openHabits, open);
  }, []);


  const isFullscreen = view === 'month' || view === 'year' || view === 'goals' || view === 'habits';

  // ────── DnD ──────
  // 드래그 기준점 (5px) 으로 클릭과 분리.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE } }),
    useSensor(KeyboardSensor),
  );

  // 드래그 중 미리보기 상태 — DragOverlay 가 사용.
  const [activeDrag, setActiveDrag] = useState<{ data: PlannerDragData; deltaY: number } | null>(null);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const data = e.active.data.current as PlannerDragData | undefined;
    if (data) setActiveDrag({ data, deltaY: 0 });
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

    if (!dragData) return;

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

    // ─── 인박스 → 시간 슬롯: 시간 배정 (기본 30분) ───
    if (dragData.kind === 'inbox-task' && dropData.kind === 'time-slot') {
      const start = dropData.startIso;
      const end = new Date(new Date(start).getTime() + 30 * 60_000).toISOString();
      taskStore.schedule(dragData.task.id, start, end);
      notify.success('시간 배정됐어요', { duration: 1500 });
      return;
    }

    // ─── 시간 블록 → 시간 슬롯: 시간 변경 (길이 유지, 15분 스냅) ───
    // delta.y 기반 정밀 이동 — slot 의 30분 boundary 가 아니라 마우스 이동량으로 결정.
    if (
      (dragData.kind === 'scheduled-task' || dragData.kind === 'scheduled-event') &&
      dropData.kind === 'time-slot'
    ) {
      const item = dragData.kind === 'scheduled-task' ? dragData.task : dragData.event;
      if (!item.startAt || !item.endAt) return;
      const HOUR_PX = 56;
      const oldStart = new Date(item.startAt);
      const oldEnd = new Date(item.endAt);
      const dur = oldEnd.getTime() - oldStart.getTime();
      const deltaMinutes = Math.round((e.delta.y / HOUR_PX) * 60 / 15) * 15; // 15분 스냅
      const newStartDate = new Date(oldStart.getTime() + deltaMinutes * 60_000);
      const newStart = newStartDate.toISOString();
      const newEnd = new Date(newStartDate.getTime() + dur).toISOString();

      // 가로 드래그 = lane 좌/우 swap. 임계 60px.
      const LANE_SWAP_THRESHOLD = 60;
      let newLaneOrder: number | undefined;
      if (Math.abs(e.delta.x) > LANE_SWAP_THRESHOLD) {
        const dayPrefix = newStart.slice(0, 10);
        const newStartMs = new Date(newStart).getTime();
        const newEndMs = new Date(newEnd).getTime();
        type WithLane = { id: string; startAt?: string; endAt?: string; laneOrder?: number };
        const overlapping: WithLane[] = [
          ...taskStore.listScheduled(`${dayPrefix}T00:00:00`),
          ...eventStore.listByDate(`${dayPrefix}T00:00:00`),
        ].filter((other) => {
          if (other.id === item.id) return false;
          if (!other.startAt || !other.endAt) return false;
          const oS = new Date(other.startAt).getTime();
          const oE = new Date(other.endAt).getTime();
          return oS < newEndMs && oE > newStartMs;
        });
        const orders = overlapping.map((o) => o.laneOrder ?? 0);
        newLaneOrder = e.delta.x < 0
          ? (orders.length ? Math.min(...orders) - 1 : -1)
          : (orders.length ? Math.max(...orders) + 1 : 1);
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
      if (!item.startAt || !item.endAt) return;
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
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
    <div className="min-h-screen bg-background flex">
      {/* 좌측 icon rail — 라우트/drawer 빠른 접근 */}
      <aside className="shrink-0 w-12 border-r border-foreground/20 bg-card/40">
        <PlannerLeftRail />
      </aside>
      <main className="flex-1 min-w-0 px-4 sm:px-6 py-4 sm:py-5 max-w-[1280px] w-full mx-auto">
        {/* ── Universal top bar ── 모든 뷰 공유.
            [◀ 라벨 ▶ 오늘로]   [입력 (day)]   [일/주/월/년]
            ← 시간 네비             ← 메인 액션      ← 우측 utility (Google Cal 패턴) */}
        <div className="mb-3 flex items-center gap-3 px-1">
          {/* 시간 네비 cluster — goals 외 모든 뷰. */}
          {view !== 'goals' && (
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                aria-label="이전"
                title="이전 (←)"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex items-baseline gap-2.5">
                <h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-foreground leading-none truncate">
                  {headerLabels.primary}
                </h2>
                {headerLabels.secondary && (
                  <span className="hidden sm:inline text-[14px] text-foreground/70 tabular-nums font-medium">
                    {headerLabels.secondary}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={goNext}
                aria-label="다음"
                title="다음 (→)"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goToday}
                disabled={anchorIsToday}
                aria-label="오늘로"
                title="오늘로 (T)"
                className={cn(
                  'ml-1 h-8 px-3 text-[13px] font-semibold rounded-md border border-foreground/20 transition-colors',
                  anchorIsToday
                    ? 'bg-card text-muted-foreground/40 cursor-default border-transparent'
                    : 'bg-card text-foreground hover:bg-accent',
                )}
              >
                오늘로
              </button>
            </div>
          )}

          {/* 입력창 — day 뷰만. 그 외 뷰는 spacer 로 뷰토글을 우측 끝으로 밀기. */}
          {view === 'day' ? (
            <div className="flex-1 min-w-0">
              <PlannerInput
                inputRef={dayInputRef}
                placeholder="여기에 적어요 — 예: ‘오후 3시 회의’ 또는 ‘약 사기’"
                onSubmit={handleDayAdd}
                variant="prominent"
                hidePreview
              />
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* 뷰 토글 — 모든 뷰 공통, 우측 끝. */}
          <ViewToggle value={view} onChange={setView} />
        </div>

        {isFullscreen ? (
          <div className="rounded-xl border border-foreground/20 bg-card p-3 sm:p-4 min-h-[600px] h-[calc(100vh-160px)]">
            {view === 'month' && (
              <MonthView
                anchorIso={anchorIso}
                onDayClick={handleDayClick}
                onItemClick={handleItemClick}
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
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-3 sm:gap-4 h-[950px]">
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
                        // 일정 추가 — anchor 날짜 09:00 default + presetIsEvent.
                        const day = new Date(anchorIso);
                        day.setHours(9, 0, 0, 0);
                        setDialogMode({
                          kind: 'create',
                          presetStartIso: day.toISOString(),
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
              <div className="rounded-lg border border-foreground/20 bg-card p-3 sm:p-4 min-h-0">
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
    {/* 드래그 시간 미리보기 — DragOverlay 로 마우스 옆 표시. */}
    <DragOverlay dropAnimation={null}>
      {previewLabel && (
        <div className="pointer-events-none select-none rounded-md bg-foreground text-background px-2.5 py-1 text-[11.5px] font-mono tabular-nums shadow-lg whitespace-nowrap">
          {previewLabel}
        </div>
      )}
    </DragOverlay>
    {/* 포모도로 위젯은 App.tsx 에서 글로벌하게 렌더됨 — 여기 중복 X */}
    </DndContext>
  );
};

export default Planner;
