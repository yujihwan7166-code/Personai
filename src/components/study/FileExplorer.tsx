import { useState, useEffect, useMemo } from 'react';
import {
  ChevronRight, ChevronDown, Folder as FolderIcon, FolderOpen,
  Plus, Search, MoreHorizontal, Pin, Pencil, Trash2, FolderInput, X, Home,
} from 'lucide-react';
import type { StudyNotebook, StudyFolder } from '@/types/study';
import { cn } from '@/lib/utils';
import { confirmDialog } from '@/lib/confirmDialog';
import { NotebookIcon } from './NotebookIcon';

interface Props {
  notebooks: StudyNotebook[];
  folders: StudyFolder[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreateFile: (folderId?: string) => void;
  onCreateFolder: () => void;
  onRenameNotebook: (id: string, title: string) => void;
  onDeleteNotebook: (id: string) => void;
  onMoveNotebook: (id: string, folderId?: string) => void;
  onTogglePin: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onCollapseSidebar?: () => void;
  onBackToHome?: () => void;
}

export function FileExplorer({
  notebooks, folders, activeId,
  onSelect, onCreateFile, onCreateFolder,
  onRenameNotebook, onDeleteNotebook, onMoveNotebook, onTogglePin,
  onRenameFolder, onDeleteFolder,
  onCollapseSidebar, onBackToHome,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'file' | 'folder'; id: string } | null>(null);
  const [renaming, setRenaming] = useState<{ type: 'file' | 'folder'; id: string } | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);

  // 현재 활성 파일이 있는 폴더는 자동으로 펼침
  useEffect(() => {
    if (!activeId) return;
    const nb = notebooks.find((n) => n.id === activeId);
    if (nb?.folderId) {
      setExpanded((prev) => {
        if (prev.has(nb.folderId!)) return prev;
        const next = new Set(prev);
        next.add(nb.folderId!);
        return next;
      });
    }
  }, [activeId, notebooks]);

