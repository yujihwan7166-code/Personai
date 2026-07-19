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
  Star, Hash, MoreHorizontal, ArrowLeft, ArrowRight, RotateCcw,
} from 'lucide-react';
import type { Value } from 'platejs';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { BoardEditor } from '@/components/notes/BoardEditor';
import { SheetEditor } from '@/components/notes/SheetEditor';
import {
  useNotes, createNote, updateNoteTitle, updateTab, addTab, removeTab, reorderTab, moveTabToNote, deleteNote,
  noteDisplayTitle, notePlainText, emptyMemoValue,
  toggleFavorite, addNoteTag, removeNoteTag,
  useTrash, restoreNote, purgeNote, emptyTrash,
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
  const [activeTag, setActiveTag] = useState<string | null>(null); // 사이드바 태그 필터
  const [tagDraft, setTagDraft] = useState(''); // 노트 메뉴에서 새 태그 입력
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const trash = useTrash();
  const q = query.trim().toLowerCase();
  const noteTagsOf = (n: Note) => n.meta?.tags ?? [];
  const filtered = q
    ? notes.filter((n) => `${noteDisplayTitle(n)} ${notePlainText(n)} ${noteTagsOf(n).join(' ')}`.toLowerCase().includes(q))
    : activeTag
      ? notes.filter((n) => noteTagsOf(n).includes(activeTag))
      : notes;

  /** 전체 노트에서 쓰인 태그 → 빈도순. 사이드바 필터 목록. */
  const allTags = (() => {
    const m = new Map<string, number>();
    for (const n of notes) for (const t of noteTagsOf(n)) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
  })();

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
    deleteNote(id); // 휴지통으로 이동(소프트)
    if (activeId === id) { setActiveId(null); setActiveTabId(null); }
    notify.info('휴지통으로 옮겼어요', {
      duration: 5000,
      action: { label: '되돌리기', onClick: () => restoreNote(id) },
    });
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

  /** 메뉴에서 새 태그 추가. */
  const commitTag = (noteId: string) => {
    const t = tagDraft.trim();
    if (t) addNoteTag(noteId, t);
    setTagDraft('');
  };

  const favorites = notes.filter((n) => n.favorite);

  const renderNote = (note: Note) => {
    const activeRow = note.id === activeId;
    return (
      <li key={note.id} className="relative">
        <button
          type="button"
          onClick={() => setActiveId(note.id)}
          className={cn(
            'group flex h-[38px] w-full items-center gap-2 rounded-[9px] px-3 text-left text-[14.5px] transition-colors',
            activeRow ? 'bg-[#4f86e0]/20 font-semibold text-[#2c4f93] dark:bg-[#4f86e0]/25 dark:text-white' : 'text-[#4d5563] hover:bg-white/45 dark:text-foreground/70 dark:hover:bg-white/5',
          )}
        >
          <FileText className={cn('h-4 w-4 shrink-0', activeRow ? 'text-[#2c4f93]' : 'text-[#8894a5]')} strokeWidth={1.8} />
          <span className={cn('min-w-0 flex-1 truncate', activeRow ? 'font-semibold text-[#2c4f93]' : '')}>
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
            <div className="absolute left-full top-8 z-30 ml-1 w-40 overflow-hidden rounded-lg border border-[hsl(var(--hairline))] bg-popover py-1 shadow-lg">
              <button type="button" onClick={() => { toggleFavorite(note.id); setMenuFor(null); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-foreground hover:bg-accent">
                <Star className={cn('h-3.5 w-3.5', note.favorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
                {note.favorite ? '즐겨찾기 해제' : '즐겨찾기'}
              </button>
              <div className="my-1 h-px bg-[hsl(var(--hairline))]" />
              <p className="px-3 pb-1 pt-1 text-[10.5px] font-semibold text-muted-foreground/70">태그</p>
              {/* 이 노트의 태그 — 클릭 시 제거 */}
              {noteTagsOf(note).length > 0 && (
                <div className="flex flex-wrap gap-1 px-3 pb-1.5">
                  {noteTagsOf(note).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => removeNoteTag(note.id, t)}
                      className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
                      title="태그 제거"
                    >
                      #{t} <X className="h-2.5 w-2.5" />
                    </button>
                  ))}
                </div>
              )}
              {/* 기존 태그 중 이 노트에 없는 것 빠르게 추가 */}
              {allTags.filter(([t]) => !noteTagsOf(note).includes(t)).slice(0, 5).map(([t]) => (
                <button key={t} type="button" onClick={() => addNoteTag(note.id, t)} className="flex w-full items-center gap-2 px-3 py-1 text-left text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground">
                  <Hash className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                  <span className="flex-1 truncate">{t}</span>
                </button>
              ))}
              {/* 새 태그 입력 */}
              <div className="px-2.5 py-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  value={menuFor === note.id ? tagDraft : ''}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); commitTag(note.id); } }}
                  placeholder="+ 새 태그 (Enter)"
                  className="h-7 w-full rounded-md border border-[hsl(var(--hairline))] bg-background px-2 text-[12px] outline-none placeholder:text-muted-foreground/50 focus:border-primary/50"
                />
              </div>
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
      <aside className="flex w-full shrink-0 flex-col border-r border-[#dde5f0] bg-[#eef2f8] dark:border-[hsl(var(--hairline))] dark:bg-[hsl(var(--sidebar-background))] sm:w-[264px]">
        <div className="shrink-0 pl-4 pr-3 pb-3 pt-5 sm:pl-5">
          {/* 헤더 — 마크 + 제목 + 부제 락업 (데일리 로그 기준). 검은 방이라 그래파이트 톤 라이트 타일.
              부제에 권수(실데이터)를 담아 "제목=주어, 실데이터=서술어" 문법 유지. font-sans로 전역 세리프 무효화. */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-white text-[#4a6394] shadow-[0_1px_2px_rgba(20,40,80,0.08)]">
              <NotebookPen className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-sans text-[16px] font-bold leading-tight tracking-[-0.01em] text-[#191c20] dark:text-foreground">올인원 노트</h1>
              <p className="truncate text-[12px] leading-tight text-[#7189ab]">{notes.length > 0 ? `${notes.length}권 · 생각을 담는 곳` : '생각을 담는 곳'}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handleNew}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/15"
                title="새 노트"
                aria-label="새 노트"
              >
                <Plus className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        <div className="shrink-0 px-3.5 pb-2 pt-1">
          <label className="flex h-[36px] items-center gap-2 rounded-[8px] bg-white px-3 shadow-[0_1px_2px_rgba(20,40,80,0.06)] transition-shadow focus-within:shadow-[0_0_0_2px_rgba(44,79,147,0.25)] dark:bg-white/10">
            <Search className="h-[15px] w-[15px] text-[#8894a5]" strokeWidth={1.9} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="노트 검색"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-[#8894a5]"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground" aria-label="검색어 지우기">
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )}
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {trashOpen ? (
            /* ── 휴지통 ── */
            <div>
              <div className="mb-1.5 flex items-center gap-1 px-1">
                <button type="button" onClick={() => setTrashOpen(false)} className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" /> 노트로
                </button>
                {trash.length > 0 && (
                  <button type="button" onClick={() => { if (window.confirm('휴지통을 비울까요? 되돌릴 수 없어요.')) emptyTrash(); }} className="ml-auto rounded-md px-1.5 py-1 text-[11.5px] font-medium text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive">
                    비우기
                  </button>
                )}
              </div>
              {trash.length === 0 ? (
                <p className="px-2 py-8 text-center text-[12.5px] text-muted-foreground">휴지통이 비어 있어요.</p>
              ) : (
                <ul className="space-y-0.5">
                  {trash.map((note) => (
                    <li key={note.id} className="group flex items-center gap-1 rounded-[9px] px-2.5 py-1.5 hover:bg-white/45 dark:hover:bg-white/5">
                      <FileText className="h-4 w-4 shrink-0 text-[#8894a5]" strokeWidth={1.8} />
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#4d5563] dark:text-foreground/70">{noteDisplayTitle(note)}</span>
                      <button type="button" onClick={() => restoreNote(note.id)} title="복원" aria-label="복원" className="shrink-0 rounded p-1 text-muted-foreground/70 opacity-0 transition-opacity hover:text-[#2c4f93] group-hover:opacity-100"><RotateCcw className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => { if (window.confirm('완전히 삭제할까요? 되돌릴 수 없어요.')) purgeNote(note.id); }} title="완전 삭제" aria-label="완전 삭제" className="shrink-0 rounded p-1 text-muted-foreground/70 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : q ? (
            filtered.length === 0 ? (
              <p className="px-2 py-8 text-center text-[12.5px] text-muted-foreground">검색 결과가 없어요.</p>
            ) : (
              <ul className="space-y-0.5">{filtered.map(renderNote)}</ul>
            )
          ) : notes.length === 0 ? (
            <p className="px-2 py-8 text-center text-[12.5px] text-muted-foreground">아직 노트가 없어요. “새 노트”로 시작하세요.</p>
          ) : (
            <div className="space-y-2">
              {/* 태그 필터 — 클릭해서 좁혀 보기 (Apple/Bear 노트식 분류) */}
              {allTags.length > 0 && (
                <div>
                  <p className="px-3 pb-1.5 pt-1 text-[11.5px] font-semibold tracking-[0.05em] text-[#7189ab]">태그</p>
                  <div className="flex flex-wrap gap-1 px-2">
                    <button
                      type="button"
                      onClick={() => setActiveTag(null)}
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors',
                        activeTag === null ? 'bg-primary text-primary-foreground' : 'bg-white text-[#4d5563] hover:bg-white/70 dark:bg-white/10 dark:text-foreground/70',
                      )}
                    >
                      전체
                    </button>
                    {allTags.map(([t, count]) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setActiveTag(activeTag === t ? null : t)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors',
                          activeTag === t ? 'bg-primary text-primary-foreground' : 'bg-white text-[#4d5563] hover:bg-white/70 dark:bg-white/10 dark:text-foreground/70',
                        )}
                      >
                        <Hash className="h-3 w-3 opacity-70" />{t}
                        <span className="tabular-nums opacity-60">{count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 즐겨찾기 — 태그 필터가 없을 때만 상단 강조 */}
              {activeTag === null && favorites.length > 0 && (
                <div>
                  <p className="px-3 pb-1.5 pt-2.5 text-[11.5px] font-semibold tracking-[0.05em] text-[#7189ab]">즐겨찾기</p>
                  <ul className="space-y-0.5">{favorites.map(renderNote)}</ul>
                </div>
              )}

              {/* 노트 목록 (태그 필터 반영) */}
              <div>
                <p className="px-3 pb-1.5 pt-2.5 text-[11.5px] font-semibold tracking-[0.05em] text-[#7189ab]">
                  {activeTag ? `#${activeTag}` : '노트'}
                </p>
                <ul className="space-y-0.5">
                  {(activeTag === null ? notes : filtered).map(renderNote)}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 휴지통 — 사이드바 하단 고정 */}
        <button
          type="button"
          onClick={() => setTrashOpen((v) => !v)}
          className={cn(
            'flex shrink-0 items-center gap-2 border-t border-[#dde5f0] px-4 py-2.5 text-left text-[13px] transition-colors dark:border-[hsl(var(--hairline))]',
            trashOpen ? 'bg-white/60 font-semibold text-[#2c4f93] dark:bg-white/10' : 'text-[#6b7686] hover:bg-white/45 dark:text-muted-foreground dark:hover:bg-white/5',
          )}
        >
          <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span className="flex-1">휴지통</span>
          {trash.length > 0 && <span className="text-[12px] tabular-nums text-muted-foreground/70">{trash.length}</span>}
        </button>
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
