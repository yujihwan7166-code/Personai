import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, MoreHorizontal, Folder as FolderIcon, ArrowLeft,
  Search, SlidersHorizontal, Star, X, Upload,
  FileText,
  Link2, Youtube, Mic, ClipboardList, Clipboard,
  FileUp, BookOpenCheck, ArrowRight, Sparkles, BookOpen,
} from 'lucide-react';
import type { StudyNotebook, StudyFolder, StudySource } from '@/types/study';
import { createEmptyNotebook, FOLDER_COLORS, newId } from '@/types/study';
import { filesToStudySources } from '@/lib/studySourceFromFile';
import { IconPicker } from './IconPicker';
import { NotebookIcon } from './NotebookIcon';
import { cn } from '@/lib/utils';
import { confirmDialog } from '@/lib/confirmDialog';
import { textInputDialog } from '@/lib/textInputDialog';
import { toast } from '@/hooks/use-toast';
import { isSampleNotebook } from '@/lib/studySamples';
import { getStudySourceReadiness } from '@/lib/studySourceReadiness';
import { formatStudyCharCount } from '@/lib/studyFormat';

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
type CreateSourceMode = 'file' | 'paste' | 'url';

const SORT_LABELS: Record<SortMode, string> = {
  recent: '최근 순',
  name: '이름 순',
  sources: '원본 많은 순',
};

