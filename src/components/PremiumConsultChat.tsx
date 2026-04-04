import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PREMIUM_DOMAIN_TEMPLATES, type PremiumDomainId, type PremiumDomainTemplate, type ApiSourceCitation } from '@/types/expert';
import { TrustIndicator } from './TrustIndicator';
import { CitationBadge } from './CitationBadge';
import { ArrowLeft, Send, FileText, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  citations?: ApiSourceCitation[];
}

interface Props {
  domainId: PremiumDomainId;
  onBack: () => void;
  onSendMessage: (question: string, domain: PremiumDomainId, history: { role: 'user' | 'assistant'; content: string }[]) => void;
  messages: Message[];
  isStreaming: boolean;
  citations: ApiSourceCitation[];
  trustHeader?: string;
  error?: string;
}

export function PremiumConsultChat({ domainId, onBack, onSendMessage, messages, isStreaming, citations, trustHeader, error }: Props) {
  const domain = PREMIUM_DOMAIN_TEMPLATES.find(d => d.id === domainId)!;
  const [input, setInput] = useState('');
  const [showSourcePanel, setShowSourcePanel] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    onSendMessage(input.trim(), domainId, history);
    setInput('');
  }, [input, isStreaming, messages, domainId, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasCitations = citations.length > 0;

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className={cn('flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-gradient-to-r', domain.color.gradient)}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[18px]">{domain.icon}</span>
            <div>
              <h3 className="text-[13px] font-bold text-white">{domain.name}</h3>
              <span className={cn('text-[9px] font-medium', domain.color.accent)}>{domain.apiSource.name} 연동</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrustIndicator domain={domainId} citations={citations} error={error} trustHeader={trustHeader} />
          {hasCitations && (
            <button
              onClick={() => setShowSourcePanel(!showSourcePanel)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors md:hidden"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body: Chat + Source Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Column */}
        <div className={cn('flex-1 flex flex-col min-w-0', hasCitations && showSourcePanel ? 'md:w-[65%]' : 'w-full')}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <span className="text-[36px] mb-3">{domain.icon}</span>
                <h3 className="text-[15px] font-bold text-white mb-1">{domain.name}</h3>
                <p className="text-[11px] text-slate-500 mb-6 max-w-xs">{domain.description}</p>
                <div className="space-y-2 w-full max-w-sm">
                  {domain.sampleQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="w-full text-left px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800/80 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-slate-800 text-white rounded-br-md'
                    : 'bg-slate-900/80 border border-slate-800/50 text-slate-200 rounded-bl-md',
                )}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[12px]">{domain.icon}</span>
                      <span className={cn('text-[10px] font-bold', domain.color.accent)}>{domain.name}</span>
                    </div>
                  )}
                  <div className="prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>h3]:text-[13px] [&>h3]:font-bold [&>h3]:mt-3 [&>h3]:mb-1 whitespace-pre-wrap">
                    {msg.content || (msg.isStreaming ? '' : '')}
                  </div>
                  {msg.isStreaming && (
                    <div className="flex items-center gap-1 mt-2">
                      <div className="flex gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  {/* Inline citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-800/50">
                      {msg.citations.map(c => (
                        <CitationBadge key={c.id} citation={c} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-slate-800/80 bg-slate-950">
            <div className="flex items-end gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-slate-700 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`${domain.name}에게 질문하세요...`}
                rows={1}
                className="flex-1 bg-transparent text-[12px] text-white placeholder:text-slate-600 resize-none outline-none max-h-32"
                style={{ minHeight: '20px' }}
                disabled={isStreaming}
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isStreaming}
                className={cn(
                  'p-1.5 rounded-lg transition-all shrink-0',
                  input.trim() && !isStreaming
                    ? `${domain.color.accent} hover:opacity-80`
                    : 'text-slate-600 cursor-not-allowed'
                )}
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Source Panel (desktop) */}
        {hasCitations && showSourcePanel && (
          <div className="hidden md:flex w-[35%] flex-col border-l border-slate-800/80 bg-slate-900/50">
            <div className="px-3 py-2.5 border-b border-slate-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileText className={cn('w-3 h-3', domain.color.accent)} />
                  <span className="text-[11px] font-bold text-white">참조 데이터</span>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-semibold', domain.color.text, 'bg-slate-800')}>
                    {citations.length}
                  </span>
                </div>
                <button onClick={() => setShowSourcePanel(false)} className="p-0.5 rounded text-slate-500 hover:text-white transition-colors">
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {citations.map((citation) => (
                <SourceCard key={citation.id} citation={citation} domain={domain} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SourceCard({ citation, domain }: { citation: ApiSourceCitation; domain: PremiumDomainTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const typeIcons: Record<string, string> = {
    law_article: '\uD83D\uDCDC', precedent: '\u2696\uFE0F', drug_info: '\uD83D\uDC8A',
    drug_interaction: '\uD83D\uDC8A', economic_indicator: '\uD83D\uDCCA', financial_product: '\uD83C\uDFE6',
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-[12px]">{typeIcons[citation.type] || '\uD83D\uDCCE'}</span>
        <div className="flex-1 min-w-0">
          <p className={cn('text-[10px] font-semibold truncate', domain.color.text)}>{citation.label}</p>
          <p className="text-[8px] text-slate-600">{citation.source}</p>
        </div>
        <ChevronDown className={cn('w-3 h-3 text-slate-600 transition-transform shrink-0', expanded && 'rotate-180')} />
      </button>
      {expanded && citation.rawData && (
        <div className="px-3 pb-2.5 pt-0">
          <p className="text-[9px] leading-relaxed text-slate-500 whitespace-pre-wrap">{citation.rawData}</p>
          {citation.url && (
            <a href={citation.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-[8px] text-blue-400 hover:underline">
              원문 보기 →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
