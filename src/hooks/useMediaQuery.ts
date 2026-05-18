/**
 * matchMedia 결과를 reactive state 로 — 일반화된 useIsMobile.
 *
 * 기존 useIsMobile 은 768px 고정. 자유 query 가 필요한 곳 위해 별도 hook.
 *
 * 사용:
 *   const isDesktop = useMediaQuery('(min-width: 1024px)');
 *   const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 *   const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 */

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return defaultValue;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    setMatches(mql.matches);
    // 옛 Safari 호환 — addListener / addEventListener 둘 다 시도.
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // @ts-expect-error — 옛 API
    mql.addListener(onChange);
    return () => {
      // @ts-expect-error — 옛 API
      mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
}
