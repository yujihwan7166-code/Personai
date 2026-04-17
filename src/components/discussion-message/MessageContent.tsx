import { useState } from 'react';
import { LazyMarkdown } from '@/components/LazyMarkdown';
import { AgentRichMarkdown } from '@/components/AgentRichMarkdown';
import { ChevronDown, ChevronUp } from 'lucide-react';

const COLLAPSE_THRESHOLD = 300;

function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1.5">
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-300" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-300" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-300" />
    </div>
  );
}

function StreamingCursor() {
  return <span className="inline-block w-0.5 h-3.5 bg-primary/40 ml-0.5 cursor-blink rounded-full" />;
}

export function MessageContent({
  content,
  isStreaming,
  noCollapse,
  renderer = 'default',
}: {
  content: string;
  isStreaming?: boolean;
  noCollapse?: boolean;
  renderer?: 'default' | 'agent-rich';
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = !noCollapse && content.length > COLLAPSE_THRESHOLD && !isStreaming;
  const isError = content.startsWith('⚠️');

  if (content) {
    if (isError) {
      return (
        <div className="flex items-center gap-2 py-1 text-[12px] text-red-500">
          <span>{content}</span>
          <span className="text-[10px] text-slate-400">· 질문을 다시 입력해보세요</span>
        </div>
      );
    }

    const displayContent = isLong && !expanded ? content.slice(0, COLLAPSE_THRESHOLD) + '...' : content;
    return (
      <>
        {renderer === 'agent-rich' && !isStreaming ? (
          <AgentRichMarkdown content={displayContent} />
        ) : (
          <LazyMarkdown content={displayContent} />
        )}
        {isStreaming && <StreamingCursor />}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-2 text-[11px] font-medium text-primary/70 hover:text-primary transition-colors"
          >
            {expanded ? <><ChevronUp className="w-3 h-3" /> 접기</> : <><ChevronDown className="w-3 h-3" /> 더 보기</>}
          </button>
        )}
      </>
    );
  }

  if (isStreaming) return <StreamingIndicator />;
  return null;
}
