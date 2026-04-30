/**
 * 우연의 발견 — 상세 모달.
 * 위젯 칸이 작아 잘리는 본문을 전체 보기 + 동일 4액션.
 */
import { useEffect } from 'react';
import {
  Quote, Lightbulb, Sparkles, Link2, Sunrise, HelpCircle, Coffee,
  RefreshCw, Heart, Save, EyeOff, X, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CARD_TYPE_META, type CardType, type SerendipityCard } from '@/lib/serendipity/types';

interface Props {
  card: SerendipityCard;
  liked: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onToggleLike: () => void;
  onSaveAsMemo: () => void;
  onHide: () => void;
}

const TYPE_ICON: Record<CardType, typeof Quote> = {
  quote: Quote,
  fact: Lightbulb,
  snippet: Sparkles,
  link: Link2,
  ritual: Sunrise,
  question: HelpCircle,
  pairing: Coffee,
};

export function SerendipityDetailModal({
  card, liked, onClose, onRefresh, onToggleLike, onSaveAsMemo, onHide,
}: Props) {
  // Esc 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const TypeIcon = TYPE_ICON[card.type];
  const typeLabel = CARD_TYPE_META[card.type].label;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="우연의 발견 상세"
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />

      {/* card */}
      <div
        className={cn(
          'relative w-full max-w-[480px] max-h-[85vh] overflow-y-auto',
          'rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--hairline))]',
          'shadow-[0_24px_80px_hsl(220_20%_5%_/_0.4)]',
          'p-5',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center gap-2 mb-3">
          <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10.5px] font-mono uppercase tracking-wider text-muted-foreground">
            우연의 발견 · {typeLabel}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="h-6 w-6 rounded-full bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] flex items-center justify-center transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* body */}
        {card.title && (
          <h2 className="text-[15px] font-semibold mb-2 leading-snug">{card.title}</h2>
        )}
        <p className="text-[13.5px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {card.body}
        </p>

        {card.source && (
          <p className="text-[11.5px] text-muted-foreground mt-3">{card.source}</p>
        )}

        {card.url && (
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]',
              'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] transition-colors',
            )}
          >
            <ExternalLink className="h-3 w-3" />
            <span className="truncate max-w-[300px]">{prettyHost(card.url)}</span>
          </a>
        )}

        {card.tags && card.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {card.tags.map((t) => (
              <span
                key={t}
                className="text-[10px] text-muted-foreground bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded-full"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* actions */}
        <div className="mt-5 pt-3 border-t border-[hsl(var(--hairline))] flex items-center gap-1.5">
          <ModalActionBtn icon={RefreshCw} label="다른 카드" onClick={onRefresh} />
          <ModalActionBtn
            icon={Heart}
            label={liked ? '좋아요 해제' : '좋아요'}
            onClick={onToggleLike}
            active={liked}
            fill={liked}
          />
          <ModalActionBtn icon={Save} label="메모로 저장" onClick={onSaveAsMemo} />
          <ModalActionBtn icon={EyeOff} label="다시 안 보기" onClick={onHide} />
        </div>
      </div>
    </div>
  );
}

function ModalActionBtn({
  icon: Icon, label, onClick, active, fill,
}: {
  icon: typeof RefreshCw; label: string; onClick: () => void; active?: boolean; fill?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg',
        'text-[11.5px] font-medium transition-colors',
        active
          ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/15'
          : 'text-muted-foreground bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] hover:text-foreground',
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', fill && 'fill-current')} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function prettyHost(url: string): string {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url;
  }
}
