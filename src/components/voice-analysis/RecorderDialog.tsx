import { useEffect, useRef, useState } from 'react';
import { Mic, Square, X, AlertTriangle, Lock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/types/voiceAnalysis';

type ErrorKind = 'denied' | 'unsupported' | 'other';
interface RecorderError {
  kind: ErrorKind;
  message: string;
}

interface Props {
  remainingSec: number;
  onClose: () => void;
  onComplete: (blob: Blob, durationSec: number) => void;
}

export function RecorderDialog({ remainingSec, onClose, onComplete }: Props) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'finalizing'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<RecorderError | null>(null);
  const [level, setLevel] = useState(0); // 0~1 음량(RMS)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTsRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // Escape 닫기 — 녹음 중에는 무시
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase === 'idle') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, phase]);

  // cleanup
  useEffect(() => {
    return () => {
      if (tickRef.current != null) window.clearInterval(tickRef.current);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* noop */ }
      }
      analyserRef.current?.disconnect();
      audioCtxRef.current?.close().catch(() => { /* noop */ });
    };
  }, []);

  const startLevelMeter = (stream: MediaStream) => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        // RMS
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        // 시각적으로 조금 증폭 + 클램프
        const boosted = Math.min(1, rms * 2.5);
        setLevel(boosted);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* AudioContext 실패해도 녹음 자체는 계속 */
    }
  };

  const stopLevelMeter = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setLevel(0);
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => { /* noop */ });
    audioCtxRef.current = null;
  };

  const start = async () => {
    setError(null);
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError({ kind: 'unsupported', message: '이 브라우저는 녹음을 지원하지 않아요.' });
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startLevelMeter(stream);
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const durationSec = Math.max(1, (Date.now() - startTsRef.current) / 1000);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        stopLevelMeter();
        if (tickRef.current != null) window.clearInterval(tickRef.current);
        setPhase('finalizing');
        // 약간의 지연 후 콜백 (상태 토글 시각적 안정)
        setTimeout(() => onComplete(blob, durationSec), 100);
      };

      startTsRef.current = Date.now();
      setElapsed(0);
      setPhase('recording');
      mr.start();
      tickRef.current = window.setInterval(() => {
        const next = (Date.now() - startTsRef.current) / 1000;
        setElapsed(next);
        // 한도 도달 시 자동 종료
        if (next >= remainingSec) stopInternal();
      }, 250);
    } catch (err) {
      // 권한 거부 vs 일반 오류 분기 — NotAllowedError 가 권한 거부.
      const name = (err as { name?: string } | null)?.name ?? '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError({ kind: 'denied', message: '마이크 권한이 필요해요.' });
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setError({ kind: 'unsupported', message: '사용할 수 있는 마이크가 없어요. 입력 장치를 확인해 주세요.' });
      } else {
        setError({
          kind: 'other',
          message: err instanceof Error ? err.message : '녹음 시작에 실패했어요.',
        });
      }
      setPhase('idle');
    }
  };

  const stopInternal = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      try { mr.stop(); } catch { /* noop */ }
    }
  };

  const stop = () => stopInternal();

  const secLeft = Math.max(0, remainingSec - Math.floor(elapsed));
  const warning = secLeft > 0 && secLeft <= 10 && phase === 'recording';

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={phase === 'idle' ? onClose : undefined}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-[14px] font-bold text-slate-900 dark:text-slate-100">새 녹음</h3>
          {phase === 'idle' && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          {/* 원형 녹음 버튼 + 음량 반응 링 (Apple Voice Memos 패턴) */}
          <div className="relative flex items-center justify-center">
            {phase === 'recording' && (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full bg-red-500/20 motion-reduce:hidden"
                  style={{ transform: `scale(${1 + level * 0.5})`, transition: 'transform 90ms ease-out' }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full bg-red-500/10 motion-reduce:hidden"
                  style={{ transform: `scale(${1 + level * 0.9})`, transition: 'transform 140ms ease-out' }}
                />
              </>
            )}
            <button
              onClick={phase === 'idle' ? start : phase === 'recording' ? stop : undefined}
              disabled={phase === 'finalizing' || remainingSec <= 0}
              className={cn(
                'relative h-20 w-20 rounded-full flex items-center justify-center transition-all',
                phase === 'idle' && 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 hover:scale-105',
                phase === 'recording' && 'bg-red-600 text-white shadow-lg shadow-red-500/30 hover:scale-105',
                phase === 'finalizing' && 'bg-slate-300 text-slate-500 cursor-wait',
                remainingSec <= 0 && 'opacity-50 cursor-not-allowed',
              )}
              aria-label={phase === 'recording' ? '녹음 중지' : '녹음 시작'}
            >
              {phase === 'recording' ? (
                <Square className="h-7 w-7" fill="currentColor" />
              ) : (
                <Mic className="h-7 w-7" />
              )}
            </button>
          </div>

          {/* 레벨 미터 막대 (motion-reduce 폴백 포함) */}
          {phase === 'recording' && (
            <div className="flex items-end gap-1 h-5" aria-hidden="true">
              {[0.15, 0.35, 0.55, 0.75, 0.95].map((threshold, i) => {
                const active = level >= threshold * 0.6; // threshold 스케일 조정
                return (
                  <span
                    key={i}
                    className={cn(
                      'w-1 rounded-full transition-all',
                      active ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-700',
                    )}
                    style={{ height: active ? `${12 + i * 2}px` : `${6 + i}px` }}
                  />
                );
              })}
            </div>
          )}

          {/* 경과 시간 */}
          <div className="text-center">
            <p className="text-[26px] font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {formatDuration(elapsed)}
            </p>
            <p className={cn(
              'text-[11px] mt-0.5 tabular-nums',
              warning ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-400',
            )}>
              {warning ? `⚠ 한도 ${secLeft}초 남음` : `남은 시간 ${formatDuration(secLeft)}`}
            </p>
          </div>

          {/* 안내 */}
          {phase === 'idle' && (
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              버튼을 눌러 녹음을 시작하세요.<br />
              녹음 중에는 탭을 닫지 말아주세요.
            </p>
          )}
          {phase === 'recording' && (
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11.5px] font-semibold">녹음 중</span>
            </div>
          )}
          {phase === 'finalizing' && (
            <p className="text-[11.5px] text-slate-600 dark:text-slate-400">저장 중…</p>
          )}

          {error && error.kind === 'denied' && (
            <div className="w-full rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-amber-800 dark:text-amber-200">마이크 권한이 필요해요</p>
                  <p className="text-[11.5px] text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                    주소창 왼쪽 <span className="font-semibold">🔒 또는 🎙️ 아이콘</span>을 눌러 마이크를 <span className="font-semibold">허용</span>으로 바꿔 주세요.
                    바꾼 뒤 아래 버튼을 눌러 다시 시도할 수 있어요.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={start}
                className="w-full h-8 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                다시 권한 요청
              </button>
            </div>
          )}
          {error && error.kind !== 'denied' && (
            <div className="w-full flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11.5px] text-red-700 dark:text-red-300">{error.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
