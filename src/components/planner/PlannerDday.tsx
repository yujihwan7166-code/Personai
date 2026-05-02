/**
 * 사이드바 D-day 위젯 — 시험/발표/생일/마감 같은 특별한 날 카운트다운.
 *
 * - list: 가까운 순. D-N (미래) / D-DAY (당일) / D+N (지남, 흐림)
 * - 인라인 추가: 라벨 + 날짜 input → Enter 또는 + 버튼
 * - 호버 시 삭제 버튼
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, Flag, Plus, X } from 'lucide-react';
import { ddayStore } from '@/services/planner/ddayStore';
import { cn } from '@/lib/utils';
import { PLANNER_DDAY_CHANGED, type PlannerDday } from '@/types/planner';

const localDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const computeDday = (dateIso: string, todayKey: string): { label: string; days: number; tone: 'future' | 'today' | 'past' } => {
  // 로컬 자정 기준 날짜 차이.
  const t = new Date(`${todayKey}T00:00:00`);
  const d = new Date(`${dateIso}T00:00:00`);
  const days = Math.round((d.getTime() - t.getTime()) / 86_400_000);
  if (days === 0) return { label: 'D-DAY', days, tone: 'today' };
  if (days > 0) return { label: `D-${days}`, days, tone: 'future' };
  return { label: `D+${-days}`, days, tone: 'past' };
};

export const PlannerDday = () => {
  const [items, setItems] = useState<PlannerDday[]>(() => ddayStore.list());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refresh = () => setItems(ddayStore.list());
    window.addEventListener(PLANNER_DDAY_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_DDAY_CHANGED, refresh);
  }, []);

  const todayKey = localDateKey(new Date());

  // 미래/오늘 우선 노출, 지난 건 뒤로.
  const sorted = useMemo(() => {
    const withDday = items.map((it) => ({ it, dd: computeDday(it.dateIso, todayKey) }));
    return withDday.sort((a, b) => {
      // 지나간 건 뒤로
      const aPast = a.dd.tone === 'past' ? 1 : 0;
      const bPast = b.dd.tone === 'past' ? 1 : 0;
      if (aPast !== bPast) return aPast - bPast;
      return a.dd.days - b.dd.days;
    });
  }, [items, todayKey]);

  return (
    <section className="px-1">
      <div className="flex items-center gap-1.5 px-1.5 mb-1.5">
        <Flag className="h-3.5 w-3.5 text-foreground/70" />
        <span className="text-[12px] font-semibold text-foreground/85 tracking-tight">
          디데이
        </span>
        {items.length > 0 && (
          <span className="text-[10.5px] tabular-nums text-foreground/55">{items.length}</span>
        )}
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="새 디데이"
          className="ml-auto h-5 w-5 inline-flex items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {sorted.length === 0 && !creating ? (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="w-full px-1.5 py-1.5 text-left text-[11.5px] text-foreground/55 hover:text-foreground hover:bg-accent rounded-md transition-colors"
        >
          + 시험·발표 등 카운트다운 추가
        </button>
      ) : (
        <ul className="space-y-0.5">
          {sorted.map(({ it, dd }) => (
            <li
              key={it.id}
              className="group flex items-center gap-2 px-1.5 py-1 rounded hover:bg-accent transition-colors"
            >
              <span
                className={cn(
                  'shrink-0 text-[10.5px] font-mono tabular-nums font-semibold w-[42px]',
                  dd.tone === 'today' && 'text-rose-500',
                  dd.tone === 'future' && 'text-foreground/85',
                  dd.tone === 'past' && 'text-foreground/40',
                )}
              >
                {dd.label}
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-[12px] leading-snug',
                  dd.tone === 'past' ? 'text-foreground/40' : 'text-foreground/90',
                )}
              >
                {it.label}
              </span>
              <button
                type="button"
                onClick={() => ddayStore.remove(it.id)}
                aria-label={`${it.label} 삭제`}
                className="hidden group-hover:flex h-4 w-4 items-center justify-center rounded text-foreground/55 hover:text-rose-500 hover:bg-rose-500/10 shrink-0 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && <NewDdayInput onDone={() => setCreating(false)} />}
    </section>
  );
};

const NewDdayInput = ({ onDone }: { onDone: () => void }) => {
  const [label, setLabel] = useState('');
  const todayKey = localDateKey(new Date());
  const [date, setDate] = useState(todayKey);

  const submit = () => {
    const trimmed = label.trim();
    if (trimmed && date) {
      ddayStore.add({ label: trimmed, dateIso: date });
    }
    onDone();
  };

  return (
    <div
      className="mt-1 flex items-center gap-1 px-1.5 py-1 rounded bg-accent/60"
      // wrapper outside 클릭(focus 가 wrapper 외부로) 시 자동 저장.
      // wrapper 내부 input ↔ date 이동 시는 저장 X (relatedTarget contained).
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        submit();
      }}
    >
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          else if (e.key === 'Escape') onDone();
        }}
        placeholder="라벨"
        className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-foreground/45 text-foreground"
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          else if (e.key === 'Escape') onDone();
        }}
        className="bg-transparent text-[10.5px] tabular-nums text-foreground/85 outline-none w-[100px]"
      />
      <button
        type="button"
        // mousedown 으로 막아 input blur 가 button click 전 submit 되는 race 방지.
        onMouseDown={(e) => e.preventDefault()}
        onClick={submit}
        aria-label="저장"
        title="저장 (Enter)"
        className="h-5 w-5 inline-flex items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors shrink-0"
      >
        <Check className="h-3 w-3" strokeWidth={2.5} />
      </button>
    </div>
  );
};
