import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, MoreHorizontal, Folder as FolderIcon, ArrowLeft,
  Search, SlidersHorizontal, Star, X, Zap,
  FileText, Target, GitBranch, MessagesSquare,
} from 'lucide-react';
import type { StudyNotebook, StudyFolder, NotebookTemplate } from '@/types/study';
import { createEmptyNotebook, newId, countDueCards, NOTEBOOK_TEMPLATES, FOLDER_COLORS } from '@/types/study';
import { IconPicker } from './IconPicker';
import { cn } from '@/lib/utils';

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

const INTRO_FEATURES = [
  { icon: FileText, title: '요약', desc: 'PDF·영상을 한 눈에 훑기 좋은 문장으로' },
  { icon: Target, title: '퀴즈', desc: '객관식 문제를 자동 출제하고 점수까지' },
  { icon: GitBranch, title: '마인드맵', desc: '개념 사이 관계를 트리로 한눈에' },
  { icon: MessagesSquare, title: '2인 토론', desc: '두 전문가의 관점으로 입체 학습' },
];

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
  const [showTemplateModal, setShowTemplateModal] = useState(false);
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
      recentNotebooks: notebooks
        .filter((n) => n.folderId === f.id)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 3),
    }));
  }, [folders, notebooks]);

  const isFirstTime = notebooks.length === 0 && folders.length === 0;

  const handleCreateFolder = () => {
    const name = prompt('새 폴더 이름');
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (folders.some((f) => f.name === trimmed)) { alert('이미 있는 폴더 이름이에요'); return; }
    onCreateFolder(trimmed);
  };

  const handleTemplateSelect = (tpl: NotebookTemplate) => {
    const nb = createEmptyNotebook(tpl.title, tpl.icon);
    if (tpl.sampleSource) {
      nb.sources = [{
        id: newId('src'), kind: 'paste',
        title: tpl.sampleSource.title, content: tpl.sampleSource.content,
        addedAt: Date.now(), enabled: true, status: 'ready',
      }];
    }
    const folderId = activeFolderId ?? undefined;
    onCreate(nb, folderId);
    setShowTemplateModal(false);
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
        </div>
      </div>

      {isFirstTime && <IntroCards onStart={() => setShowTemplateModal(true)} />}

      {!isFirstTime && !activeFolder && (
        <ProgressStrip
          notebooks={notebooks}
          onJumpTo={(nbId) => onSelect(nbId)}
        />
      )}

      {!isFirstTime && (
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* 추가 진입점 (노트북 / 폴더 통합) */}
            <AddTile
              canAddFolder={!activeFolder}
              onNewNotebook={() => setShowTemplateModal(true)}
              onNewFolder={handleCreateFolder}
            />

            {/* 폴더 카드들 — 루트(전체) 뷰에서만 */}
            {!activeFolder && foldersWithCounts.map(({ folder, count, recentNotebooks }) => (
              <FolderTile
                key={folder.id}
                folder={folder}
                count={count}
                recentNotebooks={recentNotebooks}
                active={false}
                dragOver={dragOverFolderId === folder.id}
                onOpen={() => setActiveFolderId(folder.id)}
                onRename={() => {
                  const name = prompt('폴더 이름 바꾸기', folder.name);
                  if (name) onRenameFolder(folder.id, name);
                }}
                onDelete={() => {
                  if (confirm(`폴더 "${folder.name}"를 삭제하면 안의 노트북은 미분류로 이동합니다. 계속할까요?`)) {
                    onDeleteFolder(folder.id);
                  }
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
      )}

      {showTemplateModal && (
        <TemplatePickerModal onPick={handleTemplateSelect} onClose={() => setShowTemplateModal(false)} />
      )}
    </div>
  );
}

/* ── IntroCards (첫 방문) ── */
function IntroCards({ onStart }: { onStart: () => void }) {
  return (
    <div className="mb-12">
      <p className="text-[12.5px] text-slate-600 dark:text-slate-400 mb-5">
        이 앱으로 뭘 할 수 있는지 30초 안에 보여드릴게요.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {INTRO_FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 mb-2">
                <Icon className="h-4 w-4 text-slate-700 dark:text-slate-300" strokeWidth={1.75} />
              </div>
              <p className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">{f.title}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </div>
      <button
        onClick={onStart}
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-[12.5px] font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors"
      >
        <Zap className="h-3.5 w-3.5" /> 체험 시작
      </button>
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

/* ── 통합 추가 타일 ── */
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
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          if (!canAddFolder) { onNewNotebook(); return; }
          setMenuOpen(!menuOpen);
        }}
        className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-transparent flex items-center justify-center gap-1.5 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
        aria-haspopup={canAddFolder ? 'menu' : undefined}
        aria-expanded={menuOpen}
      >
        <Plus className="h-4 w-4" />
        <span className="text-[12px] font-semibold">추가</span>
      </button>
      {canAddFolder && menuOpen && (
        <div className="absolute left-0 top-full mt-1 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1.5 z-40" role="menu">
          <button
            onClick={() => { setMenuOpen(false); onNewNotebook(); }}
            className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            role="menuitem"
          >
            <span className="text-base">📘</span>
            <span className="flex-1 text-left">새 노트북</span>
            <kbd className="text-[9.5px] text-slate-400">N</kbd>
          </button>
          <button
            onClick={() => { setMenuOpen(false); onNewFolder(); }}
            className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            role="menuitem"
          >
            <FolderIcon className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
            <span className="flex-1 text-left">새 폴더</span>
            <kbd className="text-[9.5px] text-slate-400">F</kbd>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 폴더 타일 ── */
function FolderTile({
  folder, count, recentNotebooks, dragOver,
  onOpen, onRename, onDelete, onColorChange, onDragEnter, onDragLeave, onDropNotebook,
}: {
  folder: StudyFolder;
  count: number;
  recentNotebooks: StudyNotebook[];
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
      className={cn('group rounded-xl border bg-white dark:bg-slate-900 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-sm',
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
        className="relative w-full aspect-video flex items-center justify-center overflow-hidden"
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
        <FolderIcon className="h-9 w-9 text-white fill-white relative z-[1]" strokeWidth={1.2} />
        {recentNotebooks.length > 0 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center z-[1]">
            {recentNotebooks.slice(0, 3).map((n, i) => (
              <span
                key={n.id}
                className="flex items-center justify-center h-4 w-4 rounded-full bg-white/95 text-[9px] shadow-sm"
                style={{ marginLeft: i === 0 ? 0 : -4 }}
              >
                {n.icon}
              </span>
            ))}
          </div>
        )}
        {dragOver && (
          <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white bg-indigo-600/80 rounded-full px-2 py-0.5">여기에 넣기</span>
          </div>
        )}
        <div ref={menuRef} className="absolute top-1.5 right-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="h-5 w-5 flex items-center justify-center rounded text-white/70 hover:text-white bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="폴더 메뉴"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1.5 z-30" role="menu">
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
      </button>
      <button onClick={onOpen} className="w-full px-3 py-2 text-left border-t border-slate-100 dark:border-slate-800">
        <p className="text-[12px] font-semibold text-slate-900 dark:text-slate-100 truncate">{folder.name}</p>
        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">{count}개 항목</p>
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
  const [dragging, setDragging] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    setTimeout(() => window.addEventListener('click', h), 0);
    return () => window.removeEventListener('click', h);
  }, [menuOpen]);

  const preview = nb.sources[0]?.content.slice(0, 60).trim();
  const folder = nb.folderId ? folders.find((f) => f.id === nb.folderId) : undefined;
  const colorBar = nb.color ?? folder?.color;
  const lensCount = Object.keys(nb.lensOutputs).length;
  const lensTotal = 6;
  const isHot = Date.now() - nb.updatedAt < 86400000;
  const hasContent = nb.sources.length > 0;

  return (
    <div
      className={cn('group relative rounded-xl border bg-white dark:bg-slate-900 overflow-hidden transition-all',
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
      {colorBar && (
        <div className="absolute left-0 top-0 bottom-0 w-1 z-10" style={{ backgroundColor: colorBar }} aria-hidden />
      )}

      <button
        onClick={onSelect}
        className={cn('relative w-full aspect-video flex items-center justify-center border-b border-slate-100 dark:border-slate-800',
          hasContent ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40',
        )}
      >
        <div className="flex flex-col items-center justify-center text-center px-2">
          <span className="text-[26px] select-none leading-none">{nb.icon}</span>
          {preview && (
            <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-1 mt-1 max-w-[90%]">
              {preview}
            </p>
          )}
        </div>

        {isHot && (
          <span
            className="absolute top-1.5 left-2 h-1.5 w-1.5 rounded-full bg-indigo-500"
            aria-label="최근 수정"
            title="24시간 내 수정됨"
          />
        )}

        {hasContent && (
          <LensProgress current={lensCount} total={lensTotal} />
        )}

        {hasContent && lensCount === 0 && (
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-[9px] font-semibold text-indigo-600 dark:text-indigo-300">
            시작 전
          </span>
        )}
      </button>

      <button
        onClick={onSelect}
        className="w-full text-left px-3 py-2"
        style={colorBar ? { paddingLeft: 14 } : undefined}
      >
        <p className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100 truncate">{nb.title}</p>
        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 tabular-nums">
          {hasContent ? (
            <>
              <span>소스 {nb.sources.length}</span>
              <span className="text-slate-300">·</span>
              <span>렌즈 {lensCount}</span>
            </>
          ) : (
            <span className="italic text-slate-400">빈 노트</span>
          )}
          <span className="ml-auto text-slate-400">{new Date(nb.updatedAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
        </p>
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
        className={cn('absolute top-1.5 left-2 h-5 w-5 flex items-center justify-center rounded transition-all z-20',
          nb.pinned
            ? 'text-amber-500 bg-white/80 dark:bg-slate-900/80 opacity-100'
            : 'text-slate-400 bg-white/70 dark:bg-slate-900/70 hover:text-amber-500 opacity-0 group-hover:opacity-100',
          colorBar && 'left-3',
          isHot && !nb.pinned && 'opacity-0',
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
              onClick={(e) => { e.stopPropagation(); setIconPickerOpen(true); setMenuOpen(false); }}
              className="w-full text-left rounded-lg px-2 py-1.5 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              아이콘 바꾸기
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePin(); setMenuOpen(false); }}
              className="w-full text-left rounded-lg px-2 py-1.5 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {nb.pinned ? '고정 해제' : '상단에 고정'}
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
    </div>
  );
}

/* ── 렌즈 진행 도넛 ── */
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

/* ── 진행 스냅샷 스트립 ── */
function ProgressStrip({
  notebooks, onJumpTo,
}: {
  notebooks: StudyNotebook[];
  onJumpTo: (nbId: string) => void;
}) {
  const dueTotal = notebooks.reduce((s, n) => s + countDueCards(n), 0);
  const wrongTotal = notebooks.reduce((s, n) => s + n.wrongAnswers.length, 0);
  const unstartedList = notebooks.filter((n) => n.sources.length > 0 && Object.keys(n.lensOutputs).length === 0);
  const unstarted = unstartedList.length;

  if (dueTotal === 0 && wrongTotal === 0 && unstarted === 0) return null;

  const dueFirst = notebooks.find((n) => countDueCards(n) > 0);
  const wrongFirst = notebooks.find((n) => n.wrongAnswers.length > 0);
  const unstartedFirst = unstartedList[0];

  return (
    <div className="mb-5 flex flex-wrap items-center gap-1.5">
      {dueTotal > 0 && (
        <SnapshotChip
          label="복습"
          value={dueTotal}
          onClick={() => dueFirst && onJumpTo(dueFirst.id)}
        />
      )}
      {wrongTotal > 0 && (
        <SnapshotChip
          label="오답"
          value={wrongTotal}
          tone="rose"
          onClick={() => wrongFirst && onJumpTo(wrongFirst.id)}
        />
      )}
      {unstarted > 0 && (
        <SnapshotChip
          label="시작 전"
          value={unstarted}
          tone="indigo"
          onClick={() => unstartedFirst && onJumpTo(unstartedFirst.id)}
        />
      )}
    </div>
  );
}

function SnapshotChip({
  label, value, tone, onClick,
}: {
  label: string;
  value: number;
  tone?: 'rose' | 'indigo';
  onClick: () => void;
}) {
  const toneClasses = tone === 'rose'
    ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 hover:border-rose-300'
    : tone === 'indigo'
    ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-300'
    : 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300';
  return (
    <button
      onClick={onClick}
      className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-semibold transition-colors', toneClasses)}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </button>
  );
}

/* ── 템플릿 선택 모달 ── */
function TemplatePickerModal({
  onPick, onClose,
}: {
  onPick: (tpl: NotebookTemplate) => void;
  onClose: () => void;
}) {
  const [customTitle, setCustomTitle] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const createBlank = () => {
    const title = customTitle.trim() || '새 노트북';
    onPick({ id: 'blank', title, icon: '📘', description: '' });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">새 노트북</h3>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">빈 노트북으로 시작하거나 템플릿을 고르세요</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10.5px] uppercase tracking-wide text-slate-400 mb-2 font-semibold">빈 노트북으로 시작</p>
            <div className="flex gap-2">
              <input
                autoFocus
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createBlank(); }}
                placeholder="노트북 이름 (비워도 OK)"
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[12.5px] outline-none focus:border-indigo-400"
              />
              <button
                onClick={createBlank}
                className="rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-[12px] font-semibold hover:bg-slate-800 dark:hover:bg-white"
              >
                만들기
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10.5px] uppercase tracking-wide text-slate-400 mb-2 font-semibold">템플릿 — 샘플 소스 포함</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NOTEBOOK_TEMPLATES.filter((t) => t.id !== 'blank').map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => onPick(tpl)}
                  className="text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl">{tpl.icon}</span>
                    <p className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">{tpl.title}</p>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed">{tpl.description}</p>
                  {tpl.sampleSource && (
                    <p className="mt-1.5 text-[9.5px] text-indigo-600 dark:text-indigo-300 font-semibold">
                      샘플 {Math.round(tpl.sampleSource.content.length / 100) / 10}K자 포함
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
