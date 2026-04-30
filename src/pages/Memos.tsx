/**
 * /memos — 인박스 zero 메모 페이지.
 *
 * 좌 사이드 (검색·필터·메모 리스트) + 본문 편집 (자동 저장).
 * 우상단 [→ 위키로 보내기] 버튼 — 모달에서 type 선택 + 보관 옵션.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Pin, Search, Trash2, X, ArrowRight,
  ExternalLink, Tag, Folder, FolderPlus, Check as CheckIcon, MoreHorizontal, ChevronRight, Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  useMemos, addMemo, updateMemo, removeMemo, togglePin,
  memoTitle, extractMemoTags, memoTimeLabel,
  tagFrequencies,
  useFolders, addFolder, renameFolder, removeFolder, moveMemoToFolder,
  type Memo, type MemoFolder,
} from '@/lib/memoStore';
import { upsertPage } from '@/lib/wikiStore';
import { newWikiId, type WikiPage, type WikiPageType, USER_FACING_TYPES, WIKI_TYPE_META } from '@/types/wiki';

const Memos = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const memos = useMemos();
  const folders = useFolders();
  const [activeId, setActiveId] = useState<string | null>(searchParams.get('id'));

  // URL ?id= 변경 시 동기화 (위키 출처 칩에서 진입 등)
  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl && idFromUrl !== activeId) setActiveId(idFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // activeId 변경 시 URL 반영 (히스토리 깨끗하게)
  useEffect(() => {
    if (activeId) {
      if (searchParams.get('id') !== activeId) {
        setSearchParams({ id: activeId }, { replace: true });
      }
    } else if (searchParams.has('id')) {
      const next = new URLSearchParams(searchParams);
      next.delete('id');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined);
  const [exporting, setExporting] = useState<Memo | null>(null);
  const [movingMemo, setMovingMemo] = useState<Memo | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // ──── 정렬·필터 ────
  const sortPinTime = useCallback((list: Memo[]): Memo[] =>
    [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    }), []);

  // 폴더별 메모 (핀 우선, 시간 desc)
  const memosOf = useCallback((folderId: string): Memo[] =>
    sortPinTime(memos.filter((m) => m.folderId === folderId)),
    [memos, sortPinTime]);

  // 미분류 — 핀 우선, 시간 desc
  const unfiledMemos = useMemo(() =>
    sortPinTime(memos.filter((m) => !m.folderId)),
    [memos, sortPinTime]);

  // 검색·태그 활성 시 → 평면 필터 결과
  const isFiltered = !!query.trim() || !!activeTag;
  const filteredMemos = useMemo(() => {
    if (!isFiltered) return [];
    let list = memos;
    if (activeTag) {
      const t = activeTag.toLowerCase();
      list = list.filter((m) => extractMemoTags(m).includes(t));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((m) => m.body.toLowerCase().includes(q));
    }
    return sortPinTime(list);
  }, [isFiltered, memos, query, activeTag, sortPinTime]);

  const tags = useMemo(() => tagFrequencies(memos), [memos]);

  const activeMemo = activeId ? memos.find((m) => m.id === activeId) ?? null : null;

  // 활성 메모의 폴더는 자동 펼침 (선택 동기화 UX)
  useEffect(() => {
    if (activeMemo?.folderId && !expandedFolders.has(activeMemo.folderId)) {
      setExpandedFolders((prev) => new Set(prev).add(activeMemo.folderId!));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMemo?.folderId]);

  // 활성 메모가 삭제됐으면 해제
  useEffect(() => {
    if (activeId && !memos.find((m) => m.id === activeId)) {
      setActiveId(null);
    }
  }, [activeId, memos]);

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleNewMemo = useCallback((folderId?: string) => {
    const m = addMemo({ body: '' });
    if (folderId) {
      moveMemoToFolder(m.id, folderId);
      setExpandedFolders((prev) => new Set(prev).add(folderId));
    }
    setActiveId(m.id);
    setActiveTag(undefined);
    setQuery('');
  }, []);

  const handleDelete = useCallback((id: string) => {
    const snapshot = memos.find((m) => m.id === id);
    if (!snapshot) return;
    removeMemo(id);
    notify.info('메모 삭제됨', {
      duration: 5000,
      action: {
        label: '되돌리기',
        onClick: () => {
          // 새 id 로 복원 (폴더 위치 유지)
          const restored = addMemo({ body: snapshot.body, pinned: snapshot.pinned });
          if (snapshot.folderId) moveMemoToFolder(restored.id, snapshot.folderId);
        },
      },
    });
    if (activeId === id) setActiveId(null);
  }, [memos, activeId]);

  // 모바일 — 좁은 화면에서 사이드 ↔ 본문 토글 (활성 메모 있으면 본문)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const showSidebar = !isMobile || !activeMemo;
  const showBody = !isMobile || !!activeMemo;

  return (
    <div className="min-h-screen flex bg-background">
      {/* 좌 사이드 */}
      <aside className={cn(
        'shrink-0 border-r border-[hsl(var(--hairline))] bg-card flex flex-col',
        isMobile ? 'w-full' : 'w-[320px]',
        !showSidebar && 'hidden',
      )}>
        {/* 상단 — 뒤로 + 제목 + 새 메모 */}
        <div className="shrink-0 px-3.5 py-3 border-b border-[hsl(var(--hairline))] flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <h1 className="text-[15px] font-semibold text-foreground tracking-tight flex-1">메모</h1>
          <button
            onClick={() => setCreatingFolder(true)}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="새 폴더"
          >
            <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.75} />
            폴더
          </button>
          <button
            onClick={() => handleNewMemo()}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[12px] font-medium text-primary hover:bg-primary/10 transition-colors"
            title="새 메모"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            메모
          </button>
        </div>

        {/* 검색 */}
        <div className="shrink-0 px-3.5 py-2.5 border-b border-[hsl(var(--hairline))]">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-accent/50">
            <Search className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색..."
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {/* 한 흐름 스크롤 리스트 — 폴더들 → 미분류 메모들 (헤더 없음) */}
        <div className="flex-1 overflow-y-auto">
          {isFiltered ? (
            // ─── 검색·태그 활성 시 평면 결과 ───
            <>
              {activeTag && (
                <div className="px-3.5 pt-3 pb-2 flex items-center gap-2">
                  <span className="text-[12px] font-medium text-primary">#{activeTag}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{filteredMemos.length}</span>
                  <button
                    onClick={() => setActiveTag(undefined)}
                    className="ml-auto w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="태그 해제"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              )}
              {filteredMemos.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">결과 없음</p>
              ) : (
                <ul className="px-2 py-1">
                  {filteredMemos.map((m) => (
                    <MemoRow
                      key={m.id}
                      memo={m}
                      active={activeId === m.id}
                      onClick={() => setActiveId(m.id)}
                      loose
                      onPin={() => togglePin(m.id)}
                      onMoveFolder={() => setMovingMemo(m)}
                      onDelete={() => handleDelete(m.id)}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              {/* 폴더들 — 헤더 없이 바로 */}
              {(folders.length > 0 || creatingFolder) && (
                <div className="px-2 pt-2 pb-1 space-y-0.5">
                  {folders.map((f) => (
                    <FolderGroup
                      key={f.id}
                      folder={f}
                      memos={memosOf(f.id)}
                      expanded={expandedFolders.has(f.id)}
                      renaming={renamingFolderId === f.id}
                      activeId={activeId}
                      onToggle={() => toggleFolder(f.id)}
                      onSelectMemo={(id) => setActiveId(id)}
                      onAddMemo={() => handleNewMemo(f.id)}
                      onStartRename={() => setRenamingFolderId(f.id)}
                      onFinishRename={(name) => {
                        if (name.trim()) renameFolder(f.id, name);
                        setRenamingFolderId(null);
                      }}
                      onDelete={() => {
                        if (!window.confirm(`"${f.name}" 폴더를 지울까요? 안에 있는 메모는 위쪽 메모 목록으로 이동합니다.`)) return;
                        removeFolder(f.id);
                      }}
                      onMemoPin={(m) => togglePin(m.id)}
                      onMemoMove={(m) => setMovingMemo(m)}
                      onMemoDelete={(m) => handleDelete(m.id)}
                    />
                  ))}
                  {creatingFolder && (
                    <NewFolderInput
                      onSubmit={(name) => {
                        if (name.trim()) {
                          const f = addFolder(name);
                          setExpandedFolders((prev) => new Set(prev).add(f.id));
                        }
                        setCreatingFolder(false);
                      }}
                      onCancel={() => setCreatingFolder(false)}
                    />
                  )}
                </div>
              )}

              {/* 미분류 메모 — 헤더·분리선 없이 폴더 바로 아래 (작은 점으로 "폴더 밖" 표시) */}
              {unfiledMemos.length > 0 ? (
                <ul className="px-2 pb-1">
                  {unfiledMemos.map((m) => (
                    <MemoRow
                      key={m.id}
                      memo={m}
                      active={activeId === m.id}
                      onClick={() => setActiveId(m.id)}
                      loose
                      onPin={() => togglePin(m.id)}
                      onMoveFolder={() => setMovingMemo(m)}
                      onDelete={() => handleDelete(m.id)}
                    />
                  ))}
                </ul>
              ) : (
                folders.length === 0 && !creatingFolder && (
                  <div className="px-4 py-10 text-center">
                    <p className="text-[13px] text-foreground mb-1">비어있음</p>
                    <p className="text-[12px] text-muted-foreground">+ 버튼으로 새 메모를 시작</p>
                  </div>
                )
              )}

              {/* 태그 — 하단 칩 */}
              {tags.length > 0 && (
                <div className="px-3.5 py-3 mt-2 border-t border-[hsl(var(--hairline))]">
                  <div className="flex flex-wrap gap-1.5">
                    {tags.slice(0, 12).map(([tag, n]) => (
                      <button
                        key={tag}
                        onClick={() => { setActiveTag(activeTag === tag ? undefined : tag); }}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] transition-colors',
                          activeTag === tag
                            ? 'bg-primary/15 text-primary font-medium'
                            : 'bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                      >
                        <span>#{tag}</span>
                        <span className="text-[10.5px] tabular-nums opacity-70">{n}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* 본문 영역 */}
      <main className={cn('flex-1 min-w-0 flex flex-col bg-background', !showBody && 'hidden')}>
        {activeMemo ? (
          <MemoEditor
            memo={activeMemo}
            onDelete={() => handleDelete(activeMemo.id)}
            onPin={() => togglePin(activeMemo.id)}
            onSendToWiki={() => setExporting(activeMemo)}
            onMoveFolder={() => setMovingMemo(activeMemo)}
            onTagClick={(tag) => { setActiveTag(tag); }}
            onBackToList={isMobile ? () => setActiveId(null) : undefined}
            folders={folders}
          />
        ) : (
          <EmptyState onNew={handleNewMemo} />
        )}
      </main>

      {exporting && (
        <ExportToWikiModal
          memo={exporting}
          onClose={() => setExporting(null)}
        />
      )}
      {movingMemo && (
        <MoveToFolderModal
          memo={movingMemo}
          folders={folders}
          onClose={() => setMovingMemo(null)}
        />
      )}
    </div>
  );
};

export default Memos;

// ──────────────────────────────────────────
// 폴더 = 펼침형 그룹 — 헤더 클릭 시 안 메모 인라인 노출
function FolderGroup({
  folder, memos, expanded, renaming, activeId,
  onToggle, onSelectMemo, onAddMemo, onStartRename, onFinishRename, onDelete,
  onMemoPin, onMemoMove, onMemoDelete,
}: {
  folder: MemoFolder;
  memos: Memo[];
  expanded: boolean;
  renaming: boolean;
  activeId: string | null;
  onToggle: () => void;
  onSelectMemo: (id: string) => void;
  onAddMemo: () => void;
  onStartRename: () => void;
  onFinishRename: (name: string) => void;
  onDelete: () => void;
  onMemoPin: (m: Memo) => void;
  onMemoMove: (m: Memo) => void;
  onMemoDelete: (m: Memo) => void;
}) {
  const [draft, setDraft] = useState(folder.name);
  useEffect(() => { setDraft(folder.name); }, [folder.name, renaming]);

  if (renaming) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-accent/60">
        <span className="text-[15px] leading-none">{folder.emoji ?? '📁'}</span>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onFinishRename(draft);
            if (e.key === 'Escape') onFinishRename(folder.name);
          }}
          onBlur={() => onFinishRename(draft)}
          className="flex-1 bg-transparent text-[14px] text-foreground outline-none"
        />
      </div>
    );
  }

  return (
    <div>
      <div
        className="group flex items-center gap-2 h-9 px-3 rounded-md cursor-pointer text-foreground hover:bg-accent transition-colors"
        onClick={onToggle}
        onDoubleClick={onStartRename}
      >
        <ChevronRight
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0',
            expanded && 'rotate-90',
          )}
          strokeWidth={2}
        />
        <span className="text-[15px] leading-none shrink-0">{folder.emoji ?? '📁'}</span>
        <span className="flex-1 text-[14px] font-medium truncate">{folder.name}</span>
        <span className="text-[12px] tabular-nums text-muted-foreground group-hover:hidden">{memos.length}</span>
        <div className="hidden group-hover:flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddMemo(); }}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            title="이 폴더에 새 메모"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onStartRename(); }}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
            title="이름 바꾸기"
          >
            <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="삭제"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* 펼친 상태 — ㄴ 트리 커넥터로 자식 메모 표시 */}
      {expanded && (
        memos.length === 0 ? (
          <p className="ml-8 h-8 flex items-center px-3 text-[12px] text-muted-foreground italic">비어있음</p>
        ) : (
          <ul>
            {memos.map((m, i) => {
              const isLast = i === memos.length - 1;
              return (
                <li key={m.id} className="relative pl-8">
                  {/* 세로 가이드 — chevron 중앙 (x=19) 정렬, 마지막은 가로 스텁까지만 */}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute left-[19px] top-0 w-px bg-[hsl(var(--hairline))]',
                      isLast ? 'h-4' : 'h-full',
                    )}
                  />
                  {/* 가로 스텁 — 행 세로 중앙 (h-8 → top 16px) */}
                  <span
                    aria-hidden
                    className="absolute left-[19px] top-4 w-[13px] h-px bg-[hsl(var(--hairline))]"
                  />
                  <MemoRow
                    memo={m}
                    active={activeId === m.id}
                    onClick={() => onSelectMemo(m.id)}
                    bare
                    onPin={() => onMemoPin(m)}
                    onMoveFolder={() => onMemoMove(m)}
                    onDelete={() => onMemoDelete(m)}
                  />
                </li>
              );
            })}
          </ul>
        )
      )}
    </div>
  );
}

