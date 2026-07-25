/**
 * 아카이브 store 구독 훅.
 * ARCHIVE_CHANGED 이벤트로 자동 re-render. 최초 마운트 시 기본 컬렉션 시드 + 고아 blob 정리.
 *
 * TDZ 주의: state 선언 → refresh(useCallback) → useEffect 순서 엄수.
 */
import { useCallback, useEffect, useState } from 'react';
import { ARCHIVE_CHANGED, type ArchiveCollection, type ArchiveItem } from '@/types/archive';
import { archiveStore } from '@/services/archiveStore';
import { ARCHIVE_BLOB_LIMITS, archiveBlobUsage, pruneArchiveOrphans } from '@/lib/archiveBlobStore';
import { notify } from '@/lib/notify';

export interface ArchiveData {
  items: ArchiveItem[];
  collections: ArchiveCollection[];
}

/** 세션당 1회만 — 방을 드나들 때마다 IndexedDB 를 훑지 않게. */
let prunedThisSession = false;

/**
 * 항목이 참조하지 않는 첨부 원본 청소.
 * items 가 비었으면 건너뛴다 — localStorage 를 일시적으로 못 읽은 상황에서
 * "전부 고아"로 오판해 사용자 파일을 통째로 날리는 사고를 막는다.
 * (진짜 전체 삭제는 archiveStore.clear() 가 직접 처리)
 */
function pruneOrphansOnce(items: ArchiveItem[]): void {
  if (prunedThisSession || items.length === 0) return;
  prunedThisSession = true;
  const active = items.map((i) => i.blobRef).filter((r): r is string => !!r);
  const run = async () => {
    await pruneArchiveOrphans(active);
    // 정리 후에도 소프트 상한을 넘으면 한 번만 알린다 (막지는 않는다).
    if (await archiveBlobUsage() > ARCHIVE_BLOB_LIMITS.TOTAL) {
      notify.warning('첨부 파일이 1GB를 넘었어요', {
        description: '큰 파일부터 정리하면 브라우저 저장 공간을 아낄 수 있어요.',
      });
    }
  };
  const kick = () => { void run(); };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(kick, { timeout: 4000 });
  else setTimeout(kick, 2000);
}

export function useArchive(): ArchiveData {
  const [data, setData] = useState<ArchiveData>(() => ({ items: [], collections: [] }));

  const refresh = useCallback(() => {
    setData({ items: archiveStore.listItems(), collections: archiveStore.listCollections() });
  }, []);

  useEffect(() => {
    archiveStore.ensureSeeded();
    refresh();
    pruneOrphansOnce(archiveStore.listItems());
    window.addEventListener(ARCHIVE_CHANGED, refresh);
    return () => window.removeEventListener(ARCHIVE_CHANGED, refresh);
  }, [refresh]);

  return data;
}
