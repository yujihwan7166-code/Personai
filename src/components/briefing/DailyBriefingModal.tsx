/**
 * 데일리 브리핑 v4 — AI 내러티브 카드 (2026-07-05 재설계).
 *
 * 위젯 그리드 대시보드를 폐기하고 "AI 가 오늘을 한 편의 글로 브리핑" 하는
 * 컴팩트 카드로 교체. 시간대 인사 + AI 문단(로딩 shimmer) + 근거 칩(클릭 이동)
 * + 다시 생성·매일 자동 표시 토글. 사이트 글래스 톤.
 *
 * 데이터: dailyBriefingNarrative (buildBriefingData + 날씨 → /api/daily-briefing,
 * 하루 캐시, 실패 시 템플릿 폴백). autoShow 는 기존 dailyBriefingStore 재활용.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X, RefreshCw, Sparkles, Sunrise, Sun, Sunset, Moon,
  CalendarDays, CheckCircle2, AlertCircle, CloudSun, Flag,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dailyBriefingStore, useBriefingSettings } from '@/lib/dailyBriefingStore';
import { getDailyBriefing, type BriefingNarrative, type BriefingChip } from '@/lib/dailyBriefingNarrative';

interface Props {
  open: boolean;
  onClose: () => void;
}

const CHIP_ICON: Record<BriefingChip['kind'], LucideIcon> = {
  event: CalendarDays,
  task: CheckCircle2,
  overdue: AlertCircle,
  weather: CloudSun,
  dday: Flag,
  habit: CheckCircle2,
};

export const DailyBriefingModal = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const settings = useBriefingSettings();
  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);
  const [narrative, setNarrative] = useState<BriefingNarrative | null>(null);
  const [loading, setLoading] = useState(false);

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

  const regenerate = () => {
    setLoading(true);
    void getDailyBriefing(true).then((n) => { setNarrative(n); setLoading(false); });
  };

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  const runChip = (chip: BriefingChip) => {
    onClose();
    // 모두 플래너 자산으로 — 날씨만 예외(정보성, 이동 없음).
    if (chip.kind === 'weather') return;
    setTimeout(() => navigate('/planner'), 60);
  };

  if (!visible || typeof document === 'undefined') return null;

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
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--hero-fg-muted)] transition-colors hover:bg-black/[0.05] hover:text-rose-500"
          >
            <X size={17} />
          </button>
        </div>

        {/* 본문 — AI 브리핑 문단. */}
        <div className="px-6 pb-2">
          {loading || !narrative ? (
            <BriefingShimmer />
          ) : (
            <p className="text-[15.5px] leading-[1.7] tracking-[-0.005em]" style={{ color: 'var(--hero-fg)' }}>
              {narrative.text}
            </p>
          )}
        </div>

        {/* 근거 칩. */}
        {narrative && narrative.chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-6 pt-3">
            {narrative.chips.map((chip, i) => {
              const Icon = CHIP_ICON[chip.kind];
              const clickable = chip.kind !== 'weather';
              return (
                <button
                  key={`${chip.kind}-${i}`}
                  type="button"
                  onClick={() => clickable && runChip(chip)}
                  disabled={!clickable}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all duration-150',
                    clickable && 'hover:-translate-y-px',
                  )}
                  style={{
                    color: 'var(--hero-fg)',
                    borderColor: 'var(--hero-hairline)',
                    backgroundColor: 'color-mix(in srgb, var(--hero-input-bg, #ffffff) 55%, transparent)',
                    cursor: clickable ? 'pointer' : 'default',
                  }}
                >
                  <Icon size={13} strokeWidth={2} style={{ color: 'var(--hero-accent)' }} className="opacity-80" />
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}

        {/* 푸터 — AI 배지 · 다시 생성 · 매일 자동 표시. */}
        <div className="mt-4 flex items-center gap-3 border-t px-6 py-3" style={{ borderColor: 'var(--hero-hairline)' }}>
          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium" style={{ color: 'var(--hero-fg-muted)' }}>
            <Sparkles size={11} strokeWidth={2} style={{ color: 'var(--hero-accent)' }} />
            {narrative?.ai ? 'AI 브리핑' : '오늘 요약'}
          </span>
          <button
            type="button"
            onClick={regenerate}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[color:var(--hero-fg-muted)] transition-colors hover:bg-black/[0.04] hover:text-[color:var(--hero-fg)] disabled:opacity-50"
          >
            <RefreshCw size={11} strokeWidth={2.2} className={loading ? 'animate-spin' : undefined} />
            다시 생성
          </button>
          <label className="ml-auto inline-flex cursor-pointer select-none items-center gap-2 text-[11.5px]" style={{ color: 'var(--hero-fg-muted)' }}>
            <input
              type="checkbox"
              checked={settings.autoShow}
              onChange={(e) => dailyBriefingStore.setAutoShow(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer rounded"
              style={{ accentColor: 'var(--hero-accent)' }}
            />
            매일 자동 표시
          </label>
        </div>
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
