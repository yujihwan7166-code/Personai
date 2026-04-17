import type { DiscussionMessage } from '@/types/expert';

export function ResponseProgressBanner({ message }: { message: DiscussionMessage }) {
  if (message.agentState) return null;
  if (!message.isStreaming) return null;

  const label = message.progressLabel || '응답을 준비하고 있어요';
  if (!label) return null;

  return (
    <div className="mb-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <span className="relative mt-0.5 flex h-3.5 w-3.5 items-center justify-center">
          <span className="absolute h-3 w-3 rounded-full bg-primary/15 animate-ping" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-slate-700">{label}</div>
          {message.progressDetail && (
            <div className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{message.progressDetail}</div>
          )}
        </div>
      </div>
    </div>
  );
}
