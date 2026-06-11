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
import { Pause, Play, X, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  pomodoroStore,
  type PomodoroSession,
  PLANNER_POMODORO_CHANGED,
} from '@/services/planner/pomodoroStore';
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
  const phase = session.phase ?? 'work';
  const isBreak = phase !== 'work';
  const cfg = pomodoroStore.getConfig();
  const phaseLabel = phase === 'work' ? '집중' : phase === 'long-break' ? '긴 휴식' : '휴식';
  // chain 도트 — 현재 cycle 안 work 진행.
  // setIndex 가 long break 직후면 cfg.setsBeforeLong 인데, 다음 work 는 1번째라 mod.
  const setInCycle = session.setIndex ? ((session.setIndex - 1) % cfg.setsBeforeLong) + 1 : 0;

  const handleComplete = (s: PomodoroSession) => {
    const cfg = pomodoroStore.getConfig();
    const phase = s.phase ?? 'work';

    // work 세션 — task 자동 완료.
    if (phase === 'work') {
      if (s.autoComplete && s.taskInstanceId) {
        taskStore.toggleDone(s.taskInstanceId);
      } else if (s.autoComplete && s.taskId) {
        taskStore.toggleDone(s.taskId);
      }
    }

    // 브라우저 알림.
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const title =
          phase === 'work' ? '🍅 집중 완료'
          : phase === 'long-break' ? '☕ 긴 휴식 끝'
          : '☕ 휴식 끝';
        new Notification(title, {
          body: s.taskTitle ?? `${s.durationMin}분 끝!`,
          tag: 'planner-pomodoro',
        });
      } catch {
        /* silent */
      }
    }

    // ─── Chain 자동 진행 ───
    if (phase === 'work') {
      const next = pomodoroStore.nextPhaseAfterWork(s.setIndex ?? 1);
      if (cfg.autoStartBreak) {
        // 자동 휴식 시작.
        pomodoroStore.start({
          durationMin: next.durationMin,
          autoComplete: false,
          phase: next.phase,
          setIndex: next.setIndex,
        });
        notify.success(
          next.phase === 'long-break' ? '☕ 긴 휴식 시작' : '☕ 휴식 시작',
          {
            duration: 2000,
            description: `${next.durationMin}분 — ${next.phase === 'long-break' ? '4세트 완료, 푹 쉬세요' : '잠깐 쉬어가요'}`,
          },
        );
      } else {
        // 수동 — toast CTA.
        notify.success('🍅 집중 완료!', {
          duration: 6000,
          description: s.taskTitle ?? `${s.durationMin}분 집중 끝!`,
          action: {
            label: `${next.durationMin}분 ${next.phase === 'long-break' ? '긴 휴식' : '휴식'} 시작`,
            onClick: () => pomodoroStore.start({
              durationMin: next.durationMin,
              autoComplete: false,
              phase: next.phase,
              setIndex: next.setIndex,
            }),
          },
        });
      }
    } else {
      // 휴식 끝 — autoStartNext 면 자동 work 재개.
      if (cfg.autoStartNext) {
        pomodoroStore.start({
          durationMin: cfg.workMin,
          autoComplete: false,
          phase: 'work',
          taskId: s.taskId,
          taskInstanceId: s.taskInstanceId,
          taskTitle: s.taskTitle,
          setIndex: (s.setIndex ?? 0) + 1,
        });
        notify.success('🍅 다음 집중 시작', { duration: 1500 });
      } else {
        notify.success(
          phase === 'long-break' ? '☕ 긴 휴식 끝' : '☕ 휴식 끝',
          {
            duration: 5000,
            action: {
              label: `${cfg.workMin}분 집중 시작`,
              onClick: () => pomodoroStore.start({
                durationMin: cfg.workMin,
                autoComplete: false,
                phase: 'work',
                taskId: s.taskId,
                taskInstanceId: s.taskInstanceId,
                taskTitle: s.taskTitle,
                setIndex: (s.setIndex ?? 0) + 1,
              }),
            },
          },
        );
      }
    }
  };

  // 진행률 ring (SVG circle).
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // phase 색 — work=emerald (또는 임박 rose), short-break=cyan, long-break=violet.
  const ringColor = isBreak
    ? phase === 'long-break' ? 'hsl(270 50% 55%)' : 'hsl(195 60% 50%)'
    : remaining < 60_000 ? 'hsl(0 75% 55%)' : 'hsl(140 50% 45%)';

  const containerBorder = isPaused
    ? 'border-amber-300 bg-amber-50/90'
    : isBreak
      ? phase === 'long-break'
        ? 'border-violet-300 bg-violet-50/90'
        : 'border-cyan-300 bg-cyan-50/90'
      : remaining < 60_000
        ? 'border-rose-300 bg-rose-50/90'
        : 'border-foreground/20';

  return (
    <div
      role="region"
      aria-label={`포모도로 ${phaseLabel} 타이머, ${formatMmss(remaining)} 남음${isPaused ? ', 일시정지됨' : ''}${session.taskTitle ? `, ${session.taskTitle}` : ''}`}
      className={cn(
        'fixed top-3 right-3 z-50 inline-flex items-center gap-2 px-2.5 py-1.5',
        'rounded-full shadow-lg border bg-card',
        'transition-all',
        containerBorder,
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
            stroke={ringColor}
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
      {/* phase 라벨 + chain 도트 + task 제목 */}
      <div className="flex flex-col gap-0.5 max-w-[200px]">
        {isBreak ? (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-mono uppercase tracking-wide font-semibold text-muted-foreground">
            <Coffee className="h-3 w-3" />
            {phaseLabel}
          </span>
        ) : (
          session.setIndex && session.setIndex > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px]">
              {Array.from({ length: cfg.setsBeforeLong }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    i < setInCycle ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                  )}
                  aria-hidden
                />
              ))}
              <span className="ml-1 font-mono text-muted-foreground tabular-nums">
                {setInCycle}/{cfg.setsBeforeLong}
              </span>
            </span>
          )
        )}
        {session.taskTitle && (
          <span className="text-[12px] font-medium text-foreground truncate">
            {session.taskTitle}
          </span>
        )}
      </div>
      <div className="flex items-center gap-0.5 ml-1">
        <button
          type="button"
          onClick={() => pomodoroStore.togglePause()}
          aria-label={isPaused ? '포모도로 재개' : '포모도로 일시정지'}
          title={isPaused ? '포모도로 재개' : '포모도로 일시정지'}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
        </button>
        <button
          type="button"
          onClick={() => {
            // 절반 이상 진행됐으면(>= 50%) confirm — 실수 클릭으로 세션 손실 방지.
            // 짧게 지난 세션은 그냥 중단해도 사용자 손실 미미.
            const elapsedMs = (session?.durationMin ?? 0) * 60_000 - remaining;
            const totalMs = (session?.durationMin ?? 0) * 60_000;
            const progressed = totalMs > 0 && elapsedMs / totalMs >= 0.5;
            if (progressed) {
              const ok = window.confirm('포모도로 진행 중이에요. 정말 중단할까요?');
              if (!ok) return;
            }
            pomodoroStore.stop();
            notify.info('포모도로 중단됨', { duration: 1200 });
          }}
          aria-label="포모도로 중단"
          title="포모도로 중단"
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
    pomodoroStore.start({ durationMin, autoComplete: false, phase: 'work', setIndex: 1 });
    notify.success(`🍅 ${durationMin}분 집중 시작!`, { duration: 1200 });
    setOpen(false);
  };
  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2 h-7 rounded-md text-[11.5px] font-medium border border-foreground/20 hover:bg-accent transition-colors text-foreground"
        title="자유 포모도로 시작"
        aria-label="자유 포모도로 시간 선택"
        aria-haspopup="menu"
        aria-expanded={open}
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
          <div
            className="absolute top-full right-0 mt-1 z-50 min-w-[140px] rounded-md border border-foreground/20 bg-card shadow-lg overflow-hidden"
            role="menu"
            aria-label="포모도로 시간 선택"
          >
            {[15, 25, 45, 60, 90].map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => handleStart(min)}
                className="w-full px-3 py-2 text-left text-[12px] hover:bg-accent transition-colors flex items-center justify-between"
                role="menuitem"
                aria-label={`${min}분 집중 시작${min === 25 ? ', 기본' : ''}`}
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
    pomodoroStore.start({
      taskId, taskInstanceId, taskTitle, durationMin, autoComplete,
      phase: 'work', setIndex: 1,
    });
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
      aria-label={`${taskTitle ? `${taskTitle} ` : ''}${durationMin}분 포모도로 집중 시작`}
    >
      <span aria-hidden>▶</span>
      <span>{label}</span>
      <span className="font-mono tabular-nums opacity-80">{durationMin}분</span>
    </button>
  );
};
