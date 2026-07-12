/**
 * 하루 기록 블록 — 데일리로그의 통합 글쓰기 핵심.
 *
 * 하루 페이지(보기/편집 모두) 아래에 항상 떠 있어, 일기 본문과 같은 자리에서
 * 🍚 먹은 것(끼니) · 📍 간 곳 · ✏️ 메모를 툭툭 추가한다. 즉시 저장(자체 store),
 * 일기 저장 버튼과 무관. 여행 기간의 날짜면 이 기록이 트래블 로그에도 자동으로 모인다.
 * 스타일은 일기 크림 토큰(--cream-*) — 데일리로그 방 안에서만 쓴다.
 */
import { useRef, useState } from 'react';
import { ImagePlus, Loader2, MapPin, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { compressImage } from '@/lib/journalImage';
import { daylogStore } from '@/services/daylogStore';
import { useDaylogItems } from '@/hooks/useDaylog';
import {
  DAY_ITEM_META,
  MEAL_SLOT_LABEL,
  MEAL_SLOT_ORDER,
  type DayItem,
  type DayItemKind,
  type MealSlot,
} from '@/types/daylog';
import { todayKey } from '@/types/travel';

const KIND_ORDER: DayItemKind[] = ['meal', 'place', 'note'];

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

export function DayItemsBlock({ date }: { date: string }) {
  const items = useDaylogItems(date);
  const isToday = date === todayKey();
  const [kind, setKind] = useState<DayItemKind>('meal');
  const [mealSlot, setMealSlot] = useState<MealSlot>('lunch');
  const [text, setText] = useState('');
  const [place, setPlace] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const meals = items
    .filter((i) => i.kind === 'meal')
    .sort((a, b) => MEAL_SLOT_ORDER.indexOf(a.mealSlot ?? 'snack') - MEAL_SLOT_ORDER.indexOf(b.mealSlot ?? 'snack'));
  const places = items.filter((i) => i.kind === 'place');
  const notes = items.filter((i) => i.kind === 'note');

  const submit = () => {
    if (!text.trim() || photoBusy) return;
    const added = daylogStore.add({
      date,
      kind,
      mealSlot: kind === 'meal' ? mealSlot : undefined,
      text,
      // 메모로 전환하면 place 입력칸이 숨는데 값이 남아 몰래 제출되는 것 방지 (mealSlot 과 동일 게이트)
      place: kind === 'note' ? undefined : place.trim() || undefined,
      photo: photo ?? undefined,
    });
    if (!added) return; // 저장 실패(quota) — 입력 보존
    setText('');
    setPlace('');
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
    <section className="mt-4 rounded-[26px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-5">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[13.5px] font-bold text-[hsl(var(--cream-ink))]/85">{isToday ? '오늘의 기록' : '이날의 기록'}</h3>
        {items.length > 0 && (
          <span className="text-[11px] tabular-nums text-[hsl(var(--cream-muted))]/70">{items.length}</span>
        )}
        <span className="text-[11px] text-[hsl(var(--cream-muted))]/60">먹은 것 · 간 곳 · 메모 — 여행 기간이면 트래블 로그에도 모여요</span>
      </div>

      {/* 컴포저 — 종류 → (끼니) → 내용·장소·사진 */}
      <div className="mt-3 rounded-2xl border border-[hsl(var(--cream-line))] bg-white/55 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {KIND_ORDER.map((k) => {
            const m = DAY_ITEM_META[k];
            const active = k === kind;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors',
                  !active && 'border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] text-[hsl(var(--cream-muted))] hover:text-[hsl(var(--cream-ink))]',
                )}
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
                    'rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
                    s === mealSlot
                      ? 'bg-[hsl(var(--cream-accent))]/14 font-bold text-[hsl(var(--cream-accent))]'
                      : 'text-[hsl(var(--cream-muted))] hover:text-[hsl(var(--cream-ink))]',
                  )}
                >
                  {MEAL_SLOT_LABEL[s]}
                </button>
              ))}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit(); }}
            placeholder={kind === 'meal' ? '뭘 먹었나요?' : kind === 'place' ? '어디에 갔나요?' : '남겨둘 한 줄'}
            className="h-10 min-w-[160px] flex-1 rounded-lg border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-3 text-[13px] outline-none placeholder:text-[hsl(var(--cream-muted))]/55 focus:border-[hsl(var(--cream-accent))]"
          />
          {kind !== 'note' && (
            <div className="flex min-w-[130px] items-center gap-1.5 rounded-lg border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-2.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--cream-muted))]/60" />
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit(); }}
                placeholder="장소 (지도 핀)"
                className="h-9 w-full bg-transparent text-[12px] outline-none placeholder:text-[hsl(var(--cream-muted))]/55"
              />
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPhoto(e.target.files?.[0])} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={photoBusy}
            aria-label="사진 첨부"
            title="사진 첨부"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] text-[hsl(var(--cream-muted))] transition-colors hover:text-[hsl(var(--cream-accent))] disabled:opacity-40"
          >
            {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() || photoBusy}
            className="h-10 shrink-0 rounded-lg bg-[hsl(var(--cream-dark))] px-4 text-[12.5px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            추가
          </button>
        </div>

        {photo && (
          <div className="mt-2 flex items-center gap-2">
            <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-[hsl(var(--cream-line))]">
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
            <span className="text-[11px] text-[hsl(var(--cream-muted))]/70">이 기록에 붙어요</span>
          </div>
        )}
      </div>

      {/* 목록 — 먹은 것 / 간 곳 / 메모 */}
      {items.length > 0 && (
        <div className="mt-4 space-y-4">
          <ItemGroup title="먹은 것" emoji="🍚" list={meals} showSlot />
          <ItemGroup title="간 곳" emoji="📍" list={places} />
          <ItemGroup title="메모" emoji="✏️" list={notes} />
        </div>
      )}
    </section>
  );
}

