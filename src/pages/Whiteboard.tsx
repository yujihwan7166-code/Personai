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
  addFolder,
  duplicateBoard,
  getBoard,
  purgeBoard,
  removeFolder,
  renameBoard,
  renameFolder,
  restoreBoard,
  setActiveBoardId,
  setTool,
  setViewport,
  toggleBoardStarred,
  trashBoard,
  useBoardData,
  useBoards,
  useFolders,
  useSettings,
  useTrashedBoards,
} from '@/lib/whiteboardStore';
import type { WBBoard, WBToolKind, WBViewport } from '@/types/whiteboard';

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
          <BoardCanvas board={activeBoard} viewport={boardData?.viewport ?? { x: 0, y: 0, zoom: 1 }} tool={settings.tool.kind} />
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
// 활성 보드 — 캔버스 + 플로팅 UI
function BoardCanvas({
  board,
  viewport,
  tool,
}: {
  board: WBBoard;
  viewport: WBViewport;
  tool: WBToolKind;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

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

  // 팬 (휠) / 줌 (Ctrl+휠)
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // 줌 — 커서 위치 기준
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.002);
      const nextZoom = clamp(viewport.zoom * factor, 0.1, 5);
      // 커서 아래 world 좌표가 동일하게 유지되도록 viewport.x/y 조정
      const worldX = viewport.x + sx / viewport.zoom;
      const worldY = viewport.y + sy / viewport.zoom;
      const nx = worldX - sx / nextZoom;
      const ny = worldY - sy / nextZoom;
      setViewport(board.id, { x: nx, y: ny, zoom: nextZoom });
    } else {
      // 팬
      setViewport(board.id, {
        ...viewport,
        x: viewport.x + (e.shiftKey ? e.deltaY : e.deltaX) / viewport.zoom,
        y: viewport.y + (e.shiftKey ? 0 : e.deltaY) / viewport.zoom,
      });
    }
  }, [board.id, viewport]);

  // 드래그 팬 (pan 도구 또는 spacebar)
  const [spaceDown, setSpaceDown] = useState(false);
  const panRef = useRef<{ startX: number; startY: number; vx: number; vy: number } | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isEditableTarget(e.target)) {
        e.preventDefault();
        setSpaceDown(true);
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
  }, []);

  const isPanMode = tool === 'pan' || spaceDown;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanMode && e.button !== 1) return;  // middle button = pan
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      vx: viewport.x,
      vy: viewport.y,
    };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = panRef.current;
    if (!p) return;
    const dx = (e.clientX - p.startX) / viewport.zoom;
    const dy = (e.clientY - p.startY) / viewport.zoom;
    setViewport(board.id, { ...viewport, x: p.vx - dx, y: p.vy - dy });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (panRef.current) {
      panRef.current = null;
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    }
  };

  // 줌 컨트롤 핸들러
  const zoomBy = (factor: number) => {
    const nextZoom = clamp(viewport.zoom * factor, 0.1, 5);
    // 화면 중앙 기준
    const cx = size.w / 2;
    const cy = size.h / 2;
    const worldX = viewport.x + cx / viewport.zoom;
    const worldY = viewport.y + cy / viewport.zoom;
    const nx = worldX - cx / nextZoom;
    const ny = worldY - cy / nextZoom;
    setViewport(board.id, { x: nx, y: ny, zoom: nextZoom });
  };
  const zoomReset = () => {
    setViewport(board.id, { x: -size.w / 2, y: -size.h / 2, zoom: 1 });
  };

  const viewBox = `${viewport.x} ${viewport.y} ${(size.w || 1) / viewport.zoom} ${(size.h || 1) / viewport.zoom}`;
  const gridSize = 16;

  const cursorClass = isPanMode
    ? (panRef.current ? 'cursor-grabbing' : 'cursor-grab')
    : (tool === 'select' ? 'cursor-default' : 'cursor-crosshair');

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
          {/* dot grid pattern */}
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
          {/* TODO: ElementsLayer (Step 3) */}
        </svg>
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
      <div className="absolute right-4 bottom-4">
        <FloatingCard className="w-9 h-9 flex items-center justify-center">
          <button
            type="button"
            className="w-full h-full rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="단축키 도움말"
            title="단축키 (?)"
          >
            <HelpCircle className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>
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
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2">
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
                  onClick={() => setTool({ kind: key })}
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
    </div>
  );
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

// ──────────────────────────────────────────
// 헬퍼
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}
