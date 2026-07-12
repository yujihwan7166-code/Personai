/**
 * 트래블 로그 — 데일리로그 방의 여행 섹션 본체.
 *
 * 구조 (Diary Room·트리플·Polarsteps 문법):
 *   누적 스탯 스트립 + [여행 목록(상태 변신 히어로 + 시제 3분류) | 우측 다크 버킷 카드].
 *   여행 상세 = TripDetail (DAY 타임라인 + 번호 핀 지도).
 * 기록은 여기서 새로 입력하지 않는다 — 하루 페이지의 기록이 기간으로 자동 수집된다
 * (여행 상세 안에서 바로 추가하는 것도 같은 하루 기록 store 로 들어간다).
 * 발자취 지도는 "나의 지도" 섹션이 담당. 테마 토큰(.travel-theme)은 호스트가 래퍼로 씌운다.
 */
import { useMemo, useState } from 'react';
import { ChevronRight, Heart, MapPin, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { travelStore } from '@/services/travelStore';
import { useTrips, useBucket } from '@/hooks/useTravel';
import { useDaylogAll } from '@/hooks/useDaylog';
import { TripDetail, CoverFallback } from '@/components/travel/TripDetail';
import { agoLabel } from '@/lib/travel/format';
import { diffDays, nightsLabel, todayKey, tripStatus, type Trip } from '@/types/travel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function TravelHome({ initialTripId }: { initialTripId?: string }) {
  const trips = useTrips();
  const items = useDaylogAll();
  const [openId, setOpenId] = useState<string | null>(initialTripId ?? null);
  const [creating, setCreating] = useState(false);

  const openTrip = openId ? trips.find((t) => t.id === openId) ?? null : null;
  const today = todayKey();

  /** 여행별 대표 사진 — 기간 내 첫 사진 (하루 기록에서). */
  const coverOf = (t: Trip) =>
    t.cover ?? items.find((i) => i.photo && i.date >= t.startDate && i.date <= t.endDate)?.photo;

  const stats = useMemo(() => {
    const counted = trips.filter((t) => tripStatus(t, today) !== 'upcoming');
    const totalDays = counted.reduce((sum, t) => {
      const end = t.endDate < today ? t.endDate : today;
      return sum + diffDays(t.startDate, end) + 1;
    }, 0);
    const places = new Set(
      items
        .filter((i) => i.place && trips.some((t) => i.date >= t.startDate && i.date <= t.endDate))
        .map((i) => i.place!.toLowerCase()),
    );
    return { trips: counted.length, days: totalDays, places: places.size };
  }, [trips, items, today]);

  if (openTrip) {
    return <TripDetail trip={openTrip} onBack={() => setOpenId(null)} />;
  }

  return (
    <div className="pb-8">
      {/* 스탯 스트립 + 새 여행 */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center divide-x divide-[hsl(var(--hairline))] rounded-2xl border border-[hsl(var(--foreground)/0.1)] bg-[hsl(var(--surface-1))] px-1 py-2.5 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.12)]">
          {([
            [stats.trips, '여행'],
            [stats.days, '여행한 날'],
            [stats.places, '여행지'],
          ] as const).map(([value, label]) => (
            <div key={label} className="px-5 text-center">
              <p className="text-[20px] font-extrabold leading-none tabular-nums text-[hsl(var(--travel-teal))]">{value}</p>
              <p className="mt-1 text-[10.5px] font-semibold text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--travel-teal))] px-4 py-2 text-[12.5px] font-bold text-[hsl(var(--travel-teal-ink))] shadow-[0_6px_16px_-8px_hsl(var(--travel-teal)/0.8)] transition-[filter] hover:brightness-[1.06]"
        >
          <Plus className="h-3.5 w-3.5" /> 새 여행
        </button>
      </div>

      <div className="gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <TripsList trips={trips} today={today} coverOf={coverOf} onOpen={setOpenId} onCreate={() => setCreating(true)} />
        <BucketCard className="mt-6 lg:mt-0" />
      </div>

      <NewTripDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(t) => {
          setCreating(false);
          setOpenId(t.id);
        }}
      />
    </div>
  );
}

/* ── 여행 목록 — 상태 변신 히어로 + 시제 3분류 ── */

function TripsList({
  trips, today, coverOf, onOpen, onCreate,
}: {
  trips: Trip[];
  today: string;
  coverOf: (t: Trip) => string | undefined;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const ongoing = trips.filter((t) => tripStatus(t, today) === 'ongoing');
  const upcoming = trips.filter((t) => tripStatus(t, today) === 'upcoming').sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = trips.filter((t) => tripStatus(t, today) === 'past');
  const hero = ongoing[0] ?? upcoming[0] ?? null;

  if (trips.length === 0) {
    return (
      <div className="overflow-hidden rounded-3xl border border-dashed border-[hsl(var(--hairline))]">
        <CoverFallback className="h-36" />
        <div className="bg-[hsl(var(--surface-1))] px-6 py-8 text-center">
          <p className="text-[15px] font-bold text-foreground">첫 여행을 계획해 보세요</p>
          <p className="mx-auto mt-1.5 max-w-[340px] text-[12.5px] leading-relaxed text-muted-foreground">
            날짜만 정해두면 D-day가 카운트되고, 하루 페이지에 남긴 기록이 지도·타임라인·앨범으로 모여요.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--travel-teal))] px-5 py-2.5 text-[13px] font-bold text-[hsl(var(--travel-teal-ink))] transition-[filter] hover:brightness-[1.06]"
          >
            <Plus className="h-4 w-4" /> 새 여행 만들기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {hero && <HeroCard trip={hero} cover={coverOf(hero)} today={today} onOpen={() => onOpen(hero.id)} />}

      {ongoing.length > 1 && (
        <TripSection title="여행 중" trips={ongoing.slice(1)} coverOf={coverOf} today={today} onOpen={onOpen} />
      )}
      {upcoming.length > 0 && (
        <TripSection
          title="다가오는 여행"
          trips={hero && tripStatus(hero, today) === 'upcoming' ? upcoming.slice(1) : upcoming}
          coverOf={coverOf}
          today={today}
          onOpen={onOpen}
        />
      )}
      {past.length > 0 && <TripSection title="다녀온 여행" trips={past} coverOf={coverOf} today={today} onOpen={onOpen} />}
    </div>
  );
}

