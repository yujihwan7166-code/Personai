/**
 * /discover — 우연의 발견 풀 페이지.
 *
 * 메인 드롭다운의 "우연의 발견" 클릭 시 진입.
 * widget store 에 'serendipity' 인스턴스 1개를 자동 보장하고,
 * 그 인스턴스를 큰 컨테이너에 SerendipityW 로 노출.
 * 위젯과 페이지가 같은 데이터를 공유 → 좋아요·소진·자정 롤오버 일관.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Keyboard } from 'lucide-react';
import {
  getWidgets, subscribeWidgets, addWidget, createDefaultWidget,
  type SerendipityWidget,
} from '@/lib/mySpaceStore';
import { CARD_TYPE_META } from '@/lib/serendipity/types';
import { SEED_CARDS } from '@/lib/serendipity/cards';
import { SerendipityW } from '@/components/MySpace/serendipity/Card';
import { SerendipityShortcutsModal } from '@/components/MySpace/serendipity/ShortcutsModal';

export default function Discover() {
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState(() => getWidgets());
  const [showShortcuts, setShowShortcuts] = useState(false);

  // store 변경 구독
  useEffect(() => subscribeWidgets(setWidgets), []);

  // 페이지 전역 ? 단축키 — 입력 중이 아닐 때
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

  // serendipity 위젯 인스턴스 자동 보장 (페이지 첫 진입 시 없으면 1개 추가).
  // StrictMode 더블 마운트로 인한 중복 추가를 막기 위해 호출 직전에 store 를 직접 조회.
  useEffect(() => {
    const fresh = getWidgets();
    const exists = fresh.some((w) => w.kind === 'serendipity');
    if (!exists) {
      addWidget(createDefaultWidget('serendipity'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const widget = useMemo<SerendipityWidget | undefined>(
    () => widgets.find((w): w is SerendipityWidget => w.kind === 'serendipity'),
    [widgets],
  );

  // 타입별 시드 분포 — 헤더에 보여줄 가벼운 메타
  const typeStats = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of SEED_CARDS) m.set(c.type, (m.get(c.type) ?? 0) + 1);
    return m;
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* 상단 바 */}
      <header className="sticky top-0 z-10 border-b border-[hsl(var(--hairline))] bg-[hsl(var(--background))]/80 backdrop-blur">
        <div className="mx-auto max-w-[820px] px-4 py-3 flex items-center gap-2">
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
              매일 다른 글·명언·발견
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowShortcuts(true)}
            aria-label="단축키 도움말 (?)"
            title="단축키 (?)"
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11.5px] text-muted-foreground bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] hover:text-foreground transition-colors"
          >
            <Keyboard className="h-3 w-3" />
            <span className="hidden sm:inline">단축키</span>
            <kbd className="hidden sm:inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded bg-background border border-[hsl(var(--hairline))] font-mono text-[10px]">?</kbd>
          </button>
        </div>
      </header>

      {/* 본문 */}
      <main className="mx-auto max-w-[820px] px-4 py-6 sm:py-10">
        {/* 인트로 */}
        <section className="mb-6 sm:mb-8">
          <h2 className="text-[18px] sm:text-[22px] font-semibold leading-tight mb-1.5">
            오늘 어떤 발견이 기다리고 있을까요?
          </h2>
          <p className="text-[12.5px] sm:text-[13px] text-muted-foreground leading-relaxed">
            매일 자정에 새 카드가 도착해요. 마음에 들면 ❤️ 좋아요, 더 보려면 새로고침,
            오래 간직하고 싶다면 📥 메모로 저장해두세요.
          </p>
        </section>

        {/* 메인 카드 — 위젯 그대로 큰 컨테이너로 */}
        <section className="mb-8">
          {widget ? (
            <div className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]/40 p-3 sm:p-4">
              <div className="max-w-[520px] mx-auto">
                <SerendipityW widget={widget} editable={true} />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[hsl(var(--hairline))] py-12 text-center text-muted-foreground">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
              <span className="ml-2 text-[12px]">준비 중…</span>
            </div>
          )}
        </section>

        {/* 카드 타입 안내 */}
        <section className="mb-8">
          <h3 className="text-[12px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-3">
            오늘의 카드는 7가지 결 중 하나
          </h3>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(CARD_TYPE_META) as Array<keyof typeof CARD_TYPE_META>).map((t) => (
              <li
                key={t}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]"
              >
                <span className="text-[14px]" aria-hidden>{CARD_TYPE_META[t].emoji}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-medium truncate">
                    {CARD_TYPE_META[t].label}
                  </span>
                  <span className="block text-[10px] text-muted-foreground tabular-nums">
                    {typeStats.get(t) ?? 0}장
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* 키보드 단축 안내 */}
        <section className="text-[11px] text-muted-foreground">
          <span className="font-mono">단축키:</span>{' '}
          R 새로고침 · L 좋아요 · S 메모 저장 · C 복사 · H 다시 안 보기 · Enter 상세 · ? 도움말
        </section>
      </main>

      {showShortcuts && <SerendipityShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
