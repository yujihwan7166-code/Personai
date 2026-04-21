/**
 * 공용 EmptyState 컴포넌트.
 * 각 섹션의 "결과 없음 / 시작 전 / 데이터 없음" 화면을 하나의 패턴으로 통일.
 *
 * 사용:
 *   <EmptyState icon={<FileText/>} title="아직 노트가 없어요"
 *     description="첫 소스를 추가해 시작하세요"
 *     action={<Button>파일 업로드</Button>} />
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** 'default' = 박스 여백 있음, 'compact' = 작은 플레이스홀더용 */
  size?: 'default' | 'compact';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'default',
  className,
}: EmptyStateProps) {
  const pad = size === 'compact' ? 'py-6 px-4' : 'py-12 px-6';
  const iconBox = size === 'compact' ? 'h-9 w-9 mb-2' : 'h-14 w-14 mb-4';
  const titleCls = size === 'compact' ? 'text-[13px]' : 'text-[15px]';
  const descCls = size === 'compact' ? 'text-[11.5px] mt-1' : 'text-[13px] mt-1.5';

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', pad, className)}>
      {icon && (
        <div className={cn(
          'flex items-center justify-center rounded-2xl',
          'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]',
          iconBox,
        )}>
          {icon}
        </div>
      )}
      <h3 className={cn('font-semibold text-[hsl(var(--foreground))]', titleCls)}>
        {title}
      </h3>
      {description && (
        <p className={cn('max-w-sm text-[hsl(var(--muted-foreground))] leading-relaxed', descCls)}>
          {description}
        </p>
      )}
      {action && (
        <div className={size === 'compact' ? 'mt-3' : 'mt-5'}>
          {action}
        </div>
      )}
    </div>
  );
}
