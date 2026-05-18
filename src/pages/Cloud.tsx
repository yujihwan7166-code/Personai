/** /cloud — 드라이브형 파일 관리 + 인플레이스 에디터.
 *  2-B-1: 메타데이터 CRUD 연결 (폴더/별표/휴지통 모드 + 별표 토글 + 이름변경 + 휴지통/복원/영구삭제).
 *  파일 binary 업로드/다운로드는 청크 4(Storage) 후 별도 단계.
 */

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Upload, Search, Settings, Eye,
  FileText, FileSpreadsheet, Presentation, Folder, FolderPlus, FolderOpen,
  Clock, Star, Share2, Trash2, ChevronRight, Pencil, RotateCcw, X,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { confirmDialog } from '@/lib/confirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCloudNodes, type CloudListMode } from '@/hooks/useCloudNodes';
import {
  createFolder, createEmptyFile,
  setStarred, renameNode, moveToTrash, restoreFromTrash, permanentDelete,
  searchByName, fetchNode, fetchAllFolders, moveNode,
} from '@/lib/cloudClient';
import { uploadAndConvert, ACCEPT_EXT_LIST } from '@/lib/cloudCommon/uploadAndConvert';
import { AiSidebar } from '@/components/cloud/AiSidebar';
import { AiSidebarToggle } from '@/components/cloud/AiSidebarToggle';
import { useAiSidebar } from '@/components/cloud/useAiSidebar';
import { clearChatHistoryForNode, type AiContext } from '@/lib/cloudAi/types';
import {
  type CloudNode, FILE_TYPE_EMOJI, FILE_TYPE_LABEL, formatSize,
} from '@/types/cloud';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface BreadcrumbItem {
  id: string | null; // null = 루트
  name: string;
}