const SOURCE_KIND_META = {
  pdf: { label: 'PDF', icon: FileText },
  pptx: { label: 'PPTX', icon: FileText },
  docx: { label: 'DOCX', icon: FileText },
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
  const [quickImporting, setQuickImporting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const quickFileInputRef = useRef<HTMLInputElement>(null);

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
      arr = [...notebooks];
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

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    notebooks.forEach((notebook) => {
      if (!notebook.folderId) return;
      counts.set(notebook.folderId, (counts.get(notebook.folderId) ?? 0) + 1);
    });
    return counts;
  }, [notebooks]);

  const folderPreviewTitles = useMemo(() => {
    const previews = new Map<string, string[]>();
    const sorted = [...notebooks].sort((a, b) => b.updatedAt - a.updatedAt);
    sorted.forEach((notebook) => {
      if (!notebook.folderId) return;
      const list = previews.get(notebook.folderId) ?? [];
      if (list.length >= 3) return;
      list.push(notebook.title);
      previews.set(notebook.folderId, list);
    });
    return previews;
  }, [notebooks]);

  const handleCreateFolder = async () => {
    const name = await textInputDialog({
      title: '새 폴더',
      label: '폴더 이름',
      placeholder: '예: 물리, 과제, 기말고사',
      confirmLabel: '만들기',
      required: true,
    });
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (folders.some((f) => f.name === trimmed)) {
      toast({ title: '중복된 이름', description: '이미 있는 폴더 이름이에요.' });
      return;
    }
    onCreateFolder(trimmed);
  };

  useEffect(() => {
    if (showCreateModal) return;
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      const typing = tgt && /input|textarea|select/i.test(tgt.tagName);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        setShowCreateModal(true);
      }
      if (key === 'f' && !activeFolder) {
        e.preventDefault();
        handleCreateFolder();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeFolder, showCreateModal]);

  const handleCreateNotebook = (title: string, initialSources: StudySource[]) => {
    const fallbackTitle = initialSources[0]?.title?.trim() || '새 자료';
    const nb = createEmptyNotebook(title || fallbackTitle, 'BookOpen');
    if (initialSources.length > 0) {
      nb.sources = [...initialSources, ...nb.sources];
    }
    nb.updatedAt = Date.now();
    const folderId = activeFolderId ?? undefined;
    onCreate(nb, folderId);
    setShowCreateModal(false);
  };

  const handleQuickFiles = async (files: FileList | File[] | null) => {
    const picked = Array.from(files ?? []);
    if (picked.length === 0 || quickImporting) return;
    setQuickImporting(true);
    try {
      const result = await filesToStudySources(picked);
      if (result.errors.length > 0) {
        toast({ title: '가져오지 못한 파일이 있어요', description: result.errors[result.errors.length - 1] });
      }
      if (result.sources.length === 0) return;
      const firstName = picked[0]?.name?.replace(/\.[^.]+$/, '').trim();
      const title = firstName || result.sources[0]?.title || '새 자료';
      const nb = createEmptyNotebook(title, 'BookOpen');
      nb.sources = [...result.sources, ...nb.sources];
      onCreate(nb, activeFolderId ?? undefined);
    } finally {
      setQuickImporting(false);
      if (quickFileInputRef.current) quickFileInputRef.current.value = '';
    }
  };

  const showQuickImportPanel = !query && !activeFolder && visibleNotebooks.length === 0;
  const useRootDashboard = false;

  return (
    <div className="max-w-6xl mx-auto px-4 py-7 pb-20 sm:px-8 sm:py-10">
      {/* 상단: 타이틀 or 브레드크럼 + 우측 툴 */}
      <div className="mb-6 flex items-start gap-3 pl-12 sm:pl-0">
        <div className="flex flex-1 min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          {activeFolder ? (
            <>
              <button
                onClick={() => setActiveFolderId(null)}
                className="inline-flex w-fit items-center gap-1 text-[12px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> 전체 자료
              </button>
              <span className="hidden text-slate-300 sm:inline">/</span>
              <h1 className="max-w-full truncate whitespace-nowrap text-[22px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {activeFolder.name}
              </h1>
              <span className="hidden text-[11px] text-slate-400 tabular-nums sm:inline">{visibleNotebooks.length}개 자료</span>
            </>
          ) : (
            <>
              <h1 className="whitespace-nowrap text-[22px] font-bold tracking-tight text-slate-900 dark:text-slate-100">AI 스터디룸</h1>
              <span className="hidden text-[11px] text-slate-400 tabular-nums sm:ml-1 sm:inline">
                {notebooks.length}개 자료
                {folders.length > 0 ? ` · ${folders.length}개 폴더` : ''}
              </span>
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

      {!activeFolder && (
        <FolderRail
          folders={folders}
          folderCounts={folderCounts}
          folderPreviewTitles={folderPreviewTitles}
          activeFolderId={activeFolderId}
          dragOverFolderId={dragOverFolderId}
          onOpen={(id) => setActiveFolderId(id)}
          onRenameFolder={async (folder) => {
            const name = await textInputDialog({
              title: '폴더 이름 바꾸기',
              label: '폴더 이름',
              defaultValue: folder.name,
              confirmLabel: '저장',
              required: true,
            });
            if (name) onRenameFolder(folder.id, name);
          }}
          onDeleteFolder={async (folder) => {
            const ok = await confirmDialog({
              title: `폴더 "${folder.name}"를 삭제할까요?`,
              description: '안의 자료는 미분류로 이동합니다.',
              confirmLabel: '삭제',
              tone: 'danger',
            });
            if (ok) onDeleteFolder(folder.id);
          }}
          onColorChange={(id, color) => onSetFolderColor(id, color)}
          onDragEnter={setDragOverFolderId}
          onDragLeave={() => setDragOverFolderId(null)}
          onDropNotebook={(nbId, folderId) => {
            onMoveNotebook(nbId, folderId);
            setDragOverFolderId(null);
          }}
        />
      )}

      <div className={cn(useRootDashboard && 'grid gap-5 lg:grid-cols-[minmax(300px,420px)_minmax(0,1fr)] lg:items-start')}>
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
          <div className={cn(
            'grid grid-cols-1 gap-3.5 items-start',
            useRootDashboard ? 'sm:grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
          )}>
            {/* 자료 카드들 */}
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
              <p className="text-[13px] text-slate-700 dark:text-slate-300 font-medium">자료가 없어요</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {query ? '검색어를 바꾸거나 지워 보세요.' : '위 "추가"로 만들거나 다른 자료를 드래그해 옮겨 주세요.'}
              </p>
              {query && (
                <button onClick={() => setQuery('')} className="mt-3 text-[11.5px] text-indigo-600 hover:text-indigo-700">
                  검색 지우기
                </button>
              )}
            </div>
          )}
        </div>

        {showQuickImportPanel && (
          <div className={cn('space-y-4', useRootDashboard ? 'mt-0' : 'mt-6')}>
            <HomeQuickImportPanel
              className={useRootDashboard ? 'mt-0 lg:min-h-[232px]' : 'mt-0'}
              foldersCount={folders.length}
              hasAnyNotebook={notebooks.length > 0}
              importing={quickImporting}
              onPickFile={() => quickFileInputRef.current?.click()}
              onOpenCreate={() => setShowCreateModal(true)}
              onDropFiles={handleQuickFiles}
            />
          </div>
        )}
      </div>

      {showCreateModal && (
        <NotebookCreateModal onSubmit={handleCreateNotebook} onClose={() => setShowCreateModal(false)} />
      )}
      <input
        ref={quickFileInputRef}
        type="file"
        accept=".pdf,.pptx,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => handleQuickFiles(e.target.files)}
      />
    </div>
  );
}

