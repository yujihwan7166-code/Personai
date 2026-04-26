import { useEffect, useState } from 'react';
import { X, HardDrive, Trash2 } from 'lucide-react';
import { computeStorageStats, garbageCollectImages, formatBytes, type StorageStats } from '@/lib/wikiMaintenance';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WikiStoragePanel({ open, onClose }: Props) {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setStats(await computeStorageStats());
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleGc = async () => {
    if (!confirm('참조 안 된 이미지를 모두 삭제할까요?')) return;
    setBusy(true);
    try {
      const r = await garbageCollectImages();
      setMsg(`${r.removed}개 이미지 삭제 (${formatBytes(r.removedBytes)} 회수)`);
      await refresh();
      setTimeout(() => setMsg(null), 4000);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 wiki-z-modal-backdrop flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
      role="dialog"
      aria-label="저장소 사용량"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-[hsl(var(--hairline))] bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--hairline))]">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[14px] font-bold flex-1">저장소 사용량</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {loading || !stats ? (
            <p className="text-[12px] text-muted-foreground py-6 text-center">집계 중…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 mb-5">
                <Stat label="페이지" value={stats.pageCount.toString()} />
                <Stat label="버전 히스토리" value={stats.revisionCount.toString()} />
                <Stat label="이미지" value={stats.imageCount.toString()} sub={formatBytes(stats.imageBytes)} />
                <Stat
                  label="고아 이미지"
                  value={stats.orphanImageCount.toString()}
                  sub={stats.orphanImageCount > 0 ? '정리 가능' : '깨끗함'}
                  highlight={stats.orphanImageCount > 0}
                />
              </div>

              {stats.topImages.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10.5px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                    가장 큰 이미지 Top {stats.topImages.length}
                  </p>
                  <ul className="space-y-1">
                    {stats.topImages.map((img) => (
                      <li
                        key={img.id}
                        className="flex items-center gap-2 px-2 py-1 rounded-md bg-accent/30 text-[11px]"
                      >
                        <span className="text-muted-foreground font-mono truncate flex-1">
                          {img.id}
                        </span>
                        <span className="text-muted-foreground">{img.type.replace('image/', '')}</span>
                        <span className="font-medium">{formatBytes(img.size)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 액션 */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGc}
                  disabled={busy || stats.orphanImageCount === 0}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md bg-destructive/10 text-destructive text-[12px] font-semibold hover:bg-destructive/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  고아 이미지 정리
                </button>
                {msg && <span className="text-[11px] text-emerald-600 dark:text-emerald-400">{msg}</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label, value, sub, highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[hsl(var(--hairline))] bg-card px-3 py-2">
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`text-[20px] font-bold mt-0.5 ${highlight ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
        {value}
      </p>
      {sub && <p className="text-[10.5px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
