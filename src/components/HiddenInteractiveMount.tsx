import { useCallback, type ReactNode } from 'react';

interface HiddenInteractiveMountProps {
  children: ReactNode;
}

const hiddenMountStyle = {
  position: 'fixed',
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
  visibility: 'hidden',
} as const;

export function HiddenInteractiveMount({ children }: HiddenInteractiveMountProps) {
  const setMountRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    (node as HTMLDivElement & { inert: boolean }).inert = true;
  }, []);

  return (
    <div
      ref={setMountRef}
      data-hidden-interactive-mount
      style={hiddenMountStyle}
      aria-hidden
    >
      {children}
    </div>
  );
}
