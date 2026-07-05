import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PREMIUM_DOMAIN_TEMPLATES, type PremiumDomainId, type ApiSourceCitation } from '@/types/expert';
import { buildAttachmentPrompt, formatFileSize, getFileIcon, processFile, validateFile, type AttachedFile } from '@/lib/fileProcessor';
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

export function PremiumConsultChat({ domainId, onBack, onSendMessage, messages, isStreaming, citations, steps = [] }: Props) {
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
    <div className="flex flex-col bg-background text-foreground overflow-hidden h-full">
      {/* 상단 — 메인 화면 좌상단과 같은 글래스 캡슐. 누르면 메인으로 돌아간다.
       * (기존 '뒤로·도메인명·API출처·배지' 헤더 줄은 제거 — 정체성은 빈 화면·인용이 담당) */}
      <div className="shrink-0 px-4 pt-3 pb-1.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="메인 화면으로"
          title="메인 화면으로"
          className="group inline-flex h-8 items-center gap-1.5 rounded-full border border-[hsl(var(--hairline))] bg-card pl-1.5 pr-3 text-[12.5px] font-semibold text-foreground shadow-[0_4px_16px_-10px_hsl(var(--foreground)/0.25)] transition-colors hover:bg-accent"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/70 transition-colors group-hover:bg-background">
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
          <span className="text-[14px] leading-none">{domain.icon}</span>
          <span>{domain.name}</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Column */}
        <div className={cn('flex-1 flex flex-col min-w-0', hasCitations && showSourcePanel ? 'md:w-[65%]' : 'w-full')}>
          {/* Messages — scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[700px] mx-auto px-6 py-6 space-y-6">

              {/* Empty state — 말로 증명하지 않는다. 헤드라인 + 실시간 연동 칩(근거) + 샘플. */}
              {messages.length === 0 && steps.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                  <h3 className="text-[22px] font-semibold text-foreground tracking-[-0.03em]">
                    {({
                      law: '법률 질문은 무엇이든 물어보세요.',
                      drug: '증상·복용약·건강 고민을 물어보세요.',
                      finance: '재무·투자 고민을 물어보세요.',
                      realestate: '부동산 궁금증을 물어보세요.',
                      tax: '세금·절세 질문을 물어보세요.',
                      labor: '노동·근로 문제를 물어보세요.',
                    } as Record<string, string>)[domainId] || `${domain.name}에게 물어보세요.`}
                  </h3>
                  {/* 전문성은 문장이 아니라 실시간 연동 배지로 — 근거가 말한다. */}
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--hairline))] bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-50" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    실시간 {domain.apiSource.name} 연동
                  </div>
                  <div className="grid grid-cols-3 gap-2 w-full max-w-[700px] mt-5">
                    {(domain.sampleCases || domain.sampleQuestions.map(q => ({ title: q, desc: '', query: q }))).map((c, i) => {
                      const item = typeof c === 'string' ? { title: c, desc: '', query: c } : c;
                      return (
                        <button
                          key={i}
                          onClick={() => handleSampleClick(item.query)}
                          className="text-left px-3.5 py-3 rounded-lg border border-[hsl(var(--hairline))] bg-card hover:border-primary/30 hover:bg-accent/50 hover:shadow-[0_2px_8px_-4px_hsl(var(--foreground)/0.12)] transition-all group"
                        >
                          <p className="text-[11px] font-semibold text-foreground group-hover:text-primary">{item.title}</p>
                          {item.desc && (
                            <p className="text-[10px] text-muted-foreground mt-1 leading-[1.6] line-clamp-3">{item.desc}</p>
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
                    className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
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
                            <Circle className="w-3.5 h-3.5 shrink-0 text-muted-foreground/40 animate-pulse" />
                          )}
                          <span className={cn('text-[11px]', s.done ? 'text-foreground/80' : 'text-muted-foreground')}>
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
                    <div key={msg.id} className="bg-muted/50 rounded-xl px-5 py-4 relative">
                      <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{displayText}</p>
                      {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {msg.attachedFiles.map((file, index) => (
                            <span
                              key={`${msg.id}-${file.name}-${index}`}
                              className="inline-flex max-w-[240px] items-center gap-1.5 rounded-lg border border-[hsl(var(--hairline))] bg-card px-2.5 py-1 text-[11px] text-muted-foreground"
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
                          className="absolute bottom-2 right-3 text-muted-foreground hover:text-foreground transition-colors"
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
                    <div className="text-[13.5px] text-foreground/90 leading-[1.8] prose prose-sm max-w-none prose-headings:text-foreground prose-headings:text-[14px] prose-headings:font-bold prose-headings:mt-5 prose-headings:mb-2 prose-p:my-2 prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                      {clean ? (
                        <LazyMarkdown content={clean} fallback={<span className="whitespace-pre-wrap">{clean}</span>} />
                      ) : (
                        msg.isStreaming && (
                          <span className="text-muted-foreground animate-pulse">답변을 작성중입니다.</span>
                        )
                      )}
                    </div>

                    {/* Streaming dots */}
                    {msg.isStreaming && msg.content && (
                      <div className="flex gap-1">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}

                    {/* Action buttons — after AI response completes */}
                    {!msg.isStreaming && msg.content && (
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors" aria-label="도움됨">
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors" aria-label="아쉬움">
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {msg.citations && msg.citations.length > 0 && (
                            <button
                              onClick={() => setShowSourcePanel(true)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[hsl(var(--hairline))] text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
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
                          <span key={c.id} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border border-[hsl(var(--hairline))]', accent.bg, accent.text)}>
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
                <div className="rounded-xl border border-[hsl(var(--hairline))] px-5 py-4">
                  <span className="text-[11px] font-semibold text-foreground/90">연관 질문하기</span>
                  <div className="mt-2.5 space-y-2">
                    {lastFollowUps.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSampleClick(q)}
                        className="block w-full text-left text-[12px] text-primary hover:text-primary/80 transition-colors leading-relaxed"
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
          <div className="shrink-0 bg-background">
            <div className="max-w-[700px] mx-auto px-6 py-3">
              <div
                className={cn(
                  'rounded-2xl border bg-card shadow-sm overflow-hidden transition-all',
                  isDragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-[hsl(var(--hairline))] focus-within:border-primary/45 focus-within:ring-1 focus-within:ring-primary/15'
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
                        className="inline-flex max-w-[240px] items-center gap-1.5 rounded-lg border border-[hsl(var(--hairline))] bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground"
                      >
                        {file.preview ? (
                          <img src={file.preview} alt="" className="h-7 w-7 rounded object-cover shrink-0" />
                        ) : (
                          <span className="text-[13px]">{getFileIcon(file.mimeType)}</span>
                        )}
                        <span className="truncate">{file.name}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground/70">{formatFileSize(file.size)}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachedFile(file.id)}
                          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`${file.name} 제거`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {fileError && (
                  <div className="px-4 pt-3 text-[11px] text-destructive">{fileError}</div>
                )}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); const t = e.target; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 200)}px`; }}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={`${domain.name}에게 질문하세요`}
                  rows={1}
                  className="w-full px-4 pt-3.5 pb-2 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground resize-none outline-none"
                  style={{ minHeight: '44px', maxHeight: '200px' }}
                  disabled={isStreaming}
                />
                <div className="flex items-center justify-between px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isStreaming}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-[hsl(var(--hairline))] bg-card text-muted-foreground shadow-sm hover:border-primary/30 hover:bg-accent hover:text-foreground transition-all disabled:opacity-40"
                      aria-label="파일 첨부"
                    >
                      <Paperclip className="h-4 w-4" strokeWidth={2.1} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!isStreaming && (
                      <span className="text-[9px] text-muted-foreground/60">Enter 전송 · Shift+Enter 줄바꿈</span>
                    )}
                    <button
                      onClick={handleSubmit}
                      disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming}
                      className={cn(
                        'p-1.5 rounded-xl transition-all',
                        (input.trim() || attachedFiles.length > 0) && !isStreaming
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-muted text-muted-foreground/50 cursor-not-allowed'
                      )}
                      aria-label="전송"
                    >
                      {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground text-center mt-2">
                정확한 {domain.name.replace('자문관', '').replace('·건강', '')} 자문은 반드시 전문가와 상담하세요.
              </p>
            </div>
          </div>
        </div>

        {/* Source Panel (desktop) — 근거 데이터가 전문성을 말한다. */}
        {hasCitations && showSourcePanel && (
          <div className="hidden md:flex w-[35%] flex-col border-l border-[hsl(var(--hairline))] bg-muted/30">
            <div className="px-3 py-2.5 border-b border-[hsl(var(--hairline))]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileText className={cn('w-3 h-3', accent.text)} />
                  <span className="text-[11px] font-bold text-foreground">참조 데이터</span>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-accent', accent.text)}>
                    {citations.length}
                  </span>
                </div>
                <button onClick={() => setShowSourcePanel(false)} className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors" aria-label="패널 닫기">
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
    law_article: '📜', precedent: '⚖️', drug_info: '💊',
    drug_interaction: '💊', economic_indicator: '📊', financial_product: '🏦',
    real_estate_data: '🏠', tax_reference: '🧾', labor_reference: '👷', public_guideline: '📋',
  };
  const metaLine = [citation.articleNumber, citation.caseNumber, citation.decisionDate, citation.effectiveDate]
    .filter((item): item is string => Boolean(item))
    .join(' · ');

  return (
    <div className="rounded-lg border border-[hsl(var(--hairline))] bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors"
      >
        <span className={cn('text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0', accent.bg, accent.text)}>
          {index}
        </span>
        <span className="text-[11px]">{typeIcons[citation.type] || '📎'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-foreground/90 truncate">{citation.label}</p>
          {metaLine && <p className="text-[8px] text-muted-foreground truncate">{metaLine}</p>}
          <p className="text-[8px] text-muted-foreground/70">{citation.source}</p>
        </div>
        <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform shrink-0', expanded && 'rotate-180')} />
      </button>
      {expanded && citation.rawData && (
        <div className="px-3 pb-2.5 pt-0 border-t border-[hsl(var(--hairline))]">
          {(citation.lawName || citation.ministry) && (
            <div className="mt-2 space-y-0.5">
              {citation.lawName && <p className="text-[8px] text-muted-foreground">법령명: {citation.lawName}</p>}
              {citation.ministry && <p className="text-[8px] text-muted-foreground">소관부처: {citation.ministry}</p>}
            </div>
          )}
          <p className="text-[9px] leading-relaxed text-muted-foreground whitespace-pre-wrap mt-2">{citation.rawData}</p>
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
