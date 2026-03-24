import { useState } from 'react';
import { DiscussionMessage as DiscussionMessageType, Expert, ROUND_LABELS } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, ThumbsUp, ThumbsDown, MessageSquareReply, ChevronDown, ChevronUp } from 'lucide-react';

export type ChatVariant = 'default' | 'messenger' | 'procon-pro' | 'procon-con' | 'postit' | 'hearing' | 'report';

interface Props {
  message: DiscussionMessageType;
  expert: Expert;
  variant?: ChatVariant;
  onRebuttal?: (expertId: string, content: string, userRebuttal: string) => void;
  onLike?: (messageId: string) => void;
  onDislike?: (messageId: string) => void;
}

const proseClasses = `prose prose-sm max-w-none
  prose-p:my-1.5 prose-p:leading-relaxed prose-p:text-[12.5px]
  prose-headings:text-slate-800 prose-headings:font-semibold prose-headings:tracking-tight
  prose-headings:mt-3 prose-headings:mb-1.5
  prose-h2:text-[14px] prose-h3:text-[13px] prose-h4:text-[12.5px]
  prose-strong:text-slate-700 prose-strong:font-semibold
  prose-ul:my-1.5 prose-li:my-0.5 prose-li:text-[12.5px]
  prose-ol:my-1.5
  prose-blockquote:border-l-2 prose-blockquote:border-primary/20 prose-blockquote:text-slate-500 prose-blockquote:text-[12px] prose-blockquote:py-0.5 prose-blockquote:my-2
  prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[11px] prose-code:text-slate-600 prose-code:before:content-none prose-code:after:content-none
  prose-pre:bg-slate-900 prose-pre:rounded-lg prose-pre:text-[11px] prose-pre:my-2
  prose-table:text-[11px] prose-table:my-2 prose-th:bg-slate-50 prose-th:px-2.5 prose-th:py-1.5 prose-th:text-left prose-th:font-semibold prose-th:text-slate-600 prose-td:px-2.5 prose-td:py-1.5 prose-td:border-t prose-td:border-slate-100
  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
  prose-img:rounded-lg prose-img:my-2`;

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

const COLLAPSE_THRESHOLD = 300; // ~9-10줄

