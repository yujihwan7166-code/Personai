/** 클라우드 노드 로드 + 소유자/타입 검증 — 시트/슬라이드/문서 공용 훅. */

import type React from 'react';
import { useEffect, useState } from 'react';
import { fetchNode } from '@/lib/cloudClient';
import type { CloudNode, CloudFileType } from '@/types/cloud';

interface UseCloudNodeLoaderOpts {
  id: string | undefined;
  user: { id: string } | null;
  authLoading: boolean;
  expectedFileType: CloudFileType;
  /** 노드가 존재하지 않을 때 표시할 에러 ("슬라이드를 찾을 수 없어요." 등). */
  notFoundMessage: string;
  /** 노드 종류가 다를 때 ("슬라이드 파일이 아니에요." 등). */
  wrongTypeMessage: string;
  /** 검증 통과 후 메타데이터를 페이지별 상태에 반영하는 콜백. */
  onLoad: (node: CloudNode) => void;
}

interface UseCloudNodeLoaderResult {
  node: CloudNode | null;
  loadError: string | null;
  /** 로컬 node state 직접 patch — onUpdate 등에서 즉시 반영용 (서버 저장은 별도). */
  setNode: React.Dispatch<React.SetStateAction<CloudNode | null>>;
}

export function useCloudNodeLoader({
  id, user, authLoading, expectedFileType,
  notFoundMessage, wrongTypeMessage, onLoad,
}: UseCloudNodeLoaderOpts): UseCloudNodeLoaderResult {
  const [node, setNode] = useState<CloudNode | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (authLoading) return;
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const n = await fetchNode(id);
        if (cancelled) return;
        if (!n) { setLoadError(notFoundMessage); return; }
        if (n.ownerId !== user.id) { setLoadError('접근 권한이 없어요.'); return; }
        if (n.kind !== 'file' || n.fileType !== expectedFileType) {
          setLoadError(wrongTypeMessage);
          return;
        }
        setNode(n);
        onLoad(n);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, authLoading]);

  return { node, loadError, setNode };
}