function HeroCard({ trip, cover, today, onOpen }: { trip: Trip; cover?: string; today: string; onOpen: () => void }) {
  const status = tripStatus(trip, today);
  const dday = diffDays(today, trip.startDate);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-3xl border border-[hsl(var(--hairline))] text-left shadow-[0_10px_30px_-18px_hsl(var(--foreground)/0.35)] transition-transform hover:-translate-y-0.5"
    >
      {cover ? (
        <>
          <img src={cover} alt="" className="h-44 w-full object-cover sm:h-48" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/68 via-black/32 to-transparent" />
        </>
      ) : (
        <CoverFallback className="h-44 sm:h-48" />
      )}
      <div className={cn('absolute inset-0 flex flex-col justify-center px-6 sm:px-8', cover ? 'text-white' : 'text-foreground')}>
        <p className={cn('text-[11.5px] font-bold tracking-[0.14em]', cover ? 'text-white/75' : 'text-[hsl(var(--travel-teal))]')}>
          {status === 'ongoing' ? '지금 여행 중' : '다음 여행까지'}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[34px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[40px]">
            {status === 'ongoing' ? `DAY ${diffDays(trip.startDate, today) + 1}` : dday === 0 ? 'D-DAY' : `D-${dday}`}
          </span>
          <span className="min-w-0 truncate text-[16px] font-bold">{trip.title}</span>
        </div>
        <p className={cn('mt-1.5 text-[12px]', cover ? 'text-white/80' : 'text-muted-foreground')}>
          {trip.destination && <>{trip.destination} · </>}
          {trip.startDate.replaceAll('-', '.')} – {trip.endDate.replaceAll('-', '.')} · {nightsLabel(trip)}
        </p>
      </div>
      <span className={cn(
        'absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5',
        cover ? 'bg-white/22 text-white backdrop-blur-sm' : 'bg-[hsl(var(--travel-teal))]/12 text-[hsl(var(--travel-teal))]',
      )}>
        <ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}

function TripSection({ title, trips, coverOf, today, onOpen }: { title: string; trips: Trip[]; coverOf: (t: Trip) => string | undefined; today: string; onOpen: (id: string) => void }) {
  if (trips.length === 0) return null;
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <h2 className="text-[14.5px] font-bold text-foreground/85">{title}</h2>
        <span className="text-[11px] tabular-nums text-muted-foreground/70">{trips.length}</span>
        <span className="h-px flex-1 bg-[hsl(var(--hairline))]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {trips.map((t) => (
          <TripCard key={t.id} trip={t} cover={coverOf(t)} today={today} onOpen={() => onOpen(t.id)} />
        ))}
      </div>
    </section>
  );
}

