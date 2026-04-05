import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PREMIUM_DOMAIN_TEMPLATES, type PremiumDomainId, type PremiumDomainTemplate, type ApiSourceCitation } from '@/types/expert';
import { TrustIndicator } from './TrustIndicator';
import { LazyMarkdown } from './LazyMarkdown';
import { ArrowLeft, Send, FileText, ChevronDown, ChevronRight, Loader2, CheckCircle2, Circle } from 'lucide-react';

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
  steps?: { step: number; label: string; done: boolean }[];
}

const ACCENT_MAP: Record<string, { border: string; text: string; bg: string; line: string }> = {
  law:        { border: 'border-l-amber-400',   text: 'text-amber-600',   bg: 'bg-amber-50',   line: 'bg-amber-400' },
  drug:       { border: 'border-l-emerald-400', text: 'text-emerald-600', bg: 'bg-emerald-50', line: 'bg-emerald-400' },
  finance:    { border: 'border-l-blue-400',    text: 'text-blue-600',    bg: 'bg-blue-50',    line: 'bg-blue-400' },
  realestate: { border: 'border-l-violet-400',  text: 'text-violet-600',  bg: 'bg-violet-50',  line: 'bg-violet-400' },
  tax:        { border: 'border-l-cyan-400',    text: 'text-cyan-600',    bg: 'bg-cyan-50',    line: 'bg-cyan-400' },
  labor:      { border: 'border-l-orange-400',  text: 'text-orange-600',  bg: 'bg-orange-50',  line: 'bg-orange-400' },
};

// Parse {{followup:q1||q2||q3}} from AI response
function parseFollowUps(content: string): { clean: string; followUps: string[] } {
  const match = content.match(/\{\{followup:(.+?)\}\}/);
  if (!match) return { clean: content, followUps: [] };
  return {
    clean: content.replace(match[0], '').trim(),
    followUps: match[1].split('||').map(q => q.trim()).filter(Boolean),
  };
}

