/**
 * 사이드 컬럼 섹션 — 헤더(라벨 + count + 액션) + 자식 리스트.
 * 인박스·주간뷰 등에서 재사용.
 */
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PlannerSectionProps {
  label: string;
  /** 헤더 우측 카운트 또는 보조 텍스트. */
  count?: number | string;
  /** 헤더 우측 액션 영역 (버튼 등). */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export const PlannerSection = ({ label, count, action, className, children }: PlannerSectionProps) => (
  <section className={cn('flex flex-col min-h-0', className)}>
    <header className="flex items-baseline gap-2.5 px-0.5 pb-2.5 mb-2 border-b border-foreground/20">
      <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-foreground font-semibold">
        {label}
      </span>
      {count !== undefined && (
        <span className="text-[11px] text-muted-foreground tabular-nums font-mono">
          {count}
        </span>
      )}
      {action && <span className="ml-auto">{action}</span>}
    </header>
    <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
  </section>
);
