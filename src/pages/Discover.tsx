/**
 * /discover — 우연의 발견 정보 피드.
 *
 * 한 화면에 다채로운 카드를 그리드로 노출.
 *  - 메인 hero 카드 (오늘의 한 장 — widget store 공유)
 *  - 외부: 위키피디아 무작위 글 + NASA APOD
 *  - 깊이 있는 지식 (topic) 3장
 *  - 가벼운 영감 (quote/fact/snippet/question) 4장
 *  - 발견 (pairing/ritual/link) 3장
 *
 * 카드 클릭 → 상세 모달. 좋아요·저장·복사·숨김은 widget 인스턴스와 공유.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Keyboard, RefreshCw, Heart, Save, Copy, EyeOff, ExternalLink,
  Quote, Lightbulb, Sparkles, Link2, Sunrise, HelpCircle, Coffee, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getWidgets, subscribeWidgets, addWidget, createDefaultWidget, updateWidget,
  type SerendipityWidget,
} from '@/lib/mySpaceStore';
import { addMemo } from '@/lib/memoStore';
import { CARD_TYPE_META, type CardType, type SerendipityCard } from '@/lib/serendipity/types';
import { SEED_CARDS } from '@/lib/serendipity/cards';
import { getTodayKey } from '@/lib/serendipity/engine';
import { fetchAllExternalCards, refetchExternalCards } from '@/lib/serendipity/external';
import { SerendipityW } from '@/components/MySpace/serendipity/Card';
import { SerendipityShortcutsModal } from '@/components/MySpace/serendipity/ShortcutsModal';
import { SerendipityDetailModal } from '@/components/MySpace/serendipity/DetailModal';
import { SerendipityCollectionView } from '@/components/MySpace/serendipity/CollectionView';
import { toast } from '@/hooks/use-toast';

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

  // store 변경 구독
  useEffect(() => subscribeWidgets(setWidgetsState), []);

  // serendipity 위젯 인스턴스 자동 보장 (StrictMode 더블 호출 가드)
  useEffect(() => {
    const fresh = getWidgets();
    const exists = fresh.some((w) => w.kind === 'serendipity');
    if (!exists) addWidget(createDefaultWidget('serendipity'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const widget = useMemo<SerendipityWidget | undefined>(
    () => widgets.find((w): w is SerendipityWidget => w.kind === 'serendipity'),
    [widgets],
  );

  const likedIds = useMemo(() => widget?.likedIds ?? [], [widget?.likedIds]);
  const hiddenIds = useMemo(() => widget?.hiddenIds ?? [], [widget?.hiddenIds]);

  // 외부 카드 fetch (페이지 진입 시 1회 — 캐시는 일 단위)
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

  // 시드 카드를 hidden 제외하고 type 별 분류 → 매일 다른 셔플 결과
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

  // ─────────────── 액션 (페이지 카드 공통) ───────────────
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

  // 전체 새로고침 — 외부 카드 재fetch + 그리드 셔플
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
              {formatToday(today)} · 오늘 어떤 발견이 기다리고 있을까요
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

      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:py-8 space-y-8">
        {/* hero — widget 인스턴스 */}
        {widget && (
          <section>
            <SectionHeader emoji="🌟" title="오늘의 한 장" subtitle="자정마다 새로 도착해요" />
            <div className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]/40 p-3 sm:p-4">
              <div className="max-w-[560px] mx-auto">
                <SerendipityW widget={widget} editable={true} />
              </div>
            </div>
          </section>
        )}

        {/* 외부 — 위키 + NASA */}
        <section>
          <SectionHeader emoji="🌐" title="외부에서 가져온 발견" subtitle="위키피디아 · NASA — 매일 자동 갱신" />
          {externalLoading && externalCards.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : externalCards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[hsl(var(--hairline))] py-8 text-center text-[12px] text-muted-foreground">
              외부 데이터를 가져오지 못했어요. 잠시 후 새로고침해주세요.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {externalCards.map((card) => (
                <CardTile
                  key={card.id}
                  card={card}
                  large
                  liked={isLiked(card.id)}
                  onOpen={() => setDetailCard(card)}
                  onLike={() => toggleLike(card.id)}
                  onSave={() => saveCardAsMemo(card)}
                  onCopy={() => void copyCard(card)}
                  onHide={() => hideCard(card.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* 깊이 있는 지식 */}
        <section>
          <SectionHeader emoji="📚" title="깊이 있는 지식" subtitle="2~3분이면 새로 알게 되는 것" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topicCards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                liked={isLiked(card.id)}
                onOpen={() => setDetailCard(card)}
                onLike={() => toggleLike(card.id)}
                onSave={() => saveCardAsMemo(card)}
                onCopy={() => void copyCard(card)}
                onHide={() => hideCard(card.id)}
              />
            ))}
          </div>
        </section>

        {/* 가벼운 영감 */}
        <section>
          <SectionHeader emoji="✨" title="가벼운 영감" subtitle="명언·사실·단편·질문" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {lightCards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                compact
                liked={isLiked(card.id)}
                onOpen={() => setDetailCard(card)}
                onLike={() => toggleLike(card.id)}
                onSave={() => saveCardAsMemo(card)}
                onCopy={() => void copyCard(card)}
                onHide={() => hideCard(card.id)}
              />
            ))}
          </div>
        </section>

        {/* 발견 — 페어링·의식·링크 */}
        <section>
          <SectionHeader emoji="🎁" title="오늘 시도해볼 것" subtitle="작은 의식·페어링·외부 링크" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {discoveryCards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                liked={isLiked(card.id)}
                onOpen={() => setDetailCard(card)}
                onLike={() => toggleLike(card.id)}
                onSave={() => saveCardAsMemo(card)}
                onCopy={() => void copyCard(card)}
                onHide={() => hideCard(card.id)}
              />
            ))}
          </div>
        </section>

        {/* 푸터 단축키 */}
        <section className="text-[11px] text-muted-foreground pt-4 border-t border-[hsl(var(--hairline))]">
          <span className="font-mono">단축키:</span>{' '}
          ? 도움말 · 카드 클릭으로 상세 보기 · ❤️ 누르면 모은 카드에 모임
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
          onRefresh={() => setDetailCard(null)} /* 페이지 컨텍스트 — 전체 새로고침은 헤더에 별도 */
          onToggleLike={() => toggleLike(detailCard.id)}
          onSaveAsMemo={() => { saveCardAsMemo(detailCard); setDetailCard(null); }}
          onHide={() => { hideCard(detailCard.id); setDetailCard(null); }}
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

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4 animate-pulse">
      <div className="h-3 w-16 bg-[hsl(var(--muted))] rounded mb-3" />
      <div className="h-4 w-3/4 bg-[hsl(var(--muted))] rounded mb-2" />
      <div className="h-3 w-full bg-[hsl(var(--muted))] rounded mb-1.5" />
      <div className="h-3 w-5/6 bg-[hsl(var(--muted))] rounded mb-1.5" />
      <div className="h-3 w-2/3 bg-[hsl(var(--muted))] rounded" />
    </div>
  );
}

