/**
 * 데이로그 타임라인 — 하루의 "조각" 층 (일기 회고 층 위에 얹힘).
 *
 * 한 줄 입력 → AI가 종류(식사·한일·간곳·본것·메모)·끼니·시간·장소 분류 → 시간순 카드.
 * 조각마다 사진 한 장 첨부 가능 (먹은 것·순간 기록). 디로그(세로 타임라인) + 하루콩(저마찰 한 줄) 문법.
 * 일기(회고) 데이터와 완전 분리된 daylogStore 사용.
 */
import { useRef, useState } from 'react';
import { ImagePlus, Loader2, MapPin, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { compressImage } from '@/lib/journalImage';
import { daylogStore } from '@/services/daylogStore';
import { useDaylogDate } from '@/hooks/useDaylog';
import { aiClassifyMoment } from '@/lib/daylog/ai';
import { MEAL_SLOT_LABEL, MOMENT_KIND_META, partOfDay, type DayMoment } from '@/types/daylog';

const PART_ORDER = ['아침', '낮', '저녁', '밤'] as const;

/** 파일 하나 압축 → data URL. 실패 시 null + 토스트. */
async function pickCompressed(file: File | undefined): Promise<string | null> {
  if (!file) return null;
  if (!file.type.startsWith('image/')) {
    notify.warning('이미지 파일만 첨부할 수 있어요', { duration: 1500 });
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

export function DaylogTimeline({ date, className }: { date: string; className?: string }) {
  const moments = useDaylogDate(date);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const newFileRef = useRef<HTMLInputElement>(null);
  const isToday = date === new Date().toISOString().slice(0, 10);

  const submit = async () => {
    const raw = draft.trim();
    if ((!raw && !pendingPhoto) || busy) return;
    setBusy(true);
    const photo = pendingPhoto ?? undefined;
    setDraft('');
    setPendingPhoto(null);
    try {
      const c = raw ? await aiClassifyMoment(raw) : { kind: 'note' as const };
      daylogStore.add({
        text: raw || (photo ? '사진' : ''),
        date,
        kind: c.kind,
        mealSlot: 'mealSlot' in c ? c.mealSlot : undefined,
        time: 'time' in c ? c.time : undefined,
        place: 'place' in c ? c.place : undefined,
        photo,
      });
    } finally {
      setBusy(false);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const onNewPhoto = async (file: File | undefined) => {
    setPhotoBusy(true);
    const src = await pickCompressed(file);
    setPhotoBusy(false);
    if (src) setPendingPhoto(src);
    if (newFileRef.current) newFileRef.current.value = '';
  };

  // 시간대 구획으로 그룹 (아침→밤 순서 고정)
  const groups = PART_ORDER
    .map((part) => [part, moments.filter((m) => partOfDay(m.time) === part)] as const)
    .filter(([, list]) => list.length > 0);

  return (
    <section
      className={cn(
        'rounded-[26px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))]/70 px-5 py-4',
        className,
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <h3 className="shrink-0 text-[13px] font-bold text-[hsl(var(--cream-ink))]/80">
          {isToday ? '오늘의 조각' : '그날의 조각'}
        </h3>
        {moments.length > 0 && (
          <span className="text-[11px] tabular-nums text-[hsl(var(--cream-muted))]/70">{moments.length}</span>
        )}
      </div>

      {/* 입력 — "지금 뭐 해?" 한 줄 + 사진 첨부 */}
      {isToday && (
        <div className="mt-2.5">
          <div className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--cream-line))] bg-white/70 pl-4 pr-2 transition-colors focus-within:border-[hsl(var(--cream-accent))]/50">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) void submit();
              }}
              placeholder="지금 뭐 해? 뭐 먹었어? — 한 줄이면 돼요"
              aria-label="오늘의 조각 입력"
              className="h-10 min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-[hsl(var(--cream-muted))]/60"
            />
            <input
              ref={newFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onNewPhoto(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => newFileRef.current?.click()}
              disabled={photoBusy}
              aria-label="사진 첨부"
              title="사진 첨부"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[hsl(var(--cream-muted))] transition-colors hover:bg-[hsl(var(--cream-accent))]/10 hover:text-[hsl(var(--cream-accent))] disabled:opacity-40"
            >
              {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-[18px] w-[18px]" strokeWidth={1.8} />}
            </button>
            {busy ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--cream-accent))]" />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!draft.trim() && !pendingPhoto}
                aria-label="조각 추가"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--cream-accent))]/12 text-[15px] leading-none text-[hsl(var(--cream-accent))] transition-colors hover:bg-[hsl(var(--cream-accent))]/22 disabled:opacity-35"
              >
                ↵
              </button>
            )}
          </div>
          {/* 첨부 대기 사진 미리보기 */}
          {pendingPhoto && (
            <div className="mt-2 flex items-center gap-2 pl-1">
              <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-[hsl(var(--cream-line))]">
                <img src={pendingPhoto} alt="첨부할 사진" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPendingPhoto(null)}
                  aria-label="사진 제거"
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/55 text-white hover:bg-rose-500"
                >
                  <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                </button>
              </div>
              <span className="text-[11px] text-[hsl(var(--cream-muted))]/70">사진이 이 조각에 붙어요</span>
            </div>
          )}
        </div>
      )}

      {/* 타임라인 — 시간대 구획 + 세로선 + 조각 카드 */}
      {moments.length === 0 ? (
        !isToday && (
          <p className="mt-2 text-[12px] italic text-[hsl(var(--cream-muted))]/55">이날은 남긴 조각이 없어요.</p>
        )
      ) : (
        <div className="mt-3 space-y-3">
          {groups.map(([part, list]) => (
            <div key={part}>
              <p className="mb-1.5 text-[10.5px] font-bold tracking-[0.08em] text-[hsl(var(--cream-muted))]/80">{part}</p>
              <ul className="ml-1 space-y-1 border-l-2 border-[hsl(var(--cream-line))]/80 pl-3.5">
                {list.map((m) => (
                  <MomentRow key={m.id} moment={m} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MomentRow({ moment }: { moment: DayMoment }) {
  const meta = MOMENT_KIND_META[moment.kind];
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const kindLabel = moment.kind === 'meal' && moment.mealSlot
    ? MEAL_SLOT_LABEL[moment.mealSlot]
    : meta.label;

  const attachPhoto = async (file: File | undefined) => {
    setPhotoBusy(true);
    const src = await pickCompressed(file);
    setPhotoBusy(false);
    if (src) daylogStore.update(moment.id, { photo: src });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <li className="group/moment relative flex items-start gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-white/60">
      {/* 타임라인 점 — 세로선 위에 겹침 */}
      <span
        aria-hidden
        className="absolute -left-[21px] top-[9px] h-2 w-2 rounded-full border-2 border-[hsl(var(--cream-panel))]"
        style={{ backgroundColor: meta.tint }}
      />
      <span className="mt-[3px] w-[38px] shrink-0 text-[10.5px] tabular-nums text-[hsl(var(--cream-muted))]/75">{moment.time}</span>

      {moment.photo && (
        <img
          src={moment.photo}
          alt=""
          loading="lazy"
          className="mt-0.5 h-11 w-11 shrink-0 rounded-lg border border-[hsl(var(--cream-line))] object-cover"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold"
            style={{ backgroundColor: `color-mix(in srgb, ${meta.tint} 12%, transparent)`, color: meta.tint }}
          >
            {meta.emoji} {kindLabel}
          </span>
          {moment.place && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[hsl(var(--cream-line))]/45 px-1.5 py-px text-[10px] text-[hsl(var(--cream-ink))]/70">
              <MapPin className="h-2.5 w-2.5" /> {moment.place}
            </span>
          )}
        </div>
        <p className="mt-0.5 break-keep text-[13px] leading-relaxed text-[hsl(var(--cream-ink))]/90">{moment.text}</p>
      </div>

      {/* hover 액션 — 사진 추가/삭제 */}
      <div className="flex shrink-0 items-center gap-0.5 self-center opacity-0 transition-opacity group-hover/moment:opacity-100">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void attachPhoto(e.target.files?.[0])}
        />
        {!moment.photo && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={photoBusy}
            aria-label="사진 추가"
            title="사진 추가"
            className="p-0.5 text-[hsl(var(--cream-muted))]/60 transition-colors hover:text-[hsl(var(--cream-accent))]"
          >
            {photoBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => daylogStore.remove(moment.id)}
          aria-label="조각 삭제"
          className="p-0.5 text-[hsl(var(--cream-muted))]/60 transition-colors hover:text-rose-500"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </li>
  );
}
