/**
 * useOnlineStatus — 네트워크 연결 상태.
 *
 * navigator.onLine + online/offline 이벤트.
 * 오프라인 배너 / 동기화 큐 트리거.
 */

import { useEffect, useState } from 'react';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return online;
}
