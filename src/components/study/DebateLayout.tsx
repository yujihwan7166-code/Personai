import type { Expert } from '@/types/expert';
import { LazyMarkdown } from '@/components/LazyMarkdown';
import { cn } from '@/lib/utils';

interface Props {
  content: string;
  expertA?: Expert;
  expertB?: Expert;
}

interface DebateTurn {
  speaker: 'A' | 'B' | 'none';
  text: string;
}

export function DebateLayout({ content, expertA, expertB }: Props) {
  const { turns, closing } = parseDebate(content, expertA, expertB);

  if (turns.length === 0) {
    return <LazyMarkdown content={content} />;
  }

  return (
    <div className="space-y-3">
      {expertA && expertB && (
        <div className="flex items-center justify-center gap-2 pb-2 border-b border-slate-100">
          <SpeakerBadge expert={expertA} side="A" />
          <span className="text-[10.5px] font-bold text-slate-400">VS</span>
          <SpeakerBadge expert={expertB} side="B" />
        </div>
      )}

      {turns.map((t, i) => {
        if (t.speaker === 'none') {
          return (
            <div key={i} className="text-[11.5px] text-slate-500 italic">
              <LazyMarkdown content={t.text} />
            </div>
          );
        }
        const expert = t.speaker === 'A' ? expertA : expertB;
        const tint = t.speaker === 'A' ? 'indigo' : 'rose';
        return <DebateTurnBubble key={i} turn={t} expert={expert} tint={tint} />;
      })}

      {closing && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <LazyMarkdown content={closing} />
        </div>
      )}
    </div>
  );
}

function SpeakerBadge({ expert, side }: { expert: Expert; side: 'A' | 'B' }) {
  const ring = side === 'A' ? 'ring-indigo-200 bg-indigo-50' : 'ring-rose-200 bg-rose-50';
  const text = side === 'A' ? 'text-indigo-700' : 'text-rose-700';
  return (
    <div className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1', ring)}>
      <span className="text-sm">{expert.icon}</span>
      <span className={cn('text-[11px] font-bold', text)}>{expert.nameKo || expert.name}</span>
    </div>
  );
}

function DebateTurnBubble({
  turn,
  expert,
  tint,
}: {
  turn: DebateTurn;
  expert?: Expert;
  tint: 'indigo' | 'rose';
}) {
  const isA = turn.speaker === 'A';
  const bg = tint === 'indigo' ? 'bg-indigo-50/60' : 'bg-rose-50/60';
  const border = tint === 'indigo' ? 'border-indigo-200' : 'border-rose-200';
  const nameClr = tint === 'indigo' ? 'text-indigo-700' : 'text-rose-700';

  return (
    <div className={cn('flex gap-2', isA ? 'justify-start' : 'justify-end')}>
      {isA && expert && <Avatar expert={expert} />}
      <div className={cn('flex-1 max-w-[85%] rounded-2xl border p-3', bg, border, isA ? 'rounded-tl-sm' : 'rounded-tr-sm')}>
        {expert && (
          <p className={cn('text-[10.5px] font-bold mb-1', nameClr)}>
            {expert.nameKo || expert.name}
          </p>
        )}
        <div className="text-[12.5px] leading-relaxed text-slate-800 prose prose-sm max-w-none">
          <LazyMarkdown content={turn.text} />
        </div>
      </div>
      {!isA && expert && <Avatar expert={expert} />}
    </div>
  );
}

function Avatar({ expert }: { expert: Expert }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-lg shrink-0">
      {expert.icon}
    </div>
  );
}

function parseDebate(
  content: string,
  expertA?: Expert,
  expertB?: Expert,
): { turns: DebateTurn[]; closing?: string } {
  const nameA = (expertA?.nameKo || expertA?.name || '').trim();
  const nameB = (expertB?.nameKo || expertB?.name || '').trim();

  // Split by "## " for closing section
  const closingMatch = content.match(/\n##\s+[^\n]*학습\s*포인트[\s\S]*$/);
  const body = closingMatch ? content.slice(0, closingMatch.index) : content;
  const closing = closingMatch ? closingMatch[0].replace(/^\n##\s+/, '## ') : undefined;

  // Match **Name:** blocks
  const blockRe = /\*\*([^*:]+):\*\*\s*([\s\S]*?)(?=\n\s*\*\*[^*:]+:\*\*|\n##\s|$)/g;
  const turns: DebateTurn[] = [];
  let m;
  while ((m = blockRe.exec(body)) !== null) {
    const speakerName = m[1].trim();
    const text = m[2].trim();
    if (!text) continue;
    let speaker: 'A' | 'B' | 'none' = 'none';
    if (nameA && speakerName.includes(nameA)) speaker = 'A';
    else if (nameB && speakerName.includes(nameB)) speaker = 'B';
    else if (turns.length === 0) speaker = 'A';
    else speaker = turns[turns.length - 1].speaker === 'A' ? 'B' : 'A';
    turns.push({ speaker, text });
  }

  return { turns, closing };
}
