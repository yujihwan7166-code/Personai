/**
 * 푸드 로드 — 먹은 것 전용 렌즈.
 *
 * 하루 기록 중 kind==='meal' 만 모아 먹부림 앨범(사진 격자) + 자주 간 맛집 랭킹 + 소소한 지표.
 * 새 입력은 없다 — 기록은 하루 페이지에서, 여기는 보는 곳. 크림 토큰 사용 (데일리로그 방 내부).
 */
import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { useDaylogAll } from '@/hooks/useDaylog';
import { MEAL_SLOT_LABEL, type DayItem } from '@/types/daylog';

export default function FoodRoadView({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const items = useDaylogAll();
  const meals = useMemo(() => items.filter((i) => i.kind === 'meal'), [items]);
  const photos = useMemo(() => meals.filter((m) => m.photo).slice().reverse(), [meals]); // 최신 먼저

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
      {/* 지표 */}
      <div className="grid grid-cols-3 gap-3">
        {([
          ['이번 달 기록한 끼니', stats.monthMeals, '끼'],
          ['먹은 곳', stats.places, '곳'],
          ['음식 사진', stats.photos, '장'],
        ] as const).map(([label, value, unit]) => (
          <div key={label} className="rounded-2xl border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-4 py-3.5">
            <p className="text-[11px] font-semibold text-[hsl(var(--cream-muted))]">{label}</p>
            <p className="mt-0.5 text-[24px] font-extrabold leading-none tabular-nums text-[hsl(var(--cream-accent))]">
              {value}<span className="ml-0.5 text-[13px] font-semibold text-[hsl(var(--cream-muted))]">{unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 자주 간 맛집 */}
      {ranking.length > 0 && (
        <section>
          <h3 className="mb-2.5 px-1 text-[14px] font-bold text-[hsl(var(--cream-ink))]/85">자주 간 곳</h3>
          <ol className="space-y-1.5">
            {ranking.map((r, i) => (
              <li key={r.place} className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-4 py-3">
                <span className="w-5 shrink-0 text-center text-[15px] font-extrabold tabular-nums text-[hsl(var(--cream-accent))]">{i + 1}</span>
                {r.last.photo && <img src={r.last.photo} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-[13.5px] font-bold">
                    <MapPin className="h-3 w-3 shrink-0 text-[hsl(var(--cream-muted))]/70" /> {r.place}
                  </p>
                  <p className="mt-px truncate text-[11.5px] text-[hsl(var(--cream-muted))]">최근: {r.last.text}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[hsl(var(--cream-accent))]/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-[hsl(var(--cream-accent))]">{r.count}번</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 먹부림 앨범 */}
      {photos.length > 0 && (
        <section>
          <h3 className="mb-2.5 px-1 text-[14px] font-bold text-[hsl(var(--cream-ink))]/85">
            먹부림 앨범 <span className="tabular-nums font-medium text-[hsl(var(--cream-muted))]/70">{photos.length}</span>
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {photos.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onOpenDay(m.date)}
                title={`${m.date} · ${m.text}`}
                className="group relative aspect-square overflow-hidden rounded-xl border border-[hsl(var(--cream-line))]"
              >
                <img src={m.photo} alt={m.text} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/55 to-transparent px-2 pb-1 pt-4 text-left text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {m.mealSlot ? `${MEAL_SLOT_LABEL[m.mealSlot]} · ` : ''}{m.text}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
