/**
 * 오늘의 일기 카로셀 — 헤더 가운데 위젯.
 *
 * 5종 콘텐츠 중 사용 가능한 것만 좌우 화살표로 회전:
 *   1. 💭 영감 prompt (pickPrompt 라이브러리)
 *   2. 📜 오늘의 인용구 (한국 / 동서양 명언 라이브러리)
 *   3. 🕰 1년 전 오늘 (있을 때만)
 *   4. 🔥 streak (≥1일)
 *   5. 🎲 묻혀있던 한 페이지 (30일+ 묵힌 entry)
 *
 * 자동 회전 X — 사용자가 < > 화살표로만 회전. 진입 시 랜덤 첫 카드.
 * 클릭 액션은 카드 종류별 다름 (prompt → 새 entry, 회상 → 편집 등).
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, Quote, History, Flame, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pickPrompt, PROMPT_CATEGORY_EMOJI, PROMPT_CATEGORY_LABEL } from '@/lib/journalPrompts';
import { stripMarkdown } from '@/lib/journalMarkdown';
import type { JournalEntry } from '@/types/journal';

/** 인용구 라이브러리 — 짧고 임팩트 있는 한국·동서양. */
const QUOTES: ReadonlyArray<{ text: string; author: string }> = [
  { text: '오늘은 다시 오지 않습니다.', author: '단테' },
  { text: '하루를 살아낸다는 것은 작은 기적이에요.', author: '에머슨' },
  { text: '글쓰기는 마음의 산책이다.', author: '버지니아 울프' },
  { text: '오늘 한 줄이 내일의 나를 만든다.', author: '앤 딜라드' },
  { text: '쓰는 행위가 곧 생각하는 일이다.', author: '데이비드 매컬로' },
  { text: '완벽한 날이 아니라, 완성된 페이지를 사랑하라.', author: '데이비드 마이클스' },
  { text: '관찰은 사랑의 첫 걸음이다.', author: '시몬 베유' },
  { text: '한 줄도 적지 않은 날은 없는 날과 같다.', author: '플리니우스' },
  { text: '하루를 끝마쳤으니 그것으로 됐다.', author: '에밀리 디킨슨' },
  { text: '오늘의 작은 일들이 쌓여 일생이 된다.', author: '브라이언 도일' },
  { text: '잠들기 전 오늘을 한 번 펼쳐보자.', author: '마르쿠스 아우렐리우스' },
  { text: '기록되지 않은 삶은 흩어진다.', author: '조앤 디디온' },
];

interface JournalDailyCarouselProps {
  allEntries: JournalEntry[];
  /** prompt 카드 클릭 — 새 entry 시작 (placeholder 로 prompt 자동 주입은 별도). */
  onStartEntry: () => void;
  /** 회상 카드 클릭 — 그 entry 편집. */
  onClickEntry: (entry: JournalEntry) => void;
}

type Card =
  | { kind: 'prompt'; categoryEmoji: string; categoryLabel: string; text: string }
  | { kind: 'quote'; text: string; author: string }
  | { kind: 'onThisDay'; entry: JournalEntry; yearsAgo: number }
  | { kind: 'streak'; days: number; weekProgress: { written: number; total: number } }
  | { kind: 'random'; entry: JournalEntry; daysAgo: number };

