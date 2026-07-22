/**
 * v2 빠른 입력 바 — 한 줄 적으면 AI가 다듬고 분류해 카테고리 카드로 꽂힌다.
 * AI 모드: aiClassifySpec(다듬기+분류+날짜 추출) / 직접 모드: 원문 그대로 + 휴리스틱 분류.
 * 실패해도 반드시 저장된다(휴리스틱 폴백) — 입력이 증발하지 않는 게 1원칙.
 */
import { useCallback, useRef, useState } from 'react';
import { ArrowUp, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { careerStore } from '@/services/careerStore';
import { aiClassifySpec, heuristicCategory } from '@/lib/career/ai';

const MODE_KEY = 'career2.writeMode.v1';

interface Props {
  existingCategories: string[];
  /** 저장 완료 — 카테고리명과 새 항목 id (그리드 하이라이트용). */
  onAdded: (categoryName: string, itemId: string) => void;
}

export function QuickAddBar({ existingCategories, onAdded }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiMode, setAiMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(MODE_KEY) !== 'direct';
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleMode = useCallback(() => {
    setAiMode((m) => {
      window.localStorage.setItem(MODE_KEY, m ? 'direct' : 'ai');
      return !m;
    });
  }, []);

  const submit = useCallback(async () => {
    const raw = text.trim();
    if (!raw || busy) return;
    setBusy(true);
    try {
      if (aiMode) {
        const c = await aiClassifySpec(raw, existingCategories);
        const item = careerStore.addItem({
          raw, refined: c.refined, categoryName: c.category,
          date: c.date, endDate: c.endDate, ongoing: c.ongoing, org: c.org,
        });
        onAdded(c.category, item.id);
      } else {
        const category = heuristicCategory(raw);
        const item = careerStore.addItem({ raw, categoryName: category });
        onAdded(category, item.id);
      }
      setText('');
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [text, busy, aiMode, existingCategories, onAdded]);

  return (
    <form
      onSubmit={(ev) => { ev.preventDefault(); void submit(); }}
      className="flex items-center gap-2 rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] py-2 pl-4 pr-2 shadow-sm focus-within:border-[hsl(var(--career2-blue)/0.5)]"
    >
      <input
        ref={inputRef} value={text} onChange={(ev) => setText(ev.target.value)}
        placeholder='"정처기 땄음" · "토익 900" · "6월부터 스타트업 인턴" — 한 줄이면 돼요'
        className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-muted-foreground/60"
        aria-label="스펙 입력"
      />
      <button
        type="button" onClick={toggleMode} aria-pressed={aiMode}
        title={aiMode ? 'AI가 문장을 다듬고 분류해요 — 누르면 직접 모드' : '적은 그대로 저장돼요 — 누르면 AI 모드'}
        className={cn('flex h-9 shrink-0 items-center gap-1 rounded-xl border px-2.5 text-[12px] transition-colors',
          aiMode
            ? 'border-[hsl(var(--career2-blue)/0.4)] bg-[hsl(var(--career2-blue)/0.1)] font-medium text-[hsl(var(--career2-blue))]'
            : 'border-[hsl(var(--input))] text-muted-foreground')}
      >
        <Sparkles className="h-3.5 w-3.5" /> {aiMode ? 'AI' : '직접'}
      </button>
      <button
        type="submit" disabled={busy || !text.trim()} aria-label="추가"
        className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--career2-blue))] text-white transition-opacity',
          (busy || !text.trim()) && 'opacity-40')}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
      </button>
    </form>
  );
}