function NewFolderInput({ onSubmit, onCancel }: { onSubmit: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-accent/60">
      <span className="text-[14px] leading-none">📁</span>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit(name);
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={() => name.trim() ? onSubmit(name) : onCancel()}
        placeholder="폴더 이름"
        className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
      />
    </div>
  );
}

function MoveToFolderModal({ memo, folders, onClose }: { memo: Memo; folders: MemoFolder[]; onClose: () => void }) {
  const handleMove = (folderId: string | null) => {
    moveMemoToFolder(memo.id, folderId);
    notify.success(folderId ? `${folders.find((f) => f.id === folderId)?.name} 으로 이동` : '미분류로 이동', { duration: 1800 });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/15 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[380px] bg-card rounded-lg border border-[hsl(var(--hairline))] shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-3.5 border-b border-[hsl(var(--hairline))] flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-foreground">폴더 이동</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="닫기">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {folders.length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-muted-foreground">폴더가 없어요. 사이드바에서 만들어주세요.</p>
          ) : (
            folders.map((f) => (
              <FolderOption
                key={f.id}
                label={`${f.emoji ?? '📁'} ${f.name}`}
                active={memo.folderId === f.id}
                onClick={() => handleMove(f.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FolderOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-5 py-2.5 text-[13px] text-left hover:bg-accent transition-colors',
        active && 'bg-primary/10 text-primary font-medium',
      )}
    >
      <span className="flex-1">{label}</span>
      {active && <CheckIcon className="w-4 h-4" strokeWidth={2} />}
    </button>
  );
}

// ──────────────────────────────────────────
function MemoRow({
  memo, active, onClick, loose = false, bare = false,
  onPin, onMoveFolder, onDelete,
}: {
  memo: Memo; active: boolean; onClick: () => void;
  loose?: boolean;     // 최상위 미분류 — 폴더와 같은 크기(h-9 14px) + 작은 muted 점 prefix
  bare?: boolean;      // li 래퍼 없이 (FolderGroup 트리 안에서 li 직접 제공)
  onPin?: () => void;
  onMoveFolder?: () => void;
  onDelete?: () => void;
}) {
  const title = memoTitle(memo);
  const hasActions = !!(onPin || onMoveFolder || onDelete);
  const inner = (
    <>
      <button
        onClick={onClick}
        className={cn(
          'w-full text-left rounded-md flex items-center gap-2 transition-colors',
          loose ? 'h-9 px-3' : 'h-8 px-3',
          hasActions && 'pr-9', // ⋯ 자리 확보
          active
            ? 'bg-primary/12 text-primary'
            : 'text-foreground hover:bg-accent',
        )}
      >
        {loose && !memo.pinned && (
          <span
            aria-hidden
            className="w-1 h-1 rounded-full bg-muted-foreground/45 shrink-0"
          />
        )}
        {memo.pinned && (
          <Pin
            className={cn(
              'text-amber-500 shrink-0',
              loose ? 'w-3.5 h-3.5' : 'w-3 h-3',
            )}
            fill="currentColor"
            strokeWidth={1.5}
          />
        )}
        <span className={cn(
          'truncate flex-1',
          loose ? 'text-[14px]' : 'text-[13px]',
          active && 'font-medium',
          !memo.body.trim() && 'text-muted-foreground italic',
        )}>
          {title}
        </span>
        {memo.wikiPageId && (
          <ExternalLink
            className={cn(
              'text-primary/70 shrink-0',
              loose ? 'w-3.5 h-3.5' : 'w-3 h-3',
            )}
            strokeWidth={1.75}
          />
        )}
        <span className={cn(
          'tabular-nums text-muted-foreground/80 shrink-0',
          loose ? 'text-[12px]' : 'text-[11px]',
          hasActions && 'group-hover:invisible',
        )}>
          {memoTimeLabel(memo.updatedAt)}
        </span>
      </button>
      {hasActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-background hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 transition-opacity"
              aria-label="더 보기"
            >
              <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {onPin && (
              <DropdownMenuItem onClick={onPin}>
                <Pin
                  className="w-3.5 h-3.5 mr-2"
                  fill={memo.pinned ? 'currentColor' : 'none'}
                  strokeWidth={1.75}
                />
                {memo.pinned ? '고정 해제' : '맨 위에 고정'}
              </DropdownMenuItem>
            )}
            {onMoveFolder && (
              <DropdownMenuItem onClick={onMoveFolder}>
                <Folder className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
                폴더로 이동…
              </DropdownMenuItem>
            )}
            {(onPin || onMoveFolder) && onDelete && <DropdownMenuSeparator />}
            {onDelete && (
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
                삭제
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
  return bare
    ? <div className="relative group">{inner}</div>
    : <li className="relative group">{inner}</li>;
}

// ──────────────────────────────────────────
function MemoEditor({
  memo, onDelete, onPin, onSendToWiki, onMoveFolder, onTagClick, onBackToList, folders,
}: {
  memo: Memo;
  onDelete: () => void;
  onPin: () => void;
  onSendToWiki: () => void;
  onMoveFolder: () => void;
  onTagClick: (tag: string) => void;
  onBackToList?: () => void;  // 모바일 — 목록으로 돌아가기
  folders: MemoFolder[];
}) {
  const currentFolder = memo.folderId ? folders.find((f) => f.id === memo.folderId) : null;
  const navigate = useNavigate();
  const [draft, setDraft] = useState(memo.body);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const debounceRef = useRef<number | null>(null);

  // memo 변경 시 (다른 메모 선택) draft 동기화
  useEffect(() => {
    setDraft(memo.body);
    setSaveState('saved');
  }, [memo.id]);

  // 자동 저장 — 400ms debounce
  useEffect(() => {
    if (draft === memo.body) return;
    setSaveState('saving');
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateMemo(memo.id, { body: draft });
      setSaveState('saved');
    }, 400);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, memo.id]);

  const tags = useMemo(() => extractMemoTags({ ...memo, body: draft }), [draft, memo]);
  const charCount = draft.replace(/\s+/g, '').length;

  return (
    <>
      {/* 상단 액션바 — 위키로 보내기(메인) + ⋯ (핀·폴더·삭제) */}
      <div className="shrink-0 px-6 py-3 border-b border-[hsl(var(--hairline))] flex items-center gap-2">
        {onBackToList && (
          <button
            onClick={onBackToList}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="목록"
            title="목록으로"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          </button>
        )}
        {/* 자동 저장 상태 — 좌상단 빈 공간 채움 */}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 h-7 px-2 text-[11.5px] tabular-nums select-none',
            saveState === 'saving' ? 'text-amber-600' : 'text-muted-foreground',
          )}
          title={saveState === 'saving' ? '저장 중' : '자동 저장됨'}
        >
          <span
            aria-hidden
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              saveState === 'saving'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-emerald-500/70',
            )}
          />
          {saveState === 'saving' ? '저장 중…' : '저장됨'}
        </span>
        <span className="text-border">·</span>
        <span className="text-[11.5px] text-muted-foreground tabular-nums select-none">
          {memoTimeLabel(memo.updatedAt)} 수정
        </span>
        {/* 핀이 켜진 메모는 작은 인디케이터만 (토글은 ⋯ 메뉴에서) */}
        {memo.pinned && (
          <span className="inline-flex items-center gap-1 px-2 h-7 rounded-md bg-amber-500/10 text-amber-600 text-[11px] font-medium">
            <Pin className="w-3 h-3" fill="currentColor" strokeWidth={1.5} />
            고정됨
          </span>
        )}
        {/* 현재 폴더 표시 (정보용) */}
        {currentFolder && (
          <span className="inline-flex items-center gap-1 px-2 h-7 rounded-md text-[11px] text-muted-foreground">
            <Folder className="w-3 h-3" strokeWidth={1.75} />
            {currentFolder.emoji ?? '📁'} {currentFolder.name}
          </span>
        )}
        {/* 녹음에서 승격된 메모 — 출생지 칩 */}
        {memo.sourceRecordingId && memo.sourceRecordingTitle && (
          <span
            className="inline-flex items-center gap-1 px-2 h-7 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300 text-[11px] font-medium max-w-[200px]"
            title={`출처 녹음: ${memo.sourceRecordingTitle}${memo.sourceChapterIndex !== undefined ? ` (챕터 ${memo.sourceChapterIndex + 1})` : ''}`}
          >
            <Mic className="w-3 h-3 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{memo.sourceRecordingTitle}</span>
          </span>
        )}
        <div className="flex-1" />
        {memo.wikiPageId ? (
          <button
            onClick={() => navigate('/wiki')}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
            위키 페이지 열기
          </button>
        ) : (
          <button
            onClick={onSendToWiki}
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            위키로 보내기
          </button>
        )}
        {/* ⋯ 메뉴 — 부가 액션 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="더 보기"
              title="더 보기"
            >
              <MoreHorizontal className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onPin}>
              <Pin className="w-3.5 h-3.5 mr-2" fill={memo.pinned ? 'currentColor' : 'none'} strokeWidth={1.75} />
              {memo.pinned ? '고정 해제' : '맨 위에 고정'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMoveFolder}>
              <Folder className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
              폴더로 이동…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 본문 textarea — 첫 줄(제목) ::first-line 으로 살짝 크게 */}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        placeholder="첫 줄이 제목이에요. 여러 줄 쓰면 본문..."
        className={cn(
          'flex-1 w-full px-6 sm:px-10 py-6 bg-transparent resize-none',
          'text-[16px] leading-[1.72] text-foreground placeholder:text-muted-foreground',
          // focus 시 outline·border·ring 모두 제거
          'border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-none focus:shadow-none',
          // 첫 줄 = 제목 — 24px semibold, leading 1.6 (본문과 1.5× 위계 + 숨통)
          '[&::first-line]:text-[24px] [&::first-line]:font-semibold [&::first-line]:leading-[1.6]',
        )}
        style={{ fontFamily: 'var(--wiki-font-body, system-ui)' }}
      />

      {/* 하단 메타 */}
      <div className="shrink-0 px-6 sm:px-10 py-2.5 border-t border-[hsl(var(--hairline))] flex items-center gap-3 text-[12px] text-muted-foreground">
        <span className="tabular-nums">{charCount.toLocaleString()}자</span>
        {tags.length > 0 && (
          <>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1.5 flex-wrap">
              <Tag className="w-3.5 h-3.5" strokeWidth={1.75} />
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => onTagClick(t)}
                  className="hover:text-primary transition-colors"
                >
                  #{t}
                </button>
              ))}
            </span>
          </>
        )}
      </div>
    </>
  );
}

