/**
 * AI 어시스턴트 > 이미지·동영상 생성 — 루트 패널.
 * 3컬럼: 좌 히스토리 | 중앙 갤러리 + 하단 입력바 | 우 옵션
 *
 * VoiceAnalysisPanel과 동일한 패턴 사용:
 * - notify (토스트 래퍼)
 * - confirmDialog (삭제 확인)
 * - Soft delete + Undo (5초)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { notify } from '@/lib/notify';
import { confirmDialog } from '@/lib/confirmDialog';
import { cn } from '@/lib/utils';
import {
  listMediaItems,
  getMonthlyMediaUsage,
  deleteMediaItem,
  canGenerateImages,
  canGenerateVideoSeconds,
} from '@/lib/mediaGenStore';
import { generateImages, generateVideo } from '@/lib/mediaGenPipeline';
import {
  MONTHLY_IMAGE_LIMIT,
  MONTHLY_VIDEO_SEC_LIMIT,
  VIDEO_CLIP_LENGTH_SEC,
  type MediaItem,
  type MediaKind,
  type MediaAspectRatio,
  type ImageStylePreset,
} from '@/types/mediaGen';
import { findMotionPreset } from '@/lib/videoMotionPresets';
import { MediaGalleryGrid } from './MediaGalleryGrid';
import { MediaInputBar, type MediaInputBarHandle } from './MediaInputBar';
import { MediaLightbox } from './MediaLightbox';
import { MediaSampleGallery } from './MediaSampleGallery';
import { MediaHistorySidebar } from './MediaHistorySidebar';
import { MediaOptionsSidebar } from './MediaOptionsSidebar';
import type { MediaSample } from './mediaSamples';

type FilterKind = 'all' | 'image' | 'video';

interface Props {
  onClose: () => void;
}

/** 시간대별 Hero 인사말 — 첫 방문 감정 hook (Midjourney/Ideogram 패턴 변형) */
function greeting(): { title: string; subtitle: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return { title: '오늘은 뭘 만들어볼까요?', subtitle: '아침의 가장 맑은 영감' };
  if (h >= 11 && h < 17) return { title: '점심시간의 창의력 ☕', subtitle: '10분만 투자해 작품 하나' };
  if (h >= 17 && h < 22) return { title: '저녁 노을빛 아이디어', subtitle: '하루를 마무리하는 한 장' };
  return { title: '조용한 밤의 영감 🌙', subtitle: '아무도 없을 때 가장 자유로운 상상' };
}

