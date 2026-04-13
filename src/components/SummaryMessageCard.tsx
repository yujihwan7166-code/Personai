import { FileText } from 'lucide-react';
import { LazyMarkdown } from '@/components/LazyMarkdown';

interface SummaryMessageCardProps {
  content: string;
}

export function SummaryMessageCard({ content }: SummaryMessageCardProps) {
  async function handleCopy() {
    if (!navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Ignore clipboard failures and keep the summary readable.
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="overflow-hidden rounded-2xl border border-indigo-200/60 shadow-sm dark:border-indigo-800/40">
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-white/80" />
            <span className="text-[13px] font-bold text-white">대화 요약</span>
          </div>
          <button
            type="button"
            onClick={() => {
              void handleCopy();
            }}
            className="rounded-md px-2.5 py-1 text-[10px] font-medium text-white/60 transition-colors hover:bg-white/15 hover:text-white"
          >
            복사
          </button>
        </div>
        <div className="bg-white px-5 py-4 dark:bg-slate-900">
          <div className="text-[13px] leading-[1.8] text-slate-700 dark:text-slate-300 [&_h2:first-child]:mt-0 [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-[13.5px] [&_h2]:font-bold [&_h2]:text-slate-800 [&_h2]:dark:text-slate-200 [&_h3:first-child]:mt-0 [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-[13.5px] [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:dark:text-slate-200 [&_hr]:my-3 [&_hr]:border-slate-100 [&_li]:text-[12.5px] [&_p]:mb-1 [&_ul]:space-y-1 [&_ul]:pl-4">
            <LazyMarkdown content={content} fallback={<span>{content}</span>} />
          </div>
        </div>
      </div>
    </div>
  );
}
