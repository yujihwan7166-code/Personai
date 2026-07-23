/**
 * 기록 입력 줄 — Swiss: 밑줄 필드 + 사각 버튼, 장식 없음.
 * AI 모드는 문장을 다듬고 칸을 고른다. 실패해도 휴리스틱으로 반드시 저장된다.
 */
import { useCallback, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { careerStore } from '@/services/careerStore';
import { aiClassifySpec, heuristicCategory } from '@/lib/career/ai';

const MODE_KEY = 'career2.writeMode.v1';

interface Props {
  existingCategories: string[];
  onAdded: (itemId: string) => void;
}

export function QuickAdd({ existingCategories, onAdded }: Props) {
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
        onAdded(item.id);
      } else {
        const item = careerStore.addItem({ raw, categoryName: heuristicCategory(raw) });
        onAdded(item.id);
      }
      setText('');
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [text, busy, aiMode, existingCategories, onAdded]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="flex items-end gap-4">
      <label className="min-w-0 flex-1">
        <span className="c2-eyebrow mb-1.5 block text-[10px] text-muted-foreground">새 기록</span>
        <input
          ref={inputRef} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="정처기 땄음 · 토익 900 · 6월부터 스타트업 인턴"
          aria-label="새 기록 입력"
          className="w-full border-b-2 border-[hsl(var(--foreground))] bg-transparent pb-2 text-[16px] outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground/50 focus:border-[hsl(var(--c2-laurel))]"
        />
      </label>

      <label className="flex shrink-0 cursor-pointer select-none items-center gap-2 pb-2.5 text-[12px] text-muted-foreground"
        title="켜면 AI가 이력서 문장으로 다듬고 칸을 고릅니다">
        <input type="checkbox" checked={aiMode} onChange={toggleMode}
          className="h-[15px] w-[15px] accent-[hsl(var(--c2-laurel))]" />
        AI 다듬기
      </label>

      <button
        type="submit" disabled={busy || !text.trim()}
        className={cn(
          'h-[42px] shrink-0 bg-[hsl(var(--c2-laurel))] px-6 text-[13px] font-semibold text-white transition-opacity',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--c2-laurel))]',
          (busy || !text.trim()) && 'cursor-not-allowed opacity-35',
        )}
      >
        {busy ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> 정리 중</span> : '기록'}
      </button>
    </form>
  );
}
