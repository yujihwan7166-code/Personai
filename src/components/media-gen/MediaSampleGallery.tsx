import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Wand2 } from 'lucide-react';
import { MEDIA_SAMPLES, type MediaSample } from './mediaSamples';

interface Props {
  filter: 'all' | 'image' | 'video';
  onPick: (sample: MediaSample) => void;
}

const CATEGORIES = ['전체', '포트레이트', '풍경', '제품', '일러스트', '로고', '동영상'] as const;

/**
 * 빈 갤러리 상태 전용 — 카테고리 필터 + 프롬프트 템플릿 카드.
 * MediaGenPanel이 상단에 Hero 문구를 별도로 렌더하므로 여기선 "카테고리 + 카드"만.
 */
export function MediaSampleGallery({ filter, onPick }: Props) {
  const [activeCat, setActiveCat] = useState<(typeof CATEGORIES)[number]>('전체');

  const samples = MEDIA_SAMPLES
    .filter((s) => filter === 'all' || s.kind === filter)
    .filter((s) => activeCat === '전체' || s.category === activeCat);

  return (
    <div>
      {/* 보조 타이틀 */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-3.5 w-3.5 text-indigo-500" strokeWidth={1.75} />
        <h3 className="text-[12.5px] font-bold text-slate-800 dark:text-slate-200">이렇게 시작해보세요</h3>
        <span className="text-[11px] text-slate-400">카드를 누르면 프롬프트가 채워져요</span>
      </div>

      {/* 카테고리 필터 pill */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-0.5">
        {CATEGORIES.map((cat) => {
          // 필터에 해당하지 않는 카테고리 자동 제외
          if (filter === 'video' && cat !== '전체' && cat !== '동영상') return null;
          if (filter === 'image' && cat === '동영상') return null;

          const active = activeCat === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                active
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500',
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 샘플 카드 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {samples.map((sample) => {
          const aspectClass =
            sample.aspectRatio === '16:9'
              ? 'aspect-video'
              : sample.aspectRatio === '9:16'
              ? 'aspect-[9/16]'
              : 'aspect-square';

          return (
            <button
              key={sample.id}
              onClick={() => onPick(sample)}
              className={cn(
                'group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 text-left transition-all hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5',
                'bg-gradient-to-br',
                sample.gradient,
                aspectClass,
              )}
              aria-label={`${sample.title} — ${sample.prompt}`}
            >
              {/* 모드 + 카테고리 뱃지 */}
              <div className="absolute left-2 top-2 flex items-center gap-1 z-10">
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm',
                    sample.kind === 'image' ? 'bg-indigo-500/90 text-white' : 'bg-pink-500/90 text-white',
                  )}
                >
                  {sample.kind === 'image' ? '🖼' : '🎬'}
                </span>
                <span className="rounded-md bg-white/75 dark:bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200 backdrop-blur-sm">
                  {sample.category}
                </span>
              </div>

              {/* 대형 이모지 중앙 */}
              <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-60 group-hover:scale-110 transition-transform duration-300">
                {sample.emoji}
              </div>

              {/* 호버 시 "프롬프트 채우기" 힌트 */}
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="inline-flex items-center gap-1 rounded-md bg-white/90 dark:bg-slate-900/90 px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-sm">
                  <Wand2 className="h-2.5 w-2.5" /> 쓰기
                </span>
              </div>

              {/* 하단 제목·프롬프트 */}
              <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                <p className="text-[12px] font-semibold text-white leading-tight">{sample.title}</p>
                <p className="text-[10px] text-white/80 line-clamp-1 mt-0.5">{sample.prompt.slice(0, 40)}…</p>
              </div>
            </button>
          );
        })}
      </div>

      {samples.length === 0 && (
        <p className="text-center text-[11.5px] text-slate-400 py-8">
          이 카테고리의 샘플이 없어요. [전체]를 눌러주세요.
        </p>
      )}

      <p className="mt-5 text-center text-[11px] text-slate-400">
        직접 쓰고 싶다면 아래 입력창에 바로 적어주세요
      </p>
    </div>
  );
}
