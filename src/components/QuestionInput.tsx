import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, FolderPlus, Paperclip, Plus, Square, X } from 'lucide-react';
import { DiscussionMode, Expert } from '@/types/expert';
import { cn } from '@/lib/utils';
import type { AttachedFile } from '@/lib/fileProcessor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type FileProcessorModule = typeof import('@/lib/fileProcessor');

let fileProcessorModulePromise: Promise<FileProcessorModule> | null = null;

function loadFileProcessor() {
  if (!fileProcessorModulePromise) {
    fileProcessorModulePromise = import('@/lib/fileProcessor');
  }

  return fileProcessorModulePromise;
}

function getInlineFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('wordprocessingml')) return '📝';
  if (mimeType.includes('spreadsheetml')) return '📊';
  return '📎';
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

function getPlaceholder(isFollowUp: boolean | undefined, discussionMode: DiscussionMode | undefined) {
  if (isFollowUp) {
    if (discussionMode === 'brainstorm') return '추가 방향이나 아이디어를 적어보세요';
    if (discussionMode === 'procon' || discussionMode === 'standard' || discussionMode === 'hearing') {
      return '토론자에게 추가 질문을 해보세요';
    }
    if (discussionMode === 'stakeholder') return '응답을 입력해보세요';
    if (discussionMode === 'aivsuser') return '반론을 입력해보세요';
    return '이어서 질문해보세요';
  }

  if (discussionMode === 'general') return '궁금한 것을 물어보세요';
  if (discussionMode === 'multi') return '여러 AI에게 동시에 질문해보세요';
  if (discussionMode === 'expert') return '전문가에게 상담할 내용을 입력해보세요';
  if (discussionMode === 'aivsuser') return 'AI와 토론할 주제를 입력해보세요';
  return '토론하고 싶은 주제를 입력해보세요';
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
  isFollowUp,
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
    const timer = setTimeout(() => textareaRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!externalValue) return;

    setQuestion(externalValue);
    onExternalValueConsumed?.();

    const timer = setTimeout(() => textareaRef.current?.focus(), 50);
    return () => clearTimeout(timer);
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

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const currentFiles = i === 0 ? attachedFiles : [...attachedFiles];
      const error = validateFile(file, currentFiles);

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

    const trimmedQuestion = question.trim();

    if (onSubmitWithFiles && attachedFiles.length > 0) {
      onSubmitWithFiles(trimmedQuestion, attachedFiles);
    } else {
      onSubmit(trimmedQuestion);
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

    if (!disabled && !isStreaming) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const placeholder = getPlaceholder(isFollowUp, discussionMode);
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
              : 'border-blue-400 bg-blue-50/30 shadow-[0_2px_20px_rgba(59,130,246,0.15)]'
            : disabled
              ? embedded
                ? 'opacity-75'
                : 'border-slate-200 opacity-75'
              : focused
                ? embedded
                  ? 'bg-transparent'
                  : 'border-violet-300 bg-white shadow-[0_2px_20px_rgba(139,92,246,0.10)]'
                : embedded
                  ? 'bg-transparent'
                  : 'border-slate-200 bg-slate-50 shadow-sm hover:border-violet-300'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={cn(
            'transition-all duration-200',
            embedded ? 'rounded-none bg-transparent' : 'rounded-[calc(1rem-2px)] bg-white'
          )}
        >
          {!isFollowUp && selectedExperts && selectedExperts.length > 0 && (
            discussionMode === 'standard' || discussionMode === 'brainstorm' ? (
              <div className="flex items-center gap-2.5 px-5 pb-1 pt-3">
                <span className="inline-flex items-center rounded bg-slate-700 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                  {discussionMode === 'standard' ? '토론' : '참여자'}
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
              <div className="flex flex-wrap items-center gap-1 px-4 pb-1 pt-3">
                {selectedExperts.map((expert) => (
                  onRemoveExpert ? (
                    <button
                      key={expert.id}
                      type="button"
                      onClick={() => onRemoveExpert(expert.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 py-0.5 pl-1 pr-2 text-[10px] font-medium text-indigo-600 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-400"
                    >
                      {expert.avatarUrl ? (
                        <img src={expert.avatarUrl} alt="" className="h-3.5 w-3.5 object-contain pointer-events-none" />
                      ) : expert.icon ? (
                        <span className="pointer-events-none text-[12px]">{expert.icon}</span>
                      ) : null}
                      {expert.nameKo}
                      <span className="text-[9px] opacity-60">×</span>
                    </button>
                  ) : (
                    <span
                      key={expert.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 py-0.5 pl-1 pr-2 text-[10px] font-medium text-indigo-600"
                    >
                      {expert.avatarUrl ? (
                        <img src={expert.avatarUrl} alt="" className="h-3.5 w-3.5 object-contain" />
                      ) : expert.icon ? (
                        <span className="text-[12px]">{expert.icon}</span>
                      ) : null}
                      {expert.nameKo}
                    </span>
                  )
                ))}
              </div>
            )
          )}

          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-4 pb-1 pt-3">
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="inline-flex max-w-[220px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1 pl-2 pr-1 text-[11px] text-slate-600"
                >
                  {file.preview ? (
                    <img src={file.preview} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                  ) : (
                    <span className="shrink-0 text-[14px]">{getInlineFileIcon(file.mimeType)}</span>
                  )}
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-[9px] text-slate-400">{formatInlineFileSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="ml-0.5 shrink-0 rounded p-0.5 transition-colors hover:bg-red-50 hover:text-red-400"
                    aria-label={`${file.name} 제거`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {fileError && (
            <div className="px-5 pt-2 text-[11px] text-red-500">{fileError}</div>
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
              'block w-full max-h-[140px] resize-none bg-transparent text-[14px] leading-relaxed text-foreground placeholder:text-slate-400 focus:outline-none',
              embedded ? 'min-h-[76px] px-5 pb-3 pt-4' : 'min-h-[44px] px-5 pb-2 pt-4'
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

          <div className={cn('flex items-center justify-between px-3', embedded ? 'py-2.5' : 'py-1.5')}>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={!canUseTools}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:hover:bg-white"
                    aria-label="추가 메뉴"
                    title="추가 메뉴"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.2} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="top"
                  className="w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
                >
                  <DropdownMenuItem
                    disabled={!canUseTools}
                    onSelect={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium text-slate-700"
                  >
                    <Paperclip className="h-4 w-4 text-slate-500" strokeWidth={2} />
                    파일 추가
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canUseTools || !onToggleSettings}
                    onSelect={() => onToggleSettings?.()}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium text-slate-700"
                  >
                    <FolderPlus className="h-4 w-4 text-slate-500" strokeWidth={2} />
                    프로젝트에 추가
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-1.5">
              {!disabled && !isStreaming && (
                <span className="mr-1 hidden text-[9px] text-slate-300 sm:inline">
                  Enter 전송 · Shift+Enter 줄바꿈
                </span>
              )}

              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  aria-label="중지"
                  title="중지"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-md transition-all duration-150 hover:bg-indigo-600"
                >
                  <Square className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-150',
                    canSubmit
                      ? 'bg-indigo-500 text-white shadow-md hover:bg-indigo-600'
                      : 'bg-slate-100 text-slate-300'
                  )}
                  aria-label="전송"
                  title="전송"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
