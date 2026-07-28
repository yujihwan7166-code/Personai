/**
 * 여행 상세 — 커버 헤더 + 좌 DAY 타임라인 / 우 고정 지도 (Wanderlog 분할, 트리플 문법).
 *
 * 기록은 하루 기록 store(daylog)에서 기간으로 자동 수집 — 여행 전용 저장소가 없다.
 * 여기서 추가한 기록도 같은 store 로 들어가 하루 페이지에 그대로 보인다.
 * 번호가 리스트와 지도를 잇는 키: 기록 카드의 번호 = 지도 핀의 번호 = 방문 순서.
 * 장소가 있는 기록만 번호를 받고, DAY 마다 색이 달라 겹쳐 봐도 구분된다.
 */
import { useMemo, useRef, useState } from 'react';
import {
  Camera, ChevronLeft, Clock, ImagePlus, Loader2, MapPin, Plus, Trash2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { compressImage } from '@/lib/journalImage';
import { travelStore } from '@/services/travelStore';
import { daylogStore } from '@/services/daylogStore';
import { useDaylogRange } from '@/hooks/useDaylog';
import { TravelMap, type MapPin as TravelMapPin } from '@/components/travel/TravelMap';
import { agoLabel, escapeHtml } from '@/lib/travel/format';
import { fmtDateWithWeekday } from '@/lib/dateFormat';
import {
  nightsLabel, todayKey, tripDays, tripStatus, diffDays, type Trip,
} from '@/types/travel';
import {
  DAY_ITEM_META, MEAL_SLOT_LABEL, MEAL_SLOT_ORDER,
  type DayItem, type DayItemKind, type MealSlot,
} from '@/types/daylog';

const KIND_ORDER: DayItemKind[] = ['meal', 'place', 'note'];

/** 기록 라벨 — 끼니가 있으면 끼니로. */
const itemLabel = (i: Pick<DayItem, 'kind' | 'mealSlot'>): string =>
  i.kind === 'meal' && i.mealSlot ? MEAL_SLOT_LABEL[i.mealSlot] : DAY_ITEM_META[i.kind].label;

/** DAY 색 순환 — 핀·경로·번호 배지가 같은 색을 공유한다. */
const DAY_COLORS = [
  'hsl(183 58% 32%)', // 제이드 (방 색)
  'hsl(18 80% 50%)',  // 새벽 오렌지
  'hsl(262 52% 54%)', // 트왈라잇 바이올렛
  'hsl(210 70% 46%)', // 바다 블루
  'hsl(330 62% 50%)', // 노을 핑크
  'hsl(150 45% 38%)', // 숲 그린
  'hsl(38 85% 44%)',  // 앰버
];
const dayColor = (i: number) => DAY_COLORS[i % DAY_COLORS.length];

const dayHeader = (date: string) => fmtDateWithWeekday(new Date(`${date}T00:00:00`));

async function pickPhoto(file: File | undefined): Promise<string | null> {
  if (!file) return null;
  if (!file.type.startsWith('image/')) {
    notify.warning('이미지 파일만 넣을 수 있어요', { duration: 1500 });
    return null;
  }
  try {
    const { src } = await compressImage(file);
    return src;
  } catch {
    notify.error('사진 압축 실패', { duration: 2000 });
    return null;
  }
}

export function TripDetail({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const records = useDaylogRange(trip.startDate, trip.endDate);
  const days = useMemo(() => tripDays(trip), [trip]);
  const today = todayKey();
  const status = tripStatus(trip, today);
  const coverRef = useRef<HTMLInputElement>(null);
  const [armDelete, setArmDelete] = useState(false);

  const photos = records.filter((r) => r.photo);
  const cover = trip.cover ?? photos[0]?.photo;
  const placeCount = new Set(records.filter((r) => r.place).map((r) => r.place!.toLowerCase())).size;

  /** 지도 핀 — DAY 색 + DAY 내 방문 순서 번호. 카드 번호와 동일 규칙. */
  const pins = useMemo<TravelMapPin[]>(() => {
    const out: TravelMapPin[] = [];
    days.forEach((date, di) => {
      let n = 0;
      for (const r of records) {
        if (r.date !== date || !r.place) continue;
        n += 1;
        const meta = DAY_ITEM_META[r.kind];
        const thumb = r.photo
          ? `<img src="${r.photo}" alt="" style="width:100%;height:72px;object-fit:cover;border-radius:8px;margin-top:6px" />`
          : '';
        out.push({
          id: r.id,
          place: r.place,
          number: n,
          color: dayColor(di),
          group: date,
          tooltip: r.place,
          popup: `<div style="min-width:170px;max-width:220px">
            <div style="font-size:11px;font-weight:700;color:${dayColor(di)}">DAY ${di + 1} · ${n}번째</div>
            <div style="font-weight:700;font-size:13.5px;margin-top:2px">${escapeHtml(r.place)}</div>
            <div style="font-size:12px;color:#6b6259;margin-top:2px">${meta.emoji} ${escapeHtml(r.text)}</div>
            ${thumb}
          </div>`,
        });
      }
    });
    return out;
  }, [days, records]);

  const statusLabel =
    status === 'ongoing'
      ? `여행 중 · DAY ${diffDays(trip.startDate, today) + 1}`
      : status === 'upcoming'
        ? (diffDays(today, trip.startDate) === 0 ? 'D-DAY' : `D-${diffDays(today, trip.startDate)}`)
        : `${agoLabel(diffDays(trip.endDate, today))}`;

  const changeCover = async (file: File | undefined) => {
    const src = await pickPhoto(file);
    if (src) travelStore.updateTrip(trip.id, { cover: src });
    if (coverRef.current) coverRef.current.value = '';
  };

  const deleteTrip = () => {
    if (!armDelete) {
      setArmDelete(true);
      window.setTimeout(() => setArmDelete(false), 2500);
      return;
    }
    travelStore.removeTrip(trip.id);
    notify.success('여행을 지웠어요', {
      description: '하루 기록과 사진은 날짜에 그대로 남아 있어요.',
      action: { label: '되돌리기', onClick: () => travelStore.restoreTrip(trip) },
    });
    onBack();
  };

  return (
    <div className="w-full pb-16">
      {/* ── 커버 헤더 ── */}
      <div className="relative mt-1 overflow-hidden rounded-3xl border border-[hsl(var(--hairline))]">
        {cover ? (
          <>
            <img src={cover} alt="" className="h-44 w-full object-cover sm:h-52" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/12 to-transparent" />
          </>
        ) : (
          <CoverFallback className="h-44 sm:h-52" />
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="여행 목록으로"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--surface-1))]/92 text-foreground shadow-sm transition-transform hover:scale-105"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <div className="flex items-center gap-1.5">
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => void changeCover(e.target.files?.[0])} />
            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              aria-label="커버 사진 바꾸기"
              title="커버 사진"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--surface-1))]/92 text-muted-foreground shadow-sm transition-colors hover:text-foreground"
            >
              <Camera className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={deleteTrip}
              aria-label="여행 삭제"
              className={cn(
                'flex h-9 items-center justify-center gap-1.5 rounded-full bg-[hsl(var(--surface-1))]/92 px-3 text-[12px] shadow-sm transition-colors',
                armDelete ? 'font-semibold text-rose-500' : 'w-9 px-0 text-muted-foreground hover:text-rose-500',
              )}
            >
              <Trash2 className="h-4 w-4" />
              {armDelete && '한 번 더 누르면 삭제'}
            </button>
          </div>
        </div>
        <div className={cn('absolute inset-x-0 bottom-0 p-4 sm:p-5', cover ? 'text-white' : 'text-foreground')}>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-[24px] font-bold leading-tight tracking-tight sm:text-[28px]">{trip.title}</h2>
              <p className={cn('mt-0.5 text-[12.5px]', cover ? 'text-white/85' : 'text-muted-foreground')}>
                {trip.destination && <>{trip.destination} · </>}
                {trip.startDate.replaceAll('-', '.')} – {trip.endDate.replaceAll('-', '.')} · {nightsLabel(trip)}
              </p>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold tabular-nums',
                cover ? 'bg-white/22 text-white backdrop-blur-sm' : 'bg-[hsl(var(--travel-teal))]/12 text-[hsl(var(--travel-teal))]',
              )}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* 요약 스트립 */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[12px] text-muted-foreground">
        <span>기록 <b className="tabular-nums text-foreground">{records.length}</b></span>
        <span>장소 <b className="tabular-nums text-foreground">{placeCount}</b></span>
        <span>사진 <b className="tabular-nums text-foreground">{photos.length}</b></span>
      </div>

      {/* ── 본문: 좌 타임라인 / 우 고정 지도 ── */}
      <div className="mt-4 gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
        {/* 모바일에선 지도 먼저 */}
        <div className="lg:order-2 lg:sticky lg:top-4">
          <TravelMap
            pins={pins}
            heightClass="h-[320px] lg:h-[500px]"
            fallbackPlace={trip.destination || undefined}
            emptyText='기록에 장소를 적으면 지도에 번호 핀이 찍히고, 하루 동선이 선으로 이어져요.'
          />
        </div>

        {/* DAY 타임라인 */}
        <div className="mt-5 space-y-5 lg:order-1 lg:mt-0">
          {days.map((date, di) => (
            <DaySection
              key={date}
              trip={trip}
              date={date}
              dayIndex={di}
              records={records.filter((r) => r.date === date)}
              isToday={date === today}
            />
          ))}
        </div>
      </div>

      {/* ── 사진 앨범 ── */}
      {photos.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-2.5 px-1 text-[14px] font-bold text-foreground/85">사진 <span className="tabular-nums text-muted-foreground">{photos.length}</span></h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {photos.map((r) => (
              <img key={r.id} src={r.photo} alt={r.text} loading="lazy" className="aspect-square w-full rounded-xl border border-[hsl(var(--hairline))] object-cover" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** 커버 사진이 없을 때 — 새벽 하늘 그라데이션 + 점선 비행 경로 (여행 느낌의 기본값). */
export function CoverFallback({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('relative w-full overflow-hidden', className)}
      style={{ background: 'linear-gradient(180deg, hsl(38 74% 90%) 0%, hsl(28 60% 84%) 34%, hsl(183 38% 80%) 100%)' }}
    >
      {/* 해 — 둥근 채로 유지(절대 배치) */}
      <div
        className="absolute right-[15%] top-[24%] h-9 w-9 rounded-full sm:h-11 sm:w-11"
        style={{
          background: 'radial-gradient(circle, hsl(40 92% 76%), hsl(28 84% 66%))',
          boxShadow: '0 0 28px 9px hsl(38 90% 72% / 0.45)',
        }}
      />
      {/* 먼 산·앞 산 실루엣 — 아래 절반만 채워 위쪽 하늘은 비운다(텍스트 가독) */}
      <svg className="absolute inset-x-0 bottom-0 h-[52%] w-full" viewBox="0 0 400 100" preserveAspectRatio="none">
        <path d="M0 100 V52 Q66 20 128 46 T252 38 T400 52 V100 Z" fill="hsl(183 36% 60%)" fillOpacity="0.5" />
        <path d="M0 100 V70 Q90 40 168 64 T318 58 T400 72 V100 Z" fill="hsl(184 44% 40%)" fillOpacity="0.9" />
      </svg>
    </div>
  );
}

