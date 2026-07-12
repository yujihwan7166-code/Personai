/**
 * 여행기록 — /travel ("나의 여행 인생" 한 방).
 *
 * 구조 (트리플·Polarsteps·Notion Travel Log 문법, 2026-07-12):
 *   목록 = 상태 변신 히어로(여행 중 → DAY n / 다가옴 → D-day / 없음 → 초대)
 *        + 시제 3분류 섹션(여행 중 · 다가오는 여행 · 다녀온 여행).
 *   과거는 "N개월 전 다녀옴"(상대시간), 미래는 "D-N"(카운트다운) — 비대칭 표기.
 *   상세 = TripDetail (DAY 타임라인 + 번호 핀 지도, 번호가 리스트·지도를 잇는 키).
 *   발자취 = 모든 여행의 장소를 한 지도에 + 누적 스코어보드.
 *   가고 싶은 곳 = 버킷리스트 (다음 여행의 씨앗).
 * 일기와 완전 무관 — 일상 입력층 없음, 기록은 여행 안에서만.
 */
import { useMemo, useState } from 'react';
import { ChevronRight, MapPin, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { travelStore } from '@/services/travelStore';
import { useTrips, useAllRecords, useBucket } from '@/hooks/useTravel';
import { TravelMap, type MapPin as TravelMapPin } from '@/components/travel/TravelMap';
import { TripDetail, CoverFallback } from '@/components/travel/TripDetail';
import { agoLabel, escapeHtml } from '@/lib/travel/format';
import { diffDays, nightsLabel, todayKey, tripStatus, type Trip, type TravelRecord } from '@/types/travel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type View = 'trips' | 'footprints' | 'bucket';

export default function Travel() {
  const trips = useTrips();
  const [view, setView] = useState<View>('trips');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const openTrip = openId ? trips.find((t) => t.id === openId) ?? null : null;

  return (
    <div className="travel-theme flex h-dvh flex-col bg-background text-foreground">
      {/* ══ 마스트헤드 — 도구명이 주인공, 방 색(제이드) 틴트. 아이콘은 레일 마크가 담당. ══ */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 pb-3 pt-3.5 sm:px-6">
        <h1 className="text-[27px] font-bold leading-tight tracking-tight text-[hsl(var(--travel-teal))]">여행기록</h1>
        {!openTrip && (
          <>
            <nav className="flex items-center gap-1 rounded-full bg-[hsl(var(--surface-3))]/70 p-1">
              {([['trips', '여행'], ['footprints', '발자취'], ['bucket', '가고 싶은 곳']] as [View, string][]).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors',
                    view === id
                      ? 'bg-[hsl(var(--surface-1))] text-[hsl(var(--travel-teal))] shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--travel-teal))] px-4 py-2 text-[12.5px] font-bold text-[hsl(var(--travel-teal-ink))] shadow-[0_6px_16px_-8px_hsl(var(--travel-teal)/0.8)] transition-[filter] hover:brightness-[1.06]"
            >
              <Plus className="h-3.5 w-3.5" /> 새 여행
            </button>
          </>
        )}
      </header>

      {/* key 로 화면 전환 시 remount — 공유 스크롤 컨테이너의 scrollTop 잔존 방지 */}
      <div key={openTrip ? `trip-${openTrip.id}` : view} className="min-h-0 flex-1 overflow-y-auto">
        {openTrip ? (
          <TripDetail trip={openTrip} onBack={() => setOpenId(null)} />
        ) : view === 'trips' ? (
          <TripsList trips={trips} onOpen={setOpenId} onCreate={() => setCreating(true)} />
        ) : view === 'footprints' ? (
          <FootprintsView trips={trips} />
        ) : (
          <BucketView />
        )}
      </div>

      <NewTripDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(t) => {
          setCreating(false);
          setView('trips');
          setOpenId(t.id);
        }}
      />
    </div>
  );
}

/* ── 여행 목록 — 상태 변신 히어로 + 시제 3분류 ── */

function TripsList({ trips, onOpen, onCreate }: { trips: Trip[]; onOpen: (id: string) => void; onCreate: () => void }) {
  const today = todayKey();
  const allRecords = useAllRecords();
  const ongoing = trips.filter((t) => tripStatus(t, today) === 'ongoing');
  const upcoming = trips.filter((t) => tripStatus(t, today) === 'upcoming').sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = trips.filter((t) => tripStatus(t, today) === 'past');
  const hero = ongoing[0] ?? upcoming[0] ?? null;

  /** 여행별 대표 사진 — 전체 기록 1회 순회로 계산 (카드마다 스토어 전체 파싱 금지). */
  const coverMap = useMemo(() => {
    const map = new Map<string, string>();
    // listAllRecords 는 최신순 → 마지막 대입이 가장 이른 사진
    for (const r of allRecords) if (r.photo) map.set(r.tripId, r.photo);
    return map;
  }, [allRecords]);
  const coverOf = (t: Trip) => t.cover ?? coverMap.get(t.id);

  if (trips.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <div className="mt-6 overflow-hidden rounded-3xl border border-dashed border-[hsl(var(--hairline))]">
          <CoverFallback className="h-40" />
          <div className="bg-[hsl(var(--surface-1))] px-6 py-8 text-center">
            <p className="text-[15px] font-bold">첫 여행을 계획해 보세요</p>
            <p className="mx-auto mt-1.5 max-w-[340px] text-[12.5px] leading-relaxed text-muted-foreground">
              날짜만 정해두면 D-day가 카운트되고, 여행 중 남긴 기록이 지도·타임라인·앨범으로 쌓여요.
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
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-7 px-4 pb-16 sm:px-6">
      {/* 상태 변신 히어로 — 여행 중이면 DAY n, 아니면 다음 여행 D-day */}
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <h3 className="truncate text-[15px] font-bold">{trip.title}</h3>
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

/* ── 발자취 — 모든 여행의 장소를 한 지도에 + 누적 스코어보드 ── */

function FootprintsView({ trips }: { trips: Trip[] }) {
  const records = useAllRecords();

  const stats = useMemo(() => {
    // 스코어보드는 "다녀온" 기록 — 다가오는 여행은 빼고, 여행 중은 오늘까지만 센다.
    const today = todayKey();
    const counted = trips.filter((t) => tripStatus(t, today) !== 'upcoming');
    const totalDays = counted.reduce((sum, t) => {
      const end = t.endDate < today ? t.endDate : today;
      return sum + diffDays(t.startDate, end) + 1;
    }, 0);
    const places = new Set(records.filter((r) => r.place).map((r) => r.place!.toLowerCase()));
    return { trips: counted.length, days: totalDays, places: places.size };
  }, [trips, records]);

  /** 장소별로 묶어 핀 하나 — 팝업에 방문 이력. */
  const pins = useMemo<TravelMapPin[]>(() => {
    const tripTitle = new Map(trips.map((t) => [t.id, t.title]));
    const byPlace = new Map<string, { place: string; visits: TravelRecord[] }>();
    for (const r of records) {
      if (!r.place) continue;
      const key = r.place.trim().toLowerCase();
      const g = byPlace.get(key);
      if (g) g.visits.push(r);
      else byPlace.set(key, { place: r.place.trim(), visits: [r] });
    }
    return [...byPlace.values()].map((g) => {
      const rows = g.visits.slice(0, 5).map((r) =>
        `<div style="margin-top:5px">
          <div style="font-size:10.5px;color:#8a8178">${escapeHtml(tripTitle.get(r.tripId) ?? '')} · ${escapeHtml(r.date)}</div>
          <div style="font-size:12.5px">${escapeHtml(r.text)}</div>
        </div>`,
      ).join('');
      const more = g.visits.length > 5 ? `<div style="font-size:10.5px;color:#8a8178;margin-top:5px">외 ${g.visits.length - 5}건</div>` : '';
      return {
        id: g.place,
        place: g.place,
        color: 'hsl(183 58% 36%)',
        tooltip: g.place,
        popup: `<div style="min-width:170px;max-width:230px">
          <div style="font-weight:700;font-size:13.5px">${escapeHtml(g.place)}</div>
          ${rows}${more}
        </div>`,
      };
    });
  }, [records, trips]);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 pb-16 sm:px-6">
      {/* 스코어보드 — "나는 이만큼 다녀온 사람" */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {([
          ['여행', stats.trips, '번'],
          ['여행한 날', stats.days, '일'],
          ['가본 곳', stats.places, '곳'],
        ] as const).map(([label, value, unit]) => (
          <div key={label} className="rounded-2xl border border-[hsl(var(--foreground)/0.1)] bg-[hsl(var(--surface-1))] px-4 py-3.5 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.14)]">
            <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-[24px] font-extrabold leading-none tabular-nums text-[hsl(var(--travel-teal))]">
              {value}<span className="ml-0.5 text-[13px] font-semibold text-muted-foreground">{unit}</span>
            </p>
          </div>
        ))}
      </div>

      <TravelMap
        pins={pins}
        heightClass="h-[440px] sm:h-[520px]"
        emptyText="여행 기록에 장소를 적으면, 다녀온 곳 전부가 이 지도에 모여요."
      />
    </div>
  );
}

/* ── 가고 싶은 곳 — 다음 여행의 씨앗 ── */

function BucketView() {
  const bucket = useBucket();
  const [name, setName] = useState('');

  const add = () => {
    if (!name.trim()) return;
    travelStore.addBucket({ name });
    setName('');
  };

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-16 sm:px-6">
      <div className="flex items-center gap-2 rounded-full border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] pl-4 pr-2 shadow-sm transition-colors focus-within:border-[hsl(var(--travel-teal))]/55">
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) add(); }}
          placeholder="가고 싶은 곳 (예: 교토 단풍, 아이슬란드 오로라)"
          aria-label="가고 싶은 곳 추가"
          className="h-11 min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground/50"
        />
        <button
          type="button"
          onClick={add}
          disabled={!name.trim()}
          aria-label="추가"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--travel-teal))]/12 text-[hsl(var(--travel-teal))] transition-colors hover:bg-[hsl(var(--travel-teal))]/22 disabled:opacity-35"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {bucket.length === 0 ? (
        <p className="mt-8 text-center text-[12.5px] text-muted-foreground/70">
          언젠가 가고 싶은 곳을 적어두세요. 다음 여행은 여기서 시작돼요.
        </p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {bucket.map((b) => (
            <li
              key={b.id}
              className="group flex items-center gap-3 rounded-2xl border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--surface-1))] px-4 py-3 shadow-[0_1px_6px_-2px_hsl(var(--foreground)/0.1)]"
            >
              <button
                type="button"
                onClick={() => travelStore.toggleBucket(b.id)}
                aria-label={b.done ? '가봤음 해제' : '가봤음으로 표시'}
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  b.done
                    ? 'border-[hsl(var(--travel-teal))] bg-[hsl(var(--travel-teal))] text-[hsl(var(--travel-teal-ink))]'
                    : 'border-[hsl(var(--foreground)/0.25)] hover:border-[hsl(var(--travel-teal))]',
                )}
              >
                {b.done && <span className="text-[10px] font-bold leading-none">✓</span>}
              </button>
              <span className={cn('min-w-0 flex-1 truncate text-[13.5px]', b.done && 'text-muted-foreground line-through decoration-[hsl(var(--travel-teal)/0.5)]')}>
                {b.name}
              </span>
              {b.done && <span className="shrink-0 rounded-full bg-[hsl(var(--travel-teal))]/10 px-2 py-0.5 text-[10.5px] font-bold text-[hsl(var(--travel-teal))]">다녀옴</span>}
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
                className="shrink-0 p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:text-rose-500 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
