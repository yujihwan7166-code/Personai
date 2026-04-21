import { cn } from "@/lib/utils";

/**
 * 공용 Skeleton — 모든 로딩 플레이스홀더의 기본.
 * 토큰 기반 색(surface-2) + shimmer.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[hsl(var(--surface-2))]",
        className,
      )}
      aria-hidden
      {...props}
    />
  );
}

/** 텍스트 라인 여러 개. */
function SkeletonLines({ count = 3, widths }: { count?: number; widths?: string[] }) {
  const defaultWidths = ['100%', '92%', '88%', '75%', '90%', '60%'];
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: widths?.[i] ?? defaultWidths[i % defaultWidths.length] }}
        />
      ))}
    </div>
  );
}

/** 카드 썸네일 + 제목 + 설명. */
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-3">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="mt-3 h-3.5 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}

export { Skeleton, SkeletonLines, SkeletonCard };
