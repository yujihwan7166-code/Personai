/**
 * 화이트보드 — 4번째 노트 페이지.
 *
 * Step 2: store 연결 + 보드 CRUD + 캔버스 팬·줌.
 * Step 3 예정: 요소 렌더 + 도구 동작.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MousePointer2,
  Hand,
  Type,
  StickyNote,
  Square,
  Minus,
  Pencil,
  Eraser,
  Plus,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
  Maximize2,
  HelpCircle,
  Save,
  Trash2,
  Folder as FolderIcon,
  Pencil as PencilIcon,
  Copy,
  Star,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageSwitcher } from '@/components/PageSwitcher';
import { notify } from '@/lib/notify';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  addBoard,
  addElement,
  addFolder,
  duplicateBoard,
  getBoard,
  getBoardData,
  newElementId,
  purgeBoard,
  removeElements,
  removeFolder,
  renameBoard,
  renameFolder,
  restoreBoard,
  setActiveBoardId,
  setElements,
  setTool,
  setViewport,
  toggleBoardStarred,
  trashBoard,
  updateElement,
  useBoardData,
  useBoards,
  useFolders,
  useSettings,
  useTrashedBoards,
} from '@/lib/whiteboardStore';
import type {
  WBArrow,
  WBBoard,
  WBElement,
  WBFreedraw,
  WBLine,
  WBRect,
  WBSticky,
  WBText,
  WBToolKind,
  WBToolState,
  WBViewport,
} from '@/types/whiteboard';
import { Element as WBElementRenderer } from '@/components/whiteboard/elements';
import {
  elementBBox,
  findElementAt,
  findElementsInRect,
  nextZIndex,
  rectFromPoints,
  screenToWorld,
} from '@/lib/whiteboard/geometry';
import { WB_STICKY_BG } from '@/lib/whiteboard/colors';
import { canRedo, canUndo, clearHistory, pushSnapshot, redo, undo } from '@/lib/whiteboard/history';

// ──────────────────────────────────────────
// 도구 정의
interface ToolDef {
  key: WBToolKind;
  label: string;
  shortcut: string;
  icon: LucideIcon;
  hasFlyout?: boolean;
}

const TOOLS: ToolDef[] = [
  { key: 'select',  label: '선택',     shortcut: 'V', icon: MousePointer2 },
  { key: 'pan',     label: '손/팬',    shortcut: 'H', icon: Hand },
  { key: 'text',    label: '텍스트',   shortcut: 'T', icon: Type },
  { key: 'sticky',  label: '스티키',   shortcut: 'S', icon: StickyNote,  hasFlyout: true },
  { key: 'shape',   label: '도형',     shortcut: 'R', icon: Square,      hasFlyout: true },
  { key: 'line',    label: '선·화살표', shortcut: 'L', icon: Minus,       hasFlyout: true },
  { key: 'pen',     label: '펜',       shortcut: 'P', icon: Pencil,      hasFlyout: true },
  { key: 'eraser',  label: '지우개',   shortcut: 'E', icon: Eraser },
];

const TOOL_GROUPS: Array<WBToolKind[]> = [
  ['select', 'pan'],
  ['text', 'sticky', 'shape', 'line', 'pen'],
  ['eraser'],
];

// ──────────────────────────────────────────
export default function Whiteboard() {
  const boards = useBoards();
  const folders = useFolders();
  const settings = useSettings();
  const activeBoardId = settings.activeBoardId;
  const activeBoard = activeBoardId ? boards.find((b) => b.id === activeBoardId) ?? getBoard(activeBoardId) ?? null : null;
  const boardData = useBoardData(activeBoardId);

  // 새 보드가 하나도 없으면 첫 진입 시 안내만, 자동 생성 X (메모 패턴)
  // 활성 보드가 휴지통 등으로 사라졌으면 해제
  useEffect(() => {
    if (activeBoardId && !boards.some((b) => b.id === activeBoardId)) {
      setActiveBoardId(null);
    }
  }, [activeBoardId, boards]);

  return (
    <div className="wiki-warm-theme min-h-screen flex bg-background">
      <Sidebar boards={boards} folders={folders} activeBoardId={activeBoardId} />
      <main className="flex-1 min-w-0 relative overflow-hidden bg-background">
        {activeBoard ? (
          <BoardCanvas
            board={activeBoard}
            elements={boardData?.elements ?? []}
            viewport={boardData?.viewport ?? { x: 0, y: 0, zoom: 1 }}
            toolState={settings.tool}
          />
        ) : (
          <EmptyMain />
        )}
      </main>
    </div>
  );
}

// ──────────────────────────────────────────
// 사이드바
function Sidebar({
  boards,
  folders,
  activeBoardId,
}: {
  boards: WBBoard[];
  folders: ReturnType<typeof useFolders>;
  activeBoardId: string | null;
}) {
  const trashed = useTrashedBoards();
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleFolder = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const unfiledBoards = boards.filter((b) => !b.folderId);
  const boardsByFolder = (fid: string) => boards.filter((b) => b.folderId === fid);

  const handleNewBoard = (folderId: string | null = null) => {
    addBoard('새 보드', folderId);
    if (folderId) setExpanded((prev) => new Set(prev).add(folderId));
  };

  return (
    <aside className="shrink-0 w-[268px] border-r border-foreground/25 bg-background flex flex-col">
      {/* 상단 — 제목 + 새 폴더·새 보드 */}
      <div className="shrink-0 px-2.5 py-2 border-b border-foreground/22 flex items-center gap-1">
        <h1 className="text-[19px] font-semibold text-foreground tracking-tight flex-1 flex items-baseline gap-2">
          <span>화이트보드</span>
          <span className="text-[12px] font-normal text-muted-foreground tabular-nums">{boards.length}</span>
        </h1>
        <button
          type="button"
          onClick={() => setCreatingFolder(true)}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="새 폴더"
        >
          <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.75} />
          폴더
        </button>
        <button
          type="button"
          onClick={() => handleNewBoard(null)}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[12px] font-medium text-primary hover:bg-primary/10 transition-colors"
          title="새 보드"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          보드
        </button>
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto">
        {/* 폴더들 */}
        {(folders.length > 0 || creatingFolder) && (
          <div className="px-1.5 pt-1.5 pb-0.5 space-y-0.5">
            {folders.map((f) => {
              const isExpanded = expanded.has(f.id);
              const folderBoards = boardsByFolder(f.id);
              if (renamingFolder === f.id) {
                return (
                  <FolderRenameInput
                    key={f.id}
                    initial={f.name}
                    onSubmit={(name) => { renameFolder(f.id, name); setRenamingFolder(null); }}
                    onCancel={() => setRenamingFolder(null)}
                  />
                );
              }
              return (
                <div key={f.id}>
                  <div
                    className="group flex items-center gap-2 h-9 px-2 rounded-md cursor-pointer text-foreground hover:bg-foreground/5 transition-colors"
                    onClick={() => toggleFolder(f.id)}
                  >
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-65" strokeWidth={2} />
                      : <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-65" strokeWidth={2} />}
                    <FolderIcon className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <span className="flex-1 text-[14px] font-medium truncate text-foreground">{f.name}</span>
                    <span className="text-[11.5px] tabular-nums text-foreground/55 group-hover:hidden">{folderBoards.length}</span>
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleNewBoard(f.id); }}
                        className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        title="이 폴더에 새 보드"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setRenamingFolder(f.id); }}
                        className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                        title="이름 바꾸기"
                      >
                        <PencilIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!window.confirm(`"${f.name}" 폴더를 지울까요? 안 보드는 미분류로 이동합니다.`)) return;
                          removeFolder(f.id);
                        }}
                        className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="폴더 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    folderBoards.length === 0 ? (
                      <p className="ml-8 h-8 flex items-center px-3 text-[12px] text-muted-foreground italic">비어있음</p>
                    ) : (
                      <ul>
                        {folderBoards.map((b) => (
                          <li key={b.id} className="pl-8 relative group">
                            <BoardRow board={b} active={activeBoardId === b.id} />
                          </li>
                        ))}
                      </ul>
                    )
                  )}
                </div>
              );
            })}
            {creatingFolder && (
              <FolderRenameInput
                initial=""
                placeholder="폴더 이름"
                onSubmit={(name) => {
                  if (name.trim()) {
                    const f = addFolder(name);
                    setExpanded((prev) => new Set(prev).add(f.id));
                  }
                  setCreatingFolder(false);
                }}
                onCancel={() => setCreatingFolder(false)}
              />
            )}
          </div>
        )}

        {/* 미분류 보드 */}
        {unfiledBoards.length > 0 ? (
          <ul className="px-1.5 pb-0.5">
            {unfiledBoards.map((b) => (
              <li key={b.id} className="relative group">
                <BoardRow board={b} active={activeBoardId === b.id} loose />
              </li>
            ))}
          </ul>
        ) : (
          folders.length === 0 && !creatingFolder && (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] text-foreground mb-1">비어있음</p>
              <p className="text-[12px] text-muted-foreground">+ 버튼으로 새 보드 시작</p>
            </div>
          )
        )}
      </div>

      {/* 휴지통 */}
      <div className="shrink-0 border-t border-foreground/22">
        <button
          type="button"
          onClick={() => setShowTrash((v) => !v)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-[12.5px] transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
            showTrash && 'text-foreground',
          )}
        >
          <Trash2 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
          <span className="flex-1 text-left">휴지통</span>
          <span className="text-[10.5px] tabular-nums">{trashed.length}</span>
          <ChevronRight
            className={cn('w-3 h-3 opacity-60 transition-transform', showTrash && 'rotate-90')}
            strokeWidth={2}
          />
        </button>
        {showTrash && (
          trashed.length === 0 ? (
            <p className="px-5 py-2 text-[11px] text-muted-foreground italic">비어있음</p>
          ) : (
            <ul className="pb-1">
              {trashed.map((b) => (
                <li key={b.id} className="relative group flex items-center gap-1 px-3 py-1.5 text-[12.5px] hover:bg-foreground/5">
                  <span className="flex-1 truncate text-foreground/70">{b.name}</span>
                  <button
                    type="button"
                    onClick={() => restoreBoard(b.id)}
                    className="text-[11px] text-primary hover:underline"
                  >복원</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`"${b.name}" 보드를 영구 삭제할까요? 되돌릴 수 없습니다.`)) return;
                      purgeBoard(b.id);
                    }}
                    className="text-[11px] text-destructive hover:underline"
                  >영구삭제</button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </aside>
  );
}

