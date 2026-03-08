import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Plus, Sparkles } from 'lucide-react';
import { DiscussionMode, DISCUSSION_MODE_LABELS } from '@/types/expert';
import { ToolbarPanel, ToolType, TOOLS } from './ToolbarPanel';
import { cn } from '@/lib/utils';

interface Props {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  discussionMode?: DiscussionMode;
  showToolbar?: boolean;
}

export function QuestionInput({ onSubmit, disabled, discussionMode, showToolbar = true }: Props) {
  const [question, setQuestion] = useState('');
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [showTools, setShowTools] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || disabled) return;
    // Prepend tool prefix if a tool is active
    const tool = activeTool ? TOOLS.find(t => t.id === activeTool) : null;
    const finalQuestion = tool ? `${tool.prefix}${question.trim()}` : question.trim();
    onSubmit(finalQuestion);
    setQuestion('');
    setActiveTool(null);
  };

  const handleToolSelect = (tool: ToolType | null) => {
    setActiveTool(tool);
    textareaRef.current?.focus();
  };

  const modeInfo = discussionMode ? DISCUSSION_MODE_LABELS[discussionMode] : null;
  const activeToolInfo = activeTool ? TOOLS.find(t => t.id === activeTool) : null;

  // Placeholder changes based on active tool
  const getPlaceholder = () => {
    if (activeToolInfo) {
      const placeholders: Record<ToolType, string> = {
        image: '생성할 이미지를 설명해주세요...',
        document: '보고서 주제를 입력하세요...',
        presentation: '프레젠테이션 주제를 입력하세요...',
        brainstorm: '브레인스토밍할 주제를 입력하세요...',
        search: '심층 분석할 주제를 입력하세요...',
        compare: '비교할 대상들을 입력하세요...',
        table: '표로 정리할 내용을 입력하세요...',
        summary: '요약할 주제를 입력하세요...',
        checklist: '체크리스트 주제를 입력하세요...',
        translate: '번역할 내용을 입력하세요...',
      };
      return placeholders[activeTool!] || '질문을 입력하세요...';
    }
    return '전문가에게 질문하세요...';
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {showToolbar && showTools && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
          <ToolbarPanel
            activeTool={activeTool}
            onSelectTool={handleToolSelect}
            disabled={disabled}
          />
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            'flex flex-col bg-card border rounded-2xl transition-all duration-200',
            activeToolInfo
              ? 'ring-2 ring-offset-1 ring-offset-background'
              : 'focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/30',
          )}
          style={{
            boxShadow: activeToolInfo
              ? `0 2px 12px ${activeToolInfo.color}15`
              : 'var(--shadow-card)',
            ...(activeToolInfo
              ? { borderColor: activeToolInfo.color + '40', '--tw-ring-color': activeToolInfo.color + '50' } as any
              : { borderColor: undefined }),
          }}
        >
          {/* Active tool badge inside input */}
          {activeToolInfo && (
            <div className="px-3 pt-2 pb-0">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-white"
                style={{ background: activeToolInfo.color }}
              >
                <Sparkles className="w-2.5 h-2.5" />
                {activeToolInfo.label}
              </span>
            </div>
          )}

          <div className="flex items-end gap-2 p-2">
            {/* Tools toggle button */}
            {showToolbar && (
              <button
                type="button"
                onClick={() => setShowTools(!showTools)}
                className={cn(
                  'shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200',
                  showTools
                    ? 'bg-primary/10 text-primary rotate-45'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}

            {/* Mode badge */}
            {modeInfo && !activeToolInfo && (
              <span className="hidden sm:inline-flex items-center text-[9px] text-muted-foreground bg-muted px-2 py-1 rounded-full mb-0.5 shrink-0">
                {modeInfo.icon} {modeInfo.label}
              </span>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={getPlaceholder()}
              disabled={disabled}
              className="flex-1 bg-transparent border-none p-1 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[36px] max-h-[120px]"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />

            {/* Send button */}
            <Button
              type="submit"
              size="icon"
              disabled={!question.trim() || disabled}
              className="rounded-xl w-8 h-8 shadow-sm transition-all shrink-0"
              style={
                !question.trim() || disabled
                  ? {}
                  : activeToolInfo
                  ? { background: activeToolInfo.color }
                  : { background: 'var(--gradient-primary)' }
              }
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
