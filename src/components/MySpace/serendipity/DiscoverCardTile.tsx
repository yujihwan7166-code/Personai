/**
 * 우연의 발견 — Discover 페이지용 카드 타일.
 *
 * 핵심 디자인 결정: type 별로 분위기 자체가 다르다.
 * 좌측 색 라인 같은 평범한 패턴 대신:
 *  - quote   : 종이 톤 + 거대 따옴표 워터마크 + 세리프 이탤릭 가운데
 *  - question: 거대 물음표 워터마크 + 가운데 큰 글자
 *  - fact    : "DID YOU KNOW?" 캡 라벨 + 전구 워터마크
 *  - ritual  : 새벽 그라데이션 (orange → amber)
 *  - pairing : 두 칸 split — "+" 가운데
 *  - link    : 우측 큰 화살표 + hover 시 살짝 떠오름
 *  - topic   : 매거진 스타일 큰 헤드라인 + 호 hero 시 이미지
 *  - snippet : 부드러운 보라톤 + 큰 둥근 모서리
 *
 * 공통 액션 바(♥·복사·저장·숨김)는 group-hover 로 fade-in.
 */
import {
  Heart, Save, Copy, EyeOff, ExternalLink, Clock, ArrowUpRight,
  Quote, Lightbulb, Sparkles, Link2, Sunrise, HelpCircle, Coffee, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CARD_TYPE_META, estimateReadMinutes, type CardType, type SerendipityCard } from '@/lib/serendipity/types';

const TYPE_ICON: Record<CardType, typeof Quote> = {
  topic: BookOpen,
  quote: Quote,
  fact: Lightbulb,
  snippet: Sparkles,
  link: Link2,
  ritual: Sunrise,
  question: HelpCircle,
  pairing: Coffee,
};

export type CardVariant = 'hero' | 'default' | 'compact';

interface Props {
  card: SerendipityCard;
  liked: boolean;
  variant: CardVariant;
  onOpen: () => void;
  onLike: () => void;
  onSave: () => void;
  onCopy: () => void;
  onHide: () => void;
  onTagClick: (tag: string) => void;
}

export function DiscoverCardTile(props: Props) {
  const { card } = props;
  // type 별로 컴포넌트 분기 — 각자 다른 분위기
  switch (card.type) {
    case 'quote':    return <QuoteCard {...props} />;
    case 'question': return <QuestionCard {...props} />;
    case 'fact':     return <FactCard {...props} />;
    case 'ritual':   return <RitualCard {...props} />;
    case 'pairing':  return <PairingCard {...props} />;
    case 'link':     return <LinkCard {...props} />;
    case 'topic':    return <TopicCard {...props} />;
    case 'snippet':  return <SnippetCard {...props} />;
  }
}

// ─────────────────────────── 공통 ───────────────────────────

function ActionBar({
  liked, onLike, onSave, onCopy, onHide, url,
}: Pick<Props, 'liked' | 'onLike' | 'onSave' | 'onCopy' | 'onHide'> & { url?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-0.5',
        'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity',
        liked && 'opacity-100',
      )}
    >
      <ActionBtn icon={Heart} label={liked ? '좋아요 해제' : '좋아요'} onClick={onLike} active={liked} fill={liked} />
      <ActionBtn icon={Copy} label="복사" onClick={onCopy} />
      <ActionBtn icon={Save} label="메모로 저장" onClick={onSave} />
      <ActionBtn icon={EyeOff} label="다시 안 보기" onClick={onHide} />
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-[hsl(var(--accent))] hover:text-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
          aria-label="외부 링크 열기"
          title="외부 링크 열기"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function ActionBtn({
  icon: Icon, label, onClick, active, fill,
}: { icon: typeof Heart; label: string; onClick: () => void; active?: boolean; fill?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={label}
      title={label}
      className={cn(
        'h-6 w-6 rounded flex items-center justify-center transition-colors',
        'text-muted-foreground hover:bg-[hsl(var(--accent))] hover:text-foreground',
        active && 'text-rose-500',
      )}
    >
      <Icon className={cn('h-3 w-3', fill && 'fill-current')} />
    </button>
  );
}

function TagsRow({
  tags, onTagClick,
}: { tags?: string[]; onTagClick: (t: string) => void }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 flex-1 min-w-0 mr-1">
      {tags.slice(0, 3).map((t) => (
        <button
          key={t}
          type="button"
          onClick={(e) => { e.stopPropagation(); onTagClick(t); }}
          className="text-[9.5px] text-muted-foreground bg-[hsl(var(--muted))]/60 hover:bg-[hsl(var(--accent))] hover:text-foreground px-1.5 py-0.5 rounded-full transition-colors"
          aria-label={`태그 ${t} 로 모아보기`}
          title={`#${t} 모아보기`}
        >
          #{t}
        </button>
      ))}
    </div>
  );
}

