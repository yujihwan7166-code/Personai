/**
 * KeyValueList — 라벨-값 쌍 정의 리스트 (dl/dt/dd).
 *
 * 메타데이터 패널 / 상세 정보 / 설정 요약.
 */

import { cn } from '@/lib/utils';

interface Item {
  label: string;
  value: React.ReactNode;
}

interface Props {
  items: Item[];
  className?: string;
  /** 라벨 폭 (Tailwind class). default w-24 */
  labelWidth?: string;
}

export function KeyValueList({ items, className, labelWidth = 'w-24' }: Props) {
  return (
    <dl className={cn('text-xs space-y-1', className)}>
      {items.map((it, i) => (
        <div key={i} className="flex items-baseline gap-2">
          <dt className={cn('shrink-0 text-muted-foreground', labelWidth)}>{it.label}</dt>
          <dd className="flex-1 text-foreground break-words">{it.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
