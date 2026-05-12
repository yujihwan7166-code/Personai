/**
 * 데일리 브리핑 모달 — 2-칼럼 (좌 내 데이터 · 우 하루 정보) + 별도 설정 패널.
 *
 * 레이아웃:
 *   [좌: 내 데이터 (일정·할일·습관)]  [우: 하루 정보 (한줄·단어·읽을거리·날씨·뉴스 등)]
 *   ⚙ 클릭 → 별도 floating 설정 패널이 슬라이드 인 (우측 column 위 overlay)
 *
 * 외부 API 위젯 (날씨·뉴스 등) 은 placeholder — 추후 연동.
 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X, Calendar, CheckSquare, AlertTriangle, Flag, Flame, Sparkles, ArrowRight,
  Settings, ChevronUp, ChevronDown, RotateCcw,
  Cloud, Newspaper, TrendingUp, DollarSign,
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
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (open) {
      dailyBriefingStore.markShownToday();
      setSettings(dailyBriefingStore.getSettings());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') {
      if (settingsOpen) setSettingsOpen(false);
      else onClose();
    } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, settingsOpen, onClose]);

  if (!open || !data || typeof document === 'undefined') return null;

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

  // 활성 위젯을 좌·우 열로 분류 — settings.widgets 순서 유지하며 column 별로 거름.
  const leftWidgets = settings.widgets.filter((id) => WIDGET_META[id].column === 'left');
  const rightWidgets = settings.widgets.filter((id) => WIDGET_META[id].column === 'right');

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
        className="relative w-full max-w-[1040px] flex flex-col rounded-3xl shadow-[0_24px_60px_-20px_rgba(30,20,10,0.25)] overflow-hidden"
        style={{
          // 황금비율 (1040 / 1.618 ≈ 643).
          height: 'min(643px, 92vh)',
          // 따뜻한 크림 배경 (Notion / Bear 톤). 다크 모드 자동 대응.
          background: 'linear-gradient(180deg, hsl(35 40% 98%) 0%, hsl(28 30% 96%) 100%)',
        }}
      >
        {/* 다크 모드 백그라운드 오버레이 — Tailwind dark: 로 처리 */}
        <div className="absolute inset-0 dark:bg-gradient-to-b dark:from-[hsl(30_15%_10%)] dark:to-[hsl(28_12%_8%)] pointer-events-none" aria-hidden />

        {/* 헤더 — 간결하게 한 줄 */}
        <div className="relative shrink-0 px-7 py-4 flex items-center gap-3 z-10">
          <h2 className="min-w-0 flex-1 text-[16px] font-bold tracking-tight text-foreground/90">
            데일리 브리핑
          </h2>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-label="설정"
            title={settingsOpen ? '설정 닫기' : '설정 열기'}
            className={cn(
              'shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-full transition-all',
              settingsOpen
                ? 'bg-foreground/10 text-foreground'
                : 'text-foreground/55 hover:text-foreground hover:bg-foreground/8',
            )}
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-full text-foreground/55 hover:text-foreground hover:bg-foreground/8 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 본문 영역 — Hero + 2 칼럼 */}
        <div className="relative flex-1 min-h-0 overflow-y-auto z-10">
          {/* Hero — 오늘 한눈 요약 (날짜 + 핵심 카운트) */}
          <BriefingHero data={data} />

          {leftWidgets.length === 0 && rightWidgets.length === 0 ? (
            <div className="text-center py-12 text-foreground/55 text-[13px]">
              표시할 위젯이 없어요.
              <br />
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="mt-2 text-primary hover:underline"
              >
                ⚙ 설정에서 위젯 켜기 →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-7 py-5">
              {/* 좌측 — 하루 정보 */}
              <div className="space-y-4 min-w-0">
                <ColumnHeader label="하루 정보" />
                {leftWidgets.length === 0 ? (
                  <ColumnEmpty />
                ) : leftWidgets.map((wid) => (
                  <WidgetRenderer key={wid} id={wid} data={data} onCloseModal={onClose} />
                ))}
              </div>

              {/* 우측 — 데일리 (내 일정·할 일·습관 등) */}
              <div className="space-y-4 min-w-0">
                <ColumnHeader label="내 데일리" />
                {rightWidgets.length === 0 ? (
                  <ColumnEmpty />
                ) : rightWidgets.map((wid) => (
                  <WidgetRenderer key={wid} id={wid} data={data} onCloseModal={onClose} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="relative shrink-0 px-7 py-3.5 flex items-center gap-3 z-10 border-t border-foreground/8">
          <span className="text-[12px] text-foreground/55">
            {settings.widgets.length} 위젯 · {settings.autoShow ? '매일 자동' : '수동'}
          </span>
          <button
            type="button"
            onClick={goPlanner}
            className="ml-auto inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-foreground text-background text-[13px] font-semibold hover:bg-foreground/90 transition-colors shadow-[0_2px_8px_-2px_rgba(30,20,10,0.2)]"
          >
            플래너 열기
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ── 설정 패널 (별도 floating, 우측 슬라이드) ── */}
        <div
          className={cn(
            'absolute top-0 right-0 h-full w-[320px] bg-card border-l hairline shadow-[-4px_0_20px_hsl(30_15%_8%/0.06)] flex flex-col',
            'transition-transform duration-200 ease-out',
            settingsOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none',
          )}
        >
          <div className="shrink-0 px-3.5 py-2.5 border-b hairline flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-[0.12em] uppercase text-foreground/85">
              표시 설정
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={resetWidgets}
                aria-label="기본값"
                title="기본값으로 복귀"
                className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="설정 닫기"
                className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-3">
            {/* 활성 위젯 */}
            <div>
              <div className="px-1.5 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground/85 font-semibold">
                표시중 — ↑↓ 로 순서
              </div>
              {settings.widgets.length === 0 ? (
                <div className="px-2 py-1.5 text-[11.5px] text-muted-foreground italic">없음</div>
              ) : (
                <ul className="space-y-0.5">
                  {settings.widgets.map((wid, idx) => {
                    const meta = WIDGET_META[wid];
                    const colTag = meta.column === 'left' ? '좌' : '우';
                    return (
                      <li key={wid} className="group flex items-center gap-1 px-2 py-1 rounded hover:bg-accent/60 transition-colors">
                        <span className="text-[12px] leading-none shrink-0">{meta.emoji}</span>
                        <span className="flex-1 text-[12px] text-foreground/85 truncate">
                          {meta.label}
                          <span className="ml-1.5 text-[9.5px] text-muted-foreground/65">({colTag})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => moveUp(wid)}
                          disabled={idx === 0}
                          aria-label="위로"
                          className="h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-background disabled:opacity-25 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(wid)}
                          disabled={idx === settings.widgets.length - 1}
                          aria-label="아래로"
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

            {/* 비활성 — 그룹별 */}
            {(['내 데이터', '외부 정보'] as const).map((group) => {
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
                            disabled={meta.soon}
                            className={cn(
                              'w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-[12px] transition-colors',
                              meta.soon
                                ? 'text-foreground/35 cursor-not-allowed'
                                : 'text-foreground/65 hover:text-foreground hover:bg-accent',
                            )}
                            title={meta.soon ? '곧 추가됩니다' : undefined}
                          >
                            <span className="text-[12px] leading-none shrink-0">{meta.emoji}</span>
                            <span className="flex-1 truncate">{meta.label}</span>
                            {meta.soon && (
                              <span className="text-[9.5px] text-muted-foreground/55 uppercase tracking-wide">곧</span>
                            )}
                            {!meta.soon && <span className="text-muted-foreground/50">+</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

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
      </div>
    </div>,
    document.body,
  );
};

// ─── 칼럼 헤더 & 빈 상태 ──────────────────────────────

/** Hero — 오늘 한눈 요약. 큰 날짜 + 인사 + 핵심 카운트 칩. */
function BriefingHero({ data }: { data: BriefingData }) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];

  // 한눈 카운트 — 0 이면 안 보임 (시각 노이즈 ↓).
  const undoneTimed = data.timed.filter((t) => t.kind === 'task' && !t.done).length + data.timed.filter((t) => t.kind === 'event').length;
  const habitDone = data.habits.filter((h) => h.done).length;

  return (
    <div className="px-7 pt-2 pb-5">
      <div
        className="rounded-2xl px-6 py-5 relative overflow-hidden"
        style={{
          // 따뜻한 sunrise 그라데이션 — 부드럽고 자연스럽게.
          background: 'linear-gradient(135deg, hsl(35 75% 92%) 0%, hsl(20 80% 90%) 60%, hsl(340 60% 92%) 100%)',
        }}
      >
        {/* 다크 모드 대응 — 부드러운 어두운 톤 */}
        <div
          className="absolute inset-0 hidden dark:block pointer-events-none"
          style={{ background: 'linear-gradient(135deg, hsl(28 18% 14%) 0%, hsl(20 20% 12%) 60%, hsl(340 18% 14%) 100%)' }}
          aria-hidden
        />

        <div className="relative flex items-end justify-between gap-4 flex-wrap">
          {/* 좌: 날짜 + 인사 */}
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-foreground/55 tracking-wide mb-1">
              {now.getFullYear()}년
            </div>
            <div className="text-[28px] sm:text-[32px] font-bold text-foreground leading-none tracking-tight">
              {month}월 {day}일
              <span className="ml-2 text-[18px] sm:text-[20px] text-foreground/70 font-semibold">
                {weekday}요일
              </span>
            </div>
            <div className="text-[13.5px] text-foreground/70 mt-2 leading-relaxed">
              {data.greeting.replace(/^.*·\s*/, '')}
            </div>
          </div>

          {/* 우: 한눈 카운트 칩 */}
          <div className="flex flex-wrap items-center gap-2">
            {undoneTimed > 0 && (
              <HeroChip icon="📅" label="일정" value={undoneTimed} />
            )}
            {data.inbox.length > 0 && (
              <HeroChip icon="☑" label="할 일" value={data.inbox.length} />
            )}
            {data.habits.length > 0 && (
              <HeroChip icon="🔥" label="습관" value={`${habitDone}/${data.habits.length}`} />
            )}
            {data.overdue.length > 0 && (
              <HeroChip icon="⚠" label="어제" value={data.overdue.length} tone="warn" />
            )}
            {data.upcomingDday.length > 0 && (
              <HeroChip icon="⚑" label="D-day" value={data.upcomingDday.length} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroChip({ icon, label, value, tone = 'default' }: {
  icon: string;
  label: string;
  value: number | string;
  tone?: 'default' | 'warn';
}) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5',
      'bg-background/55 backdrop-blur-sm',
      tone === 'warn' && 'bg-rose-50/85 dark:bg-rose-500/15',
    )}>
      <span className="text-[14px] leading-none">{icon}</span>
      <span className="text-[11.5px] text-foreground/60 font-medium">{label}</span>
      <span className={cn(
        'text-[14px] font-bold tabular-nums',
        tone === 'warn' ? 'text-rose-600 dark:text-rose-400' : 'text-foreground',
      )}>
        {value}
      </span>
    </div>
  );
}

function ColumnHeader({ label }: { label: string }) {
  return (
    <div className="text-[12.5px] font-bold text-foreground/55 tracking-wide pb-2 mb-1">
      {label}
    </div>
  );
}

function ColumnEmpty() {
  return (
    <div className="text-center py-10 text-[13px] text-muted-foreground/60 italic">
      이 영역에 표시할 위젯 없음
    </div>
  );
}

// ─── 위젯 렌더러 ───────────────────────────────────────────

function WidgetRenderer({
  id, data, onCloseModal,
}: { id: BriefingWidgetId; data: BriefingData; onCloseModal: () => void }) {
  switch (id) {
    case 'pickFirst':
      if (!data.pickFirst) return null;
      return (
        <section
          className="rounded-2xl px-5 py-4 shadow-[0_2px_8px_-2px_rgba(30,20,10,0.08)]"
          style={{
            // 부드러운 amber 톤 — 따뜻한 강조.
            background: 'linear-gradient(135deg, hsl(40 90% 95%) 0%, hsl(30 85% 93%) 100%)',
          }}
        >
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-amber-700 dark:text-amber-300 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            가장 먼저
          </div>
          <div className="text-[17px] font-bold text-foreground leading-snug">{data.pickFirst.title}</div>
          <div className="text-[13.5px] text-foreground/65 mt-1.5 leading-relaxed">{data.pickFirst.reason}</div>
        </section>
      );

    case 'timed':
      return (
        <Section icon={<Calendar className="h-4 w-4" />} title="오늘 시간 잡힌 항목" count={data.timed.length} empty="시간 잡힌 항목 없음">
          {data.timed.length > 0 && (
            <ul className="space-y-2">
              {data.timed.map((it, i) => (
                <li key={i} className="flex items-baseline gap-3 text-[14px] leading-relaxed">
                  <span className="tabular-nums font-mono text-foreground/65 text-[12.5px] shrink-0 w-[96px]">
                    {fmtTime(it.startAt)}{it.endAt ? `~${fmtTime(it.endAt)}` : ''}
                  </span>
                  <span className={cn('flex-1 min-w-0 truncate text-foreground', it.done && 'line-through text-muted-foreground')}>
                    {it.title}
                  </span>
                  {it.kind === 'event' && (
                    <span className="shrink-0 text-[10.5px] text-muted-foreground/70 uppercase font-medium">일정</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      );

    case 'inbox':
      return (
        <Section icon={<CheckSquare className="h-4 w-4" />} title="오늘 할 일" count={data.inbox.length} empty="대기 중 할 일 없음">
          {data.inbox.length > 0 && (
            <ul className="space-y-2">
              {data.inbox.map((t) => (
                <li key={t.id} className="flex items-baseline gap-2.5 text-[14px] leading-relaxed">
                  {(t.priority ?? 0) > 0 ? (
                    <Flag className={cn(
                      'h-3.5 w-3.5 shrink-0 mt-0.5',
                      t.priority === 3 && 'text-rose-500 fill-rose-500',
                      t.priority === 2 && 'text-amber-500 fill-amber-500',
                      t.priority === 1 && 'text-blue-500 fill-blue-500',
                    )} />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/55 shrink-0 mt-1.5" aria-hidden />
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
        <Section icon={<AlertTriangle className="h-4 w-4 text-rose-500" />} title="어제 못 끝낸 일" count={data.overdue.length}>
          <ul className="space-y-2">
            {data.overdue.map((t) => (
              <li key={t.id} className="text-[14px] text-foreground truncate leading-relaxed">{t.title}</li>
            ))}
          </ul>
        </Section>
      );

    case 'habits':
      if (data.habits.length === 0) return null;
      return (
        <Section icon={<Flame className="h-4 w-4" />} title="오늘 습관" count={`${data.habits.filter((h) => h.done).length}/${data.habits.length}`}>
          <ul className="space-y-2">
            {data.habits.map((h) => (
              <li key={h.id} className="flex items-center gap-2.5 text-[14px] leading-relaxed">
                <span className={cn(
                  'h-4 w-4 rounded-full shrink-0 inline-flex items-center justify-center text-[11px] font-bold',
                  h.done ? 'bg-emerald-500 text-white' :
                    h.streakAtRisk ? 'bg-rose-500/15 text-rose-500 ring-1 ring-rose-500/45' :
                      'bg-muted text-muted-foreground/60',
                )}>
                  {h.done ? '✓' : h.streakAtRisk ? '!' : ''}
                </span>
                <span className={cn('flex-1 truncate text-foreground', h.done && 'text-muted-foreground line-through')}>{h.title}</span>
                {h.streakAtRisk && <span className="shrink-0 text-[11.5px] text-rose-500 font-semibold">streak 위험</span>}
              </li>
            ))}
          </ul>
        </Section>
      );

    case 'dday':
      if (data.upcomingDday.length === 0) return null;
      return (
        <Section icon={<Flag className="h-4 w-4" />} title="가까운 D-day" count={data.upcomingDday.length}>
          <ul className="space-y-2">
            {data.upcomingDday.map((d, i) => (
              <li key={i} className="flex items-baseline gap-3 text-[14px] leading-relaxed">
                <span className="tabular-nums font-mono text-[12.5px] shrink-0 font-bold text-foreground w-[64px]">
                  {d.daysLeft === 0 ? 'D-DAY' : `D-${d.daysLeft}`}
                </span>
                <span className="flex-1 truncate text-foreground">{d.label}</span>
              </li>
            ))}
          </ul>
        </Section>
      );

    // ── 외부 정보 placeholder ──
    case 'weather':
      return <ComingSoon icon={<Cloud className="h-3.5 w-3.5" />} title="날씨" hint="위치 입력 + OpenWeatherMap API 연동 예정" />;
    case 'news':
      return <ComingSoon icon={<Newspaper className="h-3.5 w-3.5" />} title="뉴스 헤드라인" hint="연합/KBS RSS 파싱 예정" />;
    case 'stocks':
      return <ComingSoon icon={<TrendingUp className="h-3.5 w-3.5" />} title="주식·코인" hint="관심 종목 + 실시간 시세 예정" />;
    case 'exchange':
      return <ComingSoon icon={<DollarSign className="h-3.5 w-3.5" />} title="환율" hint="USD/JPY/EUR 등 공개 API" />;

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
    <section className="rounded-2xl bg-background/55 backdrop-blur-sm px-5 py-4 shadow-[0_1px_4px_-1px_rgba(30,20,10,0.04)]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-foreground/65">{icon}</span>
        <span className="text-[13.5px] font-bold text-foreground/85">{title}</span>
        <span className="text-[12px] tabular-nums text-foreground/45 ml-auto font-semibold">{count}</span>
      </div>
      {isEmpty && empty ? (
        <p className="text-[13px] text-foreground/45 italic ml-6">{empty}</p>
      ) : children}
    </section>
  );
}

function ComingSoon({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <section className="rounded-2xl px-5 py-4 bg-background/40 backdrop-blur-sm opacity-80 border border-dashed border-foreground/15">
      <div className="flex items-center gap-2 text-[13.5px] font-bold text-foreground/65 mb-1.5">
        <span className="text-foreground/45">{icon}</span>
        {title}
        <span className="ml-auto text-[11px] font-semibold text-foreground/45">곧</span>
      </div>
      <div className="text-[12.5px] text-foreground/55 italic leading-relaxed">{hint}</div>
    </section>
  );
}