function MetaRow({ card }: { card: SerendipityCard }) {
  const meta = CARD_TYPE_META[card.type];
  const Icon = TYPE_ICON[card.type];
  const readMin = estimateReadMinutes(card);
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="h-3 w-3" />
      <span className="text-[10px] font-mono uppercase tracking-wider">{meta.label}</span>
      {card.origin === 'remote' && (
        <span className="text-[9.5px] px-1 py-0 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
          LIVE
        </span>
      )}
      <div className="flex-1" />
      <span className="inline-flex items-center gap-0.5 text-[10px] tabular-nums">
        <Clock className="h-2.5 w-2.5" />
        {readMin}분
      </span>
    </div>
  );
}

function CardShell({
  children, onOpen, ariaLabel, className,
}: { children: React.ReactNode; onOpen: () => void; ariaLabel: string; className?: string }) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={ariaLabel}
      className={cn(
        'group relative rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]',
        'hover:border-[hsl(var(--border))] hover:shadow-md transition-all overflow-hidden flex flex-col',
        'cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--focus-ring))]',
        className,
      )}
    >
      {children}
    </article>
  );
}

// ─────────────────────────── 1. QUOTE — 종이 톤 + 거대 따옴표 ───────────────────────────

function QuoteCard({ card, liked, variant, onOpen, onLike, onSave, onCopy, onHide, onTagClick }: Props) {
  const isHero = variant === 'hero';
  return (
    <CardShell
      onOpen={onOpen}
      ariaLabel={card.body.slice(0, 40)}
      className={cn(
        'bg-amber-50/40 dark:bg-amber-950/15',
        isHero && 'min-h-[260px]',
      )}
    >
      {/* 거대 따옴표 워터마크 */}
      <div
        aria-hidden
        className="absolute -top-4 -left-2 text-[140px] font-serif leading-none text-amber-400/15 dark:text-amber-300/10 select-none pointer-events-none"
      >
        “
      </div>

      <div className="relative z-10 p-5 flex-1 flex flex-col justify-center text-center">
        <p className={cn(
          'font-serif italic leading-relaxed text-foreground/90',
          isHero ? 'text-[16px]' : 'text-[13.5px]',
        )}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: isHero ? 8 : 5,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {card.body}
        </p>
        {card.source && (
          <p className="text-[11px] text-muted-foreground mt-3 not-italic font-sans">
            {card.source}
          </p>
        )}
      </div>

      <div className="relative z-10 px-3.5 pb-3 pt-1 flex items-center gap-1">
        <TagsRow tags={card.tags} onTagClick={onTagClick} />
        <ActionBar liked={liked} onLike={onLike} onSave={onSave} onCopy={onCopy} onHide={onHide} url={card.url} />
      </div>
    </CardShell>
  );
}

// ─────────────────────────── 2. QUESTION — 거대 ? + 가운데 ───────────────────────────

function QuestionCard({ card, liked, variant, onOpen, onLike, onSave, onCopy, onHide, onTagClick }: Props) {
  const isHero = variant === 'hero';
  return (
    <CardShell
      onOpen={onOpen}
      ariaLabel={card.body.slice(0, 40)}
      className={cn(
        'bg-fuchsia-50/40 dark:bg-fuchsia-950/15',
        isHero && 'min-h-[260px]',
      )}
    >
      <div
        aria-hidden
        className="absolute -bottom-8 -right-4 text-[180px] font-bold leading-none text-fuchsia-400/15 dark:text-fuchsia-300/10 select-none pointer-events-none"
      >
        ?
      </div>

      <div className="relative z-10 p-5 flex-1 flex flex-col justify-center text-center">
        <p className={cn(
          'font-medium leading-snug text-foreground/95',
          isHero ? 'text-[18px]' : 'text-[14.5px]',
        )}>
          {card.body}
        </p>
      </div>

      <div className="relative z-10 px-3.5 pb-3 pt-1 flex items-center gap-1">
        <TagsRow tags={card.tags} onTagClick={onTagClick} />
        <ActionBar liked={liked} onLike={onLike} onSave={onSave} onCopy={onCopy} onHide={onHide} url={card.url} />
      </div>
    </CardShell>
  );
}

// ─────────────────────────── 3. FACT — "DID YOU KNOW?" + 전구 ───────────────────────────

