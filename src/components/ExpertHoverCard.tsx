import { createPortal } from 'react-dom';
import type { Expert } from '@/types/expert';
import { cn } from '@/lib/utils';

interface ExpertHoverCardProps {
  expert: Expert | null;
  position: { x: number; y: number } | null;
}

const SAMPLE_QUESTIONS_LABEL = '\uCD94\uCC9C \uC9C8\uBB38';

export function ExpertHoverCard({ expert, position }: ExpertHoverCardProps) {
  if (!expert || !position) return null;

  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: `clamp(8px, ${position.x}px, calc(100vw - 8px))`,
        top: `${position.y - 8}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out">
        <div className="w-56 overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-slate-800 to-slate-900 text-white shadow-[0_12px_36px_rgba(0,0,0,0.38)]">
          <div className="px-3 pb-1 pt-2.5 text-center">
            <p className="truncate text-[12px] font-bold leading-tight tracking-tight">{expert.nameKo}</p>
          </div>

          <div
            className={cn('mx-2 mb-1 h-[3px] rounded-full', {
              'bg-gradient-to-r from-blue-400 via-blue-300 to-blue-400': expert.color === 'blue',
              'bg-gradient-to-r from-emerald-400 via-green-300 to-emerald-400': expert.color === 'emerald',
              'bg-gradient-to-r from-red-400 via-rose-300 to-red-400': expert.color === 'red',
              'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400': expert.color === 'amber',
              'bg-gradient-to-r from-purple-400 via-violet-300 to-purple-400': expert.color === 'purple',
              'bg-gradient-to-r from-orange-400 via-orange-300 to-orange-400': expert.color === 'orange',
              'bg-gradient-to-r from-teal-400 via-teal-300 to-teal-400': expert.color === 'teal',
              'bg-gradient-to-r from-pink-400 via-pink-300 to-pink-400': expert.color === 'pink',
            })}
          />

          <div className="space-y-1 px-3 pb-2 pt-0 text-center">
            <p className="truncate text-[10px] leading-tight text-slate-200">{expert.description}</p>
            {expert.quote && (
              <p className="truncate text-[9px] font-medium leading-tight text-amber-300">"{expert.quote}"</p>
            )}
          </div>

          {expert.sampleQuestions && expert.sampleQuestions.length > 0 && (
            <div className="relative mx-3 mb-3 mt-1">
              <div className="rounded-lg border border-white/15 bg-white/[0.02] px-2.5 pb-1.5 pt-2">
                <span
                  className="absolute -top-[5px] left-1/2 -translate-x-1/2 px-1.5 text-[7px] font-medium tracking-wider text-slate-400"
                  style={{ backgroundColor: '#1a2030' }}
                >
                  {SAMPLE_QUESTIONS_LABEL}
                </span>
                {expert.sampleQuestions.map((question, index) => (
                  <p key={index} className="truncate py-1 text-center text-[9px] leading-normal text-slate-300">
                    {question}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <div className="-mt-[5px] h-2.5 w-2.5 rotate-45 border-b border-r border-white/[0.06] bg-slate-900" />
        </div>
      </div>
    </div>,
    document.body
  );
}
