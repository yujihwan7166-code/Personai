// 전역 알림 API — sonner 래핑. 모드 전역에서 일관된 토스트 경험.

import { toast } from 'sonner';

type NotifyKind = 'success' | 'error' | 'info' | 'warning';

interface NotifyOptions {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

/**
 * 지속시간 사다리 — 넷뿐이다.
 *
 * 세어 보니 호출부마다 손으로 적은 값이 스물세 가지였다(1200, 1300, 1400, 1500,
 * 1600, 1800, 2000, 2200 …). 아무도 그 스물셋을 고른 게 아니라 그때그때 적은
 * 값이 쌓인 것이고, 결과적으로 같은 무게의 알림이 화면마다 다른 시간을 살았다.
 *
 * 호출부 150여 곳을 고치는 대신 여기서 가장 가까운 층으로 붙인다. 층의 뜻:
 *   1500  스치는 확인 — 복사됐어요 · 취소했어요. 못 읽고 지나가도 되는 것
 *   2500  기본 — 저장됐어요, 한 줄 안내
 *   5000  읽어야 하는 것 — 오류 · 설명 딸린 안내
 *   8000  되돌리기 — 읽고, 마음을 정하고, 버튼까지 눌러야 하는 시간
 */
const LADDER = [1500, 2500, 5000, 8000] as const;
const snap = (ms: number): number =>
  LADDER.reduce<number>((best, step) => (Math.abs(step - ms) < Math.abs(best - ms) ? step : best), LADDER[0]);

function emit(kind: NotifyKind, message: string, opts: NotifyOptions = {}) {
  const { description, duration, action } = opts;
  /* 기본값: 되돌리기가 붙어 있으면 8000 — 지속시간을 따로 적지 않아도
     '행동이 필요한 알림은 오래 산다' 가 저절로 지켜진다. */
  const fallback = action ? 8000 : kind === 'error' ? 5000 : 2500;
  const base = { description, duration: snap(duration ?? fallback), action };
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
  saved:    (name?: string) => emit('success', name ? `"${name}" 저장됐어요` : '저장됐어요', { duration: 2500 }),
  canceled: () => emit('info', '취소했어요', { duration: 1500 }),
};
