import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  ChevronDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  FileText,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NoteItem = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
};

type MemoSidebarState = {
  isOpen: boolean;
  notes: NoteItem[];
  activeNoteId: string | null;
  ddayDate: string;
  ddayLabel: string;
  alarmEnabled: boolean;
  alarmAt: string;
  alarmMessage: string;
  lastAlarmAt: string | null;
  memoExpanded: boolean;
};

type LegacySidebarState = Partial<MemoSidebarState> & {
  note?: string;
};

const STORAGE_KEY = 'personai-right-memo-sidebar-v1';
const ALARM_PRESETS = [10, 15, 30, 40, 50, 60] as const;
const SIDEBAR_OPEN_WIDTH = 280;
const SIDEBAR_CLOSED_WIDTH = 56;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateInput(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTime(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatStamp(date = new Date()) {
  return `${formatDateInput(date)} ${formatTime(date)}`;
}

function makeNote(index = 1): NoteItem {
  const now = new Date();
  return {
    id: `note-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    title: `硫붾え ${index}`,
    content: '',
    updatedAt: now.toISOString(),
  };
}

function normalizeNotes(rawNotes: unknown, legacyNote?: string) {
  if (Array.isArray(rawNotes)) {
    const notes = rawNotes
      .filter((item): item is Partial<NoteItem> => typeof item === 'object' && item !== null)
      .map((item, index) => ({
        id: typeof item.id === 'string' && item.id ? item.id : makeNote(index + 1).id,
        title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : `硫붾え ${index + 1}`,
        content: typeof item.content === 'string' ? item.content : '',
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
      }));

    if (notes.length > 0) return notes;
  }

  if (typeof legacyNote === 'string' && legacyNote.trim()) {
    return [
      {
        ...makeNote(1),
        title: '湲곗〈 硫붾え',
        content: legacyNote,
      },
    ];
  }

  return [makeNote(1)];
}

function getDefaultState(): MemoSidebarState {
  return {
    isOpen: true,
    notes: [makeNote(1)],
    activeNoteId: null,
    ddayDate: formatDateInput(),
    ddayLabel: '留덇컧',
    alarmEnabled: false,
    alarmAt: '',
    alarmMessage: '硫붾え瑜??뺤씤???쒓컙?낅땲??',
    lastAlarmAt: null,
    memoExpanded: false,
  };
}

function loadState(): MemoSidebarState {
  if (typeof window === 'undefined') return getDefaultState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();

    const parsed = JSON.parse(raw) as LegacySidebarState;
    const defaults = getDefaultState();
    const notes = normalizeNotes(parsed.notes, parsed.note);
    const activeNoteId =
      typeof parsed.activeNoteId === 'string' && notes.some((note) => note.id === parsed.activeNoteId)
        ? parsed.activeNoteId
        : notes[0]?.id ?? null;

    return {
      ...defaults,
      ...parsed,
      notes,
      activeNoteId,
    };
  } catch {
    return getDefaultState();
  }
}

function formatAlarmTarget(value: string) {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return '?뚮엺 ?놁쓬';
  return `${formatDateInput(target)} ${formatTime(target)}`;
}

function getMinutesLeft(value: string) {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const diff = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 60000));
}

function getPreview(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) return '硫붾え ?댁슜???꾩쭅 ?놁뒿?덈떎.';
  return normalized.slice(0, 72);
}

export function RightMemoSidebar() {
  const initial = useMemo(() => loadState(), []);

  const [isOpen, setIsOpen] = useState(initial.isOpen);
  const [notes, setNotes] = useState<NoteItem[]>(initial.notes);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(initial.activeNoteId ?? initial.notes[0]?.id ?? null);
  const [ddayDate, setDdayDate] = useState(initial.ddayDate);
  const [ddayLabel, setDdayLabel] = useState(initial.ddayLabel);
  const [alarmEnabled, setAlarmEnabled] = useState(initial.alarmEnabled);
  const [alarmAt, setAlarmAt] = useState(initial.alarmAt);
  const [alarmMessage] = useState(initial.alarmMessage);
  const [lastAlarmAt, setLastAlarmAt] = useState<string | null>(initial.lastAlarmAt);
  const [memoExpanded, setMemoExpanded] = useState(initial.memoExpanded);
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [flashMessage, setFlashMessage] = useState('');
  const sidebarWidth = isOpen ? `${SIDEBAR_OPEN_WIDTH}px` : `${SIDEBAR_CLOSED_WIDTH}px`;

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? notes[0] ?? null,
    [activeNoteId, notes]
  );

  useEffect(() => {
    if (!activeNote && notes.length > 0) {
      setActiveNoteId(notes[0].id);
    }
  }, [activeNote, notes]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const state: MemoSidebarState = {
        isOpen,
        notes,
        activeNoteId: activeNote?.id ?? null,
        ddayDate,
        ddayLabel,
        alarmEnabled,
        alarmAt,
        alarmMessage,
        lastAlarmAt,
        memoExpanded,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [activeNote, alarmAt, alarmEnabled, alarmMessage, ddayDate, ddayLabel, isOpen, lastAlarmAt, memoExpanded, notes]);

  useEffect(() => {
    if (!alarmEnabled || !alarmAt) return;

    const checkAlarm = () => {
      const target = new Date(alarmAt).getTime();
      if (Number.isNaN(target)) return;
      if (lastAlarmAt === alarmAt) return;
      if (Date.now() < target) return;

      setLastAlarmAt(alarmAt);
      setFlashMessage(alarmMessage);

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Personai 硫붾え ?뚮엺', {
          body: alarmMessage,
        });
      }
    };

    checkAlarm();
    const timer = window.setInterval(checkAlarm, 10000);
    return () => window.clearInterval(timer);
  }, [alarmAt, alarmEnabled, alarmMessage, lastAlarmAt]);

  useEffect(() => {
    if (!flashMessage) return;
    const timer = window.setTimeout(() => setFlashMessage(''), 4000);
    return () => window.clearTimeout(timer);
  }, [flashMessage]);

  const ddayText = useMemo(() => {
    const target = new Date(`${ddayDate}T00:00:00`);
    if (Number.isNaN(target.getTime())) return 'D-?';

    const today = new Date();
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diff = Math.ceil((target.getTime() - base.getTime()) / 86400000);

    if (diff > 0) return `D-${diff}`;
    if (diff === 0) return 'D-DAY';
    return `D+${Math.abs(diff)}`;
  }, [ddayDate]);

  const minutesLeft = alarmEnabled && alarmAt ? getMinutesLeft(alarmAt) : null;

  const createNote = () => {
    const next = makeNote(notes.length + 1);
    setNotes((prev) => [...prev, next]);
    setActiveNoteId(next.id);
    setMemoExpanded(true);
  };

  const openNote = (noteId: string) => {
    setActiveNoteId(noteId);
    setMemoExpanded(true);
  };

  const openMemoSidebar = () => {
    if (!activeNoteId && notes[0]) {
      setActiveNoteId(notes[0].id);
    }
    setIsOpen(true);
    setMemoExpanded(true);
  };

  const openCollapsedNote = (noteId: string) => {
    setActiveNoteId(noteId);
    setIsOpen(true);
    setMemoExpanded(true);
  };

  const moveNote = (noteId: string, direction: 'up' | 'down') => {
    setNotes((prev) => {
      const currentIndex = prev.findIndex((note) => note.id === noteId);
      if (currentIndex === -1) return prev;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const updateActiveNote = (patch: Partial<Pick<NoteItem, 'title' | 'content'>>) => {
    if (!activeNote) return;
    setNotes((prev) =>
      prev.map((note) =>
        note.id === activeNote.id
          ? {
              ...note,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : note
      )
    );
  };

  const deleteActiveNote = () => {
    if (!activeNote) return;

    setNotes((prev) => {
      const next = prev.filter((note) => note.id !== activeNote.id);
      if (next.length === 0) {
        const fallback = makeNote(1);
        setActiveNoteId(fallback.id);
        return [fallback];
      }
      setActiveNoteId(next[0].id);
      return next;
    });
    setMemoExpanded(false);
  };

  const setAlarmByMinutes = (minutes: number) => {
    const target = new Date(Date.now() + minutes * 60000);
    setAlarmEnabled(true);
    setAlarmAt(target.toISOString());
    setLastAlarmAt(null);
    setFlashMessage(`${minutes === 60 ? '1시간' : `${minutes}분`} 뒤 알람이 설정됐어요`);
  };

  const clearAlarm = () => {
    setAlarmEnabled(false);
    setAlarmAt('');
    setLastAlarmAt(null);
    setFlashMessage('알람이 해제됐어요');
  };

  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const renderMemoEditor = (standalone = false) => (
    <section
      className={cn(
        'rounded-2xl border border-slate-200 bg-white shadow-sm p-4 transition-all duration-200',
        standalone && 'flex h-full flex-1 min-h-0 flex-col'
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-bold text-slate-800">{standalone ? '메모 전체 보기' : '메모 편집'}</div>
          <div className="text-[10px] text-slate-400">
            {standalone ? '현재 메모만 길게 보는 상태예요.' : '메모를 누르면 크게 열리고 길게 볼 수 있어요.'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMemoExpanded((prev) => !prev)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
            aria-label={memoExpanded ? '메모 접기' : '메모 펼치기'}
          >
            {memoExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={deleteActiveNote}
            className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-500 hover:bg-rose-100 transition-colors"
            aria-label="메모 삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeNote && (
        <>
          <input
            type="text"
            value={activeNote.title}
            onChange={(e) => updateActiveNote({ title: e.target.value })}
            className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-300"
            placeholder="메모 제목"
          />
          <textarea
            value={activeNote.content}
            onChange={(e) => updateActiveNote({ content: e.target.value })}
            className={cn(
              'w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[12px] leading-6 text-slate-700 placeholder:text-slate-300 outline-none resize-none focus:border-slate-300 transition-[min-height,height] duration-200',
              standalone ? 'flex-1 min-h-0 h-full' : 'min-h-[260px]'
            )}
            placeholder="작업 아이디어, 메모, 회의 내용을 자유롭게 적어보세요."
          />
        </>
      )}
    </section>
  );

  return (
    <aside
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        maxWidth: sidebarWidth,
        inlineSize: sidebarWidth,
        minInlineSize: sidebarWidth,
        maxInlineSize: sidebarWidth,
        flexBasis: sidebarWidth,
        boxSizing: 'border-box',
        contain: 'layout paint style',
        overflowX: 'hidden',
      }}
      className={cn(
        'h-full shrink-0 overflow-hidden overflow-x-hidden border-l border-slate-200 bg-white/95 backdrop-blur-sm transition-[width] duration-300 ease-out flex flex-col flex-[0_0_auto]',
        isOpen ? 'w-[280px] min-w-[280px] max-w-[280px] basis-[280px]' : 'w-14 min-w-14 max-w-14 basis-14'
      )}
    >
      <div className="h-full min-h-0 min-w-0 max-w-full overflow-x-hidden flex flex-col">
        <div
          className={cn(
            'flex items-center border-b border-slate-100',
            isOpen ? 'px-4 py-3 justify-between' : 'px-2 py-3 justify-center'
          )}
        >
          {isOpen ? (
            <>
              <div>
                <div className="text-[14px] font-bold text-slate-800">?묒뾽 硫붾え</div>
                <div className="text-[10px] text-slate-400">?먮룞 ??λ릺??媛쒖씤 硫붾え 蹂대뱶</div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
                    ) : (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

                {!isOpen ? (
          <div className="flex-1 flex flex-col items-center gap-2.5 pt-4">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center text-[11px] font-black">
              {ddayText}
            </div>
            <div className="flex flex-col items-center gap-2">
              {notes.slice(0, 4).map((note, index) => {
                const isSelected = activeNoteId === note.id;
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => openCollapsedNote(note.id)}
                    className={cn(
                      'relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors',
                      isSelected
                        ? 'border-violet-300 bg-violet-100 text-violet-700 shadow-sm'
                        : 'border-violet-200 bg-violet-50 text-violet-600 hover:border-violet-300 hover:bg-violet-100'
                    )}
                    aria-label={`${note.title || `메모 ${index + 1}`} 열기`}
                    title={note.title || `메모 ${index + 1}`}
                  >
                    <FileText className="h-4.5 w-4.5" />
                    <span className="absolute -right-1 -top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full border border-violet-100 bg-white px-1 text-[9px] font-bold text-violet-600 shadow-sm">
                      {index + 1}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className={cn('w-2.5 h-2.5 rounded-full', alarmEnabled ? 'bg-emerald-400' : 'bg-slate-200')} />
          </div>
        ) : memoExpanded ? (
          <div className="flex flex-1 min-h-0 overflow-hidden px-4 py-4">{renderMemoEditor(true)}</div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-2.5 [scrollbar-gutter:stable]">
            <section className="w-full max-w-full rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
              <div className="px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[28px] leading-none font-black tracking-tight">{ddayText}</div>
                    <div className="mt-1 text-[11px] font-semibold opacity-95">{ddayLabel || '留덇컧'}</div>
                  </div>
                  <CalendarDays className="mt-1 h-4 w-4 shrink-0 opacity-80" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="date"
                    value={ddayDate}
                    onChange={(e) => setDdayDate(e.target.value)}
                    className="flex-1 rounded-lg border border-white/15 bg-white/15 px-2 py-1 text-[11px] text-white outline-none [color-scheme:dark]"
                  />
                  <input
                    type="text"
                    value={ddayLabel}
                    onChange={(e) => setDdayLabel(e.target.value)}
                    className="w-24 rounded-lg border border-white/15 bg-white/15 px-2 py-1 text-[11px] text-white placeholder:text-white/70 outline-none"
                    placeholder="라벨"
                  />
                </div>
              </div>
            </section>

            <section className="w-full max-w-full rounded-2xl border border-slate-200 bg-white shadow-sm p-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-bold text-slate-800">?뚮엺 ?ㅼ젙</div>
                  <div className="text-[9px] text-slate-400">鍮좊Ⅴ寃?留욎텛??媛꾪렪 ?뚮엺</div>
                </div>
                <div
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
                    alarmEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  <Bell className="h-3 w-3" />
                  {alarmEnabled ? '설정됨' : '꺼짐'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {ALARM_PRESETS.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setAlarmByMinutes(minutes)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-1 py-0.5 text-[8.5px] font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                  >
                    {minutes === 60 ? '1시간 뒤' : `${minutes}분 뒤`}
                  </button>
                ))}
              </div>

              <div className="mt-1 flex items-start justify-between gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-700">
                    <Clock3 className="h-3 w-3 text-slate-400" />
                    {alarmEnabled && alarmAt ? '다음 알람' : '알람 없음'}
                  </div>
                  <div className="mt-0.5 text-[8.5px] text-slate-500">
                    {alarmEnabled && alarmAt
                      ? `${formatAlarmTarget(alarmAt)} · ${minutesLeft ?? 0}분 남음`
                      : '위의 버튼을 눌러 빠르게 시작해보세요.'}
                  </div>
                </div>
                {alarmEnabled && (
                  <button
                    type="button"
                    onClick={clearAlarm}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-1 py-0.5 text-[8.5px] font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-colors"
                  >
                    ?댁젣
                  </button>
                )}
              </div>

              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="text-[8.5px] text-slate-400">
                  {permission === 'granted'
                    ? '브라우저 알림 권한이 켜져 있어요'
                    : permission === 'denied'
                      ? '브라우저 알림이 차단돼 있어요'
                      : permission === 'unsupported'
                        ? '이 브라우저는 알림을 지원하지 않아요'
                        : '브라우저 알림 권한을 허용하면 알려드려요'}
                </div>
                {permission === 'default' && (
                  <button
                    type="button"
                    onClick={requestPermission}
                    className="rounded-lg bg-slate-900 px-1 py-0.5 text-[8.5px] font-semibold text-white hover:bg-slate-800 transition-colors"
                  >
                    沅뚰븳 ?붿껌
                  </button>
                )}
              </div>

              {flashMessage && (
                <div className="mt-1 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-medium text-amber-800">
                  {flashMessage}
                </div>
              )}
            </section>

            <section className="w-full max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm p-3">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-bold text-slate-800">硫붾え 紐⑸줉</div>
                  <div className="text-[10px] text-slate-400">硫붾え???꾨옒?먯꽌留??ㅽ겕濡ㅻ맗?덈떎</div>
                </div>
                <button
                  type="button"
                  onClick={createNote}
                  className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  ??硫붾え
                </button>
              </div>

              <div
                className="space-y-2 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-gutter:stable]"
                style={{ maxHeight: 'calc(100vh - 300px)' }}
              >
                {notes.map((note, index) => {
                  const isActive = note.id === activeNote?.id;
                  const canMoveUp = index > 0;
                  const canMoveDown = index < notes.length - 1;
                  return (
                    <div
                      key={note.id}
                      className={cn(
                        'w-full max-w-full min-w-0 overflow-hidden rounded-xl border px-3 py-2.5 transition-colors',
                        isActive
                          ? 'border-violet-300 bg-violet-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => openNote(note.id)}
                          className="min-w-0 flex flex-1 items-start gap-2.5 text-left"
                        >
                          <div
                            className={cn(
                              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                              isActive ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-500'
                            )}
                          >
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[12px] font-semibold text-slate-800">
                              {note.title || '?쒕ぉ ?녿뒗 硫붾え'}
                            </div>
                            <div className="mt-0.5 line-clamp-2 text-[10px] leading-4.5 text-slate-500">
                              {getPreview(note.content)}
                            </div>
                          </div>
                        </button>
                        <div className="shrink-0 flex items-start gap-1.5">
                          <div className="pt-0.5 text-[10px] text-slate-400">
                            {new Date(note.updatedAt).toLocaleDateString('ko-KR')}
                          </div>
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => moveNote(note.id, 'up')}
                              disabled={!canMoveUp}
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-md border transition-colors',
                                canMoveUp
                                  ? 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                  : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                              )}
                              aria-label="메모 위로 이동"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveNote(note.id, 'down')}
                              disabled={!canMoveDown}
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-md border transition-colors',
                                canMoveDown
                                  ? 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                  : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                              )}
                              aria-label="메모 아래로 이동"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}

