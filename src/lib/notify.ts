// 전역 알림 API — sonner 래핑. 모드 전역에서 일관된 토스트 경험.

import { toast } from 'sonner';

type NotifyKind = 'success' | 'error' | 'info' | 'warning';

interface NotifyOptions {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

function emit(kind: NotifyKind, message: string, opts: NotifyOptions = {}) {
  const { description, duration, action } = opts;
  const base = { description, duration: duration ?? (kind === 'error' ? 5000 : 2500), action };
  switch (kind) {
    case 'success': return toast.success(message, base);
    case 'error':   return toast.error(message, base);
    case 'warning': return toast.warning(message, base);
    case 'info':
    default:        return toast(message, base);
  }
}

export const notify = {
  success: (msg: string, opts?: NotifyOptions) => emit('success', msg, opts),
  error:   (msg: string, opts?: NotifyOptions) => emit('error', msg, opts),
  warning: (msg: string, opts?: NotifyOptions) => emit('warning', msg, opts),
  info:    (msg: string, opts?: NotifyOptions) => emit('info', msg, opts),
  // 자주 쓰는 프리셋들
  copied:   () => emit('success', '복사됐어요', { duration: 1500 }),
  saved:    (name?: string) => emit('success', name ? `"${name}" 저장됐어요` : '저장됐어요', { duration: 2000 }),
  canceled: () => emit('info', '취소했어요', { duration: 1500 }),
};
