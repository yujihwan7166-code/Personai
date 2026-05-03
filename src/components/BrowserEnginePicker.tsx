/**
 * 브라우저 엔진 선택 carousel — ExpertSelectionPanel 안 "브라우저" 탭에서 사용.
 *
 * 카드 클릭 시 그 엔진을 selected 로 저장. 컴포저 submit 때 그 엔진으로 새 탭 검색.
 */
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SEARCH_ENGINES, setSelectedEngineId,
} from '@/lib/searchEngines';
import { useSelectedSearchEngine } from '@/hooks/useSelectedSearchEngine';

export const BrowserEnginePicker = () => {
  const selected = useSelectedSearchEngine();

  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-mono uppercase tracking-wide text-foreground/55 font-semibold">
          웹 검색
        </span>
        <span className="text-[11px] text-foreground/45">
          엔진 고르고 아래 입력창에 키워드를 적으면 새 탭으로 검색돼요
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SEARCH_ENGINES.map((eng) => {
          const isActive = selected?.id === eng.id;
          return (
            <button
              key={eng.id}
              type="button"
              onClick={() => setSelectedEngineId(eng.id)}
              className={cn(
                'group relative flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-card transition-all text-left',
                'hover:-translate-y-0.5 hover:shadow-[0_2px_8px_-4px_hsl(var(--foreground)/0.15)]',
                isActive
                  ? 'border-blue-500/60 ring-1 ring-blue-500/30'
                  : 'border-[hsl(var(--hairline))] hover:border-foreground/20',
              )}
            >
              {/* favicon (img onError → emoji fallback) */}
              <span className="h-7 w-7 inline-flex items-center justify-center rounded-md bg-foreground/5 shrink-0 overflow-hidden">
                {eng.iconUrl ? (
                  <img
                    src={eng.iconUrl}
                    alt=""
                    className="h-5 w-5 object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.currentTarget;
                      const parent = img.parentElement;
                      if (parent) {
                        img.remove();
                        parent.textContent = eng.emoji;
                        parent.classList.add('text-[16px]');
                      }
                    }}
                  />
                ) : (
                  <span className="text-[16px]">{eng.emoji}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold text-foreground truncate">{eng.name}</div>
                <div className="text-[10.5px] text-foreground/55 truncate">{eng.hint}</div>
              </div>
              {isActive && (
                <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
