/**
 * 여행 — 날짜 범위 = 여행 하나 (Polarsteps 모델).
 *
 * 목록: 여행 카드 + 새 여행 만들기.
 * 상세: 그 기간 조각을 자동 수집 → 지도(경로) + 날짜별 타임라인 + 사진 앨범 + AI 여행기 초안.
 * 조각을 다시 입력하지 않는다 — 평소 남긴 조각이 그대로 여행으로 모인다.
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, Loader2, MapPin, Plus, Sparkles, Trash2, Copy, Check } from 'lucide-react';
import { notify } from '@/lib/notify';
import { tripStore } from '@/services/tripStore';
import { daylogStore } from '@/services/daylogStore';
import { useTrips, useTripMoments } from '@/hooks/useTrips';
import { draftTripRecap } from '@/lib/daylog/tripRecap';
import { DaylogMap } from '@/components/journal/DaylogMap';
import { MEAL_SLOT_LABEL, MOMENT_KIND_META, type DayMoment } from '@/types/daylog';
import type { Trip } from '@/types/trip';

const todayKey = () => new Date().toISOString().slice(0, 10);

const rangeLabel = (t: Trip): string => {
  const nights = Math.max(0, Math.round((Date.parse(t.endDate) - Date.parse(t.startDate)) / 86400000));
  const span = nights === 0 ? '당일' : `${nights}박 ${nights + 1}일`;
  return `${t.startDate} – ${t.endDate} · ${span}`;
};

export function TripsView() {
  const trips = useTrips();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? trips.find((t) => t.id === openId) ?? null : null;

  if (open) return <TripDetail trip={open} onBack={() => setOpenId(null)} />;
  return <TripList trips={trips} onOpen={setOpenId} />;
}

function TripList({ trips, onOpen }: { trips: Trip[]; onOpen: (id: string) => void }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [start, setStart] = useState(todayKey());
  const [end, setEnd] = useState(todayKey());

  const create = () => {
    if (!name.trim()) {
      notify.warning('여행 이름을 적어주세요', { duration: 1500 });
      return;
    }
    const t = tripStore.add({ name, startDate: start, endDate: end });
    setName('');
    setCreating(false);
    onOpen(t.id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[hsl(var(--cream-accent))]" />
          <h2 className="text-[15px] font-bold text-[hsl(var(--cream-ink))]/85">여행</h2>
          <span className="text-[11px] tabular-nums text-[hsl(var(--cream-muted))]/70">{trips.length}</span>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--cream-dark))] px-3.5 py-1.5 text-[12.5px] font-bold text-white hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> 새 여행
        </button>
      </div>

      {creating && (
        <div className="rounded-[22px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) create(); }}
            placeholder="여행 이름 (예: 제주 3일)"
            aria-label="여행 이름"
            className="w-full rounded-lg border border-[hsl(var(--cream-line))] bg-white/70 px-3 py-2 text-[14px] outline-none focus:border-[hsl(var(--cream-accent))]/50"
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[12px] text-[hsl(var(--cream-muted))]">
              시작
              <input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} className="rounded-md border border-[hsl(var(--cream-line))] bg-white/70 px-2 py-1 text-[12.5px] outline-none" />
            </label>
            <label className="flex items-center gap-1.5 text-[12px] text-[hsl(var(--cream-muted))]">
              종료
              <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="rounded-md border border-[hsl(var(--cream-line))] bg-white/70 px-2 py-1 text-[12.5px] outline-none" />
            </label>
            <button type="button" onClick={create} className="ml-auto rounded-full bg-[hsl(var(--cream-accent))] px-4 py-1.5 text-[12.5px] font-bold text-white hover:opacity-90">만들기</button>
          </div>
        </div>
      )}

      {trips.length === 0 && !creating ? (
        <div className="rounded-[26px] border border-dashed border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))]/50 py-16 text-center">
          <p className="text-[13.5px] text-[hsl(var(--cream-muted))]">아직 여행이 없어요.</p>
          <p className="mt-1.5 text-[12px] text-[hsl(var(--cream-muted))]/70">여행 날짜를 정해두면, 그 기간 조각이 저절로 모여 지도·타임라인·앨범이 돼요.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {trips.map((t) => (
            <TripCard key={t.id} trip={t} onOpen={() => onOpen(t.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TripCard({ trip, onOpen }: { trip: Trip; onOpen: () => void }) {
  const stat = useMemo(() => {
    const moments = daylogStore.inRange(trip.startDate, trip.endDate);
    const places = new Set(moments.filter((m) => m.place).map((m) => m.place!.toLowerCase()));
    const cover = trip.cover ?? moments.find((m) => m.photo)?.photo;
    return { count: moments.length, places: places.size, cover };
  }, [trip]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex items-stretch gap-3 overflow-hidden rounded-[22px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--cream-accent))]/30 hover:shadow-[0_14px_30px_-18px_hsl(25_30%_20%/0.3)]"
    >
      <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[hsl(var(--cream-panel))]">
        {stat.cover ? (
          <img src={stat.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <MapPin className="h-6 w-6 text-[hsl(var(--cream-muted))]/50" />
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <h3 className="truncate text-[15.5px] font-bold text-[hsl(var(--cream-ink))]">{trip.name}</h3>
        <p className="mt-0.5 text-[11.5px] text-[hsl(var(--cream-muted))]/80">{rangeLabel(trip)}</p>
        <p className="mt-1.5 text-[11.5px] text-[hsl(var(--cream-muted))]">
          조각 {stat.count} · 장소 {stat.places}곳
        </p>
      </div>
    </button>
  );
}

function TripDetail({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const moments = useTripMoments(trip.startDate, trip.endDate);
  const [recap, setRecap] = useState<string | null>(null);
  const [recapBusy, setRecapBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const photos = moments.filter((m) => m.photo);
  const byDate = useMemo(() => {
    const map = new Map<string, DayMoment[]>();
    for (const m of moments) {
      const list = map.get(m.date) ?? [];
      list.push(m);
      map.set(m.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [moments]);

  const genRecap = async () => {
    setRecapBusy(true);
    try {
      setRecap(await draftTripRecap(trip.name, moments));
    } finally {
      setRecapBusy(false);
    }
  };

  const copyRecap = async () => {
    if (!recap) return;
    try {
      await navigator.clipboard.writeText(recap);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      notify.error('복사 실패', { duration: 1500 });
    }
  };

  const del = () => {
    tripStore.remove(trip.id);
    notify.success('여행을 지웠어요 (조각·일기는 그대로예요)', { duration: 2000 });
    onBack();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onBack} aria-label="목록으로" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] text-[hsl(var(--cream-muted))] transition-colors hover:text-[hsl(var(--cream-ink))]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-sans text-[22px] font-bold leading-tight tracking-tight text-[hsl(var(--cream-ink))]">{trip.name}</h1>
            <p className="text-[12px] text-[hsl(var(--cream-muted))]/80">{rangeLabel(trip)}</p>
          </div>
        </div>
        <button type="button" onClick={del} aria-label="여행 삭제" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] text-[hsl(var(--cream-muted))] transition-colors hover:text-rose-500">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* 지도 (경로) */}
      <DaylogMap moments={moments} route showHeader={false} heightClass="h-[360px]" />

      {/* AI 여행기 초안 */}
      <div className="rounded-[22px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[hsl(var(--cream-accent))]" />
            <h3 className="text-[13.5px] font-bold text-[hsl(var(--cream-ink))]/85">여행기 초안</h3>
          </div>
          <div className="flex items-center gap-2">
            {recap && (
              <button type="button" onClick={copyRecap} className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--cream-line))] px-2.5 py-1 text-[11.5px] text-[hsl(var(--cream-ink))]/75 hover:border-[hsl(var(--cream-accent))]/40">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? '복사됨' : '복사'}
              </button>
            )}
            <button
              type="button"
              onClick={genRecap}
              disabled={recapBusy || moments.length === 0}
              className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--cream-accent))]/12 px-3 py-1 text-[12px] font-semibold text-[hsl(var(--cream-accent))] transition-colors hover:bg-[hsl(var(--cream-accent))]/22 disabled:opacity-40"
            >
              {recapBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {recap ? '다시 쓰기' : '조각으로 초안 쓰기'}
            </button>
          </div>
        </div>
        {recap ? (
          <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-[1.85] text-[hsl(var(--cream-ink))]/90">{recap}</p>
        ) : (
          <p className="mt-2 text-[12px] text-[hsl(var(--cream-muted))]/70">
            {moments.length === 0 ? '이 기간에 남긴 조각이 없어요.' : '기간 내 조각을 모아 여행기 초안을 만들어요. 마음에 들면 복사해서 회고에 붙여넣으세요.'}
          </p>
        )}
      </div>

      {/* 날짜별 타임라인 */}
      {byDate.length > 0 && (
        <div className="rounded-[22px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-4">
          <h3 className="mb-3 text-[13.5px] font-bold text-[hsl(var(--cream-ink))]/85">날짜별 기록</h3>
          <div className="space-y-4">
            {byDate.map(([date, list]) => (
              <div key={date}>
                <p className="mb-1.5 text-[11.5px] font-bold text-[hsl(var(--cream-ink))]/70">{date}</p>
                <ul className="ml-1 space-y-1 border-l-2 border-[hsl(var(--cream-line))]/80 pl-3.5">
                  {list.map((m) => {
                    const meta = MOMENT_KIND_META[m.kind];
                    const label = m.kind === 'meal' && m.mealSlot ? MEAL_SLOT_LABEL[m.mealSlot] : meta.label;
                    return (
                      <li key={m.id} className="flex items-start gap-2 py-0.5">
                        <span className="mt-[3px] w-[38px] shrink-0 text-[10.5px] tabular-nums text-[hsl(var(--cream-muted))]/75">{m.time}</span>
                        {m.photo && <img src={m.photo} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-md object-cover" />}
                        <div className="min-w-0 flex-1">
                          <span className="mr-1.5 rounded-full px-1.5 py-px text-[10px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${meta.tint} 12%, transparent)`, color: meta.tint }}>{meta.emoji} {label}</span>
                          {m.place && <span className="mr-1.5 text-[11px] text-[hsl(var(--cream-ink))]/60">📍{m.place}</span>}
                          <span className="text-[13px] text-[hsl(var(--cream-ink))]/90">{m.text}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 사진 앨범 */}
      {photos.length > 0 && (
        <div className="rounded-[22px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-4">
          <h3 className="mb-3 text-[13.5px] font-bold text-[hsl(var(--cream-ink))]/85">사진 {photos.length}</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((m) => (
              <img key={m.id} src={m.photo} alt={m.text} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
