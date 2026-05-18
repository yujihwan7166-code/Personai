/**
 * 로딩 셔머 (skeleton) — 공용.
 *
 * AI 응답 대기, 데이터 로드 중 등 어디든 1행 placeholder 로 사용.
 * tailwind.config.ts 에 이미 'shimmer' keyframe 등록돼있어 별도 CSS 불필요.
 *
 * 사용:
 *   <LoadingShimmer />                      // 1행 (높이 12px)
 *   <LoadingShimmer lines={3} />            // 3행
 *   <LoadingShimmer lines={3} width="60%" /> // 좁게
 */

import { cn } from '@/lib/utils';

interface Props {
  /** 표시할 행 수 (기본 1). */
  lines?: number;
  /** CSS width (기본 100%). */
  width?: string;
  /** CSS height (기본 12px). */
  height?: string;
  className?: string;
}

export function LoadingShimmer({ lines = 1, width = '100%', height = '12px', className }: Props) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)} role="status" aria-label="로딩 중">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="rounded animate-shimmer bg-[length:200%_100%]"
          style={{
            width: i === lines - 1 && lines > 1 ? '60%' : width,
            height,
            backgroundImage:
              'linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted-foreground)/0.15) 50%, hsl(var(--muted)) 100%)',
          }}
        />
      ))}
    </div>
  );
}
