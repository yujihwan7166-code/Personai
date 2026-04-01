import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, Plus, Wrench, Mic, Paperclip, X, FileText } from 'lucide-react';
import { DiscussionMode, Expert } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';
import { AttachedFile, validateFile, processFile, getFileIcon, formatFileSize } from '@/lib/fileProcessor';

interface Props {
  onSubmit: (question: string) => void;
  onSubmitWithFiles?: (question: string, files: AttachedFile[]) => void;
  disabled?: boolean;
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
}

export function QuestionInput({ onSubmit, onSubmitWithFiles, disabled, discussionMode, selectedExperts, onRemoveExpert, onToggleSettings, showSettings, isFollowUp, onConclusion, onSummarize, isSummarizing, messageCount = 0, externalValue, onExternalValueConsumed }: Props) {
  const [question, setQuestion] = useState('');
  const [focused, setFocused] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto focus on mount
  useEffect(() => { setTimeout(() => textareaRef.current?.focus(), 100); }, []);

  // 외부에서 값 세팅 (추천 질문 클릭 등)
  useEffect(() => {
    if (externalValue) {
      setQuestion(externalValue);
      onExternalValueConsumed?.();
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [externalValue]);

  // Clear file error after 3 seconds
  useEffect(() => {
    if (fileError) {
      const timer = setTimeout(() => setFileError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [fileError]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setFileError(null);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateFile(file, attachedFiles);
      if (error) {
        setFileError(error);
        continue;
      }
      try {
        const processed = await processFile(file);
        setAttachedFiles(prev => [...prev, processed]);
      } catch {
        setFileError('파일 처리 중 오류가 발생했습니다');
      }
    }
  }, [attachedFiles]);

  const removeFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || disabled) return;
    if (onSubmitWithFiles && attachedFiles.length > 0) {
      onSubmitWithFiles(question.trim(), attachedFiles);
    } else {
      onSubmit(question.trim());
    }
    setQuestion('');
    setAttachedFiles([]);
    setFileError(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
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
    if (!disabled) handleFileSelect(e.dataTransfer.files);
  };

  const placeholder = isFollowUp
    ? (discussionMode === 'brainstorm'
      ? '추가 방향을 제시하세요 (예: "교육 분야에서는?", "비용 절감 관점으로")'
      : discussionMode === 'procon' || discussionMode === 'standard' || discussionMode === 'hearing'
      ? '토론자들에게 추가 질문을 해보세요'
      : discussionMode === 'stakeholder'
      ? '답변을 입력하세요...'
      : '이어서 질문해보세요')
    : discussionMode === 'general'
    ? '궁금한 것을 물어보세요'
    : discussionMode === 'multi'
    ? '여러 AI에게 동시에 질문해보세요'
    : discussionMode === 'expert'
    ? '전문가에게 상담할 내용을 입력하세요'
    : '토론하고 싶은 주제를 입력하세요';

  const canSubmit = !!question.trim() && !disabled;

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={cn(
          'rounded-2xl border-2 transition-all duration-200',
          isDragOver
            ? 'border-blue-400 shadow-[0_2px_20px_rgba(59,130,246,0.15)] bg-blue-50/30'
            : disabled
              ? 'border-slate-200 opacity-75'
              : focused
                ? 'border-violet-300 shadow-[0_2px_20px_rgba(139,92,246,0.10)] bg-white'
                : 'border-slate-200 bg-slate-50 shadow-sm hover:border-violet-300'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
      <div className="rounded-[calc(1rem-2px)] bg-white transition-all duration-200">
        {/* Selected AI chips / participant label (hidden in follow-up mode) */}
        {!isFollowUp && selectedExperts && selectedExperts.length > 0 && (
          (discussionMode === 'standard' || discussionMode === 'brainstorm') ? (
            <div className="flex items-center gap-2.5 px-5 pt-3 pb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-700 text-white text-[10px] font-bold tracking-wide">
                {discussionMode === 'standard' ? '토론자' : '참여자'}
              </span>
              <div className="flex items-center gap-1.5">
                {selectedExperts.map((e, i) => (
                  <span key={e.id} className="inline-flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-slate-800">{e.nameKo}</span>
                    {i < selectedExperts.length - 1 && <span className="text-slate-300">·</span>}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-4 pt-3 pb-1 flex-wrap">
              {selectedExperts.map(e => (
                onRemoveExpert ? (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onRemoveExpert(e.id)}
                    className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-600 font-medium hover:bg-red-50 hover:border-red-100 hover:text-red-400 transition-colors"
                  >
                    {e.avatarUrl
                      ? <img src={e.avatarUrl} alt="" className="w-3.5 h-3.5 object-contain pointer-events-none" />
                      : e.icon && <span className="text-[12px] pointer-events-none">{e.icon}</span>}
                    {e.nameKo}
                    <span className="text-[9px] opacity-60">✕</span>
                  </button>
                ) : (
                  <span key={e.id} className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-600 font-medium">
                    {e.avatarUrl
                      ? <img src={e.avatarUrl} alt="" className="w-3.5 h-3.5 object-contain" />
                      : e.icon && <span className="text-[12px]">{e.icon}</span>}
                    {e.nameKo}
                  </span>
                )
              ))}
            </div>
          )
        )}

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 pt-3 pb-1 flex-wrap">
            {attachedFiles.map(f => (
              <div key={f.id} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 max-w-[180px]">
                {f.preview ? (
                  <img src={f.preview} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                ) : (
                  <span className="text-[14px] shrink-0">{getFileIcon(f.mimeType)}</span>
                )}
                <span className="truncate">{f.name}</span>
                <span className="text-slate-400 text-[9px] shrink-0">{formatFileSize(f.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  className="ml-0.5 p-0.5 rounded hover:bg-red-50 hover:text-red-400 transition-colors shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* File error message */}
        {fileError && (
          <div className="px-5 pt-2 pb-0 text-[11px] text-red-500">{fileError}</div>
        )}

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*,.pdf,.docx,.xlsx"
          onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }}
          className="hidden"
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent resize-none text-[14px] text-foreground placeholder:text-slate-400 focus:outline-none leading-relaxed px-5 pt-4 pb-2 min-h-[44px] max-h-[140px] block"
          rows={1}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
          }}
          onInput={e => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = 'auto';
            t.style.height = Math.min(t.scrollHeight, 200) + 'px';
          }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5">
          {/* Left tools */}
          <div className="flex items-center gap-1">
            {/* File attach button */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              title="파일 첨부 (이미지, PDF, DOCX, XLSX)"
            >
              <Paperclip className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onToggleSettings}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all',
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
                <button type="button"
                  onClick={messageCount >= 3 ? onSummarize : undefined}
                  disabled={isSummarizing || messageCount < 3}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all",
                    isSummarizing ? 'text-slate-400 bg-slate-100'
                      : messageCount < 3 ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  )}>
                  <FileText className="w-3 h-3" strokeWidth={1.8} />
                  {isSummarizing ? '요약 중...' : '요약하기'}
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] whitespace-nowrap opacity-0 group-hover/summary:opacity-100 transition-opacity pointer-events-none shadow-lg">
                  {messageCount < 3 ? '대화가 좀 더 쌓이면 사용할 수 있어요' : '지금까지의 대화를 AI가 요약합니다'}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                </div>
              </div>
            )}
            {onConclusion && (
              <button type="button" onClick={onConclusion}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium text-amber-600 hover:bg-amber-50 transition-all">
                🎯 종합 결론
              </button>
            )}
          </div>

          {/* Right tools */}
          <div className="flex items-center gap-1.5">
            {!disabled && <span className="text-[9px] text-slate-300 mr-1 hidden sm:inline">Enter 전송 · Shift+Enter 줄바꿈</span>}
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
          </div>
        </div>
      </div>
      </div>
    </form>
  );
}
