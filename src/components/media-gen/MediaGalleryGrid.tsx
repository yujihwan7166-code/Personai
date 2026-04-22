import { useMemo } from 'react';
import { groupByTime, type MediaItem } from '@/types/mediaGen';
import { MediaItemCard } from './MediaItemCard';

interface Props {
  items: MediaItem[];
  onSelect: (id: string) => void;
  onImageToVideo?: (item: MediaItem, frame: 'first' | 'last') => void;
}

/**
 * 시간 그룹핑 (오늘·어제·이번 주·지난 주·월별) + Masonry.
 */
export function MediaGalleryGrid({ items, onSelect, onImageToVideo }: Props) {
  const groups = useMemo(() => groupByTime(items), [items]);

  return (
    <div>
      {groups.map((g) => (
        <section key={g.key} className="mb-6 last:mb-0">
          <h3 className="sticky top-0 z-10 -mx-6 px-6 py-1.5 bg-white/85 dark:bg-slate-950/85 backdrop-blur-sm border-b border-slate-100 dark:border-slate-900 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              {g.label}
            </span>
            <span className="ml-1.5 text-[10.5px] text-slate-400 tabular-nums font-medium">
              · {g.items.length}개
            </span>
          </h3>
          <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3 [column-fill:_balance]">
            {g.items.map((item) => (
              <div key={item.id} className="mb-3 break-inside-avoid">
                <MediaItemCard
                  item={item}
                  onClick={() => onSelect(item.id)}
                  onImageToVideo={onImageToVideo ? (frame) => onImageToVideo(item, frame) : undefined}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
