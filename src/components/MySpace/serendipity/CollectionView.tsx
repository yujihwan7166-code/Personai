/**
 * 우연의 발견 — 좋아요한 카드 모음 뷰 (모달).
 * 검색·타입 필터·일괄 메모 내보내기 지원.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Quote, Lightbulb, Sparkles, Link2, Sunrise, HelpCircle, Coffee,
  Heart, X, ExternalLink, Search, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CARD_TYPE_META, type CardType, type SerendipityCard } from '@/lib/serendipity/types';
import { addWidget, createDefaultWidget, type MemoWidget } from '@/lib/mySpaceStore';
import { toast } from '@/hooks/use-toast';

interface Props {
  cards: SerendipityCard[];
  likedIds: string[];
  onClose: () => void;
  onUnlike: (id: string) => void;
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

const TYPE_ORDER: CardType[] = ['quote', 'fact', 'snippet', 'link', 'ritual', 'question', 'pairing'];

export function SerendipityCollectionView({ cards, likedIds, onClose, onUnlike }: Props) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<CardType | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const liked = useMemo(() => {
    const set = new Set(likedIds);
    return cards.filter((c) => set.has(c.id));
  }, [cards, likedIds]);

  // 좋아요한 카드들의 type 분포 — 필터 칩에 카운트 표시
  const typeCounts = useMemo(() => {
    const m = new Map<CardType, number>();
    for (const c of liked) m.set(c.type, (m.get(c.type) ?? 0) + 1);
    return m;
  }, [liked]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return liked.filter((c) => {
      if (typeFilter && c.type !== typeFilter) return false;
      if (!q) return true;
      const haystack = [c.title, c.body, c.source, ...(c.tags ?? [])].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [liked, query, typeFilter]);

  const exportAllAsMemo = () => {
    if (liked.length === 0) return;
    const memo = createDefaultWidget('memo') as MemoWidget;
    memo.title = `🎲 모은 카드 ${liked.length}장`;
    memo.body = liked.map((c) => {
      const titleLine = c.title ? `[${CARD_TYPE_META[c.type].label}] ${c.title}` : `[${CARD_TYPE_META[c.type].label}]`;
      const sourceLine = c.source ? `\n— ${c.source}` : '';
      const urlLine = c.url ? `\n${c.url}` : '';
      return `${titleLine}\n${c.body}${sourceLine}${urlLine}`;
    }).join('\n\n───\n\n');
    addWidget(memo);
    toast({ title: '메모로 내보냄', description: `${liked.length}장이 한 메모 위젯에 묶여 추가됐어요.` });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="모은 카드"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div
        className={cn(
          'relative w-full max-w-[720px] max-h-[85vh] overflow-hidden flex flex-col',
          'rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--hairline))]',
          'shadow-[0_24px_80px_hsl(220_20%_5%_/_0.4)]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[hsl(var(--hairline))]">
          <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
          <h2 className="text-[14px] font-semibold">모은 카드</h2>
          <span className="text-[11px] text-muted-foreground">{liked.length}장</span>
          <div className="flex-1" />
          {liked.length > 0 && (
            <button
              type="button"
              onClick={exportAllAsMemo}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px]',
                'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-foreground transition-colors',
              )}
              aria-label="전체 메모로 내보내기"
              title="전체 메모로 내보내기"
            >
              <Download className="h-3 w-3" />
              <span>한 메모로 내보내기</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="h-7 w-7 rounded-full bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] flex items-center justify-center transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* toolbar: search + type filter */}
        {liked.length > 0 && (
          <div className="px-5 py-2.5 border-b border-[hsl(var(--hairline))] space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="제목·본문·태그로 검색"
                className={cn(
                  'w-full h-7 pl-7 pr-2 text-[11.5px] rounded-md',
                  'bg-[hsl(var(--muted))] outline-none focus:ring-1 focus:ring-[hsl(var(--focus-ring))]',
                  'placeholder:text-muted-foreground/60',
                )}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="검색 지우기"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full hover:bg-[hsl(var(--accent))] flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              <FilterChip
                active={typeFilter === null}
                onClick={() => setTypeFilter(null)}
                label="전체"
                count={liked.length}
              />
              {TYPE_ORDER.map((t) => {
                const cnt = typeCounts.get(t) ?? 0;
                if (cnt === 0) return null;
                return (
                  <FilterChip
                    key={t}
                    active={typeFilter === t}
                    onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                    label={CARD_TYPE_META[t].label}
                    count={cnt}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* body */}
        <div className="flex-1 overflow-y-auto p-4">
          {liked.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Heart className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-[12.5px]">아직 모은 카드가 없어요.</p>
              <p className="text-[11px] mt-1 opacity-80">
                마음에 드는 카드에 ❤️ 를 눌러 모아보세요.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-[12.5px]">검색 결과가 없어요.</p>
              <button
                type="button"
                onClick={() => { setQuery(''); setTypeFilter(null); }}
                className="text-[11px] mt-2 underline opacity-80 hover:opacity-100"
              >
                필터 초기화
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filtered.map((card) => {
                const TypeIcon = TYPE_ICON[card.type];
                const typeLabel = CARD_TYPE_META[card.type].label;
                return (
                  <article
                    key={card.id}
                    className={cn(
                      'group relative rounded-xl border border-[hsl(var(--hairline))]',
                      'bg-[hsl(var(--card))] p-3 hover:border-[hsl(var(--border))] transition-colors',
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <TypeIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        {typeLabel}
                      </span>
                      <div className="flex-1" />
                      <button
                        type="button"
                        onClick={() => onUnlike(card.id)}
                        aria-label="좋아요 해제"
                        title="좋아요 해제"
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity h-5 w-5 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/10"
                      >
                        <Heart className="h-3 w-3 fill-current" />
                      </button>
                    </div>
                    {card.title && (
                      <h3 className="text-[12px] font-semibold mb-1 leading-snug truncate">
                        {card.title}
                      </h3>
                    )}
                    <p
                      className="text-[11.5px] leading-relaxed text-foreground/90"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
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
                    {card.url && (
                      <a
                        href={card.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground mt-1.5"
                      >
                        열기 <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                    {card.tags && card.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {card.tags.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setQuery(t)}
                            className="text-[9.5px] text-muted-foreground bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] px-1.5 py-0.5 rounded-full transition-colors"
                            aria-label={`태그 ${t} 로 검색`}
                          >
                            #{t}
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* footer hint */}
        {liked.length > 0 && filtered.length !== liked.length && (
          <div className="px-5 py-2 border-t border-[hsl(var(--hairline))] text-[10.5px] text-muted-foreground">
            {filtered.length} / {liked.length} 장 표시 중
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active, onClick, label, count,
}: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] transition-colors',
        active
          ? 'bg-foreground text-background'
          : 'bg-[hsl(var(--muted))] text-muted-foreground hover:bg-[hsl(var(--accent))] hover:text-foreground',
      )}
      aria-pressed={active}
    >
      <span>{label}</span>
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}