/* ── 검색 · 정렬 ── */
function HomeQuickImportPanel({
  className,
  foldersCount,
  hasAnyNotebook,
  importing,
  onPickFile,
  onOpenCreate,
  onDropFiles,
}: {
  className?: string;
  foldersCount: number;
  hasAnyNotebook: boolean;
  importing: boolean;
  onPickFile: () => void;
  onOpenCreate: () => void;
  onDropFiles: (files: FileList | File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        if (Array.from(e.dataTransfer.types).includes('Files')) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onDropFiles(e.dataTransfer.files);
      }}
      className={cn(
        'mt-6 rounded-2xl border border-dashed bg-white/80 px-6 py-7 shadow-sm transition-colors dark:bg-slate-900/55',
        dragging
          ? 'border-indigo-400 bg-indigo-50/70 dark:border-indigo-500 dark:bg-indigo-950/30'
          : 'border-slate-200 dark:border-slate-800',
        className,
      )}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950">
            <FileUp className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
              {hasAnyNotebook ? '새 자료를 바로 추가할 수 있어요' : '첫 자료를 넣으면 바로 공부 화면으로 이동해요'}
            </p>
            <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
              {hasAnyNotebook
                ? '위 폴더를 열어 기존 자료를 이어서 보거나, 새 PDF/PPTX를 추가해 다른 공부 세트를 만들 수 있어요.'
                : 'PDF/PPTX를 올리면 왼쪽에서 읽고, 가운데에서 질문하고, 오른쪽에서 노트·퀴즈·플래시카드를 만들 수 있어요.'}
              {!hasAnyNotebook && foldersCount > 0 ? ' 폴더만 있는 상태라면 여기서 자료를 바로 추가하는 흐름이 가장 빠릅니다.' : ''}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            onClick={onPickFile}
            disabled={importing}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-3.5 text-[12px] font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
          >
            <Upload className="h-3.5 w-3.5" />
            {importing ? '가져오는 중' : '파일 넣기'}
          </button>
          <button
            onClick={onOpenCreate}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            직접 만들기
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {[
          ['읽기', '원문 선택과 페이지 이동', FileText],
          ['대화', '자료 근거 질문 답변', BookOpenCheck],
          ['스튜디오', '요약·퀴즈·암기카드 생성', ClipboardList],
        ].map(([title, body, Icon]) => (
          <div key={title as string} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/30">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-800 dark:text-slate-100">
              <Icon className="h-3.5 w-3.5 text-slate-500" />
              {title as string}
            </div>
            <p className="mt-1 text-[10.5px] text-slate-500 dark:text-slate-400">{body as string}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

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
          placeholder="자료 검색"
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
      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 sm:h-7 sm:w-7 sm:rounded-md"
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
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[11.5px] text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:h-7 sm:rounded-md sm:px-2"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`정렬: ${SORT_LABELS[sort]}`}
      >
        <SlidersHorizontal className="h-3 w-3" strokeWidth={1.75} />
        <span className="hidden sm:inline">{SORT_LABELS[sort]}</span>
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
          'inline-flex h-9 items-center gap-1 rounded-lg pl-3 pr-3.5 text-[11.5px] font-semibold transition-colors sm:h-7 sm:rounded-md sm:pl-2 sm:pr-2.5',
          menuOpen
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white',
        )}
        aria-haspopup={canAddFolder ? 'menu' : undefined}
        aria-expanded={menuOpen}
        title="추가 (N: 자료 · F: 폴더)"
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
            <BookOpen className="h-6 w-6 text-slate-600 dark:text-slate-300" strokeWidth={1.6} />
            <div className="flex items-center gap-1">
              <span className="text-[12px] font-semibold">자료</span>
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
            <BookOpen className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
            <span className="flex-1 text-left">자료 추가</span>
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

function FolderRail({
  folders,
  folderCounts,
  folderPreviewTitles,
  activeFolderId,
  dragOverFolderId,
  onOpen,
  onRenameFolder,
  onDeleteFolder,
  onColorChange,
  onDragEnter,
  onDragLeave,
  onDropNotebook,
}: {
  folders: StudyFolder[];
  folderCounts: Map<string, number>;
  folderPreviewTitles: Map<string, string[]>;
  activeFolderId: string | null;
  dragOverFolderId: string | null;
  onOpen: (id: string) => void;
  onRenameFolder: (folder: StudyFolder) => void;
  onDeleteFolder: (folder: StudyFolder) => void;
  onColorChange: (id: string, color?: string) => void;
  onDragEnter: (id: string) => void;
  onDragLeave: () => void;
  onDropNotebook: (nbId: string, folderId: string) => void;
}) {
  return (
    <section
      className="mb-7 ml-12 rounded-2xl border border-slate-200/80 bg-white/70 p-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/55 sm:ml-0"
      aria-label="폴더"
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">폴더</p>
          <p className="mt-0.5 text-[11px] text-slate-400">자료를 묶어두는 공간 · {folders.length}개</p>
        </div>
      </div>

      <div className="study-scroll-row flex gap-2 overflow-x-auto pb-0.5 pt-1">
        {folders.map((folder) => (
          <FolderRailItem
            key={folder.id}
            folder={folder}
            count={folderCounts.get(folder.id) ?? 0}
            previewTitles={folderPreviewTitles.get(folder.id) ?? []}
            active={activeFolderId === folder.id}
            dragOver={dragOverFolderId === folder.id}
            onOpen={() => onOpen(folder.id)}
            onRename={() => onRenameFolder(folder)}
            onDelete={() => onDeleteFolder(folder)}
            onColorChange={(color) => onColorChange(folder.id, color)}
            onDragEnter={() => onDragEnter(folder.id)}
            onDragLeave={onDragLeave}
            onDropNotebook={(nbId) => onDropNotebook(nbId, folder.id)}
          />
        ))}
      </div>
    </section>
  );
}

function FolderRailItem({
  folder,
  count,
  previewTitles,
  active,
  dragOver,
  onOpen,
  onRename,
  onDelete,
  onColorChange,
  onDragEnter,
  onDragLeave,
  onDropNotebook,
}: {
  folder: StudyFolder;
  count: number;
  previewTitles: string[];
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
      className={cn(
        'group relative h-16 min-w-[240px] shrink-0 overflow-hidden rounded-xl border bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-all dark:bg-slate-950/70',
        active
          ? 'border-indigo-300 bg-indigo-50/70 ring-1 ring-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/30 dark:ring-indigo-900/60'
          : 'border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-[0_14px_28px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900',
        dragOver && 'border-indigo-500 ring-2 ring-indigo-300',
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
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: folder.color ?? '#4F46E5' }}
        aria-hidden
      />
      <button onClick={onOpen} className="flex h-full w-full items-center gap-3 rounded-xl px-3.5 pl-4 pr-8 text-left">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-white shadow-sm"
          style={{ backgroundColor: folder.color ?? '#4F46E5' }}
        >
          <FolderIcon className="h-4 w-4 fill-white" strokeWidth={1.4} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-bold text-slate-950 dark:text-slate-100">{folder.name}</span>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">
            {count > 0 ? `${count}개 자료` : '빈 폴더'}
            {previewTitles.length > 0 ? ` · ${previewTitles[0]}` : ''}
          </span>
        </span>
      </button>

      <div ref={menuRef} className="absolute right-1.5 top-1.5 z-30">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-opacity hover:bg-white hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-950 dark:hover:text-slate-200"
          aria-label="폴더 메뉴"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900" role="menu">
            <button onClick={(e) => { e.stopPropagation(); onRename(); setMenuOpen(false); }} className="w-full rounded-lg px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">이름 바꾸기</button>
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <p className="px-2 pb-1 pt-0.5 text-[9.5px] uppercase tracking-wide text-slate-400">색상</p>
            <div className="grid grid-cols-5 gap-1 px-1.5 pb-1">
              {FOLDER_COLORS.map((c) => {
                const selected = (folder.color ?? FOLDER_COLORS[0]) === c;
                return (
                  <button
                    key={c}
                    onClick={(e) => { e.stopPropagation(); onColorChange(c); }}
                    className={cn('h-5 w-5 rounded transition-all', selected ? 'ring-2 ring-indigo-400 ring-offset-1' : 'hover:scale-110')}
                    style={{ backgroundColor: c }}
                    aria-label={`색상 ${c}`}
                    aria-pressed={selected}
                  />
                );
              })}
            </div>
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <button onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }} className="w-full rounded-lg px-2 py-1.5 text-left text-[12px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">삭제</button>
          </div>
        )}
      </div>

      {dragOver && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-indigo-500/15">
          <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">여기에 넣기</span>
        </div>
      )}
    </div>
  );
}

