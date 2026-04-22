import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  formatDuration,
  VOICE_STATUS_LABEL,
  type VoiceRecording,
} from '@/types/voiceAnalysis';

interface Props {
  recording: VoiceRecording;
  selected: boolean;
  onSelect: () => void;
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  const date = new Date(ms);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function RecordingListItem({ recording, selected, onSelect }: Props) {
  const busy = recording.status === 'transcribing' || recording.status === 'analyzing' || recording.status === 'uploading';
  const isError = recording.status === 'error';
  const isReady = recording.status === 'ready';

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left px-3 py-2.5 border-l-2 transition-colors flex flex-col gap-0.5',
        selected
          ? 'bg-slate-100 dark:bg-slate-900 border-slate-900 dark:border-slate-100'
          : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-900/50',
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        <p className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100 truncate flex-1 leading-snug">
          {recording.title || '제목 없음'}
        </p>
        <span className="text-[10px] text-slate-400 tabular-nums shrink-0 pt-0.5">
          {formatRelative(recording.createdAt)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[10.5px] text-slate-500 dark:text-slate-400">
        <span className="tabular-nums">{formatDuration(recording.durationSec)}</span>
        {busy && (
          <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            {VOICE_STATUS_LABEL[recording.status]}
          </span>
        )}
        {isError && (
          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
            <AlertCircle className="h-2.5 w-2.5" />
            오류
          </span>
        )}
        {isReady && recording.summary && (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-2.5 w-2.5" />
            완료
          </span>
        )}
      </div>
      {isReady && recording.summary && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
          {recording.summary}
        </p>
      )}
    </button>
  );
}
