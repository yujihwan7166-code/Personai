/**
 * 내 공간 위젯 11종 모음 — 각 위젯은 단일 책임, 작은 컴포넌트.
 *
 * 구성: Bookmark · Memo · Checklist · Calculator · WorldClock · Timer
 *      QuickValue · Weather · Exchange · Calendar · ExpertShortcut
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Play, Pause, RotateCcw, Check, Plus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetFrame } from './WidgetFrame';
import type {
  BookmarkWidget, MemoWidget, ChecklistWidget, CalculatorWidget,
  WorldClockWidget, TimerWidget, QuickValueWidget, WeatherWidget,
  ExchangeWidget, CalendarWidget, ExpertShortcutWidget, WidgetItem,
} from '@/lib/mySpaceStore';
import { updateWidget, removeWidget } from '@/lib/mySpaceStore';

/** 공통 props — 읽기/쓰기 모두 store 경유. */
interface WProps<T extends WidgetItem> {
  widget: T;
  editable?: boolean;
}

// ────────────────────────────────────────────────────────
// 1. Bookmark
// ────────────────────────────────────────────────────────
export function BookmarkW({ widget, editable }: WProps<BookmarkWidget>) {
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(widget.url)}&sz=32`;
  return (
    <WidgetFrame onRemove={editable ? () => removeWidget(widget.id) : undefined}>
      <a
        href={widget.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 min-w-0"
      >
        <img src={faviconUrl} alt="" className="h-4 w-4 rounded shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span className="text-[11.5px] font-medium truncate flex-1">{widget.title}</span>
        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
      </a>
    </WidgetFrame>
  );
}

// ────────────────────────────────────────────────────────
// 2. Memo
// ────────────────────────────────────────────────────────
export function MemoW({ widget, editable }: WProps<MemoWidget>) {
  const [body, setBody] = useState(widget.body);
  const commitRef = useRef<number | null>(null);
  const onChange = (v: string) => {
    setBody(v);
    if (commitRef.current) window.clearTimeout(commitRef.current);
    commitRef.current = window.setTimeout(() => updateWidget<MemoWidget>(widget.id, { body: v }), 400);
  };
  return (
    <WidgetFrame title={widget.title ?? '메모'} onRemove={editable ? () => removeWidget(widget.id) : undefined}>
      <textarea
        value={body}
        onChange={(e) => onChange(e.target.value)}
        placeholder="메모…"
        className="w-full min-h-[48px] bg-transparent outline-none resize-none text-[11.5px] leading-relaxed placeholder:text-muted-foreground/60"
        rows={3}
      />
    </WidgetFrame>
  );
}

// ────────────────────────────────────────────────────────
// 3. Checklist
// ────────────────────────────────────────────────────────
export function ChecklistW({ widget, editable }: WProps<ChecklistWidget>) {
  const [draft, setDraft] = useState('');
  const toggle = (id: string) => {
    updateWidget<ChecklistWidget>(widget.id, {
      items: widget.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
    });
  };
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    updateWidget<ChecklistWidget>(widget.id, {
      items: [...widget.items, { id: `c_${Date.now()}`, text, done: false }],
    });
    setDraft('');
  };
  const removeItem = (id: string) => {
    updateWidget<ChecklistWidget>(widget.id, { items: widget.items.filter((i) => i.id !== id) });
  };
  return (
    <WidgetFrame title={widget.title} onRemove={editable ? () => removeWidget(widget.id) : undefined}>
      <ul className="space-y-1 mb-1.5 max-h-[120px] overflow-y-auto">
        {widget.items.map((it) => (
          <li key={it.id} className="group/item flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggle(it.id)}
              className={cn(
                'h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0',
                it.done ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40 hover:border-foreground',
              )}
            >
              {it.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
            </button>
            <span className={cn('text-[11px] flex-1 truncate', it.done && 'line-through text-muted-foreground')}>
              {it.text}
            </span>
            <button
              type="button"
              onClick={() => removeItem(it.id)}
              className="opacity-0 group-hover/item:opacity-100 text-[9px] text-muted-foreground hover:text-destructive"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="할 일 추가"
          className="flex-1 min-w-0 h-6 px-1.5 text-[10.5px] rounded bg-[hsl(var(--muted))] outline-none focus:ring-1 focus:ring-[hsl(var(--focus-ring))]"
        />
        <button type="button" onClick={add} className="h-6 w-6 rounded bg-[hsl(var(--muted))] flex items-center justify-center hover:bg-[hsl(var(--accent))]">
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </WidgetFrame>
  );
}

// ────────────────────────────────────────────────────────
// 4. Calculator (인라인 미니)
// ────────────────────────────────────────────────────────
export function CalculatorW({ widget, editable }: WProps<CalculatorWidget>) {
  const [expr, setExpr] = useState('');
  const result = useMemo(() => {
    const e = expr.replace(/[^0-9+\-*/().% ]/g, '');
    if (!e.trim()) return '';
    try {
      const v = Function(`"use strict";return (${e})`)();
      if (typeof v === 'number' && Number.isFinite(v)) return String(Math.round(v * 1e8) / 1e8);
      return '';
    } catch { return ''; }
  }, [expr]);
  return (
    <WidgetFrame title="계산기" onRemove={editable ? () => removeWidget(widget.id) : undefined}>
      <input
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        placeholder="2+2*3"
        className="w-full h-7 px-2 text-[12px] font-mono rounded bg-[hsl(var(--muted))] outline-none focus:ring-1 focus:ring-[hsl(var(--focus-ring))]"
      />
      <div className="text-right mt-1 text-[13px] font-mono font-semibold h-4">
        {result || <span className="text-muted-foreground/50">=</span>}
      </div>
    </WidgetFrame>
  );
}

// ────────────────────────────────────────────────────────
// 5. WorldClock
// ────────────────────────────────────────────────────────
export function WorldClockW({ widget, editable }: WProps<WorldClockWidget>) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const timeStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ko-KR', { timeZone: widget.timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
    } catch { return '—'; }
  }, [now, widget.timeZone]);
  return (
    <WidgetFrame onRemove={editable ? () => removeWidget(widget.id) : undefined}>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[17px] font-mono font-semibold tabular-nums">{timeStr}</span>
        <span className="text-[10.5px] text-muted-foreground truncate">{widget.label}</span>
      </div>
    </WidgetFrame>
  );
}

// ────────────────────────────────────────────────────────
// 6. Timer (뽀모도로)
// ────────────────────────────────────────────────────────
export function TimerW({ widget, editable }: WProps<TimerWidget>) {
  const [secondsLeft, setSecondsLeft] = useState(widget.minutes * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { setRunning(false); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  return (
    <WidgetFrame title={widget.label} onRemove={editable ? () => removeWidget(widget.id) : undefined}>
      <div className="flex items-center gap-1.5">
        <span className="text-[16px] font-mono font-semibold tabular-nums flex-1">{mm}:{ss}</span>
        <button type="button" onClick={() => setRunning((v) => !v)} className="h-6 w-6 rounded bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] flex items-center justify-center">
          {running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>
        <button type="button" onClick={() => { setRunning(false); setSecondsLeft(widget.minutes * 60); }} className="h-6 w-6 rounded bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] flex items-center justify-center">
          <RotateCcw className="h-3 w-3" />
        </button>
      </div>
    </WidgetFrame>
  );
}

// ────────────────────────────────────────────────────────
// 7. QuickValue (클릭 복사)
// ────────────────────────────────────────────────────────
export function QuickValueW({ widget, editable }: WProps<QuickValueWidget>) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(widget.value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch { /* noop */ }
  };
  return (
    <WidgetFrame title={widget.label} onRemove={editable ? () => removeWidget(widget.id) : undefined}>
      <button
        type="button"
        onClick={copy}
        className="w-full flex items-center gap-1.5 text-left"
      >
        <span className="text-[12px] font-mono truncate flex-1">{widget.value || <span className="text-muted-foreground/60">비어있음</span>}</span>
        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
      </button>
    </WidgetFrame>
  );
}

// ────────────────────────────────────────────────────────
// 8. Weather (open-meteo — API 키 불필요)
// ────────────────────────────────────────────────────────
export function WeatherW({ widget, editable }: WProps<WeatherWidget>) {
  const [data, setData] = useState<{ temp: number; code: number } | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let canceled = false;
    setErr(false);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${widget.lat}&longitude=${widget.lon}&current=temperature_2m,weather_code`;
    fetch(url).then((r) => r.json()).then((j) => {
      if (canceled) return;
      if (j?.current) setData({ temp: j.current.temperature_2m, code: j.current.weather_code });
      else setErr(true);
    }).catch(() => { if (!canceled) setErr(true); });
    return () => { canceled = true; };
  }, [widget.lat, widget.lon]);
  const icon = weatherIcon(data?.code ?? -1);
  return (
    <WidgetFrame onRemove={editable ? () => removeWidget(widget.id) : undefined}>
      <div className="flex items-center gap-2">
        <span className="text-[18px]" aria-hidden>{icon}</span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold tabular-nums">
            {err ? '—' : data ? `${Math.round(data.temp)}°` : '…'}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">{widget.city}</div>
        </div>
      </div>
    </WidgetFrame>
  );
}

