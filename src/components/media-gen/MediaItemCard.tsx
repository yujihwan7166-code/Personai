import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Play, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMediaObjectURL } from '@/lib/mediaGenStore';
import { relativeTime, MEDIA_STATUS_LABEL, type MediaItem } from '@/types/mediaGen';

interface Props {
  item: MediaItem;
  onClick: () => void;
  /** 이미지를 동영상 입력 소스(첫/끝 프레임)로 쓰고 싶을 때. */
  onImageToVideo?: (frame: 'first' | 'last') => void;
}

export function MediaItemCard({ item, onClick, onImageToVideo }: Props) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const busy = item.status === 'queued' || item.status === 'generating';
  const isError = item.status === 'error';
  const isReady = item.status === 'ready';

  useEffect(() => {
    let revoked = false;
    let urlToRevoke: string | null = null;
    if (item.kind === 'image' && item.blobRef && isReady) {
      (async () => {
        const url = await getMediaObjectURL(item.blobRef!).catch(() => null);
        if (revoked) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        urlToRevoke = url;
        setLocalUrl(url);
      })();
    }
    return () => {
      revoked = true;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [item.kind, item.blobRef, isReady]);

  const previewUrl =
    item.kind === 'image'
      ? localUrl || item.resultUrl || ''
      : item.thumbnailUrl || '';

  // 비율 유지 (masonry용 — aspect 직접 적용)
  const aspectClass =
    item.aspectRatio === '16:9'
      ? 'aspect-video'
      : item.aspectRatio === '9:16'
      ? 'aspect-[9/16]'
      : 'aspect-square';

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 transition-all hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 cursor-pointer',
        aspectClass,
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      {/* 플레이스홀더 — 생성 중 shimmer */}
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 animate-pulse" />
          <div className="relative flex flex-col items-center gap-2 p-3 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              {MEDIA_STATUS_LABEL[item.status]}
              {item.kind === 'video' && (
                <>
                  <br />
                  <span className="text-slate-400">최대 3분 소요</span>
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* 오류 */}
      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-red-50 dark:bg-red-950/30 p-3">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-[10.5px] text-red-700 dark:text-red-300 text-center leading-tight line-clamp-3">
            {item.errorMessage || '생성 실패'}
          </p>
        </div>
      )}

      {/* 완료 */}
      {isReady && previewUrl && (
        <img
          src={previewUrl}
          alt={item.prompt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      )}
      {isReady && !previewUrl && item.kind === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <Film className="h-8 w-8 text-slate-500" strokeWidth={1.5} />
        </div>
      )}

      {/* 모드 뱃지 (좌상단) */}
      <div
        className={cn(
          'absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm',
          item.kind === 'image'
            ? 'bg-indigo-500/90 text-white'
            : 'bg-pink-500/90 text-white',
        )}
      >
        {item.kind === 'image' ? '🖼' : '🎬'}
      </div>

      {/* Image → Video hover 액션 (이미지, ready, 핸들러 있을 때) — 첫/끝 프레임 */}
      {isReady && item.kind === 'image' && onImageToVideo && (
        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onImageToVideo('first'); }}
            className="inline-flex items-center gap-1 rounded-md bg-pink-500/95 px-1.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm hover:bg-pink-600"
            title="이 이미지를 영상의 첫 프레임으로"
          >
            <Film className="h-3 w-3" /> 첫
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onImageToVideo('last'); }}
            className="inline-flex items-center gap-1 rounded-md bg-pink-400/95 px-1.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm hover:bg-pink-500"
            title="이 이미지를 영상의 끝 프레임으로"
          >
            끝
          </button>
        </div>
      )}

      {/* 동영상 플레이 오버레이 */}
      {isReady && item.kind === 'video' && previewUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="h-10 w-10 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
            <Play className="h-4 w-4 text-slate-900 ml-0.5" fill="currentColor" />
          </div>
        </div>
      )}

      {/* 하단 캡션 */}
      {isReady && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <p className="text-[10.5px] text-white/95 line-clamp-2 leading-tight">{item.prompt}</p>
          <p className="text-[9px] text-white/60 mt-0.5 tabular-nums">
            {relativeTime(item.createdAt)}
            {item.kind === 'video' && item.durationSec && ` · ${item.durationSec}초`}
          </p>
        </div>
      )}
    </div>
  );
}
