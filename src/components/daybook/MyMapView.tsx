/**
 * 나의 지도 — 데일리로그의 발자취 섹션.
 *
 * 모든 하루 기록(먹은 것·간 곳)의 장소를 한 지도에 핀으로. 여행이든 일상이든
 * 장소를 적기만 하면 여기에 쌓인다. 필터(전체/먹은 곳/간 곳) + 스코어보드.
 * 호스트가 .travel-theme 래퍼로 감싸 지도 토큰을 공급한다.
 */
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useDaylogAll } from '@/hooks/useDaylog';
import { useTrips } from '@/hooks/useTravel';
import { TravelMap, type MapPin as TravelMapPin } from '@/components/travel/TravelMap';
import { escapeHtml } from '@/lib/travel/format';
import { DAY_ITEM_META, type DayItem } from '@/types/daylog';

type Filter = 'all' | 'meal' | 'place';

export default function MyMapView() {
  const items = useDaylogAll();
  const trips = useTrips();
  const [filter, setFilter] = useState<Filter>('all');

  const withPlace = useMemo(() => items.filter((i) => i.place), [items]);

  const stats = useMemo(() => {
    const all = new Set(withPlace.map((i) => i.place!.toLowerCase()));
    const eats = new Set(withPlace.filter((i) => i.kind === 'meal').map((i) => i.place!.toLowerCase()));
    return { places: all.size, eats: eats.size, trips: trips.length };
  }, [withPlace, trips]);

  const pins = useMemo<TravelMapPin[]>(() => {
    const filtered = withPlace.filter((i) =>
      filter === 'all' ? true : filter === 'meal' ? i.kind === 'meal' : i.kind !== 'meal',
    );
    const byPlace = new Map<string, { place: string; visits: DayItem[] }>();
    for (const i of filtered) {
      const key = i.place!.trim().toLowerCase();
      const g = byPlace.get(key);
      if (g) g.visits.push(i);
      else byPlace.set(key, { place: i.place!.trim(), visits: [i] });
    }
    return [...byPlace.values()].map((g) => {
      const mealOnly = g.visits.every((v) => v.kind === 'meal');
      const rows = g.visits.slice(-5).map((v) => {
        const meta = DAY_ITEM_META[v.kind];
        return `<div style="margin-top:5px">
          <div style="font-size:10.5px;color:#8a8178">${escapeHtml(v.date)}</div>
          <div style="font-size:12.5px">${meta.emoji} ${escapeHtml(v.text)}</div>
        </div>`;
      }).join('');
      const more = g.visits.length > 5 ? `<div style="font-size:10.5px;color:#8a8178;margin-top:5px">외 ${g.visits.length - 5}건</div>` : '';
      return {
        id: g.place,
        place: g.place,
        color: mealOnly ? DAY_ITEM_META.meal.tint : 'hsl(183 58% 36%)',
        tooltip: g.place,
        popup: `<div style="min-width:170px;max-width:230px">
          <div style="font-weight:700;font-size:13.5px">${escapeHtml(g.place)}</div>
          <div style="font-size:10.5px;color:#8a8178">기록 ${g.visits.length}번</div>
          ${rows}${more}
        </div>`,
      };
    });
  }, [withPlace, filter]);

  return (
    <div className="pb-8">
      {/* 스코어보드 */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {([
          ['가본 곳', stats.places, '곳'],
          ['그중 먹은 곳', stats.eats, '곳'],
          ['다녀온 여행', stats.trips, '번'],
        ] as const).map(([label, value, unit]) => (
          <div key={label} className="rounded-2xl border border-[hsl(var(--foreground)/0.1)] bg-[hsl(var(--surface-1))] px-4 py-3.5 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.14)]">
            <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-[24px] font-extrabold leading-none tabular-nums text-[hsl(var(--travel-teal))]">
              {value}<span className="ml-0.5 text-[13px] font-semibold text-muted-foreground">{unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="mb-3 flex items-center gap-1.5">
        {([['all', '전체'], ['meal', '🍚 먹은 곳'], ['place', '📍 간 곳']] as [Filter, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
              filter === id
                ? 'border-[hsl(var(--travel-teal))]/45 bg-[hsl(var(--travel-teal))]/10 font-bold text-[hsl(var(--travel-teal))]'
                : 'border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <TravelMap
        pins={pins}
        heightClass="h-[460px] sm:h-[520px]"
        emptyText="하루 기록에 장소를 적으면, 먹은 곳·간 곳 전부가 이 지도에 쌓여요."
      />
    </div>
  );
}