function MessageContent({ content, isStreaming, noCollapse }: { content: string; isStreaming?: boolean; noCollapse?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = !noCollapse && content.length > COLLAPSE_THRESHOLD && !isStreaming;

  if (content) {
    const displayContent = isLong && !expanded ? content.slice(0, COLLAPSE_THRESHOLD) + '...' : content;
    return (
      <>
        <ReactMarkdown>{displayContent}</ReactMarkdown>
        {isStreaming && <StreamingCursor />}
        {isLong && (
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-2 text-[11px] font-medium text-primary/70 hover:text-primary transition-colors">
            {expanded ? <><ChevronUp className="w-3 h-3" /> 접기</> : <><ChevronDown className="w-3 h-3" /> 더 보기</>}
          </button>
        )}
      </>
    );
  }
  if (isStreaming) return <StreamingIndicator />;
  return null;
}

export function DiscussionMessageCard({ message, expert, variant = 'default', onRebuttal, onLike, onDislike }: Props) {
  const [copied, setCopied] = useState(false);
  const [showRebuttal, setShowRebuttal] = useState(false);
  const [rebuttalText, setRebuttalText] = useState('');
  const isSummary = message.isSummary;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRebuttalSubmit = () => {
    if (rebuttalText.trim() && onRebuttal) {
      onRebuttal(expert.id, message.content, rebuttalText.trim());
      setRebuttalText('');
      setShowRebuttal(false);
    }
  };

  const CopyBtn = ({ className: cls }: { className?: string }) => (
    <button onClick={handleCopy} className={cn('p-1 rounded transition-all', cls)}>
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );

  // ── Messenger (단일 AI) ──
  if (variant === 'messenger') {
    return (
      <div className="group flex gap-2.5 items-start animate-in fade-in slide-in-from-bottom-1 duration-200">
        <ExpertAvatar expert={expert} size="sm" active={message.isStreaming} />
        <div className="flex-1 min-w-0 max-w-[85%]">
          <span className="text-[11px] font-medium text-slate-400 mb-0.5 block">{expert.nameKo}</span>
          <div className="bg-white border border-slate-100 border-l-[4px] border-l-indigo-400 rounded-2xl rounded-tl-md px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className={cn('text-[12.5px] leading-relaxed text-slate-600', proseClasses)}>
              <MessageContent content={message.content} isStreaming={message.isStreaming} noCollapse />
            </div>
            {!message.isStreaming && message.content && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 mt-2 pt-2 border-t border-slate-100">
                <CopyBtn className="text-slate-300 hover:text-slate-500" />
              </div>
            )}
          </div>
          {showRebuttal && <RebuttalInput expert={expert} value={rebuttalText} onChange={setRebuttalText} onSubmit={handleRebuttalSubmit} />}
        </div>
      </div>
    );
  }

  // ── Postit (브레인스토밍) ──
  if (variant === 'postit') {
    const colors = ['bg-amber-50/80 border-amber-200/60', 'bg-emerald-50/80 border-emerald-200/60', 'bg-sky-50/80 border-sky-200/60', 'bg-violet-50/80 border-violet-200/60', 'bg-rose-50/80 border-rose-200/60'];
    const colorIdx = expert.name.charCodeAt(0) % colors.length;
    return (
      <div className={cn('group rounded-xl border p-3.5 animate-in fade-in zoom-in-95 duration-200 hover:shadow-md transition-shadow', colors[colorIdx])}>
        <div className="flex items-center gap-1.5 mb-2">
          <ExpertAvatar expert={expert} size="sm" active={message.isStreaming} />
          <span className="text-[11px] font-semibold text-slate-600">{expert.nameKo}</span>
          {!message.isStreaming && message.content && <CopyBtn className="ml-auto opacity-0 group-hover:opacity-100 sm:opacity-30 sm:group-hover:opacity-100 text-slate-300 hover:text-slate-500" />}
        </div>
        <div className={cn('text-[12px] leading-relaxed text-slate-600', proseClasses)}>
          <MessageContent content={message.content} isStreaming={message.isStreaming} />
        </div>
      </div>
    );
  }

  // ── Procon (찬반) — 좌우 대칭 발언 카드 ──
  if (variant === 'procon-pro' || variant === 'procon-con') {
    const isPro = variant === 'procon-pro';
    return (
      <div className={cn(
        'group rounded-xl overflow-hidden animate-in fade-in duration-200 transition-all',
        isPro ? 'border-l-4 border-l-blue-500 border border-blue-100 bg-white' : 'border-r-4 border-r-red-500 border border-red-100 bg-white',
        isPro ? 'slide-in-from-left-3' : 'slide-in-from-right-3',
        message.isStreaming && 'ring-2 ring-offset-1',
        message.isStreaming && isPro ? 'ring-blue-300' : message.isStreaming ? 'ring-red-300' : ''
      )}>
        <div className={cn('flex items-center gap-2 px-3.5 py-2.5', isPro ? 'bg-blue-50/50' : 'bg-red-50/50')}>
          <ExpertAvatar expert={expert} size="sm" active={message.isStreaming} />
          <span className={cn('text-[12px] font-bold', isPro ? 'text-blue-800' : 'text-red-800')}>{expert.nameKo}</span>
          <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full', isPro ? 'bg-blue-500 text-white' : 'bg-red-500 text-white')}>
            {isPro ? '찬성' : '반대'}
          </span>
          {message.isStreaming && <span className={cn('text-[8px] font-bold uppercase tracking-wider animate-pulse', isPro ? 'text-blue-400' : 'text-red-400')}>발언 중</span>}
          {!message.isStreaming && message.content && <CopyBtn className="ml-auto opacity-0 group-hover:opacity-100 sm:opacity-30 sm:group-hover:opacity-100 text-slate-300 hover:text-slate-500" />}
        </div>
        <div className="px-3.5 py-3">
          <div className={cn('text-[12.5px] leading-relaxed text-slate-600', proseClasses)}>
            <MessageContent content={message.content} isStreaming={message.isStreaming} />
          </div>
        </div>
      </div>
    );
  }

  // ── Hearing (아이디어 검증) ──
  if (variant === 'hearing') {
    return (
      <div className="group animate-in fade-in slide-in-from-bottom-1 duration-200">
        <div className="flex items-start gap-2.5">
          <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
            <ExpertAvatar expert={expert} size="sm" active={message.isStreaming} />
            <div className="w-px flex-1 bg-slate-200 min-h-[20px]" />
          </div>
          <div className="flex-1 min-w-0 pb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[11px] font-semibold text-slate-700">{expert.nameKo}</span>
              <span className="text-[9px] font-medium bg-amber-50 text-amber-600 border border-amber-200/50 px-1.5 py-0.5 rounded-full">패널</span>
              {!message.isStreaming && message.content && <CopyBtn className="ml-auto opacity-0 group-hover:opacity-100 sm:opacity-30 sm:group-hover:opacity-100 text-slate-300 hover:text-slate-500" />}
            </div>
            <div className="bg-white border border-slate-100 rounded-lg px-3.5 py-2.5 shadow-sm">
              <div className={cn('text-[12px] leading-relaxed text-slate-600', proseClasses)}>
                <MessageContent content={message.content} isStreaming={message.isStreaming} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Report (전문가 모드) ──
  if (variant === 'report') {
    return (
      <div className="group animate-in fade-in slide-in-from-bottom-1 duration-200">
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/50 border-b border-slate-100">
            <ExpertAvatar expert={expert} size="sm" active={message.isStreaming} />
            <span className="text-[12px] font-semibold text-slate-700">{expert.nameKo}</span>
            <span className="text-[9px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200/50 px-1.5 py-0.5 rounded-full">전문가</span>
            {!message.isStreaming && message.content && <CopyBtn className="ml-auto opacity-0 group-hover:opacity-100 sm:opacity-30 sm:group-hover:opacity-100 text-slate-300 hover:text-slate-500" />}
          </div>
          <div className="px-4 py-3.5">
            <div className={cn('text-[12.5px] leading-relaxed text-slate-600', proseClasses)}>
              <MessageContent content={message.content} isStreaming={message.isStreaming} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Default (다중AI, 심층토론, 어시스턴트) ──
  return (
    <div className="group animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className={cn(
        'rounded-xl border transition-all overflow-hidden',
        isSummary ? 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-lg ring-1 ring-amber-200/50 border-2' : 'border-slate-300 bg-white hover:border-slate-400 hover:shadow-md'
      )}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <ExpertAvatar expert={expert} size="sm" active={message.isStreaming} />
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <span className="font-semibold text-[12px] text-slate-700">{expert.nameKo}</span>
            {isSummary && <span className="text-[9px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">⚖️ 종합 판정</span>}
            {message.round && !isSummary && (
              <span className="text-[9px] font-medium bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">{ROUND_LABELS[message.round]}</span>
            )}
            {message.isStreaming && !message.content && (
              <span className="flex items-center gap-1">
                <span className="typing-dot w-1 h-1 rounded-full bg-primary/40" />
                <span className="typing-dot w-1 h-1 rounded-full bg-primary/40" />
                <span className="typing-dot w-1 h-1 rounded-full bg-primary/40" />
              </span>
            )}
          </div>
          {!message.isStreaming && message.content && <CopyBtn className="opacity-0 group-hover:opacity-100 sm:opacity-30 sm:group-hover:opacity-100 text-slate-300 hover:text-slate-500" />}
        </div>

        {/* Content */}
        <div className="px-3.5 pb-3 pt-0">
          <div className={cn('text-[12.5px] leading-relaxed text-slate-600', proseClasses)}>
            <MessageContent content={message.content} isStreaming={message.isStreaming} noCollapse={isSummary} />
          </div>
        </div>

        {/* Hover actions */}
        {!message.isStreaming && message.content && !isSummary && (
          <div className="flex items-center gap-0.5 px-3.5 pb-2.5 opacity-0 group-hover:opacity-100 sm:opacity-30 sm:group-hover:opacity-100 transition-opacity">
            <button onClick={() => onLike?.(message.id)} className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-slate-500 px-1.5 py-1 rounded hover:bg-slate-50 transition-colors">
              <ThumbsUp className="w-3 h-3" />{(message.likes ?? 0) > 0 && <span>{message.likes}</span>}
            </button>
            <button onClick={() => onDislike?.(message.id)} className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-slate-500 px-1.5 py-1 rounded hover:bg-slate-50 transition-colors">
              <ThumbsDown className="w-3 h-3" />{(message.dislikes ?? 0) > 0 && <span>{message.dislikes}</span>}
            </button>
            {onRebuttal && (
              <button onClick={() => setShowRebuttal(!showRebuttal)} className={cn(
                'flex items-center gap-1 text-[11px] px-1.5 py-1 rounded transition-colors',
                showRebuttal ? 'text-primary bg-primary/5' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'
              )}>
                <MessageSquareReply className="w-3 h-3" /><span>반박</span>
              </button>
            )}
          </div>
        )}

        {showRebuttal && <RebuttalInput expert={expert} value={rebuttalText} onChange={setRebuttalText} onSubmit={handleRebuttalSubmit} />}
      </div>
    </div>
  );
}

function RebuttalInput({ expert, value, onChange, onSubmit }: { expert: Expert; value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  return (
    <div className="mx-3.5 mb-3 flex gap-2">
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={`${expert.nameKo}에게 반박...`} autoFocus
        className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-[12px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
        onKeyDown={e => { if (e.key === 'Enter' && value.trim()) onSubmit(); }}
      />
      <button onClick={onSubmit} disabled={!value.trim()}
        className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-[11px] font-medium disabled:opacity-30 hover:bg-slate-700 transition-colors">
        전송
      </button>
    </div>
  );
}
