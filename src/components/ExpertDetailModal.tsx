import * as React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Sparkles, Check, Plus } from 'lucide-react';
import { AIAbilityRadar } from './AIAbilityRadar';
import { ExpertAvatar } from './ExpertAvatar';
import type { Expert } from '@/types/expert';

const GRADIENT_MAP: Record<string, string> = {
  blue: 'from-blue-400 via-blue-300 to-blue-400',
  emerald: 'from-emerald-400 via-green-300 to-emerald-400',
  red: 'from-red-400 via-rose-300 to-red-400',
  amber: 'from-amber-400 via-yellow-300 to-amber-400',
  purple: 'from-purple-400 via-violet-300 to-purple-400',
  orange: 'from-orange-400 via-orange-300 to-orange-400',
  teal: 'from-teal-400 via-teal-300 to-teal-400',
  pink: 'from-pink-400 via-pink-300 to-pink-400',
  slate: 'from-slate-400 via-slate-300 to-slate-400',
  green: 'from-green-400 via-green-300 to-green-400',
  cyan: 'from-cyan-400 via-cyan-300 to-cyan-400',
  sky: 'from-sky-400 via-sky-300 to-sky-400',
};

const BAR_COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-400',
  emerald: 'bg-emerald-400',
  red: 'bg-red-400',
  amber: 'bg-amber-400',
  purple: 'bg-purple-400',
  orange: 'bg-orange-400',
  teal: 'bg-teal-400',
  pink: 'bg-pink-400',
  slate: 'bg-slate-400',
  green: 'bg-green-400',
  cyan: 'bg-cyan-400',
  sky: 'bg-sky-400',
};

const STAT_LABELS: { key: keyof NonNullable<Expert['abilities']>; label: string }[] = [
  { key: 'coding', label: '코딩' },
  { key: 'creativity', label: '창의성' },
  { key: 'reasoning', label: '추론' },
  { key: 'math', label: '수학' },
  { key: 'multilingual', label: '다국어' },
  { key: 'speed', label: '속도' },
  { key: 'costEfficiency', label: '비용효율' },
  { key: 'contextWindow', label: '토큰용량' },
];

function getStatTier(value: number): string {
  if (value >= 95) return 'text-amber-400 font-bold';
  if (value >= 85) return 'text-white font-semibold';
  if (value >= 70) return 'text-slate-300 font-medium';
  return 'text-slate-400 font-medium';
}

interface ExpertDetailModalProps {
  expert: Expert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export function ExpertDetailModal({ expert, open, onOpenChange, isSelected, onToggle }: ExpertDetailModalProps) {
  if (!expert) return null;

  const gradient = GRADIENT_MAP[expert.color] || GRADIENT_MAP.blue;
  const barColor = BAR_COLOR_MAP[expert.color] || 'bg-indigo-400';
  const isAuto = expert.id.startsWith('auto-') && expert.id !== 'auto-ai';
  const hasAbilities = expert.abilities && !expert.id.startsWith('auto-') && expert.id !== 'ancano' && expert.id !== 'ancano-pro';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-[360px] !bg-gradient-to-b !from-slate-800 !to-slate-900 !border-white/10 !text-white rounded-2xl overflow-hidden">
        <DialogTitle className="sr-only">{expert.nameKo} 상세 정보</DialogTitle>

        <div className={cn('h-1.5 w-full bg-gradient-to-r', gradient)} />

        <div className="px-5 pt-4 pb-3 text-center space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <ExpertAvatar expert={expert} size="sm" />
            <h3 className="text-lg font-bold tracking-tight text-white">{expert.nameKo}</h3>
          </div>

          {isAuto && (
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-0.5 px-2 py-[2px] rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-[9px] font-bold tracking-wide">
                <Sparkles className="w-3 h-3" /> AUTO
              </span>
            </div>
          )}

          <p className="text-[13px] text-slate-300 leading-relaxed">{expert.description}</p>
          {expert.quote && (
            <p className="text-[12px] text-amber-300/90 font-medium italic">"{expert.quote}"</p>
          )}
        </div>

        {hasAbilities && expert.abilities && (
          <div className="px-4 pb-3">
            <div className="flex justify-center">
              <div className="w-full max-w-[280px]">
                <AIAbilityRadar abilities={expert.abilities} color={expert.color} name={expert.nameKo} />
              </div>
            </div>

            <div className="space-y-1.5 mt-2">
              {STAT_LABELS.map(({ key, label }) => {
                const value = expert.abilities![key];
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 w-[52px] text-right shrink-0">{label}</span>
                    <div className="flex-1 h-[6px] bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', value >= 90 ? 'bg-amber-400' : barColor)}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                    <span className={cn('text-[11px] w-7 text-right tabular-nums shrink-0', getStatTier(value))}>
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {expert.sampleQuestions && expert.sampleQuestions.length > 0 && (
          <div className="mx-4 mb-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-1">
              <p className="text-[10px] text-slate-500 font-medium tracking-wider text-center mb-1.5">추천 질문</p>
              {expert.sampleQuestions.map((q, i) => (
                <p key={i} className="text-[11px] text-slate-300 text-center leading-relaxed">{q}</p>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 pb-4">
          <button
            onClick={() => { onToggle(expert.id); onOpenChange(false); }}
            className={cn(
              'w-full py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5',
              isSelected
                ? 'bg-white/10 text-slate-300 hover:bg-white/15'
                : cn('bg-gradient-to-r text-white shadow-lg hover:brightness-110', gradient),
            )}
          >
            {isSelected ? (
              <><Check className="w-4 h-4" /> 선택 해제</>
            ) : (
              <><Plus className="w-4 h-4" /> 선택하기</>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
