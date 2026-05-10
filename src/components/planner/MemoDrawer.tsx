/**
 * 사이드바 빠른 이동의 "메모" 클릭 시 뜨는 우측 drawer.
 *
 * 라우트 점프 대신 — 플래너 옆에 panel 띄워 참고하면서 task 추가 가능.
 *
 * 기능 (Memos 풀 페이지와 격차 좁힘 — 3차):
 * - list / editor / trash 3 view
 * - 핀 토글, 폴더 이동, 보관함 토글
 * - 5초 undo 토스트 (소프트 삭제, 휴지통으로 이동)
 * - 정렬 옵션 (updated/created/title)
 * - 공유 함수: memoStore 의 memoTitle / memoPreview / memoTimeLabel 사용 (중복 제거)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ExternalLink, Folder, FolderInput, Pin, PinOff,
  Plus, Search, Trash2, X, Archive, ArchiveRestore, RotateCcw,
  ArrowDownAZ, Clock, Sparkles,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  addMemo, removeMemo, restoreMemo, purgeMemo, emptyTrash, updateMemo,
  togglePin, archiveMemo, unarchiveMemo, moveMemoToFolder,
  useMemos, useFolders, selectMemos,
  memoTitle, memoPreview, memoTimeLabel, trashCount,
  type MemoSortKey, type Memo,
} from '@/lib/memoStore';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

interface MemoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DrawerView = 'list' | 'editor' | 'trash';

export const MemoDrawer = ({ open, onOpenChange }: MemoDrawerProps) => {
  const navigate = useNavigate();
  const memos = useMemos();
  const folders = useFolders();
  const [view, setView] = useState<DrawerView>('list');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<MemoSortKey>('updated');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftBody, setDraftBody] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const editRef = useRef<HTMLTextAreaElement>(null);

  // drawer 닫힐 때 모든 상태 초기화 + 편집 중이면 자동 저장.
  // 편집 본문이 빈 문자열이면 저장 안 함 + (방금 startNew 로 만들어진 빈 메모면) 자동 정리.
  useEffect(() => {
    if (!open) {
      if (selectedId) {
        const trimmed = editBody.trim();
        if (trimmed) {
          updateMemo(selectedId, { body: trimmed });
        } else {
          const target = memos.find((m) => m.id === selectedId);
          if (target && (!target.body || target.body.trim().length === 0)) {
            removeMemo(selectedId, false); // 빈 메모는 휴지통 안 거치고 영구 정리
          }
        }
        setSelectedId(null);
        setEditBody('');
      }
      setView('list');
      setQuery('');
      setDrafting(false);
      setDraftBody('');
    }
  }, [open, selectedId, editBody, memos]);

  const filtered = useMemo(
    () => selectMemos(memos, {
      scope: view === 'trash' ? 'trash' : 'all',
      query: view === 'list' ? query : undefined,
      sort,
      includeArchived,
    }).slice(0, 50),
    [memos, view, query, sort, includeArchived],
  );

  const totalTrash = useMemo(() => trashCount(memos), [memos]);

  const submitDraft = () => {
    const trimmed = draftBody.trim();
    if (trimmed) {
      const created = addMemo({ body: trimmed });
      setSelectedId(created.id);
      setEditBody(trimmed);
      setView('editor');
    }
    setDrafting(false);
    setDraftBody('');
  };

  const openMemo = (id: string, body: string) => {
    setSelectedId(id);
    setEditBody(body);
    setView('editor');
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const closeEditor = () => {
    if (!selectedId) return;
    const trimmed = editBody.trim();
    if (trimmed) updateMemo(selectedId, { body: trimmed });
    setSelectedId(null);
    setEditBody('');
    setView('list');
  };

  /** 소프트 삭제 — 5초 undo 토스트. */
  const softDelete = (memo: Memo) => {
    removeMemo(memo.id);
    notify.success('휴지통으로 이동', {
      duration: 5000,
      action: { label: '되돌리기', onClick: () => restoreMemo(memo.id) },
    });
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    const target = memos.find((m) => m.id === selectedId);
    if (!target) return;
    softDelete(target);
    setSelectedId(null);
    setEditBody('');
    setView('list');
  };

  const startNew = () => {
    const created = addMemo({ body: '' });
    setSelectedId(created.id);
    setEditBody('');
    setView('editor');
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const selected = selectedId ? memos.find((m) => m.id === selectedId) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-[420px] p-0 flex flex-col">
        <SheetTitle className="sr-only">메모</SheetTitle>
        {/* 헤더 */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-foreground/20">
          {view !== 'list' ? (
            <button
              type="button"
              onClick={view === 'editor' ? closeEditor : () => setView('list')}
              aria-label="목록으로"
              title="목록으로 (Esc)"
              className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          <span className="text-[17px] font-semibold tracking-tight text-foreground">
            {view === 'trash' ? '휴지통' : '메모'}
          </span>
          {view === 'list' && (
            <span className="text-[11px] tabular-nums text-foreground/55">{filtered.length}</span>
          )}
          {view === 'trash' && (
            <span className="text-[11px] tabular-nums text-foreground/55">{filtered.length}</span>
          )}

          {/* ─── editor 모드: 핀 / 폴더 / 보관 / 삭제 ─── */}
          {view === 'editor' && selected && (
            <>
              <button
                type="button"
                onClick={() => togglePin(selected.id)}
                aria-label={selected.pinned ? '핀 해제' : '핀'}
                title={selected.pinned ? '핀 해제' : '핀 고정'}
                className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
              >
                {selected.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="폴더로 이동"
                    title="폴더로 이동"
                    className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <FolderInput className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel className="text-[10.5px] uppercase tracking-wide">폴더</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => moveMemoToFolder(selected.id, null)}>
                    <Folder className="mr-2 h-3.5 w-3.5" />
                    미분류
                    {!selected.folderId && <span className="ml-auto text-foreground/50">✓</span>}
                  </DropdownMenuItem>
                  {folders.length > 0 && <DropdownMenuSeparator />}
                  {folders.map((f) => (
                    <DropdownMenuItem key={f.id} onSelect={() => moveMemoToFolder(selected.id, f.id)}>
                      <span className="mr-2">{f.emoji ?? '📁'}</span>
                      <span className="truncate">{f.name}</span>
                      {selected.folderId === f.id && <span className="ml-auto text-foreground/50">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                type="button"
                onClick={() => {
                  if (selected.archivedAt) unarchiveMemo(selected.id);
                  else archiveMemo(selected.id);
                  notify.info(selected.archivedAt ? '보관함에서 빠짐' : '보관함으로 이동', { duration: 1500 });
                }}
                aria-label={selected.archivedAt ? '보관 해제' : '보관'}
                title={selected.archivedAt ? '보관 해제' : '보관함으로'}
                className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
              >
                {selected.archivedAt ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                aria-label="휴지통으로"
                title="휴지통으로"
                className="inline-flex h-7 w-7 items-center justify-center rounded text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {/* ─── list 모드: 정렬 / 휴지통 / 풀페이지 / 닫기 ─── */}
          {view === 'list' && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="정렬"
                    title={`정렬: ${sort === 'updated' ? '최근 수정' : sort === 'created' ? '생성순' : '제목순'}`}
                    className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {sort === 'title' ? <ArrowDownAZ className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuLabel className="text-[10.5px] uppercase tracking-wide">정렬</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => setSort('updated')}>
                    최근 수정 {sort === 'updated' && <span className="ml-auto text-foreground/50">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSort('created')}>
                    생성순 {sort === 'created' && <span className="ml-auto text-foreground/50">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSort('title')}>
                    제목순 (가나다) {sort === 'title' && <span className="ml-auto text-foreground/50">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setIncludeArchived((v) => !v)}>
                    {includeArchived ? <ArchiveRestore className="mr-2 h-3.5 w-3.5" /> : <Archive className="mr-2 h-3.5 w-3.5" />}
                    {includeArchived ? '보관함 숨기기' : '보관함 포함'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {totalTrash > 0 && (
                <button
                  type="button"
                  onClick={() => setView('trash')}
                  aria-label="휴지통"
                  title={`휴지통 (${totalTrash})`}
                  className="inline-flex h-7 px-1.5 gap-1 items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="text-[10.5px] tabular-nums">{totalTrash}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => { onOpenChange(false); navigate('/memos'); }}
                aria-label="메모 페이지로"
                title="메모 페이지로 (전체 보기)"
                className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="닫기"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ─── 편집 모드 ─── */}
        {view === 'editor' ? (
          <div className="flex-1 min-h-0 flex flex-col p-4 gap-2">
            {/* 폴더·보관 라벨 — 사용자가 현재 메모 컨텍스트 인지 */}
            {selected && (selected.folderId || selected.archivedAt || selected.pinned) && (
              <div className="shrink-0 flex items-center gap-2 text-[11px] text-foreground/55 -mt-1">
                {selected.pinned && <span className="inline-flex items-center gap-0.5">📌 고정됨</span>}
                {selected.folderId && (() => {
                  const f = folders.find((x) => x.id === selected.folderId);
                  return f ? <span className="inline-flex items-center gap-0.5">{f.emoji ?? '📁'} {f.name}</span> : null;
                })()}
                {selected.archivedAt && <span className="inline-flex items-center gap-0.5"><Archive className="h-3 w-3" /> 보관함</span>}
              </div>
            )}
            <textarea
              ref={editRef}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { e.preventDefault(); closeEditor(); }
                else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); closeEditor(); }
              }}
              placeholder="첫 줄 = 제목.  ⌘+Enter / ESC 저장 후 닫기"
              className="flex-1 min-h-0 resize-none bg-transparent text-[13.5px] leading-relaxed outline-none placeholder:text-foreground/45 text-foreground"
            />
            <div className="shrink-0 flex items-center justify-between text-[11px] text-foreground/55">
              <span>{editBody.length.toLocaleString()}자 · 자동 저장됨</span>
              <button
                type="button"
                onClick={closeEditor}
                className="text-foreground/70 hover:text-foreground"
              >
                완료
              </button>
            </div>
          </div>
        ) : view === 'trash' ? (
          /* ─── 휴지통 ─── */
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="shrink-0 px-4 py-2 flex items-center justify-between text-[11.5px] text-foreground/65 border-b hairline">
              <span>30일 후 자동 영구 삭제</span>
              {filtered.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(`휴지통의 ${filtered.length}개 메모를 영구 삭제할까요?`);
                    if (!ok) return;
                    const n = emptyTrash();
                    notify.info(`${n}개 영구 삭제됨`, { duration: 1500 });
                  }}
                  className="text-rose-500 hover:underline text-[11.5px]"
                >
                  비우기
                </button>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-8 text-[12.5px] text-foreground/55 text-center">휴지통 비어있음</p>
              ) : (
                <ul className="space-y-0.5">
                  {filtered.map((m) => (
                    <li key={m.id} className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-accent transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-medium text-foreground/80 truncate">{memoTitle(m)}</div>
                        <div className="text-[10.5px] text-foreground/50 tabular-nums">
                          {m.deletedAt ? memoTimeLabel(m.deletedAt) : ''} 삭제
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { restoreMemo(m.id); notify.success('복구됨', { duration: 1200 }); }}
                        aria-label="복구"
                        title="복구"
                        className="opacity-0 group-hover:opacity-100 inline-flex h-6 w-6 items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-accent transition-all"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const ok = window.confirm('영구 삭제할까요?');
                          if (!ok) return;
                          purgeMemo(m.id);
                        }}
                        aria-label="영구 삭제"
                        title="영구 삭제"
                        className="opacity-0 group-hover:opacity-100 inline-flex h-6 w-6 items-center justify-center rounded text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* ─── list 모드 ─── */}
            <div className="shrink-0 px-4 pt-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/45" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="메모 검색"
                  className="w-full pl-8 pr-3 py-1.5 text-[13px] rounded-md border border-foreground/20 bg-card focus:border-foreground/40 focus:outline-none placeholder:text-foreground/45"
                />
              </div>
            </div>

            <div className="shrink-0 px-4 pt-2">
              {!drafting ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDrafting(true)}
                    className="inline-flex items-center gap-1.5 text-[12px] text-foreground/65 hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    새 메모
                  </button>
                  <button
                    type="button"
                    onClick={startNew}
                    className="inline-flex items-center gap-1 text-[12px] text-foreground/55 hover:text-foreground transition-colors"
                    title="빈 메모 만들고 바로 편집"
                  >
                    <Sparkles className="h-3 w-3" /> 빈 메모로 바로 →
                  </button>
                </div>
              ) : (
                <div
                  className="flex flex-col gap-1.5 p-2 rounded-md border border-foreground/30 bg-accent/20"
                  onBlur={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                    submitDraft();
                  }}
                >
                  <textarea
                    autoFocus
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitDraft();
                      else if (e.key === 'Escape') { setDrafting(false); setDraftBody(''); }
                    }}
                    placeholder="첫 줄 = 제목.  ⌘+Enter 저장 / Esc 취소"
                    rows={3}
                    className="w-full bg-transparent text-[13px] outline-none resize-none placeholder:text-foreground/45"
                  />
                  <div className="flex justify-end gap-2 text-[11px]">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setDrafting(false); setDraftBody(''); }}
                      className="text-foreground/55 hover:text-foreground"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={submitDraft}
                      className="text-foreground font-medium hover:underline"
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-[12.5px] text-foreground/55 text-center">
                  {query ? '일치하는 메모 없음' : '메모 없음'}
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {filtered.map((m) => {
                    const folder = m.folderId ? folders.find((f) => f.id === m.folderId) : null;
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => openMemo(m.id, m.body)}
                          className={cn(
                            'w-full flex flex-col items-start gap-0.5 px-3 py-2 rounded text-left',
                            'hover:bg-accent transition-colors',
                          )}
                        >
                          <div className="flex items-baseline gap-2 w-full">
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                              {m.pinned && <span className="mr-1" aria-hidden>📌</span>}
                              {m.archivedAt && <span className="mr-1 opacity-60" aria-hidden>📥</span>}
                              {memoTitle(m)}
                            </span>
                            <span className="shrink-0 text-[10.5px] tabular-nums text-foreground/55">
                              {memoTimeLabel(m.updatedAt)}
                            </span>
                          </div>
                          {memoPreview(m) && (
                            <span className="text-[11.5px] text-foreground/55 leading-snug line-clamp-1">
                              {memoPreview(m)}
                            </span>
                          )}
                          {folder && (
                            <span className="text-[10.5px] text-foreground/50 inline-flex items-center gap-0.5">
                              {folder.emoji ?? '📁'} {folder.name}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
