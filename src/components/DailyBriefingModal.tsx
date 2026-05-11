/**
 * 데일리 브리핑 모달 — 큰 메인 영역 + 우측 작은 설정 패널.
 *
 * 레이아웃:
 *   [메인 컨텐츠 (넓음)]  |  [설정 패널 (좁음, 토글 가능)]
 *
 * 메인: 사용자가 활성화한 위젯들이 순서대로 표시.
 * 설정: 위젯 ON/OFF, 순서 ↑↓, autoShow 토글, 기본값 복귀.
 *
 * 정적 데이터 (AI 호출 X — 빠르고 비용 0).
 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X, Calendar, CheckSquare, AlertTriangle, Flag, Flame, Sparkles, ArrowRight,
  Settings, ChevronUp, ChevronDown, Quote, BookOpen, BookText, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildDailyBriefing, type BriefingData } from '@/lib/buildDailyBriefing';
import {
  dailyBriefingStore, ALL_WIDGETS, WIDGET_META, type BriefingWidgetId,
} from '@/lib/dailyBriefingStore';

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
  const data: BriefingData | null = useMemo(() => open ? buildDailyBriefing() : null, [open]);
  const [settings, setSettings] = useState(() => dailyBriefingStore.getSettings());
  const [settingsOpen, setSettingsOpen] = useState(true);

  // 표시 기록.
  useEffect(() => {
    if (open) {
      dailyBriefingStore.markShownToday();
      setSettings(dailyBriefingStore.getSettings());
    }
  }, [open]);

  // Esc 닫기.
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open || !data || typeof document === 'undefined') return null;

  // 설정 mutate 후 state refresh.
  const refresh = () => setSettings(dailyBriefingStore.getSettings());
  const toggleWidget = (id: BriefingWidgetId, en: boolean) => { dailyBriefingStore.toggleWidget(id, en); refresh(); };
  const moveUp = (id: BriefingWidgetId) => { dailyBriefingStore.moveUp(id); refresh(); };
  const moveDown = (id: BriefingWidgetId) => { dailyBriefingStore.moveDown(id); refresh(); };
  const setAuto = (v: boolean) => { dailyBriefingStore.setAutoShow(v); refresh(); };
  const resetWidgets = () => {
    if (!window.confirm('위젯 구성을 기본값으로 되돌릴까요?')) return;
    dailyBriefingStore.resetWidgets();
    refresh();
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
        className={cn(
          'w-full max-h-[92vh] flex flex-col bg-card border border-foreground/15 rounded-2xl shadow-2xl overflow-hidden',
          // 설정 열림 여부에 따라 너비 변동 — 설정 열렸을 때 더 넓게.
          settingsOpen ? 'max-w-[920px]' : 'max-w-[640px]',
          'transition-[max-width] duration-200',
        )}
      >
        {/* 헤더 */}
        <div className="shrink-0 px-6 pt-5 pb-3 border-b hairline flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11.5px] font-semibold tracking-[0.16em] uppercase text-amber-600 dark:text-amber-400 mb-1">
              ☕ 데일리 브리핑
            </div>
            <div className="text-[20px] font-bold text-foreground leading-tight">
              {data.greeting}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-label="설정"
            title={settingsOpen ? '설정 숨기기' : '설정 보기'}
            className={cn(
              'shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors',
              settingsOpen
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 본문 — 메인 + 설정 */}
        <div className="flex-1 min-h-0 flex">
          {/* ── 메인 ── */}
          <div className="flex-1 min-w-0 overflow-y-auto px-6 py-5 space-y-5">
            {settings.widgets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-[13px]">
                표시할 위젯이 없어요.
                <br />
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="mt-2 text-primary hover:underline"
                >
                  설정에서 위젯을 켜주세요 →
                </button>
              </div>
            ) : settings.widgets.map((wid) => (
              <WidgetRenderer key={wid} id={wid} data={data} onCloseModal={onClose} />
            ))}
          </div>

          {/* ── 설정 패널 (우측, 작음) ── */}
          {settingsOpen && (
            <div className="w-[260px] shrink-0 border-l hairline bg-card/40 flex flex-col">
              <div className="shrink-0 px-3.5 py-2.5 border-b hairline flex items-center justify-between">
                <span className="text-[11.5px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                  표시 설정
                </span>
                <button
                  type="button"
                  onClick={resetWidgets}
                  aria-label="기본값"
                  title="기본값으로 복귀"
                  className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-3">
                {/* 활성 위젯 (순서) */}
                <div>
                  <div className="px-1.5 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground/85 font-semibold">
                    표시중 — 드래그/↑↓ 로 순서
                  </div>
                  {settings.widgets.length === 0 ? (
                    <div className="px-2 py-1.5 text-[11.5px] text-muted-foreground italic">없음</div>
                  ) : (
                    <ul className="space-y-0.5">
                      {settings.widgets.map((wid, idx) => {
                        const meta = WIDGET_META[wid];
                        return (
                          <li key={wid} className="group flex items-center gap-1 px-2 py-1 rounded hover:bg-accent/60 transition-colors">
                            <span className="text-[12px] leading-none shrink-0">{meta.emoji}</span>
                            <span className="flex-1 text-[12px] text-foreground/85 truncate">{meta.label}</span>
                            <button
                              type="button"
                              onClick={() => moveUp(wid)}
                              disabled={idx === 0}
                              aria-label="위로"
                              title="위로"
                              className="h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-background disabled:opacity-25 disabled:cursor-not-allowed"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveDown(wid)}
                              disabled={idx === settings.widgets.length - 1}
                              aria-label="아래로"
                              title="아래로"
                              className="h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-background disabled:opacity-25 disabled:cursor-not-allowed"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleWidget(wid, false)}
                              aria-label="끄기"
                              title="끄기"
                              className="h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* 비활성 위젯 — 그룹별 */}
                {(['내 데이터', '영감'] as const).map((group) => {
                  const items = ALL_WIDGETS
                    .filter((id) => WIDGET_META[id].group === group)
                    .filter((id) => !settings.widgets.includes(id));
                  if (items.length === 0) return null;
                  return (
                    <div key={group}>
                      <div className="px-1.5 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground/85 font-semibold">
                        추가 — {group}
                      </div>
                      <ul className="space-y-0.5">
                        {items.map((wid) => {
                          const meta = WIDGET_META[wid];
                          return (
                            <li key={wid}>
                              <button
                                type="button"
                                onClick={() => toggleWidget(wid, true)}
                                className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-[12px] text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
                              >
                                <span className="text-[12px] leading-none shrink-0">{meta.emoji}</span>
                                <span className="flex-1 truncate">{meta.label}</span>
                                <span className="text-muted-foreground/50">+</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* 설정 푸터 — autoShow */}
              <div className="shrink-0 px-3 py-2.5 border-t hairline">
                <label className="flex items-start gap-2 text-[12px] text-foreground/85 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.autoShow}
                    onChange={(e) => setAuto(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-foreground/30 accent-primary cursor-pointer"
                  />
                  <span className="leading-snug">
                    매일 첫 접속 시<br />
                    <span className="text-muted-foreground text-[11px]">자동 표시</span>
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 액션 */}
        <div className="shrink-0 px-6 py-3 border-t hairline flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">
            {settings.widgets.length} 위젯 · {settings.autoShow ? '매일 자동' : '수동'}
          </span>
          <button
            type="button"
            onClick={goPlanner}
            className="ml-auto inline-flex items-center gap-1 h-8 px-3.5 rounded-md bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary/90 transition-colors"
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

// ─── 위젯 렌더러 ───────────────────────────────────────────

function WidgetRenderer({
  id, data, onCloseModal,
}: { id: BriefingWidgetId; data: BriefingData; onCloseModal: () => void }) {
  switch (id) {
    case 'pickFirst':
      if (!data.pickFirst) return null;
      return (
        <section className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-primary mb-1.5">
            <Sparkles className="h-3 w-3" />
            가장 먼저
          </div>
          <div className="text-[15px] font-bold text-foreground leading-snug">{data.pickFirst.title}</div>
          <div className="text-[12px] text-muted-foreground mt-1">{data.pickFirst.reason}</div>
        </section>
      );

    case 'timed':
      return (
        <Section icon={<Calendar className="h-3.5 w-3.5" />} title="오늘 시간 잡힌 항목" count={data.timed.length} empty="시간 잡힌 항목 없음">
          {data.timed.length > 0 && (
            <ul className="space-y-1">
              {data.timed.map((it, i) => (
                <li key={i} className="flex items-baseline gap-2 text-[13px]">
                  <span className="tabular-nums font-mono text-muted-foreground text-[11.5px] shrink-0 w-[88px]">
                    {fmtTime(it.startAt)}{it.endAt ? `~${fmtTime(it.endAt)}` : ''}
                  </span>
                  <span className={cn('flex-1 min-w-0 truncate text-foreground', it.done && 'line-through text-muted-foreground')}>
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
      );

    case 'inbox':
      return (
        <Section icon={<CheckSquare className="h-3.5 w-3.5" />} title="오늘 할 일" count={data.inbox.length} empty="대기 중 할 일 없음">
          {data.inbox.length > 0 && (
            <ul className="space-y-1">
              {data.inbox.map((t) => (
                <li key={t.id} className="flex items-baseline gap-2 text-[13px]">
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
      );

    case 'overdue':
      if (data.overdue.length === 0) return null;
      return (
        <Section icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-500" />} title="어제 못 끝낸 일" count={data.overdue.length}>
          <ul className="space-y-1">
            {data.overdue.map((t) => (
              <li key={t.id} className="text-[13px] text-foreground truncate">{t.title}</li>
            ))}
          </ul>
        </Section>
      );

    case 'habits':
      if (data.habits.length === 0) return null;
      return (
        <Section icon={<Flame className="h-3.5 w-3.5" />} title="오늘 습관" count={`${data.habits.filter((h) => h.done).length}/${data.habits.length}`}>
          <ul className="space-y-1">
            {data.habits.map((h) => (
              <li key={h.id} className="flex items-center gap-2 text-[13px]">
                <span className={cn(
                  'h-3.5 w-3.5 rounded-full shrink-0 inline-flex items-center justify-center text-[10px]',
                  h.done ? 'bg-emerald-500 text-white' :
                    h.streakAtRisk ? 'bg-rose-500/15 text-rose-500 ring-1 ring-rose-500/40' :
                      'bg-muted text-muted-foreground/60',
                )}>
                  {h.done ? '✓' : h.streakAtRisk ? '!' : ''}
                </span>
                <span className={cn('flex-1 truncate', h.done && 'text-muted-foreground line-through')}>{h.title}</span>
                {h.streakAtRisk && <span className="shrink-0 text-[10.5px] text-rose-500 font-medium">streak 위험</span>}
              </li>
            ))}
          </ul>
        </Section>
      );

    case 'dday':
      if (data.upcomingDday.length === 0) return null;
      return (
        <Section icon={<Flag className="h-3.5 w-3.5" />} title="가까운 D-day" count={data.upcomingDday.length}>
          <ul className="space-y-1">
            {data.upcomingDday.map((d, i) => (
              <li key={i} className="flex items-baseline gap-2 text-[13px]">
                <span className="tabular-nums font-mono text-[11.5px] shrink-0 text-foreground/85 w-[60px]">
                  {d.daysLeft === 0 ? 'D-DAY' : `D-${d.daysLeft}`}
                </span>
                <span className="flex-1 truncate text-foreground">{d.label}</span>
              </li>
            ))}
          </ul>
        </Section>
      );

    case 'quote':
      return (
        <section className="rounded-xl border hairline bg-accent/30 px-4 py-3.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            <Quote className="h-3 w-3" />
            오늘의 한 줄
          </div>
          <blockquote className="text-[13.5px] text-foreground leading-relaxed italic">
            "{data.quote.text}"
          </blockquote>
          {data.quote.author && (
            <div className="text-[11.5px] text-muted-foreground mt-1.5 text-right">— {data.quote.author}</div>
          )}
        </section>
      );

    case 'word':
      return (
        <section className="rounded-xl border hairline bg-emerald-50/40 dark:bg-emerald-500/5 px-4 py-3.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-1.5">
            <BookText className="h-3 w-3" />
            오늘의 단어
          </div>
          <div className="flex items-baseline gap-2.5 mb-1">
            <span className="text-[18px] font-bold text-foreground tracking-tight">{data.word.word}</span>
            <span className="text-[13px] text-foreground/85">{data.word.meaning}</span>
          </div>
          {data.word.sample && (
            <div className="text-[12px] text-muted-foreground italic">"{data.word.sample}"</div>
          )}
        </section>
      );

    case 'readlist':
      return (
        <Section icon={<BookOpen className="h-3.5 w-3.5" />} title="읽을거리" count={data.readlist.length} empty="#읽을거리 태그 메모 없음">
          {data.readlist.length > 0 && (
            <ul className="space-y-1">
              {data.readlist.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => { onCloseModal(); window.location.href = `/memos?id=${m.id}`; }}
                    className="text-left text-[13px] text-foreground hover:text-primary hover:underline truncate w-full"
                  >
                    {m.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      );

    default:
      return null;
  }
}

// ─── 빌딩 블록 ──────────────────────────────────────────

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
