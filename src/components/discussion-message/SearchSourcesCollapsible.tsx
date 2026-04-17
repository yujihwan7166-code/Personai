import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Globe } from 'lucide-react';

export function SearchSourcesCollapsible({ sources }: { sources: { title: string; link: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2 pt-2 border-t border-slate-100">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
      >
        <Globe className="w-3 h-3" />
        <span>참고 자료 ({sources.length})</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1">
          {sources.map((source, index) => (
            <a
              key={index}
              href={source.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] text-blue-500 hover:text-blue-700 truncate"
            >
              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{source.title}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
