/**
 * 섹션 헤더 — 카드/패널/사이드바 내부 소제목 통일.
 *
 * title + 보조 description + 오른쪽 action 슬롯.
 * size 'sm' (사이드바) / 'md' (페이지 섹션, 기본).
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  title: ReactNode;
  description?: ReactNode;
  /** 우측 액션 (예: 더보기 버튼, 토글). */
  action?: ReactNode;
  /** 좌측 아이콘. */
  icon?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function SectionHeader({ title, description, action, icon, size = 'md', className }: Props) {
  const isSm = size === 'sm';
  return (
    <div className={cn('flex items-start justify-between gap-3', isSm ? 'py-1.5' : 'py-3', className)}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
          <h3 className={cn('font-semibold text-foreground', isSm ? 'text-xs uppercase tracking-wide text-muted-foreground' : 'text-sm')}>
            {title}
          </h3>
        </div>
        {description && (
          <p className={cn('text-muted-foreground mt-0.5', isSm ? 'text-[11px]' : 'text-xs')}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
