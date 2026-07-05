/**
 * 데일리 브리핑 v5 — AI 한마디 + 조화로운 섹션 + 설정 (2026-07-05 재설계).
 *
 * 위젯 드래그 그리드를 폐기하고: 상단 AI 문단 + 아래 오늘 구성 섹션(일정·할일·
 * 날씨·D-day·습관)을 고정 순서로 스택. 헤더 ⚙ 에서 어떤 섹션을 볼지 토글.
 * 데이터·설정 없는 섹션은 자동 생략. 사이트 글래스 톤.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings2 } from 'lucide-react';
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
          'relative flex w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border',
          closing ? 'animate-out fade-out zoom-out-95 duration-150' : 'animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200',
        )}
        style={{
          // 모닝 레터 — 종이 톤(따뜻한 오프화이트) + 세리프. 글래스·accent 카드 제거.
          ['--briefing-serif' as string]: "'Nanum Myeongjo', 'Noto Serif KR', 'Apple SD Gothic Neo', Georgia, serif",
          ['--hero-fg' as string]: 'hsl(28 18% 20%)',
          ['--hero-fg-muted' as string]: 'hsl(28 12% 48%)',
          ['--hero-hairline' as string]: 'hsl(30 20% 60% / 0.28)',
          borderColor: 'hsl(30 24% 78% / 0.55)',
          background: 'linear-gradient(180deg, hsl(38 42% 98%) 0%, hsl(36 32% 95%) 100%)',
          boxShadow: '0 24px 70px -22px hsl(28 40% 12% / 0.3), 0 4px 16px -8px hsl(28 40% 12% / 0.14)',
          color: 'hsl(28 18% 20%)',
        }}
      >
        {/* 헤더 — 편지 상단: 날짜(작게) → 인사(세리프). 아이콘 원 제거. */}
        <div className="flex items-start gap-3 px-7 pt-7 pb-1">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] tracking-[0.04em]" style={{ color: 'var(--hero-fg-muted)', fontFamily: 'var(--briefing-serif)' }}>
              {narrative?.date ?? ''}
            </p>
            <h2 className="mt-1.5 text-[26px] leading-tight" style={{ color: 'var(--hero-fg)', fontFamily: 'var(--briefing-serif)', fontWeight: 700 }}>
              {narrative?.greeting ?? '오늘의 편지'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-label="브리핑 설정"
            title="브리핑 설정"
            className={cn(
              'shrink-0 flex h-8 w-8 items-center justify-center rounded-full transition-colors',
              settingsOpen ? 'text-[color:var(--hero-fg)] bg-black/[0.05]' : 'text-[color:var(--hero-fg-muted)] hover:bg-black/[0.04] hover:text-[color:var(--hero-fg)]',
            )}
          >
            <Settings2 size={15} className={cn('transition-transform', settingsOpen && 'rotate-90')} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--hero-fg-muted)] transition-colors hover:bg-black/[0.04] hover:text-[color:var(--hero-fg)]"
          >
            <X size={16} />
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
          /* 편지 본문 — 인사 아래 본문 문단 + 얇은 구분선 섹션들. */
          <div className="max-h-[min(64vh,560px)] overflow-y-auto px-7 pb-7 pt-3 scrollbar-thin">
            {/* 편지 본문 — 세리프, accent 카드·아이콘 없이. */}
            {prefs.ai && (
              loading || !narrative ? (
                <BriefingShimmer />
              ) : (
                <p className="text-[16px] leading-[1.85]" style={{ color: 'var(--hero-fg)', fontFamily: 'var(--briefing-serif)' }}>
                  {narrative.text}
                </p>
              )
            )}

            {/* 섹션 스택 — 편지 속 항목처럼. */}
            {d && (
              <div>
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
