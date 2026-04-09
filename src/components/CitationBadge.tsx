import { useState } from 'react';
import type { ApiSourceCitation } from '@/types/expert';
import { cn } from '@/lib/utils';

interface Props {
  citation: ApiSourceCitation;
}

const TYPE_ICONS: Record<string, string> = {
  law_article: '\uD83D\uDCDC',
  precedent: '\u2696\uFE0F',
  drug_info: '\uD83D\uDC8A',
  drug_interaction: '\uD83D\uDC8A',
  economic_indicator: '\uD83D\uDCCA',
  financial_product: '\uD83C\uDFE6',
};

export function CitationBadge({ citation }: Props) {
  const [expanded, setExpanded] = useState(false);
  const icon = TYPE_ICONS[citation.type] || '\uD83D\uDCCE';

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer',
          'bg-slate-800 border border-slate-600/50 hover:border-slate-500 hover:bg-slate-700',
          citation.type.startsWith('law') && 'text-amber-300 hover:text-amber-200',
          citation.type.startsWith('drug') && 'text-emerald-300 hover:text-emerald-200',
          (citation.type.startsWith('economic') || citation.type.startsWith('financial')) && 'text-blue-300 hover:text-blue-200',
        )}
      >
        <span>{icon}</span>
        <span>{citation.label}</span>
      </button>
      {expanded && citation.rawData && (
        <div className="absolute z-50 left-0 top-full mt-1 w-80 max-h-48 overflow-y-auto rounded-xl border border-slate-600/50 bg-slate-900 p-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-300">{icon} {citation.label}</span>
            <span className="text-[8px] text-slate-500">{citation.source}</span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-400 whitespace-pre-wrap">{citation.rawData}</p>
          {citation.url && (
            <a href={citation.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[9px] text-blue-400 hover:underline">
              원문 보기 →
            </a>
          )}
        </div>
      )}
    </span>
  );
}
