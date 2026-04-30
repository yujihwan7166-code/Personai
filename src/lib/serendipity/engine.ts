/**
 * 우연의 발견 — 카드 선택 엔진.
 *
 * 순수 함수로 작성. UI/store 의존 X. 단위 테스트 친화.
 *
 * 발견 정책:
 *  1. hidden 은 절대 노출하지 않음 ("다시 안 보기")
 *  2. 가능하면 seen 이 아닌 것 우선 (보지 않은 카드 우선 노출)
 *  3. 같은 type 연속 회피 (lastTypeId 와 다른 type)
 *  4. liked 한 type 에 +1.5 가중 (좋아하는 결을 더 자주)
 *  5. 후보 0이면 점진적 완화 → 그래도 0이면 null (모두 봄/숨김)
 */
import type { CardType, SerendipityCard } from './types';

export interface PickContext {
  cards: SerendipityCard[];          // 전체 풀
  seenIds?: string[];                // 이미 본 카드
  likedIds?: string[];               // 좋아요한 카드 (가중치)
  hiddenIds?: string[];              // 다시 안 보기
  lastTypeId?: CardType;             // 직전 카드 타입 (연속 회피)
  excludeId?: string;                // 현재 카드 제외 (새로고침 시 자기 자신 회피)
}

interface CandidateScore {
  card: SerendipityCard;
  score: number;
}

/** 좋아요한 카드 타입의 빈도를 카운트해 가중치 맵 생성. */
function buildLikedTypeWeights(cards: SerendipityCard[], likedIds: string[] = []): Map<CardType, number> {
  const map = new Map<CardType, number>();
  if (likedIds.length === 0) return map;
  const liked = new Set(likedIds);
  for (const c of cards) {
    if (!liked.has(c.id)) continue;
    map.set(c.type, (map.get(c.type) ?? 0) + 1);
  }
  return map;
}

function scoreCard(
  card: SerendipityCard,
  ctx: PickContext,
  seen: Set<string>,
  likedTypeWeights: Map<CardType, number>,
): number {
  // 처음 보는 카드는 큰 보너스
  let score = seen.has(card.id) ? 1 : 3;
  // 좋아하는 타입에 가중
  const w = likedTypeWeights.get(card.type) ?? 0;
  if (w > 0) score += 1.5 * Math.min(1, w / 3); // 너무 한 타입에 몰리지 않게 cap
  // 같은 타입 연속이면 감점
  if (ctx.lastTypeId && card.type === ctx.lastTypeId) score -= 1.2;
  // 무작위 노이즈 (작은 값) — 같은 점수일 때 다양성 확보
  score += Math.random() * 0.4;
  return score;
}

/** 메인 — 다음에 보여줄 카드 1장. 조건에 맞는 카드가 없으면 null. */
export function pickNextCard(ctx: PickContext): SerendipityCard | null {
  const hidden = new Set(ctx.hiddenIds ?? []);
  const seen = new Set(ctx.seenIds ?? []);
  const likedTypeWeights = buildLikedTypeWeights(ctx.cards, ctx.likedIds);

  // 1차: hidden 제외 + excludeId 제외
  const baseCandidates = ctx.cards.filter((c) => !hidden.has(c.id) && c.id !== ctx.excludeId);
  if (baseCandidates.length === 0) return null;

  // 점수 계산
  const scored: CandidateScore[] = baseCandidates.map((card) => ({
    card,
    score: scoreCard(card, ctx, seen, likedTypeWeights),
  }));

  // 최고점 선택 (동점이면 노이즈가 가른다)
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.card ?? null;
}

/**
 * 자정 후 첫 진입 시 사용. 어제와 다른 vibe 가 오도록
 * 미관람 카드를 조금 더 강하게 우선시한다.
 */
export function pickInitialCardForToday(ctx: PickContext): SerendipityCard | null {
  // 미관람 카드만 후보로 시도
  const hidden = new Set(ctx.hiddenIds ?? []);
  const seen = new Set(ctx.seenIds ?? []);
  const fresh = ctx.cards.filter((c) => !hidden.has(c.id) && !seen.has(c.id));
  if (fresh.length > 0) {
    return pickNextCard({ ...ctx, cards: fresh });
  }
  // 미관람 카드가 없으면 일반 로직
  return pickNextCard(ctx);
}

/** YYYY-MM-DD (로컬 시간 기준) — lastShownDate 비교용. */
export function getTodayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
