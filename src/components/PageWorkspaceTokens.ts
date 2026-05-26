export const PAGE_SWITCHER_MOBILE_POSITION_CLASS =
  'fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-[calc(0.375rem+env(safe-area-inset-left))] z-40 sm:hidden' as const;

export const PAGE_SWITCHER_MOBILE_MENU_CLASS =
  'absolute bottom-full left-0 mb-2 w-40 rounded-lg border border-[hsl(var(--hairline))] bg-card/95 p-1 shadow-lg backdrop-blur' as const;

export const PAGE_SWITCHER_DESKTOP_CLASS =
  'fixed right-5 top-5 z-40 hidden max-w-[calc(100vw-1.5rem)] items-center gap-0.5 overflow-x-auto rounded-lg border border-[hsl(var(--hairline))] bg-card/85 p-0.5 shadow-sm backdrop-blur sm:inline-flex' as const;