// ──────────────────────────────────────────
function BoardRow({ board, active, loose = false }: { board: WBBoard; active: boolean; loose?: boolean }) {
  const handleSelect = () => setActiveBoardId(board.id);
  return (
    <>
      <button
        type="button"
        onClick={handleSelect}
        className={cn(
          'relative w-full text-left transition-all rounded-md flex items-center gap-1.5 h-8 px-2 pr-9',
          active
            ? 'bg-foreground/14 ring-1 ring-inset ring-foreground/28 text-foreground'
            : 'text-foreground hover:bg-foreground/5',
        )}
      >
        {board.starred && <Star className="w-3 h-3 text-amber-500 shrink-0" fill="currentColor" strokeWidth={1.5} />}
        {!board.starred && <span aria-hidden className={cn('w-1 h-1 rounded-full shrink-0', loose ? 'bg-muted-foreground/45' : 'bg-muted-foreground/35')} />}
        <span className={cn(
          'truncate flex-1 text-[13.5px] leading-tight',
          active ? 'font-bold text-foreground' : 'font-medium text-foreground/90',
        )}>{board.name}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-background hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 transition-opacity"
            aria-label="더 보기"
          >
            <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => {
            const next = window.prompt('보드 이름', board.name);
            if (next != null && next.trim()) renameBoard(board.id, next);
          }}>
            <PencilIcon className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
            이름 바꾸기
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggleBoardStarred(board.id)}>
            <Star className="w-3.5 h-3.5 mr-2" fill={board.starred ? 'currentColor' : 'none'} strokeWidth={1.75} />
            {board.starred ? '고정 해제' : '맨 위에 고정'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { duplicateBoard(board.id); }}>
            <Copy className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
            복제
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              trashBoard(board.id);
              notify.info('휴지통으로 이동', {
                duration: 5000,
                action: { label: '되돌리기', onClick: () => restoreBoard(board.id) },
              });
            }}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

