/**
 * 데일리 브리핑 위젯 9종 (Step 1 — 내 데이터).
 *
 * 각 위젯은 (data, onClose) 받아서 JSX 반환. 카드 wrapper 는 BriefingModal 에서 처리.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, CheckSquare, AlertTriangle, Flag, Flame, Sparkles, NotebookPen,
  ChevronLeft, ChevronRight, Clock as ClockIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BriefingData } from '@/lib/buildBriefingData';
import type { PlacedWidget, WidgetSize } from '@/lib/dailyBriefingStore';
import { stripMarkdown } from '@/lib/journalMarkdown';

const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

interface WidgetProps {
  widget: PlacedWidget;
  data: BriefingData;
  onClose: () => void;
}

// ──────────────────────────────────────────
// 오늘 일정 (M)
export function ScheduleWidget({ data, onClose }: WidgetProps) {
  const navigate = useNavigate();
  const items = data.timed.slice(0, 4);
  return (
    <button
      type="button"
      onClick={() => { onClose(); navigate('/planner'); }}
      className="w-full h-full text-left p-3 flex flex-col"
    >
      <WidgetHeader icon={<Calendar className="h-3.5 w-3.5" />} title="오늘 일정" count={data.timed.length} />
      {items.length === 0 ? (
        <EmptyText text="시간 잡힌 항목 없음" />
      ) : (
        <ul className="mt-1.5 space-y-1 flex-1 overflow-hidden">
          {items.map((it, i) => (
            <li key={i} className="flex items-baseline gap-2 text-[12.5px] leading-tight">
              <span className="tabular-nums font-mono text-foreground/60 text-[11px] shrink-0 w-[44px]">{fmtTime(it.startAt)}</span>
              <span className={cn('flex-1 min-w-0 truncate text-foreground', it.done && 'line-through text-muted-foreground')}>
                {it.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}

// ──────────────────────────────────────────
// 오늘 할일 (M)
export function TasksWidget({ data, onClose }: WidgetProps) {
  const navigate = useNavigate();
  const items = data.inbox.slice(0, 5);
  return (
    <button
      type="button"
      onClick={() => { onClose(); navigate('/planner'); }}
      className="w-full h-full text-left p-3 flex flex-col"
    >
      <WidgetHeader icon={<CheckSquare className="h-3.5 w-3.5" />} title="오늘 할일" count={data.inbox.length} />
      {items.length === 0 ? (
        <EmptyText text="대기 중 할일 없음" />
      ) : (
        <ul className="mt-1.5 space-y-1 flex-1 overflow-hidden">
          {items.map((t) => (
            <li key={t.id} className="flex items-baseline gap-2 text-[12.5px] leading-tight">
              {(t.priority ?? 0) > 0 ? (
                <Flag className={cn(
                  'h-2.5 w-2.5 shrink-0 mt-0.5',
                  t.priority === 3 && 'text-rose-500 fill-rose-500',
                  t.priority === 2 && 'text-amber-500 fill-amber-500',
                  t.priority === 1 && 'text-blue-500 fill-blue-500',
                )} />
              ) : (
                <span className="h-1 w-1 rounded-full bg-muted-foreground/55 shrink-0 mt-1.5" />
              )}
              <span className="flex-1 min-w-0 truncate text-foreground">{t.title}</span>
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}

// ──────────────────────────────────────────
// 달력 (L) — 한 달 그리드
const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarWidget({ data, onClose }: WidgetProps) {
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(() => new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const cells: Array<{ day: number; isToday: boolean; key: string } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = isThisMonth && d === today.getDate();
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, isToday, key });
  }

  const handleCellClick = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    onClose();
    navigate('/planner');
  };

  return (
    <div className="w-full h-full p-3 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center gap-1 mb-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setViewDate(new Date(year, month - 1, 1)); }}
          className="h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="이전 달"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => { onClose(); navigate('/planner'); }}
          className="flex-1 text-[12px] font-semibold text-foreground/85 text-center hover:text-foreground"
        >
          {year}년 {month + 1}월
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setViewDate(new Date(year, month + 1, 1)); }}
          className="h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="다음 달"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      {/* 요일 */}
      <div className="grid grid-cols-7 gap-0.5 text-[9.5px] font-medium text-muted-foreground/75 mb-0.5">
        {WEEKDAY_KR.map((w, i) => (
          <div key={w} className={cn('text-center', i === 0 && 'text-rose-500/70', i === 6 && 'text-blue-500/70')}>{w}</div>
        ))}
      </div>
      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-0.5 flex-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const mark = isThisMonth ? data.monthMarks[cell.key] : undefined;
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => handleCellClick(e, cell.key)}
              className={cn(
                'relative aspect-square text-[10.5px] rounded flex flex-col items-center justify-center transition-colors',
                cell.isToday
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'text-foreground/85 hover:bg-accent',
                i % 7 === 0 && !cell.isToday && 'text-rose-500/85',
                i % 7 === 6 && !cell.isToday && 'text-blue-500/85',
              )}
            >
              <span>{cell.day}</span>
              {mark && (
                <span className={cn(
                  'absolute bottom-0.5 inline-flex gap-0.5',
                )}>
                  {mark.events > 0 && <span className={cn('w-1 h-1 rounded-full', cell.isToday ? 'bg-white/80' : 'bg-primary')} />}
                  {mark.tasks > 0 && <span className={cn('w-1 h-1 rounded-full', cell.isToday ? 'bg-white/60' : 'bg-amber-500')} />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 습관 (S/M)
export function HabitsWidget({ widget, data, onClose }: WidgetProps) {
  const navigate = useNavigate();
  const done = data.habits.filter((h) => h.done).length;
  const total = data.habits.length;
  const limit = widget.size === 'M' ? 5 : 3;
  return (
    <button
      type="button"
      onClick={() => { onClose(); navigate('/planner'); }}
      className="w-full h-full text-left p-3 flex flex-col"
    >
      <WidgetHeader icon={<Flame className="h-3.5 w-3.5" />} title="습관" count={`${done}/${total}`} />
      {total === 0 ? (
        <EmptyText text="활성 습관 없음" />
      ) : (
        <ul className="mt-1.5 space-y-1 flex-1 overflow-hidden">
          {data.habits.slice(0, limit).map((h) => (
            <li key={h.id} className="flex items-center gap-1.5 text-[12px] leading-tight">
              <span className={cn(
                'h-3 w-3 rounded-full shrink-0 inline-flex items-center justify-center text-[9px] font-bold',
                h.done ? 'bg-emerald-500 text-white' :
                  h.streakAtRisk ? 'bg-rose-500/15 text-rose-500 ring-1 ring-rose-500/45' :
                    'bg-muted text-muted-foreground/60',
              )}>
                {h.done ? '✓' : h.streakAtRisk ? '!' : ''}
              </span>
              <span className={cn('flex-1 truncate text-foreground', h.done && 'text-muted-foreground line-through')}>
                {h.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}

// ──────────────────────────────────────────
// D-day (S/M)
export function DdayWidget({ widget, data, onClose }: WidgetProps) {
  const navigate = useNavigate();
  const limit = widget.size === 'M' ? 5 : 2;
  return (
    <button
      type="button"
      onClick={() => { onClose(); navigate('/planner'); }}
      className="w-full h-full text-left p-3 flex flex-col"
    >
      <WidgetHeader icon={<Flag className="h-3.5 w-3.5" />} title="D-day" count={data.upcomingDday.length} />
      {data.upcomingDday.length === 0 ? (
        <EmptyText text="가까운 일 없음" />
      ) : (
        <ul className="mt-1.5 space-y-1 flex-1 overflow-hidden">
          {data.upcomingDday.slice(0, limit).map((d, i) => (
            <li key={i} className="flex items-baseline gap-1.5 text-[12px] leading-tight">
              <span className="tabular-nums font-mono text-[10.5px] font-bold text-foreground shrink-0 w-[36px]">
                {d.daysLeft === 0 ? 'D-DAY' : `D-${d.daysLeft}`}
              </span>
              <span className="flex-1 truncate text-foreground/85">{d.label}</span>
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}

// ──────────────────────────────────────────
// 가장 먼저 (M)
export function PickFirstWidget({ data, onClose }: WidgetProps) {
  const navigate = useNavigate();
  if (!data.pickFirst) {
    return (
      <div className="w-full h-full p-3 flex flex-col">
        <WidgetHeader icon={<Sparkles className="h-3.5 w-3.5" />} title="가장 먼저" count="" />
        <EmptyText text="추천할 항목 없음" />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => { onClose(); navigate('/planner'); }}
      className="w-full h-full text-left p-3 flex flex-col bg-gradient-to-br from-primary/8 to-transparent"
    >
      <WidgetHeader icon={<Sparkles className="h-3.5 w-3.5 text-primary" />} title="가장 먼저" count="" tint />
      <div className="mt-1 text-[15px] font-bold text-foreground leading-tight line-clamp-2">{data.pickFirst.title}</div>
      <div className="mt-auto text-[11px] text-muted-foreground">{data.pickFirst.reason}</div>
    </button>
  );
}

// ──────────────────────────────────────────
// 어제 미완료 (S/M)
export function OverdueWidget({ widget, data, onClose }: WidgetProps) {
  const navigate = useNavigate();
  const limit = widget.size === 'M' ? 4 : 2;
  return (
    <button
      type="button"
      onClick={() => { onClose(); navigate('/planner'); }}
      className="w-full h-full text-left p-3 flex flex-col"
    >
      <WidgetHeader icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-500" />} title="어제 미완료" count={data.overdue.length} />
      {data.overdue.length === 0 ? (
        <EmptyText text="다 끝났어요 ✨" />
      ) : (
        <ul className="mt-1.5 space-y-1 flex-1 overflow-hidden">
          {data.overdue.slice(0, limit).map((t) => (
            <li key={t.id} className="text-[12px] text-foreground truncate leading-tight">• {t.title}</li>
          ))}
        </ul>
      )}
    </button>
  );
}

// ──────────────────────────────────────────
// 최근 일기 (M)
export function RecentJournalWidget({ data, onClose }: WidgetProps) {
  const navigate = useNavigate();
  const entry = data.recentJournal;
  return (
    <button
      type="button"
      onClick={() => { onClose(); navigate('/journal'); }}
      className="w-full h-full text-left p-3 flex flex-col"
    >
      <WidgetHeader icon={<NotebookPen className="h-3.5 w-3.5" />} title="최근 일기" count="" />
      {!entry ? (
        <EmptyText text="아직 일기가 없어요. 오늘 한 줄 적어볼까요?" />
      ) : (
        <>
          <div className="mt-1 text-[10.5px] text-muted-foreground/85">
            {new Date(entry.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </div>
          <p className="mt-0.5 text-[12.5px] text-foreground/90 leading-snug line-clamp-3">
            {entry.bodyFormat === 'markdown' ? stripMarkdown(entry.body) : entry.body}
          </p>
        </>
      )}
    </button>
  );
}

// ──────────────────────────────────────────
// 시계 (S)
export function ClockWidget(_: WidgetProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const dateLabel = now.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
  return (
    <div className="w-full h-full p-3 flex flex-col items-center justify-center text-center">
      <ClockIcon className="h-3 w-3 text-muted-foreground absolute top-2 left-2.5" />
      <div className="text-[26px] font-bold tabular-nums tracking-tight text-foreground leading-none">
        {hh}:{mm}
      </div>
      <div className="mt-1.5 text-[10.5px] text-muted-foreground">{dateLabel}</div>
    </div>
  );
}

// ──────────────────────────────────────────
// 외부 정보 placeholder (Step 2 까지 "준비 중")
export function ComingSoonWidget({ widget }: WidgetProps) {
  const meta = WIDGET_META_INLINE[widget.kind];
  return (
    <div className="w-full h-full p-3 flex flex-col items-center justify-center text-center opacity-60">
      <div className="text-2xl mb-1">{meta.emoji}</div>
      <div className="text-[12px] font-semibold text-foreground/75">{meta.label}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">곧 추가</div>
    </div>
  );
}

// inline 의존 회피용 (widgets.tsx 가 store 의 WIDGET_META 를 또 import 안하도록)
const WIDGET_META_INLINE: Record<string, { label: string; emoji: string }> = {
  weather: { label: '날씨', emoji: '🌤' },
  forex: { label: '환율', emoji: '💱' },
  news: { label: '뉴스', emoji: '📰' },
  stock: { label: '주식·코인', emoji: '📈' },
  heatmap: { label: 'S&P 500', emoji: '🟢' },
};

// ──────────────────────────────────────────
// 헬퍼

function WidgetHeader({
  icon, title, count, tint,
}: {
  icon: React.ReactNode;
  title: string;
  count: number | string;
  tint?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('shrink-0', tint ? 'text-primary' : 'text-foreground/65')}>{icon}</span>
      <span className={cn('text-[11px] font-semibold tracking-wide truncate', tint ? 'text-primary' : 'text-foreground/80')}>
        {title}
      </span>
      {count !== '' && (
        <span className="ml-auto text-[10.5px] tabular-nums text-muted-foreground font-medium shrink-0">
          {count}
        </span>
      )}
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <span className="text-[11px] text-muted-foreground/65 italic text-center px-2">{text}</span>
    </div>
  );
}

// ──────────────────────────────────────────
// 위젯 dispatch
import type { WidgetKind } from '@/lib/dailyBriefingStore';

const WIDGET_COMPONENTS: Record<WidgetKind, (p: WidgetProps) => React.ReactElement> = {
  schedule: ScheduleWidget,
  tasks: TasksWidget,
  calendar: CalendarWidget,
  habits: HabitsWidget,
  dday: DdayWidget,
  pickFirst: PickFirstWidget,
  overdue: OverdueWidget,
  recentJournal: RecentJournalWidget,
  clock: ClockWidget,
  // 외부 — placeholder
  weather: ComingSoonWidget,
  forex: ComingSoonWidget,
  news: ComingSoonWidget,
  stock: ComingSoonWidget,
  heatmap: ComingSoonWidget,
};

export function renderWidget(props: WidgetProps): React.ReactElement {
  const Comp = WIDGET_COMPONENTS[props.widget.kind];
  return <Comp {...props} />;
}
