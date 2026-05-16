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
import { WIDGET_META, type PlacedWidget, type WidgetSize } from '@/lib/dailyBriefingStore';
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
// 오늘 일정 (M) — 가로 timeline + 리스트
export function ScheduleWidget({ data, onClose }: WidgetProps) {
  const navigate = useNavigate();
  const items = data.timed.slice(0, 3);

  // 0~24h 타임라인 — 현재 시간 + 일정 블록
  const now = new Date();
  const nowPct = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;

  return (
    <button
      type="button"
      onClick={() => { onClose(); navigate('/planner'); }}
      className="w-full h-full text-left p-3.5 flex flex-col"
    >
      <WidgetHeader icon={<Calendar className="h-3.5 w-3.5" />} title="오늘 일정" count={data.timed.length} kind="schedule" />
      {items.length === 0 ? (
        <EmptyText text="오늘은 비어있어요" hint="플래너에서 일정 추가 →" icon={<Calendar className="h-7 w-7" strokeWidth={1.5} />} />
      ) : (
        <>
          {/* 0-24h timeline */}
          <div className="relative mt-2 h-1.5 rounded-full bg-foreground/8 overflow-hidden">
            {data.timed.map((it, i) => {
              const start = new Date(it.startAt);
              const startPct = ((start.getHours() * 60 + start.getMinutes()) / (24 * 60)) * 100;
              const end = it.endAt ? new Date(it.endAt) : null;
              const endPct = end ? ((end.getHours() * 60 + end.getMinutes()) / (24 * 60)) * 100 : startPct + 2;
              const widthPct = Math.max(1.5, endPct - startPct);
              return (
                <div
                  key={i}
                  className={cn(
                    'absolute top-0 h-full rounded-full',
                    it.kind === 'event'
                      ? 'bg-primary/85'
                      : it.done ? 'bg-emerald-500/55' : 'bg-amber-500/85',
                  )}
                  style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                />
              );
            })}
            {/* 현재 시간 marker — rose 핀 (얇은 선 + 상단 dot) */}
            <div
              className="absolute top-[-3px] bottom-[-3px] w-[2px] bg-rose-500/90"
              style={{ left: `${nowPct}%` }}
              title={`지금 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`}
            >
              <span className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_0_2px_hsl(var(--card))]" />
            </div>
          </div>
          <div className="flex justify-between mt-0.5 text-[8.5px] text-muted-foreground/60 tabular-nums">
            <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
          </div>
          {/* 리스트 — top 3 */}
          <ul className="mt-1.5 space-y-0.5 flex-1 overflow-hidden">
            {items.map((it, i) => (
              <li key={i} className="flex items-baseline gap-2 text-[11.5px] leading-tight">
                <span className="tabular-nums font-mono text-foreground/60 text-[10.5px] shrink-0 w-[40px]">{fmtTime(it.startAt)}</span>
                <span className={cn('flex-1 min-w-0 truncate text-foreground', it.done && 'line-through text-muted-foreground')}>
                  {it.title}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </button>
  );
}

// ──────────────────────────────────────────
// 오늘 할일 (M) — 우선순위 분포 dot 표시
export function TasksWidget({ data, onClose }: WidgetProps) {
  const navigate = useNavigate();
  const items = data.inbox.slice(0, 5);
  const high = data.inbox.filter((t) => (t.priority ?? 0) >= 2).length;
  return (
    <button
      type="button"
      onClick={() => { onClose(); navigate('/planner'); }}
      className="w-full h-full text-left p-3.5 flex flex-col"
    >
      <WidgetHeader icon={<CheckSquare className="h-3.5 w-3.5" />} title="오늘 할일" count={data.inbox.length} kind="tasks" />
      {items.length === 0 ? (
        <EmptyText text="할일이 없어요 ✨" hint="플래너에서 추가 →" icon={<CheckSquare className="h-7 w-7" strokeWidth={1.5} />} />
      ) : (
        <>
          {high > 0 && (
            <div className="mt-1 inline-flex items-center gap-1 text-[9.5px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
              <Flag className="h-2.5 w-2.5 fill-current" />
              우선 {high}개
            </div>
          )}
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
        </>
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
    <div className="w-full h-full p-3.5 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center gap-1 mb-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setViewDate(new Date(year, month - 1, 1)); }}
          className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
          aria-label="이전 달"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => { onClose(); navigate('/planner'); }}
          className="flex-1 text-[13.5px] font-semibold text-foreground text-center hover:text-primary transition-colors tabular-nums"
        >
          <span className="text-muted-foreground/65 font-normal mr-1">{year}</span>{month + 1}월
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setViewDate(new Date(year, month + 1, 1)); }}
          className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
          aria-label="다음 달"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* 요일 */}
      <div className="grid grid-cols-7 gap-0.5 text-[10px] font-semibold text-foreground/55 mb-1 pb-1 border-b border-foreground/8">
        {WEEKDAY_KR.map((w, i) => (
          <div key={w} className={cn('text-center', i === 0 && 'text-rose-500/80', i === 6 && 'text-blue-500/80')}>{w}</div>
        ))}
      </div>
      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-0.5 flex-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const mark = isThisMonth ? data.monthMarks[cell.key] : undefined;
          const hasMark = mark && (mark.events > 0 || mark.tasks > 0);
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => handleCellClick(e, cell.key)}
              className={cn(
                'relative aspect-square text-[11px] rounded-lg flex flex-col items-center justify-center transition-all',
                cell.isToday
                  ? 'bg-primary text-primary-foreground font-bold shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.5)]'
                  : hasMark
                    ? 'text-foreground font-semibold hover:bg-foreground/5'
                    : 'text-foreground/80 font-medium hover:bg-foreground/5',
                i % 7 === 0 && !cell.isToday && 'text-rose-500/90',
                i % 7 === 6 && !cell.isToday && 'text-blue-500/90',
              )}
            >
              <span className="tabular-nums">{cell.day}</span>
              {mark && (
                <span className="absolute bottom-1 inline-flex gap-0.5">
                  {mark.events > 0 && <span className={cn('w-[3px] h-[3px] rounded-full', cell.isToday ? 'bg-white/90' : 'bg-primary/80')} />}
                  {mark.tasks > 0 && <span className={cn('w-[3px] h-[3px] rounded-full', cell.isToday ? 'bg-white/60' : 'bg-amber-500/85')} />}
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
// 습관 (S/M) — 진행률 바 + streak 위험 표시
export function HabitsWidget({ widget, data, onClose }: WidgetProps) {
  const navigate = useNavigate();
  const done = data.habits.filter((h) => h.done).length;
  const total = data.habits.length;
  const atRisk = data.habits.filter((h) => h.streakAtRisk).length;
  const limit = widget.size === 'M' ? 5 : 3;
  const ratio = total > 0 ? done / total : 0;
  return (
    <button
      type="button"
      onClick={() => { onClose(); navigate('/planner'); }}
      className="w-full h-full text-left p-3.5 flex flex-col"
    >
      <WidgetHeader icon={<Flame className="h-3.5 w-3.5" />} title="습관" count={`${done}/${total}`} kind="habits" />
      {total === 0 ? (
        <EmptyText text="활성 습관 없음" hint="플래너 → 습관 →" icon={<Flame className="h-7 w-7" strokeWidth={1.5} />} />
      ) : (
        <>
          {/* 진행률 bar */}
          <div className="mt-1.5 h-1 rounded-full bg-foreground/8 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-amber-500 transition-all duration-500"
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          {atRisk > 0 && (
            <div className="mt-1 inline-flex items-center gap-1 text-[9.5px] text-rose-500 font-semibold uppercase tracking-wider">
              <span className="inline-block w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
              {atRisk}개 streak 위험
            </div>
          )}
          <ul className="mt-1 space-y-1 flex-1 overflow-hidden">
            {data.habits.slice(0, limit).map((h) => (
              <li key={h.id} className="flex items-center gap-1.5 text-[11.5px] leading-tight">
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
        </>
      )}
    </button>
  );
}

// ──────────────────────────────────────────
// D-day (S/M) — 가장 가까운 D-day 는 hero 큰 숫자
export function DdayWidget({ widget, data, onClose }: WidgetProps) {
  const navigate = useNavigate();
  const limit = widget.size === 'M' ? 5 : 2;
  const items = data.upcomingDday;
  const hero = items[0];
  const rest = items.slice(1, limit);
  return (
    <button
      type="button"
      onClick={() => { onClose(); navigate('/planner'); }}
      className="w-full h-full text-left p-3.5 flex flex-col"
    >
      <WidgetHeader icon={<Flag className="h-3.5 w-3.5" />} title="D-day" count={items.length} kind="dday" />
      {items.length === 0 ? (
        <EmptyText text="가까운 일 없음" hint="플래너에서 추가 →" icon={<Flag className="h-7 w-7" strokeWidth={1.5} />} />
      ) : (
        <>
          {/* hero — 가장 가까운 D-day (오늘=rose, 1-3일=amber) */}
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span
              className={cn(
                'font-display font-extrabold tabular-nums leading-none',
                hero.daysLeft === 0
                  ? 'text-[22px] text-rose-500'
                  : hero.daysLeft <= 3
                    ? 'text-[20px] text-amber-600'
                    : 'text-[20px] text-foreground',
              )}
            >
              {hero.daysLeft === 0 ? 'D-DAY' : `D-${hero.daysLeft}`}
            </span>
            <span className="text-[11px] text-foreground/85 truncate flex-1">{hero.label}</span>
          </div>
          {rest.length > 0 && (
            <ul className="mt-1 space-y-0.5 flex-1 overflow-hidden">
              {rest.map((d, i) => (
                <li key={i} className="flex items-baseline gap-1.5 text-[10.5px] leading-tight">
                  <span className="tabular-nums font-mono text-[9.5px] font-bold text-foreground/70 shrink-0 w-[30px]">
                    D-{d.daysLeft}
                  </span>
                  <span className="flex-1 truncate text-foreground/65">{d.label}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </button>
  );
}

// ──────────────────────────────────────────
// 가장 먼저 (M) — 정적 hero 톤
export function PickFirstWidget({ data, onClose }: WidgetProps) {
  const navigate = useNavigate();
  if (!data.pickFirst) {
    return (
      <div className="w-full h-full p-4 flex flex-col">
        <WidgetHeader icon={<Sparkles className="h-3.5 w-3.5" />} title="가장 먼저" count="" kind="pickFirst" />
        <EmptyText text="추천할 항목 없음" hint="일정·할일 추가 →" icon={<Sparkles className="h-7 w-7" strokeWidth={1.5} />} />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => { onClose(); navigate('/planner'); }}
      className="w-full h-full text-left p-4 flex flex-col relative overflow-hidden"
    >
      {/* 우상단 미세 deco — radial amber glow */}
      <span
        aria-hidden
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle at center, hsl(28 88% 52% / 0.20) 0%, transparent 70%)' }}
      />
      <WidgetHeader icon={<Sparkles className="h-3.5 w-3.5" />} title="가장 먼저" count="" kind="pickFirst" />
      <div className="mt-2 font-display text-[20px] font-bold text-foreground leading-tight line-clamp-2 relative">
        {data.pickFirst.title}
      </div>
      <div className="mt-auto pt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground relative">
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold uppercase tracking-wider"
          style={{ background: 'hsl(28 88% 52% / 0.14)', color: 'hsl(28 88% 38%)' }}
        >
          {data.pickFirst.kind === 'event' ? '일정' : data.pickFirst.kind === 'habit' ? '습관' : '할일'}
        </span>
        <span className="truncate">{data.pickFirst.reason}</span>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────
// 어제 미완료 (S/M) — 0개일 때 축하 톤
export function OverdueWidget({ widget, data, onClose }: WidgetProps) {
  const navigate = useNavigate();
  const limit = widget.size === 'M' ? 4 : 2;
  const empty = data.overdue.length === 0;
  return (
    <button
      type="button"
      onClick={() => { onClose(); navigate('/planner'); }}
      className="w-full h-full text-left p-3.5 flex flex-col"
    >
      <WidgetHeader
        icon={<AlertTriangle className={cn('h-3.5 w-3.5', empty ? 'text-emerald-500' : 'text-rose-500')} />}
        title={empty ? '깨끗' : '어제 미완료'}
        count={empty ? '' : data.overdue.length}
        kind="overdue"
      />
      {empty ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center mb-1">
            <span className="text-[18px] leading-none" aria-hidden>✓</span>
          </div>
          <span className="text-[11px] text-foreground/75 font-medium">다 끝났어요</span>
          <span className="text-[9.5px] text-muted-foreground/70">밀린 일 0</span>
        </div>
      ) : (
        <ul className="mt-1.5 space-y-1 flex-1 overflow-hidden">
          {data.overdue.slice(0, limit).map((t) => (
            <li key={t.id} className="flex items-baseline gap-1.5 text-[12px] leading-tight">
              <span className="w-1 h-1 rounded-full bg-rose-500/70 shrink-0 mt-1.5" />
              <span className="flex-1 truncate text-foreground">{t.title}</span>
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}

// ──────────────────────────────────────────
// 최근 일기 (M) — mood + 날짜 pill + 이미지 thumb
const MOOD_EMOJI: Record<string, string> = {
  great: '😄', good: '🙂', okay: '😐', bad: '😕', awful: '😢',
};

export function RecentJournalWidget({ data, onClose }: WidgetProps) {
  const navigate = useNavigate();
  const entry = data.recentJournal;
  const moodEmoji = entry?.mood ? MOOD_EMOJI[entry.mood] : null;
  const firstImg = entry?.images?.[0];
  return (
    <button
      type="button"
      onClick={() => { onClose(); navigate('/journal'); }}
      className="w-full h-full text-left p-3.5 flex flex-col"
    >
      <WidgetHeader icon={<NotebookPen className="h-3.5 w-3.5" />} title="최근 일기" count="" kind="recentJournal" />
      {!entry ? (
        <EmptyText text="아직 일기가 없어요" hint="오늘 한 줄 적어볼까요? →" icon={<NotebookPen className="h-7 w-7" strokeWidth={1.5} />} />
      ) : (
        <div className="mt-1.5 flex-1 flex gap-2 min-h-0">
          {/* 이미지 썸네일 */}
          {firstImg && (
            <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-foreground/5">
              <img src={firstImg.src} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="min-w-0 flex-1 flex flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              {moodEmoji && <span className="text-[14px] leading-none" aria-hidden>{moodEmoji}</span>}
              <span className="inline-flex items-center px-1.5 h-[18px] rounded-full bg-foreground/8 text-[9.5px] font-semibold text-foreground/70 tabular-nums">
                {new Date(entry.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })}
              </span>
            </div>
            <p className="mt-1 text-[11.5px] text-foreground/85 leading-snug line-clamp-3 flex-1">
              {entry.bodyFormat === 'markdown' ? stripMarkdown(entry.body) : entry.body}
            </p>
          </div>
        </div>
      )}
    </button>
  );
}

// ──────────────────────────────────────────
// 시계 (S) — 큰 디지털, 중앙 정렬
export function ClockWidget({ data }: WidgetProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const dateLabel = now.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });

  // 다음 일정 (아직 시작 안 한 가장 가까운)
  const nowMs = now.getTime();
  const nextEvent = data.timed.find((it) => {
    const startMs = new Date(it.startAt).getTime();
    const done = it.kind === 'task' ? it.done : false;
    return !done && startMs > nowMs;
  });
  const nextLabel = (() => {
    if (!nextEvent) return null;
    const diffMin = Math.round((new Date(nextEvent.startAt).getTime() - nowMs) / 60000);
    if (diffMin < 60) return `${diffMin}분 후`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}시간 후`;
    return null;
  })();

  return (
    <div className="w-full h-full p-3.5 flex flex-col items-center justify-center text-center">
      <div className="font-display text-[34px] font-extrabold tabular-nums tracking-tight text-foreground leading-none">
        <span>{hh}</span>
        <span className="opacity-50 mx-0.5">:</span>
        <span>{mm}</span>
        <span className="text-[16px] text-muted-foreground/70 align-top ml-1 font-bold tabular-nums">{ss}</span>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground font-medium">{dateLabel}</div>
      {nextLabel && (
        <div className="mt-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-semibold text-primary truncate max-w-full" title={nextEvent!.title}>
          ⏱ {nextLabel}
        </div>
      )}
    </div>
  );
}

import {
  WeatherWidget, ForexWidget, NewsWidget, StockWidget, HeatmapWidget,
} from './externalWidgets';

// ──────────────────────────────────────────
// 헬퍼

function WidgetHeader({
  icon, title, count, kind,
}: {
  icon: React.ReactNode;
  title: string;
  count: number | string;
  kind?: import('@/lib/dailyBriefingStore').WidgetKind;
}) {
  const tintHue = kind ? WIDGET_META[kind].tint.hue : undefined;
  return (
    <div className="flex items-center gap-2">
      <span
        className="shrink-0"
        style={{ color: tintHue ?? 'hsl(var(--foreground) / 0.65)' }}
      >{icon}</span>
      <span className="text-[12.5px] font-semibold tracking-tight truncate text-foreground/85">
        {title}
      </span>
      {count !== '' && (
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground font-medium shrink-0">
          {count}
        </span>
      )}
    </div>
  );
}

function EmptyText({
  text, hint, icon,
}: {
  text: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-2 gap-1">
      {icon && (
        <div className="text-foreground/20 mb-1">
          {icon}
        </div>
      )}
      <span className="text-[11.5px] text-foreground/55 font-medium leading-tight">{text}</span>
      {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
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
  // 외부 — Step 2 실제 구현
  weather: WeatherWidget,
  forex: ForexWidget,
  news: NewsWidget,
  stock: StockWidget,
  heatmap: HeatmapWidget,
};

export function renderWidget(props: WidgetProps): React.ReactElement {
  const Comp = WIDGET_COMPONENTS[props.widget.kind];
  return <Comp {...props} />;
}
