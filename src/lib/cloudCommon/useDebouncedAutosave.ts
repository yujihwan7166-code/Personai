/** 디바운스 자동저장 훅 — 시트/슬라이드/문서 공용. 1초 디바운스 + flush + 에러 토스트. */

import { useCallback, useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { updateFileBody } from '@/lib/cloudClient';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface UseDebouncedAutosaveOpts {
  id: string | undefined;
  /** 디바운스 ms. 기본 1000. */
  delayMs?: number;
  /** 저장 상태 setter (UI 뱃지용). */
  setSaveState: (s: SaveState) => void;
  /** 마지막 성공 저장 시각 setter (선택). */
  setLastSavedAt?: (ms: number) => void;
}

interface UseDebouncedAutosaveResult {
  /** 즉시 flush — 컴포넌트 unmount 직전이나 명시적 저장. */
  flushSave: () => Promise<void>;
  /** 변경 사항을 큐에 적재 + 디바운스 타이머 재시작. */
  queueSave: (patch: { name?: string; meta?: Record<string, unknown> }) => void;
}

/**
 * 사용 예:
 * ```ts
 * const { flushSave, queueSave } = useDebouncedAutosave({
 *   id, setSaveState, setLastSavedAt,
 * });
 * queueSave({ meta: { ...node.meta, body: nextBody } });
 * ```
 */
export function useDebouncedAutosave({
  id, delayMs = 1000, setSaveState, setLastSavedAt,
}: UseDebouncedAutosaveOpts): UseDebouncedAutosaveResult {
  const pendingRef = useRef<{ name?: string; meta?: Record<string, unknown> }>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** pending 변경 여부 — beforeunload 경고 트리거. */
  const hasPendingRef = useRef(false);

  const flushSave = useCallback(async () => {
    if (!id) return;
    const payload = pendingRef.current;
    if (!payload.name && !payload.meta) return;
    pendingRef.current = {};
    setSaveState('saving');
    try {
      await updateFileBody(id, payload);
      hasPendingRef.current = false;
      setSaveState('saved');
      setLastSavedAt?.(Date.now());
    } catch (e) {
      // 실패 시 pending 유지 (다음 시도에서 함께 보냄)
      pendingRef.current = { ...payload, ...pendingRef.current };
      setSaveState('error');
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '저장 실패', description: msg });
    }
  }, [id, setSaveState, setLastSavedAt]);

  const queueSave = useCallback((patch: { name?: string; meta?: Record<string, unknown> }) => {
    pendingRef.current = {
      ...pendingRef.current,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.meta !== undefined ? { meta: patch.meta } : {}),
    };
    hasPendingRef.current = true;
    setSaveState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void flushSave(); }, delayMs);
  }, [flushSave, delayMs, setSaveState]);

  // beforeunload — pending 있을 때만 경고 (브라우저 표준 다이얼로그)
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingRef.current) {
        e.preventDefault();
        // 일부 브라우저는 returnValue 필요 (메시지는 무시되고 표준 다이얼로그 노출)
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // unmount 시 pending 있으면 flush
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      void flushSave();
    };
  }, [flushSave]);

  return { flushSave, queueSave };
}