// ──────────────────────────────────────────
function FolderRenameInput({
  initial,
  placeholder,
  onSubmit,
  onCancel,
}: {
  initial: string;
  placeholder?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  return (
    <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-accent/60">
      <FolderIcon className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit(draft);
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={() => onSubmit(draft)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[14px] text-foreground outline-none"
      />
    </div>
  );
}

// ──────────────────────────────────────────
// 빈 메인 — 활성 보드 없음
function EmptyMain() {
  return (
    <div className="relative w-full h-full">
      {/* dot grid 배경 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.10) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />
      <div className="absolute right-4 top-4">
        <PageSwitcher current="whiteboard" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center max-w-[320px]">
          <div className="text-5xl mb-4">🎨</div>
          <p className="text-[16px] font-medium text-foreground mb-1.5">보드를 선택하거나 새로 만들어보세요</p>
          <p className="text-[13px] text-muted-foreground mb-4">자유 캔버스에 스티키·도형·연결선을 배치하며 생각을 정리해요.</p>
          <button
            type="button"
            onClick={() => addBoard('새 보드', null)}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            새 보드 만들기
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 인터랙션 상태 (캔버스 임시 상태 — store 에 박지 않음)
type ResizeHandle = 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w';

type Interaction =
  | { kind: 'idle' }
  | { kind: 'panning'; startX: number; startY: number; vx: number; vy: number }
  | { kind: 'creating'; tool: WBToolKind; start: { x: number; y: number }; current: { x: number; y: number }; tempElement?: WBElement }
  | { kind: 'drawing-line'; arrow: boolean; start: { x: number; y: number }; current: { x: number; y: number } }
  | { kind: 'pen'; points: Array<[number, number]> }
  | { kind: 'erasing'; ids: Set<string> }
  | { kind: 'dragging'; ids: string[]; startWorld: { x: number; y: number }; origin: Map<string, { x: number; y: number }> }
  | { kind: 'resizing'; handle: ResizeHandle; ids: string[]; startWorld: { x: number; y: number }; origin: Map<string, { x: number; y: number; w: number; h: number }> }
  | { kind: 'marquee'; start: { x: number; y: number }; current: { x: number; y: number }; baseSelection: Set<string> };

// 활성 보드 — 캔버스 + 플로팅 UI
function BoardCanvas({
  board,
  elements,
  viewport,
  toolState,
}: {
  board: WBBoard;
  elements: WBElement[];
  viewport: WBViewport;
  toolState: WBToolState;
}) {
  const tool = toolState.kind;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [interaction, setInteraction] = useState<Interaction>({ kind: 'idle' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);

  // 컨테이너 사이즈 추적
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 새 보드로 전환 시 선택·편집 초기화 + 초기 history snapshot
  useEffect(() => {
    setSelection(new Set());
    setEditingId(null);
    setInteraction({ kind: 'idle' });
    clearHistory(board.id);
    pushSnapshot(board.id, elements);
    // 의존: board.id 만 — 매 elements 변경 시 reset 안 함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  // 트랜잭션 끝 — history 에 스냅샷
  const commitHistory = useCallback(() => {
    pushSnapshot(board.id, elements);
  }, [board.id, elements]);

  // undo / redo
  const doUndo = useCallback(() => {
    const prev = undo(board.id);
    if (prev) {
      setElements(board.id, prev);
      setSelection(new Set());
    }
  }, [board.id]);
  const doRedo = useCallback(() => {
    const next = redo(board.id);
    if (next) {
      setElements(board.id, next);
      setSelection(new Set());
    }
  }, [board.id]);

  // 선택 요소 복제·이동·z-order
  const duplicateSelected = useCallback(() => {
    if (selection.size === 0) return;
    const ids = new Set(selection);
    const newOnes: WBElement[] = [];
    const newIds = new Set<string>();
    let z = nextZIndex(elements);
    for (const el of elements) {
      if (!ids.has(el.id)) continue;
      const copy: WBElement = {
        ...el,
        id: newElementId(),
        x: el.x + 16,
        y: el.y + 16,
        zIndex: z++,
        updatedAt: Date.now(),
      };
      newOnes.push(copy);
      newIds.add(copy.id);
    }
    setElements(board.id, [...elements, ...newOnes]);
    setSelection(newIds);
    pushSnapshot(board.id, [...elements, ...newOnes]);
  }, [board.id, elements, selection]);

  const moveSelected = useCallback((dx: number, dy: number) => {
    if (selection.size === 0) return;
    const next = elements.map((el) =>
      selection.has(el.id) ? { ...el, x: el.x + dx, y: el.y + dy, updatedAt: Date.now() } : el,
    );
    setElements(board.id, next);
  }, [board.id, elements, selection]);

  const changeZOrder = useCallback((mode: 'front' | 'back' | 'forward' | 'backward') => {
    if (selection.size === 0) return;
    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const minZ = sorted[0]?.zIndex ?? 0;
    const maxZ = sorted[sorted.length - 1]?.zIndex ?? 0;
    const next = elements.map((el) => {
      if (!selection.has(el.id)) return el;
      let z = el.zIndex;
      if (mode === 'front') z = maxZ + 1;
      else if (mode === 'back') z = minZ - 1;
      else if (mode === 'forward') z = el.zIndex + 1.5;
      else if (mode === 'backward') z = el.zIndex - 1.5;
      return { ...el, zIndex: z, updatedAt: Date.now() };
    });
    // zIndex 정규화 (정수로)
    const normalized = [...next].sort((a, b) => a.zIndex - b.zIndex).map((el, i) => ({ ...el, zIndex: i }));
    setElements(board.id, normalized);
    pushSnapshot(board.id, normalized);
  }, [board.id, elements, selection]);

  // 클립보드 (메모리 한정)
  const clipboardRef = useRef<WBElement[] | null>(null);
  const copySelected = useCallback(() => {
    if (selection.size === 0) return;
    clipboardRef.current = elements.filter((el) => selection.has(el.id));
  }, [elements, selection]);
  const pasteClipboard = useCallback(() => {
    const items = clipboardRef.current;
    if (!items || items.length === 0) return;
    const newOnes: WBElement[] = [];
    const newIds = new Set<string>();
    let z = nextZIndex(elements);
    for (const el of items) {
      const copy: WBElement = {
        ...el,
        id: newElementId(),
        x: el.x + 24,
        y: el.y + 24,
        zIndex: z++,
        updatedAt: Date.now(),
      };
      newOnes.push(copy);
      newIds.add(copy.id);
    }
    setElements(board.id, [...elements, ...newOnes]);
    setSelection(newIds);
    pushSnapshot(board.id, [...elements, ...newOnes]);
  }, [board.id, elements]);

  // 전역 단축키
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      // space hold
      if (e.key === ' ') {
        e.preventDefault();
        setSpaceDown(true);
        return;
      }
      // 도구 단축키
      const key = e.key.toLowerCase();
      const toolMap: Record<string, WBToolKind> = {
        v: 'select', h: 'pan', t: 'text', s: 'sticky',
        r: 'shape', l: 'line', a: 'line', p: 'pen', e: 'eraser',
      };
      const shapeKey: Record<string, WBToolState['shapeKind']> = { o: 'ellipse', d: 'diamond' };
      if (e.key === 'Escape') {
        if (editingId) { setEditingId(null); return; }
        if (interaction.kind !== 'idle') { setInteraction({ kind: 'idle' }); return; }
        if (selection.size > 0) { setSelection(new Set()); return; }
        setTool({ kind: 'select' });
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.size > 0) {
        e.preventDefault();
        removeElements(board.id, [...selection]);
        setSelection(new Set());
        pushSnapshot(board.id, elements.filter((el) => !selection.has(el.id)));
        return;
      }
      // 화살표 키 이동
      if (selection.size > 0 && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        moveSelected(dx, dy);
        return;
      }
      // Ctrl/Cmd 단축키
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); return; }
        if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); doRedo(); return; }
        if (k === 'a') {
          e.preventDefault();
          setSelection(new Set(elements.filter((el) => !el.locked).map((el) => el.id)));
          return;
        }
        if (k === 'd') { e.preventDefault(); duplicateSelected(); return; }
        if (k === 'c') { e.preventDefault(); copySelected(); return; }
        if (k === 'v') { e.preventDefault(); pasteClipboard(); return; }
        if (k === 'x') { e.preventDefault(); copySelected(); removeElements(board.id, [...selection]); setSelection(new Set()); pushSnapshot(board.id, elements.filter((el) => !selection.has(el.id))); return; }
        if (e.key === ']') { e.preventDefault(); changeZOrder(e.shiftKey ? 'front' : 'forward'); return; }
        if (e.key === '[') { e.preventDefault(); changeZOrder(e.shiftKey ? 'back' : 'backward'); return; }
        return;
      }
      // 단독 [ ] (Ctrl 없이) — z-order 한 칸
      if (e.key === ']') { e.preventDefault(); changeZOrder('forward'); return; }
      if (e.key === '[') { e.preventDefault(); changeZOrder('backward'); return; }
      if (e.altKey) return;
      if (toolMap[key]) {
        setTool({ kind: toolMap[key] });
        if (key === 'a') setTool({ lineKind: 'arrow-solid' });
        if (key === 'l') setTool({ lineKind: 'line' });
      } else if (shapeKey[key]) {
        setTool({ kind: 'shape', shapeKind: shapeKey[key] });
      } else if (key === 'r') {
        setTool({ kind: 'shape', shapeKind: 'rect' });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setSpaceDown(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [board.id, editingId, elements, interaction, selection, doUndo, doRedo, duplicateSelected, copySelected, pasteClipboard, moveSelected, changeZOrder]);

  // 화면 좌표 → world
  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return screenToWorld(clientX, clientY, rect, viewport);
  }, [viewport]);

  // 휠 — 팬 / 줌
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.002);
      const nextZoom = clamp(viewport.zoom * factor, 0.1, 5);
      const worldX = viewport.x + sx / viewport.zoom;
      const worldY = viewport.y + sy / viewport.zoom;
      setViewport(board.id, { x: worldX - sx / nextZoom, y: worldY - sy / nextZoom, zoom: nextZoom });
    } else {
      setViewport(board.id, {
        ...viewport,
        x: viewport.x + (e.shiftKey ? e.deltaY : e.deltaX) / viewport.zoom,
        y: viewport.y + (e.shiftKey ? 0 : e.deltaY) / viewport.zoom,
      });
    }
  }, [board.id, viewport]);

  const isPanMode = tool === 'pan' || spaceDown;

  // ── pointer down ──────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (editingId) return;  // 편집 중에는 무시
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();

    // 팬 모드 또는 중간 버튼
    if (isPanMode || e.button === 1) {
      setInteraction({ kind: 'panning', startX: e.clientX, startY: e.clientY, vx: viewport.x, vy: viewport.y });
      return;
    }

    const wp = toWorld(e.clientX, e.clientY);

    if (tool === 'select') {
      // 단일 선택 + 핸들 hit-test
      if (selection.size === 1) {
        const onlyId = [...selection][0];
        const onlyEl = elements.find((x) => x.id === onlyId);
        if (onlyEl) {
          const handle = findResizeHandle(onlyEl, wp, viewport.zoom);
          if (handle) {
            const origin = new Map<string, { x: number; y: number; w: number; h: number }>();
            origin.set(onlyEl.id, { x: onlyEl.x, y: onlyEl.y, w: onlyEl.w, h: onlyEl.h });
            setInteraction({ kind: 'resizing', handle, ids: [onlyEl.id], startWorld: wp, origin });
            return;
          }
        }
      }
      const hit = findElementAt(elements, wp.x, wp.y);
      if (hit) {
        // 선택 토글 (Shift) 또는 갈음
        if (e.shiftKey) {
          setSelection((prev) => {
            const next = new Set(prev);
            if (next.has(hit.id)) next.delete(hit.id);
            else next.add(hit.id);
            return next;
          });
          return;
        }
        const nextSelection = selection.has(hit.id) ? selection : new Set([hit.id]);
        if (!selection.has(hit.id)) setSelection(nextSelection);
        const origin = new Map<string, { x: number; y: number }>();
        for (const el of elements) {
          if (nextSelection.has(el.id)) origin.set(el.id, { x: el.x, y: el.y });
        }
        setInteraction({ kind: 'dragging', ids: [...nextSelection], startWorld: wp, origin });
      } else {
        // 빈 영역 — marquee
        if (!e.shiftKey) setSelection(new Set());
        setInteraction({ kind: 'marquee', start: wp, current: wp, baseSelection: e.shiftKey ? new Set(selection) : new Set() });
      }
      return;
    }

    if (tool === 'sticky') {
      const sticky = makeSticky(wp, toolState);
      sticky.zIndex = nextZIndex(elements);
      addElement(board.id, sticky);
      setSelection(new Set([sticky.id]));
      setEditingId(sticky.id);
      return;
    }

    if (tool === 'text') {
      const text = makeText(wp);
      text.zIndex = nextZIndex(elements);
      addElement(board.id, text);
      setSelection(new Set([text.id]));
      setEditingId(text.id);
      return;
    }

    if (tool === 'shape') {
      setInteraction({ kind: 'creating', tool: 'shape', start: wp, current: wp });
      return;
    }

    if (tool === 'line') {
      const arrow = toolState.lineKind !== 'line';
      setInteraction({ kind: 'drawing-line', arrow, start: wp, current: wp });
      return;
    }

    if (tool === 'pen') {
      setInteraction({ kind: 'pen', points: [[wp.x, wp.y]] });
      return;
    }

    if (tool === 'eraser') {
      const hit = findElementAt(elements, wp.x, wp.y);
      const ids = new Set<string>();
      if (hit) ids.add(hit.id);
      setInteraction({ kind: 'erasing', ids });
      return;
    }
  };

  // ── pointer move ──────────────────────────
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interaction.kind === 'idle') return;
    const wp = toWorld(e.clientX, e.clientY);

    if (interaction.kind === 'panning') {
      const dx = (e.clientX - interaction.startX) / viewport.zoom;
      const dy = (e.clientY - interaction.startY) / viewport.zoom;
      setViewport(board.id, { ...viewport, x: interaction.vx - dx, y: interaction.vy - dy });
      return;
    }

    if (interaction.kind === 'dragging') {
      const dx = wp.x - interaction.startWorld.x;
      const dy = wp.y - interaction.startWorld.y;
      const next = elements.map((el) => {
        if (!interaction.ids.includes(el.id)) return el;
        const org = interaction.origin.get(el.id);
        if (!org) return el;
        return { ...el, x: org.x + dx, y: org.y + dy, updatedAt: Date.now() };
      });
      setElements(board.id, next);
      return;
    }

    if (interaction.kind === 'resizing') {
      const dx = wp.x - interaction.startWorld.x;
      const dy = wp.y - interaction.startWorld.y;
      const id = interaction.ids[0];
      const org = interaction.origin.get(id);
      if (!org) return;
      const { x, y, w, h } = org;
      const minSize = 10;
      const lockRatio = e.shiftKey;
      const fromCenter = e.altKey;
      let newW = w, newH = h, newX = x, newY = y;
      switch (interaction.handle) {
        case 'e': newW = Math.max(minSize, w + dx); break;
        case 'w': newW = Math.max(minSize, w - dx); newX = x + (w - newW); break;
        case 's': newH = Math.max(minSize, h + dy); break;
        case 'n': newH = Math.max(minSize, h - dy); newY = y + (h - newH); break;
        case 'se': newW = Math.max(minSize, w + dx); newH = Math.max(minSize, h + dy); break;
        case 'sw': newW = Math.max(minSize, w - dx); newH = Math.max(minSize, h + dy); newX = x + (w - newW); break;
        case 'ne': newW = Math.max(minSize, w + dx); newH = Math.max(minSize, h - dy); newY = y + (h - newH); break;
        case 'nw': newW = Math.max(minSize, w - dx); newH = Math.max(minSize, h - dy); newX = x + (w - newW); newY = y + (h - newH); break;
      }
      if (lockRatio) {
        const aspect = w / h;
        if (interaction.handle === 'e' || interaction.handle === 'w') {
          newH = newW / aspect;
        } else if (interaction.handle === 'n' || interaction.handle === 's') {
          newW = newH * aspect;
        } else {
          // 코너 — 더 큰 비율로 맞춤
          if (Math.abs(newW / w) > Math.abs(newH / h)) newH = newW / aspect;
          else newW = newH * aspect;
        }
      }
      if (fromCenter) {
        // 중심 기준 — 반대편도 같이
        const cx = x + w / 2;
        const cy = y + h / 2;
        newX = cx - newW / 2;
        newY = cy - newH / 2;
      }
      const next = elements.map((el) =>
        el.id === id ? { ...el, x: newX, y: newY, w: newW, h: newH, updatedAt: Date.now() } : el,
      );
      setElements(board.id, next);
      return;
    }

    if (interaction.kind === 'marquee') {
      setInteraction({ ...interaction, current: wp });
      const rect = rectFromPoints(interaction.start, wp);
      const inRect = findElementsInRect(elements, rect);
      const next = new Set(interaction.baseSelection);
      for (const el of inRect) next.add(el.id);
      setSelection(next);
      return;
    }

    if (interaction.kind === 'creating') {
      setInteraction({ ...interaction, current: wp });
      return;
    }

    if (interaction.kind === 'drawing-line') {
      let nx = wp.x;
      let ny = wp.y;
      if (e.shiftKey) {
        // 15° 스냅
        const dx = wp.x - interaction.start.x;
        const dy = wp.y - interaction.start.y;
        const angle = Math.atan2(dy, dx);
        const snap = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
        const dist = Math.hypot(dx, dy);
        nx = interaction.start.x + Math.cos(snap) * dist;
        ny = interaction.start.y + Math.sin(snap) * dist;
      }
      setInteraction({ ...interaction, current: { x: nx, y: ny } });
      return;
    }

    if (interaction.kind === 'pen') {
      const last = interaction.points[interaction.points.length - 1];
      const dx = wp.x - last[0];
      const dy = wp.y - last[1];
      if (dx * dx + dy * dy < 1) return;  // 너무 가까운 점 무시
      setInteraction({ kind: 'pen', points: [...interaction.points, [wp.x, wp.y]] });
      return;
    }

    if (interaction.kind === 'erasing') {
      const hit = findElementAt(elements, wp.x, wp.y);
      if (hit && !interaction.ids.has(hit.id)) {
        const next = new Set(interaction.ids);
        next.add(hit.id);
        setInteraction({ kind: 'erasing', ids: next });
      }
      return;
    }
  };

  // ── pointer up ──────────────────────────
  const onPointerUp = (_e: React.PointerEvent<HTMLDivElement>) => {
    if (interaction.kind === 'idle') return;

    let nextElements: WBElement[] | null = null;
    let shouldCommit = false;

    if (interaction.kind === 'creating') {
      const rect = rectFromPoints(interaction.start, interaction.current);
      if (rect.w >= 2 && rect.h >= 2) {
        const shape = makeShape(rect, toolState);
        if (shape) {
          shape.zIndex = nextZIndex(elements);
          nextElements = [...elements, shape];
          setElements(board.id, nextElements);
          setSelection(new Set([shape.id]));
          setEditingId(shape.id);
          shouldCommit = true;
        }
      }
    } else if (interaction.kind === 'drawing-line') {
      const dx = interaction.current.x - interaction.start.x;
      const dy = interaction.current.y - interaction.start.y;
      if (Math.hypot(dx, dy) >= 4) {
        const line = makeLineOrArrow(interaction.start, interaction.current, interaction.arrow, toolState);
        line.zIndex = nextZIndex(elements);
        nextElements = [...elements, line];
        setElements(board.id, nextElements);
        setSelection(new Set([line.id]));
        shouldCommit = true;
      }
    } else if (interaction.kind === 'pen') {
      if (interaction.points.length >= 2) {
        const freedraw = makeFreedraw(interaction.points, toolState);
        freedraw.zIndex = nextZIndex(elements);
        nextElements = [...elements, freedraw];
        setElements(board.id, nextElements);
        setSelection(new Set([freedraw.id]));
        shouldCommit = true;
      }
    } else if (interaction.kind === 'erasing') {
      if (interaction.ids.size > 0) {
        nextElements = elements.filter((el) => !interaction.ids.has(el.id));
        setElements(board.id, nextElements);
        shouldCommit = true;
      }
    } else if (interaction.kind === 'dragging' || interaction.kind === 'resizing') {
      shouldCommit = true;
    }
    setInteraction({ kind: 'idle' });
    if (shouldCommit) {
      // useEffect로 다음 tick 에서 commit (state 갱신 후 elements 가 최신이 됨)
      // 그러나 nextElements 이 있으면 그걸 즉시 commit 가능
      if (nextElements) pushSnapshot(board.id, nextElements);
      else commitHistory();
    }
  };

  // 줌 컨트롤 핸들러
  const zoomBy = (factor: number) => {
    const nextZoom = clamp(viewport.zoom * factor, 0.1, 5);
    const cx = size.w / 2;
    const cy = size.h / 2;
    const worldX = viewport.x + cx / viewport.zoom;
    const worldY = viewport.y + cy / viewport.zoom;
    setViewport(board.id, { x: worldX - cx / nextZoom, y: worldY - cy / nextZoom, zoom: nextZoom });
  };
  const zoomReset = () => {
    setViewport(board.id, { x: -size.w / 2, y: -size.h / 2, zoom: 1 });
  };

  const viewBox = `${viewport.x} ${viewport.y} ${(size.w || 1) / viewport.zoom} ${(size.h || 1) / viewport.zoom}`;
  const gridSize = 16;

  const cursorClass = isPanMode
    ? (interaction.kind === 'panning' ? 'cursor-grabbing' : 'cursor-grab')
    : tool === 'select' ? 'cursor-default'
    : tool === 'eraser' ? 'cursor-cell'
    : 'cursor-crosshair';

  // 정렬된 요소 (zIndex 오름차순 — 큰 게 위에 그려짐)
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  // 그리는 중 임시 요소
  const ghost = renderGhost(interaction, toolState);

  return (
    <>
      <div
        ref={containerRef}
        className={cn('absolute inset-0 select-none', cursorClass)}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={size.w > 0 ? viewBox : '0 0 1 1'}
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block' }}
        >
          <defs>
            <pattern
              id="wb-dotgrid"
              x={0}
              y={0}
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <circle cx={1} cy={1} r={0.8} fill="hsl(var(--foreground) / 0.10)" />
            </pattern>
          </defs>
          {size.w > 0 && (
            <rect
              x={viewport.x}
              y={viewport.y}
              width={size.w / viewport.zoom}
              height={size.h / viewport.zoom}
              fill="url(#wb-dotgrid)"
            />
          )}
          {/* 요소 레이어 */}
          {sorted.map((el) => (
            <g
              key={el.id}
              opacity={interaction.kind === 'erasing' && interaction.ids.has(el.id) ? 0.3 : 1}
            >
              <WBElementRenderer el={el} />
            </g>
          ))}
          {/* 선택 표시 + 단일 선택 시 핸들 */}
          {[...selection].map((id) => {
            const el = elements.find((x) => x.id === id);
            if (!el) return null;
            const bb = elementBBox(el);
            const showHandles = selection.size === 1 && tool === 'select' && el.type !== 'line' && el.type !== 'arrow' && el.type !== 'freedraw';
            const HANDLE = 8 / viewport.zoom;
            const points: Array<{ key: ResizeHandle; cx: number; cy: number }> = [
              { key: 'nw', cx: bb.x,           cy: bb.y },
              { key: 'n',  cx: bb.x + bb.w/2,  cy: bb.y },
              { key: 'ne', cx: bb.x + bb.w,    cy: bb.y },
              { key: 'e',  cx: bb.x + bb.w,    cy: bb.y + bb.h/2 },
              { key: 'se', cx: bb.x + bb.w,    cy: bb.y + bb.h },
              { key: 's',  cx: bb.x + bb.w/2,  cy: bb.y + bb.h },
              { key: 'sw', cx: bb.x,           cy: bb.y + bb.h },
              { key: 'w',  cx: bb.x,           cy: bb.y + bb.h/2 },
            ];
            return (
              <g key={`sel-${id}`} pointerEvents="none">
                <rect
                  x={bb.x - 4 / viewport.zoom}
                  y={bb.y - 4 / viewport.zoom}
                  width={bb.w + 8 / viewport.zoom}
                  height={bb.h + 8 / viewport.zoom}
                  fill="none"
                  stroke="hsl(217 91% 55%)"
                  strokeWidth={1.5 / viewport.zoom}
                  strokeDasharray={`${4 / viewport.zoom} ${3 / viewport.zoom}`}
                />
                {showHandles && points.map((p) => (
                  <rect
                    key={p.key}
                    x={p.cx - HANDLE/2}
                    y={p.cy - HANDLE/2}
                    width={HANDLE}
                    height={HANDLE}
                    fill="white"
                    stroke="hsl(217 91% 55%)"
                    strokeWidth={1.25 / viewport.zoom}
                  />
                ))}
              </g>
            );
          })}
          {/* marquee */}
          {interaction.kind === 'marquee' && (() => {
            const r = rectFromPoints(interaction.start, interaction.current);
            return (
              <rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill="hsl(217 91% 55% / 0.08)"
                stroke="hsl(217 91% 55%)"
                strokeWidth={1 / viewport.zoom}
                strokeDasharray={`${3 / viewport.zoom} ${3 / viewport.zoom}`}
                pointerEvents="none"
              />
            );
          })()}
          {/* 그리는 중 ghost */}
          {ghost}
        </svg>

        {/* 인라인 편집 (HTML 레이어로 SVG 위에) */}
        {editingId && (() => {
          const el = elements.find((x) => x.id === editingId);
          if (!el) return null;
          return (
            <InlineEditor
              key={editingId}
              element={el}
              viewport={viewport}
              container={containerRef.current}
              onCommit={(content) => {
                if (el.type === 'sticky' || el.type === 'text') {
                  if (content.trim() || el.type === 'sticky') {
                    updateElement(board.id, el.id, { content });
                  } else {
                    removeElements(board.id, [el.id]);
                    setSelection(new Set());
                  }
                } else {
                  updateElement(board.id, el.id, { text: content });
                }
                setEditingId(null);
                // 다음 tick 에 store 의 최신 elements 로 history commit
                setTimeout(() => pushSnapshot(board.id, getBoardData(board.id).elements), 0);
              }}
              onCancel={() => setEditingId(null)}
            />
          );
        })()}
      </div>

      {/* 좌상 — 보드 헤더 */}
      <BoardHeader board={board} />

      {/* 우상 — PageSwitcher */}
      <div className="absolute right-4 top-4">
        <PageSwitcher current="whiteboard" />
      </div>

      {/* 좌측 세로 — 도구 팔레트 */}
      <ToolPalette active={tool} />

      {/* 좌하 — 줌 컨트롤 */}
      <div className="absolute left-4 bottom-4">
        <FloatingCard className="flex items-center gap-0.5 px-1 h-9">
          <ZoomBtn icon={ZoomOut} label="축소" onClick={() => zoomBy(1 / 1.2)} />
          <span
            className="px-2 text-[11.5px] font-medium tabular-nums text-foreground/80 min-w-[44px] text-center cursor-pointer"
            onClick={zoomReset}
            title="100% 로 리셋"
          >
            {Math.round(viewport.zoom * 100)}%
          </span>
          <ZoomBtn icon={ZoomIn} label="확대" onClick={() => zoomBy(1.2)} />
          <div className="w-px h-4 bg-[hsl(var(--hairline))] mx-1" aria-hidden />
          <ZoomBtn icon={Maximize2} label="전체 보기" onClick={zoomReset} />
        </FloatingCard>
      </div>

      {/* 우하 — 도움말 */}
      <HelpFloating />

      {/* 우하 상태 — undo/redo 가능 표시 (사용자 메모리 보조) */}
      <div className="absolute right-16 bottom-4 flex items-center gap-1">
        <FloatingCard className="flex items-center gap-0.5 px-1 h-9">
          <UndoBtn enabled={canUndo(board.id)} onClick={doUndo} />
          <RedoBtn enabled={canRedo(board.id)} onClick={doRedo} />
        </FloatingCard>
      </div>
    </>
  );
}

// ──────────────────────────────────────────
function BoardHeader({ board }: { board: WBBoard }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(board.name);
  useEffect(() => { setDraft(board.name); }, [board.name]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== board.name) renameBoard(board.id, draft);
  };

  return (
    <div className="absolute left-4 top-4">
      <FloatingCard className="flex items-center gap-1 px-2 h-9">
        <button
          type="button"
          onClick={() => setActiveBoardId(null)}
          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="보드 목록"
          aria-label="보드 목록"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="보드 메뉴"
              title="보드 메뉴"
            >
              <MoreHorizontal className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <PencilIcon className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
              이름 바꾸기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleBoardStarred(board.id)}>
              <Star className="w-3.5 h-3.5 mr-2" fill={board.starred ? 'currentColor' : 'none'} strokeWidth={1.75} />
              {board.starred ? '고정 해제' : '맨 위에 고정'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { const dup = duplicateBoard(board.id); if (dup) notify.success('복제됨'); }}>
              <Copy className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
              복제
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                trashBoard(board.id);
                notify.info('휴지통으로 이동', {
                  duration: 5000,
                  action: { label: '되돌리기', onClick: () => { restoreBoard(board.id); setActiveBoardId(board.id); } },
                });
              }}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setEditing(false); setDraft(board.name); }
            }}
            onBlur={commit}
            className="bg-transparent text-[13.5px] font-medium text-foreground outline-none focus:bg-accent/40 rounded px-1.5 py-0.5 min-w-[140px]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[13.5px] font-medium text-foreground hover:bg-accent/40 rounded px-1.5 py-0.5 min-w-[140px] text-left"
            title="이름 바꾸기"
          >
            {board.name}
          </button>
        )}
        <span
          className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground/80 pl-1"
          title="저장됨"
        >
          <Save className="w-3 h-3" strokeWidth={1.75} />
          저장됨
        </span>
      </FloatingCard>
    </div>
  );
}

