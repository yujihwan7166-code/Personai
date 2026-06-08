/**
 * ?붿씠?몃낫????4踰덉㎏ ?명듃 ?섏씠吏.
 *
 * Step 2: store ?곌껐 + 蹂대뱶 CRUD + 罹붾쾭????룹쨲.
 * Step 3 ?덉젙: ?붿냼 ?뚮뜑 + ?꾧뎄 ?숈옉.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '@/styles/wiki.css';   // wiki-warm-theme ?좏겙 (硫붾え? ?숈씪)
import {
  Home,
  Menu,
  MousePointer2,
  Hand,
  Type,
  StickyNote,
  Square,
  SquareDashed,
  ArrowUpRight,
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
  Upload,
  Table2,
  GitBranch,
  CalendarDays,
  Columns3,
  ListTree,
  Presentation,
  Magnet,
  Group,
  Ungroup,
  Search,
  LayoutTemplate,
  Map as MapIcon,
  Focus,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageWorkspaceChrome } from '@/components/PageWorkspaceChrome';
import { PageStarterEmpty } from '@/components/PageStarterEmpty';
import { PAGE_AI_PANEL_SLOT_CLASS } from '@/components/PageAiTokens';
import { AiSidebar } from '@/components/cloud/AiSidebar';
import { useAiSidebar } from '@/components/cloud/useAiSidebar';
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
  setBoardBgColor,
  setBoardGridType,
  setElements,
  setTool,
  setViewport,
  toggleBoardStarred,
  trashBoard,
  updateBoardData,
  updateBoardThumbnail,
  updateElement,
  useBoardData,
  useBoards,
  useFolders,
  useSaveState,
  useSettings,
  useTrashedBoards,
} from '@/lib/whiteboardStore';
import type {
  WBArrow,
  WBBoard,
  WBElement,
  WBColor,
  WBFrame,
  WBFreedraw,
  WBImage,
  WBLine,
  WBRect,
  WBSticky,
  WBTable,
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
  rotatedAABB,
  screenToWorld,
  unionBBox,
  worldToElementLocal,
} from '@/lib/whiteboard/geometry';
import { WB_STICKY_BG, WB_COLOR_HSL } from '@/lib/whiteboard/colors';
import { WB_COLORS } from '@/types/whiteboard';
import { canRedo, canUndo, clearHistory, pushSnapshot, redo, undo } from '@/lib/whiteboard/history';
import { computeBindingPoint, findBindable, resolveArrow, syncAllBindings } from '@/lib/whiteboard/binding';
import { buildTemplate, TEMPLATE_KINDS, TEMPLATE_META, type WBTemplateKind } from '@/lib/whiteboard/templates';
import { alignElements, computeSnap, distributeElements, type AlignMode, type DistributeMode, type Guide } from '@/lib/whiteboard/snapping';
import { exportJSON, exportPNG, exportSVG } from '@/lib/whiteboard/export';
import { addWBImage } from '@/lib/whiteboard/imageStore';
import {
  WB_TABLE_LIMITS,
  clearTableCellStyle,
  createTableCells,
  deleteTableCol,
  deleteTableRow,
  getTableCellRect,
  hitTableCell,
  insertTableCol,
  insertTableRow,
  moveTableCellIndex,
  parseTableText,
  pasteTableTextAt,
  resizeTableCells,
  resizeTableCellStyles,
  tableToText,
  updateTableCell,
  updateTableCellStyle,
} from '@/lib/whiteboard/table';

// ??????????????????????????????????????????
// ?꾧뎄 ?뺤쓽
interface ToolDef {
  key: WBToolKind;
  label: string;
  shortcut: string;
  icon: LucideIcon;
  hasFlyout?: boolean;
}

const TOOLS: ToolDef[] = [
  { key: 'select',  label: '선택', shortcut: 'V', icon: MousePointer2 },
  { key: 'pan',     label: '이동', shortcut: 'H', icon: Hand },
  { key: 'text',    label: '텍스트', shortcut: 'T', icon: Type },
  { key: 'sticky',  label: '스티키', shortcut: 'S', icon: StickyNote, hasFlyout: true },
  { key: 'shape',   label: '도형', shortcut: 'R', icon: Square, hasFlyout: true },
  { key: 'frame',   label: '프레임', shortcut: 'F', icon: SquareDashed },
  { key: 'line',    label: '선/화살표', shortcut: 'L', icon: ArrowUpRight, hasFlyout: true },
  { key: 'pen',     label: '펜', shortcut: 'P', icon: Pencil, hasFlyout: true },
  { key: 'eraser',  label: '지우개', shortcut: 'E', icon: Eraser },
];

const WHITEBOARD_STARTER_TEMPLATES: WBTemplateKind[] = ['brainstorm', 'kanban', 'flowchart', 'meetingAgenda'];

const WHITEBOARD_STARTER_TOOL: WBToolState = {
  kind: 'select',
  stickyColor: 'amber',
  shapeKind: 'rect',
  lineKind: 'arrow-solid',
  penWidth: 'normal',
  penSize: 4,
  penColor: 'ink',
  strokeColor: 'ink',
  fillColor: 'none',
  roughness: 0,
};

const TOOL_GROUPS: Array<WBToolKind[]> = [
  ['select', 'pan'],
  ['text', 'sticky', 'shape', 'frame', 'line', 'pen'],
  ['eraser'],
];

type WBContentInsertKind = 'diagram' | 'table' | 'timeline' | 'kanban';

const TEXT_SHAPE_TYPES = new Set<WBElement['type']>([
  'rect',
  'ellipse',
  'diamond',
  'triangle',
  'speech',
  'capsule',
  'database',
  'document',
]);

function isTextShape(el: WBElement): el is Extract<WBElement, { text?: string }> {
  return TEXT_SHAPE_TYPES.has(el.type);
}

function elementSearchText(el: WBElement): string {
  if (el.type === 'sticky' || el.type === 'text') return el.content;
  if (el.type === 'table') return el.cells.join(' ');
  if (isTextShape(el)) return el.text ?? '';
  return '';
}

// ??????????????????????????????????????????
export default function Whiteboard() {
  const navigate = useNavigate();
  const boards = useBoards();
  const folders = useFolders();
  const settings = useSettings();
  const activeBoardId = settings.activeBoardId;
  const activeBoard = activeBoardId ? boards.find((b) => b.id === activeBoardId) ?? getBoard(activeBoardId) ?? null : null;
  const boardData = useBoardData(activeBoardId);
  const getWhiteboardAiContext = useCallback(() => {
    const elements = boardData?.elements ?? [];
    const textItems = elements
      .map((element) => elementSearchText(element))
      .filter(Boolean)
      .slice(0, 40);
    return {
      kind: 'whiteboard' as const,
      summary: activeBoard ? activeBoard.name : '전체 보드',
      fullText: [
        `현재 보드: ${activeBoard?.name ?? '선택 없음'}`,
        `전체 보드 수: ${boards.length}`,
        `요소 수: ${elements.length}`,
        textItems.length > 0 ? `보드 텍스트:\n- ${textItems.join('\n- ')}` : '보드 텍스트 없음',
      ].join('\n'),
    };
  }, [activeBoard, boardData?.elements, boards.length]);
  const whiteboardAi = useAiSidebar('whiteboard', getWhiteboardAiContext, {
    persistKey: activeBoardId ?? 'all',
    openStorage: 'local',
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [switchingBoardId, setSwitchingBoardId] = useState<string | null>(null);

  // ??蹂대뱶媛 ?섎굹???놁쑝硫?泥?吏꾩엯 ???덈궡留? ?먮룞 ?앹꽦 X (硫붾え ?⑦꽩)
  // ?쒖꽦 蹂대뱶媛 ?댁????깆쑝濡??щ씪議뚯쑝硫??댁젣
  useEffect(() => {
    if (activeBoardId && !boards.some((b) => b.id === activeBoardId)) {
      setActiveBoardId(null);
    }
  }, [activeBoardId, boards]);

  useEffect(() => {
    if (!activeBoardId) return;
    setSwitchingBoardId(activeBoardId);
    const timer = window.setTimeout(() => setSwitchingBoardId(null), 180);
    return () => window.clearTimeout(timer);
  }, [activeBoardId]);

  return (
    <div className="wiki-warm-theme min-h-screen flex flex-col bg-background sm:flex-row">
      <PageWorkspaceChrome
        current="whiteboard"
        ai={{
          label: '보조 도구',
          title: '보조 도구 열기',
          open: whiteboardAi.open,
          onOpen: () => whiteboardAi.setOpen(true),
        }}
      />
      <Sidebar
        boards={boards}
        folders={folders}
        activeBoardId={activeBoardId}
        collapsed={sidebarCollapsed}
        onGoHome={() => navigate('/')}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      />
      <main className="relative min-h-[62vh] flex-1 min-w-0 overflow-hidden bg-background sm:min-h-0">
        {activeBoard ? (
          <>
            <BoardCanvas
              board={activeBoard}
              elements={boardData?.elements ?? []}
              viewport={boardData?.viewport ?? { x: 0, y: 0, zoom: 1 }}
              toolState={settings.tool}
              gridType={settings.gridType}
              bgColor={settings.bgColor}
            />
            {switchingBoardId === activeBoard.id && (
              <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center">
                <div className="rounded-md border border-[hsl(var(--hairline))] bg-card/85 px-2.5 py-1 text-[11.5px] text-muted-foreground shadow-sm backdrop-blur-sm">
                  보드 여는 중
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyMain />
        )}
      </main>
      <div
        className={cn(
          PAGE_AI_PANEL_SLOT_CLASS,
          !whiteboardAi.open && 'pointer-events-none',
        )}
      >
        <AiSidebar
          open={whiteboardAi.open}
          onClose={() => whiteboardAi.setOpen(false)}
          title="보조 도구"
          emptyTitle="보드를 어떻게 정리할까요?"
          emptyDescription="현재 보드의 텍스트와 요소 흐름을 참고해 구조와 다음 작업을 제안합니다."
          inputPlaceholder="보드 구조화, 다음 배치, 문서화 방향을 물어보세요..."
          context={getWhiteboardAiContext()}
          messages={whiteboardAi.messages}
          sending={whiteboardAi.sending}
          onSend={whiteboardAi.send}
          onRetry={whiteboardAi.retryLast}
          onClear={whiteboardAi.clear}
          surface="whiteboard"
        />
      </div>
    </div>
  );
}

// ??????????????????????????????????????????
// ?ъ씠?쒕컮
function Sidebar({
  boards,
  folders,
  activeBoardId,
  collapsed,
  onGoHome,
  onToggleCollapsed,
}: {
  boards: WBBoard[];
  folders: ReturnType<typeof useFolders>;
  activeBoardId: string | null;
  collapsed: boolean;
  onGoHome: () => void;
  onToggleCollapsed: () => void;
}) {
  const trashed = useTrashedBoards();
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<'recent' | 'name' | 'starred'>('recent');

  const toggleFolder = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sortBoards = (items: WBBoard[]) => [...items].sort((a, b) => {
    if (sortMode === 'name') return a.name.localeCompare(b.name);
    if (sortMode === 'starred') return Number(Boolean(b.starred)) - Number(Boolean(a.starred)) || b.updatedAt - a.updatedAt;
    return b.updatedAt - a.updatedAt;
  });
  const normalizedQuery = query.trim().toLowerCase();
  const visibleBoards = sortBoards(normalizedQuery ? boards.filter((b) => b.name.toLowerCase().includes(normalizedQuery)) : boards);
  const unfiledBoards = visibleBoards.filter((b) => !b.folderId);
  const boardsByFolder = (fid: string) => visibleBoards.filter((b) => b.folderId === fid);
  const hasFolderSection = creatingFolder || folders.some((f) => !normalizedQuery || boardsByFolder(f.id).length > 0);
  const sortLabel = sortMode === 'recent' ? '최근순' : sortMode === 'name' ? '이름순' : '고정 우선';

  const handleNewBoard = (folderId: string | null = null) => {
    addBoard('새 보드', folderId);
    if (folderId) setExpanded((prev) => new Set(prev).add(folderId));
  };

  if (collapsed) {
    return (
      <aside className="flex h-11 shrink-0 items-center justify-end gap-1 border-b border-foreground/20 bg-background px-2 sm:h-screen sm:w-10 sm:flex-col sm:items-center sm:justify-start sm:border-b-0 sm:border-r sm:px-0 sm:py-3">
        <button
          type="button"
          onClick={onGoHome}
          className="w-8 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="홈으로"
          aria-label="홈으로"
        >
          <Home className="w-4 h-4" strokeWidth={1.85} />
        </button>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="w-8 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="메뉴 열기"
          aria-label="메뉴 열기"
        >
          <Menu className="w-4 h-4" strokeWidth={1.9} />
        </button>
        <button
          type="button"
          onClick={() => handleNewBoard(null)}
          className="w-8 h-9 rounded-md flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
          title="새 보드"
          aria-label="새 보드"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex max-h-[28vh] w-full shrink-0 flex-col border-b border-foreground/25 bg-background pb-12 sm:max-h-none sm:w-[292px] sm:border-b-0 sm:border-r sm:pb-0">
      <div className="shrink-0 px-3 pt-3 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="truncate whitespace-nowrap text-[18px] leading-6 font-semibold text-foreground tracking-tight">
              화이트보드
            </h1>
          </div>
          <button
            type="button"
            onClick={onGoHome}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="홈으로"
            aria-label="홈으로"
          >
            <Home className="w-4 h-4" strokeWidth={1.85} />
          </button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="메뉴 접기"
            aria-label="메뉴 접기"
          >
            <Menu className="w-4 h-4" strokeWidth={1.9} />
          </button>
        </div>
        <div className="mt-3 flex gap-1.5">
          <button
            type="button"
            onClick={() => handleNewBoard(null)}
            className="flex-1 h-8 rounded-md bg-primary/10 text-primary text-[12.5px] font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/15 transition-colors"
            title="새 보드 만들기"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            새 보드
          </button>
          <button
            type="button"
            onClick={() => setCreatingFolder(true)}
            className="flex-1 h-8 rounded-md bg-accent/55 text-muted-foreground text-[12.5px] font-semibold flex items-center justify-center gap-1.5 hover:bg-accent hover:text-foreground transition-colors"
            title="새 폴더 만들기"
          >
            <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.75} />
            새 폴더
          </button>
        </div>
      </div>

      <div className="shrink-0 px-3 pb-2.5 border-b border-foreground/10">
        <label className="flex items-center gap-1.5 h-[30px] px-2 rounded-md bg-accent/40 border border-transparent focus-within:border-primary/35 transition-colors">
          <Search className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="보드 검색"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground outline-none"
          />
        </label>
      </div>

      {/* 紐⑸줉 */}
      <div className="flex-1 overflow-y-auto">
        {/* ?대뜑??*/}
        {hasFolderSection && (
          <div className="px-2 pt-2 pb-1 space-y-0.5">
            <div className="px-1.5 pb-1 text-[11px] font-semibold text-muted-foreground/75">
              폴더
            </div>
            {folders.map((f) => {
              const isExpanded = expanded.has(f.id);
              const folderBoards = boardsByFolder(f.id);
              if (normalizedQuery && folderBoards.length === 0) return null;
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
                    className="group flex items-center gap-2 h-[34px] px-1.5 rounded-md cursor-pointer text-foreground hover:bg-foreground/5 transition-colors"
                    onClick={() => toggleFolder(f.id)}
                  >
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-65" strokeWidth={2} />
                      : <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-65" strokeWidth={2} />}
                    <FolderIcon className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <span className="flex-1 text-[13px] font-semibold truncate text-foreground">{f.name}</span>
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
                          if (!window.confirm(`"${f.name}" 폴더를 삭제할까요? 안의 보드는 폴더 없음으로 이동합니다.`)) return;
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
                      <p className="ml-8 h-8 flex items-center px-3 text-[12px] text-muted-foreground italic">비어 있음</p>
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

        {/* 誘몃텇瑜?蹂대뱶 */}
        {normalizedQuery && visibleBoards.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-[13px] font-medium text-foreground">검색 결과 없음</p>
            <p className="mt-1 text-[12px] text-muted-foreground">다른 이름으로 찾아보세요</p>
          </div>
        )}
        {unfiledBoards.length > 0 ? (
          <div className="px-2 pt-1.5 pb-1">
            <div className="flex items-center justify-between px-1.5 pb-1">
              <span className="text-[11px] font-semibold text-muted-foreground/75">보드</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-6 inline-flex items-center gap-1 rounded px-1.5 text-[11px] font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
                    title="보드 정렬"
                    aria-label="보드 정렬"
                  >
                    {sortLabel}
                    <ChevronDown className="w-3 h-3 opacity-70" strokeWidth={2} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  {([
                    ['recent', '최근순'] as const,
                    ['name', '이름순'] as const,
                    ['starred', '고정 우선'] as const,
                  ]).map(([key, label]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => setSortMode(key)}
                      className={cn(sortMode === key && 'text-primary focus:text-primary')}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <ul className="space-y-0.5">
              {unfiledBoards.map((b) => (
                <li key={b.id} className="relative group">
                  <BoardRow board={b} active={activeBoardId === b.id} loose />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          folders.length === 0 && !creatingFolder && (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] text-foreground mb-1">비어 있음</p>
              <p className="text-[12px] text-muted-foreground">+ 버튼으로 새 보드를 시작하세요</p>
            </div>
          )
        )}
      </div>

      {/* ?댁???*/}
      <div className="shrink-0 border-t border-foreground/10">
        <button
          type="button"
          onClick={() => setShowTrash((v) => !v)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2.5 text-[12px] transition-colors',
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
            <p className="px-5 py-2 text-[11px] text-muted-foreground italic">비어 있음</p>
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
                  >영구 삭제</button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </aside>
  );
}

// ??????????????????????????????????????????
function BoardRow({ board, active, loose = false }: { board: WBBoard; active: boolean; loose?: boolean }) {
  const handleSelect = () => setActiveBoardId(board.id);
  return (
    <>
      <button
        type="button"
        onClick={handleSelect}
        className={cn(
          'relative w-full text-left transition-all rounded-md flex items-center gap-1.5 h-8 px-2 pr-9 overflow-hidden',
          active
            ? 'bg-primary/8 text-primary'
            : 'text-foreground hover:bg-foreground/5',
        )}
      >
        {active && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-primary" aria-hidden />}
        <span
          aria-hidden
          className={cn(
            'relative w-7 h-[18px] rounded border shrink-0 bg-background bg-cover bg-center',
            active ? 'border-primary/25' : 'border-foreground/10',
            !board.thumbnail && (loose ? 'bg-muted/45' : 'bg-muted/35'),
          )}
          style={board.thumbnail ? { backgroundImage: `url(${board.thumbnail})` } : undefined}
        >
          {board.starred && (
            <Star
              className="absolute -right-1 -top-1 w-3 h-3 text-amber-500 drop-shadow-[0_1px_0_white]"
              fill="currentColor"
              strokeWidth={1.5}
            />
          )}
        </span>
        <span className={cn(
          'truncate flex-1 text-[13px] leading-tight',
          active ? 'font-semibold text-primary' : 'font-medium text-foreground/90',
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

// ??????????????????????????????????????????
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

// ??????????????????????????????????????????
// 鍮?硫붿씤 ???쒖꽦 蹂대뱶 ?놁쓬
function EmptyMain() {
  const createBlankBoard = () => addBoard('새 보드', null);
  const createStickyBoard = () => {
    const board = addBoard('빠른 메모 보드', null);
    const sticky = makeSticky({ x: 0, y: 0 }, WHITEBOARD_STARTER_TOOL);
    sticky.content = '첫 생각';
    const elements = [sticky];
    setElements(board.id, elements);
    pushSnapshot(board.id, elements);
  };

  return (
    <PageStarterEmpty
      pattern="dots"
      contentClassName="max-w-[540px]"
      icon={<LayoutTemplate className="h-6 w-6" strokeWidth={1.7} />}
      title="생각을 펼칠 보드를 만들어보세요"
      description="빈 캔버스로 시작하거나, 자주 쓰는 틀 하나를 골라 바로 배치할 수 있어요."
      primaryAction={{
        label: '빈 보드',
        icon: <Plus className="h-3.5 w-3.5" strokeWidth={2} />,
        onClick: createBlankBoard,
      }}
      secondaryActions={[{
        label: '스티키로 시작',
        icon: <StickyNote className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />,
        onClick: createStickyBoard,
      }]}
      starterLabel="빠른 템플릿"
      starters={WHITEBOARD_STARTER_TEMPLATES.map((kind) => {
        const meta = TEMPLATE_META[kind];
        return {
          label: meta.label,
          description: meta.description,
          icon: <span className="text-[20px] leading-none">{meta.emoji}</span>,
          onClick: () => {
            const b = addBoard(meta.label, null);
            const elements = buildTemplate(kind, 0, 0);
            setElements(b.id, elements);
            pushSnapshot(b.id, elements);
          },
        };
      })}
    />
  );
}

// ??????????????????????????????????????????
// ?명꽣?숈뀡 ?곹깭 (罹붾쾭???꾩떆 ?곹깭 ??store ??諛뺤? ?딆쓬)
type ResizeHandle = 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w';

type Interaction =
  | { kind: 'idle' }
  | { kind: 'panning'; startX: number; startY: number; vx: number; vy: number }
  | { kind: 'creating'; tool: WBToolKind; start: { x: number; y: number }; current: { x: number; y: number }; tempElement?: WBElement }
  | { kind: 'drawing-line'; arrow: boolean; start: { x: number; y: number }; current: { x: number; y: number }; startBindingId?: string; endBindingId?: string }
  | { kind: 'editing-line-end'; id: string; end: 'start' | 'end'; current: { x: number; y: number }; bindingId?: string }
  | { kind: 'pen'; points: Array<[number, number]> }
  | { kind: 'erasing'; ids: Set<string> }
  | { kind: 'dragging'; ids: string[]; startWorld: { x: number; y: number }; origin: Map<string, { x: number; y: number }> }
  | { kind: 'resizing'; handle: ResizeHandle; ids: string[]; startWorld: { x: number; y: number }; origin: Map<string, { x: number; y: number; w: number; h: number }> }
  | { kind: 'rotating'; id: string; cx: number; cy: number; startAngle: number; originAngle: number }
  | { kind: 'marquee'; start: { x: number; y: number }; current: { x: number; y: number }; baseSelection: Set<string> };

// ?쒖꽦 蹂대뱶 ??罹붾쾭??+ ?뚮줈??UI
function BoardCanvas({
  board,
  elements,
  viewport,
  toolState,
  gridType,
  bgColor,
}: {
  board: WBBoard;
  elements: WBElement[];
  viewport: WBViewport;
  toolState: WBToolState;
  gridType: 'dot' | 'line' | 'none';
  bgColor: 'cream' | 'white' | 'dark';
}) {
  const tool = toolState.kind;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const rightPanRef = useRef<{ pointerId: number; startX: number; startY: number; moved: boolean } | null>(null);
  const suppressNextContextMenuRef = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [interaction, setInteraction] = useState<Interaction>({ kind: 'idle' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTableCell, setEditingTableCell] = useState<{ tableId: string; index: number } | null>(null);
  const [selectedTableCell, setSelectedTableCell] = useState<{ tableId: string; index: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [minimapOpen, setMinimapOpen] = useState(true);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ clientX: number; clientY: number; ids: string[]; world: { x: number; y: number } } | null>(null);
  const [snapGuides, setSnapGuides] = useState<Guide[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const [hoverElementId, setHoverElementId] = useState<string | null>(null);
  const [showStarterTip, setShowStarterTip] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('wb:starter-tip-dismissed:v1') !== '1';
  });

  useEffect(() => {
    if (editingId && (tool === 'sticky' || tool === 'text')) {
      setTool({ kind: 'select' });
    }
  }, [editingId, tool]);

  // 而⑦뀒?대꼫 ?ъ씠利?異붿쟻
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

  // ??蹂대뱶濡??꾪솚 ???좏깮쨌?몄쭛 珥덇린??
  useEffect(() => {
    setSelection(new Set());
    setEditingId(null);
    setEditingTableCell(null);
    setSelectedTableCell(null);
    setInteraction({ kind: 'idle' });
    setHoverElementId(null);
    clearHistory(board.id);
     
  }, [board.id]);

  // 珥덇린 history snapshot ??IDB 鍮꾨룞湲?濡쒕뱶媛 ?앸궃 ??泥?elements 媛 ?꾩갑?덉쓣 ?뚮쭔 (per-board ref 濡?1??蹂댁옣)
  const historyInitRef = useRef<string | null>(null);
  useEffect(() => {
    if (historyInitRef.current === board.id) return;
    // EMPTY ?곹깭(load 吏꾪뻾 以??먮뒗 push ?섏? ?딆쓬 ??IDB load ?꾨즺 ?좏샇濡?elements 媛 媛깆떊???뚭퉴吏 ?湲?
    // ?? 吏꾩쭨 鍮???蹂대뱶(addBoard 吏곹썑)??elements 媛 []?대㈃??IDB 罹먯떆?먮룄 利됱떆 ?ㅼ뼱媛?덉쓬.
    // ?섏쓣 援щ퀎?섍린 ?꾪빐 getBoardData(board.id) 寃곌낵??reference 媛 EMPTY ?몄? 寃???쒕룄.
    // ?덉쟾???⑥닚 ?대━?ㅽ떛: 泥?吏꾩엯 ??50ms ?덉뿉 elements 媛 ?꾩갑?섎㈃ 洹멸구濡?init.
    const timer = window.setTimeout(() => {
      historyInitRef.current = board.id;
      pushSnapshot(board.id, getBoardData(board.id).elements);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [board.id, elements]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      updateBoardThumbnail(board.id, buildBoardThumbnail(elements, bgColor));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [bgColor, board.id, elements]);

  // ?꾧뎄 蹂寃???hover state 珥덇린??(eraser ???ㅻⅨ ?꾧뎄 ?꾪솚 ??
  useEffect(() => {
    if (tool !== 'eraser') setHoverElementId(null);
  }, [tool]);

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

  // ?좏깮 ?붿냼 蹂듭젣쨌?대룞쨌z-order
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

  // ?붿궡?쒗궎 ?곗냽 ?대룞??1 ?몃옖??뀡?쇰줈 ??留덉?留??대룞 ??200ms debounce 濡?snapshot
  const moveCommitTimerRef = useRef<number | null>(null);
  const moveSelected = useCallback((dx: number, dy: number) => {
    if (selection.size === 0) return;
    const next = elements.map((el) =>
      selection.has(el.id) ? { ...el, x: el.x + dx, y: el.y + dy, updatedAt: Date.now() } : el,
    );
    setElements(board.id, next);
    if (moveCommitTimerRef.current) window.clearTimeout(moveCommitTimerRef.current);
    moveCommitTimerRef.current = window.setTimeout(() => {
      const base = getBoardData(board.id).elements;
      const synced = syncAllBindings(base);
      if (synced !== base) setElements(board.id, synced);
      pushSnapshot(board.id, synced);
      moveCommitTimerRef.current = null;
    }, 250);
  }, [board.id, elements, selection]);

  // 洹몃９ / 洹몃９ ?댁젣 / ?좉툑 ?좉?
  const doGroup = useCallback(() => {
    if (selection.size < 2) return;
    const groupId = `g_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const next = elements.map((el) =>
      selection.has(el.id)
        ? { ...el, groupIds: [...el.groupIds, groupId], updatedAt: Date.now() }
        : el,
    );
    setElements(board.id, next);
    pushSnapshot(board.id, next);
  }, [board.id, elements, selection]);

  const doUngroup = useCallback(() => {
    if (selection.size === 0) return;
    // ?좏깮???붿냼?ㅼ쓽 媛??留덉?留?理쒖긽?? 洹몃９???댁젣
    const lastGroups = new Set<string>();
    for (const el of elements) {
      if (selection.has(el.id) && el.groupIds.length > 0) {
        lastGroups.add(el.groupIds[el.groupIds.length - 1]);
      }
    }
    if (lastGroups.size === 0) return;
    const next = elements.map((el) => ({
      ...el,
      groupIds: el.groupIds.filter((g) => !lastGroups.has(g)),
      updatedAt: Date.now(),
    }));
    setElements(board.id, next);
    pushSnapshot(board.id, next);
  }, [board.id, elements, selection]);

  const doToggleLock = useCallback(() => {
    if (selection.size === 0) return;
    const anyUnlocked = elements.some((el) => selection.has(el.id) && !el.locked);
    const next = elements.map((el) =>
      selection.has(el.id) ? { ...el, locked: anyUnlocked, updatedAt: Date.now() } : el,
    );
    setElements(board.id, next);
    pushSnapshot(board.id, next);
  }, [board.id, elements, selection]);

  const createFrameAroundSelection = useCallback(() => {
    const targets = elements.filter((el) => selection.has(el.id) && el.type !== 'frame');
    const box = unionBBox(targets);
    if (!box) {
      notify.info('프레임으로 묶을 요소를 먼저 선택해 주세요', { duration: 1600 });
      return;
    }
    const pad = 36;
    const frame = makeFrame({
      x: box.x - pad,
      y: box.y - pad - 20,
      w: box.w + pad * 2,
      h: box.h + pad * 2 + 20,
    }, elements);
    frame.zIndex = -1000;
    frame.childIds = targets.map((el) => el.id);
    const next = syncFrameChildren([...elements, frame]);
    setElements(board.id, next);
    setSelection(new Set([frame.id]));
    setEditingId(frame.id);
    pushSnapshot(board.id, next);
  }, [board.id, elements, selection]);

  const deleteElementsWithUndo = useCallback((ids: Iterable<string>) => {
    const idSet = new Set(ids);
    const removed = elements.filter((el) => idSet.has(el.id) && !el.locked);
    if (removed.length === 0) {
      notify.info('잠긴 요소는 잠금을 해제해야 삭제할 수 있어요', { duration: 1800 });
      return false;
    }
    const removedIds = new Set(removed.map((el) => el.id));
    const next = elements.filter((el) => !removedIds.has(el.id));
    setElements(board.id, next);
    setSelection(new Set());
    pushSnapshot(board.id, next);
    notify.info(`${removed.length}개 삭제됨`, {
      duration: 5000,
      action: {
        label: '되돌리기',
        onClick: () => {
          const restored = syncAllBindings([...next, ...removed]);
          setElements(board.id, restored);
          setSelection(new Set(removed.map((el) => el.id)));
          pushSnapshot(board.id, restored);
        },
      },
    });
    return true;
  }, [board.id, elements]);

  // 洹몃９ ?뺤옣 ????硫ㅻ쾭 ?대┃ ???숈씪 洹몃９ ?꾩껜 ?좏깮
  const expandGroupSelection = useCallback((id: string, baseSelection?: Set<string>): Set<string> => {
    const el = elements.find((x) => x.id === id);
    if (!el || el.groupIds.length === 0) return new Set(baseSelection ?? [id]);
    const lastGroup = el.groupIds[el.groupIds.length - 1];
    const groupMembers = elements
      .filter((x) => x.groupIds.includes(lastGroup))
      .map((x) => x.id);
    const next = new Set(baseSelection ?? []);
    for (const mid of groupMembers) next.add(mid);
    return next;
  }, [elements]);

  const changeZOrder = useCallback((mode: 'front' | 'back' | 'forward' | 'backward') => {
    if (selection.size === 0) return;
    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

    let reordered: WBElement[];

    if (mode === 'front') {
      // ?좏깮 紐⑤몢 ?ㅻ줈 紐⑥쑝怨??앹뿉 遺숈엫 (?좏깮 ???곷? ?쒖꽌 蹂댁〈)
      const sel = sorted.filter((el) => selection.has(el.id));
      const rest = sorted.filter((el) => !selection.has(el.id));
      reordered = [...rest, ...sel];
    } else if (mode === 'back') {
      const sel = sorted.filter((el) => selection.has(el.id));
      const rest = sorted.filter((el) => !selection.has(el.id));
      reordered = [...sel, ...rest];
    } else if (mode === 'forward') {
      // ?꾩そ遺?????좏깮???붿냼瑜??꾩そ 鍮꾩꽑???붿냼? swap
      reordered = [...sorted];
      for (let i = reordered.length - 2; i >= 0; i--) {
        if (selection.has(reordered[i].id) && !selection.has(reordered[i + 1].id)) {
          [reordered[i], reordered[i + 1]] = [reordered[i + 1], reordered[i]];
        }
      }
    } else {
      // backward ???꾨옒履쎈???swap
      reordered = [...sorted];
      for (let i = 1; i < reordered.length; i++) {
        if (selection.has(reordered[i].id) && !selection.has(reordered[i - 1].id)) {
          [reordered[i], reordered[i - 1]] = [reordered[i - 1], reordered[i]];
        }
      }
    }
    // zIndex ?뺤닔 ?щ???
    const normalized = reordered.map((el, i) => ({ ...el, zIndex: i, updatedAt: Date.now() }));
    setElements(board.id, normalized);
    pushSnapshot(board.id, normalized);
  }, [board.id, elements, selection]);

  // ?대┰蹂대뱶 (硫붾え由??쒖젙)
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

  const activeTableCell = useCallback((): { table: WBTable; index: number } | null => {
    if (!selectedTableCell || selection.size !== 1) return null;
    const table = elements.find((el): el is WBTable =>
      el.id === selectedTableCell.tableId && el.type === 'table' && selection.has(el.id),
    );
    if (!table) return null;
    const maxIndex = table.rows * table.cols - 1;
    if (selectedTableCell.index < 0 || selectedTableCell.index > maxIndex) return null;
    return { table, index: selectedTableCell.index };
  }, [elements, selectedTableCell, selection]);

  const applyTablePatch = useCallback((table: WBTable, patch: Partial<WBTable>, commitHistory = true) => {
    const next = elements.map((el) =>
      el.id === table.id ? ({ ...el, ...patch, updatedAt: Date.now() } as WBElement) : el,
    );
    setElements(board.id, next);
    if (commitHistory) pushSnapshot(board.id, next);
  }, [board.id, elements]);

  const setActiveTableCellValue = useCallback((value: string, commitHistory = true) => {
    const active = activeTableCell();
    if (!active) return false;
    applyTablePatch(active.table, { cells: updateTableCell(active.table, active.index, value) }, commitHistory);
    return true;
  }, [activeTableCell, applyTablePatch]);

  const moveActiveTableCell = useCallback((rowDelta: number, colDelta: number, wrap = false) => {
    const active = activeTableCell();
    if (!active) return false;
    const next = moveTableCellIndex(active.table, active.index, rowDelta, colDelta, wrap);
    if (next == null) return false;
    setSelectedTableCell({ tableId: active.table.id, index: next });
    return true;
  }, [activeTableCell]);

  const createStickyBatch = useCallback((lines: string[], origin: { x: number; y: number }) => {
    const clean = lines.map((line) => line.trim()).filter(Boolean);
    if (clean.length === 0) return;
    const zStart = nextZIndex(elements);
    const stickyW = 180;
    const stickyH = 180;
    const gap = 18;
    const cols = clean.length > 6 ? 3 : clean.length > 3 ? 2 : 1;
    const added = clean.map((content, idx): WBSticky => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const sticky = makeSticky(
        { x: origin.x + col * (stickyW + gap), y: origin.y + row * (stickyH + gap) },
        toolState,
      );
      return {
        ...sticky,
        content,
        zIndex: zStart + idx,
      };
    });
    const merged = [...elements, ...added];
    setElements(board.id, merged);
    setSelection(new Set(added.map((el) => el.id)));
    pushSnapshot(board.id, merged);
    notify.success(`${added.length}개 스티키로 붙여넣었어요`, { duration: 1600 });
  }, [board.id, elements, toolState]);

  const createTextAt = useCallback((content: string, pos?: { x: number; y: number }) => {
    const p = pos ?? { x: viewport.x + size.w / 2 / viewport.zoom, y: viewport.y + size.h / 2 / viewport.zoom };
    const text = makeText(p, bgColor);
    text.content = content;
    text.zIndex = nextZIndex(elements);
    const layout = estimateInlineTextSize(content, text.fontSize, text.w, text.h);
    text.w = layout.w;
    text.h = layout.h;
    const merged = [...elements, text];
    setElements(board.id, merged);
    setSelection(new Set([text.id]));
    pushSnapshot(board.id, merged);
  }, [bgColor, board.id, elements, size.h, size.w, viewport]);

  const viewportCenter = useCallback(() => ({
    x: viewport.x + size.w / 2 / viewport.zoom,
    y: viewport.y + size.h / 2 / viewport.zoom,
  }), [size.h, size.w, viewport]);

  const createStickyAt = useCallback((pos?: { x: number; y: number }) => {
    const sticky = makeSticky(pos ?? viewportCenter(), toolState);
    sticky.zIndex = nextZIndex(elements);
    const next = [...elements, sticky];
    setElements(board.id, next);
    setSelection(new Set([sticky.id]));
    setEditingId(sticky.id);
    pushSnapshot(board.id, next);
  }, [board.id, elements, toolState, viewportCenter]);

  const createBlankTextAt = useCallback((pos?: { x: number; y: number }) => {
    const text = makeText(pos ?? viewportCenter(), bgColor);
    text.zIndex = nextZIndex(elements);
    const next = [...elements, text];
    setElements(board.id, next);
    setSelection(new Set([text.id]));
    setEditingId(text.id);
    pushSnapshot(board.id, next);
  }, [bgColor, board.id, elements, viewportCenter]);

  const applyTemplate = useCallback((kind: WBTemplateKind, pos?: { x: number; y: number }) => {
    const p = pos ?? viewportCenter();
    const added = buildTemplate(kind, p.x, p.y);
    const merged = syncFrameChildren([...elements, ...added]);
    setElements(board.id, merged);
    setSelection(new Set(added.map((el) => el.id)));
    pushSnapshot(board.id, merged);
    notify.success(`${TEMPLATE_META[kind].label} 추가됨`, { duration: 1500 });
  }, [board.id, elements, viewportCenter]);

  const createContentInsert = useCallback((kind: WBContentInsertKind, pos?: { x: number; y: number }) => {
    if (kind === 'diagram') {
      applyTemplate('flowchart', pos);
      return;
    }
    if (kind === 'kanban') {
      applyTemplate('kanban', pos);
      return;
    }
    const p = pos ?? viewportCenter();
    const added =
      kind === 'table' ? makeTablePack(p)
      : makeTimelinePack(p, toolState, bgColor);
    const zBase = nextZIndex(elements);
    const layered = added.map((el, idx) => ({ ...el, zIndex: zBase + idx, updatedAt: Date.now() }));
    const merged = syncFrameChildren([...elements, ...layered]);
    setElements(board.id, merged);
    setSelection(new Set(layered.map((el) => el.id)));
    pushSnapshot(board.id, merged);
    notify.success(kind === 'table' ? '표를 추가했어요' : '타임라인을 추가했어요', { duration: 1400 });
  }, [applyTemplate, bgColor, board.id, elements, toolState, viewportCenter]);

  const createLinkedSticky = useCallback((source: WBElement, dir: 'right' | 'bottom' | 'left' | 'top') => {
    if (!isBindableElement(source) || source.locked) return;
    const offset = 96;
    const sticky = makeSticky({ x: source.x, y: source.y }, toolState);
    const x =
      dir === 'right' ? source.x + source.w + offset
      : dir === 'left' ? source.x - sticky.w - offset
      : source.x;
    const y =
      dir === 'bottom' ? source.y + source.h + offset
      : dir === 'top' ? source.y - sticky.h - offset
      : source.y;
    const nextZ = nextZIndex(elements);
    const nextSticky: WBSticky = { ...sticky, x, y, zIndex: nextZ };
    const start = sidePoint(source, dir);
    const end = sidePoint(nextSticky, oppositeSide(dir));
    const arrow = makeLineOrArrow(start, end, true, { ...toolState, lineKind: 'arrow-solid', roughness: 0 }, bgColor) as WBArrow;
    arrow.id = newElementId();
    arrow.zIndex = nextZ + 1;
    arrow.startBinding = { elementId: source.id, anchor: 'center' };
    arrow.endBinding = { elementId: nextSticky.id, anchor: 'center' };
    const merged = syncAllBindings([...elements, nextSticky, arrow]);
    setElements(board.id, merged);
    setSelection(new Set([nextSticky.id]));
    setEditingId(nextSticky.id);
    pushSnapshot(board.id, merged);
  }, [bgColor, board.id, elements, toolState]);

  const handleImportJSON = useCallback(async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<{ elements: WBElement[]; viewport: WBViewport; schemaVersion: number }>;
      if (!Array.isArray(parsed.elements)) throw new Error('invalid');
      const data = {
        schemaVersion: 1 as const,
        elements: parsed.elements,
        viewport: parsed.viewport ?? viewport,
      };
      updateBoardData(board.id, data);
      setSelection(new Set());
      pushSnapshot(board.id, data.elements);
      notify.success('JSON 보드를 가져왔어요', { duration: 1600 });
    } catch {
      notify.error('JSON 가져오기 실패');
    }
  }, [board.id, viewport]);

  const frames = elements.filter((el): el is WBFrame => el.type === 'frame');
  const jumpToFrame = useCallback((frame: WBFrame) => {
    const pad = 72;
    const nextZoom = clamp(Math.min(size.w / Math.max(1, frame.w + pad * 2), size.h / Math.max(1, frame.h + pad * 2)), 0.15, 2);
    setViewport(board.id, {
      zoom: nextZoom,
      x: frame.x + frame.w / 2 - size.w / 2 / nextZoom,
      y: frame.y + frame.h / 2 - size.h / 2 / nextZoom,
    });
    setSelection(new Set([frame.id]));
  }, [board.id, size.h, size.w]);

  const stepPresentation = useCallback((delta: number) => {
    if (frames.length === 0) return;
    const nextIndex = presentationIndex == null
      ? 0
      : (presentationIndex + delta + frames.length) % frames.length;
    setPresentationIndex(nextIndex);
    jumpToFrame(frames[nextIndex]);
  }, [frames, jumpToFrame, presentationIndex]);

  // ?꾩뿭 ?⑥텞??
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      // space hold
      if (e.key === ' ') {
        e.preventDefault();
        setSpaceDown(true);
        return;
      }
      // ?꾧뎄 ?⑥텞??
      const key = e.key.toLowerCase();
      const toolMap: Record<string, WBToolKind> = {
        v: 'select', h: 'pan', t: 'text', s: 'sticky',
        r: 'shape', l: 'line', a: 'line', p: 'pen', e: 'eraser',
        f: 'frame',
      };
      const shapeKey: Record<string, WBToolState['shapeKind']> = { o: 'ellipse', d: 'diamond' };
      if (!e.ctrlKey && !e.metaKey && !e.altKey && tool === 'select' && selection.size === 0 && e.key.length === 1 && !toolMap[key] && !shapeKey[key]) {
        e.preventDefault();
        const text = makeText({ x: viewport.x + size.w / 2 / viewport.zoom, y: viewport.y + size.h / 2 / viewport.zoom }, bgColor);
        text.content = e.key;
        text.zIndex = nextZIndex(elements);
        const next = [...elements, text];
        setElements(board.id, next);
        setSelection(new Set([text.id]));
        setEditingId(text.id);
        pushSnapshot(board.id, next);
        return;
      }
      if (e.key === 'Escape') {
        if (contextMenu) { setContextMenu(null); return; }
        if (editingTableCell) { setEditingTableCell(null); return; }
        if (editingId) { setEditingId(null); return; }
        if (interaction.kind !== 'idle') { setInteraction({ kind: 'idle' }); return; }
        if (selection.size > 0) { setSelection(new Set()); return; }
        setTool({ kind: 'select' });
        return;
      }
      const tableCell = activeTableCell();
      if (tableCell && !editingId && !editingTableCell) {
        const isCopyCombo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c';
        const isCutCombo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x';
        if (isCopyCombo || isCutCombo) {
          e.preventDefault();
          const value = tableCell.table.cells[tableCell.index] ?? '';
          void navigator.clipboard?.writeText(value).catch(() => undefined);
          if (isCutCombo) setActiveTableCellValue('');
          return;
        }
        if (e.key === 'Enter' || e.key === 'F2') {
          e.preventDefault();
          setEditingTableCell({ tableId: tableCell.table.id, index: tableCell.index });
          return;
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          moveActiveTableCell(0, e.shiftKey ? -1 : 1, true);
          return;
        }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          const rowDelta = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
          const colDelta = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
          moveActiveTableCell(rowDelta, colDelta);
          return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          setActiveTableCellValue('');
          return;
        }
        if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
          e.preventDefault();
          setActiveTableCellValue(e.key);
          setEditingTableCell({ tableId: tableCell.table.id, index: tableCell.index });
          return;
        }
      }
      // Tab ??紐곗엯 紐⑤뱶 (?뚮줈??UI ?좉?)
      if (e.key === 'Tab') {
        e.preventDefault();
        setImmersive((v) => !v);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.size > 0) {
        e.preventDefault();
        deleteElementsWithUndo(selection);
        return;
      }
      // ?붿궡?????대룞
      if (selection.size > 0 && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        moveSelected(dx, dy);
        return;
      }
      // Ctrl/Cmd ?⑥텞??
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'f') { e.preventDefault(); setSearchOpen(true); return; }
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); return; }
        if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); doRedo(); return; }
        if (k === 'a') {
          e.preventDefault();
          setSelection(new Set(elements.filter((el) => !el.locked).map((el) => el.id)));
          return;
        }
        if (k === 'd') { e.preventDefault(); duplicateSelected(); return; }
        if (k === 'g' && !e.shiftKey) { e.preventDefault(); doGroup(); return; }
        if (k === 'g' && e.shiftKey)  { e.preventDefault(); doUngroup(); return; }
        if (k === 'l') { e.preventDefault(); doToggleLock(); return; }
        if (k === 'c') { e.preventDefault(); copySelected(); return; }
        if (k === 'v') {
          const hasInternalClipboard = Boolean(clipboardRef.current?.length);
          if (hasInternalClipboard) {
            e.preventDefault();
            pasteClipboard();
          }
          return;
        }
        if (k === 'x') {
          e.preventDefault();
          copySelected();
          deleteElementsWithUndo(selection);
          return;
        }
        // ?ㅽ럺: Ctrl+] / [ = 留???/ 留???/ Ctrl+Shift+] / [ = ??移?(?⑤룆 [ ]? ?숈씪)
        if (e.key === ']') { e.preventDefault(); changeZOrder(e.shiftKey ? 'forward' : 'front'); return; }
        if (e.key === '[') { e.preventDefault(); changeZOrder(e.shiftKey ? 'backward' : 'back'); return; }
        return;
      }
      // ?⑤룆 [ ] (Ctrl ?놁씠) ??z-order ??移?
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
  }, [activeTableCell, bgColor, board.id, editingId, editingTableCell, elements, interaction, selection, contextMenu, doUndo, doRedo, duplicateSelected, copySelected, pasteClipboard, moveSelected, moveActiveTableCell, setActiveTableCellValue, changeZOrder, doGroup, doUngroup, doToggleLock, deleteElementsWithUndo, size.h, size.w, tool, viewport.x, viewport.y, viewport.zoom]);

  // ?붾㈃ 醫뚰몴 ??world
  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return screenToWorld(clientX, clientY, rect, viewport);
  }, [viewport]);

  const openContextMenuAt = useCallback((clientX: number, clientY: number) => {
    const wp = toWorld(clientX, clientY);
    const hit = findElementAt(elements, wp.x, wp.y, { includeLocked: true });
    if (hit && !selection.has(hit.id)) setSelection(new Set([hit.id]));
    const ids = hit ? (selection.has(hit.id) ? [...selection] : [hit.id]) : [...selection];
    setContextMenu({ clientX, clientY, ids, world: wp });
  }, [elements, selection, toWorld]);

  // ?대?吏 ?뚯씪 異붽? (drop / paste 怨듭슜)
  const insertImageAt = useCallback(async (file: File, wp: { x: number; y: number }) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      notify.warning('이미지가 너무 커요 (10MB 이하)', { duration: 2000 });
      return;
    }
    try {
      const rec = await addWBImage(file);
      const MAX_DIM = 480;
      const scale = Math.min(1, MAX_DIM / Math.max(rec.w, rec.h));
      const w = rec.w * scale;
      const h = rec.h * scale;
      const now = Date.now();
      const img: WBImage = {
        id: newElementId(),
        type: 'image',
        x: wp.x - w / 2,
        y: wp.y - h / 2,
        w, h,
        angle: 0,
        zIndex: nextZIndex(elements),
        opacity: 1,
        locked: false,
        groupIds: [],
        imageId: rec.id,
        naturalW: rec.w,
        naturalH: rec.h,
        cornerRadius: 8,
        createdAt: now,
        updatedAt: now,
      };
      addElement(board.id, img);
      setSelection(new Set([img.id]));
      pushSnapshot(board.id, [...elements, img]);
      notify.success('이미지 추가됨', { duration: 1200 });
    } catch (err) {
      notify.error('이미지 추가 실패');
      console.error('[wb] insertImage failed:', err);
    }
  }, [board.id, elements]);

  // ?섏씠?ㅽ듃 (?대?吏)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (editingId || editingTableCell) return;
      if (isEditableTarget(e.target)) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const text = e.clipboardData?.getData('text/plain') ?? '';
      if (text.trim()) {
        const selectedTable = selection.size === 1
          ? elements.find((el): el is WBTable => selection.has(el.id) && el.type === 'table')
          : null;
        if (selectedTable && selectedTableCell?.tableId === selectedTable.id) {
          e.preventDefault();
          const nextTable: Partial<WBTable> =
            text.includes('\t') || text.includes('\n')
              ? (() => {
                  const pasted = pasteTableTextAt(selectedTable, selectedTableCell.index, text);
                  return {
                    ...pasted,
                    w: Math.max(selectedTable.w, pasted.cols * 96),
                    h: Math.max(selectedTable.h, pasted.rows * 40),
                  };
                })()
              : { cells: updateTableCell(selectedTable, selectedTableCell.index, text) };
          updateElement(board.id, selectedTable.id, nextTable as Partial<WBElement>);
          setTimeout(() => pushSnapshot(board.id, getBoardData(board.id).elements), 0);
          notify.success('표에 붙여넣었어요', { duration: 1300 });
          return;
        }
        if (selectedTable && (text.includes('\t') || text.includes('\n'))) {
          e.preventDefault();
          const pasted = pasteTableTextAt(selectedTable, 0, text);
          const nextTable: Partial<WBTable> = {
            ...pasted,
            w: Math.max(selectedTable.w, pasted.cols * 96),
            h: Math.max(selectedTable.h, pasted.rows * 40),
          };
          updateElement(board.id, selectedTable.id, nextTable as Partial<WBElement>);
          setTimeout(() => pushSnapshot(board.id, getBoardData(board.id).elements), 0);
          notify.success('표에 붙여넣었어요', { duration: 1300 });
          return;
        }
        if (!selectedTable && text.includes('\t')) {
          e.preventDefault();
          const parsed = parseTableText(text);
          const rect = containerRef.current?.getBoundingClientRect();
          const center = rect
            ? { x: viewport.x + rect.width / 2 / viewport.zoom, y: viewport.y + rect.height / 2 / viewport.zoom }
            : { x: 0, y: 0 };
          const table = makeTablePack(center)[0] as WBTable;
          table.rows = parsed.rows;
          table.cols = parsed.cols;
          table.cells = parsed.cells;
          table.cellStyles = resizeTableCellStyles(table, parsed.rows, parsed.cols);
          table.w = Math.max(320, parsed.cols * 112);
          table.h = Math.max(160, parsed.rows * 44);
          table.x = center.x - table.w / 2;
          table.y = center.y - table.h / 2;
          table.zIndex = nextZIndex(elements);
          const next = [...elements, table];
          setElements(board.id, next);
          setSelection(new Set([table.id]));
          setSelectedTableCell({ tableId: table.id, index: 0 });
          pushSnapshot(board.id, next);
          notify.success('붙여넣은 내용을 표로 만들었어요', { duration: 1400 });
          return;
        }
        const lines = text.split(/\r?\n/).filter((line) => line.trim());
        if (lines.length >= 2) {
          e.preventDefault();
          const rect = containerRef.current?.getBoundingClientRect();
          const center = rect
            ? { x: viewport.x + rect.width / 2 / viewport.zoom, y: viewport.y + rect.height / 2 / viewport.zoom }
            : { x: 0, y: 0 };
          createStickyBatch(lines, { x: center.x - 90, y: center.y - 90 });
          return;
        }
        if (tool === 'text') {
          e.preventDefault();
          createTextAt(text, { x: viewport.x + size.w / 2 / viewport.zoom, y: viewport.y + size.h / 2 / viewport.zoom });
          return;
        }
      }
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const rect = containerRef.current?.getBoundingClientRect();
            const center = rect
              ? { x: viewport.x + rect.width / 2 / viewport.zoom, y: viewport.y + rect.height / 2 / viewport.zoom }
              : { x: 0, y: 0 };
            void insertImageAt(file, center);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [board.id, createStickyBatch, createTextAt, editingId, editingTableCell, elements, insertImageAt, selectedTableCell, selection, size.h, size.w, tool, viewport]);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.shiftKey || e.altKey) {
      setViewport(board.id, {
        ...viewport,
        x: viewport.x + (e.shiftKey ? e.deltaY : e.deltaX) / viewport.zoom,
        y: viewport.y + (e.shiftKey ? 0 : e.deltaY) / viewport.zoom,
      });
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.002);
    const nextZoom = clamp(viewport.zoom * factor, 0.1, 5);
    const worldX = viewport.x + sx / viewport.zoom;
    const worldY = viewport.y + sy / viewport.zoom;
    setViewport(board.id, { x: worldX - sx / nextZoom, y: worldY - sy / nextZoom, zoom: nextZoom });
  }, [board.id, viewport]);

  const isPanMode = tool === 'pan' || spaceDown;

  // ?? pointer down ??????????????????????????
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    if (e.target instanceof HTMLElement && e.target.closest('[data-wb-ui="true"]')) return;
    if (editingId) return;  // ?몄쭛 以묒뿉??臾댁떆
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();

    // ?고겢由??쒕옒洹?/ ??紐⑤뱶 / 以묎컙 踰꾪듉? ?붾㈃ ?대룞
    if (e.button === 2) {
      setContextMenu(null);
      rightPanRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
      setInteraction({ kind: 'panning', startX: e.clientX, startY: e.clientY, vx: viewport.x, vy: viewport.y });
      return;
    }
    if (isPanMode || e.button === 1) {
      setInteraction({ kind: 'panning', startX: e.clientX, startY: e.clientY, vx: viewport.x, vy: viewport.y });
      return;
    }

    const wp = toWorld(e.clientX, e.clientY);

    if (tool === 'select') {
      if (selection.size === 1) {
        const onlyId = [...selection][0];
        const onlyEl = elements.find((x) => x.id === onlyId);
        if (onlyEl && onlyEl.type === 'arrow') {
          const end = hitArrowEndpoint(onlyEl, wp, viewport.zoom);
          if (end) {
            setInteraction({ kind: 'editing-line-end', id: onlyEl.id, end, current: wp });
            return;
          }
        }
      }
      if (selection.size > 1) {
        const unlockedSelection = elements.filter((el) => selection.has(el.id) && !el.locked);
        const box = unionBBox(unlockedSelection);
        const handle = box ? findResizeHandle({ ...unlockedSelection[0], ...box } as WBElement, wp, viewport.zoom) : null;
        if (box && handle) {
          const origin = new Map<string, { x: number; y: number; w: number; h: number }>();
          for (const el of unlockedSelection) origin.set(el.id, { x: el.x, y: el.y, w: el.w, h: el.h });
          origin.set('__bbox__', box);
          setInteraction({ kind: 'resizing', handle, ids: unlockedSelection.map((el) => el.id), startWorld: wp, origin });
          return;
        }
      }
      // ?⑥씪 ?좏깮 + ?뚯쟾 ?몃뱾 hit-test (resize 蹂대떎 癒쇱?)
      if (selection.size === 1) {
        const onlyId = [...selection][0];
        const onlyEl = elements.find((x) => x.id === onlyId);
        if (onlyEl && !onlyEl.locked && isRotatable(onlyEl)) {
          // ?뚯쟾???붿냼: wp 瑜??붿냼 濡쒖뺄 醫뚰몴濡?蹂?섑븳 ???몃뱾 hit-test
          const localWp = worldToElementLocal(wp, onlyEl);
          if (hitsRotationHandle(onlyEl, localWp, viewport.zoom)) {
            const cx = onlyEl.x + onlyEl.w / 2;
            const cy = onlyEl.y + onlyEl.h / 2;
            setInteraction({
              kind: 'rotating',
              id: onlyEl.id,
              cx, cy,
              startAngle: Math.atan2(wp.y - cy, wp.x - cx),
              originAngle: onlyEl.angle,
            });
            return;
          }
          const handle = findResizeHandle(onlyEl, localWp, viewport.zoom);
          if (handle) {
            const origin = new Map<string, { x: number; y: number; w: number; h: number }>();
            origin.set(onlyEl.id, { x: onlyEl.x, y: onlyEl.y, w: onlyEl.w, h: onlyEl.h });
            setInteraction({ kind: 'resizing', handle, ids: [onlyEl.id], startWorld: wp, origin });
            return;
          }
        }
      }
      const hit = findElementAt(elements, wp.x, wp.y, { includeLocked: true });
      if (hit) {
        if (hit.type === 'table') {
          const cellIndex = hitTableCell(hit, worldToElementLocal(wp, hit));
          setSelectedTableCell(cellIndex == null ? null : { tableId: hit.id, index: cellIndex });
        } else {
          setSelectedTableCell(null);
        }
        // ?좏깮 ?좉? (Shift) ?먮뒗 媛덉쓬
        if (e.shiftKey) {
          setSelection((prev) => {
            const next = new Set(prev);
            // 洹몃９ ?꾩껜 ?좉?
            const groupMembers = expandGroupSelection(hit.id);
            const allIn = [...groupMembers].every((id) => next.has(id));
            if (allIn) for (const id of groupMembers) next.delete(id);
            else for (const id of groupMembers) next.add(id);
            return next;
          });
          return;
        }
        // ?⑥씪 ?대┃ ??洹몃９ ?먮룞 ?뺤옣 (?대? ?좏깮?쇱엳?대룄 洹몃９ 硫ㅻ쾭 ??긽 ?ы븿)
        const groupMembers = expandGroupSelection(hit.id);
        const allMembersSelected = [...groupMembers].every((id) => selection.has(id));
        const nextSelection = allMembersSelected ? selection : groupMembers;
        if (!allMembersSelected) setSelection(nextSelection);
        // ?꾨젅???쒕옒洹몃㈃ ?덉뿉 ???붿냼??媛숈씠 ?대룞
        const frameDescendants = new Set<string>();
        for (const el of elements) {
          if (el.type !== 'frame' || !nextSelection.has(el.id)) continue;
          for (const other of elements) {
            if (other.id === el.id || nextSelection.has(other.id)) continue;
            const cx = other.x + other.w / 2;
            const cy = other.y + other.h / 2;
            if (cx >= el.x && cx <= el.x + el.w && cy >= el.y && cy <= el.y + el.h) {
              frameDescendants.add(other.id);
            }
          }
        }
        const origin = new Map<string, { x: number; y: number }>();
        const dragIds: string[] = [];
        for (const el of elements) {
          const inSelection = nextSelection.has(el.id);
          const inFrame = frameDescendants.has(el.id);
          if ((inSelection || inFrame) && !el.locked) {
            origin.set(el.id, { x: el.x, y: el.y });
            dragIds.push(el.id);
          }
        }
        if (dragIds.length > 0) {
          setInteraction({ kind: 'dragging', ids: dragIds, startWorld: wp, origin });
        }
      } else {
        // 鍮??곸뿭 ??marquee
        setSelectedTableCell(null);
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
      setTool({ kind: 'select' });
      setEditingId(sticky.id);
      return;
    }

    if (tool === 'text') {
      const text = makeText(wp, bgColor);
      text.zIndex = nextZIndex(elements);
      addElement(board.id, text);
      setSelection(new Set([text.id]));
      setTool({ kind: 'select' });
      setEditingId(text.id);
      return;
    }

    if (tool === 'shape') {
      setInteraction({ kind: 'creating', tool: 'shape', start: wp, current: wp });
      return;
    }

    if (tool === 'frame') {
      setInteraction({ kind: 'creating', tool: 'frame', start: wp, current: wp });
      return;
    }

    if (tool === 'line') {
      const arrow = toolState.lineKind !== 'line';
      // ?쒖옉?먯씠 ?꾪삎 ?꾨㈃ binding ?꾨낫 ???
      const startBound = findBindable(elements, wp.x, wp.y);
      setInteraction({
        kind: 'drawing-line',
        arrow,
        start: wp,
        current: wp,
        startBindingId: startBound?.id,
      });
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

  // ?? pointer move ??????????????????????????
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // hover 異붿쟻 ??eraser tool ???뚮쭔 ?쒖슜 (?ㅻⅨ ?꾧뎄??cursor 留뚯쑝濡?異⑸텇)
    if (interaction.kind === 'idle' && tool === 'eraser') {
      const wp = toWorld(e.clientX, e.clientY);
      const hit = findElementAt(elements, wp.x, wp.y);
      if (hit?.id !== hoverElementId) setHoverElementId(hit?.id ?? null);
    }
    if (interaction.kind === 'idle') return;
    const wp = toWorld(e.clientX, e.clientY);

    if (interaction.kind === 'panning') {
      const rightPan = rightPanRef.current;
      if (rightPan && rightPan.pointerId === e.pointerId) {
        const distance = Math.hypot(e.clientX - rightPan.startX, e.clientY - rightPan.startY);
        if (distance > 4) rightPan.moved = true;
      }
      const dx = (e.clientX - interaction.startX) / viewport.zoom;
      const dy = (e.clientY - interaction.startY) / viewport.zoom;
      setViewport(board.id, { ...viewport, x: interaction.vx - dx, y: interaction.vy - dy });
      return;
    }

    if (interaction.kind === 'dragging') {
      let dx = wp.x - interaction.startWorld.x;
      let dy = wp.y - interaction.startWorld.y;
      // ?ㅻ쭏???ㅻ깄 ???뚭퀬 ?덈뒗 ?붿냼 ???ㅻⅨ ?붿냼 湲곗?
      // ?ㅼ쨷 ?좏깮 ??union bbox 濡???踰덉뿉 ?ㅻ깄
      if (snapEnabled && !e.altKey) {
        const draggedIds = new Set(interaction.ids);
        const targets = elements.filter((el) => draggedIds.has(el.id));
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const el of targets) {
          const org = interaction.origin.get(el.id)!;
          const x1 = org.x + dx;
          const y1 = org.y + dy;
          const x2 = x1 + el.w;
          const y2 = y1 + el.h;
          if (x1 < minX) minX = x1;
          if (y1 < minY) minY = y1;
          if (x2 > maxX) maxX = x2;
          if (y2 > maxY) maxY = y2;
        }
        const dragRect = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        const others = elements.filter((el) => !draggedIds.has(el.id));
        const snap = computeSnap(dragRect, others, viewport.zoom);
        const spacing = computeSpacingSnap(
          { ...dragRect, x: dragRect.x + snap.dx, y: dragRect.y + snap.dy },
          others,
          viewport.zoom,
        );
        dx += snap.dx + spacing.dx;
        dy += snap.dy + spacing.dy;
        setSnapGuides([...snap.guides, ...spacing.guides]);
      } else {
        setSnapGuides([]);
      }
      const next = elements.map((el) => {
        if (!interaction.ids.includes(el.id)) return el;
        const org = interaction.origin.get(el.id);
        if (!org) return el;
        return { ...el, x: org.x + dx, y: org.y + dy, updatedAt: Date.now() };
      });
      setElements(board.id, next);
      return;
    }

    if (interaction.kind === 'rotating') {
      const a = Math.atan2(wp.y - interaction.cy, wp.x - interaction.cx);
      let angle = interaction.originAngle + (a - interaction.startAngle);
      if (e.shiftKey) {
        const SNAP = Math.PI / 12;   // 15째
        angle = Math.round(angle / SNAP) * SNAP;
      }
      const next = elements.map((el) =>
        el.id === interaction.id ? { ...el, angle, updatedAt: Date.now() } : el,
      );
      setElements(board.id, next);
      return;
    }

    if (interaction.kind === 'resizing') {
      const id = interaction.ids[0];
      const org = interaction.origin.get(id);
      if (!org) return;
      if (interaction.ids.length > 1) {
        const bbox = interaction.origin.get('__bbox__');
        if (!bbox) return;
        const dx = wp.x - interaction.startWorld.x;
        const dy = wp.y - interaction.startWorld.y;
        const nextBox = resizeBoxFromHandle(bbox, interaction.handle, dx, dy, e.shiftKey, e.altKey);
        const sx = nextBox.w / Math.max(1, bbox.w);
        const sy = nextBox.h / Math.max(1, bbox.h);
        const next = elements.map((el) => {
          if (!interaction.ids.includes(el.id)) return el;
          const o = interaction.origin.get(el.id);
          if (!o) return el;
          return {
            ...el,
            x: nextBox.x + (o.x - bbox.x) * sx,
            y: nextBox.y + (o.y - bbox.y) * sy,
            w: Math.max(10, o.w * sx),
            h: Math.max(10, o.h * sy),
            updatedAt: Date.now(),
          } as WBElement;
        });
        setElements(board.id, next);
        return;
      }
      // ?뚯쟾???붿냼: dx/dy 瑜??붿냼 濡쒖뺄 醫뚰몴怨꾨줈 ??쉶??(handle ?쒕옒洹?諛⑺뼢???붿냼 異뺢낵 ?쇱튂)
      const elNow = elements.find((x) => x.id === id);
      const angle = elNow?.angle ?? 0;
      let dx = wp.x - interaction.startWorld.x;
      let dy = wp.y - interaction.startWorld.y;
      if (angle) {
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        const ldx = dx * cos - dy * sin;
        const ldy = dx * sin + dy * cos;
        dx = ldx;
        dy = ldy;
      }
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
          // 肄붾꼫 ??????鍮꾩쑉濡?留욎땄
          if (Math.abs(newW / w) > Math.abs(newH / h)) newH = newW / aspect;
          else newW = newH * aspect;
        }
      }
      if (fromCenter) {
        // 以묒떖 湲곗? ??諛섎??몃룄 媛숈씠
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

    if (interaction.kind === 'editing-line-end') {
      const endBound = findBindable(elements, wp.x, wp.y);
      const bindingId = endBound?.id;
      const snapPoint = endBound
        ? computeBindingPoint(endBound, (() => {
            const arrow = elements.find((candidate): candidate is WBArrow => candidate.id === interaction.id && candidate.type === 'arrow');
            if (!arrow || arrow.points.length < 2) return wp;
            const other = interaction.end === 'start' ? arrow.points[arrow.points.length - 1] : arrow.points[0];
            return { x: other[0], y: other[1] };
          })())
        : ([wp.x, wp.y] as [number, number]);
      const next = elements.map((el) => {
        if (el.id !== interaction.id || el.type !== 'arrow') return el;
        const points = [...el.points] as Array<[number, number]>;
        if (points.length < 2) return el;
        if (interaction.end === 'start') {
          points[0] = snapPoint;
          return {
            ...lineBBoxPatch(el, points),
            startBinding: bindingId ? { elementId: bindingId, anchor: 'center' as const } : undefined,
            updatedAt: Date.now(),
          };
        }
        points[points.length - 1] = snapPoint;
        return {
          ...lineBBoxPatch(el, points),
          endBinding: bindingId ? { elementId: bindingId, anchor: 'center' as const } : undefined,
          updatedAt: Date.now(),
        };
      });
      setInteraction({ ...interaction, current: { x: snapPoint[0], y: snapPoint[1] }, bindingId });
      setElements(board.id, next);
      return;
    }

    if (interaction.kind === 'marquee') {
      setInteraction({ ...interaction, current: wp });
      const rect = rectFromPoints(interaction.start, wp);
      const inRect = findElementsInRect(elements, rect);
      const next = new Set(interaction.baseSelection);
      for (const el of inRect) {
        // 洹몃９ 硫ㅻ쾭硫??꾩껜瑜??④퍡 (?좉릿 硫ㅻ쾭 ?ы븿 ??洹몃９ ?⑥쐞 ?좏깮)
        if (el.groupIds.length > 0) {
          const expanded = expandGroupSelection(el.id);
          for (const id of expanded) next.add(id);
        } else {
          next.add(el.id);
        }
      }
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
        // 15째 ?ㅻ깄
        const dx = wp.x - interaction.start.x;
        const dy = wp.y - interaction.start.y;
        const angle = Math.atan2(dy, dx);
        const snap = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
        const dist = Math.hypot(dx, dy);
        nx = interaction.start.x + Math.cos(snap) * dist;
        ny = interaction.start.y + Math.sin(snap) * dist;
      }
      // end binding ?꾨낫 異붿쟻 (?쒖옉??binding ?붿냼????ㅻⅨ ?붿냼留?
      const endBound = findBindable(elements, nx, ny);
      const endBindingId =
        endBound && endBound.id !== interaction.startBindingId ? endBound.id : undefined;
      const current = endBindingId && endBound
        ? (() => {
            const [x, y] = computeBindingPoint(endBound, interaction.start);
            return { x, y };
          })()
        : { x: nx, y: ny };
      setInteraction({ ...interaction, current, endBindingId });
      return;
    }

    if (interaction.kind === 'pen') {
      const last = interaction.points[interaction.points.length - 1];
      const dx = wp.x - last[0];
      const dy = wp.y - last[1];
      if (dx * dx + dy * dy < 1) return;  // ?덈Т 媛源뚯슫 ??臾댁떆
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

  // ?? pointer up ??????????????????????????
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interaction.kind === 'idle') return;

    let nextElements: WBElement[] | null = null;
    let shouldCommit = false;
    let shouldReturnToSelect = false;
    const rightPan = interaction.kind === 'panning' && rightPanRef.current?.pointerId === e.pointerId
      ? rightPanRef.current
      : null;

    if (interaction.kind === 'creating') {
      const rect = rectFromPoints(interaction.start, interaction.current);
      if (rect.w >= 2 && rect.h >= 2) {
        if (interaction.tool === 'frame') {
          const frame = makeFrame(rect, elements);
          frame.zIndex = -1000;   // frame ? ??긽 ?ㅻ줈 (?ㅻⅨ ?붿냼 ?꾩뿉 ???щ씪??
          nextElements = [...elements, frame];
          setElements(board.id, nextElements);
          setSelection(new Set([frame.id]));
          setEditingId(frame.id);
          shouldCommit = true;
          shouldReturnToSelect = true;
        } else {
          const shape = makeShape(rect, toolState, bgColor);
          if (shape) {
            shape.zIndex = nextZIndex(elements);
            nextElements = [...elements, shape];
            setElements(board.id, nextElements);
            setSelection(new Set([shape.id]));
            shouldCommit = true;
            shouldReturnToSelect = true;
          }
        }
      }
    } else if (interaction.kind === 'drawing-line') {
      const dx = interaction.current.x - interaction.start.x;
      const dy = interaction.current.y - interaction.start.y;
      if (Math.hypot(dx, dy) >= 4) {
        const line = makeLineOrArrow(interaction.start, interaction.current, interaction.arrow, toolState, bgColor);
        line.zIndex = nextZIndex(elements);
        // binding 遺??(?붿궡?쒕쭔, arrow 媛 true ??寃쎌슦)
        if (interaction.arrow && line.type === 'arrow') {
          if (interaction.startBindingId) line.startBinding = { elementId: interaction.startBindingId, anchor: 'center' };
          if (interaction.endBindingId)   line.endBinding   = { elementId: interaction.endBindingId,   anchor: 'center' };
          if (interaction.startBindingId && interaction.endBindingId && line.curve === 'straight') line.curve = 'elbow';
        }
        nextElements = [...elements, line];
        setElements(board.id, nextElements);
        setSelection(new Set([line.id]));
        shouldCommit = true;
        shouldReturnToSelect = true;
      }
    } else if (interaction.kind === 'pen') {
      if (interaction.points.length >= 2) {
        const freedraw = makeFreedraw(interaction.points, toolState, bgColor);
        freedraw.zIndex = nextZIndex(elements);
        nextElements = [...elements, freedraw];
        setElements(board.id, nextElements);
        setSelection(new Set());
        shouldCommit = true;
        shouldReturnToSelect = false;
      }
    } else if (interaction.kind === 'erasing') {
      if (interaction.ids.size > 0) {
        nextElements = elements.filter((el) => !interaction.ids.has(el.id));
        setElements(board.id, nextElements);
        shouldCommit = true;
      }
    } else if (interaction.kind === 'dragging' || interaction.kind === 'resizing' || interaction.kind === 'rotating' || interaction.kind === 'editing-line-end') {
      shouldCommit = true;
    }
    setInteraction({ kind: 'idle' });
    setSnapGuides([]);
    if (rightPan) {
      suppressNextContextMenuRef.current = true;
      rightPanRef.current = null;
      window.setTimeout(() => {
        suppressNextContextMenuRef.current = false;
      }, 120);
      if (!rightPan.moved) openContextMenuAt(e.clientX, e.clientY);
    }
    if (shouldCommit) {
      // ?꾩튂 蹂寃?????臾띠씤 ?붿궡?쒖쓽 stored points ??媛깆떊?????(undo/export ?뺥빀)
      const base = nextElements ?? getBoardData(board.id).elements;
      const synced = syncFrameChildren(syncAllBindings(base));
      if (synced !== base) {
        setElements(board.id, synced);
      }
      pushSnapshot(board.id, synced);
    }
    if (shouldReturnToSelect) {
      setTool({ kind: 'select' });
    }
  };

  // 以?而⑦듃濡??몃뱾??
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
  const zoomToFit = () => {
    if (elements.length === 0 || size.w <= 0 || size.h <= 0) {
      zoomReset();
      return;
    }
    const boxes = elements.map(rotatedAABB);
    const minX = Math.min(...boxes.map((bb) => bb.x));
    const minY = Math.min(...boxes.map((bb) => bb.y));
    const maxX = Math.max(...boxes.map((bb) => bb.x + bb.w));
    const maxY = Math.max(...boxes.map((bb) => bb.y + bb.h));
    const pad = 96;
    const contentW = Math.max(1, maxX - minX + pad * 2);
    const contentH = Math.max(1, maxY - minY + pad * 2);
    const nextZoom = clamp(Math.min(size.w / contentW, size.h / contentH), 0.1, 2);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setViewport(board.id, {
      x: cx - size.w / 2 / nextZoom,
      y: cy - size.h / 2 / nextZoom,
      zoom: nextZoom,
    });
  };
  const zoomToSelection = () => {
    const targets = elements.filter((el) => selection.has(el.id));
    if (targets.length === 0) {
      zoomToFit();
      return;
    }
    const box = unionBBox(targets);
    if (!box) return;
    const pad = 80;
    const nextZoom = clamp(Math.min(size.w / Math.max(1, box.w + pad * 2), size.h / Math.max(1, box.h + pad * 2)), 0.1, 3);
    setViewport(board.id, {
      x: box.x + box.w / 2 - size.w / 2 / nextZoom,
      y: box.y + box.h / 2 - size.h / 2 / nextZoom,
      zoom: nextZoom,
    });
  };

  const viewBox = `${viewport.x} ${viewport.y} ${(size.w || 1) / viewport.zoom} ${(size.h || 1) / viewport.zoom}`;
  const gridSize = 16;

  const cursorClass = isPanMode
    ? (interaction.kind === 'panning' ? 'cursor-grabbing' : 'cursor-grab')
    : tool === 'select' ? 'cursor-default'
    : tool === 'eraser' ? 'cursor-cell'
    : 'cursor-crosshair';

  // ?붿궡??binding ?댁냼 ??臾띠씤 ?붿냼???꾩옱 ?꾩튂 諛섏쁺
  const resolvedElements = elements.map((el) =>
    el.type === 'arrow' && (el.startBinding || el.endBinding) ? resolveArrow(el, elements) : el,
  );

  // ?뺣젹???붿냼 (zIndex ?ㅻ쫫李⑥닚 ????寃??꾩뿉 洹몃젮吏?
  const sorted = [...resolvedElements].sort((a, b) => a.zIndex - b.zIndex);

  // viewport culling ??蹂댁씠???곸뿭(+?ъ쑀 padding) ??嫄몄튇 ?붿냼留??뚮뜑
  // 100 px ?ъ쑀濡??댁쭩 諛?源뚯? ?뚮뜑 (?ㅽ겕濡??⑤┝ 諛⑹?)
  const cullPad = 100 / viewport.zoom;
  const vbX1 = viewport.x - cullPad;
  const vbY1 = viewport.y - cullPad;
  const vbX2 = viewport.x + size.w / viewport.zoom + cullPad;
  const vbY2 = viewport.y + size.h / viewport.zoom + cullPad;
  const visible = sorted.filter((el) => {
    const bb = rotatedAABB(el);
    return !(bb.x > vbX2 || bb.x + bb.w < vbX1 || bb.y > vbY2 || bb.y + bb.h < vbY1);
  });

  // 寃??留ㅼ튂 ???띿뒪?멸? ?덈뒗 ?붿냼留?
  const searchMatches = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!searchOpen || !q) return null;
    const matched = new Set<string>();
    for (const el of elements) {
      const text = elementSearchText(el);
      if (text.toLowerCase().includes(q)) matched.add(el.id);
    }
    return matched;
  })();
  const focusSearchMatch = (targetId: string) => {
    const el = elements.find((x) => x.id === targetId);
    if (!el) return;
    focusElement(el);
    setSelection(new Set([targetId]));
  };
  const focusElement = (el: WBElement) => {
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    setViewport(board.id, {
      zoom: viewport.zoom,
      x: cx - size.w / 2 / viewport.zoom,
      y: cy - size.h / 2 / viewport.zoom,
    });
  };
  const selectedElements = elements.filter((el) => selection.has(el.id));
  const selectionScreenBottom = selectedElements.length > 0
    ? Math.max(...selectedElements.map((el) => {
        const bb = rotatedAABB(el);
        return (bb.y + bb.h - viewport.y) * viewport.zoom;
      }))
    : 0;
  const contextualPanelPlacement: 'top' | 'bottom' =
    selectionScreenBottom > size.h - 152 ? 'top' : 'bottom';

  // 洹몃━??以??꾩떆 ?붿냼
  const ghost = renderGhost(interaction, toolState, elements, bgColor);

  return (
    <>
      <div
        ref={containerRef}
        className={cn('absolute inset-0 select-none', cursorClass)}
        style={{
          background:
            bgColor === 'white' ? 'white'
            : bgColor === 'dark' ? 'hsl(220 10% 14%)'
            : undefined,  // cream = 湲곕낯 bg-background
        }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => {
          // ?붾툝?대┃?쇰줈 ?몄쭛 媛?ν븳 ?붿냼 吏꾩엯 (sticky/text/?꾪삎/frame)
          if (editingId) return;
          const wp = toWorld(e.clientX, e.clientY);
          const hit = findElementAt(elements, wp.x, wp.y, { includeLocked: true });
          if (!hit) return;
          if (hit.locked) {
            e.preventDefault();
            setSelection(new Set([hit.id]));
            return;
          }
          if (hit.type === 'table') {
            const cellIndex = hitTableCell(hit, worldToElementLocal(wp, hit));
            if (cellIndex != null) {
              e.preventDefault();
              setSelection(new Set([hit.id]));
              setSelectedTableCell({ tableId: hit.id, index: cellIndex });
              setEditingId(null);
              setEditingTableCell({ tableId: hit.id, index: cellIndex });
            }
            return;
          }
          if (hit.type === 'sticky' || hit.type === 'text' || hit.type === 'arrow' ||
              isTextShape(hit) || hit.type === 'frame') {
            e.preventDefault();
            setSelection(new Set([hit.id]));
            setEditingId(hit.id);
          }
        }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={(e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files);
          if (files.length === 0) return;
          const wp = toWorld(e.clientX, e.clientY);
          let offset = 0;
          for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            void insertImageAt(file, { x: wp.x + offset, y: wp.y + offset });
            offset += 24;
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (suppressNextContextMenuRef.current) return;
          openContextMenuAt(e.clientX, e.clientY);
        }}
      >
        <svg
          ref={svgRef}
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
              <circle cx={1} cy={1} r={0.8} fill={bgColor === 'dark' ? 'hsl(0 0% 100% / 0.10)' : 'hsl(var(--foreground) / 0.10)'} />
            </pattern>
            <pattern
              id="wb-linegrid"
              x={0}
              y={0}
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke={bgColor === 'dark' ? 'hsl(0 0% 100% / 0.06)' : 'hsl(var(--foreground) / 0.06)'} strokeWidth="0.6" />
            </pattern>
          </defs>
          {size.w > 0 && gridType !== 'none' && (
            <rect
              x={viewport.x}
              y={viewport.y}
              width={size.w / viewport.zoom}
              height={size.h / viewport.zoom}
              fill={`url(#wb-${gridType}grid)`}
            />
          )}
          {/* ?붿냼 ?덉씠????viewport culling */}
          {visible.map((el) => {
            const erasing = interaction.kind === 'erasing' && interaction.ids.has(el.id);
            const hoverErase = tool === 'eraser' && interaction.kind === 'idle' && hoverElementId === el.id;
            const dim = searchMatches && !searchMatches.has(el.id);
            return (
              <g
                key={el.id}
                opacity={erasing ? 0.3 : hoverErase ? 0.5 : dim ? 0.18 : 1}
                data-wb-element-id={el.id}
              >
                <WBElementRenderer el={el} />
              </g>
            );
          })}
          {selectedTableCell && !editingTableCell && (() => {
            const table = elements.find((el): el is WBTable => el.id === selectedTableCell.tableId && el.type === 'table');
            const cell = table ? getTableCellRect(table, selectedTableCell.index) : null;
            if (!table || !cell || !selection.has(table.id)) return null;
            const cx = table.x + table.w / 2;
            const cy = table.y + table.h / 2;
            const tr = table.angle ? `rotate(${(table.angle * 180) / Math.PI} ${cx} ${cy})` : undefined;
            return (
              <rect
                data-wb-aux="true"
                transform={tr}
                x={cell.x + 1.5 / viewport.zoom}
                y={cell.y + 1.5 / viewport.zoom}
                width={Math.max(1, cell.w - 3 / viewport.zoom)}
                height={Math.max(1, cell.h - 3 / viewport.zoom)}
                rx={4 / viewport.zoom}
                fill="hsl(217 91% 55% / 0.08)"
                stroke="hsl(217 91% 55%)"
                strokeWidth={1.6 / viewport.zoom}
                pointerEvents="none"
              />
            );
          })()}
          {/* eraser hover preview ??鍮④컙 outline */}
          {tool === 'eraser' && interaction.kind === 'idle' && hoverElementId && (() => {
            const el = elements.find((x) => x.id === hoverElementId);
            if (!el) return null;
            const cx = el.x + el.w / 2;
            const cy = el.y + el.h / 2;
            const tr = el.angle ? `rotate(${(el.angle * 180) / Math.PI} ${cx} ${cy})` : undefined;
            return (
              <rect
                data-wb-aux="true"
                transform={tr}
                x={el.x - 2 / viewport.zoom}
                y={el.y - 2 / viewport.zoom}
                width={el.w + 4 / viewport.zoom}
                height={el.h + 4 / viewport.zoom}
                fill="none"
                stroke="hsl(0 72% 51%)"
                strokeWidth={2 / viewport.zoom}
                strokeDasharray={`${3 / viewport.zoom} ${3 / viewport.zoom}`}
                pointerEvents="none"
              />
            );
          })()}
          {/* ?좉릿 ?붿냼 ???곗긽???먮Ъ??諛곗? */}
          {visible.filter((el) => el.locked).map((el) => {
            const SZ = 14 / viewport.zoom;
            const cx = el.x + el.w / 2;
            const cy = el.y + el.h / 2;
            const tr = el.angle ? `rotate(${(el.angle * 180) / Math.PI} ${cx} ${cy})` : undefined;
            return (
              <g key={`lock-${el.id}`} transform={tr} pointerEvents="none" data-wb-aux="true">
                <circle
                  cx={el.x + el.w - SZ / 2 - 4 / viewport.zoom}
                  cy={el.y + SZ / 2 + 4 / viewport.zoom}
                  r={SZ / 2 + 2 / viewport.zoom}
                  fill="hsl(var(--card))"
                  stroke="hsl(var(--hairline))"
                  strokeWidth={1 / viewport.zoom}
                />
                <g
                  transform={`translate(${el.x + el.w - SZ - 4 / viewport.zoom} ${el.y + 4 / viewport.zoom}) scale(${SZ / 24})`}
                  fill="none"
                  stroke="hsl(38 92% 50%)"
                  strokeWidth={2.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </g>
              </g>
            );
          })}
          {/* 寃??留ㅼ튂 媛뺤“ outline ???꾩옱 留ㅼ튂??吏꾪븯寃? ?섎㉧吏???낃쾶 */}
          {searchMatches && [...searchMatches].map((id, idx) => {
            const el = elements.find((x) => x.id === id);
            if (!el) return null;
            const mcx = el.x + el.w / 2;
            const mcy = el.y + el.h / 2;
            const mtransform = el.angle ? `rotate(${(el.angle * 180) / Math.PI} ${mcx} ${mcy})` : undefined;
            const isCurrent = idx === searchIndex;
            return (
              <rect
                data-wb-aux="true"
                key={`match-${id}`}
                transform={mtransform}
                x={el.x - 6 / viewport.zoom}
                y={el.y - 6 / viewport.zoom}
                width={el.w + 12 / viewport.zoom}
                height={el.h + 12 / viewport.zoom}
                fill="none"
                stroke={isCurrent ? 'hsl(38 92% 50%)' : 'hsl(38 92% 50% / 0.45)'}
                strokeWidth={(isCurrent ? 2.5 : 1.5) / viewport.zoom}
                rx={4 / viewport.zoom}
                pointerEvents="none"
              />
            );
          })}
          {/* ?좏깮 ?쒖떆 + ?⑥씪 ?좏깮 ???몃뱾 (?뚯쟾???붿냼硫?transform ?곸슜) */}
          {[...selection].map((id) => {
            const el = elements.find((x) => x.id === id);
            if (!el) return null;
            if (editingId === id) return null;
            const bb = elementBBox(el);
            const showHandles = !el.locked && selection.size === 1 && tool === 'select' && el.type !== 'line' && el.type !== 'arrow' && el.type !== 'freedraw';
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
            const cx = bb.x + bb.w / 2;
            const cy = bb.y + bb.h / 2;
            const transform = el.angle ? `rotate(${(el.angle * 180) / Math.PI} ${cx} ${cy})` : undefined;
            return (
              <g key={`sel-${id}`} pointerEvents="none" transform={transform} data-wb-aux="true">
                <rect
                  x={bb.x - 4 / viewport.zoom}
                  y={bb.y - 4 / viewport.zoom}
                  width={bb.w + 8 / viewport.zoom}
                  height={bb.h + 8 / viewport.zoom}
                  fill="none"
                  stroke="hsl(217 91% 55%)"
                  strokeWidth={1.25 / viewport.zoom}
                  rx={6 / viewport.zoom}
                />
                {showHandles && points.map((p) => {
                  const cur: Record<ResizeHandle, string> = {
                    nw: 'nwse-resize', se: 'nwse-resize',
                    ne: 'nesw-resize', sw: 'nesw-resize',
                    n: 'ns-resize', s: 'ns-resize',
                    e: 'ew-resize', w: 'ew-resize',
                  };
                  return (
                    <rect
                      key={p.key}
                      x={p.cx - HANDLE/2}
                      y={p.cy - HANDLE/2}
                      width={HANDLE}
                      height={HANDLE}
                      rx={2 / viewport.zoom}
                      fill="white"
                      stroke="hsl(217 91% 55%)"
                      strokeWidth={1.25 / viewport.zoom}
                      style={{ cursor: cur[p.key], pointerEvents: 'auto' }}
                    />
                  );
                })}
                {/* ?뚯쟾 ?몃뱾 ???곷떒 以묒븰 ??*/}
                {showHandles && isRotatable(el) && (() => {
                  const rotX = bb.x + bb.w / 2;
                  const rotY = bb.y - 24 / viewport.zoom;
                  return (
                    <g>
                      <line
                        x1={bb.x + bb.w / 2}
                        y1={bb.y}
                        x2={rotX}
                        y2={rotY}
                        stroke="hsl(217 91% 55%)"
                        strokeWidth={1 / viewport.zoom}
                      />
                      <circle
                        cx={rotX}
                        cy={rotY}
                        r={HANDLE * 0.55}
                        fill="white"
                        stroke="hsl(217 91% 55%)"
                        strokeWidth={1.25 / viewport.zoom}
                        style={{ cursor: 'grab', pointerEvents: 'auto' }}
                      />
                    </g>
                  );
                })()}
              </g>
            );
          })}
          {selection.size === 1 && !editingId && !editingTableCell && (() => {
            const el = elements.find((x) => x.id === [...selection][0]);
            if (!el || el.locked || !isBindableElement(el) || tool !== 'select') return null;
            const sides: Array<'right' | 'bottom' | 'left' | 'top'> = ['right', 'bottom', 'left', 'top'];
            const r = 10 / viewport.zoom;
            return (
              <g data-wb-aux="true">
                {sides.map((side) => {
                  const p = sidePoint(el, side);
                  const quickOffset = (side === 'top' ? 56 : 32) / viewport.zoom;
                  const plus = offsetPoint(p, side, quickOffset);
                  return (
                    <g key={`quick-${side}`}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={5 / viewport.zoom}
                        fill="white"
                        stroke="hsl(217 91% 55%)"
                        strokeWidth={1.5 / viewport.zoom}
                        style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
                        onPointerDown={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          setInteraction({ kind: 'drawing-line', arrow: true, start: p, current: p, startBindingId: el.id });
                        }}
                      />
                      <g
                        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                        onPointerDown={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          createLinkedSticky(el, side);
                        }}
                      >
                        <circle cx={plus.x} cy={plus.y} r={r} fill="hsl(var(--card))" stroke="hsl(217 91% 55%)" strokeWidth={1.5 / viewport.zoom} />
                        <line x1={plus.x - r * 0.45} y1={plus.y} x2={plus.x + r * 0.45} y2={plus.y} stroke="hsl(217 91% 55%)" strokeWidth={1.6 / viewport.zoom} />
                        <line x1={plus.x} y1={plus.y - r * 0.45} x2={plus.x} y2={plus.y + r * 0.45} stroke="hsl(217 91% 55%)" strokeWidth={1.6 / viewport.zoom} />
                      </g>
                    </g>
                  );
                })}
              </g>
            );
          })()}
          {selection.size > 1 && !editingId && !editingTableCell && tool === 'select' && (() => {
            const box = unionBBox(elements.filter((el) => selection.has(el.id) && !el.locked));
            if (!box) return null;
            const HANDLE = 8 / viewport.zoom;
            const points: Array<{ key: ResizeHandle; cx: number; cy: number }> = [
              { key: 'nw', cx: box.x, cy: box.y },
              { key: 'n', cx: box.x + box.w / 2, cy: box.y },
              { key: 'ne', cx: box.x + box.w, cy: box.y },
              { key: 'e', cx: box.x + box.w, cy: box.y + box.h / 2 },
              { key: 'se', cx: box.x + box.w, cy: box.y + box.h },
              { key: 's', cx: box.x + box.w / 2, cy: box.y + box.h },
              { key: 'sw', cx: box.x, cy: box.y + box.h },
              { key: 'w', cx: box.x, cy: box.y + box.h / 2 },
            ];
            return (
              <g data-wb-aux="true" pointerEvents="none">
                <rect
                  x={box.x - 5 / viewport.zoom}
                  y={box.y - 5 / viewport.zoom}
                  width={box.w + 10 / viewport.zoom}
                  height={box.h + 10 / viewport.zoom}
                  fill="none"
                  stroke="hsl(217 91% 55%)"
                  strokeWidth={1.25 / viewport.zoom}
                />
                {points.map((p) => (
                  <rect
                    key={`multi-${p.key}`}
                    x={p.cx - HANDLE / 2}
                    y={p.cy - HANDLE / 2}
                    width={HANDLE}
                    height={HANDLE}
                    rx={2 / viewport.zoom}
                    fill="white"
                    stroke="hsl(217 91% 55%)"
                    strokeWidth={1.25 / viewport.zoom}
                  />
                ))}
              </g>
            );
          })()}
          {selection.size === 1 && !editingId && !editingTableCell && (() => {
            const el = elements.find((x) => x.id === [...selection][0]);
            if (!el || el.type !== 'arrow' || tool !== 'select') return null;
            const first = el.points[0];
            const last = el.points[el.points.length - 1];
            return (
              <g data-wb-aux="true">
                {([
                  ['start', first] as const,
                  ['end', last] as const,
                ]).map(([end, p]) => (
                  <circle
                    key={`arrow-end-${end}`}
                    cx={p[0]}
                    cy={p[1]}
                    r={7 / viewport.zoom}
                    fill="white"
                    stroke="hsl(217 91% 55%)"
                    strokeWidth={1.5 / viewport.zoom}
                    style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
                    onPointerDown={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      setInteraction({ kind: 'editing-line-end', id: el.id, end, current: { x: p[0], y: p[1] } });
                    }}
                  />
                ))}
              </g>
            );
          })()}
          {/* marquee */}
          {interaction.kind === 'marquee' && (() => {
            const r = rectFromPoints(interaction.start, interaction.current);
            return (
              <rect
                data-wb-aux="true"
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
          {/* 洹몃━??以?ghost */}
          {ghost}
          {/* binding ?꾨낫 媛뺤“ ???붿궡??洹몃━??以?*/}
          {(interaction.kind === 'drawing-line' || interaction.kind === 'editing-line-end') && (() => {
            const ids = interaction.kind === 'drawing-line'
              ? [interaction.startBindingId, interaction.endBindingId].filter(Boolean) as string[]
              : [interaction.bindingId].filter(Boolean) as string[];
            if (ids.length === 0) return null;
            return ids.map((id) => {
              const el = elements.find((x) => x.id === id);
              if (!el) return null;
              const ccx = el.x + el.w / 2;
              const ccy = el.y + el.h / 2;
              const ctransform = el.angle ? `rotate(${(el.angle * 180) / Math.PI} ${ccx} ${ccy})` : undefined;
              return (
                <rect
                  data-wb-aux="true"
                  key={`bind-cand-${id}`}
                  transform={ctransform}
                  x={el.x - 2 / viewport.zoom}
                  y={el.y - 2 / viewport.zoom}
                  width={el.w + 4 / viewport.zoom}
                  height={el.h + 4 / viewport.zoom}
                  rx={4 / viewport.zoom}
                  fill="hsl(217 91% 55% / 0.08)"
                  stroke="hsl(217 91% 55%)"
                  strokeWidth={2 / viewport.zoom}
                  strokeDasharray={`${4 / viewport.zoom} ${3 / viewport.zoom}`}
                  pointerEvents="none"
                />
              );
            });
          })()}
          {/* ?ㅻ쭏???뺣젹 媛?대뱶 */}
          {snapGuides.map((g, i) => (
            <line
              data-wb-aux="true"
              key={i}
              x1={g.axis === 'v' ? g.pos : g.from}
              y1={g.axis === 'v' ? g.from : g.pos}
              x2={g.axis === 'v' ? g.pos : g.to}
              y2={g.axis === 'v' ? g.to : g.pos}
              stroke="hsl(330 80% 60%)"
              strokeWidth={1 / viewport.zoom}
              strokeDasharray={`${3 / viewport.zoom} ${3 / viewport.zoom}`}
              pointerEvents="none"
            />
          ))}
        </svg>

        {/* ?몃씪???몄쭛 (HTML ?덉씠?대줈 SVG ?꾩뿉) */}
        {editingId && (() => {
          const el = elements.find((x) => x.id === editingId);
          if (!el) return null;
          return (
            <InlineEditor
              key={editingId}
              element={el}
              viewport={viewport}
              container={containerRef.current}
              onCommit={(content, layout) => {
                if (el.type === 'sticky' || el.type === 'text') {
                  if (el.type === 'sticky') {
                    updateElement(board.id, el.id, {
                      content,
                      ...(layout ? layout : {}),
                    } as Partial<WBElement>);
                  } else if (content.trim()) {
                    updateElement(board.id, el.id, {
                      content,
                      ...(layout ? layout : {}),
                    } as Partial<WBElement>);
                  } else {
                    removeElements(board.id, [el.id]);
                    setSelection(new Set());
                  }
                } else if (el.type === 'frame') {
                  updateElement(board.id, el.id, { name: content.trim() || '프레임' });
                } else if (el.type === 'arrow') {
                  updateElement(board.id, el.id, { label: content.trim() || undefined });
                } else {
                  updateElement(board.id, el.id, { text: content });
                }
                setEditingId(null);
                // ?ㅼ쓬 tick ??store ??理쒖떊 elements 濡?history commit
                setTimeout(() => pushSnapshot(board.id, getBoardData(board.id).elements), 0);
              }}
              onCommitNext={(content, layout) => {
                if (el.type !== 'sticky') return;
                updateElement(board.id, el.id, {
                  content,
                  ...(layout ? layout : {}),
                } as Partial<WBElement>);
                const sticky = makeSticky({ x: el.x + el.w + 18, y: el.y }, toolState);
                sticky.zIndex = nextZIndex(elements);
                const merged = [...getBoardData(board.id).elements, sticky];
                setElements(board.id, merged);
                setSelection(new Set([sticky.id]));
                setEditingId(sticky.id);
                setTimeout(() => pushSnapshot(board.id, getBoardData(board.id).elements), 0);
              }}
              onCancel={() => setEditingId(null)}
            />
          );
        })()}
        {editingTableCell && (() => {
          const table = elements.find((x): x is WBTable => x.id === editingTableCell.tableId && x.type === 'table');
          if (!table) return null;
          return (
            <TableCellEditor
              key={`${editingTableCell.tableId}:${editingTableCell.index}`}
              table={table}
              cellIndex={editingTableCell.index}
              viewport={viewport}
              container={containerRef.current}
              onCommit={(value, nextIndex) => {
                updateElement(board.id, table.id, {
                  cells: updateTableCell(table, editingTableCell.index, value),
                } as Partial<WBElement>);
                setTimeout(() => pushSnapshot(board.id, getBoardData(board.id).elements), 0);
                if (typeof nextIndex === 'number' && nextIndex >= 0 && nextIndex < table.rows * table.cols) {
                  setSelectedTableCell({ tableId: table.id, index: nextIndex });
                  setEditingTableCell({ tableId: table.id, index: nextIndex });
                } else {
                  setSelectedTableCell({ tableId: table.id, index: editingTableCell.index });
                  setEditingTableCell(null);
                }
              }}
              onCancel={() => setEditingTableCell(null)}
            />
          );
        })()}
      </div>

      {/* ?뚮줈??UI ??Tab ?쇰줈 ?좉? (紐곗엯 紐⑤뱶) */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-200',
          immersive ? 'opacity-0' : 'opacity-100',
        )}
        aria-hidden={immersive}
      >
        <div className="pointer-events-auto contents">
          {/* 醫뚯긽 ??蹂대뱶 ?ㅻ뜑 */}
          <BoardHeader
            board={board}
            selectedCount={selection.size}
            onImport={() => importInputRef.current?.click()}
            onOpenTemplates={() => setTemplateGalleryOpen(true)}
            onExport={(format) => {
              const svg = svgRef.current;
              if (!svg) return;
              const data = getBoardData(board.id);
              const selectedIds = selection.size > 0 ? new Set(selection) : undefined;
              const exportName = selectedIds ? `${board.name}-selection` : board.name;
              if (format === 'png') {
                exportPNG(svg, data.elements, exportName, selectedIds).then(() => {
                  notify.success('PNG 내보냈어요', { duration: 1500 });
                }).catch(() => notify.error('PNG 내보내기 실패'));
              } else if (format === 'svg') {
                exportSVG(svg, data.elements, exportName, selectedIds).then(() => {
                  notify.success('SVG 내보냈어요', { duration: 1500 });
                }).catch(() => notify.error('SVG 내보내기 실패'));
              } else {
                exportJSON(data, board.name);
                notify.success('JSON 내보냈어요', { duration: 1500 });
              }
            }}
          />
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = '';
              if (file) void handleImportJSON(file);
            }}
          />
          {showStarterTip && elements.length > 1 && !editingId && !editingTableCell && !immersive && (
            <div className="absolute left-4 top-16 z-20 max-w-[360px]">
              <FloatingCard className="px-3 py-2.5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">처음이라면 이렇게 시작해보세요</p>
                    <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                      스티키는 한 번 클릭하면 메모를 만들고, 도형은 드래그해서 그릴 수 있어요. Space를 누른 채 끌면 화면이 이동합니다.
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => createStickyAt({ x: viewport.x + 120, y: viewport.y + 120 })}
                        className="h-8 px-2 rounded-md bg-primary/10 text-primary text-[12px] font-medium hover:bg-primary/15 transition-colors"
                      >
                        스티키 만들기
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateGalleryOpen(true)}
                        className="h-8 px-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground text-[12px] font-medium transition-colors"
                      >
                        템플릿 열기
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStarterTip(false);
                      window.localStorage.setItem('wb:starter-tip-dismissed:v1', '1');
                    }}
                    className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    aria-label="시작 안내 닫기"
                    title="닫기"
                  >
                    X
                  </button>
                </div>
              </FloatingCard>
            </div>
          )}

          {elements.length === 0 && !editingId && !editingTableCell && (
            <EmptyBoardLauncher
              onSticky={() => createStickyAt()}
              onText={() => createBlankTextAt()}
              onTemplates={() => setTemplateGalleryOpen(true)}
              onTemplate={(kind) => applyTemplate(kind)}
            />
          )}

          {templateGalleryOpen && (
            <TemplateGallery
              onClose={() => setTemplateGalleryOpen(false)}
              onApply={(kind) => {
                applyTemplate(kind);
                setTemplateGalleryOpen(false);
              }}
            />
          )}

          {/* ?곗긽 ??PageSwitcher */}

          {/* ?곷떒 媛?대뜲 ??寃??(Ctrl+F) */}
          {searchOpen && (
            <SearchBar
              query={searchQuery}
              matchCount={searchMatches?.size ?? 0}
              currentIndex={searchIndex}
              onChange={(v) => {
                setSearchQuery(v);
                setSearchIndex(0);
                const q = v.trim().toLowerCase();
                if (!q) return;
                const first = elements.find((el) => {
                  const text = elementSearchText(el);
                  return text.toLowerCase().includes(q);
                });
                if (first) focusSearchMatch(first.id);
              }}
              onClose={() => { setSearchOpen(false); setSearchQuery(''); setSearchIndex(0); }}
              onJump={(dir) => {
                if (!searchMatches || searchMatches.size === 0) return;
                const matchIds = [...searchMatches];
                let next = searchIndex;
                if (dir === 'next') next = (searchIndex + 1) % matchIds.length;
                else if (dir === 'prev') next = (searchIndex - 1 + matchIds.length) % matchIds.length;
                setSearchIndex(next);
                const targetId = matchIds[next];
                focusSearchMatch(targetId);
              }}
            />
          )}

          {/* 醫뚯륫 ?몃줈 ???꾧뎄 ?붾젅??*/}
          <ToolPalette
            active={tool}
            onAddContent={createContentInsert}
            onOpenTemplates={() => setTemplateGalleryOpen(true)}
          />

          <div className="absolute right-4 top-16 flex flex-col gap-2">
            <FloatingCard className="flex items-center gap-1 px-1 h-10">
              <button
                type="button"
                onClick={() => setOutlineOpen((v) => !v)}
                className={cn('w-9 h-9 rounded-md flex items-center justify-center transition-colors', outlineOpen ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}
                title="개요"
                aria-label="개요"
              >
                <ListTree className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => setSnapEnabled((v) => !v)}
                className={cn('w-9 h-9 rounded-md flex items-center justify-center transition-colors', snapEnabled ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}
                title={snapEnabled ? '스냅 켜짐' : '스냅 꺼짐'}
                aria-label="스냅 토글"
              >
                <Magnet className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => setMinimapOpen((v) => !v)}
                className={cn('w-9 h-9 rounded-md flex items-center justify-center transition-colors', minimapOpen ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}
                title={minimapOpen ? '미니맵 켜짐' : '미니맵 꺼짐'}
                aria-label="미니맵 토글"
              >
                <MapIcon className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => setImmersive(true)}
                className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="집중 모드"
                aria-label="집중 모드"
              >
                <Focus className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => stepPresentation(1)}
                disabled={frames.length === 0}
                className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30"
                title="프레임 발표"
                aria-label="프레임 발표"
              >
                <Presentation className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </FloatingCard>
            {outlineOpen && (
              <OutlinePanel
                elements={elements}
                selected={selection}
                onSelect={(id) => {
                  const el = elements.find((x) => x.id === id);
                  if (!el) return;
                  setSelection(new Set([id]));
                  if (el.type === 'frame') jumpToFrame(el);
                  else focusElement(el);
                }}
              />
            )}
          </div>

          {/* ContextualPanel ???좏깮 ???깆옣 */}
          {selection.size > 0 && !editingId && !editingTableCell && (
            <ContextualPanel
              boardId={board.id}
              elements={elements}
              selection={selection}
              selectedTableCell={selectedTableCell}
              placement={contextualPanelPlacement}
              onSelectTableCell={setSelectedTableCell}
              onClearSelection={() => setSelection(new Set())}
              onChangeZ={changeZOrder}
              onDuplicate={duplicateSelected}
              onFrameSelection={createFrameAroundSelection}
              onRenameFrame={(id) => setEditingId(id)}
              onFocusFrame={(frame) => jumpToFrame(frame)}
              onAlign={(mode) => {
                const next = syncAllBindings(alignElements(elements, selection, mode));
                setElements(board.id, next);
                pushSnapshot(board.id, next);
              }}
              onDistribute={(mode) => {
                const next = syncAllBindings(distributeElements(elements, selection, mode));
                setElements(board.id, next);
                pushSnapshot(board.id, next);
              }}
              onGroup={doGroup}
              onUngroup={doUngroup}
              onDelete={() => deleteElementsWithUndo(selection)}
            />
          )}

          {/* ?고븯 (?? ??誘몃땲留?*/}
          {minimapOpen && (
            <MiniMap
              elements={elements}
              viewport={viewport}
              containerSize={size}
              onJump={(wp) => {
                setViewport(board.id, {
                  ...viewport,
                  x: wp.x - size.w / 2 / viewport.zoom,
                  y: wp.y - size.h / 2 / viewport.zoom,
                });
              }}
            />
          )}

          {frames.length > 0 && presentationIndex != null && (
            <FramePresentationBar
              index={presentationIndex}
              count={frames.length}
              raised={selection.size > 0 && !editingId && !editingTableCell && contextualPanelPlacement === 'bottom'}
              onPrev={() => stepPresentation(-1)}
              onNext={() => stepPresentation(1)}
              onClose={() => setPresentationIndex(null)}
            />
          )}

          {/* 醫뚰븯 ??以?而⑦듃濡?*/}
          <div className="absolute left-4 bottom-4">
            <FloatingCard className="flex items-center gap-1 px-1 h-10">
              <ZoomBtn icon={ZoomOut} label="축소" onClick={() => zoomBy(1 / 1.2)} />
              <span
                className="px-2 text-[11.5px] font-medium tabular-nums text-foreground/80 min-w-[44px] text-center cursor-pointer"
                onClick={zoomReset}
                title="100%로 리셋"
              >
                {Math.round(viewport.zoom * 100)}%
              </span>
              <ZoomBtn icon={ZoomIn} label="확대" onClick={() => zoomBy(1.2)} />
              <div className="w-px h-4 bg-[hsl(var(--hairline))] mx-1" aria-hidden />
              {selection.size > 0 && (
                <ZoomBtn icon={MousePointer2} label="선택 보기" onClick={zoomToSelection} />
              )}
              <ZoomBtn icon={Maximize2} label="전체 보기" onClick={zoomToFit} />
            </FloatingCard>
          </div>

          {/* ?고븯 ???꾩?留?*/}
          <HelpFloating />

          {/* ?고븯 ?곹깭 ??undo/redo */}
          <div className="absolute right-16 bottom-4 flex items-center gap-1">
            <FloatingCard className="flex items-center gap-1 px-1 h-10">
              <UndoBtn enabled={canUndo(board.id)} onClick={doUndo} />
              <RedoBtn enabled={canRedo(board.id)} onClick={doRedo} />
            </FloatingCard>
          </div>
        </div>
      </div>

      {/* 紐곗엯 紐⑤뱶 ?덈궡 (Tab ?쒖떆) */}
      {immersive && (
        <button
          type="button"
          onClick={() => setImmersive(false)}
          className="absolute right-4 top-4 text-[11px] text-muted-foreground/60 hover:text-foreground/80 bg-card/70 backdrop-blur-sm px-2 py-1 rounded transition-colors"
          title="Tab으로 UI 다시 보기"
        >
          Tab으로 UI 켜기
        </button>
      )}

      {/* ?고겢由?而⑦뀓?ㅽ듃 硫붾돱 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.clientX}
          y={contextMenu.clientY}
          ids={contextMenu.ids}
          boardId={board.id}
          elements={elements}
          onClose={() => setContextMenu(null)}
          onDuplicate={() => { duplicateSelected(); setContextMenu(null); }}
          onCopy={() => { copySelected(); setContextMenu(null); }}
          onPaste={() => { pasteClipboard(); setContextMenu(null); }}
          onCut={() => {
            copySelected();
            deleteElementsWithUndo(contextMenu.ids);
            setContextMenu(null);
          }}
          onSelectAll={() => {
            setSelection(new Set(elements.filter((el) => !el.locked).map((el) => el.id)));
            setContextMenu(null);
          }}
          onAddSticky={() => {
            createStickyAt(contextMenu.world);
            setContextMenu(null);
          }}
          onAddText={() => {
            createBlankTextAt(contextMenu.world);
            setContextMenu(null);
          }}
          onOpenTemplates={() => {
            setTemplateGalleryOpen(true);
            setContextMenu(null);
          }}
          onFitView={() => {
            zoomToFit();
            setContextMenu(null);
          }}
          onChangeZ={(mode) => { changeZOrder(mode); setContextMenu(null); }}
          onToggleLock={() => {
            const next = elements.map((el) =>
              contextMenu.ids.includes(el.id) ? { ...el, locked: !el.locked, updatedAt: Date.now() } : el,
            );
            setElements(board.id, next);
            pushSnapshot(board.id, next);
            setContextMenu(null);
          }}
          onDelete={() => {
            deleteElementsWithUndo(contextMenu.ids);
            setContextMenu(null);
          }}
        />
      )}
    </>
  );
}

// ??????????????????????????????????????????
function BoardHeader({
  board,
  selectedCount,
  onExport,
  onImport,
  onOpenTemplates,
}: {
  board: WBBoard;
  selectedCount: number;
  onExport: (format: 'png' | 'svg' | 'json') => void;
  onImport: () => void;
  onOpenTemplates: () => void;
}) {
  const settings = useSettings();
  const saveState = useSaveState(board.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(board.name);
  useEffect(() => { setDraft(board.name); }, [board.name]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== board.name) renameBoard(board.id, draft);
  };

  return (
    <div className="absolute left-4 top-4">
      <FloatingCard className="flex items-center gap-1 px-2 h-10">
        <button
          type="button"
          onClick={() => setActiveBoardId(null)}
          className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="보드 목록"
          aria-label="보드 목록"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
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
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">배경/그리드</div>
            <div className="flex items-center gap-1 px-2 pb-1.5">
              {(['cream', 'white', 'dark'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setBoardBgColor(c);
                    if (c === 'dark') setTool({ strokeColor: 'amber', penColor: 'amber' });
                  }}
                  className={cn(
                    'flex-1 h-7 rounded border-2 transition-colors',
                    settings.bgColor === c ? 'border-primary' : 'border-transparent hover:border-foreground/20',
                  )}
                  style={{
                    background: c === 'white' ? 'white' : c === 'dark' ? 'hsl(220 10% 14%)' : 'hsl(40 25% 97%)',
                  }}
                  title={c}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 px-2 pb-1.5">
              {(['dot', 'line', 'none'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setBoardGridType(g)}
                  className={cn(
                    'flex-1 h-7 rounded text-[11px] font-medium transition-colors',
                    settings.gridType === g ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {g === 'dot' ? '도트' : g === 'line' ? '격자' : '없음'}
                </button>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onImport}>
              <Upload className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
              JSON 가져오기
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onExport('png')}>
              <ArrowLeft className="w-3.5 h-3.5 mr-2 rotate-180" strokeWidth={1.75} />
              PNG로 내보내기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('svg')}>
              <ArrowLeft className="w-3.5 h-3.5 mr-2 rotate-180" strokeWidth={1.75} />
              SVG로 내보내기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('json')}>
              <ArrowLeft className="w-3.5 h-3.5 mr-2 rotate-180" strokeWidth={1.75} />
              JSON 백업
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
        <button
          type="button"
          onClick={onOpenTemplates}
          className="inline-flex h-8 items-center gap-1.5 px-2 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="템플릿"
        >
          <LayoutTemplate className="w-3.5 h-3.5" strokeWidth={1.75} />
          템플릿
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-8 px-2 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="내보내기"
            >
              내보내기
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem onClick={() => onExport('png')}>PNG 이미지{selectedCount > 0 ? ' (선택)' : ''}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('svg')}>SVG 벡터{selectedCount > 0 ? ' (선택)' : ''}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('json')}>JSON 백업</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onImport}>JSON 가져오기</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10.5px] pl-1 transition-colors',
            saveState === 'error'
              ? 'text-destructive'
              : saveState === 'saving'
                ? 'text-amber-500 dark:text-amber-400'
                : 'text-muted-foreground/80',
          )}
          title={saveState === 'error' ? '저장 실패' : saveState === 'saving' ? '저장 중' : '저장됨'}
        >
          <Save className={cn('w-3 h-3', saveState === 'saving' && 'animate-pulse')} strokeWidth={1.75} />
          {saveState === 'error' ? '실패' : saveState === 'saving' ? '저장 중' : '저장됨'}
        </span>
      </FloatingCard>
    </div>
  );
}

// ??????????????????????????????????????????
function AddContentMenu({
  compact = false,
  onAddContent,
  onOpenTemplates,
}: {
  compact?: boolean;
  onAddContent: (kind: WBContentInsertKind) => void;
  onOpenTemplates: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            compact
              ? 'w-10 h-10 justify-center rounded-md'
              : 'h-8 gap-1.5 px-2 rounded-md',
            'inline-flex items-center bg-primary/10 text-primary text-[12px] font-semibold hover:bg-primary/15 transition-colors',
          )}
          title="콘텐츠 추가"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.9} />
          {!compact && '추가'}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onClick={() => onAddContent('diagram')}>
          <GitBranch className="w-3.5 h-3.5 mr-2 text-orange-500" strokeWidth={1.75} />
          다이어그램
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAddContent('table')}>
          <Table2 className="w-3.5 h-3.5 mr-2 text-emerald-500" strokeWidth={1.75} />
          표
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAddContent('timeline')}>
          <CalendarDays className="w-3.5 h-3.5 mr-2 text-green-500" strokeWidth={1.75} />
          타임라인
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAddContent('kanban')}>
          <Columns3 className="w-3.5 h-3.5 mr-2 text-teal-500" strokeWidth={1.75} />
          칸반
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenTemplates}>
          <LayoutTemplate className="w-3.5 h-3.5 mr-2 text-violet-500" strokeWidth={1.75} />
          전체 템플릿
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyBoardLauncher({
  onSticky,
  onText,
  onTemplates,
  onTemplate,
}: {
  onSticky: () => void;
  onText: () => void;
  onTemplates: () => void;
  onTemplate: (kind: WBTemplateKind) => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <FloatingCard className="pointer-events-auto w-[360px] max-w-[calc(100vw-96px)] p-3">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-foreground">첫 요소 추가</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">스티키 하나로 시작해도 충분해요</p>
          </div>
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={onSticky}
            className="h-24 rounded-md border border-transparent bg-primary/8 text-primary hover:bg-primary/12 hover:border-primary/20 transition-colors flex flex-col items-center justify-center gap-2"
            title="스티키 추가"
          >
            <StickyNote className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[12px] font-semibold">스티키</span>
          </button>
          <button
            type="button"
            onClick={onText}
            className="h-24 rounded-md border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground hover:border-foreground/10 transition-colors flex flex-col items-center justify-center gap-2"
            title="텍스트 추가"
          >
            <Type className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[12px] font-semibold">텍스트</span>
          </button>
          <button
            type="button"
            onClick={onTemplates}
            className="h-24 rounded-md border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground hover:border-foreground/10 transition-colors flex flex-col items-center justify-center gap-2"
            title="템플릿"
          >
            <LayoutTemplate className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[12px] font-semibold">템플릿</span>
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {(['brainstorm', 'kanban'] as const).map((kind) => {
            const meta = TEMPLATE_META[kind];
            return (
              <button
                key={kind}
                type="button"
                onClick={() => onTemplate(kind)}
                className="flex h-10 items-center gap-2 rounded-md border border-[hsl(var(--hairline))] bg-background/60 px-2 text-left text-[11.5px] font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:bg-primary/[0.035] hover:text-foreground"
                title={`${meta.label} 템플릿 추가`}
              >
                <span className="text-[15px] leading-none">{meta.emoji}</span>
                <span className="min-w-0 truncate">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </FloatingCard>
    </div>
  );
}

function TemplateGallery({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (kind: WBTemplateKind) => void;
}) {
  const categories = Array.from(new Set(TEMPLATE_KINDS.map((kind) => TEMPLATE_META[kind].category)));

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/25 backdrop-blur-[1px] p-4">
      <div className="flex max-h-[min(760px,calc(100vh-48px))] w-[920px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-lg border border-[hsl(var(--hairline))] bg-card shadow-xl">
        <div className="flex items-center gap-2 border-b border-[hsl(var(--hairline))] px-4 py-3">
          <LayoutTemplate className="w-4 h-4 text-primary" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[14px] font-semibold text-foreground">템플릿</h2>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">아이디어, 회의, UX, 실행 보드를 바로 시작하세요.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="템플릿 닫기"
            title="닫기"
          >
            X
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {categories.map((category) => (
            <section key={category} className="mb-5 last:mb-0">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-[12px] font-semibold text-foreground">{category}</h3>
                <div className="h-px flex-1 bg-[hsl(var(--hairline))]" />
              </div>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
                {TEMPLATE_KINDS.filter((kind) => TEMPLATE_META[kind].category === category).map((kind) => {
                  const meta = TEMPLATE_META[kind];
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => onApply(kind)}
                      className="group min-h-[128px] rounded-md border border-[hsl(var(--hairline))] bg-background/55 p-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                    >
                      <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-accent px-2 text-[13px] font-semibold leading-none text-foreground" aria-hidden>
                        {meta.emoji}
                      </span>
                      <span className="mt-3 block text-[13px] font-semibold text-foreground group-hover:text-primary">{meta.label}</span>
                      <span className="mt-1 block text-[11.5px] leading-4 text-muted-foreground">{meta.description}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

// ??????????????????????????????????????????
function ToolPalette({
  active,
  onAddContent,
  onOpenTemplates,
}: {
  active: WBToolKind;
  onAddContent: (kind: WBContentInsertKind) => void;
  onOpenTemplates: () => void;
}) {
  const settings = useSettings();
  const [flyout, setFlyout] = useState<WBToolKind | null>(null);
  const activeTool = TOOLS.find((t) => t.key === active);

  const handleToolClick = (key: WBToolKind) => {
    setTool({ kind: key });
    const def = TOOLS.find((t) => t.key === key);
    if (def?.hasFlyout) {
      setFlyout((cur) => (cur === key ? null : key));
    } else {
      setFlyout(null);
    }
  };

  // 罹붾쾭?ㅼ뿉???묒뾽 ?쒖옉?섎㈃ flyout ?リ린
  useEffect(() => {
    if (flyout && active !== flyout) setFlyout(null);
  }, [active, flyout]);

  return (
    <div
      data-wb-ui="true"
      className="absolute left-4 top-1/2 -translate-y-1/2 flex items-start gap-2"
      onPointerDown={(e) => {
        const active = document.activeElement;
        if (active instanceof HTMLTextAreaElement && active.dataset.wbInlineEditor === 'true') {
          active.blur();
        }
        e.stopPropagation();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <FloatingCard className="flex flex-col p-1 gap-1">
        {TOOL_GROUPS.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-1">
            {group.map((key) => {
              const tool = TOOLS.find((t) => t.key === key)!;
              const Icon = tool.icon;
              const isActive = active === key;
              return (
                <div key={key} className="contents">
                  <button
                    type="button"
                    onClick={() => handleToolClick(key)}
                    title={`${tool.label} (${tool.shortcut})`}
                    aria-label={tool.label}
                    aria-pressed={isActive}
                    className={cn(
                      'relative w-10 h-10 rounded-md flex items-center justify-center transition-colors',
                      isActive
                        ? 'bg-primary/12 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                  </button>
                  {key === 'pen' && (
                    <AddContentMenu
                      compact
                      onAddContent={onAddContent}
                      onOpenTemplates={onOpenTemplates}
                    />
                  )}
                </div>
              );
            })}
            {gi < TOOL_GROUPS.length - 1 && (
              <div className="h-1" aria-hidden />
            )}
          </div>
        ))}
      </FloatingCard>
      <div className="flex flex-col gap-2">
        {activeTool && !flyout && (
          <FloatingCard className="px-2 py-1 opacity-90">
            <p className="text-[11px] font-medium text-foreground whitespace-nowrap">{activeTool.label}</p>
            {activeTool.hasFlyout && (
              <p className="text-[10px] text-muted-foreground whitespace-nowrap">?듭뀡</p>
            )}
          </FloatingCard>
        )}
        {flyout && <ToolFlyout tool={flyout} settings={settings.tool} onClose={() => setFlyout(null)} />}
      </div>
    </div>
  );
}

// ??????????????????????????????????????????
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
    const shapes: Array<{ key: WBToolState['shapeKind']; label: string; icon: React.ReactNode }> = [
      { key: 'rect',     label: '사각형',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="5" width="18" height="14" rx="2"/></svg> },
      { key: 'ellipse',  label: '원',       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><ellipse cx="12" cy="12" rx="9" ry="7"/></svg> },
      { key: 'diamond',  label: '다이아',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polygon points="12,3 21,12 12,21 3,12"/></svg> },
      { key: 'triangle', label: '삼각형',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polygon points="12,4 21,20 3,20"/></svg> },
      { key: 'speech',   label: '말풍선',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M4 5h16v10h-9l-4 4v-4H4z"/></svg> },
      { key: 'capsule',  label: '시작/종료', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="7" width="18" height="10" rx="5"/></svg> },
      { key: 'database', label: 'DB',       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/></svg> },
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
      { key: 'arrow-solid',   label: '화살표' },
      { key: 'arrow-dashed',  label: '점선 화살표' },
      { key: 'arrow-curved',  label: '곡선 화살표' },
      { key: 'arrow-elbow',   label: '직각 화살표' },
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
                  'h-9 px-2 rounded-md text-[12px] text-left transition-colors',
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
    const colors: Array<{ key: 'ink' | 'red' | 'blue' | 'green' | 'amber'; hex: string }> = [
      { key: 'ink',   hex: 'hsl(0 0% 15%)' },
      { key: 'red',   hex: 'hsl(0 72% 51%)' },
      { key: 'blue',  hex: 'hsl(217 91% 55%)' },
      { key: 'green', hex: 'hsl(142 70% 45%)' },
      { key: 'amber', hex: 'hsl(38 92% 50%)' },
    ];
    return (
      <FloatingCard className="p-2 flex flex-col gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground px-1">펜 두께</span>
        <div className="flex gap-1">
          {widths.map((w) => {
            const isActive = settings.penSize === w.size;
            return (
              <button
                key={w.key}
                type="button"
                onClick={() => setTool({ penWidth: w.key, penSize: w.size })}
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
        <div className="mt-1 flex items-center gap-2 px-1">
          <input
            type="range"
            min={1}
            max={16}
            step={1}
            value={settings.penSize ?? 4}
            onChange={(e) => setTool({ penSize: Number(e.currentTarget.value) })}
            className="min-w-0 flex-1 accent-primary"
            aria-label="펜 두께"
          />
          <input
            type="number"
            min={1}
            max={32}
            step={1}
            value={settings.penSize ?? 4}
            onChange={(e) => {
              const value = Math.max(1, Math.min(32, Number(e.currentTarget.value) || 1));
              setTool({ penSize: value });
            }}
            className="h-7 w-12 rounded-md bg-accent/45 px-1.5 text-center text-[12px] font-medium outline-none focus:ring-1 focus:ring-primary/35"
            aria-label="펜 두께 숫자"
          />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground px-1 mt-1">색상</span>
        <div className="flex gap-1">
          {colors.map((c) => {
            const isActive = settings.penColor === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => { setTool({ penColor: c.key }); onClose(); }}
                className={cn(
                  'w-9 h-9 rounded-full transition-transform border-2',
                  isActive ? 'border-primary scale-110' : 'border-transparent hover:scale-110',
                )}
                style={{ background: c.hex }}
                title={c.key}
                aria-label={c.key}
              />
            );
          })}
        </div>
      </FloatingCard>
    );
  }
  return null;
}

// ??????????????????????????????????????????
function FloatingCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const stopUiPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const active = document.activeElement;
    if (active instanceof HTMLTextAreaElement && active.dataset.wbInlineEditor === 'true') {
      active.blur();
    }
    e.stopPropagation();
  };

  return (
    <div
      data-wb-ui="true"
      onPointerDown={stopUiPointer}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
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
      className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      aria-label={label}
      title={label}
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
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
        'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
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
        'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
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

// ??????????????????????????????????????????
// ??????????????????????????????????????????
function MiniMap({
  elements,
  viewport,
  containerSize,
  onJump,
}: {
  elements: WBElement[];
  viewport: WBViewport;
  containerSize: { w: number; h: number };
  onJump: (wp: { x: number; y: number }) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const MAP_W = 168;
  const MAP_H = 112;
  // ?붿냼 + ?꾩옱 viewport 瑜?紐⑤몢 ?ы븿?섎뒗 bbox
  const vw = containerSize.w / viewport.zoom;
  const vh = containerSize.h / viewport.zoom;
  const viewBbox = { x: viewport.x, y: viewport.y, w: vw, h: vh };
  const all: Array<{ x: number; y: number; w: number; h: number }> = [
    viewBbox,
    ...elements.map((el) => ({ x: el.x, y: el.y, w: el.w, h: el.h })),
  ];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of all) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }
  // ?щ갚
  const padX = (maxX - minX) * 0.08 || 100;
  const padY = (maxY - minY) * 0.08 || 100;
  minX -= padX; minY -= padY; maxX += padX; maxY += padY;
  const worldW = maxX - minX || 1;
  const worldH = maxY - minY || 1;
  const scale = Math.min(MAP_W / worldW, MAP_H / worldH);
  const ox = (MAP_W - worldW * scale) / 2;
  const oy = (MAP_H - worldH * scale) / 2;
  const toLocal = (wx: number, wy: number) => ({
    x: ox + (wx - minX) * scale,
    y: oy + (wy - minY) * scale,
  });
  const jumpFromEvent = (e: React.PointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = (mx - ox) / scale + minX;
    const wy = (my - oy) / scale + minY;
    onJump({ x: wx, y: wy });
  };
  return (
    <div className="absolute right-4 bottom-16">
      <FloatingCard className="p-1">
        <svg
          width={MAP_W}
          height={MAP_H}
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          onClick={jumpFromEvent}
          onPointerDown={(e) => {
            setDragging(true);
            e.currentTarget.setPointerCapture?.(e.pointerId);
            jumpFromEvent(e);
          }}
          onPointerMove={(e) => {
            if (dragging) jumpFromEvent(e);
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          className="cursor-pointer rounded-md"
          style={{ background: 'hsl(var(--accent) / 0.35)' }}
        >
          {/* ?붿냼 誘몃━蹂닿린 */}
          {elements.map((el) => {
            const p1 = toLocal(el.x, el.y);
            const p2 = toLocal(el.x + el.w, el.y + el.h);
            return (
              <rect
                key={el.id}
                x={p1.x}
                y={p1.y}
                width={Math.max(1, p2.x - p1.x)}
                height={Math.max(1, p2.y - p1.y)}
                fill="hsl(var(--foreground) / 0.35)"
              />
            );
          })}
          {/* ?꾩옱 viewport */}
          {(() => {
            const p1 = toLocal(viewBbox.x, viewBbox.y);
            const p2 = toLocal(viewBbox.x + viewBbox.w, viewBbox.y + viewBbox.h);
            return (
              <rect
                x={p1.x}
                y={p1.y}
                width={Math.max(2, p2.x - p1.x)}
                height={Math.max(2, p2.y - p1.y)}
                fill="hsl(217 91% 55% / 0.10)"
                stroke="hsl(217 91% 55%)"
                strokeWidth={1.25}
              />
            );
          })()}
        </svg>
      </FloatingCard>
    </div>
  );
}

function SearchBar({
  query,
  matchCount,
  currentIndex,
  onChange,
  onClose,
  onJump,
}: {
  query: string;
  matchCount: number;
  currentIndex: number;
  onChange: (v: string) => void;
  onClose: () => void;
  onJump: (dir: 'next' | 'prev') => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const empty = query.trim().length > 0 && matchCount === 0;
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-4 z-30">
      <FloatingCard className={cn('flex items-center gap-1.5 px-2 h-10 min-w-[320px]', empty && 'ring-1 ring-destructive/40')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-muted-foreground">
          <circle cx="11" cy="11" r="7"/>
          <line x1="16.5" y1="16.5" x2="21" y2="21"/>
        </svg>
        <input
          ref={ref}
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') onJump(e.shiftKey ? 'prev' : 'next');
            if (e.key === 'Escape') onClose();
          }}
          placeholder="텍스트, 스티키, 도형 검색"
          className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
        />
        {query && matchCount > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground">{currentIndex + 1}/{matchCount}</span>
        )}
        {empty && (
          <span className="text-[11px] tabular-nums text-destructive">?놁쓬</span>
        )}
        <button
          type="button"
          onClick={() => onJump('prev')}
          disabled={matchCount === 0}
          className="w-8 h-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30 flex items-center justify-center"
          aria-label="이전 매치"
          title="이전 (Shift+Enter)"
        >이전</button>
        <button
          type="button"
          onClick={() => onJump('next')}
          disabled={matchCount === 0}
          className="w-8 h-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30 flex items-center justify-center"
          aria-label="다음 매치"
          title="다음 (Enter)"
        >다음</button>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center justify-center text-[14px]"
          aria-label="검색 닫기"
        >
          X
        </button>
      </FloatingCard>
    </div>
  );
}

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
            aria-label="도움말 열기"
            title="도움말 (?)"
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
              <h2 className="text-[15px] font-semibold">도움말</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                X
              </button>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-1 text-[12.5px]">
              <ShortcutGroup title="도구" items={[
                ['V', '선택'], ['H', '이동'], ['T', '텍스트'], ['S', '스티키'],
                ['R', '도형'], ['F', '프레임'], ['L', '선'], ['P', '펜'], ['E', '지우개'],
              ]} />
              <ShortcutGroup title="편집" items={[
                ['Ctrl+Z', '실행 취소'], ['Ctrl+Shift+Z', '다시 실행'],
                ['Ctrl+A', '전체 선택'], ['Ctrl+D', '복제'],
                ['Ctrl+C / X / V', '복사 / 잘라내기 / 붙여넣기'],
                ['Delete', '삭제'], ['[ / ]', '순서 이동'], ['Ctrl+[ / ]', '맨 뒤 / 맨 앞'],
              ]} />
              <ShortcutGroup title="뷰" items={[
                ['Space', '임시 이동'], ['Wheel', '확대/축소'],
                ['Shift/Alt+Wheel', '화면 이동'], ['?', '도움말'], ['Esc', '취소'],
              ]} />
              <ShortcutGroup title="그리기 보조" items={[
                ['Shift+Drag', '15도 스냅'], ['Shift+Resize', '비율 고정'], ['Alt+Resize', '중심 기준'],
              ]} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function OutlinePanel({
  elements,
  selected,
  onSelect,
}: {
  elements: WBElement[];
  selected: Set<string>;
  onSelect: (id: string) => void;
}) {
  const items = elements
    .filter((el) => el.type === 'frame' || el.type === 'table' || el.type === 'text' || el.type === 'sticky' || (('text' in el && el.text) || (el.type === 'arrow' && el.label)))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .slice(0, 80);
  return (
    <FloatingCard className="w-64 max-h-[56vh] overflow-y-auto p-2">
      <div className="px-1.5 pb-1.5 text-[11px] font-semibold text-muted-foreground">개요</div>
      {items.length === 0 ? (
        <p className="px-2 py-4 text-[12px] text-muted-foreground">텍스트나 프레임이 아직 없어요</p>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((el) => {
            const label = outlineLabel(el);
            return (
              <button
                key={el.id}
                type="button"
                onClick={() => onSelect(el.id)}
                className={cn(
                  'h-8 px-2 rounded-md flex items-center gap-2 text-left transition-colors',
                  selected.has(el.id) ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
                title={label}
              >
                <span className="w-11 shrink-0 text-[10px]">{outlineKind(el)}</span>
                <span className="text-[12px] truncate flex-1">{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </FloatingCard>
  );
}

function FramePresentationBar({
  index,
  count,
  raised,
  onPrev,
  onNext,
  onClose,
}: {
  index: number;
  count: number;
  raised?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  return (
    <div className={cn('absolute left-1/2 -translate-x-1/2 z-20', raised ? 'bottom-32' : 'bottom-16')}>
      <FloatingCard className="flex items-center gap-1 px-2 h-10">
        <button type="button" onClick={onPrev} className="w-8 h-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">‹</button>
        <span className="px-2 text-[12px] tabular-nums text-foreground">{index + 1}/{count}</span>
        <button type="button" onClick={onNext} className="w-8 h-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">›</button>
        <div className="w-px h-5 bg-[hsl(var(--hairline))] mx-1" />
        <button type="button" onClick={onClose} className="w-8 h-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">X</button>
      </FloatingCard>
    </div>
  );
}

// ??????????????????????????????????????????
// ContextualPanel ???좏깮 ?붿냼 ?≪뀡 (?섎떒 媛?대뜲 ?좊떎??
function ContextualPanel({
  boardId,
  elements,
  selection,
  selectedTableCell,
  placement,
  onSelectTableCell,
  onClearSelection,
  onChangeZ,
  onDuplicate,
  onFrameSelection,
  onRenameFrame,
  onFocusFrame,
  onAlign,
  onDistribute,
  onGroup,
  onUngroup,
  onDelete,
}: {
  boardId: string;
  elements: WBElement[];
  selection: Set<string>;
  selectedTableCell: { tableId: string; index: number } | null;
  placement: 'top' | 'bottom';
  onSelectTableCell: (cell: { tableId: string; index: number } | null) => void;
  onClearSelection: () => void;
  onChangeZ: (mode: 'front' | 'back' | 'forward' | 'backward') => void;
  onDuplicate: () => void;
  onFrameSelection: () => void;
  onRenameFrame: (id: string) => void;
  onFocusFrame: (frame: WBFrame) => void;
  onAlign: (mode: AlignMode) => void;
  onDistribute: (mode: DistributeMode) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDelete: () => void;
}) {
  const selected = elements.filter((el) => selection.has(el.id));
  const single = selected.length === 1 ? selected[0] : null;
  const isLocked = selected.some((el) => el.locked);
  const quickColors = ['amber', 'pink', 'green', 'blue', 'violet'] as const;
  const applyQuickColor = (color: (typeof quickColors)[number]) => {
    if (!single) return;
    const patch =
      single.type === 'sticky' ? { color: color === 'green' ? 'mint' : color === 'blue' ? 'sky' : color === 'violet' ? 'lavender' : color }
      : single.type === 'text' ? { textColor: color }
      : single.type === 'table' && selectedTableCell?.tableId === single.id
        ? { cellStyles: updateTableCellStyle(single, selectedTableCell.index, { fillColor: color }) }
      : single.type === 'table' ? { headerFill: color, borderColor: color === 'amber' ? 'orange' : color }
      : single.type === 'line' || single.type === 'arrow' || single.type === 'freedraw' ? { strokeColor: color }
      : single.type === 'rect' || single.type === 'ellipse' || single.type === 'diamond' || single.type === 'triangle' || single.type === 'speech'
        ? { fillColor: color, strokeColor: color === 'amber' ? 'orange' : color }
      : null;
    if (!patch) return;
    updateElement(boardId, single.id, patch as Partial<WBElement>);
    pushSnapshot(boardId, elements.map((el) =>
      el.id === single.id ? ({ ...el, ...patch, updatedAt: Date.now() } as WBElement) : el,
    ));
  };
  const applyTablePatch = (table: WBTable, patch: Partial<WBTable>) => {
    updateElement(boardId, table.id, patch as Partial<WBElement>);
    pushSnapshot(boardId, elements.map((el) =>
      el.id === table.id ? ({ ...el, ...patch, updatedAt: Date.now() } as WBElement) : el,
    ));
  };
  const activeTableCell =
    single?.type === 'table' && selectedTableCell?.tableId === single.id
      ? selectedTableCell.index
      : null;
  const activeCellRect =
    single?.type === 'table' && activeTableCell != null
      ? getTableCellRect(single, activeTableCell)
      : null;

  return (
    <div className={cn('absolute left-1/2 -translate-x-1/2 z-10', placement === 'top' ? 'top-20' : 'bottom-16')}>
      <FloatingCard className="flex min-h-12 max-w-[calc(100vw-96px)] items-center gap-1.5 overflow-x-auto px-2 py-1.5">
        {/* ?ㅽ???踰꾪듉 ???⑥씪 ?좏깮 ??expandable 硫붾돱 */}
        {single && (
          <StylePopover element={single} boardId={boardId} elements={elements} />
        )}
        {single?.type === 'frame' && (
          <>
            <button
              type="button"
              onClick={() => onRenameFrame(single.id)}
              className="h-10 px-3 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="프레임 이름 바꾸기"
            >
              이름
            </button>
            <button
              type="button"
              onClick={() => onFocusFrame(single)}
              className="h-10 px-3 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="프레임으로 이동"
            >
              보기
            </button>
            <div className="w-px h-5 bg-[hsl(var(--hairline))] mx-1" aria-hidden />
          </>
        )}
        {single?.type === 'table' && (
          <>
            <button
              type="button"
              onClick={() => {
                const row = activeCellRect ? activeCellRect.row + 1 : single.rows;
                const patch = insertTableRow(single, row);
                applyTablePatch(single, patch);
                const nextCol = activeCellRect ? activeCellRect.col : 0;
                onSelectTableCell({ tableId: single.id, index: Math.min(patch.rows - 1, row) * single.cols + nextCol });
              }}
              className="h-10 px-3 rounded-md inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title={activeCellRect ? '선택 셀 아래 행 추가' : '마지막에 행 추가'}
            >
              행 +
            </button>
            <button
              type="button"
              onClick={() => {
                const row = activeCellRect ? activeCellRect.row : single.rows - 1;
                const patch = deleteTableRow(single, row);
                applyTablePatch(single, patch);
                const nextRow = Math.min(row, patch.rows - 1);
                const nextCol = activeCellRect ? activeCellRect.col : 0;
                onSelectTableCell({ tableId: single.id, index: nextRow * single.cols + Math.min(nextCol, single.cols - 1) });
              }}
              className="h-10 px-3 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title={activeCellRect ? '선택 셀의 행 삭제' : '마지막 행 삭제'}
            >
              행 -
            </button>
            <button
              type="button"
              onClick={() => {
                const col = activeCellRect ? activeCellRect.col + 1 : single.cols;
                const patch = insertTableCol(single, col);
                applyTablePatch(single, patch);
                const nextRow = activeCellRect ? activeCellRect.row : 0;
                onSelectTableCell({ tableId: single.id, index: nextRow * patch.cols + Math.min(col, patch.cols - 1) });
              }}
              className="h-10 px-3 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title={activeCellRect ? '선택 셀 오른쪽 열 추가' : '마지막에 열 추가'}
            >
              열 +
            </button>
            <button
              type="button"
              onClick={() => {
                const col = activeCellRect ? activeCellRect.col : single.cols - 1;
                const patch = deleteTableCol(single, col);
                applyTablePatch(single, patch);
                const nextRow = activeCellRect ? activeCellRect.row : 0;
                const nextCol = Math.min(col, patch.cols - 1);
                onSelectTableCell({ tableId: single.id, index: Math.min(nextRow, single.rows - 1) * patch.cols + nextCol });
              }}
              className="h-10 px-3 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title={activeCellRect ? '선택 셀의 열 삭제' : '마지막 열 삭제'}
            >
              열 -
            </button>
            {activeTableCell != null && (
              <>
                <div className="w-px h-5 bg-[hsl(var(--hairline))] mx-1" aria-hidden />
                <span className="px-1 text-[11px] font-medium text-muted-foreground tabular-nums">
                  {activeCellRect ? `${activeCellRect.row + 1}:${activeCellRect.col + 1}` : '셀'}
                </span>
                <button
                  type="button"
                  onClick={() => applyTablePatch(single, {
                    cellStyles: updateTableCellStyle(single, activeTableCell, {
                      bold: !single.cellStyles?.[activeTableCell]?.bold,
                    }),
                  })}
                  className={cn(
                    'h-8 w-8 rounded-md text-[13px] font-bold transition-colors',
                    single.cellStyles?.[activeTableCell]?.bold ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                  title="셀 굵게"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => applyTablePatch(single, {
                    cellStyles: updateTableCellStyle(single, activeTableCell, {
                      italic: !single.cellStyles?.[activeTableCell]?.italic,
                    }),
                  })}
                  className={cn(
                    'h-8 w-8 rounded-md text-[13px] italic font-semibold transition-colors',
                    single.cellStyles?.[activeTableCell]?.italic ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                  title="셀 기울임"
                >
                  I
                </button>
                <div className="flex items-center gap-0.5 px-1" aria-label="셀 배경색">
                  {quickColors.map((color) => (
                    <button
                      key={`cell-fill-${color}`}
                      type="button"
                      onClick={() => applyTablePatch(single, {
                        cellStyles: updateTableCellStyle(single, activeTableCell, { fillColor: color }),
                      })}
                      className="w-5 h-5 rounded border border-foreground/15 hover:scale-110 transition-transform"
                      style={{ background: WB_COLOR_HSL[color] }}
                      title={`셀 배경: ${color}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-0.5 px-0.5" aria-label="셀 정렬">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={`cell-align-${align}`}
                      type="button"
                      onClick={() => applyTablePatch(single, {
                        cellStyles: updateTableCellStyle(single, activeTableCell, { textAlign: align }),
                      })}
                      className={cn(
                        'h-8 px-2 rounded-md text-[11.5px] font-medium transition-colors',
                        single.cellStyles?.[activeTableCell]?.textAlign === align
                          ? 'bg-primary/12 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                      title={`셀 정렬: ${align}`}
                    >
                      {align === 'left' ? '좌' : align === 'center' ? '중' : '우'}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => applyTablePatch(single, { cellStyles: clearTableCellStyle(single, activeTableCell) })}
                  className="h-8 px-2 rounded-md text-[11.5px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  title="셀 스타일 지우기"
                >
                  초기화
                </button>
              </>
            )}
            <div className="w-px h-5 bg-[hsl(var(--hairline))] mx-1" aria-hidden />
          </>
        )}
        {selection.size > 0 && !selected.every((el) => el.type === 'frame') && (
          <>
            <button
              type="button"
              onClick={onFrameSelection}
              className="h-10 px-3 rounded-md inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="선택한 요소를 프레임으로 묶기"
            >
              <SquareDashed className="w-3.5 h-3.5" strokeWidth={1.75} />
              프레임
            </button>
            <div className="w-px h-5 bg-[hsl(var(--hairline))] mx-1" aria-hidden />
          </>
        )}
        {single && !single.locked && (
          <>
            <div className="flex items-center gap-0.5 px-1" aria-label="빠른 색상">
              {quickColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => applyQuickColor(color)}
                  className="w-6 h-6 rounded-full border border-foreground/15 hover:scale-110 transition-transform"
                  style={{ background: WB_COLOR_HSL[color] }}
                  title={`색상: ${color}`}
                />
              ))}
            </div>
            <div className="w-px h-5 bg-[hsl(var(--hairline))] mx-1" aria-hidden />
          </>
        )}
        {/* ?ㅼ쨷 ?좏깮 ?뺣젹쨌遺꾨같 */}
        {selection.size >= 2 && (
          <>
            <AlignBtn axis="left"     onClick={() => onAlign('left')} />
            <AlignBtn axis="center-h" onClick={() => onAlign('center-h')} />
            <AlignBtn axis="right"    onClick={() => onAlign('right')} />
            <AlignBtn axis="top"      onClick={() => onAlign('top')} />
            <AlignBtn axis="center-v" onClick={() => onAlign('center-v')} />
            <AlignBtn axis="bottom"   onClick={() => onAlign('bottom')} />
            {selection.size >= 3 && (
              <>
                <AlignBtn axis="dist-h" onClick={() => onDistribute('horizontal')} />
                <AlignBtn axis="dist-v" onClick={() => onDistribute('vertical')} />
              </>
            )}
            <div className="w-px h-5 bg-[hsl(var(--hairline))] mx-1" aria-hidden />
          </>
        )}
        {/* z-order */}
        <PanelBtn icon="bringToFront" label="맨 앞으로" onClick={() => onChangeZ('front')} />
        <PanelBtn icon="bringForward" label="앞으로" onClick={() => onChangeZ('forward')} />
        <PanelBtn icon="sendBackward" label="뒤로" onClick={() => onChangeZ('backward')} />
        <PanelBtn icon="sendToBack" label="맨 뒤로" onClick={() => onChangeZ('back')} />
        <div className="w-px h-5 bg-[hsl(var(--hairline))] mx-1" aria-hidden />
        {/* 蹂듭젣 */}
        <button
          type="button"
          onClick={onDuplicate}
          className="w-10 h-10 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="복제 (Ctrl+D)"
        >
          <Copy className="w-4 h-4" strokeWidth={1.75} />
        </button>
        {selection.size >= 2 && (
          <button
            type="button"
            onClick={onGroup}
            className="w-10 h-10 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="그룹 (Ctrl+G)"
          >
            <Group className="w-4 h-4" strokeWidth={1.75} />
          </button>
        )}
        {selected.some((el) => el.groupIds.length > 0) && (
          <button
            type="button"
            onClick={onUngroup}
            className="w-10 h-10 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="그룹 해제 (Ctrl+Shift+G)"
          >
            <Ungroup className="w-4 h-4" strokeWidth={1.75} />
          </button>
        )}
        {/* ?좉툑 */}
        <button
          type="button"
          onClick={() => {
            // ?좉툑 ?좉? (?ㅼ쨷 ?좏깮 媛?? 紐⑤몢 ?숈씪 ?곹깭濡?
            const targetLocked = !isLocked;
            const next = elements.map((el) =>
              selection.has(el.id) ? { ...el, locked: targetLocked, updatedAt: Date.now() } : el,
            );
            setElements(boardId, next);
            pushSnapshot(boardId, next);
          }}
          className={cn(
            'w-10 h-10 rounded-md flex items-center justify-center transition-colors',
            isLocked ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
          title={isLocked ? '잠금 해제 (Ctrl+L)' : '잠금 (Ctrl+L)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <rect x="5" y="11" width="14" height="10" rx="2"/>
            {isLocked ? <path d="M8 11V8a4 4 0 0 1 8 0v3"/> : <path d="M8 11V9a4 4 0 0 1 7.2-2.4"/>}
          </svg>
        </button>
        <div className="w-px h-5 bg-[hsl(var(--hairline))] mx-1" aria-hidden />
        {/* ??젣 */}
        <button
          type="button"
          onClick={onDelete}
          className="w-10 h-10 rounded-md flex items-center justify-center text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="삭제 (Del)"
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.75} />
        </button>
        <div className="w-px h-5 bg-[hsl(var(--hairline))] mx-1" aria-hidden />
        {/* ?좏깮 ?댁젣 */}
        <button
          type="button"
          onClick={onClearSelection}
          className="w-10 h-10 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="선택 해제 (Esc)"
        >
          X
        </button>
        <span className="text-[11px] text-muted-foreground/80 tabular-nums px-1.5">{selection.size}개</span>
      </FloatingCard>
    </div>
  );
}

// ??????????????????????????????????????????
// StylePopover ???⑥씪 ?좏깮 ?붿냼???ㅽ???(?됀룻쉷쨌?고듃 ?? ?몄쭛 ?앹삤踰?
function StylePopover({
  element,
  boardId,
  elements,
}: {
  element: WBElement;
  boardId: string;
  elements: WBElement[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDoc);
    return () => window.removeEventListener('pointerdown', onDoc);
  }, [open]);

  const apply = (patch: Partial<WBElement>) => {
    updateElement(boardId, element.id, patch);
    pushSnapshot(boardId, elements.map((el) =>
      el.id === element.id ? ({ ...el, ...patch, updatedAt: Date.now() } as WBElement) : el,
    ));
  };

  // 誘몃━蹂닿린 ??(???
  const previewColor =
    element.type === 'sticky'
      ? WB_STICKY_BG[element.color].bg
      : element.type === 'table'
        ? WB_COLOR_HSL[element.headerFill]
      : 'strokeColor' in element
        ? WB_COLOR_HSL[element.strokeColor]
        : element.type === 'text'
          ? WB_COLOR_HSL[element.textColor]
          : 'hsl(var(--foreground))';

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-3 h-10 rounded-md transition-colors',
          open ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
        title="스타일"
      >
        <span
          className="w-4 h-4 rounded-full border border-foreground/20"
          style={{ background: previewColor }}
        />
        <span className="text-[12px] font-medium">스타일</span>
      </button>
      {open && (
        <div className="absolute left-0 bottom-full mb-2 z-20">
          <FloatingCard className="p-3 min-w-[280px] flex flex-col gap-3">
            {/* ?ㅽ떚????6??+ ?고듃 ?ш린 */}
            {element.type === 'sticky' && (
              <>
                <StyleRow label="색">
                  {(['amber', 'pink', 'mint', 'sky', 'lavender', 'slate'] as const).map((c) => {
                    const tone = WB_STICKY_BG[c];
                    const isActive = element.color === c;
                    return (
                      <button key={c} type="button" onClick={() => apply({ color: c })}
                        className={cn('w-6 h-6 rounded-md transition-transform border-2',
                          isActive ? 'border-primary scale-110' : 'border-transparent hover:scale-110')}
                        style={{ background: tone.bg, borderColor: isActive ? undefined : tone.border }}
                        title={c} />
                    );
                  })}
                </StyleRow>
                <StyleRow label="크기">
                  {([12, 14, 16, 18, 20, 24, 28] as const).map((s) => (
                    <button key={s} type="button" onClick={() => apply({ fontSize: s })}
                      className={cn('w-9 h-7 rounded text-[11px] font-medium transition-colors',
                        element.fontSize === s ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent')}
                    >{s}</button>
                  ))}
                </StyleRow>
                <StyleRow label="?뺣젹">
                  {(['left', 'center'] as const).map((a) => (
                    <button key={a} type="button" onClick={() => apply({ textAlign: a })}
                      className={cn('flex-1 h-7 rounded text-[11px] font-medium transition-colors',
                        element.textAlign === a ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent')}
                    >{a === 'left' ? '?쇱そ' : '以묒븰'}</button>
                  ))}
                </StyleRow>
              </>
            )}

            {/* ?띿뒪??*/}
            {element.type === 'text' && (
              <>
                <StyleRow label="색">
                  {(WB_COLORS).map((c) => {
                    const isActive = element.textColor === c;
                    return (
                      <button key={c} type="button" onClick={() => apply({ textColor: c })}
                        className={cn('w-5 h-5 rounded-full transition-transform border-2',
                          isActive ? 'border-primary scale-125' : 'border-transparent hover:scale-110')}
                        style={{ background: WB_COLOR_HSL[c] }}
                        title={c} />
                    );
                  })}
                </StyleRow>
                <StyleRow label="?ш린">
                  {([10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56] as const).map((s) => (
                    <button key={s} type="button" onClick={() => apply({ fontSize: s })}
                      className={cn('w-9 h-7 rounded text-[11px] font-medium transition-colors',
                        element.fontSize === s ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent')}
                    >{s}</button>
                  ))}
                </StyleRow>
                <StyleRow label="?뺣젹">
                  {(['left', 'center', 'right'] as const).map((a) => (
                    <button key={a} type="button" onClick={() => apply({ textAlign: a })}
                      className={cn('flex-1 h-7 rounded text-[11px] font-medium transition-colors',
                        element.textAlign === a ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent')}
                    >{a === 'left' ? '왼쪽' : a === 'center' ? '중앙' : '오른쪽'}</button>
                  ))}
                </StyleRow>
              </>
            )}

            {/* ?꾪삎 (rect/ellipse/diamond/triangle/speech) ??roughness ?ы븿 */}
            {isTextShape(element) && (
              <>
                <StyleRow label="?ш린">
                  {([10, 12, 14, 16, 18, 20, 24, 28, 32] as const).map((s) => (
                    <button key={s} type="button" onClick={() => apply({ fontSize: s } as Partial<WBElement>)}
                      className={cn('w-9 h-7 rounded text-[11px] font-medium transition-colors',
                        element.fontSize === s ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent')}
                    >{s}</button>
                  ))}
                </StyleRow>
                <StyleRow label="질감">
                  {([0, 1, 2] as const).map((r) => (
                    <button key={r} type="button" onClick={() => apply({ roughness: r } as Partial<WBElement>)}
                      className={cn('flex-1 h-7 rounded text-[11px] font-medium transition-colors',
                        element.roughness === r ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent')}
                    >{r === 0 ? '깔끔' : r === 1 ? '손그림' : '거침'}</button>
                  ))}
                </StyleRow>
                <StyleRow label="외곽">
                  {WB_COLORS.map((c) => {
                    const isActive = element.strokeColor === c;
                    return (
                      <button key={c} type="button" onClick={() => apply({ strokeColor: c } as Partial<WBElement>)}
                        className={cn('w-5 h-5 rounded-full transition-transform border-2',
                          isActive ? 'border-primary scale-125' : 'border-transparent hover:scale-110')}
                        style={{ background: WB_COLOR_HSL[c] }}
                        title={c} />
                    );
                  })}
                </StyleRow>
                <StyleRow label="채우기">
                  <button type="button" onClick={() => apply({ fillColor: 'none' } as Partial<WBElement>)}
                    className={cn('w-5 h-5 rounded-full transition-transform border-2 border-foreground/30 bg-card flex items-center justify-center',
                      element.fillColor === 'none' ? 'border-primary scale-125' : 'hover:scale-110')}
                    title="없음">X</button>
                  {WB_COLORS.map((c) => {
                    const isActive = element.fillColor === c;
                    return (
                      <button key={c} type="button" onClick={() => apply({ fillColor: c } as Partial<WBElement>)}
                        className={cn('w-5 h-5 rounded-full transition-transform border-2',
                          isActive ? 'border-primary scale-125' : 'border-transparent hover:scale-110')}
                        style={{ background: WB_COLOR_HSL[c].replace('hsl(', 'hsla(').replace(')', ' / 0.4)') }}
                        title={c} />
                    );
                  })}
                </StyleRow>
                <StyleRow label="두께">
                  {(['thin', 'normal', 'thick'] as const).map((w) => (
                    <button key={w} type="button" onClick={() => apply({ strokeWidth: w } as Partial<WBElement>)}
                      className={cn('flex-1 h-7 rounded text-[11px] font-medium transition-colors',
                        element.strokeWidth === w ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent')}
                    >{w === 'thin' ? '얇음' : w === 'normal' ? '보통' : '굵음'}</button>
                  ))}
                </StyleRow>
                <StyleRow label="선">
                  {(['solid', 'dashed', 'dotted'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => apply({ strokeStyle: s } as Partial<WBElement>)}
                      className={cn('flex-1 h-7 rounded text-[11px] font-medium transition-colors',
                        element.strokeStyle === s ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent')}
                    >{s === 'solid' ? '실선' : s === 'dashed' ? '점선' : '도트'}</button>
                  ))}
                </StyleRow>
              </>
            )}

            {/* ?졖룻솕?댄몴 */}
            {(element.type === 'line' || element.type === 'arrow') && (
              <>
                {element.type === 'arrow' && (
                  <>
                    <StyleRow label="라벨">
                      <input
                        value={element.label ?? ''}
                        onChange={(e) => apply({ label: e.target.value || undefined } as Partial<WBElement>)}
                        placeholder="라벨"
                        className="h-8 flex-1 rounded-md bg-accent/40 px-2 text-[12px] outline-none focus:ring-1 focus:ring-primary/40"
                      />
                    </StyleRow>
                    <StyleRow label="모양">
                      {(['straight', 'curved', 'elbow'] as const).map((curve) => (
                        <button key={curve} type="button" onClick={() => apply({ curve } as Partial<WBElement>)}
                          className={cn('flex-1 h-7 rounded text-[11px] font-medium transition-colors',
                            element.curve === curve ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent')}
                        >{curve === 'straight' ? '직선' : curve === 'curved' ? '곡선' : '직각'}</button>
                      ))}
                    </StyleRow>
                  </>
                )}
                <StyleRow label="색">
                  {WB_COLORS.map((c) => {
                    const isActive = element.strokeColor === c;
                    return (
                      <button key={c} type="button" onClick={() => apply({ strokeColor: c } as Partial<WBElement>)}
                        className={cn('w-5 h-5 rounded-full transition-transform border-2',
                          isActive ? 'border-primary scale-125' : 'border-transparent hover:scale-110')}
                        style={{ background: WB_COLOR_HSL[c] }}
                        title={c} />
                    );
                  })}
                </StyleRow>
                <StyleRow label="두께">
                  {(['thin', 'normal', 'thick'] as const).map((w) => (
                    <button key={w} type="button" onClick={() => apply({ strokeWidth: w } as Partial<WBElement>)}
                      className={cn('flex-1 h-7 rounded text-[11px] font-medium transition-colors',
                        element.strokeWidth === w ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent')}
                    >{w === 'thin' ? '얇음' : w === 'normal' ? '보통' : '굵음'}</button>
                  ))}
                </StyleRow>
                <StyleRow label="선">
                  {(['solid', 'dashed', 'dotted'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => apply({ strokeStyle: s } as Partial<WBElement>)}
                      className={cn('flex-1 h-7 rounded text-[11px] font-medium transition-colors',
                        element.strokeStyle === s ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent')}
                    >{s === 'solid' ? '실선' : s === 'dashed' ? '점선' : '도트'}</button>
                  ))}
                </StyleRow>
              </>
            )}

            {/* freedraw */}
            {element.type === 'freedraw' && (
              <>
                <StyleRow label="색">
                  {WB_COLORS.map((c) => {
                    const isActive = element.strokeColor === c;
                    return (
                      <button key={c} type="button" onClick={() => apply({ strokeColor: c } as Partial<WBElement>)}
                        className={cn('w-5 h-5 rounded-full transition-transform border-2',
                          isActive ? 'border-primary scale-125' : 'border-transparent hover:scale-110')}
                        style={{ background: WB_COLOR_HSL[c] }}
                        title={c} />
                    );
                  })}
                </StyleRow>
                <StyleRow label="두께">
                  {(['thin', 'normal', 'thick'] as const).map((w) => (
                    <button key={w} type="button" onClick={() => apply({ strokeWidth: w } as Partial<WBElement>)}
                      className={cn('flex-1 h-7 rounded text-[11px] font-medium transition-colors',
                        element.strokeWidth === w ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent')}
                    >{w === 'thin' ? '얇음' : w === 'normal' ? '보통' : '굵음'}</button>
                  ))}
                </StyleRow>
              </>
            )}

            {element.type === 'image' && (
              <>
                <StyleRow label="모서리">
                  {([0, 4, 8, 16, 999] as const).map((radius) => (
                    <button key={radius} type="button" onClick={() => apply({ cornerRadius: radius } as Partial<WBElement>)}
                      className={cn('flex-1 h-7 rounded text-[11px] font-medium transition-colors',
                        element.cornerRadius === radius ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent')}
                    >{radius === 999 ? '원형' : radius}</button>
                  ))}
                </StyleRow>
                <StyleRow label="비율">
                  <button
                    type="button"
                    onClick={() => {
                      const maxSide = Math.max(element.w, element.h);
                      const scale = maxSide / Math.max(1, Math.max(element.naturalW, element.naturalH));
                      apply({ w: element.naturalW * scale, h: element.naturalH * scale } as Partial<WBElement>);
                    }}
                    className="flex-1 h-7 rounded text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    원본 비율
                  </button>
                </StyleRow>
              </>
            )}

            {element.type === 'table' && (
              <>
                <StyleRow label="크기">
                  <NumberStepper
                    label="행"
                    value={element.rows}
                    min={WB_TABLE_LIMITS.minRows}
                    max={WB_TABLE_LIMITS.maxRows}
                    onChange={(rows) => apply({
                      rows,
                      cells: resizeTableCells(element, rows, element.cols),
                      cellStyles: resizeTableCellStyles(element, rows, element.cols),
                    } as Partial<WBElement>)}
                  />
                  <NumberStepper
                    label="열"
                    value={element.cols}
                    min={WB_TABLE_LIMITS.minCols}
                    max={WB_TABLE_LIMITS.maxCols}
                    onChange={(cols) => apply({
                      cols,
                      cells: resizeTableCells(element, element.rows, cols),
                      cellStyles: resizeTableCellStyles(element, element.rows, cols),
                    } as Partial<WBElement>)}
                  />
                </StyleRow>
                <StyleRow label="옵션">
                  <TogglePill
                    active={element.headerRow}
                    label="헤더"
                    onClick={() => apply({ headerRow: !element.headerRow } as Partial<WBElement>)}
                  />
                  <TogglePill
                    active={Boolean(element.stripedRows)}
                    label="줄무늬"
                    onClick={() => apply({ stripedRows: !element.stripedRows } as Partial<WBElement>)}
                  />
                </StyleRow>
                <StyleRow label="정렬">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => apply({ textAlign: align } as Partial<WBElement>)}
                      className={cn('flex-1 h-7 rounded text-[11px] font-medium transition-colors',
                        (element.textAlign ?? 'left') === align ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent')}
                    >
                      {align === 'left' ? '왼쪽' : align === 'center' ? '가운데' : '오른쪽'}
                    </button>
                  ))}
                </StyleRow>
                <StyleRow label="내용">
                  <textarea
                    value={tableToText(element)}
                    onChange={(e) => {
                      const parsed = parseTableText(e.target.value, element.rows, element.cols);
                      apply({ cells: parsed.cells } as Partial<WBElement>);
                    }}
                    className="min-h-[92px] flex-1 rounded-md bg-accent/35 px-2 py-1.5 text-[12px] leading-5 outline-none focus:ring-1 focus:ring-primary/40"
                    placeholder="탭으로 열, 줄바꿈으로 행을 나눠요"
                  />
                </StyleRow>
                <StyleRow label="헤더">
                  {WB_COLORS.map((c) => {
                    const isActive = element.headerFill === c;
                    return (
                      <button key={c} type="button" onClick={() => apply({ headerFill: c } as Partial<WBElement>)}
                        className={cn('w-5 h-5 rounded-full transition-transform border-2',
                          isActive ? 'border-primary scale-125' : 'border-transparent hover:scale-110')}
                        style={{ background: WB_COLOR_HSL[c] }}
                        title={c} />
                    );
                  })}
                </StyleRow>
                <StyleRow label="선">
                  {WB_COLORS.map((c) => {
                    const isActive = element.borderColor === c;
                    return (
                      <button key={c} type="button" onClick={() => apply({ borderColor: c } as Partial<WBElement>)}
                        className={cn('w-5 h-5 rounded-full transition-transform border-2',
                          isActive ? 'border-primary scale-125' : 'border-transparent hover:scale-110')}
                        style={{ background: WB_COLOR_HSL[c] }}
                        title={c} />
                    );
                  })}
                </StyleRow>
                <StyleRow label="글색">
                  {WB_COLORS.map((c) => {
                    const isActive = element.textColor === c;
                    return (
                      <button key={c} type="button" onClick={() => apply({ textColor: c } as Partial<WBElement>)}
                        className={cn('w-5 h-5 rounded-full transition-transform border-2',
                          isActive ? 'border-primary scale-125' : 'border-transparent hover:scale-110')}
                        style={{ background: WB_COLOR_HSL[c] }}
                        title={c} />
                    );
                  })}
                </StyleRow>
                <StyleRow label="글자">
                  {([12, 14, 16, 18, 20, 24, 28, 32] as const).map((s) => (
                    <button key={s} type="button" onClick={() => apply({ fontSize: s } as Partial<WBElement>)}
                      className={cn('w-9 h-7 rounded text-[11px] font-medium transition-colors',
                        element.fontSize === s ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent')}
                    >{s}</button>
                  ))}
                </StyleRow>
                <StyleRow label="여백">
                  <input
                    type="range"
                    min={WB_TABLE_LIMITS.minPadding}
                    max={WB_TABLE_LIMITS.maxPadding}
                    step={1}
                    value={element.cellPadding ?? 10}
                    onChange={(e) => apply({ cellPadding: Number(e.target.value) } as Partial<WBElement>)}
                    className="flex-1"
                  />
                  <span className="text-[10.5px] tabular-nums text-muted-foreground w-8 text-right">{element.cellPadding ?? 10}px</span>
                </StyleRow>
              </>
            )}

            {/* 怨듯넻 ???щ챸??*/}
            <StyleRow label="투명도">
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={element.opacity}
                onChange={(e) => apply({ opacity: parseFloat(e.target.value) } as Partial<WBElement>)}
                className="flex-1"
              />
              <span className="text-[10.5px] tabular-nums text-muted-foreground w-8 text-right">{Math.round(element.opacity * 100)}%</span>
            </StyleRow>
          </FloatingCard>
        </div>
      )}
    </div>
  );
}

function StyleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10.5px] text-muted-foreground/80 w-10 shrink-0">{label}</span>
      <div className="flex items-center gap-1 flex-wrap flex-1">{children}</div>
    </div>
  );
}

function NumberStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const set = (next: number) => onChange(clamp(next, min, max));
  return (
    <div className="inline-flex h-8 items-center rounded-md border border-[hsl(var(--hairline))] bg-card/80">
      <span className="px-2 text-[11px] font-medium text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => set(value - 1)}
        className="h-7 w-7 text-muted-foreground hover:bg-accent hover:text-foreground"
        title={`${label} 줄이기`}
      >
        -
      </button>
      <input
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="h-7 w-8 bg-transparent text-center text-[12px] font-semibold tabular-nums outline-none"
        aria-label={label}
      />
      <button
        type="button"
        onClick={() => set(value + 1)}
        className="h-7 w-7 text-muted-foreground hover:bg-accent hover:text-foreground"
        title={`${label} 늘리기`}
      >
        +
      </button>
    </div>
  );
}

function TogglePill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-7 rounded-md px-2.5 text-[11px] font-semibold transition-colors',
        active ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

function AlignBtn({ axis, onClick }: { axis: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom' | 'dist-h' | 'dist-v'; onClick: () => void }) {
  const label = {
    left: '왼쪽 정렬', 'center-h': '가로 중앙', right: '오른쪽 정렬',
    top: '상단 정렬', 'center-v': '세로 중앙', bottom: '하단 정렬',
    'dist-h': '가로 균등 분배', 'dist-v': '세로 균등 분배',
  }[axis];
  // SVG ?꾩씠肄???媛꾨떒???쒓컖 ?쒗쁽
  const svg = (() => {
    switch (axis) {
      case 'left':     return <><line x1="3" y1="3" x2="3" y2="21" stroke="currentColor" strokeWidth="1.5"/><rect x="4" y="6" width="10" height="4" rx="0.5" fill="currentColor"/><rect x="4" y="14" width="14" height="4" rx="0.5" fill="currentColor"/></>;
      case 'right':    return <><line x1="21" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="6" width="10" height="4" rx="0.5" fill="currentColor"/><rect x="6" y="14" width="14" height="4" rx="0.5" fill="currentColor"/></>;
      case 'center-h': return <><line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/><rect x="7" y="6" width="10" height="4" rx="0.5" fill="currentColor"/><rect x="5" y="14" width="14" height="4" rx="0.5" fill="currentColor"/></>;
      case 'top':      return <><line x1="3" y1="3" x2="21" y2="3" stroke="currentColor" strokeWidth="1.5"/><rect x="6" y="4" width="4" height="10" rx="0.5" fill="currentColor"/><rect x="14" y="4" width="4" height="14" rx="0.5" fill="currentColor"/></>;
      case 'bottom':   return <><line x1="3" y1="21" x2="21" y2="21" stroke="currentColor" strokeWidth="1.5"/><rect x="6" y="10" width="4" height="10" rx="0.5" fill="currentColor"/><rect x="14" y="6" width="4" height="14" rx="0.5" fill="currentColor"/></>;
      case 'center-v': return <><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/><rect x="6" y="7" width="4" height="10" rx="0.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="0.5" fill="currentColor"/></>;
      case 'dist-h':   return <><rect x="3" y="7" width="4" height="10" rx="0.5" fill="currentColor"/><rect x="10" y="7" width="4" height="10" rx="0.5" fill="currentColor"/><rect x="17" y="7" width="4" height="10" rx="0.5" fill="currentColor"/></>;
      case 'dist-v':   return <><rect x="7" y="3" width="10" height="4" rx="0.5" fill="currentColor"/><rect x="7" y="10" width="10" height="4" rx="0.5" fill="currentColor"/><rect x="7" y="17" width="10" height="4" rx="0.5" fill="currentColor"/></>;
    }
  })();
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-10 h-10 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      title={label}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">{svg}</svg>
    </button>
  );
}

function PanelBtn({ icon, label, onClick }: { icon: 'bringToFront' | 'bringForward' | 'sendBackward' | 'sendToBack'; label: string; onClick: () => void }) {
  const path = (() => {
    switch (icon) {
      case 'bringToFront':  return <><rect x="3" y="3" width="12" height="12" rx="1" fill="currentColor" opacity="0.3"/><rect x="9" y="9" width="12" height="12" rx="1" fill="currentColor"/></>;
      case 'bringForward':  return <><rect x="3" y="3" width="12" height="12" rx="1"/><rect x="9" y="9" width="12" height="12" rx="1" fill="currentColor"/></>;
      case 'sendBackward':  return <><rect x="3" y="3" width="12" height="12" rx="1" fill="currentColor"/><rect x="9" y="9" width="12" height="12" rx="1"/></>;
      case 'sendToBack':    return <><rect x="3" y="3" width="12" height="12" rx="1" fill="currentColor"/><rect x="9" y="9" width="12" height="12" rx="1" fill="currentColor" opacity="0.3"/></>;
    }
  })();
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-10 h-10 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      title={label}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">{path}</svg>
    </button>
  );
}

function isBindableElement(el: WBElement): boolean {
  return el.type !== 'line' && el.type !== 'arrow' && el.type !== 'freedraw';
}

function sidePoint(el: WBElement, side: 'right' | 'bottom' | 'left' | 'top'): { x: number; y: number } {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const angle = el.angle ?? 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  let lx = 0;
  let ly = 0;
  switch (side) {
    case 'right':
      lx = el.w / 2;
      break;
    case 'left':
      lx = -el.w / 2;
      break;
    case 'bottom':
      ly = el.h / 2;
      break;
    case 'top':
      ly = -el.h / 2;
      break;
  }
  return {
    x: cx + lx * cos - ly * sin,
    y: cy + lx * sin + ly * cos,
  };
}

function oppositeSide(side: 'right' | 'bottom' | 'left' | 'top'): 'right' | 'bottom' | 'left' | 'top' {
  return side === 'right' ? 'left' : side === 'left' ? 'right' : side === 'bottom' ? 'top' : 'bottom';
}

function offsetPoint(point: { x: number; y: number }, side: 'right' | 'bottom' | 'left' | 'top', amount: number): { x: number; y: number } {
  if (side === 'right') return { x: point.x + amount, y: point.y };
  if (side === 'left') return { x: point.x - amount, y: point.y };
  if (side === 'bottom') return { x: point.x, y: point.y + amount };
  return { x: point.x, y: point.y - amount };
}

function computeSpacingSnap(
  dragRect: { x: number; y: number; w: number; h: number },
  others: WBElement[],
  zoom: number,
): { dx: number; dy: number; guides: Guide[] } {
  const threshold = 6 / zoom;
  const boxes = others
    .filter((el) => el.type !== 'line' && el.type !== 'arrow' && el.type !== 'freedraw')
    .map(rotatedAABB);
  let bestX: { dx: number; guide: Guide } | null = null;
  let bestY: { dy: number; guide: Guide } | null = null;

  for (const left of boxes) {
    for (const right of boxes) {
      if (left === right) continue;
      const gap = right.x - (left.x + left.w);
      if (gap <= 0) continue;
      const verticalOverlap = Math.min(left.y + left.h, right.y + right.h, dragRect.y + dragRect.h) - Math.max(left.y, right.y, dragRect.y);
      if (verticalOverlap > -24 / zoom) {
        const targets = [left.x + left.w + gap, right.x - gap - dragRect.w];
        for (const targetX of targets) {
          const dx = targetX - dragRect.x;
          if (Math.abs(dx) <= threshold && (!bestX || Math.abs(dx) < Math.abs(bestX.dx))) {
            const y = Math.min(left.y + left.h / 2, right.y + right.h / 2, dragRect.y + dragRect.h / 2);
            bestX = {
              dx,
              guide: { axis: 'h', pos: y, from: Math.min(left.x, targetX), to: Math.max(right.x + right.w, targetX + dragRect.w) },
            };
          }
        }
      }
    }
  }

  for (const top of boxes) {
    for (const bottom of boxes) {
      if (top === bottom) continue;
      const gap = bottom.y - (top.y + top.h);
      if (gap <= 0) continue;
      const horizontalOverlap = Math.min(top.x + top.w, bottom.x + bottom.w, dragRect.x + dragRect.w) - Math.max(top.x, bottom.x, dragRect.x);
      if (horizontalOverlap > -24 / zoom) {
        const targets = [top.y + top.h + gap, bottom.y - gap - dragRect.h];
        for (const targetY of targets) {
          const dy = targetY - dragRect.y;
          if (Math.abs(dy) <= threshold && (!bestY || Math.abs(dy) < Math.abs(bestY.dy))) {
            const x = Math.min(top.x + top.w / 2, bottom.x + bottom.w / 2, dragRect.x + dragRect.w / 2);
            bestY = {
              dy,
              guide: { axis: 'v', pos: x, from: Math.min(top.y, targetY), to: Math.max(bottom.y + bottom.h, targetY + dragRect.h) },
            };
          }
        }
      }
    }
  }

  return {
    dx: bestX?.dx ?? 0,
    dy: bestY?.dy ?? 0,
    guides: [bestX?.guide, bestY?.guide].filter(Boolean) as Guide[],
  };
}

function hitArrowEndpoint(el: WBArrow, wp: { x: number; y: number }, zoom: number): 'start' | 'end' | null {
  if (el.points.length < 2) return null;
  const threshold = 12 / zoom;
  const start = el.points[0];
  const end = el.points[el.points.length - 1];
  const ds = Math.hypot(wp.x - start[0], wp.y - start[1]);
  const de = Math.hypot(wp.x - end[0], wp.y - end[1]);
  if (ds <= threshold) return 'start';
  if (de <= threshold) return 'end';
  return null;
}

function lineBBoxPatch<T extends WBLine | WBArrow>(el: T, points: Array<[number, number]>): T {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    ...el,
    points,
    x,
    y,
    w: Math.max(...xs) - x || 1,
    h: Math.max(...ys) - y || 1,
  };
}

function resizeBoxFromHandle(
  box: { x: number; y: number; w: number; h: number },
  handle: ResizeHandle,
  dx: number,
  dy: number,
  lockRatio: boolean,
  fromCenter: boolean,
): { x: number; y: number; w: number; h: number } {
  const minSize = 10;
  const { x, y, w, h } = box;
  let newX = x, newY = y, newW = w, newH = h;
  switch (handle) {
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
    const aspect = w / Math.max(1, h);
    if (Math.abs(newW / Math.max(1, w)) > Math.abs(newH / Math.max(1, h))) newH = newW / aspect;
    else newW = newH * aspect;
  }
  if (fromCenter) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    newX = cx - newW / 2;
    newY = cy - newH / 2;
  }
  return { x: newX, y: newY, w: newW, h: newH };
}

function syncFrameChildren(elements: WBElement[]): WBElement[] {
  const frames = elements.filter((el): el is WBFrame => el.type === 'frame');
  if (frames.length === 0) return elements;
  return elements.map((el) => {
    if (el.type !== 'frame') return el;
    const childIds = elements
      .filter((other) => other.id !== el.id && other.type !== 'frame')
      .filter((other) => {
        const cx = other.x + other.w / 2;
        const cy = other.y + other.h / 2;
        return cx >= el.x && cx <= el.x + el.w && cy >= el.y && cy <= el.y + el.h;
      })
      .map((other) => other.id);
    if (childIds.join('|') === el.childIds.join('|')) return el;
    return { ...el, childIds, updatedAt: Date.now() };
  }) as WBElement[];
}

function buildBoardThumbnail(elements: WBElement[], bgColor: 'cream' | 'white' | 'dark'): string | undefined {
  if (elements.length === 0) return undefined;
  const bb = unionBBox(elements);
  if (!bb) return undefined;
  const pad = 24;
  const viewBox = `${bb.x - pad} ${bb.y - pad} ${bb.w + pad * 2} ${bb.h + pad * 2}`;
  const bg = bgColor === 'white' ? 'white' : bgColor === 'dark' ? 'hsl(220 10% 14%)' : 'hsl(40 25% 97%)';
  const rects = elements.slice(0, 80).map((el) => {
    const fill = el.type === 'sticky'
      ? WB_STICKY_BG[el.color].bg
      : el.type === 'table'
        ? 'hsl(142 70% 45% / 0.16)'
      : el.type === 'frame'
        ? 'transparent'
        : 'hsl(217 91% 55% / 0.28)';
    const stroke = el.type === 'frame' ? 'hsl(0 0% 45%)' : 'hsl(217 25% 35% / 0.35)';
    return `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="${viewBox}"><rect x="${bb.x - pad}" y="${bb.y - pad}" width="${bb.w + pad * 2}" height="${bb.h + pad * 2}" fill="${bg}"/>${rects}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function outlineKind(el: WBElement): string {
  if (el.type === 'frame') return '프레임';
  if (el.type === 'table') return '표';
  if (el.type === 'sticky') return '스티키';
  if (el.type === 'text') return '텍스트';
  if (el.type === 'arrow') return '선';
  return '도형';
}

function outlineLabel(el: WBElement): string {
  if (el.type === 'frame') return el.name || '프레임';
  if (el.type === 'table') return '표';
  if (el.type === 'sticky') return el.content || '빈 스티키';
  if (el.type === 'text') return el.content || '빈 텍스트';
  if (el.type === 'arrow') return el.label || '화살표';
  if ('text' in el) return el.text || '도형';
  return '요소';
}

function arrowMidpoint(element: WBElement): { x: number; y: number } {
  if (element.type !== 'arrow' || element.points.length < 2) {
    return { x: element.x + element.w / 2, y: element.y + element.h / 2 };
  }
  const start = element.points[0];
  const end = element.points[element.points.length - 1];
  return { x: (start[0] + end[0]) / 2, y: (start[1] + end[1]) / 2 };
}

// ??????????????????????????????????????????
// ?고겢由?而⑦뀓?ㅽ듃 硫붾돱
function ContextMenu({
  x,
  y,
  ids,
  elements,
  onClose,
  onDuplicate,
  onCopy,
  onPaste,
  onCut,
  onSelectAll,
  onAddSticky,
  onAddText,
  onOpenTemplates,
  onFitView,
  onChangeZ,
  onToggleLock,
  onDelete,
}: {
  x: number;
  y: number;
  ids: string[];
  boardId: string;
  elements: WBElement[];
  onClose: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onCut: () => void;
  onSelectAll: () => void;
  onAddSticky: () => void;
  onAddText: () => void;
  onOpenTemplates: () => void;
  onFitView: () => void;
  onChangeZ: (mode: 'front' | 'back' | 'forward' | 'backward') => void;
  onToggleLock: () => void;
  onDelete: () => void;
}) {
  const targets = elements.filter((el) => ids.includes(el.id));
  const isLocked = targets.some((el) => el.locked);
  const isSticky = targets.length === 1 && targets[0].type === 'sticky';
  const empty = ids.length === 0;

  // ?몃? ?대┃ ???リ린
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-wb-context-menu]')) onClose();
    };
    window.addEventListener('pointerdown', onDocDown);
    return () => window.removeEventListener('pointerdown', onDocDown);
  }, [onClose]);

  return (
    <div
      data-wb-context-menu
      className="fixed z-50 bg-card border border-[hsl(var(--hairline))] rounded-md shadow-lg py-1 min-w-[200px]"
      style={{ left: x, top: y }}
    >
      {empty ? (
        <>
          <CMItem onClick={onAddSticky} label="스티키 추가" shortcut="S" />
          <CMItem onClick={onAddText} label="텍스트 추가" shortcut="T" />
          <CMItem onClick={onOpenTemplates} label="템플릿" />
          <CMSep />
          <CMItem onClick={onPaste}    label="붙여넣기" shortcut="Ctrl+V" />
          <CMItem onClick={onFitView} label="전체 보기" />
          <CMItem onClick={onSelectAll} label="전체 선택" shortcut="Ctrl+A" />
        </>
      ) : (
        <>
          <CMItem onClick={onDuplicate} label="복제" shortcut="Ctrl+D" />
          <CMItem onClick={onCopy}      label="복사" shortcut="Ctrl+C" />
          <CMItem onClick={onCut}       label="잘라내기" shortcut="Ctrl+X" />
          <CMItem onClick={onPaste}     label="붙여넣기" shortcut="Ctrl+V" />
          <CMSep />
          <CMItem onClick={() => onChangeZ('front')}    label="맨 앞으로" shortcut="Ctrl+]" />
          <CMItem onClick={() => onChangeZ('forward')}  label="앞으로" shortcut="]" />
          <CMItem onClick={() => onChangeZ('backward')} label="뒤로" shortcut="[" />
          <CMItem onClick={() => onChangeZ('back')}     label="맨 뒤로" shortcut="Ctrl+[" />
          <CMSep />
          <CMItem onClick={onToggleLock} label={isLocked ? '잠금 해제' : '잠금'} shortcut="Ctrl+L" />
          {isSticky && (
            <>
              <CMSep />
              {/* Phase 3 ?듯빀 ?먮━?≪씠 ??鍮꾪솢??*/}
              <CMItem disabled label="메모로 보내기" hint="준비 중" />
              <CMItem disabled label="위키 페이지로 변환" hint="준비 중" />
              <CMItem disabled label="플래너 할 일로 보내기" hint="준비 중" />
            </>
          )}
          <CMSep />
          <CMItem onClick={onDelete} label="삭제" shortcut="Del" danger />
        </>
      )}
    </div>
  );
}

function CMItem({
  onClick,
  label,
  shortcut,
  hint,
  danger,
  disabled,
}: {
  onClick?: () => void;
  label: string;
  shortcut?: string;
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-1.5 text-[12.5px] text-left transition-colors',
        disabled
          ? 'text-muted-foreground/40 cursor-not-allowed'
          : danger
            ? 'text-destructive hover:bg-destructive/10'
            : 'text-foreground hover:bg-accent',
      )}
    >
      <span className="flex-1 truncate">{label}</span>
      {shortcut && !disabled && <span className="text-[10px] font-mono text-muted-foreground/70">{shortcut}</span>}
      {hint && <span className="text-[10px] text-muted-foreground/60">{hint}</span>}
    </button>
  );
}

function CMSep() {
  return <div className="my-1 h-px bg-[hsl(var(--hairline))]" aria-hidden />;
}

// ??????????????????????????????????????????
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

// ??????????????????????????????????????????
// ?ы띁
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function isRotatable(el: WBElement): boolean {
  return el.type !== 'line' && el.type !== 'arrow' && el.type !== 'freedraw';
}

function hitsRotationHandle(el: WBElement, wp: { x: number; y: number }, zoom: number): boolean {
  if (!isRotatable(el)) return false;
  const cx = el.x + el.w / 2;
  const hy = el.y - 24 / zoom;
  const TH = 10 / zoom;
  return Math.hypot(wp.x - cx, wp.y - hy) <= TH;
}

/** ?⑥씪 ?좏깮 ?붿냼 bbox 寃쎄퀎 洹쇱쿂硫??몃뱾 諛섑솚. */
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
  // 肄붾꼫 ?곗꽑 (?곸뿭 ???묒쓬)
  if (near(wp.x, x1) && near(wp.y, y1)) return 'nw';
  if (near(wp.x, x2) && near(wp.y, y1)) return 'ne';
  if (near(wp.x, x1) && near(wp.y, y2)) return 'sw';
  if (near(wp.x, x2) && near(wp.y, y2)) return 'se';
  // 蹂 ???ш컖???덉そ?댁뼱????
  if (wp.y >= y1 - TH && wp.y <= y2 + TH) {
    if (near(wp.x, x1)) return 'w';
    if (near(wp.x, x2)) return 'e';
  }
  if (wp.x >= x1 - TH && wp.x <= x2 + TH) {
    if (near(wp.y, y1)) return 'n';
    if (near(wp.y, y2)) return 's';
  }
  // ?뺥솗??以묒븰 蹂 (n, s)
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

// ??????????????????????????????????????????
// ?붿냼 ?⑺넗由?
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

function canvasInkColor(bgColor: 'cream' | 'white' | 'dark', color: WBColor): WBColor {
  if (bgColor !== 'dark') return color;
  return color === 'ink' || color === 'slate' ? 'amber' : color;
}

function makeText(pos: { x: number; y: number }, bgColor: 'cream' | 'white' | 'dark' = 'cream'): WBText {
  return {
    ...baseElement(pos.x, pos.y, 180, 32),
    type: 'text',
    content: '',
    fontSize: 16,
    fontFamily: 'sans',
    textColor: bgColor === 'dark' ? 'amber' : 'ink',
    textAlign: 'left',
  };
}

function makeShape(rect: { x: number; y: number; w: number; h: number }, tool: WBToolState, bgColor: 'cream' | 'white' | 'dark' = 'cream'): WBElement | null {
  const base = {
    ...baseElement(rect.x, rect.y, rect.w, rect.h),
    strokeColor: canvasInkColor(bgColor, tool.strokeColor),
    strokeWidth: 'normal' as const,
    strokeStyle: 'solid' as const,
    roughness: 0,
    fillColor: tool.fillColor,
    fillStyle: (tool.fillColor === 'none' ? 'none' : 'solid') as 'none' | 'solid',
  };
  switch (tool.shapeKind) {
    case 'rect':     return { ...base, type: 'rect', cornerRadius: 6 } as WBRect;
    case 'ellipse':  return { ...base, type: 'ellipse' };
    case 'diamond':  return { ...base, type: 'diamond' };
    case 'triangle': return { ...base, type: 'triangle' };
    case 'speech':   return { ...base, type: 'speech', tailDirection: 'bl' };
    case 'capsule':  return { ...base, type: 'capsule' };
    case 'database': return { ...base, type: 'database' };
    case 'document': return { ...base, type: 'document' };
    default:         return null;
  }
}

function makeLineOrArrow(
  start: { x: number; y: number },
  end: { x: number; y: number },
  arrow: boolean,
  tool: WBToolState,
  bgColor: 'cream' | 'white' | 'dark' = 'cream',
): WBLine | WBArrow {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  const points: Array<[number, number]> = [[start.x, start.y], [end.x, end.y]];
  const base = {
    ...baseElement(x, y, w || 1, h || 1),
    strokeColor: canvasInkColor(bgColor, tool.strokeColor),
    strokeWidth: 'normal' as const,
    strokeStyle: (tool.lineKind === 'arrow-dashed' ? 'dashed' : 'solid') as 'dashed' | 'solid',
    roughness: 0,
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

function makeFrame(rect: { x: number; y: number; w: number; h: number }, elements: WBElement[]): import('@/types/whiteboard').WBFrame {
  // ?덉뿉 ???붿냼 ?먮룞 ?깅줉
  const childIds: string[] = [];
  for (const el of elements) {
    if (el.type === 'frame') continue;
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    if (cx >= rect.x && cx <= rect.x + rect.w && cy >= rect.y && cy <= rect.y + rect.h) {
      childIds.push(el.id);
    }
  }
  const frameCount = elements.filter((e) => e.type === 'frame').length;
  return {
    ...baseElement(rect.x, rect.y, rect.w, rect.h),
    type: 'frame',
    name: `프레임 ${frameCount + 1}`,
    bgColor: 'transparent',
    childIds,
    clipChildren: false,
  };
}

function makeTablePack(center: { x: number; y: number }): WBElement[] {
  const rows = 4;
  const cols = 4;
  const table: WBTable = {
    ...baseElement(center.x - 280, center.y - 160, 560, 320),
    type: 'table',
    rows,
    cols,
    cells: createTableCells(rows, cols, true),
    cellStyles: [],
    headerRow: true,
    borderColor: 'slate',
    headerFill: 'green',
    textColor: 'ink',
    fontSize: 14,
    textAlign: 'left',
    cellPadding: 10,
    stripedRows: true,
  };
  return [table];
}

function makeTimelinePack(center: { x: number; y: number }, tool: WBToolState, bgColor: 'cream' | 'white' | 'dark'): WBElement[] {
  const frame = makeFrame({ x: center.x - 360, y: center.y - 160, w: 720, h: 320 }, []);
  frame.name = 'Timeline';
  const line = makeLineOrArrow(
    { x: frame.x + 80, y: center.y },
    { x: frame.x + frame.w - 80, y: center.y },
    false,
    { ...tool, strokeColor: 'green', lineKind: 'line' },
    bgColor,
  );
  line.id = newElementId();
  line.zIndex = 1;
  const nodes: WBElement[] = [line];
  const labels = ['Start', 'Milestone', 'Review', 'Launch'];
  for (let i = 0; i < labels.length; i += 1) {
    const x = frame.x + 86 + i * 184;
    const dot = {
      ...baseElement(x - 10, center.y - 10, 20, 20),
      type: 'ellipse',
      strokeColor: 'green',
      strokeWidth: 'normal',
      strokeStyle: 'solid',
      roughness: 0,
      fillColor: 'green',
      fillStyle: 'solid',
      zIndex: 2 + i * 2,
    } as WBElement;
    const label = makeText({ x: x - 54, y: center.y + 28 }, bgColor);
    label.content = labels[i];
    label.w = 108;
    label.h = 32;
    label.fontSize = 14;
    label.textAlign = 'center';
    label.zIndex = 3 + i * 2;
    nodes.push(dot, label);
  }
  frame.childIds = nodes.map((el) => el.id);
  return [frame, ...nodes];
}

function makeFreedraw(points: Array<[number, number]>, tool: WBToolState, bgColor: 'cream' | 'white' | 'dark' = 'cream'): WBFreedraw {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x || 1;
  const h = Math.max(...ys) - y || 1;
  return {
    ...baseElement(x, y, w, h),
    type: 'freedraw',
    strokeColor: canvasInkColor(bgColor, tool.penColor),
    strokeWidth: tool.penWidth,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 1,
    strokeSize: tool.penSize,
    points,
  };
}

// ??????????????????????????????????????????
// 洹몃━??以??꾩떆 ghost SVG
function renderGhost(interaction: Interaction, tool: WBToolState, elements: WBElement[], bgColor: 'cream' | 'white' | 'dark' = 'cream'): React.ReactNode {
  if (interaction.kind === 'creating') {
    const r = rectFromPoints(interaction.start, interaction.current);
    if (r.w < 1 || r.h < 1) return null;
    if (interaction.tool === 'frame') {
      const ghostEl = makeFrame(r, elements);
      return <g opacity={0.6}><WBElementRenderer el={ghostEl} /></g>;
    }
    const ghostEl = makeShape(r, tool, bgColor);
    if (!ghostEl) return null;
    return <g opacity={0.6}><WBElementRenderer el={ghostEl} /></g>;
  }
  if (interaction.kind === 'drawing-line') {
    const ghostEl = makeLineOrArrow(interaction.start, interaction.current, interaction.arrow, tool, bgColor);
    return <g opacity={0.7}><WBElementRenderer el={ghostEl} /></g>;
  }
  if (interaction.kind === 'pen' && interaction.points.length >= 2) {
    const ghostEl = makeFreedraw(interaction.points, tool, bgColor);
    return <WBElementRenderer el={ghostEl} />;
  }
  return null;
}

// ??????????????????????????????????????????
interface InlineEditorLayout {
  w: number;
  h: number;
}

function estimateInlineTextSize(value: string, fontSize: number, currentW: number, currentH: number): InlineEditorLayout {
  const lineHeight = fontSize * 1.4;
  const minW = 120;
  const maxW = 520;
  const paddingX = 14;
  const paddingY = 10;
  const lines = (value || '텍스트').split('\n');
  const measureLine = (line: string) => {
    let total = 0;
    for (const ch of line || ' ') {
      if (ch === ' ') total += fontSize * 0.35;
      else if (/[ -~]/.test(ch)) total += fontSize * 0.56;
      else total += fontSize * 0.92;
    }
    return total;
  };
  const rawW = Math.max(...lines.map(measureLine), minW - paddingX) + paddingX;
  const w = Math.max(minW, Math.min(maxW, Math.max(rawW, Math.min(currentW, maxW))));
  const usableW = Math.max(1, w - paddingX);
  const visualLines = lines.reduce((sum, line) => sum + Math.max(1, Math.ceil(measureLine(line) / usableW)), 0);
  const h = Math.max(Math.max(32, currentH), Math.ceil(visualLines * lineHeight + paddingY));
  return { w: Math.round(w), h: Math.round(h) };
}

function estimateStickySize(value: string, fontSize: number, currentW: number, currentH: number): InlineEditorLayout {
  const lineHeight = fontSize * 1.4;
  const minW = Math.max(10, Math.min(200, currentW));
  const maxW = Math.max(360, currentW);
  const minH = Math.max(10, Math.min(200, currentH));
  const maxH = Math.max(420, currentH);
  const paddingX = 24;
  const paddingY = 20;
  const lines = (value || ' ').split('\n');
  const measureLine = (line: string) => {
    let total = 0;
    for (const ch of line || ' ') {
      if (ch === ' ') total += fontSize * 0.35;
      else if (/[ -~]/.test(ch)) total += fontSize * 0.56;
      else total += fontSize * 0.92;
    }
    return total;
  };
  const longest = Math.max(...lines.map(measureLine), minW - paddingX);
  const w = Math.max(minW, Math.min(maxW, Math.max(currentW, longest + paddingX)));
  const usableW = Math.max(1, w - paddingX);
  const visualLines = lines.reduce((sum, line) => sum + Math.max(1, Math.ceil(measureLine(line) / usableW)), 0);
  const h = Math.max(minH, Math.min(maxH, Math.max(currentH, Math.ceil(visualLines * lineHeight + paddingY))));
  return { w: Math.round(w), h: Math.round(h) };
}

function InlineEditor({
  element,
  viewport,
  container,
  onCommit,
  onCommitNext,
  onCancel,
}: {
  element: WBElement;
  viewport: WBViewport;
  container: HTMLDivElement | null;
  onCommit: (content: string, layout?: InlineEditorLayout) => void;
  onCommitNext?: (content: string, layout?: InlineEditorLayout) => void;
  onCancel: () => void;
}) {
  const initial =
    element.type === 'sticky' ? element.content
    : element.type === 'text' ? element.content
    : element.type === 'arrow' ? element.label ?? ''
    : element.type === 'frame' ? element.name
    : ('text' in element ? element.text ?? '' : '');
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  // ?쒓? IME 吏꾪뻾 ?щ?
  const composingRef = useRef(false);
  const isFrameNameEdit = element.type === 'frame';
  const fontSize =
    element.type === 'sticky' ? element.fontSize
    : element.type === 'text' ? element.fontSize
    : element.type === 'arrow' ? 12
    : isFrameNameEdit ? 12
    : ('fontSize' in element ? element.fontSize ?? 16 : 16);
  const [editorSize, setEditorSize] = useState(() =>
    element.type === 'text'
      ? estimateInlineTextSize(initial, fontSize, element.w, element.h)
      : element.type === 'sticky'
        ? estimateStickySize(initial, fontSize, element.w, element.h)
      : { w: element.w, h: element.h },
  );

  useEffect(() => {
    ref.current?.focus();
    if (initial) ref.current?.select();
  }, [initial]);

  useEffect(() => {
    if (element.type === 'text') {
      setEditorSize(estimateInlineTextSize(value, fontSize, element.w, element.h));
    } else if (element.type === 'sticky') {
      setEditorSize(estimateStickySize(value, fontSize, element.w, element.h));
    }
  }, [element.h, element.type, element.w, fontSize, value]);

  if (!container) return null;
  // ?꾨젅?꾩? ???쇰꺼 ?곸뿭?먯꽌 ?몄쭛 (?ш컖???대?媛 ?꾨땲???곷떒)
  const sx = isFrameNameEdit
    ? (element.x + 8 - viewport.x) * viewport.zoom
    : element.type === 'arrow'
      ? (arrowMidpoint(element).x - 60 - viewport.x) * viewport.zoom
    : (element.x - viewport.x) * viewport.zoom;
  const sy = isFrameNameEdit
    ? (element.y + 3 - viewport.y) * viewport.zoom
    : element.type === 'arrow'
      ? (arrowMidpoint(element).y - 14 - viewport.y) * viewport.zoom
    : (element.y - viewport.y) * viewport.zoom;
  const sw = (isFrameNameEdit ? Math.max(1, element.w - 16) : element.w) * viewport.zoom;
  const sh = isFrameNameEdit ? 24 * viewport.zoom : element.h * viewport.zoom;

  // ?ㅽ떚?ㅻ㈃ ?덉そ ?⑤뵫
  const padding = element.type === 'sticky' ? 12 : isFrameNameEdit || element.type === 'arrow' ? 2 : 4;
  const tone =
    element.type === 'sticky'
      ? WB_STICKY_BG[element.color]
    : isFrameNameEdit
        ? { bg: 'hsl(40 30% 99%)', border: 'transparent', text: 'hsl(var(--foreground) / 0.75)' }
    : element.type === 'arrow'
        ? { bg: 'hsl(var(--card) / 0.92)', border: 'transparent', text: WB_COLOR_HSL[element.strokeColor] }
        : { bg: 'transparent', border: 'transparent', text: element.type === 'text' ? WB_COLOR_HSL[element.textColor] : 'hsl(0 0% 15%)' };
  const editorW = element.type === 'text'
    ? editorSize.w * viewport.zoom
    : element.type === 'sticky' ? Math.max(1, editorSize.w * viewport.zoom - padding * 2)
    : element.type === 'arrow' ? 120 * viewport.zoom : Math.max(1, sw - padding * 2);
  const editorH = element.type === 'text'
    ? editorSize.h * viewport.zoom
    : element.type === 'sticky' ? Math.max(1, editorSize.h * viewport.zoom - padding * 2)
    : element.type === 'arrow' ? 28 * viewport.zoom : Math.max(1, sh - padding * 2);
  const editorOutline =
    element.type === 'text'
      ? 'none'
      : '2px solid hsl(217 91% 55% / 0.45)';
  const commit = () => {
    onCommit(value, element.type === 'text' || element.type === 'sticky' ? editorSize : undefined);
  };

  return (
    <textarea
      data-wb-inline-editor="true"
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onCompositionStart={() => { composingRef.current = true; }}
      onCompositionEnd={() => { composingRef.current = false; }}
      onKeyDown={(e) => {
        // ?쒓? IME 吏꾪뻾 以?Enter/Esc 臾댁떆
        if (composingRef.current || e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        } else if (e.key === 'Tab' && onCommitNext) {
          e.preventDefault();
          onCommitNext(value, element.type === 'text' || element.type === 'sticky' ? editorSize : undefined);
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          commit();
        }
        // 罹붾쾭???⑥텞??李⑤떒
        e.stopPropagation();
      }}
      onBlur={commit}
      style={{
        position: 'absolute',
        left: sx + padding,
        top: sy + padding,
        width: editorW,
        height: editorH,
        background: tone.bg,
        border: 'none',
        outline: editorOutline,
        outlineOffset: 2,
        borderRadius: element.type === 'text' ? 0 : 4,
        padding: element.type === 'text' ? '5px 7px' : 4,
        color: tone.text,
        caretColor: 'hsl(217 91% 55%)',
        fontSize: fontSize * viewport.zoom,
        fontFamily: 'inherit',
        textAlign: element.type === 'sticky' || element.type === 'text' ? (element as { textAlign?: 'left' | 'center' | 'right' }).textAlign ?? 'left' : 'center',
        resize: 'none',
        lineHeight: 1.4,
        overflow: 'hidden',
        zIndex: 30,    // DropdownMenu/Dialog 蹂대떎 ??쾶
        // ?뚯쟾???붿냼硫?textarea ??媛숈씠 ?뚯쟾
        transform: element.angle ? `rotate(${(element.angle * 180) / Math.PI}deg)` : undefined,
        transformOrigin: 'center center',
      }}
      placeholder={element.type === 'sticky' ? '내용을 입력하세요' : '텍스트'}
    />
  );
}

function TableCellEditor({
  table,
  cellIndex,
  viewport,
  container,
  onCommit,
  onCancel,
}: {
  table: WBTable;
  cellIndex: number;
  viewport: WBViewport;
  container: HTMLDivElement | null;
  onCommit: (value: string, nextIndex?: number) => void;
  onCancel: () => void;
}) {
  const cell = getTableCellRect(table, cellIndex);
  const initial = table.cells[cellIndex] ?? '';
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const composingRef = useRef(false);
  const committedRef = useRef(false);
  const padding = Math.max(WB_TABLE_LIMITS.minPadding, Math.min(WB_TABLE_LIMITS.maxPadding, table.cellPadding ?? 10));

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  if (!container || !cell) return null;

  const commit = (nextIndex?: number) => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(value, nextIndex);
  };
  const nextCell = (direction: 1 | -1) => {
    const next = cellIndex + direction;
    return next >= 0 && next < table.rows * table.cols ? next : undefined;
  };
  const downCell = () => {
    const next = cellIndex + table.cols;
    return next < table.rows * table.cols ? next : undefined;
  };

  const sx = (cell.x - viewport.x) * viewport.zoom;
  const sy = (cell.y - viewport.y) * viewport.zoom;
  const sw = cell.w * viewport.zoom;
  const sh = cell.h * viewport.zoom;
  const safePadding = Math.min(padding, Math.max(3, cell.w / 5), Math.max(3, cell.h / 5)) * viewport.zoom;
  const isHeader = table.headerRow && cell.row === 0;
  const cellStyle = table.cellStyles?.[cellIndex];
  const align = cellStyle?.textAlign ?? table.textAlign ?? 'left';
  const fill = cellStyle?.fillColor && cellStyle.fillColor !== 'none'
    ? WB_COLOR_HSL[cellStyle.fillColor]?.replace('hsl(', 'hsla(').replace(')', ' / 0.2)')
    : 'hsl(var(--card) / 0.98)';

  return (
    <textarea
      data-wb-inline-editor="true"
      data-wb-table-cell-editor="true"
      aria-label={`표 셀 편집 ${cell.row + 1}행 ${cell.col + 1}열`}
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onCompositionStart={() => { composingRef.current = true; }}
      onCompositionEnd={() => { composingRef.current = false; }}
      onKeyDown={(e) => {
        if (composingRef.current || e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
          return;
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          commit(nextCell(e.shiftKey ? -1 : 1));
          return;
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          commit();
          return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          commit(downCell());
          return;
        }
        e.stopPropagation();
      }}
      onBlur={() => commit()}
      style={{
        position: 'absolute',
        left: sx + safePadding,
        top: sy + safePadding * 0.7,
        width: Math.max(24, sw - safePadding * 2),
        height: Math.max(24, sh - safePadding * 1.4),
        background: fill,
        border: '1px solid hsl(217 91% 55% / 0.55)',
        outline: '2px solid hsl(217 91% 55% / 0.25)',
        outlineOffset: 1,
        borderRadius: 5,
        padding: '5px 7px',
        color: WB_COLOR_HSL[cellStyle?.textColor ?? table.textColor] ?? 'hsl(var(--foreground))',
        caretColor: 'hsl(217 91% 55%)',
        fontSize: table.fontSize * viewport.zoom,
        fontFamily: 'inherit',
        fontWeight: cellStyle?.bold || isHeader ? 700 : 500,
        fontStyle: cellStyle?.italic ? 'italic' : 'normal',
        textAlign: isHeader && !cellStyle?.textAlign ? 'center' : align,
        resize: 'none',
        lineHeight: 1.25,
        overflow: 'auto',
        zIndex: 31,
        transform: table.angle ? `rotate(${(table.angle * 180) / Math.PI}deg)` : undefined,
        transformOrigin: 'center center',
      }}
      placeholder="셀 내용"
    />
  );
}
