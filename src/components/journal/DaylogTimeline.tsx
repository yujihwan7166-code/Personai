/**
 * 데이로그 타임라인 — 하루의 "조각" 층 (일기 회고 층 위에 얹힘).
 *
 * 한 줄 입력 → AI가 종류(식사·한일·간곳·본것·메모)·끼니·시간 분류 → 시간순 카드.
 * 디로그(세로 타임라인) + 하루콩(저마찰 한 줄) 문법. 일기 데이터와 완전 분리.
 */
import { useRef, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { daylogStore } from '@/services/daylogStore';
import { useDaylogDate } from '@/hooks/useDaylog';
import { aiClassifyMoment } from '@/lib/daylog/ai';
import { MEAL_SLOT_LABEL, MOMENT_KIND_META, partOfDay, type DayMoment } from '@/types/daylog';

const PART_ORDER = ['아침', '낮', '저녁', '밤'] as const;

export function DaylogTimeline({ date, className }: { date: string; className?: string }) {
  const moments = useDaylogDate(date);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isToday = date === new Date().toISOString().slice(0, 10);

  const submit = async () => {
    const raw = draft.trim();
    if (!raw || busy) return;
    setBusy(true);
    setDraft('');
    try {
      const c = await aiClassifyMoment(raw);
      daylogStore.add({ text: raw, date, kind: c.kind, mealSlot: c.mealSlot, time: c.time });
    } finally {
      setBusy(false);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
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
      {/* 헤더 + 입력 — "지금 뭐 해?" 한 줄이면 끝 */}
      <div className="flex items-center gap-2">
        <h3 className="shrink-0 text-[13px] font-bold text-[hsl(var(--cream-ink))]/80">
          {isToday ? '오늘의 조각' : '그날의 조각'}
        </h3>
        {moments.length > 0 && (
          <span className="text-[11px] tabular-nums text-[hsl(var(--cream-muted))]/70">{moments.length}</span>
        )}
      </div>
      {isToday && (
        <div className="mt-2.5 flex items-center gap-2 rounded-full border border-[hsl(var(--cream-line))] bg-white/70 px-4 transition-colors focus-within:border-[hsl(var(--cream-accent))]/50">
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
          {busy ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[hsl(var(--cream-accent))]" />
          ) : (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!draft.trim()}
              aria-label="조각 추가"
              className="shrink-0 rounded-full bg-[hsl(var(--cream-accent))]/12 px-2.5 py-1 text-[13px] leading-none text-[hsl(var(--cream-accent))] transition-colors hover:bg-[hsl(var(--cream-accent))]/22 disabled:opacity-35"
            >
              ↵
            </button>
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
  const kindLabel = moment.kind === 'meal' && moment.mealSlot
    ? MEAL_SLOT_LABEL[moment.mealSlot]
    : meta.label;
  return (
    <li className="group/moment relative flex items-baseline gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-white/60">
      {/* 타임라인 점 — 세로선 위에 겹침 */}
      <span
        aria-hidden
        className="absolute -left-[21px] top-[9px] h-2 w-2 rounded-full border-2 border-[hsl(var(--cream-panel))]"
        style={{ backgroundColor: meta.tint }}
      />
      <span className="w-[38px] shrink-0 text-[10.5px] tabular-nums text-[hsl(var(--cream-muted))]/75">{moment.time}</span>
      <span
        className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold"
        style={{ backgroundColor: `color-mix(in srgb, ${meta.tint} 12%, transparent)`, color: meta.tint }}
      >
        {meta.emoji} {kindLabel}
      </span>
      <span className="min-w-0 flex-1 break-keep text-[13px] leading-relaxed text-[hsl(var(--cream-ink))]/90">{moment.text}</span>
      <button
        type="button"
        onClick={() => daylogStore.remove(moment.id)}
        aria-label="조각 삭제"
        className="shrink-0 self-center p-0.5 text-[hsl(var(--cream-muted))]/60 opacity-0 transition-opacity hover:text-rose-500 group-hover/moment:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </li>
  );
}
