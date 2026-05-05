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
import { weekLabel } from '@/lib/journalWeek';

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
    <div className="flex items-center justify-between gap-3 px-1">
      <button
        type="button"
        onClick={onPrev}
        title="이전 주 (←)"
        aria-label="이전 주"
        className={cn(
          'inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors shrink-0',
          'text-muted-foreground hover:text-foreground hover:bg-accent/60',
        )}
      >
        <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </button>

      <h2
        className="text-[16px] sm:text-[18px] font-bold tracking-tight text-foreground text-center min-w-0 truncate tabular-nums"
        style={{
          fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif',
          letterSpacing: '-0.015em',
        }}
      >
        {label}
      </h2>

      <div className="flex items-center gap-1 shrink-0">
        {!isCurrentWeek && (
          <button
            type="button"
            onClick={onToday}
            title="이번 주 (T)"
            className="px-2.5 h-8 rounded-lg text-[11.5px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
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
            'inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-accent/60',
          )}
        >
          <ChevronRight className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
};

