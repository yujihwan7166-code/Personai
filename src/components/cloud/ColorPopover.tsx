/**
 * 공통 색상 picker — 시트/슬라이드/문서 모두 사용.
 *
 * 디자인:
 *  - 표준 프리셋 24개 (흑백 8 + 컬러 16)
 *  - 최근 사용 8개 (localStorage 공유)
 *  - 사용자 지정 (native input[type=color] 폴백)
 *  - allowTransparent: 채우기/배경처럼 투명이 의미 있을 때 노출
 *
 * variant:
 *  - 'compact' : 아이콘 + 작은 스왓치만 (시트 도구바용)
 *  - 'labeled' : 아이콘 + 라벨 + 스왓치 (슬라이드 도구바용)
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Palette } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export const COLOR_PRESETS = [
  '#111827', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6', '#FFFFFF', '#000000',
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
];

const RECENT_KEY = 'personai.cloud.recentColors';
const MAX_RECENT = 8;

export function loadRecentColors(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const v = window.localStorage.getItem(RECENT_KEY);
    if (!v) return [];
    const arr: unknown = JSON.parse(v);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is string => typeof x === 'string' && /^#[0-9a-fA-F]{6}$/.test(x))
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function saveRecentColor(c: string, prev: string[]): string[] {
  const cl = c.toLowerCase();
  const next = [cl, ...prev.filter((x) => x.toLowerCase() !== cl)].slice(0, MAX_RECENT);
  try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* noop */ }
  return next;
}

/** CSS color → #RRGGBB (input[type=color] 호환). 모호한 값은 fallback. */
export function toHex(color: string | undefined | null): string {
  if (!color) return '#000000';
  if (color === 'transparent') return '#ffffff';
  if (color.startsWith('#') && color.length === 7) return color;
  if (color.startsWith('#') && color.length === 4) {
    // #abc → #aabbcc
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  return '#3b82f6';
}

export interface ColorPopoverProps {
  value: string;
  onChange: (v: string) => void;
  allowTransparent?: boolean;
  /** 'compact' = 아이콘 + 스왓치 / 'labeled' = 아이콘 + 라벨 + 스왓치 */
  variant?: 'compact' | 'labeled';
  /** labeled 모드 시 표시할 라벨 (compact 모드면 title 으로만 사용) */
  label?: string;
  /** 트리거 좌측 아이콘. 기본: <Palette /> */
  icon?: React.ReactNode;
  /** 접근성/툴팁용 — label 이 없을 때 사용 */
  title?: string;
}

export function ColorPopover({
  value, onChange, allowTransparent,
  variant = 'labeled', label, icon, title,
}: ColorPopoverProps) {
  const hex = useMemo(() => toHex(value), [value]);
  const isTransparent = value === 'transparent';
  const [recent, setRecent] = useState<string[]>(() => loadRecentColors());
  const [open, setOpen] = useState(false);
  /** hex 직접 입력 draft — 잘못된 입력 중에도 작성 가능. */
  const [hexDraft, setHexDraft] = useState(hex);
  // popover 열릴 때마다 draft 동기화
  React.useEffect(() => { if (open) setHexDraft(hex); }, [open, hex]);

  const choose = useCallback((c: string, keepOpen?: boolean) => {
    onChange(c);
    if (c !== 'transparent' && /^#[0-9a-fA-F]{6}$/i.test(c)) {
      setRecent((cur) => saveRecentColor(c, cur));
    }
    if (!keepOpen) setOpen(false);
  }, [onChange]);

  /** hex draft 를 검증해서 적용. 잘못된 값이면 원복. */
  const commitHexDraft = useCallback(() => {
    let v = hexDraft.trim();
    if (!v) { setHexDraft(hex); return; }
    if (!v.startsWith('#')) v = `#${v}`;
    // #abc → #aabbcc 자동 확장
    if (/^#[0-9a-fA-F]{3}$/.test(v)) {
      v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
    }
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      choose(v.toLowerCase(), true);
    } else {
      setHexDraft(hex); // 잘못된 입력 원복
    }
  }, [hexDraft, hex, choose]);

  const swatchStyle: React.CSSProperties = isTransparent
    ? { backgroundImage: 'repeating-linear-gradient(45deg,#fff,#fff 3px,#ddd 3px,#ddd 6px)' }
    : { backgroundColor: value };

  const tooltip = title ?? label ?? '색상';
  const iconNode = icon ?? <Palette className="w-3.5 h-3.5 text-muted-foreground" />;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1 rounded hover:bg-muted cursor-pointer',
            variant === 'labeled' ? 'px-1.5 py-1' : 'px-1.5 py-1.5',
          )}
          title={tooltip}
          aria-label={tooltip}
        >
          {iconNode}
          {variant === 'labeled' && label && <span className="text-xs">{label}</span>}
          <span
            className={cn(
              'block rounded-sm border border-border',
              variant === 'labeled' ? 'w-4 h-4' : 'w-3 h-3',
            )}
            style={swatchStyle}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2" align="start">
        <div className="text-[11px] text-muted-foreground mb-1.5">표준</div>
        <div className="grid grid-cols-8 gap-1">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              className={cn(
                'w-5 h-5 rounded border border-border hover:scale-110 transition-transform',
                hex.toLowerCase() === c.toLowerCase() && 'ring-2 ring-primary ring-offset-1',
              )}
              style={{ backgroundColor: c }}
              onClick={() => choose(c)}
              title={c}
              aria-label={c}
            />
          ))}
        </div>
        {recent.length > 0 && (
          <>
            <div className="text-[11px] text-muted-foreground mt-2 mb-1.5">최근</div>
            <div className="grid grid-cols-8 gap-1">
              {recent.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    'w-5 h-5 rounded border border-border hover:scale-110 transition-transform',
                    hex.toLowerCase() === c.toLowerCase() && 'ring-2 ring-primary ring-offset-1',
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => choose(c)}
                  title={c}
                />
              ))}
            </div>
          </>
        )}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
          {allowTransparent && (
            <button
              type="button"
              onClick={() => choose('transparent')}
              className={cn(
                'text-xs px-2 py-1 rounded border border-border hover:bg-muted shrink-0',
                isTransparent && 'ring-2 ring-primary',
              )}
              title="투명"
            >
              ◇ 투명
            </button>
          )}
          {/* hex 직접 입력 — 사용자가 외워둔 브랜드 색 등 */}
          <input
            type="text"
            value={hexDraft}
            onChange={(e) => setHexDraft(e.target.value)}
            onBlur={commitHexDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitHexDraft(); }
              else if (e.key === 'Escape') { e.preventDefault(); setHexDraft(hex); }
            }}
            placeholder="#RRGGBB"
            className="ml-auto w-20 text-xs font-mono px-1.5 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40"
            aria-label="hex 색 입력"
            title="hex 값 직접 입력 — 예: #ff6600 또는 #f60"
          />
          <input
            type="color"
            value={hex}
            onChange={(e) => choose(e.target.value, true)}
            className="w-7 h-7 rounded cursor-pointer border border-border bg-transparent p-0 shrink-0"
            aria-label="사용자 지정 색"
            title="시스템 색상 선택기"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
