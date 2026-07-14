/**
 * 아카이브 store 구독 훅.
 * ARCHIVE_CHANGED 이벤트로 자동 re-render. 최초 마운트 시 기본 컬렉션 시드.
 *
 * TDZ 주의: state 선언 → refresh(useCallback) → useEffect 순서 엄수.
 */
import { useCallback, useEffect, useState } from 'react';
import { ARCHIVE_CHANGED, type ArchiveCollection, type ArchiveItem } from '@/types/archive';
import { archiveStore } from '@/services/archiveStore';

export interface ArchiveData {
  items: ArchiveItem[];
  collections: ArchiveCollection[];
}

export function useArchive(): ArchiveData {
  const [data, setData] = useState<ArchiveData>(() => ({ items: [], collections: [] }));

  const refresh = useCallback(() => {
    setData({ items: archiveStore.listItems(), collections: archiveStore.listCollections() });
  }, []);

  useEffect(() => {
    archiveStore.ensureSeeded();
    refresh();
    window.addEventListener(ARCHIVE_CHANGED, refresh);
    return () => window.removeEventListener(ARCHIVE_CHANGED, refresh);
  }, [refresh]);

  return data;
}
