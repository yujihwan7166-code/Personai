import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, FolderPlus, Paperclip, Plus, Share2, Square, X } from 'lucide-react';
import { DebateSettings, DiscussionMode, Expert } from '@/types/expert';
import { cn } from '@/lib/utils';
import { ExpertAvatar } from './ExpertAvatar';
import { buildAttachmentPrompt, type AttachedFile } from '@/lib/fileProcessor';
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
  placeholderOverride?: string;
  extraButtons?: React.ReactNode;
  accentBorder?: boolean;
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
}

function getPlaceholder(isFollowUp: boolean | undefined, discussionMode: DiscussionMode | undefined) {
  if (isFollowUp) {
    if (discussionMode === 'brainstorm') return '아이디어를 더 발전시키거나 추가 질문을 해보세요';
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
  if (discussionMode === 'aivsuser') return '내 입장에서 첫 주장을 입력해보세요';
  return '토론하고 싶은 주제를 입력해보세요';
}

function openProjectsSidebar() {
  window.dispatchEvent(new CustomEvent('personai:open-projects'));
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
  placeholderOverride,
  extraButtons,
  accentBorder = false,
  onSummarize,
  isSummarizing,
  messageCount,
  debateSettings,
  onDebateSettingsChange,
}: Props) {
  const [question, setQuestion] = useState('');
  const [focused, setFocused] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [openChip, setOpenChip] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chipBarRef = useRef<HTMLDivElement>(null);
  // Keep render-derived flags above callbacks that capture them to avoid TDZ crashes on first render.
  const canUseTools = !disabled && !isStreaming;
  const canAttachFiles = discussionMode !== 'player';
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

  // Close chip popover on outside click
  useEffect(() => {
    if (!openChip) return;
    const handler = (e: MouseEvent) => {
      if (chipBarRef.current && !chipBarRef.current.contains(e.target as Node)) {
        setOpenChip(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openChip]);

  const removeFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const handleSelectedFiles = useCallback(async (files: FileList | File[] | null) => {
    if (!canAttachFiles) return;

    const selectedFiles = files ? Array.from(files) : [];
    if (selectedFiles.length === 0) return;

    setFileError(null);
    const { validateFile, processFile } = await loadFileProcessor();
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
  }, [attachedFiles, canAttachFiles]);

  const focusTextarea = useCallback(() => {
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const handleQuickImageGenerate = useCallback(() => {
    setQuestion((prev) => {
      const next = prev.trim();
      return next ? `${next}\n\n이미지 만들어줘` : '이미지 만들어줘';
    });
    focusTextarea();
  }, [focusTextarea]);

  const handleConversationShare = useCallback(async () => {
    const shareText = question.trim() || 'Personai 대화';
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Personai 대화', text: shareText, url: shareUrl });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Ignore cancellations and unavailable clipboard APIs.
    }
  }, [question]);

  const handleResolvedSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if ((!question.trim() && attachedFiles.length === 0) || disabled || isStreaming) return;

    const trimmedQuestion = question.trim() || buildAttachmentPrompt(attachedFiles);

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
  }, [attachedFiles, disabled, isStreaming, onSubmit, onSubmitWithFiles, question]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canAttachFiles && !disabled && !isStreaming) setIsDragOver(true);
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

    if (canAttachFiles && !disabled && !isStreaming) {
      void handleSelectedFiles(e.dataTransfer.files);
    }
  };

  const handleTextareaPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!canAttachFiles || disabled || isStreaming) return;

    const pastedFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file instanceof File);

    if (pastedFiles.length === 0) return;

    e.preventDefault();
    void handleSelectedFiles(pastedFiles);
  }, [canAttachFiles, disabled, handleSelectedFiles, isStreaming]);

  const placeholder = placeholderOverride || getPlaceholder(isFollowUp, discussionMode);
  const canSubmit = (!!question.trim() || attachedFiles.length > 0) && !disabled && !isStreaming;
  const showSelectionAccent =
    !embedded &&
    !disabled &&
    discussionMode === 'general' &&
    (selectedExperts?.length ?? 0) > 0;

  return (
    <form onSubmit={handleResolvedSubmit}>
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
              : discussionMode === 'multi'
                ? embedded
                  ? 'bg-transparent'
                  : 'border-violet-300 bg-white shadow-[0_2px_20px_rgba(139,92,246,0.10)]'
                : focused || showSelectionAccent
                  ? embedded
                    ? 'bg-transparent'
                    : 'border-violet-300 bg-white shadow-[0_2px_20px_rgba(139,92,246,0.10)]'
                  : embedded
                    ? 'bg-transparent'
                    : (discussionMode === 'procon' || discussionMode === 'freetalk' || discussionMode === 'standard')
                      ? 'border-violet-300 bg-white shadow-[0_2px_20px_rgba(139,92,246,0.10)]'
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
                      <span className="pointer-events-none">
                        <ExpertAvatar expert={expert} size="xxs" />
                      </span>
                      {expert.nameKo}
                      <span className="text-[9px] opacity-60">×</span>
                    </button>
                  ) : (
                    <span
                      key={expert.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 py-0.5 pl-1 pr-2 text-[10px] font-medium text-indigo-600"
                    >
                      <ExpertAvatar expert={expert} size="xxs" />
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

          {canAttachFiles && (
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*,.pdf,.docx,.xlsx"
              onChange={(e) => {
                void handleSelectedFiles(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />
          )}

          {/* Debate settings chip bar — 메인화면(standalone)에서만 표시 */}
          {debateSettings && onDebateSettingsChange && !isFollowUp && !embedded && (discussionMode === 'standard' || discussionMode === 'procon' || discussionMode === 'freetalk') && (
            <div ref={chipBarRef} className="relative flex items-center gap-2 px-4 pt-3 pb-1">
              <span className="shrink-0 text-[11px] font-semibold text-slate-500 mr-0.5">⚙️ 세부설정</span>
              <div className="w-px h-3.5 bg-slate-200 shrink-0" />
              {(discussionMode === 'standard' ? [
                { key: 'debateTone', label: '목적', options: [{ id: 'mild', l: '탐색' }, { id: 'moderate', l: '분석' }, { id: 'intense', l: '합의' }], value: debateSettings.debateTone },
                { key: 'responseLength', label: '길이', options: [{ id: 'short', l: '짧게' }, { id: 'medium', l: '보통' }, { id: 'long', l: '길게' }], value: debateSettings.responseLength },
                { key: 'rounds', label: '라운드', options: [{ id: '2', l: '2R' }, { id: '3', l: '3R' }, { id: '4', l: '4R' }], value: String(debateSettings.rounds) },
              ] : discussionMode === 'procon' ? [
                { key: 'proconTeamSize', label: '인원', options: [{ id: '1', l: '1:1' }, { id: '2', l: '2:2' }, { id: '3', l: '3:3' }], value: String(debateSettings.proconTeamSize || 2) },
                { key: 'debateTone', label: '강도', options: [{ id: 'mild', l: '온건' }, { id: 'moderate', l: '보통' }, { id: 'intense', l: '격렬' }], value: debateSettings.debateTone },
                { key: 'rounds', label: '라운드', options: [{ id: '2', l: '2R' }, { id: '3', l: '3R' }, { id: '4', l: '4R' }], value: String(debateSettings.rounds) },
                { key: 'responseLength', label: '길이', options: [{ id: 'short', l: '짧게' }, { id: 'medium', l: '보통' }, { id: 'long', l: '길게' }], value: debateSettings.responseLength },
              ] : [
                { key: 'freetalkMessageCount', label: '대화수', options: [{ id: '15', l: '15회' }, { id: '30', l: '30회' }, { id: '45', l: '45회' }], value: String(debateSettings.freetalkMessageCount || 30) },
                { key: 'freetalkTone', label: '말투', options: [{ id: 'ultra-polite', l: '극존칭' }, { id: 'polite', l: '정중' }, { id: 'natural', l: '자연스럽게' }, { id: 'direct', l: '직설적' }, { id: 'aggressive', l: '공격적' }], value: debateSettings.freetalkTone || 'natural' },
              ]).map(chip => {
                const currentOption = chip.options.find(o => o.id === chip.value);
                return (
                  <div key={chip.key} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setOpenChip(openChip === chip.key ? null : chip.key)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap',
                        openChip === chip.key
                          ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      <span className="text-[9px] text-slate-400 font-medium">{chip.label}</span>
                      {currentOption?.l ?? chip.value}
                    </button>
                    {openChip === chip.key && (
                      <div className="absolute left-0 bottom-full mb-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-lg ring-1 ring-black/5 p-1.5 flex flex-col gap-0.5 min-w-[88px]">
                        {chip.options.map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              const key = chip.key as string;
                              if (key === 'rounds' || key === 'proconTeamSize' || key === 'freetalkMessageCount') {
                                onDebateSettingsChange({ ...debateSettings, [key]: Number(opt.id) });
                              } else {
                                onDebateSettingsChange({ ...debateSettings, [key]: opt.id });
                              }
                              setOpenChip(null);
                            }}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-[12px] font-medium text-left transition-all whitespace-nowrap',
                              chip.value === opt.id
                                ? 'bg-indigo-500 text-white font-semibold'
                                : 'text-slate-700 hover:bg-slate-100'
                            )}
                          >
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

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
              embedded ? 'min-h-[56px] px-5 pb-2.5 pt-3' : 'min-h-[48px] px-5 pb-2 pt-3.5'
            )}
            rows={embedded ? 2 : 1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
                e.preventDefault();
                handleResolvedSubmit(e);
              }
            }}
            onPaste={handleTextareaPaste}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
            }}
          />

          <div className={cn('flex items-center justify-between px-3', embedded ? 'py-2' : 'py-1.5')}>
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
                  className="w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
                >
                  <DropdownMenuItem
                    disabled={!canUseTools || !canAttachFiles}
                    onSelect={() => {
                      if (!canAttachFiles) return;
                      fileInputRef.current?.click();
                    }}
                    style={{ display: canAttachFiles ? 'flex' : 'none' }}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-700"
                  >
                    <Paperclip className="h-4 w-4 text-slate-500" strokeWidth={2} />
                    파일 추가
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canUseTools}
                    onSelect={() => openProjectsSidebar()}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-700"
                  >
                    <FolderPlus className="h-4 w-4 text-slate-500" strokeWidth={2} />
                    프로젝트에 추가
                  </DropdownMenuItem>
                  {/* 이미지 만들기 제거됨 */}
                  <DropdownMenuItem
                    disabled={!canUseTools}
                    onSelect={() => void handleConversationShare()}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-700"
                  >
                    <Share2 className="h-4 w-4 text-slate-500" strokeWidth={2} />
                    대화 공유하기
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {extraButtons}
              {onSummarize && (
                <div className="relative group/summary">
                  <button
                    type="button"
                    onClick={(messageCount ?? 0) >= 3 ? onSummarize : undefined}
                    disabled={isSummarizing || (messageCount ?? 0) < 3}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all border bg-white text-slate-500 border-slate-200 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-500 disabled:hover:border-slate-200 disabled:hover:bg-white"
                  >
                    {isSummarizing ? '요약 중...' : '📝 요약하기'}
                  </button>
                  {(messageCount ?? 0) < 3 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] whitespace-nowrap opacity-0 group-hover/summary:opacity-100 transition-opacity pointer-events-none shadow-lg">
                      AI 응답 3개 이상일 때 사용 가능
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                    </div>
                  )}
                </div>
              )}
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