/* ── 폴더 타일 ── */
function FolderTile({
  folder, count, previewTitles, dragOver,
  onOpen, onRename, onDelete, onColorChange, onDragEnter, onDragLeave, onDropNotebook,
}: {
  folder: StudyFolder;
  count: number;
  previewTitles: string[];
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
      className={cn('group relative rounded-[18px] border bg-white dark:bg-slate-900 transition-colors hover:border-slate-300 hover:shadow-sm',
        dragOver
          ? 'border-indigo-400 ring-2 ring-indigo-300 shadow-lg'
          : 'border-slate-200 dark:border-slate-800 dark:hover:border-slate-700',
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
        className="relative flex min-h-[108px] w-full items-start gap-3 overflow-hidden rounded-[18px] bg-white px-3.5 py-3 text-left dark:bg-slate-900"
      >
        <div
          className="absolute inset-x-0 top-0 h-[34px] opacity-90"
          style={{ backgroundColor: folder.color ?? '#4F46E5' }}
          aria-hidden
        />
        <div className="absolute left-0 top-[24px] h-4 w-16 rounded-tr-[18px] bg-white dark:bg-slate-900" aria-hidden />
        <span
          className="relative z-[1] mt-5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ backgroundColor: folder.color ?? '#4F46E5' }}
        >
          <FolderIcon className="h-4 w-4 fill-white" strokeWidth={1.4} />
        </span>
        <div className="relative z-[1] mt-5 min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p className="truncate text-[12.5px] font-bold text-slate-900 dark:text-slate-100">{folder.name}</p>
          </div>
          <p className="mt-0.5 truncate text-[10.5px] font-semibold text-slate-400">
            {count > 0 ? `${count}개 자료` : '빈 폴더'}
          </p>
          <p className="mt-1 truncate text-[10.5px] text-slate-500 dark:text-slate-400">
            {previewTitles.length > 0 ? previewTitles.slice(0, 2).join(' · ') : '자료를 드래그해 넣을 수 있어요'}
          </p>
        </div>
        <span className="absolute right-3 top-3 z-[1] rounded-full bg-white/85 px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums text-slate-500 shadow-sm dark:bg-slate-900/85 dark:text-slate-300">
          {count}
        </span>
        {dragOver && (
          <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white bg-indigo-600/90 rounded-full px-2.5 py-1 shadow-sm">여기에 넣기</span>
          </div>
        )}
      </button>

      {/* 메뉴 — 이미지 버튼 밖에 두어 overflow-hidden 에 가려지지 않음 */}
      <div ref={menuRef} className="absolute top-1.5 right-1.5 z-30">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="h-6 w-6 flex items-center justify-center rounded-md bg-white/85 text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity dark:bg-slate-900/85 dark:ring-slate-700 dark:hover:text-slate-100"
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
    </div>
  );
}

/* ── 자료 타일 ── */
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
  const hasContent = nb.sources.length > 0;
  const sourceStatus = getNotebookSourceStatus(nb, lensCount);
  const readiness = getStudySourceReadiness(nb.sources);
  const hasOnlyPendingSources = readiness.hasOnlyPendingSources;
  const quizCount = (nb.quizDecks ?? []).reduce((sum, deck) => sum + deck.items.length, nb.quizItems.length);

  return (
    <div
      className={cn('group relative overflow-hidden rounded-[18px] border bg-white dark:bg-slate-900 transition-colors',
        'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm',
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
        aria-label={`${nb.title} 미리보기 열기`}
        className={cn(
          'relative h-[136px] w-full overflow-hidden bg-slate-50 sm:h-[150px] dark:bg-slate-950/50',
          hasContent ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40',
        )}
      >
        {/* 컬러 틴트 배경 (폴더 색 또는 자료 개별 색) */}
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
            <NotebookIcon icon={nb.icon} className="h-6 w-6 text-slate-400 opacity-70" />
            <p className="mt-1 text-[10px] text-slate-400 italic">빈 파일</p>
          </div>
        )}

        {hasContent && hasOnlyPendingSources && (
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/35 dark:text-amber-300 dark:ring-amber-900/40">
            <span className="study-shimmer h-2 w-2 rounded-full bg-amber-400" />
            분석 중
          </span>
        )}

        {hasContent && !hasOnlyPendingSources && lensCount === 0 && !isSampleNotebook(nb) && (
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-[9px] font-semibold text-indigo-600 dark:text-indigo-300">
            시작 전
          </span>
        )}
        {/* 체험 자료 뱃지 — 샘플 구분용 */}
        {isSampleNotebook(nb) && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-indigo-600/90 px-2 py-0.5 text-[9px] font-semibold text-white shadow-sm backdrop-blur-sm">
            <Sparkles className="h-2.5 w-2.5" strokeWidth={2} />
            체험
          </span>
        )}
      </button>

      <button
        onClick={onSelect}
        aria-label={`${nb.title} 열기`}
        className="w-full text-left px-3 py-2.5 border-t border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">{nb.title}</p>
            {sourceStatus && (
              <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                {sourceStatus}
              </p>
            )}
          </div>
          {quizCount > 0 && (
            <span className="shrink-0 rounded-md bg-slate-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-500 ring-1 ring-slate-100 dark:bg-slate-950 dark:text-slate-400 dark:ring-slate-800">
              Q{quizCount}
            </span>
          )}
        </div>
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
          aria-label="자료 메뉴"
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
  const lensTotal = Object.keys(nb.lensOutputs).length;
  const fmt = (ts: number) => new Date(ts).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
  const textSize = source ? formatStudyCharCount(source.content.length) : '0자';
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
          <NotebookIcon icon={nb.icon} className="h-7 w-7 text-slate-500 dark:text-slate-300" />
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
                {kindLabel} · {textSize}
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
function NotebookThumbnail({ source, fallbackEmoji }: { source: { kind: string; url?: string; content: string; thumbnail?: string; title: string; pageCount?: number }; fallbackEmoji: string }) {
  const kindMeta = SOURCE_KIND_META[source.kind as keyof typeof SOURCE_KIND_META];

  // 1) 저장된 썸네일(data URL) 우선 — PDF 첫 페이지 등
  if (source.thumbnail) {
    return (
      <div className="relative flex h-full w-full items-start justify-center bg-slate-100 px-5 pt-3 dark:bg-slate-950">
        <img src={source.thumbnail} alt="" className="h-[150%] max-w-full rounded-sm object-contain object-top shadow-sm ring-1 ring-slate-200 dark:ring-slate-700" draggable={false} />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80" aria-hidden />
        <KindBadge meta={kindMeta} />
        {source.pageCount && (
          <span className="absolute bottom-2 right-2 z-[2] rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/90 dark:text-slate-300 dark:ring-slate-700">
            {source.pageCount}p
          </span>
        )}
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
    const { heading, body } = getTextSourcePreview(source);
    return (
      <div className="relative w-full h-full bg-white dark:bg-slate-900 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-300 opacity-80" aria-hidden />
        <div className="px-4 pt-8 pb-3 h-full">
          <p className="text-[12px] font-bold leading-snug text-slate-900 dark:text-slate-100 line-clamp-2">
            {heading}
          </p>
          <p className="mt-2 text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3 break-keep">
            {body}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80" aria-hidden />
        <KindBadge meta={kindMeta} />
      </div>
    );
  }

  // 4) 기본 — 이모지 fallback (recording 등)
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-slate-50 px-2 text-center dark:bg-slate-950/40">
      <NotebookIcon icon={fallbackEmoji} className="h-8 w-8 text-slate-400 opacity-70" />
      <p className="mt-2 max-w-[80%] truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">{source.title}</p>
      <KindBadge meta={kindMeta} />
    </div>
  );
}

function KindBadge({ meta, dark }: { meta: { label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> } | null; dark?: boolean }) {
  if (!meta) return null;
  return (
    <div
      className={cn(
        'absolute top-2 left-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold backdrop-blur-sm z-[2]',
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

function getTextSourcePreview(source: { content: string; title: string }): { heading: string; body: string } {
  const lines = source.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headingLine = lines.find((line) => /^#{1,3}\s+/.test(line)) ?? source.title;
  const heading = cleanMarkdownPreview(headingLine || source.title).slice(0, 70) || source.title;
  const bodySource = lines
    .filter((line) => cleanMarkdownPreview(line) !== heading)
    .find((line) => !/^#{1,3}\s+/.test(line))
    ?? source.content;
  const body = cleanMarkdownPreview(bodySource).slice(0, 180);
  return { heading, body: body || '자료 내용을 분석해 질문과 결과 생성으로 이어갈 수 있어요.' };
}

function cleanMarkdownPreview(value: string): string {
  return value
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[-*_]{3,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getNotebookSourceStatus(notebook: StudyNotebook, lensCount: number): string | null {
  const firstSource = notebook.sources[0];
  if (!firstSource) return '빈 자료';

  const readiness = getStudySourceReadiness(notebook.sources);
  const kind = SOURCE_KIND_META[firstSource.kind as keyof typeof SOURCE_KIND_META]?.label ?? firstSource.kind.toUpperCase();
  const pages = firstSource.pageCount ? ` · ${firstSource.pageCount}p` : '';
  const sourceLabel = notebook.sources.length > 1 ? `원본 ${notebook.sources.length}개` : `${kind}${pages}`;

  if (readiness.hasOnlyPendingSources) return `${sourceLabel} · 분석 중`;
  if (readiness.usableCount > 0 && readiness.pendingCount > 0) {
    return `${sourceLabel} · ${readiness.usableCount}개 준비 · ${readiness.pendingCount}개 분석 중`;
  }
  if (readiness.usableCount > 0) {
    return `${sourceLabel} · ${lensCount > 0 ? `결과 ${lensCount}개` : '준비됨'}`;
  }
  if (readiness.erroredCount > 0) return `${sourceLabel} · 확인 필요`;
  return `${sourceLabel} · 준비 전`;
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

/* ── 자료 생성 모달: 제목 + 첨부파일(선택) ── */
function NotebookCreateModal({
  onSubmit, onClose,
}: {
  onSubmit: (title: string, initialSources: StudySource[]) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [sourceMode, setSourceMode] = useState<CreateSourceMode>('file');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
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
    setPendingFiles((prev) => {
      const merged = [...prev, ...Array.from(files)];
      const unique = new Map<string, File>();
      merged.forEach((file) => unique.set(`${file.name}-${file.size}-${file.lastModified}`, file));
      return Array.from(unique.values()).slice(0, 5);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrors([]);
    setUrlError(null);
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
            description: '나머지 파일만 자료에 추가됐어요.',
          });
        }
      }
      const pasted = pasteText.trim();
      if (pasted) {
        sources.push({
          id: newId('src'),
          kind: 'paste',
          title: pasteTitle.trim() || '붙여넣은 텍스트',
          content: pasted,
          addedAt: Date.now(),
          enabled: true,
          status: 'ready',
        });
      }
      const url = urlValue.trim();
      if (url) {
        setUrlLoading(true);
        const r = await fetch('/api/study-url-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = await r.json();
        if (!r.ok) {
          setUrlError(data?.error || '가져오지 못했어요.');
          setIsSubmitting(false);
          return;
        }
        sources.push({
          id: newId('src'),
          kind: data.kind === 'youtube' ? 'youtube' : 'url',
          title: data.title || url,
          content: data.content,
          url,
          addedAt: Date.now(),
          enabled: true,
          status: 'ready',
        });
      }
      onSubmit(title.trim(), sources);
    } catch {
      setUrlError(sourceMode === 'url' ? '네트워크 오류입니다.' : null);
    } finally {
      setUrlLoading(false);
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
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">새 자료</h3>
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
              placeholder="자료 이름 (비워도 OK)"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[12.5px] outline-none focus:border-indigo-400"
            />
          </div>

          {/* 첨부파일 */}
          <div>
            <label className="block text-[10.5px] uppercase tracking-wide text-slate-400 mb-2 font-semibold">
              시작 원본
            </label>
            <div
              className="mb-3 grid rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70"
              style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
            >
              <CreateSourceModeButton
                active={sourceMode === 'file'}
                icon={<Upload className="h-3.5 w-3.5" />}
                label="파일"
                onClick={() => setSourceMode('file')}
              />
              <CreateSourceModeButton
                active={sourceMode === 'paste'}
                icon={<Clipboard className="h-3.5 w-3.5" />}
                label="붙여넣기"
                onClick={() => setSourceMode('paste')}
              />
              <CreateSourceModeButton
                active={sourceMode === 'url'}
                icon={<Link2 className="h-3.5 w-3.5" />}
                label="URL"
                onClick={() => setSourceMode('url')}
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.docx,.xlsx,.csv,.pdf,.pptx"
              onChange={(e) => pickFiles(e.target.files)}
              className="hidden"
            />
            {sourceMode === 'file' && pendingFiles.length === 0 && (
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
                <p className="text-[10.5px] text-slate-400">PDF · PPTX · DOCX · TXT · 최대 5개</p>
              </button>
            )}

            {sourceMode === 'file' && pendingFiles.length > 0 && (
              <div className="space-y-2">
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
                {pendingFiles.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11.5px] font-medium text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-indigo-950/30"
                  >
                    <Upload className="h-3.5 w-3.5" /> 파일 더 추가
                  </button>
                )}
              </div>
            )}

            {sourceMode === 'paste' && (
              <div className="space-y-2">
                <input
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  placeholder="원본 제목 (선택)"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
                />
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={7}
                  placeholder="문제 지문, 수업 필기, 복사한 내용을 붙여넣으세요"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] leading-relaxed outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            )}

            {sourceMode === 'url' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                  <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                    placeholder="https:// 또는 유튜브 URL"
                    disabled={urlLoading || isSubmitting}
                    className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-slate-400"
                  />
                </div>
                {urlError && <p className="text-[11px] text-red-600 dark:text-red-400">{urlError}</p>}
                <p className="text-[10.5px] text-slate-400">
                  기사, 문서, 유튜브 자막을 원본으로 가져옵니다.
                </p>
              </div>
            )}

            {errors.length > 0 && (
              <div className="mt-2 space-y-0.5" aria-live="polite">
                {errors.map((err, i) => (
                  <p key={i} className="text-[11px] text-red-600 dark:text-red-400">{err}</p>
                ))}
              </div>
            )}

            <p className="mt-2 text-[10.5px] text-slate-400">
              파일, 텍스트, 링크를 한 자료 안에서 함께 참고할 수 있고, 분석은 뒤에서 이어져요.
            </p>
          </div>
        </div>

        {/* 액션 바 */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="min-h-11 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:min-h-9"
          >
            취소
          </button>
          <button
            onClick={submit}
            disabled={isSubmitting || urlLoading}
            className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white sm:min-h-9"
          >
            {isSubmitting || urlLoading ? '불러오는 중…' : pendingFiles.length > 0 || pasteText.trim() || urlValue.trim() ? '자료 만들기' : '빈 자료 만들기'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateSourceModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-1.5 text-[11.5px] font-semibold transition-colors sm:h-9',
        active
          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100',
      )}
      aria-pressed={active}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}
