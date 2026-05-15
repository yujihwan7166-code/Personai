/** /cloud — 드라이브형 파일 관리 + 인플레이스 에디터.
 *  2-B-1: 메타데이터 CRUD 연결 (폴더 만들기·목록 표시, 별표/휴지통 카운트).
 *  파일 binary 업로드/다운로드는 청크 4(Storage) 후 별도 단계.
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Upload, Search, Settings, Eye,
  FileText, FileSpreadsheet, Presentation, Folder, FolderPlus,
  Clock, Star, Share2, Trash2, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCloudNodes } from '@/hooks/useCloudNodes';
import { createFolder } from '@/lib/cloudClient';
import {
  type CloudNode, FILE_TYPE_EMOJI, FILE_TYPE_LABEL, formatSize,
} from '@/types/cloud';

interface BreadcrumbItem {
  id: string | null; // null = 루트
  name: string;
}

export default function Cloud() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [trail, setTrail] = useState<BreadcrumbItem[]>([{ id: null, name: '내 파일' }]);
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const currentFolderId = trail[trail.length - 1].id;
  const { nodes, loading, error, refresh, starredCount, trashCount } = useCloudNodes(currentFolderId);

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

  const goInto = useCallback((node: CloudNode) => {
    if (node.kind === 'folder') {
      setTrail((t) => [...t, { id: node.id, name: node.name }]);
      setSelectedId(null);
    } else {
      setSelectedId(node.id);
    }
  }, []);

  const goToTrailIndex = useCallback((idx: number) => {
    setTrail((t) => t.slice(0, idx + 1));
    setSelectedId(null);
  }, []);

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

  // 에러 토스트
  useEffect(() => {
    if (error) {
      toast({ title: '불러오기 실패', description: error });
    }
  }, [error]);

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
              onClick={notReady}
              className="p-2 rounded hover:bg-muted"
              aria-label="검색"
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
            disabled
            hint="별표 보기는 다음 단계에서"
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
            active={currentFolderId === null}
            onClick={() => goToTrailIndex(0)}
          />

          <div className="my-3 border-t border-border" />

          <SidebarItem
            icon={<Trash2 className="w-4 h-4" />}
            label="휴지통"
            count={trashCount}
            disabled
            hint="휴지통 보기는 다음 단계에서"
          />
        </aside>

        <main className="flex-1 overflow-y-auto">
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

          <section className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1 text-sm">
                {trail.map((t, idx) => (
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
                ))}
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

            {showFolderInput && (
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
            ) : viewMode === 'list' ? (
              <ul className="divide-y divide-border">
                {nodes.map((n) => (
                  <NodeRow
                    key={n.id}
                    node={n}
                    selected={n.id === selectedId}
                    onClick={() => goInto(n)}
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
            <PreviewPanel node={selectedNode} />
          )}
        </aside>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 서브 컴포넌트
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

function NodeRow({
  node, selected, onClick,
}: { node: CloudNode; selected: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 text-left text-sm',
          'hover:bg-muted/50',
          selected && 'bg-muted',
        )}
      >
        <NodeIcon node={node} />
        <span className="flex-1 truncate">{node.name}</span>
        {node.starred && <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />}
        <span className="text-xs text-muted-foreground w-20 text-right truncate">
          {relativeTime(node.updatedAt)}
        </span>
        <span className="text-xs text-muted-foreground w-16 text-right hidden sm:inline">
          {node.kind === 'file' ? formatSize(node.sizeBytes) : ''}
        </span>
      </button>
    </li>
  );
}

function NodeCard({
  node, selected, onClick,
}: { node: CloudNode; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors text-left',
        selected && 'border-foreground/50 bg-muted',
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <NodeIcon node={node} />
        {node.starred && <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 ml-auto" />}
      </div>
      <div className="text-sm truncate font-medium">{node.name}</div>
      <div className="text-xs text-muted-foreground mt-1">{relativeTime(node.updatedAt)}</div>
    </button>
  );
}

function PreviewPanel({ node }: { node: CloudNode }) {
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
      </div>
      <div className="pt-2 border-t border-border text-xs text-muted-foreground">
        편집·다운로드·공유는 다음 단계에서 활성화됩니다.
      </div>
    </div>
  );
}
