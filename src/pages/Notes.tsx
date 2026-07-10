/**
 * /notes — 재설계된 노트(탭 컨테이너).
 *
 * 좌: 노트 목록. 우: 제목 + 탭 바([메모1|보드1|시트1] 자동 생성, 추가/제거) + 활성 탭 편집.
 * 메모=Plate, 보드=tldraw, 시트=Fortune-sheet. 디자인은 앱 토큰으로 통일.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Trash2, NotebookPen, Search, X,
  FileText, LayoutDashboard, Table as TableIcon, ChevronDown,
  Star, FolderPlus, Folder, MoreHorizontal, Check, Pencil, ArrowLeft, ArrowRight,
} from 'lucide-react';
import type { Value } from 'platejs';
import { cn } from '@/lib/utils';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { BoardEditor } from '@/components/notes/BoardEditor';
import { SheetEditor } from '@/components/notes/SheetEditor';
import {
  useNotes, createNote, updateNoteTitle, updateTab, addTab, removeTab, reorderTab, moveTabToNote, deleteNote,
  noteDisplayTitle, notePlainText, emptyMemoValue,
  toggleFavorite, setNoteFolder,
  useFolders, createFolder, renameFolder, deleteFolder,
  type Note, type TabItem, type TabType,
} from '@/lib/notes/noteStore';

const TAB_ICON: Record<TabType, typeof FileText> = {
  memo: FileText,
  board: LayoutDashboard,
  sheet: TableIcon,
};

const Notes = () => {
  const notes = useNotes();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addMenuPos, setAddMenuPos] = useState<{ left: number; top: number } | null>(null);
  const [tabMenuFor, setTabMenuFor] = useState<string | null>(null);
  const [tabMenuPos, setTabMenuPos] = useState<{ left: number; top: number } | null>(null);
  const folders = useFolders();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [folderNameDraft, setFolderNameDraft] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? notes.filter((n) => `${noteDisplayTitle(n)} ${notePlainText(n)}`.toLowerCase().includes(q))
    : notes;

  // 첫 진입 시 최신 노트 자동 선택.
  useEffect(() => {
    if (activeId === null && notes.length > 0) setActiveId(notes[0].id);
  }, [activeId, notes]);

  const active: Note | undefined = notes.find((n) => n.id === activeId);

  // 활성 노트 바뀌면 첫 탭 선택.
  useEffect(() => {
    if (active) setActiveTabId(active.items[0]?.id ?? null);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeTab: TabItem | undefined =
    active?.items.find((t) => t.id === activeTabId) ?? active?.items[0];

  // 제목 드래프트 — 활성 노트 바뀌면 동기화.
  const [titleDraft, setTitleDraft] = useState('');
  useEffect(() => { setTitleDraft(active?.title ?? ''); }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const titleTimer = useRef<number | null>(null);
  const contentTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (titleTimer.current) window.clearTimeout(titleTimer.current);
    if (contentTimer.current) window.clearTimeout(contentTimer.current);
  }, []);

  const onTitleChange = (v: string) => {
    setTitleDraft(v);
    if (!active) return;
    const id = active.id;
    if (titleTimer.current) window.clearTimeout(titleTimer.current);
    titleTimer.current = window.setTimeout(() => updateNoteTitle(id, v), 400);
  };

  const onMemoChange = (value: Value) => {
    if (!active || !activeTab) return;
    const noteId = active.id, tabId = activeTab.id;
    if (contentTimer.current) window.clearTimeout(contentTimer.current);
    contentTimer.current = window.setTimeout(() => updateTab(noteId, tabId, { memo: value }), 500);
  };

  const onSheetChange = (data: unknown) => {
    if (!active || !activeTab) return;
    const noteId = active.id, tabId = activeTab.id;
    if (contentTimer.current) window.clearTimeout(contentTimer.current);
    contentTimer.current = window.setTimeout(() => updateTab(noteId, tabId, { sheet: data }), 600);
  };

  const handleNew = () => {
    const note = createNote();
    setActiveId(note.id);
    setActiveTabId(note.items[0]?.id ?? null);
  };

  const handleDeleteNote = (id: string) => {
    deleteNote(id);
    if (activeId === id) { setActiveId(null); setActiveTabId(null); }
  };

  const handleAddTab = (type: TabType) => {
    if (!active) return;
    const id = addTab(active.id, type);
    setActiveTabId(id);
    setAddOpen(false);
  };

  const handleRemoveTab = (tabId: string) => {
    if (!active || active.items.length <= 1) return;
    const tab = active.items.find((t) => t.id === tabId);
    const label = tab?.type === 'board' ? '화이트보드' : tab?.type === 'sheet' ? '시트' : '노트';
    if (!window.confirm(`'${tab?.name ?? label}' 탭을 삭제할까요? 내용도 함께 사라집니다.`)) return;
    if (tabId === activeTabId) {
      const rest = active.items.filter((t) => t.id !== tabId);
      setActiveTabId(rest[0]?.id ?? null);
    }
    removeTab(active.id, tabId);
    setTabMenuFor(null);
  };

  // 탭 순서 이동(±1)
  const handleMoveTab = (tabId: string, dir: -1 | 1) => {
    if (!active) return;
    const idx = active.items.findIndex((t) => t.id === tabId);
    if (idx === -1) return;
    reorderTab(active.id, tabId, idx + dir);
  };

  // 탭을 다른 노트로 이동
  const handleMoveTabToNote = (tabId: string, toNoteId: string) => {
    if (!active || active.items.length <= 1) return;
    if (tabId === activeTabId) {
      const rest = active.items.filter((t) => t.id !== tabId);
      setActiveTabId(rest[0]?.id ?? null);
    }
    moveTabToNote(active.id, tabId, toNoteId);
    setTabMenuFor(null);
  };

  const toggleFolder = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const handleNewFolder = () => {
    const f = createFolder('새 폴더');
    setExpanded((prev) => new Set(prev).add(f.id));
    setRenamingFolder(f.id);
    setFolderNameDraft('새 폴더');
  };
  const commitRename = () => {
    if (renamingFolder) renameFolder(renamingFolder, folderNameDraft);
    setRenamingFolder(null);
  };

  const favorites = notes.filter((n) => n.favorite);
  const unfiled = notes.filter((n) => !n.folderId);

  const renderNote = (note: Note) => {
    const activeRow = note.id === activeId;
    return (
      <li key={note.id} className="relative">
        <button
          type="button"
          onClick={() => setActiveId(note.id)}
          className={cn(
            'group flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left transition-colors',
            activeRow ? 'bg-primary/10' : 'hover:bg-accent',
          )}
        >
          <FileText className={cn('h-3.5 w-3.5 shrink-0', activeRow ? 'text-primary' : 'text-muted-foreground')} strokeWidth={1.8} />
          <span className={cn('min-w-0 flex-1 truncate text-[14px]', activeRow ? 'font-medium text-primary' : 'text-foreground')}>
            {noteDisplayTitle(note)}
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === note.id ? null : note.id); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setMenuFor(menuFor === note.id ? null : note.id); } }}
            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
            title="더보기"
            aria-label="노트 메뉴"
          >
            <MoreHorizontal className="h-4 w-4" />
          </span>
        </button>

        {menuFor === note.id && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setMenuFor(null)} aria-hidden />
            <div className="absolute right-2 top-8 z-30 w-40 overflow-hidden rounded-lg border border-[hsl(var(--hairline))] bg-popover py-1 shadow-lg">
              <button type="button" onClick={() => { toggleFavorite(note.id); setMenuFor(null); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-foreground hover:bg-accent">
                <Star className={cn('h-3.5 w-3.5', note.favorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
                {note.favorite ? '즐겨찾기 해제' : '즐겨찾기'}
              </button>
              <div className="my-1 h-px bg-[hsl(var(--hairline))]" />
              <p className="px-3 pb-0.5 pt-1 text-[10.5px] font-semibold text-muted-foreground/70">폴더 이동</p>
              <button type="button" onClick={() => { setNoteFolder(note.id, null); setMenuFor(null); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-foreground hover:bg-accent">
                <span className="flex-1 truncate">미분류</span>
                {!note.folderId && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
              {folders.map((f) => (
                <button key={f.id} type="button" onClick={() => { setNoteFolder(note.id, f.id); setMenuFor(null); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-foreground hover:bg-accent">
                  <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate">{f.name}</span>
                  {note.folderId === f.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
              <div className="my-1 h-px bg-[hsl(var(--hairline))]" />
              <button type="button" onClick={() => { handleDeleteNote(note.id); setMenuFor(null); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" />
                삭제
              </button>
            </div>
          </>
        )}
      </li>
    );
  };

  return (
    <div className="paper-room flex h-dvh bg-background text-foreground">
      {/* 좌측 목록 */}
      <aside className="flex w-full shrink-0 flex-col border-r border-[hsl(var(--hairline))] bg-[hsl(var(--sidebar-background))] sm:w-[264px]">
        <div className="shrink-0 pl-4 pr-2 pt-4 pb-3 sm:pl-6">
          <div className="flex items-center justify-between gap-2">
            {/* 방 색은 레일 P 마크가 담당(그래파이트) — 이름은 기본 잉크색 유지(다크모드 안전).
                font-sans로 전역 세리프(Newsreader) 규칙 무효화 + 자간 -0.02em로 다른 두 방과 통일. */}
            <h1 className="font-sans text-[24px] font-bold leading-tight tracking-[-0.02em] text-foreground">올인원 노트</h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleNew}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/15"
                title="새 노트"
                aria-label="새 노트"
              >
                <Plus className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={handleNewFolder}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="새 폴더"
                aria-label="새 폴더"
              >
                <FolderPlus className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </button>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-b border-foreground/10 pl-4 pr-2 pb-2.5 sm:pl-6">
          <label className="flex h-[30px] items-center gap-1.5 rounded-md border border-transparent bg-accent/40 px-2 transition-colors focus-within:border-primary/35">
            <Search className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="노트 검색"
              className="min-w-0 flex-1 bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground" aria-label="검색어 지우기">
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )}
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {q ? (
            filtered.length === 0 ? (
              <p className="px-2 py-8 text-center text-[12.5px] text-muted-foreground">검색 결과가 없어요.</p>
            ) : (
              <ul className="space-y-0.5">{filtered.map(renderNote)}</ul>
            )
          ) : notes.length === 0 ? (
            <p className="px-2 py-8 text-center text-[12.5px] text-muted-foreground">아직 노트가 없어요. “새 노트”로 시작하세요.</p>
          ) : (
            <div className="space-y-2">
              {/* 즐겨찾기 */}
              {favorites.length > 0 && (
                <div>
                  <p className="flex items-center gap-1 px-2 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 즐겨찾기
                  </p>
                  <ul className="space-y-0.5">{favorites.map(renderNote)}</ul>
                </div>
              )}

              {/* 폴더들 */}
              {folders.map((f) => {
                const open = expanded.has(f.id);
                const folderNotes = notes.filter((n) => n.folderId === f.id);
                return (
                  <div key={f.id}>
                    <div className="group flex items-center gap-1 rounded-md px-1.5 py-2 hover:bg-accent/60">
                      <button type="button" onClick={() => toggleFolder(f.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <Folder className={cn('h-4 w-4 shrink-0 transition-colors', open ? 'text-primary' : 'text-muted-foreground')} />
                        {renamingFolder === f.id ? (
                          <input
                            autoFocus
                            value={folderNameDraft}
                            onChange={(e) => setFolderNameDraft(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingFolder(null); }}
                            onClick={(e) => e.stopPropagation()}
                            className="min-w-0 flex-1 rounded border border-primary/40 bg-background px-1 text-[14px] outline-none"
                          />
                        ) : (
                          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">{f.name}</span>
                        )}
                      </button>
                      <button type="button" onClick={() => { setRenamingFolder(f.id); setFolderNameDraft(f.name); }} className="shrink-0 rounded p-0.5 text-muted-foreground/60 opacity-0 hover:text-foreground group-hover:opacity-100" title="이름 변경" aria-label="폴더 이름 변경">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => deleteFolder(f.id)} className="shrink-0 rounded p-0.5 text-muted-foreground/60 opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100" title="폴더 삭제" aria-label="폴더 삭제">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    {open && (
                      <ul className="ml-2 space-y-0.5 border-l border-foreground/10 pl-1.5">
                        {folderNotes.length > 0
                          ? folderNotes.map(renderNote)
                          : <li className="px-2 py-1.5 text-[11px] text-muted-foreground/60">비어 있음</li>}
                      </ul>
                    )}
                  </div>
                );
              })}

              {/* 미분류 */}
              <div>
                <ul className="space-y-0.5">{unfiled.map(renderNote)}</ul>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 우측 편집 */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {active && activeTab ? (
          <>
            {/* 제목 + 탭 바 */}
            <div className="relative z-30 shrink-0 border-b border-[hsl(var(--hairline))] bg-background px-6 pt-4 sm:px-8">
              <input
                value={titleDraft}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="제목 없음"
                className="w-full bg-transparent text-[22px] font-bold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <div className="mt-2 flex items-center gap-1">
                {active.items.map((tab) => {
                  const Icon = TAB_ICON[tab.type];
                  const on = tab.id === activeTab.id;
                  const menuOpen = tabMenuFor === tab.id;
                  return (
                    <div
                      key={tab.id}
                      className={cn(
                        'group -mb-px flex items-center gap-1 rounded-t-md border-b-2 px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
                        on ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <button type="button" onClick={() => setActiveTabId(tab.id)} className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
                        {tab.name}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          if (menuOpen) { setTabMenuFor(null); return; }
                          const r = e.currentTarget.getBoundingClientRect();
                          setTabMenuPos({ left: Math.min(r.left, window.innerWidth - 208), top: r.bottom + 4 });
                          setTabMenuFor(tab.id);
                        }}
                        className={cn(
                          'rounded p-0.5 text-muted-foreground/60 transition-opacity hover:bg-accent hover:text-foreground',
                          on || menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                        )}
                        title="탭 옵션"
                        aria-label="탭 옵션"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}

                {/* 탭 추가 */}
                <button
                  type="button"
                  onClick={(e) => {
                    if (addOpen) { setAddOpen(false); return; }
                    const r = e.currentTarget.getBoundingClientRect();
                    setAddMenuPos({ left: Math.min(r.left, window.innerWidth - 144), top: r.bottom + 4 });
                    setAddOpen(true);
                  }}
                  className="flex items-center gap-0.5 rounded-md px-1.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="탭 추가"
                  aria-label="탭 추가"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.2} />
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </div>
            </div>

            {/* 활성 탭 콘텐츠 */}
            <div className="min-h-0 flex-1">
              {activeTab.type === 'memo' && (
                <div className="h-full overflow-y-auto">
                  <div className="w-full max-w-[760px] px-6 py-6 sm:px-8">
                    <NoteEditor
                      key={activeTab.id}
                      initialValue={activeTab.memo ?? emptyMemoValue()}
                      onChange={onMemoChange}
                    />
                  </div>
                </div>
              )}
              {activeTab.type === 'board' && (
                <BoardEditor key={activeTab.id} boardId={activeTab.id} />
              )}
              {activeTab.type === 'sheet' && (
                <SheetEditor key={activeTab.id} data={activeTab.sheet} onChange={onSheetChange} />
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <NotebookPen className="h-8 w-8 text-muted-foreground/60" strokeWidth={1.6} />
            <p className="text-[14px] text-muted-foreground">노트를 선택하거나 새로 만들어 시작하세요.</p>
            <button
              type="button"
              onClick={handleNew}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" strokeWidth={2.2} />
              새 노트
            </button>
          </div>
        )}
      </main>

      {/* 탭 추가 메뉴 — body 포털 */}
      {active && addOpen && addMenuPos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setAddOpen(false)} aria-hidden />
          <div
            className="fixed z-[9999] w-32 overflow-hidden rounded-lg border border-[hsl(var(--hairline))] bg-popover py-1 shadow-xl"
            style={{ left: addMenuPos.left, top: addMenuPos.top }}
          >
            {(['memo', 'board', 'sheet'] as TabType[]).map((t) => {
              const Icon = TAB_ICON[t];
              const label = t === 'memo' ? '노트' : t === 'board' ? '화이트보드' : '시트';
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleAddTab(t)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-foreground hover:bg-accent"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.9} />
                  {label}
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}

      {/* 탭 옵션 메뉴 — body 포털(보드/시트 캔버스 위로 확실히 올림) */}
      {active && tabMenuFor && tabMenuPos && (() => {
        const tab = active.items.find((t) => t.id === tabMenuFor);
        if (!tab) return null;
        const i = active.items.findIndex((t) => t.id === tabMenuFor);
        const otherNotes = notes.filter((n) => n.id !== active.id);
        return createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setTabMenuFor(null)} aria-hidden />
            <div
              className="fixed z-[9999] w-52 overflow-hidden rounded-lg border border-[hsl(var(--hairline))] bg-popover py-1 shadow-xl"
              style={{ left: tabMenuPos.left, top: tabMenuPos.top }}
            >
              <button
                type="button"
                disabled={i === 0}
                onClick={() => handleMoveTab(tab.id, -1)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-35"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" /> 왼쪽으로 이동
              </button>
              <button
                type="button"
                disabled={i === active.items.length - 1}
                onClick={() => handleMoveTab(tab.id, 1)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-35"
              >
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /> 오른쪽으로 이동
              </button>
              {active.items.length > 1 && otherNotes.length > 0 && (
                <>
                  <div className="my-1 h-px bg-[hsl(var(--hairline))]" />
                  <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">다른 노트로 이동</p>
                  <div className="max-h-44 overflow-y-auto">
                    {otherNotes.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleMoveTabToNote(tab.id, n.id)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-foreground hover:bg-accent"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{noteDisplayTitle(n)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {active.items.length > 1 && (
                <>
                  <div className="my-1 h-px bg-[hsl(var(--hairline))]" />
                  <button
                    type="button"
                    onClick={() => handleRemoveTab(tab.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> 탭 삭제
                  </button>
                </>
              )}
            </div>
          </>,
          document.body,
        );
      })()}
    </div>
  );
};

export default Notes;
