import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PREMIUM_DOMAIN_TEMPLATES, type PremiumDomainId, type ApiSourceCitation } from '@/types/expert';
import { buildAttachmentPrompt, formatFileSize, getFileIcon, processFile, validateFile, type AttachedFile } from '@/lib/fileProcessor';
import { TrustIndicator } from './TrustIndicator';
import { LazyMarkdown } from './LazyMarkdown';
import { ArrowLeft, Send, FileText, ChevronDown, ChevronRight, Loader2, CheckCircle2, Circle, ThumbsUp, ThumbsDown, Search, Paperclip, X } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  citations?: ApiSourceCitation[];
  attachedFiles?: { name: string; mimeType: string; preview?: string }[];
}

interface Props {
  domainId: PremiumDomainId;
  onBack: () => void;
  onSendMessage: (question: string, domain: PremiumDomainId, history: { role: 'user' | 'assistant'; content: string }[], files?: AttachedFile[]) => void;
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
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSourcePanel, setShowSourcePanel] = useState(true);
  const [expandedUserMsgs, setExpandedUserMsgs] = useState<Set<string>>(new Set());
  const [stepsExpanded, setStepsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, steps]);

  useEffect(() => {
    if (!fileError) return;
    const timer = setTimeout(() => setFileError(null), 3000);
    return () => clearTimeout(timer);
  }, [fileError]);

  const handleSubmit = useCallback(() => {
    if ((!input.trim() && attachedFiles.length === 0) || isStreaming) return;
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const question = input.trim() || buildAttachmentPrompt(attachedFiles);
    onSendMessage(question, domainId, history, attachedFiles);
    setInput('');
    setAttachedFiles([]);
    setFileError(null);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [attachedFiles, input, isStreaming, messages, domainId, onSendMessage]);

  const handleSampleClick = (q: string) => {
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setAttachedFiles([]);
    setFileError(null);
    onSendMessage(q, domainId, history, []);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelection = useCallback(async (files: FileList | File[] | null) => {
    const selectedFiles = files ? Array.from(files) : [];
    if (selectedFiles.length === 0) return;

    setFileError(null);
    const nextFiles = [...attachedFiles];
    let nextError: string | null = null;

    for (const file of selectedFiles) {
      const error = validateFile(file, nextFiles);
      if (error) {
        nextError = error;
        continue;
      }

      try {
        const processed = await processFile(file);
        nextFiles.push(processed);
      } catch {
        nextError = '파일을 처리하는 중에 문제가 생겼어요.';
      }
    }

    setAttachedFiles(nextFiles);
    setFileError(nextError);
  }, [attachedFiles]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isStreaming) return;

    const pastedFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file instanceof File);

    if (pastedFiles.length === 0) return;

    e.preventDefault();
    void handleFileSelection(pastedFiles);
  }, [handleFileSelection, isStreaming]);

  const removeAttachedFile = useCallback((fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isStreaming) setIsDragOver(true);
  }, [isStreaming]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isStreaming) return;
    void handleFileSelection(e.dataTransfer.files);
  }, [handleFileSelection, isStreaming]);

  const toggleUserMsg = (id: string) => {
    setExpandedUserMsgs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const hasCitations = citations.length > 0;
  const lastMsg = messages[messages.length - 1];
  const lastFollowUps = lastMsg && lastMsg.role === 'assistant' && !lastMsg.isStreaming
    ? parseFollowUps(lastMsg.content).followUps
    : [];

  const USER_COLLAPSE_LEN = 150;

  return (
    <div className="flex flex-col bg-white dark:bg-[#0f1117] overflow-hidden h-full">
      {/* Header — minimal top bar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[16px]">{domain.icon}</span>
            <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{domain.name}</h3>
            <span className="text-[9px] text-slate-400">·</span>
            <span className="text-[9px] text-slate-400">{domain.apiSource.name}</span>
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
          {/* Messages — scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[700px] mx-auto px-6 py-6 space-y-6">

              {/* Empty state */}
              {messages.length === 0 && steps.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                  <h3 className="text-[22px] font-semibold text-slate-800 dark:text-slate-200 tracking-[-0.03em]">
                    {({
                      law: '법률 질문은 무엇이든 물어보세요.',
                      drug: '의약품·건강 궁금증을 물어보세요.',
                      finance: '재무·투자 고민을 물어보세요.',
                      realestate: '부동산 궁금증을 물어보세요.',
                      tax: '세금·절세 질문을 물어보세요.',
                      labor: '노동·근로 문제를 물어보세요.',
                    } as Record<string, string>)[domainId] || `${domain.name}에게 물어보세요.`}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-center gap-1.5 flex-wrap">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-50" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    {({
                      law: '실시간 법령 연동 · 판례 기반 근거 추론 · 법률의견서 자동 생성',
                      drug: '의약품 DB 연동 · 약물 상호작용 분석 · SOAP Note 기반 응답',
                      finance: '경제지표 실시간 반영 · 리스크 팩터 분석 · 포트폴리오 시뮬레이션',
                      realestate: '실거래가 분석 · 권리관계 리스크 진단 · 투자 수익률 산출',
                      tax: '세법 기반 과세 분석 · 공제항목 자동 점검 · 절세 시나리오 설계',
                      labor: '근로기준법 기반 권리 분석 · 임금·퇴직금 정밀 산출 · 구제절차 안내',
                    } as Record<string, string>)[domainId] || `${domain.apiSource.name} 실시간 연동 · 멀티스텝 근거 추론 · 구조화 분석`}
                  </p>
                  <div className="grid grid-cols-3 gap-2 w-full max-w-[700px] mt-5">
                    {(domain.sampleCases || domain.sampleQuestions.map(q => ({ title: q, desc: '', query: q }))).map((c, i) => {
                      const item = typeof c === 'string' ? { title: c, desc: '', query: c } : c;
                      return (
                        <button
                          key={i}
                          onClick={() => handleSampleClick(item.query)}
                          className="text-left px-3.5 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all group"
                        >
                          <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">{item.title}</p>
                          {item.desc && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-[1.6] line-clamp-3">{item.desc}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Progress steps — toggle */}
              {steps.length > 0 && isStreaming && messages.every(m => m.role === 'user' || !m.content) && (
                <div>
                  <button
                    onClick={() => setStepsExpanded(!stepsExpanded)}
                    className="flex items-center gap-2 text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors mb-2"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>검색 내용</span>
                    <ChevronDown className={cn('w-3 h-3 transition-transform', stepsExpanded && 'rotate-180')} />
                  </button>
                  {stepsExpanded && (
                    <div className="space-y-1.5 pl-6 animate-in fade-in duration-200">
                      {steps.map(s => (
                        <div key={s.step} className="flex items-center gap-2">
                          {s.done ? (
                            <CheckCircle2 className={cn('w-3.5 h-3.5 shrink-0', accent.text)} />
                          ) : (
                            <Circle className="w-3.5 h-3.5 shrink-0 text-slate-300 animate-pulse" />
                          )}
                          <span className={cn('text-[11px]', s.done ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400')}>
                            {s.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Messages */}
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const { clean } = isUser ? { clean: msg.content } : parseFollowUps(msg.content);

                if (isUser) {
                  const isLong = msg.content.length > USER_COLLAPSE_LEN;
                  const isExpanded = expandedUserMsgs.has(msg.id);
                  const displayText = isLong && !isExpanded ? msg.content.slice(0, USER_COLLAPSE_LEN) + '...' : msg.content;
                  return (
                    <div key={msg.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-5 py-4 relative">
                      <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{displayText}</p>
                      {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {msg.attachedFiles.map((file, index) => (
                            <span
                              key={`${msg.id}-${file.name}-${index}`}
                              className="inline-flex max-w-[240px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {file.preview ? (
                                <img src={file.preview} alt="" className="h-7 w-7 rounded object-cover shrink-0" />
                              ) : (
                                <span className="text-[13px]">{getFileIcon(file.mimeType)}</span>
                              )}
                              <span className="truncate">{file.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      {isLong && (
                        <button
                          onClick={() => toggleUserMsg(msg.id)}
                          className="absolute bottom-2 right-3 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
                        </button>
                      )}
                    </div>
                  );
                }

                // AI message
                return (
                  <div key={msg.id} className="space-y-3">
                    {/* AI response body — clean, no border */}
                    <div className="text-[13.5px] text-slate-700 dark:text-slate-300 leading-[1.8] prose prose-sm max-w-none prose-headings:text-slate-800 dark:prose-headings:text-slate-200 prose-headings:text-[14px] prose-headings:font-bold prose-headings:mt-5 prose-headings:mb-2 prose-p:my-2 prose-strong:text-slate-800 dark:prose-strong:text-slate-200 prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                      {clean ? (
                        <LazyMarkdown content={clean} fallback={<span className="whitespace-pre-wrap">{clean}</span>} />
                      ) : (
                        msg.isStreaming && (
                          <span className="text-slate-400 animate-pulse">답변을 작성중입니다.</span>
                        )
                      )}
                    </div>

                    {/* Streaming dots */}
                    {msg.isStreaming && msg.content && (
                      <div className="flex gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}

                    {/* Action buttons — after AI response completes */}
                    {!msg.isStreaming && msg.content && (
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-colors">
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1.5 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-colors">
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {msg.citations && msg.citations.length > 0 && (
                            <button
                              onClick={() => setShowSourcePanel(true)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all"
                            >
                              <FileText className="w-3 h-3" />
                              출처 {msg.citations.length}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Inline citations */}
                    {msg.citations && msg.citations.length > 0 && !msg.isStreaming && (
                      <div className="flex flex-wrap gap-1">
                        {msg.citations.map((c, i) => (
                          <span key={c.id} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border', accent.bg, `border-slate-200 ${accent.text}`)}>
                            [{i + 1}] {c.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Follow-up suggestions — card style */}
              {lastFollowUps.length > 0 && !isStreaming && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-4">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">연관 질문하기</span>
                  <div className="mt-2.5 space-y-2">
                    {lastFollowUps.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSampleClick(q)}
                        className="block w-full text-left text-[12px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors leading-relaxed"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input — bottom fixed, general chat style */}
          <div className="shrink-0 bg-white dark:bg-[#0f1117]">
            <div className="max-w-[700px] mx-auto px-6 py-3">
              <div
                className={cn(
                  'rounded-2xl border-2 bg-white dark:bg-slate-800 shadow-sm overflow-hidden transition-all',
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-50/40 dark:border-indigo-400'
                    : 'border-indigo-400 dark:border-indigo-600'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.docx,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    void handleFileSelection(e.target.files);
                    e.target.value = '';
                  }}
                />
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-4 pt-4">
                    {attachedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="inline-flex max-w-[240px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                      >
                        {file.preview ? (
                          <img src={file.preview} alt="" className="h-7 w-7 rounded object-cover shrink-0" />
                        ) : (
                          <span className="text-[13px]">{getFileIcon(file.mimeType)}</span>
                        )}
                        <span className="truncate">{file.name}</span>
                        <span className="shrink-0 text-[10px] text-slate-400">{formatFileSize(file.size)}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachedFile(file.id)}
                          className="rounded p-0.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          aria-label={`${file.name} 제거`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {fileError && (
                  <div className="px-4 pt-3 text-[11px] text-red-500">{fileError}</div>
                )}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); const t = e.target; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 200)}px`; }}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={`${domain.name}에게 질문하세요`}
                  rows={1}
                  className="w-full px-4 pt-3.5 pb-2 bg-transparent text-[13px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none outline-none"
                  style={{ minHeight: '44px', maxHeight: '200px' }}
                  disabled={isStreaming}
                />
                <div className="flex items-center justify-between px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isStreaming}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 transition-all disabled:opacity-40"
                      aria-label="파일 첨부"
                    >
                      <Paperclip className="h-4 w-4" strokeWidth={2.1} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!isStreaming && (
                      <span className="text-[9px] text-slate-300">Enter 전송 · Shift+Enter 줄바꿈</span>
                    )}
                    <button
                      onClick={handleSubmit}
                      disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming}
                      className={cn(
                        'p-1.5 rounded-xl transition-all',
                        (input.trim() || attachedFiles.length > 0) && !isStreaming
                          ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-800 hover:bg-slate-700'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-500 cursor-not-allowed'
                      )}
                    >
                      {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 text-center mt-2">
                정확한 {domain.name.replace('자문관', '').replace('·건강', '')} 자문은 반드시 전문가와 상담하세요.
              </p>
            </div>
          </div>
        </div>

        {/* Source Panel (desktop) */}
        {hasCitations && showSourcePanel && (
          <div className="hidden md:flex w-[35%] flex-col border-l border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileText className={cn('w-3 h-3', accent.text)} />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">참조 데이터</span>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800', accent.text)}>
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
  const metaLine = [citation.articleNumber, citation.caseNumber, citation.decisionDate, citation.effectiveDate]
    .filter((item): item is string => Boolean(item))
    .join(' · ');

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        <span className={cn('text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0', accent.bg, accent.text)}>
          {index}
        </span>
        <span className="text-[11px]">{typeIcons[citation.type] || '\uD83D\uDCCE'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate">{citation.label}</p>
          {metaLine && <p className="text-[8px] text-slate-500 truncate">{metaLine}</p>}
          <p className="text-[8px] text-slate-400">{citation.source}</p>
        </div>
        <ChevronDown className={cn('w-3 h-3 text-slate-400 transition-transform shrink-0', expanded && 'rotate-180')} />
      </button>
      {expanded && citation.rawData && (
        <div className="px-3 pb-2.5 pt-0 border-t border-slate-100 dark:border-slate-700">
          {(citation.lawName || citation.ministry) && (
            <div className="mt-2 space-y-0.5">
              {citation.lawName && <p className="text-[8px] text-slate-500">법령명: {citation.lawName}</p>}
              {citation.ministry && <p className="text-[8px] text-slate-500">소관부처: {citation.ministry}</p>}
            </div>
          )}
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
