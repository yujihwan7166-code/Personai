export type PageAiTone = 'blue' | 'amber' | 'emerald' | 'violet' | 'rose';

export const PAGE_AI_PANEL_WIDTH = {
  min: 300,
  max: 420,
  default: 340,
} as const;

export const PAGE_AI_LAUNCHER_POSITION_CLASS =
  'fixed right-[calc(0.5rem+env(safe-area-inset-right))] top-[calc(0.5rem+env(safe-area-inset-top))] z-50 sm:right-[calc(9.25rem+env(safe-area-inset-right))]' as const;

export const PAGE_AI_LAUNCHER_SIZE_CLASS =
  'h-8 w-8 sm:h-8 sm:w-[94px] sm:px-2' as const;

export const PAGE_AI_PANEL_SURFACE_CLASS =
  'bg-background border-l border-[hsl(var(--hairline))] shadow-[-10px_0_30px_-24px_hsl(30_15%_8%/0.45)]' as const;

export const PAGE_AI_PANEL_TRANSITION_CLASS =
  'transition-[width,transform] duration-200 ease-out' as const;

export const PAGE_AI_PANEL_SLOT_CLASS =
  'fixed inset-y-0 right-0 z-[60] sm:static sm:inset-auto sm:z-auto sm:min-h-0 sm:self-stretch sm:shrink-0' as const;

export const PAGE_AI_PANEL_SCROLL_CLASS =
  'min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3' as const;

export function clampPageAiPanelWidth(next: number): number {
  return Math.max(PAGE_AI_PANEL_WIDTH.min, Math.min(PAGE_AI_PANEL_WIDTH.max, Math.round(next)));
}

export const PAGE_AI_TONE_DOT: Record<PageAiTone, string> = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  violet: 'bg-violet-500',
  rose: 'bg-rose-500',
};

export const PAGE_AI_TONE_ICON: Record<PageAiTone, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
};

export const PAGE_AI_TONE_RING: Record<PageAiTone, string> = {
  blue: 'group-hover:ring-blue-400/30',
  amber: 'group-hover:ring-amber-400/30',
  emerald: 'group-hover:ring-emerald-400/30',
  violet: 'group-hover:ring-violet-400/30',
  rose: 'group-hover:ring-rose-400/30',
};
