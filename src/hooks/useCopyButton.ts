/**
 * 복사 버튼 hook — 클릭 → copyText → 짧은 'copied' 상태.
 *
 * 메모/위키/AI 응답 등에 흔한 '복사' 버튼 UX 표준화.
 *
 * 사용:
 *   const { copied, copy } = useCopyButton();
 *   <button onClick={() => copy(text)}>{copied ? '복사됨' : '복사'}</button>
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { copyText } from '@/lib/clipboard';

interface Options {
  /** 'copied' 상태 유지 ms. 기본 1500. */
  durationMs?: number;
}

export function useCopyButton({ durationMs = 1500 }: Options = {}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), durationMs);
    }
    return ok;
  }, [durationMs]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { copied, copy };
}
