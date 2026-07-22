/**
 * 접수줄 — 등록부 상단의 한 줄 입력. 밑줄 필드 + [접수] 버튼, 카드·라운드 없음.
 * AI 모드: 다듬고 분류해 등재 / 직접 모드: 적은 그대로 등재. 실패해도 반드시 저장(휴리스틱 폴백).
 */
import { useCallback, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { careerStore } from '@/services/careerStore';
import { aiClassifySpec, heuristicCategory } from '@/lib/career/ai';

const MODE_KEY = 'career2.writeMode.v1';

interface Props {
  existingCategories: string[];
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
      className="flex items-end gap-3"
    >
      <label className="min-w-0 flex-1">
        <span className="mb-1 block text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground">접수</span>
        <input
          ref={inputRef} value={text} onChange={(ev) => setText(ev.target.value)}
          placeholder='"정처기 땄음" · "토익 900" · "6월부터 스타트업 인턴"'
          className="w-full border-b border-[hsl(var(--input))] bg-transparent pb-1.5 text-[14.5px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-[hsl(var(--career2-blue))]"
          aria-label="스펙 접수"
        />
      </label>
      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 pb-2 text-[12px] text-muted-foreground" title="켜면 AI가 문장을 다듬고 칸을 고릅니다">
        <input type="checkbox" checked={aiMode} onChange={toggleMode} className="h-3.5 w-3.5 accent-[hsl(var(--career2-blue))]" />
        AI 다듬기
      </label>
      <button
        type="submit" disabled={busy || !text.trim()}
        className={cn(
          'shrink-0 border border-[hsl(var(--career2-blue))] bg-[hsl(var(--career2-blue))] px-4 py-1.5 text-[13px] font-semibold text-white transition-opacity',
          (busy || !text.trim()) && 'opacity-40',
        )}
      >
        {busy ? <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> 등재 중</span> : '접수'}
      </button>
    </form>
  );
}
