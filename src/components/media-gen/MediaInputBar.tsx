import { useEffect, useImperativeHandle, useRef, useState, forwardRef, useMemo } from 'react';
import {
  Send, Sparkles, Undo2, Mic, Square, Loader2, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import {
  type MediaKind,
  type MediaAspectRatio,
  type ImageStylePreset,
  VIDEO_CLIP_LENGTH_SEC,
  IMAGE_STYLE_LABELS,
} from '@/types/mediaGen';

export interface MediaInputBarHandle {
  /** 외부(샘플 카드·Remix 등)에서 프롬프트만 채우고 싶을 때 호출. */
  prefillPrompt: (prompt: string, opts?: { focus?: boolean }) => void;
  /** 외부 포커스 지시 */
  focus: () => void;
}

interface Props {
  kind: MediaKind;
  style: ImageStylePreset;
  aspectRatio: MediaAspectRatio;
  count: number;
  imagesRemaining: number;
  videoRemaining: number;
  /** 입력바가 제출할 때 내부에서 합쳐진 최종 파라미터 */
  onSubmit: (params: { prompt: string }) => void | Promise<void>;
  /** 최근 프롬프트 (자동완성·pill용) — 최대 5개 */
  recentPrompts: string[];
}

const PLACEHOLDER_IMAGE_EXAMPLES = [
  '예) 우주복 입은 고양이가 달을 바라보는 모습',
  '예) 벚꽃 나무 아래에서 미소 짓는 어린 소녀',
  '예) 네온 도시의 비 오는 밤 거리',
  '예) 미니멀한 카페 로고',
  '예) 해변의 황금빛 석양',
];
const PLACEHOLDER_VIDEO_EXAMPLES = [
  '예) 벚꽃잎이 바람에 흩날리는 장면',
  '예) 푸른 바다 위를 날아가는 드론 샷',
  '예) 모닥불이 타오르는 캠핑 장면',
];

export const MediaInputBar = forwardRef<MediaInputBarHandle, Props>(function MediaInputBar(
  { kind, style, aspectRatio, count, imagesRemaining, videoRemaining, onSubmit, recentPrompts },
  ref,
) {
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 인핸서 상태
  const [enhancing, setEnhancing] = useState(false);
  const [originalPromptForUndo, setOriginalPromptForUndo] = useState<string | null>(null);

  // 음성 녹음 상태
  const [recording, setRecording] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordStartRef = useRef<number>(0);

  // 자동완성
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 플레이스홀더 rotation
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  useEffect(() => {
    if (prompt) return;
    const id = window.setInterval(() => setPlaceholderIdx((i) => i + 1), 4000);
    return () => window.clearInterval(id);
  }, [prompt]);

  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    prefillPrompt: (p, opts) => {
      setPrompt(p);
      if (opts?.focus !== false) setTimeout(() => inputRef.current?.focus(), 50);
    },
    focus: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      recordStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* noop */ }
      }
    };
  }, []);

  const canImage = imagesRemaining >= count;
  const canVideo = videoRemaining >= VIDEO_CLIP_LENGTH_SEC;
  const currentDisabled = kind === 'image' ? !canImage : !canVideo;

  const placeholder = kind === 'image'
    ? PLACEHOLDER_IMAGE_EXAMPLES[placeholderIdx % PLACEHOLDER_IMAGE_EXAMPLES.length]
    : PLACEHOLDER_VIDEO_EXAMPLES[placeholderIdx % PLACEHOLDER_VIDEO_EXAMPLES.length];

  // 입력어에 따라 자동완성 후보 필터링
  const suggestions = useMemo(() => {
    const q = prompt.trim().toLowerCase();
    if (!q) return recentPrompts.slice(0, 5);
    return recentPrompts
      .filter((p) => p.toLowerCase().includes(q) && p !== prompt)
      .slice(0, 5);
  }, [prompt, recentPrompts]);

  const handleSubmit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || submitting || currentDisabled) return;
    setSubmitting(true);
    setShowSuggestions(false);
    try {
      await onSubmit({ prompt: trimmed });
      setPrompt('');
      setOriginalPromptForUndo(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnhance = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || enhancing) return;
    setEnhancing(true);
    try {
      const r = await fetch('/api/media-enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          kind,
          style: kind === 'image' && style !== 'none' ? IMAGE_STYLE_LABELS[style].label : undefined,
        }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        original?: string; enhanced?: string; error?: string;
      };
      if (!r.ok || !data.enhanced) {
        throw new Error(data.error || '프롬프트 개선에 실패했어요.');
      }
      setOriginalPromptForUndo(trimmed);
      setPrompt(data.enhanced);
      notify.success('프롬프트 다듬어졌어요', {
        description: '더 풍부한 결과를 기대하세요.',
        duration: 4000,
      });
    } catch (err) {
      notify.error('프롬프트 개선 실패', {
        description: err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setEnhancing(false);
    }
  };

  const handleUndoEnhance = () => {
    if (!originalPromptForUndo) return;
    setPrompt(originalPromptForUndo);
    setOriginalPromptForUndo(null);
  };

  const startRecord = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('이 브라우저는 녹음을 지원하지 않아요.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      recordChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(recordChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        recordStreamRef.current?.getTracks().forEach((t) => t.stop());
        recordStreamRef.current = null;
        if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);

        if (blob.size < 500) {
          setRecording('idle');
          return;
        }
        setRecording('transcribing');
        try {
          const buffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          const chunk = 0x8000;
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
          }
          const audioBase64 = btoa(binary);
          const r = await fetch('/api/voice-transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64, mimeType: blob.type || 'audio/webm' }),
          });
          const data = (await r.json().catch(() => ({}))) as { text?: string; error?: string };
          if (!r.ok) throw new Error(data.error || '전사에 실패했어요.');
          const text = (data.text || '').trim();
          if (!text) {
            notify.info('음성이 감지되지 않았어요', {
              description: '마이크 가까이에서 또박또박 말해주세요.',
            });
          } else {
            setPrompt((prev) => (prev ? `${prev} ${text}` : text));
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        } catch (err) {
          notify.error('전사 실패', {
            description: err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.',
          });
        } finally {
          setRecording('idle');
        }
      };

      recordStartRef.current = Date.now();
      setRecordSeconds(0);
      setRecording('recording');
      mr.start();
      recordTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordStartRef.current) / 1000);
        setRecordSeconds(elapsed);
        if (elapsed >= 60) stopRecord();
      }, 250);
    } catch (err) {
      notify.error('녹음 시작 실패', {
        description: err instanceof Error ? err.message : '마이크 권한을 확인해주세요.',
      });
      setRecording('idle');
    }
  };

  const stopRecord = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      try { mr.stop(); } catch { /* noop */ }
    }
  };

  const toggleRecord = () => {
    if (recording === 'idle') startRecord();
    else if (recording === 'recording') stopRecord();
  };

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-3 bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur-sm">
      {/* 최근 프롬프트 pill (비어있을 때만 노출) */}
      {!prompt && recentPrompts.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
          <Clock className="h-3 w-3 text-slate-400 shrink-0" strokeWidth={1.75} />
          <span className="text-[10px] text-slate-400 shrink-0">최근:</span>
          {recentPrompts.slice(0, 5).map((p, i) => (
            <button
              key={i}
              onClick={() => { setPrompt(p); setTimeout(() => inputRef.current?.focus(), 20); }}
              className="shrink-0 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-[10.5px] text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 transition-colors max-w-[180px] truncate"
              title={p}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* 원문 복원 */}
      {originalPromptForUndo && (
        <div className="flex items-center justify-end mb-1.5">
          <button
            onClick={handleUndoEnhance}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10.5px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="다듬기 전 원문으로 되돌리기"
          >
            <Undo2 className="h-3 w-3" /> 원문 복원
          </button>
        </div>
      )}

      {/* 입력 + 액션 */}
      <div className="relative flex items-center gap-2">
        <button
          onClick={toggleRecord}
          disabled={recording === 'transcribing' || currentDisabled}
          className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors',
            recording === 'recording'
              ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
              : recording === 'transcribing'
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              : 'border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          title={
            recording === 'recording'
              ? '녹음 중지 (60초까지)'
              : recording === 'transcribing'
              ? '전사 중…'
              : '음성으로 프롬프트 받아쓰기'
          }
          aria-label={recording === 'recording' ? '녹음 중지' : '음성으로 프롬프트 입력'}
        >
          {recording === 'transcribing' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : recording === 'recording' ? (
            <Square className="h-3.5 w-3.5" fill="currentColor" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>

        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }}
            placeholder={recording === 'recording' ? `녹음 중… ${recordSeconds}s` : placeholder}
            disabled={currentDisabled || submitting || recording !== 'idle'}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-[13px] outline-none focus:border-indigo-400 dark:focus:border-indigo-500 disabled:opacity-60"
          />

          {/* 자동완성 드롭다운 */}
          {showSuggestions && prompt.trim() && suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-20">
              <p className="px-3 py-1 text-[9.5px] uppercase tracking-wider font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                비슷한 최근 프롬프트
              </p>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setPrompt(s); setShowSuggestions(false); setTimeout(() => inputRef.current?.focus(), 20); }}
                  className="w-full text-left px-3 py-1.5 text-[11.5px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 truncate"
                  title={s}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleEnhance}
          disabled={!prompt.trim() || enhancing || submitting}
          className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors border',
            enhancing
              ? 'bg-indigo-500 text-white border-indigo-500'
              : 'border-slate-200 dark:border-slate-700 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
          title="프롬프트를 AI가 다듬기"
          aria-label="프롬프트 다듬기"
        >
          {enhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </button>

        <GenerateButton
          onClick={handleSubmit}
          disabled={!prompt.trim() || submitting || currentDisabled}
          submitting={submitting}
          kind={kind}
        />
      </div>

      {/* 요약 상태 라인 */}
      <div className="flex items-center gap-1.5 mt-1.5 text-[10.5px] text-slate-500 dark:text-slate-400">
        <span className="tabular-nums">
          {kind === 'image'
            ? `${count}장 · ${aspectRatio} · 스타일: ${IMAGE_STYLE_LABELS[style].label}`
            : `${VIDEO_CLIP_LENGTH_SEC}초 · ${aspectRatio}`}
        </span>
        {currentDisabled && (
          <span className="text-red-600 dark:text-red-400 font-medium ml-auto">
            {kind === 'image'
              ? `이미지 한도 부족 (${count}장 필요, 남은 ${imagesRemaining}장)`
              : `동영상 한도 부족 (${VIDEO_CLIP_LENGTH_SEC}초 필요, 남은 ${videoRemaining}초)`}
          </span>
        )}
        <span className="flex-1" />
        <span className="text-slate-400">
          <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1 py-px text-[9px]">Enter</kbd>로 생성
        </span>
      </div>
    </div>
  );
});

/* ──────────────────────────────────────────────────────────────
 * 생성 버튼 — 클릭 시 버튼 자체가 progress bar로 변신 (MJ Web 패턴).
 * 실제 진행률 API가 없으므로 submitting 중엔 shimmer 애니메이션으로 체감 속도 보조.
 * ──────────────────────────────────────────────────────────── */
function GenerateButton({
  onClick, disabled, submitting, kind,
}: {
  onClick: () => void;
  disabled: boolean;
  submitting: boolean;
  kind: MediaKind;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative overflow-hidden rounded-lg px-4 py-2.5 text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-all shrink-0 min-w-[90px] justify-center',
        kind === 'image'
          ? 'bg-indigo-500 text-white hover:bg-indigo-600'
          : 'bg-pink-500 text-white hover:bg-pink-600',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        submitting && 'cursor-wait',
      )}
      aria-label={submitting ? '생성 중' : '생성'}
    >
      {/* 진행 중 shimmer 오버레이 */}
      {submitting && (
        <span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer"
          aria-hidden
          style={{ backgroundSize: '200% 100%' }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {submitting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            생성 중…
          </>
        ) : (
          <>
            <Send className="h-3.5 w-3.5" />
            생성
          </>
        )}
      </span>
    </button>
  );
}
