/**
 * 포모도로 / 집중 타이머 위젯 — Planner 페이지 우상단 floating.
 *
 * 상태 3종:
 * - idle: 활성 세션 없음 — 위젯 숨김
 * - running: 카운트다운 진행 — 큰 시간 + progress ring + pause/stop
 * - paused: 일시정지 — 시간 멈춤 + 재개/stop
 *
 * 종료 시 자동 동작:
 * - 브라우저 알림 (권한 있으면)
 * - autoComplete=true 면 task done 으로
 * - 토스트 알림
 */
import { useEffect, useState } from 'react';
import { Pause, Play, X, Check, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pomodoroStore, type PomodoroSession, PLANNER_POMODORO_CHANGED } from '@/services/planner/pomodoroStore';
import { taskStore } from '@/services/planner/taskStore';
import { notify } from '@/lib/notify';

const formatMmss = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const PomodoroWidget = () => {
  const [session, setSession] = useState<PomodoroSession | null>(() => pomodoroStore.current());
  const [now, setNow] = useState(Date.now());

  // 세션 변경 listen.
  useEffect(() => {
    const refresh = () => setSession(pomodoroStore.current());
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_POMODORO_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_POMODORO_CHANGED, refresh);
  }, []);

  // 1초 tick — 세션 활성일 때만.
  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session]);

  // 종료 감지 — 0초 이하면 자동 종료 처리.
  useEffect(() => {
    if (!session) return;
    const remaining = pomodoroStore.remainingMs(session, new Date(now));
    if (remaining <= 0 && !session.pausedAt) {
      // 종료 처리 — 계획대로 끝났으니 completed: true.
      handleComplete(session);
      pomodoroStore.stop({ completed: true });
    }

  }, [now, session]);

  if (!session) return null;

  const remaining = pomodoroStore.remainingMs(session, new Date(now));
  const progress = pomodoroStore.progress(session, new Date(now));
  const isPaused = !!session.pausedAt;

  const handleComplete = (s: PomodoroSession) => {
    // 자동 완료.
    if (s.autoComplete && s.taskInstanceId) {
      taskStore.toggleDone(s.taskInstanceId);
    } else if (s.autoComplete && s.taskId) {
      taskStore.toggleDone(s.taskId);
    }
    // 브라우저 알림.
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🍅 포모도로 완료', {
          body: s.taskTitle ?? `${s.durationMin}분 집중 끝!`,
          tag: 'planner-pomodoro',
        });
      } catch {
        /* silent */
      }
    }
    // 토스트.
    notify.success('🍅 집중 완료!', {
      duration: 5000,
      description: s.taskTitle ?? `${s.durationMin}분 집중 끝났어요`,
      action: {
        label: '5분 휴식 시작',
        onClick: () => pomodoroStore.start({ durationMin: 5, autoComplete: false }),
      },
    });
  };

  // 진행률 ring (SVG circle).
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div
      role="region"
      aria-label="포모도로 집중 타이머"
      className={cn(
        'fixed top-3 right-3 z-50 inline-flex items-center gap-2 px-2.5 py-1.5',
        'rounded-full shadow-lg border bg-card',
        'transition-all',
        isPaused
          ? 'border-amber-300 bg-amber-50/90'
          : remaining < 60_000
            ? 'border-rose-300 bg-rose-50/90'
            : 'border-[hsl(var(--hairline))]',
      )}
    >
      {/* 진행 링 + 시간 */}
      <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 50 50">
          <circle
            cx="25"
            cy="25"
            r={radius}
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth="3"
          />
          <circle
            cx="25"
            cy="25"
            r={radius}
            fill="none"
            stroke={remaining < 60_000 ? 'hsl(0 75% 55%)' : 'hsl(140 50% 45%)'}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <span className="text-[11px] font-mono tabular-nums font-semibold text-foreground">
          {formatMmss(remaining)}
        </span>
      </div>
      {session.taskTitle && (
        <span className="text-[12px] font-medium text-foreground max-w-[180px] truncate">
          {session.taskTitle}
        </span>
      )}
      <div className="flex items-center gap-0.5 ml-1">
        <button
          type="button"
          onClick={() => pomodoroStore.togglePause()}
          aria-label={isPaused ? '재개' : '일시정지'}
          title={isPaused ? '재개' : '일시정지'}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
        </button>
        <button
          type="button"
          onClick={() => {
            pomodoroStore.stop();
            notify.info('포모도로 중단됨', { duration: 1200 });
          }}
          aria-label="중단"
          title="중단"
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-rose-500/10 hover:text-rose-500 transition-colors text-muted-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

/** 자유 포모도로 시작 — task 없이 25분 집중. 헤더 등에서 사용. */
interface QuickPomodoroButtonProps {
  className?: string;
}

export const QuickPomodoroButton = ({ className }: QuickPomodoroButtonProps) => {
  const [open, setOpen] = useState(false);
  const handleStart = async (durationMin: number) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { /* silent */ }
    }
    pomodoroStore.start({ durationMin, autoComplete: false });
    notify.success(`🍅 ${durationMin}분 집중 시작!`, { duration: 1200 });
    setOpen(false);
  };
  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2 h-7 rounded-md text-[11.5px] font-medium border border-[hsl(var(--hairline))] hover:bg-accent transition-colors text-foreground"
        title="자유 포모도로 시작"
      >
        🍅 집중
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="닫기"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full right-0 mt-1 z-50 min-w-[140px] rounded-md border border-[hsl(var(--hairline))] bg-card shadow-lg overflow-hidden">
            {[15, 25, 45, 60, 90].map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => handleStart(min)}
                className="w-full px-3 py-2 text-left text-[12px] hover:bg-accent transition-colors flex items-center justify-between"
              >
                <span>{min}분</span>
                {min === 25 && <span className="text-[10px] text-muted-foreground">기본</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/** 시간 블록 / 모달의 "▶ 집중 시작" 버튼 — 작은 헬퍼.
 * 권한 요청 + 세션 시작. */
interface StartPomodoroButtonProps {
  taskId?: string;
  taskInstanceId?: string;
  taskTitle?: string;
  durationMin: number;
  autoComplete?: boolean;
  className?: string;
  label?: string;
}

export const StartPomodoroButton = ({
  taskId, taskInstanceId, taskTitle, durationMin, autoComplete = false, className, label = '집중 시작',
}: StartPomodoroButtonProps) => {
  const handleStart = async () => {
    // 알림 권한 — 처음이면 한 번 요청.
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        /* silent */
      }
    }
    pomodoroStore.start({ taskId, taskInstanceId, taskTitle, durationMin, autoComplete });
    notify.success('🍅 집중 시작!', {
      duration: 1500,
      description: `${durationMin}분 동안 집중해보세요`,
    });
  };
  return (
    <button
      type="button"
      onClick={handleStart}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 h-7 rounded-md text-[11.5px] font-medium',
        'bg-rose-500 text-white hover:bg-rose-600 transition-colors',
        className,
      )}
      title={`${durationMin}분 포모도로 시작`}
    >
      <span aria-hidden>▶</span>
      <span>{label}</span>
      <span className="font-mono tabular-nums opacity-80">{durationMin}분</span>
    </button>
  );
};

// Coffee 아이콘 미사용 경고 회피용 export (휴식 표시 등 추후 사용 가능).
export const _PomodoroIcons = { Coffee, Check };