export function PremiumConsultChat({ domainId, onBack, onSendMessage, messages, isStreaming, citations, trustHeader, error, steps = [] }: Props) {
  const domain = PREMIUM_DOMAIN_TEMPLATES.find(d => d.id === domainId) || PREMIUM_DOMAIN_TEMPLATES[0];
  const accent = ACCENT_MAP[domainId] || ACCENT_MAP.law;
  const [input, setInput] = useState('');
  const [showSourcePanel, setShowSourcePanel] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, steps]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    onSendMessage(input.trim(), domainId, history);
    setInput('');
  }, [input, isStreaming, messages, domainId, onSendMessage]);

  const handleSampleClick = (q: string) => {
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    onSendMessage(q, domainId, history);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasCitations = citations.length > 0;
  const lastMsg = messages[messages.length - 1];
  const lastFollowUps = lastMsg && lastMsg.role === 'assistant' && !lastMsg.isStreaming
    ? parseFollowUps(lastMsg.content).followUps
    : [];

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden" style={{ minHeight: '500px', maxHeight: '80vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[18px]">{domain.icon}</span>
            <div>
              <h3 className="text-[13px] font-bold text-slate-800">{domain.name}</h3>
              <span className="text-[9px] font-medium text-slate-400">{domain.apiSource.name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrustIndicator domain={domainId} citations={citations} error={error} trustHeader={trustHeader} />
          {hasCitations && (
            <button
              onClick={() => setShowSourcePanel(!showSourcePanel)}
              className={cn('p-1.5 rounded-lg transition-colors', showSourcePanel ? 'text-slate-700 bg-slate-100' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100')}
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Column */}
        <div className={cn('flex-1 flex flex-col min-w-0', hasCitations && showSourcePanel ? 'md:w-[65%]' : 'w-full')}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* Empty state */}
            {messages.length === 0 && steps.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <span className="text-[36px] mb-3">{domain.icon}</span>
                <h3 className="text-[15px] font-bold text-slate-800 mb-1">{domain.name}</h3>
                <p className="text-[11px] text-slate-400 mb-6 max-w-xs">{domain.description}</p>
                <div className="space-y-2 w-full max-w-sm">
                  {domain.sampleQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSampleClick(q)}
                      className="w-full text-left px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-100 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Progress steps (shown during streaming, before AI text arrives) */}
            {steps.length > 0 && isStreaming && messages.every(m => m.role === 'user' || !m.content) && (
              <div className={cn('rounded-xl border px-4 py-3 space-y-2 animate-in fade-in duration-300', `border-slate-200 ${accent.bg}`)}>
                {steps.map(s => (
                  <div key={s.step} className="flex items-center gap-2">
                    {s.done ? (
                      <CheckCircle2 className={cn('w-4 h-4 shrink-0', accent.text)} />
                    ) : (
                      <Circle className="w-4 h-4 shrink-0 text-slate-300 animate-pulse" />
                    )}
                    <span className={cn('text-[11px]', s.done ? 'text-slate-700 font-medium' : 'text-slate-400')}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const { clean, followUps } = isUser ? { clean: msg.content, followUps: [] } : parseFollowUps(msg.content);

              return (
                <div key={msg.id}>
                  {isUser ? (
                    /* User message — right aligned, minimal */
                    <div className="flex justify-end">
                      <div className="max-w-[75%] bg-slate-800 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[12px] leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    /* AI message — left aligned, structured report style */
                    <div className={cn('border-l-[3px] pl-4 py-1', accent.border)}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[13px]">{domain.icon}</span>
                        <span className={cn('text-[11px] font-bold', accent.text)}>{domain.name}</span>
                      </div>
                      <div className="text-[13px] text-slate-700 leading-relaxed prose prose-sm max-w-none prose-headings:text-slate-800 prose-headings:text-[13px] prose-headings:font-bold prose-headings:mt-3 prose-headings:mb-1">
                        {clean ? (
                          <LazyMarkdown content={clean} fallback={<span className="whitespace-pre-wrap">{clean}</span>} />
                        ) : (
                          msg.isStreaming && (
                            <span className="text-slate-400 animate-pulse">응답 생성 중...</span>
                          )
                        )}
                      </div>
                      {/* Streaming indicator */}
                      {msg.isStreaming && msg.content && (
                        <div className="flex gap-0.5 mt-2">
                          <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                      {/* Inline citations */}
                      {msg.citations && msg.citations.length > 0 && !msg.isStreaming && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-100">
                          {msg.citations.map((c, i) => (
                            <span key={c.id} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border', accent.bg, `border-slate-200 ${accent.text}`)}>
                              [{i + 1}] {c.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Follow-up suggestions (after last AI message) */}
            {lastFollowUps.length > 0 && !isStreaming && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] text-slate-400 font-medium">이어서 물어보기</span>
                <div className="space-y-1">
                  {lastFollowUps.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSampleClick(q)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-100 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-slate-100 bg-white">
            <div className="flex items-end gap-2 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-slate-400 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`${domain.name}에게 질문하세요...`}
                rows={1}
                className="flex-1 bg-transparent text-[12px] text-slate-800 placeholder:text-slate-400 resize-none outline-none max-h-32"
                style={{ minHeight: '20px' }}
                disabled={isStreaming}
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isStreaming}
                className={cn(
                  'p-1.5 rounded-lg transition-all shrink-0',
                  input.trim() && !isStreaming
                    ? `${accent.text} hover:opacity-70`
                    : 'text-slate-300 cursor-not-allowed'
                )}
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Source Panel (desktop) */}
        {hasCitations && showSourcePanel && (
          <div className="hidden md:flex w-[35%] flex-col border-l border-slate-100 bg-slate-50/50">
            <div className="px-3 py-2.5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileText className={cn('w-3 h-3', accent.text)} />
                  <span className="text-[11px] font-bold text-slate-700">참조 데이터</span>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-slate-100', accent.text)}>
                    {citations.length}
                  </span>
                </div>
                <button onClick={() => setShowSourcePanel(false)} className="p-0.5 rounded text-slate-400 hover:text-slate-700 transition-colors">
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {citations.map((citation, i) => (
                <SourceCard key={citation.id} citation={citation} index={i + 1} accent={accent} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SourceCard({ citation, index, accent }: { citation: ApiSourceCitation; index: number; accent: { text: string; bg: string } }) {
  const [expanded, setExpanded] = useState(false);
  const typeIcons: Record<string, string> = {
    law_article: '\uD83D\uDCDC', precedent: '\u2696\uFE0F', drug_info: '\uD83D\uDC8A',
    drug_interaction: '\uD83D\uDC8A', economic_indicator: '\uD83D\uDCCA', financial_product: '\uD83C\uDFE6',
    real_estate_data: '\uD83C\uDFE0', tax_reference: '\uD83E\uDDFE', labor_reference: '\uD83D\uDC77', public_guideline: '\uD83D\uDCCB',
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
      >
        <span className={cn('text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0', accent.bg, accent.text)}>
          {index}
        </span>
        <span className="text-[11px]">{typeIcons[citation.type] || '\uD83D\uDCCE'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-slate-700 truncate">{citation.label}</p>
          <p className="text-[8px] text-slate-400">{citation.source}</p>
        </div>
        <ChevronDown className={cn('w-3 h-3 text-slate-400 transition-transform shrink-0', expanded && 'rotate-180')} />
      </button>
      {expanded && citation.rawData && (
        <div className="px-3 pb-2.5 pt-0 border-t border-slate-100">
          <p className="text-[9px] leading-relaxed text-slate-500 whitespace-pre-wrap mt-2">{citation.rawData}</p>
          {citation.url && (
            <a href={citation.url} target="_blank" rel="noopener noreferrer" className={cn('mt-1.5 inline-block text-[9px] hover:underline', accent.text)}>
              원문 보기 →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
