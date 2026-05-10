/**
 * 모달/팝오버 활성 시 body scroll 잠금.
 *
 * 여러 컴포넌트가 동시에 열릴 수 있으므로 reference count 로 관리.
 * 마지막이 닫히면 원래 overflow 복원.
 */
import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow: string | null = null;
let originalPaddingRight: string | null = null;

const acquire = (): void => {
  if (typeof document === 'undefined') return;
  lockCount += 1;
  if (lockCount > 1) return;
  // 첫 잠금 — 현재 값 캡처 후 잠금.
  originalOverflow = document.body.style.overflow;
  originalPaddingRight = document.body.style.paddingRight;
  // scrollbar 사라짐 보상 — content shift 방지.
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
  document.body.style.overflow = 'hidden';
};

const release = (): void => {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;
  document.body.style.overflow = originalOverflow ?? '';
  document.body.style.paddingRight = originalPaddingRight ?? '';
  originalOverflow = null;
  originalPaddingRight = null;
};

/**
 * active === true 인 동안 body scroll 잠금. 컴포넌트 unmount 또는 active=false 시 해제.
 */
export const useScrollLock = (active: boolean): void => {
  useEffect(() => {
    if (!active) return;
    acquire();
    return () => release();
  }, [active]);
};