const DAY_MS = 86400000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function calcStreak(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;
  const dates = new Set(entries.map((e) => e.date));
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // 오늘부터 거꾸로 — 오늘 안 썼어도 어제부터 시작 가능 (Things3 패턴)
  let cursor = new Date(today);
  if (!dates.has(ymd(cursor))) {
    cursor = new Date(today.getTime() - DAY_MS);
    if (!dates.has(ymd(cursor))) return 0;
  }
  while (dates.has(ymd(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

function thisWeekProgress(entries: JournalEntry[]): { written: number; total: number } {
  const now = new Date();
  const day = now.getDay();
  const monOffset = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(now.getDate() + monOffset);
  const dates = new Set(entries.map((e) => e.date));
  let written = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    if (d.getTime() > now.getTime()) break; // 미래는 제외
    if (dates.has(ymd(d))) written++;
  }
  // total = 이번 주 안에서 오늘까지 흐른 일수
  const total = Math.min(7, day === 0 ? 7 : day);
  return { written, total };
}

export const JournalDailyCarousel = ({
  allEntries,
  onStartEntry,
  onClickEntry,
}: JournalDailyCarouselProps) => {
  // 카드 후보 생성 — 사용 가능한 것만
  const cards: Card[] = useMemo(() => {
    const arr: Card[] = [];

    // 1. prompt
    const p = pickPrompt({});
    arr.push({
      kind: 'prompt',
      categoryEmoji: PROMPT_CATEGORY_EMOJI[p.category],
      categoryLabel: PROMPT_CATEGORY_LABEL[p.category],
      text: p.text,
    });

    // 2. quote — 매일 시드 회전 (오늘 동일 quote)
    const seed = (() => {
      const t = new Date();
      return t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
    })();
    const quote = QUOTES[seed % QUOTES.length];
    arr.push({ kind: 'quote', text: quote.text, author: quote.author });

    // 3. on this day — 작년 / 재작년 같은 월·일
    const today = new Date();
    const m = today.getMonth();
    const d = today.getDate();
    const y = today.getFullYear();
    const onThisDay = allEntries.find((e) => {
      const ed = new Date(e.date);
      return ed.getMonth() === m && ed.getDate() === d && ed.getFullYear() < y;
    });
    if (onThisDay) {
      const ya = y - new Date(onThisDay.date).getFullYear();
      arr.push({ kind: 'onThisDay', entry: onThisDay, yearsAgo: ya });
    }

    // 4. streak (≥1일)
    const streak = calcStreak(allEntries);
    if (streak >= 1) {
      arr.push({
        kind: 'streak',
        days: streak,
        weekProgress: thisWeekProgress(allEntries),
      });
    }

    // 5. 묻혀있던 (30일+, body 있는 entry 중 결정론적 1개)
    const cutoff = Date.now() - 30 * DAY_MS;
    const stalePool = allEntries.filter((e) => {
      const t = new Date(e.createdAt).getTime();
      return t < cutoff && e.body.trim().length > 0;
    });
    if (stalePool.length > 0) {
      const idx = ((seed * 1664525 + 1013904223) >>> 0) % stalePool.length;
      const stale = stalePool[idx];
      const daysAgo = Math.floor((Date.now() - new Date(stale.createdAt).getTime()) / DAY_MS);
      arr.push({ kind: 'random', entry: stale, daysAgo });
    }

    return arr;
  }, [allEntries]);

  // 진입 시 랜덤 첫 카드 (오늘 시드 기반 — 같은 날 동일 시작)
  const initialIdx = useMemo(() => {
    const t = new Date();
    const seed = t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
    return cards.length > 0 ? seed % cards.length : 0;
  }, [cards.length]);

  const [idx, setIdx] = useState(initialIdx);
  const safeIdx = cards.length === 0 ? 0 : Math.min(idx, cards.length - 1);
  const current = cards[safeIdx];

  if (!current) {
    // entries 0 + prompt fallback (cards 항상 ≥1 이지만 안전장치)
    return null;
  }

  const prev = () => setIdx((i) => (i - 1 + cards.length) % cards.length);
  const next = () => setIdx((i) => (i + 1) % cards.length);

  // 카드별 렌더 데이터
  const renderCard = (): {
    icon: React.ReactNode;
    label: string;
    body: React.ReactNode;
    onClick?: () => void;
  } => {
    switch (current.kind) {
      case 'prompt':
        return {
          icon: <Lightbulb className="h-3.5 w-3.5" strokeWidth={1.8} />,
          label: `${current.categoryEmoji} ${current.categoryLabel}`,
          body: <span className="truncate">{current.text}</span>,
          onClick: onStartEntry,
        };
      case 'quote':
        return {
          icon: <Quote className="h-3.5 w-3.5" strokeWidth={1.8} />,
          label: '오늘의 한 줄',
          body: (
            <span className="truncate">
              "{current.text}"
              <span className="text-muted-foreground/65 ml-1.5">— {current.author}</span>
            </span>
          ),
        };
      case 'onThisDay': {
        const body = current.entry.bodyFormat === 'markdown'
          ? stripMarkdown(current.entry.body)
          : current.entry.body;
        return {
          icon: <History className="h-3.5 w-3.5" strokeWidth={1.8} />,
          label: `${current.yearsAgo}년 전 오늘`,
          body: <span className="truncate">{body.trim() || '(빈 본문)'}</span>,
          onClick: () => onClickEntry(current.entry),
        };
      }
      case 'streak':
        return {
          icon: <Flame className="h-3.5 w-3.5 text-amber-500/85" strokeWidth={2.1} />,
          label: '연속 작성',
          body: (
            <span>
              <span className="font-semibold tabular-nums text-foreground">
                {current.days}일
              </span>
              <span className="text-muted-foreground/75 ml-2">
                이번 주 {current.weekProgress.written}/{current.weekProgress.total}일
              </span>
            </span>
          ),
        };
      case 'random': {
        const body = current.entry.bodyFormat === 'markdown'
          ? stripMarkdown(current.entry.body)
          : current.entry.body;
        return {
          icon: <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />,
          label: `${current.daysAgo}일 전`,
          body: <span className="truncate">{body.trim() || '(빈 본문)'}</span>,
          onClick: () => onClickEntry(current.entry),
        };
      }
    }
  };

  const card = renderCard();

  return (
    <div className="flex items-center gap-2.5 w-full rounded-xl border border-[hsl(var(--hairline))] bg-card/60 px-3 sm:px-3.5 h-10 min-w-0 shadow-[0_1px_2px_hsl(30_30%_8%/0.03)]">
      {/* 좌측: 회전 이전 화살표 */}
      {cards.length > 1 && (
        <button
          type="button"
          onClick={prev}
          aria-label="이전"
          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors shrink-0"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
        </button>
      )}

      {/* 가운데: 아이콘 + 카테고리 + 본문 (클릭 가능) */}
      <button
        type="button"
        onClick={card.onClick}
        disabled={!card.onClick}
        className={cn(
          'flex items-center gap-2.5 min-w-0 flex-1 text-left',
          card.onClick && 'hover:opacity-90 transition-opacity cursor-pointer',
          !card.onClick && 'cursor-default',
        )}
      >
        <span className="inline-flex items-center justify-center text-foreground/55 shrink-0">
          {card.icon}
        </span>
        <span className="text-[11.5px] font-semibold tabular-nums text-muted-foreground shrink-0 tracking-[-0.005em]">
          {card.label}
        </span>
        <span className="w-0.5 h-0.5 rounded-full bg-foreground/25 shrink-0" aria-hidden />
        <span className="text-[13.5px] sm:text-[14px] text-foreground/90 min-w-0 truncate tracking-[-0.005em]">
          {card.body}
        </span>
      </button>

      {/* 우측: 회전 다음 화살표 + 카드 위치 인디케이터 */}
      {cards.length > 1 && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10.5px] font-medium tabular-nums text-muted-foreground/60 hidden sm:inline">
            {safeIdx + 1}/{cards.length}
          </span>
          <button
            type="button"
            onClick={next}
            aria-label="다음"
            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      )}
    </div>
  );
};
