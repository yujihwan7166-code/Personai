// Sonner 기반 호환 셰임 — 기존 radix `toast({ title, description, variant })` 코드가 깨지지 않도록 유지.
// 신규 코드는 `@/lib/notify`의 notify API를 직접 사용.

import type { ReactNode } from 'react';
import { notify } from '@/lib/notify';

type Variant = 'default' | 'destructive';

interface ToastArgs {
  title?: ReactNode;
  description?: ReactNode;
  variant?: Variant;
  duration?: number;
}

function toReactText(v: ReactNode | undefined): string | undefined {
  if (v == null || v === false) return undefined;
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  // 복잡한 ReactNode는 문자열화 못 함 — 최대한 안전하게 빈 문자열로.
  return undefined;
}

export function toast({ title, description, variant = 'default', duration }: ToastArgs) {
  const t = toReactText(title) ?? '';
  const d = toReactText(description);
  if (variant === 'destructive') {
    notify.error(t || '오류', { description: d, duration });
  } else {
    notify.info(t, { description: d, duration });
  }
  // 반환값은 호환용 no-op
  return { id: '', dismiss: () => { /* noop */ }, update: () => { /* noop */ } };
}

// useToast 훅 호환 — state는 더 이상 관리하지 않고 toast 함수만 제공.
export function useToast() {
  return { toast, toasts: [] as unknown[], dismiss: (_?: string) => { /* noop */ } };
}
