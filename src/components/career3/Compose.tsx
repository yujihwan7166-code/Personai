/**
 * 오늘의 한 줄 — 이 방의 주인공. 화면 맨 위에서 항상 열려 있고, 적으면 바로 기둥에 얹힌다.
 * AI 다듬기가 켜져 있으면 이력서 문장으로 고쳐 쌓고, 꺼져 있으면 적은 그대로 쌓는다.
 */
import { useCallback, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { careerStore } from '@/services/careerStore';
import { aiClassifySpec, heuristicCategory } from '@/lib/career/ai';

const MODE_KEY = 'career3.polish.v1';

interface Props {
  existingCategories: string[];
  onAdded: (itemId: string) => void;
}

export function Compose({ existingCategories, onAdded }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [polish, setPolish] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(MODE_KEY) !== 'off';
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const togglePolish = useCallback(() => {
    setPolish((p) => {
      window.localStorage.setItem(MODE_KEY, p ? 'off' : 'on');
      return !p;
    });
  }, []);

  const submit = useCallback(async () => {
    const raw = text.trim();
    if (!raw || busy) return;
    setBusy(true);
    try {
      if (polish) {
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
  }, [text, busy, polish, existingCategories, onAdded]);

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); }
        }}
        rows={2}
        placeholder="오늘 뭘 쌓았나요"
        aria-label="오늘의 기록"
        className="w-full resize-none bg-transparent text-[21px] leading-[1.5] text-foreground caret-[hsl(var(--c3-glow))] outline-none placeholder:text-muted-foreground/55"
      />

      <div className="mt-2 flex items-center gap-4 border-t border-[hsl(var(--hairline))] pt-3">
        <label className="flex select-none items-center gap-2 text-[12.5px] text-muted-foreground">
          <input
            type="checkbox" checked={polish} onChange={togglePolish}
            className="h-[15px] w-[15px] accent-[hsl(var(--c3-glow))]"
          />
          AI가 이력서 문장으로 다듬기
        </label>

        <span className="ml-auto text-[11.5px] text-muted-foreground/70">Enter로 쌓기</span>

        <button
          type="button" onClick={() => void submit()} disabled={busy || !text.trim()}
          className={cn(
            'h-9 rounded-full bg-[hsl(var(--c3-glow))] px-5 text-[13px] font-semibold text-[hsl(220_16%_8%)] transition-opacity',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--c3-glow))]',
            (busy || !text.trim()) && 'opacity-30',
          )}
        >
          {busy ? <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> 다듬는 중</span> : '쌓기'}
        </button>
      </div>
    </div>
  );
}
