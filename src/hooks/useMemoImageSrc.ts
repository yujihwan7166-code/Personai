/**
 * MemoImage → 표시용 URL 해석 훅.
 *
 * - 옛 데이터 (dataUrl) → 그대로 반환 (sync, 즉시 사용 가능)
 * - 새 데이터 (idbId) → IndexedDB 에서 blob → object URL (async, unmount 시 revoke)
 * - 둘 다 없거나 IDB 실패 시 null
 */
import { useEffect, useState } from 'react';
import type { MemoImage } from '@/lib/memoStore';

export const useMemoImageSrc = (image: MemoImage | undefined): string | null => {
  const [url, setUrl] = useState<string | null>(image?.dataUrl ?? null);

  useEffect(() => {
    if (!image) {
      setUrl(null);
      return;
    }
    // 옛 dataUrl 데이터 — sync
    if (image.dataUrl) {
      setUrl(image.dataUrl);
      return;
    }
    // 새 idbId → async 로 blob 가져옴
    if (!image.idbId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    let createdObjectURL: string | null = null;
    (async () => {
      const { getMemoImageURL } = await import('@/lib/memoImageStore');
      const u = await getMemoImageURL(image.idbId!);
      if (cancelled) {
        if (u) URL.revokeObjectURL(u);
        return;
      }
      createdObjectURL = u;
      setUrl(u);
    })();
    return () => {
      cancelled = true;
      if (createdObjectURL) URL.revokeObjectURL(createdObjectURL);
    };
  }, [image?.id, image?.dataUrl, image?.idbId]);

  return url;
};