// ──────────────────────────────────────────
function ToolPalette({ active }: { active: WBToolKind }) {
  const settings = useSettings();
  const [flyout, setFlyout] = useState<WBToolKind | null>(null);

  const handleToolClick = (key: WBToolKind) => {
    setTool({ kind: key });
    const def = TOOLS.find((t) => t.key === key);
    if (def?.hasFlyout) {
      setFlyout((cur) => (cur === key ? null : key));
    } else {
      setFlyout(null);
    }
  };

  // 캔버스에서 작업 시작하면 flyout 닫기
  useEffect(() => {
    if (flyout && active !== flyout) setFlyout(null);
  }, [active, flyout]);

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-start gap-2">
      <FloatingCard className="flex flex-col p-1 gap-0.5">
        {TOOL_GROUPS.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-0.5">
            {group.map((key) => {
              const tool = TOOLS.find((t) => t.key === key)!;
              const Icon = tool.icon;
              const isActive = active === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleToolClick(key)}
                  title={`${tool.label} (${tool.shortcut})`}
                  aria-label={tool.label}
                  aria-pressed={isActive}
                  className={cn(
                    'relative w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                    isActive
                      ? 'bg-primary/12 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                  {tool.hasFlyout && (
                    <span
                      aria-hidden
                      className="absolute right-1 bottom-1 w-1 h-1 rounded-full bg-current opacity-60"
                    />
                  )}
                </button>
              );
            })}
            {gi < TOOL_GROUPS.length - 1 && (
              <div className="my-0.5 mx-1 h-px bg-[hsl(var(--hairline))]" aria-hidden />
            )}
          </div>
        ))}
      </FloatingCard>
      {flyout && <ToolFlyout tool={flyout} settings={settings.tool} onClose={() => setFlyout(null)} />}
    </div>
  );
}

