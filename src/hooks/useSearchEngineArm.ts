/**
 * 검색 칩 armed 상태 훅.
 *   - null 이면 AI 모드로 라우팅 (기본).
 *   - 특정 chipId 로 armed 되면 입력창 placeholder / 색이 바뀌고,
 *     Enter 시 외부 검색으로 이동.
 *   - 같은 칩을 다시 누르면 disarm (null).
 */
import { useCallback, useState } from 'react';
import type { HeroChipId } from '@/lib/heroSearchChips';

export function useSearchEngineArm(): {
  armed: HeroChipId | null;
  toggle: (id: HeroChipId) => void;
  disarm: () => void;
} {
  const [armed, setArmed] = useState<HeroChipId | null>(null);

  const toggle = useCallback((id: HeroChipId) => {
    setArmed((prev) => (prev === id ? null : id));
  }, []);

  const disarm = useCallback(() => {
    setArmed(null);
  }, []);

  return { armed, toggle, disarm };
}
