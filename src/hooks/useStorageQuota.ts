import { useEffect, useState } from 'react';

export interface QuotaInfo {
  usage: number;
  quota: number;
  ratio: number; // 0..1
  level: 'ok' | 'warn' | 'critical';
}

const POLL_MS = 60_000;

function levelOf(ratio: number): QuotaInfo['level'] {
  if (ratio >= 0.95) return 'critical';
  if (ratio >= 0.8) return 'warn';
  return 'ok';
}

/**
 * navigator.storage.estimate() 폴링 — 80% 경고, 95% 위험.
 * IDB 가 quota 초과 시 조용히 실패하는 것을 사용자가 *전에* 알아챌 수 있게 함.
 */
export function useStorageQuota(): QuotaInfo | null {
  const [info, setInfo] = useState<QuotaInfo | null>(null);

  useEffect(() => {
    const supported =
      typeof navigator !== 'undefined' &&
      'storage' in navigator &&
      typeof navigator.storage.estimate === 'function';
    if (!supported) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const est = await navigator.storage.estimate();
        const usage = est.usage ?? 0;
        const quota = est.quota ?? 0;
        const ratio = quota > 0 ? usage / quota : 0;
        if (!cancelled) {
          setInfo({ usage, quota, ratio, level: levelOf(ratio) });
        }
      } catch {
        /* noop */
      }
    };
    void tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return info;
}
