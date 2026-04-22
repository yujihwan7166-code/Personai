import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, MoreHorizontal, Folder as FolderIcon, ArrowLeft,
  Search, SlidersHorizontal, Star, X, Upload,
  FileText,
  Link2, Youtube, Mic, ClipboardList,
} from 'lucide-react';
import type { StudyNotebook, StudyFolder, StudySource } from '@/types/study';
import { createEmptyNotebook, countDueCards, FOLDER_COLORS } from '@/types/study';
import { filesToStudySources } from '@/lib/studySourceFromFile';
import { IconPicker } from './IconPicker';
import { cn } from '@/lib/utils';
import { confirmDialog } from '@/lib/confirmDialog';
import { toast } from '@/hooks/use-toast';
import { isSampleNotebook } from '@/lib/studySamples';

interface Props {
  notebooks: StudyNotebook[];
  folders: StudyFolder[];
  onSelect: (id: string) => void;
  onCreate: (nb: StudyNotebook, folderId?: string) => void;
  onUpdate: (nb: StudyNotebook) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onSetFolderColor: (id: string, color?: string) => void;
  onMoveNotebook: (id: string, folderId?: string) => void;
  onTogglePin: (id: string) => void;
}

type SortMode = 'recent' | 'name' | 'sources';

const SORT_LABELS: Record<SortMode, string> = {
  recent: '최근 순',
  name: '이름 순',
  sources: '소스 많은 순',
};

const SOURCE_KIND_META = {
  pdf: { label: 'PDF', icon: FileText },
  paste: { label: '텍스트', icon: ClipboardList },
  url: { label: '웹', icon: Link2 },
  youtube: { label: '영상', icon: Youtube },
  recording: { label: '녹음', icon: Mic },
} as const;

