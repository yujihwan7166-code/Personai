import { ChevronDown } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type BlockKind = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'quote' | 'code';

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export function StyleSelect({ editor }: { editor: Editor }) {
  const currentLabel = (() => {
    for (const level of HEADING_LEVELS) {
      if (editor.isActive('heading', { level })) return `제목 ${level}`;
    }
    if (editor.isActive('blockquote')) return '인용';
    if (editor.isActive('codeBlock')) return '코드 블록';
    return '일반 텍스트';
  })();

  const apply = (kind: BlockKind) => {
    const c = editor.chain().focus();
    if (kind === 'p') c.clearNodes().setParagraph().run();
    else if (kind.startsWith('h')) c.clearNodes().toggleHeading({ level: Number(kind.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
    else if (kind === 'quote') c.toggleBlockquote().run();
    else if (kind === 'code') c.toggleCodeBlock().run();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="h-7 px-2 rounded hover:bg-muted text-xs flex items-center gap-1 min-w-[96px] border border-border"
        title="문단 스타일"
      >
        <span className="truncate text-left flex-1">{currentLabel}</span>
        <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[140px]">
        <DropdownMenuItem onSelect={() => apply('p')}>일반 텍스트</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => apply('h1')}>
          <span className="text-base font-medium">제목 1</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => apply('h2')}>
          <span className="text-sm font-medium">제목 2</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => apply('h3')}>제목 3</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => apply('h4')}>제목 4</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => apply('h5')}>제목 5</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => apply('h6')}>제목 6</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => apply('quote')}>인용</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => apply('code')}>코드 블록</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
