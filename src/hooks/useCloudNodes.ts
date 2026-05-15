/**
 * 클라우드 노드 목록 hook — 현재 폴더 기준.
 *
 * 단순 useState + useEffect. React Query 는 캐시 필요해질 때(8단계+) 도입.
 * mutation 후 refresh() 호출로 즉시 반영.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAliveChildren, fetchCounts } from '@/lib/cloudClient';
import type { CloudNode } from '@/types/cloud';

export interface UseCloudNodesResult {
  nodes: CloudNode[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  starredCount: number;
  trashCount: number;
}

export function useCloudNodes(parentFolderId: string | null): UseCloudNodesResult {
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
      const [items, counts] = await Promise.all([
        fetchAliveChildren(user.id, parentFolderId),
        fetchCounts(user.id),
      ]);
      setNodes(items);
      setStarredCount(counts.starred);
      setTrashCount(counts.trash);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user, parentFolderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { nodes, loading, error, refresh, starredCount, trashCount };
}
