/**
 * 클라우드 노드 목록 hook — 모드별 (현재 폴더 / 별표 / 휴지통).
 *
 * 단순 useState + useEffect. React Query 는 캐시 필요해질 때(8단계+) 도입.
 * mutation 후 refresh() 호출로 즉시 반영.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchAliveChildren, fetchStarred, fetchTrash, fetchCounts,
} from '@/lib/cloudClient';
import type { CloudNode } from '@/types/cloud';

export type CloudListMode = 'folder' | 'starred' | 'trash';

export interface UseCloudNodesArgs {
  mode: CloudListMode;
  /** mode === 'folder' 일 때만 사용. null = 루트. */
  parentFolderId: string | null;
}

export interface UseCloudNodesResult {
  nodes: CloudNode[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  starredCount: number;
  trashCount: number;
}

export function useCloudNodes({ mode, parentFolderId }: UseCloudNodesArgs): UseCloudNodesResult {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<CloudNode[]>([]);
  const [starredCount, setStarredCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setNodes([]);
      setStarredCount(0);
      setTrashCount(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetcher =
        mode === 'starred' ? fetchStarred(user.id)
          : mode === 'trash' ? fetchTrash(user.id)
            : fetchAliveChildren(user.id, parentFolderId);
      const [items, counts] = await Promise.all([fetcher, fetchCounts(user.id)]);
      setNodes(items);
      setStarredCount(counts.starred);
      setTrashCount(counts.trash);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user, mode, parentFolderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { nodes, loading, error, refresh, starredCount, trashCount };
}