/* ── DAY 구획 — 헤더 + 기록 리스트 + 인라인 컴포저 ── */

function DaySection({
  trip, date, dayIndex, records, isToday,
}: {
  trip: Trip;
  date: string;
  dayIndex: number;
  records: DayItem[];
  isToday: boolean;
}) {
  const color = dayColor(dayIndex);
  const [composing, setComposing] = useState(false);

  // 장소 있는 기록에만 번호 (카드 번호 = 핀 번호 불변식)
  let pinNo = 0;

  return (
    <section className="rounded-2xl border border-[hsl(var(--foreground)/0.1)] bg-[hsl(var(--surface-1))] p-4 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.14),0_1px_2px_hsl(var(--foreground)/0.05)]">
      <header className="flex items-baseline gap-2">
        <span className="text-[13px] font-extrabold tracking-wide" style={{ color }}>DAY {dayIndex + 1}</span>
        <span className="text-[12px] text-muted-foreground">{dayHeader(date)}</span>
        {isToday && <span className="rounded-full bg-[hsl(var(--travel-teal))]/12 px-1.5 py-px text-[10px] font-bold text-[hsl(var(--travel-teal))]">오늘</span>}
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground/70">{records.length > 0 && `${records.length}개`}</span>
      </header>

      {records.length > 0 && (
        <ul className="mt-3 space-y-0.5">
          {records.map((r) => {
            const numbered = r.place ? ++pinNo : undefined;
            return <RecordRow key={r.id} record={r} number={numbered} color={color} />;
          })}
        </ul>
      )}

      {composing ? (
        <RecordComposer trip={trip} date={date} color={color} onClose={() => setComposing(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[hsl(var(--hairline))] py-2 text-[12.5px] text-muted-foreground transition-colors hover:border-[hsl(var(--travel-teal))]/45 hover:text-[hsl(var(--travel-teal))]"
        >
          <Plus className="h-3.5 w-3.5" /> 기록 추가
        </button>
      )}
    </section>
  );
}

function RecordRow({ record, number, color }: { record: DayItem; number?: number; color: string }) {
  const meta = DAY_ITEM_META[record.kind];
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const attach = async (file: File | undefined) => {
    setBusy(true);
    const src = await pickPhoto(file);
    setBusy(false);
    if (src) daylogStore.update(record.id, { photo: src });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <li className="group/rec flex items-start gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-[hsl(var(--surface-2))]">
      {/* 번호 배지 = 지도 핀 번호. 장소 없는 기록은 점. */}
      {number !== undefined ? (
        <span
          className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums text-white"
          style={{ backgroundColor: color }}
        >
          {number}
        </span>
      ) : (
        <span className="mt-[9px] ml-[8px] mr-[7px] h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${color} 45%, transparent)` }} />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="rounded-full px-1.5 py-px text-[10.5px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${meta.tint} 12%, transparent)`, color: meta.tint }}>
            {meta.emoji} {itemLabel(record)}
          </span>
          {record.place && (
            <span className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-foreground/75">
              <MapPin className="h-3 w-3 text-muted-foreground/70" /> {record.place}
            </span>
          )}
          {record.time && (
            <span className="inline-flex items-center gap-0.5 text-[10.5px] tabular-nums text-muted-foreground/75">
              <Clock className="h-2.5 w-2.5" /> {record.time}
            </span>
          )}
        </div>
        <p className="mt-0.5 break-keep text-[13.5px] leading-relaxed text-foreground/90">{record.text}</p>
      </div>

      {record.photo && (
        <img src={record.photo} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg border border-[hsl(var(--hairline))] object-cover" />
      )}

      {/* hover 전용이면 터치에서 기능을 발견 못 함 — 포커스·터치 기기에선 항상 노출 */}
      <div className="flex shrink-0 items-center gap-1.5 self-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/rec:opacity-100 [@media(hover:none)]:opacity-100">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void attach(e.target.files?.[0])} />
        {!record.photo && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            aria-label="사진 추가"
            title="사진 추가"
            className="p-1 text-muted-foreground/60 transition-colors hover:text-[hsl(var(--travel-teal))]"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            const removed = daylogStore.remove(record.id);
            if (removed) {
              notify.info('기록을 지웠어요', {
                duration: 4000,
                action: { label: '되돌리기', onClick: () => daylogStore.restore(removed) },
              });
            }
          }}
          aria-label="기록 삭제"
          className="p-1 text-muted-foreground/60 transition-colors hover:text-rose-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

/* ── 기록 컴포저 — 종류 칩 + 내용 + 장소·시간·사진 (전부 이 자리에서) ── */

function RecordComposer({ date, color, onClose }: { trip: Trip; date: string; color: string; onClose: () => void }) {
  const [kind, setKind] = useState<DayItemKind>('meal');
  const [mealSlot, setMealSlot] = useState<MealSlot>('lunch');
  const [text, setText] = useState('');
  const [place, setPlace] = useState('');
  const [time, setTime] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    // 사진 압축 중 제출하면 방금 고른 사진이 기록에서 빠진다 — 끝날 때까지 대기
    if (!text.trim() || photoBusy) return;
    const added = daylogStore.add({
      date,
      kind,
      mealSlot: kind === 'meal' ? mealSlot : undefined,
      text,
      place: kind === 'note' ? undefined : place.trim() || undefined,
      time: time || undefined,
      photo: photo ?? undefined,
    });
    if (!added) return; // 저장 실패(quota) — 입력 보존
    setText('');
    setPlace('');
    setTime('');
    setPhoto(null);
  };

  const onPhoto = async (file: File | undefined) => {
    setPhotoBusy(true);
    const src = await pickPhoto(file);
    setPhotoBusy(false);
    if (src) setPhoto(src);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="mt-3 rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] p-3">
      {/* 종류 칩 — 하루 기록과 동일 3종 (+ 끼니), 색 부호화 */}
      <div className="flex flex-wrap items-center gap-1.5">
        {KIND_ORDER.map((k) => {
          const m = DAY_ITEM_META[k];
          const active = k === kind;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn('rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors', !active && 'border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] text-muted-foreground hover:text-foreground')}
              style={active ? { backgroundColor: `color-mix(in srgb, ${m.tint} 14%, transparent)`, borderColor: `color-mix(in srgb, ${m.tint} 45%, transparent)`, color: m.tint } : undefined}
            >
              {m.emoji} {m.label}
            </button>
          );
        })}
        {kind === 'meal' && (
          <span className="ml-1 flex items-center gap-1">
            {MEAL_SLOT_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setMealSlot(s)}
                className={cn(
                  'rounded-full px-2 py-1 text-[11.5px] font-medium transition-colors',
                  s === mealSlot
                    ? 'bg-[hsl(var(--travel-teal))]/12 font-bold text-[hsl(var(--travel-teal))]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {MEAL_SLOT_LABEL[s]}
              </button>
            ))}
          </span>
        )}
      </div>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit(); }}
        placeholder={kind === 'meal' ? '뭘 먹었나요? (예: 쌀국수가 인생이었다)' : kind === 'place' ? '어디에 갔나요?' : '남겨둘 한 줄'}
        autoFocus
        className="mt-2.5 h-10 w-full rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-3 text-[13px] outline-none placeholder:text-muted-foreground/50 focus:border-[hsl(var(--travel-teal))]"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-2.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit(); }}
            placeholder="장소 (지도 핀이 돼요)"
            className="h-9 min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground/50"
          />
        </div>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          aria-label="시간"
          className="h-9 rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-2 text-[12px] tabular-nums text-muted-foreground outline-none focus:border-[hsl(var(--travel-teal))]"
        />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPhoto(e.target.files?.[0])} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={photoBusy}
          aria-label="사진 첨부"
          title="사진 첨부"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] text-muted-foreground transition-colors hover:text-[hsl(var(--travel-teal))] disabled:opacity-40"
        >
          {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </button>
      </div>

      {photo && (
        <div className="mt-2 flex items-center gap-2">
          <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-[hsl(var(--hairline))]">
            <img src={photo} alt="첨부할 사진" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              aria-label="사진 제거"
              className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/55 text-white hover:bg-rose-500"
            >
              <X className="h-2.5 w-2.5" strokeWidth={2.5} />
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground/70">이 기록에 붙어요</span>
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">닫기</button>
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || photoBusy}
          className="rounded-lg px-4 py-1.5 text-[12.5px] font-bold text-white transition-[filter] hover:brightness-105 disabled:opacity-40"
          style={{ backgroundColor: color }}
        >
          추가
        </button>
      </div>
    </div>
  );
}
