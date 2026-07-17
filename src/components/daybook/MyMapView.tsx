/**
 * 나의 지도 — 데일리로그의 발자취 섹션.
 *
 * 좌: 지도(핀). 우: 탭(가본 곳 · 먹은 곳 · 다녀온 여행) — 클릭하면 그 목록이 뜨고,
 * 항목을 누르면 지도가 그 장소/여행 범위로 포커스(핀을 좁혀 넘기면 지도가 자동 줌).
 * 모든 하루 기록(먹은 것·간 곳)의 장소가 여기 쌓인다. 호스트가 .travel-theme 로 감싼다.
 */
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useDaylogAll } from '@/hooks/useDaylog';
import { useTrips } from '@/hooks/useTravel';
import { TravelMap, type MapPin as TravelMapPin } from '@/components/travel/TravelMap';
import { escapeHtml } from '@/lib/travel/format';
import { DAY_ITEM_META, type DayItem } from '@/types/daylog';
import { tripStatus, todayKey } from '@/types/travel';

type Tab = 'places' | 'meals' | 'trips';

interface PlaceGroup { key: string; place: string; visits: DayItem[]; lastDate: string; mealOnly: boolean }

function buildPin(g: PlaceGroup): TravelMapPin {
  const rows = g.visits.slice(-5).map((v) => {
    const meta = DAY_ITEM_META[v.kind];
    return `<div style="margin-top:5px"><div style="font-size:10.5px;color:#8a8178">${escapeHtml(v.date)}</div><div style="font-size:12.5px">${meta.emoji} ${escapeHtml(v.text)}</div></div>`;
  }).join('');
  const more = g.visits.length > 5 ? `<div style="font-size:10.5px;color:#8a8178;margin-top:5px">외 ${g.visits.length - 5}건</div>` : '';
  return {
    id: g.place,
    place: g.place,
    color: g.mealOnly ? DAY_ITEM_META.meal.tint : 'hsl(183 58% 36%)',
    tooltip: g.place,
    popup: `<div style="min-width:170px;max-width:230px"><div style="font-weight:700;font-size:13.5px">${escapeHtml(g.place)}</div><div style="font-size:10.5px;color:#8a8178">기록 ${g.visits.length}번</div>${rows}${more}</div>`,
  };
}

