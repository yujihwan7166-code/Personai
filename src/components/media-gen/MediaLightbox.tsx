import { useEffect, useState } from 'react';
import {
  X, Download, Trash2, AlertCircle, Loader2, Shuffle, Edit3, Film,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getMediaObjectURL } from '@/lib/mediaGenStore';
import { MEDIA_STATUS_LABEL, relativeTime, type MediaItem } from '@/types/mediaGen';
import { cn } from '@/lib/utils';

interface Props {
  item: MediaItem;
  onClose: () => void;
  onDelete: () => void;
  /** 이전/다음 아이템 네비게이션 (arrow key 또는 버튼) */
  onPrev?: () => void;
  onNext?: () => void;
  /** Remix/Variation/Image→Video 액션 */
  onRemix?: (item: MediaItem) => void;
  onVariation?: (item: MediaItem) => void;
  onImageToVideo?: (item: MediaItem) => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function MediaLightbox({
  item, onClose, onDelete, onPrev, onNext,
  onRemix, onVariation, onImageToVideo,
  hasPrev, hasNext,
}: Props) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && hasPrev) onPrev?.();
      else if (e.key === 'ArrowRight' && hasNext) onNext?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  useEffect(() => {
    let revoked = false;
    let urlToRevoke: string | null = null;
    if (item.kind === 'image' && item.blobRef) {
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
      setLocalUrl(null);
    };
  }, [item.id, item.kind, item.blobRef]);

  const mediaUrl =
    item.kind === 'image' ? localUrl || item.resultUrl || '' : item.resultUrl || '';
  const bgUrl = item.kind === 'image' ? mediaUrl : item.thumbnailUrl || '';

  const handleDownload = async () => {
    if (!mediaUrl) return;
    try {
      const ext = item.kind === 'image'
        ? (item.mimeType?.includes('jpeg') ? 'jpg' : 'png')
        : 'mp4';
      const a = document.createElement('a');
      a.href = mediaUrl;
      a.download = `${item.kind}-${item.id.slice(0, 8)}.${ext}`;
      a.click();
    } catch {
      window.open(mediaUrl, '_blank');
    }
  };

  const busy = item.status === 'queued' || item.status === 'generating';
  const isError = item.status === 'error';
  const isReady = item.status === 'ready';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      {/* 블러 배경 — 미디어 자체를 확장·블러 처리 (Pinterest 스타일) */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-xl" />
      {bgUrl && (
        <div
          className="absolute inset-0 opacity-30 blur-3xl scale-110 bg-center bg-cover"
          style={{ backgroundImage: `url("${bgUrl}")` }}
          aria-hidden
        />
      )}

      {/* 좌우 네비게이션 (데스크톱) */}
      {onPrev && hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-colors"
          aria-label="이전 (←)"
          title="이전 (←)"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {onNext && hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-colors"
          aria-label="다음 (→)"
          title="다음 (→)"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* 닫기 버튼 (우상단 절대 위치) */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md border border-white/20"
        aria-label="닫기 (Esc)"
      >
        <X className="h-4 w-4" />
      </button>

      {/* 프레임 카드 */}
      <div
        className="relative z-0 w-full max-w-5xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 메인 미디어 영역 */}
        <div className="flex-1 min-h-0 flex items-center justify-center mb-4">
          {busy && (
            <div className="flex flex-col items-center gap-3 py-12 rounded-2xl bg-white/10 backdrop-blur-md px-10 border border-white/20">
              <Loader2 className="h-6 w-6 animate-spin text-white/80" />
              <p className="text-[13px] text-white/90">{MEDIA_STATUS_LABEL[item.status]}</p>
              {item.kind === 'video' && (
                <p className="text-[11px] text-white/60">동영상은 최대 3분까지 걸릴 수 있어요</p>
              )}
            </div>
          )}
          {isError && (
            <div className="flex flex-col items-center gap-2 py-12 max-w-md text-center rounded-2xl bg-white/10 backdrop-blur-md px-10 border border-white/20">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="text-[14px] text-white font-medium">생성에 실패했어요</p>
              <p className="text-[12px] text-white/70 leading-relaxed">
                {item.errorMessage || '알 수 없는 오류가 발생했어요.'}
              </p>
            </div>
          )}
          {!busy && !isError && item.kind === 'image' && mediaUrl && (
            <img
              src={mediaUrl}
              alt={item.prompt}
              className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
          )}
          {!busy && !isError && item.kind === 'video' && mediaUrl && (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="max-h-[70vh] max-w-full rounded-xl shadow-2xl"
            />
          )}
        </div>

        {/* 프레임 하단 메타·액션·프롬프트 */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
          {/* 메타 스트립 */}
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-200 dark:border-slate-800">
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                item.kind === 'image' ? 'bg-indigo-500 text-white' : 'bg-pink-500 text-white',
              )}
            >
              {item.kind === 'image' ? '🖼 이미지' : '🎬 동영상'}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              {relativeTime(item.createdAt)}
              {item.kind === 'video' && item.durationSec && ` · ${item.durationSec}초`}
              {' · '}{item.aspectRatio}
            </span>
            {item.model && (
              <span className="text-[10.5px] text-slate-400 ml-1">· {item.model}</span>
            )}

            <div className="flex-1" />

            {/* 우측 액션 */}
            {mediaUrl && !busy && !isError && (
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="다운로드"
                title="다운로드"
              >
                <Download className="h-3.5 w-3.5" /> 저장
              </button>
            )}
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] font-medium text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              aria-label="삭제"
              title="삭제"
            >
              <Trash2 className="h-3.5 w-3.5" /> 삭제
            </button>
          </div>

          {/* Remix/Variation/Image→Video 액션 바 */}
          {isReady && (onRemix || onVariation || onImageToVideo) && (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
              {onVariation && (
                <button
                  onClick={() => onVariation(item)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11.5px] font-medium text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
                  title="같은 프롬프트로 새로운 결과 만들기"
                >
                  <Shuffle className="h-3.5 w-3.5 text-indigo-500" /> 변형
                </button>
              )}
              {onRemix && (
                <button
                  onClick={() => onRemix(item)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11.5px] font-medium text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
                  title="프롬프트를 수정해서 새로 만들기"
                >
                  <Edit3 className="h-3.5 w-3.5 text-indigo-500" /> Remix
                </button>
              )}
              {onImageToVideo && item.kind === 'image' && (
                <button
                  onClick={() => onImageToVideo(item)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-pink-500 text-white px-2.5 py-1.5 text-[11.5px] font-medium hover:bg-pink-600 transition-colors"
                  title="이 이미지로 5초 영상 만들기"
                >
                  <Film className="h-3.5 w-3.5" /> 영상으로
                </button>
              )}
            </div>
          )}

          {/* 프롬프트 (인용구 스타일) */}
          <div className="px-5 py-4">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">프롬프트</p>
            <blockquote className="text-[14px] font-serif italic text-slate-800 dark:text-slate-100 leading-relaxed border-l-2 border-indigo-300 dark:border-indigo-600 pl-3">
              {item.prompt ? `"${item.prompt}"` : '(프롬프트 없음)'}
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}
