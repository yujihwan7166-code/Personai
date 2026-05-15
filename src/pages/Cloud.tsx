/** /cloud — 드라이브형 파일 관리 + 인플레이스 에디터.
 *  2-B-1: 메타데이터 CRUD 연결 (폴더/별표/휴지통 모드 + 별표 토글 + 이름변경 + 휴지통/복원/영구삭제).
 *  파일 binary 업로드/다운로드는 청크 4(Storage) 후 별도 단계.
 */

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Upload, Search, Settings, Eye,
  FileText, FileSpreadsheet, Presentation, Folder, FolderPlus,
  Clock, Star, Share2, Trash2, ChevronRight, Pencil, RotateCcw, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { confirmDialog } from '@/lib/confirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCloudNodes, type CloudListMode } from '@/hooks/useCloudNodes';
import {
  createFolder, setStarred, renameNode, moveToTrash, restoreFromTrash, permanentDelete,
  searchByName, fetchNode,
} from '@/lib/cloudClient';
import {
  type CloudNode, FILE_TYPE_EMOJI, FILE_TYPE_LABEL, formatSize,
} from '@/types/cloud';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface BreadcrumbItem {
  id: string | null; // null = 루트
  name: string;
}

export default function Cloud() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [listMode, setListMode] = useState<CloudListMode>('folder');
  const [trail, setTrail] = useState<BreadcrumbItem[]>([{ id: null, name: '내 파일' }]);
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const currentFolderId = trail[trail.length - 1].id;
  const { nodes, loading, error, refresh, starredCount, trashCount } = useCloudNodes({
    mode: listMode,
    parentFolderId: currentFolderId,
  });

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  const notReady = useCallback(() => {
    toast({
      title: '곧 활성화돼요',
      description: 'Storage 셋업(청크 4) 후 파일 업로드·편집이 추가됩니다.',
    });
  }, []);

  // ─── 모드 전환 ───
  const switchMode = useCallback((m: CloudListMode) => {
    setListMode(m);
    setSelectedId(null);
    setEditingId(null);
    if (m === 'folder') {
      // 폴더 모드 진입 시 루트로 (사이드바 '내 파일' 클릭 효과)
      setTrail([{ id: null, name: '내 파일' }]);
    }
  }, []);

  // ─── 폴더 진입·breadcrumb ───
  const goInto = useCallback((node: CloudNode) => {
    if (node.kind === 'folder' && listMode === 'folder') {
      setTrail((t) => [...t, { id: node.id, name: node.name }]);
      setSelectedId(null);
    } else {
      setSelectedId(node.id);
    }
  }, [listMode]);

  const goToTrailIndex = useCallback((idx: number) => {
    setTrail((t) => t.slice(0, idx + 1));
    setSelectedId(null);
  }, []);

  // ─── 새 폴더 ───
  const openNewFolderInput = useCallback(() => {
    setShowFolderInput(true);
    setFolderNameInput('');
  }, []);

  const cancelNewFolder = useCallback(() => {
    setShowFolderInput(false);
    setFolderNameInput('');
  }, []);

  const submitNewFolder = useCallback(async () => {
    const name = folderNameInput.trim();
    if (!name) {
      cancelNewFolder();
      return;
    }
    if (!user) {
      toast({ title: '로그인이 필요해요', description: '클라우드 사용은 로그인 후 가능합니다.' });
      return;
    }
    setCreating(true);
    try {
      await createFolder(user.id, name, currentFolderId);
      cancelNewFolder();
      await refresh();
      toast({ title: '폴더가 만들어졌어요', description: name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '폴더 만들기 실패', description: msg });
    } finally {
      setCreating(false);
    }
  }, [folderNameInput, user, currentFolderId, refresh, cancelNewFolder]);

  // ─── 별표 토글 ───
  const handleToggleStar = useCallback(async (node: CloudNode) => {
    try {
      await setStarred(node.id, !node.starred);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '별표 변경 실패', description: msg });
    }
  }, [refresh]);

  // ─── 이름 변경 ───
  const startRename = useCallback((id: string) => {
    setEditingId(id);
    setSelectedId(id);
  }, []);

  const submitRename = useCallback(async (id: string, newName: string) => {
    const trimmed = newName.trim();
    setEditingId(null);
    if (!trimmed) return;
    const original = nodes.find((n) => n.id === id);
    if (!original || original.name === trimmed) return;
    try {
      await renameNode(id, trimmed);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '이름 변경 실패', description: msg });
    }
  }, [nodes, refresh]);

  // ─── 휴지통으로 이동 ───
  const handleMoveToTrash = useCallback(async (node: CloudNode) => {
    try {
      await moveToTrash(node.id);
      await refresh();
      setSelectedId(null);
      toast({ title: '휴지통으로 이동했어요', description: node.name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '삭제 실패', description: msg });
    }
  }, [refresh]);

  // ─── 휴지통에서 복원 ───
  const handleRestore = useCallback(async (node: CloudNode) => {
    try {
      await restoreFromTrash(node.id);
      await refresh();
      setSelectedId(null);
      toast({ title: '복원했어요', description: node.name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '복원 실패', description: msg });
    }
  }, [refresh]);

  // ─── 영구 삭제 ───
  const handlePermanentDelete = useCallback(async (node: CloudNode) => {
    const ok = await confirmDialog({
      title: '영구 삭제',
      description: `"${node.name}"을 완전히 삭제할까요? 이 동작은 되돌릴 수 없습니다.`,
      confirmLabel: '영구 삭제',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await permanentDelete(node.id);
      await refresh();
      setSelectedId(null);
      toast({ title: '영구 삭제했어요', description: node.name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '영구 삭제 실패', description: msg });
    }
  }, [refresh]);

  // ─── 검색 결과 선택 (모달에서 클릭) ───
  const handleSearchSelect = useCallback(async (node: CloudNode) => {
    setSearchOpen(false);
    setListMode('folder');
    if (node.kind === 'folder') {
      // 그 폴더로 점프. trail 은 단순화 (루트 + 그 폴더). 다중 단계 경로는 추후.
      setTrail([{ id: null, name: '내 파일' }, { id: node.id, name: node.name }]);
      setSelectedId(null);
    } else {
      // 파일이면 부모 폴더로 점프 + selectedId 설정
      if (node.parentFolderId === null) {
        setTrail([{ id: null, name: '내 파일' }]);
      } else {
        try {
          const parent = await fetchNode(node.parentFolderId);
          setTrail([
            { id: null, name: '내 파일' },
            ...(parent ? [{ id: parent.id, name: parent.name }] : []),
          ]);
        } catch {
          setTrail([{ id: null, name: '내 파일' }]);
        }
      }
      setSelectedId(node.id);
    }
  }, []);

  // ─── 키보드: Delete / F2 / Esc / Ctrl·Cmd+K ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 어디서든 동작: Ctrl/Cmd+K = 검색 모달
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }
      if (!selectedNode || editingId) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'Delete') {
        e.preventDefault();
        if (listMode === 'trash') {
          void handlePermanentDelete(selectedNode);
        } else {
          void handleMoveToTrash(selectedNode);
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (listMode !== 'trash') startRename(selectedNode.id);
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedNode, editingId, listMode, handleMoveToTrash, handlePermanentDelete, startRename]);

  // 에러 토스트
  useEffect(() => {
    if (error) {
      toast({ title: '불러오기 실패', description: error });
    }
  }, [error]);

  const modeTitle =
    listMode === 'starred' ? '⭐ 별표'
      : listMode === 'trash' ? '🗑 휴지통'
        : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="flex items-center gap-2 px-4 py-2">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded hover:bg-muted"
            aria-label="홈으로"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-base font-medium flex items-center gap-1.5">
            <span className="text-lg" aria-hidden>☁️</span>
            <span>클라우드</span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            문서·시트·슬라이드 편집
          </span>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={notReady}
              className="px-3 py-1.5 rounded text-sm hover:bg-muted flex items-center gap-1.5"
              type="button"
            >
              <Plus className="w-4 h-4" />
              새로 만들기
            </button>
            <button
              onClick={notReady}
              className="px-3 py-1.5 rounded text-sm hover:bg-muted flex items-center gap-1.5"
              type="button"
            >
              <Upload className="w-4 h-4" />
              업로드
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded hover:bg-muted"
              aria-label="검색"
              title="검색 (Ctrl/⌘+K)"
              type="button"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={notReady}
              className="p-2 rounded hover:bg-muted"
              aria-label="설정"
              type="button"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-56 shrink-0 border-r border-border bg-background overflow-y-auto p-3 text-sm hidden md:block">
          <SidebarItem icon={<Clock className="w-4 h-4" />} label="최근" disabled hint="다음 단계에서 활성화" />
          <SidebarItem
            icon={<Star className="w-4 h-4" />}
            label="별표"
            count={starredCount}
            active={listMode === 'starred'}
            onClick={() => switchMode('starred')}
          />
          <SidebarItem
            icon={<Share2 className="w-4 h-4" />}
            label="공유받음"
            disabled
            hint="10단계에서 활성화"
          />

          <div className="my-3 border-t border-border" />

          <SidebarItem
            icon={<Folder className="w-4 h-4" />}
            label="내 파일"
            active={listMode === 'folder'}
            onClick={() => switchMode('folder')}
          />

          <div className="my-3 border-t border-border" />

          <SidebarItem
            icon={<Trash2 className="w-4 h-4" />}
            label="휴지통"
            count={trashCount}
            active={listMode === 'trash'}
            onClick={() => switchMode('trash')}
          />
        </aside>

        <main className="flex-1 overflow-y-auto">
          {listMode === 'folder' && (
            <section className="p-6 border-b border-border">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                ✨ 새로 만들기
              </h2>
              <div className="grid grid-cols-4 gap-3 max-w-3xl">
                <NewCard
                  icon={<FileText className="w-6 h-6" />}
                  label="문서"
                  color="hsl(200 75% 55%)"
                  onClick={notReady}
                />
                <NewCard
                  icon={<FileSpreadsheet className="w-6 h-6" />}
                  label="시트"
                  color="hsl(140 50% 50%)"
                  onClick={notReady}
                />
                <NewCard
                  icon={<Presentation className="w-6 h-6" />}
                  label="슬라이드"
                  color="hsl(25 85% 55%)"
                  onClick={notReady}
                />
                <NewCard
                  icon={<FolderPlus className="w-6 h-6" />}
                  label="폴더"
                  color="hsl(220 15% 50%)"
                  onClick={openNewFolderInput}
                />
              </div>
            </section>
          )}

          <section className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1 text-sm">
                {modeTitle ? (
                  <span className="font-medium">{modeTitle}</span>
                ) : (
                  trail.map((t, idx) => (
                    <span key={`${t.id ?? 'root'}-${idx}`} className="flex items-center gap-1">
                      {idx > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                      <button
                        onClick={() => goToTrailIndex(idx)}
                        className={cn(
                          'px-1.5 py-0.5 rounded hover:bg-muted',
                          idx === trail.length - 1 ? 'font-medium' : 'text-muted-foreground',
                        )}
                        type="button"
                      >
                        {idx === 0 && <Folder className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
                        {t.name}
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'px-2 py-1 rounded',
                    viewMode === 'list'
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50',
                  )}
                  type="button"
                  aria-pressed={viewMode === 'list'}
                >
                  ≡ 리스트
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'px-2 py-1 rounded',
                    viewMode === 'grid'
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50',
                  )}
                  type="button"
                  aria-pressed={viewMode === 'grid'}
                >
                  ▦ 그리드
                </button>
              </div>
            </div>

            {showFolderInput && listMode === 'folder' && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 border border-border rounded-md bg-muted/30">
                <Folder className="w-4 h-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={folderNameInput}
                  onChange={(e) => setFolderNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submitNewFolder();
                    if (e.key === 'Escape') cancelNewFolder();
                  }}
                  onBlur={() => { void submitNewFolder(); }}
                  placeholder="새 폴더 이름..."
                  disabled={creating}
                  className="flex-1 bg-transparent text-sm outline-none border-none"
                />
              </div>
            )}

            {!authLoading && !user ? (
              <div className="border-2 border-dashed border-border rounded-lg py-16 px-4 text-center">
                <div className="text-base font-medium mb-1">로그인이 필요해요</div>
                <div className="text-sm text-muted-foreground mb-4">
                  클라우드는 본인 계정에만 보입니다. 우측 상단에서 로그인하세요.
                </div>
              </div>
            ) : loading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">불러오는 중…</div>
            ) : nodes.length === 0 && !showFolderInput ? (
              <EmptyState mode={listMode} />
            ) : viewMode === 'list' ? (
              <ul className="divide-y divide-border">
                {nodes.map((n) => (
                  <NodeRow
                    key={n.id}
                    node={n}
                    selected={n.id === selectedId}
                    editing={n.id === editingId}
                    listMode={listMode}
                    onClick={() => goInto(n)}
                    onDoubleClick={() => listMode !== 'trash' && startRename(n.id)}
                    onSubmitRename={(newName) => void submitRename(n.id, newName)}
                    onCancelRename={() => setEditingId(null)}
                    onToggleStar={() => void handleToggleStar(n)}
                  />
                ))}
              </ul>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {nodes.map((n) => (
                  <NodeCard
                    key={n.id}
                    node={n}
                    selected={n.id === selectedId}
                    onClick={() => goInto(n)}
                    onDoubleClick={() => listMode !== 'trash' && startRename(n.id)}
                    onToggleStar={() => void handleToggleStar(n)}
                  />
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="w-72 shrink-0 border-l border-border bg-background overflow-y-auto p-4 hidden lg:block">
          <div className="text-sm font-medium mb-3 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span>미리보기</span>
          </div>
          {!selectedNode ? (
            <div className="text-xs text-muted-foreground py-12 text-center">
              파일을 선택하면 여기에 미리보기가 표시됩니다.
            </div>
          ) : (
            <PreviewPanel
              node={selectedNode}
              listMode={listMode}
              onToggleStar={() => void handleToggleStar(selectedNode)}
              onRename={() => startRename(selectedNode.id)}
              onMoveToTrash={() => void handleMoveToTrash(selectedNode)}
              onRestore={() => void handleRestore(selectedNode)}
              onPermanentDelete={() => void handlePermanentDelete(selectedNode)}
              onNotReady={notReady}
            />
          )}
        </aside>
      </div>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(n) => { void handleSearchSelect(n); }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// 검색 모달
// ─────────────────────────────────────────────

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (node: CloudNode) => void;
}

function SearchModal({ open, onClose, onSelect }: SearchModalProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CloudNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 모달 열릴 때 초기화 + focus
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // 디바운스 검색
  useEffect(() => {
    if (!user) {
      setResults([]);
      return;
    }
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const items = await searchByName(user.id, q);
        setResults(items);
        setActiveIdx(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [user, query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = results[activeIdx];
      if (picked) onSelect(picked);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">검색</DialogTitle>
        <DialogDescription className="sr-only">파일·폴더 이름 검색</DialogDescription>
        <div className="border-b border-border p-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="파일·폴더 이름 검색..."
            className="flex-1 bg-transparent outline-none border-none text-sm"
          />
          <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!query.trim() ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              파일·폴더 이름을 입력해보세요.
            </div>
          ) : loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">검색 중…</div>
          ) : results.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              결과가 없어요.
            </div>
          ) : (
            <ul className="py-1">
              {results.map((n, idx) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(n)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left text-sm',
                      idx === activeIdx ? 'bg-muted' : '',
                    )}
                  >
                    <NodeIcon node={n} />
                    <span className="flex-1 truncate">{n.name}</span>
                    {n.starred && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
                    <span className="text-xs text-muted-foreground">{relativeTime(n.updatedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>이름만 검색 · 본문 검색은 8단계</span>
          <span className="flex items-center gap-2">
            <kbd className="border border-border rounded px-1">↑↓</kbd> 이동
            <kbd className="border border-border rounded px-1">↵</kbd> 선택
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// 빈 상태
// ─────────────────────────────────────────────

function EmptyState({ mode }: { mode: CloudListMode }) {
  if (mode === 'starred') {
    return (
      <div className="border-2 border-dashed border-border rounded-lg py-16 px-4 text-center">
        <div className="text-5xl mb-3" aria-hidden>⭐</div>
        <div className="text-base font-medium mb-1">아직 별표한 항목이 없어요</div>
        <div className="text-sm text-muted-foreground">자주 쓰는 파일·폴더에 별표를 달면 여기서 모아 볼 수 있어요.</div>
      </div>
    );
  }
  if (mode === 'trash') {
    return (
      <div className="border-2 border-dashed border-border rounded-lg py-16 px-4 text-center">
        <div className="text-5xl mb-3" aria-hidden>🗑</div>
        <div className="text-base font-medium mb-1">휴지통이 비어있어요</div>
        <div className="text-sm text-muted-foreground">삭제한 항목은 30일 동안 여기에 보관돼요.</div>
      </div>
    );
  }
  return (
    <div className="border-2 border-dashed border-border rounded-lg py-16 px-4 text-center">
      <div className="text-5xl mb-3" aria-hidden>📂</div>
      <div className="text-base font-medium mb-1">아직 파일이 없어요</div>
      <div className="text-sm text-muted-foreground mb-4">
        위 카드를 누르거나 ⬆️ 파일을 끌어다 놓아보세요
      </div>
      <div className="text-xs text-muted-foreground/70">
        (파일 업로드·편집은 Storage 셋업 후 활성화됩니다)
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 사이드바 아이템
// ─────────────────────────────────────────────

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  disabled?: boolean;
  active?: boolean;
  hint?: string;
  onClick?: () => void;
}

function SidebarItem({ icon, label, count, disabled, active, hint, onClick }: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left',
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : active
            ? 'bg-muted'
            : 'hover:bg-muted',
      )}
      title={hint}
      aria-disabled={disabled}
      aria-pressed={active}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────
// 새로 만들기 카드
// ─────────────────────────────────────────────

interface NewCardProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}

function NewCard({ icon, label, color, onClick }: NewCardProps) {
  return (
    <button
      onClick={onClick}
      className="border border-border rounded-lg p-4 hover:border-foreground/30 hover:bg-muted/30 transition-colors flex flex-col items-center gap-2 text-sm"
      type="button"
    >
      <div
        className="w-10 h-10 rounded flex items-center justify-center text-white"
        style={{ backgroundColor: color }}
        aria-hidden
      >
        {icon}
      </div>
      <span>{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────
// 노드 아이콘·시간
// ─────────────────────────────────────────────

function NodeIcon({ node }: { node: CloudNode }) {
  if (node.kind === 'folder') {
    return <Folder className="w-4 h-4 text-muted-foreground" />;
  }
  const emoji = FILE_TYPE_EMOJI[node.fileType ?? 'other'];
  return <span className="text-base leading-none" aria-hidden>{emoji}</span>;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.floor((now - then) / 60_000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}시간 전`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ─────────────────────────────────────────────
// 인라인 이름 편집 input
// ─────────────────────────────────────────────

function RenameInput({
  initial, onSubmit, onCancel,
}: { initial: string; onSubmit: (v: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSubmit(value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => onSubmit(value)}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 bg-transparent text-sm outline-none border-b border-foreground/30 px-1"
    />
  );
}

// ─────────────────────────────────────────────
// 리스트 행
// ─────────────────────────────────────────────

interface NodeRowProps {
  node: CloudNode;
  selected: boolean;
  editing: boolean;
  listMode: CloudListMode;
  onClick: () => void;
  onDoubleClick: () => void;
  onSubmitRename: (newName: string) => void;
  onCancelRename: () => void;
  onToggleStar: () => void;
}

function NodeRow({
  node, selected, editing, listMode,
  onClick, onDoubleClick, onSubmitRename, onCancelRename, onToggleStar,
}: NodeRowProps) {
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={editing ? undefined : onClick}
        onDoubleClick={editing ? undefined : onDoubleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !editing) onClick();
        }}
        className={cn(
          'group w-full flex items-center gap-3 px-3 py-2 text-left text-sm cursor-pointer',
          'hover:bg-muted/50',
          selected && 'bg-muted',
        )}
      >
        <NodeIcon node={node} />
        {editing ? (
          <RenameInput
            initial={node.name}
            onSubmit={onSubmitRename}
            onCancel={onCancelRename}
          />
        ) : (
          <span className="flex-1 truncate">{node.name}</span>
        )}

        {/* 별표 (호버 시 빈 별, 별표 시엔 항상 노출) */}
        {listMode !== 'trash' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
            className={cn(
              'p-1 rounded hover:bg-muted',
              node.starred
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-60 focus-visible:opacity-100',
            )}
            aria-label={node.starred ? '별표 해제' : '별표 추가'}
          >
            <Star
              className={cn(
                'w-3.5 h-3.5',
                node.starred ? 'fill-yellow-400 text-yellow-400' : '',
              )}
            />
          </button>
        )}

        <span className="text-xs text-muted-foreground w-20 text-right truncate">
          {listMode === 'trash'
            ? `${relativeTime(node.deletedAt ?? node.updatedAt)} 삭제`
            : relativeTime(node.updatedAt)}
        </span>
        <span className="text-xs text-muted-foreground w-16 text-right hidden sm:inline">
          {node.kind === 'file' ? formatSize(node.sizeBytes) : ''}
        </span>
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────
// 그리드 카드
// ─────────────────────────────────────────────

interface NodeCardProps {
  node: CloudNode;
  selected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onToggleStar: () => void;
}

function NodeCard({
  node, selected, onClick, onDoubleClick, onToggleStar,
}: NodeCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      className={cn(
        'group border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors text-left cursor-pointer relative',
        selected && 'border-foreground/50 bg-muted',
      )}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
        className={cn(
          'absolute top-2 right-2 p-1 rounded hover:bg-muted',
          node.starred ? 'opacity-100' : 'opacity-0 group-hover:opacity-70',
        )}
        aria-label={node.starred ? '별표 해제' : '별표 추가'}
      >
        <Star
          className={cn(
            'w-3.5 h-3.5',
            node.starred ? 'fill-yellow-400 text-yellow-400' : '',
          )}
        />
      </button>
      <div className="flex items-center gap-2 mb-2">
        <NodeIcon node={node} />
      </div>
      <div className="text-sm truncate font-medium pr-6">{node.name}</div>
      <div className="text-xs text-muted-foreground mt-1">{relativeTime(node.updatedAt)}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 미리보기 패널
// ─────────────────────────────────────────────

interface PreviewPanelProps {
  node: CloudNode;
  listMode: CloudListMode;
  onToggleStar: () => void;
  onRename: () => void;
  onMoveToTrash: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  onNotReady: () => void;
}

function PreviewPanel({
  node, listMode, onToggleStar, onRename, onMoveToTrash, onRestore, onPermanentDelete, onNotReady,
}: PreviewPanelProps) {
  const isTrash = listMode === 'trash';
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <NodeIcon node={node} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{node.name}</div>
          <div className="text-xs text-muted-foreground">
            {node.kind === 'folder' ? '폴더' : FILE_TYPE_LABEL[node.fileType ?? 'other']}
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
        <div>📅 {new Date(node.updatedAt).toLocaleString('ko-KR')} 수정</div>
        {node.kind === 'file' && node.sizeBytes != null && (
          <div>💾 {formatSize(node.sizeBytes)}</div>
        )}
        {isTrash && node.deletedAt && (
          <div>🗑 {new Date(node.deletedAt).toLocaleString('ko-KR')} 삭제</div>
        )}
      </div>

      <div className="pt-2 border-t border-border space-y-1.5">
        {!isTrash ? (
          <>
            {node.kind === 'file' && (
              <PreviewButton onClick={onNotReady} icon={<Eye className="w-4 h-4" />} label="편집" main />
            )}
            <PreviewButton onClick={onToggleStar} icon={<Star className={cn('w-4 h-4', node.starred && 'fill-yellow-400 text-yellow-400')} />} label={node.starred ? '별표 해제' : '별표'} />
            <PreviewButton onClick={onRename} icon={<Pencil className="w-4 h-4" />} label="이름 변경" />
            <PreviewButton onClick={onMoveToTrash} icon={<Trash2 className="w-4 h-4" />} label="휴지통으로" destructive />
          </>
        ) : (
          <>
            <PreviewButton onClick={onRestore} icon={<RotateCcw className="w-4 h-4" />} label="복원" main />
            <PreviewButton onClick={onPermanentDelete} icon={<X className="w-4 h-4" />} label="영구 삭제" destructive />
          </>
        )}
      </div>
    </div>
  );
}

interface PreviewButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  main?: boolean;
  destructive?: boolean;
}

function PreviewButton({ icon, label, onClick, main, destructive }: PreviewButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors',
        main
          ? 'bg-foreground text-background hover:bg-foreground/90'
          : destructive
            ? 'text-destructive hover:bg-destructive/10'
            : 'hover:bg-muted',
      )}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
