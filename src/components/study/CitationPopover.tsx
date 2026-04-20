import { useMemo } from 'react';
import type { StudySource } from '@/types/study';
import { LazyMarkdown } from '@/components/LazyMarkdown';

interface Props {
  text: string;
  sources: StudySource[];
  className?: string;
}

export function CitedMarkdown({ text, sources, className }: Props) {
  const segments = useMemo(() => splitWithCitations(text), [text]);
  if (segments.length === 1 && segments[0].type === 'text') {
    return <LazyMarkdown content={text} className={className} />;
  }
  return (
    <div className={className}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <LazyMarkdown key={i} content={seg.value} />;
        }
        const src = sources[seg.index - 1];
        return <CitationChip key={i} index={seg.index} source={src} />;
      })}
    </div>
  );
}

type Segment = { type: 'text'; value: string } | { type: 'cite'; index: number };

function splitWithCitations(text: string): Segment[] {
  const re = /\[S(\d+)\]/g;
  const out: Segment[] = [];
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ type: 'text', value: text.slice(last, m.index) });
    }
    out.push({ type: 'cite', index: parseInt(m[1], 10) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}

function CitationChip({ index, source }: { index: number; source?: StudySource }) {
  if (!source) {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500 align-middle">
        S{index}
      </span>
    );
  }
  const snippet = source.content.slice(0, 200) + (source.content.length > 200 ? '…' : '');
  return (
    <span className="group relative inline-block align-middle">
      <button
        className="inline-flex items-center rounded-md bg-indigo-100 px-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-200 transition-colors cursor-help"
        aria-label={`인용 ${index}: ${source.title}`}
      >
        S{index}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 w-64 opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-200"
      >
        <span className="block rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-left">
          <span className="block text-[9.5px] font-bold uppercase tracking-wide text-indigo-600 mb-1">
            소스 {index} · {source.title}
          </span>
          <span className="block text-[11px] leading-relaxed text-slate-700">{snippet}</span>
        </span>
      </span>
    </span>
  );
}
