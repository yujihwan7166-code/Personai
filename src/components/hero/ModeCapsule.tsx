/**
 * 모드 캡슐 — 좌상단 [모드 pill | 즐겨찾기 칩] 글래스 캡슐.
 *
 * general 히어로(HeroSection)의 캡슐과 동일 문법을 다중 AI·심층 리서치 등
 * 다른 모드에서도 같은 위치에 재사용 (2026-07-05: 전 모드 통일).
 * children 으로 FavoriteChips 를 받아 pill 오른쪽에 렌더.
 */
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MainMode } from '@/types/expert';
import { MODE_ICON, MODE_TINT } from '@/components/MainModeTabs';

interface Props {
  modeLabel: string;
  modeId: MainMode;
  onOpenMenu: () => void;
  children?: React.ReactNode;
}

export function ModeCapsule({ modeLabel, modeId, onOpenMenu, children }: Props) {
  const Icon = MODE_ICON[modeId];
  const tint = MODE_TINT[modeId];
  return (
    <div
      className="flex w-max max-w-[calc(100vw-160px)] items-center gap-0.5 rounded-full border p-1"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--hero-input-bg, #ffffff) 78%, transparent)',
        borderColor: 'var(--hero-hairline, rgba(0,0,0,0.08))',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        boxShadow: '0 4px 16px -10px rgba(0,0,0,0.18)',
      }}
    >
      <button
        type="button"
        data-mode-anchor
        onClick={onOpenMenu}
        aria-label={`현재 모드: ${modeLabel}. 클릭하면 모드 목록`}
        className={cn(
          'group flex h-7 shrink-0 items-center gap-1.5 rounded-full pl-2.5 pr-1.5',
          'text-[12.5px] font-semibold tracking-tight transition-colors duration-150',
        )}
        style={{
          color: 'var(--hero-fg, #1e2235)',
          backgroundColor: `color-mix(in oklab, ${tint} 10%, transparent)`,
        }}
      >
        {Icon && <Icon size={14} strokeWidth={2} style={{ color: tint }} />}
        <span>{modeLabel}</span>
        <ChevronDown size={14} strokeWidth={2.2} className="opacity-60 transition-opacity group-hover:opacity-100" />
      </button>
      {children}
    </div>
  );
}
