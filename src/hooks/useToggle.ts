/**
 * boolean state 토글 — useState + 반전 setter 패턴 단축.
 *
 * 사용:
 *   const [open, toggle, setOpen] = useToggle();
 *   <Dialog open={open} onOpenChange={setOpen} />
 *   <Button onClick={toggle}>토글</Button>
 */
import { useCallback, useState } from 'react';

export function useToggle(initial = false): [boolean, () => void, (v: boolean) => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle, setValue];
}