export default function Cloud() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  // viewMode + 정렬: localStorage 영속. 폴더는 정렬과 무관하게 항상 first.
  type SortKey = 'name' | 'updated' | 'size';
  const [viewMode, setViewModeInner] = useState<'list' | 'grid'>(() => {
    if (typeof window === 'undefined') return 'list';
    return window.localStorage.getItem('personai.cloud.drive.viewMode') === 'grid' ? 'grid' : 'list';
  });
  const setViewMode = useCallback((v: 'list' | 'grid') => {
    setViewModeInner(v);
    try { window.localStorage.setItem('personai.cloud.drive.viewMode', v); } catch { /* noop */ }
  }, []);
  const [sortKey, setSortKeyInner] = useState<SortKey>(() => {
    if (typeof window === 'undefined') return 'updated';
    const v = window.localStorage.getItem('personai.cloud.drive.sortKey');
    return v === 'name' || v === 'updated' || v === 'size' ? v : 'updated';
  });
  const setSortKey = useCallback((v: SortKey) => {
    setSortKeyInner(v);
    try { window.localStorage.setItem('personai.cloud.drive.sortKey', v); } catch { /* noop */ }
  }, []);
  const [sortDir, setSortDirInner] = useState<'asc' | 'desc'>(() => {
    if (typeof window === 'undefined') return 'desc';
    return window.localStorage.getItem('personai.cloud.drive.sortDir') === 'asc' ? 'asc' : 'desc';
  });
  const setSortDir = useCallback((v: 'asc' | 'desc') => {
    setSortDirInner(v);
    try { window.localStorage.setItem('personai.cloud.drive.sortDir', v); } catch { /* noop */ }
  }, []);
  const [listMode, setListMode] = useState<CloudListMode>('folder');
  const [trail, setTrail] = useState<BreadcrumbItem[]>([{ id: null, name: '내 파일' }]);
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 다중 선택 (Ctrl/Cmd+클릭 = toggle, Shift+클릭 = anchor~current range)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectAnchorRef = useRef<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // 사이드바 폴더 트리
  const [allFolders, setAllFolders] = useState<CloudNode[]>([]);
  // 폴더 트리 펼침 상태 — localStorage 영속화 (매번 다시 펼치는 불편 해소)
  const [expandedFolderIds, setExpandedFolderIdsInner] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const v = window.localStorage.getItem('personai.cloud.drive.expandedFolderIds');
      if (!v) return new Set();
      const arr: unknown = JSON.parse(v);
      return Array.isArray(arr)
        ? new Set(arr.filter((x): x is string => typeof x === 'string'))
        : new Set();
    } catch {
      return new Set();
    }
  });
  const setExpandedFolderIds = useCallback(
    (v: React.SetStateAction<Set<string>>) => {
      setExpandedFolderIdsInner((cur) => {
        const next = typeof v === 'function'
          ? (v as (prev: Set<string>) => Set<string>)(cur)
          : v;
        try {
          window.localStorage.setItem(
            'personai.cloud.drive.expandedFolderIds',
            JSON.stringify(Array.from(next)),
          );
        } catch { /* noop */ }
        return next;
      });
    },
    [],
  );
  // 우클릭 컨텍스트 메뉴 — node 가 있으면 파일/폴더 메뉴, null 이면 빈 영역 메뉴
  const [ctxMenu, setCtxMenu] = useState<{ node: CloudNode | null; x: number; y: number } | null>(null);
  // 드래그 중인 노드 + 호버 중인 drop target 폴더 id
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null | 'root'>(null); // 'root' = 루트 폴더

  const currentFolderId = trail[trail.length - 1].id;
  const { nodes, loading, error, refresh, starredCount, trashCount } = useCloudNodes({
    mode: listMode,
    parentFolderId: currentFolderId,
  });

  /** 정렬된 노드 — 폴더 first 유지, 그 안에서 sortKey/Dir 적용 */
  const displayedNodes = useMemo(() => {
    const cmp = (a: CloudNode, b: CloudNode): number => {
      // 폴더 first (정렬 키와 무관하게 항상)
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      let r = 0;
      if (sortKey === 'name') {
        r = a.name.localeCompare(b.name, 'ko');
      } else if (sortKey === 'updated') {
        r = (a.updatedAt ?? '').localeCompare(b.updatedAt ?? '');
      } else if (sortKey === 'size') {
        r = (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0);
      }
      return sortDir === 'asc' ? r : -r;
    };
    return [...nodes].sort(cmp);
  }, [nodes, sortKey, sortDir]);

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

  // ─── AI 사이드바 ───
  const getAiContext = useCallback((): AiContext => {
    // selectedNode 있으면 그 파일, 없으면 현재 폴더 + 자식 목록
    if (selectedNode) {
      const meta = [
        `이름: ${selectedNode.name}`,
        `종류: ${selectedNode.kind === 'folder' ? '폴더' : selectedNode.fileType ?? '파일'}`,
        selectedNode.sizeBytes ? `크기: ${selectedNode.sizeBytes} 바이트` : null,
        `수정: ${selectedNode.updatedAt ?? '미상'}`,
        selectedNode.starred ? '⭐ 별표' : null,
      ].filter(Boolean).join('\n');
      return {
        kind: 'drive',
        summary: `📄 ${selectedNode.name}`,
        fullText: meta,
      };
    }
    const folderName = trail[trail.length - 1]?.name ?? '내 파일';
    const list = nodes.slice(0, 50).map((n) => {
      const kind = n.kind === 'folder' ? '[폴더]' : `[${n.fileType ?? 'file'}]`;
      return `- ${kind} ${n.name}`;
    }).join('\n');
    return {
      kind: 'drive',
      summary: `📁 ${folderName} (${nodes.length}개)`,
      fullText: `폴더: ${folderName}\n자식 ${nodes.length}개 (최대 50개 표시):\n${list || '(비어있음)'}`,
    };
  }, [selectedNode, trail, nodes]);
  const ai = useAiSidebar('drive', getAiContext, { persistKey: 'global' });

  // 사이드바 폴더 트리 로드 — user 있으면 + nodes 변경 시
  useEffect(() => {
    if (!user) return;
    void fetchAllFolders(user.id).then(setAllFolders);
  }, [user, nodes]);

  // 폴더 트리: parent_folder_id 별로 children 인덱싱
  const folderChildrenMap = useMemo(() => {
    const m = new Map<string | null, CloudNode[]>();
    for (const f of allFolders) {
      const key = f.parentFolderId ?? null;
      const arr = m.get(key) ?? [];
      arr.push(f);
      m.set(key, arr);
    }
    return m;
  }, [allFolders]);

  const toggleFolderExpand = useCallback((id: string) => {
    setExpandedFolderIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // 우클릭 컨텍스트 메뉴 트리거 (파일/폴더)
  const handleContextMenu = useCallback((e: React.MouseEvent, node: CloudNode) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ node, x: e.clientX, y: e.clientY });
    setSelectedId(node.id);
  }, []);

  // 빈 영역 우클릭 (main 또는 빈 nodes 영역)
  const handleEmptyContextMenu = useCallback((e: React.MouseEvent) => {
    // 자식 row 의 우클릭은 stopPropagation 됨 → 여기 안 옴
    if (listMode === 'trash') return; // 휴지통에서는 새 항목 만들 수 없음
    e.preventDefault();
    setCtxMenu({ node: null, x: e.clientX, y: e.clientY });
  }, [listMode]);

  // 빈 영역 더블클릭 → 우클릭 메뉴와 동일 (새 항목 만들기 빠른 진입)
  const handleEmptyDoubleClick = useCallback((e: React.MouseEvent) => {
    if (listMode === 'trash') return;
    // 노드 row 위 더블클릭은 NodeRow handler (open) 가 처리 — 빈 영역만
    const target = e.target as HTMLElement;
    if (target.closest('[data-cloud-node]')) return;
    if (target.closest('[data-cloud-no-empty]')) return; // 헤더/툴바 영역 제외
    setCtxMenu({ node: null, x: e.clientX, y: e.clientY });
  }, [listMode]);

  // 메뉴 외 클릭 / 포커스 아웃 → 닫기
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [ctxMenu]);

  // ─── 일괄 작업 (다중 선택) ───
  const selectedNodes = useMemo(
    () => nodes.filter((n) => selectedIds.has(n.id)),
    [nodes, selectedIds],
  );

  const bulkStar = useCallback(async (toStarred: boolean) => {
    if (selectedNodes.length === 0) return;
    try {
      for (const n of selectedNodes) {
        await setStarred(n.id, toStarred);
      }
      await refresh();
      toast({ title: `${selectedNodes.length}개 별표 ${toStarred ? '추가' : '해제'}` });
    } catch (e) {
      toast({ title: '일괄 별표 실패', description: e instanceof Error ? e.message : String(e) });
    }
  }, [selectedNodes, refresh]);

  const bulkMoveToTrash = useCallback(async () => {
    if (selectedNodes.length === 0) return;
    const ok = await confirmDialog({
      title: `${selectedNodes.length}개 항목을 휴지통으로?`,
      description: '나중에 복원할 수 있어요.',
      confirmLabel: '휴지통으로',
    });
    if (!ok) return;
    try {
      for (const n of selectedNodes) await moveToTrash(n.id);
      await refresh();
      setSelectedIds(new Set());
      toast({ title: `${selectedNodes.length}개 휴지통으로 이동` });
    } catch (e) {
      toast({ title: '일괄 삭제 실패', description: e instanceof Error ? e.message : String(e) });
    }
  }, [selectedNodes, refresh]);

  const bulkRestore = useCallback(async () => {
    if (selectedNodes.length === 0) return;
    try {
      for (const n of selectedNodes) await restoreFromTrash(n.id);
      await refresh();
      setSelectedIds(new Set());
      toast({ title: `${selectedNodes.length}개 복원` });
    } catch (e) {
      toast({ title: '일괄 복원 실패', description: e instanceof Error ? e.message : String(e) });
    }
  }, [selectedNodes, refresh]);

  const bulkPermanentDelete = useCallback(async () => {
    if (selectedNodes.length === 0) return;
    const ok = await confirmDialog({
      title: `${selectedNodes.length}개 완전 삭제?`,
      description: '되돌릴 수 없어요.',
      confirmLabel: '완전 삭제',
      destructive: true,
    });
    if (!ok) return;
    try {
      for (const n of selectedNodes) {
        await permanentDelete(n.id);
        clearChatHistoryForNode(n.id);
      }
      await refresh();
      setSelectedIds(new Set());
      toast({ title: `${selectedNodes.length}개 완전 삭제` });
    } catch (e) {
      toast({ title: '일괄 삭제 실패', description: e instanceof Error ? e.message : String(e) });
    }
  }, [selectedNodes, refresh]);

  // ─── DnD 이동 ───
  /** 폴더가 자기 자신·자손인지 검사 (사이클 방지) */
  const isDescendantOf = useCallback((descendantId: string, ancestorId: string): boolean => {
    if (descendantId === ancestorId) return true;
    let cur = allFolders.find((f) => f.id === descendantId);
    while (cur) {
      if (cur.id === ancestorId) return true;
      const pid = cur.parentFolderId;
      if (pid == null) return false;
      cur = allFolders.find((f) => f.id === pid);
    }
    return false;
  }, [allFolders]);

  const handleDragStart = useCallback((e: React.DragEvent, node: CloudNode) => {
    if (node.deletedAt) { e.preventDefault(); return; }
    setDraggingNodeId(node.id);
    try { e.dataTransfer.setData('text/plain', node.id); } catch { /* noop */ }
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingNodeId(null);
    setDropTargetId(null);
  }, []);

  /** drop 가능한지: 드래그 노드가 폴더면 자기 자신·자손으로 못 떨어짐 */
  const canDropOn = useCallback((targetFolderId: string | null): boolean => {
    if (!draggingNodeId) return false;
    if (targetFolderId == null) return true; // root 는 항상 OK (현재 위치가 root 라도 noop)
    const dragNode = nodes.find((n) => n.id === draggingNodeId)
      ?? allFolders.find((n) => n.id === draggingNodeId);
    if (!dragNode) return true; // 알 수 없으면 허용 (서버가 검증)
    if (dragNode.kind === 'folder') {
      return !isDescendantOf(targetFolderId, dragNode.id);
    }
    return true;
  }, [draggingNodeId, nodes, allFolders, isDescendantOf]);

  const handleDragOver = useCallback((e: React.DragEvent, targetFolderId: string | null) => {
    if (!draggingNodeId) return;
    if (!canDropOn(targetFolderId)) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetId(targetFolderId ?? 'root');
  }, [draggingNodeId, canDropOn]);

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null);
  }, []);

  const handleDrop = useCallback(async (
    e: React.DragEvent,
    targetFolderId: string | null,
  ) => {
    e.preventDefault();
    const id = draggingNodeId ?? e.dataTransfer.getData('text/plain');
    setDraggingNodeId(null);
    setDropTargetId(null);
    if (!id) return;
    if (!canDropOn(targetFolderId)) {
      toast({ title: '여기는 못 옮겨요', description: '자기 자신/자손 폴더로는 이동할 수 없어요.' });
      return;
    }
    const node = nodes.find((n) => n.id === id) ?? allFolders.find((n) => n.id === id);
    if (node && node.parentFolderId === targetFolderId) {
      // 이미 그 폴더에 있으면 noop
      return;
    }
    try {
      await moveNode(id, targetFolderId);
      await refresh();
      toast({ title: '이동 완료' });
    } catch (err) {
      toast({ title: '이동 실패', description: err instanceof Error ? err.message : String(err) });
    }
  }, [draggingNodeId, canDropOn, nodes, allFolders, refresh]);

  // 트리 폴더 클릭 → 그 폴더로 이동 (folder 모드 + trail 재구성)
  const navigateToFolder = useCallback((folder: CloudNode) => {
    // trail 재구성: root 부터 folder 까지 부모 체인 따라가기
    const chain: BreadcrumbItem[] = [{ id: null, name: '내 파일' }];
    const reverse: CloudNode[] = [];
    let cur: CloudNode | undefined = folder;
    while (cur) {
      reverse.push(cur);
      const pid = cur.parentFolderId;
      if (pid == null) break;
      cur = allFolders.find((f) => f.id === pid);
    }
    for (const f of reverse.reverse()) {
      chain.push({ id: f.id, name: f.name });
    }
    setListMode('folder');
    setTrail(chain);
    setSelectedId(null);
    // 그 폴더 + 조상 모두 펼쳐두기
    setExpandedFolderIds((cur2) => {
      const next = new Set(cur2);
      for (const c of reverse) next.add(c.id);
      return next;
    });
  }, [allFolders]);

  // ─── 파일 업로드 → 자동 변환 → 편집기 진입 ───
  const [uploadBusy, setUploadBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUploadFiles = useCallback(async (files: FileList | File[]) => {
    if (!user) {
      toast({ title: '로그인이 필요해요' });
      return;
    }
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploadBusy(true);
    try {
      // 여러 파일이면 차례로 변환, 마지막 파일의 편집기로 이동
      let lastRoute: string | null = null;
      let successCount = 0;
      for (const file of arr) {
        try {
          const result = await uploadAndConvert(file, {
            ownerId: user.id,
            parentFolderId: currentFolderId,
          });
          lastRoute = result.route;
          successCount++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          toast({ title: `${file.name} 업로드 실패`, description: msg });
        }
      }
      await refresh();
      if (successCount > 0) {
        toast({
          title: `${successCount}개 파일 업로드 완료`,
          description: arr.length === 1 ? '편집기로 이동합니다.' : `현재 폴더에 추가됨.`,
        });
        // 파일 1개만 올렸으면 자동 편집기 이동
        if (arr.length === 1 && lastRoute) {
          navigate(lastRoute);
        }
      }
    } finally {
      setUploadBusy(false);
    }
  }, [user, currentFolderId, refresh, navigate]);

  const handleUploadClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = ACCEPT_EXT_LIST;
    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        void handleUploadFiles(input.files);
      }
    };
    input.click();
  }, [handleUploadFiles]);

  // 드래그&드롭
  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setDragOver(true);
    }
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => {
    // 자식 요소 이동 시 dragleave 무시
    if (e.currentTarget === e.target) setDragOver(false);
  }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) void handleUploadFiles(files);
  }, [handleUploadFiles]);

  // ─── 새 문서 만들기 → 즉시 편집기 ───
  const handleCreateDoc = useCallback(async () => {
    if (!user) {
      toast({ title: '로그인이 필요해요', description: '클라우드 사용은 로그인 후 가능합니다.' });
      return;
    }
    try {
      const node = await createEmptyFile(user.id, '제목 없음', 'doc', currentFolderId);
      navigate(`/cloud/doc/${node.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '새 문서 만들기 실패', description: msg });
    }
  }, [user, currentFolderId, navigate]);

  // ─── 새 시트 만들기 → 즉시 편집기 ───
  const handleCreateSheet = useCallback(async () => {
    if (!user) {
      toast({ title: '로그인이 필요해요', description: '클라우드 사용은 로그인 후 가능합니다.' });
      return;
    }
    try {
      const node = await createEmptyFile(user.id, '제목 없음 시트', 'sheet', currentFolderId);
      navigate(`/cloud/sheet/${node.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '새 시트 만들기 실패', description: msg });
    }
  }, [user, currentFolderId, navigate]);

  // ─── 새 슬라이드 만들기 → 즉시 편집기 ───
  const handleCreateSlide = useCallback(async () => {
    if (!user) {
      toast({ title: '로그인이 필요해요', description: '클라우드 사용은 로그인 후 가능합니다.' });
      return;
    }
    try {
      const node = await createEmptyFile(user.id, '제목 없음 슬라이드', 'slide', currentFolderId);
      navigate(`/cloud/slide/${node.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '새 슬라이드 만들기 실패', description: msg });
    }
  }, [user, currentFolderId, navigate]);

  // ─── 파일 편집 진입 (파일 종류별 라우팅) ───
  const handleOpenFile = useCallback((node: CloudNode) => {
    if (node.kind !== 'file') return;
    if (node.fileType === 'doc') {
      navigate(`/cloud/doc/${node.id}`);
    } else if (node.fileType === 'sheet') {
      navigate(`/cloud/sheet/${node.id}`);
    } else if (node.fileType === 'slide') {
      navigate(`/cloud/slide/${node.id}`);
    } else {
      toast({
        title: '곧 활성화돼요',
        description: `${FILE_TYPE_LABEL[node.fileType ?? 'other']} 에디터는 다음 단계에서 추가됩니다.`,
      });
    }
  }, [navigate]);

  // ─── 모드 전환 ───
  const switchMode = useCallback((m: CloudListMode) => {
    setListMode(m);
    setSelectedId(null);
    setSelectedIds(new Set());
    setEditingId(null);
    if (m === 'folder') {
      // 폴더 모드 진입 시 루트로 (사이드바 '내 파일' 클릭 효과)
      setTrail([{ id: null, name: '내 파일' }]);
    }
  }, []);

  // ─── 1회 클릭 = 선택 (미리보기만, 진입 X) + 다중 선택 ───
  const handleNodeClick = useCallback((node: CloudNode, e?: React.MouseEvent) => {
    const ctrl = e && (e.ctrlKey || e.metaKey);
    const shift = e && e.shiftKey;
    if (ctrl) {
      // Ctrl+클릭: toggle
      setSelectedIds((cur) => {
        const next = new Set(cur);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
      setSelectedId(node.id);
      lastSelectAnchorRef.current = node.id;
      return;
    }
    if (shift && lastSelectAnchorRef.current) {
      // Shift+클릭: anchor ~ current 모든 행 range
      const anchorIdx = nodes.findIndex((n) => n.id === lastSelectAnchorRef.current);
      const targetIdx = nodes.findIndex((n) => n.id === node.id);
      if (anchorIdx !== -1 && targetIdx !== -1) {
        const [a, b] = anchorIdx <= targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
        const next = new Set<string>();
        for (let i = a; i <= b; i++) next.add(nodes[i].id);
        setSelectedIds(next);
        setSelectedId(node.id);
        return;
      }
    }
    // 단일 선택 + anchor 갱신
    setSelectedIds(new Set([node.id]));
    setSelectedId(node.id);
    lastSelectAnchorRef.current = node.id;
  }, [nodes]);

  // ─── 더블클릭 = 진입 (폴더: 폴더 들어가기, 파일: 편집기) ───
  const handleNodeDoubleClick = useCallback((node: CloudNode) => {
    if (listMode === 'trash') return; // 휴지통은 더블클릭 X
    if (node.kind === 'folder' && listMode === 'folder') {
      setTrail((t) => [...t, { id: node.id, name: node.name }]);
      setSelectedId(null);
    } else if (node.kind === 'file') {
      // handleOpenFile 호출 — 아래에 정의됨 (forward ref via inline)
      if (node.fileType === 'doc') navigate(`/cloud/doc/${node.id}`);
      else if (node.fileType === 'sheet') navigate(`/cloud/sheet/${node.id}`);
      else if (node.fileType === 'slide') navigate(`/cloud/slide/${node.id}`);
      else toast({
        title: '곧 활성화돼요',
        description: `${FILE_TYPE_LABEL[node.fileType ?? 'other']} 에디터는 다음 단계에서 추가됩니다.`,
      });
    }
  }, [listMode, navigate]);

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
      clearChatHistoryForNode(node.id);
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

      // Ctrl+A: 현재 모드의 모든 노드 선택
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedIds(new Set(nodes.map((n) => n.id)));
        return;
      }

      if (e.key === 'Delete') {
        e.preventDefault();
        if (selectedIds.size > 1) {
          if (listMode === 'trash') void bulkPermanentDelete();
          else void bulkMoveToTrash();
        } else if (listMode === 'trash') {
          void handlePermanentDelete(selectedNode);
        } else {
          void handleMoveToTrash(selectedNode);
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (listMode !== 'trash') startRename(selectedNode.id);
      } else if (e.key === 'Escape') {
        setSelectedId(null);
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedNode, editingId, listMode, handleMoveToTrash, handlePermanentDelete, startRename, nodes, selectedIds.size, bulkMoveToTrash, bulkPermanentDelete]);

  // 에러 토스트
  useEffect(() => {
    if (error) {
      toast({ title: '불러오기 실패', description: error });
    }
  }, [error]);

  const modeTitle =
    listMode === 'starred' ? '⭐ 별표'
      : listMode === 'trash' ? '🗑 휴지통'
        : listMode === 'recent' ? '🕒 최근 파일'
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
              onClick={handleUploadClick}
              disabled={uploadBusy}
              className="px-3 py-1.5 rounded text-sm hover:bg-muted flex items-center gap-1.5 disabled:opacity-60"
              type="button"
              title="파일 업로드 (.docx · .xlsx · .pptx · .md · .txt · .html · .csv)"
            >
              <Upload className="w-4 h-4" />
              {uploadBusy ? '변환 중…' : '업로드'}
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
            <AiSidebarToggle open={ai.open} onClick={ai.toggle} />
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

      <div
        className={cn(
          'flex-1 flex overflow-hidden relative',
          dragOver && 'ring-2 ring-inset ring-foreground/30',
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* 드래그 오버레이 */}
        {dragOver && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
            <Upload className="w-12 h-12 text-foreground/70 mb-3" />
            <div className="text-lg font-medium">파일을 놓으세요</div>
            <div className="text-sm text-muted-foreground mt-1">
              .docx · .xlsx · .pptx · .md · .txt · .html · .csv
            </div>
          </div>
        )}
        {uploadBusy && (
          <div className="absolute top-4 right-4 z-40 px-3 py-2 rounded bg-background border border-border shadow text-xs flex items-center gap-2">
            <Upload className="w-3 h-3 animate-pulse" />
            파일 변환 중…
          </div>
        )}
        <aside className="w-56 shrink-0 border-r border-border bg-background overflow-y-auto p-3 text-sm hidden md:block">
          <SidebarItem
            icon={<Clock className="w-4 h-4" />}
            label="최근"
            active={listMode === 'recent'}
            onClick={() => switchMode('recent')}
          />
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

          <div
            onDragOver={(e) => handleDragOver(e, null)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => { void handleDrop(e, null); }}
            className={cn(
              'rounded',
              dropTargetId === 'root' && 'ring-2 ring-inset ring-foreground/40 bg-foreground/5',
            )}
          >
            <SidebarItem
              icon={<Folder className="w-4 h-4" />}
              label="내 파일"
              active={listMode === 'folder' && currentFolderId === null}
              onClick={() => {
                setListMode('folder');
                setTrail([{ id: null, name: '내 파일' }]);
                setSelectedId(null);
              }}
            />
          </div>
          {/* 폴더 트리 — 루트의 자식들부터 재귀 */}
          {(folderChildrenMap.get(null) ?? []).length > 0 && (
            <div className="ml-2 mt-1">
              {(folderChildrenMap.get(null) ?? []).map((f) => (
                <FolderTreeItem
                  key={f.id}
                  folder={f}
                  depth={0}
                  currentFolderId={currentFolderId}
                  childrenMap={folderChildrenMap}
                  expanded={expandedFolderIds}
                  onToggle={toggleFolderExpand}
                  onNavigate={navigateToFolder}
                  dropTargetId={dropTargetId}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e, fid) => { void handleDrop(e, fid); }}
                />
              ))}
            </div>
          )}

          <div className="my-3 border-t border-border" />

          <SidebarItem
            icon={<Trash2 className="w-4 h-4" />}
            label="휴지통"
            count={trashCount}
            active={listMode === 'trash'}
            onClick={() => switchMode('trash')}
          />
        </aside>

        <main
          className="flex-1 overflow-y-auto"
          onContextMenu={handleEmptyContextMenu}
          onDoubleClick={handleEmptyDoubleClick}
        >
          {selectedIds.size > 1 && (
            <div className="sticky top-0 z-20 bg-foreground text-background px-4 py-2 flex items-center gap-2 text-sm shadow-md">
              <span className="font-medium">{selectedIds.size}개 선택됨</span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="ml-1 p-1 rounded hover:bg-background/20"
                aria-label="선택 해제"
                title="선택 해제 (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-background/30 mx-1" />
              {listMode === 'trash' ? (
                <>
                  <button
                    type="button"
                    onClick={() => void bulkRestore()}
                    className="px-2 py-1 rounded hover:bg-background/15 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> 복원
                  </button>
                  <button
                    type="button"
                    onClick={() => void bulkPermanentDelete()}
                    className="px-2 py-1 rounded hover:bg-red-400/30 flex items-center gap-1 text-red-200"
                  >
                    <X className="w-3.5 h-3.5" /> 완전 삭제
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void bulkStar(true)}
                    className="px-2 py-1 rounded hover:bg-background/15 flex items-center gap-1"
                  >
                    <Star className="w-3.5 h-3.5" /> 별표
                  </button>
                  <button
                    type="button"
                    onClick={() => void bulkStar(false)}
                    className="px-2 py-1 rounded hover:bg-background/15 flex items-center gap-1"
                  >
                    <Star className="w-3.5 h-3.5 opacity-50" /> 별표 해제
                  </button>
                  <button
                    type="button"
                    onClick={() => void bulkMoveToTrash()}
                    className="px-2 py-1 rounded hover:bg-red-400/30 flex items-center gap-1 text-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 휴지통으로
                  </button>
                </>
              )}
            </div>
          )}
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
                  onClick={() => { void handleCreateDoc(); }}
                />
                <NewCard
                  icon={<FileSpreadsheet className="w-6 h-6" />}
                  label="시트"
                  color="hsl(140 50% 50%)"
                  onClick={() => { void handleCreateSheet(); }}
                />
                <NewCard
                  icon={<Presentation className="w-6 h-6" />}
                  label="슬라이드"
                  color="hsl(25 85% 55%)"
                  onClick={() => { void handleCreateSlide(); }}
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
              <div className="flex items-center gap-2 text-xs">
                {/* 정렬 옵션 */}
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="px-1.5 py-1 rounded border border-border bg-background hover:bg-muted cursor-pointer text-xs"
                  aria-label="정렬 기준"
                  title="정렬 기준"
                >
                  <option value="updated">수정일</option>
                  <option value="name">이름</option>
                  <option value="size">크기</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                  className="px-1.5 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title={sortDir === 'asc' ? '오름차순 (낮은→높은)' : '내림차순 (높은→낮은)'}
                  aria-label="정렬 방향"
                >
                  {sortDir === 'asc' ? '↑' : '↓'}
                </button>
                <div className="w-px h-4 bg-border mx-1" />
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
                {displayedNodes.map((n) => (
                  <NodeRow
                    key={n.id}
                    node={n}
                    selected={selectedIds.has(n.id) || n.id === selectedId}
                    editing={n.id === editingId}
                    listMode={listMode}
                    onClick={(e) => handleNodeClick(n, e)}
                    onDoubleClick={() => handleNodeDoubleClick(n)}
                    onSubmitRename={(newName) => void submitRename(n.id, newName)}
                    onCancelRename={() => setEditingId(null)}
                    onToggleStar={() => void handleToggleStar(n)}
                    onRename={() => startRename(n.id)}
                    onMoveToTrash={() => void handleMoveToTrash(n)}
                    onRestore={() => void handleRestore(n)}
                    onPermanentDelete={() => void handlePermanentDelete(n)}
                    onOpenFile={() => handleOpenFile(n)}
                    onContextMenu={handleContextMenu}
                    draggable={listMode !== 'trash'}
                    isDragging={draggingNodeId === n.id}
                    isDropTarget={dropTargetId === n.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => { void handleDrop(e, n.id); }}
                  />
                ))}
              </ul>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {displayedNodes.map((n) => (
                  <NodeCard
                    key={n.id}
                    node={n}
                    selected={selectedIds.has(n.id) || n.id === selectedId}
                    listMode={listMode}
                    onClick={(e) => handleNodeClick(n, e)}
                    onDoubleClick={() => handleNodeDoubleClick(n)}
                    onToggleStar={() => void handleToggleStar(n)}
                    onRename={() => startRename(n.id)}
                    onMoveToTrash={() => void handleMoveToTrash(n)}
                    onRestore={() => void handleRestore(n)}
                    onPermanentDelete={() => void handlePermanentDelete(n)}
                    onOpenFile={() => handleOpenFile(n)}
                    onContextMenu={handleContextMenu}
                    draggable={listMode !== 'trash'}
                    isDragging={draggingNodeId === n.id}
                    isDropTarget={dropTargetId === n.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => { void handleDrop(e, n.id); }}
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
              <div className="mt-3 text-[11px] text-muted-foreground/70">
                더블클릭 시 편집기로 진입
              </div>
            </div>
          ) : (
            <PreviewPanel node={selectedNode} listMode={listMode} />
          )}
        </aside>
        <AiSidebar
          open={ai.open}
          onClose={() => ai.setOpen(false)}
          context={getAiContext()}
          messages={ai.messages}
          sending={ai.sending}
          onSend={ai.send}
          onClear={ai.clear}
        />
      </div>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(n) => { void handleSearchSelect(n); }}
      />

      {/* 우클릭 컨텍스트 메뉴 */}
      {ctxMenu && (() => {
        const node = ctxMenu.node;
        return (
          <div
            className="fixed z-[60] rounded border border-border bg-popover shadow-md text-sm min-w-[170px] py-1"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {!node ? (
              // 빈 영역: 새로 만들기 메뉴
              <>
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                  onClick={() => { void handleCreateDoc(); setCtxMenu(null); }}
                >
                  <FileText className="w-4 h-4" /> 새 문서
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                  onClick={() => { void handleCreateSheet(); setCtxMenu(null); }}
                >
                  <FileSpreadsheet className="w-4 h-4" /> 새 시트
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                  onClick={() => { void handleCreateSlide(); setCtxMenu(null); }}
                >
                  <Presentation className="w-4 h-4" /> 새 슬라이드
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                  onClick={() => { openNewFolderInput(); setCtxMenu(null); }}
                >
                  <FolderPlus className="w-4 h-4" /> 새 폴더
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                  onClick={() => { handleUploadClick(); setCtxMenu(null); }}
                >
                  <Upload className="w-4 h-4" /> 파일 업로드…
                </button>
              </>
            ) : node.deletedAt ? (
              // 휴지통 항목
              <>
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                  onClick={() => { void handleRestore(node); setCtxMenu(null); }}
                >
                  <RotateCcw className="w-4 h-4" /> 복원
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 hover:bg-muted text-destructive flex items-center gap-2"
                  onClick={() => { void handlePermanentDelete(node); setCtxMenu(null); }}
                >
                  <X className="w-4 h-4" /> 완전 삭제
                </button>
              </>
            ) : (
              // 일반 파일/폴더
              <>
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                  onClick={() => {
                    if (node.kind === 'folder') {
                      setTrail((cur) => [...cur, { id: node.id, name: node.name }]);
                    } else {
                      handleOpenFile(node);
                    }
                    setCtxMenu(null);
                  }}
                >
                  <FolderOpen className="w-4 h-4" />
                  {node.kind === 'folder' ? '폴더 열기' : '편집기에서 열기'}
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                  onClick={() => { startRename(node.id); setCtxMenu(null); }}
                >
                  <Pencil className="w-4 h-4" /> 이름 변경
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                  onClick={() => { void handleToggleStar(node); setCtxMenu(null); }}
                >
                  <Star className={cn('w-4 h-4', node.starred && 'fill-yellow-400 text-yellow-400')} />
                  {node.starred ? '별표 해제' : '별표 추가'}
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 hover:bg-muted text-destructive flex items-center gap-2"
                  onClick={() => { void handleMoveToTrash(node); setCtxMenu(null); }}
                >
                  <Trash2 className="w-4 h-4" /> 휴지통으로
                </button>
              </>
            )}
          </div>
        );
      })()}
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
  if (mode === 'recent') {
    return (
      <div className="border-2 border-dashed border-border rounded-lg py-16 px-4 text-center">
        <div className="text-5xl mb-3" aria-hidden>🕒</div>
        <div className="text-base font-medium mb-1">최근 작업한 파일이 없어요</div>
        <div className="text-sm text-muted-foreground">파일을 만들거나 편집하면 최근 50개가 여기 모입니다.</div>
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
// 폴더 트리 항목 (사이드바)
// ─────────────────────────────────────────────

interface FolderTreeItemProps {
  folder: CloudNode;
  depth: number;
  currentFolderId: string | null;
  childrenMap: Map<string | null, CloudNode[]>;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: (folder: CloudNode) => void;
  // DnD
  dropTargetId?: string | null | 'root';
  onDragOver?: (e: React.DragEvent, folderId: string | null) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent, folderId: string | null) => void;
}

function FolderTreeItem({
  folder, depth, currentFolderId, childrenMap, expanded, onToggle, onNavigate,
  dropTargetId, onDragOver, onDragLeave, onDrop,
}: FolderTreeItemProps) {
  const children = childrenMap.get(folder.id) ?? [];
  const isExpanded = expanded.has(folder.id);
  const isCurrent = currentFolderId === folder.id;
  const isDropTarget = dropTargetId === folder.id;
  return (
    <div>
      <div
        onDragOver={onDragOver ? (e) => onDragOver(e, folder.id) : undefined}
        onDragLeave={onDragLeave}
        onDrop={onDrop ? (e) => onDrop(e, folder.id) : undefined}
        className={cn(
          'flex items-center gap-1 px-1.5 py-1 rounded text-xs',
          isCurrent ? 'bg-muted font-medium' : 'hover:bg-muted/60',
          isDropTarget && 'ring-2 ring-inset ring-foreground/40 bg-foreground/5',
        )}
        style={{ paddingLeft: `${depth * 10 + 6}px` }}
      >
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => onToggle(folder.id)}
            className="p-0.5 hover:bg-background rounded text-muted-foreground"
            aria-label={isExpanded ? '접기' : '펼치기'}
          >
            <ChevronRight className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-4" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => onNavigate(folder)}
          className="flex-1 flex items-center gap-1.5 truncate text-left"
        >
          <Folder className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="truncate">{folder.name}</span>
        </button>
      </div>
      {isExpanded && children.length > 0 && (
        <div>
          {children.map((c) => (
            <FolderTreeItem
              key={c.id}
              folder={c}
              depth={depth + 1}
              currentFolderId={currentFolderId}
              childrenMap={childrenMap}
              expanded={expanded}
              onToggle={onToggle}
              onNavigate={onNavigate}
              dropTargetId={dropTargetId}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
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
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onSubmitRename: (newName: string) => void;
  onCancelRename: () => void;
  onToggleStar: () => void;
  onRename: () => void;
  onMoveToTrash: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  onOpenFile: () => void;
  onContextMenu?: (e: React.MouseEvent, node: CloudNode) => void;
  // DnD — drag 가능 + 폴더면 drop 대상
  draggable?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: (e: React.DragEvent, node: CloudNode) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent, folderId: string | null) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent, folderId: string | null) => void;
}

function NodeRow({
  node, selected, editing, listMode,
  onClick, onDoubleClick, onSubmitRename, onCancelRename,
  onToggleStar, onRename, onMoveToTrash, onRestore, onPermanentDelete, onOpenFile,
  onContextMenu,
  draggable, isDragging, isDropTarget,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
}: NodeRowProps) {
  const isFolder = node.kind === 'folder';
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        data-cloud-node="true"
        draggable={draggable && !editing}
        onDragStart={onDragStart && !editing ? (e) => onDragStart(e, node) : undefined}
        onDragEnd={onDragEnd}
        // 폴더 row 만 drop 대상
        onDragOver={isFolder && onDragOver ? (e) => onDragOver(e, node.id) : undefined}
        onDragLeave={isFolder ? onDragLeave : undefined}
        onDrop={isFolder && onDrop ? (e) => onDrop(e, node.id) : undefined}
        onClick={editing ? undefined : (e) => onClick(e)}
        onDoubleClick={editing ? undefined : onDoubleClick}
        onContextMenu={editing || !onContextMenu ? undefined : (e) => onContextMenu(e, node)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !editing) onClick(e as unknown as React.MouseEvent);
        }}
        className={cn(
          'group w-full flex items-center gap-3 px-3 py-2 text-left text-sm cursor-pointer',
          'hover:bg-muted/50',
          selected && 'bg-muted',
          isDragging && 'opacity-50',
          isDropTarget && 'ring-2 ring-inset ring-foreground/40 bg-foreground/5',
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

        {/* 별표 (호버 시 빈 별, 별표 시엔 항상 노출) — trash 모드에선 X */}
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

        {/* 호버 시 ⋯ 메뉴 */}
        <NodeActionMenu
          node={node}
          listMode={listMode}
          onToggleStar={onToggleStar}
          onRename={onRename}
          onMoveToTrash={onMoveToTrash}
          onRestore={onRestore}
          onPermanentDelete={onPermanentDelete}
          onOpenFile={onOpenFile}
        />
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
  listMode: CloudListMode;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onToggleStar: () => void;
  onRename: () => void;
  onMoveToTrash: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  onOpenFile: () => void;
  onContextMenu?: (e: React.MouseEvent, node: CloudNode) => void;
  draggable?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: (e: React.DragEvent, node: CloudNode) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent, folderId: string | null) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent, folderId: string | null) => void;
}

function NodeCard({
  node, selected, listMode, onClick, onDoubleClick, onToggleStar,
  onRename, onMoveToTrash, onRestore, onPermanentDelete, onOpenFile, onContextMenu,
  draggable, isDragging, isDropTarget,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
}: NodeCardProps) {
  const isFolder = node.kind === 'folder';
  return (
    <div
      role="button"
      tabIndex={0}
      data-cloud-node="true"
      draggable={draggable}
      onDragStart={onDragStart ? (e) => onDragStart(e, node) : undefined}
      onDragEnd={onDragEnd}
      onDragOver={isFolder && onDragOver ? (e) => onDragOver(e, node.id) : undefined}
      onDragLeave={isFolder ? onDragLeave : undefined}
      onDrop={isFolder && onDrop ? (e) => onDrop(e, node.id) : undefined}
      onClick={(e) => onClick(e)}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu ? (e) => onContextMenu(e, node) : undefined}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(e as unknown as React.MouseEvent); }}
      className={cn(
        'group border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors text-left cursor-pointer relative',
        selected && 'border-foreground/50 bg-muted',
        isDragging && 'opacity-50',
        isDropTarget && 'ring-2 ring-foreground/40 bg-foreground/5',
      )}
    >
      {/* 상단 우측: 별표 + ⋯ */}
      <div className="absolute top-2 right-2 flex items-center gap-0.5">
        {listMode !== 'trash' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
            className={cn(
              'p-1 rounded hover:bg-muted',
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
        )}
        <NodeActionMenu
          node={node}
          listMode={listMode}
          onToggleStar={onToggleStar}
          onRename={onRename}
          onMoveToTrash={onMoveToTrash}
          onRestore={onRestore}
          onPermanentDelete={onPermanentDelete}
          onOpenFile={onOpenFile}
        />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <NodeIcon node={node} />
      </div>
      <div className="text-sm truncate font-medium pr-12">{node.name}</div>
      <div className="text-xs text-muted-foreground mt-1">{relativeTime(node.updatedAt)}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 노드 액션 ⋯ 드롭다운 (호버 시 노출)
// ─────────────────────────────────────────────

interface NodeActionMenuProps {
  node: CloudNode;
  listMode: CloudListMode;
  onToggleStar: () => void;
  onRename: () => void;
  onMoveToTrash: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  onOpenFile: () => void;
}

function NodeActionMenu({
  node, listMode, onToggleStar, onRename, onMoveToTrash, onRestore, onPermanentDelete, onOpenFile,
}: NodeActionMenuProps) {
  const isTrash = listMode === 'trash';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-70 data-[state=open]:opacity-100 focus-visible:opacity-100"
          aria-label="더 보기"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
        className="min-w-[160px]"
      >
        {!isTrash ? (
          <>
            {node.kind === 'file' && (node.fileType === 'doc' || node.fileType === 'sheet' || node.fileType === 'slide') && (
              <>
                <DropdownMenuItem onSelect={onOpenFile}>
                  <Eye className="w-4 h-4 mr-2" /> 편집
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onSelect={onRename}>
              <Pencil className="w-4 h-4 mr-2" /> 이름 변경
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onToggleStar}>
              <Star className={cn('w-4 h-4 mr-2', node.starred && 'fill-yellow-400 text-yellow-400')} />
              {node.starred ? '별표 해제' : '별표'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onMoveToTrash} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> 휴지통으로
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onSelect={onRestore}>
              <RotateCcw className="w-4 h-4 mr-2" /> 복원
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onPermanentDelete} className="text-destructive focus:text-destructive">
              <X className="w-4 h-4 mr-2" /> 영구 삭제
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────
// 미리보기 패널
// ─────────────────────────────────────────────

interface PreviewPanelProps {
  node: CloudNode;
  listMode: CloudListMode;
}

function PreviewPanel({ node, listMode }: PreviewPanelProps) {
  const isTrash = listMode === 'trash';
  const isEditable = node.kind === 'file' && (
    node.fileType === 'doc' || node.fileType === 'sheet' || node.fileType === 'slide'
  );
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
        {node.starred && (
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 shrink-0" />
        )}
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

      <div className="pt-2 border-t border-border text-[11px] text-muted-foreground/70 leading-relaxed">
        {isTrash
          ? '⋯ 메뉴에서 복원 또는 영구 삭제'
          : node.kind === 'folder'
            ? '더블클릭으로 폴더 진입'
            : isEditable
              ? '더블클릭으로 편집 · ⋯ 메뉴로 별표·이름변경·삭제'
              : '⋯ 메뉴에서 작업'}
      </div>
    </div>
  );
}
