/**
 * 하루 기록 레일 — 데일리로그 통합 글쓰기의 우측 파트너.
 *
 * 하루 페이지의 우측(모바일은 아래)에 고정 — 일기 본문을 쓰다가 시선만 옮겨
 * 🍚 먹은 것(끼니) · 📍 간 곳 · ✏️ 메모를 툭툭 추가한다. 즉시 저장(자체 store),
 * 여행 기간의 날짜면 이 기록이 트래블 로그·나의 지도·푸드 로드에도 자동으로 모인다.
 * 스타일은 일기 크림 토큰(--cream-*).
 */
import { useRef, useState } from 'react';
import { ArrowUp, ImagePlus, Loader2, MapPin, Trash2, X } from 'lucide-react';
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

/** 지금 시각으로 끼니를 어림한다 — 점심에 고정해두면 저녁마다 손이 한 번 더 간다. */
function guessMealSlot(): MealSlot {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

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
  const [mealSlot, setMealSlot] = useState<MealSlot>(guessMealSlot);
  const [text, setText] = useState('');
  const [place, setPlace] = useState('');
  const [placeOpen, setPlaceOpen] = useState(false); // 장소는 필요할 때만 펼친다
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
      // 메모로 전환하면 place 입력칸이 숨는데 값이 남아 몰래 제출되는 것 방지
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

  const activeMeta = DAY_ITEM_META[kind];

  return (
    <section className="overflow-hidden rounded-[26px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))]">
      {/* 헤더 */}
      <div className="flex items-baseline gap-2 border-b border-[hsl(var(--cream-line))]/70 px-5 pb-3 pt-4">
        <h3 className="text-[14px] font-bold text-[hsl(var(--cream-ink))]/90">{isToday ? '오늘의 기록' : '이날의 기록'}</h3>
        {items.length > 0 && (
          <span className="text-[11.5px] font-semibold tabular-nums text-[hsl(var(--cream-accent))]">{items.length}</span>
        )}
      </div>

      {/* 컴포저 — 쓰는 칸이 맨 위.
          전엔 종류(3칸) → 끼니(4칸) 를 고르고서야 입력에 닿았다. 한 줄 적자고 두 번 고르는 셈이라
          손이 무거웠다. 이제 바로 적고 Enter, 분류는 아래에서 필요할 때만 손댄다.
          끼니 기본값도 지금 시각으로 어림해 대개 그대로 맞다. */}
      <div className="border-b border-[hsl(var(--cream-line))]/70 bg-white/45 px-4 py-4">
        {/* 내용 + 전송 */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] pl-3 pr-1.5 transition-colors focus-within:border-[hsl(var(--cream-accent))]/55">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit(); }}
            placeholder={kind === 'meal' ? '뭘 먹었나요?' : kind === 'place' ? '어디에 갔나요?' : '남겨둘 한 줄'}
            className="h-10 min-w-0 flex-1 bg-transparent text-[13.5px] text-[hsl(var(--cream-ink))] outline-none placeholder:text-[hsl(var(--cream-muted))]/60"
          />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPhoto(e.target.files?.[0])} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={photoBusy}
            aria-label="사진 첨부"
            title="사진 첨부"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[hsl(var(--cream-muted))] transition-colors hover:bg-[hsl(var(--cream-line))]/40 hover:text-[hsl(var(--cream-ink))] disabled:opacity-40"
          >
            {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" strokeWidth={1.8} />}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() || photoBusy}
            aria-label="기록 추가"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition-[filter] hover:brightness-105 disabled:opacity-35"
            style={{ backgroundColor: activeMeta.tint }}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </div>

        {/* 분류 줄 — 종류 · (먹은 것이면) 끼니 · 장소 토글이 한 줄에 */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {KIND_ORDER.map((k) => {
            const m = DAY_ITEM_META[k];
            const active = k === kind;
            return (
              <button
                key={k}
                type="button"
                onClick={() => { setKind(k); if (k === 'note') setPlaceOpen(false); }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] transition-colors',
                  active ? 'font-bold' : 'font-medium text-[hsl(var(--cream-muted))] hover:text-[hsl(var(--cream-ink))]',
                )}
                style={active ? { color: m.tint, backgroundColor: `color-mix(in srgb, ${m.tint} 12%, transparent)` } : undefined}
              >
                <span className="text-[12.5px] leading-none">{m.emoji}</span>{m.label}
              </button>
            );
          })}

          {kind === 'meal' && (
            <>
              <span aria-hidden className="mx-0.5 h-3 w-px bg-[hsl(var(--cream-line))]" />
              {MEAL_SLOT_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setMealSlot(s)}
                  className={cn(
                    'rounded-full px-2 py-1 text-[11.5px] transition-colors',
                    s === mealSlot
                      ? 'bg-[hsl(var(--cream-accent))]/12 font-bold text-[hsl(var(--cream-accent))]'
                      : 'font-medium text-[hsl(var(--cream-muted))] hover:text-[hsl(var(--cream-ink))]',
                  )}
                >
                  {MEAL_SLOT_LABEL[s]}
                </button>
              ))}
            </>
          )}

          {kind !== 'note' && !placeOpen && (
            <button
              type="button"
              onClick={() => setPlaceOpen(true)}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-medium text-[hsl(var(--cream-muted))] transition-colors hover:text-[hsl(var(--cream-ink))]"
              title="적어두면 나의 지도에 핀이 돼요"
            >
              <MapPin className="h-3 w-3" /> 장소
            </button>
          )}
        </div>

        {/* 장소 — 눌렀을 때만. 늘 펼쳐두면 안 쓰는 날에도 한 줄을 차지한다 */}
        {kind !== 'note' && placeOpen && (
          <div className="mt-1.5 flex items-center gap-1.5 rounded-xl border border-[hsl(var(--cream-line))]/70 bg-[hsl(var(--cream-card))]/60 px-3 transition-colors focus-within:border-[hsl(var(--cream-accent))]/45">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--cream-muted))]/55" />
            <input
              autoFocus
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit(); }}
              placeholder="어디에서? — 지도에 핀이 돼요"
              className="h-8 min-w-0 flex-1 bg-transparent text-[12.5px] text-[hsl(var(--cream-ink))]/85 outline-none placeholder:text-[hsl(var(--cream-muted))]/50"
            />
            <button
              type="button"
              onClick={() => { setPlace(''); setPlaceOpen(false); }}
              aria-label="장소 접기"
              className="shrink-0 rounded p-1 text-[hsl(var(--cream-muted))]/60 transition-colors hover:text-[hsl(var(--cream-ink))]"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* 첨부 대기 사진 */}
        {photo && (
          <div className="mt-2 flex items-center gap-2">
            <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-[hsl(var(--cream-line))]">
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

      {/* 목록 */}
      <div className="px-4 py-3.5">
        {items.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-[hsl(var(--cream-muted))]/60">
            {isToday ? '오늘 먹은 것, 간 곳을 남겨보세요.' : '이날 남긴 기록이 없어요.'}
          </p>
        ) : (
          <div className="space-y-4">
            <ItemGroup title="먹은 것" emoji="🍚" list={meals} showSlot />
            <ItemGroup title="간 곳" emoji="📍" list={places} />
            <ItemGroup title="메모" emoji="✏️" list={notes} />
          </div>
        )}
      </div>
    </section>
  );
}

