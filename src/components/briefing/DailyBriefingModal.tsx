/**
 * 데일리 브리핑 v5 — AI 한마디 + 조화로운 섹션 + 설정 (2026-07-05 재설계).
 *
 * 위젯 드래그 그리드를 폐기하고: 상단 AI 문단 + 아래 오늘 구성 섹션(일정·할일·
 * 날씨·D-day·습관)을 고정 순서로 스택. 헤더 ⚙ 에서 어떤 섹션을 볼지 토글.
 * 데이터·설정 없는 섹션은 자동 생략. 사이트 글래스 톤.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings2, Sparkles, Sunrise, Sun, Sunset, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dailyBriefingStore, useBriefingSettings } from '@/lib/dailyBriefingStore';
import { getDailyBriefing, type BriefingNarrative } from '@/lib/dailyBriefingNarrative';
import { briefingPrefs, useBriefingPrefs, BRIEFING_SECTIONS } from '@/lib/briefingPrefs';
import { ScheduleSection, TasksSection, WeatherSection, DdaySection, HabitsSection } from './BriefingSections';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const DailyBriefingModal = ({ open, onClose }: Props) => {
  const settings = useBriefingSettings();
  const prefs = useBriefingPrefs();
  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);
  const [narrative, setNarrative] = useState<BriefingNarrative | null>(null);
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 열림/닫힘 — 종료 애니메이션 위해 잠시 mount 유지.
  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      setClosing(true);
      const t = window.setTimeout(() => { setVisible(false); setClosing(false); }, 170);
      return () => window.clearTimeout(t);
    }
  }, [open, visible]);

  // 열릴 때 브리핑 로드 (하루 캐시). autoShow 다음 표시 방지 마킹.
  useEffect(() => {
    if (!open) return;
    dailyBriefingStore.markShownToday();
    let alive = true;
    setLoading(true);
    void getDailyBriefing().then((n) => { if (alive) { setNarrative(n); setLoading(false); } });
    return () => { alive = false; };
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (settingsOpen) setSettingsOpen(false); else onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose, settingsOpen]);

  if (!visible || typeof document === 'undefined') return null;

  const d = narrative?.data;
  const w = narrative?.weather ?? null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="데일리 브리핑"
      className={cn(
        'fixed inset-0 z-[200] flex items-center justify-center p-4',
        closing ? 'animate-out fade-out duration-150' : 'animate-in fade-in duration-200',
      )}
      style={{ background: 'hsl(220 20% 8% / 0.32)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={cn(
          'relative flex w-full max-w-[560px] flex-col overflow-hidden rounded-3xl border',
          closing ? 'animate-out fade-out zoom-out-95 duration-150' : 'animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200',
        )}
        style={{
          borderColor: 'var(--hero-hairline, rgba(0,0,0,0.08))',
          backgroundColor: 'color-mix(in srgb, var(--hero-input-bg, #ffffff) 96%, transparent)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          boxShadow: '0 28px 80px -24px rgba(0,0,0,0.4), 0 6px 20px -8px rgba(0,0,0,0.18)',
          color: 'var(--hero-fg, #1e2235)',
        }}
      >
        {/* 헤더 — 시간대 인사 + 날짜. */}
        <div className="flex items-start gap-3 px-6 pt-6 pb-4">
          <TimeOfDayIcon />
          <div className="min-w-0 flex-1">
            <h2 className="text-[22px] font-bold leading-tight tracking-tight">{narrative?.greeting ?? '오늘의 브리핑'}</h2>
            <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--hero-fg-muted)' }}>{narrative?.date ?? ''}</p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-label="브리핑 설정"
            title="브리핑 설정"
            className={cn(
              'shrink-0 flex h-8 w-8 items-center justify-center rounded-full transition-colors',
              settingsOpen ? 'text-[color:var(--hero-accent)]' : 'text-[color:var(--hero-fg-muted)] hover:bg-black/[0.05] hover:text-[color:var(--hero-fg)]',
            )}
          >
            <Settings2 size={16} className={cn('transition-transform', settingsOpen && 'rotate-90')} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--hero-fg-muted)] transition-colors hover:bg-black/[0.05] hover:text-rose-500"
          >
            <X size={17} />
          </button>
        </div>

        {settingsOpen ? (
          /* 설정 — 섹션 토글 + 매일 자동 표시. */
          <div className="px-6 pb-5">
            <div className="mb-2 text-[11px] font-bold tracking-wide" style={{ color: 'var(--hero-fg-muted)' }}>브리핑에 표시할 항목</div>
            <div className="space-y-0.5">
              {BRIEFING_SECTIONS.map((s) => (
                <label key={s.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-[13.5px] transition-colors hover:bg-black/[0.03]" style={{ color: 'var(--hero-fg)' }}>
                  <input
                    type="checkbox"
                    checked={prefs[s.key]}
                    onChange={() => briefingPrefs.toggle(s.key)}
                    className="h-4 w-4 cursor-pointer rounded"
                    style={{ accentColor: 'var(--hero-accent)' }}
                  />
                  {s.label}
                </label>
              ))}
            </div>
            <label className="mt-2 flex cursor-pointer items-center gap-2.5 border-t px-2 py-2.5 text-[13px]" style={{ color: 'var(--hero-fg-muted)', borderColor: 'var(--hero-hairline)' }}>
              <input
                type="checkbox"
                checked={settings.autoShow}
                onChange={(e) => dailyBriefingStore.setAutoShow(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded"
                style={{ accentColor: 'var(--hero-accent)' }}
              />
              매일 아침 자동으로 열기
            </label>
          </div>
        ) : (
          /* 브리핑 본문 — AI 한마디 + 섹션 스택. */
          <div className="max-h-[min(64vh,560px)] overflow-y-auto px-6 pb-5 scrollbar-thin">
            {/* AI 한마디. */}
            {prefs.ai && (
              loading || !narrative ? (
                <BriefingShimmer />
              ) : (
                <div className="flex gap-2.5 rounded-2xl px-3.5 py-3" style={{ backgroundColor: 'color-mix(in oklab, var(--hero-accent) 6%, transparent)' }}>
                  <Sparkles size={15} strokeWidth={2} className="mt-1 shrink-0" style={{ color: 'var(--hero-accent)' }} />
                  <p className="text-[15px] leading-[1.65] tracking-[-0.005em]" style={{ color: 'var(--hero-fg)' }}>{narrative.text}</p>
                </div>
              )
            )}

            {/* 섹션 스택 — 데이터 로드 후. */}
            {d && (
              <div className={cn('space-y-2.5', prefs.ai && 'mt-3')}>
                {prefs.schedule && <ScheduleSection data={d} />}
                {prefs.tasks && <TasksSection data={d} />}
                {prefs.weather && w && <WeatherSection weather={w} />}
                {prefs.dday && <DdaySection data={d} />}
                {prefs.habits && <HabitsSection data={d} />}
              </div>
            )}

            {/* 아무 섹션도 없을 때 — 빈 안내. */}
            {d && !prefs.ai &&
              !(prefs.schedule && d.timed.length) &&
              !(prefs.tasks && (d.inbox.length + d.overdue.length)) &&
              !(prefs.weather && w) &&
              !(prefs.dday && d.upcomingDday.length) &&
              !(prefs.habits && d.habits.length) && (
                <p className="py-6 text-center text-[13px]" style={{ color: 'var(--hero-fg-muted)' }}>
                  오늘 표시할 내용이 없어요. 설정에서 항목을 켜보세요.
                </p>
              )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

function BriefingShimmer() {
  return (
    <div className="space-y-2.5 py-1">
      {[100, 92, 78].map((w) => (
        <div
          key={w}
          className="h-4 rounded-md"
          style={{
            width: `${w}%`,
            background: 'linear-gradient(90deg, color-mix(in srgb, var(--hero-fg) 8%, transparent), color-mix(in srgb, var(--hero-fg) 4%, transparent), color-mix(in srgb, var(--hero-fg) 8%, transparent))',
            backgroundSize: '200% 100%',
            animation: 'wb-shimmer 1.4s ease-in-out infinite',
          }}
        />
      ))}
      <style>{`@keyframes wb-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
    </div>
  );
}

/** 시간대 아이콘 — 인사 옆. Sunrise(5-9)·Sun(9-17)·Sunset(17-20)·Moon(20-5). */
function TimeOfDayIcon() {
  const [h] = useState(() => new Date().getHours());
  const cfg = (() => {
    if (h >= 5 && h < 9) return { Icon: Sunrise, color: 'hsl(28 90% 55%)' };
    if (h >= 9 && h < 17) return { Icon: Sun, color: 'hsl(42 92% 52%)' };
    if (h >= 17 && h < 20) return { Icon: Sunset, color: 'hsl(18 82% 55%)' };
    return { Icon: Moon, color: 'hsl(225 60% 60%)' };
  })();
  const { Icon, color } = cfg;
  return (
    <span
      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      style={{ background: color.replace(')', ' / 0.14)') }}
      aria-hidden
    >
      <Icon className="h-[19px] w-[19px]" style={{ color }} strokeWidth={2.2} />
    </span>
  );
}
