import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Sparkles } from 'lucide-react';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || disabled) return;
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

  const activeToolInfo = activeTool ? TOOLS.find(t => t.id === activeTool) : null;

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
    return discussionMode === 'general' ? '무엇이든 물어보세요...' : '전문가에게 질문하세요...';
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            'flex flex-col bg-background border border-border rounded-2xl transition-all duration-150',
            'focus-within:border-foreground/20 focus-within:shadow-[0_0_0_1px_hsl(0_0%_0%/0.05)]',
          )}
        >
          {activeToolInfo && (
            <div className="px-3 pt-2.5 pb-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-foreground text-background">
                <Sparkles className="w-2.5 h-2.5" />
                {activeToolInfo.label}
              </span>
            </div>
          )}

          <div className="flex items-end gap-2 p-2.5">
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

            <Button
              type="submit"
              size="icon"
              disabled={!question.trim() || disabled}
              className="rounded-xl w-8 h-8 shrink-0 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </form>

      {showToolbar && (
        <ToolbarPanel
          activeTool={activeTool}
          onSelectTool={handleToolSelect}
          disabled={disabled}
        />
      )}
    </div>
  );
}
