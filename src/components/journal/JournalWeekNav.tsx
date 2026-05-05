/**
 * 주간 보드 네비게이션 — 이전 주 / 주 라벨 / 오늘 / 다음 주.
 *
 * 헤더 패턴 (Apple Calendar · Sunsama):
 * - 좌측: ‹ 이전 주
 * - 가운데: "5월 4 ~ 10일 · 2026" (Newsreader bold)
 * - 우측: [오늘] (현재 주 아닐 때만) + 다음 주 ›
 *
 * 키보드 단축키 (검색 input 비활성 시):
 * - ← / h : 이전 주
 * - → / l : 다음 주
 * - t     : 오늘
 */
import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JournalWeekNavProps {
  /** 현재 보고 있는 주의 anchor ISO. */
  anchorIso: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  /** 현재 주가 오늘 포함 주인지 — "오늘" 버튼 노출 여부. */
  isCurrentWeek: boolean;
  /** 키보드 단축키 활성 여부 (모달·input 열림 시 false). */
  shortcutsEnabled?: boolean;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function getMondaySunday(anchorIso: string): { mon: Date; sun: Date } {
  const anchor = new Date(anchorIso);
  const day = anchor.getDay();
  const monOffset = day === 0 ? -6 : 1 - day;
  const mon = new Date(anchor);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(anchor.getDate() + monOffset);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { mon, sun };
}

function weekLabel(anchorIso: string): string {
  const { mon, sun } = getMondaySunday(anchorIso);
  const sameMonth = mon.getMonth() === sun.getMonth();
  const sameYear = mon.getFullYear() === sun.getFullYear();
  const yearStr = mon.getFullYear();
  if (sameMonth) {
    return `${mon.getMonth() + 1}월 ${mon.getDate()} ~ ${sun.getDate()}일 · ${yearStr}`;
  }
  if (sameYear) {
    return `${mon.getMonth() + 1}월 ${mon.getDate()}일 ~ ${sun.getMonth() + 1}월 ${sun.getDate()}일 · ${yearStr}`;
  }
  return `${mon.getFullYear()}년 ${mon.getMonth() + 1}월 ${mon.getDate()}일 ~ ${sun.getFullYear()}년 ${sun.getMonth() + 1}월 ${sun.getDate()}일`;
}

export const JournalWeekNav = ({
  anchorIso,
  onPrev,
  onNext,
  onToday,
  isCurrentWeek,
  shortcutsEnabled = true,
}: JournalWeekNavProps) => {
  const label = weekLabel(anchorIso);

  // 키보드 단축키 — 검색 input·모달 활성 시는 비활성
  useEffect(() => {
    if (!shortcutsEnabled) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isTyping) return;

      if (e.key === 'ArrowLeft' || e.key === 'h') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        onNext();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        onToday();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcutsEnabled, onPrev, onNext, onToday]);

  return (
    <div className="flex items-center justify-between gap-2 pb-3">
      <button
        type="button"
        onClick={onPrev}
        title="이전 주 (←)"
        aria-label="이전 주"
        className={cn(
          'inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors shrink-0',
          'border-[hsl(var(--hairline))] bg-card text-muted-foreground hover:text-foreground hover:border-foreground/25',
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <h2
        className="text-[15px] sm:text-[17px] font-bold tracking-tight text-foreground text-center min-w-0 truncate"
        style={{
          fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif',
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </h2>

      <div className="flex items-center gap-1.5 shrink-0">
        {!isCurrentWeek && (
          <button
            type="button"
            onClick={onToday}
            title="이번 주 (T)"
            className="px-2.5 h-8 rounded-md border border-[hsl(var(--hairline))] bg-card text-[11.5px] font-semibold text-foreground hover:border-foreground/25 transition-colors"
          >
            오늘
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          title="다음 주 (→)"
          aria-label="다음 주"
          className={cn(
            'inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors',
            'border-[hsl(var(--hairline))] bg-card text-muted-foreground hover:text-foreground hover:border-foreground/25',
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

/** Anchor ISO 를 받아 해당 주의 월요일 ISO 반환 (정규화 — 같은 주 anchor 동일 처리). */
export const normalizeWeekAnchor = (anchorIso: string): string => {
  const { mon } = getMondaySunday(anchorIso);
  return `${ymd(mon)}T00:00:00`;
};

/** 주 단위 이동 (offset 주). */
export const shiftWeek = (anchorIso: string, weeks: number): string => {
  const d = new Date(anchorIso);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString();
};

/** anchor 가 오늘 포함 주인지. */
export const isAnchorCurrentWeek = (anchorIso: string): boolean => {
  const { mon, sun } = getMondaySunday(anchorIso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = today.getTime();
  return t >= mon.getTime() && t <= sun.getTime() + 23 * 3600 * 1000;
};
