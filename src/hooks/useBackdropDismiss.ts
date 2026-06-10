import { useCallback, useRef, type PointerEventHandler } from 'react';

export const useBackdropDismiss = <T extends HTMLElement>(onDismiss: () => void) => {
  const pointerStartedOnBackdropRef = useRef(false);

  const onPointerDown = useCallback<PointerEventHandler<T>>((event) => {
    pointerStartedOnBackdropRef.current = event.target === event.currentTarget;
  }, []);

  const onPointerUp = useCallback<PointerEventHandler<T>>((event) => {
    const shouldDismiss = pointerStartedOnBackdropRef.current && event.target === event.currentTarget;
    pointerStartedOnBackdropRef.current = false;
    if (shouldDismiss) onDismiss();
  }, [onDismiss]);

  return { onPointerDown, onPointerUp };
};
