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

/* ── Per-assistant icon background color ── */
const ICON_BG: Record<string, string> = {
  translate: 'bg-blue-100', 'file-convert': 'bg-slate-200',
  study: 'bg-blue-100', math: 'bg-teal-100',
  document: 'bg-emerald-100', ppt: 'bg-indigo-100', resume: 'bg-teal-100', legal: 'bg-amber-100',
  saving: 'bg-yellow-100',
  'voice-analysis': 'bg-violet-100', chart: 'bg-blue-100', trend: 'bg-orange-100', 'youtube-analysis': 'bg-red-100',
  'image-gen': 'bg-pink-100', logo: 'bg-lime-100',
};

export function AssistantCardsPanel({
  selectedCardId, onSelectCard, onSubmitAssistant, isDiscussing,
}: AssistantCardsPanelProps) {
  const [question, setQuestion] = useState('');

  const selectedCard = useMemo(() => ASSISTANT_CARDS.find((c) => c.id === selectedCardId) ?? null, [selectedCardId]);

  useEffect(() => { setQuestion(''); }, [selectedCardId]);

  const handleSubmit = () => {
    if (!selectedCard || !question.trim()) return;
    onSubmitAssistant(selectedCard.id, question.trim());
  };

  return (
    <div className="space-y-3 -mx-1.5">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {ASSISTANT_CARDS.map((card) => {
          const isSelected = selectedCardId === card.id;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectCard(isSelected ? null : card.id)}
              className={cn(
                'group relative text-left rounded-2xl border p-3 transition-all duration-200',
                isSelected
                  ? 'border-indigo-300 bg-white ring-2 ring-indigo-400/30 shadow-md -translate-y-0.5'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5',
              )}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-[20px] flex-shrink-0 transition-transform duration-200 group-hover:scale-105',
                  ICON_BG[card.id] || 'bg-slate-100',
                )}>
                  {card.icon}
                </div>
                <span className={cn(
                  'text-[13px] font-bold leading-tight truncate',
                  isSelected ? 'text-indigo-700' : 'text-slate-800',
                )}>
                  {card.name}
                </span>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-400 line-clamp-2 mb-2">
                {card.description}
              </p>

              {card.sampleQuestions && card.sampleQuestions.length > 0 && (
                <div className="space-y-0.5">
                  {card.sampleQuestions.slice(0, 2).map((q, i) => (
                    <p key={i} className="text-[10px] text-slate-400 truncate">
                      <span className="text-slate-300 mr-0.5">→</span>{q}
                    </p>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedCard && (
        <div className="animate-in slide-in-from-top-2 fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm duration-200">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-xl', ICON_BG[selectedCard.id] || 'bg-slate-100')}>
              {selectedCard.icon}
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-800">{selectedCard.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{selectedCard.description}</p>
            </div>
          </div>
          <div className="p-4">
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && question.trim()) handleSubmit(); }}
                placeholder={selectedCard.placeholder}
                disabled={isDiscussing}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-[12px] outline-none transition-all focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
              />
              <button
                onClick={handleSubmit}
                disabled={!question.trim() || isDiscussing}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-5 py-2.5 text-[12px] font-semibold text-white shadow-sm transition-all hover:bg-slate-700 disabled:opacity-40"
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