function TripCard({ trip, cover, today, onOpen }: { trip: Trip; cover?: string; today: string; onOpen: () => void }) {
  const status = tripStatus(trip, today);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group overflow-hidden rounded-2xl border border-[hsl(var(--foreground)/0.1)] bg-[hsl(var(--surface-1))] text-left shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.14),0_1px_2px_hsl(var(--foreground)/0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-16px_hsl(var(--foreground)/0.3)]"
    >
      <div className="relative h-32 overflow-hidden">
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <CoverFallback className="h-full" />
        )}
        {status === 'upcoming' && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-[hsl(var(--travel-teal))] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[hsl(var(--travel-teal-ink))] shadow-sm">
            {diffDays(today, trip.startDate) === 0 ? 'D-DAY' : `D-${diffDays(today, trip.startDate)}`}
          </span>
        )}
        {status === 'ongoing' && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-[hsl(var(--travel-teal))] px-2 py-0.5 text-[11px] font-bold text-[hsl(var(--travel-teal-ink))] shadow-sm">
            여행 중
          </span>
        )}
      </div>
      <div className="px-4 pb-3.5 pt-3">
        <h3 className="truncate text-[15px] font-bold text-foreground">{trip.title}</h3>
        <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
          {trip.destination && <>{trip.destination} · </>}
          {trip.startDate.replaceAll('-', '.')} – {trip.endDate.replaceAll('-', '.')} · {nightsLabel(trip)}
        </p>
        {status === 'past' && (
          <p className="mt-1.5 text-[11.5px] font-medium text-[hsl(var(--travel-teal))]/85">
            {agoLabel(diffDays(trip.endDate, today))}
          </p>
        )}
      </div>
    </button>
  );
}

/* ── 버킷 — 다크 카드 (Diary Room 의 Travel Bucket List 문법) ── */