function weatherIcon(code: number): string {
  if (code < 0) return '·';
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌦️';
  if (code <= 99) return '⛈️';
  return '☁️';
}

// ────────────────────────────────────────────────────────
// 9. Exchange Rate (frankfurter.app — API 키 불필요)
// ────────────────────────────────────────────────────────
export function ExchangeW({ widget, editable }: WProps<ExchangeWidget>) {
  const [rate, setRate] = useState<number | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let canceled = false;
    setErr(false);
    fetch(`https://api.frankfurter.app/latest?from=${widget.from}&to=${widget.to}`)
      .then((r) => r.json())
      .then((j) => {
        if (canceled) return;
        const v = j?.rates?.[widget.to];
        if (typeof v === 'number') setRate(v);
        else setErr(true);
      })
      .catch(() => { if (!canceled) setErr(true); });
    return () => { canceled = true; };
  }, [widget.from, widget.to]);
  return (
    <WidgetFrame onRemove={editable ? () => removeWidget(widget.id) : undefined}>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[10px] font-mono text-muted-foreground">{widget.from}→{widget.to}</span>
        <span className="text-[14px] font-semibold tabular-nums flex-1 text-right">
          {err ? '—' : rate !== null ? rate.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '…'}
        </span>
      </div>
    </WidgetFrame>
  );
}

