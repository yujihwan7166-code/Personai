/**
 * /discover — 우연의 발견 정보 피드.
 *
 * 한 화면에 다채로운 카드를 그리드로 노출 (hero 카드 없음).
 *  - 외부에서 가져온 발견: 위키피디아 무작위 글 + NASA APOD (큰 카드)
 *  - 깊이 있는 지식 (topic) 3장
 *  - 가벼운 영감 (quote/fact/snippet/question) 4장
 *  - 발견 (pairing/ritual/link) 3장
 *
 * 카드 클릭 → 상세 모달. 좋아요·저장·복사·숨김은 widget 인스턴스와 공유.
 * 액션은 hover/focus 시만 노출 (시각적 정돈).
 * 타입별 좌측 색 라인 + 읽기 시간 표시 (시각 위계).
 * 태그 클릭 → 같은 태그 카드 모아보기 모달.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Keyboard, RefreshCw, Heart,
  Quote, Lightbulb, Sparkles, Link2, Sunrise, HelpCircle, Coffee, BookOpen,
  Clock, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getWidgets, subscribeWidgets, addWidget, createDefaultWidget, updateWidget,
  type SerendipityWidget,
} from '@/lib/mySpaceStore';
import { addMemo } from '@/lib/memoStore';
import { CARD_TYPE_META, estimateReadMinutes, type CardType, type SerendipityCard } from '@/lib/serendipity/types';
import { SEED_CARDS } from '@/lib/serendipity/cards';
import { getTodayKey } from '@/lib/serendipity/engine';
import { fetchAllExternalCards, refetchExternalCards } from '@/lib/serendipity/external';
import { SerendipityShortcutsModal } from '@/components/MySpace/serendipity/ShortcutsModal';
import { SerendipityDetailModal } from '@/components/MySpace/serendipity/DetailModal';
import { SerendipityCollectionView } from '@/components/MySpace/serendipity/CollectionView';
import { DiscoverCardTile } from '@/components/MySpace/serendipity/DiscoverCardTile';
import { toast } from '@/hooks/use-toast';

// TagFilterModal 안에서 사용
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

/** 일일 시드 — 오늘 날짜 기반으로 무작위 셔플 (같은 날 = 같은 순서). */
function dailySeed(dateKey: string): number {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) h = (h * 31 + dateKey.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Discover() {
  const navigate = useNavigate();
  const [widgets, setWidgetsState] = useState(() => getWidgets());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCollection, setShowCollection] = useState(false);
  const [detailCard, setDetailCard] = useState<SerendipityCard | null>(null);
  const [externalCards, setExternalCards] = useState<SerendipityCard[]>([]);
  const [externalLoading, setExternalLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // 그리드 셔플 시드 토글
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // store 변경 구독
  useEffect(() => subscribeWidgets(setWidgetsState), []);

  // serendipity 위젯 인스턴스 자동 보장 (StrictMode 더블 호출 가드)
  useEffect(() => {
    const fresh = getWidgets();
    const exists = fresh.some((w) => w.kind === 'serendipity');
    if (!exists) addWidget(createDefaultWidget('serendipity'));
  }, []);

  const widget = useMemo<SerendipityWidget | undefined>(
    () => widgets.find((w): w is SerendipityWidget => w.kind === 'serendipity'),
    [widgets],
  );

  const likedIds = useMemo(() => widget?.likedIds ?? [], [widget?.likedIds]);
  const hiddenIds = useMemo(() => widget?.hiddenIds ?? [], [widget?.hiddenIds]);

  // 외부 카드 fetch
  useEffect(() => {
    let cancelled = false;
    setExternalLoading(true);
    fetchAllExternalCards().then((cards) => {
      if (cancelled) return;
      setExternalCards(cards);
      setExternalLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // 페이지 전역 ? 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && /input|textarea/i.test(tgt.tagName)) return;
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ─────────────── 오늘의 그리드 카드 셀렉션 ───────────────
  const today = getTodayKey();
  const seed = dailySeed(today + ':' + refreshKey);

  const cardsByType = useMemo(() => {
    const blocked = new Set(hiddenIds);
    const visible = SEED_CARDS.filter((c) => !blocked.has(c.id));
    const map = new Map<CardType, SerendipityCard[]>();
    for (const c of visible) {
      const list = map.get(c.type) ?? [];
      list.push(c);
      map.set(c.type, list);
    }
    return map;
  }, [hiddenIds]);

  const pickN = useCallback((type: CardType, n: number, offset = 0): SerendipityCard[] => {
    const list = cardsByType.get(type) ?? [];
    if (list.length === 0) return [];
    const shuffled = shuffleWithSeed(list, seed + type.charCodeAt(0) + offset);
    return shuffled.slice(0, n);
  }, [cardsByType, seed]);

  const topicCards = useMemo(() => pickN('topic', 3), [pickN]);
  const lightCards = useMemo(() => [
    ...pickN('quote', 1),
    ...pickN('fact', 1),
    ...pickN('snippet', 1),
    ...pickN('question', 1),
  ], [pickN]);
  const discoveryCards = useMemo(() => [
    ...pickN('pairing', 1),
    ...pickN('ritual', 1),
    ...pickN('link', 1),
  ], [pickN]);

  // 태그 필터 — 클릭한 태그가 들어 있는 모든 시드 + 외부 카드
  const taggedCards = useMemo<SerendipityCard[]>(() => {
    if (!tagFilter) return [];
    const all = [...externalCards, ...SEED_CARDS];
    return all.filter((c) => (c.tags ?? []).some((t) => t === tagFilter) && !hiddenIds.includes(c.id));
  }, [tagFilter, externalCards, hiddenIds]);

  // ─────────────── 액션 ───────────────
  const isLiked = (cardId: string) => likedIds.includes(cardId);
  const toggleLike = useCallback((cardId: string) => {
    if (!widget) return;
    const set = new Set(likedIds);
    if (set.has(cardId)) set.delete(cardId);
    else set.add(cardId);
    updateWidget<SerendipityWidget>(widget.id, { likedIds: Array.from(set) });
  }, [widget, likedIds]);

  const saveCardAsMemo = useCallback((card: SerendipityCard) => {
    const titleLabel = CARD_TYPE_META[card.type].label;
    const titleLine = card.title ? `🎲 ${titleLabel} · ${card.title}` : `🎲 ${titleLabel}`;
    const sourceLine = card.source ? `\n\n${card.source}` : '';
    const urlLine = card.url ? `\n${card.url}` : '';
    addMemo({ body: `${titleLine}\n\n${card.body}${sourceLine}${urlLine}` });
    toast({ title: '메모로 저장됨', description: '/메모 페이지에서 확인할 수 있어요.' });
  }, []);

  const copyCard = useCallback(async (card: SerendipityCard) => {
    const sourceLine = card.source ? `\n\n${card.source}` : '';
    const urlLine = card.url ? `\n${card.url}` : '';
    const text = `${card.title ? card.title + '\n\n' : ''}${card.body}${sourceLine}${urlLine}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: '복사됨' });
    } catch {
      toast({ title: '복사 실패' });
    }
  }, []);

  const hideCard = useCallback((cardId: string) => {
    if (!widget) return;
    const next = Array.from(new Set([...(widget.hiddenIds ?? []), cardId]));
    updateWidget<SerendipityWidget>(widget.id, { hiddenIds: next });
    toast({ title: '숨김', description: '이 카드는 다시 보이지 않아요.' });
  }, [widget]);

  const refreshAll = useCallback(async () => {
    setExternalLoading(true);
    setRefreshKey((k) => k + 1);
    const cards = await refetchExternalCards();
    setExternalCards(cards);
    setExternalLoading(false);
    toast({ title: '새로 발견했어요', description: '오늘의 카드가 갱신됐습니다.' });
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* 상단 바 */}
      <header className="sticky top-0 z-10 border-b border-[hsl(var(--hairline))] bg-[hsl(var(--background))]/85 backdrop-blur">
        <div className="mx-auto max-w-[1100px] px-4 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="뒤로"
            className="h-8 w-8 rounded-full hover:bg-[hsl(var(--accent))] flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[18px]" aria-hidden>🎲</span>
            <h1 className="text-[15px] font-semibold truncate">우연의 발견</h1>
            <span className="hidden sm:inline text-[11.5px] text-muted-foreground truncate">
              {formatToday(today)} · 매일 새로운 발견
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowCollection(true)}
            aria-label="모은 카드"
            title="모은 카드"
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11.5px] text-muted-foreground bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] hover:text-foreground transition-colors"
          >
            <Heart className={cn('h-3 w-3', likedIds.length > 0 && 'fill-rose-500 text-rose-500')} />
            <span className="hidden sm:inline">모은 카드</span>
            <span className="tabular-nums">{likedIds.length}</span>
          </button>
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={externalLoading}
            aria-label="전체 새로고침"
            title="전체 새로고침"
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11.5px] text-muted-foreground bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3 w-3', externalLoading && 'animate-spin')} />
            <span className="hidden sm:inline">새로고침</span>
          </button>
          <button
            type="button"
            onClick={() => setShowShortcuts(true)}
            aria-label="단축키 도움말"
            title="단축키 (?)"
            className="inline-flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] hover:text-foreground transition-colors"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:py-8 space-y-10">
        {/* 외부 — 위키 + NASA — 페이지 첫 인상으로 큰 카드 */}
        <section>
          <SectionHeader
            emoji="🌐"
            title="오늘의 발견"
            subtitle="위키피디아 · NASA — 매일 자동 갱신"
          />
          {externalLoading && externalCards.length === 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SkeletonCard tall />
              <SkeletonCard tall />
            </div>
          ) : externalCards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[hsl(var(--hairline))] py-8 text-center text-[12px] text-muted-foreground">
              외부 데이터를 가져오지 못했어요. 잠시 후 새로고침해주세요.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {externalCards.map((card) => (
                <DiscoverCardTile
                  key={card.id}
                  card={card}
                  variant="hero"
                  liked={isLiked(card.id)}
                  onOpen={() => setDetailCard(card)}
                  onLike={() => toggleLike(card.id)}
                  onSave={() => saveCardAsMemo(card)}
                  onCopy={() => void copyCard(card)}
                  onHide={() => hideCard(card.id)}
                  onTagClick={(t) => setTagFilter(t)}
                />
              ))}
            </div>
          )}
        </section>

        {/* 깊이 있는 지식 */}
        <section>
          <SectionHeader emoji="📚" title="깊이 있는 지식" subtitle="2~3분이면 새로 알게 되는 것" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topicCards.map((card) => (
              <DiscoverCardTile
                key={card.id}
                card={card}
                variant="default"
                liked={isLiked(card.id)}
                onOpen={() => setDetailCard(card)}
                onLike={() => toggleLike(card.id)}
                onSave={() => saveCardAsMemo(card)}
                onCopy={() => void copyCard(card)}
                onHide={() => hideCard(card.id)}
                onTagClick={(t) => setTagFilter(t)}
              />
            ))}
          </div>
        </section>

        {/* 가벼운 영감 */}
        <section>
          <SectionHeader emoji="✨" title="가벼운 영감" subtitle="명언·사실·단편·질문" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {lightCards.map((card) => (
              <DiscoverCardTile
                key={card.id}
                card={card}
                variant="compact"
                liked={isLiked(card.id)}
                onOpen={() => setDetailCard(card)}
                onLike={() => toggleLike(card.id)}
                onSave={() => saveCardAsMemo(card)}
                onCopy={() => void copyCard(card)}
                onHide={() => hideCard(card.id)}
                onTagClick={(t) => setTagFilter(t)}
              />
            ))}
          </div>
        </section>

        {/* 발견 — 페어링·의식·링크 */}
        <section>
          <SectionHeader emoji="🎁" title="오늘 시도해볼 것" subtitle="작은 의식·페어링·외부 링크" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {discoveryCards.map((card) => (
              <DiscoverCardTile
                key={card.id}
                card={card}
                variant="default"
                liked={isLiked(card.id)}
                onOpen={() => setDetailCard(card)}
                onLike={() => toggleLike(card.id)}
                onSave={() => saveCardAsMemo(card)}
                onCopy={() => void copyCard(card)}
                onHide={() => hideCard(card.id)}
                onTagClick={(t) => setTagFilter(t)}
              />
            ))}
          </div>
        </section>

        {/* 푸터 */}
        <section className="text-[11px] text-muted-foreground pt-4 border-t border-[hsl(var(--hairline))]">
          <span className="font-mono">팁:</span>{' '}
          카드 클릭 = 상세 보기 · 태그 클릭 = 같은 결의 카드 모아보기 · ? = 단축키
        </section>
      </main>

      {/* 모달들 */}
      {showShortcuts && <SerendipityShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showCollection && (
        <SerendipityCollectionView
          cards={SEED_CARDS}
          likedIds={likedIds}
          onClose={() => setShowCollection(false)}
          onUnlike={(id) => {
            if (!widget) return;
            const set = new Set(likedIds);
            set.delete(id);
            updateWidget<SerendipityWidget>(widget.id, { likedIds: Array.from(set) });
          }}
        />
      )}
      {detailCard && (
        <SerendipityDetailModal
          card={detailCard}
          liked={isLiked(detailCard.id)}
          onClose={() => setDetailCard(null)}
          onRefresh={() => setDetailCard(null)}
          onToggleLike={() => toggleLike(detailCard.id)}
          onSaveAsMemo={() => { saveCardAsMemo(detailCard); setDetailCard(null); }}
          onHide={() => { hideCard(detailCard.id); setDetailCard(null); }}
        />
      )}
      {tagFilter && (
        <TagFilterModal
          tag={tagFilter}
          cards={taggedCards}
          likedIds={likedIds}
          onClose={() => setTagFilter(null)}
          onOpen={(c) => { setTagFilter(null); setDetailCard(c); }}
          onLike={(id) => toggleLike(id)}
        />
      )}
    </div>
  );
}

// ─────────────────────────── 보조 컴포넌트 ───────────────────────────

function SectionHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-3 px-1">
      <span className="text-[16px]" aria-hidden>{emoji}</span>
      <h2 className="text-[14px] font-semibold">{title}</h2>
      {subtitle && (
        <span className="text-[11px] text-muted-foreground truncate">{subtitle}</span>
      )}
    </div>
  );
}

function SkeletonCard({ tall }: { tall?: boolean } = {}) {
  return (
    <div className={cn(
      'rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4 animate-pulse',
      tall && 'min-h-[280px]',
    )}>
      <div className="h-3 w-16 bg-[hsl(var(--muted))] rounded mb-3" />
      <div className="h-4 w-3/4 bg-[hsl(var(--muted))] rounded mb-2" />
      <div className="h-3 w-full bg-[hsl(var(--muted))] rounded mb-1.5" />
      <div className="h-3 w-5/6 bg-[hsl(var(--muted))] rounded mb-1.5" />
      <div className="h-3 w-2/3 bg-[hsl(var(--muted))] rounded" />
    </div>
  );
}

function formatToday(key: string): string {
  const [y, m, d] = key.split('-').map((s) => parseInt(s, 10));
  const date = new Date(y, m - 1, d);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}년 ${m}월 ${d}일 (${days[date.getDay()]})`;
}

// ─────────────────────────── 태그 필터 모달 ───────────────────────────

interface TagFilterModalProps {
  tag: string;
  cards: SerendipityCard[];
  likedIds: string[];
  onClose: () => void;
  onOpen: (card: SerendipityCard) => void;
  onLike: (id: string) => void;
}

function TagFilterModal({ tag, cards, likedIds, onClose, onOpen, onLike }: TagFilterModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`#${tag} 카드 모음`}
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
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[hsl(var(--hairline))]">
          <span className="text-[11.5px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--muted))]">#{tag}</span>
          <h2 className="text-[14px] font-semibold">같은 결의 카드</h2>
          <span className="text-[11px] text-muted-foreground">{cards.length}장</span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="h-7 w-7 rounded-full bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] flex items-center justify-center transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {cards.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-[12px]">
              이 태그의 다른 카드가 없어요.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {cards.map((card) => {
                const TypeIcon = TYPE_ICON[card.type];
                const meta = CARD_TYPE_META[card.type];
                const readMin = estimateReadMinutes(card);
                const liked = likedIds.includes(card.id);
                return (
                  <article
                    key={card.id}
                    className={cn(
                      'group relative rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]',
                      'border-l-[3px]', meta.accent,
                      'hover:border-[hsl(var(--border))] transition-colors',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onOpen(card)}
                      className="w-full text-left p-3 hover:bg-[hsl(var(--accent))]/30 transition-colors rounded-r-xl"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <TypeIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          {meta.label}
                        </span>
                        <div className="flex-1" />
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {readMin}분
                        </span>
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
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {card.body}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onLike(card.id)}
                      className={cn(
                        'absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center transition-colors',
                        liked
                          ? 'text-rose-500 opacity-100'
                          : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-[hsl(var(--accent))]',
                      )}
                      aria-label={liked ? '좋아요 해제' : '좋아요'}
                      title={liked ? '좋아요 해제' : '좋아요'}
                    >
                      <Heart className={cn('h-3 w-3', liked && 'fill-current')} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