export function StudyHome({
  notebooks, folders, onSelect, onCreate, onUpdate,
  onCreateFolder, onRenameFolder, onDeleteFolder, onSetFolderColor, onMoveNotebook, onTogglePin,
}: Props) {
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null); // null = 전체
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sort, setSort] = useState<SortMode>(() => {
    if (typeof window === 'undefined') return 'recent';
    const saved = localStorage.getItem('study_home_sort');
    return saved === 'recent' || saved === 'name' || saved === 'sources' ? saved : 'recent';
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem('study_home_sort', sort); }, [sort]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      const typing = tgt && /input|textarea/i.test(tgt.tagName);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const activeFolder = activeFolderId ? folders.find((f) => f.id === activeFolderId) : null;

  const visibleNotebooks = useMemo(() => {
    let arr: StudyNotebook[];
    if (activeFolderId === null) {
      arr = notebooks.filter((n) => !n.folderId);
    } else {
      arr = notebooks.filter((n) => n.folderId === activeFolderId);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter((n) => {
        if (n.title.toLowerCase().includes(q)) return true;
        if ((n.description ?? '').toLowerCase().includes(q)) return true;
        if (n.sources.some((s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q))) return true;
        return false;
      });
    }
    if (sort === 'recent') arr.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);
    else if (sort === 'name') arr.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.title.localeCompare(b.title));
    else if (sort === 'sources') arr.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.sources.length - a.sources.length);
    return arr;
  }, [notebooks, activeFolderId, query, sort]);

  const foldersWithCounts = useMemo(() => {
    return folders.map((f) => ({
      folder: f,
      count: notebooks.filter((n) => n.folderId === f.id).length,
    }));
  }, [folders, notebooks]);

  const handleCreateFolder = () => {
    const name = prompt('새 폴더 이름');
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (folders.some((f) => f.name === trimmed)) {
      toast({ title: '중복된 이름', description: '이미 있는 폴더 이름이에요.' });
      return;
    }
    onCreateFolder(trimmed);
  };

  const handleCreateNotebook = (title: string, initialSources: StudySource[]) => {
    const nb = createEmptyNotebook(title || '새 노트북', '📘');
    if (initialSources.length > 0) {
      nb.sources = [...initialSources, ...nb.sources];
    }
    const folderId = activeFolderId ?? undefined;
    onCreate(nb, folderId);
    setShowCreateModal(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-10 pb-20">
      {/* 상단: 타이틀 or 브레드크럼 + 우측 툴 */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {activeFolder ? (
            <>
              <button
                onClick={() => setActiveFolderId(null)}
                className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> 전체
              </button>
              <span className="text-slate-300">/</span>
              <h1 className="text-[22px] font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {activeFolder.name}
              </h1>
              <span className="text-[11px] text-slate-400 tabular-nums">{visibleNotebooks.length}개</span>
            </>
          ) : (
            <>
              <h1 className="text-[22px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">공부 도우미</h1>
              <span className="text-[11px] text-slate-400 tabular-nums ml-1">{notebooks.length}개</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <SearchControl
            query={query}
            setQuery={setQuery}
            open={searchOpen}
            setOpen={setSearchOpen}
            inputRef={searchInputRef}
          />
          {notebooks.length >= 2 && <SortControl sort={sort} setSort={setSort} />}
          <ToolbarAddButton
            canAddFolder={!activeFolder}
            onNewNotebook={() => setShowCreateModal(true)}
            onNewFolder={handleCreateFolder}
          />
        </div>
      </div>

      <div
          onDragOver={(e) => {
            if (!activeFolder) return;
            e.preventDefault();
            if (e.dataTransfer.types.includes('application/x-study-nb')) setDragOverRoot(true);
          }}
          onDragLeave={() => setDragOverRoot(false)}
          onDrop={(e) => {
            if (!activeFolder) return;
            e.preventDefault();
            setDragOverRoot(false);
            const nbId = e.dataTransfer.getData('application/x-study-nb');
            if (nbId) onMoveNotebook(nbId, undefined);
          }}
          className={cn('rounded-xl transition-colors',
            dragOverRoot && 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-950',
          )}
        >
          {activeFolder && dragOverRoot && (
            <p className="mb-2 text-[11.5px] text-indigo-600 font-semibold text-center">이 폴더에서 빼내기</p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 gap-2 items-start">
            {/* 폴더 카드들 — 루트(전체) 뷰에서만 */}
            {!activeFolder && foldersWithCounts.map(({ folder, count }) => (
              <FolderTile
                key={folder.id}
                folder={folder}
                count={count}
                active={false}
                dragOver={dragOverFolderId === folder.id}
                onOpen={() => setActiveFolderId(folder.id)}
                onRename={() => {
                  const name = prompt('폴더 이름 바꾸기', folder.name);
                  if (name) onRenameFolder(folder.id, name);
                }}
                onDelete={async () => {
                  const ok = await confirmDialog({
                    title: `폴더 "${folder.name}"를 삭제할까요?`,
                    description: '안의 노트북은 미분류로 이동합니다.',
                    confirmLabel: '삭제',
                    tone: 'danger',
                  });
                  if (ok) onDeleteFolder(folder.id);
                }}
                onColorChange={(color) => onSetFolderColor(folder.id, color)}
                onDragEnter={() => setDragOverFolderId(folder.id)}
                onDragLeave={() => setDragOverFolderId(null)}
                onDropNotebook={(nbId) => {
                  onMoveNotebook(nbId, folder.id);
                  setDragOverFolderId(null);
                }}
              />
            ))}


            {/* 노트북 카드들 */}
            {visibleNotebooks.map((nb) => (
              <NotebookTile
                key={nb.id}
                nb={nb}
                folders={folders}
                onSelect={() => onSelect(nb.id)}
                onUpdate={onUpdate}
                onMove={(folderId) => onMoveNotebook(nb.id, folderId)}
                onTogglePin={() => onTogglePin(nb.id)}
              />
            ))}
          </div>

          {visibleNotebooks.length === 0 && (query || activeFolder) && (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 px-5 py-10 text-center">
              <p className="text-[13px] text-slate-700 dark:text-slate-300 font-medium">노트북이 없어요</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {query ? '검색어를 바꾸거나 지워 보세요.' : '위 "신규"로 만들거나 다른 노트북을 드래그해 옮겨 주세요.'}
              </p>
              {query && (
                <button onClick={() => setQuery('')} className="mt-3 text-[11.5px] text-indigo-600 hover:text-indigo-700">
                  검색 지우기
                </button>
              )}
            </div>
          )}
        </div>

      {showCreateModal && (
        <NotebookCreateModal onSubmit={handleCreateNotebook} onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

/* ── 검색 · 정렬 ── */
function SearchControl({
  query, setQuery, open, setOpen, inputRef,
}: {
  query: string;
  setQuery: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  if (open) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1">
        <Search className="h-3 w-3 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setQuery(''); setOpen(false); (e.target as HTMLInputElement).blur(); } }}
          placeholder="노트북 검색"
          className="w-40 sm:w-52 bg-transparent text-[12px] outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
        />
        <button onClick={() => { setQuery(''); setOpen(false); }} className="text-slate-400 hover:text-slate-700" aria-label="검색 닫기">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
      className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
      aria-label="검색 (/)"
      title="검색 (/)"
    >
      <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
    </button>
  );
}

function SortControl({ sort, setSort }: { sort: SortMode; setSort: (v: SortMode) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    setTimeout(() => window.addEventListener('click', h), 0);
    return () => window.removeEventListener('click', h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-7 inline-flex items-center gap-1.5 rounded-md px-2 text-[11.5px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <SlidersHorizontal className="h-3 w-3" strokeWidth={1.75} />
        {SORT_LABELS[sort]}
      </button>
      {open && (
        <div role="listbox" className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1.5 z-30">
          {(Object.keys(SORT_LABELS) as SortMode[]).map((s) => (
            <button
              key={s}
              onClick={() => { setSort(s); setOpen(false); }}
              role="option"
              aria-selected={sort === s}
              className={cn('w-full text-left rounded-lg px-2 py-1.5 text-[12px] hover:bg-slate-50 dark:hover:bg-slate-800',
                sort === s ? 'text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-200')}
            >
              {SORT_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 툴바 추가 버튼 (팝오버) ── */
function ToolbarAddButton({
  canAddFolder, onNewNotebook, onNewFolder,
}: {
  canAddFolder: boolean;
  onNewNotebook: () => void;
  onNewFolder: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false); };
    setTimeout(() => window.addEventListener('click', h), 0);
    return () => window.removeEventListener('click', h);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          if (!canAddFolder) { onNewNotebook(); return; }
          setMenuOpen(!menuOpen);
        }}
        className={cn(
          'h-7 inline-flex items-center gap-1 rounded-md pl-2 pr-2.5 text-[11.5px] font-semibold transition-colors',
          menuOpen
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white',
        )}
        aria-haspopup={canAddFolder ? 'menu' : undefined}
        aria-expanded={menuOpen}
        title="추가 (N: 파일 · F: 폴더)"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
        추가
      </button>
      {canAddFolder && menuOpen && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1.5 z-40 grid grid-cols-2 gap-1 w-[220px]"
          role="menu"
        >
          <button
            onClick={() => { setMenuOpen(false); onNewNotebook(); }}
            className="flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-3 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            role="menuitem"
          >
            <span className="text-2xl">📘</span>
            <div className="flex items-center gap-1">
              <span className="text-[12px] font-semibold">파일</span>
              <kbd className="text-[9px] text-slate-400 font-mono">N</kbd>
            </div>
          </button>
          <button
            onClick={() => { setMenuOpen(false); onNewFolder(); }}
            className="flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-3 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            role="menuitem"
          >
            <FolderIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" strokeWidth={1.5} />
            <div className="flex items-center gap-1">
              <span className="text-[12px] font-semibold">폴더</span>
              <kbd className="text-[9px] text-slate-400 font-mono">F</kbd>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── (Deprecated) 통합 추가 타일 — 더 이상 그리드에서 사용 안 함, 호환 유지 ── */
function AddTile({
  canAddFolder, onNewNotebook, onNewFolder,
}: {
  canAddFolder: boolean;
  onNewNotebook: () => void;
  onNewFolder: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false); };
    setTimeout(() => window.addEventListener('click', h), 0);
    return () => window.removeEventListener('click', h);
  }, [menuOpen]);

  return (
    <div className="relative flex items-center justify-center" ref={ref}>
      <button
        onClick={() => {
          if (!canAddFolder) { onNewNotebook(); return; }
          setMenuOpen(!menuOpen);
        }}
        className={cn(
          'h-14 w-14 rounded-full border-2 border-dashed flex items-center justify-center transition-all',
          menuOpen
            ? 'border-indigo-400 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 scale-105'
            : 'border-slate-300 dark:border-slate-700 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:scale-105',
        )}
        aria-label="추가"
        aria-haspopup={canAddFolder ? 'menu' : undefined}
        aria-expanded={menuOpen}
        title="추가"
      >
        <Plus className="h-6 w-6" strokeWidth={2} />
      </button>
      {canAddFolder && menuOpen && (
        <div className="absolute top-full mt-2 w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1.5 z-40" role="menu">
          <button
            onClick={() => { setMenuOpen(false); onNewNotebook(); }}
            className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            role="menuitem"
          >
            <span className="text-base">📘</span>
            <span className="flex-1 text-left">파일 추가</span>
            <kbd className="text-[9.5px] text-slate-400">N</kbd>
          </button>
          <button
            onClick={() => { setMenuOpen(false); onNewFolder(); }}
            className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            role="menuitem"
          >
            <FolderIcon className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
            <span className="flex-1 text-left">폴더 추가</span>
            <kbd className="text-[9.5px] text-slate-400">F</kbd>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 폴더 타일 ── */
function FolderTile({
  folder, count, dragOver,
  onOpen, onRename, onDelete, onColorChange, onDragEnter, onDragLeave, onDropNotebook,
}: {
  folder: StudyFolder;
  count: number;
  active: boolean;
  dragOver: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onColorChange: (color?: string) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDropNotebook: (nbId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    setTimeout(() => window.addEventListener('click', h), 0);
    return () => window.removeEventListener('click', h);
  }, [menuOpen]);

  return (
    <div
      className={cn('group relative rounded-xl border bg-white dark:bg-slate-900 transition-all hover:-translate-y-0.5 hover:shadow-sm',
        dragOver
          ? 'border-indigo-400 ring-2 ring-indigo-300 scale-[1.03] shadow-lg'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
      )}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-study-nb')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }
      }}
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes('application/x-study-nb')) onDragEnter();
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onDragLeave();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const nbId = e.dataTransfer.getData('application/x-study-nb');
        if (nbId) onDropNotebook(nbId);
      }}
    >
      <button
        onClick={onOpen}
        className="relative w-full aspect-[1.618/1] flex items-center justify-center overflow-hidden rounded-t-xl"
        style={{ backgroundColor: folder.color ?? '#0F172A' }}
      >
        {/* 은은한 대각선 장식 */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 16px)',
          }}
          aria-hidden
        />
        <FolderIcon className="h-7 w-7 text-white fill-white relative z-[1]" strokeWidth={1.2} />
        {dragOver && (
          <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white bg-indigo-600/80 rounded-full px-2 py-0.5">여기에 넣기</span>
          </div>
        )}
      </button>

      {/* 메뉴 — 이미지 버튼 밖에 두어 overflow-hidden 에 가려지지 않음 */}
      <div ref={menuRef} className="absolute top-1.5 right-1.5 z-30">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="h-5 w-5 flex items-center justify-center rounded text-white/70 hover:text-white bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="폴더 메뉴"
        >
          <MoreHorizontal className="h-3 w-3" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1.5 z-40" role="menu">
            <button onClick={(e) => { e.stopPropagation(); onRename(); setMenuOpen(false); }} className="w-full text-left rounded-lg px-2 py-1.5 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">이름 바꾸기</button>
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <p className="px-2 pt-0.5 pb-1 text-[9.5px] uppercase tracking-wide text-slate-400">색상</p>
            <div className="grid grid-cols-5 gap-1 px-1.5 pb-1">
              {FOLDER_COLORS.map((c) => {
                const active = (folder.color ?? FOLDER_COLORS[0]) === c;
                return (
                  <button
                    key={c}
                    onClick={(e) => { e.stopPropagation(); onColorChange(c); }}
                    className={cn('h-5 w-5 rounded transition-all', active ? 'ring-2 ring-offset-1 ring-indigo-400' : 'hover:scale-110')}
                    style={{ backgroundColor: c }}
                    aria-label={`색상 ${c}`}
                    aria-pressed={active}
                  />
                );
              })}
            </div>
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <button onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }} className="w-full text-left rounded-lg px-2 py-1.5 text-[12px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">삭제</button>
          </div>
        )}
      </div>
      <button onClick={onOpen} className="w-full px-3 py-1.5 text-left border-t border-slate-100 dark:border-slate-800">
        <p className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">{folder.name}</p>
      </button>
    </div>
  );
}

/* ── 노트북 타일 (유니브 AI 스타일) ── */
function NotebookTile({
  nb, folders, onSelect, onMove, onUpdate, onTogglePin,
}: {
  nb: StudyNotebook;
  folders: StudyFolder[];
  onSelect: () => void;
  onMove: (folderId?: string) => void;
  onUpdate: (nb: StudyNotebook) => void;
  onTogglePin: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    setTimeout(() => window.addEventListener('click', h), 0);
    return () => window.removeEventListener('click', h);
  }, [menuOpen]);

  const firstSource = nb.sources[0];
  const folder = nb.folderId ? folders.find((f) => f.id === nb.folderId) : undefined;
  const colorBar = nb.color ?? folder?.color;
  const lensCount = Object.keys(nb.lensOutputs).length;
  const lensTotal = 6;
  const hasContent = nb.sources.length > 0;

  return (
    <div
      className={cn('group relative rounded-xl border bg-white dark:bg-slate-900 transition-all',
        'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-sm',
        dragging && 'opacity-40 scale-95 shadow-lg',
      )}
      draggable
      onDragStart={(e) => {
        setDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/x-study-nb', nb.id);
      }}
      onDragEnd={() => setDragging(false)}
    >
      <button
        onClick={onSelect}
        className={cn(
          'relative w-full aspect-[1.618/1] overflow-hidden rounded-t-xl',
          hasContent ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40',
        )}
      >
        {/* 컬러 틴트 배경 (폴더 색 또는 노트북 개별 색) */}
        {colorBar && (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: colorBar, opacity: 0.09 }}
            aria-hidden
          />
        )}

        {hasContent ? (
          <div className="relative z-[1] w-full h-full">
            <NotebookThumbnail source={firstSource!} fallbackEmoji={nb.icon} />
          </div>
        ) : (
          <div className="relative z-[1] w-full h-full flex flex-col items-center justify-center text-center px-2">
            <span className="text-[32px] select-none leading-none opacity-40">{nb.icon}</span>
            <p className="mt-1 text-[10px] text-slate-400 italic">빈 파일</p>
          </div>
        )}

        {hasContent && (
          <LensProgress current={lensCount} total={lensTotal} />
        )}

        {hasContent && lensCount === 0 && !isSampleNotebook(nb) && (
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-[9px] font-semibold text-indigo-600 dark:text-indigo-300">
            시작 전
          </span>
        )}
        {/* 체험 노트북 뱃지 — 샘플 구분용 */}
        {isSampleNotebook(nb) && (
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500/90 px-2 py-0.5 text-[9px] font-semibold text-white shadow-sm">
            ✨ 체험
          </span>
        )}
      </button>

      <button
        onClick={onSelect}
        className="w-full text-left px-3 py-1.5 border-t border-slate-100 dark:border-slate-800"
      >
        <p className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">{nb.title}</p>
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
        className={cn('absolute top-1.5 left-2 h-5 w-5 flex items-center justify-center rounded transition-all z-20',
          nb.pinned
            ? 'text-amber-500 bg-white/80 dark:bg-slate-900/80 opacity-100'
            : 'text-slate-400 bg-white/70 dark:bg-slate-900/70 hover:text-amber-500 opacity-0 group-hover:opacity-100',
        )}
        aria-label={nb.pinned ? `${nb.title} 고정 해제` : `${nb.title} 고정`}
      >
        <Star className={cn('h-3 w-3', nb.pinned && 'fill-current')} strokeWidth={1.75} />
      </button>

      <div ref={menuRef} className="absolute top-1.5 right-1.5 z-20">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="h-5 w-5 flex items-center justify-center rounded text-slate-400 bg-white/70 dark:bg-slate-900/70 hover:text-slate-900 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="노트북 메뉴"
        >
          <MoreHorizontal className="h-3 w-3" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1.5 z-30" role="menu">
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePin(); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Star className={cn('h-3.5 w-3.5', nb.pinned ? 'text-amber-500 fill-amber-500' : 'text-slate-400')} strokeWidth={1.75} />
              <span className="flex-1 text-left">{nb.pinned ? '고정 해제' : '상단에 고정'}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDetailOpen(true); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <FileText className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
              <span className="flex-1 text-left">상세정보</span>
            </button>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            <button
              onClick={(e) => { e.stopPropagation(); setIconPickerOpen(true); setMenuOpen(false); }}
              className="w-full text-left rounded-lg px-2 py-1.5 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              아이콘 바꾸기
            </button>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <p className="px-2 pt-0.5 pb-1 text-[9.5px] uppercase tracking-wide text-slate-400">색상</p>
            <div className="grid grid-cols-6 gap-1 px-1.5 pb-1">
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate({ ...nb, color: undefined }); }}
                className={cn('h-5 w-5 rounded border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center',
                  !nb.color ? 'ring-2 ring-offset-1 ring-indigo-400' : 'hover:scale-110')}
                aria-label="색상 자동(폴더 상속)"
                title="자동"
              >
                <span className="text-[8px] text-slate-400">자동</span>
              </button>
              {FOLDER_COLORS.map((c) => {
                const active = nb.color === c;
                return (
                  <button
                    key={c}
                    onClick={(e) => { e.stopPropagation(); onUpdate({ ...nb, color: c }); }}
                    className={cn('h-5 w-5 rounded transition-all', active ? 'ring-2 ring-offset-1 ring-indigo-400' : 'hover:scale-110')}
                    style={{ backgroundColor: c }}
                    aria-label={`색상 ${c}`}
                  />
                );
              })}
            </div>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <p className="px-2 pt-0.5 pb-1 text-[9.5px] uppercase tracking-wide text-slate-400">폴더 이동</p>
            <button
              onClick={(e) => { e.stopPropagation(); onMove(undefined); setMenuOpen(false); }}
              className={cn('w-full text-left rounded-lg px-2 py-1.5 text-[12px] hover:bg-slate-50 dark:hover:bg-slate-800',
                !nb.folderId ? 'text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-200')}
            >
              미분류
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={(e) => { e.stopPropagation(); onMove(f.id); setMenuOpen(false); }}
                className={cn('w-full text-left rounded-lg px-2 py-1.5 text-[12px] hover:bg-slate-50 dark:hover:bg-slate-800',
                  nb.folderId === f.id ? 'text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-200')}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {iconPickerOpen && (
        <div className="absolute top-8 right-2 z-40">
          <IconPicker value={nb.icon} onChange={(icon) => onUpdate({ ...nb, icon })} onClose={() => setIconPickerOpen(false)} anchor="right" />
        </div>
      )}

      {detailOpen && (
        <NotebookDetailModal nb={nb} folders={folders} onClose={() => setDetailOpen(false)} />
      )}
    </div>
  );
}

function NotebookDetailModal({ nb, folders, onClose }: { nb: StudyNotebook; folders: StudyFolder[]; onClose: () => void }) {
  const folder = nb.folderId ? folders.find((f) => f.id === nb.folderId) : undefined;
  const source = nb.sources[0];
  const lensCount = Object.keys(nb.lensOutputs).length;
  const lensTotal = 6;
  const fmt = (ts: number) => new Date(ts).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
  const sizeK = source ? Math.round(source.content.length / 100) / 10 : 0;
  const kindLabel = source ? (SOURCE_KIND_META[source.kind]?.label ?? source.kind) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <span className="text-[28px] leading-none select-none shrink-0">{nb.icon}</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 truncate">{nb.title}</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{folder ? folder.name : '미분류'}</p>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 text-[12.5px]">
          <DetailRow label="원본">
            {source ? (
              <span className="text-slate-800 dark:text-slate-200">
                {kindLabel} · {sizeK}K자
                {source.title && source.title !== nb.title && (
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{source.title}</span>
                )}
              </span>
            ) : (
              <span className="italic text-slate-400">비어 있음</span>
            )}
          </DetailRow>
          <DetailRow label="만든 날짜">
            <span className="text-slate-700 dark:text-slate-300 tabular-nums">{fmt(nb.createdAt)}</span>
          </DetailRow>
          <DetailRow label="마지막 수정">
            <span className="text-slate-700 dark:text-slate-300 tabular-nums">{fmt(nb.updatedAt)}</span>
          </DetailRow>
          <DetailRow label="렌즈 생성">
            <span className="text-slate-700 dark:text-slate-300 tabular-nums">{lensCount} / {lensTotal}</span>
          </DetailRow>
          <DetailRow label="플래시카드">
            <span className="text-slate-700 dark:text-slate-300 tabular-nums">{nb.flashcards.length}장</span>
          </DetailRow>
          <DetailRow label="퀴즈">
            <span className="text-slate-700 dark:text-slate-300 tabular-nums">{nb.quizItems.length}문제</span>
          </DetailRow>
          {nb.wrongAnswers.length > 0 && (
            <DetailRow label="오답">
              <span className="text-rose-600 dark:text-rose-300 tabular-nums">{nb.wrongAnswers.length}개</span>
            </DetailRow>
          )}
          <DetailRow label="대화">
            <span className="text-slate-700 dark:text-slate-300 tabular-nums">{nb.chat.length}개 메시지</span>
          </DetailRow>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 w-20 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

/* ── 렌즈 진행 도넛 ── */
function NotebookThumbnail({ source, fallbackEmoji }: { source: { kind: string; url?: string; content: string; thumbnail?: string; title: string }; fallbackEmoji: string }) {
  const kindMeta = SOURCE_KIND_META[source.kind as keyof typeof SOURCE_KIND_META];

  // 1) 저장된 썸네일(data URL) 우선 — PDF 첫 페이지 등
  if (source.thumbnail) {
    return (
      <div className="relative w-full h-full">
        <img src={source.thumbnail} alt="" className="w-full h-full object-cover object-top" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/40 dark:to-slate-900/40" aria-hidden />
        <KindBadge meta={kindMeta} />
      </div>
    );
  }

  // 2) YouTube — URL에서 video id 추출해 공식 썸네일 사용
  if (source.kind === 'youtube' && source.url) {
    const vid = extractYouTubeId(source.url);
    if (vid) {
      const thumb = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
      return (
        <div className="relative w-full h-full bg-black">
          <img src={thumb} alt="" className="w-full h-full object-cover" draggable={false} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-red-600/90 h-9 w-9 flex items-center justify-center shadow-lg">
              <Youtube className="h-4 w-4 text-white fill-white" />
            </span>
          </div>
          <KindBadge meta={kindMeta} dark />
        </div>
      );
    }
  }

  // 3) 텍스트 기반(paste, url) — 본문 발췌를 종이/문서처럼
  if ((source.kind === 'paste' || source.kind === 'url') && source.content) {
    const preview = source.content.slice(0, 220).trim();
    return (
      <div className="relative w-full h-full bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-3 pt-5 pb-2 h-full">
          <p className="text-[10.5px] leading-snug text-slate-700 dark:text-slate-300 line-clamp-5 break-all">
            {preview}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80" aria-hidden />
        <KindBadge meta={kindMeta} />
      </div>
    );
  }

  // 4) 기본 — 이모지 fallback (recording 등)
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center px-2">
      <span className="text-[32px] select-none leading-none opacity-60">{fallbackEmoji}</span>
      <KindBadge meta={kindMeta} />
    </div>
  );
}

function KindBadge({ meta, dark }: { meta: { label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> } | null; dark?: boolean }) {
  if (!meta) return null;
  return (
    <div
      className={cn(
        'absolute top-1.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold backdrop-blur-sm z-[2]',
        dark
          ? 'bg-black/50 text-white/90'
          : 'bg-white/85 dark:bg-slate-900/85 text-slate-600 dark:text-slate-300',
      )}
    >
      <meta.icon className="h-2.5 w-2.5" strokeWidth={2} />
      <span>{meta.label}</span>
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      const m = u.pathname.match(/\/(embed|shorts)\/([\w-]+)/);
      if (m) return m[2];
    }
  } catch { /* noop */ }
  return null;
}

function LensProgress({ current, total }: { current: number; total: number }) {
  const pct = Math.min(1, current / total);
  const size = 20;
  const stroke = 2.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  return (
    <div
      className="absolute bottom-1.5 right-1.5 flex items-center justify-center"
      aria-label={`렌즈 ${current}/${total} 생성됨`}
      title={`렌즈 ${current}/${total} 생성됨`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke="rgb(226,232,240)" strokeWidth={stroke} fill="none" className="dark:stroke-slate-700" />
        <circle
          cx={size/2} cy={size/2} r={radius}
          stroke="rgb(99,102,241)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-300"
        />
      </svg>
      <span className="absolute text-[7.5px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">
        {current}
      </span>
    </div>
  );
}

/* ── 노트북 생성 모달: 제목 + 첨부파일(선택) ── */
function NotebookCreateModal({
  onSubmit, onClose,
}: {
  onSubmit: (title: string, initialSources: StudySource[]) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pickFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrors([]);
    // 노트북 생성 시 첨부는 1개만 허용(여러 개 선택하면 첫 번째만 사용).
    // 노트북 진입 후 소스 패널에서는 추가로 붙일 수 있음.
    setPendingFiles([files[0]]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrors([]);
    try {
      let sources: StudySource[] = [];
      if (pendingFiles.length > 0) {
        const result = await filesToStudySources(pendingFiles);
        sources = result.sources;
        if (result.errors.length > 0) {
          setErrors(result.errors);
          // 일부 실패 + 성공분도 없음 → 사용자가 확인하도록 여기서 멈춤
          if (sources.length === 0) {
            setIsSubmitting(false);
            return;
          }
          // 일부만 실패 → 토스트로 고지 후 성공분은 등록
          toast({
            title: `${result.errors.length}개 파일 등록 실패`,
            description: '나머지 파일만 노트북에 추가됐어요.',
          });
        }
      }
      onSubmit(title.trim(), sources);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) pickFiles(e.dataTransfer.files);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">새 노트북</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 제목 */}
          <div>
            <label className="block text-[10.5px] uppercase tracking-wide text-slate-400 mb-2 font-semibold">
              제목
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                // 드롭존 내부 요소에 포커스가 있을 때는 영향 없음(이 input만 Enter 제출)
                if (e.key === 'Enter') { e.preventDefault(); submit(); }
              }}
              placeholder="노트북 이름 (비워도 OK)"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[12.5px] outline-none focus:border-indigo-400"
            />
          </div>

          {/* 첨부파일 */}
          <div>
            <label className="block text-[10.5px] uppercase tracking-wide text-slate-400 mb-2 font-semibold">
              첨부파일 (선택)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.docx,.xlsx,.csv,.pdf,.pptx"
              onChange={(e) => pickFiles(e.target.files)}
              className="hidden"
            />
            {pendingFiles.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={cn(
                  'w-full rounded-xl border border-dashed px-4 py-5 flex flex-col items-center justify-center gap-1 transition-colors',
                  isDragging
                    ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-500/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600',
                )}
              >
                <Upload className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
                <p className="text-[12px] text-slate-700 dark:text-slate-200 font-medium">
                  파일을 드래그하거나 <span className="text-indigo-600 dark:text-indigo-300">클릭해서 선택</span>
                </p>
                <p className="text-[10.5px] text-slate-400">PDF · PPTX · DOCX · TXT · MD · XLSX · CSV · 1개</p>
              </button>
            ) : (
              <ul className="space-y-1">
                {pendingFiles.map((f, idx) => (
                  <li
                    key={`${f.name}-${f.size}-${idx}`}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" strokeWidth={1.75} />
                    <span className="text-[11.5px] text-slate-800 dark:text-slate-200 truncate flex-1" title={f.name}>{f.name}</span>
                    <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{fmtSize(f.size)}</span>
                    <button
                      onClick={() => removeFile(idx)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
                      aria-label={`${f.name} 제거`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {errors.length > 0 && (
              <div className="mt-2 space-y-0.5" aria-live="polite">
                {errors.map((err, i) => (
                  <p key={i} className="text-[11px] text-red-600 dark:text-red-400">{err}</p>
                ))}
              </div>
            )}

            <p className="mt-2 text-[10.5px] text-slate-400">
              첨부는 선택 사항이에요. 나중에 소스 패널에서도 추가할 수 있어요.
            </p>
          </div>
        </div>

        {/* 액션 바 */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            취소
          </button>
          <button
            onClick={submit}
            disabled={isSubmitting}
            className="rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-[12px] font-semibold hover:bg-slate-800 dark:hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '불러오는 중…' : '만들기'}
          </button>
        </div>
      </div>
    </div>
  );
}