function ItemGroup({ title, emoji, list, showSlot }: { title: string; emoji: string; list: DayItem[]; showSlot?: boolean }) {
  if (list.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold text-[hsl(var(--cream-muted))]/85">
        {emoji} {title} <span className="tabular-nums font-medium text-[hsl(var(--cream-muted))]/60">{list.length}</span>
      </p>
      <ul className="space-y-1">
        {list.map((item) => (
          <ItemRow key={item.id} item={item} showSlot={showSlot} />
        ))}
      </ul>
    </div>
  );
}

function ItemRow({ item, showSlot }: { item: DayItem; showSlot?: boolean }) {
  const meta = DAY_ITEM_META[item.kind];
  return (
    <li className="group/di flex items-start gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/60">
      {showSlot && item.mealSlot ? (
        <span className="mt-0.5 w-[34px] shrink-0 rounded-md bg-[hsl(var(--cream-line))]/45 py-0.5 text-center text-[10.5px] font-bold text-[hsl(var(--cream-ink))]/70">
          {MEAL_SLOT_LABEL[item.mealSlot]}
        </span>
      ) : (
        <span className="mt-[8px] ml-[13px] mr-[13px] h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${meta.tint} 55%, transparent)` }} />
      )}
      <div className="min-w-0 flex-1">
        <p className="break-keep text-[13px] leading-relaxed text-[hsl(var(--cream-ink))]/90">{item.text}</p>
        {item.place && (
          <span className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] text-[hsl(var(--cream-muted))]">
            <MapPin className="h-2.5 w-2.5" /> {item.place}
          </span>
        )}
      </div>
      {item.photo && (
        <img src={item.photo} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg border border-[hsl(var(--cream-line))] object-cover" />
      )}
      <button
        type="button"
        onClick={() => {
          const removed = daylogStore.remove(item.id);
          if (removed) {
            notify.info('기록을 지웠어요', {
              duration: 4000,
              action: { label: '되돌리기', onClick: () => daylogStore.restore(removed) },
            });
          }
        }}
        aria-label="기록 삭제"
        className="shrink-0 self-center p-1 text-[hsl(var(--cream-muted))]/55 opacity-0 transition-opacity hover:text-rose-500 focus-visible:opacity-100 group-hover/di:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
