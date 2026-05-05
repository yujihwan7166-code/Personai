/**
 * /memos — 인박스 zero 메모 페이지.
 *
 * 좌 사이드 (검색·필터·메모 리스트) + 본문 편집 (자동 저장).
 * 우상단 [→ 위키로 보내기] 버튼 — 모달에서 type 선택 + 보관 옵션.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Pin, Search, Trash2, X, ArrowRight, Archive, ArchiveRestore,
  ImagePlus,
  ExternalLink, Tag, Folder, FolderPlus, Check as CheckIcon, MoreHorizontal, ChevronRight, Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { WikiBlockEditor } from '@/components/wiki/WikiBlockEditor';
import { MemoToolbar } from '@/components/memo/MemoToolbar';
import type { Editor } from '@tiptap/react';
import '@/styles/memo.css';
import {
  useMemos, addMemo, updateMemo, removeMemo, togglePin,
  archiveMemo, unarchiveMemo, addMemoImage, removeMemoImage,
  memoTitle, memoPreview, extractMemoTags, memoTimeLabel,
  tagFrequencies,
  useFolders, addFolder, renameFolder, removeFolder, updateFolder, moveMemoToFolder,
  MEMO_FOLDER_COLORS,
  type Memo, type MemoFolder, type MemoFolderColor,
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
  const [editingFolder, setEditingFolder] = useState<MemoFolder | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  // archived 메모는 일반 list 에서 제외 — 별도 view 에서만.
  const activeMemos = useMemo(
    () => memos.filter((m) => !m.archivedAt),
    [memos],
  );
  const archivedMemos = useMemo(
    () => memos.filter((m) => m.archivedAt).sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0)),
    [memos],
  );

  // ──── 정렬·필터 ────
  const sortPinTime = useCallback((list: Memo[]): Memo[] =>
    [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    }), []);

  // 폴더별 메모 (핀 우선, 시간 desc) — archived 제외
  const memosOf = useCallback((folderId: string): Memo[] =>
    sortPinTime(activeMemos.filter((m) => m.folderId === folderId)),
    [activeMemos, sortPinTime]);

  // 미분류 — 핀 우선, 시간 desc — archived 제외
  const unfiledMemos = useMemo(() =>
    sortPinTime(activeMemos.filter((m) => !m.folderId)),
    [activeMemos, sortPinTime]);

  // 검색·태그 활성 시 → 평면 필터 결과
  const isFiltered = !!query.trim() || !!activeTag;
  const filteredMemos = useMemo(() => {
    if (!isFiltered) return [];
    let list = activeMemos;
    if (activeTag) {
      const t = activeTag.toLowerCase();
      list = list.filter((m) => extractMemoTags(m).includes(t));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((m) => m.body.toLowerCase().includes(q));
    }
    return sortPinTime(list);
  }, [isFiltered, activeMemos, query, activeTag, sortPinTime]);

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
        'shrink-0 border-r border-foreground/15 bg-card flex flex-col',
        isMobile ? 'w-full' : 'w-[320px]',
        !showSidebar && 'hidden',
      )}>
        {/* 상단 — 뒤로 + 제목 + 새 메모 */}
        <div className="shrink-0 px-3.5 py-3 border-b border-foreground/12 flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <h1 className="text-[15px] font-semibold text-foreground tracking-tight flex-1 flex items-center gap-1.5">
            <span aria-hidden className="text-[16px]">📝</span>
            <span>메모</span>
            <span className="text-[11.5px] font-normal text-muted-foreground tabular-nums">{activeMemos.length}</span>
          </h1>
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
        <div className="shrink-0 px-3.5 py-2.5 border-b border-foreground/12">
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
                      onEdit={() => setEditingFolder(f)}
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

              {/* 보관함 — 항상 하단 */}
              <button
                type="button"
                onClick={() => setShowArchive((v) => !v)}
                className={cn(
                  'mx-2 mt-2 mb-2 flex items-center gap-2 px-2.5 py-2 rounded-md text-[12.5px] transition-colors',
                  showArchive
                    ? 'bg-accent text-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )}
              >
                <Archive className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>보관함</span>
                <span className="ml-auto text-[10.5px] tabular-nums opacity-70">
                  {archivedMemos.length}
                </span>
              </button>
              {showArchive && (
                archivedMemos.length === 0 ? (
                  <p className="px-4 pb-3 text-[12px] text-muted-foreground text-center">
                    보관된 메모 없음
                  </p>
                ) : (
                  <ul className="px-2 pb-2">
                    {archivedMemos.map((m) => (
                      <MemoRow
                        key={m.id}
                        memo={m}
                        active={activeId === m.id}
                        onClick={() => setActiveId(m.id)}
                        loose
                        archived
                        onPin={() => togglePin(m.id)}
                        onMoveFolder={() => setMovingMemo(m)}
                        onDelete={() => handleDelete(m.id)}
                        onUnarchive={() => { unarchiveMemo(m.id); notify.success('복원됐어요', { duration: 1200 }); }}
                      />
                    ))}
                  </ul>
                )
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
      {editingFolder && (
        <FolderEditModal
          folder={editingFolder}
          onClose={() => setEditingFolder(null)}
          onDelete={() => {
            if (!window.confirm(`"${editingFolder.name}" 폴더를 지울까요? 안의 메모는 미분류로 이동합니다.`)) return;
            removeFolder(editingFolder.id);
            setEditingFolder(null);
          }}
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
  onToggle, onSelectMemo, onAddMemo, onStartRename, onFinishRename, onDelete, onEdit,
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
  onEdit: () => void;
  onMemoPin: (m: Memo) => void;
  onMemoMove: (m: Memo) => void;
  onMemoDelete: (m: Memo) => void;
}) {
  const folderColor = folder.color ? MEMO_FOLDER_COLORS[folder.color]?.stripe : undefined;
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
        <span
          className="inline-flex items-center justify-center h-5 w-5 rounded text-[14px] leading-none shrink-0"
          style={folderColor ? { backgroundColor: `color-mix(in oklab, ${folderColor} 22%, hsl(var(--background)))` } : undefined}
        >
          {folder.emoji ?? '📁'}
        </span>
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
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
            title="폴더 편집 (이름·이모지·색)"
          >
            <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={1.75} />
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

// ──────────────────────────────────────────
// 폴더 편집 모달 — 이름 / 이모지 / 색
const FOLDER_EMOJI_PRESETS = ['📁', '📒', '📚', '📝', '✨', '🚀', '💡', '🧠', '🎯', '🏷️', '⚡', '🔖'];
const FOLDER_COLOR_OPTIONS: Array<MemoFolderColor | null> = [
  null, 'blue', 'teal', 'green', 'amber', 'orange', 'rose', 'violet', 'cyan',
];

function FolderEditModal({
  folder, onClose, onDelete,
}: {
  folder: MemoFolder;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(folder.name);
  const [emoji, setEmoji] = useState(folder.emoji ?? '📁');
  const [color, setColor] = useState<MemoFolderColor | undefined>(folder.color);

  const save = () => {
    updateFolder(folder.id, {
      name: name.trim() || folder.name,
      emoji,
      color,
    });
    notify.success('폴더 저장됨', { duration: 1200 });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" hideClose>
        <DialogTitle className="text-[15px] font-semibold">폴더 편집</DialogTitle>
        <DialogDescription className="sr-only">폴더의 이름·이모지·색을 변경합니다.</DialogDescription>

        <div className="flex flex-col gap-4 mt-1">
          {/* 이름 + 미리보기 */}
          <div className="flex items-center gap-2">
            <span
              className="h-10 w-10 inline-flex items-center justify-center rounded-md text-[20px] shrink-0"
              style={color ? { backgroundColor: `color-mix(in oklab, ${MEMO_FOLDER_COLORS[color].stripe} 22%, hsl(var(--background)))` } : { backgroundColor: 'hsl(var(--accent))' }}
            >
              {emoji}
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="폴더 이름"
              onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
              className="flex-1 px-3 py-2 text-[14px] rounded-md border border-foreground/15 bg-card focus:border-foreground/40 focus:outline-none"
            />
          </div>

          {/* 이모지 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-foreground/80 leading-none">이모지</label>
            <div className="grid grid-cols-6 gap-1">
              {FOLDER_EMOJI_PRESETS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    'h-9 inline-flex items-center justify-center rounded-md text-[18px] hover:bg-accent transition-colors',
                    e === emoji && 'bg-accent ring-1 ring-foreground/30',
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* 색 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-foreground/80 leading-none">색</label>
            <div className="flex flex-wrap gap-1.5">
              {FOLDER_COLOR_OPTIONS.map((c) => {
                const stripe = c ? MEMO_FOLDER_COLORS[c].stripe : 'hsl(var(--muted-foreground))';
                const active = color === c || (!color && c === null);
                return (
                  <button
                    key={c ?? 'none'}
                    type="button"
                    onClick={() => setColor(c ?? undefined)}
                    title={c ?? '색 없음'}
                    className={cn(
                      'h-7 w-7 inline-flex items-center justify-center rounded-full border transition-all',
                      active ? 'border-foreground ring-2 ring-foreground/15' : 'border-foreground/15 hover:border-foreground/35',
                    )}
                    style={{ backgroundColor: c ? stripe : 'transparent' }}
                  >
                    {!c && <X className="h-3 w-3 text-foreground/55" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* footer */}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-[hsl(var(--hairline))]">
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1 px-3 py-1.5 text-[13px] rounded-md text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              삭제
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[13px] rounded-md text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!name.trim()}
                className="px-4 py-2 text-[13px] rounded-md bg-foreground text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  memo, active, onClick, loose = false, bare = false, archived = false,
  onPin, onMoveFolder, onDelete, onArchive, onUnarchive,
}: {
  memo: Memo; active: boolean; onClick: () => void;
  loose?: boolean;     // 최상위 미분류 — 폴더와 같은 크기(h-9 14px) + 작은 muted 점 prefix
  bare?: boolean;      // li 래퍼 없이 (FolderGroup 트리 안에서 li 직접 제공)
  archived?: boolean;  // 보관함 row (옅게 + 복원 액션)
  onPin?: () => void;
  onMoveFolder?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
}) {
  const title = memoTitle(memo);
  const preview = memoPreview(memo);
  const hasActions = !!(onPin || onMoveFolder || onDelete || onArchive || onUnarchive);
  // loose / bare: 2줄 카드 (제목 + 미리보기). 폴더 안 children: 1줄 컴팩트.
  const isCardMode = loose || bare;
  const inner = (
    <>
      <button
        onClick={onClick}
        className={cn(
          'relative w-full text-left transition-all',
          isCardMode
            ? 'flex flex-col gap-0.5 px-3 py-2.5 rounded-md border-b border-foreground/8'
            : 'flex items-center gap-2 h-8 px-3 rounded-md',
          hasActions && 'pr-9',
          active
            ? 'bg-primary/12 text-foreground shadow-[inset_3px_0_0_0_hsl(var(--primary))]'
            : 'text-foreground hover:bg-accent/70',
          archived && 'opacity-70',
        )}
      >
        {isCardMode ? (
          <>
            {/* row 1: pin + 제목 + 시간 */}
            <div className="flex items-center gap-1.5 w-full">
              {memo.pinned && (
                <Pin className="w-3 h-3 text-amber-500 shrink-0" fill="currentColor" strokeWidth={1.5} />
              )}
              <span className={cn(
                'truncate flex-1 text-[13.5px] leading-tight',
                active ? 'font-semibold text-foreground' : 'font-medium text-foreground',
                !memo.body.trim() && 'text-muted-foreground italic font-normal',
              )}>
                {title}
              </span>
              {memo.wikiPageId && (
                <ExternalLink className="w-3 h-3 text-primary/70 shrink-0" strokeWidth={1.75} />
              )}
              <span className={cn(
                'tabular-nums text-[10.5px] shrink-0',
                active ? 'text-foreground/65' : 'text-muted-foreground/70',
                hasActions && 'group-hover:invisible',
              )}>
                {memoTimeLabel(memo.updatedAt)}
              </span>
            </div>
            {/* row 2: 미리보기 (첫 본문 줄) */}
            {preview && (
              <span className="block truncate text-[11.5px] text-muted-foreground/85 leading-tight">
                {preview}
              </span>
            )}
          </>
        ) : (
          // 폴더 children — 컴팩트 1줄
          <>
            {memo.pinned ? (
              <Pin className="w-3 h-3 text-amber-500 shrink-0" fill="currentColor" strokeWidth={1.5} />
            ) : (
              <span aria-hidden className="w-1 h-1 rounded-full bg-muted-foreground/45 shrink-0" />
            )}
            <span className={cn(
              'truncate flex-1 text-[13px]',
              active && 'font-medium',
              !memo.body.trim() && 'text-muted-foreground italic',
            )}>
              {title}
            </span>
            {memo.wikiPageId && (
              <ExternalLink className="w-3 h-3 text-primary/70 shrink-0" strokeWidth={1.75} />
            )}
            <span className={cn(
              'tabular-nums text-[11px] shrink-0',
              active ? 'text-foreground/65' : 'text-muted-foreground/70',
              hasActions && 'group-hover:invisible',
            )}>
              {memoTimeLabel(memo.updatedAt)}
            </span>
          </>
        )}
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
            {onArchive && (
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
                보관
              </DropdownMenuItem>
            )}
            {onUnarchive && (
              <DropdownMenuItem onClick={onUnarchive}>
                <ArchiveRestore className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
                복원
              </DropdownMenuItem>
            )}
            {(onPin || onMoveFolder || onArchive || onUnarchive) && onDelete && <DropdownMenuSeparator />}
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
  const wrapClass = 'relative group';
  return bare
    ? <div className={wrapClass}>{inner}</div>
    : <li className={wrapClass}>{inner}</li>;
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
  const isArchived = !!memo.archivedAt;
  const fileInputRef = useRef<HTMLInputElement>(null);
  // TipTap 에디터 인스턴스 — 외부 툴바와 공유.
  const [tipTapEditor, setTipTapEditor] = useState<Editor | null>(null);

  // 이미지 첨부 — 파일을 dataURL 로 변환해 store 에 추가. 1MB 제한.
  const attachFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (arr.length === 0) return;
    for (const file of arr) {
      if (file.size > 2 * 1024 * 1024) {
        notify.warning(`"${file.name}" 너무 커요 (2MB 이하)`);
        continue;
      }
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        addMemoImage(memo.id, dataUrl, file.name);
      } catch {
        notify.warning(`"${file.name}" 첨부 실패`);
      }
    }
    notify.success(`이미지 ${arr.length}개 첨부됨`, { duration: 1200 });
  }, [memo.id]);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imgs = items.filter((it) => it.type.startsWith('image/')).map((it) => it.getAsFile()).filter((f): f is File => !!f);
    if (imgs.length > 0) {
      e.preventDefault();
      attachFiles(imgs);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    if (e.dataTransfer.files.length === 0) return;
    e.preventDefault();
    attachFiles(e.dataTransfer.files);
  };

  // memo 변경 시 (다른 메모 선택) draft 동기화
  useEffect(() => {
    setDraft(memo.body);
    setSaveState('saved');
  }, [memo.id, memo.body]);

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
  }, [draft, memo.body, memo.id]);

  const tags = useMemo(() => extractMemoTags({ ...memo, body: draft }), [draft, memo]);
  const charCount = draft.replace(/\s+/g, '').length;

  return (
    <>
      {/* 상단 액션바 — TipTap 툴바(중앙) + 위키 + ⋯ */}
      <div className="shrink-0 px-3 py-2 border-b border-[hsl(var(--hairline))] flex items-center gap-2">
        {onBackToList && (
          <button
            onClick={onBackToList}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
            aria-label="목록"
            title="목록으로"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          </button>
        )}
        {/* 작은 메타 (보관/녹음 출처) — 툴바 왼쪽에 컴팩트하게 */}
        {isArchived && (
          <span className="inline-flex items-center gap-1 px-2 h-7 rounded-md bg-foreground/10 text-foreground/70 text-[11px] font-medium shrink-0">
            <Archive className="w-3 h-3" strokeWidth={1.75} />
            보관됨
          </span>
        )}
        {memo.sourceRecordingId && memo.sourceRecordingTitle && (
          <span
            className="inline-flex items-center gap-1 px-2 h-7 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300 text-[11px] font-medium max-w-[160px] shrink-0"
            title={`출처 녹음: ${memo.sourceRecordingTitle}`}
          >
            <Mic className="w-3 h-3 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{memo.sourceRecordingTitle}</span>
          </span>
        )}
        {/* MemoToolbar — 2단 (인서트/포맷) 네이버 블로그 식. 가운데 flex-1 영역. */}
        <div className="flex-1 min-w-0 overflow-x-auto memo-toolbar-host">
          {tipTapEditor && (
            <MemoToolbar
              editor={tipTapEditor}
              onPickImage={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async () => {
                  const file = input.files?.[0];
                  if (!file) return;
                  const dataUrl: string = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsDataURL(file);
                  });
                  tipTapEditor.chain().focus().setImage({ src: dataUrl }).run();
                };
                input.click();
              }}
            />
          )}
        </div>
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
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={() => {
                // 첫 줄 = 제목, 나머지 = note. 자연어 파싱은 plannerInput 만 — 메모는 raw 변환.
                const lines = draft.split('\n');
                const title = (lines[0] ?? '').trim();
                if (!title) {
                  notify.warning('제목(첫 줄)이 비어있어요');
                  return;
                }
                const note = lines.slice(1).join('\n').trim();
                // 동적 import 회피 — 직접 import.
                import('@/services/planner/taskStore').then(({ taskStore }) => {
                  taskStore.add({
                    title: title.length > 120 ? title.slice(0, 120) : title,
                    note: note.length > 0 ? note : undefined,
                  });
                  notify.success('할 일로 추가됐어요', {
                    duration: 3500,
                    action: { label: '플래너 열기', onClick: () => navigate('/planner') },
                  });
                });
              }}
              disabled={!draft.trim()}
            >
              <ArrowRight className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
              할 일로 보내기
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onPin}>
              <Pin className="w-3.5 h-3.5 mr-2" fill={memo.pinned ? 'currentColor' : 'none'} strokeWidth={1.75} />
              {memo.pinned ? '고정 해제' : '맨 위에 고정'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMoveFolder}>
              <Folder className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
              폴더로 이동…
            </DropdownMenuItem>
            {isArchived ? (
              <DropdownMenuItem onClick={() => { unarchiveMemo(memo.id); notify.success('복원됐어요', { duration: 1200 }); }}>
                <ArchiveRestore className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
                보관함에서 복원
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => { archiveMemo(memo.id); notify.info('보관함으로 옮겼어요', { duration: 1200 }); }}>
                <Archive className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
                보관함으로
              </DropdownMenuItem>
            )}
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

      {/* 첨부 이미지 grid — 본문 위에 */}
      {(memo.images?.length ?? 0) > 0 && (
        <div className="shrink-0 px-6 sm:px-10 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {memo.images!.map((img) => (
              <div key={img.id} className="relative group/img rounded-md overflow-hidden border border-[hsl(var(--hairline))] aspect-video bg-foreground/5">
                <img
                  src={img.dataUrl}
                  alt={img.name ?? 'attached'}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeMemoImage(memo.id, img.id)}
                  aria-label="이미지 삭제"
                  className="absolute top-1 right-1 w-6 h-6 inline-flex items-center justify-center rounded-md bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 본문 — TipTap. 760px 폭 좌측 정렬 (사이드바 list 와 시각 라인 정렬) */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="memo-prose w-full max-w-[760px] px-6 sm:px-10 py-8">
          <WikiBlockEditor
            body={draft}
            onChange={setDraft}
            allPages={[]}
            hideToolbar
            onEditorReady={setTipTapEditor}
            firstPlaceholder="제목"
            restPlaceholder="여기에 자유롭게 적어보세요. / 로 명령"
            onUploadImage={async (file) => {
              const dataUrl: string = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(file);
              });
              return dataUrl;
            }}
          />
        </div>
      </div>

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
