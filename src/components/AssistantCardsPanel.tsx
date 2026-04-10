import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { ASSISTANT_CARDS } from '@/types/assistant';
import { cn } from '@/lib/utils';

interface AssistantCardsPanelProps {
  selectedCardId?: string | null;
  onSelectCard: (cardId: string | null) => void;
  onSubmitAssistant: (cardId: string, question: string) => void;
  isDiscussing: boolean;
}

const categoryColors: Record<string, string> = {
  study: 'bg-blue-50 text-blue-600',
  document: 'bg-emerald-50 text-emerald-600',
  creative: 'bg-orange-50 text-orange-600',
  productivity: 'bg-purple-50 text-purple-600',
  analysis: 'bg-pink-50 text-pink-600',
};

const categoryLabels: Record<string, string> = {
  study: '학습',
  document: '문서',
  creative: '창작',
  productivity: '생산성',
  analysis: '분석',
};

export function AssistantCardsPanel({
  selectedCardId,
  onSelectCard,
  onSubmitAssistant,
  isDiscussing,
}: AssistantCardsPanelProps) {
  const [question, setQuestion] = useState('');

  const selectedCard = useMemo(
    () => ASSISTANT_CARDS.find((card) => card.id === selectedCardId) ?? null,
    [selectedCardId],
  );

  useEffect(() => {
    setQuestion('');
  }, [selectedCardId]);

  const handleSubmit = () => {
    if (!selectedCard || !question.trim()) {
      return;
    }

    onSubmitAssistant(selectedCard.id, question.trim());
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-2.5">
        {ASSISTANT_CARDS.map((card) => {
          const isSelected = selectedCard?.id === card.id;

          return (
            <button
              key={card.id}
              onClick={() => onSelectCard(isSelected ? null : card.id)}
              className={cn(
                'relative overflow-hidden rounded-xl border text-left transition-all duration-200 group',
                isSelected
                  ? 'border-slate-700 bg-slate-900 shadow-lg ring-1 ring-slate-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md',
              )}
            >
              <div
                className={cn(
                  'h-0.5',
                  isSelected ? 'bg-gradient-to-r from-blue-400 to-purple-400' : `bg-gradient-to-r ${card.gradient}`,
                )}
              />

              <div className="p-3">
                <div
                  className={cn(
                    'mb-2 inline-flex rounded-full px-1.5 py-0.5 text-[7px] font-bold',
                    isSelected ? 'bg-white/10 text-slate-400' : categoryColors[card.category],
                  )}
                >
                  {categoryLabels[card.category]}
                </div>

                <div
                  className={cn(
                    'mb-2 flex h-8 w-8 items-center justify-center rounded-lg text-base',
                    isSelected ? 'bg-white/10' : `bg-gradient-to-br ${card.gradient}`,
                  )}
                >
                  {card.icon}
                </div>

                <h3 className={cn('text-[11px] font-bold leading-tight', isSelected ? 'text-white' : 'text-slate-800')}>
                  {card.name}
                </h3>
                <p className={cn('mt-0.5 line-clamp-2 text-[9px] leading-snug', isSelected ? 'text-slate-400' : 'text-slate-500')}>
                  {card.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selectedCard && (
        <div className="animate-in slide-in-from-top-2 fade-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm duration-200">
          <div className={cn('flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r px-4 py-3', selectedCard.gradient, 'bg-opacity-30')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/80 text-lg shadow-sm">
              {selectedCard.icon}
            </div>
            <div>
              <p className="text-[12px] font-bold text-slate-800">{selectedCard.name}</p>
              <div className="mt-0.5 flex gap-1">
                {selectedCard.features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full border border-slate-200/50 bg-white/60 px-1.5 py-0.5 text-[8px] text-slate-600"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && question.trim()) {
                    handleSubmit();
                  }
                }}
                placeholder={selectedCard.placeholder}
                disabled={isDiscussing}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-[12px] outline-none transition-all focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
              />
              <button
                onClick={handleSubmit}
                disabled={!question.trim() || isDiscussing}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-[12px] font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-40"
              >
                시작 <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