// ────────────────────────────────────────────────────────
// 10. Calendar (이번 달 미니 뷰)
// ────────────────────────────────────────────────────────
export function CalendarW({ widget, editable }: WProps<CalendarWidget>) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return (
    <WidgetFrame title={`${y}. ${m + 1}`} onRemove={editable ? () => removeWidget(widget.id) : undefined}>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['일','월','화','수','목','금','토'].map((w) => (
          <div key={w} className="text-[8px] font-mono text-muted-foreground/70">{w}</div>
        ))}
        {cells.map((d, i) => (
          <div
            key={i}
            className={cn(
              'text-[9px] tabular-nums h-4 flex items-center justify-center rounded',
              d === today.getDate() && 'bg-primary text-primary-foreground font-semibold',
              d !== null && d !== today.getDate() && 'text-foreground/80',
            )}
          >
            {d ?? ''}
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}

// ────────────────────────────────────────────────────────
// 11. Expert Shortcut
// ────────────────────────────────────────────────────────
export function ExpertShortcutW({ widget, editable, onOpen }: WProps<ExpertShortcutWidget> & { onOpen?: (expertId: string) => void }) {
  return (
    <WidgetFrame onRemove={editable ? () => removeWidget(widget.id) : undefined}>
      <button
        type="button"
        onClick={() => onOpen?.(widget.expertId)}
        className="w-full flex items-center gap-2 min-w-0"
      >
        <span className="text-[16px] shrink-0">{widget.emoji ?? '⭐'}</span>
        <span className="text-[11.5px] font-medium truncate flex-1 text-left">{widget.label}</span>
      </button>
    </WidgetFrame>
  );
}

// ────────────────────────────────────────────────────────
// 디스패처
// ────────────────────────────────────────────────────────
export function WidgetRenderer({ widget, editable, onOpenExpert }: { widget: WidgetItem; editable?: boolean; onOpenExpert?: (id: string) => void }) {
  switch (widget.kind) {
    case 'bookmark':   return <BookmarkW widget={widget} editable={editable} />;
    case 'memo':       return <MemoW widget={widget} editable={editable} />;
    case 'checklist':  return <ChecklistW widget={widget} editable={editable} />;
    case 'calculator': return <CalculatorW widget={widget} editable={editable} />;
    case 'worldclock': return <WorldClockW widget={widget} editable={editable} />;
    case 'timer':      return <TimerW widget={widget} editable={editable} />;
    case 'quickvalue': return <QuickValueW widget={widget} editable={editable} />;
    case 'weather':    return <WeatherW widget={widget} editable={editable} />;
    case 'exchange':   return <ExchangeW widget={widget} editable={editable} />;
    case 'calendar':   return <CalendarW widget={widget} editable={editable} />;
    case 'expert':     return <ExpertShortcutW widget={widget} editable={editable} onOpen={onOpenExpert} />;
  }
}
