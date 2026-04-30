/**
 * 우연의 발견 위젯 — 메인 카드.
 *
 * 동작:
 *  - 마운트 시: 오늘 날짜와 lastShownDate 다르면 → pickInitialCardForToday 로 새 카드 픽
 *  - 4가지 액션 (rightSlot): 새로고침 · 좋아요 · 메모로 저장 · 다시 안 보기
 *  - 본문이 길면 "더 보기" → 상세 모달
 *  - 좋아요 카운트 칩 클릭 → 컬렉션 뷰
 *  - 모든 카드 다 본 경우 리셋 안내
 *  - 키보드 단축: 위젯 포커스 시 R/L/S/H/Enter
 *  - 자정 자동 롤오버: 매 분 검사 + visibilitychange
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Quote, Lightbulb, Sparkles, Link2, Sunrise, HelpCircle, Coffee,
  RefreshCw, Heart, Save, EyeOff, Maximize2, ExternalLink, Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetFrame } from '../WidgetFrame';
import {
  updateWidget, removeWidget, addWidget, createDefaultWidget,
  type SerendipityWidget, type MemoWidget,
} from '@/lib/mySpaceStore';
import { SEED_CARDS } from '@/lib/serendipity/cards';
import { CARD_TYPE_META, type CardType, type SerendipityCard } from '@/lib/serendipity/types';
import {
  pickNextCard, pickInitialCardForToday, getTodayKey,
} from '@/lib/serendipity/engine';
import { toast } from '@/hooks/use-toast';
import { SerendipityDetailModal } from './DetailModal';
import { SerendipityCollectionView } from './CollectionView';

interface Props {
  widget: SerendipityWidget;
  editable?: boolean;
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

export function SerendipityW({ widget, editable }: Props) {
  const seenIds = useMemo(() => widget.seenIds ?? [], [widget.seenIds]);
  const likedIds = useMemo(() => widget.likedIds ?? [], [widget.likedIds]);
  const hiddenIds = useMemo(() => widget.hiddenIds ?? [], [widget.hiddenIds]);

  const todayCard = useMemo<SerendipityCard | null>(() => {
    if (!widget.todayCardId) return null;
    return SEED_CARDS.find((c) => c.id === widget.todayCardId) ?? null;
  }, [widget.todayCardId]);

  const { totalCards, seenCount, isAllExhausted } = useMemo(() => {
    const blocked = new Set(hiddenIds);
    const remaining = SEED_CARDS.filter((c) => !blocked.has(c.id));
    const seenSet = new Set(seenIds);
    const seenInRemaining = remaining.filter((c) => seenSet.has(c.id)).length;
    return {
      totalCards: remaining.length,
      seenCount: seenInRemaining,
      isAllExhausted: remaining.length === 0 || remaining.every((c) => seenSet.has(c.id)),
    };
  }, [seenIds, hiddenIds]);

  const [showDetail, setShowDetail] = useState(false);
  const [showCollection, setShowCollection] = useState(false);
  const [bodyOverflowing, setBodyOverflowing] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const liked = todayCard ? likedIds.includes(todayCard.id) : false;

  // ────────────────────────── 자동 롤오버 ──────────────────────────
  const ensureToday = useCallback(() => {
    const today = getTodayKey();
    // todayCardId 가 시드 풀에 없으면(시드 변경 등) 무조건 다시 픽
    const stale = widget.todayCardId && !SEED_CARDS.find((c) => c.id === widget.todayCardId);
    if (widget.lastShownDate === today && widget.todayCardId && !stale) return;
    const next = pickInitialCardForToday({
      cards: SEED_CARDS,
      seenIds: widget.seenIds,
      likedIds: widget.likedIds,
      hiddenIds: widget.hiddenIds,
      lastTypeId: widget.lastTypeId,
      excludeId: widget.todayCardId,
    });
    if (!next) {
      // 모두 본 상태 → 카드 비우기 (UI 가 리셋 안내)
      updateWidget<SerendipityWidget>(widget.id, {
        todayCardId: undefined,
        lastShownDate: today,
      });
      return;
    }
    updateWidget<SerendipityWidget>(widget.id, {
      todayCardId: next.id,
      lastShownDate: today,
      lastTypeId: next.type,
      seenIds: Array.from(new Set([...(widget.seenIds ?? []), next.id])),
    });
  }, [widget.id, widget.todayCardId, widget.lastShownDate, widget.lastTypeId, widget.seenIds, widget.likedIds, widget.hiddenIds]);

  useEffect(() => {
    ensureToday();
    // 매 분 자정 체크
    const id = window.setInterval(ensureToday, 60_000);
    const onVis = () => { if (!document.hidden) ensureToday(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ensureToday]);

  // 본문 오버플로 감지 — "더 보기" 노출 조건
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) { setBodyOverflowing(false); return; }
    setBodyOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [todayCard?.id]);

  // ────────────────────────── 액션 ──────────────────────────
  const refresh = useCallback(() => {
    const next = pickNextCard({
      cards: SEED_CARDS,
      seenIds: widget.seenIds,
      likedIds: widget.likedIds,
      hiddenIds: widget.hiddenIds,
      lastTypeId: widget.lastTypeId,
      excludeId: widget.todayCardId,
    });
    if (!next) {
      toast({ title: '카드를 모두 봤어요', description: '아래에서 처음부터 다시 볼 수 있어요.' });
      return;
    }
    updateWidget<SerendipityWidget>(widget.id, {
      todayCardId: next.id,
      lastTypeId: next.type,
      seenIds: Array.from(new Set([...(widget.seenIds ?? []), next.id])),
    });
  }, [widget.id, widget.todayCardId, widget.lastTypeId, widget.seenIds, widget.likedIds, widget.hiddenIds]);

  const toggleLike = useCallback(() => {
    if (!todayCard) return;
    const set = new Set(widget.likedIds ?? []);
    if (set.has(todayCard.id)) set.delete(todayCard.id);
    else set.add(todayCard.id);
    updateWidget<SerendipityWidget>(widget.id, { likedIds: Array.from(set) });
  }, [widget.id, widget.likedIds, todayCard]);

  const saveAsMemo = useCallback(() => {
    if (!todayCard) return;
    const memo = createDefaultWidget('memo') as MemoWidget;
    const titleLabel = CARD_TYPE_META[todayCard.type].label;
    memo.title = todayCard.title ? `🎲 ${titleLabel} · ${todayCard.title}` : `🎲 ${titleLabel}`;
    const sourceLine = todayCard.source ? `\n\n${todayCard.source}` : '';
    const urlLine = todayCard.url ? `\n${todayCard.url}` : '';
    memo.body = `${todayCard.body}${sourceLine}${urlLine}`;
    addWidget(memo);
    toast({ title: '메모로 저장됨', description: '내 공간에 새 메모 위젯이 추가됐어요.' });
  }, [todayCard]);

  const copyToClipboard = useCallback(async () => {
    if (!todayCard) return;
    const sourceLine = todayCard.source ? `\n\n${todayCard.source}` : '';
    const urlLine = todayCard.url ? `\n${todayCard.url}` : '';
    const text = `${todayCard.title ? todayCard.title + '\n\n' : ''}${todayCard.body}${sourceLine}${urlLine}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: '복사됨', description: '카드 내용이 클립보드에 복사됐어요.' });
    } catch {
      toast({ title: '복사 실패', description: '브라우저가 복사를 지원하지 않아요.' });
    }
  }, [todayCard]);

  const hideForever = useCallback(() => {
    if (!todayCard) return;
    const nextHidden = Array.from(new Set([...(widget.hiddenIds ?? []), todayCard.id]));
    const next = pickNextCard({
      cards: SEED_CARDS,
      seenIds: widget.seenIds,
      likedIds: widget.likedIds,
      hiddenIds: nextHidden,
      lastTypeId: widget.lastTypeId,
      excludeId: todayCard.id,
    });
    updateWidget<SerendipityWidget>(widget.id, {
      hiddenIds: nextHidden,
      todayCardId: next?.id,
      lastTypeId: next?.type,
      seenIds: next ? Array.from(new Set([...(widget.seenIds ?? []), next.id])) : widget.seenIds,
    });
  }, [widget.id, widget.seenIds, widget.likedIds, widget.hiddenIds, widget.lastTypeId, todayCard]);

  const resetSeen = useCallback(() => {
    // 단일 update — pub/sub 이벤트 1번만 발생, 부모 리렌더 1회
    const next = pickInitialCardForToday({
      cards: SEED_CARDS,
      seenIds: [],
      likedIds: widget.likedIds,
      hiddenIds: widget.hiddenIds,
    });
    updateWidget<SerendipityWidget>(widget.id, {
      seenIds: next ? [next.id] : [],
      todayCardId: next?.id,
      lastTypeId: next?.type,
      lastShownDate: getTodayKey(),
    });
  }, [widget.id, widget.likedIds, widget.hiddenIds]);

  // 키보드 단축
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !editable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && /input|textarea/i.test(tgt.tagName)) return;
      switch (e.key.toLowerCase()) {
        case 'r': e.preventDefault(); refresh(); break;
        case 'l': e.preventDefault(); toggleLike(); break;
        case 's': e.preventDefault(); saveAsMemo(); break;
        case 'c': e.preventDefault(); void copyToClipboard(); break;
        case 'h': e.preventDefault(); hideForever(); break;
        case 'enter': e.preventDefault(); setShowDetail(true); break;
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [editable, refresh, toggleLike, saveAsMemo, copyToClipboard, hideForever]);

  // ────────────────────────── 렌더 ──────────────────────────
  const TypeIcon = todayCard ? TYPE_ICON[todayCard.type] : Sparkles;
  const typeLabel = todayCard ? CARD_TYPE_META[todayCard.type].label : '발견';
  const likedCount = likedIds.length;

  return (
    <>
      <div ref={containerRef} tabIndex={0} className="outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--focus-ring))] rounded-xl">
        <WidgetFrame
          title={`우연의 발견 · ${typeLabel}`}
          onRemove={editable ? () => removeWidget(widget.id) : undefined}
          rightSlot={editable && todayCard ? (
            <div className="flex items-center gap-0.5">
              <ActionBtn icon={RefreshCw} label="새로고침 (R)" onClick={refresh} />
              <ActionBtn
                icon={Heart}
                label={liked ? '좋아요 해제 (L)' : '좋아요 (L)'}
                onClick={toggleLike}
                active={liked}
                activeColor="text-rose-500"
                fill={liked}
              />
              <ActionBtn icon={Copy} label="복사 (C)" onClick={() => void copyToClipboard()} />
              <ActionBtn icon={Save} label="메모로 저장 (S)" onClick={saveAsMemo} />
              <ActionBtn icon={EyeOff} label="다시 안 보기 (H)" onClick={hideForever} />
            </div>
          ) : null}
        >
          {!todayCard ? (
            <EmptyOrExhausted
              hasHidden={hiddenIds.length > 0}
              isExhausted={isAllExhausted}
              onReset={resetSeen}
            />
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-start gap-1.5">
                <TypeIcon className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                {todayCard.title && (
                  <span className="text-[11px] font-semibold leading-snug truncate flex-1">
                    {todayCard.title}
                  </span>
                )}
              </div>
              <p
                ref={bodyRef}
                className="text-[11.5px] leading-relaxed text-foreground/90"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {todayCard.body}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {todayCard.source && (
                  <span className="text-[10px] text-muted-foreground truncate flex-1">
                    {todayCard.source}
                  </span>
                )}
                {todayCard.url && (
                  <a
                    href={todayCard.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    열기 <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
                {bodyOverflowing && (
                  <button
                    type="button"
                    onClick={() => setShowDetail(true)}
                    className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                    aria-label="상세 보기 (Enter)"
                  >
                    <Maximize2 className="h-2.5 w-2.5" />
                    더 보기
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 하단 칩: 컬렉션 + 진행도 */}
          {editable && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setShowCollection(true)}
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full',
                  'bg-[hsl(var(--muted))] text-muted-foreground hover:bg-[hsl(var(--accent))] hover:text-foreground transition-colors',
                )}
                aria-label="좋아요한 카드 모음 보기"
              >
                <Heart className={cn('h-2.5 w-2.5', likedCount > 0 && 'fill-rose-500 text-rose-500')} />
                <span className="tabular-nums">{likedCount}</span>
                <span>모은 카드</span>
              </button>
              {totalCards > 0 && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--muted))] text-muted-foreground tabular-nums"
                  title={`${totalCards}장 중 ${seenCount}장 봤어요`}
                >
                  {seenCount}/{totalCards}
                </span>
              )}
            </div>
          )}
        </WidgetFrame>
      </div>

      {showDetail && todayCard && (
        <SerendipityDetailModal
          card={todayCard}
          liked={liked}
          onClose={() => setShowDetail(false)}
          onRefresh={() => { refresh(); setShowDetail(false); }}
          onToggleLike={toggleLike}
          onSaveAsMemo={() => { saveAsMemo(); setShowDetail(false); }}
          onHide={() => { hideForever(); setShowDetail(false); }}
        />
      )}

      {showCollection && (
        <SerendipityCollectionView
          cards={SEED_CARDS}
          likedIds={likedIds}
          onClose={() => setShowCollection(false)}
          onUnlike={(id) => {
            const set = new Set(likedIds);
            set.delete(id);
            updateWidget<SerendipityWidget>(widget.id, { likedIds: Array.from(set) });
          }}
        />
      )}
    </>
  );
}

// ────────────────────────── 보조 컴포넌트 ──────────────────────────

interface ActionBtnProps {
  icon: typeof RefreshCw;
  label: string;
  onClick: () => void;
  active?: boolean;
  activeColor?: string;
  fill?: boolean;
}
function ActionBtn({ icon: Icon, label, onClick, active, activeColor, fill }: ActionBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'h-5 w-5 rounded flex items-center justify-center transition-colors',
        'text-muted-foreground hover:bg-[hsl(var(--accent))] hover:text-foreground',
        active && activeColor,
      )}
    >
      <Icon className={cn('h-3 w-3', fill && 'fill-current')} />
    </button>
  );
}

function EmptyOrExhausted({
  hasHidden, isExhausted, onReset,
}: { hasHidden: boolean; isExhausted: boolean; onReset: () => void }) {
  return (
    <div className="py-2 text-center">
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
        {isExhausted
          ? '모든 카드를 다 봤어요.'
          : hasHidden ? '남은 카드가 없어요.' : '오늘은 가져올 카드가 없어요.'}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1 text-[10.5px] px-2 py-1 rounded-md bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] transition-colors"
      >
        <RefreshCw className="h-2.5 w-2.5" />
        처음부터 다시 보기
      </button>
    </div>
  );
}
