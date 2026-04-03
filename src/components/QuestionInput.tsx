import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, Square, Wrench, Paperclip, X, FileText } from 'lucide-react';
import { DiscussionMode, Expert } from '@/types/expert';
import { cn } from '@/lib/utils';
import type { AttachedFile } from '@/lib/fileProcessor';

type FileProcessorModule = typeof import('@/lib/fileProcessor');

let fileProcessorModulePromise: Promise<FileProcessorModule> | null = null;

function loadFileProcessor() {
  if (!fileProcessorModulePromise) {
    fileProcessorModulePromise = import('@/lib/fileProcessor');
  }

  return fileProcessorModulePromise;
}

function getInlineFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '\u{1F5BC}\uFE0F';
  if (mimeType === 'application/pdf') return '\u{1F4C4}';
  if (mimeType.includes('wordprocessingml')) return '\u{1F4DD}';
  if (mimeType.includes('spreadsheetml')) return '\u{1F4CA}';
  return '\u{1F4CE}';
}

function formatInlineFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

interface Props {
  onSubmit: (question: string) => void;
  onSubmitWithFiles?: (question: string, files: AttachedFile[]) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  discussionMode?: DiscussionMode;
  selectedExperts?: Expert[];
  onRemoveExpert?: (id: string) => void;
  onToggleSettings?: () => void;
  showSettings?: boolean;
  isFollowUp?: boolean;
  onConclusion?: () => void;
  onSummarize?: () => void;
  isSummarizing?: boolean;
  messageCount?: number;
  externalValue?: string;
  onExternalValueConsumed?: () => void;
  embedded?: boolean;
}

