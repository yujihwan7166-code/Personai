import { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { useStorageQuota } from '@/hooks/useStorageQuota';
import { daysSinceBackup, shouldShowBackupNudge } from '@/lib/wikiBackupMeta';
import { exportAllAsJson } from '@/lib/wikiBackup';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

interface Props {
  /** 사용량 패널 열기 콜백 */
  onOpenStorage: () => void;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * 사이드바 헤더에 배치되는 작은 신뢰성 배지들.
 * - quota 80%+ → 노랑, 95%+ → 빨강. 클릭 시 사용량 패널.
 * - 마지막 백업 7일+ → 시계 배지. 클릭 시 즉시 백업.
 */
export function WikiHeaderBadges({ onOpenStorage }: Props) {
  const quota = useStorageQuota();
  const [backupStale, setBackupStale] = useState(shouldShowBackupNudge());
  const [days, setDays] = useState<number | null>(daysSinceBackup());

  // 마지막 백업 시점은 export 시 갱신되므로 주기 점검 (1시간)
  useEffect(() => {
    const id = window.setInterval(() => {
      setBackupStale(shouldShowBackupNudge());
      setDays(daysSinceBackup());
    }, 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const handleQuickBackup = async () => {
    try {
      await exportAllAsJson();
      notify.success('백업 완료');
      setBackupStale(false);
      setDays(0);
    } catch (e) {
      notify.error('백업 실패', { description: (e as Error).message });
    }
  };

  if (!quota || (quota.level === 'ok' && !backupStale)) return null;

  return (
    <div className="flex items-center gap-1">
      {quota.level !== 'ok' && (
        <button
          type="button"
          onClick={onOpenStorage}
          className={cn(
            'inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium transition-colors',
            quota.level === 'critical'
              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25'
              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25',
          )}
          title={`저장소 ${Math.round(quota.ratio * 100)}% 사용 중 — 클릭해 사용량 보기`}
        >
          <AlertTriangle className="w-3 h-3" />
          {Math.round(quota.ratio * 100)}%
        </button>
      )}
      {backupStale && (
        <button
          type="button"
          onClick={() => { void handleQuickBackup(); }}
          className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
          title={`마지막 백업 ${days ?? 0}일 전 — 클릭해 지금 받기`}
        >
          <Clock className="w-3 h-3" />
          {days}일
        </button>
      )}
    </div>
  );
}