function ItemGroup({ title, emoji, list, showSlot }: { title: string; emoji: string; list: DayItem[]; showSlot?: boolean }) {
  if (list.length === 0) return null;
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-[hsl(var(--cream-muted))]/85">
        <span>{emoji}</span> {title}
        <span className="tabular-nums font-medium text-[hsl(var(--cream-muted))]/55">{list.length}</span>
      </p>
      <ul>
        {list.map((item) => (
          <ItemRow key={item.id} item={item} showSlot={showSlot} />
        ))}
      </ul>
    </div>
  );
}

function ItemRow({ item, showSlot }: { item: DayItem; showSlot?: boolean }) {
  return (
    <li className="group/di -mx-2 flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/60">
      {showSlot && item.mealSlot && (
        <span className="w-[34px] shrink-0 rounded-md bg-[hsl(var(--cream-line))]/45 py-0.5 text-center text-[10.5px] font-bold text-[hsl(var(--cream-ink))]/70">
          {MEAL_SLOT_LABEL[item.mealSlot]}
        </span>
      )}
      {item.photo && (
        <img src={item.photo} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg border border-[hsl(var(--cream-line))] object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <p className="break-keep text-[12.5px] leading-snug text-[hsl(var(--cream-ink))]/90">{item.text}</p>
        {item.place && (
          <span className="inline-flex items-center gap-0.5 text-[10.5px] text-[hsl(var(--cream-muted))]">
            <MapPin className="h-2.5 w-2.5" /> {item.place}
          </span>
        )}
      </div>
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
        className="shrink-0 p-1 text-[hsl(var(--cream-muted))]/50 opacity-0 transition-opacity hover:text-rose-500 focus-visible:opacity-100 group-hover/di:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
