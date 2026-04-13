import { createPortal } from 'react-dom';

import type { Expert } from '@/types/expert';
import { cn } from '@/lib/utils';

import { AIAbilityRadar } from './AIAbilityRadar';

interface ExpertHoverTipProps {
  expert: Expert | null;
  position: { x: number; y: number } | null;
}

const TIP_BAR_COLORS: Record<string, string> = {
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

const TIP_STATS: { key: string; label: string }[] = [
  { key: 'coding', label: '코딩' },
  { key: 'creativity', label: '창의성' },
  { key: 'reasoning', label: '추론력' },
  { key: 'math', label: '수학' },
  { key: 'multilingual', label: '다국어' },
  { key: 'speed', label: '속도' },
  { key: 'costEfficiency', label: '비용효율' },
  { key: 'contextWindow', label: '토큰용량' },
];

function TipAbilitySection({
  abilities,
  color,
  name,
}: {
  abilities: Expert['abilities'];
  color: string;
  name: string;
}) {
  if (!abilities) {
    return null;
  }

  const barColor = TIP_BAR_COLORS[color] || 'bg-indigo-400';

  return (
    <div className="pb-2.5">
      <div className="px-2.5">
        <AIAbilityRadar abilities={abilities} color={color} name={name} />
      </div>
      <div className="space-y-[3px] mt-1 pl-3 pr-5">
        {TIP_STATS.map(({ key, label }) => {
          const value = abilities[key as keyof typeof abilities];

          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className="text-[8px] text-slate-400 w-[38px] text-center shrink-0">{label}</span>
              <div className="flex-1 h-[4px] bg-white/10 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full', value >= 90 ? 'bg-amber-400' : barColor)} style={{ width: `${value}%` }} />
              </div>
              <span
                className={cn(
                  'text-[8px] w-[18px] text-right tabular-nums',
                  value >= 95 ? 'text-amber-400 font-bold' : value >= 85 ? 'text-white font-semibold' : 'text-slate-400',
                )}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ExpertHoverTip({ expert, position }: ExpertHoverTipProps) {
  if (!expert || !position) {
    return null;
  }

  return createPortal(
    <div
      className="fixed z-[9998] pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateY(-50%)',
      }}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a2030]/95 shadow-[0_10px_32px_rgba(0,0,0,0.45)] backdrop-blur-md',
          expert.abilities && !expert.id.startsWith('auto-') ? 'w-64' : 'w-56',
        )}
      >
        <div className="pt-3">
          <div className="flex items-center justify-center gap-2 px-3">
            {expert.category === 'ai' && (
              expert.avatarUrl ? (
                (/\/(gpt|perplexity|grok)\.svg$/).test(expert.avatarUrl) ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white shrink-0">
                    <img src={expert.avatarUrl} alt="" className="w-3.5 h-3.5 rounded-full object-contain" />
                  </span>
                ) : (
                  <img src={expert.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
                )
              ) : (
                <span className="text-sm">{expert.icon}</span>
              )
            )}
            <p className="text-[13px] font-bold tracking-tight leading-tight text-white">{expert.nameKo}</p>
          </div>

          <div
            className={cn('h-[3px] mx-3 mt-1 rounded-full bg-gradient-to-r', {
              'from-blue-400 via-blue-300 to-blue-400': expert.color === 'blue',
              'from-emerald-400 via-green-300 to-emerald-400': expert.color === 'emerald',
              'from-red-400 via-rose-300 to-red-400': expert.color === 'red',
              'from-amber-400 via-yellow-300 to-amber-400': expert.color === 'amber',
              'from-purple-400 via-violet-300 to-purple-400': expert.color === 'purple',
              'from-orange-400 via-orange-300 to-orange-400': expert.color === 'orange',
              'from-teal-400 via-teal-300 to-teal-400': expert.color === 'teal',
              'from-pink-400 via-pink-300 to-pink-400': expert.color === 'pink',
              'from-slate-400 via-slate-300 to-slate-400': expert.color === 'slate',
              'from-green-400 via-green-300 to-green-400': expert.color === 'green',
              'from-cyan-400 via-cyan-300 to-cyan-400': expert.color === 'cyan',
              'from-sky-400 via-sky-300 to-sky-400': expert.color === 'sky',
            })}
          />

          <div className="px-3 pt-1.5 pb-2 text-center">
            <p className="text-[10px] text-slate-300 leading-relaxed">{expert.description}</p>
          </div>

          {expert.abilities && expert.id !== 'ancano' && expert.id !== 'ancano-pro' && (
            <TipAbilitySection abilities={expert.abilities} color={expert.color} name={expert.nameKo} />
          )}

          {!expert.abilities && (
            <>
              {expert.quote && (
                <div className="px-3 pb-1.5 text-center">
                  <p className="text-[9px] text-amber-300 font-medium leading-tight">"{expert.quote}"</p>
                </div>
              )}
              {expert.sampleQuestions && expert.sampleQuestions.length > 0 && (
                <div className="mx-3 mb-3 mt-0.5 relative">
                  <div className="rounded-lg border border-white/15 bg-white/[0.02] pt-2 pb-1.5 px-2.5">
                    <span className="absolute -top-[5px] left-1/2 -translate-x-1/2 px-1.5 text-[7px] text-slate-400 tracking-wider font-medium" style={{ backgroundColor: '#1a2030' }}>
                      추천 질문
                    </span>
                    {expert.sampleQuestions.map((question, index) => (
                      <p key={index} className="text-[9px] text-slate-300 text-center leading-normal py-1 truncate">
                        {question}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="absolute left-0 top-1/2 -translate-x-[5px] -translate-y-1/2">
          <div className="w-2.5 h-2.5 bg-slate-800 rotate-45 border-l border-b border-white/[0.06]" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