// ──────────────────────────────────────────
function ToolFlyout({
  tool,
  settings,
  onClose,
}: {
  tool: WBToolKind;
  settings: WBToolState;
  onClose: () => void;
}) {
  if (tool === 'sticky') {
    return (
      <FloatingCard className="p-2 flex flex-col gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground px-1">스티키 색</span>
        <div className="grid grid-cols-3 gap-1.5">
          {(['amber', 'pink', 'mint', 'sky', 'lavender', 'slate'] as const).map((c) => {
            const tone = WB_STICKY_BG[c];
            const isActive = settings.stickyColor === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => { setTool({ stickyColor: c }); onClose(); }}
                className={cn(
                  'w-9 h-9 rounded-md transition-all border-2',
                  isActive ? 'border-primary scale-110' : 'border-transparent hover:scale-105',
                )}
                style={{ background: tone.bg, borderColor: isActive ? undefined : tone.border }}
                aria-label={c}
                title={c}
              />
            );
          })}
        </div>
      </FloatingCard>
    );
  }
  if (tool === 'shape') {
    const shapes: Array<{ key: 'rect' | 'ellipse' | 'diamond' | 'triangle' | 'speech'; label: string; icon: React.ReactNode }> = [
      { key: 'rect',     label: '사각',     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="5" width="18" height="14" rx="2"/></svg> },
      { key: 'ellipse',  label: '원',       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><ellipse cx="12" cy="12" rx="9" ry="7"/></svg> },
      { key: 'diamond',  label: '다이아',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polygon points="12,3 21,12 12,21 3,12"/></svg> },
      { key: 'triangle', label: '삼각',     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polygon points="12,4 21,20 3,20"/></svg> },
      { key: 'speech',   label: '말풍선',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M4 5h16v10h-9l-4 4v-4H4z"/></svg> },
    ];
    return (
      <FloatingCard className="p-2 flex flex-col gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground px-1">도형</span>
        <div className="grid grid-cols-3 gap-1">
          {shapes.map((s) => {
            const isActive = settings.shapeKind === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => { setTool({ shapeKind: s.key }); onClose(); }}
                className={cn(
                  'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                  isActive ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
                title={s.label}
              >
                {s.icon}
              </button>
            );
          })}
        </div>
      </FloatingCard>
    );
  }
  if (tool === 'line') {
    const lines: Array<{ key: WBToolState['lineKind']; label: string }> = [
      { key: 'line',          label: '선' },
      { key: 'arrow-solid',   label: '→ 화살표' },
      { key: 'arrow-dashed',  label: '┄→ 점선' },
      { key: 'arrow-curved',  label: '╭ 곡선' },
      { key: 'arrow-elbow',   label: '└ 직각' },
    ];
    return (
      <FloatingCard className="p-2 flex flex-col gap-1.5 min-w-[120px]">
        <span className="text-[10px] font-medium text-muted-foreground px-1">선 스타일</span>
        {lines.map((l) => {
          const isActive = settings.lineKind === l.key;
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => { setTool({ lineKind: l.key }); onClose(); }}
              className={cn(
                'h-7 px-2 rounded text-[12px] text-left transition-colors',
                isActive ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {l.label}
            </button>
          );
        })}
      </FloatingCard>
    );
  }
  if (tool === 'pen') {
    const widths: Array<{ key: WBToolState['penWidth']; label: string; size: number }> = [
      { key: 'thin', label: '얇음', size: 2 },
      { key: 'normal', label: '보통', size: 4 },
      { key: 'thick', label: '굵음', size: 7 },
    ];
    return (
      <FloatingCard className="p-2 flex flex-col gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground px-1">펜 두께</span>
        <div className="flex gap-1">
          {widths.map((w) => {
            const isActive = settings.penWidth === w.key;
            return (
              <button
                key={w.key}
                type="button"
                onClick={() => { setTool({ penWidth: w.key }); onClose(); }}
                className={cn(
                  'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                  isActive ? 'bg-primary/12' : 'hover:bg-accent',
                )}
                title={w.label}
              >
                <span
                  className="rounded-full bg-foreground"
                  style={{ width: w.size, height: w.size }}
                />
              </button>
            );
          })}
        </div>
      </FloatingCard>
    );
  }
  return null;
}