interface CardTileProps {
  card: SerendipityCard;
  liked: boolean;
  large?: boolean;     // 외부 카드용 (이미지·긴 본문)
  compact?: boolean;   // 가벼운 카드용 (질문·명언)
  onOpen: () => void;
  onLike: () => void;
  onSave: () => void;
  onCopy: () => void;
  onHide: () => void;
}

function CardTile({
  card, liked, large, compact, onOpen, onLike, onSave, onCopy, onHide,
}: CardTileProps) {
  const TypeIcon = TYPE_ICON[card.type];
  const typeLabel = CARD_TYPE_META[card.type].label;
  const lineClamp = compact ? 4 : large ? 8 : 6;

  return (
    <article
      className={cn(
        'group relative rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]',
        'hover:border-[hsl(var(--border))] transition-colors overflow-hidden flex flex-col',
      )}
    >
      {/* 이미지 (large + imageUrl) */}
      {large && card.imageUrl && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-[hsl(var(--muted))]">
          <img
            src={card.imageUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={onOpen}
        className="text-left flex-1 p-3.5 hover:bg-[hsl(var(--accent))]/30 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--focus-ring))] rounded-none"
        aria-label={card.title ?? card.body.slice(0, 40)}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <TypeIcon className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            {typeLabel}
          </span>
          {card.origin === 'remote' && (
            <span className="text-[9.5px] px-1 py-0 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
              LIVE
            </span>
          )}
        </div>
        {card.title && (
          <h3 className={cn(
            'font-semibold mb-1.5 leading-snug',
            large ? 'text-[14px]' : 'text-[12.5px]',
          )}>
            {card.title}
          </h3>
        )}
        <p
          className={cn(
            'leading-relaxed text-foreground/90',
            compact ? 'text-[12px]' : large ? 'text-[12.5px]' : 'text-[11.5px]',
          )}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: lineClamp,
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
      </button>

      {/* 액션 바 */}
      <div className="px-3.5 pb-3 flex items-center gap-1 mt-auto">
        <TileBtn
          icon={Heart}
          label={liked ? '좋아요 해제' : '좋아요'}
          onClick={onLike}
          active={liked}
          fill={liked}
        />
        <TileBtn icon={Copy} label="복사" onClick={onCopy} />
        <TileBtn icon={Save} label="메모로 저장" onClick={onSave} />
        <TileBtn icon={EyeOff} label="다시 안 보기" onClick={onHide} />
        <div className="flex-1" />
        {card.url && (
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
            aria-label="외부 링크 열기"
          >
            열기 <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>

      {/* 태그 */}
      {card.tags && card.tags.length > 0 && (
        <div className="px-3.5 pb-3 flex flex-wrap gap-1">
          {card.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="text-[9.5px] text-muted-foreground bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded-full"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function TileBtn({
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

function formatToday(key: string): string {
  // 'YYYY-MM-DD' → 'YYYY년 M월 D일 (요일)'
  const [y, m, d] = key.split('-').map((s) => parseInt(s, 10));
  const date = new Date(y, m - 1, d);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}년 ${m}월 ${d}일 (${days[date.getDay()]})`;
}
