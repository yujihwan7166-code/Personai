/**
 * 브라우저 엔진 선택 carousel — AI 모델 카드와 동일한 비주얼 (vertical mini card).
 *
 * grid-cols-4 sm:6 md:8 — favicon 위, 이름 아래.
 * 선택 시 같은 indigo ring + 우상단 ✓ 점 패턴.
 */
import { cn } from '@/lib/utils';
import {
  SEARCH_ENGINES, setSelectedEngineId,
} from '@/lib/searchEngines';
import { useSelectedSearchEngine } from '@/hooks/useSelectedSearchEngine';

export const BrowserEnginePicker = () => {
  const selected = useSelectedSearchEngine();

  return (
    <div className="px-3 pt-1.5 pb-1.5">
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-x-1 gap-y-2">
        {SEARCH_ENGINES.map((eng) => {
          const isSelected = selected?.id === eng.id;
          return (
            <div
              key={eng.id}
              className={cn(
                'group relative flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all duration-150',
                !isSelected && 'hover:bg-[hsl(var(--accent))] hover:-translate-y-[1px]',
                isSelected && 'bg-[hsl(var(--primary)/0.08)] ring-1 ring-inset ring-[hsl(var(--primary)/0.4)] dark:bg-[hsl(var(--primary)/0.15)]',
              )}
              title={eng.hint}
            >
              <button
                type="button"
                onClick={() => setSelectedEngineId(eng.id)}
                className="flex flex-col items-center gap-1 w-full"
              >
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm z-10">
                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                {/* Avatar — favicon (img onError → emoji fallback). md size = 40x40 (ExpertAvatar md 와 정렬). */}
                <span className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-white dark:bg-slate-800 ring-1 ring-[hsl(var(--hairline))] shrink-0 overflow-hidden shadow-[0_1px_2px_hsl(220_15%_8%_/0.06)]">
                  {eng.iconUrl ? (
                    <img
                      src={eng.iconUrl}
                      alt=""
                      className="h-6 w-6 object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const img = e.currentTarget;
                        const parent = img.parentElement;
                        if (parent) {
                          img.remove();
                          parent.textContent = eng.emoji;
                          parent.classList.add('text-[20px]');
                        }
                      }}
                    />
                  ) : (
                    <span className="text-[20px]">{eng.emoji}</span>
                  )}
                </span>
                <span className={cn(
                  'text-[9.5px] font-medium whitespace-nowrap truncate max-w-full leading-tight transition-colors',
                  isSelected
                    ? 'text-[hsl(var(--primary))] font-semibold'
                    : 'text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]',
                )}>
                  {eng.name}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
