import { useState } from 'react';
import { cn } from '@/lib/utils';
import { DiscussionMode } from '@/types/expert';
import {
  Image, FileText, Presentation, MessageSquareText, Table2,
  Globe, Video, Wrench, Sparkles, Search, BarChart3, Brain,
  BookOpen, ListChecks, ChevronDown, ChevronUp
} from 'lucide-react';

export type ToolType =
  | 'image' | 'document' | 'presentation' | 'table'
  | 'search' | 'brainstorm' | 'summary' | 'compare'
  | 'checklist' | 'translate';

export interface ToolItem {
  id: ToolType;
  label: string;
  icon: React.ReactNode;
  color: string; // HSL bg color
  iconColor: string;
  description: string;
  prefix: string; // Text prefix added to input
}

export const TOOLS: ToolItem[] = [
  {
    id: 'image',
    label: '이미지',
    icon: <Image className="w-5 h-5" />,
    color: 'hsl(35 90% 55%)',
    iconColor: 'hsl(0 0% 100%)',
    description: 'AI 이미지 생성',
    prefix: '[이미지 생성] ',
  },
  {
    id: 'document',
    label: '보고서',
    icon: <FileText className="w-5 h-5" />,
    color: 'hsl(210 80% 55%)',
    iconColor: 'hsl(0 0% 100%)',
    description: '보고서 작성',
    prefix: '[보고서 작성] ',
  },
  {
    id: 'presentation',
    label: '프레젠테이션',
    icon: <Presentation className="w-5 h-5" />,
    color: 'hsl(0 70% 55%)',
    iconColor: 'hsl(0 0% 100%)',
    description: 'PPT 스타일 문서',
    prefix: '[프레젠테이션] ',
  },
  {
    id: 'brainstorm',
    label: '브레인스토밍',
    icon: <Brain className="w-5 h-5" />,
    color: 'hsl(270 65% 55%)',
    iconColor: 'hsl(0 0% 100%)',
    description: '아이디어 발산',
    prefix: '[브레인스토밍] ',
  },
  {
    id: 'search',
    label: '심층 분석',
    icon: <Search className="w-5 h-5" />,
    color: 'hsl(145 65% 42%)',
    iconColor: 'hsl(0 0% 100%)',
    description: '주제 심층 리서치',
    prefix: '[심층 분석] ',
  },
  {
    id: 'compare',
    label: '비교 분석',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'hsl(195 80% 45%)',
    iconColor: 'hsl(0 0% 100%)',
    description: '옵션 비교·분석',
    prefix: '[비교 분석] ',
  },
  {
    id: 'table',
    label: '표 정리',
    icon: <Table2 className="w-5 h-5" />,
    color: 'hsl(160 70% 42%)',
    iconColor: 'hsl(0 0% 100%)',
    description: '데이터 표로 정리',
    prefix: '[표 정리] ',
  },
  {
    id: 'summary',
    label: '요약',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'hsl(25 90% 52%)',
    iconColor: 'hsl(0 0% 100%)',
    description: '핵심 요약 정리',
    prefix: '[요약 정리] ',
  },
  {
    id: 'checklist',
    label: '체크리스트',
    icon: <ListChecks className="w-5 h-5" />,
    color: 'hsl(330 70% 52%)',
    iconColor: 'hsl(0 0% 100%)',
    description: '실행 체크리스트',
    prefix: '[체크리스트] ',
  },
  {
    id: 'translate',
    label: '번역',
    icon: <Globe className="w-5 h-5" />,
    color: 'hsl(42 80% 50%)',
    iconColor: 'hsl(0 0% 100%)',
    description: '다국어 번역',
    prefix: '[번역] ',
  },
];

interface Props {
  activeTool: ToolType | null;
  onSelectTool: (tool: ToolType | null) => void;
  disabled?: boolean;
}

export function ToolbarPanel({ activeTool, onSelectTool, disabled }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {TOOLS.map(tool => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectTool(isActive ? null : tool.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 transition-all duration-200 group',
                disabled && 'opacity-40 cursor-not-allowed',
                !disabled && 'cursor-pointer',
              )}
            >
              <div
                className={cn(
                  'w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200',
                  isActive
                    ? 'scale-110 ring-2 ring-offset-2 ring-offset-background'
                    : 'hover:scale-105 hover:shadow-lg',
                )}
                style={{
                  background: tool.color,
                  color: tool.iconColor,
                  ...(isActive ? { ringColor: tool.color } : {}),
                  boxShadow: isActive
                    ? `0 4px 20px ${tool.color}40`
                    : `0 2px 8px ${tool.color}20`,
                }}
              >
                {tool.icon}
              </div>
              <span className={cn(
                'text-[10px] font-display font-medium transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
              )}>
                {tool.label}
              </span>
              {isActive && (
                <div
                  className="w-1 h-1 rounded-full -mt-1"
                  style={{ background: tool.color }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Active tool indicator */}
      {activeTool && (
        <div className="flex items-center justify-center">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium text-white animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ background: TOOLS.find(t => t.id === activeTool)?.color }}
          >
            <Sparkles className="w-3 h-3" />
            {TOOLS.find(t => t.id === activeTool)?.description} 모드
            <button
              onClick={() => onSelectTool(null)}
              className="ml-1 hover:opacity-70 transition-opacity"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
