/**
 * /notes — 재설계된 노트(탭 컨테이너).
 *
 * 좌: 노트 목록. 우: 제목 + 탭 바([메모1|보드1|시트1] 자동 생성, 추가/제거) + 활성 탭 편집.
 * 메모=Plate, 보드=tldraw, 시트=Fortune-sheet. 디자인은 앱 토큰으로 통일.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Plus, Trash2, NotebookPen, Search, X,
  FileText, LayoutDashboard, Table as TableIcon, ChevronDown,
} from 'lucide-react';
import type { Value } from 'platejs';
import { cn } from '@/lib/utils';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { BoardEditor } from '@/components/notes/BoardEditor';
import { SheetEditor } from '@/components/notes/SheetEditor';
import {
  useNotes, createNote, updateNoteTitle, updateTab, addTab, removeTab, deleteNote,
  noteDisplayTitle, notePlainText, emptyMemoValue,
  type Note, type TabItem, type TabType,
} from '@/lib/notes/noteStore';

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(ts).toLocaleDateString('ko-KR');
}

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
    if (tabId === activeTabId) {
      const rest = active.items.filter((t) => t.id !== tabId);
      setActiveTabId(rest[0]?.id ?? null);
    }
    removeTab(active.id, tabId);
  };

  return (
    <div className="flex h-dvh bg-background text-foreground">
      {/* 좌측 목록 */}
      <aside className="flex w-full shrink-0 flex-col border-r border-foreground/25 bg-background sm:w-[292px]">
        <div className="shrink-0 px-3 pt-4 pb-3">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <NotebookPen className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <h1 className="text-[19px] font-bold tracking-tight text-foreground">노트</h1>
            {notes.length > 0 && (
              <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                {notes.length}
              </span>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={handleNew}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/15"
              title="새 노트 만들기"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              새 노트
            </button>
          </div>
        </div>

        <div className="shrink-0 border-b border-foreground/10 px-3 pb-2.5">
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
          {filtered.length === 0 ? (
            <p className="px-2 py-8 text-center text-[12.5px] text-muted-foreground">
              {query ? '검색 결과가 없어요.' : '아직 노트가 없어요. “새 노트”로 시작하세요.'}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((note) => {
                const activeRow = note.id === activeId;
                const preview = notePlainText(note);
                return (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(note.id)}
                      className={cn(
                        'group flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                        activeRow ? 'bg-primary/10' : 'hover:bg-accent',
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={cn('min-w-0 flex-1 truncate text-[13px] font-medium', activeRow ? 'text-primary' : 'text-foreground')}>
                          {noteDisplayTitle(note)}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleDeleteNote(note.id); } }}
                          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          title="삭제"
                          aria-label="노트 삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </span>
                      </span>
                      {preview && (
                        <span className="truncate text-[11.5px] text-muted-foreground">{preview}</span>
                      )}
                      <span className="text-[10.5px] tabular-nums text-muted-foreground/70">{relativeTime(note.updatedAt)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* 우측 편집 */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {active && activeTab ? (
          <>
            {/* 제목 + 탭 바 */}
            <div className="shrink-0 border-b border-foreground/10 px-6 pt-6 sm:px-8">
              <input
                value={titleDraft}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="제목 없음"
                className="w-full bg-transparent text-[26px] font-bold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <div className="mt-3 flex items-center gap-1">
                {active.items.map((tab) => {
                  const Icon = TAB_ICON[tab.type];
                  const on = tab.id === activeTab.id;
                  return (
                    <div
                      key={tab.id}
                      className={cn(
                        'group flex items-center gap-1.5 rounded-t-md border-b-2 px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
                        on ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <button type="button" onClick={() => setActiveTabId(tab.id)} className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
                        {tab.name}
                      </button>
                      {active.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTab(tab.id)}
                          className="rounded p-0.5 text-muted-foreground/60 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          title="탭 제거"
                          aria-label="탭 제거"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* 탭 추가 */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAddOpen((v) => !v)}
                    className="flex items-center gap-0.5 rounded-md px-1.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="탭 추가"
                    aria-label="탭 추가"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.2} />
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>
                  {addOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setAddOpen(false)} aria-hidden />
                      <div className="absolute left-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-lg border border-[hsl(var(--hairline))] bg-popover py-1 shadow-lg">
                        {(['memo', 'board', 'sheet'] as TabType[]).map((t) => {
                          const Icon = TAB_ICON[t];
                          const label = t === 'memo' ? '메모' : t === 'board' ? '보드' : '시트';
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
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 활성 탭 콘텐츠 */}
            <div className="min-h-0 flex-1">
              {activeTab.type === 'memo' && (
                <div className="h-full overflow-y-auto">
                  <div className="w-full max-w-[760px] px-6 py-8 sm:px-8">
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
    </div>
  );
};

export default Notes;