/** 장소 이름별로 방문을 묶는다. */
function groupPlaces(items: DayItem[]): PlaceGroup[] {
  const map = new Map<string, PlaceGroup>();
  for (const i of items) {
    if (!i.place) continue;
    const key = i.place.trim().toLowerCase();
    const g = map.get(key);
    if (g) {
      g.visits.push(i);
      if (i.date > g.lastDate) g.lastDate = i.date;
      if (i.kind !== 'meal') g.mealOnly = false;
    } else {
      map.set(key, { key, place: i.place.trim(), visits: [i], lastDate: i.date, mealOnly: i.kind === 'meal' });
    }
  }
  return [...map.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

export default function MyMapView() {
  const items = useDaylogAll();
  const trips = useTrips();
  const [tab, setTab] = useState<Tab>('places');
  const [selPlace, setSelPlace] = useState<string | null>(null); // 포커스한 장소 key
  const [selTrip, setSelTrip] = useState<string | null>(null);   // 포커스한 여행 id

  const withPlace = useMemo(() => items.filter((i) => i.place), [items]);
  const allPlaces = useMemo(() => groupPlaces(withPlace), [withPlace]);
  const mealPlaces = useMemo(() => groupPlaces(withPlace.filter((i) => i.kind === 'meal')), [withPlace]);
  const today = todayKey();

  const listGroups = tab === 'meals' ? mealPlaces : allPlaces;

  /** 지도에 넘길 핀 — 선택(포커스)이 있으면 좁혀서 넘겨 자동 줌. */
  const pins = useMemo<TravelMapPin[]>(() => {
    if (tab === 'trips') {
      if (selTrip) {
        const t = trips.find((x) => x.id === selTrip);
        if (t) return groupPlaces(withPlace.filter((i) => i.date >= t.startDate && i.date <= t.endDate)).map(buildPin);
      }
      return allPlaces.map(buildPin);
    }
    const groups = tab === 'meals' ? mealPlaces : allPlaces;
    if (selPlace) return groups.filter((g) => g.key === selPlace).map(buildPin);
    return groups.map(buildPin);
  }, [tab, selPlace, selTrip, trips, withPlace, allPlaces, mealPlaces]);

  const pickTab = (t: Tab) => { setTab(t); setSelPlace(null); setSelTrip(null); };
  const fmtDate = (d: string) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`;
  const relDays = (endDate: string) => {
    const diff = Math.round((Date.parse(`${today}T00:00:00`) - Date.parse(`${endDate}T00:00:00`)) / 86400000);
    return diff <= 0 ? '' : diff === 1 ? '어제' : `${diff}일 전`;
  };

  const TAB_META: Array<{ id: Tab; label: string; count: number }> = [
    { id: 'places', label: '가본 곳', count: allPlaces.length },
    { id: 'meals', label: '먹은 곳', count: mealPlaces.length },
    { id: 'trips', label: '다녀온 여행', count: trips.length },
  ];

  return (
    <div className="flex flex-col gap-4 pb-8 lg:h-[calc(100dvh-150px)] lg:flex-row">
      {/* 좌 — 지도 */}
      <div className="min-w-0 flex-1">
        <TravelMap
          pins={pins}
          heightClass="h-[380px] lg:h-full"
          emptyText="하루 기록에 장소를 적으면, 먹은 곳·간 곳 전부가 이 지도에 쌓여요."
        />
      </div>

      {/* 우 — 탭 + 목록 */}
      <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-[hsl(var(--foreground)/0.1)] bg-[hsl(var(--surface-1))] lg:w-[340px]">
        {/* 탭 */}
        <div className="flex shrink-0 gap-1 border-b border-[hsl(var(--hairline))] p-2">
          {TAB_META.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pickTab(t.id)}
              className={cn(
                'flex flex-1 flex-col items-center rounded-xl px-1 py-2 transition-colors',
                tab === t.id ? 'bg-[hsl(var(--travel-teal))]/12' : 'hover:bg-[hsl(var(--surface-2))]',
              )}
            >
              <span className={cn('text-[19px] font-extrabold leading-none tabular-nums', tab === t.id ? 'text-[hsl(var(--travel-teal))]' : 'text-foreground/70')}>{t.count}</span>
              <span className={cn('mt-1 text-[11.5px] font-medium', tab === t.id ? 'text-[hsl(var(--travel-teal))]' : 'text-muted-foreground')}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {tab === 'trips' ? (
            trips.length === 0 ? (
              <p className="py-10 text-center text-[12.5px] text-muted-foreground">아직 다녀온 여행이 없어요.</p>
            ) : (
              <ul className="space-y-1">
                {trips.map((t) => {
                  const on = selTrip === t.id;
                  const st = tripStatus(t, today);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setSelTrip(on ? null : t.id)}
                        className={cn('w-full rounded-xl px-3 py-2.5 text-left transition-colors', on ? 'bg-[hsl(var(--travel-teal))]/12 ring-1 ring-[hsl(var(--travel-teal))]/30' : 'hover:bg-[hsl(var(--surface-2))]')}
                      >
                        <p className="truncate text-[13.5px] font-semibold text-foreground">{t.title || '제목 없는 여행'}</p>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {fmtDate(t.startDate)} ~ {fmtDate(t.endDate)}
                          {st === 'past' && relDays(t.endDate) ? ` · ${relDays(t.endDate)} 다녀옴` : st === 'ongoing' ? ' · 여행 중' : st === 'upcoming' ? ' · 예정' : ''}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : listGroups.length === 0 ? (
            <p className="py-10 text-center text-[12.5px] text-muted-foreground">{tab === 'meals' ? '먹은 곳 기록이 없어요.' : '가본 곳 기록이 없어요.'}</p>
          ) : (
            <ul className="space-y-1">
              {listGroups.map((g) => {
                const on = selPlace === g.key;
                return (
                  <li key={g.key}>
                    <button
                      type="button"
                      onClick={() => setSelPlace(on ? null : g.key)}
                      className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors', on ? 'bg-[hsl(var(--travel-teal))]/12 ring-1 ring-[hsl(var(--travel-teal))]/30' : 'hover:bg-[hsl(var(--surface-2))]')}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.mealOnly ? DAY_ITEM_META.meal.tint : 'hsl(183 58% 36%)' }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-foreground">{g.place}</span>
                        <span className="block text-[11px] text-muted-foreground">기록 {g.visits.length}번 · 최근 {fmtDate(g.lastDate)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {(selPlace || selTrip) && (
          <button
            type="button"
            onClick={() => { setSelPlace(null); setSelTrip(null); }}
            className="shrink-0 border-t border-[hsl(var(--hairline))] py-2 text-center text-[12px] font-medium text-[hsl(var(--travel-teal))] hover:bg-[hsl(var(--surface-2))]"
          >
            전체 지도 보기
          </button>
        )}
      </aside>
    </div>
  );
}
