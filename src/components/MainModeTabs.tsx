import { AnimatePresence, motion } from 'framer-motion';

import type { MainMode } from '@/types/expert';
import { cn } from '@/lib/utils';

interface MainModeTabsProps {
  modes: MainMode[];
  labels: Record<MainMode, string>;
  currentMode: MainMode;
  pendingMode: MainMode | null;
  isDiscussing: boolean;
  transitionPhase: number;
  showPlayerBg: boolean;
  onChange: (mode: MainMode) => void;
}

export function MainModeTabs({
  modes,
  labels,
  currentMode,
  pendingMode,
  isDiscussing,
  transitionPhase,
  showPlayerBg,
  onChange,
}: MainModeTabsProps) {
  return (
    <>
      {modes.map((mode) => {
        const isActive = currentMode === mode || pendingMode === mode;

        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            disabled={isDiscussing || transitionPhase !== 0}
            className={cn(
              'relative flex items-center justify-center gap-1 min-w-0 px-3 py-[2px] rounded-full text-[11px] tracking-tight transition-colors duration-200',
              isActive
                ? 'text-white font-semibold'
                : showPlayerBg
                  ? 'text-slate-400 font-medium hover:text-slate-200'
                  : 'text-slate-600 font-medium hover:text-slate-900',
            )}
          >
            <AnimatePresence>
              {isActive && (
                <motion.div
                  key={`main-pill-${mode}`}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className={cn(
                    'absolute inset-0 rounded-full shadow-sm',
                    mode === 'player'
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/25'
                      : 'bg-indigo-500',
                  )}
                />
              )}
            </AnimatePresence>
            <span className="relative z-10">{labels[mode]}</span>
          </button>
        );
      })}
    </>
  );
}
