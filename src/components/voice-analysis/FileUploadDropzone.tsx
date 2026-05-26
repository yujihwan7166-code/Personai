import { useRef, useState, useEffect } from 'react';
import { Upload, X, AlertTriangle, FileAudio, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  VOICE_ACCEPT_TYPES,
  WHISPER_FILE_LIMIT,
} from '@/types/voiceAnalysis';

interface Props {
  onClose: () => void;
  onAccept: (blob: Blob, durationSec: number, name: string) => void;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

/** HTMLAudioElement 로 파일의 duration(초) 측정. 실패 시 null. */
function getAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
    };
    a.preload = 'metadata';
    a.src = url;
    a.onloadedmetadata = () => {
      const d = a.duration;
      cleanup();
      resolve(Number.isFinite(d) && d > 0 ? d : null);
    };
    a.onerror = () => {
      cleanup();
      resolve(null);
    };
    // 10초 안에 응답 없으면 포기
    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 10000);
  });
}

export function FileUploadDropzone({ onClose, onAccept }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handlePick = async (f: File) => {
    setError(null);
    setFile(null);
    setDuration(null);

    // 용량 체크 — Whisper 25MB 상한
    if (f.size > WHISPER_FILE_LIMIT) {
      setError(`파일이 너무 커요. ${fmtBytes(WHISPER_FILE_LIMIT)} 이하만 가능해요.`);
      return;
    }

    setFile(f);
    setMeasuring(true);
    const d = await getAudioDuration(f);
    setMeasuring(false);
    if (d === null) {
      setError('오디오 파일이 아니거나 길이를 읽지 못했어요.');
      setFile(null);
      return;
    }
    setDuration(d);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handlePick(f);
  };

  const canSubmit = file !== null && duration !== null && !error && !measuring;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-[14px] font-bold text-slate-900 dark:text-slate-100">오디오 파일 업로드</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept={VOICE_ACCEPT_TYPES}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePick(f); }}
            className="hidden"
          />

          {!file ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={cn(
                'w-full rounded-xl border border-dashed px-4 py-8 flex flex-col items-center justify-center gap-1.5 transition-colors',
                isDragging
                  ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-500/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600',
              )}
            >
              <Upload className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
              <p className="text-[12.5px] text-slate-700 dark:text-slate-200 font-medium">
                드래그하거나 <span className="text-indigo-600 dark:text-indigo-300">클릭해서 선택</span>
              </p>
              <p className="text-[10.5px] text-slate-400">mp3 · m4a · wav · webm · 최대 {fmtBytes(WHISPER_FILE_LIMIT)}</p>
            </button>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 flex items-center gap-2.5">
              <FileAudio className="h-4 w-4 text-slate-500 shrink-0" strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200 truncate" title={file.name}>{file.name}</p>
                <p className="text-[10.5px] text-slate-400 tabular-nums">
                  {fmtBytes(file.size)}
                  {measuring && ' · 길이 확인 중…'}
                  {duration !== null && ` · 분석 가능`}
                </p>
              </div>
              <button
                onClick={() => { setFile(null); setDuration(null); setError(null); }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
                aria-label="선택 해제"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11.5px] text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            취소
          </button>
          <button
            onClick={() => {
              if (!file || duration === null) return;
              onAccept(file, duration, file.name.replace(/\.[^.]+$/, ''));
            }}
            disabled={!canSubmit}
            className="rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-[12px] font-semibold hover:bg-slate-800 dark:hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {measuring && <Loader2 className="h-3 w-3 animate-spin" />}
            분석 시작
          </button>
        </div>
      </div>
    </div>
  );
}