  useEffect(() => {
    if (!contextMenu) return;
    const h = () => setContextMenu(null);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, [contextMenu]);

  const toggleExpand = (folderId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId); else next.add(folderId);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notebooks;
    return notebooks.filter((n) => n.title.toLowerCase().includes(q));
  }, [notebooks, query]);

  const rootFiles = filtered.filter((n) => !n.folderId);
  const folderFiles = (folderId: string) => filtered.filter((n) => n.folderId === folderId);

  const beginRename = (type: 'file' | 'folder', id: string, current: string) => {
    setRenaming({ type, id });
    setRenameDraft(current);
    setContextMenu(null);
  };

  const commitRename = () => {
    if (!renaming) return;
    const v = renameDraft.trim();
    if (!v) { setRenaming(null); return; }
    if (renaming.type === 'file') onRenameNotebook(renaming.id, v);
    else onRenameFolder(renaming.id, v);
    setRenaming(null);
  };

  const onDragStart = (e: React.DragEvent, fileId: string) => {
    e.dataTransfer.setData('text/study-file', fileId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDropFolder = (e: React.DragEvent, folderId?: string) => {
    e.preventDefault();
    setDragOverFolder(null);
    setDragOverRoot(false);
    const fileId = e.dataTransfer.getData('text/study-file');
    if (!fileId) return;
    onMoveNotebook(fileId, folderId);
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900 text-[13px]">
      {/* 헤더 */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 px-3 py-2">
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            title="홈으로"
            aria-label="홈으로"
          >
            <Home className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex-1">탐색기</span>
        <button
          onClick={() => onCreateFile()}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          title="새 자료"
          aria-label="새 자료"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onCreateFolder}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          title="새 폴더"
          aria-label="새 폴더"
        >
          <FolderIcon className="h-3.5 w-3.5" />
        </button>
        {onCollapseSidebar && (
          <button
            onClick={onCollapseSidebar}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            title="사이드바 접기"
            aria-label="사이드바 접기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* 검색 */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="자료 검색..."
            className="flex-1 bg-transparent outline-none text-[12px] placeholder:text-slate-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-700" aria-label="검색 지우기">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* 트리 */}
      <div className="flex-1 overflow-y-auto py-1">
        {folders.length === 0 && notebooks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-slate-500 mb-3">아직 자료가 없어요</p>
            <button
              onClick={() => onCreateFile()}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-600 text-white px-3 py-1.5 text-[11.5px] font-semibold hover:bg-indigo-500"
            >
              <Plus className="h-3 w-3" /> 첫 자료 추가
            </button>
          </div>
        ) : (
          <>
            {/* 폴더들 */}
            {folders.map((folder) => {
              const isExpanded = expanded.has(folder.id);
              const files = folderFiles(folder.id);
              return (
                <div key={folder.id}>
                  <div
                    className={cn(
                      'group flex items-center gap-1 px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer',
                      dragOverFolder === folder.id && 'bg-indigo-50 dark:bg-indigo-950/40',
                    )}
                    onClick={() => toggleExpand(folder.id)}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', id: folder.id }); }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverFolder(folder.id); }}
                    onDragLeave={() => setDragOverFolder(null)}
                    onDrop={(e) => onDropFolder(e, folder.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
                    {isExpanded
                      ? <FolderOpen className="h-3.5 w-3.5" style={{ color: folder.color || '#64748b' }} />
                      : <FolderIcon className="h-3.5 w-3.5" style={{ color: folder.color || '#64748b' }} />}
                    {renaming?.type === 'folder' && renaming.id === folder.id ? (
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 rounded border border-indigo-300 bg-white dark:bg-slate-900 px-1 text-[12px] outline-none"
                      />
                    ) : (
                      <span className="flex-1 truncate text-[12px] font-medium text-slate-700 dark:text-slate-200">{folder.name}</span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', id: folder.id }); }}
                      className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                      aria-label="폴더 메뉴"
                    >
                      <MoreHorizontal className="h-3 w-3 text-slate-400" />
                    </button>
                  </div>
                  {isExpanded && files.map((nb) => (
                    <FileRow
                      key={nb.id}
                      nb={nb}
                      indent
                      active={activeId === nb.id}
                      renaming={renaming?.type === 'file' && renaming.id === nb.id ? renameDraft : null}
                      onRenameChange={setRenameDraft}
                      onRenameCommit={commitRename}
                      onRenameCancel={() => setRenaming(null)}
                      onClick={() => onSelect(nb.id)}
                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'file', id: nb.id }); }}
                      onDragStart={(e) => onDragStart(e, nb.id)}
                    />
                  ))}
                  {isExpanded && files.length === 0 && !query && (
                    <div className="pl-7 pr-3 py-1 text-[10.5px] text-slate-400 italic">비어 있음</div>
                  )}
                </div>
              );
            })}

            {/* 루트 파일들 (폴더 없음) */}
            {rootFiles.length > 0 && (
              <div
                className={cn('mt-1', dragOverRoot && 'bg-indigo-50/40 dark:bg-indigo-950/20')}
                onDragOver={(e) => { e.preventDefault(); setDragOverRoot(true); }}
                onDragLeave={() => setDragOverRoot(false)}
                onDrop={(e) => onDropFolder(e, undefined)}
              >
                {rootFiles.map((nb) => (
                  <FileRow
                    key={nb.id}
                    nb={nb}
                    active={activeId === nb.id}
                    renaming={renaming?.type === 'file' && renaming.id === nb.id ? renameDraft : null}
                    onRenameChange={setRenameDraft}
                    onRenameCommit={commitRename}
                    onRenameCancel={() => setRenaming(null)}
                    onClick={() => onSelect(nb.id)}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'file', id: nb.id }); }}
                    onDragStart={(e) => onDragStart(e, nb.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'file' ? (
            <>
              <CtxItem icon={<Pencil className="h-3.5 w-3.5" />} label="이름 변경" onClick={() => {
                const nb = notebooks.find((n) => n.id === contextMenu.id);
                if (nb) beginRename('file', contextMenu.id, nb.title);
              }} />
              <CtxItem icon={<Pin className="h-3.5 w-3.5" />} label="고정/해제" onClick={() => { onTogglePin(contextMenu.id); setContextMenu(null); }} />
              <CtxItem icon={<FolderInput className="h-3.5 w-3.5" />} label="루트로 이동" onClick={() => { onMoveNotebook(contextMenu.id, undefined); setContextMenu(null); }} />
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <CtxItem icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />} label="삭제" destructive onClick={async () => {
                const id = contextMenu.id;
                setContextMenu(null);
                const ok = await confirmDialog({ title: '이 자료를 삭제할까요?', confirmLabel: '삭제', tone: 'danger' });
                if (ok) onDeleteNotebook(id);
              }} />
            </>
          ) : (
            <>
              <CtxItem icon={<Pencil className="h-3.5 w-3.5" />} label="이름 변경" onClick={() => {
                const f = folders.find((x) => x.id === contextMenu.id);
                if (f) beginRename('folder', contextMenu.id, f.name);
              }} />
              <CtxItem icon={<Plus className="h-3.5 w-3.5" />} label="이 폴더에 새 자료" onClick={() => { onCreateFile(contextMenu.id); setContextMenu(null); }} />
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <CtxItem icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />} label="폴더 삭제" destructive onClick={async () => {
                const id = contextMenu.id;
                setContextMenu(null);
                const ok = await confirmDialog({
                  title: '폴더를 삭제할까요?',
                  description: '안의 자료는 루트로 이동합니다.',
                  confirmLabel: '삭제',
                  tone: 'danger',
                });
                if (ok) onDeleteFolder(id);
              }} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FileRow({
  nb, indent, active, renaming, onRenameChange, onRenameCommit, onRenameCancel,
  onClick, onContextMenu, onDragStart,
}: {
  nb: StudyNotebook;
  indent?: boolean;
  active: boolean;
  renaming: string | null;
  onRenameChange: (v: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-1.5 pr-2 py-1 cursor-pointer border-l-2',
        indent ? 'pl-6' : 'pl-3',
        active
          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-l-indigo-500'
          : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60',
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={onDragStart}
      title={nb.title}
    >
      <NotebookIcon icon={nb.icon} className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      {renaming !== null ? (
        <input
          autoFocus
          value={renaming}
          onChange={(e) => onRenameChange(e.target.value)}
          onBlur={onRenameCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameCommit();
            if (e.key === 'Escape') onRenameCancel();
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 rounded border border-indigo-300 bg-white dark:bg-slate-900 px-1 text-[12px] outline-none"
        />
      ) : (
        <span className={cn('flex-1 truncate text-[12px]', active ? 'font-semibold text-indigo-700 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-200')}>
          {nb.title}
        </span>
      )}
      {nb.pinned && <Pin className="h-3 w-3 text-indigo-500 fill-current" />}
    </div>
  );
}

function CtxItem({ icon, label, onClick, destructive }: { icon: React.ReactNode; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 rounded px-2 py-1.5 text-[12px] transition-colors',
        destructive
          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800',
      )}
    >
      <span className="text-slate-500 dark:text-slate-400">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}
