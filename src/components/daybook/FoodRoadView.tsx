/**
 * 푸드 로드 — 먹은 것 전용 렌즈.
 *
 * 하루 기록 중 kind==='meal' 만 모아 먹부림 앨범(사진 격자) + 자주 간 맛집 랭킹 + 소소한 지표.
 * 새 입력은 없다 — 기록은 하루 페이지에서, 여기는 보는 곳. 크림 토큰 사용 (데일리로그 방 내부).
 */
import { useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useDaylogAll } from '@/hooks/useDaylog';
import { MEAL_SLOT_LABEL, MEAL_SLOT_ORDER, type DayItem } from '@/types/daylog';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export default function FoodRoadView({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const items = useDaylogAll();
  const meals = useMemo(() => items.filter((i) => i.kind === 'meal'), [items]);
  const photos = useMemo(() => meals.filter((m) => m.photo).slice().reverse(), [meals]); // 최신 먼저
  const [days, setDays] = useState(14); // 한 번에 보여줄 날 수 — 길이 길어지면 눌러서 더 거슬러 간다

  /** 날짜별로 묶은 '길' — 최신 날이 위, 하루 안에서는 아침→간식 순. */
  const allRoad = useMemo(() => {
    const byDate = new Map<string, DayItem[]>();
    for (const m of meals) {
      const list = byDate.get(m.date);
      if (list) list.push(m); else byDate.set(m.date, [m]);
    }
    return [...byDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, list]) => [
        date,
        [...list].sort((x, y) => MEAL_SLOT_ORDER.indexOf(x.mealSlot ?? 'snack') - MEAL_SLOT_ORDER.indexOf(y.mealSlot ?? 'snack')),
      ] as [string, DayItem[]]);
  }, [meals]);
  const road = allRoad.slice(0, days);
  const hasMore = allRoad.length > days;

  const stats = useMemo(() => {
    const ym = new Date();
    const prefix = `${ym.getFullYear()}-${String(ym.getMonth() + 1).padStart(2, '0')}`;
    const monthMeals = meals.filter((m) => m.date.startsWith(prefix)).length;
    const eatPlaces = new Set(meals.filter((m) => m.place).map((m) => m.place!.toLowerCase()));
    return { monthMeals, photos: photos.length, places: eatPlaces.size };
  }, [meals, photos.length]);

  /** 자주 간 맛집 — 장소 붙은 끼니를 장소별로 세서 상위 5. */
  const ranking = useMemo(() => {
    const byPlace = new Map<string, { place: string; count: number; last: DayItem }>();
    for (const m of meals) {
      if (!m.place) continue;
      const key = m.place.trim().toLowerCase();
      const g = byPlace.get(key);
      if (g) {
        g.count += 1;
        g.last = m;
      } else {
        byPlace.set(key, { place: m.place.trim(), count: 1, last: m });
      }
    }
    return [...byPlace.values()].sort((a, b) => b.count - a.count || b.last.date.localeCompare(a.last.date)).slice(0, 5);
  }, [meals]);

  if (meals.length === 0) {
    return (
      <div className="rounded-[26px] border border-dashed border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))]/50 py-16 text-center">
        <p className="text-[15px]">🍚</p>
        <p className="mt-2 text-[13.5px] text-[hsl(var(--cream-muted))]">아직 먹은 것 기록이 없어요.</p>
        <p className="mt-1 text-[12px] text-[hsl(var(--cream-muted))]/70">하루 페이지의 "오늘의 기록"에서 먹은 것을 남기면 여기 앨범으로 쌓여요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-8">
      {/* 한 줄 요약 — 큰 지표 타일 3개는 이 방이 피하는 모양이고,
          '이번 달 12끼'는 카드 세 장이 아니라 한 줄이면 충분하다 */}
      <p className="px-1 text-[12.5px] text-[hsl(var(--cream-muted))]">
        이번 달 <b className="font-bold text-[hsl(var(--cream-ink))]">{stats.monthMeals}</b>끼
        {stats.places > 0 && <> · 먹은 곳 <b className="font-bold text-[hsl(var(--cream-ink))]">{stats.places}</b>곳</>}
        {stats.photos > 0 && <> · 사진 <b className="font-bold text-[hsl(var(--cream-ink))]">{stats.photos}</b>장</>}
      </p>

      {/* 자주 간 곳 — 왼쪽 끝 숫자 / 가운데 빈 여백 / 오른쪽 끝 횟수 로 늘어지던 막대를
          정보가 붙어 있는 작은 카드로. 가로로 잡아늘리지 않는다 */}
      {ranking.length > 0 && (
        <section>
          <h3 className="mb-2.5 px-1 text-[14px] font-bold text-[hsl(var(--cream-ink))]/85">자주 간 곳</h3>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {ranking.map((r) => (
              <button
                key={r.place}
                type="button"
                onClick={() => onOpenDay(r.last.date)}
                className="group flex items-center gap-2.5 overflow-hidden rounded-2xl border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-2 text-left transition-colors hover:border-[hsl(var(--cream-accent))]/40"
              >
                {r.last.photo ? (
                  <img src={r.last.photo} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--cream-accent))]/10 text-[16px]">🍚</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <span className="min-w-0 truncate text-[13px] font-bold text-[hsl(var(--cream-ink))]">{r.place}</span>
                    <span className="shrink-0 text-[11px] font-bold tabular-nums text-[hsl(var(--cream-accent))]">{r.count}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-[hsl(var(--cream-muted))]">{r.last.text}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 길 — 날짜를 따라 걷는다. '푸드 로드'인데 정작 길이 없고 사진 격자만 있었다 */}
      <section>
        <h3 className="mb-3 px-1 text-[14px] font-bold text-[hsl(var(--cream-ink))]/85">먹어온 길</h3>
        <ol className="relative space-y-5 pl-[26px]">
          {/* 세로 길 */}
          <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-px bg-[hsl(var(--cream-line))]" />
          {road.map(([date, list]) => {
            const d = new Date(`${date}T00:00:00`);
            return (
              <li key={date} className="relative">
                <span aria-hidden className="absolute -left-[26px] top-[5px] h-[9px] w-[9px] rounded-full bg-[hsl(var(--cream-accent))] ring-4 ring-[hsl(var(--cream-bg))]" />
                <button
                  type="button"
                  onClick={() => onOpenDay(date)}
                  className="text-[12.5px] font-bold text-[hsl(var(--cream-ink))]/80 transition-colors hover:text-[hsl(var(--cream-accent))]"
                >
                  {d.getMonth() + 1}월 {d.getDate()}일 ({WEEK[d.getDay()]})
                  <span className="ml-1.5 font-medium text-[hsl(var(--cream-muted))]">{list.length}끼</span>
                </button>
                <div className="mt-2 flex flex-wrap gap-2">
                  {list.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onOpenDay(m.date)}
                      title={m.place ? `${m.text} · ${m.place}` : m.text}
                      className="group flex max-w-full items-center gap-2 overflow-hidden rounded-2xl border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] py-1.5 pl-1.5 pr-3 text-left transition-colors hover:border-[hsl(var(--cream-accent))]/40"
                    >
                      {m.photo ? (
                        <img src={m.photo} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-xl object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--cream-accent))]/8 text-[13px]">
                          {m.mealSlot === 'snack' ? '🍪' : m.mealSlot === 'breakfast' ? '🥣' : m.mealSlot === 'dinner' ? '🍲' : '🍚'}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold text-[hsl(var(--cream-ink))]">{m.text}</span>
                        <span className="mt-px flex items-center gap-1 text-[11px] text-[hsl(var(--cream-muted))]">
                          {m.mealSlot && <span>{MEAL_SLOT_LABEL[m.mealSlot]}</span>}
                          {m.place && (
                            <>
                              {m.mealSlot && <span aria-hidden>·</span>}
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{m.place}</span>
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
        {hasMore && (
          <button
            type="button"
            onClick={() => setDays((n) => n + 14)}
            className="mt-4 w-full rounded-2xl border border-dashed border-[hsl(var(--cream-line))] py-2.5 text-[12.5px] font-semibold text-[hsl(var(--cream-muted))] transition-colors hover:border-[hsl(var(--cream-accent))]/40 hover:text-[hsl(var(--cream-ink))]"
          >
            더 거슬러 올라가기
          </button>
        )}
      </section>
    </div>
  );
}
