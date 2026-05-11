/**
 * 데일리 브리핑 모달 — 플로팅 카드.
 *
 * 진입:
 * - 모드 picker 의 '데일리 브리핑' 카드 클릭 → 수동 호출
 * - autoShow 켜져있고 오늘 첫 접속 시 → 자동
 *
 * 내용: 오늘 일정·할일·습관·D-day·가장 먼저 할 일 1개.
 * 정적 (store 데이터만) — AI 호출 없음. 빠르고 비용 0.
 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, CheckSquare, AlertTriangle, Flag, Flame, Sparkles, ArrowRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildDailyBriefing, type BriefingData } from '@/lib/buildDailyBriefing';
import { dailyBriefingStore } from '@/lib/dailyBriefingStore';

interface DailyBriefingModalProps {
  open: boolean;
  onClose: () => void;
}

const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const DailyBriefingModal = ({ open, onClose }: DailyBriefingModalProps) => {
  const navigate = useNavigate();
  // 매 열림마다 fresh build (사용자가 모달 띄운 사이 store 가 바뀌었을 수도)
  const data: BriefingData | null = useMemo(() => open ? buildDailyBriefing() : null, [open]);
  const [autoShow, setAutoShow] = useState<boolean>(() => dailyBriefingStore.getSettings().autoShow);

  useEffect(() => {
    if (open) {
      // 표시한 사실 기록 — 같은 날 다시 안 띄움 (autoShow 켜져있어도)
      dailyBriefingStore.markShownToday();
      setAutoShow(dailyBriefingStore.getSettings().autoShow);
    }
  }, [open]);

  // Esc 닫기
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open || !data || typeof document === 'undefined') return null;

  const handleToggleAutoShow = (v: boolean) => {
    setAutoShow(v);
    dailyBriefingStore.setAutoShow(v);
  };

  const goPlanner = () => { onClose(); navigate('/planner'); };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="데일리 브리핑"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md max-h-[88vh] flex flex-col bg-card border border-foreground/15 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* 헤더 */}
        <div className="shrink-0 px-5 pt-4 pb-3 border-b hairline">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11.5px] font-semibold tracking-[0.16em] uppercase text-amber-600 dark:text-amber-400 mb-1">
                ☕ 데일리 브리핑
              </div>
              <div className="text-[15.5px] font-semibold text-foreground leading-tight">
                {data.greeting}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 본문 — 스크롤 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {/* 가장 먼저 할 일 (있을 때만) */}
          {data.pickFirst && (
            <section className="rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-3">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-primary mb-1">
                <Sparkles className="h-3 w-3" />
                가장 먼저
              </div>
              <div className="text-[13.5px] font-semibold text-foreground leading-snug">
                {data.pickFirst.title}
              </div>
              <div className="text-[11.5px] text-muted-foreground mt-0.5">
                {data.pickFirst.reason}
              </div>
            </section>
          )}

          {/* 시간 잡힌 항목 */}
          <Section
            icon={<Calendar className="h-3.5 w-3.5" />}
            title="오늘 시간 잡힌 항목"
            count={data.timed.length}
            empty="시간 잡힌 항목 없음"
          >
            {data.timed.length > 0 && (
              <ul className="space-y-1">
                {data.timed.map((it, i) => (
                  <li key={i} className="flex items-baseline gap-2 text-[12.5px]">
                    <span className="tabular-nums font-mono text-muted-foreground text-[11px] shrink-0 w-[78px]">
                      {fmtTime(it.startAt)}{it.endAt ? `~${fmtTime(it.endAt)}` : ''}
                    </span>
                    <span className={cn(
                      'flex-1 min-w-0 truncate text-foreground',
                      it.done && 'line-through text-muted-foreground',
                    )}>
                      {it.title}
                    </span>
                    {it.kind === 'event' && (
                      <span className="shrink-0 text-[9.5px] text-muted-foreground/65 uppercase">일정</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* 인박스 */}
          <Section
            icon={<CheckSquare className="h-3.5 w-3.5" />}
            title="오늘 할 일"
            count={data.inbox.length}
            empty="대기 중 할 일 없음"
          >
            {data.inbox.length > 0 && (
              <ul className="space-y-1">
                {data.inbox.map((t) => (
                  <li key={t.id} className="flex items-baseline gap-2 text-[12.5px]">
                    {(t.priority ?? 0) > 0 ? (
                      <Flag className={cn(
                        'h-3 w-3 shrink-0 mt-0.5',
                        t.priority === 3 && 'text-rose-500 fill-rose-500',
                        t.priority === 2 && 'text-amber-500 fill-amber-500',
                        t.priority === 1 && 'text-blue-500 fill-blue-500',
                      )} />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0 mt-1.5" aria-hidden />
                    )}
                    <span className="flex-1 min-w-0 truncate text-foreground">{t.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* 어제 미완료 */}
          {data.overdue.length > 0 && (
            <Section
              icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
              title="어제 못 끝낸 일"
              count={data.overdue.length}
            >
              <ul className="space-y-1">
                {data.overdue.map((t) => (
                  <li key={t.id} className="text-[12.5px] text-foreground truncate">{t.title}</li>
                ))}
              </ul>
            </Section>
          )}

          {/* 습관 */}
          {data.habits.length > 0 && (
            <Section
              icon={<Flame className="h-3.5 w-3.5" />}
              title="오늘 습관"
              count={`${data.habits.filter((h) => h.done).length}/${data.habits.length}`}
            >
              <ul className="space-y-1">
                {data.habits.map((h) => (
                  <li key={h.id} className="flex items-center gap-2 text-[12.5px]">
                    <span className={cn(
                      'h-3 w-3 rounded-full shrink-0 inline-flex items-center justify-center text-[9px]',
                      h.done ? 'bg-emerald-500 text-white' : h.streakAtRisk ? 'bg-rose-500/15 text-rose-500 ring-1 ring-rose-500/40' : 'bg-muted text-muted-foreground/60',
                    )}>
                      {h.done ? '✓' : h.streakAtRisk ? '!' : ''}
                    </span>
                    <span className={cn('flex-1 truncate', h.done && 'text-muted-foreground line-through')}>
                      {h.title}
                    </span>
                    {h.streakAtRisk && (
                      <span className="shrink-0 text-[10px] text-rose-500 font-medium">streak 위험</span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* D-day */}
          {data.upcomingDday.length > 0 && (
            <Section
              icon={<Flag className="h-3.5 w-3.5" />}
              title="가까운 D-day"
              count={data.upcomingDday.length}
            >
              <ul className="space-y-1">
                {data.upcomingDday.map((d, i) => (
                  <li key={i} className="flex items-baseline gap-2 text-[12.5px]">
                    <span className="tabular-nums font-mono text-[11px] shrink-0 text-foreground/85">
                      {d.daysLeft === 0 ? 'D-DAY' : `D-${d.daysLeft}`}
                    </span>
                    <span className="flex-1 truncate text-foreground">{d.label}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* 푸터 — autoShow 토글 + 액션 */}
        <div className="shrink-0 px-5 py-3 border-t hairline bg-card/40 flex items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] text-foreground/85 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoShow}
              onChange={(e) => handleToggleAutoShow(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-foreground/30 accent-primary cursor-pointer"
            />
            <span>매일 첫 접속 시 자동 표시</span>
          </label>
          <button
            type="button"
            onClick={goPlanner}
            className="ml-auto inline-flex items-center gap-1 h-7 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors"
          >
            플래너 열기
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ─── 작은 빌딩 블록 ─────────────────────────────────────────

function Section({
  icon, title, count, children, empty,
}: {
  icon: React.ReactNode;
  title: string;
  count: number | string;
  children?: React.ReactNode;
  empty?: string;
}) {
  const isEmpty = (typeof count === 'number' && count === 0) || count === '0' || count === '0/0';
  return (
    <section>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
        <span className="text-[10.5px] tabular-nums text-muted-foreground/70 ml-auto font-medium">{count}</span>
      </div>
      {isEmpty && empty ? (
        <p className="text-[11.5px] text-muted-foreground/70 italic ml-5">{empty}</p>
      ) : children}
    </section>
  );
}
