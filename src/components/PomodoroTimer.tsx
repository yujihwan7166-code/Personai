import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Timer, Play, Pause, RotateCcw, X, Volume2, VolumeX } from 'lucide-react';

type Phase = 'work' | 'rest';

const WORK_MIN = 45;
const REST_MIN = 15;

function playAlarm() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // 3-tone chime: ascending notes
    [440, 554, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.3);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.3 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.3 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.3);
      osc.stop(now + i * 0.3 + 0.5);
    });

    // Second chime after a short pause
    setTimeout(() => {
      const ctx2 = new AudioContext();
      const t = ctx2.currentTime;
      [659, 554, 440].forEach((freq, i) => {
        const osc = ctx2.createOscillator();
        const gain = ctx2.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t + i * 0.25);
        gain.gain.linearRampToValueAtTime(0.25, t + i * 0.25 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.4);
        osc.connect(gain).connect(ctx2.destination);
        osc.start(t + i * 0.25);
        osc.stop(t + i * 0.25 + 0.4);
      });
    }, 800);
  } catch { /* audio not supported */ }
}

export function PomodoroTimer() {
  const [visible, setVisible] = useState(false);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>('work');
  const [seconds, setSeconds] = useState(WORK_MIN * 60);
  const [soundOn, setSoundOn] = useState(true);
  const [flashing, setFlashing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalCyclesRef = useRef(0);

  const totalSeconds = phase === 'work' ? WORK_MIN * 60 : REST_MIN * 60;
  const progress = 1 - seconds / totalSeconds;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;

  const switchPhase = useCallback((next: Phase) => {
    setPhase(next);
    setSeconds(next === 'work' ? WORK_MIN * 60 : REST_MIN * 60);
    setRunning(true);
    if (next === 'rest') totalCyclesRef.current++;
  }, []);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          // Timer ended
          if (soundOn) playAlarm();
          setFlashing(true);
          setTimeout(() => setFlashing(false), 3000);
          // Auto-switch phase
          const next: Phase = phase === 'work' ? 'rest' : 'work';
          setTimeout(() => switchPhase(next), 1500);
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase, soundOn, switchPhase]);

  const reset = () => {
    setRunning(false);
    setPhase('work');
    setSeconds(WORK_MIN * 60);
    setFlashing(false);
  };

  // Mini fab button when hidden
  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed bottom-5 right-5 z-50 w-11 h-11 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        title="타이머"
      >
        <Timer className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className={cn(
      'fixed bottom-5 right-5 z-50 w-[220px] rounded-2xl shadow-2xl border overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-2 duration-300',
      phase === 'work'
        ? 'bg-slate-900 border-slate-700'
        : 'bg-emerald-900 border-emerald-700',
      flashing && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-white/60" />
          <span className={cn(
            'text-[10px] font-bold uppercase tracking-wider',
            phase === 'work' ? 'text-orange-400' : 'text-emerald-400'
          )}>
            {phase === 'work' ? '집중' : '휴식'}
          </span>
          {totalCyclesRef.current > 0 && (
            <span className="text-[9px] text-white/30 ml-1">#{totalCyclesRef.current}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setSoundOn(!soundOn)} className="p-1 rounded hover:bg-white/10 transition-colors" title={soundOn ? '알람 끄기' : '알람 켜기'}>
            {soundOn
              ? <Volume2 className="w-3 h-3 text-white/50" />
              : <VolumeX className="w-3 h-3 text-white/30" />}
          </button>
          <button onClick={() => setVisible(false)} className="p-1 rounded hover:bg-white/10 transition-colors">
            <X className="w-3 h-3 text-white/50" />
          </button>
        </div>
      </div>

      {/* Timer display */}
      <div className="px-3 pb-1 text-center">
        <div className={cn(
          'text-[40px] font-mono font-bold leading-none tracking-tight tabular-nums',
          phase === 'work' ? 'text-white' : 'text-emerald-100'
        )}>
          {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-3 pb-2.5">
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000 ease-linear',
              phase === 'work' ? 'bg-orange-500' : 'bg-emerald-400'
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-white/30">{phase === 'work' ? `${WORK_MIN}분 집중` : `${REST_MIN}분 휴식`}</span>
          <span className="text-[9px] text-white/30">{Math.round(progress * 100)}%</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 px-3 pb-3">
        <button
          onClick={() => setRunning(!running)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all active:scale-95',
            running
              ? 'bg-white/10 text-white hover:bg-white/15'
              : phase === 'work'
                ? 'bg-orange-500 text-white hover:bg-orange-400'
                : 'bg-emerald-500 text-white hover:bg-emerald-400'
          )}
        >
          {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {running ? '일시정지' : '시작'}
        </button>
        <button
          onClick={reset}
          className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all active:scale-95"
          title="초기화"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