export function MediaGenPanel({ onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.id;

  // 데이터
  const [items, setItems] = useState<MediaItem[]>([]);
  const [usage, setUsage] = useState({ imagesUsed: 0, videoSecondsUsed: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKind>('all');
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  // 생성 옵션
  const [kind, setKind] = useState<MediaKind>('image');
  const [style, setStyle] = useState<ImageStylePreset>('none');
  const [aspectRatio, setAspectRatio] = useState<MediaAspectRatio>('1:1');
  const [count, setCount] = useState<number>(4);
  const [motionPresetId, setMotionPresetId] = useState<string>('static');
  const [startFrame, setStartFrame] = useState<{ url: string; label?: string } | null>(null);
  const [endFrame, setEndFrame] = useState<{ url: string; label?: string } | null>(null);

  // 사이드바 접힘
  const [historyCollapsed, setHistoryCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('mediaGen_historyCollapsed') === '1';
  });
  const [optionsCollapsed, setOptionsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('mediaGen_optionsCollapsed') === '1';
  });
  useEffect(() => {
    localStorage.setItem('mediaGen_historyCollapsed', historyCollapsed ? '1' : '0');
  }, [historyCollapsed]);
  useEffect(() => {
    localStorage.setItem('mediaGen_optionsCollapsed', optionsCollapsed ? '1' : '0');
  }, [optionsCollapsed]);

  const inputBarRef = useRef<MediaInputBarHandle>(null);
  const [hero] = useState(greeting); // 세션 내 고정

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const [list, u] = await Promise.all([listMediaItems(userId), getMonthlyMediaUsage(userId)]);
      setItems(list);
      setUsage({ imagesUsed: u.imagesUsed, videoSecondsUsed: u.videoSecondsUsed });
    } catch (err) {
      notify.error('불러오지 못했어요', {
        description: err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();
  }, [userId, refresh]);

  const handleUpsert = useCallback((rec: MediaItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((r) => r.id === rec.id);
      if (idx === -1) return [rec, ...prev];
      const next = [...prev];
      next[idx] = rec;
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((i) => i.kind === filter);
  }, [items, filter]);

  const lightboxIdx = useMemo(
    () => (lightboxId ? filtered.findIndex((i) => i.id === lightboxId) : -1),
    [filtered, lightboxId],
  );
  const lightboxItem = lightboxIdx >= 0 ? filtered[lightboxIdx] : null;

  const recentPrompts = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of items) {
      if (item.prompt && !seen.has(item.prompt)) {
        seen.add(item.prompt);
        out.push(item.prompt);
        if (out.length >= 20) break;
      }
    }
    return out;
  }, [items]);

  const imagesRemaining = Math.max(0, MONTHLY_IMAGE_LIMIT - usage.imagesUsed);
  const videoRemaining = Math.max(0, MONTHLY_VIDEO_SEC_LIMIT - usage.videoSecondsUsed);

  const runGenerate = useCallback(
    async ({ prompt }: { prompt: string }) => {
      if (!userId) return;
      try {
        if (kind === 'image') {
          const check = await canGenerateImages(userId, count);
          if (!check.ok) {
            notify.warning('이미지 한도 부족', {
              description: `이번 달 남은 장수: ${check.remaining}장 · 요청: ${count}장`,
            });
            return;
          }
          await generateImages({
            userId,
            prompt,
            style,
            aspectRatio,
            count,
            onProgress: handleUpsert,
          });
        } else {
          const check = await canGenerateVideoSeconds(userId, VIDEO_CLIP_LENGTH_SEC);
          if (!check.ok) {
            notify.warning('동영상 한도 부족', {
              description: `이번 달 남은 시간: ${check.remaining}초 · 필요: ${VIDEO_CLIP_LENGTH_SEC}초`,
            });
            return;
          }
          const motion = findMotionPreset(motionPresetId);
          const fullPrompt = motion && motion.id !== 'static' ? `${prompt}${motion.promptSuffix}` : prompt;
          await generateVideo({
            userId,
            prompt: fullPrompt,
            aspectRatio,
            sourceImageUrl: startFrame?.url,
            endImageUrl: endFrame?.url,
            onProgress: handleUpsert,
          });
          setStartFrame(null);
          setEndFrame(null);
        }
        await refresh();
      } catch (err) {
        notify.error('생성 실패', {
          description: err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.',
        });
        await refresh();
      }
    },
    [userId, kind, style, aspectRatio, count, motionPresetId, startFrame, endFrame, handleUpsert, refresh],
  );

  // Soft delete + 5초 Undo (VoiceAnalysisPanel 패턴과 동일)
  const pendingDeleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleDelete = useCallback(
    async (id: string) => {
      const target = items.find((i) => i.id === id);
      const ok = await confirmDialog({
        title: '이 작품을 삭제할까요?',
        description: target?.prompt
          ? `"${target.prompt.slice(0, 40)}${target.prompt.length > 40 ? '…' : ''}" — 5초 내에 되돌릴 수 있어요.`
          : '5초 내에 되돌릴 수 있어요.',
        confirmLabel: '삭제',
        tone: 'danger',
      });
      if (!ok) return;

      // 낙관적 UI
      setItems((prev) => prev.filter((r) => r.id !== id));
      if (lightboxId === id) setLightboxId(null);

      const timer = setTimeout(async () => {
        pendingDeleteTimers.current.delete(id);
        try {
          await deleteMediaItem(id);
        } catch (err) {
          notify.error('삭제 실패', {
            description: err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.',
          });
          if (target) setItems((prev) => [target, ...prev]);
        }
      }, 5000);
      pendingDeleteTimers.current.set(id, timer);

      notify.success('작품이 삭제됐어요', {
        duration: 5000,
        action: {
          label: '되돌리기',
          onClick: () => {
            const t = pendingDeleteTimers.current.get(id);
            if (t) {
              clearTimeout(t);
              pendingDeleteTimers.current.delete(id);
            }
            if (target) {
              setItems((prev) => [target, ...prev]);
              setLightboxId(id);
            }
          },
        },
      });
    },
    [items, lightboxId],
  );

  useEffect(() => {
    return () => {
      const timers = pendingDeleteTimers.current;
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const handleSamplePick = useCallback((sample: MediaSample) => {
    setKind(sample.kind);
    if (sample.style) setStyle(sample.style);
    setAspectRatio(sample.aspectRatio);
    inputBarRef.current?.prefillPrompt(sample.prompt);
  }, []);

  const handleRemix = useCallback((item: MediaItem) => {
    setLightboxId(null);
    setKind(item.kind);
    if (item.style) setStyle(item.style as ImageStylePreset);
    setAspectRatio(item.aspectRatio);
    inputBarRef.current?.prefillPrompt(item.prompt);
  }, []);

  const handleVariation = useCallback(
    async (item: MediaItem) => {
      if (!userId) return;
      setLightboxId(null);
      try {
        if (item.kind === 'image') {
          await generateImages({
            userId,
            prompt: item.prompt,
            style: (item.style as ImageStylePreset | undefined) ?? 'none',
            aspectRatio: item.aspectRatio,
            count: 1,
            onProgress: handleUpsert,
          });
        } else {
          await generateVideo({
            userId,
            prompt: item.prompt,
            aspectRatio: item.aspectRatio,
            onProgress: handleUpsert,
          });
        }
        await refresh();
      } catch (err) {
        notify.error('변형 실패', {
          description: err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.',
        });
      }
    },
    [userId, handleUpsert, refresh],
  );

  const setFrameFromImage = useCallback(async (item: MediaItem, frame: 'first' | 'last') => {
    if (item.kind !== 'image') return;

    let url = item.resultUrl || '';
    if (!url && item.blobRef) {
      try {
        const { getMediaBlob } = await import('@/lib/mediaGenStore');
        const blob = await getMediaBlob(item.blobRef);
        if (blob) {
          url = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
        }
      } catch {
        /* ignore */
      }
    }
    if (!url) {
      notify.error('이미지를 불러오지 못했어요', {
        description: '원본 이미지를 찾을 수 없어 영상 변환이 어렵습니다.',
      });
      return;
    }

    const label = item.prompt.slice(0, 30) || '선택된 이미지';
    if (frame === 'first') setStartFrame({ url, label });
    else setEndFrame({ url, label });

    setKind('video');
    setLightboxId(null);

    notify.info(frame === 'first' ? '첫 프레임 설정됨' : '끝 프레임 설정됨', {
      description: '이제 원하는 움직임을 프롬프트에 적고 [생성]을 눌러주세요.',
    });

    setTimeout(() => inputBarRef.current?.focus(), 100);
  }, []);

  const handleImageToVideoFromLightbox = useCallback(
    (item: MediaItem) => setFrameFromImage(item, 'first'),
    [setFrameFromImage],
  );

  const handleImageToVideoFromGallery = useCallback(
    (item: MediaItem, frame: 'first' | 'last') => setFrameFromImage(item, frame),
    [setFrameFromImage],
  );

  if (!userId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-[13px] text-slate-500">로그인이 필요해요.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-950">
      {/* 헤더 — 단일 라인 */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-3 shrink-0">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          aria-label="어시스턴트로 돌아가기"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 어시스턴트
        </button>
        <span className="text-slate-300">/</span>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base">🎨</span>
          <h1 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
            이미지·동영상 생성
          </h1>
          <span className="text-[11px] text-slate-400 tabular-nums">{items.length}개</span>
        </div>
        <div className="flex-1" />

        {/* 필터 */}
        <div className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5">
          {(['all', 'image', 'video'] as FilterKind[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2.5 py-1 text-[11px] font-medium rounded transition-colors',
                filter === f
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
              )}
            >
              {f === 'all' ? '전체' : f === 'image' ? '🖼 이미지' : '🎬 동영상'}
            </button>
          ))}
        </div>

        {/* 사용량 — 단순 텍스트 */}
        <div className="flex items-center gap-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-1">
          <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
            <span>🖼</span>
            <span>{usage.imagesUsed}/{MONTHLY_IMAGE_LIMIT}</span>
          </div>
          <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
            <span>🎬</span>
            <span>{usage.videoSecondsUsed}/{MONTHLY_VIDEO_SEC_LIMIT}초</span>
          </div>
        </div>
      </div>

      {/* ── 본문: 3컬럼 ── */}
      <div className="flex-1 min-h-0 flex">
        <MediaHistorySidebar
          items={items}
          selectedId={lightboxId}
          onSelect={(id) => setLightboxId(id)}
          collapsed={historyCollapsed}
          onToggleCollapsed={() => setHistoryCollapsed((v) => !v)}
        />

        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center p-16">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="max-w-3xl mx-auto py-4">
                {/* Hero 문구 */}
                <div className="mb-6">
                  <h2 className="text-[22px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {hero.title}
                  </h2>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                    {hero.subtitle}
                  </p>
                </div>
                <MediaSampleGallery filter={filter} onPick={handleSamplePick} />
              </div>
            ) : (
              <MediaGalleryGrid
                items={filtered}
                onSelect={(id) => setLightboxId(id)}
                onImageToVideo={handleImageToVideoFromGallery}
              />
            )}
          </div>

          <MediaInputBar
            ref={inputBarRef}
            kind={kind}
            style={style}
            aspectRatio={aspectRatio}
            count={count}
            imagesRemaining={imagesRemaining}
            videoRemaining={videoRemaining}
            onSubmit={runGenerate}
            recentPrompts={recentPrompts}
          />
        </main>

        <MediaOptionsSidebar
          kind={kind}
          setKind={setKind}
          style={style}
          setStyle={setStyle}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          count={count}
          setCount={setCount}
          motionPresetId={motionPresetId}
          setMotionPresetId={setMotionPresetId}
          startFrame={startFrame}
          endFrame={endFrame}
          onClearStartFrame={() => setStartFrame(null)}
          onClearEndFrame={() => setEndFrame(null)}
          imagesRemaining={imagesRemaining}
          videoRemaining={videoRemaining}
          collapsed={optionsCollapsed}
          onToggleCollapsed={() => setOptionsCollapsed((v) => !v)}
        />
      </div>

      {lightboxItem && (
        <MediaLightbox
          item={lightboxItem}
          onClose={() => setLightboxId(null)}
          onDelete={() => handleDelete(lightboxItem.id)}
          onPrev={() => {
            if (lightboxIdx > 0) setLightboxId(filtered[lightboxIdx - 1].id);
          }}
          onNext={() => {
            if (lightboxIdx >= 0 && lightboxIdx < filtered.length - 1) {
              setLightboxId(filtered[lightboxIdx + 1].id);
            }
          }}
          hasPrev={lightboxIdx > 0}
          hasNext={lightboxIdx >= 0 && lightboxIdx < filtered.length - 1}
          onRemix={handleRemix}
          onVariation={handleVariation}
          onImageToVideo={handleImageToVideoFromLightbox}
        />
      )}
    </div>
  );
}