// ──────────────────────────────────────────
function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-5">✏️</div>
        <p className="text-[16px] font-medium text-foreground mb-2">지금 머리에 떠오른 한 가지를 적어보세요.</p>
        <p className="text-[13px] text-muted-foreground mb-7">
          여기 적은 메모는 나중에 한 클릭으로 위키로 보낼 수 있어요.
        </p>
        <button
          onClick={onNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          새 메모 시작
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
function ExportToWikiModal({ memo, onClose }: { memo: Memo; onClose: () => void }) {
  const navigate = useNavigate();
  const [wikiType, setWikiType] = useState<WikiPageType>('concept');
  const [busy, setBusy] = useState(false);

  const title = memoTitle(memo);

  const submit = async () => {
    if (!memo.body.trim()) return;
    setBusy(true);
    try {
      const now = Date.now();
      const tags = extractMemoTags(memo);
      const body = memo.body.split('\n').slice(1).join('\n').trim() || memo.body;
      const page: WikiPage = {
        id: newWikiId(),
        title: title.length > 80 ? title.slice(0, 80) : title,
        aliases: [],
        type: wikiType,
        status: 'draft',
        tags,
        body,
        refersTo: [],
        cites: [],
        inherits: [],
        similarTo: [],
        parentMocs: [],
        createdAt: now,
        updatedAt: now,
      };
      await upsertPage(page);
      updateMemo(memo.id, { wikiPageId: page.id });
      notify.success('위키 페이지로 보냈어요', {
        duration: 3500,
        action: { label: '위키 열기', onClick: () => navigate('/wiki') },
      });
      onClose();
    } catch (e) {
      notify.error('위키로 보내기 실패', { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/15 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[440px] bg-card rounded-lg border border-[hsl(var(--hairline))] shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-4 border-b border-[hsl(var(--hairline))] flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">위키로 보내기</p>
            <h3 className="text-[16px] font-semibold text-foreground truncate">{title}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="닫기">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-[12px] font-semibold text-foreground block mb-2.5">어떤 type 으로?</label>
            <div className="grid grid-cols-2 gap-2">
              {USER_FACING_TYPES.filter((t) => t !== 'index').map((t) => {
                const meta = WIKI_TYPE_META[t];
                const active = wikiType === t;
                return (
                  <button
                    key={t}
                    onClick={() => setWikiType(t)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-2.5 rounded-md border text-[13px] transition-colors',
                      active
                        ? 'bg-primary/10 text-primary border-primary/40'
                        : 'bg-card text-foreground border-[hsl(var(--hairline))] hover:bg-accent',
                    )}
                  >
                    <span>{meta.icon}</span>
                    <span className="font-medium">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        <div className="shrink-0 px-5 py-3 border-t border-[hsl(var(--hairline))] bg-accent/20 flex items-center justify-between gap-3">
          <button onClick={onClose} className="text-[13px] text-muted-foreground hover:text-foreground">취소</button>
          <button
            onClick={submit}
            disabled={busy || !memo.body.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            보내기
          </button>
        </div>
      </div>
    </div>
  );
}
