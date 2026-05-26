import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import '@/styles/study-tokens.css';
import { usePersistedStudyNotebooks } from '@/hooks/usePersistedStudyNotebooks';
import { createEmptyNotebook, type StudyNotebook } from '@/types/study';
import { StudyHome } from './StudyHome';
import { FileExplorer } from './FileExplorer';
import { StudyNotebookView } from './StudyNotebookView';
import { StudyCommandPalette } from './StudyCommandPalette';
import { confirmDialog } from '@/lib/confirmDialog';
import { textInputDialog } from '@/lib/textInputDialog';

// Study 모드 진입 시 pdf.js 워커를 idle 시점에 prewarm — 첫 PDF 오픈 지연 감소
void import('./viewers/PdfViewer').then((m) => m.warmupPdfJs?.()).catch(() => { /* noop */ });

interface Props {
  onClose?: () => void;
  onActiveChange?: (active: boolean) => void;
}

const SIDEBAR_OPEN_KEY = 'study_sidebar_open';
const ACTIVE_NOTEBOOK_KEY = 'study_active_notebook_id';

export function StudyWorkspace({ onClose, onActiveChange }: Props) {
  const {
    notebooks,
    upsertNotebook,
    deleteNotebook,
    moveNotebook,
    togglePin,
    folders,
    createFolder,
    renameFolder,
    deleteFolder,
    setFolderColor,
    markStudiedToday,
  } = usePersistedStudyNotebooks();

  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(ACTIVE_NOTEBOOK_KEY);
    return stored && notebooks.some((n) => n.id === stored) ? stored : null;
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(SIDEBAR_OPEN_KEY) !== '0';
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteTrigger, setPaletteTrigger] = useState<{
    action: 'session' | 'record' | 'quickstart' | 'export' | null;
    tick: number;
  }>({ action: null, tick: 0 });

  const activeNotebook = activeId ? notebooks.find((n) => n.id === activeId) ?? null : null;

  useEffect(() => {
    onActiveChange?.(!!activeNotebook);
  }, [activeNotebook, onActiveChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SIDEBAR_OPEN_KEY, sidebarOpen ? '1' : '0');
  }, [sidebarOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeId) localStorage.setItem(ACTIVE_NOTEBOOK_KEY, activeId);
    else localStorage.removeItem(ACTIVE_NOTEBOOK_KEY);
  }, [activeId]);

  // 노트북 진입 중에 해당 id가 삭제되면 홈으로 복귀
  useEffect(() => {
    if (activeId && !notebooks.some((n) => n.id === activeId)) {
      setActiveId(null);
    }
  }, [notebooks, activeId]);

  // 사이드바 토글 단축키 Ctrl/Cmd+B (노트북 진입 중에만)
  useEffect(() => {
    if (!activeNotebook) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeNotebook]);

  const createFile = (folderId?: string) => {
    const nb = createEmptyNotebook('새 자료');
    const withFolder: StudyNotebook = folderId ? { ...nb, folderId } : nb;
    upsertNotebook(withFolder);
    setActiveId(nb.id);
  };

  const handleCreateFolder = async () => {
    const name = await textInputDialog({
      title: '새 폴더',
      label: '폴더 이름',
      placeholder: '예: 물리, 과제, 기말고사',
      confirmLabel: '만들기',
      required: true,
    });
    if (name && name.trim()) createFolder(name.trim());
  };

  const renameNotebook = (id: string, title: string) => {
    const nb = notebooks.find((n) => n.id === id);
    if (!nb) return;
    upsertNotebook({ ...nb, title });
  };

  // 홈 화면: activeId 없을 때
  if (!activeNotebook) {
    return (
      <div className="study-root flex flex-col h-full w-full bg-[#FAFBFC] dark:bg-[#0B1220] relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-30 h-8 w-8 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900"
            title="앱으로 돌아가기"
            aria-label="앱으로 돌아가기"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 overflow-y-auto">
          <StudyHome
            notebooks={notebooks}
            folders={folders}
            onSelect={setActiveId}
            onCreate={(nb, folderId) => {
              upsertNotebook({ ...nb, folderId });
              setActiveId(nb.id);
            }}
            onUpdate={upsertNotebook}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onSetFolderColor={setFolderColor}
            onMoveNotebook={moveNotebook}
            onTogglePin={togglePin}
          />
        </div>
        <StudyCommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          notebooks={notebooks}
          activeNotebook={null}
          onOpenNotebook={setActiveId}
          onCreateNotebook={(nb) => {
            upsertNotebook(nb);
            setActiveId(nb.id);
          }}
          onStartSession={() => setPaletteTrigger({ action: 'session', tick: Date.now() })}
          onStartRecording={() => setPaletteTrigger({ action: 'record', tick: Date.now() })}
          onQuickStart={() => setPaletteTrigger({ action: 'quickstart', tick: Date.now() })}
          onExport={() => setPaletteTrigger({ action: 'export', tick: Date.now() })}
          onDeleteCurrent={() => {}}
          onClose={onClose ?? (() => {})}
        />
      </div>
    );
  }

  // 노트북 화면: activeId 있을 때 → 사이드바 + 노트북 뷰
  return (
    <div className="study-root flex h-full w-full bg-[#FAFBFC] dark:bg-[#0B1220] overflow-hidden">
      <aside
        className={cn(
          'hidden sm:block shrink-0 h-full overflow-hidden transition-[width,border-right-width] duration-200 ease-out motion-reduce:transition-none',
          sidebarOpen
            ? 'w-[220px] border-r border-slate-200 dark:border-slate-800'
            : 'w-0 border-r-0',
        )}
        aria-hidden={!sidebarOpen}
      >
        <div className="w-[220px] h-full">
          <FileExplorer
            notebooks={notebooks}
            folders={folders}
            activeId={activeId}
            onSelect={setActiveId}
            onCreateFile={createFile}
            onCreateFolder={handleCreateFolder}
            onRenameNotebook={renameNotebook}
            onDeleteNotebook={(id) => {
              deleteNotebook(id);
              if (activeId === id) setActiveId(null);
            }}
            onMoveNotebook={moveNotebook}
            onTogglePin={togglePin}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onCollapseSidebar={() => setSidebarOpen(false)}
          />
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col relative">
        <StudyNotebookView
          notebook={activeNotebook}
          onChange={upsertNotebook}
          onDelete={deleteNotebook}
          onBack={() => setActiveId(null)}
          onSessionComplete={markStudiedToday}
          paletteTrigger={paletteTrigger}
          onOpenPalette={() => setPaletteOpen(true)}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
      </div>

      <StudyCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        notebooks={notebooks}
        activeNotebook={activeNotebook}
        onOpenNotebook={setActiveId}
        onCreateNotebook={(nb) => {
          upsertNotebook(nb);
          setActiveId(nb.id);
        }}
        onStartSession={() => setPaletteTrigger({ action: 'session', tick: Date.now() })}
        onStartRecording={() => setPaletteTrigger({ action: 'record', tick: Date.now() })}
        onQuickStart={() => setPaletteTrigger({ action: 'quickstart', tick: Date.now() })}
        onExport={() => setPaletteTrigger({ action: 'export', tick: Date.now() })}
        onDeleteCurrent={async () => {
          if (!activeNotebook) return;
          const ok = await confirmDialog({
            title: '자료를 삭제할까요?',
            description: `"${activeNotebook.title}" 자료와 생성된 학습 결과가 삭제됩니다.`,
            confirmLabel: '삭제',
            tone: 'danger',
          });
          if (!ok) return;
          deleteNotebook(activeNotebook.id);
          setActiveId(null);
        }}
        onClose={onClose ?? (() => {})}
      />
    </div>
  );
}
