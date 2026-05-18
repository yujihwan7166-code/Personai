/**
 * AI 사용량 컴팩트 뱃지 — 오늘 호출 횟수 + 토큰 합계 + 누적 비용.
 *
 * Personai 가 헤더/사이드바 어디서든 한 줄로 가시화할 수 있도록 가볍게.
 * 사용량 변동(USAGE_CHANGED_EVENT) 구독해 자동 갱신.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  getTodayUsage, getAllUsage, summarizeUsage,
  USAGE_CHANGED_EVENT, type UsageSummary,
} from '@/services/usageTracker';
import { Sparkles } from 'lucide-react';

interface Props {
  /** 누적 합계 표시할지 (기본 false — 오늘만). */
  showAllTime?: boolean;
  /** 'inline' = 1행 텍스트, 'pill' = 둥근 칩 (기본 pill). */
  variant?: 'inline' | 'pill';
  /** 클릭 시 콜백 (예: 대시보드 페이지로 이동). */
  onClick?: () => void;
}

function recompute(showAll: boolean): { today: UsageSummary; total: UsageSummary } {
  return {
    today: summarizeUsage(getTodayUsage()),
    total: showAll ? summarizeUsage(getAllUsage()) : summarizeUsage([]),
  };
}

function fmtTokens(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
}

function fmtUsd(n: number): string {
  if (n < 0.01) return '$0';
  if (n < 1) return `$${n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}`;
  return `$${n.toFixed(2)}`;
}

export function UsageStatBadge({ showAllTime = false, variant = 'pill', onClick }: Props) {
  const [stats, setStats] = useState(() => recompute(showAllTime));
  useEffect(() => {
    const onChange = () => setStats(recompute(showAllTime));
    window.addEventListener(USAGE_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(USAGE_CHANGED_EVENT, onChange);
  }, [showAllTime]);

  const summary = stats.today;
  const baseLabel = useMemo(() => {
    if (summary.entries === 0) return '오늘 0회';
    return `오늘 ${summary.entries}회 · ${fmtTokens(summary.totalTokens)} tok` +
      (summary.costUsd > 0 ? ` · ${fmtUsd(summary.costUsd)}` : '');
  }, [summary]);

  const allLabel = useMemo(() => {
    if (!showAllTime || stats.total.entries === 0) return '';
    return `누적 ${stats.total.entries}회 · ${fmtTokens(stats.total.totalTokens)} tok` +
      (stats.total.costUsd > 0 ? ` · ${fmtUsd(stats.total.costUsd)}` : '');
  }, [showAllTime, stats.total]);

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
        title={allLabel || baseLabel}
      >
        <Sparkles className="w-3 h-3" />
        {baseLabel}
        {allLabel && <span className="opacity-60">· {allLabel}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      title={allLabel || 'AI 사용량'}
    >
      <Sparkles className="w-3 h-3" />
      {baseLabel}
    </button>
  );
}