export function QuestionInput({
  onSubmit,
  onSubmitWithFiles,
  disabled,
  isStreaming,
  onStop,
  discussionMode,
  selectedExperts,
  onRemoveExpert,
  onToggleSettings,
  showSettings,
  isFollowUp,
  onConclusion,
  onSummarize,
  isSummarizing,
  messageCount = 0,
  externalValue,
  onExternalValueConsumed,
  embedded = false,
}: Props) {
  const [question, setQuestion] = useState('');
  const [focused, setFocused] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (externalValue) {
      setQuestion(externalValue);
      onExternalValueConsumed?.();
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [externalValue, onExternalValueConsumed]);

  useEffect(() => {
    if (!fileError) return;
    const timer = setTimeout(() => setFileError(null), 3000);
    return () => clearTimeout(timer);
  }, [fileError]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setFileError(null);
    const { validateFile, processFile } = await loadFileProcessor();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateFile(file, attachedFiles);

      if (error) {
        setFileError(error);
        continue;
      }

      try {
        const processed = await processFile(file);
        setAttachedFiles((prev) => [...prev, processed]);
      } catch {
        setFileError('파일 처리 중 오류가 발생했습니다.');
      }
    }
  }, [attachedFiles]);

  const removeFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || disabled || isStreaming) return;

    if (onSubmitWithFiles && attachedFiles.length > 0) {
      onSubmitWithFiles(question.trim(), attachedFiles);
    } else {
      onSubmit(question.trim());
    }

    setQuestion('');
    setAttachedFiles([]);
    setFileError(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isStreaming) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!disabled && !isStreaming) handleFileSelect(e.dataTransfer.files);
  };

  const placeholder = isFollowUp
    ? discussionMode === 'brainstorm'
      ? '추가 방향을 덧붙여 보세요'
      : discussionMode === 'procon' || discussionMode === 'standard' || discussionMode === 'hearing'
        ? '토론자에게 추가 질문을 해보세요'
        : discussionMode === 'stakeholder'
          ? '답변을 입력해보세요'
          : discussionMode === 'aivsuser'
            ? '반론을 입력해보세요'
            : '이어서 질문해보세요'
    : discussionMode === 'general'
      ? '궁금한 것을 물어보세요'
      : discussionMode === 'multi'
        ? '여러 AI에게 동시에 질문해보세요'
        : discussionMode === 'expert'
          ? '전문가에게 상담할 내용을 입력해보세요'
          : discussionMode === 'aivsuser'
            ? 'AI와 토론할 주제를 입력해보세요'
            : '토론하고 싶은 주제를 입력해보세요';

  const canSubmit = !!question.trim() && !disabled && !isStreaming;
  const canUseTools = !disabled && !isStreaming;

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={cn(
          'transition-all duration-200',
          embedded ? 'rounded-none border-0 bg-transparent shadow-none' : 'rounded-2xl border-2',
          isDragOver
            ? embedded
              ? 'rounded-b-2xl bg-blue-50/30'
              : 'border-blue-400 shadow-[0_2px_20px_rgba(59,130,246,0.15)] bg-blue-50/30'
            : disabled
              ? embedded
                ? 'opacity-75'
                : 'border-slate-200 opacity-75'
              : focused
                ? embedded
                  ? 'bg-transparent'
                  : 'border-violet-300 shadow-[0_2px_20px_rgba(139,92,246,0.10)] bg-white'
                : embedded
                  ? 'bg-transparent'
                  : 'border-slate-200 bg-slate-50 shadow-sm hover:border-violet-300'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={cn(
          'transition-all duration-200',
          embedded ? 'rounded-none bg-transparent' : 'rounded-[calc(1rem-2px)] bg-white'
        )}>
          {!isFollowUp && selectedExperts && selectedExperts.length > 0 && (
            (discussionMode === 'standard' || discussionMode === 'brainstorm') ? (
              <div className="flex items-center gap-2.5 px-5 pt-3 pb-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-700 text-white text-[10px] font-bold tracking-wide">
                  {discussionMode === 'standard' ? '토론자' : '참여자'}
                </span>
                <div className="flex items-center gap-1.5">
                  {selectedExperts.map((expert, index) => (
                    <span key={expert.id} className="inline-flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-slate-800">{expert.nameKo}</span>
                      {index < selectedExperts.length - 1 && <span className="text-slate-300">·</span>}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-4 pt-3 pb-1 flex-wrap">
                {selectedExperts.map((expert) => (
                  onRemoveExpert ? (
                    <button
                      key={expert.id}
                      type="button"
                      onClick={() => onRemoveExpert(expert.id)}
                      className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-600 font-medium hover:bg-red-50 hover:border-red-100 hover:text-red-400 transition-colors"
                    >
                      {expert.avatarUrl
                        ? <img src={expert.avatarUrl} alt="" className="w-3.5 h-3.5 object-contain pointer-events-none" />
                        : expert.icon && <span className="text-[12px] pointer-events-none">{expert.icon}</span>}
                      {expert.nameKo}
                      <span className="text-[9px] opacity-60">×</span>
                    </button>
                  ) : (
                    <span
                      key={expert.id}
                      className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-600 font-medium"
                    >
                      {expert.avatarUrl
                        ? <img src={expert.avatarUrl} alt="" className="w-3.5 h-3.5 object-contain" />
                        : expert.icon && <span className="text-[12px]">{expert.icon}</span>}
                      {expert.nameKo}
                    </span>
                  )
                ))}
              </div>
            )
          )}

          {attachedFiles.length > 0 && (
            <div className="flex items-center gap-1.5 px-4 pt-3 pb-1 flex-wrap">
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 max-w-[180px]"
                >
                  {file.preview ? (
                    <img src={file.preview} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                  ) : (
                    <span className="text-[14px] shrink-0">{getInlineFileIcon(file.mimeType)}</span>
                  )}
                  <span className="truncate">{file.name}</span>
                  <span className="text-slate-400 text-[9px] shrink-0">{formatInlineFileSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="ml-0.5 p-0.5 rounded hover:bg-red-50 hover:text-red-400 transition-colors shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {fileError && (
            <div className="px-5 pt-2 pb-0 text-[11px] text-red-500">{fileError}</div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/*,.pdf,.docx,.xlsx"
            onChange={(e) => {
              handleFileSelect(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'w-full bg-transparent resize-none text-[14px] text-foreground placeholder:text-slate-400 focus:outline-none leading-relaxed max-h-[140px] block',
              embedded ? 'px-5 pt-4 pb-3 min-h-[76px]' : 'px-5 pt-4 pb-2 min-h-[44px]'
            )}
            rows={embedded ? 2 : 1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
            }}
          />

          <div className={cn(
            'flex items-center justify-between px-3',
            embedded ? 'py-2.5' : 'py-1.5'
          )}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!canUseTools}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-40 disabled:hover:bg-transparent"
                title="파일 첨부"
              >
                <Paperclip className="w-3.5 h-3.5" strokeWidth={2} />
              </button>

              <button
                type="button"
                disabled={!canUseTools}
                onClick={onToggleSettings}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all disabled:opacity-40',
                  showSettings
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                )}
              >
                <Wrench className="w-3 h-3" strokeWidth={1.8} />
                {!showSettings && '설정'}
                {showSettings && '닫기'}
              </button>

              {onSummarize && (
                <div className="relative group/summary">
                  <button
                    type="button"
                    onClick={messageCount >= 3 ? onSummarize : undefined}
                    disabled={isSummarizing || messageCount < 3}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all',
                      isSummarizing
                        ? 'text-slate-400 bg-slate-100'
                        : messageCount < 3
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <FileText className="w-3 h-3" strokeWidth={1.8} />
                    {isSummarizing ? '요약 중...' : '요약하기'}
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] whitespace-nowrap opacity-0 group-hover/summary:opacity-100 transition-opacity pointer-events-none shadow-lg">
                    {messageCount < 3 ? '대화가 조금 더 쌓이면 사용할 수 있어요' : '지금까지의 대화를 AI가 요약합니다'}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                  </div>
                </div>
              )}

              {onConclusion && (
                <button
                  type="button"
                  onClick={onConclusion}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium text-amber-600 hover:bg-amber-50 transition-all"
                >
                  {discussionMode === 'aivsuser' ? '최종 판정 요청' : '종합 결론'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {!disabled && !isStreaming && (
                <span className="text-[9px] text-slate-300 mr-1 hidden sm:inline">Enter 전송 · Shift+Enter 줄바꿈</span>
              )}

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="중지"
              title="중지"
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 bg-indigo-500 text-white hover:bg-indigo-600 shadow-md"
            >
              <Square className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          ) : (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150',
                    canSubmit
                      ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md'
                      : 'bg-slate-100 text-slate-300'
                  )}
                >
                  <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