function FactCard({ card, liked, onOpen, onLike, onSave, onCopy, onHide, onTagClick }: Props) {
  return (
    <CardShell
      onOpen={onOpen}
      ariaLabel={card.title ?? card.body.slice(0, 40)}
      className="bg-emerald-50/40 dark:bg-emerald-950/15"
    >
      <Lightbulb
        aria-hidden
        className="absolute -top-3 -right-3 h-24 w-24 text-emerald-400/15 dark:text-emerald-300/10 -rotate-12 pointer-events-none"
        strokeWidth={1}
      />

      <div className="relative z-10 p-4 flex-1 flex flex-col">
        <span className="inline-block self-start text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400 bg-emerald-200/40 dark:bg-emerald-500/15 px-2 py-0.5 rounded-full mb-2">
          알고 있었어요?
        </span>
        {card.title && (
          <h3 className="text-[13px] font-bold mb-1.5 leading-snug">{card.title}</h3>
        )}
        <p
          className="text-[11.5px] leading-relaxed text-foreground/90"
          style={{ display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {card.body}
        </p>
      </div>

      <div className="relative z-10 px-3.5 pb-3 pt-1 flex items-center gap-1">
        <TagsRow tags={card.tags} onTagClick={onTagClick} />
        <ActionBar liked={liked} onLike={onLike} onSave={onSave} onCopy={onCopy} onHide={onHide} url={card.url} />
      </div>
    </CardShell>
  );
}

// ─────────────────────────── 4. RITUAL — 새벽 그라데이션 ───────────────────────────

function RitualCard({ card, liked, onOpen, onLike, onSave, onCopy, onHide, onTagClick }: Props) {
  return (
    <CardShell
      onOpen={onOpen}
      ariaLabel={card.title ?? card.body.slice(0, 40)}
      className="bg-gradient-to-br from-orange-100/60 via-amber-50/40 to-transparent dark:from-orange-950/30 dark:via-amber-950/15 dark:to-transparent"
    >
      <Sunrise
        aria-hidden
        className="absolute top-3 right-3 h-10 w-10 text-orange-400/40 dark:text-orange-300/30 pointer-events-none"
        strokeWidth={1.4}
      />

      <div className="relative z-10 p-4 pr-14 flex-1 flex flex-col">
        <span className="text-[10px] font-mono uppercase tracking-wider text-orange-700 dark:text-orange-300 mb-2">
          오늘의 작은 의식
        </span>
        {card.title && (
          <h3 className="text-[13px] font-semibold mb-1.5 leading-snug">{card.title}</h3>
        )}
        <p
          className="text-[11.5px] leading-relaxed text-foreground/90"
          style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {card.body}
        </p>
      </div>

      <div className="relative z-10 px-3.5 pb-3 pt-1 flex items-center gap-1">
        <TagsRow tags={card.tags} onTagClick={onTagClick} />
        <ActionBar liked={liked} onLike={onLike} onSave={onSave} onCopy={onCopy} onHide={onHide} url={card.url} />
      </div>
    </CardShell>
  );
}

// ─────────────────────────── 5. PAIRING — A + B split ───────────────────────────

function PairingCard({ card, liked, onOpen, onLike, onSave, onCopy, onHide, onTagClick }: Props) {
  // 제목에 "+" 가 있으면 split 으로 — 없으면 그냥 표시
  const split = card.title?.split(/\s*\+\s*/) ?? [];
  const hasSplit = split.length === 2;
  return (
    <CardShell
      onOpen={onOpen}
      ariaLabel={card.title ?? card.body.slice(0, 40)}
      className="bg-rose-50/40 dark:bg-rose-950/15"
    >
      <div className="relative z-10 p-4 flex-1 flex flex-col">
        <span className="text-[10px] font-mono uppercase tracking-wider text-rose-700 dark:text-rose-300 mb-2">
          오늘의 페어링
        </span>

        {hasSplit ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-2.5">
            <div className="text-[12.5px] font-semibold text-right truncate">
              {split[0]}
            </div>
            <span className="h-7 w-7 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 flex items-center justify-center text-[14px] font-bold">
              +
            </span>
            <div className="text-[12.5px] font-semibold text-left truncate">
              {split[1]}
            </div>
          </div>
        ) : (
          card.title && (
            <h3 className="text-[13px] font-semibold mb-1.5 leading-snug">{card.title}</h3>
          )
        )}

        <p
          className="text-[11.5px] leading-relaxed text-foreground/90"
          style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {card.body}
        </p>
      </div>

      <div className="relative z-10 px-3.5 pb-3 pt-1 flex items-center gap-1">
        <TagsRow tags={card.tags} onTagClick={onTagClick} />
        <ActionBar liked={liked} onLike={onLike} onSave={onSave} onCopy={onCopy} onHide={onHide} url={card.url} />
      </div>
    </CardShell>
  );
}

// ─────────────────────────── 6. LINK — 우측 큰 화살표 + hover lift ───────────────────────────

function LinkCard({ card, liked, onOpen, onLike, onSave, onCopy, onHide, onTagClick }: Props) {
  return (
    <CardShell
      onOpen={onOpen}
      ariaLabel={card.title ?? card.body.slice(0, 40)}
      className="bg-cyan-50/40 dark:bg-cyan-950/15 hover:-translate-y-0.5"
    >
      {/* 우상단 화살표 — hover 시 살짝 이동 */}
      <div
        aria-hidden
        className="absolute top-3 right-3 h-9 w-9 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
      >
        <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
      </div>

      <div className="relative z-10 p-4 pr-14 flex-1 flex flex-col">
        <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-300 mb-2">
          작은 발견
        </span>
        {card.title && (
          <h3 className="text-[13px] font-semibold mb-1.5 leading-snug truncate">
            {card.title}
          </h3>
        )}
        <p
          className="text-[11.5px] leading-relaxed text-foreground/90"
          style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {card.body}
        </p>
        {card.url && (
          <p className="text-[10px] text-muted-foreground mt-2 truncate">
            {prettyHost(card.url)}
          </p>
        )}
      </div>

      <div className="relative z-10 px-3.5 pb-3 pt-1 flex items-center gap-1">
        <TagsRow tags={card.tags} onTagClick={onTagClick} />
        <ActionBar liked={liked} onLike={onLike} onSave={onSave} onCopy={onCopy} onHide={onHide} url={card.url} />
      </div>
    </CardShell>
  );
}

// ─────────────────────────── 7. TOPIC — 매거진 스타일 (이미지 포함) ───────────────────────────

function TopicCard({ card, liked, variant, onOpen, onLike, onSave, onCopy, onHide, onTagClick }: Props) {
  const isHero = variant === 'hero';
  return (
    <CardShell
      onOpen={onOpen}
      ariaLabel={card.title ?? card.body.slice(0, 40)}
      className={cn(
        'bg-[hsl(var(--card))]',
        isHero && 'min-h-[280px]',
      )}
    >
      {isHero && card.imageUrl && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-[hsl(var(--muted))]">
          <img
            src={card.imageUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <div className="relative z-10 p-4 flex-1 flex flex-col">
        <MetaRow card={card} />
        {card.title && (
          <h3 className={cn(
            'font-bold mt-2 mb-2 leading-tight tracking-tight',
            isHero ? 'text-[18px]' : 'text-[14px]',
          )}>
            {card.title}
          </h3>
        )}
        <p
          className={cn(
            'leading-relaxed text-foreground/85',
            isHero ? 'text-[12.5px]' : 'text-[11.5px]',
          )}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: isHero ? 6 : 5,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {card.body}
        </p>
        {card.source && (
          <p className="text-[10px] text-muted-foreground mt-2 truncate">
            {card.source}
          </p>
        )}
      </div>

      <div className="relative z-10 px-3.5 pb-3 pt-1 flex items-center gap-1">
        <TagsRow tags={card.tags} onTagClick={onTagClick} />
        <ActionBar liked={liked} onLike={onLike} onSave={onSave} onCopy={onCopy} onHide={onHide} url={card.url} />
      </div>
    </CardShell>
  );
}

// ─────────────────────────── 8. SNIPPET — 부드러운 보라톤 ───────────────────────────

function SnippetCard({ card, liked, onOpen, onLike, onSave, onCopy, onHide, onTagClick }: Props) {
  return (
    <CardShell
      onOpen={onOpen}
      ariaLabel={card.body.slice(0, 40)}
      className="bg-violet-50/30 dark:bg-violet-950/15 rounded-3xl"
    >
      <Sparkles
        aria-hidden
        className="absolute top-3 right-3 h-5 w-5 text-violet-400/50 dark:text-violet-300/40"
      />
      <div className="relative z-10 p-4 pr-10 flex-1 flex flex-col">
        <span className="text-[10px] font-mono uppercase tracking-wider text-violet-700 dark:text-violet-300 mb-2">
          단편
        </span>
        <p
          className="text-[12px] leading-relaxed text-foreground/90 italic"
          style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {card.body}
        </p>
      </div>
      <div className="relative z-10 px-3.5 pb-3 pt-1 flex items-center gap-1">
        <TagsRow tags={card.tags} onTagClick={onTagClick} />
        <ActionBar liked={liked} onLike={onLike} onSave={onSave} onCopy={onCopy} onHide={onHide} url={card.url} />
      </div>
    </CardShell>
  );
}

// ─────────────────────────── util ───────────────────────────

function prettyHost(url: string): string {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, '');
  } catch {
    return url;
  }
}