// ──────────────────────────────────────────
function FloatingCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[hsl(var(--hairline))] bg-card/95 backdrop-blur-sm',
        'shadow-[0_4px_14px_-8px_hsl(30_30%_8%/0.12)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function ZoomBtn({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      aria-label={label}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
    </button>
  );
}

function UndoBtn({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      className={cn(
        'w-7 h-7 rounded flex items-center justify-center transition-colors',
        enabled ? 'text-muted-foreground hover:bg-accent hover:text-foreground' : 'text-muted-foreground/30 cursor-not-allowed',
      )}
      aria-label="실행 취소"
      title="실행 취소 (Ctrl+Z)"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7v6h6" />
        <path d="M3 13a9 9 0 1 0 3-7" />
      </svg>
    </button>
  );
}
function RedoBtn({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      className={cn(
        'w-7 h-7 rounded flex items-center justify-center transition-colors',
        enabled ? 'text-muted-foreground hover:bg-accent hover:text-foreground' : 'text-muted-foreground/30 cursor-not-allowed',
      )}
      aria-label="다시 실행"
      title="다시 실행 (Ctrl+Shift+Z)"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 7v6h-6" />
        <path d="M21 13a9 9 0 1 1-3-7" />
      </svg>
    </button>
  );
}

// ──────────────────────────────────────────
function HelpFloating() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !isEditableTarget(e.target)) {
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <>
      <div className="absolute right-4 bottom-4">
        <FloatingCard className="w-9 h-9 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full h-full rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="단축키 도움말"
            title="단축키 (?)"
          >
            <HelpCircle className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>
        </FloatingCard>
      </div>
      {open && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card border border-[hsl(var(--hairline))] rounded-xl shadow-xl max-w-[640px] w-[90vw] max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[hsl(var(--hairline))] flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">단축키</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-1 text-[12.5px]">
              <ShortcutGroup title="도구" items={[
                ['V', '선택'], ['H', '팬'], ['T', '텍스트'], ['S', '스티키'],
                ['R', '도형 (사각)'], ['O', '도형 (원)'], ['D', '도형 (다이아)'],
                ['L', '선'], ['A', '화살표'], ['P', '펜'], ['E', '지우개'],
              ]} />
              <ShortcutGroup title="편집" items={[
                ['Ctrl+Z', '실행 취소'], ['Ctrl+Shift+Z', '다시 실행'],
                ['Ctrl+A', '전체 선택'], ['Ctrl+D', '복제'],
                ['Ctrl+C / X / V', '복사 / 잘라내기 / 붙여넣기'],
                ['Delete', '삭제'],
                ['Shift+클릭', '선택 토글'],
                ['↑↓←→', '1px 이동 (Shift: 10px)'],
                ['[ / ]', 'z-order 한 칸'],
                ['Ctrl+[ / ]', '맨 뒤 / 맨 앞'],
              ]} />
              <ShortcutGroup title="뷰" items={[
                ['Space (hold)', '임시 팬'],
                ['휠', '세로 팬 (Shift: 가로)'],
                ['Ctrl+휠', '줌 (커서 기준)'],
                ['?', '이 단축키 모달'],
                ['Esc', '편집·인터랙션·선택 취소'],
              ]} />
              <ShortcutGroup title="그리기 보조" items={[
                ['Shift+드래그', '선·화살표 15° 스냅'],
                ['Shift+리사이즈', '비율 고정'],
                ['Alt+리사이즈', '중심 기준'],
              ]} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ShortcutGroup({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div className="mb-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{title}</h3>
      <dl className="space-y-0.5">
        {items.map(([key, label]) => (
          <div key={key} className="flex items-baseline gap-2">
            <dt className="font-mono text-[11px] text-foreground/70 shrink-0 min-w-[110px]">{key}</dt>
            <dd className="text-foreground/85">{label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ──────────────────────────────────────────
// 헬퍼
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** 단일 선택 요소 bbox 경계 근처면 핸들 반환. */
function findResizeHandle(
  el: WBElement,
  wp: { x: number; y: number },
  zoom: number,
): ResizeHandle | null {
  if (el.type === 'line' || el.type === 'arrow' || el.type === 'freedraw') return null;
  const TH = 10 / zoom;     // hit threshold
  const x1 = el.x;
  const y1 = el.y;
  const x2 = el.x + el.w;
  const y2 = el.y + el.h;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const near = (a: number, b: number) => Math.abs(a - b) <= TH;
  // 코너 우선 (영역 더 작음)
  if (near(wp.x, x1) && near(wp.y, y1)) return 'nw';
  if (near(wp.x, x2) && near(wp.y, y1)) return 'ne';
  if (near(wp.x, x1) && near(wp.y, y2)) return 'sw';
  if (near(wp.x, x2) && near(wp.y, y2)) return 'se';
  // 변 — 사각형 안쪽이어야 함
  if (wp.y >= y1 - TH && wp.y <= y2 + TH) {
    if (near(wp.x, x1)) return 'w';
    if (near(wp.x, x2)) return 'e';
  }
  if (wp.x >= x1 - TH && wp.x <= x2 + TH) {
    if (near(wp.y, y1)) return 'n';
    if (near(wp.y, y2)) return 's';
  }
  // 정확히 중앙 변 (n, s)
  if (near(wp.y, y1) && Math.abs(wp.x - mx) < el.w / 2 - TH) return 'n';
  if (near(wp.y, y2) && Math.abs(wp.x - mx) < el.w / 2 - TH) return 's';
  if (near(wp.x, x1) && Math.abs(wp.y - my) < el.h / 2 - TH) return 'w';
  if (near(wp.x, x2) && Math.abs(wp.y - my) < el.h / 2 - TH) return 'e';
  return null;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

// ──────────────────────────────────────────
// 요소 팩토리
function baseElement(x: number, y: number, w: number, h: number) {
  const now = Date.now();
  return {
    id: newElementId(),
    x, y, w, h,
    angle: 0,
    zIndex: 0,
    opacity: 1,
    locked: false,
    groupIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

function makeSticky(pos: { x: number; y: number }, tool: WBToolState): WBSticky {
  const SIZE = 200;
  return {
    ...baseElement(pos.x - SIZE / 2, pos.y - SIZE / 2, SIZE, SIZE),
    type: 'sticky',
    content: '',
    color: tool.stickyColor,
    fontSize: 16,
    textAlign: 'left',
  };
}

function makeText(pos: { x: number; y: number }): WBText {
  return {
    ...baseElement(pos.x, pos.y - 12, 200, 28),
    type: 'text',
    content: '',
    fontSize: 16,
    fontFamily: 'sans',
    textColor: 'ink',
    textAlign: 'left',
  };
}

function makeShape(rect: { x: number; y: number; w: number; h: number }, tool: WBToolState): WBElement | null {
  const base = {
    ...baseElement(rect.x, rect.y, rect.w, rect.h),
    strokeColor: tool.strokeColor,
    strokeWidth: 'normal' as const,
    strokeStyle: 'solid' as const,
    roughness: tool.roughness,
    fillColor: tool.fillColor,
    fillStyle: (tool.fillColor === 'none' ? 'none' : 'solid') as 'none' | 'solid',
  };
  switch (tool.shapeKind) {
    case 'rect':     return { ...base, type: 'rect', cornerRadius: 6 } as WBRect;
    case 'ellipse':  return { ...base, type: 'ellipse' };
    case 'diamond':  return { ...base, type: 'diamond' };
    case 'triangle': return { ...base, type: 'triangle' };
    case 'speech':   return { ...base, type: 'speech', tailDirection: 'bl' };
    default:         return null;
  }
}

function makeLineOrArrow(
  start: { x: number; y: number },
  end: { x: number; y: number },
  arrow: boolean,
  tool: WBToolState,
): WBLine | WBArrow {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  const points: Array<[number, number]> = [[start.x, start.y], [end.x, end.y]];
  const base = {
    ...baseElement(x, y, w || 1, h || 1),
    strokeColor: tool.strokeColor,
    strokeWidth: 'normal' as const,
    strokeStyle: (tool.lineKind === 'arrow-dashed' ? 'dashed' : 'solid') as 'dashed' | 'solid',
    roughness: tool.roughness,
    points,
  };
  if (!arrow) {
    return { ...base, type: 'line' };
  }
  return {
    ...base,
    type: 'arrow',
    startArrow: 'none',
    endArrow: 'arrow',
    curve: tool.lineKind === 'arrow-curved' ? 'curved'
         : tool.lineKind === 'arrow-elbow' ? 'elbow' : 'straight',
  };
}

function makeFreedraw(points: Array<[number, number]>, tool: WBToolState): WBFreedraw {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x || 1;
  const h = Math.max(...ys) - y || 1;
  return {
    ...baseElement(x, y, w, h),
    type: 'freedraw',
    strokeColor: tool.penColor,
    strokeWidth: tool.penWidth,
    strokeStyle: 'solid',
    roughness: 0,
    points,
  };
}

// ──────────────────────────────────────────
// 그리는 중 임시 ghost SVG
function renderGhost(interaction: Interaction, tool: WBToolState): React.ReactNode {
  if (interaction.kind === 'creating') {
    const r = rectFromPoints(interaction.start, interaction.current);
    if (r.w < 1 || r.h < 1) return null;
    const ghostEl = makeShape(r, tool);
    if (!ghostEl) return null;
    return <g opacity={0.6}><WBElementRenderer el={ghostEl} /></g>;
  }
  if (interaction.kind === 'drawing-line') {
    const ghostEl = makeLineOrArrow(interaction.start, interaction.current, interaction.arrow, tool);
    return <g opacity={0.7}><WBElementRenderer el={ghostEl} /></g>;
  }
  if (interaction.kind === 'pen' && interaction.points.length >= 2) {
    const ghostEl = makeFreedraw(interaction.points, tool);
    return <WBElementRenderer el={ghostEl} />;
  }
  return null;
}

// ──────────────────────────────────────────
// 인라인 텍스트 편집 — sticky/text/shape 안 텍스트
function InlineEditor({
  element,
  viewport,
  container,
  onCommit,
  onCancel,
}: {
  element: WBElement;
  viewport: WBViewport;
  container: HTMLDivElement | null;
  onCommit: (content: string) => void;
  onCancel: () => void;
}) {
  const initial =
    element.type === 'sticky' ? element.content
    : element.type === 'text' ? element.content
    : ('text' in element ? element.text ?? '' : '');
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  // 한글 IME 진행 여부
  const composingRef = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  if (!container) return null;
  const rect = container.getBoundingClientRect();
  const sx = (element.x - viewport.x) * viewport.zoom;
  const sy = (element.y - viewport.y) * viewport.zoom;
  const sw = element.w * viewport.zoom;
  const sh = element.h * viewport.zoom;

  // 스티키면 안쪽 패딩
  const padding = element.type === 'sticky' ? 12 : 4;
  const tone =
    element.type === 'sticky'
      ? WB_STICKY_BG[element.color]
      : { bg: 'transparent', border: 'transparent', text: 'hsl(0 0% 15%)' };

  const fontSize =
    element.type === 'sticky' ? element.fontSize
    : element.type === 'text' ? element.fontSize
    : ('fontSize' in element ? element.fontSize ?? 16 : 16);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onCompositionStart={() => { composingRef.current = true; }}
      onCompositionEnd={() => { composingRef.current = false; }}
      onKeyDown={(e) => {
        // 한글 IME 진행 중 Enter/Esc 무시
        if (composingRef.current || e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          onCommit(value);
        }
        // 캔버스 단축키 차단
        e.stopPropagation();
      }}
      onBlur={() => onCommit(value)}
      style={{
        position: 'absolute',
        left: rect.left + sx + padding,
        top: rect.top + sy + padding,
        width: sw - padding * 2,
        height: sh - padding * 2,
        background: tone.bg,
        border: 'none',
        outline: '2px solid hsl(217 91% 55% / 0.5)',
        outlineOffset: 2,
        borderRadius: 4,
        padding: 4,
        color: tone.text,
        fontSize,
        fontFamily: 'inherit',
        textAlign: element.type === 'sticky' || element.type === 'text' ? (element as { textAlign?: 'left' | 'center' | 'right' }).textAlign ?? 'left' : 'center',
        resize: 'none',
        lineHeight: 1.4,
        zIndex: 1000,
      }}
      placeholder={element.type === 'sticky' ? '내용을 입력하세요' : '텍스트…'}
    />
  );
}