function BucketCard({ className }: { className?: string }) {
  const bucket = useBucket();
  const [name, setName] = useState('');

  const add = () => {
    if (!name.trim()) return;
    travelStore.addBucket({ name });
    setName('');
  };

  return (
    <aside className={cn('rounded-3xl bg-[hsl(228_12%_18%)] p-5 text-white shadow-[0_14px_36px_-18px_rgba(0,0,0,0.55)]', className)}>
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 fill-white/90 text-white/90" />
        <h3 className="text-[14.5px] font-bold">가고 싶은 곳</h3>
        {bucket.length > 0 && <span className="text-[11px] tabular-nums text-white/50">{bucket.length}</span>}
      </div>

      <ul className="mt-3 space-y-1.5">
        {bucket.length === 0 && (
          <li className="rounded-xl bg-white/[0.06] px-3 py-4 text-center text-[11.5px] leading-relaxed text-white/55">
            언젠가 가고 싶은 곳을 적어두세요.<br />다음 여행은 여기서 시작돼요.
          </li>
        )}
        {bucket.map((b) => (
          <li key={b.id} className="group flex items-center gap-2.5 rounded-xl bg-white/[0.07] px-3 py-2.5 transition-colors hover:bg-white/[0.11]">
            <button
              type="button"
              onClick={() => travelStore.toggleBucket(b.id)}
              aria-label={b.done ? '가봤음 해제' : '가봤음으로 표시'}
              className={cn(
                'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                b.done ? 'border-[hsl(181_52%_60%)] bg-[hsl(181_52%_60%)] text-[hsl(228_12%_18%)]' : 'border-white/35 hover:border-white/70',
              )}
            >
              {b.done && <span className="text-[9px] font-bold leading-none">✓</span>}
            </button>
            <span className={cn('min-w-0 flex-1 truncate text-[12.5px]', b.done ? 'text-white/45 line-through' : 'text-white/90')}>
              {b.name}
            </span>
            <button
              type="button"
              onClick={() => {
                const removed = travelStore.removeBucket(b.id);
                if (removed) {
                  notify.info('지웠어요', {
                    duration: 4000,
                    action: { label: '되돌리기', onClick: () => travelStore.restoreBucket(removed) },
                  });
                }
              }}
              aria-label="삭제"
              className="shrink-0 p-0.5 text-white/35 opacity-0 transition-opacity hover:text-rose-400 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] pl-3 pr-1.5 transition-colors focus-within:border-white/35">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-white/40" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) add(); }}
          placeholder="예: 교토 단풍"
          aria-label="가고 싶은 곳 추가"
          className="h-9 min-w-0 flex-1 bg-transparent text-[12.5px] text-white outline-none placeholder:text-white/35"
        />
        <button
          type="button"
          onClick={add}
          disabled={!name.trim()}
          aria-label="추가"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/12 text-white/80 transition-colors hover:bg-white/20 disabled:opacity-35"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}

/* ── 새 여행 다이얼로그 ── */

function NewTripDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (t: Trip) => void }) {
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [start, setStart] = useState(todayKey());
  const [end, setEnd] = useState(todayKey());

  const create = () => {
    if (!title.trim()) {
      notify.warning('여행 이름을 적어주세요', { duration: 1500 });
      return;
    }
    if (!start || !end) {
      notify.warning('여행 날짜를 선택해주세요', { duration: 1500 });
      return;
    }
    const trip = travelStore.addTrip({ title, destination, startDate: start, endDate: end });
    setTitle('');
    setDestination('');
    onCreated(trip);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="travel-theme max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[17px]">새 여행</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) create(); }}
            placeholder="여행 이름 (예: 다낭 먹방 여행)"
            autoFocus
            className="h-11 w-full rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-3 text-[13.5px] outline-none placeholder:text-muted-foreground/50 focus:border-[hsl(var(--travel-teal))]"
          />
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) create(); }}
            placeholder="목적지 (예: 베트남 다낭) — 지도 중심이 돼요"
            className="h-11 w-full rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-3 text-[13.5px] outline-none placeholder:text-muted-foreground/50 focus:border-[hsl(var(--travel-teal))]"
          />
          <div className="flex items-center gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11.5px] font-medium text-muted-foreground">
              시작
              <input
                type="date"
                value={start}
                onChange={(e) => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }}
                className="h-10 w-full rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-2.5 text-[12.5px] tabular-nums outline-none focus:border-[hsl(var(--travel-teal))]"
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11.5px] font-medium text-muted-foreground">
              종료
              <input
                type="date"
                value={end}
                min={start}
                onChange={(e) => setEnd(e.target.value)}
                className="h-10 w-full rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-2.5 text-[12.5px] tabular-nums outline-none focus:border-[hsl(var(--travel-teal))]"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={create}
            disabled={!title.trim()}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-[hsl(var(--travel-teal))] text-[13.5px] font-bold text-[hsl(var(--travel-teal-ink))] shadow-[0_6px_16px_-8px_hsl(var(--travel-teal)/0.8)] transition-[filter] hover:brightness-[1.06] disabled:opacity-45"
          >
            여행 만들기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
